-- =====================================================
-- Migration: S.1.1 - Enhance Accounts Table for Subscription Management
-- =====================================================
-- Description: Comprehensive enhancement of accounts table to support subscription management,
--              usage tracking, trial management, and soft delete functionality
-- Author: System
-- Date: 2025-01-15
-- Version: 1.0
-- =====================================================
-- This migration consolidates the following sub-migrations:
--   S.1.1.1 - Add slug column
--   S.1.1.2 - Add subscription tracking columns
--   S.1.1.3 - Add usage tracking columns
--   S.1.1.4 - Add feature flags
--   S.1.1.5 - Add soft delete support
--   S.1.1.6 - Update RLS policies
-- =====================================================

-- =====================================================
-- SECTION 1: Add new columns to accounts table
-- =====================================================

-- S.1.1.1: Add slug for URL-friendly identifiers
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS slug VARCHAR UNIQUE;
COMMENT ON COLUMN accounts.slug IS 'URL-friendly identifier for the account (e.g., acme-corp)';

-- S.1.1.2: Add subscription tracking columns
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS usage_reset_date TIMESTAMP;
COMMENT ON COLUMN accounts.trial_end_date IS 'Date when the trial period ends for this account';
COMMENT ON COLUMN accounts.usage_reset_date IS 'Date when monthly usage counters (AI requests) reset';

-- S.1.1.3: Add usage tracking columns
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS current_user_count INTEGER DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS current_project_count INTEGER DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS current_dataset_count INTEGER DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS current_monthly_ai_requests INTEGER DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS current_storage_mb INTEGER DEFAULT 0;
COMMENT ON COLUMN accounts.current_user_count IS 'Current number of active users in the account';
COMMENT ON COLUMN accounts.current_project_count IS 'Current number of projects in the account';
COMMENT ON COLUMN accounts.current_dataset_count IS 'Current number of datasets in the account';
COMMENT ON COLUMN accounts.current_monthly_ai_requests IS 'Current number of AI requests this month';
COMMENT ON COLUMN accounts.current_storage_mb IS 'Current storage used in megabytes';

-- S.1.1.4: Add feature flags
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS allow_trial BOOLEAN DEFAULT true;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN DEFAULT false;
COMMENT ON COLUMN accounts.is_verified IS 'Whether the account email has been verified (important for organizations)';
COMMENT ON COLUMN accounts.allow_trial IS 'Whether this account is allowed to use trial periods';
COMMENT ON COLUMN accounts.has_used_trial IS 'Whether this account has already used a trial period (prevent multiple trials)';

-- S.1.1.5: Add soft delete support
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
COMMENT ON COLUMN accounts.deleted_at IS 'Timestamp when account was soft deleted (NULL = active account)';

-- =====================================================
-- SECTION 2: Add check constraints
-- =====================================================

