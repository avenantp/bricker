/**
 * GitLab Source Control Provider
 *
 * Implementation of SourceControlProvider for GitLab API.
 * Supports both GitLab.com and self-hosted GitLab instances.
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
 * GitLab API response types
 */
interface GitLabUser {
  id: number;
  username: string;
  name: string;
  email: string;
}

interface GitLabProject {
  id: number;
  name: string;
  path_with_namespace: string;
  web_url: string;
  visibility: 'private' | 'internal' | 'public';
  default_branch: string;
  created_at: string;
  last_activity_at: string;
  description: string | null;
}

interface GitLabBranch {
  name: string;
  commit: {
    id: string;
    web_url: string;
  };
  protected: boolean;
}

interface GitLabCommit {
  id: string;
  short_id: string;
  title: string;
  message: string;
  author_name: string;
  author_email: string;
  committed_date: string;
  web_url: string;
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
}

interface GitLabFile {
  file_name: string;
  file_path: string;
  size: number;
  encoding: 'base64';
  content: string;
  content_sha256: string;
  ref: string;
  blob_id: string;
  commit_id: string;
  last_commit_id: string;
}

interface GitLabCommitAction {
  action: 'create' | 'delete' | 'move' | 'update';
  file_path: string;
  content?: string;
  encoding?: 'text' | 'base64';
  previous_path?: string;
}

interface GitLabDiff {
  old_path: string;
  new_path: string;
  a_mode: string;
  b_mode: string;
  new_file: boolean;
  renamed_file: boolean;
  deleted_file: boolean;
  diff: string;
}

interface GitLabCompare {
  commit: GitLabCommit;
  commits: GitLabCommit[];
  diffs: GitLabDiff[];
  compare_timeout: boolean;
  compare_same_ref: boolean;
}

/**
 * GitLab Provider configuration
 */
export interface GitLabProviderConfig extends Partial<BaseProviderConfig> {
  baseUrl?: string; // For self-hosted GitLab
}

/**
 * GitLab Source Control Provider
 */
export class GitLabProvider extends BaseSourceControlProvider {
  readonly providerName = 'gitlab';

  constructor(config: GitLabProviderConfig = {}) {
    super({
      baseUrl: config.baseUrl || 'https://gitlab.com/api/v4',
      timeout: config.timeout || 30000,
      rateLimiter: config.rateLimiter || RateLimiterPresets.gitlab(),
      retryConfig: config.retryConfig
    });
  }

  // =====================================================
  // Authentication
  // =====================================================

  protected getAuthorizationHeader(): string {
    // GitLab uses "Private-Token" header instead of Bearer
    return `Bearer ${this.credentials!.access_token}`;
  }

  protected buildHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
    const headers = super.buildHeaders(additionalHeaders);

    // GitLab supports both Bearer token and Private-Token header
    // We'll use Private-Token for better compatibility
    if (this.credentials?.access_token) {
      delete headers['Authorization'];
      headers['Private-Token'] = this.credentials.access_token;
    }

    return headers;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const user = await this.request<GitLabUser>({
        method: 'GET',
        path: '/user'
      });

