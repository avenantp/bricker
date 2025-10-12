-- ============================================================================
-- UROQ Database Schema - Functions and Triggers
-- Phase 1.2: Supabase Setup - Database Functions and Triggers
-- ============================================================================

-- ============================================================================
-- UTILITY FUNCTIONS
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
-- USER MANAGEMENT FUNCTIONS
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
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- WORKSPACE FUNCTIONS
-- ============================================================================

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

-- Function to create workspace with owner as member (RPC approach)
-- NOTE: Trigger approach removed to avoid circular RLS dependencies
-- See migration 007_fix_circular_rls.sql for the RPC function implementation
-- This comment serves as documentation for the historical approach

-- ============================================================================
-- TEMPLATE PERMISSION FUNCTIONS
-- ============================================================================

-- Function to check if user can edit template composition
CREATE OR REPLACE FUNCTION public.can_edit_template_composition(
  composition_uuid UUID,
  user_uuid UUID,
  dev_mode_enabled BOOLEAN DEFAULT false
)
RETURNS BOOLEAN AS $$
DECLARE
  is_system BOOLEAN;
  workspace_uuid UUID;
  user_role TEXT;
BEGIN
  -- Get composition info
  SELECT is_system_template, workspace_id INTO is_system, workspace_uuid
  FROM public.template_compositions
  WHERE id = composition_uuid;

  -- System templates require dev mode
  IF is_system AND NOT dev_mode_enabled THEN
    RETURN false;
  END IF;

  -- Null workspace means system template (editable in dev mode)
  IF workspace_uuid IS NULL THEN
    RETURN dev_mode_enabled;
  END IF;

  -- Check workspace permissions
  SELECT role INTO user_role
  FROM public.workspace_members
  WHERE workspace_id = workspace_uuid
    AND user_id = user_uuid;

  -- Admins and editors can edit workspace templates
  RETURN user_role IN ('owner', 'admin', 'editor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can edit template fragment
CREATE OR REPLACE FUNCTION public.can_edit_template_fragment(
  fragment_uuid UUID,
  user_uuid UUID,
  dev_mode_enabled BOOLEAN DEFAULT false
)
RETURNS BOOLEAN AS $$
DECLARE
  is_system BOOLEAN;
  workspace_uuid UUID;
  user_role TEXT;
BEGIN
  -- Get fragment info
  SELECT is_system_template, workspace_id INTO is_system, workspace_uuid
  FROM public.template_fragments
  WHERE id = fragment_uuid;

  -- System templates require dev mode
  IF is_system AND NOT dev_mode_enabled THEN
    RETURN false;
  END IF;

  -- Null workspace means system template (editable in dev mode)
  IF workspace_uuid IS NULL THEN
    RETURN dev_mode_enabled;
  END IF;

  -- Check workspace permissions
  SELECT role INTO user_role
  FROM public.workspace_members
  WHERE workspace_id = workspace_uuid
    AND user_id = user_uuid;

  -- Admins and editors can edit workspace templates
  RETURN user_role IN ('owner', 'admin', 'editor');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- AUDIT LOG FUNCTION
-- ============================================================================

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_user_id UUID,
  p_workspace_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  audit_id UUID;
BEGIN
  INSERT INTO public.audit_log (
    user_id,
    workspace_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    ip_address,
    user_agent
  ) VALUES (
    p_user_id,
    p_workspace_id,
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_values,
    p_new_values,
    p_ip_address,
    p_user_agent
  )
  RETURNING id INTO audit_id;

  RETURN audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VERSIONING FUNCTIONS
-- ============================================================================

-- Function to auto-increment version numbers for model versions
CREATE OR REPLACE FUNCTION public.auto_increment_model_version()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM public.model_versions
  WHERE model_id = NEW.model_id;

  NEW.version_number := next_version;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-incrementing model versions
DROP TRIGGER IF EXISTS auto_version_model ON public.model_versions;
CREATE TRIGGER auto_version_model
  BEFORE INSERT ON public.model_versions
  FOR EACH ROW
  WHEN (NEW.version_number IS NULL)
  EXECUTE FUNCTION public.auto_increment_model_version();

-- Function to auto-increment version numbers for composition versions
CREATE OR REPLACE FUNCTION public.auto_increment_composition_version()
RETURNS TRIGGER AS $$
DECLARE
  next_version INTEGER;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO next_version
  FROM public.template_composition_versions
  WHERE composition_id = NEW.composition_id;

  NEW.version_number := next_version;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for auto-incrementing composition versions
DROP TRIGGER IF EXISTS auto_version_composition ON public.template_composition_versions;
CREATE TRIGGER auto_version_composition
  BEFORE INSERT ON public.template_composition_versions
  FOR EACH ROW
  WHEN (NEW.version_number IS NULL)
  EXECUTE FUNCTION public.auto_increment_composition_version();

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================

-- Workspaces
DROP TRIGGER IF EXISTS update_workspaces_updated_at ON public.workspaces;
CREATE TRIGGER update_workspaces_updated_at
  BEFORE UPDATE ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Projects
DROP TRIGGER IF EXISTS update_projects_updated_at ON public.projects;
CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- UUID Registry
DROP TRIGGER IF EXISTS update_uuid_registry_updated_at ON public.uuid_registry;
CREATE TRIGGER update_uuid_registry_updated_at
  BEFORE UPDATE ON public.uuid_registry
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Data models
DROP TRIGGER IF EXISTS update_data_models_updated_at ON public.data_models;
CREATE TRIGGER update_data_models_updated_at
  BEFORE UPDATE ON public.data_models
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Templates
DROP TRIGGER IF EXISTS update_templates_updated_at ON public.templates;
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Template fragments
DROP TRIGGER IF EXISTS update_template_fragments_updated_at ON public.template_fragments;
CREATE TRIGGER update_template_fragments_updated_at
  BEFORE UPDATE ON public.template_fragments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Template compositions
DROP TRIGGER IF EXISTS update_template_compositions_updated_at ON public.template_compositions;
CREATE TRIGGER update_template_compositions_updated_at
  BEFORE UPDATE ON public.template_compositions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Template composition nodes
DROP TRIGGER IF EXISTS update_composition_nodes_updated_at ON public.template_composition_nodes;
CREATE TRIGGER update_composition_nodes_updated_at
  BEFORE UPDATE ON public.template_composition_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Macros
DROP TRIGGER IF EXISTS update_macros_updated_at ON public.macros;
CREATE TRIGGER update_macros_updated_at
  BEFORE UPDATE ON public.macros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Connections
DROP TRIGGER IF EXISTS update_connections_updated_at ON public.connections;
CREATE TRIGGER update_connections_updated_at
  BEFORE UPDATE ON public.connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Databricks connections
DROP TRIGGER IF EXISTS update_databricks_connections_updated_at ON public.databricks_connections;
CREATE TRIGGER update_databricks_connections_updated_at
  BEFORE UPDATE ON public.databricks_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Configurations
DROP TRIGGER IF EXISTS update_configurations_updated_at ON public.configurations;
CREATE TRIGGER update_configurations_updated_at
  BEFORE UPDATE ON public.configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Conversations
DROP TRIGGER IF EXISTS update_conversations_updated_at ON public.conversations;
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
