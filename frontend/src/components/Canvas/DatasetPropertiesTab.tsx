/**
 * Dataset Properties Tab
 * Form for editing dataset metadata including name, classification, and Git sync status
 */

import { useState, useEffect, useMemo } from 'react';
import { AlertCircle, Check, X, Plus, Trash2, GitBranch, Clock } from 'lucide-react';
import type { Dataset, DatasetMetadata } from '@/types/dataset';
import type { MedallionLayer, DatasetType } from '@/types/canvas';
import { validateDatasetName, validateFQN, generateFQN } from '@/utils/validation';
import { getConfidenceLevelColor } from '@/utils/validation';

// ============================================================================
// Types
// ============================================================================

export interface DatasetPropertiesTabProps {
  dataset: Dataset;
  existingDatasetNames: string[];
  onChange: (updates: Partial<Dataset>) => void;
  onSave: () => Promise<void>;
}

interface MetadataEntry {
  key: string;
  value: string;
}

// ============================================================================
// Constants
// ============================================================================

const MEDALLION_LAYERS: MedallionLayer[] = ['Source', 'Raw', 'Bronze', 'Silver', 'Gold'];

const DATASET_TYPES: DatasetType[] = [
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

// ============================================================================
// Dataset Properties Tab Component
// ============================================================================

export function DatasetPropertiesTab({
  dataset,
  existingDatasetNames,
  onChange,
  onSave,
}: DatasetPropertiesTabProps) {
  // Form state
  const [name, setName] = useState(dataset.name);
  const [medallionLayer, setMedallionLayer] = useState<MedallionLayer | undefined>(
    dataset.medallion_layer
  );
  const [datasetType, setDatasetType] = useState<DatasetType | undefined>(dataset.dataset_type);
  const [description, setDescription] = useState(dataset.description || '');
  const [metadataEntries, setMetadataEntries] = useState<MetadataEntry[]>([]);

  // Validation state
  const [nameError, setNameError] = useState<string | null>(null);

  // Initialize metadata entries from dataset.metadata
  useEffect(() => {
    const entries: MetadataEntry[] = [];
    if (dataset.metadata) {
      Object.entries(dataset.metadata).forEach(([key, value]) => {
        if (key !== 'custom_properties' && value !== undefined && value !== null) {
          entries.push({ key, value: String(value) });
        }
      });
    }
    setMetadataEntries(entries);
  }, [dataset.metadata]);

  // ============================================================================
  // Computed Values
  // ============================================================================

  // Generate FQN reactively
  const generatedFQN = useMemo(() => {
    if (!medallionLayer || !name) return dataset.fqn;

    // Extract schema from existing FQN or use default
    const parts = dataset.fqn.split('.');
    const schema = parts.length === 3 ? parts[1] : 'default';

    return generateFQN(medallionLayer, schema, name);
  }, [medallionLayer, name, dataset.fqn]);


  // ============================================================================
  // Validation
  // ============================================================================

  useEffect(() => {
    if (!name.trim()) {
      setNameError('Dataset name is required');
      return;
    }

    const otherNames = existingDatasetNames.filter(n => n !== dataset.name);
    const validation = validateDatasetName(name, otherNames);

    if (!validation.isValid) {
      setNameError(validation.error || 'Invalid name');
    } else {
      setNameError(null);
    }
  }, [name, existingDatasetNames, dataset.name]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleNameChange = (value: string) => {
    setName(value);
    onChange({ name: value });
  };

  const handleMedallionLayerChange = (value: string) => {
    const layer = value as MedallionLayer;
    setMedallionLayer(layer);
    onChange({ medallion_layer: layer });
  };

  const handleDatasetTypeChange = (value: string) => {
    const type = value as DatasetType;
    setDatasetType(type);
    onChange({ dataset_type: type });
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    onChange({ description: value });
  };

  const handleAddMetadataEntry = () => {
    setMetadataEntries([...metadataEntries, { key: '', value: '' }]);
  };

  const handleRemoveMetadataEntry = (index: number) => {
    const updated = metadataEntries.filter((_, i) => i !== index);
    setMetadataEntries(updated);
    updateMetadata(updated);
  };

  const handleMetadataKeyChange = (index: number, key: string) => {
    const updated = [...metadataEntries];
    updated[index].key = key;
    setMetadataEntries(updated);
    updateMetadata(updated);
  };

  const handleMetadataValueChange = (index: number, value: string) => {
    const updated = [...metadataEntries];
    updated[index].value = value;
    setMetadataEntries(updated);
    updateMetadata(updated);
  };

  const updateMetadata = (entries: MetadataEntry[]) => {
    const metadata: DatasetMetadata = {};
    entries.forEach(({ key, value }) => {
      if (key.trim()) {
        metadata[key.trim()] = value;
      }
    });
    onChange({ metadata });
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="p-6 max-w-4xl">
      {/* Basic Information Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>

        <div className="space-y-4">
          {/* Name Field */}
          <div>
            <label htmlFor="dataset-name" className="block text-sm font-medium text-gray-700 mb-1">
              Name *
            </label>
            <input
              id="dataset-name"
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                nameError
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              placeholder="e.g., customers, orders, fact_sales"
              autoFocus
            />
            {nameError && (
              <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" />
                {nameError}
              </p>
            )}
          </div>

          {/* FQN Field (Read-only, Auto-generated) */}
          <div>
            <label htmlFor="dataset-fqn" className="block text-sm font-medium text-gray-700 mb-1">
              Fully Qualified Name (FQN)
            </label>
            <input
              id="dataset-fqn"
              type="text"
              value={generatedFQN}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-gray-500">
              Auto-generated from layer and name
            </p>
          </div>

          {/* UUID (Read-only) */}
          <div>
            <label htmlFor="dataset-id" className="block text-sm font-medium text-gray-700 mb-1">
              Dataset ID
            </label>
            <input
              id="dataset-id"
              type="text"
              value={dataset.dataset_id}
              readOnly
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600 cursor-not-allowed font-mono text-sm"
            />
          </div>
        </div>
      </div>

      {/* Classification Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Classification</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Medallion Layer */}
          <div>
            <label htmlFor="medallion-layer" className="block text-sm font-medium text-gray-700 mb-1">
              Medallion Layer
            </label>
            <select
              id="medallion-layer"
              value={medallionLayer || ''}
              onChange={(e) => handleMedallionLayerChange(e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select layer...</option>
              {MEDALLION_LAYERS.map((layer) => (
                <option key={layer} value={layer}>
                  {layer}
                </option>
              ))}
            </select>
          </div>

          {/* Dataset Type */}
          <div>
            <label htmlFor="dataset-type" className="block text-sm font-medium text-gray-700 mb-1">
              Dataset Type
            </label>
            <select
              id="dataset-type"
              value={datasetType || ''}
              onChange={(e) => handleDatasetTypeChange(e.target.value)}
              className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select type...</option>
              {DATASET_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Description Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Documentation</h3>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe the purpose and content of this dataset..."
          />
        </div>

        {/* AI Confidence Score (if present) */}
        {dataset.ai_confidence_score !== undefined && dataset.ai_confidence_score !== null && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">AI Confidence Score</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  This description was generated or enhanced by AI
                </p>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${getConfidenceLevelColor(dataset.ai_confidence_score)}`}>
                {dataset.ai_confidence_score}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Custom Metadata Section */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Custom Metadata</h3>
          <button
            onClick={handleAddMetadataEntry}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Field
          </button>
        </div>

        {metadataEntries.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
            No custom metadata. Click "Add Field" to add key-value pairs.
          </p>
        ) : (
          <div className="space-y-2">
            {metadataEntries.map((entry, index) => (
              <div key={index} className="flex gap-2">
                <input
                  type="text"
                  value={entry.key}
                  onChange={(e) => handleMetadataKeyChange(index, e.target.value)}
                  placeholder="Key"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  value={entry.value}
                  onChange={(e) => handleMetadataValueChange(index, e.target.value)}
                  placeholder="Value"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => handleRemoveMetadataEntry(index)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  aria-label="Remove field"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Git Sync Status Section */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Git Sync Status</h3>

        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
          {/* Sync Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Status</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              dataset.sync_status === 'synced'
                ? 'bg-green-100 text-green-700'
                : dataset.sync_status === 'pending'
                ? 'bg-yellow-100 text-yellow-700'
                : dataset.sync_status === 'conflict'
                ? 'bg-red-100 text-red-700'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {dataset.sync_status.charAt(0).toUpperCase() + dataset.sync_status.slice(1)}
            </span>
          </div>

          {/* Uncommitted Changes */}
          {dataset.has_uncommitted_changes && (
            <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-700">You have uncommitted changes</span>
            </div>
          )}

          {/* Last Commit SHA */}
          {dataset.source_control_commit_sha && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Last Commit</span>
              <code className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">
                {dataset.source_control_commit_sha.substring(0, 8)}
              </code>
            </div>
          )}

          {/* Last Synced */}
          {dataset.last_synced_at && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Last Synced</span>
              <span className="text-sm text-gray-600 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {new Date(dataset.last_synced_at).toLocaleString()}
              </span>
            </div>
          )}

          {/* Sync Error */}
          {dataset.sync_error_message && (
            <div className="p-2 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-700">{dataset.sync_error_message}</p>
            </div>
          )}

          {/* Actions */}
          {dataset.has_uncommitted_changes && (
            <div className="flex gap-2 pt-2 border-t border-gray-300">
              <button
                onClick={onSave}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm flex items-center justify-center gap-2"
              >
                <GitBranch className="w-4 h-4" />
                Commit Changes
              </button>
              <button
                onClick={() => {
                  // TODO: Implement discard changes
                  console.log('Discard changes');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Discard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
