/**
 * Data Type Selector Component
 * Dropdown selector for column data types with search, categories, and custom input
 * Reusable across Create/Edit Column dialogs
 */

import { useState, useMemo } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import { getDataTypesByCategory, validateDataType } from '@/utils/validation';

// ============================================================================
// Types
// ============================================================================

export interface DataTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DATA_TYPE_CATEGORIES = getDataTypesByCategory();

// ============================================================================
// Data Type Selector Component
// ============================================================================

export function DataTypeSelector({
  value,
  onChange,
  error,
  required = true,
  disabled = false,
  placeholder = 'Select data type...',
}: DataTypeSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customValue, setCustomValue] = useState('');

  // Check if current value is a custom type
  const isCustomType = useMemo(() => {
    if (!value) return false;

    // Check if value exists in any category
    const allTypes = Object.values(DATA_TYPE_CATEGORIES).flat();
    const baseType = value.split('(')[0].trim().toUpperCase();
    return !allTypes.includes(baseType);
  }, [value]);

  // Filter types by search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return DATA_TYPE_CATEGORIES;

    const query = searchQuery.toLowerCase();
    const filtered: Record<string, string[]> = {};

    Object.entries(DATA_TYPE_CATEGORIES).forEach(([category, types]) => {
      const matchingTypes = types.filter(type =>
        type.toLowerCase().includes(query)
      );
      if (matchingTypes.length > 0) {
        filtered[category] = matchingTypes;
      }
    });

    return filtered;
  }, [searchQuery]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleSelect = (type: string) => {
    onChange(type);
    setIsOpen(false);
    setSearchQuery('');
    setShowCustomInput(false);
  };

  const handleCustomInputToggle = () => {
    setShowCustomInput(!showCustomInput);
    setCustomValue(value || '');
    setIsOpen(false);
  };

  const handleCustomValueChange = (val: string) => {
    setCustomValue(val);

    // Validate and update on change
    const validation = validateDataType(val);
    if (validation.isValid || val === '') {
      onChange(val);
    }
  };

  const handleCustomValueSubmit = () => {
    if (customValue.trim()) {
      onChange(customValue.trim());
      setShowCustomInput(false);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  if (showCustomInput) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Data Type {required && <span className="text-red-500">*</span>}
        </label>
        <div className="space-y-2">
          <input
            type="text"
            value={customValue}
            onChange={(e) => handleCustomValueChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCustomValueSubmit();
              } else if (e.key === 'Escape') {
                setShowCustomInput(false);
              }
            }}
            placeholder="e.g., VARCHAR(255), DECIMAL(10,2)"
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              error
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            disabled={disabled}
            autoFocus
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCustomValueSubmit}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={handleCustomInputToggle}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
            >
              Select from list
            </button>
          </div>
          <p className="text-xs text-gray-500">
            Enter a custom data type with optional parameters (e.g., VARCHAR(255))
          </p>
        </div>
        {error && (
          <p className="mt-1 text-sm text-red-600">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Data Type {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative">
        {/* Selected value display */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled}
          className={`w-full px-3 py-2 pr-10 border rounded-lg text-left focus:outline-none focus:ring-2 ${
            error
              ? 'border-red-300 focus:ring-red-500'
              : 'border-gray-300 focus:ring-blue-500'
          } ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
        >
          <span className={`font-mono ${value ? 'text-gray-900' : 'text-gray-400'}`}>
            {value || placeholder}
          </span>
          <ChevronDown className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Menu */}
            <div className="absolute z-20 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-hidden flex flex-col">
              {/* Search input */}
              <div className="p-2 border-b border-gray-200">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search data types..."
                    className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    autoFocus
                  />
                </div>
              </div>

              {/* Type list */}
              <div className="flex-1 overflow-y-auto">
                {Object.keys(filteredCategories).length === 0 ? (
                  <div className="p-4 text-center text-sm text-gray-500">
                    No data types found
                  </div>
                ) : (
                  Object.entries(filteredCategories).map(([category, types]) => (
                    <div key={category} className="py-1">
                      <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50">
                        {category}
                      </div>
                      {types.map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleSelect(type)}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 transition-colors font-mono ${
                            value === type ? 'bg-blue-100 text-blue-700' : 'text-gray-700'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  ))
                )}
              </div>

              {/* Custom option */}
              <div className="border-t border-gray-200 p-2">
                <button
                  type="button"
                  onClick={handleCustomInputToggle}
                  className="w-full px-3 py-2 text-left text-sm text-blue-600 hover:bg-blue-50 rounded transition-colors font-medium"
                >
                  Enter custom type...
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Helper text or error */}
      {error ? (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      ) : isCustomType ? (
        <div className="mt-1 flex items-center gap-2">
          <span className="text-xs text-blue-600">Custom type</span>
          <button
            type="button"
            onClick={handleCustomInputToggle}
            className="text-xs text-blue-600 hover:underline"
          >
            Edit
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleCustomInputToggle}
          className="mt-1 text-xs text-gray-500 hover:text-blue-600 hover:underline"
        >
          Need a custom type?
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Simple Dropdown Variant (for forms where search is not needed)
// ============================================================================

export function SimpleDataTypeSelector({
  value,
  onChange,
  error,
  required = true,
  disabled = false,
}: Omit<DataTypeSelectorProps, 'placeholder'>) {
  const allTypes = useMemo(() => {
    return Object.values(DATA_TYPE_CATEGORIES).flat();
  }, []);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        Data Type {required && <span className="text-red-500">*</span>}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`w-full px-3 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 ${
          error
            ? 'border-red-300 focus:ring-red-500'
            : 'border-gray-300 focus:ring-blue-500'
        } ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
      >
        <option value="">Select type...</option>
        {Object.entries(DATA_TYPE_CATEGORIES).map(([category, types]) => (
          <optgroup key={category} label={category}>
            {types.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
