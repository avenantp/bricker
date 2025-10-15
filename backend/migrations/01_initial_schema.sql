-- =====================================================
-- INITIAL SCHEMA
-- =====================================================
-- This schema represents the current state of the database
-- after all migrations have been applied
-- Generated: 2025-01-15
--
-- This is the consolidated schema for the Uroq application
-- All previous migrations have been applied and this represents
-- the final state
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Subscription Plans
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL UNIQUE,
  tier VARCHAR NOT NULL CHECK (tier IN ('free', 'pro', 'enterprise', 'custom')),
  price_monthly NUMERIC,
  price_yearly NUMERIC,
  max_users INTEGER,
  max_projects INTEGER,
  max_datasets INTEGER,
  features JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);


-- Accounts (multi-tenant root)
CREATE TABLE IF NOT EXISTS accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL UNIQUE,
  account_type VARCHAR NOT NULL CHECK (account_type IN ('individual', 'organization')), -- Formerly company_type

  -- Subscription
  current_plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL, -- Link to the active plan
  subscription_tier VARCHAR DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise', 'custom')),
  subscription_status VARCHAR DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'cancelled', 'trialing', 'past_due')), -- Added 'trialing', 'past_due' for more granularity
  subscription_start_date TIMESTAMP,
  subscription_end_date TIMESTAMP,

  -- Billing
  billing_email VARCHAR,
  billing_address JSONB,
  stripe_customer_id VARCHAR UNIQUE, -- ID from your payment gateway (e.g., Stripe)

  -- Limits (could also be derived from current_plan_id)
  max_users INTEGER DEFAULT 1,
  max_projects INTEGER DEFAULT 5,
  max_datasets INTEGER DEFAULT 100,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions (New table for detailed subscription management)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,
  stripe_subscription_id VARCHAR UNIQUE,
  status VARCHAR NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'incomplete_expired', 'paused')),
  start_date TIMESTAMP NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  cancel_at_period_end BOOLEAN DEFAULT false,
  trial_start TIMESTAMP,
  trial_end TIMESTAMP,
  auto_renew BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(account_id, plan_id) -- An account can only have one active subscription to a plan at a time
);

-- Payments (New table to track transactions)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL, -- Link to subscription if applicable
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  stripe_payment_intent_id VARCHAR UNIQUE, -- Or charge ID, transaction ID
  amount NUMERIC NOT NULL,
  currency VARCHAR NOT NULL DEFAULT 'usd',
  status VARCHAR NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  payment_method VARCHAR,
  processed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- USERS & AUTHENTICATION
-- =====================================================

-- Users (extends Supabase auth.users)
-- Note: id matches auth.users(id) but we don't enforce FK constraint
-- because auth.users is in a different schema managed by Supabase
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Removed company_id and company_role - managed by account_users table

  -- Identity
  email VARCHAR NOT NULL UNIQUE,
  full_name VARCHAR,
  avatar_url VARCHAR,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,

  -- Metadata
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- MEMBERSHIP/ACCESS TABLES
-- =====================================================

-- Company Users (account membership)
CREATE TABLE IF NOT EXISTS account_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE, -- Renamed from company_id
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(account_id, user_id)
);

-- =====================================================
-- PROJECTS
-- =====================================================

-- Projects
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE, -- Renamed from company_id

  name VARCHAR NOT NULL,
  description TEXT,
  project_type VARCHAR CHECK (project_type IN ('Standard', 'DataVault', 'Dimensional')),
  configuration JSONB,

  -- Ownership and Security
  owner_id UUID REFERENCES users(id),
  visibility VARCHAR NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'locked')),
  is_locked BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(account_id, name)
);

-- Project Users (project access control)
CREATE TABLE IF NOT EXISTS project_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- =====================================================
-- WORKSPACES
-- =====================================================

-- Workspaces (branches/environments)
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,

  name VARCHAR NOT NULL,
  description TEXT,

  -- Source control integration
  source_control_repo_url VARCHAR,
  source_control_branch VARCHAR,
  source_control_commit_sha VARCHAR,
  source_control_provider VARCHAR DEFAULT 'github' CHECK (source_control_provider IN ('github', 'gitlab', 'bitbucket', 'azure', 'other')),
  source_control_connection_status VARCHAR,
  last_synced_at TIMESTAMP,
  is_synced BOOLEAN DEFAULT false,

  -- Ownership and Security
  owner_id UUID REFERENCES users(id),
  visibility VARCHAR NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'locked')),
  is_locked BOOLEAN DEFAULT false,

  -- Settings
  settings JSONB DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(account_id, project_id, name)
);

-- Workspace Users (workspace access control)
CREATE TABLE IF NOT EXISTS workspace_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

