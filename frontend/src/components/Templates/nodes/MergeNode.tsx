import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Merge } from 'lucide-react';
import { CompositionNodeData } from '../../../types/template';

interface MergeNodeProps extends NodeProps<CompositionNodeData> {}

const MergeNode = memo(({ data, selected }: MergeNodeProps) => {
  return (
    <div
      className={`
        bg-white rounded-lg border-2 shadow-lg w-32 h-16 flex items-center justify-center
        ${selected ? 'border-indigo-500' : 'border-indigo-300'}
        bg-gradient-to-r from-indigo-50 to-purple-50
      `}
    >
      {/* Multiple Input Handles */}
      <Handle
        type="target"
        position={Position.Top}
        id="input-1"
        className="w-3 h-3 !bg-indigo-500 !left-[30%]"
      />
      <Handle
        type="target"
        position={Position.Top}
        id="input-2"
        className="w-3 h-3 !bg-indigo-500 !left-[70%]"
      />

      <div className="flex flex-col items-center">
        <Merge className="w-6 h-6 text-indigo-600" />
        <span className="text-xs font-medium text-gray-700 mt-1">{data.label}</span>
      </div>

      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-indigo-500"
      />
    </div>
  );
});

MergeNode.displayName = 'MergeNode';

export default MergeNode;
