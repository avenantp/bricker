// Updated TypeScript types for GitHub-based storage model

export type UserRole = 'owner' | 'admin' | 'contributor' | 'viewer';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'paused';
export type Visibility = 'public' | 'private';

// Subscription Plans
export interface SubscriptionPlan {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  max_users: number | null;
  max_projects: number | null;
  features: Record<string, any> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Companies
export interface Company {
  id: string;
  name: string;
  slug: string;
  subscription_plan_id: string | null;
  subscription_status: SubscriptionStatus;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  trial_ends_at: string | null;
  billing_email: string | null;
  settings: Record<string, any> | null;
  github_org: string | null;
  github_default_repo: string | null;
  created_at: string;
  updated_at: string;
}

// Company Members
export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: UserRole;
  invited_by: string | null;
  invited_at: string | null;
  joined_at: string | null;
  created_at: string;
}

// Users
export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  github_username: string | null;
  github_token: string | null;
  settings: Record<string, any> | null;
  last_sign_in_at: string | null;
  created_at: string;
  updated_at: string;
}

// Workspaces
export interface Workspace {
  id: string;
  company_id: string;
  name: string;
  slug: string;
  description: string | null;
  owner_id: string;
  settings: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

// Workspace Members
export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: UserRole;
  added_by: string | null;
  added_at: string | null;
  created_at: string;
}

// Projects (GitHub YAML storage - only metadata in DB)
export interface Project {
  id: string;
  company_id: string;
  workspace_id: string;

  // GitHub reference
  github_repo: string;
  github_branch: string;
  github_path: string;
  github_sha: string | null;

  // Metadata
  name: string;
  slug: string;
  description: string | null;
  version: string;

  // Access control
  visibility: Visibility;
  is_locked: boolean;
  locked_by: string | null;
  locked_at: string | null;

  // Ownership
  created_by: string;
  owner_id: string;

  // Timestamps
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
}

// Project Members (for private projects)
export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  added_by: string | null;
  added_at: string | null;
  created_at: string;
}

// Data Models (GitHub YAML storage - only metadata in DB)
export interface DataModel {
  id: string;
  project_id: string;
  company_id: string;
  workspace_id: string;

  // GitHub reference
  github_repo: string;
  github_branch: string;
  github_path: string;
  github_sha: string | null;

  // Metadata
  name: string;
  slug: string;
  description: string | null;
  model_type: 'dimensional' | 'data_vault' | 'normalized' | 'custom' | null;
  version: string;

  // Access control
  visibility: Visibility;
  is_locked: boolean;
  locked_by: string | null;
  locked_at: string | null;

  // Ownership
  created_by: string;
  owner_id: string;

  // Status
  is_archived: boolean;

  // Timestamps
  created_at: string;
  updated_at: string;
  last_synced_at: string | null;
}

// Data Model Members (for private models)
export interface DataModelMember {
  id: string;
  data_model_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  added_by: string | null;
  added_at: string | null;
  created_at: string;
}

// Configurations
export interface Configuration {
  id: string;
  workspace_id: string;
  name: string;
  type: string;
  config_data: Record<string, any>;
  created_by: string;
  created_at: string;
  updated_at: string;
}

// Invitations
export interface Invitation {
  id: string;
  company_id: string;
  workspace_id: string | null;
  email: string;
  role: UserRole;
  invited_by: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

// Audit Logs
export interface AuditLog {
  id: string;
  company_id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  details: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// Full project data (from GitHub YAML)
export interface ProjectData {
  metadata: Project;
  members?: ProjectMember[];
  data_models?: Array<{
    id: string;
    name: string;
    path: string;
  }>;
  settings?: {
    databricks_workspace?: string;
    default_catalog?: string;
    default_schema?: string;
    tags?: string[];
  };
}

// Full data model data (from GitHub YAML)
export interface DataModelData {
  metadata: DataModel;
  visual_model: {
    nodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data: Record<string, any>;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      type: string;
    }>;
  };
  schema?: {
    catalog: string;
    database: string;
    table: string;
    format: string;
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
      comment?: string;
    }>;
    partitioned_by?: string[];
    clustered_by?: {
      type: string;
      columns: string[];
    };
    table_properties?: Record<string, any>;
  };
  data_quality?: Array<{
    name: string;
    type: string;
    column?: string;
    columns?: string[];
    pattern?: string;
    expression?: string;
    where?: string;
  }>;
  members?: DataModelMember[];
  tags?: string[];
  lineage?: {
    upstream?: Array<{
      type: string;
      catalog?: string;
      schema?: string;
      table?: string;
    }>;
    downstream?: Array<{
      type: string;
      catalog?: string;
      schema?: string;
      table?: string;
    }>;
  };
}
