/**
 * Diagram Entity Type Definitions
 * Defines the diagram table structure and related types
 * Based on migration: S_2_2_create_diagrams_and_diagram_datasets_tables.sql
 */

import type { DiagramType, ViewMode, LayoutType, DiagramViewport, DiagramFilters, EdgeRoute } from './diagram';

/**
 * Diagram visibility levels
 */
export type DiagramVisibility = 'public' | 'private' | 'shared';

/**
 * Diagram entity (stored in Supabase diagrams table)
 */
export interface Diagram {
  // Core identifiers
  id: string; // UUID
  account_id: string; // UUID
  workspace_id: string; // UUID

  // Diagram metadata
  name: string;
  description?: string;
  diagram_type: DiagramType; // 'dataset' | 'business_model' | 'lineage' | 'erd'

  // Diagram state
  view_mode: ViewMode; // 'relationships' | 'lineage'
  viewport: DiagramViewport; // {x, y, zoom}
  node_positions: Record<string, { x: number; y: number }>; // {node_id: {x, y}}
  node_expansions: Record<string, boolean>; // {node_id: boolean}
  edge_routes: Record<string, EdgeRoute>; // {edge_id: EdgeRoute}
  filters: DiagramFilters; // Active filters

  // Layout settings
  layout_type?: LayoutType; // 'hierarchical' | 'force' | 'circular' | 'dagre' | 'manual'
  layout_direction?: 'LR' | 'TB' | 'RL' | 'BT'; // Left-Right, Top-Bottom, etc.
  auto_layout: boolean;

  // Ownership and access
  owner_id?: string; // UUID
  visibility: DiagramVisibility;
  is_template: boolean; // Can be used as template

  // Metadata
  tags?: string[];
  metadata?: Record<string, unknown>;

  // Version control
  version: number;
  last_modified_by?: string; // UUID

  // Timestamps
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

/**
 * Diagram creation input
 */
export interface CreateDiagramInput {
  workspace_id: string;
  name: string;
  description?: string;
  diagram_type?: DiagramType;
  view_mode?: ViewMode;
  viewport?: DiagramViewport;
  layout_type?: LayoutType;
  layout_direction?: 'LR' | 'TB' | 'RL' | 'BT';
  visibility?: DiagramVisibility;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Diagram update input
 */
export interface UpdateDiagramInput {
  name?: string;
  description?: string;
  view_mode?: ViewMode;
  viewport?: DiagramViewport;
  node_positions?: Record<string, { x: number; y: number }>;
  node_expansions?: Record<string, boolean>;
  edge_routes?: Record<string, EdgeRoute>;
  filters?: DiagramFilters;
  layout_type?: LayoutType;
  layout_direction?: 'LR' | 'TB' | 'RL' | 'BT';
  auto_layout?: boolean;
  visibility?: DiagramVisibility;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

/**
 * Diagram dataset mapping (stored in diagram_datasets table)
 */
export interface DiagramDataset {
  id: string; // UUID
  diagram_id: string; // UUID
  dataset_id: string; // UUID

  // Location on diagram
  location?: { x: number; y: number };

  // Visual state
  is_expanded: boolean;
  is_highlighted: boolean;
  z_index: number; // Stacking order

  // Metadata
  added_by?: string; // UUID
  added_at: string; // ISO timestamp
  notes?: string; // User notes
}

/**
 * Add dataset to diagram input
 */
export interface AddDatasetToDiagramInput {
  diagram_id: string;
  dataset_id: string;
  location?: { x: number; y: number };
  is_expanded?: boolean;
  notes?: string;
}

/**
 * Update diagram dataset input
 */
export interface UpdateDiagramDatasetInput {
  location?: { x: number; y: number };
  is_expanded?: boolean;
  is_highlighted?: boolean;
  z_index?: number;
  notes?: string;
}

/**
 * Diagram summary (from diagram_summary view)
 */
export interface DiagramSummary {
  id: string;
  account_id: string;
  workspace_id: string;
  name: string;
  description?: string;
  diagram_type: DiagramType;
  visibility: DiagramVisibility;
  owner_id?: string;
  is_template: boolean;
  created_at: string;
  updated_at: string;
  dataset_count: number; // Number of datasets in diagram
  all_tags?: string[];
}

/**
 * Diagram with datasets (joined data)
 */
export interface DiagramWithDatasets extends Diagram {
  datasets: DiagramDataset[];
}

/**
 * Diagram template for creating new diagrams
 */
export interface DiagramTemplate {
  id: string;
  name: string;
  description?: string;
  diagram_type: DiagramType;
  layout_type?: LayoutType;
  layout_direction?: 'LR' | 'TB' | 'RL' | 'BT';
  filters: DiagramFilters;
  tags?: string[];
}

/**
 * Diagram filter options for querying
 */
export interface DiagramQueryFilters {
  workspace_id?: string;
  diagram_type?: DiagramType;
  visibility?: DiagramVisibility;
  is_template?: boolean;
  owner_id?: string;
  tags?: string[];
  search_query?: string;
}

/**
 * Diagram clone input
 */
export interface CloneDiagramInput {
  source_diagram_id: string;
  new_name: string;
  new_description?: string;
  clone_datasets?: boolean; // Whether to clone dataset positions
  target_workspace_id?: string; // If different from source
}

/**
 * Diagram export/import format
 */
export interface DiagramExportData {
  diagram: Omit<Diagram, 'id' | 'account_id' | 'created_at' | 'updated_at' | 'version'>;
  datasets: Array<{
    dataset_id: string;
    location?: { x: number; y: number };
    is_expanded: boolean;
    notes?: string;
  }>;
  export_version: string; // For future compatibility
  exported_at: string;
}

/**
 * Diagram statistics
 */
export interface DiagramStats {
  total_diagrams: number;
  diagrams_by_type: Record<DiagramType, number>;
  total_datasets: number;
  average_datasets_per_diagram: number;
  most_used_datasets: Array<{
    dataset_id: string;
    dataset_name: string;
    usage_count: number;
  }>;
}
