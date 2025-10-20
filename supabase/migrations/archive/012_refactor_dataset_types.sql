-- =====================================================
-- Migration: 012_refactor_dataset_types
-- Refactor dataset classification fields
-- Changes:
--   1. Add 'Source' to medallion_layer options
--   2. Remove entity_subtype column
--   3. Rename entity_type to dataset_type with new options
--   4. Remove materialization_type column
-- =====================================================

-- Step 1: Add 'Source' to medallion_layer check constraint
ALTER TABLE datasets DROP CONSTRAINT IF EXISTS datasets_medallion_layer_check;
ALTER TABLE datasets ADD CONSTRAINT datasets_medallion_layer_check
  CHECK (medallion_layer IN ('Source', 'Raw', 'Bronze', 'Silver', 'Gold'));

-- Step 2: Add new dataset_type column with expanded options
ALTER TABLE datasets
ADD COLUMN IF NOT EXISTS dataset_type VARCHAR(50);

-- Copy data from entity_type to dataset_type
UPDATE datasets
SET dataset_type = entity_type
WHERE entity_type IS NOT NULL;

-- Step 3: Update dataset_type values for old entity_subtype values
-- For DataVault types, use the subtype as the dataset_type
UPDATE datasets
SET dataset_type = entity_subtype
WHERE entity_type = 'DataVault'
  AND entity_subtype IS NOT NULL;

-- For DataMart types with Dimension or Fact subtypes
UPDATE datasets
SET dataset_type = entity_subtype
WHERE entity_type = 'DataMart'
  AND entity_subtype IN ('Dimension', 'Fact');

-- For materialization types Table and View, if dataset_type is still generic
UPDATE datasets
SET dataset_type = materialization_type
WHERE materialization_type IN ('Table', 'View')
  AND dataset_type NOT IN ('Hub', 'Link', 'Satellite', 'LinkSatellite', 'Dimension', 'Fact');

-- Step 4: Add check constraint for dataset_type
ALTER TABLE datasets ADD CONSTRAINT datasets_dataset_type_check
  CHECK (dataset_type IN (
    'Table',
    'View',
    'Dimension',
    'Fact',
    'Hub',
    'Link',
    'Satellite',
    'LinkSatellite',
    'Point In Time',
    'Bridge',
    'Reference',
    'Hierarchy Link',
    'Same as Link',
    'Reference Satellite',
    'File'
  ));

-- Step 5: Remove old columns
ALTER TABLE datasets DROP COLUMN IF EXISTS entity_type;
ALTER TABLE datasets DROP COLUMN IF EXISTS entity_subtype;
ALTER TABLE datasets DROP COLUMN IF EXISTS materialization_type;

-- Step 6: Add comment for documentation
COMMENT ON COLUMN datasets.dataset_type IS 'Type of dataset: Table, View, Dimension, Fact, Hub, Link, Satellite, LinkSatellite, Point In Time, Bridge, Reference, Hierarchy Link, Same as Link, Reference Satellite, File';
COMMENT ON COLUMN datasets.medallion_layer IS 'Data medallion architecture layer: Source, Raw, Bronze, Silver, Gold';

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- IMPORTANT NOTES:
-- 1. This migration converts entity_type + entity_subtype + materialization_type into a single dataset_type field
-- 2. Data Vault subtypes (Hub, Link, Satellite, etc.) become top-level dataset types
-- 3. Dimensional model subtypes (Dimension, Fact) become top-level dataset types
-- 4. Materialization types (Table, View) are preserved as dataset types when appropriate
-- 5. 'Source' is added as a new medallion layer option for source/landing zone data
