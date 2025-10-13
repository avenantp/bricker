/**
 * Column type definitions for database-first architecture
 * Based on technical specifications in docs/prp/001-technical-specifications-refactored.md
 */

/**
 * Reference type for column-to-column relationships
 */
export type ReferenceType = 'FK' | 'BusinessKey' | 'NaturalKey';

/**
 * Column entity (stored in Supabase)
 */
export interface Column {
  // Core identifiers
  column_id: string; // UUID
  dataset_id: string; // UUID reference to datasets

  // Identity
  fqn: string; // Fully Qualified Name
  name: string;

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
  reference_description?: string;

  // Transformation
  transformation_logic?: string;

  // AI metadata
  ai_confidence_score?: number; // 0-100

  // Position in table
  position?: number;

  // Audit
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Column creation payload
 */
export interface CreateColumnPayload {
  dataset_id: string;
  name: string;
  data_type: string;
  fqn?: string; // Auto-generated if not provided
  description?: string;
  business_name?: string;
  is_primary_key?: boolean;
  is_foreign_key?: boolean;
  is_nullable?: boolean;
  default_value?: string;
  reference_column_id?: string;
  reference_type?: ReferenceType;
  reference_description?: string;
  transformation_logic?: string;
  position?: number;
}

/**
 * Column update payload (partial updates)
 */
export interface UpdateColumnPayload {
  name?: string;
  data_type?: string;
  fqn?: string;
  description?: string;
  business_name?: string;
  is_primary_key?: boolean;
  is_foreign_key?: boolean;
  is_nullable?: boolean;
  default_value?: string;
  reference_column_id?: string;
  reference_type?: ReferenceType;
  reference_description?: string;
  transformation_logic?: string;
  ai_confidence_score?: number;
  position?: number;
}

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
  reference_description?: string;
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
