import { useState, useEffect } from 'react';
import { X, Save, FileCode, Type, FolderTree, Maximize2, Moon, Sun } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { MonacoEditorModal } from './MonacoEditorModal';
import { useStore } from '@/store/useStore';

interface FragmentEditorPanelProps {
  isOpen: boolean;
  fragmentId?: string;
  initialData?: {
    name: string;
    type: string;
    code: string;
  };
  onClose: () => void;
  onSave: (data: { name: string; type: string; code: string }) => void;
}

const FRAGMENT_TYPES = [
  { value: 'data_vault', label: 'Data Vault', color: 'text-blue-600' },
  { value: 'staging', label: 'Staging', color: 'text-green-600' },
  { value: 'dimensional', label: 'Dimensional', color: 'text-purple-600' },
  { value: 'utility', label: 'Utility', color: 'text-orange-600' },
  { value: 'custom', label: 'Custom', color: 'text-gray-600' },
];

export function FragmentEditorPanel({
  isOpen,
  fragmentId,
  initialData,
  onClose,
  onSave,
}: FragmentEditorPanelProps) {
  const [fragmentName, setFragmentName] = useState(initialData?.name || '');
  const [fragmentType, setFragmentType] = useState(initialData?.type || 'staging');
  const [jinjaCode, setJinjaCode] = useState(initialData?.code || '');
  const [isSaving, setIsSaving] = useState(false);
  const [showFullscreenEditor, setShowFullscreenEditor] = useState(false);
  const { isDarkMode, toggleDarkMode } = useStore();

  useEffect(() => {
    if (initialData) {
      setFragmentName(initialData.name);
      setFragmentType(initialData.type);
      setJinjaCode(initialData.code);
    }
  }, [initialData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave({
        name: fragmentName,
        type: fragmentType,
        code: jinjaCode,
      });
      onClose();
    } catch (error) {
      console.error('Error saving fragment:', error);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-[600px] bg-white dark:bg-gray-800 shadow-2xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-primary-50 dark:bg-primary-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <FileCode className="w-5 h-5 text-primary-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {fragmentId ? 'Edit' : 'Create'} Code Fragment
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-300">Define Jinja template fragment</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-300" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Fragment Name */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <Type className="w-4 h-4" />
              Fragment Name
            </label>
            <input
              type="text"
              value={fragmentName}
              onChange={(e) => setFragmentName(e.target.value)}
              placeholder="e.g., hub_table_create"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Fragment Type */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <FolderTree className="w-4 h-4" />
              Fragment Type
            </label>
            <select
              value={fragmentType}
              onChange={(e) => setFragmentType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {FRAGMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Jinja Code Editor */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                <FileCode className="w-4 h-4" />
                Jinja Template Code
              </label>
              <button
                onClick={() => setShowFullscreenEditor(true)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-primary-500 hover:bg-primary-50 rounded transition-colors"
                title="Open in fullscreen editor"
              >
                <Maximize2 className="w-3 h-3" />
                Fullscreen
              </button>
            </div>
            <div
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden cursor-pointer hover:border-primary-400 dark:hover:border-primary-500 transition-colors"
              style={{ minHeight: '400px' }}
              onDoubleClick={() => setShowFullscreenEditor(true)}
            >
              <Editor
                height="400px"
                defaultLanguage="jinja"
                language="jinja"
                value={jinjaCode}
                onChange={(value) => setJinjaCode(value || '')}
                theme={isDarkMode ? 'vs-dark' : 'vs-light'}
                options={{
                  minimap: { enabled: true },
                  fontSize: 13,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                  tabSize: 2,
                  folding: true,
                  bracketPairColorization: { enabled: true },
                }}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-300 mt-2">
              Double-click or click "Fullscreen" to open in fullscreen mode. Use {`{{ variable }}`} for variables and {`{% ... %}`} for logic.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!fragmentName || !jinjaCode || isSaving}
            className="btn-primary flex items-center gap-2 px-6"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Fragment'}
          </button>
        </div>
      </div>

      {/* Fullscreen Monaco Editor Modal */}
      <MonacoEditorModal
        isOpen={showFullscreenEditor}
        initialCode={jinjaCode}
        onClose={() => setShowFullscreenEditor(false)}
        onSave={(code) => {
          setJinjaCode(code);
          setShowFullscreenEditor(false);
        }}
        title={`Edit Template: ${fragmentName || 'Untitled'}`}
        isDarkMode={isDarkMode}
      />
    </>
  );
}
