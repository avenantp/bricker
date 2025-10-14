/**
 * Base Source Control Provider
 *
 * Abstract base class that implements common functionality for all source control providers.
 * Specific providers (GitHub, GitLab, etc.) extend this class and implement provider-specific methods.
 */

import {
  SourceControlCredentials,
  ConnectionTestResult,
  Repository,
  Branch,
  Commit,
  FileContent,
  FileOperation,
  FileChange,
  CommitComparison
} from '@/types/source-control';
import { ISourceControlProvider } from './provider';
import { RateLimiter } from './rate-limiter';

/**
 * HTTP request configuration
 */
interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  body?: any;
  headers?: Record<string, string>;
  queryParams?: Record<string, string | number | boolean>;
}

/**
 * Retry configuration
 */
interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  retryableStatusCodes: number[];
}

/**
 * Base provider configuration
 */
export interface BaseProviderConfig {
  baseUrl: string;
  timeout?: number;
  rateLimiter?: RateLimiter;
  retryConfig?: Partial<RetryConfig>;
}

/**
 * Abstract base class for source control providers
 */
export abstract class BaseSourceControlProvider implements ISourceControlProvider {
  abstract readonly providerName: string;

  protected credentials: SourceControlCredentials | null = null;
  protected baseUrl: string;
  protected timeout: number;
  protected rateLimiter?: RateLimiter;
  protected retryConfig: RetryConfig;

