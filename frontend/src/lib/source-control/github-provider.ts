/**
 * GitHub Source Control Provider
 *
 * Implementation of SourceControlProvider for GitHub API.
 * Supports both GitHub.com and GitHub Enterprise.
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
 * GitHub API response types
 */
interface GitHubUser {
  login: string;
  id: number;
  name: string | null;
  email: string | null;
}

interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
  default_branch: string;
  created_at: string;
  updated_at: string;
  description: string | null;
}

interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  html_url: string;
  files?: Array<{
    filename: string;
    status: 'added' | 'removed' | 'modified' | 'renamed';
    additions: number;
    deletions: number;
    changes: number;
  }>;
}

interface GitHubFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  content: string;
  encoding: 'base64';
}

interface GitHubComparison {
  status: 'diverged' | 'ahead' | 'behind' | 'identical';
  ahead_by: number;
  behind_by: number;
  total_commits: number;
  commits: GitHubCommit[];
  files: Array<{
    filename: string;
    status: 'added' | 'removed' | 'modified' | 'renamed';
    additions: number;
    deletions: number;
    changes: number;
  }>;
}

interface GitHubTreeItem {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha?: string;
  content?: string;
}

interface GitHubTree {
  sha: string;
  tree: GitHubTreeItem[];
}

interface GitHubCreateTreeResponse {
  sha: string;
}

interface GitHubCreateCommitResponse {
  sha: string;
  html_url: string;
}

/**
 * GitHub Provider configuration
 */
export interface GitHubProviderConfig extends Partial<BaseProviderConfig> {
  baseUrl?: string; // For GitHub Enterprise
}

/**
 * GitHub Source Control Provider
 */
export class GitHubProvider extends BaseSourceControlProvider {
  readonly providerName = 'github';

  constructor(config: GitHubProviderConfig = {}) {
    super({
      baseUrl: config.baseUrl || 'https://api.github.com',
      timeout: config.timeout || 30000,
      rateLimiter: config.rateLimiter || RateLimiterPresets.github(),
      retryConfig: config.retryConfig
    });
  }

  // =====================================================
  // Authentication
  // =====================================================

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const user = await this.request<GitHubUser>({
        method: 'GET',
        path: '/user'
      });

      return {
        success: true,
        message: `Connected to GitHub as ${user.login}`,
        user: {
          username: user.login,
          email: user.email || undefined
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to connect to GitHub',
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
      ? `/orgs/${options.organization}/repos`
      : '/user/repos';

    const queryParams: Record<string, string | number> = {
      per_page: options?.limit || 100,
      sort: 'updated',
      direction: 'desc'
    };

    if (options?.visibility && options.visibility !== 'all') {
      queryParams.visibility = options.visibility;
    }

    const repos = await this.request<GitHubRepository[]>({
      method: 'GET',
      path,
      queryParams
    });

    return repos.map(repo => this.mapGitHubRepositoryToRepository(repo));
  }

  async getRepository(repoUrl: string): Promise<Repository> {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
    }

    const repo = await this.request<GitHubRepository>({
      method: 'GET',
      path: `/repos/${parsed.owner}/${parsed.repo}`
    });

    return this.mapGitHubRepositoryToRepository(repo);
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
    const path = options?.organization
      ? `/orgs/${options.organization}/repos`
      : '/user/repos';

    const body = {
      name,
      private: isPrivate,
      description: options?.description,
      auto_init: options?.auto_init || false
    };

    const repo = await this.request<GitHubRepository>({
      method: 'POST',
      path,
      body
    });

    return this.mapGitHubRepositoryToRepository(repo);
  }

  // =====================================================
  // Branch Operations
  // =====================================================

  async listBranches(repoUrl: string): Promise<Branch[]> {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
    }

    const branches = await this.request<GitHubBranch[]>({
      method: 'GET',
      path: `/repos/${parsed.owner}/${parsed.repo}/branches`,
      queryParams: { per_page: 100 }
    });

