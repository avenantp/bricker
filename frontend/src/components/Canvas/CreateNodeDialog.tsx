/**
 * Create Node Dialog Component
 * Modal for creating new nodes on the canvas
 */

import { useState, useEffect } from 'react';
import { X, Plus, Info } from 'lucide-react';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Create New Node</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Name */}
          <div>
            <label
              htmlFor="node-name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="node-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., customers, orders, hub_customer"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              required
            />
          </div>

          {/* Medallion Layer */}
          <div>
            <label
              htmlFor="medallion-layer"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Medallion Layer <span className="text-red-500">*</span>
            </label>
            <select
              id="medallion-layer"
              value={medallionLayer}
              onChange={(e) => setMedallionLayer(e.target.value as MedallionLayer)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="Raw">Raw (Landing)</option>
              <option value="Bronze">Bronze</option>
              <option value="Silver">Silver</option>
              <option value="Gold">Gold</option>
            </select>
          </div>

          {/* Entity Type */}
          <div>
            <label
              htmlFor="entity-type"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Entity Type <span className="text-red-500">*</span>
            </label>
            <select
              id="entity-type"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as EntityType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              {availableEntityTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
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
          </div>

          {/* Entity Subtype (conditional) */}
          {subtypeOptions.length > 1 && subtypeOptions[0] !== null && (
            <div>
              <label
                htmlFor="entity-subtype"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Entity Subtype <span className="text-red-500">*</span>
              </label>
              <select
                id="entity-subtype"
                value={entitySubtype || ''}
                onChange={(e) =>
                  setEntitySubtype((e.target.value as EntitySubtype) || null)
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              >
                {subtypeOptions.map((subtype) => (
                  <option key={subtype} value={subtype || ''}>
                    {subtype}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Materialization Type */}
          <div>
            <label
              htmlFor="materialization-type"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Materialization Type
            </label>
            <select
              id="materialization-type"
              value={materializationType || ''}
              onChange={(e) =>
                setMaterializationType(
                  (e.target.value as MaterializationType) || null
                )
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            >
              <option value="Table">Table</option>
              <option value="View">View</option>
              <option value="MaterializedView">Materialized View</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose and content of this node..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={loading}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Node
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
