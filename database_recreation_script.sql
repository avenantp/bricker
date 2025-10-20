-- =====================================================
-- UROQ DATABASE RECREATION SCRIPT
-- =====================================================
-- This script recreates the entire Uroq database from scratch
-- including all tables, views, triggers, functions, and policies.
--
-- Generated: 2025-10-17
-- Version: Complete Schema Snapshot
-- =====================================================

-- =====================================================
-- SECTION 1: EXTENSIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- SECTION 2: UTILITY FUNCTIONS
-- =====================================================

-- Function to update updated_at column (used by triggers)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column IS 'Universal trigger function to automatically update updated_at timestamp';

-- =====================================================
-- SECTION 3: CORE TABLES
-- =====================================================

-- -----------------------------------------------------
-- Subscription Plans Table
-- -----------------------------------------------------
CREATE TABLE subscription_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Plan Identity
  name VARCHAR NOT NULL UNIQUE,
  slug VARCHAR NOT NULL UNIQUE,
  tier VARCHAR NOT NULL CHECK (tier IN ('free', 'pro', 'enterprise', 'custom')),
  display_name VARCHAR NOT NULL,
  description TEXT,

  -- Pricing
  price_monthly NUMERIC(10,2),
  price_yearly NUMERIC(10,2),
  currency VARCHAR DEFAULT 'usd',
  stripe_price_id_monthly VARCHAR,
  stripe_price_id_yearly VARCHAR,

  -- Limits
  max_users INTEGER,
  max_projects INTEGER,
  max_datasets INTEGER,
  max_monthly_ai_requests INTEGER,
  max_storage_mb INTEGER,
  max_workspaces_per_project INTEGER,
  max_connections INTEGER,

  -- Features
  features JSONB DEFAULT '[]',

  -- Feature Flags
  has_git_sync BOOLEAN DEFAULT true,
  has_ai_assistance BOOLEAN DEFAULT false,
  has_data_vault_accelerator BOOLEAN DEFAULT false,
  has_priority_support BOOLEAN DEFAULT false,
  has_sso BOOLEAN DEFAULT false,
  has_audit_logs BOOLEAN DEFAULT false,
  has_api_access BOOLEAN DEFAULT false,
  has_white_labeling BOOLEAN DEFAULT false,

  -- Trial
  trial_days INTEGER DEFAULT 0,

  -- Visibility
  is_active BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT true,
  is_recommended BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscription_plans_tier ON subscription_plans(tier);
CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active) WHERE is_active = true;
CREATE INDEX idx_subscription_plans_public ON subscription_plans(is_public) WHERE is_public = true;

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON subscription_plans
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE subscription_plans IS 'Subscription plan definitions with pricing, limits, and features';

-- -----------------------------------------------------
-- Accounts Table
-- -----------------------------------------------------
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL UNIQUE,
  slug VARCHAR UNIQUE,
  account_type VARCHAR NOT NULL CHECK (account_type IN ('individual', 'organization')),

  -- Subscription
  current_plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
  subscription_tier VARCHAR DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise', 'custom')),
  subscription_status VARCHAR DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'cancelled', 'trialing', 'past_due')),
  subscription_start_date TIMESTAMP,
  subscription_end_date TIMESTAMP,
  trial_end_date TIMESTAMP,
  usage_reset_date TIMESTAMP,

  -- Billing
  billing_email VARCHAR,
  billing_address JSONB,
  stripe_customer_id VARCHAR UNIQUE,

  -- Limits (from plan or custom overrides)
  max_users INTEGER DEFAULT 1,
  max_projects INTEGER DEFAULT 5,
  max_datasets INTEGER DEFAULT 100,
  max_monthly_ai_requests INTEGER DEFAULT 100,
  max_storage_mb INTEGER DEFAULT 1000,

  -- Usage Tracking
  current_user_count INTEGER DEFAULT 0,
  current_project_count INTEGER DEFAULT 0,
  current_dataset_count INTEGER DEFAULT 0,
  current_monthly_ai_requests INTEGER DEFAULT 0,
  current_storage_mb INTEGER DEFAULT 0,

  -- Feature Flags
  is_verified BOOLEAN DEFAULT false,
  allow_trial BOOLEAN DEFAULT true,
  has_used_trial BOOLEAN DEFAULT false,

  -- Soft Delete
  deleted_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

-- Add check constraints
ALTER TABLE accounts ADD CONSTRAINT chk_current_user_count CHECK (current_user_count >= 0);
ALTER TABLE accounts ADD CONSTRAINT chk_current_project_count CHECK (current_project_count >= 0);
ALTER TABLE accounts ADD CONSTRAINT chk_current_dataset_count CHECK (current_dataset_count >= 0);
ALTER TABLE accounts ADD CONSTRAINT chk_current_monthly_ai_requests CHECK (current_monthly_ai_requests >= 0);
ALTER TABLE accounts ADD CONSTRAINT chk_current_storage_mb CHECK (current_storage_mb >= 0);

