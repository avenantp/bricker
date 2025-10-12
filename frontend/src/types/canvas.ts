/**
 * Canvas and Node type definitions for React Flow
 * Based on technical specifications in docs/prp/001-technical-specifications.md
 */

import type { Node, Edge } from '@xyflow/react';

/**
 * Medallion layer classification
 */
export type MedallionLayer = 'Raw' | 'Bronze' | 'Silver' | 'Gold';

/**
 * Entity types for nodes
 */
export type EntityType =
  | 'Table'
  | 'Staging'
  | 'PersistentStaging'
  | 'DataVault'
  | 'DataMart';

/**
 * Entity subtypes (specific to DataVault and DataMart)
 */
export type EntitySubtype =
  | 'Dimension'
  | 'Fact'
  | 'Hub'
  | 'Link'
  | 'Satellite'
  | 'LinkSatellite'
  | 'PIT'
  | 'Bridge'
  | null;

/**
 * Materialization types
 */
export type MaterializationType = 'Table' | 'View' | 'MaterializedView' | null;

/**
 * Relationship types between nodes
 */
export type RelationshipType = 'FK' | 'BusinessKey' | 'NaturalKey';

/**
 * Cardinality for relationships
 */
export type Cardinality = '1:1' | '1:M' | 'M:M';

/**
 * Node data structure (extends React Flow Node)
 */
export interface CanvasNodeData {
  // Core identifiers
  uuid: string;
  fqn: string;
  project_id: string;

  // Basic properties
  name: string;
  medallion_layer: MedallionLayer;
  entity_type: EntityType;
  entity_subtype: EntitySubtype;
  materialization_type: MaterializationType;
  description?: string;

  // Metadata
  metadata?: {
    source_system?: string;
    business_owner?: string;
    technical_owner?: string;
    refresh_frequency?: string;
    [key: string]: unknown;
  };

  // AI confidence score
  ai_confidence_score?: number;

  // Git tracking
  git_commit_hash?: string;

  // Timestamps
  created_at: string;
  updated_at: string;

  // Visual properties
  isSelected?: boolean;
  isHovered?: boolean;
}

/**
 * React Flow Node type with custom data
 */
export type CanvasNode = Node<CanvasNodeData>;

/**
 * Edge data for relationships
 */
export interface CanvasEdgeData {
  relationship_type: RelationshipType;
  cardinality: Cardinality;
  source_nodeitems?: string[]; // UUIDs
  target_nodeitems?: string[]; // UUIDs
  description?: string;
}

/**
 * React Flow Edge type with custom data
 */
export type CanvasEdge = Edge<CanvasEdgeData>;

/**
 * Canvas viewport state
 */
export interface CanvasViewport {
  x: number;
  y: number;
  zoom: number;
}

/**
 * Canvas filter options
 */
export interface CanvasFilters {
  medallion_layers: MedallionLayer[];
  entity_types: EntityType[];
  entity_subtypes: EntitySubtype[];
  min_confidence_score?: number;
  show_public_nodes?: boolean;
  search_query?: string;
}

/**
 * Canvas state for persistence
 */
export interface CanvasState {
  viewport: CanvasViewport;
  filters: CanvasFilters;
  selected_node_ids: string[];
}

/**
 * Color scheme for medallion layers
 */
export const MEDALLION_COLORS: Record<MedallionLayer, string> = {
  Raw: '#808080', // Gray
  Bronze: '#CD7F32', // Brown
  Silver: '#C0C0C0', // Silver
  Gold: '#FFD700', // Gold
};

/**
 * Color scheme for medallion layers (Tailwind CSS classes)
 */
export const MEDALLION_TAILWIND_COLORS: Record<MedallionLayer, string> = {
  Raw: 'bg-gray-500 border-gray-600',
  Bronze: 'bg-amber-700 border-amber-800',
  Silver: 'bg-gray-400 border-gray-500',
  Gold: 'bg-yellow-500 border-yellow-600',
};

/**
 * Icons for entity types/subtypes
 */
export const ENTITY_ICONS: Record<string, string> = {
  // Data Vault
  Hub: '⭕', // Circle
  Satellite: '🛰️', // Satellite emoji
  Link: '◆', // Diamond
  LinkSatellite: '🔗',
  PIT: '⏱️',
  Bridge: '🌉',

  // Dimensional
  Dimension: '📦', // Cube
  Fact: '⭐', // Star

  // General
  Table: '📋',
  Staging: '📥',
  PersistentStaging: '💾',
  DataVault: '🏛️',
  DataMart: '🎯',
};

/**
 * Node type for React Flow
 */
export const NODE_TYPES = {
  dataNode: 'dataNode', // Custom node type
} as const;

/**
 * Edge type for React Flow
 */
export const EDGE_TYPES = {
  relationship: 'relationship', // Custom edge type
} as const;
