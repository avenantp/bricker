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
import { getDatasetBorderColor } from '../../config/nodeColors';

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
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Get border color based on dataset_type (priority) or medallion_layer (fallback)
  const borderColor = getDatasetBorderColor(data.dataset_type, data.medallion_layer);

  // Handle context menu (right-click)
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      {/* Target Handle (Left side - for incoming edges) */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="w-2 h-2 !bg-blue-500 !border-2 !border-white opacity-0 hover:opacity-100 transition-opacity"
        style={{ left: -4 }}
      />

      {/* Source Handle (Right side - for outgoing edges) */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="w-2 h-2 !bg-blue-500 !border-2 !border-white opacity-0 hover:opacity-100 transition-opacity"
        style={{ right: -4 }}
      />

      <div
        className={`
          w-[160px] rounded border-l-4 shadow-sm
          ${borderColor}
          ${selected ? 'ring-2 ring-blue-500' : ''}
          ${data.isHighlighted ? 'ring-2 ring-purple-500' : ''}
          transition-all duration-200
          bg-white dark:bg-gray-800
          cursor-pointer hover:shadow-md
        `}
        onContextMenu={handleContextMenu}
      >
        {/* Node Content - Just the dataset name */}
        <div className="px-3 py-2">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
            {data.name}
          </div>
        </div>
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
