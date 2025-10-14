-- =====================================================
-- Migration: S.1.1.4 - Add feature flags
-- =====================================================
-- Description: Adds feature flag columns for account verification and trial management
-- Author: System
-- Date: 2025-01-15
-- =====================================================

-- Add feature flag columns
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS allow_trial BOOLEAN DEFAULT true;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS has_used_trial BOOLEAN DEFAULT false;

-- Add comments
COMMENT ON COLUMN accounts.is_verified IS 'Whether the account email has been verified (important for organizations)';
COMMENT ON COLUMN accounts.allow_trial IS 'Whether this account is allowed to use trial periods';
COMMENT ON COLUMN accounts.has_used_trial IS 'Whether this account has already used a trial period (prevent multiple trials)';

-- Create index for querying unverified accounts
CREATE INDEX IF NOT EXISTS idx_accounts_is_verified ON accounts(is_verified) WHERE is_verified = false;

-- =====================================================
-- Notes:
-- - is_verified should be set to true after email verification
-- - allow_trial can be set to false to prevent trial abuse
-- - has_used_trial should be set to true when trial starts (one trial per account)
-- - Index helps find unverified accounts for cleanup or reminder emails
-- =====================================================
