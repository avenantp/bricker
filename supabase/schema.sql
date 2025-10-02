-- Bricker Database Schema for Supabase
-- This schema supports the Databricks Automation Script Generator

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USERS & WORKSPACES
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
  github_repo TEXT,
  github_branch TEXT DEFAULT 'main',
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workspace members (for collaboration)
CREATE TABLE public.workspace_members (
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workspace_id, user_id)
);

-- ============================================================================
-- DATA MODELS
-- ============================================================================

-- Data models (React Flow models)
CREATE TABLE public.data_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
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

-- ============================================================================
-- TEMPLATES
-- ============================================================================

-- Templates (Jinja2 templates for script generation)
CREATE TABLE public.templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN (
    'ddl', 'etl', 'dml', 'test', 'job_orchestration',
    'table_management', 'data_quality', 'monitoring'
  )),
  language TEXT NOT NULL CHECK (language IN ('sql', 'python', 'scala')),
  template_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  variations JSONB DEFAULT '[]'::jsonb,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  is_public BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- SCRIPT GENERATIONS
-- ============================================================================

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

-- ============================================================================
-- DATABRICKS CONNECTIONS
-- ============================================================================

-- Databricks connections (encrypted credentials)
CREATE TABLE public.databricks_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  host TEXT NOT NULL,
  token_encrypted TEXT NOT NULL, -- Use Supabase Vault for encryption
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
-- CONVERSATIONS (AI Chat History)
-- ============================================================================

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

-- ============================================================================
-- CONFIGURATIONS
-- ============================================================================

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

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Workspaces
CREATE INDEX idx_workspaces_owner ON public.workspaces(owner_id);

-- Workspace members
CREATE INDEX idx_workspace_members_user ON public.workspace_members(user_id);

-- Data models
CREATE INDEX idx_data_models_workspace ON public.data_models(workspace_id);
CREATE INDEX idx_data_models_created_by ON public.data_models(created_by);
CREATE INDEX idx_data_models_type ON public.data_models(model_type);

-- Model versions
CREATE INDEX idx_model_versions_model ON public.model_versions(model_id);

-- Templates
CREATE INDEX idx_templates_workspace ON public.templates(workspace_id);
CREATE INDEX idx_templates_category ON public.templates(category);
CREATE INDEX idx_templates_public ON public.templates(is_public) WHERE is_public = true;

-- Script generations
CREATE INDEX idx_script_generations_workspace ON public.script_generations(workspace_id);
CREATE INDEX idx_script_generations_user ON public.script_generations(user_id);
CREATE INDEX idx_script_generations_model ON public.script_generations(model_id);
CREATE INDEX idx_script_generations_status ON public.script_generations(status);

-- Databricks connections
CREATE INDEX idx_databricks_connections_workspace ON public.databricks_connections(workspace_id);

-- Conversations
CREATE INDEX idx_conversations_workspace ON public.conversations(workspace_id);
CREATE INDEX idx_conversations_user ON public.conversations(user_id);

-- Messages
CREATE INDEX idx_messages_conversation ON public.messages(conversation_id);

-- Configurations
CREATE INDEX idx_configurations_workspace ON public.configurations(workspace_id);
CREATE INDEX idx_configurations_type ON public.configurations(type);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Auto-update updated_at for workspaces
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-update updated_at for data_models
CREATE TRIGGER update_data_models_updated_at
  BEFORE UPDATE ON public.data_models
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-update updated_at for templates
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-update updated_at for databricks_connections
CREATE TRIGGER update_databricks_connections_updated_at
  BEFORE UPDATE ON public.databricks_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-update updated_at for configurations
CREATE TRIGGER update_configurations_updated_at
  BEFORE UPDATE ON public.configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-update updated_at for conversations
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to create a new user profile after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to check if user is workspace member
CREATE OR REPLACE FUNCTION public.is_workspace_member(
  workspace_uuid UUID,
  user_uuid UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_id = workspace_uuid
      AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user role in workspace
CREATE OR REPLACE FUNCTION public.get_user_workspace_role(
  workspace_uuid UUID,
  user_uuid UUID
)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.workspace_members
  WHERE workspace_id = workspace_uuid
    AND user_id = user_uuid;

  RETURN COALESCE(user_role, 'none');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE public.users IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE public.workspaces IS 'Workspaces for organizing data models and scripts';
COMMENT ON TABLE public.workspace_members IS 'Workspace collaboration with role-based access';
COMMENT ON TABLE public.data_models IS 'React Flow data models with nodes and edges';
COMMENT ON TABLE public.model_versions IS 'Version history for data models';
COMMENT ON TABLE public.templates IS 'Jinja2 templates for script generation';
COMMENT ON TABLE public.script_generations IS 'AI-generated Databricks scripts';
COMMENT ON TABLE public.databricks_connections IS 'Databricks workspace connections with encrypted tokens';
COMMENT ON TABLE public.conversations IS 'AI assistant conversation history';
COMMENT ON TABLE public.messages IS 'Individual messages in conversations';
COMMENT ON TABLE public.configurations IS 'Reusable configurations for clusters, jobs, etc.';
