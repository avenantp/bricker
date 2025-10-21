-- Add metadata fields to connections table for different connection types
-- Supports File, SQL Server, Databricks, and other connection types

-- Note: We use the existing medallion_layer column for integration stage
-- medallion_layer already exists from migration 06 and serves the same purpose
-- Values: Source, Raw, Bronze, Silver, Gold (matches integration stages)

-- Add container for file-based connections (Azure Blob, ADLS, S3, etc.)
ALTER TABLE public.connections
  ADD COLUMN IF NOT EXISTS container character varying;

-- Add external_location for cloud storage URLs
ALTER TABLE public.connections
  ADD COLUMN IF NOT EXISTS external_location text;

-- Add record_source for data lineage tracking
ALTER TABLE public.connections
  ADD COLUMN IF NOT EXISTS record_source character varying;

-- Add catalog for Databricks/Unity Catalog connections
ALTER TABLE public.connections
  ADD COLUMN IF NOT EXISTS catalog character varying;

-- Add generic connection_string field (encrypted)
-- Note: We already have password_encrypted, but this is for full connection strings
ALTER TABLE public.connections
  ADD COLUMN IF NOT EXISTS connection_string_encrypted text;

-- Add comments for documentation
COMMENT ON COLUMN connections.container IS 'Container name for file-based connections (Azure Blob, ADLS Gen2, S3 bucket)';
COMMENT ON COLUMN connections.external_location IS 'External location URL for cloud storage (abfss://, s3://, etc.)';
COMMENT ON COLUMN connections.record_source IS 'Record source identifier for data lineage and auditing';
COMMENT ON COLUMN connections.catalog IS 'Catalog name for Databricks Unity Catalog or other catalog-based systems';
COMMENT ON COLUMN connections.connection_string_encrypted IS 'Encrypted connection string for systems that use full connection strings';