-- =====================================================
-- DATA MODEL (Datasets, Columns, Lineage)
-- =====================================================

-- Datasets (formerly Nodes)
CREATE TABLE IF NOT EXISTS datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id),
  project_id UUID REFERENCES projects(id),

  -- Identity
  fqn VARCHAR NOT NULL,
  name VARCHAR NOT NULL,

  -- Classification
  medallion_layer VARCHAR CHECK (medallion_layer IN ('Raw', 'Bronze', 'Silver', 'Gold')),
  entity_type VARCHAR CHECK (entity_type IN ('Table', 'Staging', 'PersistentStaging', 'DataVault', 'DataMart')),
  entity_subtype VARCHAR CHECK (entity_subtype IN ('Dimension', 'Fact', 'Hub', 'Link', 'Satellite', 'LinkSatellite', 'PIT', 'Bridge')),
  materialization_type VARCHAR CHECK (materialization_type IN ('Table', 'View', 'MaterializedView')),

  -- Documentation
  description TEXT,
  metadata JSONB,

  -- AI metadata
  ai_confidence_score INTEGER CHECK (ai_confidence_score BETWEEN 0 AND 100),

  -- Ownership and Security
  owner_id UUID REFERENCES users(id),
  visibility VARCHAR NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'locked')),
  is_locked BOOLEAN DEFAULT false,

  -- Source control sync tracking
  source_control_file_path VARCHAR,
  source_control_commit_sha VARCHAR,
  has_uncommitted_changes BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMP,
  sync_status VARCHAR DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'conflict', 'error')),
  sync_error_message TEXT,

  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(account_id, fqn)
);

-- Columns (formerly NodeItems)
CREATE TABLE IF NOT EXISTS columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,

  -- Identity
  fqn VARCHAR NOT NULL,
  name VARCHAR NOT NULL,

  -- Data type
  data_type VARCHAR NOT NULL,

  -- Documentation
  description TEXT,
  business_name VARCHAR,

  -- Properties
  is_primary_key BOOLEAN DEFAULT false,
  is_foreign_key BOOLEAN DEFAULT false,
  is_nullable BOOLEAN DEFAULT true,
  default_value TEXT,

  -- Reference (replaces separate references table)
  reference_column_id UUID REFERENCES columns(id) ON DELETE SET NULL,
  reference_type VARCHAR CHECK (reference_type IN ('FK', 'BusinessKey', 'NaturalKey')),
  reference_description TEXT,

  -- Transformation
  transformation_logic TEXT,

  -- AI metadata
  ai_confidence_score INTEGER CHECK (ai_confidence_score BETWEEN 0 AND 100),

  -- Position
  position INTEGER,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(dataset_id, name)
);

-- Lineage (data flow tracking)
CREATE TABLE IF NOT EXISTS lineage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id),

  -- Downstream (target)
  downstream_dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  downstream_column_id UUID REFERENCES columns(id) ON DELETE CASCADE,

  -- Upstream (source)
  upstream_dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  upstream_column_id UUID REFERENCES columns(id) ON DELETE CASCADE,

  -- Mapping properties
  mapping_type VARCHAR NOT NULL CHECK (mapping_type IN ('Direct', 'Transform', 'Derived', 'Calculated')),
  transformation_expression TEXT,

  -- Lineage metadata
  lineage_type VARCHAR DEFAULT 'direct' CHECK (lineage_type IN ('direct', 'indirect')),

  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(downstream_column_id, upstream_column_id)
);

-- =====================================================
-- MAPPING TABLES (Many-to-Many)
-- =====================================================

-- Project-Dataset Mapping
CREATE TABLE IF NOT EXISTS project_datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  added_by UUID REFERENCES users(id),
  UNIQUE(project_id, dataset_id)
);

-- Workspace-Dataset Mapping
CREATE TABLE IF NOT EXISTS workspace_datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  canvas_position JSONB,
  added_at TIMESTAMP DEFAULT NOW(),
  added_by UUID REFERENCES users(id),
  UNIQUE(workspace_id, dataset_id)
);

-- =====================================================
-- ENVIRONMENTS & CONNECTIONS
-- =====================================================

-- Environments (deployment targets - vendor agnostic)
CREATE TABLE IF NOT EXISTS environments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  workspace_id UUID REFERENCES workspaces(id),

  name VARCHAR NOT NULL,
  description TEXT,

  -- Platform target (vendor-agnostic)
  target_platform VARCHAR CHECK (target_platform IN ('databricks', 'snowflake', 'bigquery', 'redshift', 'synapse', 'other')),
  target_catalog VARCHAR,
  target_schema VARCHAR,
  platform_url VARCHAR,
  platform_config JSONB,

  -- Deployment
  auto_deploy BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, name)
);

