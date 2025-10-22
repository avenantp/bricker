/**
 * Columns Tab - PRIMARY TAB for Dataset Editor
 * Displays columns in a sortable, searchable table with inline editing
 */

import { useState, useMemo } from 'react';
import { Plus, Sparkles, Search, Trash2, Download, CheckSquare, Square } from 'lucide-react';
import type { Column } from '@/types/column';

// ============================================================================
// Types
// ============================================================================

export interface ColumnsTabProps {
  datasetId: string;
  columns: Column[];
  isLoading?: boolean;
  onAddColumn: () => void;
  onEnhanceWithAI: (columnIds: string[]) => void;
  onDeleteColumns: (columnIds: string[]) => void;
  onUpdateColumn: (columnId: string, updates: Partial<Column>) => void;
}

type SortField = 'name' | 'data_type' | 'business_name';
type SortDirection = 'asc' | 'desc';

// ============================================================================
// Helper Components
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="h-12 bg-gray-100 rounded animate-pulse"></div>
      ))}
    </div>
  );
}

function EmptyState({ searchQuery, onAddColumn }: { searchQuery: string; onAddColumn: () => void }) {
  if (searchQuery) {
    return (
      <div className="text-center py-12">
        <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 font-medium">No columns found</p>
        <p className="text-sm text-gray-500 mt-1">
          Try adjusting your search query
        </p>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Plus className="w-8 h-8 text-blue-600" />
      </div>
      <p className="text-gray-600 font-medium mb-2">No columns yet</p>
      <p className="text-sm text-gray-500 mb-4">
        Add columns to define the structure of this dataset
      </p>
      <button
        onClick={onAddColumn}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Add First Column
      </button>
    </div>
  );
}

// ============================================================================
// Columns Tab Component
// ============================================================================

export function ColumnsTab({
  datasetId,
  columns,
  isLoading = false,
  onAddColumn,
  onEnhanceWithAI,
  onDeleteColumns,
  onUpdateColumn,
}: ColumnsTabProps) {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<SortField>('position' as any);
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // ============================================================================
  // Computed Values
  // ============================================================================

  // Filter columns by search query
  const filteredColumns = useMemo(() => {
    if (!searchQuery.trim()) return columns;

    const query = searchQuery.toLowerCase();
    return columns.filter((col) =>
      col.name.toLowerCase().includes(query) ||
      col.data_type.toLowerCase().includes(query) ||
      col.business_name?.toLowerCase().includes(query) ||
      col.description?.toLowerCase().includes(query)
    );
  }, [columns, searchQuery]);

  // Sort columns
  const sortedColumns = useMemo(() => {
    const sorted = [...filteredColumns];

    sorted.sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'data_type':
          aVal = a.data_type.toLowerCase();
          bVal = b.data_type.toLowerCase();
          break;
        case 'business_name':
          aVal = (a.business_name || '').toLowerCase();
          bVal = (b.business_name || '').toLowerCase();
          break;
        default:
          aVal = a.ordinal_position || 0;
          bVal = b.ordinal_position || 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredColumns, sortField, sortDirection]);

  // Selection state
  const allSelected = sortedColumns.length > 0 && selectedColumns.size === sortedColumns.length;
  const someSelected = selectedColumns.size > 0 && selectedColumns.size < sortedColumns.length;

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedColumns(new Set());
    } else {
      setSelectedColumns(new Set(sortedColumns.map(c => c.column_id)));
    }
  };

  const handleSelectColumn = (columnId: string) => {
    const newSelected = new Set(selectedColumns);
    if (newSelected.has(columnId)) {
      newSelected.delete(columnId);
    } else {
      newSelected.add(columnId);
    }
    setSelectedColumns(newSelected);
  };

  const handleBulkDelete = () => {
    if (selectedColumns.size === 0) return;
    onDeleteColumns(Array.from(selectedColumns));
    setSelectedColumns(new Set());
  };

  const handleBulkEnhance = () => {
    if (selectedColumns.size === 0) return;
    onEnhanceWithAI(Array.from(selectedColumns));
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between gap-4">
          {/* Left side - Primary actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onAddColumn}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Column
            </button>
            <button
              onClick={handleBulkEnhance}
              disabled={selectedColumns.size === 0}
              className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" />
              Enhance with AI
            </button>
          </div>

          {/* Right side - Search and bulk actions */}
          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search columns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm w-64"
              />
            </div>

            {/* Bulk actions dropdown (when items selected) */}
            {selectedColumns.size > 0 && (
              <div className="flex items-center gap-2 pl-2 border-l border-gray-300">
                <span className="text-sm text-gray-600">
                  {selectedColumns.size} selected
                </span>
                <button
                  onClick={handleBulkDelete}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete selected"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Column count */}
        <div className="mt-2 text-xs text-gray-500">
          {filteredColumns.length} {filteredColumns.length === 1 ? 'column' : 'columns'}
          {searchQuery && ` (filtered from ${columns.length})`}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading ? (
          <LoadingSkeleton />
        ) : sortedColumns.length === 0 ? (
          <EmptyState searchQuery={searchQuery} onAddColumn={onAddColumn} />
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {/* Select all checkbox */}
                  <th className="w-10 px-3 py-3">
                    <button
                      onClick={handleSelectAll}
                      className="flex items-center justify-center w-5 h-5 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                    >
                      {allSelected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600" />
                      ) : someSelected ? (
                        <div className="w-3 h-3 bg-blue-600 rounded-sm" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-400" />
                      )}
                    </button>
                  </th>

                  {/* Name */}
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-1 text-xs font-semibold text-gray-700 uppercase tracking-wider hover:text-gray-900"
                    >
                      Name
                      {sortField === 'name' && (
                        <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>

                  {/* Data Type */}
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('data_type')}
                      className="flex items-center gap-1 text-xs font-semibold text-gray-700 uppercase tracking-wider hover:text-gray-900"
                    >
                      Data Type
                      {sortField === 'data_type' && (
                        <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>

                  {/* Business Name */}
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => handleSort('business_name')}
                      className="flex items-center gap-1 text-xs font-semibold text-gray-700 uppercase tracking-wider hover:text-gray-900"
                    >
                      Business Name
                      {sortField === 'business_name' && (
                        <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  </th>

                  {/* Description */}
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Description
                  </th>

                  {/* Indicators */}
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    PK/FK
                  </th>

                  {/* AI Confidence */}
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    AI
                  </th>

                  {/* Actions */}
                  <th className="w-20 px-4 py-3"></th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {sortedColumns.map((column) => (
                  <tr
                    key={column.column_id}
                    className={`hover:bg-gray-50 transition-colors ${
                      selectedColumns.has(column.column_id) ? 'bg-blue-50' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-3">
                      <button
                        onClick={() => handleSelectColumn(column.column_id)}
                        className="flex items-center justify-center w-5 h-5 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
                      >
                        {selectedColumns.has(column.column_id) ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4 text-gray-400" />
                        )}
                      </button>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900 font-mono">
                        {column.name}
                      </span>
                    </td>

                    {/* Data Type */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700 font-mono">
                        {column.data_type}
                      </span>
                    </td>

                    {/* Business Name */}
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">
                        {column.business_name || (
                          <span className="text-gray-400 italic">Not set</span>
                        )}
                      </span>
                    </td>

                    {/* Description */}
                    <td className="px-4 py-3 max-w-xs">
                      <span className="text-sm text-gray-600 line-clamp-2">
                        {column.description || (
                          <span className="text-gray-400 italic">No description</span>
                        )}
                      </span>
                    </td>

                    {/* PK/FK Indicators */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {column.is_primary_key && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
                            PK
                          </span>
                        )}
                        {column.is_foreign_key && (
                          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded">
                            FK
                          </span>
                        )}
                        {!column.is_nullable && (
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-700 text-xs font-semibold rounded">
                            NN
                          </span>
                        )}
                      </div>
                    </td>

                    {/* AI Confidence */}
                    <td className="px-4 py-3 text-center">
                      {column.ai_confidence_score !== undefined && column.ai_confidence_score !== null ? (
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                          column.ai_confidence_score >= 90
                            ? 'bg-green-100 text-green-700'
                            : column.ai_confidence_score >= 70
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {column.ai_confidence_score}%
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            // TODO: Open edit dialog
                            console.log('Edit column:', column.column_id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit column"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => onDeleteColumns([column.column_id])}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete column"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
