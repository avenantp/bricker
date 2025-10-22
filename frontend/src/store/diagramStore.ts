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
import {
  savePendingChanges,
  type DiagramDatasetChange,
} from '../services/diagramDatasetService';

// =====================================================
// Store Interface
// =====================================================

interface DiagramStore {
  // View State
  viewMode: ViewMode;
  selectedDatasetId: string | null;
  expandedNodes: Set<string>;
  layoutType: LayoutType;
  layoutDirection: 'LR' | 'TB' | 'RL' | 'BT';

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

  // Pending Diagram-Dataset Changes
  pendingDatasetChanges: DiagramDatasetChange[];
  diagramId: string | null; // Current diagram ID

  // Loading States
  isLoading: boolean;
  isSaving: boolean;

  // Context for persistence
  // Note: accountId stores user.id (not account.id) for audit trail purposes
  accountId: string | null;
  workspaceId: string | null;
  diagramType: DiagramType;

  // =====================================================
  // Utility Functions
  // =====================================================

  findNonOverlappingPosition: (preferredPosition: { x: number; y: number }) => { x: number; y: number };

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
  addNodeToDiagram: (nodeId: string) => void;
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
  // Note: First parameter is userId (named accountId for historical reasons, stores user.id not account.id)
  setContext: (accountId: string | null, workspaceId: string, diagramType: DiagramType, diagramId?: string) => void;
  loadDiagramDatasets: () => Promise<void>;
  saveState: (immediate?: boolean) => Promise<void>;
  loadState: (workspaceId: string, diagramType: DiagramType) => Promise<void>;

  // Diagram-Dataset Actions
  addPendingDatasetChange: (change: DiagramDatasetChange) => void;
  removePendingDatasetChange: (datasetId: string) => void;
  clearPendingDatasetChanges: () => void;
  savePendingDatasetChanges: () => Promise<void>;

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
  layoutDirection: 'TB' as const,

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

  pendingDatasetChanges: [],
  diagramId: null,

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
  // Utility Functions (Collision Detection)
  // =====================================================

  /**
   * Find a position that doesn't overlap with existing nodes
   * Useful for adjusting drag-drop positions to avoid collisions
   */
  findNonOverlappingPosition: (preferredPosition: { x: number; y: number }) => {
    const state = get();
    const NODE_WIDTH = 300;
    const NODE_HEIGHT = 150;
    const SPACING = 30;

    const doNodesOverlap = (
      pos1: { x: number; y: number },
      pos2: { x: number; y: number }
    ): boolean => {
      return (
        Math.abs(pos1.x - pos2.x) < NODE_WIDTH + SPACING &&
        Math.abs(pos1.y - pos2.y) < NODE_HEIGHT + SPACING
      );
    };

    const existingNodes = state.nodes.filter((n) => n.position);

    // Check if preferred position is free
    const hasOverlap = existingNodes.some((node) =>
      doNodesOverlap(preferredPosition, node.position!)
    );

    if (!hasOverlap) {
      return preferredPosition;
    }

    // Try positions in a spiral pattern around the preferred position
    const maxAttempts = 20;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const offset = attempt * (NODE_HEIGHT + SPACING);

      // Try below
      let candidatePosition = { x: preferredPosition.x, y: preferredPosition.y + offset };
      if (!existingNodes.some((n) => doNodesOverlap(candidatePosition, n.position!))) {
        return candidatePosition;
      }

      // Try above
      candidatePosition = { x: preferredPosition.x, y: preferredPosition.y - offset };
      if (!existingNodes.some((n) => doNodesOverlap(candidatePosition, n.position!))) {
        return candidatePosition;
      }

      // Try right
      candidatePosition = { x: preferredPosition.x + offset, y: preferredPosition.y };
      if (!existingNodes.some((n) => doNodesOverlap(candidatePosition, n.position!))) {
        return candidatePosition;
      }

      // Try left
      candidatePosition = { x: preferredPosition.x - offset, y: preferredPosition.y };
      if (!existingNodes.some((n) => doNodesOverlap(candidatePosition, n.position!))) {
        return candidatePosition;
      }
    }