-- Connections (data source connections)
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id),

  name VARCHAR NOT NULL,
  connection_type VARCHAR NOT NULL CHECK (connection_type IN ('MSSQL', 'Databricks', 'Snowflake', 'Salesforce', 'REST')),
  configuration JSONB,
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- TEMPLATES & MACROS
-- =====================================================

-- Macros (reusable code fragments)
CREATE TABLE IF NOT EXISTS macros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  name VARCHAR NOT NULL UNIQUE,
  description TEXT,
  code_fragment TEXT NOT NULL,
  language VARCHAR NOT NULL CHECK (language IN ('SQL', 'Python', 'Scala')),
  parameters JSONB,
  usage_example TEXT,

  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Templates (Jinja2 templates)
CREATE TABLE IF NOT EXISTS templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  name VARCHAR NOT NULL,
  template_type VARCHAR NOT NULL CHECK (template_type IN ('Full', 'Fragment')),
  description TEXT,
  jinja_content TEXT NOT NULL,

  is_system BOOLEAN DEFAULT false,
  parent_template_id UUID REFERENCES templates(id),

  injection_points JSONB,
  variables JSONB,

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Template Fragments
CREATE TABLE IF NOT EXISTS template_fragments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES templates(id),

  name VARCHAR NOT NULL,
  injection_point_name VARCHAR NOT NULL,
  jinja_content TEXT NOT NULL,

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(template_id, injection_point_name)
);

-- =====================================================
-- SOURCE CONTROL & AUDIT
-- =====================================================

-- Source Code Commits (version control tracking)
CREATE TABLE IF NOT EXISTS source_control_commits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  workspace_id UUID REFERENCES workspaces(id),

  -- Source control metadata
  commit_sha VARCHAR NOT NULL,
  commit_message TEXT,
  author VARCHAR,
  committed_at TIMESTAMP,
  source_control_provider VARCHAR DEFAULT 'github' CHECK (source_control_provider IN ('github', 'gitlab', 'bitbucket', 'azure', 'other')),

  -- Files affected
  files_changed JSONB,

  created_at TIMESTAMP DEFAULT NOW()
);

-- Audit Logs (change tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id),

  -- Change details
  change_type VARCHAR NOT NULL CHECK (change_type IN ('created', 'updated', 'deleted')),
  entity_type VARCHAR NOT NULL CHECK (entity_type IN ('dataset', 'column', 'lineage')),
  entity_id UUID,
  field_name VARCHAR,
  old_value JSONB,
  new_value JSONB,

  -- Audit
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT NOW(),

  -- Git correlation
  committed_in_sha VARCHAR
);

-- =====================================================
-- SYSTEM TABLES
-- =====================================================

-- Configurations (workspace settings)
CREATE TABLE IF NOT EXISTS configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id),

  name VARCHAR NOT NULL,
  type VARCHAR NOT NULL CHECK (type IN ('cluster', 'job', 'notebook', 'connection')),
  config_json JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,

  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Invitations (user invitations)
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,

  email VARCHAR NOT NULL,
  role VARCHAR NOT NULL,
  invited_by UUID REFERENCES users(id),
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Accounts
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_accounts_subscription ON accounts(subscription_status);

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Account Users
CREATE INDEX IF NOT EXISTS idx_account_users_account ON account_users(account_id);
CREATE INDEX IF NOT EXISTS idx_account_users_user ON account_users(user_id);

