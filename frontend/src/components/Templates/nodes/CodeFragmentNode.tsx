import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { FileCode } from 'lucide-react';
import { CompositionNodeData } from '../../../types/template';

interface CodeFragmentNodeProps extends NodeProps<CompositionNodeData> {}

const CodeFragmentNode = memo(({ data, selected }: CodeFragmentNodeProps) => {
  const fragmentName = data.fragmentName || 'Untitled Fragment';

  return (
    <div
      className={`
        bg-white rounded-lg border-2 shadow-lg min-w-[200px]
        ${selected ? 'border-primary-500 ring-2 ring-primary-200' : 'border-gray-300'}
        transition-all cursor-pointer hover:shadow-xl
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-1.5 h-1.5 !bg-primary-500"
      />

      {/* Node Content */}
      <div className="px-4 py-3">
        <div className="flex items-center gap-2">
          <FileCode className="w-4 h-4 text-primary-500" />
          <span className="font-semibold text-gray-800 truncate">{fragmentName}</span>
        </div>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-1.5 h-1.5 !bg-primary-500"
      />
    </div>
  );
});

CodeFragmentNode.displayName = 'CodeFragmentNode';

export default CodeFragmentNode;
