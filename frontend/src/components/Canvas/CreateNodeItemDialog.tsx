/**
 * Create NodeItem Dialog
 * Dialog for adding new NodeItems (columns) to a Node
 * Phase 2.5 - NodeItem Management
 */

import { useState } from 'react';
import { X, Plus, AlertCircle } from 'lucide-react';
import type { CreateNodeItemPayload } from '../../types/node';

interface CreateNodeItemDialogProps {
  isOpen: boolean;
  nodeUuid: string;
  existingNames: string[]; // For validation
  onClose: () => void;
  onCreate: (payload: CreateNodeItemPayload) => Promise<void>;
}

// Common data types
const COMMON_DATA_TYPES = [
  'INT',
  'BIGINT',
  'SMALLINT',
  'TINYINT',
  'DECIMAL',
  'NUMERIC',
  'FLOAT',
  'DOUBLE',
  'VARCHAR',
  'CHAR',
  'TEXT',
  'STRING',
  'DATE',
  'DATETIME',
  'TIMESTAMP',
  'BOOLEAN',
  'BINARY',
  'JSON',
  'ARRAY',
  'MAP',
  'STRUCT',
  'UUID',
];

export function CreateNodeItemDialog({
  isOpen,
  nodeUuid,
  existingNames,
  onClose,
  onCreate,
}: CreateNodeItemDialogProps) {
  const [name, setName] = useState('');
  const [dataType, setDataType] = useState('VARCHAR');
  const [description, setDescription] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [isNullable, setIsNullable] = useState(true);
  const [isPrimaryKey, setIsPrimaryKey] = useState(false);
  const [isForeignKey, setIsForeignKey] = useState(false);
  const [defaultValue, setDefaultValue] = useState('');
  const [customDataType, setCustomDataType] = useState('');
  const [useCustomDataType, setUseCustomDataType] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name is required');
      return;
    }

    // Check for duplicate names (case-insensitive)
    if (existingNames.some((n) => n.toLowerCase() === trimmedName.toLowerCase())) {
      setError(`A NodeItem with the name "${trimmedName}" already exists`);
      return;
    }

    const finalDataType = useCustomDataType
      ? customDataType.trim().toUpperCase()
      : dataType;

    if (!finalDataType) {
      setError('Data type is required');
      return;
    }

    setLoading(true);

    try {
      const payload: CreateNodeItemPayload = {
        node_uuid: nodeUuid,
        name: trimmedName,
        data_type: finalDataType,
        description: description.trim() || undefined,
        business_name: businessName.trim() || undefined,
        is_nullable: isNullable,
        is_primary_key: isPrimaryKey,
        is_foreign_key: isForeignKey,
        default_value: defaultValue.trim() || undefined,
      };

      await onCreate(payload);

      // Reset form
      setName('');
      setDataType('VARCHAR');
      setDescription('');
      setBusinessName('');
      setIsNullable(true);
      setIsPrimaryKey(false);
      setIsForeignKey(false);
      setDefaultValue('');
      setCustomDataType('');
      setUseCustomDataType(false);

      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create NodeItem');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Add NodeItem</h2>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="nodeitem-name" className="block text-sm font-medium text-gray-700 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                id="nodeitem-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., customer_id"
                disabled={loading}
                required
                autoFocus
              />
            </div>

            {/* Data Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Type <span className="text-red-500">*</span>
              </label>

              <div className="flex items-center gap-3 mb-2">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={!useCustomDataType}
                    onChange={() => setUseCustomDataType(false)}
                    disabled={loading}
                  />
                  <span className="text-sm text-gray-700">Common Types</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={useCustomDataType}
                    onChange={() => setUseCustomDataType(true)}
                    disabled={loading}
                  />
                  <span className="text-sm text-gray-700">Custom Type</span>
                </label>
              </div>

              {useCustomDataType ? (
                <input
                  type="text"
                  value={customDataType}
                  onChange={(e) => setCustomDataType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter custom data type"
                  disabled={loading}
                />
              ) : (
                <select
                  value={dataType}
                  onChange={(e) => setDataType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  {COMMON_DATA_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="nodeitem-description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="nodeitem-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Describe this column..."
                disabled={loading}
              />
            </div>

            {/* Business Name */}
            <div>
              <label htmlFor="nodeitem-business-name" className="block text-sm font-medium text-gray-700 mb-2">
                Business Name
              </label>
              <input
                id="nodeitem-business-name"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Customer ID"
                disabled={loading}
              />
            </div>

            {/* Default Value */}
            <div>
              <label htmlFor="nodeitem-default" className="block text-sm font-medium text-gray-700 mb-2">
                Default Value
              </label>
              <input
                id="nodeitem-default"
                type="text"
                value={defaultValue}
                onChange={(e) => setDefaultValue(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., NULL, 0, 'default'"
                disabled={loading}
              />
            </div>

            {/* Checkboxes */}
            <div className="border-t border-gray-200 pt-4">
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isNullable}
                    onChange={(e) => setIsNullable(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Nullable</span>
                    <p className="text-xs text-gray-500">Allow NULL values</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPrimaryKey}
                    onChange={(e) => setIsPrimaryKey(e.target.checked)}
                    className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                    disabled={loading}
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Primary Key</span>
                    <p className="text-xs text-gray-500">Part of the primary key</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isForeignKey}
                    onChange={(e) => setIsForeignKey(e.target.checked)}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    disabled={loading}
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700">Foreign Key</span>
                    <p className="text-xs text-gray-500">References another table</p>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create NodeItem
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
