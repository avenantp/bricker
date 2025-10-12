import { X, Table2 } from 'lucide-react';
import { useStore } from '@/store/useStore';

export function PropertiesPanel() {
  const { selectedNodeId, nodes, isPropertiesPanelOpen, togglePropertiesPanel } =
    useStore();

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  if (!isPropertiesPanelOpen) {
    return null;
  }

  return (
    <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700">Properties</h2>
        <button
          onClick={togglePropertiesPanel}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <X className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {!selectedNode ? (
          <div className="text-sm text-gray-500 text-center py-8">
            Select a node to view properties
          </div>
        ) : (
          <div className="space-y-4">
            {/* Node Info */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Table2 className="w-5 h-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">
                  {selectedNode.data?.label || selectedNode.id}
                </h3>
              </div>

              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-500">Type:</span>{' '}
                  <span className="font-medium text-gray-900">
                    {selectedNode.type || 'default'}
                  </span>
                </div>
                {selectedNode.data?.table_type && (
                  <div>
                    <span className="text-gray-500">Table Type:</span>{' '}
                    <span className="font-medium text-gray-900">
                      {selectedNode.data.table_type}
                    </span>
                  </div>
                )}
                {selectedNode.data?.scd_type && (
                  <div>
                    <span className="text-gray-500">SCD Type:</span>{' '}
                    <span className="font-medium text-gray-900">
                      Type {selectedNode.data.scd_type}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Columns */}
            {selectedNode.data?.columns && (
              <div className="pt-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2">
                  Columns ({selectedNode.data.columns.length})
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedNode.data.columns.map((col: any, idx: number) => (
                    <div
                      key={idx}
                      className="p-2 bg-gray-50 rounded border border-gray-200"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-sm text-gray-900">
                          {col.name}
                        </span>
                        <div className="flex gap-1">
                          {col.is_primary_key && (
                            <span className="px-1.5 py-0.5 bg-primary-100 text-primary-700 rounded text-xs">
                              PK
                            </span>
                          )}
                          {col.is_foreign_key && (
                            <span className="px-1.5 py-0.5 bg-secondary-100 text-secondary-700 rounded text-xs">
                              FK
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">{col.type}</div>
                      {col.description && (
                        <div className="text-xs text-gray-400 mt-1">
                          {col.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optimizations */}
            {selectedNode.data?.optimizations && (
              <div className="pt-4 border-t border-gray-200">
                <h4 className="font-medium text-gray-900 mb-2">
                  Optimizations
                </h4>
                <div className="space-y-2 text-sm">
                  {selectedNode.data.optimizations.liquid_clustering && (
                    <div className="p-2 bg-green-50 border border-green-200 rounded">
                      <div className="font-medium text-green-900">
                        Liquid Clustering
                      </div>
                      <div className="text-xs text-green-700 mt-1">
                        Columns:{' '}
                        {Array.isArray(
                          selectedNode.data.optimizations.liquid_clustering
                        )
                          ? selectedNode.data.optimizations.liquid_clustering.join(
                              ', '
                            )
                          : selectedNode.data.optimizations.liquid_clustering}
                      </div>
                    </div>
                  )}
                  {selectedNode.data.optimizations.partitioning && (
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                      <div className="font-medium text-blue-900">Partitioning</div>
                      <div className="text-xs text-blue-700 mt-1">
                        {selectedNode.data.optimizations.partitioning}
                      </div>
                    </div>
                  )}
                  {selectedNode.data.optimizations.change_data_feed && (
                    <div className="p-2 bg-purple-50 border border-purple-200 rounded">
                      <div className="font-medium text-purple-900">
                        Change Data Feed
                      </div>
                      <div className="text-xs text-purple-700 mt-1">Enabled</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
