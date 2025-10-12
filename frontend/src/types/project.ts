/**
 * Project-related TypeScript types and interfaces
 * Based on supabase/migrations/001_initial_schema.sql
 */

/**
 * Project type enumeration
 */
export type ProjectType = 'Standard' | 'DataVault' | 'Dimensional';

/**
 * Medallion layer configuration
 */
export interface MedallionLayersConfig {
  enabled: boolean;
  layers?: {
    bronze?: boolean;
    silver?: boolean;
    gold?: boolean;
  };
}

/**
 * Data Vault preferences
 */
export interface DataVaultPreferences {
  use_hash_keys?: boolean;
  load_date_tracking?: boolean;
  record_source_tracking?: boolean;
  multi_active_satellites?: boolean;
  business_vault_enabled?: boolean;
}

/**
 * Dimensional modeling preferences
 */
export interface DimensionalPreferences {
  slowly_changing_dimensions?: {
    type_1?: boolean;
    type_2?: boolean;
    type_3?: boolean;
  };
  surrogate_key_strategy?: 'auto_increment' | 'hash' | 'uuid';
  fact_table_grain?: string;
  conform_dimensions?: boolean;
}

/**
 * Project configuration (JSONB field)
 */
export interface ProjectConfiguration {
  medallion_layers_enabled?: boolean;
  medallion_layers?: MedallionLayersConfig;
  data_vault_preferences?: DataVaultPreferences;
  dimensional_preferences?: DimensionalPreferences;
  default_catalog?: string;
  default_schema?: string;
  [key: string]: unknown; // Allow additional properties
}

/**
 * Project entity (matches database table)
 */
export interface Project {
  id: string; // UUID
  workspace_id: string; // UUID (FK)
  name: string;
  description: string | null;
  project_type: ProjectType;
  configuration: ProjectConfiguration;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Project creation payload (without generated fields)
 */
export interface CreateProjectPayload {
  workspace_id: string;
  name: string;
  description?: string;
  project_type: ProjectType;
  configuration?: ProjectConfiguration;
}

/**
 * Project update payload (partial updates)
 */
export interface UpdateProjectPayload {
  name?: string;
  description?: string;
  project_type?: ProjectType;
  configuration?: ProjectConfiguration;
}

/**
 * Project with additional computed properties for UI
 */
export interface ProjectWithMetadata extends Project {
  data_model_count?: number;
  last_modified_by?: string;
  is_favorite?: boolean;
}

/**
 * Project list filters
 */
export interface ProjectFilters {
  workspace_id?: string;
  project_type?: ProjectType;
  search?: string; // Search in name/description
  sort_by?: 'name' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

/**
 * Project deletion result
 */
export interface ProjectDeletionInfo {
  project: Project;
  data_models_count: number;
  uuid_registry_count: number;
  has_dependencies: boolean;
}