    // Fallback: offset significantly to the right and down
    return {
      x: preferredPosition.x + NODE_WIDTH + SPACING,
      y: preferredPosition.y + NODE_HEIGHT + SPACING,
    };
  },

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
    set((state) => {
      // Add pending change for diagram_datasets table
      const pendingChange: DiagramDatasetChange = {
        dataset_id: node.data.dataset_id || node.id,
        action: 'add',
        location: node.position || null,
        is_expanded: node.data.isExpanded || false,
      };

      return {
        nodes: [...state.nodes, node],
        pendingDatasetChanges: [...state.pendingDatasetChanges, pendingChange],
        isDirty: true,
      };
    }),

  addNodeToDiagram: (nodeId) =>
    set((state) => {
      const node = state.nodes.find((n) => n.id === nodeId);
      // Skip if node doesn't exist or doesn't need positioning
      if (!node || !node.data.needsPositioning) return state;

      // Define node dimensions and spacing
      const NODE_WIDTH = 300;
      const NODE_HEIGHT = 150;
      const VERTICAL_SPACING = 50;
      const HORIZONTAL_SPACING = 100;

      // Define swimlane X positions (left to right based on medallion layer)
      const SWIMLANE_WIDTH = 400;
      const LAYER_X_POSITIONS: Record<string, number> = {
        Source: 50,
        Raw: SWIMLANE_WIDTH + 50,
        Bronze: SWIMLANE_WIDTH * 2 + 50,
        Silver: SWIMLANE_WIDTH * 3 + 50,
        Gold: SWIMLANE_WIDTH * 4 + 50,
      };

      // Helper function to check if two nodes overlap
      const doNodesOverlap = (
        pos1: { x: number; y: number },
        pos2: { x: number; y: number },
        padding = 20
      ): boolean => {
        return (
          Math.abs(pos1.x - pos2.x) < NODE_WIDTH + padding &&
          Math.abs(pos1.y - pos2.y) < NODE_HEIGHT + padding
        );
      };

      // Find a position that doesn't overlap with existing nodes
      const findAvailablePosition = (preferredX: number): { x: number; y: number } => {
        const existingNodes = state.nodes.filter((n) => n.position && n.id !== nodeId);

        // Try positions in the same column first
        let yPosition = 50;
        const maxAttempts = 50;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
          const candidatePosition = { x: preferredX, y: yPosition };

          // Check if this position overlaps with any existing node
          const hasOverlap = existingNodes.some((existingNode) =>
            doNodesOverlap(candidatePosition, existingNode.position!)
          );

          if (!hasOverlap) {
            return candidatePosition;
          }

          // Try next Y position
          yPosition += NODE_HEIGHT + VERTICAL_SPACING;
        }

        // If no position found in column, try offset positions
        return { x: preferredX + HORIZONTAL_SPACING, y: 50 };
      };

      const xPosition = LAYER_X_POSITIONS[node.data.medallion_layer] || 50;
      const position = findAvailablePosition(xPosition);

      // Get dataset_id for updating pending change
      const datasetId = node.data.dataset_id || nodeId;

      // Update location in pending changes if this dataset has a pending add
      const updatedPendingChanges = state.pendingDatasetChanges.map((change) =>
        change.dataset_id === datasetId && change.action === 'add'
          ? { ...change, location: position }
          : change
      );

      // Update node with position and clear needsPositioning flag
      return {
        nodes: state.nodes.map((n) =>
          n.id === nodeId
            ? {
                ...n,
                position,
                data: { ...n.data, needsPositioning: false }
              }
            : n
        ),
        savedPositions: {
          ...state.savedPositions,
          [nodeId]: position,
        },
        pendingDatasetChanges: updatedPendingChanges,
        isDirty: true,
      };
    }),

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
    set((state) => {
      const node = state.nodes.find((n) => n.id === nodeId);

      // Add pending change for diagram_datasets table
      const pendingChange: DiagramDatasetChange = {
        dataset_id: node?.data.dataset_id || nodeId,
        action: 'remove',
      };

      return {
        nodes: state.nodes.filter((n) => n.id !== nodeId),
        edges: state.edges.filter(
          (edge) => edge.source !== nodeId && edge.target !== nodeId
        ),
        pendingDatasetChanges: [...state.pendingDatasetChanges, pendingChange],
        isDirty: true,
      };
    }),

  updateNodePosition: (nodeId, position) =>
    set((state) => {
      const node = state.nodes.find((n) => n.id === nodeId);
      const datasetId = node?.data.dataset_id || nodeId;

      // Update location in pending changes if this dataset has a pending add
      const updatedPendingChanges = state.pendingDatasetChanges.map((change) =>
        change.dataset_id === datasetId && change.action === 'add'
          ? { ...change, location: position }
          : change
      );

      return {
        nodes: state.nodes.map((n) =>
          n.id === nodeId ? { ...n, position } : n
        ),
        savedPositions: {
          ...state.savedPositions,
          [nodeId]: position,
        },
        pendingDatasetChanges: updatedPendingChanges,
        isDirty: true,
      };
    }),

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

  setContext: (accountId, workspaceId, diagramType, diagramId) =>
    set({ accountId, workspaceId, diagramType, diagramId: diagramId || null }),

  loadDiagramDatasets: async () => {
    const state = get();
    const { diagramId } = state;

    if (!diagramId) {
      console.warn('[DiagramStore] Cannot load diagram datasets: diagramId not set');
      return;
    }

    try {
      set({ isLoading: true });

      console.log('[DiagramStore] Loading diagram datasets for diagram:', diagramId);

      // Import the service function
      const { getDiagramDatasets } = await import('../services/diagramDatasetService');
      const { supabase } = await import('../lib/supabase');

      // Get the diagram_datasets entries
      const diagramDatasets = await getDiagramDatasets(diagramId);

      console.log('[DiagramStore] Found diagram datasets:', {
        count: diagramDatasets.length,
        datasets: diagramDatasets,
      });

      if (diagramDatasets.length === 0) {
        set({ isLoading: false });
        return;
      }

      // Get the full dataset information for each dataset
      const datasetIds = diagramDatasets.map((dd) => dd.dataset_id);

      const { data: datasets, error } = await supabase
        .from('datasets')
        .select('*')
        .in('id', datasetIds);

      if (error) {
        console.error('[DiagramStore] Error fetching datasets:', error);
        throw error;
      }

      console.log('[DiagramStore] Loaded datasets from database:', datasets);

      // Create nodes for each dataset with saved positions
      const newNodes: DiagramNode[] = datasets.map((dataset) => {
        const diagramDataset = diagramDatasets.find((dd) => dd.dataset_id === dataset.id);
        const savedPosition = diagramDataset?.location as { x: number; y: number } | null;

        return {
          id: dataset.id,
          type: 'dataset',
          position: savedPosition || { x: 0, y: 0 },
          data: {
            dataset_id: dataset.id,
            name: dataset.name,
            schema: dataset.schema,
            fully_qualified_name: dataset.fully_qualified_name || dataset.name,
            medallion_layer: dataset.medallion_layer || 'Source',
            dataset_type: dataset.dataset_type || 'table',
            description: dataset.description,
            sync_status: dataset.sync_status,
            has_uncommitted_changes: dataset.has_uncommitted_changes,
            last_synced_at: dataset.last_synced_at,
            created_at: dataset.created_at,
            updated_at: dataset.updated_at,
            columnCount: 0,
            relationshipCount: 0,
            lineageCount: { upstream: 0, downstream: 0 },
            isExpanded: diagramDataset?.is_expanded || false,
            isHighlighted: false,
          },
        };
      });

      console.log('[DiagramStore] Created nodes from datasets:', newNodes);

      // Load relationships between these datasets
      const datasetIdsSet = new Set(datasetIds);
      console.log('[DiagramStore] Loading relationships for dataset IDs:', Array.from(datasetIdsSet));

      // Get all columns for these datasets with their references
      const { data: columnsData, error: columnsError } = await supabase
        .from('columns')
        .select(`
          id,
          dataset_id,
          reference_column_id,
          reference_type
        `)
        .in('dataset_id', datasetIds)
        .not('reference_column_id', 'is', null);

      if (columnsError) {
        console.error('[DiagramStore] Error fetching relationships:', columnsError);
      }

      console.log('[DiagramStore] Found columns with references:', columnsData);

      // Get the referenced columns to find their datasets
      const referencedColumnIds = columnsData?.map(c => c.reference_column_id).filter(Boolean) || [];

      let referencedColumns: any[] = [];
      if (referencedColumnIds.length > 0) {
        const { data: refColsData, error: refColsError } = await supabase
          .from('columns')
          .select('id, dataset_id')
          .in('id', referencedColumnIds);

        if (refColsError) {
          console.error('[DiagramStore] Error fetching referenced columns:', refColsError);
        } else {
          referencedColumns = refColsData || [];
        }
      }

      console.log('[DiagramStore] Referenced columns:', referencedColumns);

      // Create a map of column_id -> dataset_id for quick lookup
      const columnToDatasetMap = new Map<string, string>();
      referencedColumns.forEach(col => {
        columnToDatasetMap.set(col.id, col.dataset_id);
      });

      // Build edges from relationships
      // Group by source_dataset -> target_dataset to create one edge per dataset pair
      const datasetPairMap = new Map<string, {
        source_dataset_id: string;
        target_dataset_id: string;
        source_columns: string[];
        target_columns: string[];
        relationship_type: string;
      }>();

      columnsData?.forEach(column => {
        const targetDatasetId = columnToDatasetMap.get(column.reference_column_id);

        // Only create edges between datasets that are both in the diagram
        if (targetDatasetId && datasetIdsSet.has(targetDatasetId)) {
          const pairKey = `${column.dataset_id}->${targetDatasetId}`;

          if (!datasetPairMap.has(pairKey)) {
            datasetPairMap.set(pairKey, {
              source_dataset_id: column.dataset_id,
              target_dataset_id: targetDatasetId,
              source_columns: [],
              target_columns: [],
              relationship_type: column.reference_type || 'FK',
            });
          }

          const pair = datasetPairMap.get(pairKey)!;
          pair.source_columns.push(column.id);
          pair.target_columns.push(column.reference_column_id);
        }
      });

      // Convert to DiagramEdge format
      const newEdges: DiagramEdge[] = Array.from(datasetPairMap.values()).map(pair => ({
        id: `edge-${pair.source_dataset_id}-${pair.target_dataset_id}`,
        source: pair.source_dataset_id,
        target: pair.target_dataset_id,
        sourceHandle: 'right',
        targetHandle: 'left',
        type: 'relationship',
        data: {
          relationship_type: pair.relationship_type as any,
          cardinality: '1:M' as any, // Default cardinality
          source_columns: pair.source_columns,
          target_columns: pair.target_columns,
        },
      }));

      console.log('[DiagramStore] Created relationship edges:', newEdges);

      set({
        nodes: newNodes,
        edges: newEdges,
        isLoading: false,
      });

      console.log('[DiagramStore] Diagram datasets and relationships loaded successfully');
    } catch (error) {
      console.error('[DiagramStore] Failed to load diagram datasets:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  saveState: async (immediate = false) => {
    const state = get();
    const { accountId, workspaceId, diagramType, viewport, savedPositions, filters, layoutType, layoutDirection } = state;

    if (!accountId || !workspaceId) {
      console.warn('[DiagramStore] Cannot save: accountId or workspaceId not set');
      return;
    }

    const stateToSave = {
      viewport,
      node_positions: savedPositions,
      node_expansions: Object.fromEntries(
        Array.from(state.expandedNodes).map((id) => [id, true])
      ),
      filters,
      layout_type: layoutType,
      layout_direction: layoutDirection,
    };

    try {
      if (immediate) {
        set({ isSaving: true });

        // Save diagram state
        const result = await forceImmediateSave(accountId, workspaceId, diagramType, stateToSave);

        // Set diagram ID if not already set (for new diagrams)
        if (!get().diagramId && result.diagram_state.id) {
          console.log('[DiagramStore] Setting diagram ID after save:', result.diagram_state.id);
          set({ diagramId: result.diagram_state.id });
        }

        // Also save pending diagram-dataset changes
        await get().savePendingDatasetChanges();

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
          viewport: loadedState.viewport || DEFAULT_VIEWPORT,
          savedPositions: loadedState.node_positions || {},
          expandedNodes: expandedNodesSet,
          filters: loadedState.filters || DEFAULT_FILTERS,
          layoutType: (loadedState.layout_type as LayoutType) || 'hierarchical',
          layoutDirection: loadedState.layout_direction || 'TB',
          lastSaved: loadedState.last_saved || null,
          diagramId: loadedState.diagram_id || null, // Set diagram ID from loaded data
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
  // Diagram-Dataset Actions
  // =====================================================

  addPendingDatasetChange: (change) =>
    set((state) => ({
      pendingDatasetChanges: [...state.pendingDatasetChanges, change],
      isDirty: true,
    })),

  removePendingDatasetChange: (datasetId) =>
    set((state) => ({
      pendingDatasetChanges: state.pendingDatasetChanges.filter(
        (change) => change.dataset_id !== datasetId
      ),
    })),

  clearPendingDatasetChanges: () =>
    set({ pendingDatasetChanges: [] }),

  savePendingDatasetChanges: async () => {
    const state = get();
    const { diagramId, pendingDatasetChanges, accountId } = state;

    if (!diagramId) {
      console.warn('[DiagramStore] Cannot save pending changes: diagramId not set', {
        diagramId,
        pendingChangesCount: pendingDatasetChanges.length,
      });
      return;
    }

    if (pendingDatasetChanges.length === 0) {
      console.log('[DiagramStore] No pending dataset changes to save');
      return;
    }

    try {
      set({ isSaving: true });

      console.log('[DiagramStore] Saving pending dataset changes:', {
        diagramId,
        changesCount: pendingDatasetChanges.length,
        changes: pendingDatasetChanges,
      });

      // Use the auth user ID if available and valid
      // Ensure we only pass valid UUIDs (or undefined) to avoid foreign key errors
      const isValidUUID = (str: string | null) => {
        if (!str) return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(str);
      };

      const userId = (accountId && isValidUUID(accountId)) ? accountId : undefined;

      console.log('[DiagramStore] User ID for audit trail:', userId);

      const result = await savePendingChanges(
        diagramId,
        pendingDatasetChanges,
        userId
      );

      console.log('[DiagramStore] Pending changes saved:', result);

      // Clear pending changes after successful save
      set({
        pendingDatasetChanges: [],
        isSaving: false,
      });

      if (result.errors.length > 0) {
        console.error('[DiagramStore] Some changes failed to save:', result.errors);
      }
    } catch (error) {
      console.error('[DiagramStore] Failed to save pending dataset changes:', error);
      set({ isSaving: false });
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
