/**
 * Diagram View Type Definitions
 * Based on specification: docs/prp/051-dataset-diagram-view-specification.md
 */

import type { Node, Edge, Viewport } from '@xyflow/react';
import type {
  MedallionLayer,
  EntityType,
  EntitySubtype,
  RelationshipType,
  Cardinality,
} from './canvas';

// =====================================================
// View Modes
// =====================================================

export type ViewMode = 'relationships' | 'lineage';

export type DiagramType = 'dataset' | 'business_model' | 'lineage';

// =====================================================
// Node Data Extensions
// =====================================================

/**
 * Extended dataset node data for diagram view
 */
export interface DatasetNodeData {
  // Core identifiers
  dataset_id: string;
  name: string;
  fqn: string;

  // Classification
  medallion_layer: MedallionLayer;
  entity_type: EntityType;
  entity_subtype?: EntitySubtype;
  description?: string;

  // Visual state
  isExpanded: boolean;
  isHighlighted: boolean;
  highlightType?: 'upstream' | 'downstream' | 'selected';

  // Columns (when expanded)
  columns?: Column[];

  // Stats
  columnCount: number;
  relationshipCount: number;
  lineageCount: { upstream: number; downstream: number };

  // AI metadata
  ai_confidence_score?: number;

  // Sync status
  sync_status?: 'synced' | 'pending' | 'conflict' | 'error';
  has_uncommitted_changes?: boolean;
}

/**
 * Column definition for expanded nodes
 */
export interface Column {
  column_id: string;
  name: string;
  data_type: string;
  description?: string;
  business_name?: string;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  is_nullable: boolean;
  default_value?: string;
  position?: number;

  // Reference information
  reference_column_id?: string;
  reference_type?: RelationshipType;
  reference_description?: string;

  // Transformation
  transformation_logic?: string;

  // AI confidence
  ai_confidence_score?: number;
}

/**
 * React Flow Node type with diagram data
 */
export type DiagramNode = Node<DatasetNodeData>;

// =====================================================
// Edge Data Extensions
// =====================================================

/**
 * Mapping type for lineage edges
 */
export type MappingType = 'Direct' | 'Transform' | 'Derived' | 'Calculated';

/**
 * Edge route information
 */
export interface EdgeRoute {
  edge_id: string;
  path: string; // SVG path
  controlPoints: { x: number; y: number }[];
  alignmentType: 'straight' | 'bezier' | 'step' | 'smooth-step';
  userModified: boolean; // Has user manually adjusted?
}

/**
 * Relationship edge data
 */
export interface RelationshipEdgeData {
  relationship_type: RelationshipType;
  cardinality: Cardinality;
  source_columns?: string[]; // Column IDs
  target_columns?: string[]; // Column IDs
  description?: string;

  // Custom routing
  route?: EdgeRoute;
}

/**
 * Lineage edge data
 */
export interface LineageEdgeData {
  mapping_type: MappingType;
  transformation_expression?: string;
  source_column_id?: string;
  target_column_id?: string;

  // Custom routing
  route?: EdgeRoute;
}

/**
 * React Flow Edge type with diagram data
 */
export type DiagramEdge = Edge<RelationshipEdgeData | LineageEdgeData>;

// =====================================================
// Diagram State
// =====================================================

/**
 * Diagram viewport state
 */
export interface DiagramViewport {
  x: number;
  y: number;
  zoom: number;
}

/**
 * Diagram filter options
 */
export interface DiagramFilters {
  medallionLayers: MedallionLayer[];
  entityTypes: EntityType[];
  entitySubtypes: EntitySubtype[];
  hasRelationships?: boolean;
  hasLineage?: boolean;
  aiConfidenceMin?: number; // 0-100
  syncStatus?: ('synced' | 'pending' | 'conflict' | 'error')[];
  searchQuery?: string;
}

/**
 * Complete diagram state for persistence
 */
export interface DiagramState {
  workspace_id: string;
  diagram_id: string;
  diagram_type: DiagramType;
  view_mode: ViewMode;
  viewport: DiagramViewport;
  node_positions: Record<string, { x: number; y: number }>;
  node_expansions: Record<string, boolean>;
  edge_routes: Record<string, EdgeRoute>;
  filters: DiagramFilters;
  last_saved: string;
  version: number;
}

/**
 * Diagram state from database
 */
export interface DiagramStateRecord {
  id: string;
  account_id: string;
  workspace_id: string;
  diagram_type: DiagramType;
  view_mode: ViewMode;
  viewport: DiagramViewport;
  node_positions: Record<string, { x: number; y: number }>;
  node_expansions: Record<string, boolean>;
  edge_routes: Record<string, EdgeRoute>;
  filters: DiagramFilters;
  last_modified_by?: string;
  created_at: string;
  updated_at: string;
  version: number;
}

