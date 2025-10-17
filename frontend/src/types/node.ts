/**
 * Node and NodeItem type definitions for GitHub-stored metadata
 * Based on technical specifications in docs/prp/001-technical-specifications.md
 */

import type {
  MedallionLayer,
  DatasetType,
  RelationshipType,
  Cardinality,
} from './canvas';

/**
 * Mapping type for source-to-target transformations
 */
export type MappingType = 'Direct' | 'Transform' | 'Derived' | 'Calculated';

/**
 * Source mapping for a NodeItem
 * Many-to-one: Multiple sources can map to one target
 */
export interface SourceMapping {
  source_node_uuid: string;
  source_nodeitem_uuid: string;
  mapping_type: MappingType;
  transformation_expression?: string;
}

/**
 * Target mapping for a NodeItem
 * One-to-many: One source can map to multiple targets
 */
export interface TargetMapping {
  target_node_uuid: string;
  target_nodeitem_uuid: string;
  mapping_type: MappingType;
}

/**
 * Relationship definition for a NodeItem
 */
export interface Relationship {
  related_node_uuid: string;
  related_nodeitem_uuid: string;
  relationship_type: RelationshipType;
  cardinality: Cardinality;
}

/**
 * NodeItem entity (Column/Attribute)
 * Stored within Node in GitHub YAML
 */
export interface NodeItem {
  // Identifiers
  uuid: string;
  fqn: string; // Fully Qualified Name
  node_uuid: string; // Parent node UUID

  // Basic properties
  name: string;
  data_type: string;
  description?: string;
  business_name?: string;

  // Column properties
  is_primary_key: boolean;
  is_foreign_key: boolean;
  is_nullable: boolean;
  default_value?: string;

  // Transformation
  transformation_logic?: string;

  // AI confidence
  ai_confidence_score?: number; // 0-100

  // Mappings
  source_mappings: SourceMapping[];
  target_mappings: TargetMapping[];

  // Relationships
  relationships: Relationship[];

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Node metadata (stored in GitHub YAML)
 */
export interface NodeMetadata {
  source_system?: string;
  business_owner?: string;
  technical_owner?: string;
  refresh_frequency?: string;

  // Column definitions
  columns?: Array<{
    name: string;
    type: string;
    description?: string;
  }>;

  // Key definitions
  primary_keys?: string[];
  foreign_keys?: Array<{
    column: string;
    references: string;
  }>;
  business_keys?: string[];
  natural_keys?: string[];

  // Optimization hints
  partitioned_by?: string[];
  clustered_by?: string[];

  // Tagging
  tags?: string[];

  // Custom properties
  [key: string]: unknown;
}

/**
 * Node entity (stored in GitHub YAML)
 */
export interface Node {
  // Core identifiers
  uuid: string;
  fqn: string; // Fully Qualified Name
  project_id: string;

  // Basic properties
  name: string;
  medallion_layer: MedallionLayer;
  dataset_type: DatasetType;
  description?: string;

  // Metadata
  metadata: NodeMetadata;

  // AI confidence
  ai_confidence_score?: number; // 0-100

  // Child items
  node_items: NodeItem[];

  // Git tracking
  git_commit_hash?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Node creation payload (without generated fields)
 */
export interface CreateNodePayload {
  project_id: string;
  name: string;
  medallion_layer: MedallionLayer;
  dataset_type: DatasetType;
  description?: string;
  metadata?: NodeMetadata;
  position?: { x: number; y: number }; // Canvas position
}

/**
 * Node update payload (partial updates)
 */
export interface UpdateNodePayload {
  name?: string;
  medallion_layer?: MedallionLayer;
  dataset_type?: DatasetType;
  description?: string;
  metadata?: NodeMetadata;
  ai_confidence_score?: number;
}

/**
 * NodeItem creation payload
 */
export interface CreateNodeItemPayload {
  node_uuid: string;
  name: string;
  data_type: string;
  description?: string;
  business_name?: string;
  is_primary_key?: boolean;
  is_foreign_key?: boolean;
  is_nullable?: boolean;
  default_value?: string;
  transformation_logic?: string;
}

/**
 * NodeItem update payload
 */
export interface UpdateNodeItemPayload {
  name?: string;
  data_type?: string;
  description?: string;
  business_name?: string;
  is_primary_key?: boolean;
  is_foreign_key?: boolean;
  is_nullable?: boolean;
  default_value?: string;
  transformation_logic?: string;
  ai_confidence_score?: number;
}

/**
 * Node with canvas position for UI
 */
export interface NodeWithPosition extends Node {
  position: { x: number; y: number };
}

/**
 * Node sync status
 */
export type NodeSyncStatus = 'synced' | 'pending' | 'error' | 'conflict';

/**
 * Node state tracking (stored in Supabase)
 */
export interface NodeState {
  uuid: string;
  project_id: string;
  fqn: string;
  github_path: string;
  github_sha: string;
  sync_status: NodeSyncStatus;
  last_synced_at: string;
  error_message?: string;
}

/**
 * Node filter options
 */
export interface NodeFilters {
  medallion_layers?: MedallionLayer[];
  dataset_types?: DatasetType[];
  min_confidence_score?: number;
  show_public_nodes?: boolean;
  search_query?: string;
}

/**
 * Node import result
 */
export interface NodeImportResult {
  node: Node;
  imported_items_count: number;
  skipped_items_count: number;
  errors: string[];
}

/**
 * Batch node operation result
 */
export interface BatchNodeOperationResult {
  successful: string[]; // UUIDs
  failed: Array<{ uuid: string; error: string }>;
}

/**
 * Conflict resolution strategy
 */
export type ConflictResolutionStrategy = 'ours' | 'theirs' | 'manual';

/**
 * Node version for conflict comparison
 */
export interface NodeVersion {
  node: Node;
  commit_sha: string;
  commit_message: string;
  commit_author: string;
  commit_timestamp: string;
}

/**
 * Conflict details for a node
 */
export interface NodeConflict {
  uuid: string;
  fqn: string;
  our_version: NodeVersion;
  their_version: NodeVersion;
  base_version?: NodeVersion; // Common ancestor for three-way merge
  conflict_fields: string[]; // List of fields that differ
}

/**
 * Conflict resolution result
 */
export interface ConflictResolutionResult {
  resolved: boolean;
  merged_node?: Node;
  strategy_used: ConflictResolutionStrategy;
  conflicts_resolved: number;
  conflicts_remaining: number;
}
