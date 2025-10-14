/**
 * Azure DevOps Source Control Provider
 *
 * Implementation of SourceControlProvider for Azure DevOps REST API.
 * Supports Azure DevOps Services (dev.azure.com) and Azure DevOps Server.
 */

import {
  ConnectionTestResult,
  Repository,
  Branch,
  Commit,
  FileContent,
  FileOperation,
  FileChange,
  CommitComparison
} from '@/types/source-control';
import { BaseSourceControlProvider, BaseProviderConfig } from './base-provider';
import { RateLimiterPresets } from './rate-limiter';

/**
 * Azure DevOps API response types
 */
interface AzureProfile {
  id: string;
  displayName: string;
  emailAddress: string;
  coreAttributes: {
    Avatar: { value: { value: string } };
  };
}

interface AzureRepository {
  id: string;
  name: string;
  url: string;
  webUrl: string;
  project: {
    id: string;
    name: string;
  };
  defaultBranch: string;
  size: number;
}

interface AzureBranch {
  name: string;
  objectId: string;
  creator: {
    name: string;
  };
  url: string;
}

interface AzureCommit {
  commitId: string;
  comment: string;
  author: {
    name: string;
    email: string;
    date: string;
  };
  committer: {
    name: string;
    email: string;
    date: string;
  };
  url: string;
  remoteUrl: string;
  changeCounts?: {
    Add: number;
    Edit: number;
    Delete: number;
  };
}

interface AzureItem {
  objectId: string;
  path: string;
  gitObjectType: 'blob' | 'tree' | 'commit';
  commitId: string;
  url: string;
  content?: string;
  contentMetadata?: {
    encoding: string;
  };
}

interface AzureChange {
  changeType: 'add' | 'edit' | 'delete' | 'rename';
  item: {
    path: string;
    gitObjectType: string;
  };
  sourceServerItem?: string;
}

interface AzureCommitDiffs {
  changes: AzureChange[];
  changeCounts: {
    Add: number;
    Edit: number;
    Delete: number;
  };
}

interface AzurePush {
  pushId: number;
  date: string;
  commits: AzureCommit[];
  repository: AzureRepository;
  url: string;
}

interface AzureRefUpdate {
  name: string;
  oldObjectId: string;
  newObjectId: string;
}

/**
 * Azure DevOps Provider configuration
 */
export interface AzureDevOpsProviderConfig extends Partial<BaseProviderConfig> {
  organization: string;
  baseUrl?: string; // For Azure DevOps Server
}

/**
 * Azure DevOps Source Control Provider
 */
export class AzureDevOpsProvider extends BaseSourceControlProvider {
  readonly providerName = 'azure';
  private organization: string;

  constructor(config: AzureDevOpsProviderConfig) {
    super({
      baseUrl: config.baseUrl || `https://dev.azure.com/${config.organization}`,
      timeout: config.timeout || 30000,
      rateLimiter: config.rateLimiter || RateLimiterPresets.azure(),
      retryConfig: config.retryConfig
    });

    this.organization = config.organization;
  }

  // =====================================================
  // Authentication
  // =====================================================

  protected getAuthorizationHeader(): string {
    // Azure DevOps uses Basic auth with PAT
    const token = this.credentials!.access_token;
    const encoded = btoa(`:${token}`);
    return `Basic ${encoded}`;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      // Use Azure DevOps profile API
      const profile = await this.request<AzureProfile>({
        method: 'GET',
        path: 'https://app.vssps.visualstudio.com/_apis/profile/profiles/me',
        queryParams: { 'api-version': '6.0' }
      });

      return {
        success: true,
        message: `Connected to Azure DevOps as ${profile.displayName}`,
        user: {
          username: profile.displayName,
          email: profile.emailAddress
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to connect to Azure DevOps',
        error: error.message
      };
    }
  }

  // =====================================================
  // Repository Operations
  // =====================================================

  async listRepositories(options?: {
    organization?: string;
    visibility?: 'public' | 'private' | 'all';
    limit?: number;
  }): Promise<Repository[]> {
    // Azure DevOps requires project context
    // We'll list all projects first, then get repos from each
    const projects = await this.request<{ value: Array<{ id: string; name: string }> }>({
      method: 'GET',
      path: '/_apis/projects',
      queryParams: { 'api-version': '6.0' }
    });

    const allRepos: Repository[] = [];

    for (const project of projects.value) {
      const response = await this.request<{ value: AzureRepository[] }>({
        method: 'GET',
        path: `/${project.id}/_apis/git/repositories`,
        queryParams: { 'api-version': '6.0' }
      });

      allRepos.push(...response.value.map(repo => this.mapAzureRepositoryToRepository(repo)));
    }

    return allRepos.slice(0, options?.limit || 100);
  }

