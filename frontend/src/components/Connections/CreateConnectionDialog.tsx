/**
 * Create Connection Dialog
 * Modal dialog for creating a new connection
 */

import { useState } from 'react';
import { Database } from 'lucide-react';
import { BaseDialog, DialogField, DialogInput, DialogTextarea, DialogSelect } from '@/components/Common/BaseDialog';
import { useCreateConnection } from '@/hooks';
import { ConnectionType, MedallionLayer, getConnectionTypeLabel, getDefaultConfiguration, type MSSQLConfiguration } from '@/types/connection';
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

  // New metadata fields
  const [medallionLayer, setMedallionLayer] = useState('');
  const [recordSource, setRecordSource] = useState('');

  // Type-specific fields
  const [container, setContainer] = useState('');
  const [externalLocation, setExternalLocation] = useState('');
  const [catalog, setCatalog] = useState('');
  const [connectionStringEncrypted, setConnectionStringEncrypted] = useState('');

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
        configuration: config,
        // Metadata fields
        medallion_layer: medallionLayer || undefined,
        record_source: recordSource.trim() || undefined,
        // Type-specific fields
        container: container.trim() || undefined,
        external_location: externalLocation.trim() || undefined,
        catalog: catalog.trim() || undefined,
        connection_string_encrypted: connectionStringEncrypted.trim() || undefined
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
      width="600px"
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

      {/* Medallion Layer */}
      <DialogField label="Medallion Layer (Integration Stage)">
        <DialogSelect
          value={medallionLayer}
          onChange={setMedallionLayer}
          options={Object.entries(MedallionLayer).map(([key, value]) => ({
            value: value,
            label: value
          }))}
          placeholder="Select Layer..."
        />
      </DialogField>

      {/* Record Source */}
      <DialogField label="Record Source">
        <DialogInput
          value={recordSource}
          onChange={setRecordSource}
          placeholder="Record source identifier"
        />
      </DialogField>

      {/* Container */}
      <DialogField label="Container">
        <DialogInput
          value={container}
          onChange={setContainer}
          placeholder="Container or bucket name"
        />
      </DialogField>

      {/* External Location */}
      <DialogField label="External Location">
        <DialogInput
          value={externalLocation}
          onChange={setExternalLocation}
          placeholder="abfss://container@account.dfs.core.windows.net/"
        />
      </DialogField>

      {/* Catalog */}
      <DialogField label="Catalog">
        <DialogInput
          value={catalog}
          onChange={setCatalog}
          placeholder="Catalog name (for Databricks)"
        />
      </DialogField>

      {/* Connection String */}
      <DialogField label="Connection String">
        <DialogInput
          value={connectionStringEncrypted}
          onChange={setConnectionStringEncrypted}
          placeholder="Connection string (encrypted)"
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
