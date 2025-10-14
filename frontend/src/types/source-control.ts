/**
 * Source Control integration TypeScript types and interfaces
 * Based on specification: docs/prp/021-project-workspaces-specification.md
 */

import { SourceControlProvider, SourceControlConnectionStatus, SourceControlSyncStatus } from './workspace';

// Re-export types from workspace for convenience
export { SourceControlProvider, SourceControlConnectionStatus, SourceControlSyncStatus } from './workspace';

// =====================================================
// Credentials and Configuration
// =====================================================

/**
 * Source control credentials
 */
export interface SourceControlCredentials {
  provider: SourceControlProvider;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  username?: string;
}

/**
 * Source control connection configuration
 */
export interface SourceControlConnectionConfig {
  provider: SourceControlProvider;
  credentials: SourceControlCredentials;
  repo_url: string;
  branch: string;
  create_if_not_exists?: boolean;
}

/**
 * Connection test result
 */
export interface ConnectionTestResult {
  connected: boolean;
  repo_exists: boolean;
  branch_exists: boolean;
  has_access: boolean;
  error?: string;
}

// =====================================================
// Repository Types
// =====================================================

/**
 * Repository information
 */
export interface Repository {
  id: string;
  name: string;
  full_name: string;
  url: string;
  is_private: boolean;
  default_branch: string;
  created_at: string;
  updated_at: string;
}

/**
 * Branch information
 */
export interface Branch {
  name: string;
  commit_sha: string;
  protected: boolean;
  url?: string;
}

// =====================================================
// Commit Types
// =====================================================

/**
 * Commit information
 */
export interface Commit {
  sha: string;
  message: string;
  author: string;
  author_email?: string;
  committed_at: string;
  url?: string;
  files_changed?: FileChange[];
}

/**
 * File change information
 */
export interface FileChange {
  path: string;
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions?: number;
  deletions?: number;
  previous_path?: string;
  dataset_id?: string;
}

/**
 * File content
 */
export interface FileContent {
  path: string;
  content: string;
  sha: string;
  size: number;
  encoding?: string;
}

/**
 * Commit comparison
 */
export interface CommitComparison {
  base_commit: string;
  head_commit: string;
  ahead_by: number;
  behind_by: number;
  files: FileChange[];
  total_commits: number;
}

// =====================================================
// Sync Operation Types
// =====================================================

/**
 * Commit result
 */
export interface CommitResult {
  success: boolean;
  commit_sha?: string;
  files_committed: number;
  commit_url?: string;
  error?: string;
}

/**
 * Sync result
 */
export interface SyncResult {
  status: 'up_to_date' | 'synced' | 'conflicts';
  datasets_updated: number;
  datasets_added: number;
  datasets_deleted: number;
  conflicts: Conflict[];
  commit_sha?: string;
  updated: any[]; // Dataset objects
}

/**
 * Uncommitted change
 */
export interface UncommittedChange {
  dataset_id: string;
  dataset_name: string;
  change_count: number;
  changes: DatasetChange[];
}

/**
 * Dataset change detail
 */
export interface DatasetChange {
  field: string;
  old_value: any;
  new_value: any;
  changed_at: string;
  changed_by: string;
}

// =====================================================
// Conflict Resolution
// =====================================================

/**
 * Conflict resolution strategy
 */
export enum ConflictResolutionStrategy {
  Ours = 'ours',     // Keep local changes
  Theirs = 'theirs', // Keep remote changes
  Manual = 'manual'  // Manual field-by-field resolution
}

/**
 * Conflict information
 */
export interface Conflict {
  dataset_id: string;
  dataset_name: string;
  conflicting_fields: ConflictingField[];
  local_commit_sha?: string;
  remote_commit_sha: string;
}

/**
 * Conflicting field
 */
export interface ConflictingField {
  field: string;
  local_value: any;
  remote_value: any;
  base_value?: any; // Common ancestor value
}

/**
 * Conflict resolution
 */
export interface ConflictResolution {
  dataset_id: string;
  strategy: ConflictResolutionStrategy;
  manual_resolutions?: Record<string, any>; // field_name -> chosen_value
}

// =====================================================
// Source Control Status
// =====================================================

/**
 * Comprehensive source control status
 */
export interface SourceControlStatus {
  connection_status: SourceControlConnectionStatus;
  sync_status?: SourceControlSyncStatus;
  uncommitted_changes: number;
  unpulled_commits: number;
  last_synced_at: string | null;
  latest_commit?: Commit;
  branch: string | null;
  repo_url: string | null;
  provider: SourceControlProvider | null;
}

// =====================================================
// API Operation Types
// =====================================================

/**
 * Parameters for committing changes
 */
export interface CommitParams {
  workspace_id: string;
  message: string;
  dataset_ids?: string[]; // Optional: commit specific datasets
}

/**
 * Parameters for syncing from source control
 */
export interface SyncParams {
  workspace_id: string;
  force?: boolean; // Force sync even if conflicts
}

