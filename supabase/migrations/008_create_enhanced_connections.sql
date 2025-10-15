-- =====================================================
-- Migration 008: Enhanced Connections Table
-- =====================================================
-- Creates enhanced connections table with full vendor support,
-- security, testing, and metadata import capabilities
-- =====================================================

-- Drop existing connections table (it's minimal)
DROP TABLE IF EXISTS connections CASCADE;

-- Create enhanced connections table
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Identity
  name VARCHAR NOT NULL,
  description TEXT,

  -- Connection Type
  connection_type VARCHAR NOT NULL CHECK (
    connection_type IN (
      'MSSQL',
      'Databricks',
      'Snowflake',
      'Salesforce',
      'Workday',
      'ServiceNow',
      'FileSystem',
      'REST'
    )
  ),

  -- Configuration (encrypted)
  configuration JSONB NOT NULL,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMP,
  test_status VARCHAR CHECK (test_status IN ('success', 'failed', 'pending', 'untested')),
  test_error_message TEXT,

  -- Metadata Import Settings
  import_settings JSONB DEFAULT '{}',
  last_import_at TIMESTAMP,

  -- Ownership and Security
  owner_id UUID REFERENCES users(id),
  visibility VARCHAR NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'locked')),
  is_locked BOOLEAN DEFAULT false,

  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(account_id, workspace_id, name)
);

-- Create connection metadata cache table
CREATE TABLE connection_metadata_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,

  -- Metadata Type
  metadata_type VARCHAR NOT NULL CHECK (
    metadata_type IN ('schema', 'table', 'column', 'index', 'constraint')
  ),

  -- Metadata Content
  metadata JSONB NOT NULL,

  -- Caching
  cached_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_stale BOOLEAN DEFAULT false,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Connections indexes
CREATE INDEX idx_connections_account ON connections(account_id);
CREATE INDEX idx_connections_workspace ON connections(workspace_id);
CREATE INDEX idx_connections_owner ON connections(owner_id);
CREATE INDEX idx_connections_type ON connections(connection_type);
CREATE INDEX idx_connections_status ON connections(is_active);

-- Connection metadata cache indexes
CREATE INDEX idx_connection_metadata_connection ON connection_metadata_cache(connection_id);
CREATE INDEX idx_connection_metadata_type ON connection_metadata_cache(metadata_type);
CREATE INDEX idx_connection_metadata_stale ON connection_metadata_cache(is_stale) WHERE is_stale = true;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_metadata_cache ENABLE ROW LEVEL SECURITY;

-- RLS Policies for connections
-- Users can view connections in their account
CREATE POLICY connections_isolation_policy ON connections
  FOR SELECT
  USING (account_id IN (SELECT account_id FROM account_users WHERE user_id = auth.uid()));

-- Only owner and account admins can update
CREATE POLICY connections_update_policy ON connections
  FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR
    (SELECT role FROM account_users WHERE user_id = auth.uid() AND account_id = connections.account_id) IN ('owner', 'admin')
  );

-- Account members can insert
CREATE POLICY connections_insert_policy ON connections
  FOR INSERT
  WITH CHECK (account_id IN (SELECT account_id FROM account_users WHERE user_id = auth.uid()));

-- Only owner and account admins can delete
CREATE POLICY connections_delete_policy ON connections
  FOR DELETE
  USING (
    owner_id = auth.uid()
    OR
    (SELECT role FROM account_users WHERE user_id = auth.uid() AND account_id = connections.account_id) IN ('owner', 'admin')
  );

-- RLS Policies for connection_metadata_cache
-- Users can access cache for connections they can access
CREATE POLICY connection_metadata_cache_policy ON connection_metadata_cache
  FOR ALL
  USING (connection_id IN (SELECT id FROM connections WHERE account_id IN (SELECT account_id FROM account_users WHERE user_id = auth.uid())));

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Add trigger for updated_at on connections
DROP TRIGGER IF EXISTS update_connections_updated_at ON connections;
CREATE TRIGGER update_connections_updated_at
  BEFORE UPDATE ON connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add trigger for updated_at on connection_metadata_cache
DROP TRIGGER IF EXISTS update_connection_metadata_cache_updated_at ON connection_metadata_cache;
CREATE TRIGGER update_connection_metadata_cache_updated_at
  BEFORE UPDATE ON connection_metadata_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE connections IS 'Data source connections with encryption and multi-tenant isolation';
COMMENT ON TABLE connection_metadata_cache IS 'Cached metadata from connection sources (schemas, tables, columns)';

COMMENT ON COLUMN connections.account_id IS 'Multi-tenant isolation - all connections belong to an account';
COMMENT ON COLUMN connections.workspace_id IS 'Optional workspace scoping for connection access';
COMMENT ON COLUMN connections.connection_type IS 'Vendor type: MSSQL, Databricks, Snowflake, Salesforce, Workday, ServiceNow, FileSystem, REST';
COMMENT ON COLUMN connections.configuration IS 'Encrypted connection configuration (credentials, endpoints, etc)';
COMMENT ON COLUMN connections.test_status IS 'Last test result: success, failed, pending, untested';
COMMENT ON COLUMN connections.import_settings IS 'Settings for metadata import operations';

COMMENT ON COLUMN connection_metadata_cache.metadata_type IS 'Type of cached metadata: schema, table, column, index, constraint';
COMMENT ON COLUMN connection_metadata_cache.metadata IS 'Cached metadata content as JSON';
COMMENT ON COLUMN connection_metadata_cache.is_stale IS 'Flag indicating cache needs refresh';

-- =====================================================
-- END OF MIGRATION
-- =====================================================
