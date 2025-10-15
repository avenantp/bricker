/**
 * Delete Node Dialog Component
 * Confirmation dialog for deleting nodes with cascade warning
 */

import { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { BaseDialog, DialogField, DialogInput } from '@/components/Common/BaseDialog';
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
    <BaseDialog
      title="Delete Node"
      isOpen={true}
      onClose={onClose}
      primaryButtonLabel={loading ? 'Deleting...' : 'Delete Node'}
      onPrimaryAction={handleDelete}
      primaryButtonDisabled={loading || confirmText !== node.name}
      secondaryButtonLabel="Cancel"
      onSecondaryAction={onClose}
      width="600px"
      height="auto"
      headerActions={
        <AlertTriangle className="w-5 h-5 text-red-600" />
      }
    >
      {/* Warning Message */}
      <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-800 font-medium mb-2">
          This action cannot be undone!
        </p>
        <p className="text-sm text-red-700">
          Deleting this node will permanently remove it from GitHub and all
          associated data.
        </p>
      </div>

      {/* Node Details */}
      <div className="mb-6 space-y-2">
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
      <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
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
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Confirmation Input */}
      <DialogField
        label={
          <>
            Type <span className="font-semibold">{node.name}</span> to confirm
          </>
        }
        required
      >
        <DialogInput
          value={confirmText}
          onChange={setConfirmText}
          placeholder={node.name}
          disabled={loading}
        />
      </DialogField>
    </BaseDialog>
  );
}
