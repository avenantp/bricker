/**
 * Source Control Provider Interface
 *
 * This interface defines the contract that all source control providers must implement.
 * It provides a unified API for interacting with different source control systems
 * (GitHub, GitLab, Bitbucket, Azure DevOps).
 */

import {
  SourceControlCredentials,
  Repository,
  Branch,
  Commit,
  FileContent,
  FileChange,
  CommitComparison,
  ConnectionTestResult,
  FileOperation
} from '@/types/source-control';

/**
 * Abstract base interface for all source control providers
 */
export interface ISourceControlProvider {
  /**
   * Provider name (e.g., 'github', 'gitlab')
   */
  readonly providerName: string;

  // =====================================================
  // Authentication
  // =====================================================

  /**
   * Authenticate with the provider using credentials
   * @param credentials Provider-specific credentials
   * @returns Promise that resolves when authentication is successful
   * @throws SourceControlConnectionError if authentication fails
   */
  authenticate(credentials: SourceControlCredentials): Promise<void>;

  /**
   * Test the connection to verify credentials and access
   * @returns Connection test result with detailed status
   */
  testConnection(): Promise<ConnectionTestResult>;

  /**
   * Check if the provider is currently authenticated
   * @returns True if authenticated
   */
  isAuthenticated(): boolean;

  // =====================================================
  // Repository Operations
  // =====================================================

  /**
   * List all repositories accessible to the authenticated user
   * @param options Optional filters (e.g., organization, visibility)
   * @returns Array of repositories
   */
  listRepositories(options?: {
    organization?: string;
    visibility?: 'public' | 'private' | 'all';
    limit?: number;
  }): Promise<Repository[]>;

  /**
   * Get details of a specific repository
   * @param repoUrl Repository URL
   * @returns Repository details
   * @throws Error if repository not found
   */
  getRepository(repoUrl: string): Promise<Repository>;

  /**
   * Create a new repository
   * @param name Repository name
   * @param isPrivate Whether the repository should be private
   * @param options Additional options (description, etc.)
   * @returns Created repository
   */
  createRepository(
    name: string,
    isPrivate: boolean,
    options?: {
      description?: string;
      organization?: string;
      auto_init?: boolean;
    }
  ): Promise<Repository>;

  // =====================================================
  // Branch Operations
  // =====================================================

  /**
   * List all branches in a repository
   * @param repoUrl Repository URL
   * @returns Array of branches
   */
  listBranches(repoUrl: string): Promise<Branch[]>;

  /**
   * Get details of a specific branch
   * @param repoUrl Repository URL
   * @param branchName Branch name
   * @returns Branch details
   * @throws Error if branch not found
   */
  getBranch(repoUrl: string, branchName: string): Promise<Branch>;

  /**
   * Create a new branch
   * @param repoUrl Repository URL
   * @param branchName New branch name
   * @param fromBranch Source branch name (defaults to default branch)
   * @returns Created branch
   */
  createBranch(
    repoUrl: string,
    branchName: string,
    fromBranch?: string
  ): Promise<Branch>;

  /**
   * Delete a branch
   * @param repoUrl Repository URL
   * @param branchName Branch name to delete
   */
  deleteBranch(repoUrl: string, branchName: string): Promise<void>;

  // =====================================================
  // File Operations
  // =====================================================

  /**
   * Get file content from repository
   * @param repoUrl Repository URL
   * @param branch Branch name
   * @param path File path
   * @returns File content
   * @throws Error if file not found
   */
  getFile(repoUrl: string, branch: string, path: string): Promise<FileContent>;

  /**
   * Create a new file in the repository
   * @param repoUrl Repository URL
   * @param branch Branch name
   * @param path File path
   * @param content File content
   * @param message Commit message
   * @returns Commit information
   */
  createFile(
    repoUrl: string,
    branch: string,
    path: string,
    content: string,
    message: string
  ): Promise<Commit>;

