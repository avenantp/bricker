-- =====================================================
-- Drop any broken triggers on datasets table
-- Migration: 016_drop_broken_triggers
-- Purpose: Remove triggers that reference deleted_at column
-- =====================================================

-- Drop and recreate updated_at trigger if it exists
DROP TRIGGER IF EXISTS datasets_updated_at ON datasets;
DROP TRIGGER IF EXISTS update_datasets_updated_at ON datasets;
DROP TRIGGER IF EXISTS datasets_audit ON datasets;
DROP TRIGGER IF EXISTS datasets_soft_delete ON datasets;

-- Recreate the updated_at trigger without deleted_at reference
CREATE OR REPLACE FUNCTION update_datasets_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

CREATE TRIGGER datasets_updated_at
  BEFORE UPDATE ON datasets
  FOR EACH ROW
  EXECUTE FUNCTION update_datasets_updated_at();

-- =====================================================
-- END OF MIGRATION
-- =====================================================
