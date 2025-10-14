-- =====================================================
-- Migration: S.1.1.3 - Add usage tracking columns
-- =====================================================
-- Description: Adds real-time usage tracking columns to accounts table
-- Author: System
-- Date: 2025-01-15
-- =====================================================

-- Add usage tracking columns
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS current_user_count INTEGER DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS current_project_count INTEGER DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS current_dataset_count INTEGER DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS current_monthly_ai_requests INTEGER DEFAULT 0;
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS current_storage_mb INTEGER DEFAULT 0;

-- Add comments
COMMENT ON COLUMN accounts.current_user_count IS 'Current number of active users in the account';
COMMENT ON COLUMN accounts.current_project_count IS 'Current number of projects in the account';
COMMENT ON COLUMN accounts.current_dataset_count IS 'Current number of datasets in the account';
COMMENT ON COLUMN accounts.current_monthly_ai_requests IS 'Current number of AI requests this month';
COMMENT ON COLUMN accounts.current_storage_mb IS 'Current storage used in megabytes';

-- Add check constraints to ensure non-negative values
ALTER TABLE accounts ADD CONSTRAINT chk_current_user_count CHECK (current_user_count >= 0);
ALTER TABLE accounts ADD CONSTRAINT chk_current_project_count CHECK (current_project_count >= 0);
ALTER TABLE accounts ADD CONSTRAINT chk_current_dataset_count CHECK (current_dataset_count >= 0);
ALTER TABLE accounts ADD CONSTRAINT chk_current_monthly_ai_requests CHECK (current_monthly_ai_requests >= 0);
ALTER TABLE accounts ADD CONSTRAINT chk_current_storage_mb CHECK (current_storage_mb >= 0);

-- =====================================================
-- Notes:
-- - All counters default to 0
-- - Triggers will automatically update these counters when resources are created/deleted
-- - current_monthly_ai_requests will be reset monthly by scheduled job
-- - Existing accounts will need their counters initialized by counting current resources
-- =====================================================
