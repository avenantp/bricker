-- =====================================================
-- Migration: S.1.3 - Create Subscriptions Table
-- =====================================================
-- Description: Creates subscriptions table to track account subscriptions with Stripe integration
-- Author: System
-- Date: 2025-01-15
-- Version: 1.0
-- =====================================================

-- =====================================================
-- SECTION 1: Create subscriptions table
-- =====================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,

  -- Stripe Integration
  stripe_subscription_id VARCHAR UNIQUE,
  stripe_customer_id VARCHAR, -- Denormalized for quick lookup
  stripe_price_id VARCHAR, -- Current price being charged

  -- Status
  status VARCHAR NOT NULL CHECK (status IN (
    'trialing',
    'active',
    'past_due',
    'canceled',
    'unpaid',
    'incomplete',
    'incomplete_expired',
    'paused'
  )),

  -- Dates
  start_date TIMESTAMP NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  trial_start TIMESTAMP,
  trial_end TIMESTAMP,
  canceled_at TIMESTAMP,
  ended_at TIMESTAMP,

  -- Billing
  billing_cycle VARCHAR CHECK (billing_cycle IN ('monthly', 'yearly')),
  cancel_at_period_end BOOLEAN DEFAULT false,
  auto_renew BOOLEAN DEFAULT true,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional Stripe metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE subscriptions IS 'Tracks account subscriptions with Stripe integration';
COMMENT ON COLUMN subscriptions.account_id IS 'Reference to the account that owns this subscription';
COMMENT ON COLUMN subscriptions.plan_id IS 'Reference to the subscription plan';
COMMENT ON COLUMN subscriptions.stripe_subscription_id IS 'Stripe subscription ID for payment processing';
COMMENT ON COLUMN subscriptions.stripe_customer_id IS 'Stripe customer ID (denormalized from accounts)';
COMMENT ON COLUMN subscriptions.stripe_price_id IS 'Current Stripe price ID being charged';
COMMENT ON COLUMN subscriptions.status IS 'Subscription status (matches Stripe status values)';
COMMENT ON COLUMN subscriptions.start_date IS 'When the subscription started';
COMMENT ON COLUMN subscriptions.end_date IS 'When the subscription ends (NULL for active subscriptions)';
COMMENT ON COLUMN subscriptions.current_period_start IS 'Start of current billing period';
COMMENT ON COLUMN subscriptions.current_period_end IS 'End of current billing period';
COMMENT ON COLUMN subscriptions.trial_start IS 'When trial period started';
COMMENT ON COLUMN subscriptions.trial_end IS 'When trial period ends';
COMMENT ON COLUMN subscriptions.canceled_at IS 'When subscription was canceled';
COMMENT ON COLUMN subscriptions.ended_at IS 'When subscription actually ended';
COMMENT ON COLUMN subscriptions.billing_cycle IS 'Monthly or yearly billing';
COMMENT ON COLUMN subscriptions.cancel_at_period_end IS 'Whether to cancel at end of current period';
COMMENT ON COLUMN subscriptions.auto_renew IS 'Whether subscription auto-renews';
COMMENT ON COLUMN subscriptions.metadata IS 'Additional metadata from Stripe or custom data';

-- =====================================================
-- SECTION 2: Create indexes
-- =====================================================

-- Index on account_id for fast lookups by account
CREATE INDEX IF NOT EXISTS idx_subscriptions_account ON subscriptions(account_id);

-- Index on plan_id for querying by plan
CREATE INDEX IF NOT EXISTS idx_subscriptions_plan ON subscriptions(plan_id);

-- Index on stripe_subscription_id for webhook lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);

-- Index on status for filtering by subscription status
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- Index on current_period_end for finding expiring subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_period_end ON subscriptions(current_period_end);

-- Index on trial_end for finding expiring trials
CREATE INDEX IF NOT EXISTS idx_subscriptions_trial_end ON subscriptions(trial_end) WHERE trial_end IS NOT NULL;

-- Composite index on account_id and status for common queries
CREATE INDEX IF NOT EXISTS idx_subscriptions_account_status ON subscriptions(account_id, status);

-- =====================================================
-- SECTION 3: Create constraints
-- =====================================================

-- Ensure an account has only one active subscription at a time
-- Note: This is enforced at the application level rather than database constraint
-- to allow for subscription transitions and historical records

-- =====================================================
-- SECTION 4: Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on subscriptions table
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view subscriptions for accounts they're members of
CREATE POLICY "Users can view their account subscriptions" ON subscriptions
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Only admins/owners can insert subscriptions (usually done by backend)
CREATE POLICY "Admins can create subscriptions" ON subscriptions
  FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Policy: Only admins/owners can update subscriptions
