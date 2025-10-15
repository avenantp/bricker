/**
 * Delete Column Dialog
 * Confirmation dialog for deleting a single column
 * Features: Column details display, impact warning, keyboard shortcuts
 */

import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { BaseDialog } from '@/components/Common/BaseDialog';
import type { Column } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface DeleteColumnDialogProps {
  column: Column;
  onClose: () => void;
  onDelete: (columnId: string) => Promise<void>;
}

// ============================================================================
// Delete Column Dialog Component
// ============================================================================

export function DeleteColumnDialog({
  column,
  onClose,
  onDelete,
}: DeleteColumnDialogProps) {
  // ============================================================================
  // State
  // ============================================================================

  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // Keyboard Shortcuts
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Enter - Confirm delete
      if (e.key === 'Enter' && !isDeleting) {
        e.preventDefault();
        handleDelete();
        return;
      }

      // Escape - Close
      if (e.key === 'Escape' && !isDeleting) {
        e.preventDefault();
        onClose();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDeleting]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);

      await onDelete(column.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete column');
      console.error('Delete column error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      onClose();
    }
  };

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const hasConstraints = column.is_primary_key || column.is_foreign_key || !column.is_nullable;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <BaseDialog
      title="Delete Column"
      isOpen={true}
      onClose={handleClose}
      primaryButtonLabel={isDeleting ? 'Deleting...' : 'Delete Column'}
      onPrimaryAction={handleDelete}
      primaryButtonDisabled={isDeleting}
      secondaryButtonLabel="Cancel"
      onSecondaryAction={handleClose}
      width="600px"
      height="auto"
    >
      {/* Warning Message */}
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-red-800">Warning</p>
          <p className="text-sm text-red-700 mt-1">
            This action cannot be undone. The column will be permanently deleted.
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Column Details */}
      <div className="mb-6">
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">Column Name</span>
            {hasConstraints && (
              <div className="flex items-center gap-1">
                {column.is_primary_key && (
                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                    PK
                  </span>
                )}
                {column.is_foreign_key && (
                  <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                    FK
                  </span>
                )}
                {!column.is_nullable && (
                  <span className="px-1.5 py-0.5 bg-gray-200 text-gray-700 text-xs font-semibold rounded">
                    NN
                  </span>
                )}
              </div>
            )}
          </div>
          <p className="text-lg font-mono font-semibold text-gray-900">{column.name}</p>
          <p className="text-sm font-mono text-gray-600 mt-1">{column.data_type}</p>
          {column.business_name && (
            <p className="text-sm text-gray-600 mt-2">{column.business_name}</p>
          )}
        </div>
      </div>

      {/* Impact Warning */}
      {hasConstraints && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Impact Warning</p>
              <ul className="text-sm text-yellow-700 mt-2 space-y-1 list-disc list-inside">
                {column.is_primary_key && (
                  <li>This column is a <strong>Primary Key</strong> and may be referenced by other tables</li>
                )}
                {column.is_foreign_key && (
                  <li>This column is a <strong>Foreign Key</strong> and creates a relationship with another table</li>
                )}
                {!column.is_nullable && (
                  <li>This column is <strong>NOT NULL</strong> and may be required by existing queries</li>
                )}
              </ul>
              <p className="text-sm text-yellow-700 mt-2">
                Deleting this column may break existing queries, views, or downstream dependencies.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* General Warning */}
      {!hasConstraints && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-700">
            Deleting this column will remove it from the dataset permanently. Make sure no queries or transformations depend on this column.
          </p>
        </div>
      )}
    </BaseDialog>
  );
}
