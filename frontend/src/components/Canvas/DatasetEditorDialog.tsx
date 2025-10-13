/**
 * Dataset Editor Dialog Component
 * Comprehensive tabbed dialog for editing dataset properties
 * Renamed from NodeEditorDialog for refactored architecture
 * Based on specifications in docs/prp/001-technical-specifications-refactored.md
 */

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Save,
  AlertCircle,
  FileText,
  Database,
  GitBranch,
  Link as LinkIcon,
  Bot,
  History,
  CheckCircle,
  Clock,
  XCircle,
  GitCommit,
} from 'lucide-react';
import type {
  Dataset,
  UpdateDatasetPayload,
  SyncStatus,
} from '../../types/dataset';
import type {
  Column,
  CreateColumnPayload,
  UpdateColumnPayload,
} from '../../types/column';
import type {
  MedallionLayer,
  EntityType,
  EntitySubtype,
  MaterializationType,
} from '../../types/canvas';

type TabType = 'properties' | 'columns' | 'lineage' | 'references' | 'history' | 'ai_insights';

interface DatasetEditorDialogProps {
  isOpen: boolean;
  dataset: Dataset | null;
  columns?: Column[];
  workspaceId: string;
  projectId: string;
  projectType: 'Standard' | 'DataVault' | 'Dimensional';
  onClose: () => void;
  onSave: (datasetId: string, updates: UpdateDatasetPayload) => Promise<void>;
  onCreateColumn: (payload: CreateColumnPayload) => Promise<Column>;
  onUpdateColumn: (columnId: string, updates: UpdateColumnPayload) => Promise<void>;
  onDeleteColumn: (columnId: string) => Promise<void>;
  onCommit?: (datasetId: string, message: string) => Promise<void>;
  onAddReference?: (datasetId: string) => void;
  onViewLineage?: (datasetId: string) => void;
}

