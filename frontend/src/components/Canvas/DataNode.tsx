/**
 * Custom Data Node Component for React Flow Canvas
 * Displays node information with color coding and icons
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import type { CanvasNodeData } from '../../types/canvas';
import {
  MEDALLION_TAILWIND_COLORS,
  ENTITY_ICONS,
} from '../../types/canvas';

export const DataNode = memo(({ data, selected }: NodeProps<CanvasNodeData>) => {
  // Get color based on medallion layer
  const colorClass = MEDALLION_TAILWIND_COLORS[data.medallion_layer];

  // Get icon based on entity subtype or type
  const icon =
    (data.entity_subtype && ENTITY_ICONS[data.entity_subtype]) ||
    ENTITY_ICONS[data.entity_type] ||
    ENTITY_ICONS.Table;

  // Determine if confidence score should be shown
  const showConfidenceBadge =
    data.ai_confidence_score !== undefined && data.ai_confidence_score < 80;

  return (
    <div
      className={`
        min-w-[200px] max-w-[300px] rounded-lg border-2 shadow-md
        ${colorClass}
        ${selected ? 'ring-4 ring-blue-500' : ''}
        ${data.isHovered ? 'shadow-lg' : ''}
        transition-all duration-200
      `}
    >
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-blue-600"
      />

      {/* Node Header */}
      <div className="px-3 py-2 bg-white bg-opacity-20 backdrop-blur-sm border-b border-white border-opacity-30">
        <div className="flex items-center gap-2">
          <span className="text-2xl" title={data.entity_subtype || data.entity_type}>
            {icon}
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white text-sm truncate">
              {data.name}
            </div>
            {data.schema && (
              <div className="text-xs text-white text-opacity-80 truncate">
                {data.schema}.{data.name}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Node Body */}
      <div className="px-3 py-2 bg-white bg-opacity-10 backdrop-blur-sm">
        {/* Entity Type & Subtype */}
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 bg-white bg-opacity-20 text-white text-xs rounded">
            {data.entity_type}
          </span>
          {data.entity_subtype && (
            <span className="px-2 py-0.5 bg-white bg-opacity-30 text-white text-xs rounded">
              {data.entity_subtype}
            </span>
          )}
        </div>

        {/* Description */}
        {data.description && (
          <p className="text-xs text-white text-opacity-90 line-clamp-2 mb-2">
            {data.description}
          </p>
        )}

        {/* Metadata badges */}
        <div className="flex flex-wrap gap-1">
          {data.medallion_layer && (
            <span className="px-1.5 py-0.5 bg-white bg-opacity-20 text-white text-xs rounded">
              {data.medallion_layer}
            </span>
          )}
          {data.materialization_type && (
            <span className="px-1.5 py-0.5 bg-white bg-opacity-20 text-white text-xs rounded">
              {data.materialization_type}
            </span>
          )}
          {showConfidenceBadge && (
            <span
              className={`px-1.5 py-0.5 text-xs rounded ${
                data.ai_confidence_score! >= 70
                  ? 'bg-yellow-500 text-yellow-900'
                  : 'bg-red-500 text-white'
              }`}
              title={`AI Confidence: ${data.ai_confidence_score}%`}
            >
              AI: {data.ai_confidence_score}%
            </span>
          )}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-blue-600"
      />
    </div>
  );
});

DataNode.displayName = 'DataNode';
