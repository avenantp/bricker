/**
 * Recently Deleted View Component
 *
 * Generic component for displaying soft deleted items with restore/permanent delete options
 */

import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, AlertTriangle, Calendar, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface DeletedItem {
  id: string;
  name: string;
  deleted_at: string;
  deleted_by?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface RecentlyDeletedViewProps {
  items: DeletedItem[];
  title: string;
  entityType: string; // 'dataset', 'project', 'workspace', etc.
  isLoading: boolean;
  error?: string | null;
  onRestore: (itemId: string) => Promise<void>;
  onPermanentDelete: (itemId: string) => Promise<void>;
  onRefresh: () => void;
  emptyMessage?: string;
}

export function RecentlyDeletedView({
  items,
  title,
  entityType,
  isLoading,
  error,
  onRestore,
  onPermanentDelete,
  onRefresh,
  emptyMessage = 'No recently deleted items'
}: RecentlyDeletedViewProps) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleRestore = async (itemId: string) => {
    setActionLoading(`restore-${itemId}`);
    try {
      await onRestore(itemId);
      onRefresh();
    } catch (error: any) {
      console.error('Failed to restore:', error);
      alert(`Failed to restore ${entityType}: ${error.message}`);
    } finally {
      setActionLoading(null);
      setSelectedItem(null);
    }
  };

  const handlePermanentDelete = async (itemId: string) => {
    setActionLoading(`delete-${itemId}`);
    try {
      await onPermanentDelete(itemId);
      onRefresh();
    } catch (error: any) {
      console.error('Failed to permanently delete:', error);
      alert(`Failed to permanently delete ${entityType}: ${error.message}`);
    } finally {
      setActionLoading(null);
      setConfirmDelete(null);
      setSelectedItem(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <p className="text-gray-900 dark:text-gray-100 font-medium">Error loading deleted items</p>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">{error}</p>
          <button onClick={onRefresh} className="btn-primary mt-4">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Trash2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-600 dark:text-gray-400">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {items.length} {entityType}
            {items.length !== 1 ? 's' : ''} recently deleted
          </p>
        </div>
        <button onClick={onRefresh} className="btn-secondary text-sm">
          Refresh
        </button>
      </div>

      {/* Warning Banner */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 mr-3 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800 dark:text-yellow-200">
            <p className="font-medium">Deleted items are kept for 90 days</p>
            <p className="mt-1">
              After 90 days, items are permanently deleted and cannot be restored.
            </p>
          </div>
        </div>
      </div>

      {/* Items List */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Deleted
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                    selectedItem === item.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                  onClick={() => setSelectedItem(item.id)}
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {item.name}
                      </div>
                      {item.description && (
                        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {item.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formatDistanceToNow(new Date(item.deleted_at), { addSuffix: true })}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      {/* Restore Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRestore(item.id);
                        }}
                        disabled={actionLoading !== null}
                        className="btn-secondary inline-flex items-center gap-2"
                        title="Restore"
                      >
                        {actionLoading === `restore-${item.id}` ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
                        ) : (
                          <>
                            <RotateCcw className="h-4 w-4" />
                            Restore
                          </>
                        )}
                      </button>

                      {/* Permanent Delete Button */}
                      {confirmDelete === item.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-600 dark:text-red-400">
                            Confirm?
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePermanentDelete(item.id);
                            }}
                            disabled={actionLoading !== null}
                            className="btn-primary !bg-red-600 hover:!bg-red-700"
                          >
                            {actionLoading === `delete-${item.id}` ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              'Yes, Delete'
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDelete(null);
                            }}
                            disabled={actionLoading !== null}
                            className="btn-secondary text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete(item.id);
                          }}
                          disabled={actionLoading !== null}
                          className="btn-secondary text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Permanently Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
