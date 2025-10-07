import { useState, useRef, useEffect } from 'react';
import { X, Maximize2, Minimize2, Save } from 'lucide-react';
import Editor from '@monaco-editor/react';

interface MonacoEditorModalProps {
  isOpen: boolean;
  initialCode: string;
  onClose: () => void;
  onSave: (code: string) => void;
  title?: string;
  isDarkMode?: boolean;
}

export function MonacoEditorModal({
  isOpen,
  initialCode,
  onClose,
  onSave,
  title = 'Edit Jinja Template',
  isDarkMode = false,
}: MonacoEditorModalProps) {
  const [code, setCode] = useState(initialCode);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCode(initialCode);
  }, [initialCode]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isFullscreen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, isFullscreen]);

  const handleSave = () => {
    onSave(code);
    onClose();
  };

  const handleClose = () => {
    if (code !== initialCode) {
      if (window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className={`relative bg-white rounded-lg shadow-2xl flex flex-col transition-all ${
          isFullscreen
            ? 'w-screen h-screen rounded-none'
            : 'w-[90vw] h-[85vh] max-w-7xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-primary-50 dark:bg-primary-900/20 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <p className="text-xs text-gray-600">
                Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">Ctrl+S</kbd> to save,{' '}
                <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">Esc</kbd> to close
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-white rounded-lg transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5 text-gray-600" />
              ) : (
                <Maximize2 className="w-5 h-5 text-gray-600" />
              )}
            </button>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 overflow-hidden">
          <Editor
            height="100%"
            defaultLanguage="jinja"
            language="jinja"
            value={code}
            onChange={(value) => setCode(value || '')}
            theme={isDarkMode ? 'vs-dark' : 'vs-light'}
            options={{
              minimap: { enabled: true },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              wordWrap: 'on',
              automaticLayout: true,
              tabSize: 2,
              folding: true,
              bracketPairColorization: { enabled: true },
              formatOnPaste: true,
              formatOnType: true,
              renderWhitespace: 'selection',
              cursorBlinking: 'smooth',
              smoothScrolling: true,
              padding: { top: 16, bottom: 16 },
            }}
            onMount={(editor, monaco) => {
              // Add Ctrl+S / Cmd+S save shortcut
              editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                handleSave();
              });

              // Focus editor
              editor.focus();
            }}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="text-xs text-gray-600">
            {code.split('\n').length} lines • {code.length} characters
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-primary flex items-center gap-2 px-6"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
