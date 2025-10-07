import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Code2, FileCode } from 'lucide-react';
import { CompositionNodeData } from '../../../types/template';

interface CodeFragmentNodeProps extends NodeProps<CompositionNodeData> {}

const CodeFragmentNode = memo(({ data, selected }: CodeFragmentNodeProps) => {
  const fragmentName = data.fragmentName || 'Untitled Fragment';
  const fragmentType = data.fragmentType || 'staging';

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'data_vault':
        return 'bg-blue-50 border-blue-300';
      case 'staging':
        return 'bg-green-50 border-green-300';
      case 'dimensional':
        return 'bg-purple-50 border-purple-300';
      case 'utility':
        return 'bg-orange-50 border-orange-300';
      default:
        return 'bg-gray-50 border-gray-300';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'data_vault':
        return 'bg-blue-100 text-blue-700';
      case 'staging':
        return 'bg-green-100 text-green-700';
      case 'dimensional':
        return 'bg-purple-100 text-purple-700';
      case 'utility':
        return 'bg-orange-100 text-orange-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div
      className={`
        bg-white rounded-lg border-2 shadow-lg min-w-[280px]
        ${selected ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-300'}
        transition-all cursor-pointer hover:shadow-xl
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-primary-500"
      />

      {/* Node Header */}
      <div className={`px-4 py-3 border-b border-gray-200 ${getTypeColor(fragmentType)}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1">
            <FileCode className="w-4 h-4 text-primary-500" />
            <span className="font-semibold text-gray-800 truncate">{fragmentName}</span>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${getTypeBadgeColor(fragmentType)}`}>
            {fragmentType.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Node Content */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2 text-xs text-gray-600">
          <Code2 className="w-3 h-3" />
          <span>Click to edit Jinja template</span>
        </div>

        {data.jinjaCode && (
          <div className="mt-2 text-xs text-gray-500 font-mono bg-gray-50 p-2 rounded border border-gray-200 line-clamp-3">
            {data.jinjaCode.substring(0, 100)}
            {data.jinjaCode.length > 100 && '...'}
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-primary-500"
      />
    </div>
  );
});

CodeFragmentNode.displayName = 'CodeFragmentNode';

export default CodeFragmentNode;
