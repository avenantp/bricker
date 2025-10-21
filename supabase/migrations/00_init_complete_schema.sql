--
-- Uroq Complete Database Initialization Script
-- Generated from: db_cluster-20-10-2025@13-48-23.backup
-- Date: 2025-10-21
--
-- This script creates the complete Uroq database schema including:
-- - All tables with soft delete support
-- - Active record views
-- - Database functions and triggers
-- - Indexes for performance
-- - Foreign key constraints
-- - Row-level security policies
--

-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;

-- =============================================================================
-- CUSTOM TYPES
-- =============================================================================

CREATE TYPE public.source_control_connection_status AS ENUM (
    'not_connected',
    'connected',
    'error',
    'pending'
);

CREATE TYPE public.source_control_provider AS ENUM (
    'github',
    'gitlab',
    'bitbucket',
    'azure'
);

CREATE TYPE public.project_type AS ENUM (
    'data_vault',
    'dimensional',
    'standard'
);

-- =============================================================================
-- CORE TABLES
-- =============================================================================

-- accounts: Multi-tenant root - all resources belong to an account
CREATE TABLE public.accounts (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    name character varying NOT NULL,
    slug character varying,
    account_type character varying NOT NULL,
    current_plan_id uuid,
    subscription_tier character varying DEFAULT 'free'::character varying,
    subscription_status character varying DEFAULT 'active'::character varying,

    -- Stripe integration
    stripe_customer_id character varying,
    stripe_subscription_id character varying,

    -- Trial management
    trial_end_date timestamp without time zone,
    trial_started_at timestamp without time zone,
    is_trial_active boolean DEFAULT false,

    -- Usage limits
    max_users integer DEFAULT 1,
    max_projects integer DEFAULT 5,
    max_datasets integer DEFAULT 100,
    max_monthly_ai_requests integer DEFAULT 100,
    max_storage_mb integer DEFAULT 1000,

    -- Current usage counters
    current_user_count integer DEFAULT 0,
    current_project_count integer DEFAULT 0,
    current_dataset_count integer DEFAULT 0,
    current_monthly_ai_requests integer DEFAULT 0,
    current_storage_mb integer DEFAULT 0,
    usage_reset_date timestamp without time zone,

    -- Verification and status
    is_verified boolean DEFAULT false,
    verification_token character varying,
    verification_sent_at timestamp without time zone,

    -- Audit columns
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp without time zone,
    deleted_by uuid,

    CONSTRAINT accounts_slug_key UNIQUE (slug)
);

COMMENT ON TABLE public.accounts IS 'Multi-tenant root - all resources belong to an account';
COMMENT ON COLUMN public.accounts.deleted_at IS 'Soft delete timestamp - NULL means active';
COMMENT ON COLUMN public.accounts.deleted_by IS 'User who soft deleted this account';

-- users table
CREATE TABLE public.users (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    email character varying NOT NULL UNIQUE,
    full_name character varying,
    avatar_url text,

    -- Authentication
    password_hash character varying,
    is_email_verified boolean DEFAULT false,
    email_verification_token character varying,
    email_verification_sent_at timestamp without time zone,
    password_reset_token character varying,
    password_reset_expires timestamp without time zone,

    -- Security
    failed_login_attempts integer DEFAULT 0,
    last_failed_login_at timestamp without time zone,
    account_locked_until timestamp without time zone,
    last_login_at timestamp without time zone,
    last_seen_at timestamp without time zone,

    -- Settings
    notification_settings jsonb DEFAULT '{}'::jsonb,
    preferences jsonb DEFAULT '{}'::jsonb,

    -- Audit columns
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp without time zone,
    deleted_by uuid
);

-- account_users: Join table for account membership
CREATE TABLE public.account_users (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    account_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying NOT NULL,
    previous_role character varying,

    -- Invitation tracking
    invited_by uuid,
    invited_at timestamp without time zone DEFAULT now(),
    joined_at timestamp without time zone,

    -- Status
    is_active boolean DEFAULT true,
    deactivated_at timestamp without time zone,
    deactivated_by uuid,
    deactivation_reason text,

    -- Role changes
    role_changed_at timestamp without time zone,
    role_changed_by uuid,

    -- Audit columns
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,

    CONSTRAINT account_users_account_user_key UNIQUE (account_id, user_id)
);