  constructor(config: BaseProviderConfig) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout || 30000;
    this.rateLimiter = config.rateLimiter;
    this.retryConfig = {
      maxRetries: 3,
      initialDelayMs: 1000,
      maxDelayMs: 10000,
      retryableStatusCodes: [429, 500, 502, 503, 504],
      ...config.retryConfig
    };
  }

  // =====================================================
  // Authentication (implemented by base)
  // =====================================================

  async authenticate(credentials: SourceControlCredentials): Promise<void> {
    this.credentials = credentials;

    // Test the connection to verify credentials
    const result = await this.testConnection();
    if (!result.success) {
      this.credentials = null;
      throw new Error(`Authentication failed: ${result.message}`);
    }
  }

  isAuthenticated(): boolean {
    return this.credentials !== null;
  }

  // =====================================================
  // HTTP Request Handling (common implementation)
  // =====================================================

  /**
   * Make an authenticated HTTP request with rate limiting and retry logic
   */
  protected async request<T>(config: RequestConfig): Promise<T> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated. Call authenticate() first.');
    }

    const executeRequest = async (): Promise<T> => {
      return this.executeRequestWithRetry(config);
    };

    // Use rate limiter if available
    if (this.rateLimiter) {
      return this.rateLimiter.enqueue(executeRequest);
    }

    return executeRequest();
  }

  /**
   * Execute request with exponential backoff retry logic
   */
  private async executeRequestWithRetry<T>(config: RequestConfig): Promise<T> {
    let lastError: Error | null = null;
    let delay = this.retryConfig.initialDelayMs;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await this.executeRequest<T>(config);
      } catch (error: any) {
        lastError = error;

        // Check if we should retry
        const shouldRetry =
          attempt < this.retryConfig.maxRetries &&
          error.statusCode &&
          this.retryConfig.retryableStatusCodes.includes(error.statusCode);

        if (!shouldRetry) {
          throw error;
        }

        // Wait before retrying with exponential backoff
        await this.sleep(delay);
        delay = Math.min(delay * 2, this.retryConfig.maxDelayMs);
      }
    }

    throw lastError || new Error('Request failed after retries');
  }

  /**
   * Execute a single HTTP request
   */
  private async executeRequest<T>(config: RequestConfig): Promise<T> {
    const url = this.buildUrl(config.path, config.queryParams);
    const headers = this.buildHeaders(config.headers);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method: config.method,
        headers,
        body: config.body ? JSON.stringify(config.body) : undefined,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw await this.handleErrorResponse(response);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return {} as T;
      }

      const data = await response.json();
      return data as T;
    } catch (error: any) {
      clearTimeout(timeoutId);

      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.timeout}ms`);
      }

      throw error;
    }
  }

  /**
   * Build full URL with query parameters
   */
  private buildUrl(path: string, queryParams?: Record<string, string | number | boolean>): string {
    const url = new URL(path.startsWith('http') ? path : `${this.baseUrl}${path}`);

    if (queryParams) {
      Object.entries(queryParams).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    return url.toString();
  }

  /**
   * Build request headers with authentication
   */
  protected buildHeaders(additionalHeaders?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...additionalHeaders
    };

    if (this.credentials?.access_token) {
      headers['Authorization'] = this.getAuthorizationHeader();
    }

    return headers;
  }

  /**
   * Get authorization header value (override in subclasses if needed)
   */
  protected getAuthorizationHeader(): string {
    return `Bearer ${this.credentials!.access_token}`;
  }

  /**
   * Handle error response and create appropriate error object
   */
  private async handleErrorResponse(response: Response): Promise<Error> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorDetails: any = null;

    try {
      errorDetails = await response.json();
      errorMessage = errorDetails.message || errorDetails.error || errorMessage;
    } catch {
      // Response might not be JSON
    }

    const error: any = new Error(errorMessage);
    error.statusCode = response.status;
    error.details = errorDetails;

    return error;
  }

  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // =====================================================
  // Utility Methods (common implementation)
  // =====================================================

  /**
   * Decode base64 content
   */
  protected decodeBase64(content: string): string {
    try {
      return atob(content);
    } catch (error) {
      throw new Error('Failed to decode base64 content');
    }
  }

  /**
   * Encode content to base64
   */
  protected encodeBase64(content: string): string {
    try {
      return btoa(content);
    } catch (error) {
      throw new Error('Failed to encode content to base64');
    }
  }

  /**
   * Get short SHA (7 characters)
   */
  protected getShortSha(sha: string): string {
    return sha.substring(0, 7);
  }

  /**
   * Validate branch name
   */
  protected validateBranchName(branchName: string): void {
    if (!branchName || branchName.trim().length === 0) {
      throw new Error('Branch name cannot be empty');
    }

    // Git branch naming rules
    const invalidPatterns = [
      /^\./,           // Cannot start with dot
      /\.\.$/,         // Cannot end with double dots
      /\.\./,          // Cannot contain double dots
      /[\s~^:?*\[\\]/, // Cannot contain special characters
      /@{/,            // Cannot contain @{
      /\/$/,           // Cannot end with slash
      /\.lock$/        // Cannot end with .lock
    ];

    for (const pattern of invalidPatterns) {
      if (pattern.test(branchName)) {
        throw new Error(`Invalid branch name: ${branchName}`);
      }
    }
  }

  /**
   * Validate commit message
   */
  protected validateCommitMessage(message: string): void {
    if (!message || message.trim().length === 0) {
      throw new Error('Commit message cannot be empty');
    }

    if (message.length > 50000) {
      throw new Error('Commit message is too long (max 50000 characters)');
    }
  }

  /**
   * Validate file path
   */
  protected validateFilePath(path: string): void {
    if (!path || path.trim().length === 0) {
      throw new Error('File path cannot be empty');
    }

    if (path.startsWith('/') || path.startsWith('\\')) {
      throw new Error('File path cannot start with slash');
    }

    if (path.includes('..')) {
      throw new Error('File path cannot contain ".."');
    }
  }

  /**
   * Normalize repository URL
   */
  protected normalizeRepoUrl(url: string): string {
    // Remove trailing slash
    url = url.replace(/\/$/, '');

    // Remove .git suffix
    url = url.replace(/\.git$/, '');

    return url;
  }

  /**
   * Format date to ISO string
   */
  protected formatDate(date: Date | string): string {
    if (typeof date === 'string') {
      return new Date(date).toISOString();
    }
    return date.toISOString();
  }

  // =====================================================
  // Abstract Methods (must be implemented by subclasses)
  // =====================================================

  abstract testConnection(): Promise<ConnectionTestResult>;

  abstract listRepositories(options?: {
    organization?: string;
    visibility?: 'public' | 'private' | 'all';
    limit?: number;
  }): Promise<Repository[]>;

  abstract getRepository(repoUrl: string): Promise<Repository>;

  abstract createRepository(
    name: string,
    isPrivate: boolean,
    options?: {
      description?: string;
      organization?: string;
      auto_init?: boolean;
    }
  ): Promise<Repository>;

  abstract listBranches(repoUrl: string): Promise<Branch[]>;

  abstract getBranch(repoUrl: string, branchName: string): Promise<Branch>;

  abstract createBranch(
    repoUrl: string,
    branchName: string,
    fromBranch?: string
  ): Promise<Branch>;

  abstract deleteBranch(repoUrl: string, branchName: string): Promise<void>;

  abstract getFile(
    repoUrl: string,
    branch: string,
    path: string
  ): Promise<FileContent>;

  abstract createFile(
    repoUrl: string,
    branch: string,
    path: string,
    content: string,
    message: string
  ): Promise<Commit>;

  abstract updateFile(
    repoUrl: string,
    branch: string,
    path: string,
    content: string,
    message: string,
    sha: string
  ): Promise<Commit>;

  abstract deleteFile(
    repoUrl: string,
    branch: string,
    path: string,
    message: string,
    sha: string
  ): Promise<Commit>;

  abstract batchCommit(
    repoUrl: string,
    branch: string,
    operations: FileOperation[],
    message: string
  ): Promise<Commit>;

  abstract getCommit(repoUrl: string, sha: string): Promise<Commit>;

  abstract listCommits(
    repoUrl: string,
    branch: string,
    options?: {
      since?: Date;
      until?: Date;
      limit?: number;
      author?: string;
    }
  ): Promise<Commit[]>;

  abstract compareCommits(
    repoUrl: string,
    baseSha: string,
    headSha: string
  ): Promise<CommitComparison>;

  abstract getLatestCommit(repoUrl: string, branch: string): Promise<Commit>;

  abstract getChangedFiles(
    repoUrl: string,
    branch: string,
    fromSha: string,
    toSha: string
  ): Promise<FileChange[]>;

  abstract parseRepoUrl(url: string): { owner: string; repo: string } | null;

  abstract constructRepoUrl(owner: string, repo: string): string;

  abstract getCommitUrl(repoUrl: string, sha: string): string;

  abstract getFileUrl(repoUrl: string, branch: string, path: string): string;
}
