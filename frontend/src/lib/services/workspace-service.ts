/**
 * Workspace Service
 *
 * Service layer for managing workspaces including CRUD operations,
 * member management, settings, and statistics.
 */

import { createClient } from '@supabase/supabase-js';
import {
  Workspace,
  WorkspaceWithDetails,
  WorkspaceUser,
  WorkspaceRole,
  WorkspaceSettings,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  WorkspaceStats
} from '@/types/workspace';
import {
  PaginatedResponse,
  PaginationParams,
  createPaginatedResponse,
  validatePaginationParams,
  calculateOffset
} from '@/types/api';
import { SourceControlConnectionStatus } from '@/types/source-control';

/**
 * Workspace search and filter parameters
 */
export interface GetWorkspacesParams extends PaginationParams {
  project_id?: string;
  source_control_status?: SourceControlConnectionStatus;
  search?: string;
  sort_by?: 'name' | 'created_at' | 'updated_at' | 'last_synced_at';
  sort_order?: 'asc' | 'desc';
}

/**
 * Workspace Service Class
 */
export class WorkspaceService {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // =====================================================
  // Workspace CRUD Operations
  // =====================================================

  /**
   * Get workspaces with pagination and filtering
   */
  async getWorkspaces(params: GetWorkspacesParams = {}): Promise<PaginatedResponse<WorkspaceWithDetails>> {
    const { page, limit } = validatePaginationParams(params);
    const offset = calculateOffset(page, limit);

    let query = this.supabase
      .from('workspaces')
      .select(`
        *,
        owner:users!owner_id(id, full_name, email),
        project:projects!project_id(id, name, project_type),
        dataset_count:datasets(count),
        user_count:workspace_users(count)
      `, { count: 'exact' });

    // Filter by project_id
    if (params.project_id) {
      query = query.eq('project_id', params.project_id);
    }

    // Filter by source control status
    if (params.source_control_status) {
      query = query.eq('source_control_connection_status', params.source_control_status);
    }

    // Search by name or description
    if (params.search) {
      query = query.or(`name.ilike.%${params.search}%,description.ilike.%${params.search}%`);
    }

    // Sorting
    const sortBy = params.sort_by || 'updated_at';
    const sortOrder = params.sort_order || 'desc';
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch workspaces: ${error.message}`);
    }

    // Transform data to include computed fields
    const workspaces: WorkspaceWithDetails[] = (data || []).map(workspace => ({
      ...workspace,
      dataset_count: workspace.dataset_count?.[0]?.count || 0,
      user_count: workspace.user_count?.[0]?.count || 0,
      user_role: undefined // Will be populated by getUserRole if needed
    }));

    return createPaginatedResponse(workspaces, page, limit, count || 0);
  }

  /**
   * Get a single workspace by ID
   */
  async getWorkspace(workspaceId: string): Promise<WorkspaceWithDetails> {
    const { data, error } = await this.supabase
      .from('workspaces')
      .select(`
        *,
        owner:users!owner_id(id, full_name, email),
        project:projects!project_id(id, name, project_type),
        dataset_count:datasets(count),
        user_count:workspace_users(count)
      `)
      .eq('id', workspaceId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch workspace: ${error.message}`);
    }

    if (!data) {
      throw new Error('Workspace not found');
    }

    return {
      ...data,
      dataset_count: data.dataset_count?.[0]?.count || 0,
      user_count: data.user_count?.[0]?.count || 0
    };
  }

  /**
   * Create a new workspace
   */
  async createWorkspace(input: CreateWorkspaceInput, userId: string): Promise<Workspace> {
    // Validate input
    this.validateWorkspaceInput(input);

    const workspaceData = {
      account_id: input.account_id,
      project_id: input.project_id,
      name: input.name,
      description: input.description || null,
      visibility: input.visibility || 'public',
      owner_id: userId,
      settings: input.settings || {},
      source_control_connection_status: 'not_connected',
      is_synced: false
    };

    const { data, error } = await this.supabase
      .from('workspaces')
      .insert(workspaceData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create workspace: ${error.message}`);
    }

    return data;
  }

  /**
   * Update an existing workspace
   */
  async updateWorkspace(workspaceId: string, input: UpdateWorkspaceInput): Promise<Workspace> {
    // Validate input
    if (input.name !== undefined) {
      this.validateWorkspaceName(input.name);
    }

    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.visibility !== undefined) updateData.visibility = input.visibility;
    if (input.is_locked !== undefined) updateData.is_locked = input.is_locked;
    if (input.settings !== undefined) updateData.settings = input.settings;

    // Source control fields
    if (input.source_control_repo_url !== undefined) {
      updateData.source_control_repo_url = input.source_control_repo_url;
    }
    if (input.source_control_branch !== undefined) {
      updateData.source_control_branch = input.source_control_branch;
    }
    if (input.source_control_commit_sha !== undefined) {
      updateData.source_control_commit_sha = input.source_control_commit_sha;
    }
    if (input.source_control_provider !== undefined) {
      updateData.source_control_provider = input.source_control_provider;
    }
    if (input.source_control_connection_status !== undefined) {
      updateData.source_control_connection_status = input.source_control_connection_status;
    }

    const { data, error } = await this.supabase
      .from('workspaces')
      .update(updateData)
      .eq('id', workspaceId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update workspace: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a workspace
   */
  async deleteWorkspace(workspaceId: string): Promise<void> {
    // Check if workspace has datasets
    const { count, error: countError } = await this.supabase
      .from('datasets')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    if (countError) {
      throw new Error(`Failed to check workspace dependencies: ${countError.message}`);
    }

    if (count && count > 0) {
      throw new Error(
        `Cannot delete workspace: it has ${count} dataset(s). Please delete all datasets first.`
      );
    }

    const { error } = await this.supabase
      .from('workspaces')
      .delete()
      .eq('id', workspaceId);

    if (error) {
      throw new Error(`Failed to delete workspace: ${error.message}`);
    }
  }

  // =====================================================
  // Workspace User Management
  // =====================================================

  /**
   * Get workspace users
   */
  async getWorkspaceUsers(workspaceId: string): Promise<WorkspaceUser[]> {
    const { data, error } = await this.supabase
      .from('workspace_users')
      .select(`
        *,
        user:users!user_id(id, full_name, email, avatar_url)
      `)
      .eq('workspace_id', workspaceId)
      .order('joined_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch workspace users: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Add a user to a workspace
   */
  async addWorkspaceUser(
    workspaceId: string,
    userId: string,
    role: WorkspaceRole,
    invitedBy: string
  ): Promise<WorkspaceUser> {
    // Check if user is already in the workspace
    const { data: existing } = await this.supabase
      .from('workspace_users')
      .select('id')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      throw new Error('User is already in this workspace');
    }

    const { data, error } = await this.supabase
      .from('workspace_users')
      .insert({
        workspace_id: workspaceId,
        user_id: userId,
        role,
        invited_by: invitedBy
      })
      .select(`
        *,
        user:users!user_id(id, full_name, email, avatar_url)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to add workspace user: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a workspace user's role
   */
  async updateWorkspaceUserRole(
    workspaceId: string,
    userId: string,
    newRole: WorkspaceRole
  ): Promise<WorkspaceUser> {
    const { data, error } = await this.supabase
      .from('workspace_users')
      .update({ role: newRole })
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .select(`
        *,
        user:users!user_id(id, full_name, email, avatar_url)
      `)
      .single();

    if (error) {
      throw new Error(`Failed to update user role: ${error.message}`);
    }

    return data;
  }

  /**
   * Remove a user from a workspace
   */
  async removeWorkspaceUser(workspaceId: string, userId: string): Promise<void> {
    // Don't allow removing the owner
    const workspace = await this.getWorkspace(workspaceId);
    if (workspace.owner_id === userId) {
      throw new Error('Cannot remove the workspace owner. Transfer ownership first.');
    }

    const { error } = await this.supabase
      .from('workspace_users')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to remove workspace user: ${error.message}`);
    }
  }

  // =====================================================
  // Settings Management
  // =====================================================

  /**
   * Get workspace settings
   */
  async getWorkspaceSettings(workspaceId: string): Promise<WorkspaceSettings> {
    const workspace = await this.getWorkspace(workspaceId);
    return workspace.settings || {};
  }

  /**
   * Update workspace settings
   */
  async updateWorkspaceSettings(
    workspaceId: string,
    settings: Partial<WorkspaceSettings>
  ): Promise<WorkspaceSettings> {
    const currentSettings = await this.getWorkspaceSettings(workspaceId);
    const newSettings = {
      ...currentSettings,
      ...settings
    };

    const { data, error } = await this.supabase
      .from('workspaces')
      .update({ settings: newSettings })
      .eq('id', workspaceId)
      .select('settings')
      .single();

    if (error) {
      throw new Error(`Failed to update workspace settings: ${error.message}`);
    }

    return data.settings;
  }

  // =====================================================
  // Permission and Access Checks
  // =====================================================

  /**
   * Check if user has access to workspace
   */
  async hasWorkspaceAccess(workspaceId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .rpc('has_workspace_access', {
        p_workspace_id: workspaceId,
        p_user_id: userId
      });

    if (error) {
      console.error('Error checking workspace access:', error);
      return false;
    }

    return data || false;
  }

  /**
   * Get user's role in workspace
   */
  async getWorkspaceUserRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
    const { data, error } = await this.supabase
      .rpc('get_workspace_user_role', {
        p_workspace_id: workspaceId,
        p_user_id: userId
      });

    if (error) {
      console.error('Error getting workspace user role:', error);
      return null;
    }

    return data as WorkspaceRole | null;
  }

  /**
   * Check if user can edit workspace
   */
  async canEditWorkspace(workspaceId: string, userId: string): Promise<boolean> {
    const role = await this.getWorkspaceUserRole(workspaceId, userId);
    if (!role) return false;

    return [WorkspaceRole.Owner, WorkspaceRole.Admin, WorkspaceRole.Editor].includes(role);
  }

  /**
   * Check if user can delete workspace
   */
  async canDeleteWorkspace(workspaceId: string, userId: string): Promise<boolean> {
    const role = await this.getWorkspaceUserRole(workspaceId, userId);
    if (!role) return false;

    return [WorkspaceRole.Owner, WorkspaceRole.Admin].includes(role);
  }

  /**
   * Check if user can manage workspace users
   */
  async canManageWorkspaceUsers(workspaceId: string, userId: string): Promise<boolean> {
    const role = await this.getWorkspaceUserRole(workspaceId, userId);
    if (!role) return false;

    return [WorkspaceRole.Owner, WorkspaceRole.Admin].includes(role);
  }

  // =====================================================
  // Statistics and Analytics
  // =====================================================

  /**
   * Get workspace statistics
   */
  async getWorkspaceStats(workspaceId: string): Promise<WorkspaceStats> {
    // Get dataset count
    const { count: datasetCount, error: datasetError } = await this.supabase
      .from('datasets')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    if (datasetError) {
      throw new Error(`Failed to fetch dataset count: ${datasetError.message}`);
    }

    // Get user count
    const { count: userCount, error: userError } = await this.supabase
      .from('workspace_users')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', workspaceId);

    if (userError) {
      throw new Error(`Failed to fetch user count: ${userError.message}`);
    }

    // Get source control info
    const workspace = await this.getWorkspace(workspaceId);

    return {
      dataset_count: datasetCount || 0,
      user_count: userCount || 0,
      total_size_bytes: 0, // Would need to calculate from actual data
      uncommitted_changes_count: 0, // Would need to track actual changes
      is_synced: workspace.is_synced,
      last_synced_at: workspace.last_synced_at || undefined
    };
  }

  // =====================================================
  // Source Control Status Updates
  // =====================================================

  /**
   * Update workspace source control connection status
   */
  async updateSourceControlStatus(
    workspaceId: string,
    status: SourceControlConnectionStatus,
    additionalData?: {
      commitSha?: string;
      lastSyncedAt?: string;
      isSynced?: boolean;
    }
  ): Promise<void> {
    const updateData: any = {
      source_control_connection_status: status
    };

    if (additionalData?.commitSha) {
      updateData.source_control_commit_sha = additionalData.commitSha;
    }

    if (additionalData?.lastSyncedAt) {
      updateData.last_synced_at = additionalData.lastSyncedAt;
    }

    if (additionalData?.isSynced !== undefined) {
      updateData.is_synced = additionalData.isSynced;
    }

    const { error } = await this.supabase
      .from('workspaces')
      .update(updateData)
      .eq('id', workspaceId);

    if (error) {
      throw new Error(`Failed to update source control status: ${error.message}`);
    }
  }

  /**
   * Mark workspace as synced
   */
  async markAsSynced(workspaceId: string, commitSha: string): Promise<void> {
    await this.updateSourceControlStatus(workspaceId, 'connected', {
      commitSha,
      lastSyncedAt: new Date().toISOString(),
      isSynced: true
    });
  }

  /**
   * Mark workspace as having uncommitted changes
   */
  async markAsUnsynced(workspaceId: string): Promise<void> {
    const { error } = await this.supabase
      .from('workspaces')
      .update({ is_synced: false })
      .eq('id', workspaceId);

    if (error) {
      throw new Error(`Failed to mark workspace as unsynced: ${error.message}`);
    }
  }

  // =====================================================
  // Validation Helpers
  // =====================================================

  /**
   * Validate workspace input
   */
  private validateWorkspaceInput(input: CreateWorkspaceInput): void {
    if (!input.account_id) {
      throw new Error('Account ID is required');
    }

    if (!input.project_id) {
      throw new Error('Project ID is required');
    }

    this.validateWorkspaceName(input.name);
  }

  /**
   * Validate workspace name
   */
  private validateWorkspaceName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Workspace name is required');
    }

    if (name.length > 100) {
      throw new Error('Workspace name must be 100 characters or less');
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(name)) {
      throw new Error('Workspace name contains invalid characters');
    }
  }

  // =====================================================
  // Utility Methods
  // =====================================================

  /**
   * Get current user ID from Supabase session
   */
  async getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await this.supabase.auth.getUser();

    if (error || !user) {
      throw new Error('User not authenticated');
    }

    return user.id;
  }

  /**
   * Check if workspace name is available in project
   */
  async isWorkspaceNameAvailable(
    name: string,
    projectId: string,
    excludeWorkspaceId?: string
  ): Promise<boolean> {
    let query = this.supabase
      .from('workspaces')
      .select('id')
      .eq('project_id', projectId)
      .eq('name', name);

    if (excludeWorkspaceId) {
      query = query.neq('id', excludeWorkspaceId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      throw new Error(`Failed to check workspace name availability: ${error.message}`);
    }

    return !data; // Available if no data found
  }

  /**
   * Check if workspace is connected to source control
   */
  isSourceControlConnected(workspace: Workspace): boolean {
    return workspace.source_control_connection_status === 'connected';
  }
}

/**
 * Create a WorkspaceService instance with environment configuration
 */
export function createWorkspaceService(): WorkspaceService {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration is missing');
  }

  return new WorkspaceService(supabaseUrl, supabaseKey);
}
