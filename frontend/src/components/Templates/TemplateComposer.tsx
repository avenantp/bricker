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
  Moon,
  Sun,
} from 'lucide-react';
import { nodeTypes } from './nodes';
import { CompositionNodeData, TemplateFragment, TemplateComposition } from '../../types/template';
import { compileTemplate } from '../../services/template-compiler';
import { canEditComposition } from '../../services/template-clone-service';
import { useDevMode } from '../../hooks/useDevMode';
import { useAuth } from '../../hooks/useAuth';
import { useStore } from '../../store/useStore';
import YAMLValidator from './YAMLValidator';
import { FragmentLibraryPanel } from './FragmentLibraryPanel';
import { FragmentEditorPanel } from './FragmentEditorPanel';

interface TemplateComposerProps {
  composition?: TemplateComposition;
  fragments?: TemplateFragment[];
  onSave?: (composition: TemplateComposition) => Promise<void>;
  onClone?: (composition: TemplateComposition) => Promise<void>;
  isDevMode?: boolean;
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
  isDevMode: isDevModeProp,
}: TemplateComposerProps) {
  const { isDevMode: isDevModeHook } = useDevMode();
  const isDevMode = isDevModeProp ?? isDevModeHook;
  const { user } = useAuth();
  const { isDarkMode, toggleDarkMode } = useStore();
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
  const [codeFragments, setCodeFragments] = useState<any[]>([]);
  const [showFragmentEditor, setShowFragmentEditor] = useState(false);
  const [selectedCodeFragment, setSelectedCodeFragment] = useState<any | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Check edit permissions
  useEffect(() => {
    if (composition?.id && user?.id) {
      setIsCheckingPermissions(true);
      canEditComposition(composition.id, user.id, isDevMode)
        .then(setCanEdit)
        .finally(() => setIsCheckingPermissions(false));
    }
  }, [composition?.id, user?.id, isDevMode]);

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

  // Add a code fragment node
  const addCodeFragmentNode = (fragment: any) => {
    const newNode: Node<CompositionNodeData> = {
      id: `code-fragment-${Date.now()}`,
      type: 'codeFragment',
      position: { x: Math.random() * 400 + 200, y: Math.random() * 300 + 200 },
      data: {
        id: fragment.id,
        type: 'codeFragment',
        position: { x: 0, y: 0 },
        data: {
          label: fragment.name,
          fragmentName: fragment.name,
          fragmentType: fragment.type,
          jinjaCode: fragment.code,
        },
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  // Handle node click to open editor
  const handleNodeClick = (event: any, node: Node) => {
    if (node.type === 'codeFragment') {
      setSelectedNodeId(node.id);
      const fragmentData = codeFragments.find((f) => f.id === node.data.id);
      setSelectedCodeFragment(fragmentData || {
        id: node.data.id,
        name: node.data.data?.fragmentName || 'Untitled',
        type: node.data.data?.fragmentType || 'staging',
        code: node.data.data?.jinjaCode || '',
      });
      setShowFragmentEditor(true);
    }
  };

  // Handle fragment save
  const handleFragmentSave = (data: { name: string; type: string; code: string }) => {
    if (selectedCodeFragment?.id) {
      // Update existing fragment
      setCodeFragments((frags) =>
        frags.map((f) => (f.id === selectedCodeFragment.id ? { ...f, ...data } : f))
      );

      // Update node data
      setNodes((nds) =>
        nds.map((node) =>
          node.id === selectedNodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  data: {
                    ...node.data.data,
                    fragmentName: data.name,
                    fragmentType: data.type,
                    jinjaCode: data.code,
                  },
                },
              }
            : node
        )
      );
    } else {
      // Create new fragment
      const newFragment = {
        id: `fragment-${Date.now()}`,
        ...data,
      };
      setCodeFragments((frags) => [...frags, newFragment]);
      addCodeFragmentNode(newFragment);
    }
  };

  // Handle adding new fragment from library panel
  const handleAddNewFragment = () => {
    setSelectedCodeFragment(null);
    setSelectedNodeId(null);
    setShowFragmentEditor(true);
  };

  // Handle fragment click from library
  const handleFragmentClick = (fragment: any) => {
    addCodeFragmentNode(fragment);
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
        workspace_id: composition?.workspace_id || null,
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
        created_by: composition?.created_by || user?.id || '',
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
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Top Toolbar */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-3">
        {/* Read-only banner for system templates */}
        {composition?.is_system_template && !canEdit && (
          <div className="mb-3 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg flex items-center gap-3">
            <Lock className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-200">
                System Template (Read-Only)
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-400">
                This is a system template. {isDevMode ? 'Save changes to create a new version.' : 'Clone to your workspace to customize it.'}
              </p>
            </div>
            {!isDevMode && onClone && (
              <button
                onClick={handleClone}
                className="flex items-center gap-2 px-3 py-1.5 bg-yellow-600 dark:bg-yellow-700 text-white rounded hover:bg-yellow-700 dark:hover:bg-yellow-600 transition-colors text-sm"
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
              className="text-lg font-semibold bg-transparent text-gray-900 dark:text-gray-100 border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 disabled:opacity-60 disabled:cursor-not-allowed"
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
        <FragmentLibraryPanel
          fragments={codeFragments}
          onFragmentClick={handleFragmentClick}
          onAddFragment={handleAddNewFragment}
          selectedFragmentId={selectedCodeFragment?.id}
        />

        {/* Main Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={canEdit ? onNodesChange : undefined}
            onEdgesChange={canEdit ? onEdgesChange : undefined}
            onConnect={canEdit ? onConnect : undefined}
            onNodeClick={handleNodeClick}
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
          <div className="w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Compiled Template</h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              <pre className="p-4 text-xs font-mono text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
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

      {/* Fragment Editor Panel */}
      <FragmentEditorPanel
        isOpen={showFragmentEditor}
        fragmentId={selectedCodeFragment?.id}
        initialData={selectedCodeFragment ? {
          name: selectedCodeFragment.name,
          type: selectedCodeFragment.type,
          code: selectedCodeFragment.code,
        } : undefined}
        onClose={() => setShowFragmentEditor(false)}
        onSave={handleFragmentSave}
      />
    </div>
  );
}
