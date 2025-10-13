/**
 * Dataset Context Menu Component
 * Right-click menu for dataset operations
 * Renamed from NodeContextMenu for refactored architecture
 */

import { useEffect, useRef } from 'react';
import {
  Edit,
  Trash2,
  Copy,
  GitBranch,
  GitCommit,
  Download,
  Bot,
  Eye,
  Link as LinkIcon,
} from 'lucide-react';

interface DatasetContextMenuProps {
  x: number;
  y: number;
  datasetId: string;
  datasetName: string;
  hasUncommittedChanges?: boolean;
  onClose: () => void;
  onEdit: (datasetId: string) => void;
  onDelete: (datasetId: string) => void;
  onClone: (datasetId: string) => void;
  onAddReference: (datasetId: string) => void;
  onViewLineage: (datasetId: string) => void;
  onCommit: (datasetId: string) => void;
  onExport: (datasetId: string) => void;
  onSendToAI: (datasetId: string) => void;
}

export function DatasetContextMenu({
  x,
  y,
  datasetId,
  datasetName,
  hasUncommittedChanges = false,
  onClose,
  onEdit,
  onDelete,
  onClone,
  onAddReference,
  onViewLineage,
  onCommit,
  onExport,
  onSendToAI,
}: DatasetContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Adjust position if menu would go off screen
  useEffect(() => {
    if (menuRef.current) {
      const menu = menuRef.current;
      const rect = menu.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Adjust horizontal position
      if (rect.right > viewportWidth) {
        menu.style.left = `${x - rect.width}px`;
      }

      // Adjust vertical position
      if (rect.bottom > viewportHeight) {
        menu.style.top = `${y - rect.height}px`;
      }
    }
  }, [x, y]);

  const menuItems = [
    {
      label: 'Edit Properties',
      icon: Edit,
      onClick: () => {
        onEdit(datasetId);
        onClose();
      },
      color: 'text-gray-700',
    },
    {
      label: 'Add Column Reference',
      icon: LinkIcon,
      onClick: () => {
        onAddReference(datasetId);
        onClose();
      },
      color: 'text-gray-700',
    },
    {
      label: 'Clone Dataset',
      icon: Copy,
      onClick: () => {
        onClone(datasetId);
        onClose();
      },
      color: 'text-gray-700',
    },
    {
      label: 'View Lineage',
      icon: GitBranch,
      onClick: () => {
        onViewLineage(datasetId);
        onClose();
      },
      color: 'text-gray-700',
    },
    {
      label: hasUncommittedChanges ? 'Commit Changes' : 'Commit to Git',
      icon: GitCommit,
      onClick: () => {
        onCommit(datasetId);
        onClose();
      },
      color: hasUncommittedChanges ? 'text-orange-600' : 'text-gray-700',
      highlighted: hasUncommittedChanges,
    },
    {
      label: 'Export YAML',
      icon: Download,
      onClick: () => {
        onExport(datasetId);
        onClose();
      },
      color: 'text-gray-700',
    },
    {
      label: 'Send to AI',
      icon: Bot,
      onClick: () => {
        onSendToAI(datasetId);
        onClose();
      },
      color: 'text-purple-600',
    },
    {
      label: 'Delete Dataset',
      icon: Trash2,
      onClick: () => {
        onDelete(datasetId);
        onClose();
      },
      color: 'text-red-600',
      separator: true,
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Menu */}
      <div
        ref={menuRef}
        className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[220px]"
        style={{ left: x, top: y }}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-gray-900 truncate">
                {datasetName}
              </div>
              <div className="text-xs text-gray-500 font-mono truncate">
                {datasetId.substring(0, 8)}...
              </div>
            </div>
            {hasUncommittedChanges && (
              <div className="ml-2">
                <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  Modified
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Menu Items */}
        {menuItems.map((item, index) => (
          <div key={index}>
            {item.separator && <div className="border-t border-gray-100 my-1" />}
            <button
              onClick={item.onClick}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${
                item.color
              } ${item.highlighted ? 'bg-yellow-50' : ''}`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
