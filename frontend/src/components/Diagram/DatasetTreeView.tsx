/**
 * Dataset TreeView Component
 * Two-level tree view for diagram navigation:
 * - Level 1: Medallion Layer
 * - Level 2: Datasets within that layer
 *
 * Shows ALL workspace datasets with indicators for which are in the current diagram
 */

import { useState, useMemo, useEffect } from 'react';
import { ChevronRight, ChevronDown, Database, Search, CheckCircle2 } from 'lucide-react';
import { useDatasets, useDiagramDatasets } from '../../hooks/useDatasets';
import { useDiagramStore } from '../../store/diagramStore';
import { MEDALLION_TAILWIND_COLORS } from '../../types/canvas';
import type { Dataset } from '../../types/dataset';
import type { MedallionLayer } from '../../types/canvas';

interface DatasetTreeViewProps {
  className?: string;
  workspaceId?: string;
  diagramId?: string;
}

interface LayerGroup {
  layer: MedallionLayer;
  datasets: Dataset[];
  isExpanded: boolean;
}

// LocalStorage key for persisting tree state
const getTreeStateKey = (workspaceId: string, diagramId: string) =>
  `uroq_diagram_tree_state_${workspaceId}_${diagramId}`;

export function DatasetTreeView({ className = '', workspaceId, diagramId }: DatasetTreeViewProps) {
  const { setSelectedDatasetId, selectedDatasetId, addNodeToDiagram } = useDiagramStore();

  // Fetch all workspace datasets
  const { data: workspaceDatasets = [], isLoading: datasetsLoading, error: datasetsError } = useDatasets(workspaceId);

  // Fetch datasets in this specific diagram
  const { data: diagramDatasetIds = new Set<string>(), isLoading: diagramDatasetsLoading } = useDiagramDatasets(diagramId);

  // Debug logging
  useEffect(() => {
    console.log('[DatasetTreeView] Data state:', {
      workspaceId,
      diagramId,
      workspaceDatasets,
      workspaceDatasetsCount: workspaceDatasets?.length || 0,
      diagramDatasetIds,
      diagramDatasetIdsCount: diagramDatasetIds?.size || 0,
      datasetsLoading,
      diagramDatasetsLoading,
      datasetsError
    });
  }, [workspaceDatasets, diagramDatasetIds, datasetsLoading, diagramDatasetsLoading, datasetsError, workspaceId, diagramId]);

  // Load expanded layers from localStorage
  const [expandedLayers, setExpandedLayers] = useState<Set<MedallionLayer>>(() => {
    if (!workspaceId || !diagramId) {
      return new Set(['Source', 'Raw', 'Bronze', 'Silver', 'Gold', 'Unspecified' as MedallionLayer]);
    }
    const storageKey = getTreeStateKey(workspaceId, diagramId);
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return new Set(parsed);
      } catch (e) {
        console.error('Failed to parse tree state from localStorage', e);
      }
    }
    // Default: all layers expanded (including Unspecified)
    return new Set(['Source', 'Raw', 'Bronze', 'Silver', 'Gold', 'Unspecified' as MedallionLayer]);
  });

  const [searchQuery, setSearchQuery] = useState('');

  const isLoading = datasetsLoading || diagramDatasetsLoading;

  // Show error state if required props are missing
  if (!workspaceId || !diagramId) {
    return (
      <div className={`flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 ${className}`}>
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
            Datasets
          </h2>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-2">Missing Configuration</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Workspace or Diagram ID not provided
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Persist expanded layers to localStorage
  useEffect(() => {
    const storageKey = getTreeStateKey(workspaceId, diagramId);
    localStorage.setItem(storageKey, JSON.stringify(Array.from(expandedLayers)));
  }, [expandedLayers, workspaceId, diagramId]);

  // Group datasets by medallion layer
  const layerGroups = useMemo<LayerGroup[]>(() => {
    const layers: MedallionLayer[] = ['Source', 'Raw', 'Bronze', 'Silver', 'Gold'];

    console.log('[DatasetTreeView] Grouping datasets:', {
      workspaceDatasets,
      datasetsWithLayers: workspaceDatasets.map(d => ({
        id: d.id,
        name: d.name,
        medallion_layer: d.medallion_layer
      }))
    });

    const groups = layers.map((layer) => {
      const datasets = workspaceDatasets.filter((dataset) => {
        const matchesLayer = dataset.medallion_layer === layer;
        const matchesSearch = searchQuery.trim() === '' ||
          dataset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (dataset.fully_qualified_name && dataset.fully_qualified_name.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesLayer && matchesSearch;
      });

      return {
        layer,
        datasets,
        isExpanded: expandedLayers.has(layer),
      };
    }).filter(group => group.datasets.length > 0); // Only show layers with datasets

    // Add "Unspecified" group for datasets without a medallion layer
    const unspecifiedDatasets = workspaceDatasets.filter((dataset) => {
      const hasNoLayer = !dataset.medallion_layer || !layers.includes(dataset.medallion_layer as MedallionLayer);
      const matchesSearch = searchQuery.trim() === '' ||
        dataset.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (dataset.fully_qualified_name && dataset.fully_qualified_name.toLowerCase().includes(searchQuery.toLowerCase()));
      return hasNoLayer && matchesSearch;
    });

    if (unspecifiedDatasets.length > 0) {
      groups.push({
        layer: 'Unspecified' as MedallionLayer,
        datasets: unspecifiedDatasets,
        isExpanded: expandedLayers.has('Unspecified' as MedallionLayer),
      });
    }

    console.log('[DatasetTreeView] Layer groups created:', {
      groupsCount: groups.length,
      groups: groups.map(g => ({ layer: g.layer, datasetCount: g.datasets.length }))
    });

    return groups;
  }, [workspaceDatasets, expandedLayers, searchQuery]);

  // Toggle layer expansion
  const toggleLayer = (layer: MedallionLayer) => {
    setExpandedLayers((prev) => {
      const next = new Set(prev);
      if (next.has(layer)) {
        next.delete(layer);
      } else {
        next.add(layer);
      }
      return next;
    });
  };

  // Handle dataset click - selects dataset, adds to diagram if not present
  const handleDatasetClick = (datasetId: string) => {
    const dataset = workspaceDatasets.find((d) => d.id === datasetId);
    if (!dataset) {
      console.warn('[DatasetTreeView] Dataset not found:', datasetId);
      return;
    }

    console.log('[DatasetTreeView] Dataset clicked:', {
      datasetId,
      datasetName: dataset.name,
      isInDiagram: diagramDatasetIds.has(datasetId)
    });

    // Check if dataset is already in the diagram
    const isInDiagram = diagramDatasetIds.has(datasetId);

    if (!isInDiagram) {
      console.log('[DatasetTreeView] Adding dataset to diagram:', { datasetId, dataset });

      // Create a diagram node from the dataset
      const newNode: any = {
        id: datasetId,
        type: 'dataset',
        position: { x: 0, y: 0 }, // Will be repositioned by swimlane logic
        data: {
          name: dataset.name,
          fqn: dataset.fully_qualified_name || dataset.name,
          medallion_layer: dataset.medallion_layer || 'Unspecified',
          dataset_type: dataset.dataset_type || 'table',
          description: dataset.description,
          sync_status: dataset.sync_status,
          has_uncommitted_changes: dataset.has_uncommitted_changes,
          last_synced_at: dataset.last_synced_at,
          created_at: dataset.created_at,
          updated_at: dataset.updated_at,
          columnCount: 0, // TODO: Get from actual column data
          relationshipCount: 0, // TODO: Calculate from edges
          lineageCount: { upstream: 0, downstream: 0 }, // TODO: Calculate from edges
        },
      };

      // Add the node to the store
      const { addNode } = useDiagramStore.getState();
      addNode(newNode);

      // Then position it in the diagram
      setTimeout(() => {
        addNodeToDiagram(datasetId);
      }, 0);
    }

    // Select the dataset
    console.log('[DatasetTreeView] Selecting dataset:', datasetId);
    setSelectedDatasetId(datasetId);
  };

  // Handle drag start for datasets not in diagram
  const handleDragStart = (e: React.DragEvent, datasetId: string) => {
    const dataset = workspaceDatasets.find((d) => d.id === datasetId);
    if (!dataset) return;

    // Only allow dragging if dataset is not in diagram
    const isInDiagram = diagramDatasetIds.has(datasetId);
    if (isInDiagram) {
      e.preventDefault();
      return;
    }

    // Set drag data
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('application/reactflow', 'dataset');
    e.dataTransfer.setData('application/dataset-id', datasetId);
  };

  // Get layer color badge
  const getLayerBadgeColor = (layer: MedallionLayer | 'Unspecified'): string => {
    const colorMap: Record<string, string> = {
      Source: 'bg-gray-700 text-white',
      Raw: 'bg-gray-500 text-white',
      Bronze: 'bg-amber-700 text-white',
      Silver: 'bg-gray-400 text-white',
      Gold: 'bg-yellow-500 text-gray-900',
      Unspecified: 'bg-purple-600 text-white',
    };
    return colorMap[layer] || 'bg-gray-500 text-white';
  };

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Datasets
        </h2>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search datasets..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {isLoading ? (
          <div className="text-center py-8 px-4">
            <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-3"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading datasets...</p>
          </div>
        ) : datasetsError ? (
          <div className="text-center py-8 px-4">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-2">Error loading datasets</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{datasetsError.message}</p>
          </div>
        ) : layerGroups.length === 0 ? (
          <div className="text-center py-8 px-4">
            <Database className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No datasets match your search' : 'No datasets found'}
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {layerGroups.map((group) => (
              <div key={group.layer}>
                {/* Layer Header */}
                <button
                  onClick={() => toggleLayer(group.layer)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  {group.isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  )}
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium ${getLayerBadgeColor(group.layer)}`}
                  >
                    {group.layer}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({group.datasets.length})
                  </span>
                </button>

                {/* Datasets List */}
                {group.isExpanded && (
                  <div className="ml-6 mt-1 space-y-0.5">
                    {group.datasets.map((dataset) => {
                      const isSelected = selectedDatasetId === dataset.id;
                      const isInDiagram = diagramDatasetIds.has(dataset.id);

                      return (
                        <button
                          key={dataset.id}
                          onClick={() => handleDatasetClick(dataset.id)}
                          draggable={!isInDiagram}
                          onDragStart={(e) => handleDragStart(e, dataset.id)}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${
                            isSelected
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                              : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                          } ${!isInDiagram ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                          title={dataset.fully_qualified_name || dataset.name}
                        >
                          <div className="flex-1 min-w-0">
                            <div className={`text-sm truncate ${
                              isSelected ? 'font-semibold' : 'font-medium'
                            }`}>
                              {dataset.name}
                            </div>
                          </div>
                          {isInDiagram && (
                            <CheckCircle2 className="w-4 h-4 text-green-500 dark:text-green-400 flex-shrink-0" title="In diagram" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <div className="flex justify-between">
            <span>Total Datasets:</span>
            <span className="font-semibold text-gray-900 dark:text-gray-100">{workspaceDatasets.length}</span>
          </div>
          <div className="flex justify-between">
            <span>In Diagram:</span>
            <span className="font-semibold text-green-600 dark:text-green-400">{diagramDatasetIds.size}</span>
          </div>
          {searchQuery && (
            <div className="flex justify-between">
              <span>Filtered:</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400">
                {layerGroups.reduce((sum, group) => sum + group.datasets.length, 0)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
