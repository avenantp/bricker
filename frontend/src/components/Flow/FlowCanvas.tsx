import { useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  ConnectionMode,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from './nodes';
import { useStore } from '@/store/useStore';
import { Download, Upload, Trash2, Github, CheckCircle } from 'lucide-react';
import { githubApi } from '@/api/github';
import type { DataModelYAML } from '@/store/types';

export function FlowCanvas() {
  const {
    nodes: storeNodes,
    edges: storeEdges,
    setNodes: setStoreNodes,
    setEdges: setStoreEdges,
    setSelectedNodeId,
    currentWorkspace,
    currentModel,
  } = useStore();

  const [isExportingToGitHub, setIsExportingToGitHub] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);

  // Sync local state with store
  const handleNodesChange = useCallback(
    (changes: any) => {
      onNodesChange(changes);
      setStoreNodes(nodes);
    },
    [nodes, onNodesChange, setStoreNodes]
  );

  const handleEdgesChange = useCallback(
    (changes: any) => {
      onEdgesChange(changes);
      setStoreEdges(edges);
    },
    [edges, onEdgesChange, setStoreEdges]
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: Edge = {
        ...connection,
        id: `edge_${Date.now()}`,
        type: 'smoothstep',
        animated: true,
      } as Edge;

      setEdges((eds) => addEdge(newEdge, eds));
      setStoreEdges([...edges, newEdge]);
    },
    [edges, setEdges, setStoreEdges]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  const handleExportYAML = () => {
    const modelData = {
      nodes,
      edges,
      exported_at: new Date().toISOString(),
    };

    const yamlContent = `# Uroq Data Model Export
# Generated: ${new Date().toISOString()}

nodes:
${nodes.map((node) => `  - id: ${node.id}
    type: ${node.type || 'default'}
    position: { x: ${node.position.x}, y: ${node.position.y} }
    data: ${JSON.stringify(node.data, null, 6).replace(/\n/g, '\n      ')}
`).join('\n')}

edges:
${edges.map((edge) => `  - id: ${edge.id}
    source: ${edge.source}
    target: ${edge.target}
    type: ${edge.type || 'default'}
`).join('\n')}
`;

    const blob = new Blob([yamlContent], { type: 'text/yaml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `model_${Date.now()}.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearCanvas = () => {
    if (confirm('Are you sure you want to clear the canvas?')) {
      setNodes([]);
      setEdges([]);
      setStoreNodes([]);
      setStoreEdges([]);
    }
  };

  const handleExportToGitHub = async () => {
    if (!currentWorkspace) {
      alert('Please select a workspace first');
      return;
    }

    if (nodes.length === 0) {
      alert('Canvas is empty. Add some nodes before exporting.');
      return;
    }

    setIsExportingToGitHub(true);
    setExportSuccess(false);

    try {
      // Create DataModelYAML object
      const modelData: DataModelYAML = {
        id: currentModel?.id || `model_${Date.now()}`,
        name: currentModel?.name || `Model ${new Date().toLocaleDateString()}`,
        description: currentModel?.description,
        model_type: 'custom',
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        nodes,
        edges,
        metadata: {
          workspace_id: currentWorkspace.id,
          workspace_name: currentWorkspace.name,
        },
      };

      // Export to GitHub
      const result = await githubApi.exportModel(currentWorkspace.id, modelData);

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);

      console.log('Model exported to GitHub:', result);
    } catch (error: any) {
      console.error('Failed to export to GitHub:', error);
      alert(`Failed to export to GitHub: ${error.message}`);
    } finally {
      setIsExportingToGitHub(false);
    }
  };

  return (
    <div className="w-full h-full bg-gray-50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        connectionMode={ConnectionMode.Loose}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultEdgeOptions={{
          type: 'smoothstep',
          animated: true,
          style: { strokeWidth: 2 },
        }}
      >
        <Background color="#e5e7eb" gap={16} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'source':
                return '#9ca3af';
              case 'dimension':
                return '#3b82f6';
              case 'fact':
                return '#a855f7';
              case 'hub':
                return '#10b981';
              case 'link':
                return '#f59e0b';
              case 'satellite':
                return '#f97316';
              default:
                return '#6b7280';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />

        {/* Custom Toolbar */}
        <Panel position="top-right" className="flex gap-2">
          <button
            onClick={handleExportToGitHub}
            disabled={isExportingToGitHub || nodes.length === 0}
            className={`p-2 rounded-lg shadow-md transition-colors ${
              exportSuccess
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-gray-900 hover:bg-gray-800'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Export to GitHub"
          >
            {exportSuccess ? (
              <CheckCircle className="w-4 h-4 text-white" />
            ) : (
              <Github className="w-4 h-4 text-white" />
            )}
          </button>
          <button
            onClick={handleExportYAML}
            className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
            title="Download YAML"
          >
            <Download className="w-4 h-4 text-gray-700" />
          </button>
          <button
            onClick={handleClearCanvas}
            className="p-2 bg-white rounded-lg shadow-md hover:bg-red-50 transition-colors"
            title="Clear Canvas"
          >
            <Trash2 className="w-4 h-4 text-red-600" />
          </button>
        </Panel>

        {/* Empty State */}
        {nodes.length === 0 && (
          <Panel position="top-center" className="pointer-events-none">
            <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-6 text-center max-w-md">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Canvas is Empty
              </h3>
              <p className="text-sm text-gray-600">
                Use the AI assistant to generate data models, or manually add nodes
                from the sidebar.
              </p>
            </div>
          </Panel>
        )}

        {/* Stats Panel */}
        {nodes.length > 0 && (
          <Panel position="top-left" className="bg-white/90 backdrop-blur-sm rounded-lg shadow-md p-3">
            <div className="text-xs space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-medium">Nodes:</span>
                <span className="text-gray-600">{nodes.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">Edges:</span>
                <span className="text-gray-600">{edges.length}</span>
              </div>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