-- Indexes
CREATE INDEX idx_accounts_type ON accounts(account_type);
CREATE INDEX idx_accounts_subscription ON accounts(subscription_status);
CREATE INDEX idx_accounts_slug ON accounts(slug);
CREATE INDEX idx_accounts_trial_end ON accounts(trial_end_date) WHERE trial_end_date IS NOT NULL;
CREATE INDEX idx_accounts_is_verified ON accounts(is_verified) WHERE is_verified = false;
CREATE INDEX idx_accounts_active ON accounts(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounts_deleted_at ON accounts(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE accounts IS 'Multi-tenant root - all resources belong to an account';

-- -----------------------------------------------------
-- Users Table
-- -----------------------------------------------------
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR NOT NULL UNIQUE,
  full_name VARCHAR,
  avatar_url VARCHAR,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

CREATE INDEX idx_users_email ON users(email);

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE users IS 'User profiles extending Supabase auth.users';

-- Now add foreign key constraints to accounts that reference users
ALTER TABLE accounts ADD CONSTRAINT fk_accounts_created_by
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE accounts ADD CONSTRAINT fk_accounts_updated_by
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE users ADD CONSTRAINT fk_users_created_by
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE users ADD CONSTRAINT fk_users_updated_by
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL;

-- -----------------------------------------------------
-- Subscriptions Table
-- -----------------------------------------------------
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE RESTRICT,

  -- Stripe Integration
  stripe_subscription_id VARCHAR UNIQUE,
  stripe_customer_id VARCHAR,
  stripe_price_id VARCHAR,

  -- Status
  status VARCHAR NOT NULL CHECK (status IN (
    'trialing', 'active', 'past_due', 'canceled',
    'unpaid', 'incomplete', 'incomplete_expired', 'paused'
  )),

  -- Dates
  start_date TIMESTAMP NOT NULL DEFAULT NOW(),
  end_date TIMESTAMP,
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  trial_start TIMESTAMP,
  trial_end TIMESTAMP,
  canceled_at TIMESTAMP,
  ended_at TIMESTAMP,

  -- Billing
  billing_cycle VARCHAR CHECK (billing_cycle IN ('monthly', 'yearly')),
  cancel_at_period_end BOOLEAN DEFAULT false,
  auto_renew BOOLEAN DEFAULT true,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_subscriptions_account ON subscriptions(account_id);
CREATE INDEX idx_subscriptions_plan ON subscriptions(plan_id);
CREATE INDEX idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_period_end ON subscriptions(current_period_end);
CREATE INDEX idx_subscriptions_trial_end ON subscriptions(trial_end) WHERE trial_end IS NOT NULL;
CREATE INDEX idx_subscriptions_account_status ON subscriptions(account_id, status);

CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE subscriptions IS 'Tracks account subscriptions with Stripe integration';

-- -----------------------------------------------------
-- Payments Table
-- -----------------------------------------------------
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

  -- Stripe Integration
  stripe_payment_intent_id VARCHAR UNIQUE,
  stripe_charge_id VARCHAR,
  stripe_invoice_id VARCHAR,

  -- Payment Details
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR NOT NULL DEFAULT 'usd',
  status VARCHAR NOT NULL CHECK (status IN (
    'pending', 'succeeded', 'failed', 'refunded', 'partially_refunded', 'disputed'
  )),

  -- Payment Method
  payment_method VARCHAR,
  last4 VARCHAR,
  brand VARCHAR,

  -- Failure Details
  failure_code VARCHAR,
  failure_message TEXT,

  -- Refund Details
  refund_amount NUMERIC(10,2),
  refund_reason TEXT,
  refunded_at TIMESTAMP,

  -- Dates
  processed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payments_account ON payments(account_id);
CREATE INDEX idx_payments_subscription ON payments(subscription_id);
CREATE INDEX idx_payments_stripe_payment_intent ON payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_stripe_invoice ON payments(stripe_invoice_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_processed ON payments(processed_at DESC);
CREATE INDEX idx_payments_account_processed ON payments(account_id, processed_at DESC);
CREATE INDEX idx_payments_account_status ON payments(account_id, status);

COMMENT ON TABLE payments IS 'Tracks all payment transactions from Stripe';

-- -----------------------------------------------------
-- Usage Events Table
-- -----------------------------------------------------
CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Event Details
  event_type VARCHAR NOT NULL CHECK (event_type IN (
    'ai_request', 'dataset_created', 'dataset_deleted',
    'project_created', 'project_deleted', 'user_invited',
    'user_added', 'user_removed', 'storage_used', 'storage_freed',
    'api_call', 'workspace_created', 'workspace_deleted',
    'connection_created', 'connection_deleted'
  )),
  event_category VARCHAR CHECK (event_category IN ('ai', 'resource', 'api', 'storage', 'team')),

  -- Quantity
  quantity INTEGER DEFAULT 1,
  unit VARCHAR,

  -- Context
  resource_type VARCHAR,
  resource_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_usage_events_account ON usage_events(account_id);
CREATE INDEX idx_usage_events_user ON usage_events(user_id);
CREATE INDEX idx_usage_events_type ON usage_events(event_type);
CREATE INDEX idx_usage_events_created ON usage_events(created_at DESC);
CREATE INDEX idx_usage_events_account_type_created ON usage_events(account_id, event_type, created_at DESC);
CREATE INDEX idx_usage_events_account_created ON usage_events(account_id, created_at DESC);
CREATE INDEX idx_usage_events_category ON usage_events(event_category);
CREATE INDEX idx_usage_events_resource ON usage_events(resource_type, resource_id);
CREATE INDEX idx_usage_events_ai_requests ON usage_events(account_id, created_at DESC) WHERE event_type = 'ai_request';

COMMENT ON TABLE usage_events IS 'Tracks all resource usage events for metering and analytics';

-- -----------------------------------------------------
-- Account Users (Membership) Table
-- -----------------------------------------------------
CREATE TABLE account_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  UNIQUE(account_id, user_id)
);

CREATE INDEX idx_account_users_account ON account_users(account_id);
CREATE INDEX idx_account_users_user ON account_users(user_id);

CREATE TRIGGER trigger_account_users_updated_at
  BEFORE UPDATE ON account_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE account_users IS 'Account membership with roles';

-- -----------------------------------------------------
-- Projects Table
-- -----------------------------------------------------
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  project_type VARCHAR CHECK (project_type IN ('Standard', 'DataVault', 'Dimensional')),
  configuration JSONB,
  owner_id UUID REFERENCES users(id),
  visibility VARCHAR NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'locked')),
  is_locked BOOLEAN DEFAULT false,

  -- Source Control (consolidated from project_source_control_credentials)
  source_control_provider VARCHAR DEFAULT 'github' CHECK (source_control_provider IN ('github', 'gitlab', 'bitbucket', 'azure', 'other')),
  source_control_repo_url VARCHAR,
  source_control_connection_status VARCHAR,
  source_control_last_synced_at TIMESTAMP,
  source_control_default_branch VARCHAR,
  source_control_access_token_encrypted TEXT,
  source_control_refresh_token_encrypted TEXT,
  source_control_token_expires_at TIMESTAMPTZ,
  source_control_username TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  UNIQUE(account_id, name)
);

CREATE INDEX idx_projects_account ON projects(account_id);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_visibility ON projects(visibility);
CREATE INDEX idx_projects_has_credentials ON projects(id) WHERE source_control_access_token_encrypted IS NOT NULL;
CREATE INDEX idx_projects_token_expires_at ON projects(source_control_token_expires_at) WHERE source_control_token_expires_at IS NOT NULL;

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE projects IS 'Projects for organizing datasets and models';
COMMENT ON COLUMN projects.source_control_access_token_encrypted IS 'Encrypted access token for source control provider';
COMMENT ON COLUMN projects.source_control_refresh_token_encrypted IS 'Encrypted refresh token (if supported by provider)';
COMMENT ON COLUMN projects.source_control_token_expires_at IS 'Expiration timestamp for the access token';
COMMENT ON COLUMN projects.source_control_username IS 'Username for source control authentication';

-- -----------------------------------------------------
-- Project Users Table
-- -----------------------------------------------------
CREATE TABLE project_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  joined_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_users_project ON project_users(project_id);
CREATE INDEX idx_project_users_user ON project_users(user_id);

CREATE TRIGGER trigger_project_users_updated_at
  BEFORE UPDATE ON project_users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------
-- Workspaces Table
-- -----------------------------------------------------
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,
  source_control_repo_url VARCHAR,
  source_control_branch VARCHAR,
  source_control_commit_sha VARCHAR,
  source_control_provider VARCHAR DEFAULT 'github' CHECK (source_control_provider IN ('github', 'gitlab', 'bitbucket', 'azure', 'other')),
  source_control_connection_status VARCHAR,
  last_synced_at TIMESTAMP,
  is_synced BOOLEAN DEFAULT false,
  owner_id UUID REFERENCES users(id),
  visibility VARCHAR NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'locked')),
  is_locked BOOLEAN DEFAULT false,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  UNIQUE(account_id, project_id, name)
);

CREATE INDEX idx_workspaces_account ON workspaces(account_id);
CREATE INDEX idx_workspaces_project ON workspaces(project_id);
CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);

CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE workspaces IS 'Workspaces map to source control branches';

-- -----------------------------------------------------
-- Workspace Users Table
-- -----------------------------------------------------
CREATE TABLE workspace_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspace_users_workspace ON workspace_users(workspace_id);
CREATE INDEX idx_workspace_users_user ON workspace_users(user_id);

