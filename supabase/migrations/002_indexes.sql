-- ============================================================================
-- UROQ Database Schema - Indexes
-- Phase 1.2: Supabase Setup - Performance Indexes
-- ============================================================================

-- ============================================================================
-- WORKSPACE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON public.workspaces(owner_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_github_status ON public.workspaces(github_connection_status);
CREATE INDEX IF NOT EXISTS idx_workspace_members_user ON public.workspace_members(user_id);
CREATE INDEX IF NOT EXISTS idx_workspace_members_role ON public.workspace_members(role);

-- ============================================================================
-- PROJECT INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_projects_workspace ON public.projects(workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_type ON public.projects(project_type);
CREATE INDEX IF NOT EXISTS idx_projects_created ON public.projects(created_at DESC);

-- ============================================================================
-- UUID REGISTRY & NODE STATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_uuid_registry_project ON public.uuid_registry(project_id);
CREATE INDEX IF NOT EXISTS idx_uuid_registry_fqn ON public.uuid_registry(fqn);
CREATE INDEX IF NOT EXISTS idx_uuid_registry_entity_type ON public.uuid_registry(entity_type);
CREATE INDEX IF NOT EXISTS idx_uuid_registry_github_path ON public.uuid_registry(github_path);

CREATE INDEX IF NOT EXISTS idx_node_state_sync_status ON public.node_state(sync_status);
CREATE INDEX IF NOT EXISTS idx_node_state_last_synced ON public.node_state(last_synced_at DESC);

-- ============================================================================
-- DATA MODEL INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_data_models_workspace ON public.data_models(workspace_id);
CREATE INDEX IF NOT EXISTS idx_data_models_project ON public.data_models(project_id);
CREATE INDEX IF NOT EXISTS idx_data_models_created_by ON public.data_models(created_by);
CREATE INDEX IF NOT EXISTS idx_data_models_type ON public.data_models(model_type);
CREATE INDEX IF NOT EXISTS idx_data_models_archived ON public.data_models(is_archived) WHERE is_archived = false;

CREATE INDEX IF NOT EXISTS idx_model_versions_model ON public.model_versions(model_id);
CREATE INDEX IF NOT EXISTS idx_model_versions_number ON public.model_versions(model_id, version_number DESC);

-- ============================================================================
-- TEMPLATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_templates_workspace ON public.templates(workspace_id);
CREATE INDEX IF NOT EXISTS idx_templates_category ON public.templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_type ON public.templates(template_type);
CREATE INDEX IF NOT EXISTS idx_templates_public ON public.templates(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_templates_system ON public.templates(is_system) WHERE is_system = true;
CREATE INDEX IF NOT EXISTS idx_templates_language ON public.templates(language);

CREATE INDEX IF NOT EXISTS idx_template_fragments_workspace ON public.template_fragments(workspace_id);
CREATE INDEX IF NOT EXISTS idx_template_fragments_category ON public.template_fragments(category);
CREATE INDEX IF NOT EXISTS idx_template_fragments_public ON public.template_fragments(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_template_fragments_system ON public.template_fragments(is_system_template) WHERE is_system_template = true;
CREATE INDEX IF NOT EXISTS idx_template_fragments_cloned_from ON public.template_fragments(cloned_from_id);

CREATE INDEX IF NOT EXISTS idx_template_compositions_workspace ON public.template_compositions(workspace_id);
CREATE INDEX IF NOT EXISTS idx_template_compositions_archived ON public.template_compositions(is_archived) WHERE is_archived = false;
CREATE INDEX IF NOT EXISTS idx_template_compositions_system ON public.template_compositions(is_system_template) WHERE is_system_template = true;
CREATE INDEX IF NOT EXISTS idx_template_compositions_cloned_from ON public.template_compositions(cloned_from_id);
CREATE INDEX IF NOT EXISTS idx_template_compositions_invalid ON public.template_compositions(yaml_valid) WHERE yaml_valid = false;

CREATE INDEX IF NOT EXISTS idx_composition_nodes_composition ON public.template_composition_nodes(composition_id);
CREATE INDEX IF NOT EXISTS idx_composition_nodes_fragment ON public.template_composition_nodes(fragment_id);
CREATE INDEX IF NOT EXISTS idx_composition_nodes_enabled ON public.template_composition_nodes(is_enabled) WHERE is_enabled = true;

CREATE INDEX IF NOT EXISTS idx_composition_edges_composition ON public.template_composition_edges(composition_id);
CREATE INDEX IF NOT EXISTS idx_composition_edges_source ON public.template_composition_edges(source_node_id);
CREATE INDEX IF NOT EXISTS idx_composition_edges_target ON public.template_composition_edges(target_node_id);

CREATE INDEX IF NOT EXISTS idx_composition_versions_composition ON public.template_composition_versions(composition_id);
CREATE INDEX IF NOT EXISTS idx_composition_versions_number ON public.template_composition_versions(composition_id, version_number DESC);

-- ============================================================================
-- MACRO INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_macros_language ON public.macros(language);
CREATE INDEX IF NOT EXISTS idx_macros_public ON public.macros(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_macros_created_by ON public.macros(created_by_user_id);

-- ============================================================================
-- CONNECTION INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_connections_workspace ON public.connections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_connections_type ON public.connections(connection_type);
CREATE INDEX IF NOT EXISTS idx_connections_active ON public.connections(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_databricks_connections_workspace ON public.databricks_connections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_databricks_connections_default ON public.databricks_connections(is_default) WHERE is_default = true;
CREATE INDEX IF NOT EXISTS idx_databricks_connections_status ON public.databricks_connections(test_status);

-- ============================================================================
-- CONFIGURATION INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_configurations_workspace ON public.configurations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_configurations_type ON public.configurations(type);
CREATE INDEX IF NOT EXISTS idx_configurations_active ON public.configurations(is_active) WHERE is_active = true;

-- ============================================================================
-- SCRIPT GENERATION INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_script_generations_workspace ON public.script_generations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_script_generations_user ON public.script_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_script_generations_model ON public.script_generations(model_id);
CREATE INDEX IF NOT EXISTS idx_script_generations_status ON public.script_generations(status);
CREATE INDEX IF NOT EXISTS idx_script_generations_created ON public.script_generations(created_at DESC);

-- ============================================================================
-- CONVERSATION INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_conversations_workspace ON public.conversations(workspace_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON public.conversations(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON public.messages(created_at ASC);

-- ============================================================================
-- AUDIT LOG INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_workspace ON public.audit_log(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created ON public.audit_log(created_at DESC);

-- ============================================================================
-- FULL TEXT SEARCH INDEXES (for search functionality)
-- ============================================================================

-- Add text search for templates
CREATE INDEX IF NOT EXISTS idx_templates_search
  ON public.templates
  USING GIN (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- Add text search for template fragments
CREATE INDEX IF NOT EXISTS idx_template_fragments_search
  ON public.template_fragments
  USING GIN (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));

-- Add text search for macros
CREATE INDEX IF NOT EXISTS idx_macros_search
  ON public.macros
  USING GIN (to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '')));
