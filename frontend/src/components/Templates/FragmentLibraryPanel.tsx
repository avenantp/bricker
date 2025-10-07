import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  FolderOpen,
  Folder,
  Plus,
  Database,
  Layers,
  Box,
  Wrench,
} from 'lucide-react';

interface CodeFragment {
  id: string;
  name: string;
  type: string;
  code: string;
}

interface FragmentLibraryPanelProps {
  fragments: CodeFragment[];
  onFragmentClick: (fragment: CodeFragment) => void;
  onAddFragment: () => void;
  selectedFragmentId?: string;
}

const FRAGMENT_CATEGORIES = [
  {
    id: 'data_vault',
    label: 'Data Vault',
    icon: Database,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    description: 'Hubs, Links, Satellites, PITs, Bridges',
  },
  {
    id: 'staging',
    label: 'Staging',
    icon: Layers,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    description: 'Landing, Raw, Staging tables',
  },
  {
    id: 'dimensional',
    label: 'Dimensional',
    icon: Box,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    description: 'Facts, Dimensions, Data Marts',
  },
  {
    id: 'utility',
    label: 'Utility',
    icon: Wrench,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    description: 'Common utilities and helpers',
  },
];

export function FragmentLibraryPanel({
  fragments,
  onFragmentClick,
  onAddFragment,
  selectedFragmentId,
}: FragmentLibraryPanelProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['data_vault', 'staging', 'dimensional', 'utility'])
  );

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getFragmentsByType = (type: string) => {
    return fragments.filter((f) => f.type === type);
  };

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Fragment Library</h3>
          <button
            onClick={onAddFragment}
            className="btn-primary p-1.5"
            title="Add new fragment"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-300">Drag fragments to canvas</p>
      </div>

      {/* Fragment Categories */}
      <div className="flex-1 overflow-y-auto p-2">
        {FRAGMENT_CATEGORIES.map((category) => {
          const Icon = category.icon;
          const categoryFragments = getFragmentsByType(category.id);
          const isExpanded = expandedCategories.has(category.id);

          return (
            <div key={category.id} className="mb-2">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${category.bgColor} dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600`}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                  {isExpanded ? (
                    <FolderOpen className={`w-4 h-4 ${category.color}`} />
                  ) : (
                    <Folder className={`w-4 h-4 ${category.color}`} />
                  )}
                  <div className="flex flex-col items-start">
                    <span className={`text-sm font-medium ${category.color} dark:brightness-125`}>
                      {category.label}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-300">{categoryFragments.length} fragments</span>
                  </div>
                </div>
              </button>

              {/* Category Items */}
              {isExpanded && (
                <div className="ml-6 mt-1 space-y-1">
                  {categoryFragments.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-500 dark:text-gray-300 italic">
                      No fragments yet
                    </div>
                  ) : (
                    categoryFragments.map((fragment) => (
                      <button
                        key={fragment.id}
                        onClick={() => onFragmentClick(fragment)}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('application/reactflow', 'codeFragment');
                          e.dataTransfer.setData('fragment-data', JSON.stringify(fragment));
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all cursor-pointer hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:border-primary-200 dark:hover:border-primary-700 border border-transparent ${
                          selectedFragmentId === fragment.id
                            ? 'bg-primary-100 dark:bg-primary-900/30 border-primary-300 dark:border-primary-600'
                            : 'bg-white dark:bg-gray-700/50'
                        }`}
                      >
                        <FileCode className={`w-3.5 h-3.5 flex-shrink-0 ${category.color} dark:brightness-125`} />
                        <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1 text-left">
                          {fragment.name}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <p className="text-xs text-gray-600 dark:text-gray-300">
          <span className="font-medium">{fragments.length}</span> total fragments
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
          Drag fragments to the canvas to build your template
        </p>
      </div>
    </div>
  );
}
