--
-- Uroq Database Constraints, Indexes, Triggers, and RLS Policies
--

-- =============================================================================
-- FOREIGN KEY CONSTRAINTS
-- =============================================================================

-- accounts foreign keys
ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.accounts
    ADD CONSTRAINT accounts_current_plan_id_fkey FOREIGN KEY (current_plan_id) REFERENCES public.subscription_plans(id) ON DELETE SET NULL;

-- users foreign keys
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);

-- account_users foreign keys
ALTER TABLE ONLY public.account_users
    ADD CONSTRAINT account_users_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.account_users
    ADD CONSTRAINT account_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.account_users
    ADD CONSTRAINT account_users_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.account_users
    ADD CONSTRAINT account_users_deactivated_by_fkey FOREIGN KEY (deactivated_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.account_users
    ADD CONSTRAINT account_users_role_changed_by_fkey FOREIGN KEY (role_changed_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.account_users
    ADD CONSTRAINT account_users_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.account_users
    ADD CONSTRAINT account_users_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);

-- projects foreign keys
ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);

-- workspaces foreign keys
ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);

-- connections foreign keys
ALTER TABLE ONLY public.connections
    ADD CONSTRAINT connections_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.connections
    ADD CONSTRAINT connections_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.connections
    ADD CONSTRAINT connections_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.connections
    ADD CONSTRAINT connections_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.connections
    ADD CONSTRAINT connections_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);

-- datasets foreign keys
ALTER TABLE ONLY public.datasets
    ADD CONSTRAINT datasets_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.datasets
    ADD CONSTRAINT datasets_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.connections(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.datasets
    ADD CONSTRAINT datasets_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.datasets
    ADD CONSTRAINT datasets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.datasets
    ADD CONSTRAINT datasets_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.datasets
    ADD CONSTRAINT datasets_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);

-- columns foreign keys
ALTER TABLE ONLY public.columns
    ADD CONSTRAINT columns_dataset_id_fkey FOREIGN KEY (dataset_id) REFERENCES public.datasets(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.columns
    ADD CONSTRAINT columns_reference_column_id_fkey FOREIGN KEY (reference_column_id) REFERENCES public.columns(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.columns
    ADD CONSTRAINT columns_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.columns
    ADD CONSTRAINT columns_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.columns
    ADD CONSTRAINT columns_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);

-- diagrams foreign keys
ALTER TABLE ONLY public.diagrams
    ADD CONSTRAINT diagrams_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.diagrams
    ADD CONSTRAINT diagrams_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.diagrams
    ADD CONSTRAINT diagrams_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.users(id);
ALTER TABLE ONLY public.diagrams
    ADD CONSTRAINT diagrams_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.diagrams
    ADD CONSTRAINT diagrams_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.diagrams
    ADD CONSTRAINT diagrams_last_modified_by_fkey FOREIGN KEY (last_modified_by) REFERENCES public.users(id);

-- diagram_datasets foreign keys
ALTER TABLE ONLY public.diagram_datasets
    ADD CONSTRAINT diagram_datasets_diagram_id_fkey FOREIGN KEY (diagram_id) REFERENCES public.diagrams(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.diagram_datasets
    ADD CONSTRAINT diagram_datasets_dataset_id_fkey FOREIGN KEY (dataset_id) REFERENCES public.datasets(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.diagram_datasets
    ADD CONSTRAINT diagram_datasets_added_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.diagram_datasets
    ADD CONSTRAINT diagram_datasets_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);

-- lineage foreign keys
ALTER TABLE ONLY public.lineage
    ADD CONSTRAINT lineage_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);
ALTER TABLE ONLY public.lineage
    ADD CONSTRAINT lineage_upstream_dataset_id_fkey FOREIGN KEY (upstream_dataset_id) REFERENCES public.datasets(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lineage
    ADD CONSTRAINT lineage_downstream_dataset_id_fkey FOREIGN KEY (downstream_dataset_id) REFERENCES public.datasets(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lineage
    ADD CONSTRAINT lineage_upstream_column_id_fkey FOREIGN KEY (upstream_column_id) REFERENCES public.columns(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lineage
    ADD CONSTRAINT lineage_downstream_column_id_fkey FOREIGN KEY (downstream_column_id) REFERENCES public.columns(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.lineage
    ADD CONSTRAINT lineage_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.lineage
    ADD CONSTRAINT lineage_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);

-- subscriptions foreign keys
ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.subscription_plans(id) ON DELETE RESTRICT;
ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);

-- payments foreign keys
ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);

-- invitations foreign keys
ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_accepted_by_fkey FOREIGN KEY (accepted_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.invitations
    ADD CONSTRAINT invitations_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);

-- api_tokens foreign keys
ALTER TABLE ONLY public.api_tokens
    ADD CONSTRAINT api_tokens_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.api_tokens
    ADD CONSTRAINT api_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.api_tokens
    ADD CONSTRAINT api_tokens_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.api_tokens
    ADD CONSTRAINT api_tokens_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.api_tokens
    ADD CONSTRAINT api_tokens_revoked_by_fkey FOREIGN KEY (revoked_by) REFERENCES public.users(id);

-- usage_events foreign keys
ALTER TABLE ONLY public.usage_events
    ADD CONSTRAINT usage_events_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.usage_events
    ADD CONSTRAINT fk_usage_events_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE ONLY public.usage_events
    ADD CONSTRAINT usage_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.usage_events
    ADD CONSTRAINT usage_events_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);

-- audit_logs foreign keys
ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);
ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_dataset_id_fkey FOREIGN KEY (dataset_id) REFERENCES public.datasets(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id);

