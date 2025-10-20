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
  ProjectStats,
  ProjectSourceControlConfig
} from '@/types/project';
import {
  PaginatedResponse,
  PaginationParams,
  createPaginatedResponse,
  validatePaginationParams,
  calculateOffset
} from '@/types/api';
import { SourceControlProvider } from '@/types/source-control';

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
      `, { count: 'exact' })
      .is('deleted_at', null);

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
      .is('deleted_at', null)
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
      project_type: input.project_type || null, // Now optional/nullable
      visibility: input.visibility || 'public',
      owner_id: userId,
      configuration: input.configuration || {}
    };

    const { data: project, error } = await this.supabase
      .from('projects')
      .insert(projectData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create project: ${error.message}`);
    }

    // If source control configuration is provided, connect it
    if (input.source_control) {
      try {
        await this.connectSourceControl(project.id, {
          provider: input.source_control.provider,
          repo_url: input.source_control.repo_url,
          access_token: input.source_control.access_token,
          refresh_token: input.source_control.refresh_token,
          default_branch: input.source_control.default_branch,
          username: input.source_control.username
        });

        // Re-fetch project to get updated source control fields
        return await this.getProject(project.id);
      } catch (scError) {
        // If source control connection fails, we still return the project
        // but log the error for debugging
        console.error('Failed to connect source control during project creation:', scError);
        return project;
      }
    }

    return project;
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
   * Delete a project (soft delete)
   */
  async deleteProject(projectId: string, userId: string): Promise<void> {
    // Check if project has active workspaces
    const { count, error: countError } = await this.supabase
      .from('workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .is('deleted_at', null);

    if (countError) {
      throw new Error(`Failed to check project dependencies: ${countError.message}`);
    }

    if (count && count > 0) {
      throw new Error(
        `Cannot delete project: it has ${count} active workspace(s). Please delete all workspaces first.`
      );
    }

    // Use soft delete function (cascades to workspaces)
    const { data, error } = await this.supabase.rpc('soft_delete_project', {
      p_project_id: projectId,
      p_deleted_by: userId
    });

    if (error) {
      throw new Error(`Failed to soft delete project: ${error.message}`);
    }

    if (!data?.success) {
      throw new Error(data?.message || 'Project not found or already deleted');
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
    // Get active workspace count
    const { count: workspaceCount, error: workspaceError } = await this.supabase
      .from('workspaces')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .is('deleted_at', null);

    if (workspaceError) {
      throw new Error(`Failed to fetch workspace count: ${workspaceError.message}`);
    }

    // Get dataset count across all active workspaces
    const { data: workspaces, error: workspacesError } = await this.supabase
      .from('workspaces')
      .select('id')
      .eq('project_id', projectId)
      .is('deleted_at', null);

    if (workspacesError) {
      throw new Error(`Failed to fetch workspaces: ${workspacesError.message}`);
    }

    const workspaceIds = (workspaces || []).map(w => w.id);
    let datasetCount = 0;

    if (workspaceIds.length > 0) {
      const { count, error: datasetError } = await this.supabase
        .from('datasets')
        .select('id', { count: 'exact', head: true })
        .in('workspace_id', workspaceIds)
        .is('deleted_at', null);

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
      .is('deleted_at', null)
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
      .order('name', { ascending: true })
      .limit(20);

    if (error) {
      throw new Error(`Failed to search projects: ${error.message}`);
    }

    return data || [];
  }

  // =====================================================
  // Source Control Management
  // =====================================================

  /**
   * Connect project to source control repository
   */
  async connectSourceControl(
    projectId: string,
    config: {
      provider: string;
      repo_url: string;
      access_token: string;
      refresh_token?: string;
      default_branch?: string;
      username?: string;
    }
  ): Promise<Project> {
    // First, store encrypted credentials
    await this.storeSourceControlCredentials(projectId, {
      provider: config.provider as SourceControlProvider,
      access_token: config.access_token,
      refresh_token: config.refresh_token,
      username: config.username
    });

    // Call database function to connect source control
    const { data, error } = await this.supabase
      .rpc('connect_project_source_control', {
        p_project_id: projectId,
        p_provider: config.provider,
        p_repo_url: config.repo_url,
        p_default_branch: config.default_branch || 'main'
      });

    if (error) {
      throw new Error(`Failed to connect source control: ${error.message}`);
    }

    if (!data || data.length === 0 || !data[0].success) {
      throw new Error(data?.[0]?.message || 'Failed to connect source control');
    }

    // Fetch and return updated project
    return await this.getProject(projectId);
  }

  /**
   * Disconnect project from source control
   */
  async disconnectSourceControl(projectId: string): Promise<void> {
    const { data, error } = await this.supabase
      .rpc('disconnect_project_source_control', {
        p_project_id: projectId
      });

    if (error) {
      throw new Error(`Failed to disconnect source control: ${error.message}`);
    }

    if (!data || data.length === 0 || !data[0].success) {
      throw new Error(data?.[0]?.message || 'Failed to disconnect source control');
    }
  }

  /**
   * Test project source control connection
   */
  async testSourceControl(projectId: string): Promise<{ connected: boolean; message: string }> {
    try {
      // Get source control status
      const status = await this.getSourceControlStatus(projectId);

      if (!status.provider || !status.repo_url) {
        return {
          connected: false,
          message: 'Source control not configured'
        };
      }

      if (!status.has_credentials) {
        return {
          connected: false,
          message: 'Source control credentials not found'
        };
      }

      // Try to fetch branches to test the connection
      // This will use the stored credentials and test the actual connection
      try {
        const branches = await this.getProjectBranches(projectId);

        if (branches && branches.length > 0) {
          return {
            connected: true,
            message: `Successfully connected to ${status.provider} repository`
          };
        } else {
          return {
            connected: false,
            message: 'Could not fetch branches from repository'
          };
        }
      } catch (branchError) {
        return {
          connected: false,
          message: `Connection test failed: ${branchError instanceof Error ? branchError.message : 'Unknown error'}`
        };
      }
    } catch (error) {
      return {
        connected: false,
        message: `Failed to test connection: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Get project source control status
   */
  async getSourceControlStatus(projectId: string): Promise<{
    provider: string | null;
    repo_url: string | null;
    connection_status: string | null;
    default_branch: string | null;
    last_synced_at: string | null;
    has_credentials: boolean;
    workspace_count: number;
  }> {
    const { data, error } = await this.supabase
      .rpc('get_project_source_control_status', {
        p_project_id: projectId
      });

    if (error) {
      throw new Error(`Failed to get source control status: ${error.message}`);
    }

    if (!data || data.length === 0) {
      throw new Error('Project not found');
    }

    return data[0];
  }

  /**
   * Get available branches from project repository
   */
  async getProjectBranches(projectId: string): Promise<string[]> {
    // Get project details including source control info
    const project = await this.getProject(projectId);

    if (!project.source_control_provider || !project.source_control_repo_url) {
      throw new Error('Project source control not configured');
    }

    // Get credentials
    const credentials = await this.getSourceControlCredentials(projectId);

    if (!credentials) {
      throw new Error('Source control credentials not found');
    }

    // Fetch branches from provider API
    return await this.fetchBranchesFromProvider(
      project.source_control_provider,
      project.source_control_repo_url,
      credentials.access_token_encrypted // Note: In production, this should be decrypted
    );
  }

  /**
   * Fetch branches from source control provider API
   *
   * Note: This is a simplified implementation. In production:
   * - Tokens should be properly decrypted before use
   * - Should use provider-specific SDKs/APIs
   * - Should handle pagination for repositories with many branches
   * - Should implement proper error handling and retry logic
   */
  private async fetchBranchesFromProvider(
    provider: string,
    repoUrl: string,
    accessToken: string
  ): Promise<string[]> {
    try {
      switch (provider) {
        case 'github':
          return await this.fetchGitHubBranches(repoUrl, accessToken);
        case 'gitlab':
          return await this.fetchGitLabBranches(repoUrl, accessToken);
        case 'bitbucket':
          return await this.fetchBitbucketBranches(repoUrl, accessToken);
        case 'azure':
          return await this.fetchAzureBranches(repoUrl, accessToken);
        default:
          throw new Error(`Unsupported source control provider: ${provider}`);
      }
    } catch (error) {
      throw new Error(
        `Failed to fetch branches from ${provider}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Fetch branches from GitHub
   */
  private async fetchGitHubBranches(repoUrl: string, accessToken: string): Promise<string[]> {
    // Extract owner and repo from URL
    // Example: https://github.com/owner/repo -> owner/repo
    const match = repoUrl.match(/github\.com[/:]([\w-]+)\/([\w-]+)/);
    if (!match) {
      throw new Error('Invalid GitHub repository URL');
    }

    const [, owner, repo] = match;
    const cleanRepo = repo.replace(/\.git$/, '');

    const response = await fetch(
      `https://api.github.com/repos/${owner}/${cleanRepo}/branches`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.statusText}`);
    }

    const branches = await response.json();
    return branches.map((branch: any) => branch.name);
  }

  /**
   * Fetch branches from GitLab
   */
  private async fetchGitLabBranches(repoUrl: string, accessToken: string): Promise<string[]> {
    // Extract project path from URL
    // Example: https://gitlab.com/group/project -> group/project
    const match = repoUrl.match(/gitlab\.com[/:]([\w-]+\/[\w-]+)/);
    if (!match) {
      throw new Error('Invalid GitLab repository URL');
    }

    const projectPath = encodeURIComponent(match[1].replace(/\.git$/, ''));

    const response = await fetch(
      `https://gitlab.com/api/v4/projects/${projectPath}/repository/branches`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`GitLab API error: ${response.statusText}`);
    }

    const branches = await response.json();
    return branches.map((branch: any) => branch.name);
  }

  /**
   * Fetch branches from Bitbucket
   */
  private async fetchBitbucketBranches(repoUrl: string, accessToken: string): Promise<string[]> {
    // Extract workspace and repo from URL
    // Example: https://bitbucket.org/workspace/repo -> workspace/repo
    const match = repoUrl.match(/bitbucket\.org[/:]([\w-]+)\/([\w-]+)/);
    if (!match) {
      throw new Error('Invalid Bitbucket repository URL');
    }

    const [, workspace, repoSlug] = match;

    const response = await fetch(
      `https://api.bitbucket.org/2.0/repositories/${workspace}/${repoSlug}/refs/branches`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Bitbucket API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.values.map((branch: any) => branch.name);
  }

  /**
   * Fetch branches from Azure DevOps
   */
  private async fetchAzureBranches(repoUrl: string, accessToken: string): Promise<string[]> {
    // Azure DevOps URL parsing is more complex
    // Example: https://dev.azure.com/organization/project/_git/repo
    const match = repoUrl.match(/dev\.azure\.com\/([\w-]+)\/([\w-]+)\/_git\/([\w-]+)/);
    if (!match) {
      throw new Error('Invalid Azure DevOps repository URL');
    }

    const [, organization, project, repo] = match;

    const response = await fetch(
      `https://dev.azure.com/${organization}/${project}/_apis/git/repositories/${repo}/refs?filter=heads/&api-version=6.0`,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`:${accessToken}`).toString('base64')}`
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Azure DevOps API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.value.map((ref: any) => ref.name.replace('refs/heads/', ''));
  }

  /**
   * Store source control credentials (encrypted)
   *
   * Note: In production, implement proper encryption using a KMS or vault service
   * Credentials are now stored directly in the projects table.
   */
  private async storeSourceControlCredentials(
    projectId: string,
    credentials: {
      provider: SourceControlProvider;
      access_token: string;
      refresh_token?: string;
      username?: string;
    }
  ): Promise<void> {
    // TODO: Implement proper encryption
    // For now, storing as-is (THIS IS NOT SECURE - implement encryption in production)
    const { error } = await this.supabase
      .from('projects')
      .update({
        source_control_access_token_encrypted: credentials.access_token, // Should be encrypted
        source_control_refresh_token_encrypted: credentials.refresh_token || null, // Should be encrypted
        source_control_username: credentials.username || null
      })
      .eq('id', projectId);

    if (error) {
      throw new Error(`Failed to store credentials: ${error.message}`);
    }
  }

  /**
   * Get source control credentials for a project
   *
   * Note: In production, decrypt credentials before returning
   * Credentials are now stored directly in the projects table.
   */
  private async getSourceControlCredentials(
    projectId: string
  ): Promise<{
    provider: string;
    access_token_encrypted: string;
    refresh_token_encrypted: string | null;
    username: string | null;
  } | null> {
    const { data, error } = await this.supabase
      .from('projects')
      .select('source_control_provider, source_control_access_token_encrypted, source_control_refresh_token_encrypted, source_control_username')
      .eq('id', projectId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return null;
      }
      throw new Error(`Failed to get credentials: ${error.message}`);
    }

    // Return null if no credentials are set
    if (!data.source_control_access_token_encrypted) {
      return null;
    }

    return {
      provider: data.source_control_provider,
      access_token_encrypted: data.source_control_access_token_encrypted,
      refresh_token_encrypted: data.source_control_refresh_token_encrypted,
      username: data.source_control_username
    };
  }

  // =====================================================
  // Soft Delete Management
  // =====================================================

  /**
   * Restore a soft deleted project
   */
  async restoreProject(projectId: string, userId: string): Promise<void> {
    const { data, error } = await this.supabase.rpc('restore_deleted', {
      p_table_name: 'projects',
      p_record_id: projectId
    });

    if (error) {
      throw new Error(`Failed to restore project: ${error.message}`);
    }

    if (!data) {
      throw new Error('Project not found or not deleted');
    }
  }

  /**
   * Get soft deleted projects for an account
   */
  async getDeletedProjects(accountId: string): Promise<Project[]> {
    const { data, error } = await this.supabase
      .from('projects')
      .select('*')
      .eq('account_id', accountId)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch deleted projects: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Permanently delete a project (only if already soft deleted)
   */
  async permanentlyDeleteProject(projectId: string, userId: string): Promise<void> {
    const { data, error } = await this.supabase.rpc('permanent_delete', {
      p_table_name: 'projects',
      p_record_id: projectId
    });

    if (error) {
      throw new Error(`Failed to permanently delete project: ${error.message}`);
    }

    if (!data) {
      throw new Error('Project not found or not soft deleted');
    }
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

    // project_type is now optional/deprecated

    this.validateProjectName(input.name);

    // Validate source control config if provided
    if (input.source_control) {
      this.validateSourceControlConfig(input.source_control);
    }
  }

  /**
   * Validate source control configuration
   */
  private validateSourceControlConfig(config: ProjectSourceControlConfig): void {
    if (!config.provider) {
      throw new Error('Source control provider is required');
    }

    if (!config.repo_url || config.repo_url.trim().length === 0) {
      throw new Error('Repository URL is required');
    }

    if (!config.access_token || config.access_token.trim().length === 0) {
      throw new Error('Access token is required');
    }

    // Validate repo URL format
    try {
      new URL(config.repo_url);
    } catch {
      throw new Error('Invalid repository URL format');
    }
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
