/**
 * Custom Dataset Node Component for React Flow Canvas
 * Displays dataset information with color coding, icons, and sync status
 * Renamed from DataNode to DatasetNode for refactored architecture
 */

import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { GitBranch, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import type { CanvasNodeData } from '../../types/canvas';
import type { SyncStatus } from '../../types/dataset';
import {
  MEDALLION_TAILWIND_COLORS,
  ENTITY_ICONS,
} from '../../types/canvas';

/**
 * Get sync status icon and color
 */
function getSyncStatusIndicator(syncStatus: SyncStatus | undefined, hasUncommittedChanges: boolean) {
  if (!syncStatus || syncStatus === 'not_synced') {
    return {
      icon: Clock,
      color: 'text-gray-400',
      bgColor: 'bg-gray-100',
      title: 'Not synced to source control',
    };
  }

  if (hasUncommittedChanges) {
    return {
      icon: AlertCircle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      title: 'Uncommitted changes',
    };
  }

  switch (syncStatus) {
    case 'synced':
      return {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        title: 'Synced with source control',
      };
    case 'pending':
      return {
        icon: Clock,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        title: 'Sync pending',
      };
    case 'conflict':
      return {
        icon: AlertCircle,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100',
        title: 'Sync conflict detected',
      };
    case 'error':
      return {
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-100',
        title: 'Sync error',
      };
    default:
      return {
        icon: Clock,
        color: 'text-gray-400',
        bgColor: 'bg-gray-100',
        title: 'Unknown sync status',
      };
  }
}

export const DatasetNode = memo(({ data, selected }: NodeProps<CanvasNodeData>) => {
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

  // Get sync status indicator
  const syncIndicator = getSyncStatusIndicator(
    data.sync_status,
    data.has_uncommitted_changes || false
  );

  return (
    <div
      className={`
        min-w-[200px] max-w-[300px] rounded-lg border-2 shadow-md
        ${colorClass}
        ${selected ? 'ring-4 ring-blue-500' : ''}
        ${data.isHovered ? 'shadow-lg' : ''}
        transition-all duration-200
        relative
      `}
    >
      {/* Connection handles */}
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 !bg-blue-600"
      />

      {/* Sync Status Badge (top-right corner) */}
      <div
        className={`absolute -top-2 -right-2 ${syncIndicator.bgColor} rounded-full p-1 shadow-md z-10`}
        title={syncIndicator.title}
      >
        <syncIndicator.icon className={`w-3 h-3 ${syncIndicator.color}`} />
      </div>

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
            <div className="text-xs text-white text-opacity-80 truncate">
              {data.fqn}
            </div>
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
          {/* Uncommitted changes indicator */}
          {data.has_uncommitted_changes && (
            <span
              className="px-1.5 py-0.5 bg-yellow-500 text-yellow-900 text-xs rounded flex items-center gap-1"
              title="Has uncommitted changes"
            >
              <GitBranch className="w-3 h-3" />
              Modified
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

DatasetNode.displayName = 'DatasetNode';
