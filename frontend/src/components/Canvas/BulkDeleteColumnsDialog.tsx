/**
 * Bulk Delete Columns Dialog
 * Confirmation dialog for deleting multiple columns with impact assessment
 * Features: Selected columns list, constraints summary, impact analysis, keyboard shortcuts
 */

import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import { BaseDialog } from '@/components/Common/BaseDialog';
import type { Column } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface BulkDeleteColumnsDialogProps {
  columns: Column[];
  onClose: () => void;
  onDelete: (columnIds: string[]) => Promise<void>;
}

interface ImpactSummary {
  totalColumns: number;
  primaryKeys: number;
  foreignKeys: number;
  notNullColumns: number;
  hasTransformations: number;
  avgPosition: number;
}

// ============================================================================
// Bulk Delete Columns Dialog Component
// ============================================================================

export function BulkDeleteColumnsDialog({
  columns,
  onClose,
  onDelete,
}: BulkDeleteColumnsDialogProps) {
  // ============================================================================
  // State
  // ============================================================================

  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // ============================================================================
  // Impact Analysis
  // ============================================================================

  const impactSummary = useMemo((): ImpactSummary => {
    const summary: ImpactSummary = {
      totalColumns: columns.length,
      primaryKeys: 0,
      foreignKeys: 0,
      notNullColumns: 0,
      hasTransformations: 0,
      avgPosition: 0,
    };

    let totalPosition = 0;

    columns.forEach((col) => {
      if (col.is_primary_key) summary.primaryKeys++;
      if (col.is_foreign_key) summary.foreignKeys++;
      if (!col.is_nullable) summary.notNullColumns++;
      if (col.transformation_logic) summary.hasTransformations++;
      totalPosition += col.position || 0;
    });

    summary.avgPosition = totalPosition / columns.length;

    return summary;
  }, [columns]);

  const hasHighImpact = useMemo(() => {
    return (
      impactSummary.primaryKeys > 0 ||
      impactSummary.foreignKeys > 0 ||
      impactSummary.notNullColumns > 0
    );
  }, [impactSummary]);

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

      // D - Toggle details
      if (e.key === 'd' && !isDeleting) {
        e.preventDefault();
        setShowDetails(!showDetails);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDeleting, showDetails]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      setError(null);

      const columnIds = columns.map((col) => col.id);
      await onDelete(columnIds);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete columns');
      console.error('Bulk delete columns error:', err);
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
  // Render
  // ============================================================================

  return (
    <BaseDialog
      title={`Delete ${columns.length} Column${columns.length !== 1 ? 's' : ''}`}
      isOpen={true}
      onClose={handleClose}
      primaryButtonLabel={isDeleting ? 'Deleting...' : `Delete ${columns.length} Column${columns.length !== 1 ? 's' : ''}`}
      onPrimaryAction={handleDelete}
      primaryButtonDisabled={isDeleting}
      secondaryButtonLabel="Cancel"
      onSecondaryAction={handleClose}
      width="900px"
      height="auto"
    >
      {/* Warning Message */}
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-red-800">Warning</p>
          <p className="text-sm text-red-700 mt-1">
            This action cannot be undone. All selected columns will be permanently deleted.
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

      {/* Content */}
      <div className="space-y-4">
            {/* Impact Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">Total Columns</span>
                  <span className="text-2xl font-bold text-gray-900">{impactSummary.totalColumns}</span>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">With Transformations</span>
                  <span className="text-2xl font-bold text-gray-900">{impactSummary.hasTransformations}</span>
                </div>
              </div>

              {impactSummary.primaryKeys > 0 && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-blue-700">Primary Keys</span>
                    <span className="text-2xl font-bold text-blue-900">{impactSummary.primaryKeys}</span>
                  </div>
                </div>
              )}

              {impactSummary.foreignKeys > 0 && (
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-purple-700">Foreign Keys</span>
                    <span className="text-2xl font-bold text-purple-900">{impactSummary.foreignKeys}</span>
                  </div>
                </div>
              )}

              {impactSummary.notNullColumns > 0 && (
                <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-yellow-700">NOT NULL</span>
                    <span className="text-2xl font-bold text-yellow-900">{impactSummary.notNullColumns}</span>
                  </div>
                </div>
              )}
            </div>

            {/* High Impact Warning */}
            {hasHighImpact && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-800">High Impact Warning</p>
                    <ul className="text-sm text-yellow-700 mt-2 space-y-1 list-disc list-inside">
                      {impactSummary.primaryKeys > 0 && (
                        <li>
                          <strong>{impactSummary.primaryKeys}</strong> primary key{impactSummary.primaryKeys !== 1 ? 's' : ''} may be referenced by other tables
                        </li>
                      )}
                      {impactSummary.foreignKeys > 0 && (
                        <li>
                          <strong>{impactSummary.foreignKeys}</strong> foreign key{impactSummary.foreignKeys !== 1 ? 's' : ''} create relationships with other tables
                        </li>
                      )}
                      {impactSummary.notNullColumns > 0 && (
                        <li>
                          <strong>{impactSummary.notNullColumns}</strong> NOT NULL column{impactSummary.notNullColumns !== 1 ? 's' : ''} may be required by existing queries
                        </li>
                      )}
                    </ul>
                    <p className="text-sm text-yellow-700 mt-2">
                      Deleting these columns may break existing queries, views, or downstream dependencies.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Medium Impact Info */}
            {!hasHighImpact && impactSummary.hasTransformations > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Medium Impact</p>
                    <p className="text-sm text-blue-700 mt-1">
                      <strong>{impactSummary.hasTransformations}</strong> column{impactSummary.hasTransformations !== 1 ? 's have' : ' has'} transformation logic that will be lost.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Column Details Toggle */}
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-between"
              disabled={isDeleting}
            >
              <span className="text-sm font-medium">
                {showDetails ? 'Hide' : 'Show'} Column Details
              </span>
              <span className="text-xs text-gray-500">(Press D)</span>
            </button>

            {/* Column Details List */}
            {showDetails && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-700">Columns to be deleted</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {columns.map((column, index) => (
                    <div
                      key={column.id}
                      className={`px-4 py-3 ${
                        index !== columns.length - 1 ? 'border-b border-gray-200' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-mono font-semibold text-gray-900 truncate">
                              {column.name}
                            </p>
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
                          </div>
                          <p className="text-xs font-mono text-gray-600">{column.data_type}</p>
                          {column.business_name && (
                            <p className="text-xs text-gray-600 mt-1 truncate">{column.business_name}</p>
                          )}
                        </div>
                        {column.transformation_logic && (
                          <div className="flex-shrink-0">
                            <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                              Transform
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

        {/* General Warning */}
        {!hasHighImpact && impactSummary.hasTransformations === 0 && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <p className="text-sm text-gray-700">
              These columns will be permanently removed from the dataset. Make sure no queries or transformations depend on them.
            </p>
          </div>
        )}
      </div>
    </BaseDialog>
  );
}
