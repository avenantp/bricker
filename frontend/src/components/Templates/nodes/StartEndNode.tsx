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
        rounded-full border-2 shadow-lg w-10 h-10 flex items-center justify-center
        ${selected
          ? isStart ? 'border-green-600' : 'border-red-600'
          : isStart ? 'border-green-400' : 'border-red-400'
        }
        ${isStart ? 'bg-green-100' : 'bg-red-100'}
      `}
    >
      {isStart ? (
        <>
          <Play className="w-4 h-4 text-green-600" />
          <Handle
            type="source"
            position={Position.Bottom}
            className="w-1.5 h-1.5 !bg-green-500"
          />
        </>
      ) : (
        <>
          <StopCircle className="w-4 h-4 text-red-600" />
          <Handle
            type="target"
            position={Position.Top}
            className="w-1.5 h-1.5 !bg-red-500"
          />
        </>
      )}
    </div>
  );
});

StartEndNode.displayName = 'StartEndNode';

export default StartEndNode;
