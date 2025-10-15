/**
 * Project-related TypeScript types and interfaces
 * Based on specification: docs/prp/021-project-workspaces-specification.md
 */

import type { SourceControlProvider, SourceControlConnectionStatus } from './source-control';

// =====================================================
// Enums
// =====================================================

/**
 * Type of project structure
 * @deprecated Projects now support multiple types based on mappings and lineage.
 * This enum is kept for backward compatibility only.
 */
export enum ProjectType {
  Standard = 'Standard',
  DataVault = 'DataVault',
  Dimensional = 'Dimensional'
}

/**
 * Visibility level for projects
 */
export enum ProjectVisibility {
  Public = 'public',
  Private = 'private',
  Locked = 'locked'
}

/**
 * Role of a user in a project
 */
export enum ProjectRole {
  Owner = 'owner',
  Admin = 'admin',
  Editor = 'editor',
  Viewer = 'viewer'
}

// =====================================================
// Configuration Types
// =====================================================

/**
 * Data Vault specific preferences
 */
export interface DataVaultPreferences {
  hub_naming_pattern: string;
  satellite_naming_pattern: string;
  link_naming_pattern: string;
  hash_algorithm: 'SHA-256' | 'MD5' | 'SHA-1';
  include_load_date: boolean;
  include_record_source: boolean;
  multi_active_satellites: boolean;
  business_vault_enabled: boolean;
}

/**
 * Dimensional model preferences
 */
export interface DimensionalPreferences {
  dimension_naming_pattern: string;
  fact_naming_pattern: string;
  surrogate_key_strategy: 'hash' | 'sequence' | 'uuid';
  default_scd_type: 0 | 1 | 2 | 3 | 4 | 6;
  conformed_dimensions: boolean;
}

/**
 * Naming conventions
 */
export interface NamingConventions {
  case_style: 'snake_case' | 'camelCase' | 'PascalCase' | 'kebab-case';
  prefix_enabled: boolean;
  suffix_enabled: boolean;
}

/**
 * Quality rules
 */
export interface QualityRules {
  require_descriptions: boolean;
  require_business_names: boolean;
  min_confidence_score: number;
}

/**
 * Project configuration
 */
export interface ProjectConfiguration {
  medallion_layers_enabled?: boolean;
  default_catalog?: string;
  default_schema?: string;
  data_vault_preferences?: DataVaultPreferences;
  dimensional_preferences?: DimensionalPreferences;
  naming_conventions?: NamingConventions;
  quality_rules?: QualityRules;
  [key: string]: unknown; // Allow additional properties
}

// =====================================================
// Core Interfaces
// =====================================================

/**
 * Project entity (matches database table)
 */
export interface Project {
  id: string;
  account_id: string;
  name: string;
  description: string | null;
  project_type: ProjectType | null; // Made nullable - deprecated field
  configuration: ProjectConfiguration;
  owner_id: string;
  visibility: ProjectVisibility;
  is_locked: boolean;
  // Source control fields (project-level)
  source_control_provider: SourceControlProvider | null;
  source_control_repo_url: string | null;
  source_control_connection_status: SourceControlConnectionStatus | null;
  source_control_last_synced_at: string | null;
  source_control_default_branch: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Project with additional computed fields
 */
export interface ProjectWithDetails extends Project {
  owner?: {
    id: string;
    full_name: string;
    email: string;
  };
  workspace_count?: number;
  dataset_count?: number;
  user_role?: ProjectRole;
  user_count?: number;
}

/**
 * Project user (from project_users table)
 */
export interface ProjectUser {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  joined_at: string;
  invited_by: string | null;
  user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}

/**
 * Project statistics
 */
export interface ProjectStats {
  workspace_count: number;
  dataset_count: number;
  user_count: number;
  last_activity: string | null;
  created_at: string;
}

// =====================================================
// Input Types
// =====================================================

/**
 * Source control configuration for project creation
 */
export interface ProjectSourceControlConfig {
  provider: SourceControlProvider;
  repo_url: string;
  access_token: string;
  refresh_token?: string;
  default_branch?: string;
  username?: string;
}

/**
 * Input for creating a new project
 */
export interface CreateProjectInput {
  name: string;
  description?: string;
  project_type?: ProjectType; // Made optional - deprecated field
  visibility?: ProjectVisibility;
  configuration?: ProjectConfiguration;
  source_control?: ProjectSourceControlConfig; // Optional source control setup
}

/**
 * Input for updating a project
 */
export interface UpdateProjectInput {
  name?: string;
  description?: string;
  visibility?: ProjectVisibility;
  configuration?: ProjectConfiguration;
  is_locked?: boolean;
}

/**
 * Parameters for querying projects
 */
export interface GetProjectsParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: ProjectType; // Deprecated - kept for backward compatibility
  visibility?: ProjectVisibility;
  source_control_status?: SourceControlConnectionStatus; // New filter
  source_control_provider?: SourceControlProvider; // New filter
  sort?: 'name' | 'created_at' | 'updated_at';
  order?: 'asc' | 'desc';
}

