/**
 * Delete Connection Dialog
 * Confirmation dialog for deleting a connection
 */

import { AlertCircle } from 'lucide-react';
import { BaseDialog } from '@/components/Common/BaseDialog';
import { useConnection, useDeleteConnection } from '@/hooks';

interface DeleteConnectionDialogProps {
  connectionId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function DeleteConnectionDialog({
  connectionId,
  onClose,
  onSuccess
}: DeleteConnectionDialogProps) {
  const { data: connection, isLoading } = useConnection(connectionId);
  const deleteConnectionMutation = useDeleteConnection({
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Failed to delete connection:', error);
      alert(`Failed to delete connection: ${error.message}`);
    }
  });

  const handleDelete = async () => {
    try {
      await deleteConnectionMutation.mutateAsync(connectionId);
    } catch (error) {
      // Error handled in mutation
    }
  };

  return (
    <BaseDialog
      title="Delete Connection"
      isOpen={true}
      onClose={onClose}
      primaryButtonLabel={deleteConnectionMutation.isPending ? 'Deleting...' : 'Delete Connection'}
      onPrimaryAction={handleDelete}
      primaryButtonDisabled={deleteConnectionMutation.isPending || !connection}
      secondaryButtonLabel="Cancel"
      onSecondaryAction={onClose}
      width="500px"
      height="auto"
    >
      {/* Content */}
      <div className="mb-6">
        {isLoading ? (
          <p className="text-gray-600">Loading...</p>
        ) : connection ? (
          <>
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-800 font-medium">Warning</p>
                <p className="text-sm text-red-700 mt-1">
                  This action cannot be undone. The connection will be permanently removed.
                </p>
              </div>
            </div>
            <p className="text-gray-700">
              Are you sure you want to delete the connection{' '}
              <span className="font-semibold">{connection.name}</span>?
            </p>
          </>
        ) : (
          <p className="text-red-600">Connection not found</p>
        )}
      </div>
    </BaseDialog>
  );
}