-- -----------------------------------------------------
-- Datasets Table
-- -----------------------------------------------------
CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id),
  project_id UUID REFERENCES projects(id),
  fqn VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  medallion_layer VARCHAR CHECK (medallion_layer IN ('Raw', 'Bronze', 'Silver', 'Gold')),
  entity_type VARCHAR CHECK (entity_type IN ('Table', 'Staging', 'PersistentStaging', 'DataVault', 'DataMart')),
  entity_subtype VARCHAR CHECK (entity_subtype IN ('Dimension', 'Fact', 'Hub', 'Link', 'Satellite', 'LinkSatellite', 'PIT', 'Bridge')),
  materialization_type VARCHAR CHECK (materialization_type IN ('Table', 'View', 'MaterializedView')),
  description TEXT,
  metadata JSONB,
  ai_confidence_score INTEGER CHECK (ai_confidence_score BETWEEN 0 AND 100),
  owner_id UUID REFERENCES users(id),
  visibility VARCHAR NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'locked')),
  is_locked BOOLEAN DEFAULT false,
  source_control_file_path VARCHAR,
  source_control_commit_sha VARCHAR,
  has_uncommitted_changes BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMP,
  sync_status VARCHAR DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'conflict', 'error')),
  sync_error_message TEXT,
  deleted_at TIMESTAMP,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  UNIQUE(account_id, fqn)
);

CREATE INDEX idx_datasets_account ON datasets(account_id);
CREATE INDEX idx_datasets_workspace ON datasets(workspace_id);
CREATE INDEX idx_datasets_project ON datasets(project_id);
CREATE INDEX idx_datasets_owner ON datasets(owner_id);
CREATE INDEX idx_datasets_fqn ON datasets(fqn);
CREATE INDEX idx_datasets_visibility ON datasets(visibility);
CREATE INDEX idx_datasets_sync_status ON datasets(sync_status);
CREATE INDEX idx_datasets_uncommitted ON datasets(has_uncommitted_changes) WHERE has_uncommitted_changes = true;
CREATE INDEX idx_datasets_deleted_at ON datasets(deleted_at) WHERE deleted_at IS NOT NULL;

CREATE TRIGGER update_datasets_updated_at
  BEFORE UPDATE ON datasets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE datasets IS 'Datasets (formerly nodes) - tables, views, etc.';

-- -----------------------------------------------------
-- Columns Table
-- -----------------------------------------------------
CREATE TABLE columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  fqn VARCHAR NOT NULL,
  name VARCHAR NOT NULL,
  data_type VARCHAR NOT NULL,
  description TEXT,
  business_name VARCHAR,
  is_primary_key BOOLEAN DEFAULT false,
  is_foreign_key BOOLEAN DEFAULT false,
  is_nullable BOOLEAN DEFAULT true,
  default_value TEXT,
  reference_column_id UUID REFERENCES columns(id) ON DELETE SET NULL,
  reference_type VARCHAR CHECK (reference_type IN ('FK', 'BusinessKey', 'NaturalKey')),
  reference_description TEXT,
  transformation_logic TEXT,
  ai_confidence_score INTEGER CHECK (ai_confidence_score BETWEEN 0 AND 100),
  position INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  UNIQUE(dataset_id, name)
);

CREATE INDEX idx_columns_dataset ON columns(dataset_id);
CREATE INDEX idx_columns_fqn ON columns(fqn);
CREATE INDEX idx_columns_reference ON columns(reference_column_id);

CREATE TRIGGER update_columns_updated_at
  BEFORE UPDATE ON columns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE columns IS 'Columns (formerly node_items) - dataset fields';

-- -----------------------------------------------------
-- Lineage Table
-- -----------------------------------------------------
CREATE TABLE lineage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id),
  downstream_dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  downstream_column_id UUID REFERENCES columns(id) ON DELETE CASCADE,
  upstream_dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  upstream_column_id UUID REFERENCES columns(id) ON DELETE CASCADE,
  mapping_type VARCHAR NOT NULL CHECK (mapping_type IN ('Direct', 'Transform', 'Derived', 'Calculated')),
  transformation_expression TEXT,
  lineage_type VARCHAR DEFAULT 'direct' CHECK (lineage_type IN ('direct', 'indirect')),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(downstream_column_id, upstream_column_id)
);

CREATE INDEX idx_lineage_downstream_dataset ON lineage(downstream_dataset_id);
CREATE INDEX idx_lineage_upstream_dataset ON lineage(upstream_dataset_id);
CREATE INDEX idx_lineage_downstream_column ON lineage(downstream_column_id);
CREATE INDEX idx_lineage_upstream_column ON lineage(upstream_column_id);
CREATE INDEX idx_lineage_workspace ON lineage(workspace_id);

COMMENT ON TABLE lineage IS 'Data lineage tracking column-level dependencies';

-- -----------------------------------------------------
-- Project Datasets Mapping Table
-- -----------------------------------------------------
CREATE TABLE project_datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  UNIQUE(project_id, dataset_id)
);

CREATE INDEX idx_project_datasets_project ON project_datasets(project_id);
CREATE INDEX idx_project_datasets_dataset ON project_datasets(dataset_id);

-- -----------------------------------------------------
-- Workspace Datasets Mapping Table
-- -----------------------------------------------------
CREATE TABLE workspace_datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  canvas_position JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  UNIQUE(workspace_id, dataset_id)
);

CREATE INDEX idx_workspace_datasets_workspace ON workspace_datasets(workspace_id);
CREATE INDEX idx_workspace_datasets_dataset ON workspace_datasets(dataset_id);

CREATE TRIGGER trigger_workspace_datasets_updated_at
  BEFORE UPDATE ON workspace_datasets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON COLUMN workspace_datasets.created_at IS 'Timestamp when the dataset was added to the workspace';
COMMENT ON COLUMN workspace_datasets.created_by IS 'User who added the dataset to the workspace';

-- -----------------------------------------------------
-- Diagrams Table
-- -----------------------------------------------------
CREATE TABLE diagrams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Diagram Metadata
  name VARCHAR NOT NULL,
  description TEXT,
  diagram_type VARCHAR NOT NULL DEFAULT 'dataset' CHECK (diagram_type IN ('dataset', 'business_model', 'lineage', 'erd')),

  -- Diagram State
  view_mode VARCHAR NOT NULL DEFAULT 'relationships' CHECK (view_mode IN ('relationships', 'lineage')),
  viewport JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::jsonb,
  node_positions JSONB NOT NULL DEFAULT '{}'::jsonb,
  node_expansions JSONB NOT NULL DEFAULT '{}'::jsonb,
  edge_routes JSONB DEFAULT '{}'::jsonb,
  filters JSONB DEFAULT '{}'::jsonb,

  -- Layout Settings
  layout_type VARCHAR DEFAULT 'hierarchical' CHECK (layout_type IN ('hierarchical', 'force', 'circular', 'dagre', 'manual')),
  layout_direction VARCHAR DEFAULT 'LR' CHECK (layout_direction IN ('LR', 'TB', 'RL', 'BT')),
  auto_layout BOOLEAN DEFAULT false,

  -- Ownership and Access
  owner_id UUID REFERENCES users(id),
  visibility VARCHAR NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'shared')),
  is_template BOOLEAN DEFAULT false,

  -- Metadata
  tags VARCHAR[],
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Version Control
  version INTEGER DEFAULT 1,
  last_modified_by UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),

  UNIQUE(workspace_id, name)
);

CREATE INDEX idx_diagrams_account ON diagrams(account_id);
CREATE INDEX idx_diagrams_workspace ON diagrams(workspace_id);
CREATE INDEX idx_diagrams_owner ON diagrams(owner_id);
CREATE INDEX idx_diagrams_type ON diagrams(diagram_type);
CREATE INDEX idx_diagrams_visibility ON diagrams(visibility);
CREATE INDEX idx_diagrams_template ON diagrams(is_template) WHERE is_template = true;

