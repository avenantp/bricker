/**
 * DiagramToolbar Component
 * Provides controls for diagram view (view mode, layout, search, filters, zoom)
 * Based on specification: docs/prp/051-dataset-diagram-view-specification.md
 */

import { useState } from 'react';
import {
  Search,
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Layout,
  GitBranch,
  Network,
  ChevronDown,
  ChevronUp,
  Save,
  RotateCcw,
} from 'lucide-react';
import { useDiagramStore } from '../../store/diagramStore';
import { useFilterToggle } from '../../hooks/useSearchAndFilter';
import type { LayoutType } from '../../types/diagram';

export function DiagramToolbar() {
  const {
    viewMode,
    layoutType,
    searchQuery,
    filters,
    isDirty,
    isSaving,
    toggleViewMode,
    setLayoutType,
    applyLayout,
    setSearchQuery,
    expandAllNodes,
    collapseAllNodes,
    resetViewport,
    resetFilters,
    saveState,
  } = useDiagramStore();

  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [isApplyingLayout, setIsApplyingLayout] = useState(false);

  // Filter toggle hooks
  const {
    toggleMedallionLayer,
    toggleEntityType,
    toggleHasRelationships,
    toggleHasLineage,
    setAiConfidenceMin,
  } = useFilterToggle();

  // Layout options
  const layoutOptions: { type: LayoutType; label: string; icon: string }[] = [
    { type: 'hierarchical', label: 'Hierarchical', icon: '📊' },
    { type: 'force', label: 'Force-Directed', icon: '🌐' },
    { type: 'circular', label: 'Circular', icon: '⭕' },
    { type: 'dagre', label: 'Dagre', icon: '🔀' },
  ];

  const handleLayoutChange = async (type: LayoutType) => {
    setIsApplyingLayout(true);
    try {
      await applyLayout(type);
    } catch (error) {
      console.error('Failed to apply layout:', error);
    } finally {
      setIsApplyingLayout(false);
      setShowLayoutMenu(false);
    }
  };

  const handleSave = async () => {
    try {
      await saveState(true); // Force immediate save
    } catch (error) {
      console.error('Failed to save diagram state:', error);
    }
  };

  const activeFiltersCount = Object.values(filters).filter((value) => {
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value > 0;
    if (typeof value === 'string') return value.length > 0;
    return false;
  }).length;

  return (
    <div className="diagram-toolbar bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-3 flex-wrap">
      {/* View Mode Toggle */}
      <div className="flex items-center gap-1 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
        <button
          onClick={toggleViewMode}
          className={`
            px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-2
            ${
              viewMode === 'relationships'
                ? 'bg-accent-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }
          `}
          title="Relationship View"
        >
          <Network className="w-4 h-4" />
          Relationships
        </button>
        <button
          onClick={toggleViewMode}
          className={`
            px-3 py-1.5 text-sm font-medium transition-colors flex items-center gap-2
            ${
              viewMode === 'lineage'
                ? 'bg-accent-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }
          `}
          title="Lineage View"
        >
          <GitBranch className="w-4 h-4" />
          Lineage
        </button>
      </div>

      <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

      {/* Layout Selector */}
      <div className="relative">
        <button
          onClick={() => setShowLayoutMenu(!showLayoutMenu)}
          disabled={isApplyingLayout}
          className="btn-secondary text-sm flex items-center gap-2 px-3 py-1.5"
          title="Change Layout"
        >
          <Layout className="w-4 h-4" />
          <span className="hidden sm:inline">
            {isApplyingLayout ? 'Applying...' : layoutOptions.find((opt) => opt.type === layoutType)?.label || 'Layout'}
          </span>
          <ChevronDown className="w-3 h-3" />
        </button>

        {showLayoutMenu && (
          <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-[160px]">
            {layoutOptions.map((option) => (
              <button
                key={option.type}
                onClick={() => handleLayoutChange(option.type)}
                className={`
                  w-full px-3 py-2 text-sm text-left flex items-center gap-2
                  hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors
                  ${option.type === layoutType ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' : ''}
                `}
              >
                <span>{option.icon}</span>
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

      {/* Search Input */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search datasets..."
          className="w-full pl-10 pr-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>

      {/* Filter Button */}
      <button
        onClick={() => setShowFilterPanel(!showFilterPanel)}
        className="btn-secondary text-sm flex items-center gap-2 px-3 py-1.5 relative"
        title="Filters"
      >
        <Filter className="w-4 h-4" />
        <span className="hidden sm:inline">Filters</span>
        {activeFiltersCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {activeFiltersCount}
          </span>
        )}
      </button>

      <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

      {/* Expand/Collapse All */}
      <div className="flex items-center gap-1">
        <button
          onClick={expandAllNodes}
          className="btn-icon p-1.5"
          title="Expand All Nodes"
        >
          <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
        <button
          onClick={collapseAllNodes}
          className="btn-icon p-1.5"
          title="Collapse All Nodes"
        >
          <ChevronUp className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

      {/* Zoom Controls - Note: These are placeholders. Actual zoom is handled by React Flow Controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => {
            // Zoom in handled by React Flow Controls component
            console.log('Use React Flow Controls for zoom in');
          }}
          className="btn-icon p-1.5 opacity-50 cursor-not-allowed"
          title="Zoom In (use controls at bottom-right)"
          disabled
        >
          <ZoomIn className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
        <button
          onClick={() => {
            // Zoom out handled by React Flow Controls component
            console.log('Use React Flow Controls for zoom out');
          }}
          className="btn-icon p-1.5 opacity-50 cursor-not-allowed"
          title="Zoom Out (use controls at bottom-right)"
          disabled
        >
          <ZoomOut className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
        <button
          onClick={resetViewport}
          className="btn-icon p-1.5"
          title="Fit to View"
        >
          <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

      {/* Reset Filters */}
      <button
        onClick={resetFilters}
        className="btn-icon p-1.5"
        title="Reset Filters"
      >
        <RotateCcw className="w-4 h-4 text-gray-600 dark:text-gray-400" />
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Save Status */}
      {isDirty && (
        <span className="text-xs text-gray-500 dark:text-gray-400">Unsaved changes</span>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="btn-primary text-sm px-3 py-1.5 flex items-center gap-2"
        title="Save Diagram State"
      >
        <Save className="w-4 h-4" />
        <span className="hidden sm:inline">{isSaving ? 'Saving...' : 'Save'}</span>
      </button>

      {/* Filter Panel (slide-down) */}
      {showFilterPanel && (
        <div className="absolute top-full left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-lg p-4 z-40">
          <div className="max-w-6xl mx-auto">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
              Filter Datasets
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Medallion Layer Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Medallion Layer
                </label>
                <div className="space-y-1">
                  {['Raw', 'Bronze', 'Silver', 'Gold'].map((layer) => (
                    <label key={layer} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={filters.medallionLayers.includes(layer as any)}
                        onChange={() => toggleMedallionLayer(layer)}
                        className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                      />
                      <span className="text-gray-700 dark:text-gray-300">{layer}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Entity Type Filter */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Entity Type
                </label>
                <div className="space-y-1">
                  {['Table', 'View', 'Materialized View', 'External Table'].map((type) => (
                    <label key={type} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={filters.entityTypes.includes(type as any)}
                        onChange={() => toggleEntityType(type)}
                        className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                      />
                      <span className="text-gray-700 dark:text-gray-300">{type}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Other Filters */}
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.hasRelationships || false}
                    onChange={toggleHasRelationships}
                    className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Has Relationships</span>
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.hasLineage || false}
                    onChange={toggleHasLineage}
                    className="rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">Has Lineage</span>
                </label>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Min AI Confidence
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="10"
                    value={filters.aiConfidenceMin || 0}
                    onChange={(e) => setAiConfidenceMin(Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {filters.aiConfidenceMin || 0}%
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                onClick={resetFilters}
                className="btn-secondary text-sm px-3 py-1.5"
              >
                Reset All
              </button>
              <button
                onClick={() => setShowFilterPanel(false)}
                className="btn-primary text-sm px-3 py-1.5"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
