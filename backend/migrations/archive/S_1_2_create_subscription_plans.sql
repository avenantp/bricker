-- =====================================================
-- Migration: S.1.2 - Create Subscription Plans Table
-- =====================================================
-- Description: Creates subscription_plans table with all tiers, features, and limits
-- Author: System
-- Date: 2025-01-15
-- Version: 1.0
-- =====================================================

-- =====================================================
-- SECTION 1: Create subscription_plans table
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Plan Identity
  name VARCHAR NOT NULL UNIQUE, -- 'Free', 'Pro', 'Enterprise'
  slug VARCHAR NOT NULL UNIQUE, -- 'free', 'pro', 'enterprise'
  tier VARCHAR NOT NULL CHECK (tier IN ('free', 'pro', 'enterprise', 'custom')),
  display_name VARCHAR NOT NULL, -- 'Professional Plan'
  description TEXT,

  -- Pricing
  price_monthly NUMERIC(10,2), -- Monthly price in USD
  price_yearly NUMERIC(10,2), -- Yearly price in USD (discounted)
  currency VARCHAR DEFAULT 'usd',
  stripe_price_id_monthly VARCHAR, -- Stripe Price ID for monthly
  stripe_price_id_yearly VARCHAR, -- Stripe Price ID for yearly

  -- Limits
  max_users INTEGER,
  max_projects INTEGER,
  max_datasets INTEGER,
  max_monthly_ai_requests INTEGER,
  max_storage_mb INTEGER,
  max_workspaces_per_project INTEGER,
  max_connections INTEGER,

  -- Features (JSONB array of feature keys)
  features JSONB DEFAULT '[]', -- ['advanced_ai', 'priority_support', 'sso', 'audit_logs']

  -- Feature Flags
  has_git_sync BOOLEAN DEFAULT true,
  has_ai_assistance BOOLEAN DEFAULT false,
  has_data_vault_accelerator BOOLEAN DEFAULT false,
  has_priority_support BOOLEAN DEFAULT false,
  has_sso BOOLEAN DEFAULT false,
  has_audit_logs BOOLEAN DEFAULT false,
  has_api_access BOOLEAN DEFAULT false,
  has_white_labeling BOOLEAN DEFAULT false,

  -- Trial
  trial_days INTEGER DEFAULT 0, -- Number of trial days (0 = no trial)

  -- Visibility
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true, -- Show on pricing page
  is_recommended BOOLEAN DEFAULT false, -- Highlight as recommended
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE subscription_plans IS 'Subscription plan definitions with pricing, limits, and features';
COMMENT ON COLUMN subscription_plans.name IS 'Plan name (Free, Pro, Enterprise)';
COMMENT ON COLUMN subscription_plans.slug IS 'URL-friendly plan identifier';
COMMENT ON COLUMN subscription_plans.tier IS 'Plan tier level';
COMMENT ON COLUMN subscription_plans.price_monthly IS 'Monthly subscription price in USD';
COMMENT ON COLUMN subscription_plans.price_yearly IS 'Yearly subscription price in USD (usually discounted)';
COMMENT ON COLUMN subscription_plans.features IS 'JSON array of feature keys available in this plan';
COMMENT ON COLUMN subscription_plans.trial_days IS 'Number of trial days offered (0 = no trial)';
COMMENT ON COLUMN subscription_plans.max_users IS 'Maximum users allowed (-1 = unlimited)';
COMMENT ON COLUMN subscription_plans.max_projects IS 'Maximum projects allowed (-1 = unlimited)';
COMMENT ON COLUMN subscription_plans.max_datasets IS 'Maximum datasets allowed (-1 = unlimited)';
COMMENT ON COLUMN subscription_plans.is_public IS 'Whether to show this plan on the public pricing page';
COMMENT ON COLUMN subscription_plans.is_recommended IS 'Whether to highlight this plan as recommended';

-- =====================================================
-- SECTION 2: Create indexes
-- =====================================================

-- Index on tier for filtering by plan level
CREATE INDEX IF NOT EXISTS idx_subscription_plans_tier ON subscription_plans(tier);

-- Index on active plans
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active) WHERE is_active = true;

-- Index on public plans (for pricing page)
CREATE INDEX IF NOT EXISTS idx_subscription_plans_public ON subscription_plans(is_public) WHERE is_public = true;

-- Index on sort_order for ordering plans
CREATE INDEX IF NOT EXISTS idx_subscription_plans_sort_order ON subscription_plans(sort_order);

-- =====================================================
-- SECTION 3: Seed default plans
-- =====================================================

-- Free Plan
INSERT INTO subscription_plans (
  name,
  slug,
  tier,
  display_name,
  description,
  price_monthly,
  price_yearly,
  max_users,
  max_projects,
  max_datasets,
  max_monthly_ai_requests,
  max_storage_mb,
  max_workspaces_per_project,
  max_connections,
  trial_days,
  features,
  has_git_sync,
  has_ai_assistance,
  has_data_vault_accelerator,
  has_priority_support,
  has_sso,
  has_audit_logs,
  has_api_access,
  has_white_labeling,
  is_active,
  is_public,
  is_recommended,
  sort_order
) VALUES (
  'Free',
  'free',
  'free',
  'Free Plan',
  'Perfect for individuals getting started with Databricks automation',
  0,
  0,
  1,
  5,
  100,
  100,
  1000,
  1,
  1,
  0,
  '[]'::jsonb,
  true,   -- has_git_sync
  false,  -- has_ai_assistance
  false,  -- has_data_vault_accelerator
  false,  -- has_priority_support
  false,  -- has_sso
  false,  -- has_audit_logs
  false,  -- has_api_access
  false,  -- has_white_labeling
  true,   -- is_active
  true,   -- is_public
  false,  -- is_recommended
  1       -- sort_order
) ON CONFLICT (slug) DO NOTHING;