/**
 * Parameters for resolving conflicts
 */
export interface ResolveConflictParams {
  workspace_id: string;
  dataset_id: string;
  strategy: ConflictResolutionStrategy;
  manual_resolutions?: Record<string, any>;
}

// =====================================================
// File Operation Types
// =====================================================

/**
 * File operation for batch commits
 */
export interface FileOperation {
  type: 'create' | 'update' | 'delete';
  path: string;
  content?: string;
  previous_sha?: string;
  message?: string;
}

/**
 * Batch commit request
 */
export interface BatchCommitRequest {
  repo_url: string;
  branch: string;
  operations: FileOperation[];
  commit_message: string;
}

// =====================================================
// Rate Limiting
// =====================================================

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset_at: string;
  used: number;
}

/**
 * Rate limit status
 */
export interface RateLimitStatus {
  core: RateLimitInfo;
  search?: RateLimitInfo;
  graphql?: RateLimitInfo;
}

// =====================================================
// Error Types
// =====================================================

/**
 * Source control error
 */
export class SourceControlError extends Error {
  constructor(
    message: string,
    public provider: SourceControlProvider,
    public code?: string,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'SourceControlError';
  }
}

/**
 * Connection error
 */
export class SourceControlConnectionError extends SourceControlError {
  constructor(message: string, provider: SourceControlProvider) {
    super(message, provider);
    this.name = 'SourceControlConnectionError';
  }
}

/**
 * Sync error
 */
export class SourceControlSyncError extends SourceControlError {
  constructor(
    message: string,
    provider: SourceControlProvider,
    public details?: any
  ) {
    super(message, provider);
    this.name = 'SourceControlSyncError';
  }
}

/**
 * Conflict error
 */
export class ConflictError extends Error {
  constructor(
    message: string,
    public conflicts: Conflict[]
  ) {
    super(message);
    this.name = 'ConflictError';
  }
}

// =====================================================
// Helpers and Utilities
// =====================================================

/**
 * Check if error is a source control error
 */
export function isSourceControlError(error: any): error is SourceControlError {
  return error instanceof SourceControlError;
}

/**
 * Check if error is a connection error
 */
export function isConnectionError(error: any): error is SourceControlConnectionError {
  return error instanceof SourceControlConnectionError;
}

/**
 * Check if error is a sync error
 */
export function isSyncError(error: any): error is SourceControlSyncError {
  return error instanceof SourceControlSyncError;
}

/**
 * Check if error is a conflict error
 */
export function isConflictError(error: any): error is ConflictError {
  return error instanceof ConflictError;
}

/**
 * Parse repository URL
 */
export function parseRepoUrl(url: string): { owner: string; repo: string; provider?: SourceControlProvider } | null {
  // GitHub: https://github.com/owner/repo or git@github.com:owner/repo.git
  const githubHttps = url.match(/github\.com[/:]([\w-]+)\/([\w-]+)(\.git)?/);
  if (githubHttps) {
    return { owner: githubHttps[1], repo: githubHttps[2], provider: SourceControlProvider.GitHub };
  }

  // GitLab: https://gitlab.com/owner/repo or git@gitlab.com:owner/repo.git
  const gitlabHttps = url.match(/gitlab\.com[/:]([\w-]+)\/([\w-]+)(\.git)?/);
  if (gitlabHttps) {
    return { owner: gitlabHttps[1], repo: gitlabHttps[2], provider: SourceControlProvider.GitLab };
  }

  // Bitbucket: https://bitbucket.org/owner/repo or git@bitbucket.org:owner/repo.git
  const bitbucketHttps = url.match(/bitbucket\.org[/:]([\w-]+)\/([\w-]+)(\.git)?/);
  if (bitbucketHttps) {
    return { owner: bitbucketHttps[1], repo: bitbucketHttps[2], provider: SourceControlProvider.Bitbucket };
  }

  return null;
}

/**
 * Validate branch name
 */
export function validateBranchName(branch: string): { valid: boolean; error?: string } {
  if (!branch || branch.length === 0) {
    return { valid: false, error: 'Branch name cannot be empty' };
  }

  if (branch.length > 255) {
    return { valid: false, error: 'Branch name must not exceed 255 characters' };
  }

  // Git branch name rules
  if (branch.startsWith('.') || branch.endsWith('.')) {
    return { valid: false, error: 'Branch name cannot start or end with a dot' };
  }

  if (branch.includes('..')) {
    return { valid: false, error: 'Branch name cannot contain consecutive dots' };
  }

  if (!/^[a-zA-Z0-9\/_\-\.]+$/.test(branch)) {
    return { valid: false, error: 'Branch name contains invalid characters' };
  }

  return { valid: true };
}

/**
 * Get commit short SHA (first 7 characters)
 */
export function getShortSha(sha: string): string {
  return sha.substring(0, 7);
}

/**
 * Get relative time string
 */
export function getRelativeTime(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return `${seconds} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}
