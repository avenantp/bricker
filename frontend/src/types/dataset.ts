/**
 * Dataset and related type definitions for database-first architecture
 * Based on technical specifications in docs/prp/001-technical-specifications-refactored.md
 */

import type {
  MedallionLayer,
  EntityType,
  EntitySubtype,
  MaterializationType,
} from './canvas';

/**
 * Dataset metadata (stored in JSONB column)
 */
export interface DatasetMetadata {
  source_system?: string;
  business_owner?: string;
  technical_owner?: string;
  refresh_frequency?: string;
  data_classification?: string;
  retention_days?: number;

  // Custom properties
  custom_properties?: Record<string, unknown>;

  [key: string]: unknown;
}

/**
 * Source control sync status for datasets
 */
export type SyncStatus = 'synced' | 'pending' | 'conflict' | 'error' | 'not_synced';

/**
 * Dataset entity (stored in Supabase)
 */
export interface Dataset {
  // Core identifiers
  id: string; // UUID (primary key in database, aliased as dataset_id in queries)
  account_id: string; // UUID reference to accounts (multi-tenancy)
  workspace_id?: string; // UUID reference to workspaces
  project_id?: string; // UUID reference to projects

  // Identity
  fqn: string; // Fully Qualified Name
  name: string;

  // Classification
  medallion_layer?: MedallionLayer;
  entity_type?: EntityType;
  entity_subtype?: EntitySubtype;
  materialization_type?: MaterializationType;

  // Documentation
  description?: string;
  metadata?: DatasetMetadata;

  // AI metadata
  ai_confidence_score?: number; // 0-100

  // Ownership and Security
  owner_id?: string; // UUID reference to users
  visibility: 'public' | 'private' | 'locked';
  is_locked: boolean;

  // Source control sync tracking
  source_control_file_path?: string;
  source_control_commit_sha?: string;
  has_uncommitted_changes: boolean;
  last_synced_at?: string; // ISO timestamp
  sync_status: SyncStatus;
  sync_error_message?: string;

  // Audit
  created_by?: string; // UUID
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Dataset creation input (used by service layer)
 */
export interface CreateDatasetInput {
  account_id: string;
  workspace_id?: string;
  project_id?: string;
  name: string;
  fqn: string;
  medallion_layer?: MedallionLayer;
  entity_type?: EntityType;
  entity_subtype?: EntitySubtype;
  materialization_type?: MaterializationType;
  description?: string;
  metadata?: DatasetMetadata;
  owner_id?: string;
  visibility?: 'public' | 'private' | 'locked';
}

/**
 * Dataset creation payload (for API calls, includes UI-specific fields)
 */
export interface CreateDatasetPayload extends CreateDatasetInput {
  position?: { x: number; y: number }; // Canvas position (UI only)
}

/**
 * Dataset update input (used by service layer)
 */
export interface UpdateDatasetInput {
  name?: string;
  fqn?: string;
  medallion_layer?: MedallionLayer;
  entity_type?: EntityType;
  entity_subtype?: EntitySubtype;
  materialization_type?: MaterializationType;
  description?: string;
  metadata?: DatasetMetadata;
  ai_confidence_score?: number;
  owner_id?: string;
  visibility?: 'public' | 'private' | 'locked';
  is_locked?: boolean;
}

/**
 * Dataset update payload (alias for compatibility)
 */
export type UpdateDatasetPayload = UpdateDatasetInput;

/**
 * Dataset with canvas position for UI
 */
export interface DatasetWithPosition extends Dataset {
  position: { x: number; y: number };
}

/**
 * Dataset filter options
 */
export interface DatasetFilters {
  medallion_layers?: MedallionLayer[];
  entity_types?: EntityType[];
  entity_subtypes?: EntitySubtype[];
  min_confidence_score?: number;
  search_query?: string;
  sync_status?: SyncStatus[];
  show_uncommitted_only?: boolean;
}

/**
 * Dataset import result
 */
export interface DatasetImportResult {
  dataset: Dataset;
  imported_columns_count: number;
  skipped_columns_count: number;
  errors: string[];
}

/**
 * Batch dataset operation result
 */
export interface BatchDatasetOperationResult {
  successful: string[]; // dataset_ids
  failed: Array<{ dataset_id: string; error: string }>;
}

/**
 * Conflict resolution strategy
 */
export type ConflictResolutionStrategy = 'ours' | 'theirs' | 'manual';

/**
 * Dataset version for conflict comparison
 */
export interface DatasetVersion {
  dataset: Dataset;
  commit_sha: string;
  commit_message: string;
  commit_author: string;
  commit_timestamp: string;
}

/**
 * Conflict details for a dataset
 */
export interface DatasetConflict {
  dataset_id: string;
  fqn: string;
  our_version: DatasetVersion;
  their_version: DatasetVersion;
  base_version?: DatasetVersion; // Common ancestor for three-way merge
  conflict_fields: string[]; // List of fields that differ
}

/**
 * Conflict resolution result
 */
export interface ConflictResolutionResult {
  resolved: boolean;
  merged_dataset?: Dataset;
  strategy_used: ConflictResolutionStrategy;
  conflicts_resolved: number;
  conflicts_remaining: number;
}

/**
 * Uncommitted change summary for a dataset
 */
export interface UncommittedChangeSummary {
  dataset_id: string;
  dataset_name: string;
  change_count: number;
  entity_types: Array<'dataset' | 'column' | 'lineage'>;
  last_changed_at: string;
}

/**
 * Source control provider types
 */
export type SourceControlProvider = 'github' | 'gitlab' | 'bitbucket' | 'azure_devops';

/**
 * Source control commit record
 */
export interface SourceControlCommit {
  id: string;
  dataset_id: string;
  workspace_id: string;
  commit_sha: string;
  commit_message: string;
  commit_author: string; // User ID
  committed_at: string; // ISO timestamp
  file_path: string;
  created_at: string;
}
