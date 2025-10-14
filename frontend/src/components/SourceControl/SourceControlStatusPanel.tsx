/**
 * Source Control Status Panel
 * Displays source control connection status, uncommitted changes, and actions
 */

import { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  GitBranch,
  GitCommit,
  RefreshCw,
  Settings,
  Plus,
  FileText,
  Loader2,
} from 'lucide-react';
import {
  useSourceControlStatus,
  useUncommittedChanges,
  useCommitHistory,
  useSync,
  useDisconnect,
} from '../../hooks';

interface SourceControlStatusPanelProps {
  workspaceId: string;
  onConnect?: () => void;
  onCommit?: () => void;
  onViewHistory?: () => void;
}

export function SourceControlStatusPanel({
  workspaceId,
  onConnect,
  onCommit,
  onViewHistory,
}: SourceControlStatusPanelProps) {
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);

  // Fetch data with auto-refresh
  const { data: status, isLoading: statusLoading } = useSourceControlStatus(workspaceId);
  const { data: uncommittedChanges, isLoading: changesLoading } = useUncommittedChanges(workspaceId);
  const { data: commitHistory, isLoading: historyLoading } = useCommitHistory(workspaceId, 5);

  // Mutations
  const syncMutation = useSync({
    onSuccess: (result) => {
      console.log('Sync successful:', result);
    },
    onError: (error) => {
      console.error('Sync failed:', error);
    },
  });

  const disconnectMutation = useDisconnect({
    onSuccess: () => {
      setShowDisconnectConfirm(false);
    },
    onError: (error) => {
      console.error('Disconnect failed:', error);
    },
  });

  const handleSync = () => {
    syncMutation.mutate({
      workspace_id: workspaceId,
      strategy: 'merge', // or 'rebase'
    });
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate(workspaceId);
  };

  const getStatusConfig = (status: string | undefined) => {
    switch (status) {
      case 'connected':
        return {
          icon: <CheckCircle2 className="w-5 h-5" />,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          text: 'Connected',
        };
      case 'syncing':
        return {
          icon: <Loader2 className="w-5 h-5 animate-spin" />,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          text: 'Syncing...',
        };
      case 'conflict':
        return {
          icon: <AlertCircle className="w-5 h-5" />,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          text: 'Conflicts Detected',
        };
      case 'error':
        return {
          icon: <XCircle className="w-5 h-5" />,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          text: 'Connection Error',
        };
      default:
        return {
          icon: <XCircle className="w-5 h-5" />,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          borderColor: 'border-gray-200',
          text: 'Not Connected',
        };
    }
  };

  const statusConfig = getStatusConfig(status);

  if (statusLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      </div>
    );
  }

  // Not connected state
  if (!status || status === 'not_connected') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="text-center">
          <GitBranch className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Source Control Not Connected
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Connect this workspace to a Git repository to enable version control
          </p>
          <button
            onClick={onConnect}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Connect Repository
          </button>
        </div>
      </div>
    );
  }

  // Connected state
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className={`p-4 border-b ${statusConfig.borderColor} ${statusConfig.bgColor}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={statusConfig.color}>{statusConfig.icon}</span>
            <div>
              <h3 className="font-semibold text-gray-900">{statusConfig.text}</h3>
              <p className="text-xs text-gray-600">Source Control Status</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={syncMutation.isPending || status === 'syncing'}
              className="btn-icon text-gray-600 hover:text-gray-900"
              title="Sync changes"
            >
              <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowDisconnectConfirm(true)}
              className="btn-icon text-gray-600 hover:text-gray-900"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Uncommitted Changes */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-900">Uncommitted Changes</h4>
          {uncommittedChanges && uncommittedChanges.length > 0 && (
            <button
              onClick={onCommit}
              className="btn-primary text-xs px-3 py-1"
            >
              Commit
            </button>
          )}
        </div>

        {changesLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        ) : uncommittedChanges && uncommittedChanges.length > 0 ? (
          <div className="space-y-2">
            {uncommittedChanges.slice(0, 5).map((change, index) => (
              <div
                key={index}
                className="flex items-center gap-2 text-sm p-2 bg-gray-50 rounded"
              >
                <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <span className="flex-1 truncate text-gray-700">{change.path}</span>
                <span
                  className={`text-xs px-2 py-0.5 rounded ${
                    change.type === 'added'
                      ? 'bg-green-100 text-green-700'
                      : change.type === 'modified'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {change.type}
                </span>
              </div>
            ))}
            {uncommittedChanges.length > 5 && (
              <p className="text-xs text-gray-500 text-center mt-2">
                +{uncommittedChanges.length - 5} more changes
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">No uncommitted changes</p>
        )}
      </div>

      {/* Recent Commits */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-gray-900">Recent Commits</h4>
          {commitHistory && commitHistory.length > 0 && (
            <button
              onClick={onViewHistory}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              View All
            </button>
          )}
        </div>

        {historyLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        ) : commitHistory && commitHistory.length > 0 ? (
          <div className="space-y-3">
            {commitHistory.map((commit) => (
              <div key={commit.sha} className="flex items-start gap-2">
                <GitCommit className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 line-clamp-2">{commit.message}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{commit.author}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">
                      {new Date(commit.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">No commits yet</p>
        )}
      </div>

      {/* Disconnect Confirmation Modal */}
      {showDisconnectConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Disconnect Repository?</h3>
            <p className="text-sm text-gray-600 mb-6">
              This will disconnect the workspace from source control. Uncommitted changes will be
              preserved, but you won't be able to sync or commit until you reconnect.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDisconnectConfirm(false)}
                className="btn-secondary"
                disabled={disconnectMutation.isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleDisconnect}
                className="btn-primary bg-red-600 hover:bg-red-700"
                disabled={disconnectMutation.isPending}
              >
                {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
