import { Octokit } from '@octokit/rest';

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  branch?: string;
}

export interface CommitFileOptions {
  path: string;
  content: string;
  message: string;
  branch?: string;
  sha?: string; // Required for updates
}

export interface GitHubFile {
  path: string;
  content: string;
  sha: string;
  size: number;
}

/**
 * GitHub API client for managing YAML metadata files
 */
export class GitHubClient {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private branch: string;

  constructor(config: GitHubConfig) {
    this.octokit = new Octokit({
      auth: config.token,
    });
    this.owner = config.owner;
    this.repo = config.repo;
    this.branch = config.branch || 'main';
  }

  /**
   * Get a file from the repository
   */
  async getFile(path: string): Promise<GitHubFile | null> {
    try {
      const response = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref: this.branch,
      });

      if ('content' in response.data && typeof response.data.content === 'string') {
        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
        return {
          path: response.data.path,
          content,
          sha: response.data.sha,
          size: response.data.size,
        };
      }

      return null;
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw new Error(`Failed to get file ${path}: ${error.message}`);
    }
  }

  /**
   * List files in a directory
   */
  async listFiles(path: string): Promise<Array<{ name: string; path: string; type: string }>> {
    try {
      const response = await this.octokit.repos.getContent({
        owner: this.owner,
        repo: this.repo,
        path,
        ref: this.branch,
      });

      if (Array.isArray(response.data)) {
        return response.data.map((item) => ({
          name: item.name,
          path: item.path,
          type: item.type,
        }));
      }

      return [];
    } catch (error: any) {
      if (error.status === 404) {
        return [];
      }
      throw new Error(`Failed to list files in ${path}: ${error.message}`);
    }
  }

  /**
   * Create or update a file in the repository
   */
  async commitFile(options: CommitFileOptions): Promise<string> {
    const { path, content, message, branch = this.branch, sha } = options;

    try {
      const response = await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        branch,
        ...(sha && { sha }), // Include sha if updating existing file
      });

      return response.data.commit.sha || '';
    } catch (error: any) {
      throw new Error(`Failed to commit file ${path}: ${error.message}`);
    }
  }

  /**
   * Delete a file from the repository
   */
  async deleteFile(path: string, message: string, sha: string): Promise<void> {
    try {
      await this.octokit.repos.deleteFile({
        owner: this.owner,
        repo: this.repo,
        path,
        message,
        sha,
        branch: this.branch,
      });
    } catch (error: any) {
      throw new Error(`Failed to delete file ${path}: ${error.message}`);
    }
  }

  /**
   * Check if repository exists and is accessible
   */
  async validateConnection(): Promise<boolean> {
    try {
      await this.octokit.repos.get({
        owner: this.owner,
        repo: this.repo,
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get repository information
   */
  async getRepoInfo() {
    try {
      const response = await this.octokit.repos.get({
        owner: this.owner,
        repo: this.repo,
      });

      return {
        name: response.data.name,
        fullName: response.data.full_name,
        description: response.data.description,
        private: response.data.private,
        defaultBranch: response.data.default_branch,
        url: response.data.html_url,
      };
    } catch (error: any) {
      throw new Error(`Failed to get repository info: ${error.message}`);
    }
  }

  /**
   * List branches
   */
  async listBranches(): Promise<string[]> {
    try {
      const response = await this.octokit.repos.listBranches({
        owner: this.owner,
        repo: this.repo,
      });

      return response.data.map((branch) => branch.name);
    } catch (error: any) {
      throw new Error(`Failed to list branches: ${error.message}`);
    }
  }

  /**
   * Create a new branch
   */
  async createBranch(branchName: string, fromBranch: string = this.branch): Promise<void> {
    try {
      // Get the SHA of the source branch
      const refResponse = await this.octokit.git.getRef({
        owner: this.owner,
        repo: this.repo,
        ref: `heads/${fromBranch}`,
      });

      const sha = refResponse.data.object.sha;

      // Create new branch
      await this.octokit.git.createRef({
        owner: this.owner,
        repo: this.repo,
        ref: `refs/heads/${branchName}`,
        sha,
      });
    } catch (error: any) {
      throw new Error(`Failed to create branch ${branchName}: ${error.message}`);
    }
  }
}
