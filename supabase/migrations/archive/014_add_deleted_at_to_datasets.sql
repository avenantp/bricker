-- =====================================================
-- Add deleted_at column to datasets table
-- Migration: 014_add_deleted_at_to_datasets
-- Purpose: Add deleted_at timestamp column to support soft deletes
--          and fix trigger error "record 'old' has no field 'deleted_at'"
-- =====================================================

-- Add deleted_at column to datasets table
ALTER TABLE datasets
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Add index for querying non-deleted records
CREATE INDEX IF NOT EXISTS idx_datasets_deleted_at
ON datasets(deleted_at) WHERE deleted_at IS NULL;

-- Add comment
COMMENT ON COLUMN datasets.deleted_at IS 'Soft delete timestamp. NULL means not deleted.';

-- =====================================================
-- Update functions to handle soft deletes on datasets
-- =====================================================

-- Function to soft delete a dataset
CREATE OR REPLACE FUNCTION soft_delete_dataset(p_dataset_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE datasets
  SET deleted_at = NOW()
  WHERE id = p_dataset_id
    AND deleted_at IS NULL;
END;
$$;

COMMENT ON FUNCTION soft_delete_dataset IS 'Soft delete a dataset by setting deleted_at timestamp';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
