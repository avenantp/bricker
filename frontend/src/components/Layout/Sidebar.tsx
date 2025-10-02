import {
  Database,
  Table2,
  Layers,
  Link2,
  FileCode,
  History,
  Plus,
} from 'lucide-react';
import { useStore } from '@/store/useStore';

export function Sidebar() {
  const { models, currentModel, setCurrentModel } = useStore();

  const tools = [
    { icon: Database, label: 'Source', type: 'source' },
    { icon: Table2, label: 'Dimension', type: 'dimension' },
    { icon: Layers, label: 'Fact', type: 'fact' },
    { icon: Link2, label: 'Hub', type: 'hub' },
    { icon: Link2, label: 'Link', type: 'link' },
    { icon: Link2, label: 'Satellite', type: 'satellite' },
  ];

  const handleDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Tools Section */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Node Types</h2>
        <div className="space-y-2">
          {tools.map((tool) => (
            <div
              key={tool.type}
              draggable
              onDragStart={(e) => handleDragStart(e, tool.type)}
              className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 hover:border-primary-400 hover:bg-primary-50 cursor-move transition-colors"
            >
              <tool.icon className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-700">{tool.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Models Section */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700">Models</h2>
          <button
            className="p-1 hover:bg-gray-100 rounded transition-colors"
            title="New Model"
          >
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
        </div>

        {models.length === 0 ? (
          <div className="text-xs text-gray-500 text-center py-8">
            No models yet.
            <br />
            Use AI assistant to create one!
          </div>
        ) : (
          <div className="space-y-2">
            {models.map((model) => (
              <button
                key={model.id}
                onClick={() => setCurrentModel(model)}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  currentModel?.id === model.id
                    ? 'border-primary-400 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <FileCode className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {model.name}
                    </div>
                    {model.description && (
                      <div className="text-xs text-gray-500 truncate mt-1">
                        {model.description}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                      <span>{model.nodes.length} nodes</span>
                      <span>•</span>
                      <span>{model.edges.length} edges</span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* History Section */}
      <div className="p-4 border-t border-gray-200">
        <button className="w-full flex items-center gap-2 p-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
          <History className="w-4 h-4" />
          <span>Version History</span>
        </button>
      </div>
    </div>
  );
}
