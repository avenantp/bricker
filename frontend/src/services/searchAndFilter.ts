/**
 * Search and Filter Service
 * Provides search and filtering functionality for diagram nodes
 * Based on specification: docs/prp/051-dataset-diagram-view-specification.md
 */

import type {
  DiagramNode,
  DiagramEdge,
  DiagramFilters,
  DatasetNodeData,
} from '../types/diagram';

// =====================================================
// Search Functions
// =====================================================

/**
 * Check if a string matches a search query (case-insensitive)
 */
function matchesQuery(text: string | undefined, query: string): boolean {
  if (!text || !query) return false;
  return text.toLowerCase().includes(query.toLowerCase());
}

/**
 * Search nodes by name, FQN, description
 */
export function searchNodes(
  nodes: DiagramNode[],
  searchQuery: string
): DiagramNode[] {
  if (!searchQuery || searchQuery.trim() === '') {
    return nodes;
  }

  const query = searchQuery.trim();

  return nodes.filter((node) => {
    const data = node.data;

    // Search in name, FQN, description
    if (matchesQuery(data.name, query)) return true;
    if (matchesQuery(data.fqn, query)) return true;
    if (matchesQuery(data.description, query)) return true;

    // Search in entity type/subtype
    if (matchesQuery(data.entity_type, query)) return true;
    if (matchesQuery(data.entity_subtype, query)) return true;

    // Search in columns (if expanded)
    if (data.columns) {
      const columnMatch = data.columns.some(
        (col) =>
          matchesQuery(col.name, query) ||
          matchesQuery(col.description, query) ||
          matchesQuery(col.data_type, query) ||
          matchesQuery(col.business_name, query)
      );
      if (columnMatch) return true;
    }

    return false;
  });
}

// =====================================================
// Filter Functions
// =====================================================

/**
 * Apply filters to nodes
 */
export function filterNodes(
  nodes: DiagramNode[],
  filters: DiagramFilters
): DiagramNode[] {
  let filteredNodes = [...nodes];

  // Filter by medallion layers
  if (filters.medallionLayers && filters.medallionLayers.length > 0) {
    filteredNodes = filteredNodes.filter((node) =>
      filters.medallionLayers.includes(node.data.medallion_layer)
    );
  }

  // Filter by entity types
  if (filters.entityTypes && filters.entityTypes.length > 0) {
    filteredNodes = filteredNodes.filter((node) =>
      filters.entityTypes.includes(node.data.entity_type)
    );
  }

  // Filter by entity subtypes
  if (filters.entitySubtypes && filters.entitySubtypes.length > 0) {
    filteredNodes = filteredNodes.filter((node) =>
      node.data.entity_subtype &&
      filters.entitySubtypes.includes(node.data.entity_subtype)
    );
  }

  // Filter by relationships
  if (filters.hasRelationships) {
    filteredNodes = filteredNodes.filter(
      (node) => node.data.relationshipCount && node.data.relationshipCount > 0
    );
  }

  // Filter by lineage
  if (filters.hasLineage) {
    filteredNodes = filteredNodes.filter((node) => {
      const lineage = node.data.lineageCount;
      return lineage && (lineage.upstream > 0 || lineage.downstream > 0);
    });
  }

  // Filter by AI confidence score
  if (filters.aiConfidenceMin !== undefined && filters.aiConfidenceMin > 0) {
    filteredNodes = filteredNodes.filter((node) =>
      node.data.ai_confidence_score !== undefined
        ? node.data.ai_confidence_score >= filters.aiConfidenceMin!
        : true // Include nodes without AI confidence score
    );
  }

  // Filter by sync status
  if (filters.syncStatus && filters.syncStatus.length > 0) {
    filteredNodes = filteredNodes.filter((node) =>
      node.data.sync_status
        ? filters.syncStatus!.includes(node.data.sync_status)
        : false
    );
  }

  return filteredNodes;
}

/**
 * Filter edges based on visible nodes
 */
export function filterEdgesByNodes(
  edges: DiagramEdge[],
  visibleNodeIds: Set<string>
): DiagramEdge[] {
  return edges.filter(
    (edge) =>
      visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target)
  );
}

