/**
 * Node Search Panel Component
 * Search and quick access to nodes
 */

import { useState, useEffect } from 'react';
import { Search, X, ChevronRight, Loader } from 'lucide-react';
import type { Node } from '../../types/node';
import { ENTITY_ICONS } from '../../types/canvas';

interface NodeSearchPanelProps {
  nodes: Node[];
  onNodeSelect: (nodeUuid: string) => void;
  isLoading?: boolean;
}

export function NodeSearchPanel({
  nodes,
  onNodeSelect,
  isLoading = false,
}: NodeSearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredNodes, setFilteredNodes] = useState<Node[]>(nodes);

  // Filter nodes based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredNodes(nodes);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = nodes.filter(
      (node) =>
        node.name.toLowerCase().includes(query) ||
        node.fqn.toLowerCase().includes(query) ||
        node.description?.toLowerCase().includes(query) ||
        node.entity_type.toLowerCase().includes(query) ||
        node.entity_subtype?.toLowerCase().includes(query)
    );

    setFilteredNodes(filtered);
  }, [searchQuery, nodes]);

  const handleClear = () => {
    setSearchQuery('');
  };

  const getNodeIcon = (node: Node): string => {
    if (node.entity_subtype && ENTITY_ICONS[node.entity_subtype]) {
      return ENTITY_ICONS[node.entity_subtype];
    }
    return ENTITY_ICONS[node.entity_type] || ENTITY_ICONS.Table;
  };

  const getMedallionColor = (layer: string): string => {
    const colors: Record<string, string> = {
      Raw: 'bg-gray-100 text-gray-700',
      Bronze: 'bg-amber-100 text-amber-800',
      Silver: 'bg-gray-200 text-gray-800',
      Gold: 'bg-yellow-100 text-yellow-800',
    };
    return colors[layer] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden h-full flex flex-col">
      {/* Search Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes..."
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          {searchQuery && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="mt-2 text-xs text-gray-500">
          {filteredNodes.length} of {nodes.length} nodes
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader className="w-6 h-6 text-gray-400 animate-spin" />
          </div>
        ) : filteredNodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <Search className="w-8 h-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-500">
              {searchQuery ? 'No nodes found' : 'No nodes in project'}
            </p>
            {searchQuery && (
              <p className="text-xs text-gray-400 mt-1">
                Try a different search term
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredNodes.map((node) => (
              <button
                key={node.uuid}
                onClick={() => onNodeSelect(node.uuid)}
                className="w-full p-3 hover:bg-gray-50 transition-colors text-left group"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="text-2xl flex-shrink-0 mt-0.5">
                    {getNodeIcon(node)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Name */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {node.name}
                      </span>
                      <ChevronRight className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>

                    {/* FQN */}
                    <div className="text-xs text-gray-500 font-mono truncate mt-0.5">
                      {node.fqn}
                    </div>

                    {/* Badges */}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span
                        className={`px-1.5 py-0.5 text-xs font-medium rounded ${getMedallionColor(
                          node.medallion_layer
                        )}`}
                      >
                        {node.medallion_layer}
                      </span>
                      <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-100 text-blue-700">
                        {node.entity_subtype || node.entity_type}
                      </span>
                      {node.ai_confidence_score !== undefined &&
                        node.ai_confidence_score < 80 && (
                          <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-yellow-100 text-yellow-700">
                            AI: {node.ai_confidence_score}%
                          </span>
                        )}
                    </div>

                    {/* Description */}
                    {node.description && (
                      <div className="text-xs text-gray-600 mt-1.5 line-clamp-2">
                        {node.description}
                      </div>
                    )}

                    {/* Node Items Count */}
                    {node.node_items && node.node_items.length > 0 && (
                      <div className="text-xs text-gray-500 mt-1">
                        {node.node_items.length} column
                        {node.node_items.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