-- projects table
CREATE TABLE public.projects (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    account_id uuid NOT NULL,
    name character varying NOT NULL,
    description text,
    project_type public.project_type DEFAULT 'standard'::public.project_type,
    owner_id uuid,

    -- Source control configuration (project-level)
    source_control_provider public.source_control_provider,
    source_control_repo_url text,
    source_control_default_branch text DEFAULT 'main'::text,
    source_control_access_token_encrypted text,
    source_control_token_expires_at timestamp with time zone,
    source_control_connection_status public.source_control_connection_status DEFAULT 'not_connected'::public.source_control_connection_status,
    source_control_last_synced_at timestamp with time zone,
    source_control_error_message text,

    -- Settings
    visibility character varying DEFAULT 'private'::character varying,
    settings jsonb DEFAULT '{}'::jsonb,

    -- Audit columns
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp without time zone,
    deleted_by uuid,

    CONSTRAINT projects_account_name_key UNIQUE (account_id, name)
);

-- workspaces table
CREATE TABLE public.workspaces (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    account_id uuid NOT NULL,
    project_id uuid NOT NULL,
    name character varying NOT NULL,
    description text,
    owner_id uuid,

    -- Source control (workspace-specific branch)
    source_control_branch text,
    source_control_commit_sha text,
    source_control_connection_status public.source_control_connection_status,
    source_control_last_synced_at timestamp with time zone,

    -- Settings
    settings jsonb DEFAULT '{}'::jsonb,

    -- Audit columns
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp without time zone,
    deleted_by uuid,

    CONSTRAINT workspaces_account_id_project_id_name_key UNIQUE (account_id, project_id, name)
);

-- connections table (account-level)
CREATE TABLE public.connections (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    account_id uuid NOT NULL,
    name character varying NOT NULL,
    description text,
    connection_type character varying NOT NULL,
    owner_id uuid,

    -- Connection configuration
    host character varying,
    port integer,
    database_name character varying,
    username character varying,
    password_encrypted text,
    additional_properties jsonb DEFAULT '{}'::jsonb,

    -- Status
    is_active boolean DEFAULT true,
    last_tested_at timestamp without time zone,
    test_status character varying,
    test_error_message text,

    -- Audit columns
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp without time zone,
    deleted_by uuid,

    CONSTRAINT connections_account_name_key UNIQUE (account_id, name)
);

-- datasets table
CREATE TABLE public.datasets (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    account_id uuid NOT NULL,
    connection_id uuid,
    name character varying NOT NULL,
    schema character varying,
    fully_qualified_name character varying,
    description text,
    owner_id uuid,

    -- Metadata
    dataset_type character varying,
    table_type character varying,
    row_count bigint,
    size_bytes bigint,
    last_analyzed_at timestamp without time zone,

    -- Sync tracking
    sync_status character varying DEFAULT 'pending'::character varying,
    last_synced_at timestamp without time zone,
    sync_error_message text,
    has_uncommitted_changes boolean DEFAULT false,
    last_committed_sha character varying,

    -- Settings
    visibility character varying DEFAULT 'private'::character varying,
    metadata jsonb DEFAULT '{}'::jsonb,

    -- Audit columns
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp without time zone,
    deleted_by uuid
);

-- columns table
CREATE TABLE public.columns (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    dataset_id uuid NOT NULL,
    name character varying NOT NULL,
    fqn character varying,
    data_type character varying,
    ordinal_position integer,
    is_nullable boolean DEFAULT true,
    column_default text,

    -- Column metadata
    is_primary_key boolean DEFAULT false,
    is_foreign_key boolean DEFAULT false,
    reference_column_id uuid,

    -- Business metadata
    business_name character varying,
    description text,
    tags jsonb DEFAULT '[]'::jsonb,

    -- Data quality
    quality_score numeric(3,2),
    completeness_percentage numeric(5,2),

    -- Audit columns
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp without time zone,
    deleted_by uuid,

    CONSTRAINT columns_dataset_name_key UNIQUE (dataset_id, name)
);

