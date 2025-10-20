-- =====================================================
-- Migration: 009_add_columns_ai_metadata
-- Add missing AI metadata columns to columns table
-- Feature 4: Dataset and Column Metadata Management
-- Task 4.1.1: Database Schema Validation
-- =====================================================

-- Add ai_suggestions column for storing AI enhancement suggestions
ALTER TABLE columns
ADD COLUMN IF NOT EXISTS ai_suggestions JSONB;

-- Add last_ai_enhancement column to track when AI last enhanced this column
ALTER TABLE columns
ADD COLUMN IF NOT EXISTS last_ai_enhancement TIMESTAMP;

-- Add custom_metadata column for additional custom metadata
ALTER TABLE columns
ADD COLUMN IF NOT EXISTS custom_metadata JSONB;

-- Add comments for documentation
COMMENT ON COLUMN columns.ai_suggestions IS 'Stores AI-generated suggestions for business name, description, etc.';
COMMENT ON COLUMN columns.last_ai_enhancement IS 'Timestamp of the last AI enhancement operation on this column';
COMMENT ON COLUMN columns.custom_metadata IS 'Custom user-defined metadata in key-value format';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
