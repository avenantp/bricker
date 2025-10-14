import { useState } from 'react';
import Editor from '@monaco-editor/react';
import { X, Download, Copy, Check, Eye, Code2 } from 'lucide-react';
import { renderTemplate } from '../../services/template-compiler';

interface TemplatePreviewProps {
  compiledTemplate: string;
  templateName: string;
  onClose: () => void;
  onDownload: () => void;
}

export default function TemplatePreview({
  compiledTemplate,
  templateName,
  onClose,
  onDownload,
}: TemplatePreviewProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [showRendered, setShowRendered] = useState(false);
  const [variables, setVariables] = useState<Record<string, any>>({});
  const [renderedTemplate, setRenderedTemplate] = useState('');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(compiledTemplate);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleRender = () => {
    try {
      const result = renderTemplate(compiledTemplate, variables);
      setRenderedTemplate(result);
      setShowRendered(true);
    } catch (error) {
      console.error('Rendering error:', error);
      alert('Failed to render template. Check console for details.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-blue-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Template Preview</h2>
              <p className="text-sm text-gray-500">{templateName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRendered(!showRendered)}
              className={`
                px-3 py-1.5 text-sm rounded-lg transition-colors flex items-center gap-2
                ${showRendered
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <Code2 className="w-4 h-4" />
              {showRendered ? 'Show Template' : 'Render Preview'}
            </button>

            <button
              onClick={handleCopy}
              className="btn-secondary flex items-center gap-2"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy</span>
                </>
              )}
            </button>

            <button
              onClick={onDownload}
              className="btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Download className="w-4 h-4" />
              Download
            </button>

            <button
              onClick={onClose}
              className="btn-icon"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {showRendered ? (
            <div className="h-full flex">
              {/* Variables Panel */}
              <div className="w-80 border-r border-gray-200 p-4 overflow-y-auto">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Template Variables
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      table_name
                    </label>
                    <input
                      type="text"
                      value={variables.table_name || ''}
                      onChange={(e) =>
                        setVariables({ ...variables, table_name: e.target.value })
                      }
                      placeholder="my_table"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      schema_name
                    </label>
                    <input
                      type="text"
                      value={variables.schema_name || ''}
                      onChange={(e) =>
                        setVariables({ ...variables, schema_name: e.target.value })
                      }
                      placeholder="staging"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      catalog_name
                    </label>
                    <input
                      type="text"
                      value={variables.catalog_name || ''}
                      onChange={(e) =>
                        setVariables({ ...variables, catalog_name: e.target.value })
                      }
                      placeholder="main"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    onClick={handleRender}
                    className="btn-primary w-full"
                  >
                    Render Template
                  </button>
                </div>
              </div>

              {/* Rendered Output */}
              <div className="flex-1 overflow-hidden">
                <Editor
                  height="100%"
                  language="sql"
                  value={renderedTemplate}
                  theme="vs-light"
                  options={{
                    readOnly: true,
                    minimap: { enabled: true },
                    fontSize: 13,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    wordWrap: 'on',
                  }}
                />
              </div>
            </div>
          ) : (
            <Editor
              height="100%"
              language="sql"
              value={compiledTemplate}
              theme="vs-light"
              options={{
                readOnly: true,
                minimap: { enabled: true },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
              }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <div>
              Lines: {compiledTemplate.split('\n').length} | Characters:{' '}
              {compiledTemplate.length}
            </div>
            <div>Language: SQL (Jinja2)</div>
          </div>
        </div>
      </div>
    </div>
  );
}