  /**
   * Update an existing file in the repository
   * @param repoUrl Repository URL
   * @param branch Branch name
   * @param path File path
   * @param content New file content
   * @param message Commit message
   * @param sha Current file SHA (for conflict detection)
   * @returns Commit information
   */
  updateFile(
    repoUrl: string,
    branch: string,
    path: string,
    content: string,
    message: string,
    sha: string
  ): Promise<Commit>;

  /**
   * Delete a file from the repository
   * @param repoUrl Repository URL
   * @param branch Branch name
   * @param path File path
   * @param message Commit message
   * @param sha Current file SHA
   * @returns Commit information
   */
  deleteFile(
    repoUrl: string,
    branch: string,
    path: string,
    message: string,
    sha: string
  ): Promise<Commit>;

  /**
   * Perform multiple file operations in a single commit
   * @param repoUrl Repository URL
   * @param branch Branch name
   * @param operations Array of file operations
   * @param message Commit message
   * @returns Commit information
   */
  batchCommit(
    repoUrl: string,
    branch: string,
    operations: FileOperation[],
    message: string
  ): Promise<Commit>;

  // =====================================================
  // Commit Operations
  // =====================================================

  /**
   * Get details of a specific commit
   * @param repoUrl Repository URL
   * @param sha Commit SHA
   * @returns Commit details
   */
  getCommit(repoUrl: string, sha: string): Promise<Commit>;

  /**
   * List commits in a branch
   * @param repoUrl Repository URL
   * @param branch Branch name
   * @param options Optional filters (since date, limit, etc.)
   * @returns Array of commits
   */
  listCommits(
    repoUrl: string,
    branch: string,
    options?: {
      since?: Date;
      until?: Date;
      limit?: number;
      author?: string;
    }
  ): Promise<Commit[]>;

  /**
   * Compare two commits to see differences
   * @param repoUrl Repository URL
   * @param baseSha Base commit SHA
   * @param headSha Head commit SHA
   * @returns Comparison result
   */
  compareCommits(
    repoUrl: string,
    baseSha: string,
    headSha: string
  ): Promise<CommitComparison>;

  /**
   * Get the latest commit on a branch
   * @param repoUrl Repository URL
   * @param branch Branch name
   * @returns Latest commit
   */
  getLatestCommit(repoUrl: string, branch: string): Promise<Commit>;

  /**
   * Get list of files changed between two commits
   * @param repoUrl Repository URL
   * @param branch Branch name
   * @param fromSha Starting commit SHA
   * @param toSha Ending commit SHA
   * @returns Array of file changes
   */
  getChangedFiles(
    repoUrl: string,
    branch: string,
    fromSha: string,
    toSha: string
  ): Promise<FileChange[]>;

  // =====================================================
  // Utility Methods
  // =====================================================

  /**
   * Parse repository URL into components
   * @param url Repository URL
   * @returns Parsed components (owner, repo, etc.)
   */
  parseRepoUrl(url: string): { owner: string; repo: string } | null;

  /**
   * Construct repository URL from components
   * @param owner Repository owner
   * @param repo Repository name
   * @returns Full repository URL
   */
  constructRepoUrl(owner: string, repo: string): string;

  /**
   * Get the web URL for a commit
   * @param repoUrl Repository URL
   * @param sha Commit SHA
   * @returns Web URL to view commit
   */
  getCommitUrl(repoUrl: string, sha: string): string;

  /**
   * Get the web URL for a file
   * @param repoUrl Repository URL
   * @param branch Branch name
   * @param path File path
   * @returns Web URL to view file
   */
  getFileUrl(repoUrl: string, branch: string, path: string): string;
}

/**
 * Provider-specific options that can be passed during initialization
 */
export interface ProviderOptions {
  /**
   * Base API URL (useful for self-hosted instances)
   */
  baseUrl?: string;

  /**
   * API version (if applicable)
   */
  apiVersion?: string;

  /**
   * Request timeout in milliseconds
   */
  timeout?: number;

  /**
   * Custom headers to include in all requests
   */
  headers?: Record<string, string>;

  /**
   * Rate limit configuration
   */
  rateLimit?: {
    maxRequests: number;
    perSeconds: number;
  };

  /**
   * Retry configuration
   */
  retry?: {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
  };
}
