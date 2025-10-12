/**
 * Node Context Menu Component
 * Right-click menu for node operations
 */

import { useEffect, useRef } from 'react';
import {
  Edit,
  Trash2,
  Copy,
  GitBranch,
  Link as LinkIcon,
  Bot,
  Eye,
} from 'lucide-react';

interface NodeContextMenuProps {
  x: number;
  y: number;
  nodeUuid: string;
  nodeName: string;
  onClose: () => void;
  onEdit: (nodeUuid: string) => void;
  onDelete: (nodeUuid: string) => void;
  onClone: (nodeUuid: string) => void;
  onAddRelationship: (nodeUuid: string) => void;
  onViewLineage: (nodeUuid: string) => void;
  onSendToAI: (nodeUuid: string) => void;
}

export function NodeContextMenu({
  x,
  y,
  nodeUuid,
  nodeName,
  onClose,
  onEdit,
  onDelete,
  onClone,
  onAddRelationship,
  onViewLineage,
  onSendToAI,
}: NodeContextMenuProps) {
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
        onEdit(nodeUuid);
        onClose();
      },
      color: 'text-gray-700',
    },
    {
      label: 'Add Relationship',
      icon: LinkIcon,
      onClick: () => {
        onAddRelationship(nodeUuid);
        onClose();
      },
      color: 'text-gray-700',
    },
    {
      label: 'Clone Node',
      icon: Copy,
      onClick: () => {
        onClone(nodeUuid);
        onClose();
      },
      color: 'text-gray-700',
    },
    {
      label: 'View Lineage',
      icon: GitBranch,
      onClick: () => {
        onViewLineage(nodeUuid);
        onClose();
      },
      color: 'text-gray-700',
    },
    {
      label: 'Send to AI',
      icon: Bot,
      onClick: () => {
        onSendToAI(nodeUuid);
        onClose();
      },
      color: 'text-purple-600',
    },
    {
      label: 'Delete Node',
      icon: Trash2,
      onClick: () => {
        onDelete(nodeUuid);
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
        className="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[200px]"
        style={{ left: x, top: y }}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-gray-100">
          <div className="text-xs font-semibold text-gray-900 truncate">
            {nodeName}
          </div>
          <div className="text-xs text-gray-500 font-mono truncate">
            {nodeUuid.substring(0, 8)}...
          </div>
        </div>

        {/* Menu Items */}
        {menuItems.map((item, index) => (
          <div key={index}>
            {item.separator && <div className="border-t border-gray-100 my-1" />}
            <button
              onClick={item.onClick}
              className={`w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-gray-50 transition-colors ${item.color}`}
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
