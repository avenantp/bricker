/**
 * Columns Grid Dialog Component
 * Displays a grid of columns for a dataset with click-to-edit functionality
 */

import { useState, useEffect } from 'react';
import { X, Edit, Key, Link as LinkIcon, Hash } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Column } from '../../types/column';

interface ColumnsGridDialogProps {
  datasetId: string;
  datasetName: string;
  isOpen: boolean;
  onClose: () => void;
  onEditColumn: (column: Column) => void;
}

export function ColumnsGridDialog({
  datasetId,
  datasetName,
  isOpen,
  onClose,
  onEditColumn,
}: ColumnsGridDialogProps) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch columns when dialog opens
  useEffect(() => {
    if (isOpen && datasetId) {
      fetchColumns();
    }
  }, [isOpen, datasetId]);

  const fetchColumns = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[ColumnsGridDialog] Fetching columns for dataset:', datasetId);

      const { data, error: fetchError } = await supabase
        .from('columns')
        .select('*')
        .eq('dataset_id', datasetId)
        .order('ordinal_position', { ascending: true, nullsFirst: false });

      if (fetchError) {
        console.error('[ColumnsGridDialog] Supabase error:', fetchError);
        throw fetchError;
      }

      console.log('[ColumnsGridDialog] Fetched columns:', data);
      setColumns((data as Column[]) || []);
    } catch (err) {
      console.error('[ColumnsGridDialog] Failed to fetch columns:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load columns';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[90vw] max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Columns
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {datasetName} • {columns.length} columns
            </p>
          </div>
          <button
            onClick={onClose}
            className="btn-icon p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Close"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full"></div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center max-w-md">
                <p className="text-red-500 dark:text-red-400 mb-2 font-semibold">Error Loading Columns</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                <div className="text-xs text-gray-500 dark:text-gray-500 mb-4 text-left bg-gray-50 dark:bg-gray-900 p-3 rounded">
                  <p className="font-semibold mb-1">Possible causes:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Supabase is not running (check local instance)</li>
                    <li>Database connection error</li>
                    <li>Row-level security policies blocking access</li>
                  </ul>
                </div>
                <button onClick={fetchColumns} className="btn-secondary text-sm">
                  Try Again
                </button>
              </div>
            </div>
          ) : columns.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-500 dark:text-gray-400">No columns found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Column Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Data Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Properties
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {columns.map((column) => (
                    <tr
                      key={column.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Hash className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {column.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-700 dark:text-gray-300">
                          {column.data_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                          {column.description || (
                            <span className="italic text-gray-400">No description</span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                          {column.is_primary_key && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                              title="Primary Key"
                            >
                              <Key className="w-3 h-3" />
                              PK
                            </span>
                          )}
                          {column.is_foreign_key && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              title="Foreign Key"
                            >
                              <LinkIcon className="w-3 h-3" />
                              FK
                            </span>
                          )}
                          {!column.is_nullable && (
                            <span
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                              title="Not Nullable"
                            >
                              NOT NULL
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => onEditColumn(column)}
                          className="btn-icon inline-flex items-center gap-1 px-3 py-1 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                          title="Edit Column"
                        >
                          <Edit className="w-4 h-4" />
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
          <button onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
