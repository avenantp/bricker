/**
 * Node Filter Panel Component
 * Filter nodes by layer, type, subtype, and confidence score
 */

import { useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';
import type {
  MedallionLayer,
  EntityType,
  EntitySubtype,
} from '../../types/canvas';
import type { NodeFilters } from '../../types/node';

interface NodeFilterPanelProps {
  filters: NodeFilters;
  onFiltersChange: (filters: NodeFilters) => void;
  nodeCount: number;
  filteredNodeCount: number;
}

export function NodeFilterPanel({
  filters,
  onFiltersChange,
  nodeCount,
  filteredNodeCount,
}: NodeFilterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const medallionLayers: MedallionLayer[] = ['Raw', 'Bronze', 'Silver', 'Gold'];
  const entityTypes: EntityType[] = [
    'Table',
    'Staging',
    'PersistentStaging',
    'DataVault',
    'DataMart',
  ];
  const dataVaultSubtypes: EntitySubtype[] = [
    'Hub',
    'Link',
    'Satellite',
    'LinkSatellite',
    'PIT',
    'Bridge',
  ];
  const dataMartSubtypes: EntitySubtype[] = ['Dimension', 'Fact'];

  const handleLayerToggle = (layer: MedallionLayer) => {
    const currentLayers = filters.medallion_layers || [];
    const newLayers = currentLayers.includes(layer)
      ? currentLayers.filter((l) => l !== layer)
      : [...currentLayers, layer];

    onFiltersChange({ ...filters, medallion_layers: newLayers });
  };

  const handleTypeToggle = (type: EntityType) => {
    const currentTypes = filters.entity_types || [];
    const newTypes = currentTypes.includes(type)
      ? currentTypes.filter((t) => t !== type)
      : [...currentTypes, type];

    onFiltersChange({ ...filters, entity_types: newTypes });
  };

  const handleSubtypeToggle = (subtype: EntitySubtype) => {
    const currentSubtypes = filters.entity_subtypes || [];
    const newSubtypes = currentSubtypes.includes(subtype)
      ? currentSubtypes.filter((s) => s !== subtype)
      : [...currentSubtypes, subtype];

    onFiltersChange({ ...filters, entity_subtypes: newSubtypes });
  };

  const handleConfidenceScoreChange = (value: number) => {
    onFiltersChange({ ...filters, min_confidence_score: value });
  };

  const handleSearchChange = (query: string) => {
    onFiltersChange({ ...filters, search_query: query || undefined });
  };

  const handleShowPublicToggle = () => {
    onFiltersChange({
      ...filters,
      show_public_nodes: !filters.show_public_nodes,
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      medallion_layers: [],
      entity_types: [],
      entity_subtypes: [],
      min_confidence_score: undefined,
      show_public_nodes: false,
      search_query: undefined,
    });
  };

  const hasActiveFilters =
    (filters.medallion_layers?.length ?? 0) > 0 ||
    (filters.entity_types?.length ?? 0) > 0 ||
    (filters.entity_subtypes?.length ?? 0) > 0 ||
    filters.min_confidence_score !== undefined ||
    filters.show_public_nodes ||
    filters.search_query;

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">Filters</h3>
          <span className="text-xs text-gray-500">
            ({filteredNodeCount} of {nodeCount})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear All
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Search */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Search
            </label>
            <input
              type="text"
              value={filters.search_query || ''}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by name, FQN, or description..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Medallion Layers */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Medallion Layer
            </label>
            <div className="space-y-1">
              {medallionLayers.map((layer) => (
                <label
                  key={layer}
                  className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-50 p-1 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filters.medallion_layers?.includes(layer) || false}
                    onChange={() => handleLayerToggle(layer)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{layer}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Entity Types */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Entity Type
            </label>
            <div className="space-y-1">
              {entityTypes.map((type) => (
                <label
                  key={type}
                  className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-50 p-1 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filters.entity_types?.includes(type) || false}
                    onChange={() => handleTypeToggle(type)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Entity Subtypes */}
          {((filters.entity_types?.includes('DataVault') ?? false) ||
            (filters.entity_types?.includes('DataMart') ?? false)) && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Entity Subtype
              </label>
              <div className="space-y-1">
                {(filters.entity_types?.includes('DataVault') ?? false) && (
                  <>
                    <div className="text-xs font-medium text-gray-500 px-1 mt-2">
                      Data Vault
                    </div>
                    {dataVaultSubtypes.map((subtype) => (
                      <label
                        key={subtype}
                        className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-50 p-1 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={
                            filters.entity_subtypes?.includes(subtype) || false
                          }
                          onChange={() => handleSubtypeToggle(subtype)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{subtype}</span>
                      </label>
                    ))}
                  </>
                )}
                {(filters.entity_types?.includes('DataMart') ?? false) && (
                  <>
                    <div className="text-xs font-medium text-gray-500 px-1 mt-2">
                      Data Mart
                    </div>
                    {dataMartSubtypes.map((subtype) => (
                      <label
                        key={subtype}
                        className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-50 p-1 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={
                            filters.entity_subtypes?.includes(subtype) || false
                          }
                          onChange={() => handleSubtypeToggle(subtype)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span>{subtype}</span>
                      </label>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          {/* AI Confidence Score */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              Min. AI Confidence Score: {filters.min_confidence_score || 0}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={filters.min_confidence_score || 0}
              onChange={(e) =>
                handleConfidenceScoreChange(parseInt(e.target.value))
              }
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Show Public Nodes */}
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-700 hover:bg-gray-50 p-2 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={filters.show_public_nodes || false}
                onChange={handleShowPublicToggle}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="font-medium">Show public nodes</div>
                <div className="text-xs text-gray-500">
                  Include nodes from other projects
                </div>
              </div>
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