      return {
        success: true,
        message: `Connected to GitLab as ${user.username}`,
        user: {
          username: user.username,
          email: user.email
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to connect to GitLab',
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
    const path = options?.organization
      ? `/groups/${encodeURIComponent(options.organization)}/projects`
      : '/projects';

    const queryParams: Record<string, string | number | boolean> = {
      per_page: options?.limit || 100,
      order_by: 'last_activity_at',
      sort: 'desc',
      membership: true
    };

    if (options?.visibility && options.visibility !== 'all') {
      queryParams.visibility = options.visibility;
    }

    const projects = await this.request<GitLabProject[]>({
      method: 'GET',
      path,
      queryParams
    });

    return projects.map(project => this.mapGitLabProjectToRepository(project));
  }

  async getRepository(repoUrl: string): Promise<Repository> {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid GitLab repository URL: ${repoUrl}`);
    }

    const projectPath = `${parsed.owner}/${parsed.repo}`;
    const project = await this.request<GitLabProject>({
      method: 'GET',
      path: `/projects/${encodeURIComponent(projectPath)}`
    });

    return this.mapGitLabProjectToRepository(project);
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
    const body: any = {
      name,
      visibility: isPrivate ? 'private' : 'public',
      description: options?.description,
      initialize_with_readme: options?.auto_init || false
    };

    if (options?.organization) {
      body.namespace_id = options.organization;
    }

    const project = await this.request<GitLabProject>({
      method: 'POST',
      path: '/projects',
      body
    });

    return this.mapGitLabProjectToRepository(project);
  }

  // =====================================================
  // Branch Operations
  // =====================================================

  async listBranches(repoUrl: string): Promise<Branch[]> {
    const projectId = await this.getProjectId(repoUrl);

    const branches = await this.request<GitLabBranch[]>({
      method: 'GET',
      path: `/projects/${projectId}/repository/branches`,
      queryParams: { per_page: 100 }
    });

    return branches.map(branch => ({
      name: branch.name,
      commit_sha: branch.commit.id,
      protected: branch.protected,
      url: branch.commit.web_url
    }));
  }

  async getBranch(repoUrl: string, branchName: string): Promise<Branch> {
    const projectId = await this.getProjectId(repoUrl);

    const branch = await this.request<GitLabBranch>({
      method: 'GET',
      path: `/projects/${projectId}/repository/branches/${encodeURIComponent(branchName)}`
    });

    return {
      name: branch.name,
      commit_sha: branch.commit.id,
      protected: branch.protected,
      url: branch.commit.web_url
    };
  }

  async createBranch(
    repoUrl: string,
    branchName: string,
    fromBranch?: string
  ): Promise<Branch> {
    this.validateBranchName(branchName);

    const projectId = await this.getProjectId(repoUrl);

    // Get source branch
    const sourceBranch = fromBranch || (await this.getRepository(repoUrl)).default_branch;

    const branch = await this.request<GitLabBranch>({
      method: 'POST',
      path: `/projects/${projectId}/repository/branches`,
      queryParams: {
        branch: branchName,
        ref: sourceBranch
      }
    });

    return {
      name: branch.name,
      commit_sha: branch.commit.id,
      protected: branch.protected,
      url: branch.commit.web_url
    };
  }

  async deleteBranch(repoUrl: string, branchName: string): Promise<void> {
    const projectId = await this.getProjectId(repoUrl);

    await this.request({
      method: 'DELETE',
      path: `/projects/${projectId}/repository/branches/${encodeURIComponent(branchName)}`
    });
  }

  // =====================================================
  // File Operations
  // =====================================================

  async getFile(repoUrl: string, branch: string, path: string): Promise<FileContent> {
    this.validateFilePath(path);

    const projectId = await this.getProjectId(repoUrl);

    const file = await this.request<GitLabFile>({
      method: 'GET',
      path: `/projects/${projectId}/repository/files/${encodeURIComponent(path)}`,
      queryParams: { ref: branch }
    });

    return {
      path: file.file_path,
      content: this.decodeBase64(file.content),
      sha: file.blob_id,
      size: file.size,
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
    this.validateFilePath(path);
    this.validateCommitMessage(message);

    const projectId = await this.getProjectId(repoUrl);

    const response = await this.request<{ file_path: string }>({
      method: 'POST',
      path: `/projects/${projectId}/repository/files/${encodeURIComponent(path)}`,
      body: {
        branch,
        content,
        commit_message: message,
        encoding: 'text'
      }
    });

    // GitLab doesn't return commit info, so fetch the latest commit
    return this.getLatestCommit(repoUrl, branch);
  }

  async updateFile(
    repoUrl: string,
    branch: string,
    path: string,
    content: string,
    message: string,
    sha: string
  ): Promise<Commit> {
    this.validateFilePath(path);
    this.validateCommitMessage(message);

    const projectId = await this.getProjectId(repoUrl);

    await this.request({
      method: 'PUT',
      path: `/projects/${projectId}/repository/files/${encodeURIComponent(path)}`,
      body: {
        branch,
        content,
        commit_message: message,
        encoding: 'text'
      }
    });

    return this.getLatestCommit(repoUrl, branch);
  }

  async deleteFile(
    repoUrl: string,
    branch: string,
    path: string,
    message: string,
    sha: string
  ): Promise<Commit> {
    this.validateFilePath(path);
    this.validateCommitMessage(message);

    const projectId = await this.getProjectId(repoUrl);

    await this.request({
      method: 'DELETE',
      path: `/projects/${projectId}/repository/files/${encodeURIComponent(path)}`,
      body: {
        branch,
        commit_message: message
      }
    });

    return this.getLatestCommit(repoUrl, branch);
  }

  async batchCommit(
    repoUrl: string,
    branch: string,
    operations: FileOperation[],
    message: string
  ): Promise<Commit> {
    this.validateCommitMessage(message);

    const projectId = await this.getProjectId(repoUrl);

    // Map operations to GitLab commit actions
    const actions: GitLabCommitAction[] = operations.map(op => {
      const action: GitLabCommitAction = {
        action: op.operation === 'create' ? 'create' : op.operation === 'delete' ? 'delete' : 'update',
        file_path: op.path
      };

      if (op.operation !== 'delete') {
        action.content = op.content;
        action.encoding = 'text';
      }

      return action;
    });

    const response = await this.request<GitLabCommit>({
      method: 'POST',
      path: `/projects/${projectId}/repository/commits`,
      body: {
        branch,
        commit_message: message,
        actions
      }
    });

    return this.mapGitLabCommitToCommit(response);
  }

  // =====================================================
  // Commit Operations
  // =====================================================

  async getCommit(repoUrl: string, sha: string): Promise<Commit> {
    const projectId = await this.getProjectId(repoUrl);

    const commit = await this.request<GitLabCommit>({
      method: 'GET',
      path: `/projects/${projectId}/repository/commits/${sha}`,
      queryParams: { stats: true }
    });

    return this.mapGitLabCommitToCommit(commit);
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
    const projectId = await this.getProjectId(repoUrl);

    const queryParams: Record<string, string | number> = {
      ref_name: branch,
      per_page: options?.limit || 30
    };

    if (options?.since) {
      queryParams.since = options.since.toISOString();
    }

    if (options?.until) {
      queryParams.until = options.until.toISOString();
    }

    if (options?.author) {
      queryParams.author = options.author;
    }

    const commits = await this.request<GitLabCommit[]>({
      method: 'GET',
      path: `/projects/${projectId}/repository/commits`,
      queryParams
    });

    return commits.map(commit => this.mapGitLabCommitToCommit(commit));
  }

  async compareCommits(
    repoUrl: string,
    baseSha: string,
    headSha: string
  ): Promise<CommitComparison> {
    const projectId = await this.getProjectId(repoUrl);

    const comparison = await this.request<GitLabCompare>({
      method: 'GET',
      path: `/projects/${projectId}/repository/compare`,
      queryParams: {
        from: baseSha,
        to: headSha,
        straight: true
      }
    });

    const filesChanged: FileChange[] = comparison.diffs.map(diff => {
      let status: 'added' | 'removed' | 'modified' | 'renamed' = 'modified';
      if (diff.new_file) status = 'added';
      else if (diff.deleted_file) status = 'removed';
      else if (diff.renamed_file) status = 'renamed';

      // Parse diff to count additions/deletions (simplified)
      const additions = (diff.diff.match(/^\+/gm) || []).length;
      const deletions = (diff.diff.match(/^-/gm) || []).length;

      return {
        path: diff.new_path,
        status,
        additions,
        deletions,
        changes: additions + deletions
      };
    });

    return {
      base_commit: baseSha,
      head_commit: headSha,
      ahead_by: comparison.commits.length,
      behind_by: 0, // GitLab compare doesn't provide this directly
      status: comparison.compare_same_ref ? 'identical' : 'diverged',
      commits: comparison.commits.map(c => this.mapGitLabCommitToCommit(c)),
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

    // HTTPS: https://gitlab.com/owner/repo
    const httpsMatch = normalized.match(/gitlab\.com[/:]([\w-]+)\/([\w-]+)/);
    if (httpsMatch) {
      return {
        owner: httpsMatch[1],
        repo: httpsMatch[2]
      };
    }

    // SSH: git@gitlab.com:owner/repo
    const sshMatch = normalized.match(/git@gitlab\.com:([\w-]+)\/([\w-]+)/);
    if (sshMatch) {
      return {
        owner: sshMatch[1],
        repo: sshMatch[2]
      };
    }

    // Self-hosted: https://custom-gitlab.com/owner/repo
    const customMatch = normalized.match(/\/\/([\w.-]+)\/([\w-]+)\/([\w-]+)/);
    if (customMatch) {
      return {
        owner: customMatch[2],
        repo: customMatch[3]
      };
    }

    return null;
  }

  constructRepoUrl(owner: string, repo: string): string {
    // Extract base URL from configured baseUrl
    const baseWebUrl = this.baseUrl.replace('/api/v4', '');
    return `${baseWebUrl}/${owner}/${repo}`;
  }

  getCommitUrl(repoUrl: string, sha: string): string {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid GitLab repository URL: ${repoUrl}`);
    }

