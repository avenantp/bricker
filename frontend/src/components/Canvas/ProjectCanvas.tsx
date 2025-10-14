/**
 * Project Canvas Component
 * Main React Flow canvas for visualizing and editing data models
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Panel,
  Node,
  Edge,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  ZoomIn,
  ZoomOut,
  Maximize,
  Grid3x3,
  Save,
} from 'lucide-react';
import { DatasetNode } from './DatasetNode';
import { RelationshipEdge } from './RelationshipEdge';
import type {
  CanvasNode,
  CanvasEdge,
  CanvasViewport,
  CanvasState,
  MEDALLION_COLORS,
} from '../../types/canvas';

// Define node and edge types
const nodeTypes = {
  dataNode: DatasetNode, // Using DatasetNode (renamed from DataNode)
};

const edgeTypes = {
  relationship: RelationshipEdge,
};

interface ProjectCanvasProps {
  projectId: string;
  initialNodes?: CanvasNode[];
  initialEdges?: CanvasEdge[];
  onNodesChange?: (nodes: CanvasNode[]) => void;
  onEdgesChange?: (edges: CanvasEdge[]) => void;
  onSave?: (nodes: CanvasNode[], edges: CanvasEdge[]) => void;
  readOnly?: boolean;
}

function ProjectCanvasInner({
  projectId,
  initialNodes = [],
  initialEdges = [],
  onNodesChange,
  onEdgesChange,
  onSave,
  readOnly = false,
}: ProjectCanvasProps) {
  const { fitView, zoomIn, zoomOut, getViewport, setViewport } = useReactFlow();
  const [nodes, setNodes, handleNodesChange] = useNodesState<CanvasNode>(initialNodes);
  const [edges, setEdges, handleEdgesChange] = useEdgesState<CanvasEdge>(initialEdges);
  const [showGrid, setShowGrid] = useState(true);
  const canvasStateKey = `canvas-state-${projectId}`;

  // Load canvas state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(canvasStateKey);
    if (savedState) {
      try {
        const state: CanvasState = JSON.parse(savedState);
        if (state.viewport) {
          setTimeout(() => {
            setViewport(state.viewport, { duration: 0 });
          }, 100);
        }
      } catch (error) {
        console.error('Failed to load canvas state:', error);
      }
    }
  }, [projectId, canvasStateKey, setViewport]);

  // Save canvas state to localStorage when viewport changes
  const handleViewportChange = useCallback(() => {
    const viewport = getViewport();
    const state: CanvasState = {
      viewport,
      filters: {
        medallion_layers: [],
        entity_types: [],
        entity_subtypes: [],
        show_public_nodes: false,
      },
      selected_node_ids: nodes.filter((n) => n.selected).map((n) => n.id),
    };
    localStorage.setItem(canvasStateKey, JSON.stringify(state));
  }, [canvasStateKey, getViewport, nodes]);

  // Notify parent of node changes
  useEffect(() => {
    if (onNodesChange) {
      onNodesChange(nodes);
    }
  }, [nodes, onNodesChange]);

  // Notify parent of edge changes
  useEffect(() => {
    if (onEdgesChange) {
      onEdgesChange(edges);
    }
  }, [edges, onEdgesChange]);

  // Handle connection creation
  const onConnect = useCallback(
    (connection: Connection) => {
      if (readOnly) return;

      const newEdge: CanvasEdge = {
        ...connection,
        id: `edge-${connection.source}-${connection.target}`,
        type: 'relationship',
        data: {
          relationship_type: 'FK',
          cardinality: '1:M',
        },
      } as CanvasEdge;

      setEdges((eds) => addEdge(newEdge, eds));
    },
    [readOnly, setEdges]
  );

  // Handle save
  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(nodes, edges);
    }
    handleViewportChange();
  }, [nodes, edges, onSave, handleViewportChange]);

  // Handle fit view
  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 300 });
  }, [fitView]);

  // Handle zoom in
  const handleZoomIn = useCallback(() => {
    zoomIn({ duration: 300 });
  }, [zoomIn]);

  // Handle zoom out
  const handleZoomOut = useCallback(() => {
    zoomOut({ duration: 300 });
  }, [zoomOut]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + S to save
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        event.preventDefault();
        handleSave();
      }
      // Cmd/Ctrl + 0 to fit view
      if ((event.metaKey || event.ctrlKey) && event.key === '0') {
        event.preventDefault();
        handleFitView();
      }
      // Cmd/Ctrl + Plus to zoom in
      if ((event.metaKey || event.ctrlKey) && event.key === '+') {
        event.preventDefault();
        handleZoomIn();
      }
      // Cmd/Ctrl + Minus to zoom out
      if ((event.metaKey || event.ctrlKey) && event.key === '-') {
        event.preventDefault();
        handleZoomOut();
      }
      // G to toggle grid
      if (event.key === 'g' && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setShowGrid((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, handleFitView, handleZoomIn, handleZoomOut]);

  return (
    <div className="w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onMoveEnd={handleViewportChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        snapToGrid
        snapGrid={[15, 15]}
        defaultEdgeOptions={{
          type: 'relationship',
          animated: false,
        }}
        deleteKeyCode={readOnly ? null : 'Delete'}
        multiSelectionKeyCode="Shift"
      >
        {/* Background Grid */}
        {showGrid && (
          <Background
            variant={BackgroundVariant.Dots}
            gap={15}
            size={1}
            color="#cbd5e1"
          />
        )}

        {/* Controls */}
        <Controls
          showZoom={true}
          showFitView={true}
          showInteractive={true}
          position="bottom-left"
        />

        {/* MiniMap */}
        <MiniMap
          nodeStrokeWidth={3}
          nodeColor={(node) => {
            const canvasNode = node as CanvasNode;
            return (MEDALLION_COLORS as any)[canvasNode.data.medallion_layer] || '#6b7280';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          position="bottom-right"
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
          }}
        />

        {/* Custom Control Panel */}
        <Panel position="top-right" className="space-y-2">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 p-2 space-y-1">
            <button
              onClick={handleZoomIn}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Zoom In (Cmd/Ctrl + +)"
            >
              <ZoomIn className="w-4 h-4" />
              Zoom In
            </button>
            <button
              onClick={handleZoomOut}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Zoom Out (Cmd/Ctrl + -)"
            >
              <ZoomOut className="w-4 h-4" />
              Zoom Out
            </button>
            <button
              onClick={handleFitView}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Fit View (Cmd/Ctrl + 0)"
            >
              <Maximize className="w-4 h-4" />
              Fit View
            </button>
            <button
              onClick={() => setShowGrid(!showGrid)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition-colors ${
                showGrid
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              title="Toggle Grid (G)"
            >
              <Grid3x3 className="w-4 h-4" />
              Grid
            </button>
            {!readOnly && (
              <button
                onClick={handleSave}
                className="btn-primary w-full flex items-center gap-2 text-sm px-3"
                title="Save (Cmd/Ctrl + S)"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            )}
          </div>
        </Panel>

        {/* Info Panel */}
        <Panel position="top-left">
          <div className="bg-white rounded-lg shadow-md border border-gray-200 px-4 py-2">
            <div className="text-xs text-gray-600">
              <span className="font-semibold">{nodes.length}</span> nodes •{' '}
              <span className="font-semibold">{edges.length}</span> relationships
            </div>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}

// Wrapper with ReactFlowProvider
export function ProjectCanvas(props: ProjectCanvasProps) {
  return (
    <ReactFlowProvider>
      <ProjectCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
