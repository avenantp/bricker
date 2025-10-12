-- ============================================================================
-- UROQ Database Schema - Clean and Rebuild
-- Phase 1.2: Complete schema reset and rebuild based on specifications
-- ============================================================================
-- WARNING: This script will DROP ALL EXISTING TABLES and rebuild from scratch
-- Only run this if you want to completely reset your database
-- ============================================================================

-- ============================================================================
-- STEP 1: DROP ALL EXISTING TABLES (in reverse dependency order)
-- ============================================================================

-- Drop all RLS policies first
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view workspace member profiles" ON public.users;
DROP POLICY IF EXISTS "Users can view their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can create workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Owners and admins can update workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Owners can delete workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners and admins can add members" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners and admins can update members" ON public.workspace_members;
DROP POLICY IF EXISTS "Owners and admins can remove members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view workspace models" ON public.data_models;
DROP POLICY IF EXISTS "Editors can create models" ON public.data_models;
DROP POLICY IF EXISTS "Editors can update models" ON public.data_models;
DROP POLICY IF EXISTS "Owners and admins can delete models" ON public.data_models;
DROP POLICY IF EXISTS "Users can view model versions" ON public.model_versions;
DROP POLICY IF EXISTS "System can create model versions" ON public.model_versions;
DROP POLICY IF EXISTS "Users can view templates" ON public.templates;
DROP POLICY IF EXISTS "Editors can create templates" ON public.templates;
DROP POLICY IF EXISTS "Users can update own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON public.templates;
DROP POLICY IF EXISTS "Users can view workspace script generations" ON public.script_generations;
DROP POLICY IF EXISTS "Users can create script generations" ON public.script_generations;
DROP POLICY IF EXISTS "Users can update own script generations" ON public.script_generations;
DROP POLICY IF EXISTS "Users can delete own script generations" ON public.script_generations;
DROP POLICY IF EXISTS "Users can view workspace connections" ON public.databricks_connections;
DROP POLICY IF EXISTS "Editors can create connections" ON public.databricks_connections;
DROP POLICY IF EXISTS "Editors can update connections" ON public.databricks_connections;
DROP POLICY IF EXISTS "Owners and admins can delete connections" ON public.databricks_connections;
DROP POLICY IF EXISTS "Users can view workspace conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can view conversation messages" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view workspace configurations" ON public.configurations;
DROP POLICY IF EXISTS "Editors can create configurations" ON public.configurations;
DROP POLICY IF EXISTS "Editors can update configurations" ON public.configurations;
DROP POLICY IF EXISTS "Owners and admins can delete configurations" ON public.configurations;

-- Drop template-related policies
DROP POLICY IF EXISTS "Users can view template fragments" ON public.template_fragments;
DROP POLICY IF EXISTS "Editors can create fragments" ON public.template_fragments;
DROP POLICY IF EXISTS "Users can update own fragments" ON public.template_fragments;
DROP POLICY IF EXISTS "Users can delete own fragments" ON public.template_fragments;
DROP POLICY IF EXISTS "Users can view compositions" ON public.template_compositions;
DROP POLICY IF EXISTS "Editors can create compositions" ON public.template_compositions;
DROP POLICY IF EXISTS "Users can update own compositions" ON public.template_compositions;
DROP POLICY IF EXISTS "Users can delete own compositions" ON public.template_compositions;

-- Drop triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;
DROP TRIGGER IF EXISTS update_workspaces_updated_at ON public.workspaces;
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
DROP TRIGGER IF EXISTS update_uuid_registry_updated_at ON public.uuid_registry;
DROP TRIGGER IF EXISTS update_data_models_updated_at ON public.data_models;
DROP TRIGGER IF EXISTS update_templates_updated_at ON public.templates;
DROP TRIGGER IF EXISTS update_template_fragments_updated_at ON public.template_fragments;
DROP TRIGGER IF EXISTS update_template_compositions_updated_at ON public.template_compositions;
DROP TRIGGER IF EXISTS update_composition_nodes_updated_at ON public.template_composition_nodes;
DROP TRIGGER IF EXISTS update_macros_updated_at ON public.macros;
DROP TRIGGER IF EXISTS update_connections_updated_at ON public.connections;
DROP TRIGGER IF EXISTS update_databricks_connections_updated_at ON public.databricks_connections;
DROP TRIGGER IF EXISTS update_configurations_updated_at ON public.configurations;
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
DROP TRIGGER IF EXISTS auto_version_model ON public.model_versions;
DROP TRIGGER IF EXISTS auto_version_composition ON public.template_composition_versions;

