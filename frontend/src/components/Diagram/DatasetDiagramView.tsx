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
import { MEDALLION_TAILWIND_COLORS } from '../../types/canvas';
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
  const { workspaceId } = useParams<{ workspaceId: string }>();

  // Authentication context (optional - used for audit trails)
  const { user } = useAuth();
  const { data: account } = useAccount();

  // Zustand store
  const {
    nodes: storeNodes,
    edges: storeEdges,
    viewport,
    setNodes: setStoreNodes,
    setEdges: setStoreEdges,
    updateNodePosition,
    updateViewport,
    addEdge: addStoreEdge,
    setContext,
    loadState,
    saveState,
    applyLayout,
    addNodeToDiagram,
  } = useDiagramStore();

  // Get filtered nodes and edges
  const { filteredNodes, filteredEdges, isFiltering } = useFilteredDiagram();

  // React Flow state - ensure arrays are never undefined
  const [nodes, setNodes, onNodesChange] = useNodesState(filteredNodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(filteredEdges || []);

  // Auto edge routing hook
  useAutoEdgeRouting();

  // Sync React Flow state with Zustand store
  useEffect(() => {
    setNodes(filteredNodes);
  }, [filteredNodes, setNodes]);

  useEffect(() => {
    setEdges(filteredEdges);
  }, [filteredEdges, setEdges]);

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

    // Set context for persistence (use placeholder for accountId if not available)
    const accountId = account?.id || 'default-account';
    setContext(accountId, workspaceId, 'dataset');

    // Load saved diagram state
    loadState(workspaceId, 'dataset').catch((error) => {
      console.error('Failed to load diagram state:', error);
    });

    // Apply initial layout if no nodes
    if (storeNodes.length === 0) {
      console.log('[DatasetDiagramView] No nodes in store, ready for datasets to be added');
    }
  }, [account?.id, workspaceId, setContext, loadState, storeNodes.length]);

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
    const colorClass = MEDALLION_TAILWIND_COLORS[node.data.medallion_layer];
    // Extract color from Tailwind class
    const colorMap: Record<string, string> = {
      'border-gray-400': '#9ca3af',
      'border-amber-500': '#f59e0b',
      'border-gray-500': '#6b7280',
      'border-yellow-500': '#eab308',
    };
    return colorMap[colorClass] || '#6b7280';
  }, []);

  // Handle drag over (allow drop)
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  // Handle drop - add dataset to diagram at drop position
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const datasetId = event.dataTransfer.getData('application/dataset-id');
      if (!datasetId) return;

      // Check if node already exists on diagram
      const node = storeNodes.find((n) => n.id === datasetId);
      if (!node || node.position) return;

      // Get position in flow coordinates
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Update node with custom position (overrides swimlane positioning)
      setStoreNodes(
        storeNodes.map((n) =>
          n.id === datasetId ? { ...n, position } : n
        )
      );
    },
    [storeNodes, setStoreNodes, screenToFlowPosition]
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
          fitView
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

          {/* Swimlanes for medallion layers */}
          <Swimlanes />

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
              <div className="text-gray-600 dark:text-gray-400">
                Nodes: <span className="font-semibold text-gray-900 dark:text-gray-100">{nodes?.length || 0}</span>
              </div>
              <div className="text-gray-600 dark:text-gray-400">
                Edges: <span className="font-semibold text-gray-900 dark:text-gray-100">{edges?.length || 0}</span>
              </div>
              {isFiltering && (
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