  async getRepository(repoUrl: string): Promise<Repository> {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid Azure DevOps repository URL: ${repoUrl}`);
    }

    const repo = await this.request<AzureRepository>({
      method: 'GET',
      path: `/${parsed.owner}/_apis/git/repositories/${parsed.repo}`,
      queryParams: { 'api-version': '6.0' }
    });

    return this.mapAzureRepositoryToRepository(repo);
  }

  async createRepository(
    name: string,
    isPrivate: boolean,
    options?: {
      description?: string;
      organization?: string;
      auto_init?: boolean;
    }
  ): Promise<Repository> {
    // Azure DevOps requires a project
    const project = options?.organization;
    if (!project) {
      throw new Error('Project name is required for Azure DevOps repository creation');
    }

    const body = {
      name,
      project: {
        name: project
      }
    };

    const repo = await this.request<AzureRepository>({
      method: 'POST',
      path: `/_apis/git/repositories`,
      queryParams: { 'api-version': '6.0' },
      body
    });

    return this.mapAzureRepositoryToRepository(repo);
  }

  // =====================================================
  // Branch Operations
  // =====================================================

  async listBranches(repoUrl: string): Promise<Branch[]> {
    const { project, repoId } = await this.getProjectAndRepoId(repoUrl);

    const response = await this.request<{ value: AzureBranch[] }>({
      method: 'GET',
      path: `/${project}/_apis/git/repositories/${repoId}/refs`,
      queryParams: {
        'api-version': '6.0',
        filter: 'heads/'
      }
    });

    return response.value.map(branch => ({
      name: branch.name.replace('refs/heads/', ''),
      commit_sha: branch.objectId,
      protected: false, // Azure DevOps requires separate API call for branch policies
      url: branch.url
    }));
  }

  async getBranch(repoUrl: string, branchName: string): Promise<Branch> {
    const { project, repoId } = await this.getProjectAndRepoId(repoUrl);

    const response = await this.request<{ value: AzureBranch[] }>({
      method: 'GET',
      path: `/${project}/_apis/git/repositories/${repoId}/refs`,
      queryParams: {
        'api-version': '6.0',
        filter: `heads/${branchName}`
      }
    });

    if (response.value.length === 0) {
      throw new Error(`Branch not found: ${branchName}`);
    }

    const branch = response.value[0];

    return {
      name: branch.name.replace('refs/heads/', ''),
      commit_sha: branch.objectId,
      protected: false,
      url: branch.url
    };
  }

  async createBranch(
    repoUrl: string,
    branchName: string,
    fromBranch?: string
  ): Promise<Branch> {
    this.validateBranchName(branchName);

    const { project, repoId } = await this.getProjectAndRepoId(repoUrl);

    // Get source branch SHA
    const sourceBranch = fromBranch || (await this.getRepository(repoUrl)).default_branch;
    const sourceRef = await this.getBranch(repoUrl, sourceBranch);

    // Create branch using refs API
    const body = [
      {
        name: `refs/heads/${branchName}`,
        oldObjectId: '0000000000000000000000000000000000000000',
        newObjectId: sourceRef.commit_sha
      }
    ];

    await this.request<{ value: AzureRefUpdate[] }>({
      method: 'POST',
      path: `/${project}/_apis/git/repositories/${repoId}/refs`,
      queryParams: { 'api-version': '6.0' },
      body
    });

    return this.getBranch(repoUrl, branchName);
  }

  async deleteBranch(repoUrl: string, branchName: string): Promise<void> {
    const { project, repoId } = await this.getProjectAndRepoId(repoUrl);

    // Get current branch SHA
    const branch = await this.getBranch(repoUrl, branchName);

    const body = [
      {
        name: `refs/heads/${branchName}`,
        oldObjectId: branch.commit_sha,
        newObjectId: '0000000000000000000000000000000000000000'
      }
    ];

    await this.request({
      method: 'POST',
      path: `/${project}/_apis/git/repositories/${repoId}/refs`,
      queryParams: { 'api-version': '6.0' },
      body
    });
  }

  // =====================================================
  // File Operations
  // =====================================================

  async getFile(repoUrl: string, branch: string, path: string): Promise<FileContent> {
    this.validateFilePath(path);

    const { project, repoId } = await this.getProjectAndRepoId(repoUrl);

    const item = await this.request<AzureItem>({
      method: 'GET',
      path: `/${project}/_apis/git/repositories/${repoId}/items`,
      queryParams: {
        'api-version': '6.0',
        path: `/${path}`,
        versionDescriptor: JSON.stringify({ versionType: 'branch', version: branch }),
        includeContent: true
      }
    });

    return {
      path: item.path.substring(1), // Remove leading slash
      content: item.content || '',
      sha: item.objectId,
      size: item.content?.length || 0,
      url: this.getFileUrl(repoUrl, branch, path)
    };
  }

  async createFile(
    repoUrl: string,
    branch: string,
    path: string,
    content: string,
    message: string
  ): Promise<Commit> {
    return this.batchCommit(repoUrl, branch, [
      { operation: 'create', path, content }
    ], message);
  }

  async updateFile(
    repoUrl: string,
    branch: string,
    path: string,
    content: string,
    message: string,
    sha: string
  ): Promise<Commit> {
    return this.batchCommit(repoUrl, branch, [
      { operation: 'update', path, content }
    ], message);
  }

  async deleteFile(
    repoUrl: string,
    branch: string,
    path: string,
    message: string,
    sha: string
  ): Promise<Commit> {
    return this.batchCommit(repoUrl, branch, [
      { operation: 'delete', path }
    ], message);
  }

  async batchCommit(
    repoUrl: string,
    branch: string,
    operations: FileOperation[],
    message: string
  ): Promise<Commit> {
    this.validateCommitMessage(message);

    const { project, repoId } = await this.getProjectAndRepoId(repoUrl);

    // Get current branch commit
    const branchRef = await this.getBranch(repoUrl, branch);

    // Map operations to Azure DevOps change format
    const changes = operations.map(op => {
      const change: any = {
        changeType: op.operation,
        item: {
          path: `/${op.path}`
        }
      };

      if (op.operation !== 'delete') {
        change.newContent = {
          content: op.content,
          contentType: 'rawtext'
        };
      }

      return change;
    });

    // Create push
    const body = {
      refUpdates: [
        {
          name: `refs/heads/${branch}`,
          oldObjectId: branchRef.commit_sha
        }
      ],
      commits: [
        {
          comment: message,
          changes
        }
      ]
    };

    const push = await this.request<AzurePush>({
      method: 'POST',
      path: `/${project}/_apis/git/repositories/${repoId}/pushes`,
      queryParams: { 'api-version': '6.0' },
      body
    });

    // Return the created commit
    return this.mapAzureCommitToCommit(push.commits[0]);
  }

  // =====================================================
  // Commit Operations
  // =====================================================

  async getCommit(repoUrl: string, sha: string): Promise<Commit> {
    const { project, repoId } = await this.getProjectAndRepoId(repoUrl);

    const commit = await this.request<AzureCommit>({
      method: 'GET',
      path: `/${project}/_apis/git/repositories/${repoId}/commits/${sha}`,
      queryParams: { 'api-version': '6.0' }
    });

    return this.mapAzureCommitToCommit(commit);
  }

  async listCommits(
    repoUrl: string,
    branch: string,
    options?: {
      since?: Date;
      until?: Date;
      limit?: number;
      author?: string;
    }
  ): Promise<Commit[]> {
    const { project, repoId } = await this.getProjectAndRepoId(repoUrl);

    const queryParams: Record<string, string | number> = {
      'api-version': '6.0',
      'searchCriteria.itemVersion.version': branch,
      '$top': options?.limit || 30
    };

    if (options?.since) {
      queryParams['searchCriteria.fromDate'] = options.since.toISOString();
    }

    if (options?.until) {
      queryParams['searchCriteria.toDate'] = options.until.toISOString();
    }

    if (options?.author) {
      queryParams['searchCriteria.author'] = options.author;
    }

    const response = await this.request<{ value: AzureCommit[] }>({
      method: 'GET',
      path: `/${project}/_apis/git/repositories/${repoId}/commits`,
      queryParams
    });

    return response.value.map(commit => this.mapAzureCommitToCommit(commit));
  }

  async compareCommits(
    repoUrl: string,
    baseSha: string,
    headSha: string
  ): Promise<CommitComparison> {
    const { project, repoId } = await this.getProjectAndRepoId(repoUrl);

    // Get commits between base and head
    const commitsResponse = await this.request<{ value: AzureCommit[] }>({
      method: 'GET',
      path: `/${project}/_apis/git/repositories/${repoId}/commitsBatch`,
      queryParams: { 'api-version': '6.0' },
      body: {
        itemVersion: {
          versionType: 'commit',
          version: headSha
        },
        compareVersion: {
          versionType: 'commit',
          version: baseSha
        }
      }
    });

    // Get diff
    const diffResponse = await this.request<AzureCommitDiffs>({
      method: 'GET',
      path: `/${project}/_apis/git/repositories/${repoId}/diffs/commits`,
      queryParams: {
        'api-version': '6.0',
        baseVersionType: 'commit',
        baseVersion: baseSha,
        targetVersionType: 'commit',
        targetVersion: headSha
      }
    });

    const filesChanged: FileChange[] = diffResponse.changes.map(change => {
      const status = change.changeType === 'add' ? 'added'
        : change.changeType === 'delete' ? 'removed'
        : change.changeType === 'rename' ? 'renamed'
        : 'modified';

      return {
        path: change.item.path.substring(1), // Remove leading slash
        status,
        additions: 0, // Azure DevOps doesn't provide line-level stats easily
        deletions: 0,
        changes: 0
      };
    });

    return {
      base_commit: baseSha,
      head_commit: headSha,
      ahead_by: commitsResponse.value.length,
      behind_by: 0,
      status: commitsResponse.value.length === 0 ? 'identical' : 'ahead',
      commits: commitsResponse.value.map(c => this.mapAzureCommitToCommit(c)),
      files_changed: filesChanged
    };
  }

  async getLatestCommit(repoUrl: string, branch: string): Promise<Commit> {
    const commits = await this.listCommits(repoUrl, branch, { limit: 1 });
    if (commits.length === 0) {
      throw new Error(`No commits found on branch: ${branch}`);
    }
    return commits[0];
  }

  async getChangedFiles(
    repoUrl: string,
    branch: string,
    fromSha: string,
    toSha: string
  ): Promise<FileChange[]> {
    const comparison = await this.compareCommits(repoUrl, fromSha, toSha);
    return comparison.files_changed;
  }

  // =====================================================
  // Utility Methods
  // =====================================================

  parseRepoUrl(url: string): { owner: string; repo: string } | null {
    const normalized = this.normalizeRepoUrl(url);

    // HTTPS: https://dev.azure.com/{org}/{project}/_git/{repo}
    const httpsMatch = normalized.match(/dev\.azure\.com\/([^/]+)\/([^/]+)\/_git\/([^/]+)/);
    if (httpsMatch) {
      return {
        owner: httpsMatch[2], // project name
        repo: httpsMatch[3]   // repo name
      };
    }

    // SSH: git@ssh.dev.azure.com:v3/{org}/{project}/{repo}
    const sshMatch = normalized.match(/ssh\.dev\.azure\.com:v3\/([^/]+)\/([^/]+)\/([^/]+)/);
    if (sshMatch) {
      return {
        owner: sshMatch[2],
        repo: sshMatch[3]
      };
    }

    return null;
  }

  constructRepoUrl(owner: string, repo: string): string {
    return `https://dev.azure.com/${this.organization}/${owner}/_git/${repo}`;
  }

