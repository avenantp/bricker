/**
 * Clone Connection Dialog
 * Modal dialog for cloning an existing connection with a new name
 */

import { useState, useEffect } from 'react';
import { Copy } from 'lucide-react';
import { BaseDialog, DialogField, DialogInput } from '@/components/Common/BaseDialog';
import { useConnection, useCreateConnection, useAccount } from '@/hooks';

interface CloneConnectionDialogProps {
  connectionId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CloneConnectionDialog({
  connectionId,
  onClose,
  onSuccess
}: CloneConnectionDialogProps) {
  const [name, setName] = useState('');

  // Fetch original connection data
  const { data: connection, isLoading } = useConnection(connectionId);

  // Fetch user's account
  const { data: account } = useAccount();

  // Create mutation
  const createConnectionMutation = useCreateConnection({
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Failed to clone connection:', error);
    }
  });

  // Initialize form with connection data
  useEffect(() => {
    if (connection) {
      setName(`${connection.name} (Copy)`);
    }
  }, [connection]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert('Connection name is required');
      return;
    }

    if (!connection || !account) {
      alert('Unable to clone connection');
      return;
    }

    try {
      await createConnectionMutation.mutateAsync({
        account_id: account.id,
        workspace_id: connection.workspace_id,
        name: name.trim(),
        description: connection.description ? `${connection.description} (Cloned)` : 'Cloned connection',
        connection_type: connection.connection_type,
        configuration: connection.configuration
      });
    } catch (error) {
      // Error handled in mutation
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <BaseDialog
        title="Clone Connection"
        isOpen={true}
        onClose={onClose}
        showCloseButton={false}
        width="500px"
        height="auto"
      >
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </BaseDialog>
    );
  }

  // Show error if connection not found
  if (!connection) {
    return (
      <BaseDialog
        title="Error"
        isOpen={true}
        onClose={onClose}
        primaryButtonLabel="Close"
        onPrimaryAction={onClose}
        width="500px"
        height="auto"
      >
        <p className="text-red-600 text-center">Connection not found</p>
      </BaseDialog>
    );
  }

  return (
    <BaseDialog
      title="Clone Connection"
      isOpen={true}
      onClose={onClose}
      primaryButtonLabel={createConnectionMutation.isPending ? 'Cloning...' : 'Clone Connection'}
      onPrimaryAction={handleSubmit}
      primaryButtonDisabled={createConnectionMutation.isPending || !name.trim()}
      secondaryButtonLabel="Cancel"
      onSecondaryAction={onClose}
      width="500px"
      height="auto"
      headerActions={
        <div className="p-2 bg-blue-100 rounded-lg">
          <Copy className="w-5 h-5 text-blue-600" />
        </div>
      }
    >
      <p className="mb-6 text-sm text-gray-600">
        This will create a copy of <span className="font-semibold">{connection.name}</span> with all its configuration settings.
      </p>

      <DialogField label="New Connection Name" required>
        <DialogInput
          value={name}
          onChange={setName}
          placeholder="Enter name for the cloned connection"
        />
      </DialogField>
    </BaseDialog>
  );
}
