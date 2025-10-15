/**
 * Delete Workspace Confirmation Dialog
 * Shows cascade warning before deleting a workspace
 */

import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { BaseDialog } from '@/components/Common/BaseDialog';
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
    <BaseDialog
      title="Delete Workspace"
      isOpen={true}
      onClose={onClose}
      primaryButtonLabel={deleteWorkspaceMutation.isPending ? 'Deleting...' : 'Delete Workspace'}
      onPrimaryAction={handleDelete}
      primaryButtonDisabled={deleteWorkspaceMutation.isPending || !confirmed}
      secondaryButtonLabel="Cancel"
      onSecondaryAction={onClose}
      width="600px"
      height="auto"
    >
      {/* Warning Message */}
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-start gap-3 mb-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-800 font-medium">
              This action cannot be undone!
            </p>
          </div>
        </div>
        <p className="text-sm text-red-700 mb-2">
          Deleting this workspace will permanently remove:
        </p>
        <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
          <li>The workspace and all its settings</li>
          <li>All datasets and configurations</li>
          <li>All data models and metadata files</li>
          <li>Source control connection (if configured)</li>
          <li>Member associations and permissions</li>
        </ul>
      </div>

      {/* Confirmation Checkbox */}
      <div className="mb-6 flex items-start gap-3">
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
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">
            {deleteWorkspaceMutation.error?.message || 'Failed to delete workspace'}
          </p>
        </div>
      )}
    </BaseDialog>
  );
}