    return branches.map(branch => ({
      name: branch.name,
      commit_sha: branch.commit.sha,
      protected: branch.protected,
      url: branch.commit.url
    }));
  }

  async getBranch(repoUrl: string, branchName: string): Promise<Branch> {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
    }

    const branch = await this.request<GitHubBranch>({
      method: 'GET',
      path: `/repos/${parsed.owner}/${parsed.repo}/branches/${branchName}`
    });

    return {
      name: branch.name,
      commit_sha: branch.commit.sha,
      protected: branch.protected,
      url: branch.commit.url
    };
  }

  async createBranch(
    repoUrl: string,
    branchName: string,
    fromBranch?: string
  ): Promise<Branch> {
    this.validateBranchName(branchName);

    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
    }

    // Get SHA of source branch
    const sourceBranch = fromBranch || (await this.getRepository(repoUrl)).default_branch;
    const sourceRef = await this.getBranch(repoUrl, sourceBranch);

    // Create new branch reference
    await this.request({
      method: 'POST',
      path: `/repos/${parsed.owner}/${parsed.repo}/git/refs`,
      body: {
        ref: `refs/heads/${branchName}`,
        sha: sourceRef.commit_sha
      }
    });

    return this.getBranch(repoUrl, branchName);
  }

  async deleteBranch(repoUrl: string, branchName: string): Promise<void> {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
    }

    await this.request({
      method: 'DELETE',
      path: `/repos/${parsed.owner}/${parsed.repo}/git/refs/heads/${branchName}`
    });
  }

  // =====================================================
  // File Operations
  // =====================================================

  async getFile(repoUrl: string, branch: string, path: string): Promise<FileContent> {
    this.validateFilePath(path);

    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
    }

    const file = await this.request<GitHubFileContent>({
      method: 'GET',
      path: `/repos/${parsed.owner}/${parsed.repo}/contents/${path}`,
      queryParams: { ref: branch }
    });

    return {
      path: file.path,
      content: this.decodeBase64(file.content),
      sha: file.sha,
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

    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
    }

    const response = await this.request<{ commit: GitHubCommit }>({
      method: 'PUT',
      path: `/repos/${parsed.owner}/${parsed.repo}/contents/${path}`,
      body: {
        message,
        content: this.encodeBase64(content),
        branch
      }
    });

    return this.mapGitHubCommitToCommit(response.commit);
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

    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
    }

    const response = await this.request<{ commit: GitHubCommit }>({
      method: 'PUT',
      path: `/repos/${parsed.owner}/${parsed.repo}/contents/${path}`,
      body: {
        message,
        content: this.encodeBase64(content),
        sha,
        branch
      }
    });

    return this.mapGitHubCommitToCommit(response.commit);
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

    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
    }

    const response = await this.request<{ commit: GitHubCommit }>({
      method: 'DELETE',
      path: `/repos/${parsed.owner}/${parsed.repo}/contents/${path}`,
      body: {
        message,
        sha,
        branch
      }
    });

    return this.mapGitHubCommitToCommit(response.commit);
  }

  async batchCommit(
    repoUrl: string,
    branch: string,
    operations: FileOperation[],
    message: string
  ): Promise<Commit> {
    this.validateCommitMessage(message);

    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
    }

    // Get the latest commit SHA on the branch
    const latestCommit = await this.getLatestCommit(repoUrl, branch);
    const baseTreeSha = latestCommit.sha;

    // Build tree items from operations
    const tree: GitHubTreeItem[] = operations.map(op => {
      const item: GitHubTreeItem = {
        path: op.path,
        mode: '100644', // Regular file
        type: op.operation === 'delete' ? 'blob' : 'blob'
      };

      if (op.operation === 'delete') {
        item.sha = null as any; // GitHub uses null SHA for deletions
      } else {
        item.content = op.content;
      }

      return item;
    });

    // Create tree
    const treeResponse = await this.request<GitHubCreateTreeResponse>({
      method: 'POST',
      path: `/repos/${parsed.owner}/${parsed.repo}/git/trees`,
      body: {
        base_tree: baseTreeSha,
        tree
      }
    });

    // Create commit
    const commitResponse = await this.request<GitHubCreateCommitResponse>({
      method: 'POST',
      path: `/repos/${parsed.owner}/${parsed.repo}/git/commits`,
      body: {
        message,
        tree: treeResponse.sha,
        parents: [latestCommit.sha]
      }
    });

    // Update branch reference
    await this.request({
      method: 'PATCH',
      path: `/repos/${parsed.owner}/${parsed.repo}/git/refs/heads/${branch}`,
      body: {
        sha: commitResponse.sha
      }
    });

    return this.getCommit(repoUrl, commitResponse.sha);
  }

  // =====================================================
  // Commit Operations
  // =====================================================

  async getCommit(repoUrl: string, sha: string): Promise<Commit> {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
    }

    const commit = await this.request<GitHubCommit>({
      method: 'GET',
      path: `/repos/${parsed.owner}/${parsed.repo}/commits/${sha}`
    });

    return this.mapGitHubCommitToCommit(commit);
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
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
    }

    const queryParams: Record<string, string | number> = {
      sha: branch,
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

    const commits = await this.request<GitHubCommit[]>({
      method: 'GET',
      path: `/repos/${parsed.owner}/${parsed.repo}/commits`,
      queryParams
    });

    return commits.map(commit => this.mapGitHubCommitToCommit(commit));
  }

  async compareCommits(
    repoUrl: string,
    baseSha: string,
    headSha: string
  ): Promise<CommitComparison> {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
    }

    const comparison = await this.request<GitHubComparison>({
      method: 'GET',
      path: `/repos/${parsed.owner}/${parsed.repo}/compare/${baseSha}...${headSha}`
    });

    return {
      base_commit: baseSha,
      head_commit: headSha,
      ahead_by: comparison.ahead_by,
      behind_by: comparison.behind_by,
      status: comparison.status,
      commits: comparison.commits.map(c => this.mapGitHubCommitToCommit(c)),
      files_changed: comparison.files.map(file => ({
        path: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes
      }))
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

    // HTTPS: https://github.com/owner/repo
    const httpsMatch = normalized.match(/github\.com[/:]([\w-]+)\/([\w-]+)/);
    if (httpsMatch) {
      return {
        owner: httpsMatch[1],
        repo: httpsMatch[2]
      };
    }

    // SSH: git@github.com:owner/repo
    const sshMatch = normalized.match(/git@github\.com:([\w-]+)\/([\w-]+)/);
    if (sshMatch) {
      return {
        owner: sshMatch[1],
        repo: sshMatch[2]
      };
    }

    return null;
  }

  constructRepoUrl(owner: string, repo: string): string {
    return `https://github.com/${owner}/${repo}`;
  }

  getCommitUrl(repoUrl: string, sha: string): string {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
    }

    return `https://github.com/${parsed.owner}/${parsed.repo}/commit/${sha}`;
  }

  getFileUrl(repoUrl: string, branch: string, path: string): string {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
    }

    return `https://github.com/${parsed.owner}/${parsed.repo}/blob/${branch}/${path}`;
  }

  // =====================================================
  // Mapping Helpers
  // =====================================================

  private mapGitHubRepositoryToRepository(repo: GitHubRepository): Repository {
    return {
      id: String(repo.id),
      name: repo.name,
      full_name: repo.full_name,
      url: repo.html_url,
      is_private: repo.private,
      default_branch: repo.default_branch,
      created_at: repo.created_at,
      updated_at: repo.updated_at,
      description: repo.description || undefined
    };
  }

  private mapGitHubCommitToCommit(commit: GitHubCommit): Commit {
    return {
      sha: commit.sha,
      message: commit.commit.message,
      author: commit.commit.author.name,
      author_email: commit.commit.author.email,
      committed_at: commit.commit.author.date,
      url: commit.html_url,
      files_changed: commit.files?.map(file => ({
        path: file.filename,
        status: file.status,
        additions: file.additions,
        deletions: file.deletions,
        changes: file.changes
      }))
    };
  }
}
