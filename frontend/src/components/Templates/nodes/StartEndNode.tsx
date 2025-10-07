import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Play, StopCircle } from 'lucide-react';
import { CompositionNodeData } from '../../../types/template';

interface StartEndNodeProps extends NodeProps<CompositionNodeData> {}

const StartEndNode = memo(({ data, selected }: StartEndNodeProps) => {
  const isStart = data.type === 'start';

  return (
    <div
      className={`
        rounded-full border-2 shadow-lg w-20 h-20 flex items-center justify-center
        ${selected
          ? isStart ? 'border-green-500' : 'border-red-500'
          : isStart ? 'border-green-300' : 'border-red-300'
        }
        ${isStart ? 'bg-gradient-to-br from-green-50 to-green-100' : 'bg-gradient-to-br from-red-50 to-red-100'}
      `}
    >
      {isStart ? (
        <>
          <Play className="w-8 h-8 text-green-600" />
          <Handle
            type="source"
            position={Position.Bottom}
            className="w-3 h-3 !bg-green-500"
          />
        </>
      ) : (
        <>
          <StopCircle className="w-8 h-8 text-red-600" />
          <Handle
            type="target"
            position={Position.Top}
            className="w-3 h-3 !bg-red-500"
          />
        </>
      )}
    </div>
  );
});

StartEndNode.displayName = 'StartEndNode';

export default StartEndNode;
