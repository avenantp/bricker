/**
 * NodeItems Table Component
 * Comprehensive table for managing NodeItems (columns) within a Node
 * Phase 2.5 - NodeItem Management
 */

import { useState, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Search,
  Key,
  Link2,
  Check,
  X,
  Edit3,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import type { NodeItem, UpdateNodeItemPayload } from '../../types/node';

interface NodeItemsTableProps {
  nodeItems: NodeItem[];
  nodeUuid: string;
  onAddNodeItem: () => void;
  onUpdateNodeItem: (uuid: string, updates: UpdateNodeItemPayload) => void;
  onDeleteNodeItem: (uuid: string) => void;
  onDeleteMultiple: (uuids: string[]) => void;
  isReadOnly?: boolean;
}

// Common data types for dropdown
const COMMON_DATA_TYPES = [
  // Numeric types
  'INT',
  'BIGINT',
  'SMALLINT',
  'TINYINT',
  'DECIMAL',
  'NUMERIC',
  'FLOAT',
  'DOUBLE',
  'REAL',

  // String types
  'VARCHAR',
  'CHAR',
  'TEXT',
  'STRING',
  'NVARCHAR',
  'NCHAR',

  // Date/Time types
  'DATE',
  'DATETIME',
  'TIMESTAMP',
  'TIME',
  'TIMESTAMP_NTZ',

  // Boolean
  'BOOLEAN',
  'BIT',

  // Binary
  'BINARY',
  'VARBINARY',

  // JSON
  'JSON',
  'JSONB',

  // Other
  'ARRAY',
  'MAP',
  'STRUCT',
  'UUID',
];

type SortField = 'name' | 'data_type' | 'is_primary_key' | 'is_foreign_key';
type SortDirection = 'asc' | 'desc';

export function NodeItemsTable({
  nodeItems,
  nodeUuid,
  onAddNodeItem,
  onUpdateNodeItem,
  onDeleteNodeItem,
  onDeleteMultiple,
  isReadOnly = false,
}: NodeItemsTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<{
    uuid: string;
    field: keyof NodeItem;
  } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Filter and sort node items
  const filteredAndSortedItems = useMemo(() => {
    let items = [...nodeItems];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.data_type.toLowerCase().includes(query) ||
          (item.description?.toLowerCase().includes(query) ?? false) ||
          (item.business_name?.toLowerCase().includes(query) ?? false)
      );
    }

    // Sort
    items.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];

      // Handle boolean fields
      if (typeof aVal === 'boolean') {
        aVal = aVal ? 1 : 0;
        bVal = bVal ? 1 : 0;
      }

      // Handle string fields
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return items;
  }, [nodeItems, searchQuery, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (selectedItems.size === filteredAndSortedItems.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(filteredAndSortedItems.map((item) => item.uuid)));
    }
  };

  const handleSelectItem = (uuid: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(uuid)) {
      newSelected.delete(uuid);
    } else {
      newSelected.add(uuid);
    }
    setSelectedItems(newSelected);
  };

  const handleDeleteSelected = () => {
    if (selectedItems.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedItems.size} NodeItem(s)?`
    );

    if (confirmed) {
      onDeleteMultiple(Array.from(selectedItems));
      setSelectedItems(new Set());
    }
  };

  const handleStartEdit = (uuid: string, field: keyof NodeItem, currentValue: any) => {
    if (isReadOnly) return;

    setEditingCell({ uuid, field });
    setEditValue(String(currentValue ?? ''));
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const handleSaveEdit = () => {
    if (!editingCell) return;

    const { uuid, field } = editingCell;

    // Prepare update payload
    const updates: UpdateNodeItemPayload = {};

    switch (field) {
      case 'name':
        updates.name = editValue.trim();
        break;
      case 'data_type':
        updates.data_type = editValue.trim().toUpperCase();
        break;
      case 'description':
        updates.description = editValue.trim();
        break;
      case 'business_name':
        updates.business_name = editValue.trim();
        break;
      case 'default_value':
        updates.default_value = editValue.trim();
        break;
      case 'transformation_logic':
        updates.transformation_logic = editValue.trim();
        break;
    }

    onUpdateNodeItem(uuid, updates);
    setEditingCell(null);
    setEditValue('');
  };

  const handleToggleBoolean = (uuid: string, field: 'is_primary_key' | 'is_foreign_key' | 'is_nullable') => {
    if (isReadOnly) return;

    const item = nodeItems.find((i) => i.uuid === uuid);
    if (!item) return;

    const updates: UpdateNodeItemPayload = {
      [field]: !item[field],
    };

    onUpdateNodeItem(uuid, updates);
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-3 h-3" />
    ) : (
      <ChevronDown className="w-3 h-3" />
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-3">
        {/* Search */}
        <div className="flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search NodeItems..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {selectedItems.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              disabled={isReadOnly}
              className="px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete ({selectedItems.size})
            </button>
          )}

          <button
            onClick={onAddNodeItem}
            disabled={isReadOnly}
            className="px-4 py-2 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add NodeItem
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr>
              <th className="w-10 px-3 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedItems.size === filteredAndSortedItems.length && filteredAndSortedItems.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  disabled={isReadOnly}
                />
              </th>
              <th
                className="px-3 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Name
                  <SortIcon field="name" />
                </div>
              </th>
              <th
                className="px-3 py-3 text-left font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('data_type')}
              >
                <div className="flex items-center gap-1">
                  Data Type
                  <SortIcon field="data_type" />
                </div>
              </th>
              <th className="px-3 py-3 text-left font-medium text-gray-700">
                Description
              </th>
              <th className="px-3 py-3 text-center font-medium text-gray-700">
                Nullable
              </th>
              <th
                className="px-3 py-3 text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('is_primary_key')}
              >
                <div className="flex items-center justify-center gap-1">
                  <Key className="w-3 h-3" />
                  PK
                  <SortIcon field="is_primary_key" />
                </div>
              </th>
              <th
                className="px-3 py-3 text-center font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleSort('is_foreign_key')}
              >
                <div className="flex items-center justify-center gap-1">
                  <Link2 className="w-3 h-3" />
                  FK
                  <SortIcon field="is_foreign_key" />
                </div>
              </th>
              <th className="w-20 px-3 py-3 text-center font-medium text-gray-700">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredAndSortedItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-3 py-12 text-center text-gray-500">
                  {searchQuery ? (
                    <>No NodeItems match your search</>
                  ) : (
                    <>No NodeItems yet. Click "Add NodeItem" to get started.</>
                  )}
                </td>
              </tr>
            ) : (
              filteredAndSortedItems.map((item) => (
                <tr
                  key={item.uuid}
                  className={`hover:bg-gray-50 transition-colors ${
                    selectedItems.has(item.uuid) ? 'bg-blue-50' : ''
                  }`}
                >
                  {/* Checkbox */}
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selectedItems.has(item.uuid)}
                      onChange={() => handleSelectItem(item.uuid)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled={isReadOnly}
                    />
                  </td>

                  {/* Name */}
                  <td
                    className="px-3 py-2 font-medium text-gray-900 cursor-pointer hover:bg-blue-50"
                    onClick={() => handleStartEdit(item.uuid, 'name', item.name)}
                  >
                    {editingCell?.uuid === item.uuid && editingCell?.field === 'name' ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {item.name}
                        {!isReadOnly && <Edit3 className="w-3 h-3 text-gray-400" />}
                      </div>
                    )}
                  </td>

                  {/* Data Type */}
                  <td
                    className="px-3 py-2 text-gray-700 cursor-pointer hover:bg-blue-50"
                    onClick={() => handleStartEdit(item.uuid, 'data_type', item.data_type)}
                  >
                    {editingCell?.uuid === item.uuid && editingCell?.field === 'data_type' ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                          autoFocus
                        >
                          {COMMON_DATA_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                          {!COMMON_DATA_TYPES.includes(editValue) && (
                            <option value={editValue}>{editValue}</option>
                          )}
                        </select>
                        <button
                          onClick={handleSaveEdit}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">
                          {item.data_type}
                        </span>
                        {!isReadOnly && <Edit3 className="w-3 h-3 text-gray-400" />}
                      </div>
                    )}
                  </td>

                  {/* Description */}
                  <td
                    className="px-3 py-2 text-gray-600 max-w-xs truncate cursor-pointer hover:bg-blue-50"
                    onClick={() => handleStartEdit(item.uuid, 'description', item.description)}
                    title={item.description}
                  >
                    {editingCell?.uuid === item.uuid && editingCell?.field === 'description' ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit();
                            if (e.key === 'Escape') handleCancelEdit();
                          }}
                          className="px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 w-full"
                          autoFocus
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="p-1 text-green-600 hover:bg-green-50 rounded"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {item.description || <span className="italic text-gray-400">No description</span>}
                        {!isReadOnly && <Edit3 className="w-3 h-3 text-gray-400" />}
                      </div>
                    )}
                  </td>

                  {/* Nullable */}
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={item.is_nullable}
                      onChange={() => handleToggleBoolean(item.uuid, 'is_nullable')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      disabled={isReadOnly}
                    />
                  </td>

                  {/* Primary Key */}
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={item.is_primary_key}
                      onChange={() => handleToggleBoolean(item.uuid, 'is_primary_key')}
                      className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                      disabled={isReadOnly}
                    />
                  </td>

                  {/* Foreign Key */}
                  <td className="px-3 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={item.is_foreign_key}
                      onChange={() => handleToggleBoolean(item.uuid, 'is_foreign_key')}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                      disabled={isReadOnly}
                    />
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => {
                        if (window.confirm(`Delete NodeItem "${item.name}"?`)) {
                          onDeleteNodeItem(item.uuid);
                        }
                      }}
                      disabled={isReadOnly}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Delete NodeItem"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="mt-3 text-xs text-gray-600 flex items-center justify-between">
        <div>
          Showing {filteredAndSortedItems.length} of {nodeItems.length} NodeItem(s)
        </div>
        {selectedItems.size > 0 && (
          <div className="text-blue-600 font-medium">
            {selectedItems.size} item(s) selected
          </div>
        )}
      </div>
    </div>
  );
}
