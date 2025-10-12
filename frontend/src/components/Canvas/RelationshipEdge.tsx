/**
 * Custom Relationship Edge Component for React Flow Canvas
 * Displays relationships between nodes with cardinality notation
 */

import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getSmoothStepPath,
} from '@xyflow/react';
import type { CanvasEdgeData } from '../../types/canvas';

export const RelationshipEdge = memo(
  ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    selected,
  }: EdgeProps<CanvasEdgeData>) => {
    const [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

    // Determine edge color based on relationship type
    const getEdgeColor = () => {
      if (selected) return '#3b82f6'; // blue-500
      switch (data?.relationship_type) {
        case 'FK':
          return '#6b7280'; // gray-500
        case 'BusinessKey':
          return '#8b5cf6'; // violet-500
        case 'NaturalKey':
          return '#10b981'; // emerald-500
        default:
          return '#6b7280';
      }
    };

    // Get cardinality display
    const getCardinalityLabel = () => {
      if (!data?.cardinality) return '';
      return data.cardinality;
    };

    return (
      <>
        <BaseEdge
          id={id}
          path={edgePath}
          style={{
            stroke: getEdgeColor(),
            strokeWidth: selected ? 3 : 2,
            strokeDasharray: data?.relationship_type === 'NaturalKey' ? '5,5' : undefined,
          }}
        />

        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <div
              className={`
                px-2 py-1 bg-white border rounded shadow-sm text-xs font-medium
                ${selected ? 'border-blue-500 text-blue-700' : 'border-gray-300 text-gray-700'}
                hover:bg-gray-50 cursor-pointer transition-colors
              `}
            >
              {getCardinalityLabel()}
            </div>
          </div>
        </EdgeLabelRenderer>
      </>
    );
  }
);

RelationshipEdge.displayName = 'RelationshipEdge';
