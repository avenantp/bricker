-- Update columns table schema
-- 1. Rename position to ordinal_position
-- 2. Add default_value column
-- 3. Add additional metadata columns

-- Rename position to ordinal_position
ALTER TABLE public.columns
  RENAME COLUMN position TO ordinal_position;

-- Add default_value column (was missing)
ALTER TABLE public.columns
  ADD COLUMN IF NOT EXISTS default_value text;

-- Add additional metadata columns for full SQL Server metadata support
ALTER TABLE public.columns
  ADD COLUMN IF NOT EXISTS max_length integer,
  ADD COLUMN IF NOT EXISTS precision integer,
  ADD COLUMN IF NOT EXISTS scale integer,
  ADD COLUMN IF NOT EXISTS is_identity boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_computed boolean DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN columns.ordinal_position IS 'Column position/order in the table';
COMMENT ON COLUMN columns.default_value IS 'Default value for the column';
COMMENT ON COLUMN columns.max_length IS 'Maximum length for character/binary types (adjusted for Unicode types)';
COMMENT ON COLUMN columns.precision IS 'Precision for numeric/decimal types';
COMMENT ON COLUMN columns.scale IS 'Scale for numeric/decimal types';
COMMENT ON COLUMN columns.is_identity IS 'Column is an identity/auto-increment column';
COMMENT ON COLUMN columns.is_computed IS 'Column is a computed column';
