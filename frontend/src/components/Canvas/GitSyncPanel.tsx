/**
 * Git Sync Panel Component
 * Workspace-level panel for managing Git synchronization
 * Shows uncommitted changes and provides sync actions
 */

import { useState, useEffect } from 'react';
import {
  GitBranch,
  GitCommit,
  Download,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { UncommittedChangeSummary } from '../../types/dataset';

interface GitSyncPanelProps {
  workspaceId: string;
  githubToken: string;
  githubRepo: string;
  onCommitAll?: (workspaceId: string, message: string) => Promise<void>;
  onPull?: (workspaceId: string) => Promise<void>;
  onPush?: (workspaceId: string) => Promise<void>;
  onRefresh?: () => void;
  onViewChanges?: (uncommittedChanges: UncommittedChangeSummary[]) => void;
  onCommitDataset?: (datasetId: string, message: string) => Promise<void>;
}

export function GitSyncPanel({
  workspaceId,
  githubToken,
  githubRepo,
  onCommitAll,
  onPull,
  onPush,
  onRefresh,
  onViewChanges,
  onCommitDataset,
}: GitSyncPanelProps) {
  const [uncommittedChanges, setUncommittedChanges] = useState<UncommittedChangeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Load uncommitted changes
  const loadUncommittedChanges = async () => {
    setLoading(true);
    setError(null);

    try {
      // This would call git-sync-service.getUncommittedChanges
      // For now, simulating the structure
      const changes: UncommittedChangeSummary[] = [];
      setUncommittedChanges(changes);
      setLastSyncTime(new Date().toISOString());
    } catch (err: any) {
      setError(err.message || 'Failed to load uncommitted changes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId && githubToken && githubRepo) {
      loadUncommittedChanges();
    }
  }, [workspaceId, githubToken, githubRepo]);

  const handleRefresh = () => {
    loadUncommittedChanges();
    onRefresh?.();
  };

  const handleCommitAll = async () => {
    if (!onCommitAll || uncommittedChanges.length === 0) return;

    const message = prompt('Enter commit message for all changes:');
    if (!message) return;

    setLoading(true);
    setError(null);

    try {
      await onCommitAll(workspaceId, message);
      await loadUncommittedChanges();
    } catch (err: any) {
      setError(err.message || 'Failed to commit changes');
    } finally {
      setLoading(false);
    }
  };

  const handlePull = async () => {
    if (!onPull) return;

    setLoading(true);
    setError(null);

    try {
      await onPull(workspaceId);
      await loadUncommittedChanges();
    } catch (err: any) {
      setError(err.message || 'Failed to pull from Git');
    } finally {
      setLoading(false);
    }
  };

  const handlePush = async () => {
    if (!onPush) return;

    setLoading(true);
    setError(null);

    try {
      await onPush(workspaceId);
      await loadUncommittedChanges();
    } catch (err: any) {
      setError(err.message || 'Failed to push to Git');
    } finally {
      setLoading(false);
    }
  };

  const handleViewChanges = () => {
    onViewChanges?.(uncommittedChanges);
  };

  const totalChanges = uncommittedChanges.reduce((sum, change) => sum + change.change_count, 0);

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <GitBranch className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Git Sync Status</h3>
            <p className="text-xs text-gray-500">
              {uncommittedChanges.length === 0 ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="w-3 h-3" />
                  All changes committed
                </span>
              ) : (
                <span className="flex items-center gap-1 text-yellow-600">
                  <AlertCircle className="w-3 h-3" />
                  {uncommittedChanges.length} dataset{uncommittedChanges.length !== 1 ? 's' : ''} with {totalChanges} change{totalChanges !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRefresh();
            }}
            className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            title="Refresh"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="border-t border-gray-200">
          {/* Error Display */}
          {error && (
            <div className="px-4 py-3 bg-red-50 border-b border-red-100 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center gap-2">
              {onCommitAll && (
                <button
                  onClick={handleCommitAll}
                  disabled={loading || uncommittedChanges.length === 0}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  <GitCommit className="w-4 h-4" />
                  Commit All
                </button>
              )}
              {onPull && (
                <button
                  onClick={handlePull}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <Download className="w-4 h-4" />
                  Pull
                </button>
              )}
              {onPush && (
                <button
                  onClick={handlePush}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4" />
                  Push
                </button>
              )}
              {onViewChanges && uncommittedChanges.length > 0 && (
                <button
                  onClick={handleViewChanges}
                  className="ml-auto text-sm text-blue-600 hover:text-blue-700"
                >
                  View Details
                </button>
              )}
            </div>
          </div>

          {/* Uncommitted Changes List */}
          {uncommittedChanges.length > 0 && (
            <div className="p-4">
              <h4 className="text-xs font-semibold text-gray-700 mb-3 uppercase">
                Uncommitted Changes
              </h4>
              <div className="space-y-2">
                {uncommittedChanges.map((change) => (
                  <div
                    key={change.dataset_id}
                    className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {change.dataset_name}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
                        <span>{change.change_count} changes</span>
                        <span>•</span>
                        <span>{change.entity_types.join(', ')}</span>
                        <span>•</span>
                        <span title={change.last_changed_at}>
                          {new Date(change.last_changed_at).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                    {onCommitDataset && (
                      <button
                        onClick={async () => {
                          const message = prompt(`Commit message for ${change.dataset_name}:`);
                          if (!message) return;
                          try {
                            await onCommitDataset(change.dataset_id, message);
                            await loadUncommittedChanges();
                          } catch (err: any) {
                            setError(err.message);
                          }
                        }}
                        className="ml-3 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                      >
                        Commit
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {uncommittedChanges.length === 0 && !loading && (
            <div className="p-8 text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-sm font-medium text-gray-900">All Changes Committed</p>
              <p className="text-xs text-gray-500 mt-1">
                No uncommitted changes in this workspace
              </p>
            </div>
          )}

          {/* Loading State */}
          {loading && uncommittedChanges.length === 0 && (
            <div className="p-8 text-center">
              <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3 animate-pulse" />
              <p className="text-sm text-gray-500">Loading sync status...</p>
            </div>
          )}

          {/* Last Sync Time */}
          {lastSyncTime && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Last checked: {new Date(lastSyncTime).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