COMMENT ON TABLE diagrams IS 'Diagram entities with metadata and state';
COMMENT ON COLUMN diagrams.is_template IS 'Can be used as template for new diagrams';

-- -----------------------------------------------------
-- Diagram Datasets Mapping Table
-- -----------------------------------------------------
CREATE TABLE diagram_datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,

  -- Location on diagram
  location JSONB,

  -- Visual state
  is_expanded BOOLEAN DEFAULT false,
  is_highlighted BOOLEAN DEFAULT false,
  z_index INTEGER DEFAULT 0,

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES users(id),
  notes TEXT,

  UNIQUE(diagram_id, dataset_id)
);

CREATE INDEX idx_diagram_datasets_diagram ON diagram_datasets(diagram_id);
CREATE INDEX idx_diagram_datasets_dataset ON diagram_datasets(dataset_id);
CREATE INDEX idx_diagram_datasets_created_by ON diagram_datasets(created_by);

CREATE TRIGGER trigger_diagram_datasets_updated_at
  BEFORE UPDATE ON diagram_datasets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE diagram_datasets IS 'Tracks which datasets are included in each diagram';
COMMENT ON COLUMN diagram_datasets.location IS 'Dataset location on diagram canvas';
COMMENT ON COLUMN diagram_datasets.is_expanded IS 'Whether columns are shown';
COMMENT ON COLUMN diagram_datasets.z_index IS 'Stacking order (higher = on top)';

-- -----------------------------------------------------
-- Diagram States Table (Legacy - kept for migration)
-- -----------------------------------------------------
CREATE TABLE diagram_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  diagram_type VARCHAR NOT NULL DEFAULT 'dataset',

  -- State Data
  view_mode VARCHAR NOT NULL DEFAULT 'relationships',
  viewport JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::jsonb,
  node_positions JSONB NOT NULL DEFAULT '{}'::jsonb,
  node_expansions JSONB NOT NULL DEFAULT '{}'::jsonb,
  edge_routes JSONB DEFAULT '{}'::jsonb,
  filters JSONB DEFAULT '{}'::jsonb,

  -- Metadata
  last_modified_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  version INTEGER DEFAULT 1,

  UNIQUE(workspace_id, diagram_type)
);

CREATE INDEX idx_diagram_states_workspace ON diagram_states(workspace_id);
CREATE INDEX idx_diagram_states_account ON diagram_states(account_id);
CREATE INDEX idx_diagram_states_type ON diagram_states(diagram_type);

COMMENT ON TABLE diagram_states IS 'Legacy diagram state table (deprecated - use diagrams table)';

-- -----------------------------------------------------
-- Environments Table
-- -----------------------------------------------------
CREATE TABLE environments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  workspace_id UUID REFERENCES workspaces(id),
  name VARCHAR NOT NULL,
  description TEXT,
  target_platform VARCHAR CHECK (target_platform IN ('databricks', 'snowflake', 'bigquery', 'redshift', 'synapse', 'other')),
  target_catalog VARCHAR,
  target_schema VARCHAR,
  platform_url VARCHAR,
  platform_config JSONB,
  auto_deploy BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  UNIQUE(project_id, name)
);

CREATE INDEX idx_environments_account ON environments(account_id);
CREATE INDEX idx_environments_project ON environments(project_id);
CREATE INDEX idx_environments_workspace ON environments(workspace_id);

CREATE TRIGGER update_environments_updated_at
  BEFORE UPDATE ON environments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------
-- Connections Table
-- -----------------------------------------------------
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
  updated_by UUID REFERENCES users(id),

  UNIQUE(account_id, workspace_id, name)
);

CREATE INDEX idx_connections_account ON connections(account_id);
CREATE INDEX idx_connections_workspace ON connections(workspace_id);
CREATE INDEX idx_connections_owner ON connections(owner_id);
CREATE INDEX idx_connections_type ON connections(connection_type);
CREATE INDEX idx_connections_status ON connections(is_active);

CREATE TRIGGER update_connections_updated_at
  BEFORE UPDATE ON connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE connections IS 'Data source connections with encryption and multi-tenant isolation';
COMMENT ON COLUMN connections.connection_type IS 'Vendor type: MSSQL, Databricks, Snowflake, Salesforce, Workday, ServiceNow, FileSystem, REST';
COMMENT ON COLUMN connections.configuration IS 'Encrypted connection configuration (credentials, endpoints, etc)';

-- -----------------------------------------------------
-- Connection Metadata Cache Table
-- -----------------------------------------------------
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

CREATE INDEX idx_connection_metadata_connection ON connection_metadata_cache(connection_id);
CREATE INDEX idx_connection_metadata_type ON connection_metadata_cache(metadata_type);
CREATE INDEX idx_connection_metadata_stale ON connection_metadata_cache(is_stale) WHERE is_stale = true;

CREATE TRIGGER update_connection_metadata_cache_updated_at
  BEFORE UPDATE ON connection_metadata_cache
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE connection_metadata_cache IS 'Cached metadata from connection sources (schemas, tables, columns)';

-- -----------------------------------------------------
-- Macros Table
-- -----------------------------------------------------
CREATE TABLE macros (
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

CREATE TRIGGER update_macros_updated_at
  BEFORE UPDATE ON macros
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------
-- Templates Table
-- -----------------------------------------------------
CREATE TABLE templates (
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

CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------
-- Template Fragments Table
-- -----------------------------------------------------
CREATE TABLE template_fragments (
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

CREATE TRIGGER update_template_fragments_updated_at
  BEFORE UPDATE ON template_fragments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------
-- Source Control Commits Table
-- -----------------------------------------------------
CREATE TABLE source_control_commits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),
  workspace_id UUID REFERENCES workspaces(id),
  commit_sha VARCHAR NOT NULL,
  commit_message TEXT,
  author VARCHAR,
  committed_at TIMESTAMP,
  source_control_provider VARCHAR DEFAULT 'github' CHECK (source_control_provider IN ('github', 'gitlab', 'bitbucket', 'azure', 'other')),
  files_changed JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_source_control_commits_account ON source_control_commits(account_id);
CREATE INDEX idx_source_control_commits_workspace ON source_control_commits(workspace_id);
CREATE INDEX idx_source_control_commits_project ON source_control_commits(project_id);
CREATE INDEX idx_source_control_commits_sha ON source_control_commits(commit_sha);
CREATE INDEX idx_source_control_commits_committed_at ON source_control_commits(committed_at);

-- -----------------------------------------------------
-- Audit Logs Table
-- -----------------------------------------------------
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id),
  change_type VARCHAR NOT NULL CHECK (change_type IN ('created', 'updated', 'deleted')),
  entity_type VARCHAR NOT NULL CHECK (entity_type IN ('dataset', 'column', 'lineage')),
  entity_id UUID,
  field_name VARCHAR,
  old_value JSONB,
  new_value JSONB,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMP DEFAULT NOW(),
  committed_in_sha VARCHAR
);

