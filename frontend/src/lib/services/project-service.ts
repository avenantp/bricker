/**
 * Project Service
 *
 * Service layer for managing projects including CRUD operations,
 * member management, and permission checks.
 */

import { createClient } from '@supabase/supabase-js';
import {
  Project,
  ProjectWithDetails,
  ProjectUser,
  ProjectRole,
  CreateProjectInput,
  UpdateProjectInput,
  ProjectStats
} from '@/types/project';
import {
  PaginatedResponse,
  PaginationParams,
  createPaginatedResponse,
  validatePaginationParams,
  calculateOffset
} from '@/types/api';

/**
 * Project search and filter parameters
 */
export interface GetProjectsParams extends PaginationParams {
  account_id?: string;
  project_type?: string;
  visibility?: 'public' | 'private' | 'locked';
  search?: string;
  sort_by?: 'name' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

/**
 * Project Service Class
 */
export class ProjectService {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // =====================================================
  // Project CRUD Operations
  // =====================================================

  /**
   * Get projects with pagination and filtering
   */
  async getProjects(params: GetProjectsParams = {}): Promise<PaginatedResponse<ProjectWithDetails>> {
    const { page, limit } = validatePaginationParams(params);
    const offset = calculateOffset(page, limit);

    let query = this.supabase
      .from('projects')
      .select(`
        *,
        owner:users!owner_id(id, full_name, email),
        workspace_count:workspaces(count),
        user_count:project_users(count)
      `, { count: 'exact' });

    // Filter by account_id
    if (params.account_id) {
      query = query.eq('account_id', params.account_id);
    }

    // Filter by project_type
    if (params.project_type) {
      query = query.eq('project_type', params.project_type);
    }

    // Filter by visibility
    if (params.visibility && params.visibility !== 'all') {
      query = query.eq('visibility', params.visibility);
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
      throw new Error(`Failed to fetch projects: ${error.message}`);
    }

    // Transform data to include computed fields
    const projects: ProjectWithDetails[] = (data || []).map(project => ({
      ...project,
      workspace_count: project.workspace_count?.[0]?.count || 0,
      user_count: project.user_count?.[0]?.count || 0,
      user_role: undefined // Will be populated by getUserRole if needed
    }));

    return createPaginatedResponse(projects, page, limit, count || 0);
  }

  /**
   * Get a single project by ID
   */
  async getProject(projectId: string): Promise<ProjectWithDetails> {
    const { data, error } = await this.supabase
      .from('projects')
      .select(`
        *,
        owner:users!owner_id(id, full_name, email),
        workspace_count:workspaces(count),
        user_count:project_users(count)
      `)
      .eq('id', projectId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch project: ${error.message}`);
    }

    if (!data) {
      throw new Error('Project not found');
    }

    return {
      ...data,
      workspace_count: data.workspace_count?.[0]?.count || 0,
      user_count: data.user_count?.[0]?.count || 0
    };
  }

  /**
   * Create a new project
   */
  async createProject(input: CreateProjectInput, userId: string): Promise<Project> {
    // Validate input
    this.validateProjectInput(input);

    const projectData = {
      account_id: input.account_id,
      name: input.name,
      description: input.description || null,
      project_type: input.project_type,
      visibility: input.visibility || 'public',
      owner_id: userId,
      configuration: input.configuration || {}
    };

    const { data, error } = await this.supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create project: ${error.message}`);
    }

    return data;
  }

  /**
   * Update an existing project
   */
  async updateProject(projectId: string, input: UpdateProjectInput): Promise<Project> {
    // Validate input
    if (input.name !== undefined) {
      this.validateProjectName(input.name);
    }

    const updateData: any = {};
    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.visibility !== undefined) updateData.visibility = input.visibility;
    if (input.configuration !== undefined) updateData.configuration = input.configuration;
    if (input.is_locked !== undefined) updateData.is_locked = input.is_locked;