-- Ensure non-negative values for usage counters
-- Note: PostgreSQL doesn't support IF NOT EXISTS for constraints, so we use DO blocks
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_current_user_count') THEN
    ALTER TABLE accounts ADD CONSTRAINT chk_current_user_count CHECK (current_user_count >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_current_project_count') THEN
    ALTER TABLE accounts ADD CONSTRAINT chk_current_project_count CHECK (current_project_count >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_current_dataset_count') THEN
    ALTER TABLE accounts ADD CONSTRAINT chk_current_dataset_count CHECK (current_dataset_count >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_current_monthly_ai_requests') THEN
    ALTER TABLE accounts ADD CONSTRAINT chk_current_monthly_ai_requests CHECK (current_monthly_ai_requests >= 0);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_current_storage_mb') THEN
    ALTER TABLE accounts ADD CONSTRAINT chk_current_storage_mb CHECK (current_storage_mb >= 0);
  END IF;
END $$;

-- =====================================================
-- SECTION 3: Create indexes for performance
-- =====================================================

-- Index on slug for lookups
CREATE INDEX IF NOT EXISTS idx_accounts_slug ON accounts(slug);

-- Index on trial_end_date for querying expiring trials
CREATE INDEX IF NOT EXISTS idx_accounts_trial_end ON accounts(trial_end_date) WHERE trial_end_date IS NOT NULL;

-- Index on is_verified for querying unverified accounts
CREATE INDEX IF NOT EXISTS idx_accounts_is_verified ON accounts(is_verified) WHERE is_verified = false;

-- Partial index on active accounts (deleted_at IS NULL)
CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(id) WHERE deleted_at IS NULL;

-- Index on deleted accounts for cleanup jobs
CREATE INDEX IF NOT EXISTS idx_accounts_deleted_at ON accounts(deleted_at) WHERE deleted_at IS NOT NULL;

-- =====================================================
-- SECTION 4: Update Row Level Security (RLS) policies
-- =====================================================

-- Drop existing policies (both old and new names)
DROP POLICY IF EXISTS "Users can view their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can view their own active accounts" ON accounts;
DROP POLICY IF EXISTS "Users can update their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can update their own active accounts" ON accounts;
DROP POLICY IF EXISTS "Users can insert accounts they're creating" ON accounts;
DROP POLICY IF EXISTS "Prevent direct deletes" ON accounts;

-- SELECT Policy: Users can only view accounts they're members of AND accounts that are NOT soft-deleted
CREATE POLICY "Users can view their own active accounts" ON accounts
  FOR SELECT
  USING (
    id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
    AND deleted_at IS NULL  -- Only show active accounts
  );

-- INSERT Policy: Users can create new accounts (new accounts start as active)
CREATE POLICY "Users can insert accounts they're creating" ON accounts
  FOR INSERT
  WITH CHECK (
    deleted_at IS NULL  -- Ensure new accounts are not created as deleted
  );

-- UPDATE Policy: Users can update accounts they're members of (admins/owners only)
CREATE POLICY "Users can update their own active accounts" ON accounts
  FOR UPDATE
  USING (
    id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')  -- Only admins/owners can update account settings
    )
  )
  WITH CHECK (
    id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
    -- Allow soft delete (NULL -> timestamp) but prevent undelete (timestamp -> NULL)
    AND (
      deleted_at IS NULL  -- Normal updates to active accounts
      OR
      (deleted_at IS NOT NULL AND
       (SELECT deleted_at FROM accounts WHERE accounts.id = id) IS NULL)  -- Allow soft delete
    )
  );

-- DELETE Policy: Prevent hard deletes (use soft delete instead)
CREATE POLICY "Prevent direct deletes" ON accounts
  FOR DELETE
  USING (false);  -- No user can hard delete

-- =====================================================
-- SECTION 5: Create public view for non-sensitive data
-- =====================================================

-- Create a view that exposes only non-sensitive account data
CREATE OR REPLACE VIEW accounts_public AS
SELECT
  id,
  name,
  slug,
  subscription_tier,
  created_at,
  updated_at,
  trial_end_date,
  is_verified
  -- Exclude: usage counters, feature flags, deleted_at, usage_reset_date
  -- These should only be accessible to admins/owners
FROM accounts
WHERE deleted_at IS NULL;  -- Only show active accounts

-- Grant access to the view
GRANT SELECT ON accounts_public TO authenticated;

-- =====================================================
-- SECTION 6: Migration notes and recommendations
-- =====================================================

-- NOTES:
-- 1. All counters default to 0 for new accounts
-- 2. Triggers should be created to automatically update usage counters when resources are created/deleted
-- 3. current_monthly_ai_requests will be reset monthly by scheduled job
-- 4. Existing accounts will need their counters initialized by counting current resources
-- 5. trial_end_date will be NULL for accounts not on trial
-- 6. usage_reset_date should be set when subscription starts
-- 7. deleted_at will be NULL for active accounts
-- 8. When account is "deleted", set deleted_at = NOW() instead of DELETE
-- 9. Most queries should filter by WHERE deleted_at IS NULL
-- 10. Cleanup job should permanently delete accounts where deleted_at < NOW() - INTERVAL '90 days'

-- RECOMMENDATIONS:
-- 1. Create triggers to update usage counters automatically (Phase S.1.10)
-- 2. Create scheduled job for monthly usage resets (Phase S.1.10)
-- 3. Create cleanup job for permanently deleting old soft-deleted accounts
-- 4. Initialize usage counters for existing accounts with a data migration script
-- 5. Generate slugs for existing accounts (can be done with a separate script)

-- =====================================================
-- End of Migration S.1.1
-- =====================================================