CREATE POLICY "Admins can update subscriptions" ON subscriptions
  FOR UPDATE
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  )
  WITH CHECK (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Policy: Prevent direct deletion (subscriptions should be canceled, not deleted)
CREATE POLICY "Prevent direct subscription deletion" ON subscriptions
  FOR DELETE
  USING (false);

-- =====================================================
-- SECTION 5: Create updated_at trigger
-- =====================================================

-- Create trigger for subscriptions (reuses function from S.1.2)
DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SECTION 6: Create helper functions
-- =====================================================

-- Function to get active subscription for an account
CREATE OR REPLACE FUNCTION get_active_subscription(p_account_id UUID)
RETURNS subscriptions AS $$
DECLARE
  active_sub subscriptions;
BEGIN
  SELECT * INTO active_sub
  FROM subscriptions
  WHERE account_id = p_account_id
    AND status IN ('active', 'trialing', 'past_due')
  ORDER BY created_at DESC
  LIMIT 1;

  RETURN active_sub;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_active_subscription IS 'Returns the active subscription for an account';

-- Function to check if subscription is active
CREATE OR REPLACE FUNCTION is_subscription_active(p_subscription_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  sub_status VARCHAR;
BEGIN
  SELECT status INTO sub_status
  FROM subscriptions
  WHERE id = p_subscription_id;

  RETURN sub_status IN ('active', 'trialing', 'past_due');
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_subscription_active IS 'Checks if a subscription is currently active';

-- Function to check if trial is active
CREATE OR REPLACE FUNCTION is_trial_active(p_subscription_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  sub_record subscriptions;
BEGIN
  SELECT * INTO sub_record
  FROM subscriptions
  WHERE id = p_subscription_id;

  RETURN sub_record.status = 'trialing'
    AND sub_record.trial_end IS NOT NULL
    AND sub_record.trial_end > NOW();
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION is_trial_active IS 'Checks if a subscription is in an active trial period';

-- =====================================================
-- SECTION 7: Create views for common queries
-- =====================================================

-- View: Active subscriptions with plan details
CREATE OR REPLACE VIEW active_subscriptions AS
SELECT
  s.*,
  p.name as plan_name,
  p.tier as plan_tier,
  p.display_name as plan_display_name,
  a.name as account_name,
  a.slug as account_slug
FROM subscriptions s
JOIN subscription_plans p ON s.plan_id = p.id
JOIN accounts a ON s.account_id = a.id
WHERE s.status IN ('active', 'trialing', 'past_due')
  AND a.deleted_at IS NULL;

COMMENT ON VIEW active_subscriptions IS 'Active subscriptions with plan and account details';

-- Grant access to the view
GRANT SELECT ON active_subscriptions TO authenticated;

-- View: Expiring trials (within 7 days)
CREATE OR REPLACE VIEW expiring_trials AS
SELECT
  s.*,
  p.name as plan_name,
  a.name as account_name,
  a.billing_email,
  (s.trial_end - NOW()) as time_remaining
FROM subscriptions s
JOIN subscription_plans p ON s.plan_id = p.id
JOIN accounts a ON s.account_id = a.id
WHERE s.status = 'trialing'
  AND s.trial_end IS NOT NULL
  AND s.trial_end > NOW()
  AND s.trial_end < NOW() + INTERVAL '7 days'
  AND a.deleted_at IS NULL
ORDER BY s.trial_end ASC;

COMMENT ON VIEW expiring_trials IS 'Trials expiring within the next 7 days';

-- =====================================================
-- Migration Notes
-- =====================================================

-- NOTES:
-- 1. Subscriptions are tied to accounts via account_id
-- 2. Status values match Stripe subscription statuses
-- 3. Stripe IDs are stored for webhook processing and sync
-- 4. current_period_start/end track billing periods
-- 5. cancel_at_period_end allows graceful cancellation
-- 6. Subscriptions should not be hard-deleted (use status='canceled')
-- 7. Helper functions provided for common subscription checks
-- 8. Views created for active subscriptions and expiring trials

-- STRIPE STATUS MEANINGS:
-- - trialing: In trial period, no payment yet
-- - active: Paid and in good standing
-- - past_due: Payment failed, in grace period (Stripe retrying)
-- - canceled: User canceled, no longer renewing
-- - unpaid: Payment failed multiple times, suspended
-- - incomplete: Subscription created but payment not complete (3D Secure, etc.)
-- - incomplete_expired: Payment incomplete for too long, expired
-- - paused: Subscription paused (rare, manual action)

-- NEXT STEPS:
-- 1. Create payments table (Phase S.1.4)
-- 2. Create usage_events table (Phase S.1.5)
-- 3. Update accounts table to add current_subscription_id column
-- 4. Create Stripe webhook handlers (Phase S.2)
-- 5. Create subscription service logic (Phase S.3)

-- =====================================================
-- End of Migration S.1.3
-- =====================================================
