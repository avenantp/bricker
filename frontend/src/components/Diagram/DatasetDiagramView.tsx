/**
 * DatasetDiagramView - Main Container Component
 * Integrates React Flow canvas with diagram features
 * Based on specification: docs/prp/051-dataset-diagram-view-specification.md
 */

import { useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  Connection,
  NodeChange,
  EdgeChange,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useParams } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAccount } from '../../hooks/useAccount';
import { DatasetNode } from '../Canvas/DatasetNode';
import { edgeTypes } from '../Canvas/DiagramEdge';
import { DiagramToolbar } from '../Canvas/DiagramToolbar';
import { Swimlanes } from './Swimlanes';
import { useDiagramStore } from '../../store/diagramStore';
import { useAutoEdgeRouting } from '../../hooks/useEdgeRouting';
import { useFilteredDiagram } from '../../hooks/useSearchAndFilter';
import { useLineageView } from '../../hooks/useLineageView';
import { MEDALLION_TAILWIND_COLORS } from '../../types/canvas';
import { getDatasetHexColor } from '../../config/nodeColors';
import type { DiagramNode, DiagramEdge } from '../../types/diagram';

// Register custom node types
const nodeTypes = {
  dataset: DatasetNode,
  default: DatasetNode,
};

/**
 * Main DatasetDiagramView Component
 */
