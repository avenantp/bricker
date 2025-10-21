/**
 * Canvas Context Menu Component
 * Shows context menu when right-clicking on empty canvas area
 * Based on specification: docs/prp/051-dataset-diagram-view-specification.md (Section 8.3)
 */

import { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Upload,
  Layout,
  Maximize2,
  Download,
  ChevronRight,
} from 'lucide-react';
import { useDiagramStore } from '../../store/diagramStore';
import type { LayoutType } from '../../types/diagram';

interface CanvasContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAddDataset?: (position: { x: number; y: number }) => void;
  onImportMetadata?: () => void;
  onExportDiagram?: (format: 'png' | 'svg' | 'json') => void;
}

export function CanvasContextMenu({
  x,
  y,
  onClose,
  onAddDataset,
  onImportMetadata,
  onExportDiagram,
}: CanvasContextMenuProps) {
  const { applyLayout, resetViewport } = useDiagramStore();
  const [showLayoutSubmenu, setShowLayoutSubmenu] = useState(false);
  const [showExportSubmenu, setShowExportSubmenu] = useState(false);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.canvas-context-menu')) {
        onClose();
      }
    };

    // Small delay to prevent immediate close on same click that opened menu
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => document.removeEventListener('click', handleClickOutside);
  }, [onClose]);

  const handleAddDataset = useCallback(() => {
    onAddDataset?.({ x, y });
    onClose();
  }, [x, y, onAddDataset, onClose]);

  const handleImport = useCallback(() => {
    onImportMetadata?.();
    onClose();
  }, [onImportMetadata, onClose]);

  const handleLayout = useCallback(async (layoutType: LayoutType) => {
    try {
      await applyLayout(layoutType);
      onClose();
    } catch (error) {
      console.error('[CanvasContextMenu] Failed to apply layout:', error);
    }
  }, [applyLayout, onClose]);

  const handleFitView = useCallback(() => {
    resetViewport();
    onClose();
  }, [resetViewport, onClose]);

  const handleExport = useCallback((format: 'png' | 'svg' | 'json') => {
    onExportDiagram?.(format);
    onClose();
  }, [onExportDiagram, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Context Menu */}
      <div
        className="canvas-context-menu fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-[200px]"
        style={{
          left: `${x}px`,
          top: `${y}px`,
        }}
      >
        {/* Add Dataset */}
        <button
          onClick={handleAddDataset}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Dataset</span>
        </button>

        {/* Import Metadata */}
        <button
          onClick={handleImport}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Upload className="w-4 h-4" />
          <span>Import Metadata</span>
        </button>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

        {/* Auto-Layout (with submenu) */}
        <div
          className="relative"
          onMouseEnter={() => setShowLayoutSubmenu(true)}
          onMouseLeave={() => setShowLayoutSubmenu(false)}
        >
          <button
            className="w-full flex items-center justify-between gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Layout className="w-4 h-4" />
              <span>Auto-Layout</span>
            </div>
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Submenu */}
          {showLayoutSubmenu && (
            <div
              className="absolute left-full top-0 ml-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-[160px]"
            >
              <button
                onClick={() => handleLayout('hierarchical')}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span>📊</span>
                <span>Hierarchical</span>
              </button>
              <button
                onClick={() => handleLayout('force')}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span>🌐</span>
                <span>Force-Directed</span>
              </button>
              <button
                onClick={() => handleLayout('circular')}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span>⭕</span>
                <span>Circular</span>
              </button>
              <button
                onClick={() => handleLayout('dagre')}
                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <span>🔀</span>
                <span>Dagre</span>
              </button>
            </div>
          )}
        </div>

        {/* Fit View */}
        <button
          onClick={handleFitView}
          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Maximize2 className="w-4 h-4" />
          <span>Fit View</span>
        </button>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

        {/* Export Diagram (with submenu) */}
        <div
          className="relative"
          onMouseEnter={() => setShowExportSubmenu(true)}
          onMouseLeave={() => setShowExportSubmenu(false)}
        >
          <button
            className="w-full flex items-center justify-between gap-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Download className="w-4 h-4" />
              <span>Export Diagram</span>
            </div>
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Submenu */}
          {showExportSubmenu && (
            <div
              className="absolute left-full top-0 ml-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-[160px]"
            >
              <button
                onClick={() => handleExport('png')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Export as PNG
              </button>
              <button
                onClick={() => handleExport('svg')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Export as SVG
              </button>
              <button
                onClick={() => handleExport('json')}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Export as JSON
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
