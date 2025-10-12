-- ============================================================================
-- UROQ Database Schema - Initial Migration
-- Phase 1.2: Supabase Setup
-- ============================================================================
-- This migration creates the complete database schema for the Uroq application
-- based on the technical specifications in docs/prp/001-technical-specifications.md

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- For encryption

-- ============================================================================
-- USERS & WORKSPACES
-- ============================================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  preferences JSONB DEFAULT '{}'::jsonb
);

-- Workspaces
CREATE TABLE IF NOT EXISTS public.workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  github_repo_url TEXT, -- Optional - can be added later in workspace settings
  github_branch TEXT DEFAULT 'main',
  github_connection_status TEXT CHECK (github_connection_status IN ('connected', 'disconnected', 'error', 'pending')),
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workspace members (for collaboration with role-based access)
CREATE TABLE IF NOT EXISTS public.workspace_members (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

-- ============================================================================
-- PROJECTS (per specifications)
-- ============================================================================

-- Projects within workspaces
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  project_type TEXT NOT NULL CHECK (project_type IN ('Standard', 'DataVault', 'Dimensional')),
  configuration JSONB DEFAULT '{}'::jsonb, -- medallion_layers_enabled, data_vault_preferences, dimensional_preferences
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- NODE METADATA (GitHub-stored with Supabase tracking)
-- ============================================================================

-- UUID Registry for GitHub-stored nodes and nodeitems
CREATE TABLE IF NOT EXISTS public.uuid_registry (
  uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('node', 'nodeitem')),
  fqn TEXT NOT NULL, -- Fully Qualified Name
  github_path TEXT, -- Path in GitHub repo
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, fqn)
);

-- Node state tracking (GitHub sync status)
CREATE TABLE IF NOT EXISTS public.node_state (
  node_uuid UUID PRIMARY KEY REFERENCES public.uuid_registry(uuid) ON DELETE CASCADE,
  git_commit_hash TEXT,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT CHECK (sync_status IN ('synced', 'pending', 'conflict', 'error')),
  sync_error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb -- Cached metadata from GitHub file
);

-- ============================================================================
-- DATA MODELS (Visual Workflow Designer)
-- ============================================================================

-- Data models (React Flow models)
CREATE TABLE IF NOT EXISTS public.data_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  model_type TEXT CHECK (model_type IN ('dimensional', 'data_vault', 'normalized', 'custom')),
  nodes JSONB NOT NULL DEFAULT '[]'::jsonb,
  edges JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT false
);

-- Model versions (for version history)
CREATE TABLE IF NOT EXISTS public.model_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES public.data_models(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  nodes JSONB NOT NULL,
  edges JSONB NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  change_summary TEXT,
  UNIQUE (model_id, version_number)
);

-- ============================================================================
-- TEMPLATES
-- ============================================================================

-- Templates (Jinja2 templates for script generation)
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('Full', 'Fragment')),
  is_system BOOLEAN DEFAULT false, -- System templates stored in Supabase
  parent_template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL, -- For clones
  injection_points TEXT[] DEFAULT ARRAY[]::TEXT[], -- Named locations for fragment insertion
  category TEXT NOT NULL CHECK (category IN (
    'ddl', 'etl', 'dml', 'test', 'job_orchestration',
    'table_management', 'data_quality', 'monitoring'
  )),
  language TEXT NOT NULL CHECK (language IN ('sql', 'python', 'scala')),
  jinja_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_public BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Template fragments (composable template pieces)
CREATE TABLE IF NOT EXISTS public.template_fragments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'data_vault', 'data_mart', 'staging', 'landing', 'jobs', 'pipelines', 'custom'
  )),
  language TEXT NOT NULL CHECK (language IN ('sql', 'python', 'scala')),
  fragment_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  dependencies JSONB DEFAULT '[]'::jsonb,
  is_public BOOLEAN DEFAULT false,
  is_system_template BOOLEAN DEFAULT false,
  cloned_from_id UUID REFERENCES public.template_fragments(id) ON DELETE SET NULL,
  github_path TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Template compositions (decision tree for combining fragments)
CREATE TABLE IF NOT EXISTS public.template_compositions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  language TEXT NOT NULL CHECK (language IN ('sql', 'python', 'scala')),
  flow_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system_template BOOLEAN DEFAULT false,
  cloned_from_id UUID REFERENCES public.template_compositions(id) ON DELETE SET NULL,
  github_path TEXT,
  yaml_valid BOOLEAN DEFAULT true,
  yaml_errors JSONB DEFAULT '[]'::jsonb,
  last_validated_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_archived BOOLEAN DEFAULT false
);

-- Template composition nodes
CREATE TABLE IF NOT EXISTS public.template_composition_nodes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  composition_id UUID NOT NULL REFERENCES public.template_compositions(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL,
  node_type TEXT NOT NULL CHECK (node_type IN ('fragment', 'condition', 'start', 'end', 'merge')),
  fragment_id UUID REFERENCES public.template_fragments(id) ON DELETE SET NULL,
  position JSONB NOT NULL DEFAULT '{}'::jsonb,
  data JSONB DEFAULT '{}'::jsonb,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (composition_id, node_id)
);

