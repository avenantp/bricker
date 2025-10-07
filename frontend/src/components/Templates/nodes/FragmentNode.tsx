import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Code2, Edit3, Eye, EyeOff, ChevronDown, ChevronRight } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { CompositionNodeData } from '../../../types/template';

interface FragmentNodeProps extends NodeProps<CompositionNodeData> {}

const FragmentNode = memo(({ data, selected }: FragmentNodeProps) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorContent, setEditorContent] = useState(
    data.editorContent || data.fragment?.fragment_content || ''
  );
  const [isEnabled, setIsEnabled] = useState(data.isEnabled ?? true);

  const handleEditorChange = (value: string | undefined) => {
    setEditorContent(value || '');
    // Update the node data
    if (data.fragment) {
      data.editorContent = value || '';
    }
  };

  const toggleEnabled = () => {
    setIsEnabled(!isEnabled);
    data.isEnabled = !isEnabled;
  };

  const toggleEditor = () => {
    setIsEditorOpen(!isEditorOpen);
  };

  return (
    <div
      className={`
        bg-white rounded-lg border-2 shadow-lg min-w-[300px] max-w-[600px]
        ${selected ? 'border-blue-500' : 'border-gray-300'}
        ${!isEnabled ? 'opacity-50' : ''}
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-blue-500"
      />

      {/* Node Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-purple-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <Code2 className="w-4 h-4 text-purple-600" />
            <span className="font-semibold text-gray-800">{data.label}</span>
            {data.fragment && (
              <span className="text-xs text-gray-500 px-2 py-0.5 bg-white rounded">
                {data.fragment.category}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleEnabled}
              className="p-1 hover:bg-white rounded transition-colors"
              title={isEnabled ? 'Disable fragment' : 'Enable fragment'}
            >
              {isEnabled ? (
                <Eye className="w-4 h-4 text-green-600" />
              ) : (
                <EyeOff className="w-4 h-4 text-gray-400" />
              )}
            </button>
            <button
              onClick={toggleEditor}
              className="p-1 hover:bg-white rounded transition-colors"
              title={isEditorOpen ? 'Collapse editor' : 'Expand editor'}
            >
              {isEditorOpen ? (
                <ChevronDown className="w-4 h-4 text-gray-600" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {data.fragment?.description && (
          <p className="text-xs text-gray-600 mt-1">{data.fragment.description}</p>
        )}
      </div>

      {/* Editor Section */}
      {isEditorOpen && (
        <div className="border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50">
            <div className="flex items-center gap-2">
              <Edit3 className="w-3 h-3 text-gray-500" />
              <span className="text-xs font-medium text-gray-700">Template Content</span>
            </div>
            <span className="text-xs text-gray-500">
              {data.fragment?.language || 'jinja2'}
            </span>
          </div>
          <div className="h-[300px] overflow-hidden">
            <Editor
              height="300px"
              language={data.fragment?.language === 'sql' ? 'sql' : 'python'}
              value={editorContent}
              onChange={handleEditorChange}
              theme="vs-light"
              options={{
                minimap: { enabled: false },
                fontSize: 12,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                readOnly: false,
                automaticLayout: true,
              }}
            />
          </div>
        </div>
      )}

      {/* Fragment Info */}
      <div className="px-4 py-2 text-xs">
        {data.fragment?.variables && data.fragment.variables.length > 0 && (
          <div className="mb-2">
            <span className="font-medium text-gray-700">Variables:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {data.fragment.variables.map((v, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                >
                  {v.name}
                  {v.required && '*'}
                </span>
              ))}
            </div>
          </div>
        )}

        {!isEditorOpen && (
          <div className="text-gray-500 font-mono text-xs line-clamp-2 bg-gray-50 p-2 rounded">
            {editorContent.substring(0, 150)}
            {editorContent.length > 150 && '...'}
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-blue-500"
      />
    </div>
  );
});

FragmentNode.displayName = 'FragmentNode';

export default FragmentNode;
