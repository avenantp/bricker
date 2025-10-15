/**
 * Create Column Dialog
 * Modal dialog for creating new columns with full validation
 * Features: Complete form fields, data type selector, validation, position auto-calculation
 */

import { useState, useEffect, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { BaseDialog, DialogField, DialogInput, DialogTextarea } from '@/components/Common/BaseDialog';
import { DataTypeSelector } from './DataTypeSelector';
import { validateColumnName, validateDataType } from '@/utils/validation';
import type { Column } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface CreateColumnDialogProps {
  datasetId: string;
  existingColumns: Column[];
  onClose: () => void;
  onCreate: (column: Omit<Column, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
}

interface FormData {
  name: string;
  data_type: string;
  business_name: string;
  description: string;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  is_nullable: boolean;
  default_value: string;
  transformation_logic: string;
}

interface FormErrors {
  name?: string;
  data_type?: string;
  business_name?: string;
  description?: string;
  default_value?: string;
  transformation_logic?: string;
}

// ============================================================================
// Create Column Dialog Component
// ============================================================================

export function CreateColumnDialog({
  datasetId,
  existingColumns,
  onClose,
  onCreate,
}: CreateColumnDialogProps) {
  // ============================================================================
  // State
  // ============================================================================

  const [formData, setFormData] = useState<FormData>({
    name: '',
    data_type: '',
    business_name: '',
    description: '',
    is_primary_key: false,
    is_foreign_key: false,
    is_nullable: true,
    default_value: '',
    transformation_logic: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<keyof FormData, boolean>>({
    name: false,
    data_type: false,
    business_name: false,
    description: false,
    is_primary_key: false,
    is_foreign_key: false,
    is_nullable: false,
    default_value: false,
    transformation_logic: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ============================================================================
  // Validation
  // ============================================================================

  const validateForm = useCallback((): boolean => {
    const newErrors: FormErrors = {};
    const existingColumnNames = existingColumns.map((col) => col.name);

    // Validate name (required)
    if (!formData.name.trim()) {
      newErrors.name = 'Column name is required';
    } else {
      const nameValidation = validateColumnName(formData.name, existingColumnNames);
      if (!nameValidation.isValid) {
        newErrors.name = nameValidation.error;
      }
    }

    // Validate data type (required)
    if (!formData.data_type.trim()) {
      newErrors.data_type = 'Data type is required';
    } else {
      const dataTypeValidation = validateDataType(formData.data_type);
      if (!dataTypeValidation.isValid) {
        newErrors.data_type = dataTypeValidation.error;
      }
    }

    // Validate business name (optional, but if provided, must be valid)
    if (formData.business_name.trim()) {
      if (formData.business_name.length < 2) {
        newErrors.business_name = 'Business name must be at least 2 characters';
      } else if (formData.business_name.length > 200) {
        newErrors.business_name = 'Business name must not exceed 200 characters';
      }
    }

    // Validate description (optional, but if provided, must be valid)
    if (formData.description.trim() && formData.description.length > 2000) {
      newErrors.description = 'Description must not exceed 2000 characters';
    }

    // Validate default value (optional, but if provided, must be valid for nullable)
    if (formData.default_value.trim()) {
      if (!formData.is_nullable && formData.default_value.toUpperCase() === 'NULL') {
        newErrors.default_value = 'Cannot set NULL default for NOT NULL column';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, existingColumns]);

  // Run validation when relevant fields change
  useEffect(() => {
    if (Object.values(touched).some(Boolean)) {
      validateForm();
    }
  }, [formData.name, formData.data_type, formData.business_name, formData.description, formData.default_value, formData.is_nullable, touched, validateForm]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Mark all fields as touched
    setTouched({
      name: true,
      data_type: true,
      business_name: true,
      description: true,
      is_primary_key: true,
      is_foreign_key: true,
      is_nullable: true,
      default_value: true,
      transformation_logic: true,
    });

    // Validate
    if (!validateForm()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // Calculate position (add to end)
      const maxPosition = existingColumns.reduce(
        (max, col) => Math.max(max, col.position || 0),
        0
      );
      const position = maxPosition + 1;

      // Create column object
      const newColumn: Omit<Column, 'id' | 'created_at' | 'updated_at'> = {
        dataset_id: datasetId,
        name: formData.name.trim(),
        data_type: formData.data_type.trim(),
        business_name: formData.business_name.trim() || undefined,
        description: formData.description.trim() || undefined,
        is_primary_key: formData.is_primary_key,
        is_foreign_key: formData.is_foreign_key,
        is_nullable: formData.is_nullable,
        default_value: formData.default_value.trim() || undefined,
        transformation_logic: formData.transformation_logic.trim() || undefined,
        position,
        ai_confidence_score: undefined,
        ai_suggestions: undefined,
        last_ai_enhancement: undefined,
        custom_metadata: undefined,
        fqn: '',
      };

      await onCreate(newColumn);
      onClose();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create column');
      console.error('Create column error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  // ============================================================================
  // Keyboard Shortcuts
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Enter - Submit
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSubmit(e as any);
        return;
      }

      // Escape - Close
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [formData, isSubmitting]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <BaseDialog
      title="Create New Column"
      isOpen={true}
      onClose={handleClose}
      primaryButtonLabel={isSubmitting ? 'Creating...' : 'Create Column'}
      onPrimaryAction={() => handleSubmit({} as React.FormEvent)}
      primaryButtonDisabled={isSubmitting || Object.keys(errors).length > 0}
      secondaryButtonLabel="Cancel"
      onSecondaryAction={handleClose}
      width="800px"
      height="auto"
    >
      {/* Error Banner */}
      {submitError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Error</p>
            <p className="text-sm text-red-700 mt-1">{submitError}</p>
          </div>
        </div>
      )}

      {/* Column Name */}
      <DialogField label="Column Name" required>
        <DialogInput
          value={formData.name}
          onChange={(value) => handleChange('name', value)}
          placeholder="e.g., customer_id, order_date"
          disabled={isSubmitting}
          className={errors.name && touched.name ? 'border-red-300 focus:ring-red-500' : ''}
        />
        {errors.name && touched.name && (
          <p className="mt-1 text-sm text-red-600">{errors.name}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Use lowercase with underscores (e.g., order_total)
        </p>
      </DialogField>

      {/* Data Type */}
      <DialogField label="Data Type" required>
        <DataTypeSelector
          value={formData.data_type}
          onChange={(value) => handleChange('data_type', value)}
          error={errors.data_type && touched.data_type ? errors.data_type : undefined}
          required
          disabled={isSubmitting}
        />
      </DialogField>

      {/* Business Name */}
      <DialogField label="Business Name">
        <DialogInput
          value={formData.business_name}
          onChange={(value) => handleChange('business_name', value)}
          placeholder="e.g., Customer Identifier, Order Date"
          disabled={isSubmitting}
          className={errors.business_name && touched.business_name ? 'border-red-300 focus:ring-red-500' : ''}
        />
        {errors.business_name && touched.business_name && (
          <p className="mt-1 text-sm text-red-600">{errors.business_name}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Human-readable name for business users
        </p>
      </DialogField>

      {/* Description */}
      <DialogField label="Description">
        <DialogTextarea
          value={formData.description}
          onChange={(value) => handleChange('description', value)}
          placeholder="Describe the purpose and content of this column..."
          rows={3}
          disabled={isSubmitting}
          className={errors.description && touched.description ? 'border-red-300 focus:ring-red-500' : ''}
        />
        {errors.description && touched.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
      </DialogField>

      {/* Constraints Checkboxes */}
      <div className="mb-6 space-y-3">
        <label className="block text-sm font-medium text-gray-900">
          Constraints
        </label>

        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="is_primary_key"
            checked={formData.is_primary_key}
            onChange={(e) => handleChange('is_primary_key', e.target.checked)}
            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            disabled={isSubmitting}
          />
          <div className="flex-1">
            <label htmlFor="is_primary_key" className="text-sm font-medium text-gray-700 cursor-pointer">
              Primary Key
            </label>
            <p className="text-xs text-gray-500">
              This column uniquely identifies each row
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="is_foreign_key"
            checked={formData.is_foreign_key}
            onChange={(e) => handleChange('is_foreign_key', e.target.checked)}
            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            disabled={isSubmitting}
          />
          <div className="flex-1">
            <label htmlFor="is_foreign_key" className="text-sm font-medium text-gray-700 cursor-pointer">
              Foreign Key
            </label>
            <p className="text-xs text-gray-500">
              This column references another table
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="is_nullable"
            checked={formData.is_nullable}
            onChange={(e) => handleChange('is_nullable', e.target.checked)}
            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            disabled={isSubmitting}
          />
          <div className="flex-1">
            <label htmlFor="is_nullable" className="text-sm font-medium text-gray-700 cursor-pointer">
              Nullable
            </label>
            <p className="text-xs text-gray-500">
              Allow NULL values in this column
            </p>
          </div>
        </div>
      </div>

      {/* Default Value */}
      <DialogField label="Default Value">
        <DialogInput
          value={formData.default_value}
          onChange={(value) => handleChange('default_value', value)}
          placeholder="e.g., 0, 'N/A', CURRENT_TIMESTAMP"
          disabled={isSubmitting}
          className={errors.default_value && touched.default_value ? 'border-red-300 focus:ring-red-500' : ''}
        />
        {errors.default_value && touched.default_value && (
          <p className="mt-1 text-sm text-red-600">{errors.default_value}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Value to use when no value is provided
        </p>
      </DialogField>

      {/* Transformation Logic */}
      <DialogField label="Transformation Logic">
        <DialogTextarea
          value={formData.transformation_logic}
          onChange={(value) => handleChange('transformation_logic', value)}
          placeholder="e.g., CAST(source_column AS INTEGER)"
          rows={3}
          disabled={isSubmitting}
          className={`font-mono text-sm ${errors.transformation_logic && touched.transformation_logic ? 'border-red-300 focus:ring-red-500' : ''}`}
        />
        {errors.transformation_logic && touched.transformation_logic && (
          <p className="mt-1 text-sm text-red-600">{errors.transformation_logic}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          SQL expression for deriving this column's value
        </p>
      </DialogField>
    </BaseDialog>
  );
}
