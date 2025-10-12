-- ============================================================================
-- UROQ Database Schema - Fix Missing Columns and Tables
-- Phase 1.2: Comprehensive fix for schema alignment
-- ============================================================================

-- First, let's check what exists and create/alter accordingly

-- ============================================================================
-- Fix workspaces table
-- ============================================================================

-- Add github_repo_url if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'github_repo_url'
  ) THEN
    ALTER TABLE public.workspaces ADD COLUMN github_repo_url TEXT;
  END IF;
END $$;

-- Add github_connection_status if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'github_connection_status'
  ) THEN
    ALTER TABLE public.workspaces ADD COLUMN github_connection_status TEXT;
    ALTER TABLE public.workspaces ADD CONSTRAINT workspaces_github_status_check
      CHECK (github_connection_status IN ('connected', 'disconnected', 'error', 'pending'));
  END IF;
END $$;

-- Migrate old github_repo to github_repo_url
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'workspaces' AND column_name = 'github_repo'
  ) THEN
    UPDATE public.workspaces SET github_repo_url = github_repo WHERE github_repo_url IS NULL;
    ALTER TABLE public.workspaces DROP COLUMN github_repo;
  END IF;
END $$;

-- ============================================================================
-- Create projects table if it doesn't exist
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'projects'
  ) THEN
    CREATE TABLE public.projects (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      project_type TEXT NOT NULL DEFAULT 'Standard' CHECK (project_type IN ('Standard', 'DataVault', 'Dimensional')),
      configuration JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX idx_projects_workspace ON public.projects(workspace_id);
    COMMENT ON TABLE public.projects IS 'Projects within workspaces with specific modeling types';
  END IF;
END $$;

-- ============================================================================
-- Create uuid_registry table if it doesn't exist
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'uuid_registry'
  ) THEN
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

    CREATE INDEX idx_uuid_registry_project ON public.uuid_registry(project_id);
    COMMENT ON TABLE public.uuid_registry IS 'UUID tracking for GitHub-stored nodes and nodeitems';
  END IF;
END $$;

-- ============================================================================
-- Create node_state table if it doesn't exist
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'node_state'
  ) THEN
    CREATE TABLE public.node_state (
      node_uuid UUID PRIMARY KEY REFERENCES public.uuid_registry(uuid) ON DELETE CASCADE,
      git_commit_hash TEXT,
      last_synced_at TIMESTAMPTZ,
      sync_status TEXT CHECK (sync_status IN ('synced', 'pending', 'conflict', 'error')),
      sync_error TEXT,
      metadata JSONB DEFAULT '{}'::jsonb
    );

    CREATE INDEX idx_node_state_sync_status ON public.node_state(sync_status);
    COMMENT ON TABLE public.node_state IS 'GitHub sync status tracking for nodes';
  END IF;
END $$;

-- ============================================================================
-- Create macros table if it doesn't exist
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'macros'
  ) THEN
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

    CREATE INDEX idx_macros_language ON public.macros(language);
    COMMENT ON TABLE public.macros IS 'Reusable code macros (public to all users)';
  END IF;
END $$;

-- ============================================================================
-- Create connections table if it doesn't exist
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'connections'
  ) THEN
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

    CREATE INDEX idx_connections_workspace ON public.connections(workspace_id);
    COMMENT ON TABLE public.connections IS 'External service connections (MSSQL, REST APIs)';
  END IF;
END $$;

-- ============================================================================
-- Create audit_log table if it doesn't exist
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'audit_log'
  ) THEN
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

    CREATE INDEX idx_audit_log_user ON public.audit_log(user_id);
    CREATE INDEX idx_audit_log_workspace ON public.audit_log(workspace_id);
    COMMENT ON TABLE public.audit_log IS 'Audit trail for sensitive operations';
  END IF;
END $$;

-- ============================================================================
-- Fix data_models table - add project_id if missing
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'data_models' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE public.data_models ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- Fix templates table - add new columns if missing
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'templates' AND column_name = 'template_type'
  ) THEN
    ALTER TABLE public.templates ADD COLUMN template_type TEXT DEFAULT 'Full';
    ALTER TABLE public.templates ADD CONSTRAINT templates_type_check
      CHECK (template_type IN ('Full', 'Fragment'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'templates' AND column_name = 'is_system'
  ) THEN
    ALTER TABLE public.templates ADD COLUMN is_system BOOLEAN DEFAULT false;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'templates' AND column_name = 'parent_template_id'
  ) THEN
    ALTER TABLE public.templates ADD COLUMN parent_template_id UUID REFERENCES public.templates(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'templates' AND column_name = 'injection_points'
  ) THEN
    ALTER TABLE public.templates ADD COLUMN injection_points TEXT[] DEFAULT ARRAY[]::TEXT[];
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'templates' AND column_name = 'jinja_content'
  ) THEN
    ALTER TABLE public.templates ADD COLUMN jinja_content TEXT;
    -- Copy template_content to jinja_content
    UPDATE public.templates SET jinja_content = template_content WHERE jinja_content IS NULL;
  END IF;
END $$;

-- ============================================================================
-- Verification query - uncomment to check what was created
-- ============================================================================

-- SELECT table_name, column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND table_name IN ('workspaces', 'projects', 'uuid_registry', 'node_state', 'macros', 'connections', 'audit_log', 'data_models', 'templates')
-- ORDER BY table_name, ordinal_position;