export function DatasetEditorDialog({
  isOpen,
  dataset,
  columns: initialColumns = [],
  workspaceId,
  projectId,
  projectType,
  onClose,
  onSave,
  onCreateColumn,
  onUpdateColumn,
  onDeleteColumn,
  onCommit,
  onAddReference,
  onViewLineage,
}: DatasetEditorDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>('properties');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [medallionLayer, setMedallionLayer] = useState<MedallionLayer>('Bronze');
  const [entityType, setEntityType] = useState<EntityType>('Table');
  const [entitySubtype, setEntitySubtype] = useState<EntitySubtype>(null);
  const [materializationType, setMaterializationType] = useState<MaterializationType>('Table');
  const [description, setDescription] = useState('');
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [fqn, setFqn] = useState('');

  // Columns state
  const [columns, setColumns] = useState<Column[]>([]);

  // Load dataset data when dialog opens
  useEffect(() => {
    if (isOpen && dataset) {
      setName(dataset.name);
      setMedallionLayer(dataset.medallion_layer || 'Bronze');
      setEntityType(dataset.entity_type || 'Table');
      setEntitySubtype(dataset.entity_subtype);
      setMaterializationType(dataset.materialization_type || 'Table');
      setDescription(dataset.description || '');
      setMetadata(dataset.metadata || {});
      setFqn(dataset.fqn);
      setColumns(initialColumns);
      setHasUnsavedChanges(false);
      setError(null);
      setActiveTab('properties');
    }
  }, [isOpen, dataset, initialColumns]);

  // Mark as changed when any field changes
  useEffect(() => {
    if (dataset && isOpen) {
      const changed =
        name !== dataset.name ||
        medallionLayer !== dataset.medallion_layer ||
        entityType !== dataset.entity_type ||
        entitySubtype !== dataset.entity_subtype ||
        materializationType !== dataset.materialization_type ||
        description !== (dataset.description || '');

      if (changed) {
        setHasUnsavedChanges(true);
      }
    }
  }, [name, medallionLayer, entityType, entitySubtype, materializationType, description, dataset, isOpen]);

  const handleClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  }, [hasUnsavedChanges, onClose]);

  const handleDiscardChanges = () => {
    setShowDiscardConfirm(false);
    setHasUnsavedChanges(false);
    onClose();
  };

  const handleSave = async () => {
    if (!dataset) return;

    setError(null);
    setLoading(true);

    try {
      const updates: UpdateDatasetPayload = {
        name: name.trim(),
        fqn: fqn.trim(),
        medallion_layer: medallionLayer,
        entity_type: entityType,
        entity_subtype: entitySubtype,
        materialization_type: materializationType,
        description: description.trim() || undefined,
        metadata: metadata,
      };

      await onSave(dataset.dataset_id, updates);
      setHasUnsavedChanges(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save dataset');
    } finally {
      setLoading(false);
    }
  };

  const handleCommit = async () => {
    if (!dataset || !onCommit) return;

    setError(null);
    setLoading(true);

    try {
      await onCommit(dataset.dataset_id, commitMessage);
      setShowCommitDialog(false);
      setCommitMessage('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to commit dataset');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !dataset) return null;

  // Available entity types based on project type
  const availableEntityTypes: EntityType[] = ['Table', 'Staging', 'PersistentStaging'];
  if (projectType === 'DataVault') {
    availableEntityTypes.push('DataVault');
  }
  if (projectType === 'Dimensional') {
    availableEntityTypes.push('DataMart');
  }

  // Get subtype options based on entity type
  const getSubtypeOptions = (): EntitySubtype[] => {
    if (entityType === 'DataVault') {
      return ['Hub', 'Link', 'Satellite', 'LinkSatellite', 'PIT', 'Bridge'];
    }
    if (entityType === 'DataMart') {
      return ['Dimension', 'Fact'];
    }
    return [null];
  };

  const subtypeOptions = getSubtypeOptions();

  // Get sync status icon and text
  const getSyncStatusDisplay = (status: SyncStatus | undefined, hasUncommitted: boolean) => {
    if (hasUncommitted) {
      return {
        icon: AlertCircle,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50',
        text: 'Uncommitted Changes',
      };
    }

    switch (status) {
      case 'synced':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          text: 'Synced',
        };
      case 'pending':
        return {
          icon: Clock,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          text: 'Sync Pending',
        };
      case 'conflict':
        return {
          icon: AlertCircle,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          text: 'Conflict Detected',
        };
      case 'error':
        return {
          icon: XCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          text: 'Sync Error',
        };
      default:
        return {
          icon: Clock,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          text: 'Not Synced',
        };
    }
  };

  const syncStatus = getSyncStatusDisplay(dataset.sync_status, dataset.has_uncommitted_changes);

  const tabs = [
    { id: 'properties', label: 'Properties', icon: FileText },
    { id: 'columns', label: 'Columns', icon: Database },
    { id: 'lineage', label: 'Lineage', icon: GitBranch },
    { id: 'references', label: 'References', icon: LinkIcon },
    { id: 'history', label: 'History', icon: History },
    { id: 'ai_insights', label: 'AI Insights', icon: Bot, disabled: true },
  ] as const;

  return (
    <>
      {/* Main Dialog */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl mx-4 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-gray-900">Edit Dataset</h2>
                {/* Sync Status Badge */}
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${syncStatus.bgColor}`}>
                  <syncStatus.icon className={`w-4 h-4 ${syncStatus.color}`} />
                  <span className={`text-sm font-medium ${syncStatus.color}`}>
                    {syncStatus.text}
                  </span>
                </div>
              </div>
              <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                <span className="font-mono text-xs">{dataset.dataset_id.substring(0, 8)}...</span>
                <span>•</span>
                <span className="font-mono text-xs">{fqn}</span>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <div className="flex overflow-x-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => !tab.disabled && setActiveTab(tab.id as TabType)}
                    disabled={tab.disabled}
                    className={`
                      flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                      ${activeTab === tab.id
                        ? 'border-blue-600 text-blue-600'
                        : tab.disabled
                        ? 'border-transparent text-gray-400 cursor-not-allowed'
                        : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Error</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            )}

            {activeTab === 'properties' && (
              <div className="space-y-6">
                {/* Git Sync Status Section */}
                {(dataset.sync_status || dataset.has_uncommitted_changes) && (
                  <div className={`border rounded-lg p-4 ${syncStatus.bgColor} border-${syncStatus.color.replace('text-', '')}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <syncStatus.icon className={`w-5 h-5 ${syncStatus.color} mt-0.5`} />
                        <div>
                          <h4 className={`text-sm font-semibold ${syncStatus.color}`}>
                            {syncStatus.text}
                          </h4>
                          {dataset.has_uncommitted_changes && (
                            <p className="text-sm text-gray-600 mt-1">
                              This dataset has uncommitted changes. Commit to save to source control.
                            </p>
                          )}
                          {dataset.source_commit_sha && (
                            <p className="text-xs text-gray-500 mt-1 font-mono">
                              Last commit: {dataset.source_commit_sha.substring(0, 8)}...
                            </p>
                          )}
                          {dataset.last_synced_at && (
                            <p className="text-xs text-gray-500">
                              Last synced: {new Date(dataset.last_synced_at).toLocaleString()}
                            </p>
                          )}
                          {dataset.sync_error_message && (
                            <p className="text-sm text-red-600 mt-1">
                              Error: {dataset.sync_error_message}
                            </p>
                          )}
                        </div>
                      </div>
                      {dataset.has_uncommitted_changes && onCommit && (
                        <button
                          onClick={() => setShowCommitDialog(true)}
                          className="px-3 py-1.5 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm flex items-center gap-2"
                        >
                          <GitCommit className="w-4 h-4" />
                          Commit Changes
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Basic Properties - keeping existing structure but updating labels */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label htmlFor="dataset-name" className="block text-sm font-medium text-gray-700 mb-2">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="dataset-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label htmlFor="dataset-fqn" className="block text-sm font-medium text-gray-700 mb-2">
                      Fully Qualified Name (FQN)
                    </label>
                    <input
                      id="dataset-fqn"
                      type="text"
                      value={fqn}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 font-mono text-sm"
                    />
                  </div>

                  <div className="col-span-2">
                    <label htmlFor="dataset-id" className="block text-sm font-medium text-gray-700 mb-2">
                      Dataset ID
                    </label>
                    <input
                      id="dataset-id"
                      type="text"
                      value={dataset.dataset_id}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 font-mono text-sm"
                    />
                  </div>

                  <div>
                    <label htmlFor="medallion-layer" className="block text-sm font-medium text-gray-700 mb-2">
                      Medallion Layer <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="medallion-layer"
                      value={medallionLayer}
                      onChange={(e) => setMedallionLayer(e.target.value as MedallionLayer)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      <option value="Raw">Raw (Landing)</option>
                      <option value="Bronze">Bronze</option>
                      <option value="Silver">Silver</option>
                      <option value="Gold">Gold</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="entity-type" className="block text-sm font-medium text-gray-700 mb-2">
                      Entity Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="entity-type"
                      value={entityType}
                      onChange={(e) => setEntityType(e.target.value as EntityType)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      {availableEntityTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {subtypeOptions.length > 1 && subtypeOptions[0] !== null && (
                    <div>
                      <label htmlFor="entity-subtype" className="block text-sm font-medium text-gray-700 mb-2">
                        Entity Subtype
                      </label>
                      <select
                        id="entity-subtype"
                        value={entitySubtype || ''}
                        onChange={(e) => setEntitySubtype((e.target.value as EntitySubtype) || null)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={loading}
                      >
                        {subtypeOptions.map((subtype) => (
                          <option key={subtype} value={subtype || ''}>
                            {subtype}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label htmlFor="materialization-type" className="block text-sm font-medium text-gray-700 mb-2">
                      Materialization Type
                    </label>
                    <select
                      id="materialization-type"
                      value={materializationType || ''}
                      onChange={(e) => setMaterializationType((e.target.value as MaterializationType) || null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    >
                      <option value="Table">Table</option>
                      <option value="View">View</option>
                      <option value="MaterializedView">Materialized View</option>
                    </select>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    disabled={loading}
                    placeholder="Describe the purpose and content of this dataset..."
                  />
                </div>
              </div>
            )}

            {activeTab === 'columns' && (
              <div className="text-center py-12">
                <Database className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Column management UI to be implemented</p>
                <p className="text-sm text-gray-400 mt-1">{columns.length} columns</p>
              </div>
            )}

            {activeTab === 'lineage' && (
              <div className="text-center py-12">
                <GitBranch className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Lineage visualization to be implemented</p>
              </div>
            )}

            {activeTab === 'references' && (
              <div className="text-center py-12">
                <LinkIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Column-level references</p>
                <p className="text-sm text-gray-400 mt-1">References are now stored on individual columns</p>
                {onAddReference && (
                  <button
                    onClick={() => onAddReference(dataset.dataset_id)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Add Reference
                  </button>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Git history and uncommitted changes</p>
                {dataset.has_uncommitted_changes && (
                  <div className="mt-4 text-sm text-yellow-600">
                    This dataset has uncommitted changes
                  </div>
                )}
              </div>
            )}

            {activeTab === 'ai_insights' && (
              <div className="text-center py-12">
                <Bot className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">AI Insights coming in a future phase</p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2">
              {hasUnsavedChanges && (
                <span className="text-sm text-amber-600 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  Unsaved changes
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed flex items-center gap-2"
                disabled={loading || !hasUnsavedChanges}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Commit Dialog */}
      {showCommitDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-3 mb-4">
              <GitCommit className="w-6 h-6 text-blue-600 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Commit Changes</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Enter a commit message to save changes to source control
                </p>
              </div>
            </div>
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Update dataset properties"
            />
            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={() => setShowCommitDialog(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCommit}
                disabled={!commitMessage.trim() || loading}
                className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
              >
                Commit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Discard Changes Confirmation */}
      {showDiscardConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-start gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Discard unsaved changes?</h3>
                <p className="text-sm text-gray-600 mt-1">
                  You have unsaved changes. Are you sure you want to close without saving?
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDiscardConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Continue Editing
              </button>
              <button
                onClick={handleDiscardChanges}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Discard Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
