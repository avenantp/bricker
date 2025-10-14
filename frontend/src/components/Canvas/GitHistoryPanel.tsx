/**
 * Git History Panel Component
 * Displays commit history for a dataset with details
 * Shows commits, authors, timestamps, and change summaries
 */

import { useState, useEffect } from 'react';
import {
  GitCommit,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  Database,
  GitBranch,
  Download,
  RefreshCw,
} from 'lucide-react';
import type { GitCommit as GitCommitType } from '../../types/dataset';

interface GitHistoryPanelProps {
  datasetId: string;
  workspaceId: string;
  onLoadHistory: (datasetId: string) => Promise<GitCommitType[]>;
  onRevertToCommit?: (commitSha: string) => Promise<void>;
  onViewCommitDiff?: (commitSha: string) => void;
}

export function GitHistoryPanel({
  datasetId,
  workspaceId,
  onLoadHistory,
  onRevertToCommit,
  onViewCommitDiff,
}: GitHistoryPanelProps) {
  const [commits, setCommits] = useState<GitCommitType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedCommits, setExpandedCommits] = useState<Set<string>>(new Set());

  // Load commit history
  const loadHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      const history = await onLoadHistory(datasetId);
      setCommits(history);
    } catch (err: any) {
      setError(err.message || 'Failed to load commit history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (datasetId) {
      loadHistory();
    }
  }, [datasetId]);

  const toggleCommitExpansion = (commitSha: string) => {
    const newExpanded = new Set(expandedCommits);
    if (newExpanded.has(commitSha)) {
      newExpanded.delete(commitSha);
    } else {
      newExpanded.add(commitSha);
    }
    setExpandedCommits(newExpanded);
  };

  const handleRevert = async (commitSha: string) => {
    if (!onRevertToCommit) return;

    const confirmed = window.confirm(
      'Are you sure you want to revert to this commit? This will create a new commit that undoes all changes after this point.'
    );

    if (!confirmed) return;

    setLoading(true);
    setError(null);

    try {
      await onRevertToCommit(commitSha);
      await loadHistory();
    } catch (err: any) {
      setError(err.message || 'Failed to revert to commit');
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
        return <FileText className="w-3 h-3" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <GitCommit className="w-5 h-5 text-blue-600" />
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Commit History</h3>
            <p className="text-xs text-gray-500">
              {commits.length} commit{commits.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={loadHistory}
          disabled={loading}
          className="btn-icon text-gray-600 hover:text-gray-900"
          title="Refresh history"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-100">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Commit List */}
      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {loading && commits.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-3 animate-pulse" />
            <p className="text-sm text-gray-500">Loading commit history...</p>
          </div>
        ) : commits.length === 0 ? (
          <div className="p-8 text-center">
            <GitCommit className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-900">No Commits Yet</p>
            <p className="text-xs text-gray-500 mt-1">
              Commits will appear here after you save changes to Git
            </p>
          </div>
        ) : (
          commits.map((commit, index) => {
            const isExpanded = expandedCommits.has(commit.commit_sha);
            const isLatest = index === 0;

            return (
              <div key={commit.commit_sha} className="p-4 hover:bg-gray-50 transition-colors">
                {/* Commit Header */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-1">
                    <GitCommit className="w-4 h-4 text-gray-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Commit Message */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 break-words">
                          {commit.commit_message}
                        </p>
                        {isLatest && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 rounded">
                            Latest
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                        {onViewCommitDiff && (
                          <button
                            onClick={() => onViewCommitDiff(commit.commit_sha)}
                            className="btn-icon p-1.5 text-gray-500 hover:text-gray-700"
                            title="View changes"
                          >
                            <FileText className="w-4 h-4" />
                          </button>
                        )}
                        {onRevertToCommit && !isLatest && (
                          <button
                            onClick={() => handleRevert(commit.commit_sha)}
                            disabled={loading}
                            className="btn-icon p-1.5 text-gray-500 hover:text-gray-700"
                            title="Revert to this commit"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => toggleCommitExpansion(commit.commit_sha)}
                          className="btn-icon p-1.5 text-gray-500 hover:text-gray-700"
                          title={isExpanded ? 'Collapse' : 'Expand'}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Commit Metadata */}
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-600">
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span>{commit.commit_author}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatTimestamp(commit.committed_at)}</span>
                      </div>
                    </div>

                    {/* Commit SHA */}
                    <div className="mt-1">
                      <code className="text-xs text-gray-500 font-mono">
                        {commit.commit_sha.substring(0, 8)}
                      </code>
                    </div>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        {/* Full Timestamp */}
                        <div className="text-xs text-gray-600 mb-2">
                          <strong>Committed:</strong> {new Date(commit.committed_at).toLocaleString()}
                        </div>

                        {/* Full SHA */}
                        <div className="text-xs text-gray-600 mb-3">
                          <strong>SHA:</strong>
                          <code className="ml-2 text-gray-800 font-mono bg-gray-100 px-2 py-0.5 rounded">
                            {commit.commit_sha}
                          </code>
                        </div>

                        {/* Change Summary */}
                        {commit.changes_summary && (
                          <div className="bg-gray-50 rounded-lg p-3">
                            <p className="text-xs font-medium text-gray-700 mb-2">Changes:</p>
                            <div className="space-y-1">
                              {commit.changes_summary.entity_types?.map((entityType) => (
                                <div
                                  key={entityType}
                                  className="flex items-center gap-2 text-xs text-gray-600"
                                >
                                  {getEntityTypeIcon(entityType as 'dataset' | 'column' | 'lineage')}
                                  <span className="capitalize">{entityType}</span>
                                </div>
                              ))}
                            </div>
                            {commit.changes_summary.change_count !== undefined && (
                              <p className="text-xs text-gray-600 mt-2">
                                <strong>{commit.changes_summary.change_count}</strong> change
                                {commit.changes_summary.change_count !== 1 ? 's' : ''}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