-- Other foreign keys...
ALTER TABLE ONLY public.configurations
    ADD CONSTRAINT configurations_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);
ALTER TABLE ONLY public.configurations
    ADD CONSTRAINT configurations_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.configurations
    ADD CONSTRAINT configurations_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.configurations
    ADD CONSTRAINT configurations_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.environments
    ADD CONSTRAINT environments_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.environments
    ADD CONSTRAINT environments_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE ONLY public.environments
    ADD CONSTRAINT environments_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);
ALTER TABLE ONLY public.environments
    ADD CONSTRAINT environments_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.environments
    ADD CONSTRAINT environments_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.environments
    ADD CONSTRAINT environments_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.macros
    ADD CONSTRAINT macros_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.macros
    ADD CONSTRAINT macros_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.macros
    ADD CONSTRAINT macros_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_parent_template_id_fkey FOREIGN KEY (parent_template_id) REFERENCES public.templates(id);
ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.templates
    ADD CONSTRAINT templates_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.template_fragments
    ADD CONSTRAINT template_fragments_template_id_fkey FOREIGN KEY (template_id) REFERENCES public.templates(id);
ALTER TABLE ONLY public.template_fragments
    ADD CONSTRAINT template_fragments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.template_fragments
    ADD CONSTRAINT template_fragments_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.connection_metadata_cache
    ADD CONSTRAINT connection_metadata_cache_connection_id_fkey FOREIGN KEY (connection_id) REFERENCES public.connections(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.connection_metadata_cache
    ADD CONSTRAINT connection_metadata_cache_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.connection_metadata_cache
    ADD CONSTRAINT connection_metadata_cache_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.workspace_users
    ADD CONSTRAINT workspace_users_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.workspace_users
    ADD CONSTRAINT workspace_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.workspace_datasets
    ADD CONSTRAINT workspace_datasets_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.workspace_datasets
    ADD CONSTRAINT workspace_datasets_dataset_id_fkey FOREIGN KEY (dataset_id) REFERENCES public.datasets(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.workspace_datasets
    ADD CONSTRAINT workspace_datasets_added_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);
ALTER TABLE ONLY public.workspace_datasets
    ADD CONSTRAINT workspace_datasets_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.users(id);

ALTER TABLE ONLY public.project_users
    ADD CONSTRAINT project_users_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.project_users
    ADD CONSTRAINT project_users_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.source_control_commits
    ADD CONSTRAINT source_control_commits_account_id_fkey FOREIGN KEY (account_id) REFERENCES public.accounts(id) ON DELETE CASCADE;
ALTER TABLE ONLY public.source_control_commits
    ADD CONSTRAINT source_control_commits_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);
ALTER TABLE ONLY public.source_control_commits
    ADD CONSTRAINT source_control_commits_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id);
ALTER TABLE ONLY public.source_control_commits
    ADD CONSTRAINT source_control_commits_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.source_control_commits
    ADD CONSTRAINT source_control_commits_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);

ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);
ALTER TABLE ONLY public.subscription_plans
    ADD CONSTRAINT subscription_plans_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- accounts indexes