    const { data, error } = await this.supabase
      .from('projects')
      .update(updateData)
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update project: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: string): Promise<void> {
    // Check if project has workspaces
    const { count, error: countError } = await this.supabase
      .from('workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId);

    if (countError) {
      throw new Error(`Failed to check project dependencies: ${countError.message}`);
    }

    if (count && count > 0) {
      throw new Error(
        `Cannot delete project: it has ${count} workspace(s). Please delete all workspaces first.`
      );
    }

    const { error } = await this.supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      throw new Error(`Failed to delete project: ${error.message}`);
    }
  }

  // =====================================================
  // Project User Management
  // =====================================================

  /**
   * Get project users
   */
  async getProjectUsers(projectId: string): Promise<ProjectUser[]> {
    const { data, error } = await this.supabase
      .from('project_users')
      .select(`
        *,
        user:users!user_id(id, full_name, email, avatar_url)
      `)
      .eq('project_id', projectId)
      .order('joined_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch project users: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Add a user to a project
   */
  async addProjectUser(
    projectId: string,
    userId: string,
    role: ProjectRole,
    invitedBy: string
  ): Promise<ProjectUser> {
    // Check if user is already in the project
    const { data: existing } = await this.supabase
      .from('project_users')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      throw new Error('User is already in this project');
    }

    const { data, error } = await this.supabase
      .from('project_users')
      .insert({
        project_id: projectId,
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
      throw new Error(`Failed to add project user: ${error.message}`);
    }

    return data;
  }

  /**
   * Update a project user's role
   */
  async updateProjectUserRole(
    projectId: string,
    userId: string,
    newRole: ProjectRole
  ): Promise<ProjectUser> {
    const { data, error } = await this.supabase
      .from('project_users')
      .update({ role: newRole })
      .eq('project_id', projectId)
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
   * Remove a user from a project
   */
  async removeProjectUser(projectId: string, userId: string): Promise<void> {
    // Don't allow removing the owner
    const project = await this.getProject(projectId);
    if (project.owner_id === userId) {
      throw new Error('Cannot remove the project owner. Transfer ownership first.');
    }

    const { error } = await this.supabase
      .from('project_users')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to remove project user: ${error.message}`);
    }
  }

  // =====================================================
  // Permission and Access Checks
  // =====================================================

  /**
   * Check if user has access to project
   */
  async hasProjectAccess(projectId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .rpc('has_project_access', {
        p_project_id: projectId,
        p_user_id: userId
      });

    if (error) {
      console.error('Error checking project access:', error);
      return false;
    }

    return data || false;
  }

  /**
   * Get user's role in project
   */
  async getProjectUserRole(projectId: string, userId: string): Promise<ProjectRole | null> {
    const { data, error } = await this.supabase
      .rpc('get_project_user_role', {
        p_project_id: projectId,
        p_user_id: userId
      });

    if (error) {
      console.error('Error getting project user role:', error);
      return null;
    }

    return data as ProjectRole | null;
  }

  /**
   * Check if user can edit project
   */
  async canEditProject(projectId: string, userId: string): Promise<boolean> {
    const role = await this.getProjectUserRole(projectId, userId);
    if (!role) return false;

    return [ProjectRole.Owner, ProjectRole.Admin, ProjectRole.Editor].includes(role);
  }

  /**
   * Check if user can delete project
   */
  async canDeleteProject(projectId: string, userId: string): Promise<boolean> {
    const project = await this.getProject(projectId);
    return project.owner_id === userId;
  }

  /**
   * Check if user can manage project users
   */
  async canManageProjectUsers(projectId: string, userId: string): Promise<boolean> {
    const role = await this.getProjectUserRole(projectId, userId);
    if (!role) return false;

    return [ProjectRole.Owner, ProjectRole.Admin].includes(role);
  }

  // =====================================================
  // Statistics and Analytics
  // =====================================================

  /**
   * Get project statistics
   */
  async getProjectStats(projectId: string): Promise<ProjectStats> {
    // Get workspace count
    const { count: workspaceCount, error: workspaceError } = await this.supabase
      .from('workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId);

    if (workspaceError) {
      throw new Error(`Failed to fetch workspace count: ${workspaceError.message}`);
    }

    // Get dataset count across all workspaces
    const { data: workspaces, error: workspacesError } = await this.supabase
      .from('workspaces')
      .select('id')
      .eq('project_id', projectId);

    if (workspacesError) {
      throw new Error(`Failed to fetch workspaces: ${workspacesError.message}`);
    }

    const workspaceIds = (workspaces || []).map(w => w.id);
    let datasetCount = 0;

    if (workspaceIds.length > 0) {
      const { count, error: datasetError } = await this.supabase
        .from('datasets')
        .select('id', { count: 'exact', head: true })
        .in('workspace_id', workspaceIds);

      if (datasetError) {
        throw new Error(`Failed to fetch dataset count: ${datasetError.message}`);
      }

      datasetCount = count || 0;
    }

    // Get user count
    const { count: userCount, error: userError } = await this.supabase
      .from('project_users')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId);

    if (userError) {
      throw new Error(`Failed to fetch user count: ${userError.message}`);
    }

    return {
      workspace_count: workspaceCount || 0,
      dataset_count: datasetCount,
      user_count: userCount || 0,
      total_size_bytes: 0 // Would need to calculate from actual data
    };
  }

  /**
   * Search projects
   */
  async searchProjects(query: string, accountId: string): Promise<Project[]> {
    const { data, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('account_id', accountId)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('name', { ascending: true })
      .limit(20);

    if (error) {
      throw new Error(`Failed to search projects: ${error.message}`);
    }

    return data || [];
  }

  // =====================================================
  // Validation Helpers
  // =====================================================

  /**
   * Validate project input
   */
  private validateProjectInput(input: CreateProjectInput): void {
    if (!input.account_id) {
      throw new Error('Account ID is required');
    }

    if (!input.project_type) {
      throw new Error('Project type is required');
    }

    this.validateProjectName(input.name);
  }

  /**
   * Validate project name
   */
  private validateProjectName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Project name is required');
    }

    if (name.length > 100) {
      throw new Error('Project name must be 100 characters or less');
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(name)) {
      throw new Error('Project name contains invalid characters');
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
   * Check if project name is available in account
   */
  async isProjectNameAvailable(name: string, accountId: string, excludeProjectId?: string): Promise<boolean> {
    let query = this.supabase
      .from('projects')
      .select('id')
      .eq('account_id', accountId)
      .eq('name', name);

    if (excludeProjectId) {
      query = query.neq('id', excludeProjectId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      throw new Error(`Failed to check project name availability: ${error.message}`);
    }

    return !data; // Available if no data found
  }
}

/**
 * Create a ProjectService instance with environment configuration
 */
export function createProjectService(): ProjectService {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration is missing');
  }

  return new ProjectService(supabaseUrl, supabaseKey);
}
