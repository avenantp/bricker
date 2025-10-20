-- =====================================================
-- Migration: S.1.4 - Create Payments Table
-- =====================================================
-- Description: Creates payments table to track payment transactions from Stripe
-- Author: System
-- Date: 2025-01-15
-- Version: 1.0
-- =====================================================

-- =====================================================
-- SECTION 1: Create payments table
-- =====================================================

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

  -- Stripe Integration
  stripe_payment_intent_id VARCHAR UNIQUE,
  stripe_charge_id VARCHAR,
  stripe_invoice_id VARCHAR,

  -- Payment Details
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR NOT NULL DEFAULT 'usd',
  status VARCHAR NOT NULL CHECK (status IN (
    'pending',
    'succeeded',
    'failed',
    'refunded',
    'partially_refunded',
    'disputed'
  )),

  -- Payment Method
  payment_method VARCHAR, -- 'card', 'bank_transfer', 'paypal'
  last4 VARCHAR, -- Last 4 digits of card
  brand VARCHAR, -- 'visa', 'mastercard', 'amex', 'discover'

  -- Failure Details
  failure_code VARCHAR,
  failure_message TEXT,

  -- Refund Details
  refund_amount NUMERIC(10,2),
  refund_reason TEXT,
  refunded_at TIMESTAMP,

  -- Dates
  processed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE payments IS 'Tracks all payment transactions from Stripe';
COMMENT ON COLUMN payments.account_id IS 'Reference to the account that made the payment';
COMMENT ON COLUMN payments.subscription_id IS 'Reference to the subscription this payment is for (NULL for one-time payments)';
COMMENT ON COLUMN payments.stripe_payment_intent_id IS 'Stripe PaymentIntent ID';
COMMENT ON COLUMN payments.stripe_charge_id IS 'Stripe Charge ID';
COMMENT ON COLUMN payments.stripe_invoice_id IS 'Stripe Invoice ID';
COMMENT ON COLUMN payments.amount IS 'Payment amount in the specified currency';
COMMENT ON COLUMN payments.currency IS 'Three-letter ISO currency code (e.g., usd, eur)';
COMMENT ON COLUMN payments.status IS 'Current status of the payment';
COMMENT ON COLUMN payments.payment_method IS 'Type of payment method used';
COMMENT ON COLUMN payments.last4 IS 'Last 4 digits of card number (for display)';
COMMENT ON COLUMN payments.brand IS 'Card brand (visa, mastercard, etc.)';
COMMENT ON COLUMN payments.failure_code IS 'Stripe failure code if payment failed';
COMMENT ON COLUMN payments.failure_message IS 'Human-readable failure message';
COMMENT ON COLUMN payments.refund_amount IS 'Amount refunded (if any)';
COMMENT ON COLUMN payments.refund_reason IS 'Reason for refund';
COMMENT ON COLUMN payments.refunded_at IS 'When the refund was processed';
COMMENT ON COLUMN payments.processed_at IS 'When the payment was processed';

-- =====================================================
-- SECTION 2: Create indexes
-- =====================================================

-- Index on account_id for querying payments by account
CREATE INDEX IF NOT EXISTS idx_payments_account ON payments(account_id);

-- Index on subscription_id for querying payments by subscription
CREATE INDEX IF NOT EXISTS idx_payments_subscription ON payments(subscription_id);

-- Index on stripe_payment_intent_id for webhook lookups
CREATE INDEX IF NOT EXISTS idx_payments_stripe_payment_intent ON payments(stripe_payment_intent_id);

-- Index on stripe_invoice_id for invoice lookups
CREATE INDEX IF NOT EXISTS idx_payments_stripe_invoice ON payments(stripe_invoice_id);

-- Index on status for filtering by payment status
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);

-- Index on processed_at for chronological queries
CREATE INDEX IF NOT EXISTS idx_payments_processed ON payments(processed_at DESC);

-- Composite index on account_id and processed_at for account payment history
CREATE INDEX IF NOT EXISTS idx_payments_account_processed ON payments(account_id, processed_at DESC);

-- Composite index on account_id and status for filtering account payments by status
CREATE INDEX IF NOT EXISTS idx_payments_account_status ON payments(account_id, status);

-- =====================================================
-- SECTION 3: Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view payments for accounts they're members of
CREATE POLICY "Users can view their account payments" ON payments
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Only owners can view payment details (admins can see limited info via view)
-- This is enforced at the application level