-- Pro Plan
INSERT INTO subscription_plans (
  name,
  slug,
  tier,
  display_name,
  description,
  price_monthly,
  price_yearly,
  max_users,
  max_projects,
  max_datasets,
  max_monthly_ai_requests,
  max_storage_mb,
  max_workspaces_per_project,
  max_connections,
  trial_days,
  features,
  has_git_sync,
  has_ai_assistance,
  has_data_vault_accelerator,
  has_priority_support,
  has_sso,
  has_audit_logs,
  has_api_access,
  has_white_labeling,
  is_active,
  is_public,
  is_recommended,
  sort_order
) VALUES (
  'Pro',
  'pro',
  'pro',
  'Professional Plan',
  'Advanced features for growing teams and power users',
  29,
  290,
  10,
  50,
  1000,
  1000,
  10000,
  5,
  10,
  14,
  '["advanced_ai", "priority_support", "api_access"]'::jsonb,
  true,   -- has_git_sync
  true,   -- has_ai_assistance
  true,   -- has_data_vault_accelerator
  true,   -- has_priority_support
  false,  -- has_sso
  false,  -- has_audit_logs
  true,   -- has_api_access
  false,  -- has_white_labeling
  true,   -- is_active
  true,   -- is_public
  true,   -- is_recommended (Pro is recommended)
  2       -- sort_order
) ON CONFLICT (slug) DO NOTHING;

-- Enterprise Plan
INSERT INTO subscription_plans (
  name,
  slug,
  tier,
  display_name,
  description,
  price_monthly,
  price_yearly,
  max_users,
  max_projects,
  max_datasets,
  max_monthly_ai_requests,
  max_storage_mb,
  max_workspaces_per_project,
  max_connections,
  trial_days,
  features,
  has_git_sync,
  has_ai_assistance,
  has_data_vault_accelerator,
  has_priority_support,
  has_sso,
  has_audit_logs,
  has_api_access,
  has_white_labeling,
  is_active,
  is_public,
  is_recommended,
  sort_order
) VALUES (
  'Enterprise',
  'enterprise',
  'enterprise',
  'Enterprise Plan',
  'Unlimited resources and premium support for large organizations',
  NULL,  -- Custom pricing
  NULL,  -- Custom pricing
  -1,    -- Unlimited
  -1,    -- Unlimited
  -1,    -- Unlimited
  -1,    -- Unlimited
  -1,    -- Unlimited
  -1,    -- Unlimited
  -1,    -- Unlimited
  30,
  '["advanced_ai", "priority_support", "sso", "audit_logs", "api_access", "white_labeling"]'::jsonb,
  true,   -- has_git_sync
  true,   -- has_ai_assistance
  true,   -- has_data_vault_accelerator
  true,   -- has_priority_support
  true,   -- has_sso
  true,   -- has_audit_logs
  true,   -- has_api_access
  true,   -- has_white_labeling
  true,   -- is_active
  true,   -- is_public
  false,  -- is_recommended
  3       -- sort_order
) ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- SECTION 4: Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on subscription_plans table
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone (including anonymous users) can view active, public plans
CREATE POLICY "Public can view active subscription plans" ON subscription_plans
  FOR SELECT
  USING (is_active = true AND is_public = true);

-- Policy: Authenticated users can view all active plans (including non-public ones)
CREATE POLICY "Authenticated users can view all active plans" ON subscription_plans
  FOR SELECT
  USING (
    is_active = true
    AND auth.uid() IS NOT NULL
  );

-- Note: Only admins should be able to INSERT/UPDATE/DELETE plans
-- These operations should be done via database migrations or admin tools
-- No INSERT/UPDATE/DELETE policies defined for regular users

-- =====================================================
-- SECTION 5: Create updated_at trigger
-- =====================================================

-- Create or replace function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for subscription_plans
DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Migration Notes
-- =====================================================

-- NOTES:
-- 1. Free plan has 0 trial days (no trial needed for free)
-- 2. Pro plan has 14-day trial period
-- 3. Enterprise plan has 30-day trial period
-- 4. -1 indicates unlimited for numeric limits (Enterprise)
-- 5. NULL prices indicate custom/contact pricing (Enterprise)
-- 6. Stripe price IDs should be added later when Stripe products are created
-- 7. Features JSONB array allows flexible feature management
-- 8. Feature flags provide boolean checks for common features

-- NEXT STEPS:
-- 1. Create Stripe products and prices
-- 2. Update stripe_price_id_monthly and stripe_price_id_yearly columns
-- 3. Create subscriptions table (Phase S.1.3)
-- 4. Update accounts table to reference subscription_plans (add foreign key)

-- =====================================================
-- End of Migration S.1.2
-- =====================================================
