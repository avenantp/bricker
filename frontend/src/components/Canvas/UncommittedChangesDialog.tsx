/**
 * Uncommitted Changes Dialog Component
 * Shows detailed list of all uncommitted datasets with changes
 * Allows bulk commit or individual commits
 */

import { useState, useEffect } from 'react';
import {
  X,
  GitCommit,
  AlertCircle,
  CheckCircle,
  Database,
  FileText,
  GitBranch,
  Link as LinkIcon,
} from 'lucide-react';
import type { UncommittedChangeSummary } from '../../types/dataset';

interface UncommittedChangesDialogProps {
  isOpen: boolean;
  workspaceId: string;
  uncommittedChanges: UncommittedChangeSummary[];
  onClose: () => void;
  onCommitSelected: (datasetIds: string[], message: string) => Promise<void>;
  onCommitSingle: (datasetId: string, message: string) => Promise<void>;
  onRefresh?: () => void;
}

export function UncommittedChangesDialog({
  isOpen,
  workspaceId,
  uncommittedChanges,
  onClose,
  onCommitSelected,
  onCommitSingle,
  onRefresh,
}: UncommittedChangesDialogProps) {
  const [selectedDatasets, setSelectedDatasets] = useState<Set<string>>(new Set());
  const [commitMessage, setCommitMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSingleCommit, setShowSingleCommit] = useState<string | null>(null);
  const [singleCommitMessage, setSingleCommitMessage] = useState('');

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSelectedDatasets(new Set());
      setCommitMessage('');
      setError(null);
      setShowSingleCommit(null);
      setSingleCommitMessage('');
    }
  }, [isOpen]);

  const handleToggleDataset = (datasetId: string) => {
    const newSelected = new Set(selectedDatasets);
    if (newSelected.has(datasetId)) {
      newSelected.delete(datasetId);
    } else {
      newSelected.add(datasetId);
    }
    setSelectedDatasets(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedDatasets.size === uncommittedChanges.length) {
      setSelectedDatasets(new Set());
    } else {
      setSelectedDatasets(new Set(uncommittedChanges.map((c) => c.dataset_id)));
    }
  };

  const handleCommitSelected = async () => {
    if (selectedDatasets.size === 0 || !commitMessage.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await onCommitSelected(Array.from(selectedDatasets), commitMessage.trim());
      onRefresh?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to commit changes');
    } finally {
      setLoading(false);
    }
  };

  const handleCommitSingle = async (datasetId: string) => {
    if (!singleCommitMessage.trim()) return;

    setLoading(true);
    setError(null);

    try {
      await onCommitSingle(datasetId, singleCommitMessage.trim());
      setShowSingleCommit(null);
      setSingleCommitMessage('');
      onRefresh?.();
    } catch (err: any) {
      setError(err.message || 'Failed to commit dataset');
    } finally {
      setLoading(false);
    }
  };

  const getEntityTypeIcon = (entityType: 'dataset' | 'column' | 'lineage') => {
    switch (entityType) {
      case 'dataset':
        return <Database className="w-3 h-3" />;
      case 'column':
        return <FileText className="w-3 h-3" />;
      case 'lineage':
        return <GitBranch className="w-3 h-3" />;
      default:
        return <AlertCircle className="w-3 h-3" />;
    }
  };

  const totalChanges = uncommittedChanges.reduce((sum, change) => sum + change.change_count, 0);
  const selectedChanges = uncommittedChanges
    .filter((c) => selectedDatasets.has(c.dataset_id))
    .reduce((sum, change) => sum + change.change_count, 0);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[85vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
                <h2 className="text-xl font-bold text-gray-900">Uncommitted Changes</h2>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {uncommittedChanges.length} dataset{uncommittedChanges.length !== 1 ? 's' : ''} with {totalChanges} total change{totalChanges !== 1 ? 's' : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Changes List */}
          <div className="flex-1 overflow-y-auto p-6">
            {uncommittedChanges.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-900">All Changes Committed</p>
                <p className="text-xs text-gray-500 mt-1">
                  No uncommitted changes in this workspace
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Select All */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDatasets.size === uncommittedChanges.length}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    Select All ({uncommittedChanges.length})
                  </button>
                  {selectedDatasets.size > 0 && (
                    <span className="text-sm text-gray-600">
                      {selectedDatasets.size} selected • {selectedChanges} changes
                    </span>
                  )}
                </div>

                {/* Dataset List */}
                {uncommittedChanges.map((change) => (
                  <div
                    key={change.dataset_id}
                    className={`border rounded-lg p-4 transition-colors ${
                      selectedDatasets.has(change.dataset_id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={selectedDatasets.has(change.dataset_id)}
                        onChange={() => handleToggleDataset(change.dataset_id)}
                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-900">
                              {change.dataset_name}
                            </h4>
                            <p className="text-xs text-gray-500 font-mono mt-0.5">
                              {change.dataset_id.substring(0, 8)}...
                            </p>
                          </div>
                          <button
                            onClick={() => setShowSingleCommit(change.dataset_id)}
                            className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors"
                            disabled={loading}
                          >
                            Commit
                          </button>
                        </div>

                        {/* Change Summary */}
                        <div className="mt-2 flex items-center gap-3">
                          <span className="text-sm font-medium text-gray-700">
                            {change.change_count} changes
                          </span>
                          <div className="flex items-center gap-2">
                            {change.entity_types.map((type) => (
                              <span
                                key={type}
                                className="flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-600"
                                title={type}
                              >
                                {getEntityTypeIcon(type)}
                                {type}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Timestamp */}
                        <p className="text-xs text-gray-500 mt-2">
                          Last changed: {new Date(change.last_changed_at).toLocaleString()}
                        </p>

                        {/* Single Commit Form */}
                        {showSingleCommit === change.dataset_id && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <textarea
                              value={singleCommitMessage}
                              onChange={(e) => setSingleCommitMessage(e.target.value)}
                              placeholder="Enter commit message..."
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                              autoFocus
                            />
                            <div className="flex items-center gap-2 mt-2">
                              <button
                                onClick={() => handleCommitSingle(change.dataset_id)}
                                disabled={!singleCommitMessage.trim() || loading}
                                className="px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
                              >
                                Commit
                              </button>
                              <button
                                onClick={() => {
                                  setShowSingleCommit(null);
                                  setSingleCommitMessage('');
                                }}
                                className="px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100 rounded transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer - Bulk Commit */}
          {uncommittedChanges.length > 0 && (
            <div className="border-t border-gray-200 p-6 bg-gray-50">
              <div className="space-y-3">
                <div>
                  <label htmlFor="commit-message" className="block text-sm font-medium text-gray-700 mb-2">
                    Commit Message for Selected Datasets
                  </label>
                  <textarea
                    id="commit-message"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Describe the changes across selected datasets..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    disabled={loading || selectedDatasets.size === 0}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    {selectedDatasets.size > 0 ? (
                      <>
                        Committing {selectedDatasets.size} dataset{selectedDatasets.size !== 1 ? 's' : ''} with {selectedChanges} change{selectedChanges !== 1 ? 's' : ''}
                      </>
                    ) : (
                      'Select datasets to commit'
                    )}
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={onClose}
                      className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      disabled={loading}
                    >
                      Close
                    </button>
                    <button
                      onClick={handleCommitSelected}
                      disabled={loading || selectedDatasets.size === 0 || !commitMessage.trim()}
                      className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Committing...
                        </>
                      ) : (
                        <>
                          <GitCommit className="w-4 h-4" />
                          Commit Selected
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
