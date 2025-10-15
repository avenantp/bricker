/**
 * DatasetDiagramView - Main Container Component
 * Integrates React Flow canvas with diagram features
 * Based on specification: docs/prp/051-dataset-diagram-view-specification.md
 */

import { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  NodeChange,
  EdgeChange,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { DatasetNode } from '../Canvas/DatasetNode';
import { edgeTypes } from '../Canvas/DiagramEdge';
import { DiagramToolbar } from '../Canvas/DiagramToolbar';
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
    // TODO: Get actual accountId and workspaceId from auth context
    const accountId = 'demo-account-id';
    const workspaceId = 'demo-workspace-id';

    // Set context for persistence
    setContext(accountId, workspaceId, 'dataset');

    // Load saved diagram state
    loadState(workspaceId, 'dataset').catch((error) => {
      console.error('Failed to load diagram state:', error);
    });

    // Apply initial layout if no nodes
    if (storeNodes.length === 0) {
      // TODO: Fetch datasets from API and populate diagram
      console.log('TODO: Fetch datasets and apply initial layout');
    }
  }, []);

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

  return (
    <div className="dataset-diagram-view w-full h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Diagram Toolbar */}
      <DiagramToolbar />

      {/* React Flow Canvas */}
      <div className="flex-1 relative">
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

          {/* Empty State */}
          {(!nodes || nodes.length === 0) && !isFiltering && (
            <Panel position="center">
              <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-8 max-w-md">
                <div className="text-center">
                  <div className="text-6xl mb-4">📊</div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No Datasets Found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    Create your first dataset or import metadata to get started with your data model.
                  </p>
                  <div className="flex gap-3 justify-center">
                    <button className="btn-primary">
                      Create Dataset
                    </button>
                    <button className="btn-secondary">
                      Import Metadata
                    </button>
                  </div>
                </div>
              </div>
            </Panel>
          )}

          {/* No Results State (when filtering) */}
          {(!nodes || nodes.length === 0) && isFiltering && (
            <Panel position="center">
              <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-8 max-w-md">
                <div className="text-center">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    No Results Found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    No datasets match your current filters or search query. Try adjusting your criteria.
                  </p>
                  <button
                    onClick={() => {
                      // TODO: Reset filters
                      console.log('TODO: Reset filters');
                    }}
                    className="btn-secondary"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  );
}