-- Drop functions
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.is_workspace_member(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_workspace_role(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS public.add_workspace_owner_as_member() CASCADE;
DROP FUNCTION IF EXISTS public.can_edit_template_composition(UUID, UUID, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.can_edit_template_fragment(UUID, UUID, BOOLEAN) CASCADE;
DROP FUNCTION IF EXISTS public.log_audit_event(UUID, UUID, TEXT, TEXT, UUID, JSONB, JSONB, INET, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.auto_increment_model_version() CASCADE;
DROP FUNCTION IF EXISTS public.auto_increment_composition_version() CASCADE;

-- Drop tables (in reverse dependency order to avoid foreign key issues)
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.script_generations CASCADE;
DROP TABLE IF EXISTS public.configurations CASCADE;
DROP TABLE IF EXISTS public.databricks_connections CASCADE;
DROP TABLE IF EXISTS public.connections CASCADE;
DROP TABLE IF EXISTS public.macros CASCADE;
DROP TABLE IF EXISTS public.template_composition_versions CASCADE;
DROP TABLE IF EXISTS public.template_composition_edges CASCADE;
DROP TABLE IF EXISTS public.template_composition_nodes CASCADE;
DROP TABLE IF EXISTS public.template_compositions CASCADE;
DROP TABLE IF EXISTS public.template_fragments CASCADE;
DROP TABLE IF EXISTS public.templates CASCADE;
DROP TABLE IF EXISTS public.model_versions CASCADE;
DROP TABLE IF EXISTS public.data_models CASCADE;
DROP TABLE IF EXISTS public.node_state CASCADE;
DROP TABLE IF EXISTS public.uuid_registry CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;
DROP TABLE IF EXISTS public.workspace_members CASCADE;
DROP TABLE IF EXISTS public.workspaces CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- ============================================================================
-- STEP 2: ENABLE REQUIRED EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- STEP 3: CREATE ALL TABLES (based on technical specifications)
-- ============================================================================

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ,
  preferences JSONB DEFAULT '{}'::jsonb
);

-- Workspaces
CREATE TABLE public.workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  github_repo_url TEXT NOT NULL,
  github_branch TEXT DEFAULT 'main',
  github_connection_status TEXT CHECK (github_connection_status IN ('connected', 'disconnected', 'error', 'pending')),
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workspace members (for collaboration with role-based access)
CREATE TABLE public.workspace_members (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

-- Projects within workspaces
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  project_type TEXT NOT NULL CHECK (project_type IN ('Standard', 'DataVault', 'Dimensional')),
  configuration JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- UUID Registry for GitHub-stored nodes and nodeitems
CREATE TABLE public.uuid_registry (
  uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('node', 'nodeitem')),
  fqn TEXT NOT NULL,
  github_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, fqn)
);

-- Node state tracking (GitHub sync status)
CREATE TABLE public.node_state (
  node_uuid UUID PRIMARY KEY REFERENCES public.uuid_registry(uuid) ON DELETE CASCADE,
  git_commit_hash TEXT,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT CHECK (sync_status IN ('synced', 'pending', 'conflict', 'error')),
  sync_error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Data models (React Flow models)
CREATE TABLE public.data_models (
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
CREATE TABLE public.model_versions (
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

-- Templates (Jinja2 templates for script generation)
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL CHECK (template_type IN ('Full', 'Fragment')),
  is_system BOOLEAN DEFAULT false,
  parent_template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL,
  injection_points TEXT[] DEFAULT ARRAY[]::TEXT[],
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
CREATE TABLE public.template_fragments (
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
CREATE TABLE public.template_compositions (
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
CREATE TABLE public.template_composition_nodes (
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
CREATE TABLE public.template_composition_edges (
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
CREATE TABLE public.template_composition_versions (
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

-- Macros (reusable code fragments)
CREATE TABLE public.macros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  code_fragment TEXT NOT NULL,
  language TEXT NOT NULL CHECK (language IN ('SQL', 'Python', 'Scala')),
  parameters JSONB DEFAULT '[]'::jsonb,
  is_public BOOLEAN DEFAULT true,
  created_by_user_id UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Connections (MSSQL, REST APIs, etc.)
CREATE TABLE public.connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  connection_type TEXT NOT NULL CHECK (connection_type IN (
    'MSSQL', 'Salesforce', 'Workday', 'ServiceNow', 'GoogleAnalytics', 'RestAPI'
  )),
  configuration JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Databricks connections (encrypted credentials)
CREATE TABLE public.databricks_connections (
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

-- Workspace configurations (cluster configs, job configs, etc.)
CREATE TABLE public.configurations (
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

-- Script generations (AI-generated scripts)
CREATE TABLE public.script_generations (
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

-- Conversations
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id),
  title TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Messages
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit log for tracking sensitive operations
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- STEP 4: ADD TABLE COMMENTS
-- ============================================================================

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

-- ============================================================================
-- CONFIRMATION MESSAGE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Schema rebuild complete! All tables have been recreated.';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Run 002_indexes.sql';
  RAISE NOTICE '  2. Run 003_functions_and_triggers.sql';
  RAISE NOTICE '  3. Run 004_rls_policies.sql';
END $$;
