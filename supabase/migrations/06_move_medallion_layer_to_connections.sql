-- Move medallion_layer from datasets to connections table
-- This makes more architectural sense as the medallion layer is typically
-- defined at the connection/source level, not per individual dataset

-- Step 1: Add medallion_layer to connections table
ALTER TABLE public.connections
  ADD COLUMN IF NOT EXISTS medallion_layer character varying;

-- Add check constraint for medallion_layer values on connections
-- Drop existing constraint first if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'connections_medallion_layer_check'
    ) THEN
        ALTER TABLE public.connections DROP CONSTRAINT connections_medallion_layer_check;
    END IF;
END $$;

-- Add the constraint
ALTER TABLE public.connections
  ADD CONSTRAINT connections_medallion_layer_check
  CHECK (medallion_layer IS NULL OR medallion_layer IN ('Source', 'Raw', 'Bronze', 'Silver', 'Gold'));

-- Add comment
COMMENT ON COLUMN connections.medallion_layer IS 'Data medallion architecture layer: Source (landing/staging), Raw (untransformed), Bronze (validated), Silver (enriched), Gold (aggregated/curated). All datasets from this connection will inherit this layer.';

-- Step 2: Migrate existing medallion_layer data from datasets to connections
-- For each connection, set the medallion_layer to the most common value from its datasets
UPDATE public.connections c
SET medallion_layer = (
  SELECT d.medallion_layer
  FROM public.datasets d
  WHERE d.connection_id = c.id
    AND d.medallion_layer IS NOT NULL
    AND d.deleted_at IS NULL
  GROUP BY d.medallion_layer
  ORDER BY COUNT(*) DESC
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1
  FROM public.datasets d
  WHERE d.connection_id = c.id
    AND d.medallion_layer IS NOT NULL
    AND d.deleted_at IS NULL
);

-- Step 3: Drop the constraint from datasets table
-- This must be done before dropping the column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'datasets_medallion_layer_check'
    ) THEN
        ALTER TABLE public.datasets DROP CONSTRAINT datasets_medallion_layer_check;
    END IF;
END $$;

-- Step 4: Drop the medallion_layer column from datasets table
-- Simple ALTER TABLE without DO block to avoid triggering internal Supabase maintenance
ALTER TABLE public.datasets
  DROP COLUMN IF EXISTS medallion_layer;
