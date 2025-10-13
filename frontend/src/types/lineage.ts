/**
 * Lineage type definitions for database-first architecture
 * Based on technical specifications in docs/prp/001-technical-specifications-refactored.md
 */

/**
 * Mapping type for source-to-target transformations
 */
export type MappingType = 'Direct' | 'Transform' | 'Derived' | 'Calculated';

/**
 * Lineage type
 */
export type LineageType = 'direct' | 'indirect';

/**
 * Lineage entity (stored in Supabase)
 * Represents column-level data lineage
 */
export interface Lineage {
  // Core identifiers
  lineage_id: string; // UUID
  workspace_id: string; // UUID reference to workspaces

  // Downstream (target)
  downstream_dataset_id: string; // UUID
  downstream_column_id: string; // UUID

  // Upstream (source)
  upstream_dataset_id: string; // UUID
  upstream_column_id: string; // UUID

  // Mapping properties
  mapping_type: MappingType;
  transformation_expression?: string;

  // Lineage metadata
  lineage_type: LineageType;

  // Audit
  created_at: string; // ISO timestamp
}

/**
 * Lineage creation payload
 */
export interface CreateLineagePayload {
  workspace_id: string;
  downstream_dataset_id: string;
  downstream_column_id: string;
  upstream_dataset_id: string;
  upstream_column_id: string;
  mapping_type: MappingType;
  transformation_expression?: string;
  lineage_type?: LineageType;
}

/**
 * Lineage update payload
 */
export interface UpdateLineagePayload {
  mapping_type?: MappingType;
  transformation_expression?: string;
  lineage_type?: LineageType;
}

/**
 * Lineage with dataset and column details (joined data)
 */
export interface LineageWithDetails extends Lineage {
  // Downstream details
  downstream_dataset_name: string;
  downstream_dataset_fqn: string;
  downstream_column_name: string;

  // Upstream details
  upstream_dataset_name: string;
  upstream_dataset_fqn: string;
  upstream_column_name: string;
}

/**
 * Column lineage summary for a specific column
 */
export interface ColumnLineageSummary {
  column_id: string;
  column_name: string;
  dataset_id: string;
  dataset_name: string;

  // Upstream sources (where data comes from)
  upstream_lineages: LineageWithDetails[];

  // Downstream targets (where data flows to)
  downstream_lineages: LineageWithDetails[];
}

/**
 * Dataset lineage summary
 */
export interface DatasetLineageSummary {
  dataset_id: string;
  dataset_name: string;
  dataset_fqn: string;

  // Upstream datasets
  upstream_datasets: Array<{
    dataset_id: string;
    dataset_name: string;
    dataset_fqn: string;
    column_count: number;
  }>;

  // Downstream datasets
  downstream_datasets: Array<{
    dataset_id: string;
    dataset_name: string;
    dataset_fqn: string;
    column_count: number;
  }>;
}

/**
 * Batch lineage operation result
 */
export interface BatchLineageOperationResult {
  successful: string[]; // lineage_ids
  failed: Array<{ lineage_id: string; error: string }>;
}
