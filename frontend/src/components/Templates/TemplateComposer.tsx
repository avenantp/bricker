import { useCallback, useState, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  Edge,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Save,
  Play,
  Plus,
  FileCode,
  GitBranch,
  Merge as MergeIcon,
  Eye,
  Download,
  Loader2,
  Lock,
  Copy,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { nodeTypes } from './nodes';
import { CompositionNodeData, TemplateFragment, TemplateComposition } from '../../types/template';
import { compileTemplate } from '../../services/template-compiler';
import { canEditComposition } from '../../services/template-clone-service';
import { useDevMode } from '../../hooks/useDevMode';
import YAMLValidator from './YAMLValidator';

interface TemplateComposerProps {
  composition?: TemplateComposition;
  fragments?: TemplateFragment[];
  onSave?: (composition: TemplateComposition) => Promise<void>;
  onClone?: (composition: TemplateComposition) => Promise<void>;
  workspaceId: string;
  userId: string;
}

const initialNodes: Node<CompositionNodeData>[] = [
  {
    id: 'start',
    type: 'start',
    position: { x: 400, y: 50 },
    data: { id: 'start', type: 'start', position: { x: 400, y: 50 }, data: { label: 'Start' } },
  },
  {
    id: 'end',
    type: 'end',
    position: { x: 400, y: 600 },
    data: { id: 'end', type: 'end', position: { x: 400, y: 600 }, data: { label: 'End' } },
  },
];

export function TemplateComposer({
  composition,
  fragments = [],
  onSave,
  onClone,
  workspaceId,
  userId,
}: TemplateComposerProps) {
  const { isDevMode } = useDevMode();
  const [nodes, setNodes, onNodesChange] = useNodesState(
    composition?.flow_data?.nodes || initialNodes
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    composition?.flow_data?.edges || []
  );
  const [selectedFragment, setSelectedFragment] = useState<TemplateFragment | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [compiledTemplate, setCompiledTemplate] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [compositionName, setCompositionName] = useState(composition?.name || 'New Template');
  const [canEdit, setCanEdit] = useState(true);
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);
  const [showYAMLValidator, setShowYAMLValidator] = useState(false);

  // Check edit permissions
  useEffect(() => {
    if (composition?.id) {
      setIsCheckingPermissions(true);
      canEditComposition(composition.id, userId, isDevMode)
        .then(setCanEdit)
        .finally(() => setIsCheckingPermissions(false));
    }
  }, [composition?.id, userId, isDevMode]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Add a new fragment node
  const addFragmentNode = (fragment: TemplateFragment) => {
    const newNode: Node<CompositionNodeData> = {
      id: `fragment-${Date.now()}`,
      type: 'fragment',
      position: { x: Math.random() * 400 + 200, y: Math.random() * 300 + 200 },
      data: {
        id: `fragment-${Date.now()}`,
        type: 'fragment',
        position: { x: 0, y: 0 },
        data: {
          label: fragment.name,
          fragmentId: fragment.id,
          fragment,
          isEnabled: true,
          editorContent: fragment.fragment_content,
        },
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  // Add a condition node
  const addConditionNode = () => {
    const newNode: Node<CompositionNodeData> = {
      id: `condition-${Date.now()}`,
      type: 'condition',
      position: { x: Math.random() * 400 + 200, y: Math.random() * 300 + 200 },
      data: {
        id: `condition-${Date.now()}`,
        type: 'condition',
        position: { x: 0, y: 0 },
        data: {
          label: 'Condition',
          condition: '',
        },
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  // Add a merge node
  const addMergeNode = () => {
    const newNode: Node<CompositionNodeData> = {
      id: `merge-${Date.now()}`,
      type: 'merge',
      position: { x: Math.random() * 400 + 200, y: Math.random() * 300 + 200 },
      data: {
        id: `merge-${Date.now()}`,
        type: 'merge',
        position: { x: 0, y: 0 },
        data: {
          label: 'Merge',
        },
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  // Compile the template
  const handleCompile = async () => {
    setIsCompiling(true);
    try {
      const result = await compileTemplate(nodes, edges);
      setCompiledTemplate(result);
      setShowPreview(true);
    } catch (error) {
      console.error('Compilation error:', error);
      alert('Failed to compile template. Check console for details.');
    } finally {
      setIsCompiling(false);
    }
  };

  // Save the composition
  const handleSave = async () => {
    if (!onSave || !canEdit) {
      alert('You do not have permission to save this template.');
      return;
    }

    setIsSaving(true);
    try {
      const compositionData: TemplateComposition = {
        id: composition?.id || '',
        workspace_id: workspaceId,
        name: compositionName,
        description: composition?.description || null,
        language: 'sql', // or detect from fragments
        flow_data: {
          nodes: nodes as CompositionNodeData[],
          edges: edges.map(e => ({
            id: e.id,
            source: e.source,
            target: e.target,
            type: e.type,
            label: e.label,
          })),
        },
        is_system_template: composition?.is_system_template || false,
        cloned_from_id: composition?.cloned_from_id || null,
        github_path: composition?.github_path || null,
        yaml_valid: true,
        yaml_errors: [],
        last_validated_at: null,
        created_by: composition?.created_by || userId,
        created_at: composition?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_archived: false,
      };

      await onSave(compositionData);
      alert('Template composition saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save template composition.');
    } finally {
      setIsSaving(false);
    }
  };

  // Clone the composition
  const handleClone = async () => {
    if (!onClone || !composition) return;

    try {
      await onClone(composition);
      alert('Template cloned to your workspace! You can now customize it.');
    } catch (error) {
      console.error('Clone error:', error);
      alert('Failed to clone template.');
    }
  };

  // Download compiled template
  const handleDownload = () => {
    if (!compiledTemplate) return;

    const blob = new Blob([compiledTemplate], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${compositionName.replace(/\s+/g, '-').toLowerCase()}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Top Toolbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        {/* Read-only banner for system templates */}
        {composition?.is_system_template && !canEdit && (
          <div className="mb-3 px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3">
            <Lock className="w-4 h-4 text-yellow-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900">
                System Template (Read-Only)
              </p>
              <p className="text-xs text-yellow-700">
                This is a system template. {isDevMode ? 'Save changes to create a new version.' : 'Clone to your workspace to customize it.'}
              </p>
            </div>
            {!isDevMode && onClone && (
              <button
                onClick={handleClone}
                className="flex items-center gap-2 px-3 py-1.5 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-sm"
              >
                <Copy className="w-4 h-4" />
                Clone to Workspace
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <input
              type="text"
              value={compositionName}
              onChange={(e) => setCompositionName(e.target.value)}
              disabled={!canEdit}
              className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 disabled:opacity-60 disabled:cursor-not-allowed"
            />
            {composition?.is_system_template && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                System Template
              </span>
            )}
            {composition?.cloned_from_id && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                Cloned
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {isDevMode && (
              <button
                onClick={() => setShowYAMLValidator(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                title="Validate YAML (Dev Mode)"
              >
                <CheckCircle2 className="w-4 h-4" />
                Validate YAML
              </button>
            )}

            <button
              onClick={handleCompile}
              disabled={isCompiling}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isCompiling ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Compile
            </button>

            <button
              onClick={() => setShowPreview(!showPreview)}
              disabled={!compiledTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>

            <button
              onClick={handleDownload}
              disabled={!compiledTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>

            <button
              onClick={handleSave}
              disabled={isSaving || !canEdit || isCheckingPermissions}
              title={!canEdit ? 'You do not have permission to edit this template' : 'Save template'}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : !canEdit ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {!canEdit ? 'Read-Only' : 'Save'}
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Left Sidebar - Fragment Library */}
        <div className="w-80 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Template Fragments</h3>

            {/* Add Node Buttons */}
            <div className="space-y-2 mb-4">
              <button
                onClick={addConditionNode}
                className="w-full flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors"
              >
                <GitBranch className="w-4 h-4 text-yellow-600" />
                <span className="text-sm font-medium text-gray-700">Add Condition</span>
              </button>

              <button
                onClick={addMergeNode}
                className="w-full flex items-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <MergeIcon className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-medium text-gray-700">Add Merge</span>
              </button>
            </div>

            <div className="border-t border-gray-200 pt-4">
              {fragments.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No fragments available. Create some fragments first.
                </p>
              ) : (
                <div className="space-y-2">
                  {fragments.map((fragment) => (
                    <button
                      key={fragment.id}
                      onClick={() => addFragmentNode(fragment)}
                      className="w-full text-left px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <FileCode className="w-4 h-4 text-purple-600 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {fragment.name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {fragment.category}
                          </div>
                        </div>
                        <Plus className="w-4 h-4 text-purple-600" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={canEdit ? onNodesChange : undefined}
            onEdgesChange={canEdit ? onEdgesChange : undefined}
            onConnect={canEdit ? onConnect : undefined}
            nodeTypes={nodeTypes}
            nodesDraggable={canEdit}
            nodesConnectable={canEdit}
            elementsSelectable={true}
            fitView
          >
            <Background />
            <Controls />
            <MiniMap />

            <Panel position="top-left" className="bg-white rounded-lg shadow-lg p-3">
              <div className="text-xs text-gray-600">
                <div>Nodes: {nodes.length}</div>
                <div>Edges: {edges.length}</div>
              </div>
            </Panel>
          </ReactFlow>
        </div>

        {/* Right Sidebar - Preview */}
        {showPreview && (
          <div className="w-96 bg-white border-l border-gray-200 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700">Compiled Template</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              <pre className="p-4 text-xs font-mono text-gray-800 whitespace-pre-wrap">
                {compiledTemplate}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* YAML Validator Modal */}
      {showYAMLValidator && composition && (
        <YAMLValidator
          composition={composition}
          compiledTemplate={compiledTemplate}
          isDevMode={isDevMode}
          onClose={() => setShowYAMLValidator(false)}
        />
      )}
    </div>
  );
}
