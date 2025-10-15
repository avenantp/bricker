/**
 * Editable Cell Component
 * Enables inline editing of column metadata in the columns table
 * Features: Click-to-edit, keyboard navigation, validation, auto-save
 */

import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { DataTypeSelector } from './DataTypeSelector';
import { validateColumnName, validateDataType } from '@/utils/validation';
import type { Column } from '@/types';

// ============================================================================
// Types
// ============================================================================

export interface EditableCellProps {
  column: Column;
  field: keyof Column;
  existingColumnNames?: string[];
  onSave: (columnId: string, field: keyof Column, value: any) => Promise<void>;
  onCancel?: () => void;
  disabled?: boolean;
}

export type CellFieldType = 'text' | 'textarea' | 'data_type';

// ============================================================================
// Editable Cell Component
// ============================================================================

export function EditableCell({
  column,
  field,
  existingColumnNames = [],
  onSave,
  onCancel,
  disabled = false,
}: EditableCellProps) {
  // ============================================================================
  // State
  // ============================================================================

  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState<any>(column[field] || '');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);

  // ============================================================================
  // Field Configuration
  // ============================================================================

  const getFieldType = (): CellFieldType => {
    if (field === 'data_type') return 'data_type';
    if (field === 'description' || field === 'transformation_logic') return 'textarea';
    return 'text';
  };

  const fieldType = getFieldType();

  const isReadOnly = () => {
    const readOnlyFields: (keyof Column)[] = [
      'id',
      'dataset_id',
      'fqn',
      'position',
      'ai_confidence_score',
      'ai_suggestions',
      'last_ai_enhancement',
      'created_at',
      'updated_at',
    ];
    return readOnlyFields.includes(field);
  };

  // ============================================================================
  // Validation
  // ============================================================================

  const validate = (val: any): boolean => {
    setError(null);

    if (field === 'name') {
      // Filter out current column name from existing names
      const otherNames = existingColumnNames.filter(
        (name) => name.toLowerCase() !== column.name.toLowerCase()
      );
      const validation = validateColumnName(val, otherNames);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid column name');
        return false;
      }
    }

    if (field === 'data_type') {
      const validation = validateDataType(val);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid data type');
        return false;
      }
    }

    return true;
  };

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleClick = () => {
    if (disabled || isReadOnly() || isEditing) return;
    setIsEditing(true);
    setValue(column[field] || '');
    setError(null);
  };

  const handleSave = async () => {
    // Validate
    if (!validate(value)) {
      return;
    }

    try {
      setIsSaving(true);
      await onSave(column.id, field, value);
      setIsEditing(false);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      console.error('Save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setValue(column[field] || '');
    setError(null);
    setIsEditing(false);
    onCancel?.();
  };

  const handleBlur = () => {
    // Auto-save on blur if value changed and valid
    if (value !== column[field]) {
      handleSave();
    } else {
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      // Enter saves (except in textarea where Shift+Enter is newline)
      if (fieldType !== 'textarea') {
        e.preventDefault();
        handleSave();
      }
    } else if (e.key === 'Escape') {
      // Escape cancels
      e.preventDefault();
      handleCancel();
    } else if (e.key === 'Tab') {
      // Tab saves and moves to next cell
      handleSave();
      // Let default tab behavior happen
    }
  };

  // ============================================================================
  // Effects
  // ============================================================================

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (fieldType === 'text') {
        (inputRef.current as HTMLInputElement).select();
      }
    }
  }, [isEditing, fieldType]);

  // Update value if column prop changes
  useEffect(() => {
    if (!isEditing) {
      setValue(column[field] || '');
    }
  }, [column, field, isEditing]);

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderDisplayValue = () => {
    const displayValue = column[field];

    if (displayValue === null || displayValue === undefined || displayValue === '') {
      return <span className="text-gray-400 italic">—</span>;
    }

    if (typeof displayValue === 'boolean') {
      return displayValue ? 'Yes' : 'No';
    }

    if (typeof displayValue === 'object') {
      return <span className="text-gray-400 italic">[Object]</span>;
    }

    return String(displayValue);
  };

  const renderEditor = () => {
    if (fieldType === 'data_type') {
      return (
        <div className="w-full" onClick={(e) => e.stopPropagation()}>
          <DataTypeSelector
            value={value}
            onChange={(val) => setValue(val)}
            error={error || undefined}
            disabled={isSaving}
            required={false}
          />
        </div>
      );
    }

    if (fieldType === 'textarea') {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={isSaving}
          rows={3}
          className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 resize-none ${
            error
              ? 'border-red-300 focus:ring-red-500'
              : 'border-blue-300 focus:ring-blue-500'
          } ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
        />
      );
    }

    // text input
    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={isSaving}
        className={`w-full px-2 py-1 border rounded focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-300 focus:ring-red-500'
            : 'border-blue-300 focus:ring-blue-500'
        } ${isSaving ? 'opacity-50 cursor-wait' : ''}`}
      />
    );
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (isReadOnly()) {
    return (
      <div className="px-3 py-2 text-sm text-gray-600">
        {renderDisplayValue()}
      </div>
    );
  }

  if (isEditing) {
    return (
      <div ref={cellRef} className="px-3 py-2">
        {renderEditor()}
        {error && (
          <p className="text-xs text-red-600 mt-1">{error}</p>
        )}
        {isSaving && (
          <p className="text-xs text-gray-500 mt-1">Saving...</p>
        )}
      </div>
    );
  }

  return (
    <div
      ref={cellRef}
      onClick={handleClick}
      className={`px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 transition-colors group ${
        disabled ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      title={disabled ? 'Cannot edit' : 'Click to edit'}
    >
      <div className="flex items-center justify-between">
        <span className="group-hover:text-blue-700">{renderDisplayValue()}</span>
        {!disabled && (
          <span className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
            ✎
          </span>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Specialized Editable Cells
// ============================================================================

/**
 * Editable cell for column name with validation
 */
export function EditableNameCell(props: Omit<EditableCellProps, 'field'>) {
  return <EditableCell {...props} field="name" />;
}

/**
 * Editable cell for data type with dropdown selector
 */
export function EditableDataTypeCell(props: Omit<EditableCellProps, 'field'>) {
  return <EditableCell {...props} field="data_type" />;
}

/**
 * Editable cell for business name
 */
export function EditableBusinessNameCell(props: Omit<EditableCellProps, 'field'>) {
  return <EditableCell {...props} field="business_name" />;
}

/**
 * Editable cell for description with textarea
 */
export function EditableDescriptionCell(props: Omit<EditableCellProps, 'field'>) {
  return <EditableCell {...props} field="description" />;
}
