/**
 * useSearchAndFilter Hook
 * Integrates search and filter functionality with the diagram store
 * Based on specification: docs/prp/051-dataset-diagram-view-specification.md
 */

import { useMemo } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import {
  getFilteredDiagram,
  highlightSearchResults,
  hasActiveFilters,
  getActiveFilterCount,
  getFilterSummary,
} from '../services/searchAndFilter';
import type { DiagramNode, DiagramEdge } from '../types/diagram';

/**
 * Hook to get filtered nodes and edges
 */
export function useFilteredDiagram(): {
  filteredNodes: DiagramNode[];
  filteredEdges: DiagramEdge[];
  isFiltering: boolean;
  activeFilterCount: number;
  filterSummary: string;
} {
  const nodes = useDiagramStore((state) => state.nodes);
  const edges = useDiagramStore((state) => state.edges);
  const searchQuery = useDiagramStore((state) => state.searchQuery);
  const filters = useDiagramStore((state) => state.filters);

  console.log('[useFilteredDiagram] 🔍 Hook inputs:', {
    nodesCount: nodes.length,
    edgesCount: edges.length,
    searchQuery,
    filters,
    nodeIds: nodes.map(n => n.id)
  });

  // Memoize filtered results
  const { nodes: filteredNodes, edges: filteredEdges } = useMemo(() => {
    console.log('[useFilteredDiagram] 🔄 useMemo recomputing filtered results');
    const result = getFilteredDiagram(nodes, edges, searchQuery, filters);
    console.log('[useFilteredDiagram] ✅ useMemo result:', {
      filteredNodesCount: result.nodes.length,
      filteredEdgesCount: result.edges.length,
      nodeIds: result.nodes.map(n => n.id)
    });
    return result;
  }, [nodes, edges, searchQuery, filters]);

  console.log('[useFilteredDiagram] 📤 Returning from hook:', {
    filteredNodesCount: filteredNodes?.length || 0,
    filteredEdgesCount: filteredEdges?.length || 0,
    nodeIds: filteredNodes?.map(n => n.id) || []
  });

  // Check if any filters are active
  const isFiltering = useMemo(() => {
    return searchQuery.trim() !== '' || hasActiveFilters(filters);
  }, [searchQuery, filters]);

  // Get active filter count
  const activeFilterCount = useMemo(() => {
    return getActiveFilterCount(filters);
  }, [filters]);

  // Get filter summary
  const filterSummary = useMemo(() => {
    return getFilterSummary(filters);
  }, [filters]);

  return {
    filteredNodes,
    filteredEdges,
    isFiltering,
    activeFilterCount,
    filterSummary,
  };
}

/**
 * Hook to get search-highlighted nodes
 */
export function useSearchHighlight(): DiagramNode[] {
  const nodes = useDiagramStore((state) => state.nodes);
  const searchQuery = useDiagramStore((state) => state.searchQuery);

  return useMemo(() => {
    return highlightSearchResults(nodes, searchQuery);
  }, [nodes, searchQuery]);
}

/**
 * Hook to toggle filter values
 */
export function useFilterToggle() {
  const filters = useDiagramStore((state) => state.filters);
  const updateFilters = useDiagramStore((state) => state.updateFilters);

  const toggleMedallionLayer = (layer: string) => {
    const current = filters.medallionLayers || [];
    const updated = current.includes(layer as any)
      ? current.filter((l) => l !== layer)
      : [...current, layer as any];
    updateFilters({ medallionLayers: updated });
  };

  const toggleEntityType = (type: string) => {
    const current = filters.entityTypes || [];
    const updated = current.includes(type as any)
      ? current.filter((t) => t !== type)
      : [...current, type as any];
    updateFilters({ entityTypes: updated });
  };

  const toggleEntitySubtype = (subtype: string) => {
    const current = filters.entitySubtypes || [];
    const updated = current.includes(subtype as any)
      ? current.filter((s) => s !== subtype)
      : [...current, subtype as any];
    updateFilters({ entitySubtypes: updated });
  };

  const toggleSyncStatus = (status: string) => {
    const current = filters.syncStatus || [];
    const updated = current.includes(status as any)
      ? current.filter((s) => s !== status)
      : [...current, status as any];
    updateFilters({ syncStatus: updated });
  };

  const toggleHasRelationships = () => {
    updateFilters({ hasRelationships: !filters.hasRelationships });
  };

  const toggleHasLineage = () => {
    updateFilters({ hasLineage: !filters.hasLineage });
  };

  const setAiConfidenceMin = (value: number) => {
    updateFilters({ aiConfidenceMin: value });
  };

  return {
    toggleMedallionLayer,
    toggleEntityType,
    toggleEntitySubtype,
    toggleSyncStatus,
    toggleHasRelationships,
    toggleHasLineage,
    setAiConfidenceMin,
  };
}

/**
 * Hook for debounced search
 */
export function useDebouncedSearch(delay: number = 300) {
  const setSearchQuery = useDiagramStore((state) => state.setSearchQuery);

  const debouncedSetSearch = useMemo(() => {
    let timeoutId: NodeJS.Timeout;

    return (query: string) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setSearchQuery(query);
      }, delay);
    };
  }, [setSearchQuery, delay]);

  return debouncedSetSearch;
}