CREATE INDEX idx_accounts_active ON public.accounts USING btree (id, account_type) WHERE (deleted_at IS NULL);
CREATE INDEX idx_accounts_deleted ON public.accounts USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);
CREATE INDEX idx_accounts_slug ON public.accounts USING btree (slug);
CREATE INDEX idx_accounts_subscription ON public.accounts USING btree (subscription_status);
CREATE INDEX idx_accounts_trial_end ON public.accounts USING btree (trial_end_date) WHERE (trial_end_date IS NOT NULL);
CREATE INDEX idx_accounts_type ON public.accounts USING btree (account_type);

-- users indexes
CREATE INDEX idx_users_active ON public.users USING btree (email) WHERE (deleted_at IS NULL);
CREATE INDEX idx_users_deleted ON public.users USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);
CREATE INDEX idx_users_email ON public.users USING btree (email);
CREATE INDEX idx_users_last_seen_at ON public.users USING btree (last_seen_at DESC NULLS LAST);

-- account_users indexes
CREATE INDEX idx_account_users_account ON public.account_users USING btree (account_id);
CREATE INDEX idx_account_users_user ON public.account_users USING btree (user_id);
CREATE INDEX idx_account_users_account_active ON public.account_users USING btree (account_id, is_active) WHERE (is_active = true);
CREATE INDEX idx_account_users_user_active ON public.account_users USING btree (user_id, is_active) WHERE (is_active = true);
CREATE INDEX idx_account_users_role ON public.account_users USING btree (account_id, role);

-- projects indexes
CREATE INDEX idx_projects_account ON public.projects USING btree (account_id);
CREATE INDEX idx_projects_active ON public.projects USING btree (account_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_projects_deleted ON public.projects USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);
CREATE INDEX idx_projects_owner ON public.projects USING btree (owner_id);
CREATE INDEX idx_projects_visibility ON public.projects USING btree (visibility);
CREATE INDEX idx_projects_source_control_provider ON public.projects USING btree (source_control_provider);

-- workspaces indexes
CREATE INDEX idx_workspaces_account ON public.workspaces USING btree (account_id);
CREATE INDEX idx_workspaces_project ON public.workspaces USING btree (project_id);
CREATE INDEX idx_workspaces_active ON public.workspaces USING btree (account_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_workspaces_deleted ON public.workspaces USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);
CREATE INDEX idx_workspaces_owner ON public.workspaces USING btree (owner_id);

-- connections indexes
CREATE INDEX idx_connections_account ON public.connections USING btree (account_id);
CREATE INDEX idx_connections_active ON public.connections USING btree (account_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_connections_deleted ON public.connections USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);
CREATE INDEX idx_connections_owner ON public.connections USING btree (owner_id);
CREATE INDEX idx_connections_type ON public.connections USING btree (connection_type);
CREATE INDEX idx_connections_status ON public.connections USING btree (is_active);

-- datasets indexes
CREATE INDEX idx_datasets_account ON public.datasets USING btree (account_id);
CREATE INDEX idx_datasets_active ON public.datasets USING btree (account_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_datasets_deleted ON public.datasets USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);
CREATE INDEX idx_datasets_connection ON public.datasets USING btree (connection_id);
CREATE INDEX idx_datasets_owner ON public.datasets USING btree (owner_id);
CREATE INDEX idx_datasets_fully_qualified_name ON public.datasets USING btree (fully_qualified_name);
CREATE INDEX idx_datasets_visibility ON public.datasets USING btree (visibility);
CREATE INDEX idx_datasets_sync_status ON public.datasets USING btree (sync_status);

-- columns indexes
CREATE INDEX idx_columns_dataset ON public.columns USING btree (dataset_id);
CREATE INDEX idx_columns_active ON public.columns USING btree (dataset_id) WHERE (deleted_at IS NULL);
CREATE INDEX idx_columns_deleted ON public.columns USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);
CREATE INDEX idx_columns_fqn ON public.columns USING btree (fqn);
CREATE INDEX idx_columns_reference ON public.columns USING btree (reference_column_id);

-- diagrams indexes
CREATE INDEX idx_diagrams_account ON public.diagrams USING btree (account_id);
CREATE INDEX idx_diagrams_workspace ON public.diagrams USING btree (workspace_id);
CREATE INDEX idx_diagrams_owner ON public.diagrams USING btree (owner_id);
CREATE INDEX idx_diagrams_type ON public.diagrams USING btree (diagram_type);
CREATE INDEX idx_diagrams_template ON public.diagrams USING btree (is_template) WHERE (is_template = true);
CREATE INDEX idx_diagrams_visibility ON public.diagrams USING btree (visibility);

