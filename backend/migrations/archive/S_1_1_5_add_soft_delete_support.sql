-- =====================================================
-- Migration: S.1.1.5 - Add soft delete support
-- =====================================================
-- Description: Adds deleted_at column for soft delete functionality
-- Author: System
-- Date: 2025-01-15
-- =====================================================

-- Add deleted_at column for soft delete
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;

-- Add comment
COMMENT ON COLUMN accounts.deleted_at IS 'Timestamp when account was soft deleted (NULL = active account)';

-- Create partial index on active accounts (deleted_at IS NULL)
-- This makes queries for active accounts much faster
CREATE INDEX IF NOT EXISTS idx_accounts_active ON accounts(id) WHERE deleted_at IS NULL;

-- Create index on deleted accounts for cleanup jobs
CREATE INDEX IF NOT EXISTS idx_accounts_deleted_at ON accounts(deleted_at) WHERE deleted_at IS NOT NULL;

-- =====================================================
-- Notes:
-- - deleted_at will be NULL for active accounts
-- - When account is "deleted", set deleted_at = NOW() instead of DELETE
-- - Allows grace period (30-90 days) before permanent deletion
-- - Most queries should filter by WHERE deleted_at IS NULL
-- - Cleanup job should permanently delete accounts where deleted_at < NOW() - INTERVAL '90 days'
-- =====================================================