    const baseWebUrl = this.baseUrl.replace('/api/v4', '');
    return `${baseWebUrl}/${parsed.owner}/${parsed.repo}/-/commit/${sha}`;
  }

  getFileUrl(repoUrl: string, branch: string, path: string): string {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid GitLab repository URL: ${repoUrl}`);
    }

    const baseWebUrl = this.baseUrl.replace('/api/v4', '');
    return `${baseWebUrl}/${parsed.owner}/${parsed.repo}/-/blob/${branch}/${path}`;
  }

  // =====================================================
  // Helper Methods
  // =====================================================

  /**
   * Get GitLab project ID from repository URL
   */
  private async getProjectId(repoUrl: string): Promise<string> {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid GitLab repository URL: ${repoUrl}`);
    }

    const projectPath = `${parsed.owner}/${parsed.repo}`;
    return encodeURIComponent(projectPath);
  }

  // =====================================================
  // Mapping Helpers
  // =====================================================

  private mapGitLabProjectToRepository(project: GitLabProject): Repository {
    return {
      id: String(project.id),
      name: project.name,
      full_name: project.path_with_namespace,
      url: project.web_url,
      is_private: project.visibility === 'private',
      default_branch: project.default_branch,
      created_at: project.created_at,
      updated_at: project.last_activity_at,
      description: project.description || undefined
    };
  }

  private mapGitLabCommitToCommit(commit: GitLabCommit): Commit {
    return {
      sha: commit.id,
      message: commit.message,
      author: commit.author_name,
      author_email: commit.author_email,
      committed_at: commit.committed_date,
      url: commit.web_url,
      files_changed: commit.stats ? [{
        path: '',
        status: 'modified',
        additions: commit.stats.additions,
        deletions: commit.stats.deletions,
        changes: commit.stats.total
      }] : undefined
    };
  }
}