// =====================================================
// Combined Search and Filter
// =====================================================

/**
 * Apply both search and filters to nodes
 */
export function searchAndFilterNodes(
  nodes: DiagramNode[],
  searchQuery: string,
  filters: DiagramFilters
): { nodes: DiagramNode[]; edges: DiagramEdge[] } {
  // First apply filters
  let filteredNodes = filterNodes(nodes, filters);

  // Then apply search
  filteredNodes = searchNodes(filteredNodes, searchQuery);

  return {
    nodes: filteredNodes,
    edges: [], // Edges will be filtered separately
  };
}

/**
 * Get complete filtered result (nodes + edges)
 */
export function getFilteredDiagram(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  searchQuery: string,
  filters: DiagramFilters
): { nodes: DiagramNode[]; edges: DiagramEdge[] } {
  // Apply search and filters to nodes
  const filteredNodes = searchAndFilterNodes(nodes, searchQuery, filters).nodes;

  // Create set of visible node IDs
  const visibleNodeIds = new Set(filteredNodes.map((node) => node.id));

  // Filter edges to only show connections between visible nodes
  const filteredEdges = filterEdgesByNodes(edges, visibleNodeIds);

  return {
    nodes: filteredNodes,
    edges: filteredEdges,
  };
}

// =====================================================
// Filter Helpers
// =====================================================

/**
 * Check if any filters are active
 */
export function hasActiveFilters(filters: DiagramFilters): boolean {
  return (
    (filters.medallionLayers && filters.medallionLayers.length > 0) ||
    (filters.entityTypes && filters.entityTypes.length > 0) ||
    (filters.entitySubtypes && filters.entitySubtypes.length > 0) ||
    filters.hasRelationships === true ||
    filters.hasLineage === true ||
    (filters.aiConfidenceMin !== undefined && filters.aiConfidenceMin > 0) ||
    (filters.syncStatus && filters.syncStatus.length > 0)
  );
}

/**
 * Get count of active filters
 */
export function getActiveFilterCount(filters: DiagramFilters): number {
  let count = 0;

  if (filters.medallionLayers && filters.medallionLayers.length > 0) count++;
  if (filters.entityTypes && filters.entityTypes.length > 0) count++;
  if (filters.entitySubtypes && filters.entitySubtypes.length > 0) count++;
  if (filters.hasRelationships) count++;
  if (filters.hasLineage) count++;
  if (filters.aiConfidenceMin !== undefined && filters.aiConfidenceMin > 0) count++;
  if (filters.syncStatus && filters.syncStatus.length > 0) count++;

  return count;
}

/**
 * Get filter summary text
 */
export function getFilterSummary(filters: DiagramFilters): string {
  const parts: string[] = [];

  if (filters.medallionLayers && filters.medallionLayers.length > 0) {
    parts.push(`${filters.medallionLayers.length} layers`);
  }

  if (filters.entityTypes && filters.entityTypes.length > 0) {
    parts.push(`${filters.entityTypes.length} types`);
  }

  if (filters.hasRelationships) {
    parts.push('with relationships');
  }

  if (filters.hasLineage) {
    parts.push('with lineage');
  }

  if (filters.aiConfidenceMin !== undefined && filters.aiConfidenceMin > 0) {
    parts.push(`AI ≥${filters.aiConfidenceMin}%`);
  }

  return parts.join(', ');
}

// =====================================================
// Highlighting
// =====================================================

/**
 * Highlight nodes that match search query
 */
export function highlightSearchResults(
  nodes: DiagramNode[],
  searchQuery: string
): DiagramNode[] {
  if (!searchQuery || searchQuery.trim() === '') {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        isHighlighted: false,
        highlightType: undefined,
      },
    }));
  }

  const matchingNodes = new Set(
    searchNodes(nodes, searchQuery).map((n) => n.id)
  );

  return nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      isHighlighted: matchingNodes.has(node.id),
      highlightType: matchingNodes.has(node.id) ? 'selected' : undefined,
    },
  }));
}