-- Template composition edges
CREATE TABLE IF NOT EXISTS public.template_composition_edges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  composition_id UUID NOT NULL REFERENCES public.template_compositions(id) ON DELETE CASCADE,
  edge_id TEXT NOT NULL,
  source_node_id TEXT NOT NULL,
  target_node_id TEXT NOT NULL,
  edge_type TEXT DEFAULT 'default',
  label TEXT,
  condition JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (composition_id, edge_id)
);

-- Template composition versions
CREATE TABLE IF NOT EXISTS public.template_composition_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  composition_id UUID NOT NULL REFERENCES public.template_compositions(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  flow_data JSONB NOT NULL,
  compiled_template TEXT,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  change_summary TEXT,
  UNIQUE (composition_id, version_number)
);

-- ============================================================================
-- MACROS (per specifications)
-- ============================================================================

-- Macros (reusable code fragments)
CREATE TABLE IF NOT EXISTS public.macros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  code_fragment TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('SQL', 'Python', 'Scala')),
  parameters JSONB DEFAULT '[]'::jsonb, -- Array of {name, data_type, default_value, description}
  is_public BOOLEAN DEFAULT true, -- All macros are public per specs
  created_by_user_id UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- CONNECTIONS
-- ============================================================================

-- Connections (MSSQL, REST APIs, etc.)
CREATE TABLE IF NOT EXISTS public.connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  connection_type TEXT NOT NULL CHECK (connection_type IN (
    'MSSQL', 'Salesforce', 'Workday', 'ServiceNow', 'GoogleAnalytics', 'RestAPI'
  )),
  configuration JSONB NOT NULL, -- Encrypted credentials and connection details
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Databricks connections (encrypted credentials)
CREATE TABLE IF NOT EXISTS public.databricks_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  token_encrypted TEXT NOT NULL,
  workspace_id_databricks TEXT,
  catalog_name TEXT,
  schema_name TEXT,
  is_default BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_tested_at TIMESTAMPTZ,
  test_status TEXT CHECK (test_status IN ('success', 'failed', 'pending'))
);

-- ============================================================================
-- CONFIGURATIONS
-- ============================================================================

-- Workspace configurations (cluster configs, job configs, etc.)
CREATE TABLE IF NOT EXISTS public.configurations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cluster', 'job', 'notebook', 'connection')),
  config_json JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SCRIPT GENERATIONS
-- ============================================================================

-- Script generations (AI-generated scripts)
CREATE TABLE IF NOT EXISTS public.script_generations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  model_id UUID REFERENCES public.data_models(id) ON DELETE SET NULL,
  template_ids UUID[] DEFAULT ARRAY[]::UUID[],
  prompt TEXT NOT NULL,
  variables_json JSONB DEFAULT '{}'::jsonb,
  generated_script TEXT,
  script_type TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generated', 'deployed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deployed_at TIMESTAMPTZ
);

-- ============================================================================
-- CONVERSATIONS (AI Chat History)
-- ============================================================================

-- Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- AUDIT LOG (per specifications)
-- ============================================================================

-- Audit log for tracking sensitive operations
CREATE TABLE IF NOT EXISTS public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- e.g., 'create', 'update', 'delete', 'export', 'import'
  entity_type TEXT NOT NULL, -- e.g., 'workspace', 'project', 'node', 'template'
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.users IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE public.workspaces IS 'Workspaces for organizing projects and data models';
COMMENT ON TABLE public.workspace_members IS 'Workspace collaboration with role-based access';
COMMENT ON TABLE public.projects IS 'Projects within workspaces with specific modeling types';
COMMENT ON TABLE public.uuid_registry IS 'UUID tracking for GitHub-stored nodes and nodeitems';
COMMENT ON TABLE public.node_state IS 'GitHub sync status tracking for nodes';
COMMENT ON TABLE public.data_models IS 'React Flow data models with nodes and edges';
COMMENT ON TABLE public.model_versions IS 'Version history for data models';
COMMENT ON TABLE public.templates IS 'Jinja2 templates for script generation';
COMMENT ON TABLE public.template_fragments IS 'Reusable template fragments for composition';
COMMENT ON TABLE public.template_compositions IS 'Template decision tree compositions';
COMMENT ON TABLE public.macros IS 'Reusable code macros (public to all users)';
COMMENT ON TABLE public.connections IS 'External service connections (MSSQL, REST APIs)';
COMMENT ON TABLE public.databricks_connections IS 'Databricks workspace connections with encrypted tokens';
COMMENT ON TABLE public.configurations IS 'Reusable configurations for clusters, jobs, etc.';
COMMENT ON TABLE public.script_generations IS 'AI-generated Databricks scripts';
COMMENT ON TABLE public.conversations IS 'AI assistant conversation history';
COMMENT ON TABLE public.messages IS 'Individual messages in conversations';
COMMENT ON TABLE public.audit_log IS 'Audit trail for sensitive operations';
