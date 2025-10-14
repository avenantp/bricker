/**
 * Source Control Service
 *
 * Service layer for managing source control integration including
 * connection, synchronization, commits, and conflict resolution.
 */

import { createClient } from '@supabase/supabase-js';
import {
  SourceControlProvider as SourceControlProviderEnum,
  SourceControlCredentials,
  SourceControlConnectionConfig,
  SourceControlConnectionStatus,
  ConnectionTestResult,
  Repository,
  Branch,
  Commit,
  CommitResult,
  SyncResult,
  Conflict,
  ConflictResolutionStrategy,
  FileChange
} from '@/types/source-control';
import {
  SourceControlProvider,
  SourceControlProviderFactory,
  detectProviderFromUrl
} from '../source-control';
import { WorkspaceService } from './workspace-service';

/**
 * Commit parameters
 */
export interface CommitParams {
  workspace_id: string;
  message: string;
  dataset_ids: string[];
}

/**
 * Sync parameters
 */
export interface SyncParams {
  workspace_id: string;
  conflict_resolution_strategy?: ConflictResolutionStrategy;
}

/**
 * Source Control Service Class
 */
export class SourceControlService {
  private supabase: ReturnType<typeof createClient>;
  private workspaceService: WorkspaceService;
  private providerCache: Map<string, SourceControlProvider> = new Map();

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    this.workspaceService = new WorkspaceService(supabaseUrl, supabaseKey);
  }

  // =====================================================
  // Connection Management
  // =====================================================

  /**
   * Connect workspace to source control
   */
  async connect(config: SourceControlConnectionConfig, workspaceId: string): Promise<ConnectionTestResult> {
    try {
      // Get or create provider
      const provider = SourceControlProviderFactory.createProvider(
        config.provider,
        config.provider === SourceControlProviderEnum.Azure ? { organization: this.parseOrgFromUrl(config.repo_url) } : {}
      );

      // Authenticate
      await provider.authenticate(config.credentials);

      // Test connection
      const testResult = await provider.testConnection();
      if (!testResult.success) {
        return testResult;
      }

      // Verify repository access
      const repository = await provider.getRepository(config.repo_url);

      // Verify branch exists or create if needed
      let branch: Branch;
      try {
        branch = await provider.getBranch(config.repo_url, config.branch);
      } catch (error) {
        if (config.create_if_not_exists) {
          // Create branch if it doesn't exist
          branch = await provider.createBranch(config.repo_url, config.branch);
        } else {
          throw error;
        }
      }

      // Get latest commit SHA
      const latestCommit = await provider.getLatestCommit(config.repo_url, config.branch);

      // Store credentials securely (encrypted)
      await this.storeCredentials(workspaceId, config.credentials);

      // Update workspace with connection info
      await this.workspaceService.updateWorkspace(workspaceId, {
        source_control_provider: config.provider,
        source_control_repo_url: config.repo_url,
        source_control_branch: config.branch,
        source_control_commit_sha: latestCommit.sha,
        source_control_connection_status: 'connected' as SourceControlConnectionStatus
      });

      await this.workspaceService.markAsSynced(workspaceId, latestCommit.sha);

      // Cache the provider
      this.providerCache.set(workspaceId, provider);

      return {
        success: true,
        message: `Connected to ${repository.name} (${config.branch})`,
        user: testResult.user
      };
    } catch (error: any) {
      // Update workspace status to error
      await this.workspaceService.updateSourceControlStatus(workspaceId, 'error');

      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Disconnect workspace from source control
   */
  async disconnect(workspaceId: string): Promise<void> {
    // Remove credentials
    await this.removeCredentials(workspaceId);

    // Update workspace
    await this.workspaceService.updateWorkspace(workspaceId, {
      source_control_provider: null,
      source_control_repo_url: null,
      source_control_branch: null,
      source_control_commit_sha: null,
      source_control_connection_status: 'not_connected' as SourceControlConnectionStatus
    });

    // Remove from cache
    this.providerCache.delete(workspaceId);
  }

  /**
   * Test source control connection
   */
  async testConnection(workspaceId: string): Promise<ConnectionTestResult> {
    try {
      const provider = await this.getProvider(workspaceId);
      return await provider.testConnection();
    } catch (error: any) {
      return {
        success: false,
        message: `Connection test failed: ${error.message}`,
        error: error.message
      };
    }
  }

  /**
   * Get connection status
   */
  async getConnectionStatus(workspaceId: string): Promise<SourceControlConnectionStatus> {
    const workspace = await this.workspaceService.getWorkspace(workspaceId);
    return workspace.source_control_connection_status || 'not_connected';
  }

  // =====================================================
  // Repository Operations
  // =====================================================

  /**
   * List repositories
   */
  async listRepositories(
    providerType: SourceControlProviderEnum,
    credentials: SourceControlCredentials,
    options?: { organization?: string; limit?: number }
  ): Promise<Repository[]> {
    const provider = SourceControlProviderFactory.createProvider(
      providerType,
      providerType === SourceControlProviderEnum.Azure ? { organization: options?.organization } : {}
    );

    await provider.authenticate(credentials);

    return await provider.listRepositories(options);
  }

  /**
   * Create repository
   */
  async createRepository(
    providerType: SourceControlProviderEnum,
    credentials: SourceControlCredentials,
    name: string,
    isPrivate: boolean,
    options?: { description?: string; organization?: string }
  ): Promise<Repository> {
    const provider = SourceControlProviderFactory.createProvider(
      providerType,
      providerType === SourceControlProviderEnum.Azure ? { organization: options?.organization } : {}
    );

    await provider.authenticate(credentials);

    return await provider.createRepository(name, isPrivate, options);
  }

  /**
   * Initialize repository structure with workspace folders
   */
  async initializeRepositoryStructure(workspaceId: string): Promise<void> {
    const provider = await this.getProvider(workspaceId);
    const workspace = await this.workspaceService.getWorkspace(workspaceId);

    // Create initial folder structure
    const operations = [
      {
        operation: 'create' as const,
        path: 'datasets/README.md',
        content: '# Datasets\n\nThis folder contains dataset definitions.'
      },
      {
        operation: 'create' as const,
        path: 'models/README.md',
        content: '# Models\n\nThis folder contains data models.'
      },
      {
        operation: 'create' as const,
        path: 'README.md',
        content: `# ${workspace.name}\n\n${workspace.description || 'Workspace repository'}`
      }
    ];

    await provider.batchCommit(
      workspace.source_control_repo_url!,
      workspace.source_control_branch!,
      operations,
      'Initialize repository structure'
    );
  }

  // =====================================================
  // Branch Operations
  // =====================================================

  /**
   * List branches
   */
  async listBranches(workspaceId: string): Promise<Branch[]> {
    const provider = await this.getProvider(workspaceId);
    const workspace = await this.workspaceService.getWorkspace(workspaceId);

    return await provider.listBranches(workspace.source_control_repo_url!);
  }

  /**
   * Create branch
   */
  async createBranch(workspaceId: string, branchName: string, fromBranch?: string): Promise<Branch> {
    const provider = await this.getProvider(workspaceId);
    const workspace = await this.workspaceService.getWorkspace(workspaceId);

    return await provider.createBranch(
      workspace.source_control_repo_url!,
      branchName,
      fromBranch
    );
  }

  // =====================================================
  // Commit Operations
  // =====================================================

  /**
   * Commit changes to source control
   */
  async commit(params: CommitParams): Promise<CommitResult> {
    try {
      const provider = await this.getProvider(params.workspace_id);
      const workspace = await this.workspaceService.getWorkspace(params.workspace_id);

      // Get datasets to commit
      const { data: datasets, error } = await this.supabase
        .from('datasets')
        .select('*')
        .in('id', params.dataset_ids);

      if (error || !datasets || datasets.length === 0) {
        throw new Error('No datasets found to commit');
      }

      // Convert datasets to file operations
      const operations = datasets.map(dataset => ({
        operation: 'update' as const,
        path: `datasets/${dataset.name}.json`,
        content: JSON.stringify(dataset, null, 2)
      }));

      // Commit to source control
      const commit = await provider.batchCommit(
        workspace.source_control_repo_url!,
        workspace.source_control_branch!,
        operations,
        params.message
      );

      // Record commit in database
      await this.recordCommit(params.workspace_id, commit);

      // Update workspace status
      await this.workspaceService.markAsSynced(params.workspace_id, commit.sha);

      return {
        success: true,
        commit_sha: commit.sha,
        files_committed: operations.length,
        commit_url: commit.url
      };
    } catch (error: any) {
      return {
        success: false,
        files_committed: 0,
        error: error.message
      };
    }
  }

  /**
   * Sync (pull) changes from source control
   */
  async sync(params: SyncParams): Promise<SyncResult> {
    try {
      const provider = await this.getProvider(params.workspace_id);
      const workspace = await this.workspaceService.getWorkspace(params.workspace_id);

      // Get latest commit from remote
      const latestCommit = await provider.getLatestCommit(
        workspace.source_control_repo_url!,
        workspace.source_control_branch!
      );

      // Check if already up to date
      if (latestCommit.sha === workspace.source_control_commit_sha) {
        return {
          status: 'up_to_date',
          datasets_updated: 0,
          datasets_added: 0,
          datasets_deleted: 0,
          conflicts: []
        };
      }

      // Get changed files
      const changedFiles = await provider.getChangedFiles(
        workspace.source_control_repo_url!,
        workspace.source_control_branch!,
        workspace.source_control_commit_sha!,
        latestCommit.sha
      );

      // Detect conflicts
      const conflicts = await this.detectConflicts(params.workspace_id, changedFiles);

      if (conflicts.length > 0 && params.conflict_resolution_strategy === 'manual') {
        // Update status to conflict
        await this.workspaceService.updateSourceControlStatus(params.workspace_id, 'conflict');

        return {
          status: 'conflicts',
          datasets_updated: 0,
          datasets_added: 0,
          datasets_deleted: 0,
          conflicts
        };
      }

      // Apply changes
      let datasetsUpdated = 0;
      let datasetsAdded = 0;
      let datasetsDeleted = 0;

      for (const file of changedFiles) {
        if (!file.path.startsWith('datasets/')) continue;

        if (file.status === 'added' || file.status === 'modified') {
          const fileContent = await provider.getFile(
            workspace.source_control_repo_url!,
            workspace.source_control_branch!,
            file.path
          );

          const dataset = JSON.parse(fileContent.content);

          // Upsert dataset
          const { error } = await this.supabase
            .from('datasets')
            .upsert({
              ...dataset,
              workspace_id: params.workspace_id
            });

          if (!error) {
            if (file.status === 'added') datasetsAdded++;
            else datasetsUpdated++;
          }
        } else if (file.status === 'removed') {
          const datasetName = file.path.replace('datasets/', '').replace('.json', '');

          const { error } = await this.supabase
            .from('datasets')
            .delete()
            .eq('workspace_id', params.workspace_id)
            .eq('name', datasetName);

          if (!error) datasetsDeleted++;
        }
      }

      // Update workspace
      await this.workspaceService.markAsSynced(params.workspace_id, latestCommit.sha);

      return {
        status: 'synced',
        datasets_updated: datasetsUpdated,
        datasets_added: datasetsAdded,
        datasets_deleted: datasetsDeleted,
        conflicts: [],
        commit_sha: latestCommit.sha
      };
    } catch (error: any) {
      throw new Error(`Sync failed: ${error.message}`);
    }
  }

  /**
   * Get uncommitted changes
   */
  async getUncommittedChanges(workspaceId: string): Promise<FileChange[]> {
    // This would need to compare local datasets with last committed versions
    // Simplified implementation - would need proper change tracking
    const workspace = await this.workspaceService.getWorkspace(workspaceId);

    if (!workspace.is_synced) {
      // Get datasets that have been modified since last sync
      const { data: datasets } = await this.supabase
        .from('datasets')
        .select('*')
        .eq('workspace_id', workspaceId)
        .gt('updated_at', workspace.last_synced_at || '1970-01-01');

      return (datasets || []).map(dataset => ({
        path: `datasets/${dataset.name}.json`,
        status: 'modified' as const,
        additions: 0,
        deletions: 0,
        changes: 1
      }));
    }

    return [];
  }

  /**
   * Get commit history
   */
  async getCommitHistory(workspaceId: string, limit: number = 20): Promise<Commit[]> {
    const provider = await this.getProvider(workspaceId);
    const workspace = await this.workspaceService.getWorkspace(workspaceId);

    return await provider.listCommits(
      workspace.source_control_repo_url!,
      workspace.source_control_branch!,
      { limit }
    );
  }

  // =====================================================
  // Conflict Resolution
  // =====================================================

  /**
   * Detect conflicts between local and remote changes
   */
  async detectConflicts(workspaceId: string, changedFiles: FileChange[]): Promise<Conflict[]> {
    // Get uncommitted local changes
    const localChanges = await this.getUncommittedChanges(workspaceId);

    const conflicts: Conflict[] = [];

    for (const remoteChange of changedFiles) {
      const localChange = localChanges.find(lc => lc.path === remoteChange.path);

      if (localChange) {
        // Both local and remote have changes to the same file
        const datasetName = remoteChange.path.replace('datasets/', '').replace('.json', '');

        conflicts.push({
          dataset_id: '', // Would need to look up
          dataset_name: datasetName,
          conflicting_fields: [], // Would need to compare actual field differences
          remote_commit_sha: '' // Would need from remote commit
        });
      }
    }

    return conflicts;
  }

  /**
   * Resolve conflict
   */
  async resolveConflict(
    workspaceId: string,
    datasetId: string,
    strategy: ConflictResolutionStrategy
  ): Promise<void> {
    // Implementation would depend on strategy:
    // - 'ours': Keep local version
    // - 'theirs': Use remote version
    // - 'manual': User has already merged changes

    if (strategy === 'ours') {
      // Keep local version, mark as resolved
      await this.workspaceService.markAsUnsynced(workspaceId);
    } else if (strategy === 'theirs') {
      // Would need to fetch and apply remote version
      // Then mark as synced
    }

    // After all conflicts resolved, update status
    const remainingConflicts = await this.detectConflicts(workspaceId, []);
    if (remainingConflicts.length === 0) {
      await this.workspaceService.updateSourceControlStatus(workspaceId, 'connected');
    }
  }

  // =====================================================
  // Helper Methods
  // =====================================================

  /**
   * Get provider for workspace
   */
  private async getProvider(workspaceId: string): Promise<SourceControlProvider> {
    // Check cache first
    if (this.providerCache.has(workspaceId)) {
      return this.providerCache.get(workspaceId)!;
    }

    // Get workspace
    const workspace = await this.workspaceService.getWorkspace(workspaceId);

    if (!workspace.source_control_provider || !workspace.source_control_repo_url) {
      throw new Error('Workspace is not connected to source control');
    }

    // Get credentials
    const credentials = await this.getCredentials(workspaceId);

    // Create provider
    const provider = SourceControlProviderFactory.createProvider(
      workspace.source_control_provider,
      workspace.source_control_provider === SourceControlProviderEnum.Azure
        ? { organization: this.parseOrgFromUrl(workspace.source_control_repo_url) }
        : {}
    );

    // Authenticate
    await provider.authenticate(credentials);

    // Cache
    this.providerCache.set(workspaceId, provider);

    return provider;
  }

  /**
   * Record commit in database
   */
  private async recordCommit(workspaceId: string, commit: Commit): Promise<void> {
    await this.supabase
      .from('source_control_commits')
      .insert({
        workspace_id: workspaceId,
        commit_sha: commit.sha,
        commit_message: commit.message,
        commit_author: commit.author,
        commit_date: commit.committed_at,
        file_changes: commit.files_changed || []
      });
  }

  /**
   * Parse organization from URL (for Azure DevOps)
   */
  private parseOrgFromUrl(url: string): string {
    const match = url.match(/dev\.azure\.com\/([^/]+)/);
    return match ? match[1] : '';
  }

  // =====================================================
  // Credential Management (placeholder - will be implemented separately)
  // =====================================================

  private async storeCredentials(workspaceId: string, credentials: SourceControlCredentials): Promise<void> {
    // TODO: Implement with encryption
    // For now, store in simple format (INSECURE - needs encryption)
    await this.supabase
      .from('workspace_source_control_credentials')
      .upsert({
        workspace_id: workspaceId,
        provider: credentials.provider,
        credentials: credentials // Should be encrypted
      });
  }

  private async getCredentials(workspaceId: string): Promise<SourceControlCredentials> {
    const { data, error } = await this.supabase
      .from('workspace_source_control_credentials')
      .select('credentials')
      .eq('workspace_id', workspaceId)
      .single();

    if (error || !data) {
      throw new Error('Credentials not found');
    }

    return data.credentials; // Should be decrypted
  }

  private async removeCredentials(workspaceId: string): Promise<void> {
    await this.supabase
      .from('workspace_source_control_credentials')
      .delete()
      .eq('workspace_id', workspaceId);
  }
}

/**
 * Create a SourceControlService instance with environment configuration
 */
export function createSourceControlService(): SourceControlService {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration is missing');
  }

  return new SourceControlService(supabaseUrl, supabaseKey);
}
