/**
 * Node Editor Dialog Component
 * Comprehensive tabbed dialog for editing node properties
 * Based on specifications in docs/prp/001-technical-specifications.md
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
} from 'lucide-react';
import type {
  Node,
  UpdateNodePayload,
  NodeMetadata,
  NodeItem,
  CreateNodeItemPayload,
  UpdateNodeItemPayload,
} from '../../types/node';
import type {
  MedallionLayer,
  EntityType,
  EntitySubtype,
  MaterializationType,
} from '../../types/canvas';
import { NodeItemsTable } from './NodeItemsTable';
import { CreateNodeItemDialog } from './CreateNodeItemDialog';

type TabType = 'properties' | 'nodeitems' | 'mappings' | 'relationships' | 'ai_insights' | 'history';

interface NodeEditorDialogProps {
  isOpen: boolean;
  node: Node | null;
  projectId: string;
  projectType: 'Standard' | 'DataVault' | 'Dimensional';
  onClose: () => void;
  onSave: (nodeUuid: string, updates: UpdateNodePayload, updatedNodeItems?: NodeItem[]) => Promise<void>;
  onCreateNodeItem: (payload: CreateNodeItemPayload) => Promise<NodeItem>;
  onUpdateNodeItem: (nodeUuid: string, itemUuid: string, updates: UpdateNodeItemPayload) => Promise<void>;
  onDeleteNodeItem: (nodeUuid: string, itemUuid: string) => Promise<void>;
  onDeleteMultipleNodeItems: (nodeUuid: string, itemUuids: string[]) => Promise<void>;
  defaultCatalog?: string;
  defaultSchema?: string;
}

export function NodeEditorDialog({
  isOpen,
  node,
  projectId,
  projectType,
  onClose,
  onSave,
  onCreateNodeItem,
  onUpdateNodeItem,
  onDeleteNodeItem,
  onDeleteMultipleNodeItems,
  defaultCatalog = 'main',
  defaultSchema,
}: NodeEditorDialogProps) {
  const [activeTab, setActiveTab] = useState<TabType>('properties');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [medallionLayer, setMedallionLayer] = useState<MedallionLayer>('Bronze');
  const [entityType, setEntityType] = useState<EntityType>('Table');
  const [entitySubtype, setEntitySubtype] = useState<EntitySubtype>(null);
  const [materializationType, setMaterializationType] = useState<MaterializationType>('Table');
  const [description, setDescription] = useState('');
  const [metadata, setMetadata] = useState<NodeMetadata>({});
  const [fqn, setFqn] = useState('');

  // Custom metadata state
  const [customMetadata, setCustomMetadata] = useState<Array<{ key: string; value: string }>>([]);

  // NodeItems state
  const [nodeItems, setNodeItems] = useState<NodeItem[]>([]);
  const [showCreateNodeItemDialog, setShowCreateNodeItemDialog] = useState(false);

  // Load node data when dialog opens
  useEffect(() => {
    if (isOpen && node) {
      setName(node.name);
      setMedallionLayer(node.medallion_layer);
      setEntityType(node.entity_type);
      setEntitySubtype(node.entity_subtype);
      setMaterializationType(node.materialization_type);
      setDescription(node.description || '');
      setMetadata(node.metadata || {});
      setFqn(node.fqn);
      setNodeItems(node.node_items || []);

      // Extract custom metadata
      const standardKeys = [
        'source_system',
        'business_owner',
        'technical_owner',
        'refresh_frequency',
        'columns',
        'primary_keys',
        'foreign_keys',
        'business_keys',
        'natural_keys',
        'partitioned_by',
        'clustered_by',
        'tags',
      ];

      const custom = Object.entries(node.metadata || {})
        .filter(([key]) => !standardKeys.includes(key))
        .map(([key, value]) => ({ key, value: String(value) }));

      setCustomMetadata(custom);
      setHasUnsavedChanges(false);
      setError(null);
      setActiveTab('properties');
    }
  }, [isOpen, node]);

  // Auto-generate FQN when name or layer changes
  useEffect(() => {
    if (name) {
      const catalog = metadata.catalog || defaultCatalog;
      const schema = metadata.schema || defaultSchema || medallionLayer.toLowerCase();
      const newFqn = `${catalog}.${schema}.${name}`;
      setFqn(newFqn);
      setHasUnsavedChanges(true);
    }
  }, [name, medallionLayer, metadata.catalog, metadata.schema, defaultCatalog, defaultSchema]);

  // Mark as changed when any field changes
  useEffect(() => {
    if (node && isOpen) {
      const changed =
        name !== node.name ||
        medallionLayer !== node.medallion_layer ||
        entityType !== node.entity_type ||
        entitySubtype !== node.entity_subtype ||
        materializationType !== node.materialization_type ||
        description !== (node.description || '');

      if (changed) {
        setHasUnsavedChanges(true);
      }
    }
  }, [name, medallionLayer, entityType, entitySubtype, materializationType, description, node, isOpen]);

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
    if (!node) return;

    setError(null);
    setLoading(true);

    try {
      // Merge custom metadata back into metadata object
      const updatedMetadata: NodeMetadata = { ...metadata };
      customMetadata.forEach(({ key, value }) => {
        if (key.trim()) {
          updatedMetadata[key] = value;
        }
      });

      const updates: UpdateNodePayload = {
        name: name.trim(),
        medallion_layer: medallionLayer,
        entity_type: entityType,
        entity_subtype: entitySubtype,
        materialization_type: materializationType,
        description: description.trim() || undefined,
        metadata: updatedMetadata,
      };

      await onSave(node.uuid, updates, nodeItems);
      setHasUnsavedChanges(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save node');
    } finally {
      setLoading(false);
    }
  };

  // NodeItem handlers
  const handleAddNodeItem = () => {
    setShowCreateNodeItemDialog(true);
  };

  const handleCreateNodeItem = async (payload: CreateNodeItemPayload) => {
    try {
      const newItem = await onCreateNodeItem(payload);
      setNodeItems([...nodeItems, newItem]);
      setHasUnsavedChanges(true);
    } catch (err: any) {
      setError(err.message || 'Failed to create NodeItem');
      throw err;
    }
  };

  const handleUpdateNodeItemLocal = (uuid: string, updates: UpdateNodeItemPayload) => {
    if (!node) return;

    // Update locally
    const updatedItems = nodeItems.map((item) =>
      item.uuid === uuid
        ? {
            ...item,
            ...updates,
            updated_at: new Date().toISOString(),
            fqn: updates.name ? `${node.fqn}.${updates.name}` : item.fqn,
          }
        : item
    );

    setNodeItems(updatedItems);
    setHasUnsavedChanges(true);

    // Also call the prop handler for immediate persistence
    onUpdateNodeItem(node.uuid, uuid, updates).catch((err) => {
      setError(err.message || 'Failed to update NodeItem');
    });
  };

  const handleDeleteNodeItemLocal = (uuid: string) => {
    if (!node) return;

    setNodeItems(nodeItems.filter((item) => item.uuid !== uuid));
    setHasUnsavedChanges(true);

    // Also call the prop handler for immediate persistence
    onDeleteNodeItem(node.uuid, uuid).catch((err) => {
      setError(err.message || 'Failed to delete NodeItem');
    });
  };

  const handleDeleteMultipleLocal = (uuids: string[]) => {
    if (!node) return;

    setNodeItems(nodeItems.filter((item) => !uuids.includes(item.uuid)));
    setHasUnsavedChanges(true);

    // Also call the prop handler for immediate persistence
    onDeleteMultipleNodeItems(node.uuid, uuids).catch((err) => {
      setError(err.message || 'Failed to delete NodeItems');
    });
  };

  const handleSaveAndClose = async () => {
    await handleSave();
    if (!error) {
      onClose();
    }
  };

  const addCustomMetadataField = () => {
    setCustomMetadata([...customMetadata, { key: '', value: '' }]);
    setHasUnsavedChanges(true);
  };

  const updateCustomMetadataField = (index: number, field: 'key' | 'value', value: string) => {
    const updated = [...customMetadata];
    updated[index][field] = value;
    setCustomMetadata(updated);
    setHasUnsavedChanges(true);
  };

  const removeCustomMetadataField = (index: number) => {
    setCustomMetadata(customMetadata.filter((_, i) => i !== index));
    setHasUnsavedChanges(true);
  };

  const updateStandardMetadata = (key: keyof NodeMetadata, value: any) => {
    setMetadata({ ...metadata, [key]: value });
    setHasUnsavedChanges(true);
  };

  if (!isOpen || !node) return null;

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

  const tabs = [
    { id: 'properties', label: 'Properties', icon: FileText },
    { id: 'nodeitems', label: 'Columns', icon: Database },
    { id: 'mappings', label: 'Mappings', icon: GitBranch, disabled: true },
    { id: 'relationships', label: 'Relationships', icon: LinkIcon, disabled: true },
    { id: 'ai_insights', label: 'AI Insights', icon: Bot, disabled: true },
    { id: 'history', label: 'History', icon: History, disabled: true },
  ] as const;

  return (
    <>
      {/* Main Dialog */}
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Edit Node</h2>
              <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
                <span className="font-mono">{node.uuid.substring(0, 8)}...</span>
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
                {/* Basic Properties */}
                <div className="grid grid-cols-2 gap-6">
                  {/* Name */}
                  <div className="col-span-2">
                    <label htmlFor="node-name" className="block text-sm font-medium text-gray-700 mb-2">
                      Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="node-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                      required
                    />
                  </div>

                  {/* FQN (read-only) */}
                  <div className="col-span-2">
                    <label htmlFor="node-fqn" className="block text-sm font-medium text-gray-700 mb-2">
                      Fully Qualified Name (FQN)
                    </label>
                    <input
                      id="node-fqn"
                      type="text"
                      value={fqn}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 font-mono text-sm"
                    />
                  </div>

                  {/* UUID (read-only) */}
                  <div className="col-span-2">
                    <label htmlFor="node-uuid" className="block text-sm font-medium text-gray-700 mb-2">
                      UUID
                    </label>
                    <input
                      id="node-uuid"
                      type="text"
                      value={node.uuid}
                      readOnly
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600 font-mono text-sm"
                    />
                  </div>

                  {/* Medallion Layer */}
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

                  {/* Entity Type */}
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

                  {/* Entity Subtype (conditional) */}
                  {subtypeOptions.length > 1 && subtypeOptions[0] !== null && (
                    <div>
                      <label htmlFor="entity-subtype" className="block text-sm font-medium text-gray-700 mb-2">
                        Entity Subtype <span className="text-red-500">*</span>
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

                  {/* Materialization Type */}
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
                    placeholder="Describe the purpose and content of this node..."
                  />
                </div>

                {/* Standard Metadata */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4">Standard Metadata</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="source-system" className="block text-sm font-medium text-gray-700 mb-2">
                        Source System
                      </label>
                      <input
                        id="source-system"
                        type="text"
                        value={metadata.source_system || ''}
                        onChange={(e) => updateStandardMetadata('source_system', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label htmlFor="refresh-frequency" className="block text-sm font-medium text-gray-700 mb-2">
                        Refresh Frequency
                      </label>
                      <input
                        id="refresh-frequency"
                        type="text"
                        value={metadata.refresh_frequency || ''}
                        onChange={(e) => updateStandardMetadata('refresh_frequency', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        disabled={loading}
                        placeholder="e.g., Daily, Hourly"
                      />
                    </div>
                    <div>
                      <label htmlFor="business-owner" className="block text-sm font-medium text-gray-700 mb-2">
                        Business Owner
                      </label>
                      <input
                        id="business-owner"
                        type="text"
                        value={metadata.business_owner || ''}
                        onChange={(e) => updateStandardMetadata('business_owner', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        disabled={loading}
                      />
                    </div>
                    <div>
                      <label htmlFor="technical-owner" className="block text-sm font-medium text-gray-700 mb-2">
                        Technical Owner
                      </label>
                      <input
                        id="technical-owner"
                        type="text"
                        value={metadata.technical_owner || ''}
                        onChange={(e) => updateStandardMetadata('technical_owner', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>

                {/* Custom Metadata */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-900">Custom Metadata</h3>
                    <button
                      onClick={addCustomMetadataField}
                      className="px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                      disabled={loading}
                    >
                      + Add Field
                    </button>
                  </div>
                  {customMetadata.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">No custom metadata fields</p>
                  ) : (
                    <div className="space-y-3">
                      {customMetadata.map((field, index) => (
                        <div key={index} className="flex items-start gap-3">
                          <input
                            type="text"
                            value={field.key}
                            onChange={(e) => updateCustomMetadataField(index, 'key', e.target.value)}
                            placeholder="Key"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            disabled={loading}
                          />
                          <input
                            type="text"
                            value={field.value}
                            onChange={(e) => updateCustomMetadataField(index, 'value', e.target.value)}
                            placeholder="Value"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            disabled={loading}
                          />
                          <button
                            onClick={() => removeCustomMetadataField(index)}
                            className="px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            disabled={loading}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* NodeItems Tab */}
            {activeTab === 'nodeitems' && node && (
              <div className="h-[500px]">
                <NodeItemsTable
                  nodeItems={nodeItems}
                  nodeUuid={node.uuid}
                  onAddNodeItem={handleAddNodeItem}
                  onUpdateNodeItem={handleUpdateNodeItemLocal}
                  onDeleteNodeItem={handleDeleteNodeItemLocal}
                  onDeleteMultiple={handleDeleteMultipleLocal}
                  isReadOnly={loading}
                />
              </div>
            )}

            {activeTab === 'mappings' && (
              <div className="text-center py-12">
                <GitBranch className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Mappings visualization coming in Phase 2.5</p>
              </div>
            )}

            {activeTab === 'relationships' && (
              <div className="text-center py-12">
                <LinkIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Relationships management coming in Phase 2.6</p>
              </div>
            )}

            {activeTab === 'ai_insights' && (
              <div className="text-center py-12">
                <Bot className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">AI Insights coming in a future phase</p>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="text-center py-12">
                <History className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Git history visualization coming in a future phase</p>
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
              <button
                onClick={handleSaveAndClose}
                className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:bg-green-300 disabled:cursor-not-allowed"
                disabled={loading || !hasUnsavedChanges}
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create NodeItem Dialog */}
      {node && (
        <CreateNodeItemDialog
          isOpen={showCreateNodeItemDialog}
          nodeUuid={node.uuid}
          existingNames={nodeItems.map((item) => item.name)}
          onClose={() => setShowCreateNodeItemDialog(false)}
          onCreate={handleCreateNodeItem}
        />
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
