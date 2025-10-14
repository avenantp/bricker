/**
 * Bitbucket Source Control Provider
 *
 * Implementation of SourceControlProvider for Bitbucket API.
 * Supports Bitbucket Cloud (bitbucket.org).
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
 * Bitbucket API response types
 */
interface BitbucketUser {
  uuid: string;
  username: string;
  display_name: string;
  account_id: string;
}

interface BitbucketRepository {
  uuid: string;
  name: string;
  full_name: string;
  links: {
    html: { href: string };
  };
  is_private: boolean;
  mainbranch?: {
    name: string;
  };
  created_on: string;
  updated_on: string;
  description?: string;
}

interface BitbucketBranch {
  name: string;
  target: {
    hash: string;
    links: {
      html: { href: string };
    };
  };
}

interface BitbucketCommit {
  hash: string;
  message: string;
  author: {
    raw: string;
    user?: {
      display_name: string;
    };
  };
  date: string;
  links: {
    html: { href: string };
  };
}

interface BitbucketFileContent {
  path: string;
  commit: {
    hash: string;
  };
  size: number;
}

interface BitbucketDiffStat {
  status: 'added' | 'removed' | 'modified' | 'renamed';
  old?: {
    path: string;
  };
  new?: {
    path: string;
  };
  lines_added: number;
  lines_removed: number;
}

interface BitbucketPaginatedResponse<T> {
  values: T[];
  next?: string;
  size: number;
}

/**
 * Bitbucket Provider configuration
 */
export interface BitbucketProviderConfig extends Partial<BaseProviderConfig> {
  baseUrl?: string;
}

/**
 * Bitbucket Source Control Provider
 */
export class BitbucketProvider extends BaseSourceControlProvider {
  readonly providerName = 'bitbucket';

  constructor(config: BitbucketProviderConfig = {}) {
    super({
      baseUrl: config.baseUrl || 'https://api.bitbucket.org/2.0',
      timeout: config.timeout || 30000,
      rateLimiter: config.rateLimiter || RateLimiterPresets.bitbucket(),
      retryConfig: config.retryConfig
    });
  }

  // =====================================================
  // Authentication
  // =====================================================

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      const user = await this.request<BitbucketUser>({
        method: 'GET',
        path: '/user'
      });

      return {
        success: true,
        message: `Connected to Bitbucket as ${user.username}`,
        user: {
          username: user.username,
          email: undefined // Bitbucket doesn't return email in user endpoint
        }
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.message || 'Failed to connect to Bitbucket',
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
      ? `/repositories/${options.organization}`
      : '/repositories';

    const queryParams: Record<string, string | number> = {
      pagelen: options?.limit || 100,
      role: 'member'
    };

    const response = await this.request<BitbucketPaginatedResponse<BitbucketRepository>>({
      method: 'GET',
      path,
      queryParams
    });

    let repos = response.values;

    // Filter by visibility if specified
    if (options?.visibility && options.visibility !== 'all') {
      repos = repos.filter(repo =>
        options.visibility === 'private' ? repo.is_private : !repo.is_private
      );
    }

    return repos.map(repo => this.mapBitbucketRepositoryToRepository(repo));
  }

