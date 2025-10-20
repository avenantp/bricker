-- =====================================================
-- Migration: S.1.1.2 - Add subscription tracking columns
-- =====================================================
-- Description: Adds trial_end_date and usage_reset_date columns
-- Author: System
-- Date: 2025-01-15
-- =====================================================

-- Add trial_end_date column
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMP;

-- Add usage_reset_date column
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS usage_reset_date TIMESTAMP;

-- Add comments
COMMENT ON COLUMN accounts.trial_end_date IS 'Date when the trial period ends for this account';
COMMENT ON COLUMN accounts.usage_reset_date IS 'Date when monthly usage counters (AI requests) reset';

-- Create index on trial_end_date for querying expiring trials
CREATE INDEX IF NOT EXISTS idx_accounts_trial_end ON accounts(trial_end_date) WHERE trial_end_date IS NOT NULL;

-- =====================================================
-- Notes:
-- - trial_end_date will be NULL for accounts not on trial
-- - usage_reset_date should be set when subscription starts
-- - usage_reset_date will be updated monthly by scheduled job
-- - Index will help with scheduled jobs checking for expiring trials
-- =====================================================
