import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch, Edit2 } from 'lucide-react';
import { CompositionNodeData } from '../../../types/template';

interface ConditionNodeProps extends NodeProps<CompositionNodeData> {}

const ConditionNode = memo(({ data, selected }: ConditionNodeProps) => {
  const [condition, setCondition] = useState(data.condition || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleConditionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCondition(e.target.value);
    data.condition = e.target.value;
  };

  return (
    <div
      className={`
        bg-white rounded-lg border-2 shadow-lg min-w-[250px] max-w-[400px]
        ${selected ? 'border-yellow-500' : 'border-yellow-300'}
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-1.5 h-1.5 !bg-yellow-500"
      />

      {/* Node Header */}
      <div className="px-4 py-3 border-b border-yellow-200 bg-yellow-50">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-yellow-600" />
          <span className="font-semibold text-gray-800">{data.label}</span>
        </div>
      </div>

      {/* Condition Editor */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-gray-700">Condition</label>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <Edit2 className="w-3 h-3 text-gray-500" />
          </button>
        </div>

        {isEditing ? (
          <textarea
            value={condition}
            onChange={handleConditionChange}
            onBlur={() => setIsEditing(false)}
            placeholder="e.g., {% if include_validation %}"
            className="w-full px-2 py-1.5 text-xs font-mono border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-yellow-500 resize-none"
            rows={3}
            autoFocus
          />
        ) : (
          <div
            onClick={() => setIsEditing(true)}
            className="w-full px-2 py-1.5 text-xs font-mono bg-gray-50 border border-gray-200 rounded cursor-text min-h-[60px]"
          >
            {condition || (
              <span className="text-gray-400">Click to add condition...</span>
            )}
          </div>
        )}

        <p className="text-xs text-gray-500 mt-2">
          Use Jinja2 syntax for conditions
        </p>
      </div>

      {/* Output Handles - True/False branches */}
      <div className="px-4 pb-3 flex justify-between">
        <span className="text-xs text-green-600 font-medium">True</span>
        <span className="text-xs text-red-600 font-medium">False</span>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="w-1.5 h-1.5 !bg-green-500 !left-[30%]"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="w-1.5 h-1.5 !bg-red-500 !left-[70%]"
      />
    </div>
  );
});

ConditionNode.displayName = 'ConditionNode';

export default ConditionNode;
