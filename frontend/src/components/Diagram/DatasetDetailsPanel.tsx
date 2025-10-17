/**
 * Dataset Details Panel Component
 * Right sidebar showing dataset details for viewing and editing
 */

import { useState } from 'react';
import { X, Edit3, Save, Database, GitBranch, Calendar, User } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useDiagramStore } from '../../store/diagramStore';
import { useUpdateDataset, datasetKeys } from '../../hooks/useDatasets';
import { MEDALLION_COLORS } from '../../types/canvas';

interface DatasetDetailsPanelProps {
  className?: string;
  workspaceId?: string;
}

export function DatasetDetailsPanel({ className = '', workspaceId }: DatasetDetailsPanelProps) {
  const queryClient = useQueryClient();
  const { nodes, selectedDatasetId, setSelectedDatasetId, updateNode, updateNodePosition } = useDiagramStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Mutation for updating dataset in database
  const updateDatasetMutation = useUpdateDataset();

  // Form state for all editable fields
  const [editedData, setEditedData] = useState({
    name: '',
    fqn: '',
    medallion_layer: '',
    dataset_type: '',
    description: '',
  });

  // Get selected node
  const selectedNode = nodes.find((n) => n.id === selectedDatasetId);

  console.log('[DatasetDetailsPanel] Render state:', {
    selectedDatasetId,
    nodesCount: nodes.length,
    nodeIds: nodes.map(n => n.id),
    selectedNode: selectedNode ? { id: selectedNode.id, name: selectedNode.data.name } : null
  });

  if (!selectedDatasetId || !selectedNode) {
    return (
      <div className={`flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 ${className}`}>
        <Database className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select a dataset to view details
        </p>
        {selectedDatasetId && !selectedNode && (
          <p className="text-xs text-red-500 dark:text-red-400 mt-2">
            Dataset {selectedDatasetId} not found in diagram nodes
          </p>
        )}
      </div>
    );
  }

  const data = selectedNode.data;

  const handleEdit = () => {
    setEditedData({
      name: data.name || '',
      fqn: data.fqn || '',
      medallion_layer: data.medallion_layer || '',
      dataset_type: data.dataset_type || '',
      description: data.description || '',
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!selectedDatasetId || !selectedNode) return;

    setIsSaving(true);
    const oldMedallionLayer = data.medallion_layer;
    const newMedallionLayer = editedData.medallion_layer;

    try {
      // Update the node in the diagram store first (optimistic update)
      updateNode(selectedDatasetId, editedData);

      // If medallion layer changed, reposition the node in the new swimlane
      if (oldMedallionLayer !== newMedallionLayer) {
        console.log('[DatasetDetailsPanel] Medallion layer changed, repositioning node:', {
          from: oldMedallionLayer,
          to: newMedallionLayer
        });

        // Calculate new position based on medallion layer
        const SWIMLANE_WIDTH = 400;
        const LAYER_X_POSITIONS: Record<string, number> = {
          Source: 50,
          Raw: SWIMLANE_WIDTH + 50,
          Bronze: SWIMLANE_WIDTH * 2 + 50,
          Silver: SWIMLANE_WIDTH * 3 + 50,
          Gold: SWIMLANE_WIDTH * 4 + 50,
          Unspecified: 50,
        };

        // Count nodes in the new layer
        const nodesInNewLayer = nodes.filter(
          (n) => n.data.medallion_layer === newMedallionLayer && n.id !== selectedDatasetId && n.position
        );
        const NODE_HEIGHT = 200;
        const yPosition = nodesInNewLayer.length * NODE_HEIGHT + 50;
        const xPosition = LAYER_X_POSITIONS[newMedallionLayer] || 50;

        // Update position
        updateNodePosition(selectedDatasetId, { x: xPosition, y: yPosition });
      }

      // Persist to database
      await updateDatasetMutation.mutateAsync({
        datasetId: selectedDatasetId,
        updates: {
          name: editedData.name,
          fully_qualified_name: editedData.fqn,
          medallion_layer: editedData.medallion_layer as any,
          dataset_type: editedData.dataset_type as any,
          description: editedData.description,
        },
      });

      // Manually invalidate queries to refresh treeview
      if (workspaceId) {
        queryClient.invalidateQueries({
          queryKey: datasetKeys.list({ workspaceId }),
        });
      }

      console.log('[DatasetDetailsPanel] Dataset updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('[DatasetDetailsPanel] Failed to update dataset:', error);
      // Revert optimistic update on error
      updateNode(selectedDatasetId, {
        name: data.name,
        fqn: data.fqn,
        medallion_layer: data.medallion_layer,
        dataset_type: data.dataset_type,
        description: data.description,
      });
      alert('Failed to save changes. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setIsEditing(false);
    setEditedData({
      name: '',
      fqn: '',
      medallion_layer: '',
      dataset_type: '',
      description: '',
    });
  };

  const handleClose = () => {
    setSelectedDatasetId(null);
    setIsEditing(false);
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Dataset Details
        </h2>
        <button
          onClick={handleClose}
          className="btn-icon p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
          title="Close"
        >
          <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Dataset Name */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Dataset Name
            </h3>
          </div>
          {isEditing ? (
            <input
              type="text"
              value={editedData.name}
              onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              placeholder="Enter dataset name..."
            />
          ) : (
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {data.name}
            </p>
          )}
        </div>

        {/* FQN */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Fully Qualified Name
          </h3>
          {isEditing ? (
            <input
              type="text"
              value={editedData.fqn}
              onChange={(e) => setEditedData({ ...editedData, fqn: e.target.value })}
              className="w-full px-3 py-2 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              placeholder="catalog.schema.table"
            />
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400 font-mono bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded">
              {data.fqn}
            </p>
          )}
        </div>

        {/* Medallion Layer */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Medallion Layer
          </h3>
          {isEditing ? (
            <select
              value={editedData.medallion_layer}
              onChange={(e) => setEditedData({ ...editedData, medallion_layer: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select layer...</option>
              <option value="Source">Source</option>
              <option value="Raw">Raw</option>
              <option value="Bronze">Bronze</option>
              <option value="Silver">Silver</option>
              <option value="Gold">Gold</option>
              <option value="Unspecified">Unspecified</option>
            </select>
          ) : (
            <div
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-white font-medium"
              style={{ backgroundColor: MEDALLION_COLORS[data.medallion_layer] || '#9333ea' }}
            >
              {data.medallion_layer}
            </div>
          )}
        </div>

        {/* Dataset Type */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Dataset Type
          </h3>
          {isEditing ? (
            <select
              value={editedData.dataset_type}
              onChange={(e) => setEditedData({ ...editedData, dataset_type: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select type...</option>
              <option value="Table">Table</option>
              <option value="View">View</option>
              <option value="Dimension">Dimension</option>
              <option value="Fact">Fact</option>
              <option value="Hub">Hub</option>
              <option value="Link">Link</option>
              <option value="Satellite">Satellite</option>
              <option value="LinkSatellite">Link Satellite</option>
              <option value="Point In Time">Point In Time</option>
              <option value="Bridge">Bridge</option>
              <option value="Reference">Reference</option>
              <option value="Hierarchy Link">Hierarchy Link</option>
              <option value="Same as Link">Same as Link</option>
              <option value="Reference Satellite">Reference Satellite</option>
              <option value="File">File</option>
            </select>
          ) : (
            <p className="text-sm text-gray-900 dark:text-gray-100">
              {data.dataset_type || 'Not specified'}
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Description
          </h3>
          {isEditing ? (
            <textarea
              value={editedData.description}
              onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              placeholder="Enter dataset description..."
            />
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
              {data.description || 'No description provided'}
            </p>
          )}
        </div>

        {/* Sync Status */}
        {data.sync_status && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <GitBranch className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Source Control Status
              </h3>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Status:</span>
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${
                    data.sync_status === 'synced'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : data.sync_status === 'pending'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : data.sync_status === 'conflict'
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}
                >
                  {data.sync_status}
                </span>
              </div>
              {data.has_uncommitted_changes && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Changes:</span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                    Uncommitted
                  </span>
                </div>
              )}
              {data.last_synced_at && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Last Synced:</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {new Date(data.last_synced_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Statistics */}
        <div>
          <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Statistics
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Columns
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {data.columnCount || 0}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Relationships
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {data.relationshipCount || 0}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Upstream
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {data.lineageCount?.upstream || 0}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 px-3 py-2 rounded">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                Downstream
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {data.lineageCount?.downstream || 0}
              </div>
            </div>
          </div>
        </div>

        {/* AI Confidence Score */}
        {data.ai_confidence_score !== undefined && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              AI Confidence Score
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    data.ai_confidence_score >= 80
                      ? 'bg-green-500'
                      : data.ai_confidence_score >= 70
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                  }`}
                  style={{ width: `${data.ai_confidence_score}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                {data.ai_confidence_score}%
              </span>
            </div>
          </div>
        )}

        {/* Metadata */}
        {data.created_at && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Metadata
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">Created:</span>
                <span className="text-gray-900 dark:text-gray-100">
                  {new Date(data.created_at).toLocaleDateString()}
                </span>
              </div>
              {data.updated_at && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-gray-600 dark:text-gray-400">Updated:</span>
                  <span className="text-gray-900 dark:text-gray-100">
                    {new Date(data.updated_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
        {isEditing ? (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary flex-1 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
            <button
              onClick={handleDiscard}
              disabled={isSaving}
              className="btn-secondary flex-1 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="w-4 h-4" />
              Discard
            </button>
          </div>
        ) : (
          <button
            onClick={handleEdit}
            className="btn-primary w-full inline-flex items-center justify-center gap-2"
          >
            <Edit3 className="w-4 h-4" />
            Edit Dataset
          </button>
        )}
      </div>
    </div>
  );
}
