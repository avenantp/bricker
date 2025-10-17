/**
 * Create Node Dialog Component
 * Modal for creating new nodes on the canvas
 */

import { useState, useEffect } from 'react';
import { Plus, Info } from 'lucide-react';
import { BaseDialog, DialogField, DialogInput, DialogTextarea, DialogSelect } from '@/components/Common/BaseDialog';
import type {
  MedallionLayer,
  DatasetType,
} from '../../types/canvas';
import type { CreateNodePayload } from '../../types/node';

interface CreateNodeDialogProps {
  isOpen: boolean;
  projectId: string;
  projectType: 'Standard' | 'DataVault' | 'Dimensional';
  onClose: () => void;
  onCreate: (payload: CreateNodePayload) => Promise<void>;
  initialPosition?: { x: number; y: number };
}

export function CreateNodeDialog({
  isOpen,
  projectId,
  projectType,
  onClose,
  onCreate,
  initialPosition,
}: CreateNodeDialogProps) {
  const [name, setName] = useState('');
  const [medallionLayer, setMedallionLayer] = useState<MedallionLayer>('Bronze');
  const [datasetType, setDatasetType] = useState<DatasetType>('Table');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setMedallionLayer('Bronze');
      setDatasetType('Table');
      setDescription('');
      setError(null);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setLoading(true);

    try {
      const payload: CreateNodePayload = {
        project_id: projectId,
        name: name.trim(),
        medallion_layer: medallionLayer,
        dataset_type: datasetType,
        description: description.trim() || undefined,
        position: initialPosition,
      };

      await onCreate(payload);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create node');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  // All available dataset types
  const availableDatasetTypes: DatasetType[] = [
    'Table',
    'View',
    'Dimension',
    'Fact',
    'Hub',
    'Link',
    'Satellite',
    'LinkSatellite',
    'Point In Time',
    'Bridge',
    'Reference',
    'Hierarchy Link',
    'Same as Link',
    'Reference Satellite',
    'File',
  ];

  // Filter dataset types based on project type
  const getFilteredDatasetTypes = (): DatasetType[] => {
    if (projectType === 'DataVault') {
      return availableDatasetTypes.filter((type) =>
        ['Hub', 'Link', 'Satellite', 'LinkSatellite', 'Point In Time', 'Bridge', 'Table', 'View'].includes(type)
      );
    }
    if (projectType === 'Dimensional') {
      return availableDatasetTypes.filter((type) =>
        ['Dimension', 'Fact', 'Table', 'View'].includes(type)
      );
    }
    return availableDatasetTypes;
  };

  const filteredDatasetTypes = getFilteredDatasetTypes();

  return (
    <BaseDialog
      title="Create New Node"
      isOpen={true}
      onClose={onClose}
      primaryButtonLabel={loading ? 'Creating...' : 'Create Node'}
      onPrimaryAction={handleSubmit}
      primaryButtonDisabled={loading}
      secondaryButtonLabel="Cancel"
      onSecondaryAction={onClose}
      width="700px"
      height="auto"
      headerActions={
        <Plus className="w-5 h-5 text-blue-600" />
      }
    >
      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Name */}
      <DialogField label="Name" required>
        <DialogInput
          value={name}
          onChange={setName}
          placeholder="e.g., customers, orders, hub_customer"
          disabled={loading}
        />
      </DialogField>

      {/* Medallion Layer */}
      <DialogField label="Medallion Layer" required>
        <DialogSelect
          value={medallionLayer}
          onChange={(value) => setMedallionLayer(value as MedallionLayer)}
          options={[
            { value: 'Source', label: 'Source' },
            { value: 'Raw', label: 'Raw (Landing)' },
            { value: 'Bronze', label: 'Bronze' },
            { value: 'Silver', label: 'Silver' },
            { value: 'Gold', label: 'Gold' }
          ]}
          disabled={loading}
        />
      </DialogField>

      {/* Dataset Type */}
      <DialogField label="Dataset Type" required>
        <DialogSelect
          value={datasetType}
          onChange={(value) => setDatasetType(value as DatasetType)}
          options={filteredDatasetTypes.map((type) => ({
            value: type,
            label: type
          }))}
          disabled={loading}
        />
        {projectType !== 'Standard' && (
          <div className="mt-2 flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-800">
              {projectType === 'DataVault' &&
                'Data Vault entities follow specific naming patterns and relationships.'}
              {projectType === 'Dimensional' &&
                'Dimensional models are designed for analytical querying and reporting.'}
            </p>
          </div>
        )}
      </DialogField>

      {/* Description */}
      <DialogField label="Description">
        <DialogTextarea
          value={description}
          onChange={setDescription}
          placeholder="Describe the purpose and content of this node..."
          rows={3}
          disabled={loading}
        />
      </DialogField>
    </BaseDialog>
  );
}