/**
 * Input for adding a project user
 */
export interface AddProjectUserInput {
  user_id: string;
  role: ProjectRole;
}

/**
 * Input for updating a project user's role
 */
export interface UpdateProjectUserRoleInput {
  role: ProjectRole;
}

/**
 * Project source control credentials (from project_source_control_credentials table)
 */
export interface ProjectSourceControlCredentials {
  id: string;
  project_id: string;
  provider: SourceControlProvider;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  token_expires_at: string | null;
  username: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Input for storing/updating project source control credentials
 */
export interface StoreProjectCredentialsInput {
  project_id: string;
  provider: SourceControlProvider;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  username?: string;
}

// =====================================================
// Validation Rules
// =====================================================

/**
 * Project name validation rules
 */
export const PROJECT_NAME_RULES = {
  minLength: 3,
  maxLength: 100,
  pattern: /^[a-zA-Z0-9\s\-_]+$/,
  errorMessage: 'Project name must be 3-100 characters and contain only letters, numbers, spaces, hyphens, and underscores'
} as const;

/**
 * Project description validation rules
 */
export const PROJECT_DESCRIPTION_RULES = {
  maxLength: 500,
  errorMessage: 'Project description must not exceed 500 characters'
} as const;

// =====================================================
// Type Guards and Helpers
// =====================================================

/**
 * Project type guard
 */
export function isProjectType(value: string): value is ProjectType {
  return Object.values(ProjectType).includes(value as ProjectType);
}

/**
 * Project visibility guard
 */
export function isProjectVisibility(value: string): value is ProjectVisibility {
  return Object.values(ProjectVisibility).includes(value as ProjectVisibility);
}

/**
 * Project role guard
 */
export function isProjectRole(value: string): value is ProjectRole {
  return Object.values(ProjectRole).includes(value as ProjectRole);
}

/**
 * Check if user can edit project based on role
 */
export function canEditProject(role: ProjectRole | null | undefined): boolean {
  if (!role) return false;
  return [ProjectRole.Owner, ProjectRole.Admin, ProjectRole.Editor].includes(role);
}

/**
 * Check if user can delete project based on role
 */
export function canDeleteProject(role: ProjectRole | null | undefined): boolean {
  if (!role) return false;
  return role === ProjectRole.Owner;
}

/**
 * Check if user can manage project users based on role
 */
export function canManageProjectUsers(role: ProjectRole | null | undefined): boolean {
  if (!role) return false;
  return [ProjectRole.Owner, ProjectRole.Admin].includes(role);
}

/**
 * Validate project name
 */
export function validateProjectName(name: string): { valid: boolean; error?: string } {
  if (!name || name.length < PROJECT_NAME_RULES.minLength) {
    return { valid: false, error: `Name must be at least ${PROJECT_NAME_RULES.minLength} characters` };
  }
  if (name.length > PROJECT_NAME_RULES.maxLength) {
    return { valid: false, error: `Name must not exceed ${PROJECT_NAME_RULES.maxLength} characters` };
  }
  if (!PROJECT_NAME_RULES.pattern.test(name)) {
    return { valid: false, error: PROJECT_NAME_RULES.errorMessage };
  }
  return { valid: true };
}