-- diagram_datasets indexes
CREATE INDEX idx_diagram_datasets_diagram ON public.diagram_datasets USING btree (diagram_id);
CREATE INDEX idx_diagram_datasets_dataset ON public.diagram_datasets USING btree (dataset_id);
CREATE INDEX idx_diagram_datasets_added_by ON public.diagram_datasets USING btree (created_by);

-- lineage indexes
CREATE INDEX idx_lineage_workspace ON public.lineage USING btree (workspace_id);
CREATE INDEX idx_lineage_upstream_dataset ON public.lineage USING btree (upstream_dataset_id);
CREATE INDEX idx_lineage_downstream_dataset ON public.lineage USING btree (downstream_dataset_id);
CREATE INDEX idx_lineage_upstream_column ON public.lineage USING btree (upstream_column_id);
CREATE INDEX idx_lineage_downstream_column ON public.lineage USING btree (downstream_column_id);

-- subscriptions indexes
CREATE INDEX idx_subscriptions_account ON public.subscriptions USING btree (account_id);
CREATE INDEX idx_subscriptions_account_status ON public.subscriptions USING btree (account_id, status);
CREATE INDEX idx_subscriptions_plan ON public.subscriptions USING btree (plan_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions USING btree (status);
CREATE INDEX idx_subscriptions_stripe ON public.subscriptions USING btree (stripe_subscription_id);

-- payments indexes
CREATE INDEX idx_payments_account ON public.payments USING btree (account_id);
CREATE INDEX idx_payments_subscription ON public.payments USING btree (subscription_id);
CREATE INDEX idx_payments_status ON public.payments USING btree (status);
CREATE INDEX idx_payments_processed ON public.payments USING btree (processed_at DESC);

-- invitations indexes
CREATE INDEX idx_invitations_account ON public.invitations USING btree (account_id);
CREATE INDEX idx_invitations_email ON public.invitations USING btree (email);
CREATE INDEX idx_invitations_token ON public.invitations USING btree (token);
CREATE INDEX idx_invitations_status ON public.invitations USING btree (status);
CREATE INDEX idx_invitations_expires ON public.invitations USING btree (expires_at);
CREATE INDEX idx_invitations_deleted ON public.invitations USING btree (deleted_at) WHERE (deleted_at IS NOT NULL);

-- api_tokens indexes
CREATE INDEX idx_api_tokens_account ON public.api_tokens USING btree (account_id);
CREATE INDEX idx_api_tokens_user ON public.api_tokens USING btree (user_id);
CREATE INDEX idx_api_tokens_hash ON public.api_tokens USING btree (token_hash);
CREATE INDEX idx_api_tokens_active ON public.api_tokens USING btree (account_id, user_id, is_active) WHERE (is_active = true);
CREATE INDEX idx_api_tokens_expires ON public.api_tokens USING btree (expires_at) WHERE ((expires_at IS NOT NULL) AND (is_active = true));

-- usage_events indexes
CREATE INDEX idx_usage_events_account ON public.usage_events USING btree (account_id);
CREATE INDEX idx_usage_events_user ON public.usage_events USING btree (user_id);
CREATE INDEX idx_usage_events_type ON public.usage_events USING btree (event_type);
CREATE INDEX idx_usage_events_category ON public.usage_events USING btree (event_category);
CREATE INDEX idx_usage_events_account_created ON public.usage_events USING btree (account_id, created_at DESC);

-- audit_logs indexes
CREATE INDEX idx_audit_logs_workspace ON public.audit_logs USING btree (workspace_id);
CREATE INDEX idx_audit_logs_dataset ON public.audit_logs USING btree (dataset_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);
CREATE INDEX idx_audit_logs_uncommitted ON public.audit_logs USING btree (committed_in_sha) WHERE (committed_in_sha IS NULL);

-- =============================================================================
-- TRIGGERS
-- =============================================================================

-- Updated_at triggers
CREATE TRIGGER trigger_accounts_updated_at BEFORE UPDATE ON public.accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_account_users_updated_at BEFORE UPDATE ON public.account_users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_workspaces_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_connections_updated_at BEFORE UPDATE ON public.connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_datasets_updated_at BEFORE UPDATE ON public.datasets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_columns_updated_at BEFORE UPDATE ON public.columns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_diagrams_updated_at BEFORE UPDATE ON public.diagrams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trigger_diagram_datasets_updated_at BEFORE UPDATE ON public.diagram_datasets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Usage counter triggers
CREATE TRIGGER trg_account_users_count AFTER INSERT OR DELETE OR UPDATE ON public.account_users FOR EACH ROW EXECUTE FUNCTION public.update_account_user_count();
CREATE TRIGGER trg_projects_count AFTER INSERT OR DELETE OR UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_account_project_count();
CREATE TRIGGER trg_datasets_count AFTER INSERT OR DELETE OR UPDATE ON public.datasets FOR EACH ROW EXECUTE FUNCTION public.update_account_dataset_count();

-- Other triggers
CREATE TRIGGER trigger_set_dataset_owner BEFORE INSERT ON public.datasets FOR EACH ROW EXECUTE FUNCTION public.set_dataset_owner();
CREATE TRIGGER trigger_update_dataset_fqn BEFORE INSERT OR UPDATE OF connection_id, schema, name ON public.datasets FOR EACH ROW EXECUTE FUNCTION public.update_dataset_fqn();
CREATE TRIGGER project_owner_to_users AFTER INSERT ON public.projects FOR EACH ROW EXECUTE FUNCTION public.add_project_owner_to_project_users();
CREATE TRIGGER workspace_owner_to_users AFTER INSERT ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.add_workspace_owner_to_workspace_users();

-- Auth trigger
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================================================

-- Enable RLS
ALTER TABLE public.account_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connection_metadata_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagrams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagram_datasets ENABLE ROW LEVEL SECURITY;

-- account_users policies
CREATE POLICY "Users can view account members"
    ON public.account_users FOR SELECT
    USING (account_id IN (
        SELECT account_id FROM public.account_users
        WHERE user_id = auth.uid() AND is_active = true
    ));

CREATE POLICY "Admins can add account members"
    ON public.account_users FOR INSERT
    WITH CHECK (
        account_id IN (
            SELECT account_id FROM public.account_users
            WHERE user_id = auth.uid()
              AND role IN ('owner', 'admin')
              AND is_active = true
        ) AND is_active = true
    );

CREATE POLICY "Admins can update account members"
    ON public.account_users FOR UPDATE
    USING (
        account_id IN (
            SELECT account_id FROM public.account_users
            WHERE user_id = auth.uid()
              AND role IN ('owner', 'admin')
              AND is_active = true
        ) OR user_id = auth.uid()
    )
    WITH CHECK (
        account_id IN (
            SELECT account_id FROM public.account_users
            WHERE user_id = auth.uid()
              AND role IN ('owner', 'admin')
              AND is_active = true
        ) OR user_id = auth.uid()
    );

CREATE POLICY "Prevent hard deletes on account members"
    ON public.account_users FOR DELETE
    USING (false);

-- users policies
CREATE POLICY "Users can view their own profile"
    ON public.users FOR SELECT
    USING (
        id = auth.uid() OR
        id IN (
            SELECT au2.user_id
            FROM public.account_users au1
            JOIN public.account_users au2 ON au1.account_id = au2.account_id
            WHERE au1.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- invitations policies
CREATE POLICY "Users can view invitations for their accounts"
    ON public.invitations FOR SELECT
    USING (account_id IN (
        SELECT account_id FROM public.account_users
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "Admins can create invitations"
    ON public.invitations FOR INSERT
    WITH CHECK (account_id IN (
        SELECT account_id FROM public.account_users
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'admin')
    ));

CREATE POLICY "Admins can update invitations"
    ON public.invitations FOR UPDATE
    USING (
        account_id IN (
            SELECT account_id FROM public.account_users
            WHERE user_id = auth.uid()
              AND role IN ('owner', 'admin')
        ) OR (
            status = 'pending' AND expires_at > now()
        )
    )
    WITH CHECK (
        account_id IN (
            SELECT account_id FROM public.account_users
            WHERE user_id = auth.uid()
              AND role IN ('owner', 'admin')
        ) OR (
            status IN ('pending', 'accepted') AND expires_at > now()
        )
    );

CREATE POLICY "Admins can delete invitations"
    ON public.invitations FOR DELETE
    USING (account_id IN (
        SELECT account_id FROM public.account_users
        WHERE user_id = auth.uid()
          AND role IN ('owner', 'admin')
    ));

-- api_tokens policies
CREATE POLICY "Users can view their own tokens"
    ON public.api_tokens FOR SELECT
    USING (
        user_id = auth.uid() OR
        account_id IN (
            SELECT account_id FROM public.account_users
            WHERE user_id = auth.uid()
              AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Users can create tokens for accounts they belong to"
    ON public.api_tokens FOR INSERT
    WITH CHECK (
        user_id = auth.uid() AND
        account_id IN (
            SELECT account_id FROM public.account_users
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own tokens"
    ON public.api_tokens FOR UPDATE
    USING (
        user_id = auth.uid() OR
        account_id IN (
            SELECT account_id FROM public.account_users
            WHERE user_id = auth.uid()
              AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY "Users can delete their own tokens"
    ON public.api_tokens FOR DELETE
    USING (
        user_id = auth.uid() OR
        account_id IN (
            SELECT account_id FROM public.account_users
            WHERE user_id = auth.uid()
              AND role IN ('owner', 'admin')
        )
    );

-- connections policies
CREATE POLICY "connections_isolation_policy"
    ON public.connections FOR SELECT
    USING (account_id IN (
        SELECT account_id FROM public.account_users
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "connections_insert_policy"
    ON public.connections FOR INSERT
    WITH CHECK (account_id IN (
        SELECT account_id FROM public.account_users
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "connections_update_policy"
    ON public.connections FOR UPDATE
    USING (
        owner_id = auth.uid() OR
        (SELECT role FROM public.account_users
         WHERE user_id = auth.uid()
           AND account_id = connections.account_id) IN ('owner', 'admin')
    );

CREATE POLICY "connections_delete_policy"
    ON public.connections FOR DELETE
    USING (
        owner_id = auth.uid() OR
        (SELECT role FROM public.account_users
         WHERE user_id = auth.uid()
           AND account_id = connections.account_id) IN ('owner', 'admin')
    );

-- connection_metadata_cache policy
CREATE POLICY "connection_metadata_cache_policy"
    ON public.connection_metadata_cache
    USING (connection_id IN (
        SELECT id FROM public.connections
        WHERE account_id IN (
            SELECT account_id FROM public.account_users
            WHERE user_id = auth.uid()
        )
    ));

-- diagrams policies
CREATE POLICY "diagrams_select_policy"
    ON public.diagrams FOR SELECT
    USING (
        account_id IN (
            SELECT account_id FROM public.account_users
            WHERE user_id = auth.uid()
        ) OR visibility = 'public'
    );

CREATE POLICY "diagrams_insert_policy"
    ON public.diagrams FOR INSERT
    WITH CHECK (account_id IN (
        SELECT account_id FROM public.account_users
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "diagrams_update_policy"
    ON public.diagrams FOR UPDATE
    USING (account_id IN (
        SELECT account_id FROM public.account_users
        WHERE user_id = auth.uid()
    ));

CREATE POLICY "diagrams_delete_policy"
    ON public.diagrams FOR DELETE
    USING (
        owner_id = auth.uid() OR
        account_id IN (
            SELECT account_id FROM public.account_users
            WHERE user_id = auth.uid()
              AND role IN ('owner', 'admin')
        )
    );

-- diagram_datasets policies
CREATE POLICY "diagram_datasets_select_policy"
    ON public.diagram_datasets FOR SELECT
    USING (diagram_id IN (
        SELECT id FROM public.diagrams
        WHERE account_id IN (
            SELECT account_id FROM public.account_users
            WHERE user_id = auth.uid()
        ) OR visibility = 'public'
    ));

CREATE POLICY "diagram_datasets_insert_policy"
    ON public.diagram_datasets FOR INSERT
    WITH CHECK (diagram_id IN (
        SELECT id FROM public.diagrams
        WHERE account_id IN (
            SELECT account_id FROM public.account_users
            WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY "diagram_datasets_update_policy"
    ON public.diagram_datasets FOR UPDATE
    USING (diagram_id IN (
        SELECT id FROM public.diagrams
        WHERE account_id IN (
            SELECT account_id FROM public.account_users
            WHERE user_id = auth.uid()
        )
    ));

CREATE POLICY "diagram_datasets_delete_policy"
    ON public.diagram_datasets FOR DELETE
    USING (diagram_id IN (
        SELECT id FROM public.diagrams
        WHERE account_id IN (
            SELECT account_id FROM public.account_users
            WHERE user_id = auth.uid()
        )
    ));
