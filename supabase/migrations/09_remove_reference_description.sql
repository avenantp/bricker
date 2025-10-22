-- Remove reference_description column from columns table
-- This column is no longer required as it's redundant with the relationships table

ALTER TABLE public.columns
  DROP COLUMN IF EXISTS reference_description;

COMMENT ON TABLE public.columns IS 'Column metadata for datasets. Reference descriptions should be stored in the relationships table instead.';
