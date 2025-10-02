import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Database, Table2, Layers, Link2 } from 'lucide-react';

export const TableNode = memo(({ data, selected }: NodeProps) => {
  const getIcon = () => {
    switch (data.table_type) {
      case 'source':
        return <Database className="w-4 h-4" />;
      case 'dimension':
        return <Table2 className="w-4 h-4" />;
      case 'fact':
        return <Layers className="w-4 h-4" />;
      case 'hub':
      case 'link':
      case 'satellite':
        return <Link2 className="w-4 h-4" />;
      default:
        return <Table2 className="w-4 h-4" />;
    }
  };

  const getColor = () => {
    switch (data.table_type) {
      case 'source':
        return 'bg-gray-100 border-gray-400 text-gray-700';
      case 'dimension':
        return 'bg-blue-50 border-blue-400 text-blue-700';
      case 'fact':
        return 'bg-purple-50 border-purple-400 text-purple-700';
      case 'hub':
        return 'bg-green-50 border-green-400 text-green-700';
      case 'link':
        return 'bg-yellow-50 border-yellow-400 text-yellow-700';
      case 'satellite':
        return 'bg-orange-50 border-orange-400 text-orange-700';
      default:
        return 'bg-white border-gray-300 text-gray-700';
    }
  };

  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 min-w-[200px] shadow-md ${getColor()} ${
        selected ? 'ring-2 ring-primary-500 ring-offset-2' : ''
      } transition-all hover:shadow-lg`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3" />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        {getIcon()}
        <div className="font-semibold text-sm">{data.label || 'Untitled Table'}</div>
      </div>

      {/* Metadata */}
      {data.table_type && (
        <div className="text-xs opacity-75 mb-2">
          {data.table_type.charAt(0).toUpperCase() + data.table_type.slice(1)}
          {data.scd_type && ` (SCD Type ${data.scd_type})`}
        </div>
      )}

      {/* Columns Preview */}
      {data.columns && data.columns.length > 0 && (
        <div className="mt-2 pt-2 border-t border-current/20">
          <div className="text-xs font-medium mb-1">Columns ({data.columns.length})</div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {data.columns.slice(0, 5).map((col: any, idx: number) => (
              <div key={idx} className="text-xs opacity-75 flex items-center gap-1">
                <span className="font-mono">{col.name}</span>
                {col.is_primary_key && (
                  <span className="px-1 bg-current/20 rounded text-[10px]">PK</span>
                )}
                {col.is_foreign_key && (
                  <span className="px-1 bg-current/20 rounded text-[10px]">FK</span>
                )}
              </div>
            ))}
            {data.columns.length > 5 && (
              <div className="text-xs opacity-50 italic">
                +{data.columns.length - 5} more...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Optimizations Badge */}
      {data.optimizations && (
        <div className="mt-2 pt-2 border-t border-current/20">
          <div className="flex flex-wrap gap-1">
            {data.optimizations.liquid_clustering && (
              <span className="px-1.5 py-0.5 bg-current/20 rounded text-[10px]">
                Liquid Clustering
              </span>
            )}
            {data.optimizations.partitioning && (
              <span className="px-1.5 py-0.5 bg-current/20 rounded text-[10px]">
                Partitioned
              </span>
            )}
            {data.optimizations.change_data_feed && (
              <span className="px-1.5 py-0.5 bg-current/20 rounded text-[10px]">
                CDF
              </span>
            )}
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
});

TableNode.displayName = 'TableNode';
