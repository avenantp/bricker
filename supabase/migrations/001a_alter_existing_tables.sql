-- ============================================================================
-- UROQ Database Schema - Alter Existing Tables
-- Phase 1.2: Migration fix for existing tables
-- ============================================================================
-- This migration adds missing columns to tables that were created from old schema

-- Add missing column to workspaces table
ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS github_repo_url TEXT;

ALTER TABLE public.workspaces
ADD COLUMN IF NOT EXISTS github_connection_status TEXT
CHECK (github_connection_status IN ('connected', 'disconnected', 'error', 'pending'));

-- Update github_repo to github_repo_url if old column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'workspaces'
    AND column_name = 'github_repo'
  ) THEN
    -- Copy data from old column to new column
    UPDATE public.workspaces
    SET github_repo_url = github_repo
    WHERE github_repo_url IS NULL;

    -- Drop old column
    ALTER TABLE public.workspaces DROP COLUMN IF EXISTS github_repo;
  END IF;
END $$;

-- Ensure all new tables exist (in case they were missing)
-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  project_type TEXT NOT NULL CHECK (project_type IN ('Standard', 'DataVault', 'Dimensional')),
  configuration JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- UUID Registry
CREATE TABLE IF NOT EXISTS public.uuid_registry (
  uuid UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('node', 'nodeitem')),
  fqn TEXT NOT NULL,
  github_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (project_id, fqn)
);

-- Node state
CREATE TABLE IF NOT EXISTS public.node_state (
  node_uuid UUID PRIMARY KEY REFERENCES public.uuid_registry(uuid) ON DELETE CASCADE,
  git_commit_hash TEXT,
  last_synced_at TIMESTAMPTZ,
  sync_status TEXT CHECK (sync_status IN ('synced', 'pending', 'conflict', 'error')),
  sync_error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Macros table
CREATE TABLE IF NOT EXISTS public.macros (
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

-- Connections table
CREATE TABLE IF NOT EXISTS public.connections (
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

-- Audit log table
CREATE TABLE IF NOT EXISTS public.audit_log (
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

-- Add project_id to data_models if missing
ALTER TABLE public.data_models
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- Update templates table for new structure
ALTER TABLE public.templates
ADD COLUMN IF NOT EXISTS template_type TEXT CHECK (template_type IN ('Full', 'Fragment'));

ALTER TABLE public.templates
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;

ALTER TABLE public.templates
ADD COLUMN IF NOT EXISTS parent_template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL;

ALTER TABLE public.templates
ADD COLUMN IF NOT EXISTS injection_points TEXT[] DEFAULT ARRAY[]::TEXT[];

ALTER TABLE public.templates
ADD COLUMN IF NOT EXISTS jinja_content TEXT;

-- Copy template_content to jinja_content if it exists
UPDATE public.templates
SET jinja_content = template_content
WHERE jinja_content IS NULL AND template_content IS NOT NULL;

-- Add variations column to templates if it doesn't exist
ALTER TABLE public.templates
ADD COLUMN IF NOT EXISTS variations JSONB DEFAULT '[]'::jsonb;

COMMENT ON TABLE public.projects IS 'Projects within workspaces with specific modeling types';
COMMENT ON TABLE public.uuid_registry IS 'UUID tracking for GitHub-stored nodes and nodeitems';
COMMENT ON TABLE public.node_state IS 'GitHub sync status tracking for nodes';
COMMENT ON TABLE public.macros IS 'Reusable code macros (public to all users)';
COMMENT ON TABLE public.connections IS 'External service connections (MSSQL, REST APIs)';
COMMENT ON TABLE public.audit_log IS 'Audit trail for sensitive operations';
