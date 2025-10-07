import { supabase } from '@/lib/supabase';
import { GitHubClient, parseGitHubRepo } from '@/lib/github-api';
import { ProjectYAML, generateSlug, generateProjectPath } from '@/lib/yaml-utils';
import { Project, ProjectData } from '@/types/database';

export class ProjectService {
  private githubClient: GitHubClient | null = null;

  constructor(githubToken?: string) {
    if (githubToken) {
      this.githubClient = new GitHubClient(githubToken);
    }
  }

  // Initialize GitHub client with token
  setGitHubToken(token: string) {
    this.githubClient = new GitHubClient(token);
  }

  // Create new project
  async createProject(
    workspaceId: string,
    companyId: string,
    userId: string,
    name: string,
    description: string | null,
    githubRepo: string,
    visibility: 'public' | 'private' = 'private',
    workspaceSlug?: string
  ): Promise<Project> {
    if (!this.githubClient) {
      throw new Error('GitHub token not configured');
    }

    const slug = generateSlug(name);
    const wsSlug = workspaceSlug || generateSlug(workspaceId);
    const githubPath = generateProjectPath(wsSlug, slug);
    const { owner, repo } = parseGitHubRepo(githubRepo);

    // Ensure repository exists
    await this.githubClient.ensureRepository(owner, repo, visibility === 'private');

    // Create project YAML structure
    const projectYAML: ProjectYAML = {
      metadata: {
        id: crypto.randomUUID(),
        name,
        description: description || undefined,
        version: '1.0.0',
        owner_id: userId,
        created_by: userId,
        visibility,
        is_locked: false,
        company_id: companyId,
        workspace_id: workspaceId,
        github_repo: githubRepo,
        github_branch: 'main',
        github_path: githubPath,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      members: [
        {
          user_id: userId,
          role: 'owner',
          added_at: new Date().toISOString(),
        },
      ],
      data_models: [],
      settings: {
        tags: [],
      },
    };

    // Save to GitHub
    const commitSha = await this.githubClient.saveProject(owner, repo, projectYAML);

    // Save metadata to Supabase
    const { data, error } = await supabase
      .from('projects')
      .insert({
        id: projectYAML.metadata.id,
        company_id: companyId,
        workspace_id: workspaceId,
        github_repo: githubRepo,
        github_branch: 'main',
        github_path: githubPath,
        github_sha: commitSha,
        name,
        slug,
        description,
        version: '1.0.0',
        visibility,
        is_locked: false,
        created_by: userId,
        owner_id: userId,
        last_synced_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save project metadata: ${error.message}`);
    }

    // Add project member
    if (visibility === 'private') {
      await supabase.from('project_members').insert({
        project_id: data.id,
        user_id: userId,
        role: 'owner',
        added_by: userId,
        added_at: new Date().toISOString(),
      });
    }

    return data;
  }

  // Load project from GitHub
  async loadProject(projectId: string): Promise<ProjectData> {
    if (!this.githubClient) {
      throw new Error('GitHub token not configured');
    }

    // Get project metadata from Supabase
    const { data: project, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (error || !project) {
      throw new Error('Project not found');
    }

    const { owner, repo } = parseGitHubRepo(project.github_repo);

    // Load full project data from GitHub
    const { project: projectYAML, sha } = await this.githubClient.loadProject(
      owner,
      repo,
      project.github_path,
      project.github_branch
    );

    // Update SHA if changed
    if (sha !== project.github_sha) {
      await supabase
        .from('projects')
        .update({
          github_sha: sha,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', projectId);
    }

    return projectYAML as ProjectData;
  }

  // Update project
  async updateProject(
    projectId: string,
    updates: Partial<ProjectYAML['metadata']>
  ): Promise<void> {
    if (!this.githubClient) {
      throw new Error('GitHub token not configured');
    }

    // Get current project data
    const projectData = await this.loadProject(projectId);

    // Merge updates
    const updatedYAML: ProjectYAML = {
      ...projectData,
      metadata: {
        ...projectData.metadata,
        ...updates,
        updated_at: new Date().toISOString(),
      },
    };

    const { owner, repo } = parseGitHubRepo(updatedYAML.metadata.github_repo);

    // Get current project from DB for SHA
    const { data: project } = await supabase
      .from('projects')
      .select('github_sha')
      .eq('id', projectId)
      .single();

    // Save to GitHub
    const commitSha = await this.githubClient.saveProject(
      owner,
      repo,
      updatedYAML,
      project?.github_sha || undefined
    );

    // Update Supabase metadata
    await supabase
      .from('projects')
      .update({
        name: updates.name,
        description: updates.description,
        visibility: updates.visibility,
        is_locked: updates.is_locked,
        locked_by: updates.locked_by,
        locked_at: updates.locked_at,
        github_sha: commitSha,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', projectId);
  }

  // Lock project
  async lockProject(projectId: string, userId: string): Promise<void> {
    await this.updateProject(projectId, {
      is_locked: true,
      locked_by: userId,
      locked_at: new Date().toISOString(),
    });
  }

  // Unlock project
  async unlockProject(projectId: string): Promise<void> {
    await this.updateProject(projectId, {
      is_locked: false,
      locked_by: undefined,
      locked_at: undefined,
    });
  }

  // Toggle visibility
  async setVisibility(
    projectId: string,
    visibility: 'public' | 'private'
  ): Promise<void> {
    await this.updateProject(projectId, { visibility });
  }

  // Add member to private project
  async addMember(
    projectId: string,
    userId: string,
    role: 'editor' | 'viewer',
    addedBy: string
  ): Promise<void> {
    const { error } = await supabase.from('project_members').insert({
      project_id: projectId,
      user_id: userId,
      role,
      added_by: addedBy,
      added_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Failed to add member: ${error.message}`);
    }

    // Also update GitHub YAML
    const projectData = await this.loadProject(projectId);
    const members = projectData.members || [];
    members.push({
      user_id: userId,
      role,
      added_at: new Date().toISOString(),
    });

    await this.updateProject(projectId, {});
  }

  // Remove member from private project
  async removeMember(projectId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to remove member: ${error.message}`);
    }
  }

  // Check if user can edit project
  async canEdit(projectId: string, userId: string): Promise<boolean> {
    const { data: project } = await supabase
      .from('projects')
      .select('is_locked, owner_id, visibility')
      .eq('id', projectId)
      .single();

    if (!project) return false;

    // Locked projects cannot be edited
    if (project.is_locked) return false;

    // Owner can always edit
    if (project.owner_id === userId) return true;

    // Public projects can be edited by contributors
    if (project.visibility === 'public') {
      const { data: member } = await supabase
        .from('company_members')
        .select('role')
        .eq('user_id', userId)
        .single();

      return member?.role === 'contributor' || member?.role === 'admin' || member?.role === 'owner';
    }

    // Private projects require membership
    const { data: member } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();

    return member?.role === 'editor' || member?.role === 'owner';
  }
}
