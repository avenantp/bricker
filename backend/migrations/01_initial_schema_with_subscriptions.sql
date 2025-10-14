-- =====================================================
-- CONSOLIDATED INITIAL SCHEMA WITH SUBSCRIPTION MANAGEMENT
-- =====================================================
-- This file consolidates:
-- - Base schema (01_initial_schema.sql)
-- - S.1.1: Account enhancements (slug, usage tracking, soft delete)
-- - S.1.2: Subscription plans table
-- - S.1.3: Subscriptions table
-- - S.1.4: Payments table
-- - S.1.5: Usage events table
-- Generated: 2025-01-15
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- FUNCTION: update_updated_at_column (used by triggers)
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SUBSCRIPTION PLANS TABLE
-- =====================================================
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

-- Seed default plans
INSERT INTO subscription_plans (name, slug, tier, display_name, description, price_monthly, price_yearly, max_users, max_projects, max_datasets, max_monthly_ai_requests, max_storage_mb, max_workspaces_per_project, max_connections, trial_days, features, has_git_sync, has_ai_assistance, is_active, is_public, is_recommended, sort_order) VALUES
('Free', 'free', 'free', 'Free Plan', 'Perfect for individuals getting started', 0, 0, 1, 5, 100, 100, 1000, 1, 1, 0, '[]'::jsonb, true, false, true, true, false, 1),
('Pro', 'pro', 'pro', 'Professional Plan', 'Advanced features for growing teams', 29, 290, 10, 50, 1000, 1000, 10000, 5, 10, 14, '["advanced_ai", "priority_support", "api_access"]'::jsonb, true, true, true, true, true, 2),
('Enterprise', 'enterprise', 'enterprise', 'Enterprise Plan', 'Unlimited resources for large organizations', NULL, NULL, -1, -1, -1, -1, -1, -1, -1, 30, '["advanced_ai", "priority_support", "sso", "audit_logs", "api_access", "white_labeling"]'::jsonb, true, true, true, true, false, 3)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- ACCOUNTS TABLE (with subscription enhancements)
-- =====================================================
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL UNIQUE,
  slug VARCHAR UNIQUE, -- S.1.1.1
  account_type VARCHAR NOT NULL CHECK (account_type IN ('individual', 'organization')),

  -- Subscription
  current_plan_id UUID REFERENCES subscription_plans(id) ON DELETE SET NULL,
  subscription_tier VARCHAR DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise', 'custom')),
  subscription_status VARCHAR DEFAULT 'active' CHECK (subscription_status IN ('active', 'suspended', 'cancelled', 'trialing', 'past_due')),
  subscription_start_date TIMESTAMP,
  subscription_end_date TIMESTAMP,
  trial_end_date TIMESTAMP, -- S.1.1.2
  usage_reset_date TIMESTAMP, -- S.1.1.2

  -- Billing
  billing_email VARCHAR,
  billing_address JSONB,
  stripe_customer_id VARCHAR UNIQUE,

  -- Limits (from plan or custom overrides)
  max_users INTEGER DEFAULT 1,
  max_projects INTEGER DEFAULT 5,
  max_datasets INTEGER DEFAULT 100,
  max_monthly_ai_requests INTEGER DEFAULT 100, -- Referenced by S.1.5
  max_storage_mb INTEGER DEFAULT 1000,

  -- Usage Tracking (S.1.1.3)
  current_user_count INTEGER DEFAULT 0,
  current_project_count INTEGER DEFAULT 0,
  current_dataset_count INTEGER DEFAULT 0,
  current_monthly_ai_requests INTEGER DEFAULT 0,
  current_storage_mb INTEGER DEFAULT 0,

  -- Feature Flags (S.1.1.4)
  is_verified BOOLEAN DEFAULT false,
  allow_trial BOOLEAN DEFAULT true,
  has_used_trial BOOLEAN DEFAULT false,

  -- Soft Delete (S.1.1.5)
  deleted_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Add check constraints (S.1.1.3)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_current_user_count') THEN
    ALTER TABLE accounts ADD CONSTRAINT chk_current_user_count CHECK (current_user_count >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_current_project_count') THEN
    ALTER TABLE accounts ADD CONSTRAINT chk_current_project_count CHECK (current_project_count >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_current_dataset_count') THEN
    ALTER TABLE accounts ADD CONSTRAINT chk_current_dataset_count CHECK (current_dataset_count >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_current_monthly_ai_requests') THEN
    ALTER TABLE accounts ADD CONSTRAINT chk_current_monthly_ai_requests CHECK (current_monthly_ai_requests >= 0);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_current_storage_mb') THEN
    ALTER TABLE accounts ADD CONSTRAINT chk_current_storage_mb CHECK (current_storage_mb >= 0);
  END IF;
END $$;

-- Indexes
CREATE INDEX idx_accounts_type ON accounts(account_type);
CREATE INDEX idx_accounts_subscription ON accounts(subscription_status);
CREATE INDEX idx_accounts_slug ON accounts(slug);
CREATE INDEX idx_accounts_trial_end ON accounts(trial_end_date) WHERE trial_end_date IS NOT NULL;
CREATE INDEX idx_accounts_is_verified ON accounts(is_verified) WHERE is_verified = false;
CREATE INDEX idx_accounts_active ON accounts(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_accounts_deleted_at ON accounts(deleted_at) WHERE deleted_at IS NOT NULL;

-- Trigger
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SUBSCRIPTIONS TABLE
-- =====================================================
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

-- =====================================================
-- PAYMENTS TABLE
-- =====================================================
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

-- =====================================================
-- USAGE EVENTS TABLE
-- =====================================================
CREATE TABLE usage_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID, -- Will reference users(id) after users table is created

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

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR NOT NULL UNIQUE,
  full_name VARCHAR,
  avatar_url VARCHAR,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Now add the foreign key constraint to usage_events
ALTER TABLE usage_events ADD CONSTRAINT fk_usage_events_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX idx_users_email ON users(email);

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ACCOUNT USERS (Membership)
-- =====================================================
CREATE TABLE account_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(account_id, user_id)
);

CREATE INDEX idx_account_users_account ON account_users(account_id);
CREATE INDEX idx_account_users_user ON account_users(user_id);

-- =====================================================
-- PROJECTS
-- =====================================================
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
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(account_id, name)
);

CREATE INDEX idx_projects_account ON projects(account_id);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_visibility ON projects(visibility);

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- PROJECT USERS
-- =====================================================
CREATE TABLE project_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_users_project ON project_users(project_id);
CREATE INDEX idx_project_users_user ON project_users(user_id);

-- =====================================================
-- WORKSPACES
-- =====================================================
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
  UNIQUE(account_id, project_id, name)
);

CREATE INDEX idx_workspaces_account ON workspaces(account_id);
CREATE INDEX idx_workspaces_project ON workspaces(project_id);
CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);

CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- WORKSPACE USERS
-- =====================================================
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

-- =====================================================
-- DATASETS
-- =====================================================
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
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
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

CREATE TRIGGER update_datasets_updated_at
  BEFORE UPDATE ON datasets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COLUMNS
-- =====================================================
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
  UNIQUE(dataset_id, name)
);

CREATE INDEX idx_columns_dataset ON columns(dataset_id);
CREATE INDEX idx_columns_fqn ON columns(fqn);
CREATE INDEX idx_columns_reference ON columns(reference_column_id);

CREATE TRIGGER update_columns_updated_at
  BEFORE UPDATE ON columns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- LINEAGE
-- =====================================================
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

-- =====================================================
-- MAPPING TABLES
-- =====================================================
CREATE TABLE project_datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  added_at TIMESTAMP DEFAULT NOW(),
  added_by UUID REFERENCES users(id),
  UNIQUE(project_id, dataset_id)
);

CREATE INDEX idx_project_datasets_project ON project_datasets(project_id);
CREATE INDEX idx_project_datasets_dataset ON project_datasets(dataset_id);

CREATE TABLE workspace_datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  canvas_position JSONB,
  added_at TIMESTAMP DEFAULT NOW(),
  added_by UUID REFERENCES users(id),
  UNIQUE(workspace_id, dataset_id)
);

CREATE INDEX idx_workspace_datasets_workspace ON workspace_datasets(workspace_id);
CREATE INDEX idx_workspace_datasets_dataset ON workspace_datasets(dataset_id);

-- =====================================================
-- ENVIRONMENTS & CONNECTIONS
-- =====================================================
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
  UNIQUE(project_id, name)
);

CREATE INDEX idx_environments_account ON environments(account_id);
CREATE INDEX idx_environments_project ON environments(project_id);
CREATE INDEX idx_environments_workspace ON environments(workspace_id);

CREATE TRIGGER update_environments_updated_at
  BEFORE UPDATE ON environments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id),
  name VARCHAR NOT NULL,
  connection_type VARCHAR NOT NULL CHECK (connection_type IN ('MSSQL', 'Databricks', 'Snowflake', 'Salesforce', 'REST')),
  configuration JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TRIGGER update_connections_updated_at
  BEFORE UPDATE ON connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TEMPLATES & MACROS
-- =====================================================
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

-- =====================================================
-- SOURCE CONTROL & AUDIT
-- =====================================================
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

-- =====================================================
-- SYSTEM TABLES
-- =====================================================
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

CREATE TABLE invitations (
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
-- HELPER FUNCTIONS FOR SUBSCRIPTIONS & USAGE
-- =====================================================

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

-- Create trigger for automatic counter updates
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

-- =====================================================
-- VIEWS
-- =====================================================

-- Accounts public view
CREATE OR REPLACE VIEW accounts_public AS
SELECT
  id, name, slug, subscription_tier,
  created_at, updated_at, trial_end_date, is_verified
FROM accounts
WHERE deleted_at IS NULL;

GRANT SELECT ON accounts_public TO authenticated;

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

GRANT SELECT ON active_subscriptions TO authenticated;

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

GRANT SELECT ON ai_usage_current_month TO authenticated;

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

GRANT SELECT ON recent_usage_events TO authenticated;

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

GRANT SELECT ON usage_summary_last_30_days TO authenticated;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE accounts IS 'Multi-tenant root - all resources belong to an account';
COMMENT ON TABLE users IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE account_users IS 'Account membership with roles';
COMMENT ON TABLE subscription_plans IS 'Subscription plan definitions with pricing, limits, and features';
COMMENT ON TABLE subscriptions IS 'Tracks account subscriptions with Stripe integration';
COMMENT ON TABLE payments IS 'Tracks all payment transactions from Stripe';
COMMENT ON TABLE usage_events IS 'Tracks all resource usage events for metering and analytics';
COMMENT ON TABLE projects IS 'Projects for organizing datasets and models';
COMMENT ON TABLE workspaces IS 'Workspaces map to source control branches';
COMMENT ON TABLE datasets IS 'Datasets (formerly nodes) - tables, views, etc.';
COMMENT ON TABLE columns IS 'Columns (formerly node_items) - dataset fields';
COMMENT ON TABLE lineage IS 'Data lineage tracking column-level dependencies';

-- =====================================================
-- END OF CONSOLIDATED SCHEMA
-- =====================================================
SELECT 'Schema created successfully with subscription management!' AS status;
