/**
 * Conflict Resolution Dialog
 * Shows when a node has been modified concurrently by multiple users
 */

import { useState } from 'react';
import { AlertTriangle, User, Clock, GitBranch, Check, X } from 'lucide-react';
import type {
  NodeConflict,
  ConflictResolutionStrategy,
  Node,
} from '../../types/node';

interface ConflictResolutionDialogProps {
  conflict: NodeConflict;
  isOpen: boolean;
  onClose: () => void;
  onResolve: (strategy: ConflictResolutionStrategy, mergedNode?: Node) => Promise<void>;
}

export function ConflictResolutionDialog({
  conflict,
  isOpen,
  onClose,
  onResolve,
}: ConflictResolutionDialogProps) {
  const [selectedStrategy, setSelectedStrategy] = useState<ConflictResolutionStrategy>('manual');
  const [isResolving, setIsResolving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  if (!isOpen) return null;

  const handleResolve = async () => {
    setIsResolving(true);
    try {
      await onResolve(selectedStrategy);
      onClose();
    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      alert('Failed to resolve conflict. Please try again.');
    } finally {
      setIsResolving(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-orange-50 border-b border-orange-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Conflict Detected</h2>
              <p className="text-sm text-gray-600 mt-1">
                This node has been modified by another user while you were editing it.
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Node Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="font-medium text-gray-900">{conflict.fqn}</div>
            <div className="text-sm text-gray-500 mt-1">UUID: {conflict.uuid}</div>
          </div>

          {/* Version Comparison */}
          <div className="grid grid-cols-2 gap-4">
            {/* Your Version */}
            <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900">Your Version</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimestamp(conflict.our_version.commit_timestamp)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <User className="w-3 h-3" />
                  <span>{conflict.our_version.commit_author}</span>
                </div>
                <div className="text-gray-600 mt-2">
                  {conflict.our_version.commit_message}
                </div>
              </div>
            </div>

            {/* Their Version */}
            <div className="border border-green-200 rounded-lg p-4 bg-green-50">
              <div className="flex items-center gap-2 mb-3">
                <User className="w-4 h-4 text-green-600" />
                <span className="font-medium text-green-900">Their Version (Latest)</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-700">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimestamp(conflict.their_version.commit_timestamp)}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-700">
                  <User className="w-3 h-3" />
                  <span>{conflict.their_version.commit_author}</span>
                </div>
                <div className="text-gray-600 mt-2">
                  {conflict.their_version.commit_message}
                </div>
              </div>
            </div>
          </div>

          {/* Conflicting Fields */}
          {conflict.conflict_fields.length > 0 && (
            <div>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                <GitBranch className="w-4 h-4" />
                <span>
                  {conflict.conflict_fields.length} field(s) changed
                </span>
                <span className="text-gray-500">
                  {showDetails ? '(hide)' : '(show details)'}
                </span>
              </button>

              {showDetails && (
                <div className="mt-3 space-y-2">
                  {conflict.conflict_fields.map((field) => (
                    <div
                      key={field}
                      className="bg-gray-50 rounded px-3 py-2 text-sm font-mono text-gray-700"
                    >
                      {field}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Resolution Strategy Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              How would you like to resolve this conflict?
            </label>

            <div className="space-y-3">
              {/* Keep Ours */}
              <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="strategy"
                  value="ours"
                  checked={selectedStrategy === 'ours'}
                  onChange={(e) => setSelectedStrategy(e.target.value as ConflictResolutionStrategy)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Keep My Version</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Discard their changes and keep all of your modifications.
                  </div>
                </div>
              </label>

              {/* Accept Theirs */}
              <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="radio"
                  name="strategy"
                  value="theirs"
                  checked={selectedStrategy === 'theirs'}
                  onChange={(e) => setSelectedStrategy(e.target.value as ConflictResolutionStrategy)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Use Their Version</div>
                  <div className="text-sm text-gray-600 mt-1">
                    Accept the latest changes from GitHub and discard your modifications.
                  </div>
                </div>
              </label>

              {/* Manual Merge */}
              {conflict.base_version && (
                <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="strategy"
                    value="manual"
                    checked={selectedStrategy === 'manual'}
                    onChange={(e) =>
                      setSelectedStrategy(e.target.value as ConflictResolutionStrategy)
                    }
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      Automatic Merge
                      <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        Recommended
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      Automatically merge non-conflicting changes from both versions. Conflicts will be resolved in favor of the latest version.
                    </div>
                  </div>
                </label>
              )}

              {!conflict.base_version && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      Automatic merge is not available because the common base version could not be found. You must choose to keep your version or use theirs.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={isResolving}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium rounded border border-gray-300 hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2">
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </div>
          </button>
          <button
            onClick={handleResolve}
            disabled={isResolving}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{isResolving ? 'Resolving...' : 'Resolve Conflict'}</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
