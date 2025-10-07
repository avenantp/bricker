import { Message } from '@/store/types';
import { User, Sparkles, CheckCircle2, Download, Copy } from 'lucide-react';
import { useStore } from '@/store/useStore';
import ReactMarkdown from 'react-markdown';

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { setNodes, setEdges } = useStore();

  const isUser = message.role === 'user';

  const handleApplySuggestion = () => {
    if (!message.suggestion) return;

    const { nodes, edges } = message.suggestion.reactflow_model;
    setNodes(nodes);
    setEdges(edges);

    // Show success notification
    // TODO: Add toast notification
    console.log('Applied suggestion to canvas');
  };

  const handleCopyYaml = () => {
    if (!message.suggestion?.yaml_metadata) return;

    navigator.clipboard.writeText(message.suggestion.yaml_metadata);
    // TODO: Add toast notification
    console.log('Copied YAML to clipboard');
  };

  const handleDownloadTemplate = (template: any) => {
    const blob = new Blob([template.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.type}_template.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg p-4 ${
          isUser
            ? 'bg-primary-600 text-white dark:text-gray-900'
            : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
        }`}
      >
        {/* Message Header */}
        <div className="flex items-center gap-2 mb-2">
          {isUser ? (
            <User className="w-4 h-4" />
          ) : (
            <Sparkles className="w-4 h-4 text-secondary-600" />
          )}
          <span className="text-xs font-medium opacity-80">
            {isUser ? 'You' : 'AI Data Architect'}
          </span>
        </div>

        {/* Message Content */}
        <div className={`prose prose-sm max-w-none ${isUser ? 'prose-invert' : ''}`}>
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        {/* Suggestion Card */}
        {message.suggestion && (
          <div className="mt-4 p-4 bg-white rounded-lg border-2 border-primary-200 text-gray-900">
            <h4 className="font-semibold mb-3 flex items-center gap-2 text-primary-700">
              <CheckCircle2 className="w-5 h-5" />
              Generated Model
            </h4>

            <div className="space-y-3 text-sm">
              {/* Model Summary */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-50 p-2 rounded">
                  <span className="font-medium">Nodes:</span>{' '}
                  {message.suggestion.reactflow_model.nodes.length}
                </div>
                <div className="bg-gray-50 p-2 rounded">
                  <span className="font-medium">Relationships:</span>{' '}
                  {message.suggestion.reactflow_model.edges.length}
                </div>
              </div>

              {/* Node List */}
              <div>
                <div className="font-medium text-xs text-gray-600 mb-1">
                  Tables:
                </div>
                <div className="flex flex-wrap gap-1">
                  {message.suggestion.reactflow_model.nodes.map((node) => (
                    <span
                      key={node.id}
                      className="px-2 py-1 bg-primary-100 text-primary-700 rounded text-xs"
                    >
                      {node.data?.label || node.id}
                    </span>
                  ))}
                </div>
              </div>

              {/* Templates */}
              {message.suggestion.templates &&
                message.suggestion.templates.length > 0 && (
                  <div>
                    <div className="font-medium text-xs text-gray-600 mb-1">
                      Templates:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {message.suggestion.templates.map((template, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleDownloadTemplate(template)}
                          className="px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs flex items-center gap-1"
                        >
                          <Download className="w-3 h-3" />
                          {template.type.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 border-t">
                <button
                  onClick={handleApplySuggestion}
                  className="btn-primary flex-1 text-sm font-medium"
                >
                  Apply to Canvas
                </button>
                {message.suggestion.yaml_metadata && (
                  <button
                    onClick={handleCopyYaml}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    title="Copy YAML"
                  >
                    <Copy className="w-4 h-4 text-gray-600" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Timestamp */}
        <div
          className={`text-xs mt-2 ${
            isUser ? 'text-primary-100' : 'text-gray-500'
          }`}
        >
          {message.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}
