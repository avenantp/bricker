/**
 * Workspace-related TypeScript types and interfaces
 * Based on specification: docs/prp/021-project-workspaces-specification.md
 */

// =====================================================
// Enums
// =====================================================

/**
 * Visibility level for workspaces
 */
export enum WorkspaceVisibility {
  Public = 'public',
  Private = 'private',
  Locked = 'locked'
}

/**
 * Role of a user in a workspace
 */
export enum WorkspaceRole {
  Owner = 'owner',
  Admin = 'admin',
  Editor = 'editor',
  Viewer = 'viewer'
}

/**
 * Source control connection status
 */
export enum SourceControlConnectionStatus {
  NotConnected = 'not_connected',
  Connected = 'connected',
  Disconnected = 'disconnected',
  Error = 'error',
  Syncing = 'syncing',
  Conflict = 'conflict'
}

/**
 * Source control sync status
 */
export enum SourceControlSyncStatus {
  Synced = 'synced',
  Ahead = 'ahead',
  Behind = 'behind',
  Diverged = 'diverged'
}

/**
 * Source control provider
 */
export enum SourceControlProvider {
  GitHub = 'github',
  GitLab = 'gitlab',
  Bitbucket = 'bitbucket',
  Azure = 'azure',
  Other = 'other'
}

// =====================================================
// Configuration Types
// =====================================================

/**
 * Canvas settings
 */
export interface CanvasSettings {
  grid_enabled: boolean;
  grid_size: number;
  snap_to_grid: boolean;
  show_minimap: boolean;
  default_zoom: number;
}

/**
 * Diagram settings
 */
export interface DiagramSettings {
  layout_algorithm?: 'hierarchical' | 'force' | 'circular';
  node_spacing?: number;
  edge_routing?: 'orthogonal' | 'curved' | 'straight';
}

/**
 * Workspace settings
 */
export interface WorkspaceSettings {
  auto_sync_enabled?: boolean;
  sync_interval_minutes?: number;
  conflict_resolution_strategy?: 'manual' | 'ours' | 'theirs';
  default_medallion_layer?: 'Bronze' | 'Silver' | 'Gold';
  canvas_settings?: CanvasSettings;
  diagram_settings?: DiagramSettings;
  [key: string]: unknown; // Allow additional properties
}

// =====================================================
// Core Interfaces
// =====================================================

/**
 * Workspace entity (matches database table)
 */
export interface Workspace {
  id: string;
  account_id: string;
  project_id: string;
  name: string;
  description: string | null;
  source_control_repo_url: string | null;
  source_control_branch: string | null;
  source_control_commit_sha: string | null;
  source_control_provider: SourceControlProvider | null;
  source_control_connection_status: SourceControlConnectionStatus | null;
  last_synced_at: string | null;
  is_synced: boolean;
  owner_id: string;
  visibility: WorkspaceVisibility;
  is_locked: boolean;
  settings: WorkspaceSettings;
  created_at: string;
  updated_at: string;
}

/**
 * Workspace with additional computed fields
 */
export interface WorkspaceWithDetails extends Workspace {
  owner?: {
    id: string;
    full_name: string;
    email: string;
  };
  project?: {
    id: string;
    name: string;
    project_type: string;
  };
  dataset_count?: number;
  uncommitted_changes_count?: number;
  unpulled_commits_count?: number;
  user_role?: WorkspaceRole;
  user_count?: number;
  sync_status?: SourceControlSyncStatus;
}

/**
 * Workspace user (from workspace_users table)
 */
