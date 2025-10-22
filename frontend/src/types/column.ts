/**
 * Column type definitions for database-first architecture
 * Based on technical specifications in docs/prp/001-technical-specifications-refactored.md
 */

/**
 * Reference type for column-to-column relationships
 */
export type ReferenceType = 'FK' | 'BusinessKey' | 'NaturalKey';

/**
 * AI suggestions stored in JSONB
 */
export interface AISuggestions {
  business_name?: {
    suggested: string;
    confidence: number;
    reasoning: string;
  };
  description?: {
    suggested: string;
    confidence: number;
    reasoning: string;
  };
}

/**
 * Column entity (stored in Supabase)
 */
export interface Column {
  // Core identifiers
  id: string; // UUID (primary key in database, aliased as column_id in queries)
  dataset_id: string; // UUID reference to datasets

  // Identity
  name: string;
  // Note: fqn (Fully Qualified Name) is computed at runtime, not stored in database

  // Data type
  data_type: string;

  // Documentation
  description?: string;
  business_name?: string;

  // Properties
  is_primary_key: boolean;
  is_foreign_key: boolean;
  is_nullable: boolean;
  default_value?: string;

  // Reference (replaces separate references table)
  reference_column_id?: string; // UUID pointing to another column
  reference_type?: ReferenceType;

  // Transformation
  transformation_logic?: string;

  // AI metadata
  ai_confidence_score?: number; // 0-100
  ai_suggestions?: AISuggestions; // JSONB - AI-generated suggestions
  last_ai_enhancement?: string; // ISO timestamp - when AI last enhanced this column
  custom_metadata?: Record<string, unknown>; // JSONB - custom user-defined metadata

  // Position in table
  ordinal_position?: number;

  // Audit
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Column with computed fields (for UI display)
 */
export interface ColumnWithComputed extends Column {
  fqn: string; // Computed: dataset_fqn.column_name
  dataset_fqn?: string; // From dataset join
}

/**
 * Helper function to compute fully qualified name for a column
 * @param column - Column entity
 * @param datasetFqn - Fully qualified name of the dataset
 * @returns Fully qualified name
 */
export function computeColumnFQN(
  column: Column,
  datasetFqn?: string
): string {
  if (!datasetFqn) {
    // Fallback to just column name if no dataset FQN
    return column.name;
  }

  // Full FQN: dataset_fqn.column_name
  return `${datasetFqn}.${column.name}`;
}

/**
 * Column creation input (used by service layer)
 */
export interface CreateColumnInput {
  dataset_id: string;
  name: string;
  data_type: string;
  description?: string;
  business_name?: string;
  is_primary_key?: boolean;
  is_foreign_key?: boolean;
  is_nullable?: boolean;
  default_value?: string;
  reference_column_id?: string;
  reference_type?: ReferenceType;
  transformation_logic?: string;
  ordinal_position?: number;
}

/**
 * Column creation payload (alias for compatibility)
 */
export type CreateColumnPayload = CreateColumnInput;

/**
 * Column update input (used by service layer)
 */
export interface UpdateColumnInput {
  name?: string;
  data_type?: string;
  description?: string;
  business_name?: string;
  is_primary_key?: boolean;
  is_foreign_key?: boolean;
  is_nullable?: boolean;
  default_value?: string;
  reference_column_id?: string;
  reference_type?: ReferenceType;
  transformation_logic?: string;
  ai_confidence_score?: number;
  ai_suggestions?: AISuggestions;
  last_ai_enhancement?: string;
  custom_metadata?: Record<string, unknown>;
  ordinal_position?: number;
}

/**
 * Column update payload (alias for compatibility)
 */
export type UpdateColumnPayload = UpdateColumnInput;

/**
 * Column with reference details (joined data)
 */
export interface ColumnWithReference extends Column {
  referenced_column?: {
    column_id: string;
    column_name: string;
    dataset_id: string;
    dataset_name: string;
    dataset_fqn: string;
  };
}

/**
 * Column reference information for UI display
 */
export interface ColumnReference {
  source_column_id: string;
  source_column_name: string;
  source_dataset_id: string;
  source_dataset_name: string;
  target_column_id: string;
  target_column_name: string;
  target_dataset_id: string;
  target_dataset_name: string;
  reference_type: ReferenceType;
}

/**
 * Batch column operation result
 */
export interface BatchColumnOperationResult {
  successful: string[]; // column_ids
  failed: Array<{ column_id: string; error: string }>;
}

/**
 * Column import result
 */
export interface ColumnImportResult {
  column: Column;
  warnings: string[];
}
