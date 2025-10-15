/**
 * Edit Connection Dialog
 * Modal dialog for editing an existing connection
 */

import { useState, useEffect } from 'react';
import { Database } from 'lucide-react';
import { BaseDialog, DialogField, DialogInput, DialogTextarea } from '@/components/Common/BaseDialog';
import { useConnection, useUpdateConnection } from '@/hooks';
import { ConnectionType, getConnectionTypeLabel, type MSSQLConfiguration } from '@/types/connection';
import { MSSQLConnectionEditor } from './Editors/MSSQLConnectionEditor';

interface EditConnectionDialogProps {
  connectionId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function EditConnectionDialog({
  connectionId,
  onClose,
  onSuccess
}: EditConnectionDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [showEditor, setShowEditor] = useState(false);

  // Fetch connection data
  const { data: connection, isLoading } = useConnection(connectionId);

  // Update mutation
  const updateConnectionMutation = useUpdateConnection({
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Failed to update connection:', error);
    }
  });

  // Initialize form with connection data
  useEffect(() => {
    if (connection) {
      setName(connection.name);
      setDescription(connection.description || '');
    }
  }, [connection]);

  const handleContinue = () => {
    if (!name.trim()) {
      alert('Connection name is required');
      return;
    }

    // Show the appropriate editor based on connection type
    if (connection?.connection_type === ConnectionType.MSSQL) {
      setShowEditor(true);
    } else {
      // For other types, just update name and description
      handleSubmitBasicUpdate();
    }
  };

  const handleMSSQLSave = (connectionName: string, config: MSSQLConfiguration) => {
    handleSubmitWithConfig(config, connectionName);
  };

  const handleSubmitBasicUpdate = async () => {
    if (!connection) return;

    try {
      await updateConnectionMutation.mutateAsync({
        connectionId: connection.id,
        input: {
          name: name.trim(),
          description: description.trim() || undefined
        }
      });
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleSubmitWithConfig = async (config: any, overrideName?: string) => {
    if (!connection) return;

    try {
      await updateConnectionMutation.mutateAsync({
        connectionId: connection.id,
        input: {
          name: overrideName || name.trim(),
          description: description.trim() || undefined,
          configuration: config
        }
      });
    } catch (error) {
      // Error handled in mutation
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <BaseDialog
        title="Edit Connection"
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

  // Show MSSQL editor if selected
  if (showEditor && connection.connection_type === ConnectionType.MSSQL) {
    return (
      <MSSQLConnectionEditor
        initialConfig={connection.configuration as MSSQLConfiguration}
        connectionName={name}
        onSave={handleMSSQLSave}
        onCancel={() => setShowEditor(false)}
        isEdit={true}
      />
    );
  }

  return (
    <BaseDialog
      title="Edit Connection"
      isOpen={true}
      onClose={onClose}
      primaryButtonLabel={connection.connection_type === ConnectionType.MSSQL ? 'Continue' : 'Save Changes'}
      onPrimaryAction={handleContinue}
      primaryButtonDisabled={updateConnectionMutation.isPending}
      secondaryButtonLabel="Cancel"
      onSecondaryAction={onClose}
      width="500px"
      height="auto"
      headerActions={
        <div className="p-2 bg-blue-100 rounded-lg">
          <Database className="w-6 h-6 text-blue-600" />
        </div>
      }
    >
      {/* Connection Name */}
      <DialogField label="Connection Name" required>
        <DialogInput
          value={name}
          onChange={setName}
          placeholder="My Database Connection"
        />
      </DialogField>

      {/* Connection Type (Read-only) */}
      <DialogField label="Connection Type">
        <DialogInput
          value={getConnectionTypeLabel(connection.connection_type)}
          onChange={() => {}}
          disabled
        />
        <p className="mt-1 text-xs text-gray-500">
          Connection type cannot be changed
        </p>
      </DialogField>

      {/* Description */}
      <DialogField label="Description">
        <DialogTextarea
          value={description}
          onChange={setDescription}
          placeholder="Optional description..."
          rows={3}
        />
      </DialogField>
    </BaseDialog>
  );
}