export interface WorkspaceUser {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
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
 * Workspace statistics
 */
export interface WorkspaceStats {
  dataset_count: number;
  user_count: number;
  uncommitted_changes: number;
  last_activity: string | null;
  created_at: string;
}

// =====================================================
// Input Types
// =====================================================

/**
 * Input for creating a new workspace
 */
export interface CreateWorkspaceInput {
  name: string;
  description?: string;
  visibility?: WorkspaceVisibility;
  settings?: WorkspaceSettings;
}

/**
 * Input for updating a workspace
 */
export interface UpdateWorkspaceInput {
  name?: string;
  description?: string;
  visibility?: WorkspaceVisibility;
  settings?: WorkspaceSettings;
  is_locked?: boolean;
}

/**
 * Parameters for querying workspaces
 */
export interface GetWorkspacesParams {
  project_id?: string;
  page?: number;
  limit?: number;
  search?: string;
  source_control_status?: SourceControlConnectionStatus;
  sort?: 'name' | 'created_at' | 'updated_at';
  order?: 'asc' | 'desc';
}

/**
 * Input for adding a workspace user
 */
export interface AddWorkspaceUserInput {
  user_id: string;
  role: WorkspaceRole;
}

/**
 * Input for updating a workspace user's role
 */
export interface UpdateWorkspaceUserRoleInput {
  role: WorkspaceRole;
}

// =====================================================
// Validation Rules
// =====================================================

/**
 * Workspace name validation rules
 */
export const WORKSPACE_NAME_RULES = {
  minLength: 3,
  maxLength: 100,
  pattern: /^[a-zA-Z0-9\s\-_]+$/,
  errorMessage: 'Workspace name must be 3-100 characters and contain only letters, numbers, spaces, hyphens, and underscores'
} as const;

/**
 * Workspace description validation rules
 */
export const WORKSPACE_DESCRIPTION_RULES = {
  maxLength: 500,
  errorMessage: 'Workspace description must not exceed 500 characters'
} as const;

// =====================================================
// Type Guards and Helpers
// =====================================================

/**
 * Workspace visibility guard
 */
export function isWorkspaceVisibility(value: string): value is WorkspaceVisibility {
  return Object.values(WorkspaceVisibility).includes(value as WorkspaceVisibility);
}

/**
 * Workspace role guard
 */
export function isWorkspaceRole(value: string): value is WorkspaceRole {
  return Object.values(WorkspaceRole).includes(value as WorkspaceRole);
}

/**
 * Source control provider guard
 */
export function isSourceControlProvider(value: string): value is SourceControlProvider {
  return Object.values(SourceControlProvider).includes(value as SourceControlProvider);
}

/**
 * Check if user can edit workspace based on role
 */
export function canEditWorkspace(role: WorkspaceRole | null | undefined): boolean {
  if (!role) return false;
  return [WorkspaceRole.Owner, WorkspaceRole.Admin, WorkspaceRole.Editor].includes(role);
}

/**
 * Check if user can delete workspace based on role
 */
export function canDeleteWorkspace(role: WorkspaceRole | null | undefined): boolean {
  if (!role) return false;
  return [WorkspaceRole.Owner, WorkspaceRole.Admin].includes(role);
}

/**
 * Check if user can manage workspace users based on role
 */
export function canManageWorkspaceUsers(role: WorkspaceRole | null | undefined): boolean {
  if (!role) return false;
  return [WorkspaceRole.Owner, WorkspaceRole.Admin].includes(role);
}

/**
 * Check if workspace has source control connected
 */
export function isSourceControlConnected(workspace: Workspace | WorkspaceWithDetails): boolean {
  return workspace.source_control_connection_status === SourceControlConnectionStatus.Connected;
}

/**
 * Check if workspace has uncommitted changes
 */
export function hasUncommittedChanges(workspace: WorkspaceWithDetails): boolean {
  return (workspace.uncommitted_changes_count ?? 0) > 0;
}

/**
 * Validate workspace name
 */
export function validateWorkspaceName(name: string): { valid: boolean; error?: string } {
  if (!name || name.length < WORKSPACE_NAME_RULES.minLength) {
    return { valid: false, error: `Name must be at least ${WORKSPACE_NAME_RULES.minLength} characters` };
  }
  if (name.length > WORKSPACE_NAME_RULES.maxLength) {
    return { valid: false, error: `Name must not exceed ${WORKSPACE_NAME_RULES.maxLength} characters` };
  }
  if (!WORKSPACE_NAME_RULES.pattern.test(name)) {
    return { valid: false, error: WORKSPACE_NAME_RULES.errorMessage };
  }
  return { valid: true };
}

/**
 * Get display name for source control provider
 */
export function getProviderDisplayName(provider: SourceControlProvider | null): string {
  if (!provider) return 'Not connected';

  const names: Record<SourceControlProvider, string> = {
    [SourceControlProvider.GitHub]: 'GitHub',
    [SourceControlProvider.GitLab]: 'GitLab',
    [SourceControlProvider.Bitbucket]: 'Bitbucket',
    [SourceControlProvider.Azure]: 'Azure DevOps',
    [SourceControlProvider.Other]: 'Other'
  };

  return names[provider] || 'Unknown';
}

/**
 * Get status badge color
 */
export function getConnectionStatusColor(status: SourceControlConnectionStatus | null): string {
  if (!status) return 'gray';

  const colors: Record<SourceControlConnectionStatus, string> = {
    [SourceControlConnectionStatus.NotConnected]: 'gray',
    [SourceControlConnectionStatus.Connected]: 'green',
    [SourceControlConnectionStatus.Disconnected]: 'yellow',
    [SourceControlConnectionStatus.Error]: 'red',
    [SourceControlConnectionStatus.Syncing]: 'blue',
    [SourceControlConnectionStatus.Conflict]: 'orange'
  };

  return colors[status] || 'gray';
}
