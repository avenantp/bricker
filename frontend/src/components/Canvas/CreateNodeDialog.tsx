/**
 * Create Node Dialog Component
 * Modal for creating new nodes on the canvas
 */

import { useState, useEffect } from 'react';
import { Plus, Info } from 'lucide-react';
import { BaseDialog, DialogField, DialogInput, DialogTextarea, DialogSelect } from '@/components/Common/BaseDialog';
import type {
  MedallionLayer,
  EntityType,
  EntitySubtype,
  MaterializationType,
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
  const [entityType, setEntityType] = useState<EntityType>('Table');
  const [entitySubtype, setEntitySubtype] = useState<EntitySubtype>(null);
  const [materializationType, setMaterializationType] =
    useState<MaterializationType>('Table');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setMedallionLayer('Bronze');
      setEntityType('Table');
      setEntitySubtype(null);
      setMaterializationType('Table');
      setDescription('');
      setError(null);
    }
  }, [isOpen]);

  // Update entity subtype when entity type changes
  useEffect(() => {
    if (entityType === 'DataVault') {
      setEntitySubtype('Hub');
    } else if (entityType === 'DataMart') {
      setEntitySubtype('Dimension');
    } else {
      setEntitySubtype(null);
    }
  }, [entityType]);

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
        entity_type: entityType,
        entity_subtype: entitySubtype,
        materialization_type: materializationType,
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

  // Determine available entity types based on project type
  const availableEntityTypes: EntityType[] = ['Table', 'Staging', 'PersistentStaging'];
  if (projectType === 'DataVault') {
    availableEntityTypes.push('DataVault');
  }
  if (projectType === 'Dimensional') {
    availableEntityTypes.push('DataMart');
  }

  // Get subtype options based on entity type
  const getSubtypeOptions = (): EntitySubtype[] => {
    if (entityType === 'DataVault') {
      return ['Hub', 'Link', 'Satellite', 'LinkSatellite', 'PIT', 'Bridge'];
    }
    if (entityType === 'DataMart') {
      return ['Dimension', 'Fact'];
    }
    return [null];
  };

  const subtypeOptions = getSubtypeOptions();

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
            { value: 'Raw', label: 'Raw (Landing)' },
            { value: 'Bronze', label: 'Bronze' },
            { value: 'Silver', label: 'Silver' },
            { value: 'Gold', label: 'Gold' }
          ]}
          disabled={loading}
        />
      </DialogField>

      {/* Entity Type */}
      <DialogField label="Entity Type" required>
        <DialogSelect
          value={entityType}
          onChange={(value) => setEntityType(value as EntityType)}
          options={availableEntityTypes.map((type) => ({
            value: type,
            label: type
          }))}
          disabled={loading}
        />
        {(entityType === 'DataVault' || entityType === 'DataMart') && (
          <div className="mt-2 flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
            <Info className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-800">
              {entityType === 'DataVault' &&
                'Data Vault entities follow specific naming patterns and relationships.'}
              {entityType === 'DataMart' &&
                'Data Mart entities are designed for analytical querying and reporting.'}
            </p>
          </div>
        )}
      </DialogField>

      {/* Entity Subtype (conditional) */}
      {subtypeOptions.length > 1 && subtypeOptions[0] !== null && (
        <DialogField label="Entity Subtype" required>
          <DialogSelect
            value={entitySubtype || ''}
            onChange={(value) =>
              setEntitySubtype((value as EntitySubtype) || null)
            }
            options={subtypeOptions.map((subtype) => ({
              value: subtype || '',
              label: subtype || ''
            }))}
            disabled={loading}
          />
        </DialogField>
      )}

      {/* Materialization Type */}
      <DialogField label="Materialization Type">
        <DialogSelect
          value={materializationType || ''}
          onChange={(value) =>
            setMaterializationType(
              (value as MaterializationType) || null
            )
          }
          options={[
            { value: 'Table', label: 'Table' },
            { value: 'View', label: 'View' },
            { value: 'MaterializedView', label: 'Materialized View' }
          ]}
          disabled={loading}
        />
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