-- Projects
CREATE INDEX IF NOT EXISTS idx_projects_account ON projects(account_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_visibility ON projects(visibility);

-- Project Users
CREATE INDEX IF NOT EXISTS idx_project_users_project ON project_users(project_id);
CREATE INDEX IF NOT EXISTS idx_project_users_user ON project_users(user_id);

-- Workspaces
CREATE INDEX IF NOT EXISTS idx_workspaces_account ON workspaces(account_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_project ON workspaces(project_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_id);

-- Workspace Users
CREATE INDEX IF NOT EXISTS idx_workspace_users_workspace ON workspace_users(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_users_user ON workspace_users(user_id);

-- Datasets
CREATE INDEX IF NOT EXISTS idx_datasets_account ON datasets(account_id);
CREATE INDEX IF NOT EXISTS idx_datasets_workspace ON datasets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_datasets_project ON datasets(project_id);
CREATE INDEX IF NOT EXISTS idx_datasets_owner ON datasets(owner_id);
CREATE INDEX IF NOT EXISTS idx_datasets_fqn ON datasets(fqn);
CREATE INDEX IF NOT EXISTS idx_datasets_visibility ON datasets(visibility);
CREATE INDEX IF NOT EXISTS idx_datasets_sync_status ON datasets(sync_status);
CREATE INDEX IF NOT EXISTS idx_datasets_uncommitted ON datasets(has_uncommitted_changes) WHERE has_uncommitted_changes = true;

-- Columns
CREATE INDEX IF NOT EXISTS idx_columns_dataset ON columns(dataset_id);
CREATE INDEX IF NOT EXISTS idx_columns_fqn ON columns(fqn);
CREATE INDEX IF NOT EXISTS idx_columns_reference ON columns(reference_column_id);

-- Lineage
CREATE INDEX IF NOT EXISTS idx_lineage_downstream_dataset ON lineage(downstream_dataset_id);
CREATE INDEX IF NOT EXISTS idx_lineage_upstream_dataset ON lineage(upstream_dataset_id);
CREATE INDEX IF NOT EXISTS idx_lineage_downstream_column ON lineage(downstream_column_id);
CREATE INDEX IF NOT EXISTS idx_lineage_upstream_column ON lineage(upstream_column_id);
CREATE INDEX IF NOT EXISTS idx_lineage_workspace ON lineage(workspace_id);

-- Project/Workspace Datasets
CREATE INDEX IF NOT EXISTS idx_project_datasets_project ON project_datasets(project_id);
CREATE INDEX IF NOT EXISTS idx_project_datasets_dataset ON project_datasets(dataset_id);
CREATE INDEX IF NOT EXISTS idx_workspace_datasets_workspace ON workspace_datasets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_datasets_dataset ON workspace_datasets(dataset_id);

-- Environments
CREATE INDEX IF NOT EXISTS idx_environments_account ON environments(account_id);
CREATE INDEX IF NOT EXISTS idx_environments_project ON environments(project_id);
CREATE INDEX IF NOT EXISTS idx_environments_workspace ON environments(workspace_id);

-- Source Code Commits
CREATE INDEX IF NOT EXISTS idx_source_control_commits_account ON source_control_commits(account_id);
CREATE INDEX IF NOT EXISTS idx_source_control_commits_workspace ON source_control_commits(workspace_id);
CREATE INDEX IF NOT EXISTS idx_source_control_commits_project ON source_control_commits(project_id);
CREATE INDEX IF NOT EXISTS idx_source_control_commits_sha ON source_control_commits(commit_sha);
CREATE INDEX IF NOT EXISTS idx_source_control_commits_committed_at ON source_control_commits(committed_at);

-- Audit Logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_dataset ON audit_logs(dataset_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_workspace ON audit_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_uncommitted ON audit_logs(committed_in_sha) WHERE committed_in_sha IS NULL;

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Auto-update updated_at for tables
-- Note: Using DROP TRIGGER IF EXISTS to make this idempotent
DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_projects_updated_at ON projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_workspaces_updated_at ON workspaces;
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_datasets_updated_at ON datasets;
CREATE TRIGGER update_datasets_updated_at
  BEFORE UPDATE ON datasets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_columns_updated_at ON columns;
CREATE TRIGGER update_columns_updated_at
  BEFORE UPDATE ON columns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_environments_updated_at ON environments;
CREATE TRIGGER update_environments_updated_at
  BEFORE UPDATE ON environments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_connections_updated_at ON connections;
CREATE TRIGGER update_connections_updated_at
  BEFORE UPDATE ON connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_macros_updated_at ON macros;
CREATE TRIGGER update_macros_updated_at
  BEFORE UPDATE ON macros
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_templates_updated_at ON templates;
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_template_fragments_updated_at ON template_fragments;
CREATE TRIGGER update_template_fragments_updated_at
  BEFORE UPDATE ON template_fragments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_configurations_updated_at ON configurations;
CREATE TRIGGER update_configurations_updated_at
  BEFORE UPDATE ON configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE accounts IS 'Multi-tenant root - all resources belong to an account';
COMMENT ON TABLE users IS 'User profiles extending Supabase auth.users with account association';
COMMENT ON TABLE account_users IS 'Account membership with roles';
COMMENT ON TABLE projects IS 'Projects for organizing datasets and models';
COMMENT ON TABLE project_users IS 'Project access control with roles';
COMMENT ON TABLE workspaces IS 'Workspaces map to source control branches';
COMMENT ON TABLE workspace_users IS 'Workspace access control with roles';
COMMENT ON TABLE datasets IS 'Datasets (formerly nodes) - tables, views, etc.';
COMMENT ON TABLE columns IS 'Columns (formerly node_items) - dataset fields';
COMMENT ON TABLE lineage IS 'Data lineage tracking column-level dependencies';
COMMENT ON TABLE environments IS 'Deployment environments (vendor-agnostic)';
COMMENT ON TABLE source_control_commits IS 'Source control commit tracking';
COMMENT ON TABLE audit_logs IS 'Change tracking and audit trail';

-- =====================================================
-- END OF SCHEMA
-- =====================================================
