/**
 * Custom Dataset Node Component for React Flow Canvas
 * Displays dataset information with color coding, icons, and sync status
 * Supports expansion to show column details
 * Based on specification: docs/prp/051-dataset-diagram-view-specification.md
 */

import { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  GitBranch,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  ChevronDown,
  ChevronRight,
  Database,
  BarChart,
  Layers,
  MoreVertical,
} from 'lucide-react';
import type { DatasetNodeData } from '../../types/diagram';
import type { SyncStatus } from '../../types/dataset';
import {
  MEDALLION_TAILWIND_COLORS,
  DATASET_TYPE_ICONS,
} from '../../types/canvas';
import { ColumnList } from './ColumnList';
import { useDiagramStore } from '../../store/diagramStore';
import { DatasetContextMenu } from '../Diagram/DatasetContextMenu';

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

export const DatasetNode = memo(({ data, selected, id }: NodeProps<DatasetNodeData>) => {
  const toggleNodeExpansion = useDiagramStore((state) => state.toggleNodeExpansion);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isHovered, setIsHovered] = useState(false);

  // Get color based on medallion layer
  const colorClass = MEDALLION_TAILWIND_COLORS[data.medallion_layer];

  // Get icon based on dataset type
  const icon = DATASET_TYPE_ICONS[data.dataset_type] || DATASET_TYPE_ICONS.Table;

  // Determine if confidence score should be shown
  const showConfidenceBadge =
    data.ai_confidence_score !== undefined && data.ai_confidence_score < 80;

  // Get sync status indicator
  const syncIndicator = getSyncStatusIndicator(
    data.sync_status,
    data.has_uncommitted_changes || false
  );

  // Calculate node width based on expansion state
  const nodeWidth = data.isExpanded ? 'w-[400px]' : 'min-w-[200px] max-w-[300px]';

  // Handle expansion toggle
  const handleToggleExpansion = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleNodeExpansion(id);
  };

  // Handle context menu (right-click)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  // Handle ellipsis button click
  const handleEllipsisClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    setContextMenu({ x: rect.right, y: rect.bottom });
  };

  return (
    <>
      <div
        className={`
          ${nodeWidth} rounded-lg border-2 shadow-md
          ${colorClass}
          ${selected ? 'ring-4 ring-blue-500' : ''}
          ${data.isHighlighted ? 'ring-2 ring-purple-500' : ''}
          transition-all duration-200
          relative bg-white dark:bg-gray-800
        `}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
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
          {/* Expansion Toggle Button */}
          <button
            onClick={handleToggleExpansion}
            className="btn-icon p-0.5 hover:bg-white hover:bg-opacity-20 rounded"
            title={data.isExpanded ? 'Collapse' : 'Expand'}
          >
            {data.isExpanded ? (
              <ChevronDown className="w-4 h-4 text-white" />
            ) : (
              <ChevronRight className="w-4 h-4 text-white" />
            )}
          </button>

          <span className="text-2xl" title={data.dataset_type}>
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

          {/* Ellipsis Button (visible on hover) */}
          {isHovered && (
            <button
              onClick={handleEllipsisClick}
              className="btn-icon p-1 hover:bg-white hover:bg-opacity-20 rounded transition-opacity"
              title="More options"
            >
              <MoreVertical className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Node Body */}
      <div className="px-3 py-2 bg-white bg-opacity-10 backdrop-blur-sm">
        {/* Dataset Type */}
        <div className="flex items-center gap-2 mb-2">
          <span className="px-2 py-0.5 bg-white bg-opacity-20 text-white text-xs rounded">
            {data.dataset_type}
          </span>
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

        {/* Statistics row (collapsed state) */}
        {!data.isExpanded && (
          <div className="flex items-center gap-3 mt-2 text-xs text-white text-opacity-80">
            <div className="flex items-center gap-1" title="Columns">
              <Database className="w-3 h-3" />
              <span>{data.columnCount || 0}</span>
            </div>
            <div className="flex items-center gap-1" title="Relationships">
              <Layers className="w-3 h-3" />
              <span>{data.relationshipCount || 0}</span>
            </div>
            <div className="flex items-center gap-1" title="Lineage (upstream/downstream)">
              <BarChart className="w-3 h-3" />
              <span>
                {data.lineageCount?.upstream || 0}/{data.lineageCount?.downstream || 0}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Column List (expanded state) */}
      {data.isExpanded && data.columns && (
        <ColumnList
          columns={data.columns}
          datasetId={data.dataset_id}
          isReadOnly={false}
          onAddColumn={() => {
            // TODO: Implement add column handler
            console.log('Add column to', data.dataset_id);
          }}
          onEditColumn={(columnId) => {
            // TODO: Implement edit column handler
            console.log('Edit column', columnId);
          }}
          onDeleteColumn={(columnId) => {
            // TODO: Implement delete column handler
            console.log('Delete column', columnId);
          }}
        />
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 !bg-blue-600"
      />
    </div>

    {/* Context Menu */}
    {contextMenu && (
      <DatasetContextMenu
        datasetId={id}
        x={contextMenu.x}
        y={contextMenu.y}
        onClose={() => setContextMenu(null)}
      />
    )}
  </>
  );
});

DatasetNode.displayName = 'DatasetNode';
