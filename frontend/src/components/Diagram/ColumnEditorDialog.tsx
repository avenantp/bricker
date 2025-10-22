/**
 * Column Editor Dialog Component
 * Allows editing of column properties
 */

import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Column, UpdateColumnInput } from '../../types/column';

interface ColumnEditorDialogProps {
  column: Column | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

export function ColumnEditorDialog({
  column,
  isOpen,
  onClose,
  onSave,
}: ColumnEditorDialogProps) {
  const [formData, setFormData] = useState<UpdateColumnInput>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form data when column changes
  useEffect(() => {
    if (column) {
      setFormData({
        name: column.name,
        data_type: column.data_type,
        description: column.description,
        business_name: column.business_name,
        is_primary_key: column.is_primary_key,
        is_foreign_key: column.is_foreign_key,
        is_nullable: column.is_nullable,
        default_value: column.default_value,
        transformation_logic: column.transformation_logic,
      });
      setError(null);
    }
  }, [column]);

  const handleSave = async () => {
    if (!column) return;

    setSaving(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('columns')
        .update({
          name: formData.name,
          data_type: formData.data_type,
          description: formData.description || null,
          business_name: formData.business_name || null,
          is_primary_key: formData.is_primary_key,
          is_foreign_key: formData.is_foreign_key,
          is_nullable: formData.is_nullable,
          default_value: formData.default_value || null,
          transformation_logic: formData.transformation_logic || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', column.id);

      if (updateError) throw updateError;

      onSave();
      onClose();
    } catch (err) {
      console.error('[ColumnEditorDialog] Failed to save column:', err);
      setError(err instanceof Error ? err.message : 'Failed to save column');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({});
    setError(null);
    onClose();
  };

  if (!isOpen || !column) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[90vw] max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Edit Column
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {column.name}
            </p>
          </div>
          <button
            onClick={handleCancel}
            className="btn-icon p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            title="Close"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Column Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Column Name *
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              placeholder="Enter column name..."
            />
          </div>

          {/* Business Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Business Name
            </label>
            <input
              type="text"
              value={formData.business_name || ''}
              onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              placeholder="Enter business-friendly name..."
            />
          </div>

          {/* Data Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Data Type *
            </label>
            <input
              type="text"
              value={formData.data_type || ''}
              onChange={(e) => setFormData({ ...formData, data_type: e.target.value })}
              className="w-full px-3 py-2 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              placeholder="e.g., VARCHAR(255), INT, DECIMAL(10,2)"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              placeholder="Enter column description..."
            />
          </div>

          {/* Default Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Default Value
            </label>
            <input
              type="text"
              value={formData.default_value || ''}
              onChange={(e) => setFormData({ ...formData, default_value: e.target.value })}
              className="w-full px-3 py-2 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              placeholder="e.g., NULL, 0, 'default'"
            />
          </div>

          {/* Transformation Logic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Transformation Logic
            </label>
            <textarea
              value={formData.transformation_logic || ''}
              onChange={(e) => setFormData({ ...formData, transformation_logic: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              placeholder="Enter transformation logic..."
            />
          </div>

          {/* Checkboxes */}
          <div className="grid grid-cols-3 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_primary_key || false}
                onChange={(e) => setFormData({ ...formData, is_primary_key: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Primary Key</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_foreign_key || false}
                onChange={(e) => setFormData({ ...formData, is_foreign_key: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Foreign Key</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_nullable !== false}
                onChange={(e) => setFormData({ ...formData, is_nullable: e.target.checked })}
                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">Nullable</span>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={handleCancel}
            disabled={saving}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !formData.name || !formData.data_type}
            className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
