/**
 * Create Connection Dialog
 * Modal dialog for creating a new connection
 */

import { useState } from 'react';
import { Database } from 'lucide-react';
import { BaseDialog, DialogField, DialogInput, DialogTextarea, DialogSelect } from '@/components/Common/BaseDialog';
import { useCreateConnection } from '@/hooks';
import { ConnectionType, getConnectionTypeLabel, getDefaultConfiguration, type MSSQLConfiguration } from '@/types/connection';
import { MSSQLConnectionEditor } from './Editors/MSSQLConnectionEditor';

interface CreateConnectionDialogProps {
  accountId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateConnectionDialog({
  accountId,
  onClose,
  onSuccess
}: CreateConnectionDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [connectionType, setConnectionType] = useState<ConnectionType>(ConnectionType.MSSQL);
  const [showEditor, setShowEditor] = useState(false);

  const createConnectionMutation = useCreateConnection({
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Failed to create connection:', error);
    }
  });

  const handleContinue = () => {
    if (!name.trim()) {
      alert('Connection name is required');
      return;
    }

    // Show the appropriate editor based on connection type
    if (connectionType === ConnectionType.MSSQL) {
      setShowEditor(true);
    } else {
      // For other types, use default configuration for now
      handleSubmitWithConfig(getDefaultConfiguration(connectionType));
    }
  };

  const handleMSSQLSave = (connectionName: string, config: MSSQLConfiguration) => {
    handleSubmitWithConfig(config, connectionName);
  };

  const handleSubmitWithConfig = async (config: any, overrideName?: string) => {
    try {
      await createConnectionMutation.mutateAsync({
        account_id: accountId,
        name: overrideName || name.trim(),
        description: description.trim() || undefined,
        connection_type: connectionType,
        configuration: config
      });
    } catch (error) {
      // Error handled in mutation
    }
  };

  // Show MSSQL editor if selected
  if (showEditor && connectionType === ConnectionType.MSSQL) {
    return (
      <MSSQLConnectionEditor
        connectionName={name}
        onSave={handleMSSQLSave}
        onCancel={() => setShowEditor(false)}
        isEdit={false}
      />
    );
  }

  return (
    <BaseDialog
      title="New Connection"
      isOpen={true}
      onClose={onClose}
      primaryButtonLabel="Continue"
      onPrimaryAction={handleContinue}
      primaryButtonDisabled={createConnectionMutation.isPending}
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

      {/* Connection Type */}
      <DialogField label="Connection Type" required>
        <DialogSelect
          value={connectionType}
          onChange={(value) => setConnectionType(value as ConnectionType)}
          options={Object.values(ConnectionType).map((type) => ({
            value: type,
            label: getConnectionTypeLabel(type)
          }))}
        />
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