// =====================================================
// Advanced Filtering
// =====================================================

/**
 * Filter nodes by column properties
 */
export function filterByColumnProperty(
  nodes: DiagramNode[],
  propertyCheck: (column: DatasetNodeData['columns'][0]) => boolean
): DiagramNode[] {
  return nodes.filter((node) =>
    node.data.columns?.some(propertyCheck)
  );
}

/**
 * Filter nodes that have primary keys
 */
export function filterNodesWithPrimaryKeys(nodes: DiagramNode[]): DiagramNode[] {
  return filterByColumnProperty(nodes, (col) => col.is_primary_key);
}

/**
 * Filter nodes that have foreign keys
 */
export function filterNodesWithForeignKeys(nodes: DiagramNode[]): DiagramNode[] {
  return filterByColumnProperty(nodes, (col) => col.is_foreign_key);
}

/**
 * Filter nodes by column count range
 */
export function filterByColumnCount(
  nodes: DiagramNode[],
  min?: number,
  max?: number
): DiagramNode[] {
  return nodes.filter((node) => {
    const count = node.data.columnCount || 0;
    if (min !== undefined && count < min) return false;
    if (max !== undefined && count > max) return false;
    return true;
  });
}

// =====================================================
// Sorting
// =====================================================

export type SortField =
  | 'name'
  | 'fqn'
  | 'medallion_layer'
  | 'entity_type'
  | 'columnCount'
  | 'relationshipCount'
  | 'ai_confidence_score';

export type SortDirection = 'asc' | 'desc';

/**
 * Sort nodes by field
 */
export function sortNodes(
  nodes: DiagramNode[],
  field: SortField,
  direction: SortDirection = 'asc'
): DiagramNode[] {
  const sorted = [...nodes].sort((a, b) => {
    let aVal: any;
    let bVal: any;

    switch (field) {
      case 'name':
        aVal = a.data.name.toLowerCase();
        bVal = b.data.name.toLowerCase();
        break;
      case 'fqn':
        aVal = a.data.fqn.toLowerCase();
        bVal = b.data.fqn.toLowerCase();
        break;
      case 'medallion_layer':
        const layerOrder = { Raw: 1, Bronze: 2, Silver: 3, Gold: 4 };
        aVal = layerOrder[a.data.medallion_layer] || 0;
        bVal = layerOrder[b.data.medallion_layer] || 0;
        break;
      case 'entity_type':
        aVal = a.data.entity_type.toLowerCase();
        bVal = b.data.entity_type.toLowerCase();
        break;
      case 'columnCount':
        aVal = a.data.columnCount || 0;
        bVal = b.data.columnCount || 0;
        break;
      case 'relationshipCount':
        aVal = a.data.relationshipCount || 0;
        bVal = b.data.relationshipCount || 0;
        break;
      case 'ai_confidence_score':
        aVal = a.data.ai_confidence_score || 0;
        bVal = b.data.ai_confidence_score || 0;
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
}

// =====================================================
// Search Suggestions
// =====================================================

/**
 * Get search suggestions based on query
 */
export function getSearchSuggestions(
  nodes: DiagramNode[],
  query: string,
  limit: number = 5
): string[] {
  if (!query || query.trim() === '') return [];

  const suggestions = new Set<string>();
  const lowerQuery = query.toLowerCase();

  nodes.forEach((node) => {
    // Dataset names
    if (node.data.name.toLowerCase().includes(lowerQuery)) {
      suggestions.add(node.data.name);
    }

    // Entity types
    if (node.data.entity_type.toLowerCase().includes(lowerQuery)) {
      suggestions.add(node.data.entity_type);
    }

    // Medallion layers
    if (node.data.medallion_layer.toLowerCase().includes(lowerQuery)) {
      suggestions.add(node.data.medallion_layer);
    }

    // Column names
    node.data.columns?.forEach((col) => {
      if (col.name.toLowerCase().includes(lowerQuery)) {
        suggestions.add(`${node.data.name}.${col.name}`);
      }
    });
  });

  return Array.from(suggestions).slice(0, limit);
}