  async getRepository(repoUrl: string): Promise<Repository> {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid Bitbucket repository URL: ${repoUrl}`);
    }

    const repo = await this.request<BitbucketRepository>({
      method: 'GET',
      path: `/repositories/${parsed.owner}/${parsed.repo}`
    });

    return this.mapBitbucketRepositoryToRepository(repo);
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
    const workspace = options?.organization || (await this.getCurrentUser()).username;

    const body: any = {
      scm: 'git',
      is_private: isPrivate,
      description: options?.description || ''
    };

    const repo = await this.request<BitbucketRepository>({
      method: 'POST',
      path: `/repositories/${workspace}/${name}`,
      body
    });

    // Bitbucket doesn't support auto_init directly
    // Would need to create an initial commit manually if needed

    return this.mapBitbucketRepositoryToRepository(repo);
  }

  // =====================================================
  // Branch Operations
  // =====================================================

  async listBranches(repoUrl: string): Promise<Branch[]> {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid Bitbucket repository URL: ${repoUrl}`);
    }

    const response = await this.request<BitbucketPaginatedResponse<BitbucketBranch>>({
      method: 'GET',
      path: `/repositories/${parsed.owner}/${parsed.repo}/refs/branches`,
      queryParams: { pagelen: 100 }
    });

    return response.values.map(branch => ({
      name: branch.name,
      commit_sha: branch.target.hash,
      protected: false, // Bitbucket API v2 doesn't expose this easily
      url: branch.target.links.html.href
    }));
  }

  async getBranch(repoUrl: string, branchName: string): Promise<Branch> {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid Bitbucket repository URL: ${repoUrl}`);
    }

    const branch = await this.request<BitbucketBranch>({
      method: 'GET',
      path: `/repositories/${parsed.owner}/${parsed.repo}/refs/branches/${branchName}`
    });

    return {
      name: branch.name,
      commit_sha: branch.target.hash,
      protected: false,
      url: branch.target.links.html.href
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
      throw new Error(`Invalid Bitbucket repository URL: ${repoUrl}`);
    }

    // Get source branch SHA
    const sourceBranch = fromBranch || (await this.getRepository(repoUrl)).default_branch;
    const sourceRef = await this.getBranch(repoUrl, sourceBranch);

    // Create new branch
    await this.request({
      method: 'POST',
      path: `/repositories/${parsed.owner}/${parsed.repo}/refs/branches`,
      body: {
        name: branchName,
        target: {
          hash: sourceRef.commit_sha
        }
      }
    });

    return this.getBranch(repoUrl, branchName);
  }

  async deleteBranch(repoUrl: string, branchName: string): Promise<void> {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid Bitbucket repository URL: ${repoUrl}`);
    }

    await this.request({
      method: 'DELETE',
      path: `/repositories/${parsed.owner}/${parsed.repo}/refs/branches/${branchName}`
    });
  }

  // =====================================================
  // File Operations
  // =====================================================

  async getFile(repoUrl: string, branch: string, path: string): Promise<FileContent> {
    this.validateFilePath(path);

    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid Bitbucket repository URL: ${repoUrl}`);
    }

    // Get file content (raw)
    const content = await this.request<string>({
      method: 'GET',
      path: `/repositories/${parsed.owner}/${parsed.repo}/src/${branch}/${path}`
    });

    // Get file metadata
    const metadata = await this.request<BitbucketFileContent>({
      method: 'GET',
      path: `/repositories/${parsed.owner}/${parsed.repo}/src/${branch}/${path}`,
      headers: { 'Accept': 'application/json' }
    });

    return {
      path: metadata.path,
      content: typeof content === 'string' ? content : JSON.stringify(content),
      sha: metadata.commit.hash,
      size: metadata.size,
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
      throw new Error(`Invalid Bitbucket repository URL: ${repoUrl}`);
    }

    // Bitbucket uses multipart form data for file operations
    const formData = new FormData();
    formData.append(path, new Blob([content], { type: 'text/plain' }));
    formData.append('message', message);
    formData.append('branch', branch);

    await this.request({
      method: 'POST',
      path: `/repositories/${parsed.owner}/${parsed.repo}/src`,
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

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
    // Bitbucket doesn't require SHA for updates, just overwrite
    return this.createFile(repoUrl, branch, path, content, message);
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
      throw new Error(`Invalid Bitbucket repository URL: ${repoUrl}`);
    }

    const formData = new FormData();
    formData.append('files', path);
    formData.append('message', message);
    formData.append('branch', branch);

    await this.request({
      method: 'POST',
      path: `/repositories/${parsed.owner}/${parsed.repo}/src`,
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
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

    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid Bitbucket repository URL: ${repoUrl}`);
    }

    const formData = new FormData();
    formData.append('message', message);
    formData.append('branch', branch);

    for (const op of operations) {
      if (op.operation === 'delete') {
        formData.append('files', op.path);
      } else {
        formData.append(op.path, new Blob([op.content!], { type: 'text/plain' }));
      }
    }

    await this.request({
      method: 'POST',
      path: `/repositories/${parsed.owner}/${parsed.repo}/src`,
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return this.getLatestCommit(repoUrl, branch);
  }

  // =====================================================
  // Commit Operations
  // =====================================================

  async getCommit(repoUrl: string, sha: string): Promise<Commit> {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid Bitbucket repository URL: ${repoUrl}`);
    }

    const commit = await this.request<BitbucketCommit>({
      method: 'GET',
      path: `/repositories/${parsed.owner}/${parsed.repo}/commit/${sha}`
    });

    return this.mapBitbucketCommitToCommit(commit);
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
      throw new Error(`Invalid Bitbucket repository URL: ${repoUrl}`);
    }

    const queryParams: Record<string, string | number> = {
      pagelen: options?.limit || 30
    };

    // Bitbucket uses 'include' for branch filtering
    queryParams.include = branch;

    const response = await this.request<BitbucketPaginatedResponse<BitbucketCommit>>({
      method: 'GET',
      path: `/repositories/${parsed.owner}/${parsed.repo}/commits`,
      queryParams
    });

    let commits = response.values.map(commit => this.mapBitbucketCommitToCommit(commit));

    // Filter by date if specified (Bitbucket API doesn't support date filtering directly)
    if (options?.since) {
      commits = commits.filter(c => new Date(c.committed_at) >= options.since!);
    }

    if (options?.until) {
      commits = commits.filter(c => new Date(c.committed_at) <= options.until!);
    }

    return commits;
  }

  async compareCommits(
    repoUrl: string,
    baseSha: string,
    headSha: string
  ): Promise<CommitComparison> {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid Bitbucket repository URL: ${repoUrl}`);
    }

    // Get diff stats
    const diffResponse = await this.request<BitbucketPaginatedResponse<BitbucketDiffStat>>({
      method: 'GET',
      path: `/repositories/${parsed.owner}/${parsed.repo}/diffstat/${baseSha}..${headSha}`,
      queryParams: { pagelen: 100 }
    });

    // Get commits between base and head
    const commitsResponse = await this.request<BitbucketPaginatedResponse<BitbucketCommit>>({
      method: 'GET',
      path: `/repositories/${parsed.owner}/${parsed.repo}/commits`,
      queryParams: {
        include: headSha,
        exclude: baseSha,
        pagelen: 100
      }
    });

    const filesChanged: FileChange[] = diffResponse.values.map(stat => ({
      path: stat.new?.path || stat.old?.path || '',
      status: stat.status,
      additions: stat.lines_added,
      deletions: stat.lines_removed,
      changes: stat.lines_added + stat.lines_removed
    }));

    return {
      base_commit: baseSha,
      head_commit: headSha,
      ahead_by: commitsResponse.values.length,
      behind_by: 0, // Bitbucket doesn't provide this directly
      status: commitsResponse.values.length === 0 ? 'identical' : 'ahead',
      commits: commitsResponse.values.map(c => this.mapBitbucketCommitToCommit(c)),
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

    // HTTPS: https://bitbucket.org/owner/repo
    const httpsMatch = normalized.match(/bitbucket\.org[/:]([\w-]+)\/([\w-]+)/);
    if (httpsMatch) {
      return {
        owner: httpsMatch[1],
        repo: httpsMatch[2]
      };
    }

    // SSH: git@bitbucket.org:owner/repo
    const sshMatch = normalized.match(/git@bitbucket\.org:([\w-]+)\/([\w-]+)/);
    if (sshMatch) {
      return {
        owner: sshMatch[1],
        repo: sshMatch[2]
      };
    }

    return null;
  }

  constructRepoUrl(owner: string, repo: string): string {
    return `https://bitbucket.org/${owner}/${repo}`;
  }

  getCommitUrl(repoUrl: string, sha: string): string {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid Bitbucket repository URL: ${repoUrl}`);
    }

    return `https://bitbucket.org/${parsed.owner}/${parsed.repo}/commits/${sha}`;
  }

  getFileUrl(repoUrl: string, branch: string, path: string): string {
    const parsed = this.parseRepoUrl(repoUrl);
    if (!parsed) {
      throw new Error(`Invalid Bitbucket repository URL: ${repoUrl}`);
    }

    return `https://bitbucket.org/${parsed.owner}/${parsed.repo}/src/${branch}/${path}`;
  }

  // =====================================================
  // Helper Methods
  // =====================================================

  /**
   * Get current authenticated user
   */
  private async getCurrentUser(): Promise<BitbucketUser> {
    return this.request<BitbucketUser>({
      method: 'GET',
      path: '/user'
    });
  }

  // =====================================================
  // Mapping Helpers
  // =====================================================

  private mapBitbucketRepositoryToRepository(repo: BitbucketRepository): Repository {
    return {
      id: repo.uuid,
      name: repo.name,
      full_name: repo.full_name,
      url: repo.links.html.href,
      is_private: repo.is_private,
      default_branch: repo.mainbranch?.name || 'master',
      created_at: repo.created_on,
      updated_at: repo.updated_on,
      description: repo.description
    };
  }

  private mapBitbucketCommitToCommit(commit: BitbucketCommit): Commit {
    // Parse author from "raw" format: "Name <email>"
    const authorMatch = commit.author.raw.match(/(.*?)\s*<(.+?)>/);
    const authorName = authorMatch?.[1] || commit.author.user?.display_name || commit.author.raw;
    const authorEmail = authorMatch?.[2];

    return {
      sha: commit.hash,
      message: commit.message,
      author: authorName,
      author_email: authorEmail,
      committed_at: commit.date,
      url: commit.links.html.href
    };
  }
}