export function DatasetDiagramView() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  // Route params
  const { workspaceId, diagramId } = useParams<{ workspaceId: string; diagramId?: string }>();

  // Authentication context (optional - used for audit trails)
  const { user } = useAuth();
  const { data: account } = useAccount();

  // Zustand store
  const {
    nodes: storeNodes,
    edges: storeEdges,
    viewport,
    viewMode,
    selectedDatasetId,
    setNodes: setStoreNodes,
    setEdges: setStoreEdges,
    updateNodePosition,
    updateViewport,
    addEdge: addStoreEdge,
    setContext,
    loadState,
    loadDiagramDatasets,
    saveState,
    applyLayout,
    addNodeToDiagram,
  } = useDiagramStore();

  // Get filtered nodes and edges (for relationship view)
  const { filteredNodes, filteredEdges, isFiltering } = useFilteredDiagram();

  // Lineage view hook (only active when viewMode is 'lineage')
  const {
    nodes: lineageNodes,
    edges: lineageEdges,
    isLoading: lineageLoading,
    error: lineageError,
    focusedDatasetId,
    setFocusedDatasetId,
  } = useLineageView({
    workspaceId: workspaceId || '',
    focusedDatasetId: selectedDatasetId,
    allNodes: storeNodes,
    enabled: viewMode === 'lineage' && !!workspaceId,
  });

  // Determine which nodes/edges to use based on view mode
  const displayNodes = viewMode === 'lineage' ? lineageNodes : filteredNodes;
  const displayEdges = viewMode === 'lineage' ? lineageEdges : filteredEdges;

  // Debug logging for node flow
  useEffect(() => {
    console.log('[DatasetDiagramView] 📊 Node flow:', {
      storeNodesCount: storeNodes?.length || 0,
      filteredNodesCount: filteredNodes?.length || 0,
      lineageNodesCount: lineageNodes?.length || 0,
      displayNodesCount: displayNodes?.length || 0,
      viewMode,
      storeNodeIds: storeNodes?.map(n => n.id) || [],
      filteredNodeIds: filteredNodes?.map(n => n.id) || [],
      displayNodeIds: displayNodes?.map(n => n.id) || []
    });
  }, [storeNodes, filteredNodes, lineageNodes, displayNodes, viewMode]);

  // React Flow state - ensure arrays are never undefined
  const [nodes, setNodes, onNodesChange] = useNodesState(displayNodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(displayEdges || []);

  // Auto edge routing hook
  useAutoEdgeRouting();

  // Sync React Flow state with display data (switches between relationship and lineage)
  useEffect(() => {
    console.log('[DatasetDiagramView] 🔄 Syncing displayNodes to React Flow:', {
      displayNodesCount: displayNodes?.length || 0,
      displayNodeIds: displayNodes?.map(n => ({ id: n.id, name: n.data.name })) || [],
      viewMode,
      storeNodesCount: storeNodes?.length || 0
    });
    setNodes(displayNodes || []);
  }, [displayNodes, setNodes, viewMode, storeNodes?.length]);

  useEffect(() => {
    setEdges(displayEdges);
  }, [displayEdges, setEdges]);

  // Apply dagre layout when switching to lineage view
  useEffect(() => {
    if (viewMode === 'lineage' && lineageNodes.length > 0 && !lineageLoading) {
      console.log('[DatasetDiagramView] Applying dagre layout for lineage view');
      // Apply dagre layout (left-to-right) for lineage visualization
      applyLayout('dagre').catch((error) => {
        console.error('[DatasetDiagramView] Failed to apply lineage layout:', error);
      });
    }
  }, [viewMode, lineageNodes.length, lineageLoading]);

  // Initialize diagram
  useEffect(() => {
    // Ensure we have workspace context
    if (!workspaceId) {
      console.warn('[DatasetDiagramView] Missing workspaceId');
      return;
    }

    console.log('[DatasetDiagramView] Initializing diagram', {
      accountId: account?.id || 'not-required',
      workspaceId,
      diagramType: 'dataset'
    });

    // Set context for persistence (use user ID for audit trails, not account ID)
    // Note: accountId in store is used for userId in audit columns
    const userId = user?.id || null;
    setContext(userId, workspaceId, 'dataset', diagramId);

    // Load saved diagram state and datasets
    const initializeDiagram = async () => {
      try {
        // First load the diagram state (viewport, positions, etc.)
        await loadState(workspaceId, 'dataset');

        // Then load the datasets that are part of this diagram
        await loadDiagramDatasets();

        console.log('[DatasetDiagramView] Diagram initialized successfully');
      } catch (error) {
        console.error('[DatasetDiagramView] Failed to initialize diagram:', error);
      }
    };

    initializeDiagram();
  }, [user?.id, workspaceId, setContext, loadState, loadDiagramDatasets, diagramId]);

  // Handle node changes
  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);

      // Update positions in store for persistence
      changes.forEach((change) => {
        if (change.type === 'position' && change.position && !change.dragging) {
          updateNodePosition(change.id, change.position);
        }
      });
    },
    [onNodesChange, updateNodePosition]
  );

  // Handle edge changes
  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  // Handle new connections (relationship creation)
  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: DiagramEdge = {
        id: `edge-${connection.source}-${connection.target}`,
        source: connection.source!,
        target: connection.target!,
        type: 'relationship',
        data: {
          relationship_type: 'FK',
          cardinality: '1:M',
          source_columns: [],
          target_columns: [],
        },
      };

      setEdges((eds) => addEdge(connection, eds));
      addStoreEdge(newEdge);

      // TODO: Open relationship dialog for configuration
      console.log('TODO: Open AddRelationshipDialog');
    },
    [setEdges, addStoreEdge]
  );

  // Handle viewport changes
  const onViewportChange = useCallback(
    (newViewport: { x: number; y: number; zoom: number }) => {
      updateViewport(newViewport);
    },
    [updateViewport]
  );

  // Get node color for minimap
  const getNodeColor = useCallback((node: DiagramNode) => {
    return getDatasetHexColor(node.data.dataset_type, node.data.medallion_layer);
  }, []);

  // Handle drag over (allow drop)
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    // Only log occasionally to avoid spam
    if (Math.random() < 0.01) {
      console.log('[DatasetDiagramView] 📍 Drag over canvas at:', { x: event.clientX, y: event.clientY });
    }
  }, []);

  // Handle drop - add dataset to diagram at drop position
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      console.log('[DatasetDiagramView] 🎯 DROP EVENT TRIGGERED!');
      event.preventDefault();

      const datasetId = event.dataTransfer.getData('application/dataset-id');
      console.log('[DatasetDiagramView] 📦 Dataset ID from drag data:', datasetId);

      if (!datasetId) {
        console.log('[DatasetDiagramView] ❌ No dataset ID in drag data, aborting');
        return;
      }

      // Get position in flow coordinates
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      console.log('[DatasetDiagramView] 📍 Drop position:', {
        client: { x: event.clientX, y: event.clientY },
        flow: position,
        datasetId
      });

      // Check if node already exists on diagram
      const existingNode = storeNodes.find((n) => n.id === datasetId);
      console.log('[DatasetDiagramView] 🔍 Checking for existing node:', {
        exists: !!existingNode,
        needsPositioning: existingNode?.data.needsPositioning,
        hasPosition: existingNode?.position,
        totalNodesInStore: storeNodes.length
      });

      if (existingNode) {
        console.log('[DatasetDiagramView] ⚠️ Node exists, checking if it needs positioning');

        // If node exists but needs positioning (was added by click), just update its position
        if (existingNode.data.needsPositioning) {
          console.log('[DatasetDiagramView] ✅ Updating existing node position to drop location');
          const { updateNode } = useDiagramStore.getState();
          updateNode(datasetId, { needsPositioning: false });
          updateNodePosition(datasetId, position);
          return;
        }

        // Node already has a position, ignore drop
        console.log('[DatasetDiagramView] ❌ Dataset already on diagram with position, ignoring drop');
        return;
      }

      console.log('[DatasetDiagramView] ✅ Node does not exist, proceeding with creation');

      // Get dataset details from drag data
      const datasetJson = event.dataTransfer.getData('application/dataset-json');
      console.log('[DatasetDiagramView] 📄 Dataset JSON from drag data:', {
        hasJson: !!datasetJson,
        length: datasetJson?.length
      });

      if (!datasetJson) {
        console.error('[DatasetDiagramView] ❌ No dataset data in drag event');
        return;
      }

      try {
        const dataset = JSON.parse(datasetJson);
        console.log('[DatasetDiagramView] ✅ Parsed dataset:', {
          id: dataset.id,
          name: dataset.name,
          medallion_layer: dataset.medallion_layer
        });

        const medallionLayer = dataset.medallion_layer || 'Source';

        // Use collision-free position (adjust drop position if it overlaps)
        const { findNonOverlappingPosition } = useDiagramStore.getState();
        const finalPosition = findNonOverlappingPosition(position);

        console.log('[DatasetDiagramView] 📍 Using collision-free position:', {
          medallionLayer,
          requested: position,
          final: finalPosition,
          adjusted: position.x !== finalPosition.x || position.y !== finalPosition.y
        });

        // Create node with collision-free position
        const newNode: any = {
          id: datasetId,
          type: 'dataset',
          position: finalPosition,
          data: {
            dataset_id: datasetId,
            name: dataset.name,
            fully_qualified_name: dataset.fully_qualified_name || dataset.name,
            medallion_layer: medallionLayer,
            dataset_type: dataset.dataset_type || 'table',
            description: dataset.description,
            sync_status: dataset.sync_status,
            has_uncommitted_changes: dataset.has_uncommitted_changes,
            last_synced_at: dataset.last_synced_at,
            created_at: dataset.created_at,
            updated_at: dataset.updated_at,
            columnCount: 0, // TODO: Get from actual column data
            relationshipCount: 0, // TODO: Calculate from edges
            lineageCount: { upstream: 0, downstream: 0 }, // TODO: Calculate from edges
            isExpanded: false,
            isHighlighted: false,
          },
        };

        console.log('[DatasetDiagramView] 🏗️ Created new node:', {
          id: newNode.id,
          type: newNode.type,
          position: newNode.position,
          datasetId: newNode.data.dataset_id,
          name: newNode.data.name
        });

        // Add node to store (this creates the pending change)
        console.log('[DatasetDiagramView] 📥 Adding node to store...');
        const { addNode } = useDiagramStore.getState();
        addNode(newNode);

        console.log('[DatasetDiagramView] ✅ Dataset added to diagram via drag-drop successfully!');
      } catch (error) {
        console.error('[DatasetDiagramView] ❌ Failed to add dataset via drag-drop:', error);
      }
    },
    [storeNodes, screenToFlowPosition]
  );

  // Show error if workspaceId is missing
  if (!workspaceId) {
    return (
      <div className="dataset-diagram-view w-full h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-2">Missing Configuration</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Workspace ID missing from URL.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="dataset-diagram-view w-full h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Diagram Toolbar */}
      <DiagramToolbar />

      {/* React Flow Canvas */}
      <div
        ref={reactFlowWrapper}
        className="flex-1 relative"
        onDrop={onDrop}
        onDragOver={onDragOver}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onViewportChange={onViewportChange}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultViewport={viewport}
          minZoom={0.1}
          maxZoom={4.0}
          snapToGrid={true}
          snapGrid={[15, 15]}
          attributionPosition="bottom-right"
        >
          {/* Background Grid */}
          <Background
            variant={BackgroundVariant.Dots}
            gap={15}
            size={1}
            color="#94a3b8"
            className="bg-gray-50 dark:bg-gray-900"
          />

          {/* Zoom Controls */}
          <Controls
            position="bottom-right"
            showZoom={true}
            showFitView={true}
            showInteractive={false}
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg"
          />

          {/* MiniMap */}
          <MiniMap
            nodeColor={getNodeColor}
            position="bottom-left"
            className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg"
            maskColor="rgba(0, 0, 0, 0.1)"
          />

          {/* Status Panel */}
          <Panel position="top-right" className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-md px-3 py-2">
            <div className="text-xs space-y-1">
              {/* View Mode Indicator */}
              <div className="text-gray-600 dark:text-gray-400 pb-1 border-b border-gray-200 dark:border-gray-700 mb-1">
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  {viewMode === 'lineage' ? 'Lineage View' : 'Relationship View'}
                </span>
              </div>

              {/* Node/Edge counts */}
              <div className="text-gray-600 dark:text-gray-400">
                Datasets: <span className="font-semibold text-gray-900 dark:text-gray-100">{nodes?.length || 0}</span>
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                {viewMode === 'lineage' ? 'Lineage Flows' : 'Relationships'}: <span className="font-semibold text-gray-900 dark:text-gray-100">{edges?.length || 0}</span>
              </div>

              {/* Lineage-specific info */}
              {viewMode === 'lineage' && (
                <>
                  {focusedDatasetId && (
                    <div className="text-blue-600 dark:text-blue-400 font-medium">
                      Focused View
                    </div>
                  )}
                  {lineageLoading && (
                    <div className="text-amber-600 dark:text-amber-400">
                      Loading lineage...
                    </div>
                  )}
                  {lineageError && (
                    <div className="text-red-600 dark:text-red-400">
                      Error loading lineage
                    </div>
                  )}
                </>
              )}

              {/* Filtering indicator (relationship view only) */}
              {viewMode === 'relationships' && isFiltering && (
                <div className="text-blue-600 dark:text-blue-400 font-medium">
                  Filtering Active
                </div>
              )}
            </div>
          </Panel>
        </ReactFlow>
      </div>
    </div>
  );
}
