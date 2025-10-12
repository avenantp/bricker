/**
 * Delete Node Dialog Component
 * Confirmation dialog for deleting nodes with cascade warning
 */

import { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import type { Node } from '../../types/node';

interface DeleteNodeDialogProps {
  isOpen: boolean;
  node: Node | null;
  onClose: () => void;
  onDelete: (nodeUuid: string) => Promise<void>;
}

export function DeleteNodeDialog({
  isOpen,
  node,
  onClose,
  onDelete,
}: DeleteNodeDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  if (!isOpen || !node) return null;

  const handleDelete = async () => {
    if (confirmText !== node.name) {
      setError('Node name does not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onDelete(node.uuid);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete node');
    } finally {
      setLoading(false);
    }
  };

  const hasNodeItems = node.node_items && node.node_items.length > 0;
  const hasRelationships = node.node_items.some(
    (item) =>
      item.relationships.length > 0 ||
      item.source_mappings.length > 0 ||
      item.target_mappings.length > 0
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h2 className="text-xl font-bold text-gray-900">Delete Node</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning Message */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 font-medium mb-2">
              This action cannot be undone!
            </p>
            <p className="text-sm text-red-700">
              Deleting this node will permanently remove it from GitHub and all
              associated data.
            </p>
          </div>

          {/* Node Details */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-sm font-medium text-gray-700 w-24">Name:</span>
              <span className="text-sm text-gray-900 font-semibold">{node.name}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-sm font-medium text-gray-700 w-24">FQN:</span>
              <span className="text-sm text-gray-600 font-mono">{node.fqn}</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-sm font-medium text-gray-700 w-24">Type:</span>
              <span className="text-sm text-gray-600">
                {node.entity_type}
                {node.entity_subtype && ` / ${node.entity_subtype}`}
              </span>
            </div>
          </div>

          {/* Impact Assessment */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium text-yellow-900">
              This will also delete:
            </p>
            <ul className="text-sm text-yellow-800 list-disc list-inside space-y-1">
              {hasNodeItems && (
                <li>{node.node_items.length} column(s) / attribute(s)</li>
              )}
              {hasRelationships && <li>All relationships and mappings</li>}
              <li>UUID registry entries</li>
              <li>GitHub metadata file</li>
            </ul>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Confirmation Input */}
          <div>
            <label
              htmlFor="confirm-name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Type <span className="font-semibold">{node.name}</span> to confirm
            </label>
            <input
              id="confirm-name"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={node.name}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              disabled={loading}
              autoComplete="off"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading || confirmText !== node.name}
            className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-300 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Delete Node
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
