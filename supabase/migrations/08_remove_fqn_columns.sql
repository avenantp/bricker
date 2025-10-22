--
-- Migration: Remove FQN and fully_qualified_name columns
-- Date: 2025-10-22
--
-- These values should be computed at runtime, not stored in the database
-- - datasets.fully_qualified_name will be computed as: connection.database_name.schema.name
-- - columns.fqn will be computed as: dataset_fqn.column_name
--

-- Drop the fqn column from columns table
ALTER TABLE public.columns DROP COLUMN IF EXISTS fqn;

-- Drop the fully_qualified_name column from datasets table
ALTER TABLE public.datasets DROP COLUMN IF EXISTS fully_qualified_name;

-- Add comment to explain runtime computation
COMMENT ON TABLE public.datasets IS 'Dataset metadata. Note: fully_qualified_name is computed at runtime as connection.database_name.schema.name';
COMMENT ON TABLE public.columns IS 'Column metadata. Note: fqn (fully qualified name) is computed at runtime as dataset_fqn.column_name';