CREATE INDEX idx_audit_logs_dataset ON audit_logs(dataset_id);
CREATE INDEX idx_audit_logs_workspace ON audit_logs(workspace_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_uncommitted ON audit_logs(committed_in_sha) WHERE committed_in_sha IS NULL;

-- -----------------------------------------------------
-- Configurations Table
-- -----------------------------------------------------
CREATE TABLE configurations (
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

CREATE TRIGGER update_configurations_updated_at
  BEFORE UPDATE ON configurations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------
-- Invitations Table
-- -----------------------------------------------------
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
  email VARCHAR NOT NULL,
  role VARCHAR NOT NULL,
  invited_by UUID REFERENCES users(id),
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),

  -- Enhanced columns
  token VARCHAR NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by_name VARCHAR,
  invited_by_email VARCHAR,
  status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  accepted_by UUID REFERENCES users(id),
  message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_invitations_account ON invitations(account_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE INDEX idx_invitations_expires ON invitations(expires_at);
CREATE INDEX idx_invitations_active ON invitations(account_id, status, expires_at) WHERE status = 'pending';

COMMENT ON TABLE invitations IS 'Team invitation management with secure tokens and expiry tracking';
COMMENT ON COLUMN invitations.token IS 'Secure random token for invitation acceptance (64-character hex string)';
COMMENT ON COLUMN invitations.status IS 'Invitation status: pending, accepted, expired, revoked';

-- -----------------------------------------------------
-- API Tokens Table
-- -----------------------------------------------------
CREATE TABLE api_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Token Details
  name VARCHAR NOT NULL,
  description TEXT,
  token_hash VARCHAR NOT NULL UNIQUE,
  prefix VARCHAR NOT NULL,

  -- Permissions
  scopes JSONB DEFAULT '[]'::jsonb,

  -- Usage Tracking
  last_used_at TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  last_used_ip VARCHAR,
  last_used_user_agent TEXT,

  -- Expiry
  expires_at TIMESTAMP,

  -- Status
  is_active BOOLEAN DEFAULT true,
  revoked_at TIMESTAMP,
  revoked_by UUID REFERENCES users(id),
  revoke_reason TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_api_tokens_account ON api_tokens(account_id);
CREATE INDEX idx_api_tokens_user ON api_tokens(user_id);
CREATE INDEX idx_api_tokens_hash ON api_tokens(token_hash);
CREATE INDEX idx_api_tokens_active ON api_tokens(account_id, user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_api_tokens_expires ON api_tokens(expires_at) WHERE expires_at IS NOT NULL AND is_active = true;
CREATE INDEX idx_api_tokens_last_used ON api_tokens(last_used_at DESC);
CREATE INDEX idx_api_tokens_user_active ON api_tokens(user_id, is_active, created_at DESC) WHERE is_active = true;

COMMENT ON TABLE api_tokens IS 'API tokens for programmatic access with secure hashing and scope-based permissions';
COMMENT ON COLUMN api_tokens.token_hash IS 'SHA-256 hash of the actual token - never store plaintext tokens';
COMMENT ON COLUMN api_tokens.prefix IS 'First 8 characters of token for display purposes (e.g., "uroq_1234")';
COMMENT ON COLUMN api_tokens.scopes IS 'Array of permission scopes (e.g., ["read:datasets", "write:projects", "admin:all"])';

-- =====================================================
-- SECTION 4: TRIGGERS FOR DIAGRAMS
-- =====================================================

-- Trigger to update updated_at and increment version for diagrams
CREATE OR REPLACE FUNCTION update_diagrams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_diagrams_updated_at
  BEFORE UPDATE ON diagrams
  FOR EACH ROW
  EXECUTE FUNCTION update_diagrams_updated_at();

-- Trigger for diagram_states
CREATE OR REPLACE FUNCTION update_diagram_states_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_diagram_states_updated_at
  BEFORE UPDATE ON diagram_states
  FOR EACH ROW
  EXECUTE FUNCTION update_diagram_states_updated_at();

-- =====================================================
-- SECTION 5: HELPER FUNCTIONS
-- =====================================================

-- -----------------------------------------------------
-- Subscription & Usage Functions
-- -----------------------------------------------------

-- Get active subscription for an account
CREATE OR REPLACE FUNCTION get_active_subscription(p_account_id UUID)
RETURNS subscriptions AS $$
DECLARE
  active_sub subscriptions;
BEGIN
  SELECT * INTO active_sub
  FROM subscriptions
  WHERE account_id = p_account_id
    AND status IN ('active', 'trialing', 'past_due')
  ORDER BY created_at DESC
  LIMIT 1;
  RETURN active_sub;
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if subscription is active
CREATE OR REPLACE FUNCTION is_subscription_active(p_subscription_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  sub_status VARCHAR;
BEGIN
  SELECT status INTO sub_status
  FROM subscriptions
  WHERE id = p_subscription_id;
  RETURN sub_status IN ('active', 'trialing', 'past_due');
END;
$$ LANGUAGE plpgsql STABLE;

-- Check if trial is active
CREATE OR REPLACE FUNCTION is_trial_active(p_subscription_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  sub_record subscriptions;
BEGIN
  SELECT * INTO sub_record
  FROM subscriptions
  WHERE id = p_subscription_id;
  RETURN sub_record.status = 'trialing'
    AND sub_record.trial_end IS NOT NULL
    AND sub_record.trial_end > NOW();
END;
$$ LANGUAGE plpgsql STABLE;

-- Count AI requests for current period
CREATE OR REPLACE FUNCTION count_ai_requests_current_period(p_account_id UUID)
RETURNS INTEGER AS $$
DECLARE
  request_count INTEGER;
  reset_date TIMESTAMP;
BEGIN
  SELECT usage_reset_date INTO reset_date
  FROM accounts
  WHERE id = p_account_id;

  IF reset_date IS NULL THEN
    reset_date := date_trunc('month', NOW());
  END IF;

  SELECT COUNT(*) INTO request_count
  FROM usage_events
  WHERE account_id = p_account_id
    AND event_type = 'ai_request'
    AND created_at >= reset_date;

  RETURN request_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get usage summary
CREATE OR REPLACE FUNCTION get_usage_summary(
  p_account_id UUID,
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL
)
RETURNS TABLE (
  event_type VARCHAR,
  event_count BIGINT,
  total_quantity BIGINT
) AS $$
BEGIN
  IF p_start_date IS NULL THEN
    p_start_date := NOW() - INTERVAL '30 days';
  END IF;
  IF p_end_date IS NULL THEN
    p_end_date := NOW();
  END IF;

  RETURN QUERY
  SELECT
    ue.event_type,
    COUNT(*) as event_count,
    SUM(ue.quantity)::BIGINT as total_quantity
  FROM usage_events ue
  WHERE ue.account_id = p_account_id
    AND ue.created_at >= p_start_date
    AND ue.created_at <= p_end_date
  GROUP BY ue.event_type
  ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Track usage event (convenience function)
CREATE OR REPLACE FUNCTION track_usage_event(
  p_account_id UUID,
  p_user_id UUID,
  p_event_type VARCHAR,
  p_event_category VARCHAR DEFAULT NULL,
  p_quantity INTEGER DEFAULT 1,
  p_unit VARCHAR DEFAULT NULL,
  p_resource_type VARCHAR DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO usage_events (
    account_id, user_id, event_type, event_category,
    quantity, unit, resource_type, resource_id, metadata
  ) VALUES (
    p_account_id, p_user_id, p_event_type, p_event_category,
    p_quantity, p_unit, p_resource_type, p_resource_id, p_metadata
  )
  RETURNING id INTO event_id;

  RETURN event_id;
END;
$$ LANGUAGE plpgsql;

-- Update account counters on usage events
CREATE OR REPLACE FUNCTION update_account_counters_on_usage_event()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.event_type = 'ai_request' THEN
    UPDATE accounts SET current_monthly_ai_requests = current_monthly_ai_requests + NEW.quantity WHERE id = NEW.account_id;
  ELSIF NEW.event_type = 'user_added' THEN
    UPDATE accounts SET current_user_count = current_user_count + 1 WHERE id = NEW.account_id;
  ELSIF NEW.event_type = 'user_removed' THEN
    UPDATE accounts SET current_user_count = GREATEST(current_user_count - 1, 0) WHERE id = NEW.account_id;
  ELSIF NEW.event_type = 'project_created' THEN
    UPDATE accounts SET current_project_count = current_project_count + 1 WHERE id = NEW.account_id;
  ELSIF NEW.event_type = 'project_deleted' THEN
    UPDATE accounts SET current_project_count = GREATEST(current_project_count - 1, 0) WHERE id = NEW.account_id;
  ELSIF NEW.event_type = 'dataset_created' THEN
    UPDATE accounts SET current_dataset_count = current_dataset_count + 1 WHERE id = NEW.account_id;
  ELSIF NEW.event_type = 'dataset_deleted' THEN
    UPDATE accounts SET current_dataset_count = GREATEST(current_dataset_count - 1, 0) WHERE id = NEW.account_id;
  ELSIF NEW.event_type = 'storage_used' THEN
    UPDATE accounts SET current_storage_mb = current_storage_mb + NEW.quantity WHERE id = NEW.account_id;
  ELSIF NEW.event_type = 'storage_freed' THEN
    UPDATE accounts SET current_storage_mb = GREATEST(current_storage_mb - NEW.quantity, 0) WHERE id = NEW.account_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER usage_event_counter_update_trigger
  AFTER INSERT ON usage_events
  FOR EACH ROW
  EXECUTE FUNCTION update_account_counters_on_usage_event();

-- Archive old usage events
CREATE OR REPLACE FUNCTION archive_old_usage_events(p_days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM usage_events
  WHERE created_at < NOW() - (p_days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- -----------------------------------------------------
-- Invitation Functions
-- -----------------------------------------------------

-- Function to generate secure invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS VARCHAR AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations(p_days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM invitations
  WHERE status = 'expired'
    AND expires_at < NOW() - (p_days_old || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-expire invitations
CREATE OR REPLACE FUNCTION auto_expire_invitations()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending invitations for an account
CREATE OR REPLACE FUNCTION get_pending_invitations(p_account_id UUID)
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  role VARCHAR,
  invited_by_name VARCHAR,
  invited_by_email VARCHAR,
  token VARCHAR,
  expires_at TIMESTAMP,
  created_at TIMESTAMP,
  message TEXT
) AS $$
BEGIN
  PERFORM auto_expire_invitations();

  RETURN QUERY
  SELECT
    i.id,
    i.email,
    i.role,
    i.invited_by_name,
    i.invited_by_email,
    i.token,
    i.expires_at,
    i.created_at,
    i.message
  FROM invitations i
  WHERE i.account_id = p_account_id
    AND i.status = 'pending'
    AND i.expires_at > NOW()
  ORDER BY i.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- -----------------------------------------------------
-- API Token Functions
-- -----------------------------------------------------

-- Function to generate API token prefix
CREATE OR REPLACE FUNCTION generate_api_token_prefix()
RETURNS VARCHAR AS $$
BEGIN
  RETURN 'uroq_' || substring(encode(gen_random_bytes(6), 'hex'), 1, 8);
END;
$$ LANGUAGE plpgsql;

-- Function to hash API token (SHA-256)
CREATE OR REPLACE FUNCTION hash_api_token(p_token VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
  RETURN encode(digest(p_token, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate and use API token
CREATE OR REPLACE FUNCTION validate_api_token(
  p_token VARCHAR,
  p_ip_address VARCHAR DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
  token_id UUID,
  account_id UUID,
  user_id UUID,
  scopes JSONB,
  is_valid BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_token_hash VARCHAR;
  v_token_record api_tokens;
BEGIN
  v_token_hash := hash_api_token(p_token);

  SELECT * INTO v_token_record
  FROM api_tokens
  WHERE token_hash = v_token_hash;

  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::UUID, NULL::JSONB, false, 'Invalid token'::TEXT;
    RETURN;
  END IF;

  IF NOT v_token_record.is_active THEN
    RETURN QUERY SELECT
      v_token_record.id,
      v_token_record.account_id,
      v_token_record.user_id,
      v_token_record.scopes,
      false,
      'Token has been revoked'::TEXT;
    RETURN;
  END IF;

  IF v_token_record.expires_at IS NOT NULL AND v_token_record.expires_at < NOW() THEN
    UPDATE api_tokens
    SET is_active = false,
        revoked_at = NOW(),
        revoke_reason = 'Token expired'
    WHERE id = v_token_record.id;

    RETURN QUERY SELECT
      v_token_record.id,
      v_token_record.account_id,
      v_token_record.user_id,
      v_token_record.scopes,
      false,
      'Token has expired'::TEXT;
    RETURN;
  END IF;

  UPDATE api_tokens
  SET last_used_at = NOW(),
      usage_count = usage_count + 1,
      last_used_ip = COALESCE(p_ip_address, last_used_ip),
      last_used_user_agent = COALESCE(p_user_agent, last_used_user_agent)
  WHERE id = v_token_record.id;

  RETURN QUERY SELECT
    v_token_record.id,
    v_token_record.account_id,
    v_token_record.user_id,
    v_token_record.scopes,
    true,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to revoke API token
CREATE OR REPLACE FUNCTION revoke_api_token(
  p_token_id UUID,
  p_revoked_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE api_tokens
  SET is_active = false,
      revoked_at = NOW(),
      revoked_by = p_revoked_by,
      revoke_reason = p_reason
  WHERE id = p_token_id
    AND is_active = true;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_api_tokens(p_days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE api_tokens
  SET is_active = false,
      revoked_at = NOW(),
      revoke_reason = 'Automatically revoked - expired ' || p_days_old || ' days ago'
  WHERE is_active = true
    AND expires_at IS NOT NULL
    AND expires_at < NOW() - (p_days_old || ' days')::INTERVAL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get active tokens for a user
CREATE OR REPLACE FUNCTION get_user_api_tokens(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  description TEXT,
  prefix VARCHAR,
  scopes JSONB,
  last_used_at TIMESTAMP,
  usage_count INTEGER,
  expires_at TIMESTAMP,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.description,
    t.prefix,
    t.scopes,
    t.last_used_at,
    t.usage_count,
    t.expires_at,
    t.created_at
  FROM api_tokens t
  WHERE t.user_id = p_user_id
    AND t.is_active = true
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if token has specific scope
CREATE OR REPLACE FUNCTION token_has_scope(p_token_scopes JSONB, p_required_scope VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  IF p_token_scopes ? 'admin:all' THEN
    RETURN true;
  END IF;

  RETURN p_token_scopes ? p_required_scope;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- -----------------------------------------------------
-- Diagram Functions
-- -----------------------------------------------------

-- Function to get all datasets in a diagram
CREATE OR REPLACE FUNCTION get_diagram_datasets(p_diagram_id UUID)
RETURNS TABLE (
  dataset_id UUID,
  dataset_name VARCHAR,
  fully_qualified_name VARCHAR,
  location JSONB,
  is_expanded BOOLEAN,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id,
    d.name,
    d.fqn,
    dd.location,
    dd.is_expanded,
    dd.created_at
  FROM diagram_datasets dd
  JOIN datasets d ON d.id = dd.dataset_id
  WHERE dd.diagram_id = p_diagram_id
  ORDER BY dd.created_at;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_diagram_datasets IS 'Returns all datasets in a diagram with their locations';

-- Function to add dataset to diagram
CREATE OR REPLACE FUNCTION add_dataset_to_diagram(
  p_diagram_id UUID,
  p_dataset_id UUID,
  p_location JSONB DEFAULT NULL,
  p_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO diagram_datasets (
    diagram_id,
    dataset_id,
    location,
    created_by
  ) VALUES (
    p_diagram_id,
    p_dataset_id,
    p_location,
    p_user_id
  )
  ON CONFLICT (diagram_id, dataset_id) DO NOTHING
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION add_dataset_to_diagram IS 'Adds a dataset to a diagram (idempotent)';

-- Function to remove dataset from diagram
CREATE OR REPLACE FUNCTION remove_dataset_from_diagram(
  p_diagram_id UUID,
  p_dataset_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_deleted BOOLEAN;
BEGIN
  DELETE FROM diagram_datasets
  WHERE diagram_id = p_diagram_id
    AND dataset_id = p_dataset_id;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION remove_dataset_from_diagram IS 'Removes a dataset from a diagram';

-- =====================================================
-- SECTION 6: VIEWS
-- =====================================================

-- Accounts public view
CREATE OR REPLACE VIEW accounts_public AS
SELECT
  id, name, slug, subscription_tier,
  created_at, updated_at, trial_end_date, is_verified
FROM accounts
WHERE deleted_at IS NULL;

-- Active subscriptions
CREATE OR REPLACE VIEW active_subscriptions AS
SELECT
  s.*, p.name as plan_name, p.tier as plan_tier,
  p.display_name as plan_display_name,
  a.name as account_name, a.slug as account_slug
FROM subscriptions s
JOIN subscription_plans p ON s.plan_id = p.id
JOIN accounts a ON s.account_id = a.id
WHERE s.status IN ('active', 'trialing', 'past_due')
  AND a.deleted_at IS NULL;

-- Expiring trials
CREATE OR REPLACE VIEW expiring_trials AS
SELECT
  s.*, p.name as plan_name,
  a.name as account_name, a.billing_email,
  (s.trial_end - NOW()) as time_remaining
FROM subscriptions s
JOIN subscription_plans p ON s.plan_id = p.id
JOIN accounts a ON s.account_id = a.id
WHERE s.status = 'trialing'
  AND s.trial_end IS NOT NULL
  AND s.trial_end > NOW()
  AND s.trial_end < NOW() + INTERVAL '7 days'
  AND a.deleted_at IS NULL
ORDER BY s.trial_end ASC;

-- AI usage current month
CREATE OR REPLACE VIEW ai_usage_current_month AS
SELECT
  ue.account_id, a.name as account_name,
  COUNT(*) as ai_request_count,
  a.max_monthly_ai_requests as ai_request_limit,
  ROUND((COUNT(*)::NUMERIC / NULLIF(a.max_monthly_ai_requests, 0)) * 100, 2) as usage_percentage
FROM usage_events ue
JOIN accounts a ON ue.account_id = a.id
WHERE ue.event_type = 'ai_request'
  AND ue.created_at >= date_trunc('month', NOW())
  AND a.deleted_at IS NULL
GROUP BY ue.account_id, a.name, a.max_monthly_ai_requests;

-- Recent usage events
CREATE OR REPLACE VIEW recent_usage_events AS
SELECT
  ue.*, a.name as account_name, u.email as user_email
FROM usage_events ue
JOIN accounts a ON ue.account_id = a.id
LEFT JOIN users u ON ue.user_id = u.id
WHERE ue.created_at > NOW() - INTERVAL '24 hours'
  AND a.deleted_at IS NULL
ORDER BY ue.created_at DESC;

-- Usage summary last 30 days
CREATE OR REPLACE VIEW usage_summary_last_30_days AS
SELECT
  ue.account_id, a.name as account_name,
  ue.event_category, ue.event_type,
  COUNT(*) as event_count,
  SUM(ue.quantity) as total_quantity
FROM usage_events ue
JOIN accounts a ON ue.account_id = a.id
WHERE ue.created_at > NOW() - INTERVAL '30 days'
  AND a.deleted_at IS NULL
GROUP BY ue.account_id, a.name, ue.event_category, ue.event_type
ORDER BY ue.account_id, event_count DESC;

-- Active invitations
CREATE OR REPLACE VIEW active_invitations AS
SELECT
  i.*,
  a.name as account_name,
  a.slug as account_slug,
  u.full_name as inviter_full_name,
  u.email as inviter_email_from_user,
  (i.expires_at - NOW()) as time_until_expiry
FROM invitations i
JOIN accounts a ON i.account_id = a.id
LEFT JOIN users u ON i.invited_by = u.id
WHERE i.status = 'pending'
  AND i.expires_at > NOW()
  AND a.deleted_at IS NULL
ORDER BY i.created_at DESC;

-- Expired invitations
CREATE OR REPLACE VIEW expired_invitations AS
SELECT
  i.*,
  a.name as account_name,
  (NOW() - i.expires_at) as expired_for
FROM invitations i
JOIN accounts a ON i.account_id = a.id
WHERE (i.status = 'pending' AND i.expires_at < NOW())
   OR i.status = 'expired'
ORDER BY i.expires_at DESC;

-- Active API tokens view
CREATE OR REPLACE VIEW active_api_tokens AS
SELECT
  t.id,
  t.account_id,
  t.user_id,
  t.name,
  t.description,
  t.prefix,
  t.scopes,
  t.last_used_at,
  t.usage_count,
  t.expires_at,
  t.created_at,
  t.created_by,
  u.email as user_email,
  u.full_name as user_name,
  a.name as account_name,
  a.slug as account_slug,
  CASE
    WHEN t.expires_at IS NULL THEN NULL
    WHEN t.expires_at > NOW() THEN t.expires_at - NOW()
    ELSE INTERVAL '0'
  END as time_until_expiry
FROM api_tokens t
JOIN users u ON t.user_id = u.id
JOIN accounts a ON t.account_id = a.id
WHERE t.is_active = true
  AND a.deleted_at IS NULL
ORDER BY t.last_used_at DESC NULLS LAST;

-- API token usage stats
CREATE OR REPLACE VIEW api_token_usage_stats AS
SELECT
  t.account_id,
  a.name as account_name,
  COUNT(*) as total_tokens,
  COUNT(*) FILTER (WHERE t.is_active = true) as active_tokens,
  COUNT(*) FILTER (WHERE t.is_active = false) as revoked_tokens,
  COUNT(*) FILTER (WHERE t.expires_at IS NOT NULL AND t.expires_at < NOW()) as expired_tokens,
  SUM(t.usage_count) as total_usage_count,
  MAX(t.last_used_at) as last_token_use
FROM api_tokens t
JOIN accounts a ON t.account_id = a.id
WHERE a.deleted_at IS NULL
GROUP BY t.account_id, a.name
ORDER BY total_usage_count DESC NULLS LAST;

-- Diagram summary
CREATE OR REPLACE VIEW diagram_summary AS
SELECT
  d.id,
  d.account_id,
  d.workspace_id,
  d.name,
  d.description,
  d.diagram_type,
  d.visibility,
  d.owner_id,
  d.is_template,
  d.created_at,
  d.updated_at,
  COUNT(DISTINCT dd.dataset_id) AS dataset_count,
  ARRAY_AGG(DISTINCT unnest_tags) FILTER (WHERE unnest_tags IS NOT NULL) AS all_tags
FROM diagrams d
LEFT JOIN diagram_datasets dd ON dd.diagram_id = d.id
LEFT JOIN LATERAL unnest(d.tags) AS unnest_tags ON true
GROUP BY d.id, d.account_id, d.workspace_id, d.name, d.description,
         d.diagram_type, d.visibility, d.owner_id, d.is_template,
         d.created_at, d.updated_at;

COMMENT ON VIEW diagram_summary IS 'Summary view of diagrams with dataset counts';

-- =====================================================
-- SECTION 7: ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE lineage ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagrams ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagram_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagram_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_metadata_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies are disabled by default in Supabase
-- Uncomment and customize these policies based on your authentication setup

/*
-- Example RLS policies for accounts
CREATE POLICY "Users can view accounts they belong to" ON accounts
  FOR SELECT
  USING (id IN (SELECT account_id FROM account_users WHERE user_id = auth.uid()));

-- Example RLS policies for projects
CREATE POLICY "Users can view projects in their accounts" ON projects
  FOR SELECT
  USING (account_id IN (SELECT account_id FROM account_users WHERE user_id = auth.uid()));

-- Add similar policies for other tables as needed
*/

-- Invitations RLS policies
CREATE POLICY "Users can view invitations for their accounts" ON invitations
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can create invitations" ON invitations
  FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can update invitations" ON invitations
  FOR UPDATE
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
    OR
    (status = 'pending' AND expires_at > NOW())
  )
  WITH CHECK (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
    OR
    (status IN ('pending', 'accepted') AND expires_at > NOW())
  );

CREATE POLICY "Admins can delete invitations" ON invitations
  FOR DELETE
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- API Tokens RLS policies
CREATE POLICY "Users can view their own tokens" ON api_tokens
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    (account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    ))
  );

CREATE POLICY "Users can create tokens for accounts they belong to" ON api_tokens
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own tokens" ON api_tokens
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR
    (account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    ))
  );

CREATE POLICY "Users can delete their own tokens" ON api_tokens
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR
    (account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    ))
  );

-- Diagrams RLS policies
CREATE POLICY "diagrams_select_policy" ON diagrams
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
    OR visibility = 'public'
  );

CREATE POLICY "diagrams_insert_policy" ON diagrams
  FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "diagrams_update_policy" ON diagrams
  FOR UPDATE
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "diagrams_delete_policy" ON diagrams
  FOR DELETE
  USING (
    owner_id = auth.uid()
    OR account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- Diagram Datasets RLS policies
CREATE POLICY "diagram_datasets_select_policy" ON diagram_datasets
  FOR SELECT
  USING (
    diagram_id IN (
      SELECT id FROM diagrams
      WHERE account_id IN (
        SELECT account_id
        FROM account_users
        WHERE user_id = auth.uid()
      )
      OR visibility = 'public'
    )
  );

CREATE POLICY "diagram_datasets_insert_policy" ON diagram_datasets
  FOR INSERT
  WITH CHECK (
    diagram_id IN (
      SELECT id FROM diagrams
      WHERE account_id IN (
        SELECT account_id
        FROM account_users
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "diagram_datasets_update_policy" ON diagram_datasets
  FOR UPDATE
  USING (
    diagram_id IN (
      SELECT id FROM diagrams
      WHERE account_id IN (
        SELECT account_id
        FROM account_users
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "diagram_datasets_delete_policy" ON diagram_datasets
  FOR DELETE
  USING (
    diagram_id IN (
      SELECT id FROM diagrams
      WHERE account_id IN (
        SELECT account_id
        FROM account_users
        WHERE user_id = auth.uid()
      )
    )
  );

-- Diagram States RLS policies
CREATE POLICY "diagram_states_select_policy" ON diagram_states
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "diagram_states_insert_policy" ON diagram_states
  FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "diagram_states_update_policy" ON diagram_states
  FOR UPDATE
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "diagram_states_delete_policy" ON diagram_states
  FOR DELETE
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

-- Connections RLS policies
CREATE POLICY "connections_isolation_policy" ON connections
  FOR SELECT
  USING (account_id IN (SELECT account_id FROM account_users WHERE user_id = auth.uid()));

CREATE POLICY "connections_update_policy" ON connections
  FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR
    (SELECT role FROM account_users WHERE user_id = auth.uid() AND account_id = connections.account_id) IN ('owner', 'admin')
  );

CREATE POLICY "connections_insert_policy" ON connections
  FOR INSERT
  WITH CHECK (account_id IN (SELECT account_id FROM account_users WHERE user_id = auth.uid()));

CREATE POLICY "connections_delete_policy" ON connections
  FOR DELETE
  USING (
    owner_id = auth.uid()
    OR
    (SELECT role FROM account_users WHERE user_id = auth.uid() AND account_id = connections.account_id) IN ('owner', 'admin')
  );

-- Connection Metadata Cache RLS policies
CREATE POLICY "connection_metadata_cache_policy" ON connection_metadata_cache
  FOR ALL
  USING (connection_id IN (SELECT id FROM connections WHERE account_id IN (SELECT account_id FROM account_users WHERE user_id = auth.uid())));

-- Grant permissions on views to authenticated users
GRANT SELECT ON accounts_public TO authenticated;
GRANT SELECT ON active_subscriptions TO authenticated;
GRANT SELECT ON ai_usage_current_month TO authenticated;
GRANT SELECT ON recent_usage_events TO authenticated;
GRANT SELECT ON usage_summary_last_30_days TO authenticated;
GRANT SELECT ON active_invitations TO authenticated;
GRANT SELECT ON active_api_tokens TO authenticated;

-- Grant table permissions (via RLS)
GRANT SELECT, INSERT, UPDATE, DELETE ON diagrams TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON diagram_datasets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON diagram_states TO authenticated;

-- =====================================================
-- SECTION 8: SEED DATA
-- =====================================================

-- Seed default subscription plans
INSERT INTO subscription_plans (name, slug, tier, display_name, description, price_monthly, price_yearly, max_users, max_projects, max_datasets, max_monthly_ai_requests, max_storage_mb, max_workspaces_per_project, max_connections, trial_days, features, has_git_sync, has_ai_assistance, is_active, is_public, is_recommended, sort_order) VALUES
('Free', 'free', 'free', 'Free Plan', 'Perfect for individuals getting started', 0, 0, 1, 5, 100, 100, 1000, 1, 1, 0, '[]'::jsonb, true, false, true, true, false, 1),
('Pro', 'pro', 'pro', 'Professional Plan', 'Advanced features for growing teams', 29, 290, 10, 50, 1000, 1000, 10000, 5, 10, 14, '["advanced_ai", "priority_support", "api_access"]'::jsonb, true, true, true, true, true, 2),
('Enterprise', 'enterprise', 'enterprise', 'Enterprise Plan', 'Unlimited resources for large organizations', NULL, NULL, -1, -1, -1, -1, -1, -1, -1, 30, '["advanced_ai", "priority_support", "sso", "audit_logs", "api_access", "white_labeling"]'::jsonb, true, true, true, true, false, 3)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- SECTION 9: COMPLETION MESSAGE
-- =====================================================

SELECT 'Database recreation script completed successfully!' AS status,
       'All tables, views, functions, triggers, and policies have been created.' AS message,
       NOW() AS completed_at;

-- =====================================================
-- END OF DATABASE RECREATION SCRIPT
-- =====================================================