-- diagrams table
CREATE TABLE public.diagrams (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    account_id uuid NOT NULL,
    workspace_id uuid,
    name character varying NOT NULL,
    description text,
    diagram_type character varying DEFAULT 'erd'::character varying,
    owner_id uuid,

    -- Diagram metadata
    is_template boolean DEFAULT false,
    version integer DEFAULT 1,

    -- Diagram state (broken down for better querying)
    viewport jsonb DEFAULT '{"x": 0, "y": 0, "zoom": 1}'::jsonb,
    node_positions jsonb DEFAULT '{}'::jsonb,
    node_expansions jsonb DEFAULT '{}'::jsonb,
    filters jsonb DEFAULT '{}'::jsonb,
    layout_type character varying DEFAULT 'hierarchical'::character varying,
    layout_direction character varying DEFAULT 'TB'::character varying,

    -- Settings
    visibility character varying DEFAULT 'private'::character varying,
    settings jsonb DEFAULT '{}'::jsonb,

    -- Tracking
    last_modified_by uuid,

    -- Audit columns
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

-- diagram_datasets: Join table for datasets in diagrams
CREATE TABLE public.diagram_datasets (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    diagram_id uuid NOT NULL,
    dataset_id uuid NOT NULL,
    location jsonb DEFAULT '{}'::jsonb,
    is_expanded boolean DEFAULT true,

    -- Audit columns
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,

    CONSTRAINT diagram_datasets_diagram_dataset_key UNIQUE (diagram_id, dataset_id)
);

-- lineage table
CREATE TABLE public.lineage (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    workspace_id uuid,
    upstream_dataset_id uuid,
    downstream_dataset_id uuid,
    upstream_column_id uuid,
    downstream_column_id uuid,
    lineage_type character varying,
    transformation_logic text,
    confidence_score numeric(3,2),

    -- Audit columns
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

-- subscription_plans table
CREATE TABLE public.subscription_plans (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    name character varying NOT NULL UNIQUE,
    slug character varying NOT NULL UNIQUE,
    description text,
    tier character varying NOT NULL,

    -- Pricing
    price_monthly numeric(10,2) DEFAULT 0,
    price_yearly numeric(10,2) DEFAULT 0,
    stripe_price_id_monthly character varying,
    stripe_price_id_yearly character varying,

    -- Limits
    max_users integer,
    max_projects integer,
    max_datasets integer,
    max_monthly_ai_requests integer,
    max_storage_mb integer,

    -- Features
    features jsonb DEFAULT '[]'::jsonb,

    -- Status
    is_active boolean DEFAULT true,
    is_public boolean DEFAULT true,

    -- Audit columns
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

-- subscriptions table
CREATE TABLE public.subscriptions (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    account_id uuid NOT NULL,
    plan_id uuid NOT NULL,
    status character varying NOT NULL,

    -- Stripe integration
    stripe_subscription_id character varying UNIQUE,
    stripe_customer_id character varying,

    -- Billing
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    cancel_at_period_end boolean DEFAULT false,
    canceled_at timestamp with time zone,

    -- Trial
    trial_start timestamp with time zone,
    trial_end timestamp with time zone,

    -- Audit columns
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

-- payments table
CREATE TABLE public.payments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    account_id uuid NOT NULL,
    subscription_id uuid,
    amount numeric(10,2) NOT NULL,
    currency character varying DEFAULT 'usd'::character varying,
    status character varying NOT NULL,

    -- Stripe integration
    stripe_payment_intent_id character varying,
    stripe_invoice_id character varying,
    stripe_charge_id character varying,

    -- Payment details
    payment_method character varying,
    failure_reason text,

    -- Timestamps
    processed_at timestamp without time zone,

    -- Audit columns
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

-- invitations table
CREATE TABLE public.invitations (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    account_id uuid NOT NULL,
    email character varying NOT NULL,
    role character varying NOT NULL,
    token character varying NOT NULL UNIQUE,
    status character varying DEFAULT 'pending'::character varying,
    message text,

    -- Tracking
    invited_by uuid,
    accepted_by uuid,
    expires_at timestamp without time zone NOT NULL,
    accepted_at timestamp without time zone,

    -- Audit columns
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp without time zone,
    deleted_by uuid
);

-- api_tokens table
CREATE TABLE public.api_tokens (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    account_id uuid NOT NULL,
    user_id uuid NOT NULL,
    name character varying NOT NULL,
    description text,
    token_hash character varying NOT NULL,
    prefix character varying NOT NULL,
    scopes jsonb DEFAULT '[]'::jsonb,

    -- Status
    is_active boolean DEFAULT true,
    expires_at timestamp without time zone,

    -- Usage tracking
    last_used_at timestamp without time zone,
    usage_count integer DEFAULT 0,
    last_used_ip character varying,
    last_used_user_agent text,

    -- Revocation
    revoked_at timestamp without time zone,
    revoked_by uuid,
    revoke_reason text,

    -- Audit columns
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

-- usage_events table
CREATE TABLE public.usage_events (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    account_id uuid NOT NULL,
    user_id uuid,
    event_type character varying NOT NULL,
    event_category character varying,
    quantity integer DEFAULT 1,
    unit character varying,
    resource_type character varying,
    resource_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb,

    -- Audit columns
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

-- audit_logs table
CREATE TABLE public.audit_logs (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    workspace_id uuid,
    dataset_id uuid,
    changed_by uuid,
    action character varying NOT NULL,
    entity_type character varying NOT NULL,
    entity_id uuid,
    old_values jsonb,
    new_values jsonb,
    committed_in_sha character varying,
    ip_address inet,
    user_agent text,

    -- Audit columns
    created_at timestamp without time zone DEFAULT now()
);

-- configurations table
CREATE TABLE public.configurations (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    workspace_id uuid,
    config_type character varying NOT NULL,
    config_name character varying NOT NULL,
    config_value jsonb NOT NULL,
    is_encrypted boolean DEFAULT false,

    -- Audit columns
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp without time zone,
    deleted_by uuid
);

-- environments table
CREATE TABLE public.environments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    account_id uuid NOT NULL,
    project_id uuid,
    workspace_id uuid,
    name character varying NOT NULL,
    description text,
    environment_type character varying,
    configuration jsonb DEFAULT '{}'::jsonb,

    -- Audit columns
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp without time zone,
    deleted_by uuid
);

-- macros table
CREATE TABLE public.macros (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    name character varying NOT NULL,
    description text,
    macro_type character varying,
    template_content text,
    parameters jsonb DEFAULT '[]'::jsonb,

    -- Audit columns
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp without time zone,
    deleted_by uuid
);

-- templates table
CREATE TABLE public.templates (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    name character varying NOT NULL,
    description text,
    category character varying,
    template_content text,
    variables jsonb DEFAULT '[]'::jsonb,
    parent_template_id uuid,

    -- Audit columns
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,
    deleted_at timestamp without time zone,
    deleted_by uuid
);

-- template_fragments table
CREATE TABLE public.template_fragments (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    template_id uuid NOT NULL,
    injection_point_name character varying NOT NULL,
    fragment_content text NOT NULL,
    order_index integer DEFAULT 0,

    -- Audit columns
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,

    CONSTRAINT template_fragments_template_id_injection_point_name_key UNIQUE (template_id, injection_point_name)
);

-- connection_metadata_cache table
CREATE TABLE public.connection_metadata_cache (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    connection_id uuid NOT NULL,
    metadata_type character varying NOT NULL,
    metadata_content jsonb NOT NULL,
    is_stale boolean DEFAULT false,

    -- Audit columns
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

-- workspace_users table
CREATE TABLE public.workspace_users (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying NOT NULL,

    -- Audit columns
    created_at timestamp without time zone DEFAULT now(),

    CONSTRAINT workspace_users_workspace_id_user_id_key UNIQUE (workspace_id, user_id)
);

-- workspace_datasets table (deprecated but kept for compatibility)
CREATE TABLE public.workspace_datasets (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    workspace_id uuid NOT NULL,
    dataset_id uuid NOT NULL,

    -- Audit columns
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid,

    CONSTRAINT workspace_datasets_workspace_id_dataset_id_key UNIQUE (workspace_id, dataset_id)
);

-- project_users table
CREATE TABLE public.project_users (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying NOT NULL,

    -- Audit columns
    created_at timestamp without time zone DEFAULT now(),

    CONSTRAINT project_users_project_id_user_id_key UNIQUE (project_id, user_id)
);

-- source_control_commits table
CREATE TABLE public.source_control_commits (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL PRIMARY KEY,
    account_id uuid NOT NULL,
    project_id uuid,
    workspace_id uuid,
    commit_sha character varying NOT NULL,
    commit_message text,
    author_name character varying,
    author_email character varying,
    committed_at timestamp with time zone NOT NULL,
    file_paths jsonb DEFAULT '[]'::jsonb,

    -- Audit columns
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by uuid,
    updated_by uuid
);

-- =============================================================================
-- ACTIVE RECORD VIEWS (filter out soft-deleted records)
-- =============================================================================

CREATE VIEW public.accounts_active AS
 SELECT id, name, slug, account_type, current_plan_id, subscription_tier, subscription_status,
        stripe_customer_id, stripe_subscription_id, trial_end_date, trial_started_at, is_trial_active,
        max_users, max_projects, max_datasets, max_monthly_ai_requests, max_storage_mb,
        current_user_count, current_project_count, current_dataset_count, current_monthly_ai_requests,
        current_storage_mb, usage_reset_date, is_verified, verification_token, verification_sent_at,
        created_at, updated_at, created_by, updated_by
   FROM public.accounts
  WHERE deleted_at IS NULL;

CREATE VIEW public.users_active AS
 SELECT id, email, full_name, avatar_url, password_hash, is_email_verified,
        email_verification_token, email_verification_sent_at, password_reset_token,
        password_reset_expires, failed_login_attempts, last_failed_login_at,
        account_locked_until, last_login_at, last_seen_at, notification_settings,
        preferences, created_at, updated_at, created_by, updated_by
   FROM public.users
  WHERE deleted_at IS NULL;

CREATE VIEW public.projects_active AS
 SELECT id, account_id, name, description, project_type, owner_id,
        source_control_provider, source_control_repo_url, source_control_default_branch,
        source_control_access_token_encrypted, source_control_token_expires_at,
        source_control_connection_status, source_control_last_synced_at,
        source_control_error_message, visibility, settings,
        created_at, updated_at, created_by, updated_by
   FROM public.projects
  WHERE deleted_at IS NULL;

CREATE VIEW public.workspaces_active AS
 SELECT id, account_id, project_id, name, description, owner_id,
        source_control_branch, source_control_commit_sha, source_control_connection_status,
        source_control_last_synced_at, settings,
        created_at, updated_at, created_by, updated_by
   FROM public.workspaces
  WHERE deleted_at IS NULL;

CREATE VIEW public.connections_active AS
 SELECT id, account_id, name, description, connection_type, owner_id,
        host, port, database_name, username, password_encrypted, additional_properties,
        is_active, last_tested_at, test_status, test_error_message,
        created_at, updated_at, created_by, updated_by
   FROM public.connections
  WHERE deleted_at IS NULL;

CREATE VIEW public.datasets_active AS
 SELECT id, account_id, connection_id, name, schema, fully_qualified_name, description, owner_id,
        dataset_type, table_type, row_count, size_bytes, last_analyzed_at,
        sync_status, last_synced_at, sync_error_message, has_uncommitted_changes,
        last_committed_sha, visibility, metadata,
        created_at, updated_at, created_by, updated_by
   FROM public.datasets
  WHERE deleted_at IS NULL;

CREATE VIEW public.columns_active AS
 SELECT id, dataset_id, name, fqn, data_type, ordinal_position, is_nullable, column_default,
        is_primary_key, is_foreign_key, reference_column_id, business_name, description,
        tags, quality_score, completeness_percentage,
        created_at, updated_at, created_by, updated_by
   FROM public.columns
  WHERE deleted_at IS NULL;

CREATE VIEW public.configurations_active AS
 SELECT id, workspace_id, config_type, config_name, config_value, is_encrypted,
        created_at, updated_at, created_by, updated_by
   FROM public.configurations
  WHERE deleted_at IS NULL;

CREATE VIEW public.environments_active AS
 SELECT id, account_id, project_id, workspace_id, name, description, environment_type,
        configuration, created_at, updated_at, created_by, updated_by
   FROM public.environments
  WHERE deleted_at IS NULL;

CREATE VIEW public.invitations_active AS
 SELECT id, account_id, email, role, token, status, message, invited_by, accepted_by,
        expires_at, accepted_at, created_at, updated_at, created_by, updated_by
   FROM public.invitations
  WHERE deleted_at IS NULL;

CREATE VIEW public.macros_active AS
 SELECT id, name, description, macro_type, template_content, parameters,
        created_at, updated_at, created_by, updated_by
   FROM public.macros
  WHERE deleted_at IS NULL;

CREATE VIEW public.templates_active AS
 SELECT id, name, description, category, template_content, variables, parent_template_id,
        created_at, updated_at, created_by, updated_by
   FROM public.templates
  WHERE deleted_at IS NULL;

-- (Part 1 of initialization script)
-- To be continued in a subsequent write...