  getCommitUrl(repoUrl: string, sha: string): string {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid Azure DevOps repository URL: ${repoUrl}`);
    }

    return `https://dev.azure.com/${this.organization}/${parsed.owner}/_git/${parsed.repo}/commit/${sha}`;
  }

  getFileUrl(repoUrl: string, branch: string, path: string): string {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid Azure DevOps repository URL: ${repoUrl}`);
    }

    return `https://dev.azure.com/${this.organization}/${parsed.owner}/_git/${parsed.repo}?path=/${path}&version=GB${branch}`;
  }

  // =====================================================
  // Helper Methods
  // =====================================================

  /**
   * Get project and repository ID from repository URL
   */
  private async getProjectAndRepoId(repoUrl: string): Promise<{ project: string; repoId: string }> {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid Azure DevOps repository URL: ${repoUrl}`);
    }

    return {
      project: parsed.owner,
      repoId: parsed.repo
    };
  }

  // =====================================================
  // Mapping Helpers
  // =====================================================

  private mapAzureRepositoryToRepository(repo: AzureRepository): Repository {
    return {
      id: repo.id,
      name: repo.name,
      full_name: `${repo.project.name}/${repo.name}`,
      url: repo.webUrl,
      is_private: true, // Azure DevOps repos are private by default
      default_branch: repo.defaultBranch?.replace('refs/heads/', '') || 'main',
      created_at: new Date().toISOString(), // Azure doesn't provide creation date
      updated_at: new Date().toISOString(),
      description: undefined
    };
  }

  private mapAzureCommitToCommit(commit: AzureCommit): Commit {
    return {
      sha: commit.commitId,
      message: commit.comment,
      author: commit.author.name,
      author_email: commit.author.email,
      committed_at: commit.author.date,
      url: commit.remoteUrl,
      files_changed: commit.changeCounts ? [{
        path: '',
        status: 'modified',
        additions: commit.changeCounts.Add,
        deletions: commit.changeCounts.Delete,
        changes: commit.changeCounts.Add + commit.changeCounts.Edit + commit.changeCounts.Delete
      }] : undefined
    };
  }
}
