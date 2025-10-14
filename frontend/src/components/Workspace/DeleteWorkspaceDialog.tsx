/**
 * Delete Workspace Confirmation Dialog
 * Shows cascade warning before deleting a workspace
 */

import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { useDeleteWorkspace } from '../../hooks';

interface DeleteWorkspaceDialogProps {
  workspaceId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DeleteWorkspaceDialog({
  workspaceId,
  onClose,
  onSuccess,
}: DeleteWorkspaceDialogProps) {
  const [confirmed, setConfirmed] = useState(false);

  // Delete workspace mutation
  const deleteWorkspaceMutation = useDeleteWorkspace({
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Failed to delete workspace:', error);
    }
  });

  const handleDelete = () => {
    if (!confirmed) return;
    deleteWorkspaceMutation.mutate(workspaceId);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Delete Workspace</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={deleteWorkspaceMutation.isPending}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning Message */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 font-medium mb-2">
              This action cannot be undone!
            </p>
            <p className="text-sm text-red-700">
              Deleting this workspace will permanently remove:
            </p>
            <ul className="mt-2 text-sm text-red-700 space-y-1 list-disc list-inside">
              <li>The workspace and all its settings</li>
              <li>All datasets and configurations</li>
              <li>All data models and metadata files</li>
              <li>Source control connection (if configured)</li>
              <li>Member associations and permissions</li>
            </ul>
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-start gap-3">
            <input
              id="confirm"
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
              disabled={deleteWorkspaceMutation.isPending}
            />
            <label htmlFor="confirm" className="text-sm text-gray-700 select-none">
              I understand that this action is permanent and cannot be undone. All data associated
              with this workspace will be permanently deleted.
            </label>
          </div>

          {/* Error Message */}
          {deleteWorkspaceMutation.isError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">
                {deleteWorkspaceMutation.error?.message || 'Failed to delete workspace'}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            disabled={deleteWorkspaceMutation.isPending}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={deleteWorkspaceMutation.isPending || !confirmed}
          >
            {deleteWorkspaceMutation.isPending ? 'Deleting...' : 'Delete Workspace'}
          </button>
        </div>
      </div>
    </div>
  );
}
