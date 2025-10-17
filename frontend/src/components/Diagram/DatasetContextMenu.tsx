/**
 * Dataset Context Menu Component
 * Shows context menu for dataset nodes on right-click or ellipsis click
 */

import { useCallback, useEffect } from 'react';
import {
  Copy,
  Trash2,
  Edit3,
  GitBranch,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  Settings,
} from 'lucide-react';
import { useDiagramStore } from '../../store/diagramStore';

interface DatasetContextMenuProps {
  datasetId: string;
  x: number;
  y: number;
  onClose: () => void;
}

export function DatasetContextMenu({ datasetId, x, y, onClose }: DatasetContextMenuProps) {
  const { nodes, deleteNode, highlightLineage, clearHighlights } = useDiagramStore();
  const node = nodes.find((n) => n.id === datasetId);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dataset-context-menu')) {
        onClose();
      }
    };

    // Small delay to prevent immediate close on same click that opened menu
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  const handleEdit = useCallback(() => {
    // TODO: Open dataset editor dialog
    console.log('TODO: Open dataset editor for', datasetId);
    onClose();
  }, [datasetId, onClose]);

  const handleDelete = useCallback(() => {
    if (window.confirm('Are you sure you want to remove this dataset from the diagram?')) {
      deleteNode(datasetId);
    }
    onClose();
  }, [datasetId, deleteNode, onClose]);

  const handleViewUpstream = useCallback(() => {
    highlightLineage(datasetId, 'upstream');
    onClose();
  }, [datasetId, highlightLineage, onClose]);

  const handleViewDownstream = useCallback(() => {
    highlightLineage(datasetId, 'downstream');
    onClose();
  }, [datasetId, highlightLineage, onClose]);

  const handleViewLineage = useCallback(() => {
    highlightLineage(datasetId, 'both');
    onClose();
  }, [datasetId, highlightLineage, onClose]);

  const handleClearHighlights = useCallback(() => {
    clearHighlights();
    onClose();
  }, [clearHighlights, onClose]);

  const handleCopyId = useCallback(() => {
    navigator.clipboard.writeText(node?.data.fqn || datasetId);
    onClose();
  }, [datasetId, node, onClose]);

  const handleSettings = useCallback(() => {
    // TODO: Open dataset settings
    console.log('TODO: Open dataset settings for', datasetId);
    onClose();
  }, [datasetId, onClose]);

  if (!node) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Context Menu */}
      <div
        className="dataset-context-menu fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-[200px]"
        style={{
          left: `${x}px`,
          top: `${y}px`,
        }}
      >
        {/* Edit */}
        <button
          onClick={handleEdit}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Edit3 className="w-4 h-4" />
          <span>Edit Dataset</span>
        </button>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

        {/* Lineage Options */}
        <button
          onClick={handleViewUpstream}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>View Upstream</span>
        </button>

        <button
          onClick={handleViewDownstream}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>View Downstream</span>
        </button>

        <button
          onClick={handleViewLineage}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <GitBranch className="w-4 h-4" />
          <span>View Full Lineage</span>
        </button>

        <button
          onClick={handleClearHighlights}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <EyeOff className="w-4 h-4" />
          <span>Clear Highlights</span>
        </button>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

        {/* Copy FQN */}
        <button
          onClick={handleCopyId}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Copy className="w-4 h-4" />
          <span>Copy FQN</span>
        </button>

        {/* Settings */}
        <button
          onClick={handleSettings}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Settings className="w-4 h-4" />
          <span>Dataset Settings</span>
        </button>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

        {/* Delete */}
        <button
          onClick={handleDelete}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>Remove from Diagram</span>
        </button>
      </div>
    </>
  );
}
