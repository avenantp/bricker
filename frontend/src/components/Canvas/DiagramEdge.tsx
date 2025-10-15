/**
 * Custom Diagram Edge Component
 * Renders smart-routed edges with labels and relationship indicators
 * Based on specification: docs/prp/051-dataset-diagram-view-specification.md
 */

import { memo } from 'react';
import { BaseEdge, EdgeProps, EdgeLabelRenderer } from '@xyflow/react';
import type { DiagramEdge as DiagramEdgeType, RelationshipEdgeData, LineageEdgeData } from '../../types/diagram';
import { calculateEdgeLabelPosition } from '../../services/edgeRouting';

/**
 * Relationship Edge Component
 */
export const RelationshipEdge = memo(({ id, source, target, data, selected }: EdgeProps<RelationshipEdgeData>) => {
  const edgeData = data as RelationshipEdgeData;
  const route = edgeData.route;

  if (!route) {
    // No route calculated yet, render basic edge
    return null;
  }

  // Calculate label position
  const labelPosition = calculateEdgeLabelPosition({
    path: route.path,
    controlPoints: route.controlPoints,
    alignmentType: route.alignmentType as any,
  });

  // Determine edge color based on state
  const edgeColor = selected ? '#3b82f6' : '#6b7280';
  const edgeWidth = selected ? 2 : 1.5;

  return (
    <>
      {/* Main edge path */}
      <BaseEdge
        id={id}
        path={route.path}
        style={{
          stroke: edgeColor,
          strokeWidth: edgeWidth,
        }}
        markerEnd={selected ? 'url(#arrow-selected)' : 'url(#arrow)'}
      />

      {/* Edge Label */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelPosition.x}px,${labelPosition.y}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-sm text-xs">
            {/* Relationship Type */}
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {edgeData.relationship_type || 'Relationship'}
            </div>

            {/* Cardinality */}
            {edgeData.cardinality && (
              <div className="text-gray-500 dark:text-gray-400 text-xs">
                {edgeData.cardinality}
              </div>
            )}

            {/* Column mapping indicator */}
            {edgeData.source_columns && edgeData.target_columns && (
              <div className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                {edgeData.source_columns.length} → {edgeData.target_columns.length} columns
              </div>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

RelationshipEdge.displayName = 'RelationshipEdge';

/**
 * Lineage Edge Component
 */
export const LineageEdge = memo(({ id, source, target, data, selected }: EdgeProps<LineageEdgeData>) => {
  const edgeData = data as LineageEdgeData;
  const route = edgeData.route;

  if (!route) {
    // No route calculated yet, render basic edge
    return null;
  }

  // Calculate label position
  const labelPosition = calculateEdgeLabelPosition({
    path: route.path,
    controlPoints: route.controlPoints,
    alignmentType: route.alignmentType as any,
  });

  // Determine edge style based on mapping type
  let edgeColor = '#6b7280';
  let strokeDasharray: string | undefined;

  switch (edgeData.mapping_type) {
    case 'Direct':
      edgeColor = '#10b981'; // green
      strokeDasharray = undefined;
      break;
    case 'Transform':
      edgeColor = '#3b82f6'; // blue
      strokeDasharray = undefined;
      break;
    case 'Derived':
      edgeColor = '#f59e0b'; // amber
      strokeDasharray = '5,5';
      break;
    case 'Calculated':
      edgeColor = '#8b5cf6'; // purple
      strokeDasharray = '5,5';
      break;
  }

  if (selected) {
    edgeColor = '#3b82f6';
  }

  const edgeWidth = selected ? 2 : 1.5;

  return (
    <>
      {/* Main edge path */}
      <BaseEdge
        id={id}
        path={route.path}
        style={{
          stroke: edgeColor,
          strokeWidth: edgeWidth,
          strokeDasharray,
        }}
        markerEnd={selected ? 'url(#arrow-selected)' : 'url(#arrow)'}
      />

      {/* Edge Label */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelPosition.x}px,${labelPosition.y}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <div className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-sm text-xs">
            {/* Mapping Type */}
            <div className="font-medium" style={{ color: edgeColor }}>
              {edgeData.mapping_type}
            </div>

            {/* Transformation Expression */}
            {edgeData.transformation_expression && (
              <div className="text-gray-500 dark:text-gray-400 text-xs font-mono mt-0.5 max-w-[200px] truncate">
                {edgeData.transformation_expression}
              </div>
            )}

            {/* Column mapping */}
            {edgeData.source_column_id && edgeData.target_column_id && (
              <div className="text-gray-400 dark:text-gray-500 text-xs mt-0.5">
                Column-level lineage
              </div>
            )}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});

LineageEdge.displayName = 'LineageEdge';

/**
 * Default Diagram Edge Component
 * Auto-selects between Relationship and Lineage based on data
 */
export const DiagramEdge = memo((props: EdgeProps) => {
  const edgeData = props.data as RelationshipEdgeData | LineageEdgeData;

  // Determine edge type based on data structure
  if ('mapping_type' in edgeData) {
    return <LineageEdge {...(props as EdgeProps<LineageEdgeData>)} />;
  } else {
    return <RelationshipEdge {...(props as EdgeProps<RelationshipEdgeData>)} />;
  }
});

DiagramEdge.displayName = 'DiagramEdge';

// Export edge types for React Flow
export const edgeTypes = {
  relationship: RelationshipEdge,
  lineage: LineageEdge,
  default: DiagramEdge,
};