// =====================================================
// Layout Algorithms
// =====================================================

export type LayoutType = 'hierarchical' | 'force' | 'circular' | 'dagre';

export interface LayoutOptions {
  type: LayoutType;
  direction?: 'LR' | 'TB' | 'RL' | 'BT'; // Left-Right, Top-Bottom, etc.
  spacing?: {
    horizontal?: number;
    vertical?: number;
  };
  animate?: boolean;
  duration?: number; // Animation duration in ms
}

export interface LayoutResult {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

// =====================================================
// Context Menu Actions
// =====================================================

export interface ContextMenuAction {
  label: string;
  icon?: React.ReactNode;
  action: () => void;
  disabled?: boolean;
  destructive?: boolean;
  badge?: number | string;
  submenu?: ContextMenuAction[];
}

export type ContextMenuType = 'node' | 'edge' | 'canvas';

export interface ContextMenuState {
  visible: boolean;
  type: ContextMenuType;
  x: number;
  y: number;
  nodeId?: string;
  edgeId?: string;
  actions: ContextMenuAction[];
}

// =====================================================
// Highlighting & Selection
// =====================================================

export interface HighlightState {
  highlightedNodes: Set<string>;
  highlightedEdges: Set<string>;
  direction?: 'upstream' | 'downstream' | 'both';
  selectedDatasetId?: string;
}

// =====================================================
// Diagram Toolbar
// =====================================================

export interface ToolbarState {
  viewMode: ViewMode;
  searchQuery: string;
  filtersActive: boolean;
  layoutType: LayoutType;
}

// =====================================================
// Performance & Optimization
// =====================================================

/**
 * Visible bounds for viewport culling
 */
export interface VisibleBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Node dimensions for calculations
 */
export interface NodeDimensions {
  width: number;
  height: number;
}

// =====================================================
// API Request/Response Types
// =====================================================

/**
 * Request to save diagram state
 */
export interface SaveDiagramStateRequest {
  workspace_id: string;
  diagram_type: DiagramType;
  view_mode: ViewMode;
  viewport: DiagramViewport;
  node_positions: Record<string, { x: number; y: number }>;
  node_expansions: Record<string, boolean>;
  edge_routes: Record<string, EdgeRoute>;
  filters: DiagramFilters;
}

/**
 * Response from save diagram state
 */
export interface SaveDiagramStateResponse {
  success: boolean;
  diagram_state: DiagramStateRecord;
  version: number;
}

/**
 * Request to load diagram state
 */
export interface LoadDiagramStateRequest {
  workspace_id: string;
  diagram_type: DiagramType;
}

/**
 * Response from load diagram state
 */
export interface LoadDiagramStateResponse {
  success: boolean;
  diagram_state?: DiagramStateRecord;
  found: boolean;
}

// =====================================================
// Conflict Resolution
// =====================================================

export type ConflictResolutionStrategy = 'ours' | 'theirs' | 'manual';

export interface DiagramConflict {
  field: string;
  our_value: any;
  their_value: any;
  base_value?: any; // Common ancestor for three-way merge
}

export interface ConflictResolutionResult {
  resolved: boolean;
  merged_state?: DiagramState;
  strategy_used: ConflictResolutionStrategy;
  conflicts_resolved: number;
  conflicts_remaining: number;
}

// =====================================================
// Validation
// =====================================================

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

// =====================================================
// Export Types
// =====================================================

export type ExportFormat = 'png' | 'svg' | 'json' | 'yaml';

export interface ExportOptions {
  format: ExportFormat;
  includeBackground?: boolean;
  quality?: number; // For PNG (0-1)
  scale?: number; // Scale multiplier
}

// =====================================================
// Constants
// =====================================================

export const DEFAULT_NODE_DIMENSIONS = {
  collapsed: { width: 250, height: 120 },
  expanded: { width: 400, height: 240 }, // Base height, grows with columns
  columnHeight: 40,
};

export const DEFAULT_VIEWPORT: DiagramViewport = {
  x: 0,
  y: 0,
  zoom: 1,
};

export const DEFAULT_FILTERS: DiagramFilters = {
  medallionLayers: [],
  entityTypes: [],
  entitySubtypes: [],
  hasRelationships: false,
  hasLineage: false,
  aiConfidenceMin: 0,
  syncStatus: [],
  searchQuery: '',
};

export const ZOOM_LIMITS = {
  min: 0.1,
  max: 4.0,
  step: 0.2,
};

export const LAYOUT_SPACING = {
  hierarchical: { horizontal: 400, vertical: 200 },
  force: { horizontal: 150, vertical: 150 },
  circular: { radius: 300 },
  dagre: { horizontal: 200, vertical: 100 },
};
