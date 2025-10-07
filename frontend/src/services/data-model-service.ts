import { supabase } from '@/lib/supabase';
import { GitHubClient, parseGitHubRepo } from '@/lib/github-api';
import { DataModelYAML, generateSlug, generateDataModelPath } from '@/lib/yaml-utils';
import { DataModel, DataModelData } from '@/types/database';

export class DataModelService {
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

  // Create new data model
  async createDataModel(
    projectId: string,
    companyId: string,
    workspaceId: string,
    userId: string,
    name: string,
    description: string | null,
    modelType: 'dimensional' | 'data_vault' | 'normalized' | 'custom',
    githubRepo: string,
    visibility: 'public' | 'private' = 'private',
    projectSlug?: string
  ): Promise<DataModel> {
    if (!this.githubClient) {
      throw new Error('GitHub token not configured');
    }

    const slug = generateSlug(name);
    const projSlug = projectSlug || generateSlug(projectId);
    const githubPath = generateDataModelPath(projSlug, slug);
    const { owner, repo } = parseGitHubRepo(githubRepo);

    // Create data model YAML structure
    const modelYAML: DataModelYAML = {
      metadata: {
        id: crypto.randomUUID(),
        name,
        description: description || undefined,
        model_type: modelType,
        version: '1.0.0',
        owner_id: userId,
        created_by: userId,
        visibility,
        is_locked: false,
        project_id: projectId,
        company_id: companyId,
        workspace_id: workspaceId,
        github_repo: githubRepo,
        github_branch: 'main',
        github_path: githubPath,
        is_archived: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      visual_model: {
        nodes: [],
        edges: [],
      },
      members: [
        {
          user_id: userId,
          role: 'owner',
        },
      ],
      tags: [],
    };

    // Save to GitHub
    const commitSha = await this.githubClient.saveDataModel(owner, repo, modelYAML);

    // Save metadata to Supabase
    const { data, error } = await supabase
      .from('data_models')
      .insert({
        id: modelYAML.metadata.id,
        project_id: projectId,
        company_id: companyId,
        workspace_id: workspaceId,
        github_repo: githubRepo,
        github_branch: 'main',
        github_path: githubPath,
        github_sha: commitSha,
        name,
        slug,
        description,
        model_type: modelType,
        version: '1.0.0',
        visibility,
        is_locked: false,
        created_by: userId,
        owner_id: userId,
        is_archived: false,
        last_synced_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save data model metadata: ${error.message}`);
    }

    // Add model member for private models
    if (visibility === 'private') {
      await supabase.from('data_model_members').insert({
        data_model_id: data.id,
        user_id: userId,
        role: 'owner',
        added_by: userId,
        added_at: new Date().toISOString(),
      });
    }

    return data;
  }

  // Load data model from GitHub
  async loadDataModel(modelId: string): Promise<DataModelData> {
    if (!this.githubClient) {
      throw new Error('GitHub token not configured');
    }

    // Get model metadata from Supabase
    const { data: model, error } = await supabase
      .from('data_models')
      .select('*')
      .eq('id', modelId)
      .single();

    if (error || !model) {
      throw new Error('Data model not found');
    }

    const { owner, repo } = parseGitHubRepo(model.github_repo);

    // Load full model data from GitHub
    const { model: modelYAML, sha } = await this.githubClient.loadDataModel(
      owner,
      repo,
      model.github_path,
      model.github_branch
    );

    // Update SHA if changed
    if (sha !== model.github_sha) {
      await supabase
        .from('data_models')
        .update({
          github_sha: sha,
          last_synced_at: new Date().toISOString(),
        })
        .eq('id', modelId);
    }

    return modelYAML as DataModelData;
  }

  // Update data model
  async updateDataModel(
    modelId: string,
    updates: {
      metadata?: Partial<DataModelYAML['metadata']>;
      visual_model?: DataModelYAML['visual_model'];
      schema?: DataModelYAML['schema'];
      data_quality?: DataModelYAML['data_quality'];
      tags?: string[];
      lineage?: DataModelYAML['lineage'];
    }
  ): Promise<void> {
    if (!this.githubClient) {
      throw new Error('GitHub token not configured');
    }

    // Get current model data
    const modelData = await this.loadDataModel(modelId);

    // Merge updates
    const updatedYAML: DataModelYAML = {
      ...modelData,
      metadata: {
        ...modelData.metadata,
        ...(updates.metadata || {}),
        updated_at: new Date().toISOString(),
      },
      visual_model: updates.visual_model || modelData.visual_model,
      schema: updates.schema || modelData.schema,
      data_quality: updates.data_quality || modelData.data_quality,
      tags: updates.tags || modelData.tags,
      lineage: updates.lineage || modelData.lineage,
    };

    const { owner, repo } = parseGitHubRepo(updatedYAML.metadata.github_repo);

    // Get current model from DB for SHA
    const { data: model } = await supabase
      .from('data_models')
      .select('github_sha')
      .eq('id', modelId)
      .single();

    // Save to GitHub
    const commitSha = await this.githubClient.saveDataModel(
      owner,
      repo,
      updatedYAML,
      model?.github_sha || undefined
    );

    // Update Supabase metadata
    await supabase
      .from('data_models')
      .update({
        name: updates.metadata?.name,
        description: updates.metadata?.description,
        model_type: updates.metadata?.model_type,
        visibility: updates.metadata?.visibility,
        is_locked: updates.metadata?.is_locked,
        locked_by: updates.metadata?.locked_by,
        locked_at: updates.metadata?.locked_at,
        is_archived: updates.metadata?.is_archived,
        github_sha: commitSha,
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', modelId);
  }

  // Lock data model
  async lockDataModel(modelId: string, userId: string): Promise<void> {
    await this.updateDataModel(modelId, {
      metadata: {
        is_locked: true,
        locked_by: userId,
        locked_at: new Date().toISOString(),
      },
    });
  }

  // Unlock data model
  async unlockDataModel(modelId: string): Promise<void> {
    await this.updateDataModel(modelId, {
      metadata: {
        is_locked: false,
        locked_by: undefined,
        locked_at: undefined,
      },
    });
  }

  // Toggle visibility
  async setVisibility(
    modelId: string,
    visibility: 'public' | 'private'
  ): Promise<void> {
    await this.updateDataModel(modelId, {
      metadata: { visibility },
    });
  }

  // Archive data model
  async archiveDataModel(modelId: string): Promise<void> {
    await this.updateDataModel(modelId, {
      metadata: { is_archived: true },
    });
  }

  // Unarchive data model
  async unarchiveDataModel(modelId: string): Promise<void> {
    await this.updateDataModel(modelId, {
      metadata: { is_archived: false },
    });
  }

  // Add member to private data model
  async addMember(
    modelId: string,
    userId: string,
    role: 'editor' | 'viewer',
    addedBy: string
  ): Promise<void> {
    const { error } = await supabase.from('data_model_members').insert({
      data_model_id: modelId,
      user_id: userId,
      role,
      added_by: addedBy,
      added_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Failed to add member: ${error.message}`);
    }
  }

  // Remove member from private data model
  async removeMember(modelId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('data_model_members')
      .delete()
      .eq('data_model_id', modelId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to remove member: ${error.message}`);
    }
  }

  // Check if user can edit data model
  async canEdit(modelId: string, userId: string): Promise<boolean> {
    const { data: model } = await supabase
      .from('data_models')
      .select('is_locked, owner_id, visibility, is_archived')
      .eq('id', modelId)
      .single();

    if (!model) return false;

    // Locked or archived models cannot be edited
    if (model.is_locked || model.is_archived) return false;

    // Owner can always edit
    if (model.owner_id === userId) return true;

    // Public models can be edited by contributors
    if (model.visibility === 'public') {
      const { data: member } = await supabase
        .from('company_members')
        .select('role')
        .eq('user_id', userId)
        .single();

      return member?.role === 'contributor' || member?.role === 'admin' || member?.role === 'owner';
    }

    // Private models require membership
    const { data: member } = await supabase
      .from('data_model_members')
      .select('role')
      .eq('data_model_id', modelId)
      .eq('user_id', userId)
      .single();

    return member?.role === 'editor' || member?.role === 'owner';
  }
}
