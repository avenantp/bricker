/**
 * Diagram Store - Zustand state management for diagram view
 * Based on specification: docs/prp/051-dataset-diagram-view-specification.md
 */

import { create } from 'zustand';
import type {
  ViewMode,
  DiagramNode,
  DiagramEdge,
  DiagramViewport,
  DiagramFilters,
  EdgeRoute,
  HighlightState,
  ContextMenuState,
  LayoutType,
  DiagramType,
} from '../types/diagram';
import {
  DEFAULT_VIEWPORT,
  DEFAULT_FILTERS,
} from '../types/diagram';
import {
  saveDiagramState,
  loadDiagramState,
  forceImmediateSave,
} from '../services/diagramStatePersistence';
import { applyLayout as applyLayoutAlgorithm } from '../services/layoutAlgorithms';

// =====================================================
// Store Interface
// =====================================================

interface DiagramStore {
  // View State
  viewMode: ViewMode;
  selectedDatasetId: string | null;
  expandedNodes: Set<string>;
  layoutType: LayoutType;

  // Canvas State
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  viewport: DiagramViewport;

  // Filters & Search
  filters: DiagramFilters;
  searchQuery: string;

  // Highlighting
  highlightState: HighlightState;

  // Context Menu
  contextMenu: ContextMenuState;

  // Diagram State Persistence
  savedPositions: Record<string, { x: number; y: number }>;
  edgeRoutes: Record<string, EdgeRoute>;
  isDirty: boolean; // Has unsaved changes
  lastSaved: string | null;

  // Loading States
  isLoading: boolean;
  isSaving: boolean;

  // Context for persistence
  accountId: string | null;
  workspaceId: string | null;
  diagramType: DiagramType;

  // =====================================================
  // View Mode Actions
  // =====================================================

  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;

  // =====================================================
  // Node Actions
  // =====================================================

  setNodes: (nodes: DiagramNode[]) => void;
  addNode: (node: DiagramNode) => void;
  updateNode: (nodeId: string, updates: Partial<DiagramNode['data']>) => void;
  deleteNode: (nodeId: string) => void;
  updateNodePosition: (nodeId: string, position: { x: number; y: number }) => void;

  // Node Expansion
  toggleNodeExpansion: (nodeId: string) => void;
  expandNode: (nodeId: string) => void;
  collapseNode: (nodeId: string) => void;
  expandAllNodes: () => void;
  collapseAllNodes: () => void;

  // =====================================================
  // Edge Actions
  // =====================================================

  setEdges: (edges: DiagramEdge[]) => void;
  addEdge: (edge: DiagramEdge) => void;
  updateEdge: (edgeId: string, updates: Partial<DiagramEdge['data']>) => void;
  deleteEdge: (edgeId: string) => void;
  saveEdgeRoute: (edgeId: string, route: EdgeRoute) => void;

  // =====================================================
  // Selection & Highlighting
  // =====================================================

  setSelectedDatasetId: (datasetId: string | null) => void;
  highlightLineage: (
    datasetId: string,
    direction: 'upstream' | 'downstream' | 'both'
  ) => void;
  clearHighlights: () => void;

  // =====================================================
  // Viewport Actions
  // =====================================================

  setViewport: (viewport: DiagramViewport) => void;
  updateViewport: (updates: Partial<DiagramViewport>) => void;
  resetViewport: () => void;
  fitView: () => void;

  // =====================================================
  // Filters & Search
  // =====================================================

  setFilters: (filters: DiagramFilters) => void;
  updateFilters: (updates: Partial<DiagramFilters>) => void;
  resetFilters: () => void;
  setSearchQuery: (query: string) => void;

  // =====================================================
  // Context Menu
  // =====================================================

  showContextMenu: (menu: ContextMenuState) => void;
  hideContextMenu: () => void;

  // =====================================================
  // Layout Actions
  // =====================================================

  setLayoutType: (type: LayoutType) => void;
  applyLayout: (type: LayoutType) => void;

  // =====================================================
  // Persistence Actions
  // =====================================================

  markDirty: () => void;
  markClean: () => void;
  setLastSaved: (timestamp: string) => void;
  setContext: (accountId: string, workspaceId: string, diagramType: DiagramType) => void;
  saveState: (immediate?: boolean) => Promise<void>;
  loadState: (workspaceId: string, diagramType: DiagramType) => Promise<void>;

