/**
 * Edge Context Menu Component
 * Shows context menu for relationship edges on right-click
 * Based on specification: docs/prp/051-dataset-diagram-view-specification.md (Section 8.2)
 */

import { useCallback, useEffect } from 'react';
import {
  Edit3,
  Info,
  RefreshCw,
  Plus,
  Trash2,
} from 'lucide-react';
import { useDiagramStore } from '../../store/diagramStore';
import { deleteRelationship } from '../../lib/relationship-service';

interface EdgeContextMenuProps {
  edgeId: string;
  x: number;
  y: number;
  onClose: () => void;
  onEditRelationship?: () => void;
  onViewDetails?: () => void;
}

export function EdgeContextMenu({
  edgeId,
  x,
  y,
  onClose,
  onEditRelationship,
  onViewDetails,
}: EdgeContextMenuProps) {
  const { edges, deleteEdge } = useDiagramStore();
  const edge = edges.find((e) => e.id === edgeId);

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
      if (!target.closest('.edge-context-menu')) {
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
    onEditRelationship?.();
    onClose();
  }, [onEditRelationship, onClose]);

  const handleViewDetails = useCallback(() => {
    onViewDetails?.();
    onClose();
  }, [onViewDetails, onClose]);

  const handleRealign = useCallback(() => {
    // TODO: Implement realign edge
    console.log('TODO: Realign edge', edgeId);
    onClose();
  }, [edgeId, onClose]);

  const handleAddControlPoint = useCallback(() => {
    // TODO: Implement add control point
    console.log('TODO: Add control point to edge', edgeId);
    onClose();
  }, [edgeId, onClose]);

  const handleDelete = useCallback(async () => {
    if (!edge) return;

    if (window.confirm('Are you sure you want to delete this relationship?')) {
      try {
        // Get source column IDs from edge data
        const edgeData = edge.data as any;
        if (edgeData.source_columns && edgeData.source_columns.length > 0) {
          // Delete relationship from database
          for (const columnId of edgeData.source_columns) {
            await deleteRelationship(columnId);
          }
        }

        // Remove edge from diagram
        deleteEdge(edgeId);
        console.log('[EdgeContextMenu] Relationship deleted');
      } catch (error) {
        console.error('[EdgeContextMenu] Failed to delete relationship:', error);
        alert('Failed to delete relationship. Please try again.');
      }
    }
    onClose();
  }, [edge, edgeId, deleteEdge, onClose]);

  if (!edge) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Context Menu */}
      <div
        className="edge-context-menu fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-[200px]"
        style={{
          left: `${x}px`,
          top: `${y}px`,
        }}
      >
        {/* Edit Relationship */}
        <button
          onClick={handleEdit}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Edit3 className="w-4 h-4" />
          <span>Edit Relationship</span>
        </button>

        {/* View Details */}
        <button
          onClick={handleViewDetails}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Info className="w-4 h-4" />
          <span>View Details</span>
        </button>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

        {/* Realign Edge */}
        <button
          onClick={handleRealign}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Realign Edge</span>
        </button>

        {/* Add Control Point */}
        <button
          onClick={handleAddControlPoint}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Control Point</span>
        </button>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

        {/* Delete Relationship */}
        <button
          onClick={handleDelete}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete Relationship</span>
        </button>
      </div>
    </>
  );
}
