/**
 * Edit Diagram Dialog
 * Modal dialog for editing diagram metadata (name, description, type, view mode)
 */

import { useState, useEffect } from 'react';
import { X, FileText, AlertCircle } from 'lucide-react';
import { useWorkspaceDiagram, useUpdateWorkspaceDiagram } from '@/hooks';
import type { UpdateWorkspaceDiagramInput, DiagramType, ViewMode } from '@/types/workspaceDiagram';

interface EditDiagramDialogProps {
  diagramId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const DIAGRAM_TYPES: { value: DiagramType; label: string; description: string }[] = [
  { value: 'dataset', label: 'Dataset', description: 'Data tables and relationships' },
  { value: 'business_model', label: 'Business Model', description: 'Business entities and processes' },
  { value: 'lineage', label: 'Lineage', description: 'Data flow and transformations' },
  { value: 'erd', label: 'ERD', description: 'Entity-relationship diagram' },
];

const VIEW_MODES: { value: ViewMode; label: string; description: string }[] = [
  { value: 'relationships', label: 'Relationships', description: 'Show table relationships and foreign keys' },
  { value: 'lineage', label: 'Lineage', description: 'Show data flow and transformations' },
];

export function EditDiagramDialog({
  diagramId,
  onClose,
  onSuccess,
}: EditDiagramDialogProps) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch diagram data
  const { data: diagram, isLoading } = useWorkspaceDiagram(diagramId);

  // Update mutation
  const updateDiagramMutation = useUpdateWorkspaceDiagram();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [diagramType, setDiagramType] = useState<DiagramType>('dataset');
  const [viewMode, setViewMode] = useState<ViewMode>('relationships');

  // Initialize form when diagram loads
  useEffect(() => {
    if (diagram) {
      setName(diagram.name);
      setDescription(diagram.description || '');
      setDiagramType(diagram.diagram_type);
      setViewMode(diagram.view_mode || 'relationships');
    }
  }, [diagram]);

  const handleSave = async () => {
    const input: UpdateWorkspaceDiagramInput = {};

    if (name !== diagram?.name) input.name = name;
    if (description !== (diagram?.description || '')) input.description = description;
    if (diagramType !== diagram?.diagram_type) input.diagram_type = diagramType;
    if (viewMode !== diagram?.view_mode) input.view_mode = viewMode;

    if (Object.keys(input).length > 0) {
      try {
        await updateDiagramMutation.mutateAsync({ id: diagramId, input });
        setHasUnsavedChanges(false);
        onSuccess?.();
        onClose();
      } catch (error) {
        console.error('Failed to update diagram:', error);
      }
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmed) return;
    }
    onClose();
  };

  if (isLoading || !diagram) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full h-[400px] flex items-center justify-center">
          <div className="text-gray-500 dark:text-gray-400">Loading diagram...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Edit Diagram</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{diagram.name}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="btn-icon text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            disabled={updateDiagramMutation.isPending}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Error Message */}
            {updateDiagramMutation.isError && (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-300">Failed to update diagram</p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {updateDiagramMutation.error?.message || 'An unexpected error occurred'}
                  </p>
                </div>
              </div>
            )}

            {/* Diagram Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Diagram Name *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="My Diagram"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Describe the purpose of this diagram..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Optional description to help team members understand the diagram's purpose
              </p>
            </div>

            {/* Diagram Type */}
            <div>
              <label htmlFor="diagram-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Diagram Type *
              </label>
              <select
                id="diagram-type"
                value={diagramType}
                onChange={(e) => {
                  setDiagramType(e.target.value as DiagramType);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {DIAGRAM_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                The type of diagram determines which elements and relationships are available
              </p>
            </div>

            {/* View Mode */}
            <div>
              <label htmlFor="view-mode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                View Mode *
              </label>
              <select
                id="view-mode"
                value={viewMode}
                onChange={(e) => {
                  setViewMode(e.target.value as ViewMode);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {VIEW_MODES.map((mode) => (
                  <option key={mode.value} value={mode.value}>
                    {mode.label} - {mode.description}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                The view mode controls how data connections are displayed
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div>
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
                <AlertCircle className="w-4 h-4" />
                <span>You have unsaved changes</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="btn-secondary"
              disabled={updateDiagramMutation.isPending}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary"
              disabled={updateDiagramMutation.isPending || !hasUnsavedChanges || !name.trim()}
            >
              {updateDiagramMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