  // =====================================================
  // Utility Actions
  // =====================================================

  reset: () => void;
}

// =====================================================
// Initial State
// =====================================================

const initialState = {
  viewMode: 'relationships' as ViewMode,
  selectedDatasetId: null,
  expandedNodes: new Set<string>(),
  layoutType: 'hierarchical' as LayoutType,

  nodes: [],
  edges: [],
  viewport: DEFAULT_VIEWPORT,

  filters: DEFAULT_FILTERS,
  searchQuery: '',

  highlightState: {
    highlightedNodes: new Set<string>(),
    highlightedEdges: new Set<string>(),
  },

  contextMenu: {
    visible: false,
    type: 'canvas' as const,
    x: 0,
    y: 0,
    actions: [],
  },

  savedPositions: {},
  edgeRoutes: {},
  isDirty: false,
  lastSaved: null,

  isLoading: false,
  isSaving: false,

  accountId: null,
  workspaceId: null,
  diagramType: 'dataset' as DiagramType,
};

// =====================================================
// Create Store
// =====================================================

export const useDiagramStore = create<DiagramStore>((set, get) => ({
  ...initialState,

  // =====================================================
  // View Mode Actions
  // =====================================================

  setViewMode: (mode) =>
    set({ viewMode: mode, isDirty: true }),

  toggleViewMode: () =>
    set((state) => ({
      viewMode: state.viewMode === 'relationships' ? 'lineage' : 'relationships',
      isDirty: true,
    })),

  // =====================================================
  // Node Actions
  // =====================================================

  setNodes: (nodes) =>
    set({ nodes, isDirty: true }),

  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node],
      isDirty: true,
    })),

  updateNode: (nodeId, updates) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...updates } }
          : node
      ),
      isDirty: true,
    })),

  deleteNode: (nodeId) =>
    set((state) => ({
      nodes: state.nodes.filter((node) => node.id !== nodeId),
      edges: state.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
      isDirty: true,
    })),

  updateNodePosition: (nodeId, position) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === nodeId ? { ...node, position } : node
      ),
      savedPositions: {
        ...state.savedPositions,
        [nodeId]: position,
      },
      isDirty: true,
    })),

  // Node Expansion
  toggleNodeExpansion: (nodeId) =>
    set((state) => {
      const newExpanded = new Set(state.expandedNodes);
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
      }
      return {
        expandedNodes: newExpanded,
        nodes: state.nodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, isExpanded: !node.data.isExpanded } }
            : node
        ),
        isDirty: true,
      };
    }),

  expandNode: (nodeId) =>
    set((state) => {
      const newExpanded = new Set(state.expandedNodes);
      newExpanded.add(nodeId);
      return {
        expandedNodes: newExpanded,
        nodes: state.nodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, isExpanded: true } }
            : node
        ),
        isDirty: true,
      };
    }),

  collapseNode: (nodeId) =>
    set((state) => {
      const newExpanded = new Set(state.expandedNodes);
      newExpanded.delete(nodeId);
      return {
        expandedNodes: newExpanded,
        nodes: state.nodes.map((node) =>
          node.id === nodeId
            ? { ...node, data: { ...node.data, isExpanded: false } }
            : node
        ),
        isDirty: true,
      };
    }),

  expandAllNodes: () =>
    set((state) => ({
      expandedNodes: new Set(state.nodes.map((n) => n.id)),
      nodes: state.nodes.map((node) => ({
        ...node,
        data: { ...node.data, isExpanded: true },
      })),
      isDirty: true,
    })),

  collapseAllNodes: () =>
    set({
      expandedNodes: new Set(),
      nodes: get().nodes.map((node) => ({
        ...node,
        data: { ...node.data, isExpanded: false },
      })),
      isDirty: true,
    }),

  // =====================================================
  // Edge Actions
  // =====================================================

  setEdges: (edges) =>
    set({ edges, isDirty: true }),

  addEdge: (edge) =>
    set((state) => ({
      edges: [...state.edges, edge],
      isDirty: true,
    })),

  updateEdge: (edgeId, updates) =>
    set((state) => ({
      edges: state.edges.map((edge) =>
        edge.id === edgeId
          ? { ...edge, data: { ...edge.data, ...updates } }
          : edge
      ),
      isDirty: true,
    })),

  deleteEdge: (edgeId) =>
    set((state) => ({
      edges: state.edges.filter((edge) => edge.id !== edgeId),
      isDirty: true,
    })),

  saveEdgeRoute: (edgeId, route) =>
    set((state) => ({
      edgeRoutes: {
        ...state.edgeRoutes,
        [edgeId]: route,
      },
      isDirty: true,
    })),

  // =====================================================
  // Selection & Highlighting
  // =====================================================

  setSelectedDatasetId: (datasetId) =>
    set({ selectedDatasetId: datasetId }),

  highlightLineage: (datasetId, direction) => {
    const { nodes, edges } = get();
    const highlightedNodes = new Set<string>();
    const highlightedEdges = new Set<string>();

    // Find all connected nodes and edges based on direction
    const traverse = (nodeId: string, dir: 'up' | 'down' | 'both') => {
      highlightedNodes.add(nodeId);

      edges.forEach((edge) => {
        if (dir === 'up' || dir === 'both') {
          if (edge.target === nodeId) {
            highlightedEdges.add(edge.id);
            if (!highlightedNodes.has(edge.source)) {
              traverse(edge.source, 'up');
            }
          }
        }
        if (dir === 'down' || dir === 'both') {
          if (edge.source === nodeId) {
            highlightedEdges.add(edge.id);
            if (!highlightedNodes.has(edge.target)) {
              traverse(edge.target, 'down');
            }
          }
        }
      });
    };

    const traverseDir = direction === 'upstream' ? 'up' : direction === 'downstream' ? 'down' : 'both';
    traverse(datasetId, traverseDir);

    set({
      highlightState: {
        highlightedNodes,
        highlightedEdges,
        direction,
        selectedDatasetId: datasetId,
      },
      nodes: nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isHighlighted: highlightedNodes.has(node.id),
          highlightType: node.id === datasetId ? 'selected' :
                        (direction === 'upstream' ? 'upstream' :
                         direction === 'downstream' ? 'downstream' : undefined),
        },
      })),
    });
  },

  clearHighlights: () =>
    set((state) => ({
      highlightState: {
        highlightedNodes: new Set(),
        highlightedEdges: new Set(),
      },
      nodes: state.nodes.map((node) => ({
        ...node,
        data: {
          ...node.data,
          isHighlighted: false,
          highlightType: undefined,
        },
      })),
    })),

  // =====================================================
  // Viewport Actions
  // =====================================================

  setViewport: (viewport) =>
    set({ viewport, isDirty: true }),

  updateViewport: (updates) =>
    set((state) => ({
      viewport: { ...state.viewport, ...updates },
      isDirty: true,
    })),

  resetViewport: () =>
    set({ viewport: DEFAULT_VIEWPORT, isDirty: true }),

  fitView: () => {
    // This will be implemented with React Flow's fitView function
    // For now, just reset viewport
    set({ viewport: DEFAULT_VIEWPORT });
  },

  // =====================================================
  // Filters & Search
  // =====================================================

  setFilters: (filters) =>
    set({ filters, isDirty: true }),

  updateFilters: (updates) =>
    set((state) => ({
      filters: { ...state.filters, ...updates },
      isDirty: true,
    })),

  resetFilters: () =>
    set({ filters: DEFAULT_FILTERS, isDirty: true }),

  setSearchQuery: (query) =>
    set({ searchQuery: query }),

  // =====================================================
  // Context Menu
  // =====================================================

  showContextMenu: (menu) =>
    set({ contextMenu: menu }),

  hideContextMenu: () =>
    set({
      contextMenu: {
        visible: false,
        type: 'canvas',
        x: 0,
        y: 0,
        actions: [],
      },
    }),

  // =====================================================
  // Layout Actions
  // =====================================================

  setLayoutType: (type) =>
    set({ layoutType: type }),

  applyLayout: async (type) => {
    const { nodes, edges } = get();

    console.log(`[DiagramStore] Applying ${type} layout to ${nodes.length} nodes`);

    try {
      // Apply layout algorithm
      const result = applyLayoutAlgorithm(nodes, edges, type);

      // Update nodes with new positions
      set({
        nodes: result.nodes,
        layoutType: type,
        isDirty: true,
      });

      // Update saved positions
      const newSavedPositions: Record<string, { x: number; y: number }> = {};
      result.nodes.forEach((node) => {
        newSavedPositions[node.id] = node.position;
      });

      set((state) => ({
        savedPositions: {
          ...state.savedPositions,
          ...newSavedPositions,
        },
      }));

      console.log('[DiagramStore] Layout applied successfully');
    } catch (error) {
      console.error('[DiagramStore] Failed to apply layout:', error);
      throw error;
    }
  },

  // =====================================================
  // Persistence Actions
  // =====================================================

  markDirty: () =>
    set({ isDirty: true }),

  markClean: () =>
    set({ isDirty: false }),

  setLastSaved: (timestamp) =>
    set({ lastSaved: timestamp }),

  setContext: (accountId, workspaceId, diagramType) =>
    set({ accountId, workspaceId, diagramType }),

  saveState: async (immediate = false) => {
    const state = get();
    const { accountId, workspaceId, diagramType, viewport, savedPositions, edgeRoutes, filters, viewMode } = state;

    if (!accountId || !workspaceId) {
      console.warn('[DiagramStore] Cannot save: accountId or workspaceId not set');
      return;
    }

    const stateToSave = {
      workspace_id: workspaceId,
      diagram_type: diagramType,
      view_mode: viewMode,
      viewport,
      node_positions: savedPositions,
      node_expansions: Object.fromEntries(
        Array.from(state.expandedNodes).map((id) => [id, true])
      ),
      edge_routes: edgeRoutes,
      filters,
    };

    try {
      if (immediate) {
        set({ isSaving: true });
        const result = await forceImmediateSave(accountId, workspaceId, diagramType, stateToSave);
        set({
          isDirty: false,
          lastSaved: result.diagram_state.updated_at,
          isSaving: false,
        });
      } else {
        // Debounced save (doesn't block UI)
        saveDiagramState(accountId, workspaceId, diagramType, stateToSave);
        set({
          isDirty: false,
          lastSaved: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('[DiagramStore] Failed to save state:', error);
      set({ isSaving: false });
      throw error;
    }
  },

  loadState: async (workspaceId: string, diagramType: DiagramType) => {
    set({ isLoading: true });
    try {
      const loadedState = await loadDiagramState(workspaceId, diagramType);

      if (loadedState) {
        // Restore state from loaded data
        const expandedNodesSet = new Set<string>();
        if (loadedState.node_expansions) {
          Object.entries(loadedState.node_expansions).forEach(([id, isExpanded]) => {
            if (isExpanded) expandedNodesSet.add(id);
          });
        }

        set({
          viewMode: loadedState.view_mode || 'relationships',
          viewport: loadedState.viewport || DEFAULT_VIEWPORT,
          savedPositions: loadedState.node_positions || {},
          expandedNodes: expandedNodesSet,
          edgeRoutes: loadedState.edge_routes || {},
          filters: loadedState.filters || DEFAULT_FILTERS,
          lastSaved: loadedState.last_saved || null,
          isDirty: false,
          isLoading: false,
          workspaceId,
          diagramType,
        });

        console.log('[DiagramStore] State loaded successfully');
      } else {
        // No saved state found, use defaults
        set({
          isLoading: false,
          workspaceId,
          diagramType,
        });
        console.log('[DiagramStore] No saved state found, using defaults');
      }
    } catch (error) {
      console.error('[DiagramStore] Failed to load state:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  // =====================================================
  // Utility Actions
  // =====================================================

  reset: () =>
    set(initialState),
}));

// =====================================================
// Selectors (for optimized access)
// =====================================================

export const selectViewMode = (state: DiagramStore) => state.viewMode;
export const selectNodes = (state: DiagramStore) => state.nodes;
export const selectEdges = (state: DiagramStore) => state.edges;
export const selectViewport = (state: DiagramStore) => state.viewport;
export const selectFilters = (state: DiagramStore) => state.filters;
export const selectSearchQuery = (state: DiagramStore) => state.searchQuery;
export const selectHighlightState = (state: DiagramStore) => state.highlightState;
export const selectContextMenu = (state: DiagramStore) => state.contextMenu;
export const selectIsDirty = (state: DiagramStore) => state.isDirty;
export const selectIsLoading = (state: DiagramStore) => state.isLoading;
export const selectIsSaving = (state: DiagramStore) => state.isSaving;
