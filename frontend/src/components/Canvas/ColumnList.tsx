/**
 * ColumnList Component
 * Displays columns when a dataset node is expanded
 * Based on specification: docs/prp/051-dataset-diagram-view-specification.md
 */

import { useState } from 'react';
import { Key, Link, Plus, Edit, Trash2 } from 'lucide-react';
import type { Column } from '../../types/diagram';

interface ColumnListProps {
  columns: Column[];
  datasetId: string;
  isReadOnly?: boolean;
  onAddColumn?: () => void;
  onEditColumn?: (columnId: string) => void;
  onDeleteColumn?: (columnId: string) => void;
  onSelectColumn?: (columnId: string, selected: boolean) => void;
  selectedColumns?: Set<string>;
}

export function ColumnList({
  columns,
  datasetId,
  isReadOnly = false,
  onAddColumn,
  onEditColumn,
  onDeleteColumn,
  onSelectColumn,
  selectedColumns = new Set(),
}: ColumnListProps) {
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);

  // Sort columns by position
  const sortedColumns = [...columns].sort((a, b) =>
    (a.position || 0) - (b.position || 0)
  );

  const handleColumnClick = (columnId: string) => {
    if (onSelectColumn && !isReadOnly) {
      onSelectColumn(columnId, !selectedColumns.has(columnId));
    }
  };

  const handleEditClick = (e: React.MouseEvent, columnId: string) => {
    e.stopPropagation();
    onEditColumn?.(columnId);
  };

  const handleDeleteClick = (e: React.MouseEvent, columnId: string) => {
    e.stopPropagation();
    onDeleteColumn?.(columnId);
  };

  return (
    <div className="column-list">
      {/* Column Header */}
      <div className="px-3 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            Columns ({columns.length})
          </span>
          {!isReadOnly && onAddColumn && (
            <button
              onClick={onAddColumn}
              className="btn-icon text-xs"
              title="Add Column"
            >
              <Plus className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Column List */}
      <div className="max-h-64 overflow-y-auto">
        {sortedColumns.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
            No columns defined
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {sortedColumns.map((column) => (
              <ColumnItem
                key={column.column_id}
                column={column}
                isSelected={selectedColumns.has(column.column_id)}
                isHovered={hoveredColumn === column.column_id}
                isReadOnly={isReadOnly}
                onMouseEnter={() => setHoveredColumn(column.column_id)}
                onMouseLeave={() => setHoveredColumn(null)}
                onClick={() => handleColumnClick(column.column_id)}
                onEdit={(e) => handleEditClick(e, column.column_id)}
                onDelete={(e) => handleDeleteClick(e, column.column_id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Column Button (Bottom) */}
      {!isReadOnly && onAddColumn && sortedColumns.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-3 py-2">
          <button
            onClick={onAddColumn}
            className="w-full btn-secondary text-xs flex items-center justify-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add Column
          </button>
        </div>
      )}
    </div>
  );
}

// =====================================================
// Column Item Component
// =====================================================

interface ColumnItemProps {
  column: Column;
  isSelected: boolean;
  isHovered: boolean;
  isReadOnly: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
  onEdit: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
}

function ColumnItem({
  column,
  isSelected,
  isHovered,
  isReadOnly,
  onMouseEnter,
  onMouseLeave,
  onClick,
  onEdit,
  onDelete,
}: ColumnItemProps) {
  // Determine icon based on column properties
  const getColumnIcon = () => {
    if (column.is_primary_key) {
      return <Key className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-500" />;
    }
    if (column.is_foreign_key) {
      return <Link className="w-3.5 h-3.5 text-blue-600 dark:text-blue-500" />;
    }
    return null;
  };

  // Format data type for display
  const formatDataType = (dataType: string) => {
    // Truncate long data types
    if (dataType.length > 15) {
      return dataType.substring(0, 12) + '...';
    }
    return dataType;
  };

  return (
    <div
      className={`
        column-item group px-3 py-2 cursor-pointer transition-colors
        ${isSelected
          ? 'bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
        }
      `}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      title={column.description || column.name}
    >
      <div className="flex items-center gap-2">
        {/* Icon */}
        <div className="flex-shrink-0 w-4 h-4 flex items-center justify-center">
          {getColumnIcon()}
        </div>

        {/* Column Name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`
              text-sm font-medium truncate
              ${isSelected
                ? 'text-blue-700 dark:text-blue-300'
                : 'text-gray-900 dark:text-gray-100'
              }
            `}>
              {column.name}
            </span>

            {/* AI Confidence Badge */}
            {column.ai_confidence_score !== undefined && column.ai_confidence_score < 80 && (
              <span className="text-xs px-1 py-0.5 rounded bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
                AI: {column.ai_confidence_score}%
              </span>
            )}
          </div>

          {/* Data Type */}
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
              {formatDataType(column.data_type)}
            </span>

            {/* Nullable Indicator */}
            {!column.is_nullable && (
              <span className="text-xs text-red-600 dark:text-red-400 font-semibold">
                NOT NULL
              </span>
            )}

            {/* Default Value Indicator */}
            {column.default_value && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                = {column.default_value}
              </span>
            )}
          </div>
        </div>

        {/* Actions (on hover) */}
        {!isReadOnly && isHovered && (
          <div className="flex-shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              className="btn-icon p-1"
              title="Edit Column"
            >
              <Edit className="w-3 h-3 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300" />
            </button>
            <button
              onClick={onDelete}
              className="btn-icon p-1"
              title="Delete Column"
            >
              <Trash2 className="w-3 h-3 text-red-500 hover:text-red-700 dark:hover:text-red-400" />
            </button>
          </div>
        )}
      </div>

      {/* Transformation Logic Indicator */}
      {column.transformation_logic && (
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 font-mono truncate pl-6">
          → {column.transformation_logic}
        </div>
      )}

      {/* Reference Indicator */}
      {column.reference_column_id && column.reference_type && (
        <div className="mt-1 text-xs flex items-center gap-1 pl-6">
          <Link className="w-3 h-3 text-gray-400" />
          <span className="text-gray-500 dark:text-gray-400">
            {column.reference_type} reference
            {column.reference_description && `: ${column.reference_description}`}
          </span>
        </div>
      )}
    </div>
  );
}
