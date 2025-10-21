-- Add missing column metadata fields
-- These fields are needed for full SQL Server metadata import

-- Add data type metadata fields to columns table
ALTER TABLE public.columns
  ADD COLUMN IF NOT EXISTS max_length integer,
  ADD COLUMN IF NOT EXISTS precision integer,
  ADD COLUMN IF NOT EXISTS scale integer,
  ADD COLUMN IF NOT EXISTS is_identity boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_computed boolean DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN columns.max_length IS 'Maximum length for character/binary types (adjusted for Unicode types)';
COMMENT ON COLUMN columns.precision IS 'Precision for numeric/decimal types';
COMMENT ON COLUMN columns.scale IS 'Scale for numeric/decimal types';
COMMENT ON COLUMN columns.is_identity IS 'Column is an identity/auto-increment column';
COMMENT ON COLUMN columns.is_computed IS 'Column is a computed column';

-- Add medallion_layer to datasets table for data architecture layer classification
ALTER TABLE public.datasets
  ADD COLUMN IF NOT EXISTS medallion_layer character varying;

-- Add check constraint for medallion_layer values
ALTER TABLE public.datasets
  ADD CONSTRAINT datasets_medallion_layer_check
  CHECK (medallion_layer IS NULL OR medallion_layer IN ('Source', 'Raw', 'Bronze', 'Silver', 'Gold'));

-- Add comment
COMMENT ON COLUMN datasets.medallion_layer IS 'Data medallion architecture layer: Source (landing/staging), Raw (untransformed), Bronze (validated), Silver (enriched), Gold (aggregated/curated)';
