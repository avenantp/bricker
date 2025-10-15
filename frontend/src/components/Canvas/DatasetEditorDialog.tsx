/**
 * Dataset Editor Dialog
 * Modal dialog for editing dataset and column metadata
 * Features: Tabbed interface, unsaved changes detection, keyboard shortcuts
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { ColumnsTab } from './ColumnsTab';
import { AIEnhancementDialog } from './AIEnhancementDialog';
import type { Column, Dataset } from '@/types';
import type { ColumnEnhancement } from '@/lib/services/ai-enhancement-service';

// ============================================================================
// Types
// ============================================================================

export interface DatasetEditorDialogProps {
  datasetId: string;
  initialTab?: TabId;
  onClose: () => void;
  onSave?: () => void;
}

export type TabId = 'properties' | 'columns' | 'references' | 'lineage' | 'ai-insights' | 'history';

interface Tab {
  id: TabId;
  label: string;
  icon?: React.ReactNode;
}

interface UnsavedChangesDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

// ============================================================================
// Unsaved Changes Confirmation Dialog
// ============================================================================

function UnsavedChangesDialog({ onConfirm, onCancel }: UnsavedChangesDialogProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          <div className="p-2 bg-yellow-100 rounded-lg">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Unsaved Changes</h3>
            <p className="text-sm text-gray-600 mt-1">
              You have unsaved changes. Are you sure you want to close without saving?
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Discard Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Dataset Editor Dialog Component
// ============================================================================

export function DatasetEditorDialog({
  datasetId,
  initialTab = 'columns', // Default to Columns tab (PRIMARY TAB)
  onClose,
  onSave,
}: DatasetEditorDialogProps) {
  // State
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Enhancement Dialog State
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [selectedColumnIds, setSelectedColumnIds] = useState<string[]>([]);

  // Mock data (TODO: Replace with actual data from API)
  const [dataset] = useState<Dataset>({
    id: datasetId,
    name: 'Sample Dataset',
    description: 'Sample dataset for testing',
    medallion_layer: 'bronze',
    entity_type: 'table',
  } as Dataset);

  const [columns, setColumns] = useState<Column[]>([]);

  // Refs
  const dialogRef = useRef<HTMLDivElement>(null);
  const hasAttemptedClose = useRef(false);

  // Tab configuration
  const tabs: Tab[] = [
    { id: 'properties', label: 'Properties' },
    { id: 'columns', label: 'Columns' }, // PRIMARY TAB
    { id: 'references', label: 'References' },
    { id: 'lineage', label: 'Lineage' },
    { id: 'ai-insights', label: 'AI Insights' },
    { id: 'history', label: 'History' },
  ];

  // ============================================================================
  // Keyboard Shortcuts
  // ============================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S - Save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }

      // Escape - Close
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }

      // Cmd/Ctrl + Number - Switch tabs
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        const tabIndex = parseInt(e.key) - 1;
        if (tabs[tabIndex]) {
          setActiveTab(tabs[tabIndex].id);
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasUnsavedChanges]);

  // ============================================================================
  // Focus Management
  // ============================================================================

  useEffect(() => {
    // Focus dialog on mount
    dialogRef.current?.focus();

    // Store previous focus to restore on close
    const previousFocus = document.activeElement as HTMLElement;

    return () => {
      // Restore focus on unmount
      previousFocus?.focus();
    };
  }, []);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);
      hasAttemptedClose.current = true;
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  const handleConfirmClose = useCallback(() => {
    setShowUnsavedDialog(false);
    setHasUnsavedChanges(false);
    onClose();
  }, [onClose]);

  const handleCancelClose = useCallback(() => {
    setShowUnsavedDialog(false);
    hasAttemptedClose.current = false;
  }, []);

  const handleSave = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // TODO: Implement save logic
      // This will be handled by individual tab components
      // For now, just simulate a save
      await new Promise((resolve) => setTimeout(resolve, 500));

      setHasUnsavedChanges(false);
      onSave?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
      console.error('Save error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [onSave]);

  const handleTabChange = useCallback(
    (tabId: TabId) => {
      if (hasUnsavedChanges) {
        // Could show a confirmation dialog here, but for now just allow tab switching
        // The unsaved changes are preserved until the dialog is closed
      }
      setActiveTab(tabId);
    },
    [hasUnsavedChanges]
  );

  // ============================================================================
  // Column Handlers
  // ============================================================================

  const handleAddColumn = useCallback(() => {
    // TODO: Open CreateColumnDialog
    console.log('Add column clicked');
  }, []);

  const handleEnhanceWithAI = useCallback((columnIds: string[]) => {
    setSelectedColumnIds(columnIds);
    setShowAIDialog(true);
  }, []);

  const handleDeleteColumns = useCallback((columnIds: string[]) => {
    // TODO: Open DeleteColumnDialog
    console.log('Delete columns:', columnIds);
  }, []);

  const handleUpdateColumn = useCallback((columnId: string, updates: Partial<Column>) => {
    setColumns((prev) =>
      prev.map((col) => (col.id === columnId ? { ...col, ...updates } : col))
    );
    setHasUnsavedChanges(true);
  }, []);

  const handleApplyEnhancements = useCallback(async (enhancements: ColumnEnhancement[]) => {
    // Apply AI enhancements to columns
    setColumns((prev) =>
      prev.map((col) => {
        const enhancement = enhancements.find((e) => e.columnId === col.id);
        if (!enhancement) return col;

        const updates: Partial<Column> = {};

        if (enhancement.businessName) {
          updates.business_name = enhancement.businessName.suggestedName;
          updates.ai_confidence_score = enhancement.businessName.confidence;
        }

        if (enhancement.description) {
          updates.description = enhancement.description.suggestedDescription;
          updates.ai_confidence_score = Math.max(
            updates.ai_confidence_score || 0,
            enhancement.description.confidence
          );
        }

        updates.last_ai_enhancement = new Date().toISOString();

        return { ...col, ...updates };
      })
    );

    setHasUnsavedChanges(true);
    setShowAIDialog(false);
  }, []);

  // ============================================================================
  // Render Tab Content
  // ============================================================================

  const renderTabContent = () => {
    switch (activeTab) {
      case 'properties':
        return (
          <div className="p-6">
            <p className="text-gray-600">Properties tab content will be implemented in Task 4.2.2</p>
            {/* TODO: Implement DatasetPropertiesTab component */}
          </div>
        );

      case 'columns':
        return (
          <div className="h-full">
            <ColumnsTab
              datasetId={datasetId}
              columns={columns}
              isLoading={isLoading}
              onAddColumn={handleAddColumn}
              onEnhanceWithAI={handleEnhanceWithAI}
              onDeleteColumns={handleDeleteColumns}
              onUpdateColumn={handleUpdateColumn}
            />
          </div>
        );

      case 'references':
        return (
          <div className="p-6">
            <p className="text-gray-600">References tab - Coming soon</p>
          </div>
        );

      case 'lineage':
        return (
          <div className="p-6">
            <p className="text-gray-600">Lineage tab - Coming soon</p>
          </div>
        );

      case 'ai-insights':
        return (
          <div className="p-6">
            <p className="text-gray-600">AI Insights tab - Coming soon</p>
          </div>
        );

      case 'history':
        return (
          <div className="p-6">
            <p className="text-gray-600">History tab - Coming soon</p>
          </div>
        );

      default:
        return null;
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-50"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="dataset-editor-title"
        tabIndex={-1}
      >
        <div
          className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div>
              <h2 id="dataset-editor-title" className="text-xl font-bold text-gray-900">
                Edit Dataset
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Dataset ID: {datasetId}
                {hasUnsavedChanges && (
                  <span className="ml-2 text-yellow-600 font-medium">• Unsaved changes</span>
                )}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close dialog"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="border-b border-gray-200 px-6">
            <div className="flex gap-1 -mb-px" role="tablist">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  aria-controls={`${tab.id}-panel`}
                  onClick={() => handleTabChange(tab.id)}
                  className={`
                    px-4 py-3 text-sm font-medium border-b-2 transition-colors
                    ${
                      activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                    }
                  `}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div
            id={`${activeTab}-panel`}
            role="tabpanel"
            aria-labelledby={`${activeTab}-tab`}
            className="flex-1 overflow-y-auto"
          >
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              renderTabContent()
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Tip:</span> Press{' '}
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">
                Cmd+S
              </kbd>{' '}
              to save,{' '}
              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono">
                Esc
              </kbd>{' '}
              to close
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={isLoading || !hasUnsavedChanges}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Unsaved Changes Confirmation Dialog */}
      {showUnsavedDialog && (
        <UnsavedChangesDialog onConfirm={handleConfirmClose} onCancel={handleCancelClose} />
      )}

      {/* AI Enhancement Dialog */}
      {showAIDialog && (
        <AIEnhancementDialog
          open={showAIDialog}
          onClose={() => setShowAIDialog(false)}
          dataset={dataset}
          columns={columns}
          selectedColumnIds={selectedColumnIds}
          onApplyEnhancements={handleApplyEnhancements}
        />
      )}
    </>
  );
}

// ============================================================================
// Hook for managing unsaved changes
// ============================================================================

export function useUnsavedChanges() {
  const [hasChanges, setHasChanges] = useState(false);

  const markAsChanged = useCallback(() => {
    setHasChanges(true);
  }, []);

  const markAsSaved = useCallback(() => {
    setHasChanges(false);
  }, []);

  return { hasChanges, markAsChanged, markAsSaved };
}
