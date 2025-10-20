-- =====================================================
-- Migration: S.1.1.1 - Add slug column to accounts table
-- =====================================================
-- Description: Adds a URL-friendly slug identifier to accounts table
-- Author: System
-- Date: 2025-01-15
-- =====================================================

-- Add slug column to accounts table
ALTER TABLE accounts ADD COLUMN IF NOT EXISTS slug VARCHAR UNIQUE;

-- Create index on slug for fast lookups
CREATE INDEX IF NOT EXISTS idx_accounts_slug ON accounts(slug);

-- Add comment
COMMENT ON COLUMN accounts.slug IS 'URL-friendly identifier for the account (e.g., acme-corp)';

-- =====================================================
-- Notes:
-- - Existing accounts will need slugs generated from their names
-- - Slug should be lowercase, hyphenated (e.g., "Acme Corp" -> "acme-corp")
-- - A function to auto-generate slugs can be added in future migration
-- =====================================================