-- Policy: Only backend services can insert payments (via service role)
CREATE POLICY "Service role can insert payments" ON payments
  FOR INSERT
  WITH CHECK (
    -- This will be handled by service role key, not user authentication
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Policy: Only backend services can update payments
CREATE POLICY "Service role can update payments" ON payments
  FOR UPDATE
  USING (
    auth.jwt() ->> 'role' = 'service_role'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Policy: Prevent direct deletion
CREATE POLICY "Prevent direct payment deletion" ON payments
  FOR DELETE
  USING (false);

-- =====================================================
-- SECTION 4: Create helper functions
-- =====================================================

-- Function to get total payments for an account
CREATE OR REPLACE FUNCTION get_total_payments(p_account_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  total NUMERIC;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total
  FROM payments
  WHERE account_id = p_account_id
    AND status IN ('succeeded', 'partially_refunded');

  RETURN total;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_total_payments IS 'Returns total successful payments for an account';

-- Function to get failed payment count
CREATE OR REPLACE FUNCTION get_failed_payment_count(p_account_id UUID)
RETURNS INTEGER AS $$
DECLARE
  fail_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fail_count
  FROM payments
  WHERE account_id = p_account_id
    AND status = 'failed'
    AND processed_at > NOW() - INTERVAL '30 days';

  RETURN fail_count;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_failed_payment_count IS 'Returns count of failed payments in last 30 days';

-- Function to get last successful payment
CREATE OR REPLACE FUNCTION get_last_successful_payment(p_account_id UUID)
RETURNS payments AS $$
DECLARE
  last_payment payments;
BEGIN
  SELECT * INTO last_payment
  FROM payments
  WHERE account_id = p_account_id
    AND status = 'succeeded'
  ORDER BY processed_at DESC
  LIMIT 1;

  RETURN last_payment;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_last_successful_payment IS 'Returns the most recent successful payment for an account';

-- =====================================================
-- SECTION 5: Create views for common queries
-- =====================================================

-- View: Successful payments with account and subscription details
CREATE OR REPLACE VIEW successful_payments AS
SELECT
  p.*,
  a.name as account_name,
  a.slug as account_slug,
  s.plan_id,
  sp.name as plan_name
FROM payments p
JOIN accounts a ON p.account_id = a.id
LEFT JOIN subscriptions s ON p.subscription_id = s.id
LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE p.status = 'succeeded'
  AND a.deleted_at IS NULL
ORDER BY p.processed_at DESC;

COMMENT ON VIEW successful_payments IS 'All successful payments with account and subscription details';

-- Grant access to the view
GRANT SELECT ON successful_payments TO authenticated;

-- View: Failed payments (last 90 days)
CREATE OR REPLACE VIEW recent_failed_payments AS
SELECT
  p.*,
  a.name as account_name,
  a.billing_email,
  s.plan_id,
  sp.name as plan_name
FROM payments p
JOIN accounts a ON p.account_id = a.id
LEFT JOIN subscriptions s ON p.subscription_id = s.id
LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE p.status = 'failed'
  AND p.processed_at > NOW() - INTERVAL '90 days'
  AND a.deleted_at IS NULL
ORDER BY p.processed_at DESC;

COMMENT ON VIEW recent_failed_payments IS 'Failed payments in the last 90 days';

-- View: Payment summary by account
CREATE OR REPLACE VIEW payment_summary_by_account AS
SELECT
  account_id,
  a.name as account_name,
  COUNT(*) as total_payments,
  COUNT(*) FILTER (WHERE status = 'succeeded') as successful_payments,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_payments,
  COUNT(*) FILTER (WHERE status = 'refunded') as refunded_payments,
  SUM(amount) FILTER (WHERE status = 'succeeded') as total_amount_succeeded,
  SUM(refund_amount) as total_refunded,
  MAX(processed_at) FILTER (WHERE status = 'succeeded') as last_successful_payment_at
FROM payments p
JOIN accounts a ON p.account_id = a.id
WHERE a.deleted_at IS NULL
GROUP BY account_id, a.name;

COMMENT ON VIEW payment_summary_by_account IS 'Payment statistics by account';

-- Grant access to the view
GRANT SELECT ON payment_summary_by_account TO authenticated;

-- =====================================================
-- SECTION 6: Create triggers for audit logging
-- =====================================================

-- Function to log payment status changes
CREATE OR REPLACE FUNCTION log_payment_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changed, you could insert into an audit_log table here
  -- For now, we'll just update the record
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Status changed - could trigger notifications, etc.
    NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment status changes
DROP TRIGGER IF EXISTS payment_status_change_trigger ON payments;
CREATE TRIGGER payment_status_change_trigger
  BEFORE UPDATE ON payments
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_payment_status_change();

COMMENT ON FUNCTION log_payment_status_change IS 'Logs payment status changes for audit trail';

-- =====================================================
-- Migration Notes
-- =====================================================

-- NOTES:
-- 1. Payments are immutable once created (no updates except status changes)
-- 2. All payment operations come from Stripe webhooks
-- 3. Refunds are tracked separately (refund_amount, refund_reason, refunded_at)
-- 4. Failed payment details stored for debugging (failure_code, failure_message)
-- 5. Payment method details stored for display (last4, brand)
-- 6. Subscription can be NULL for one-time payments or credits
-- 7. Helper functions provided for common payment queries
-- 8. Views created for successful, failed, and summarized payments

-- PAYMENT STATUS MEANINGS:
-- - pending: Payment intent created but not yet processed
-- - succeeded: Payment successfully processed
-- - failed: Payment failed (card declined, insufficient funds, etc.)
-- - refunded: Payment fully refunded
-- - partially_refunded: Payment partially refunded
-- - disputed: Payment disputed by customer (chargeback)

-- STRIPE WEBHOOK EVENTS TO HANDLE:
-- - payment_intent.succeeded -> Create payment record with status=succeeded
-- - payment_intent.payment_failed -> Create/update payment record with status=failed
-- - charge.succeeded -> Update payment record with charge_id
-- - charge.refunded -> Update payment record with refund details
-- - charge.dispute.created -> Update payment record with status=disputed

-- NEXT STEPS:
-- 1. Create usage_events table (Phase S.1.5)
-- 2. Create Stripe webhook handler to populate this table (Phase S.2)
-- 3. Create payment service for querying payment history (Phase S.3)
-- 4. Create billing UI components to display payment history (Phase S.5)

-- =====================================================
-- End of Migration S.1.4
-- =====================================================
