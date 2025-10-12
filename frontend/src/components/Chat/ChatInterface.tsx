import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2, X, Maximize2, Minimize2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { useChat } from '@/hooks/useChat';
import { ChatMessage } from './ChatMessage';

export function ChatInterface() {
  const [input, setInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    messages,
    isAssistantTyping,
    isChatOpen,
    toggleChat,
    currentWorkspace,
  } = useStore();

  const { sendMessage, isLoading, error } = useChat();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAssistantTyping]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const messageText = input;
    setInput('');
    await sendMessage(messageText);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const examplePrompts = [
    'Create a dimension from product and category tables',
    'Recommend an optimized data vault model',
    'Generate a Type 2 SCD for customers',
  ];

  if (!isChatOpen) {
    return (
      <button
        onClick={toggleChat}
        className="fixed bottom-4 right-4 p-4 bg-secondary-600 text-white rounded-full shadow-lg hover:bg-secondary-700 transition-all z-50"
        title="Open AI Assistant"
      >
        <Sparkles className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div
      className={`fixed ${
        isExpanded
          ? 'inset-4'
          : 'bottom-4 right-4 w-96 h-[600px]'
      } bg-white rounded-lg shadow-2xl flex flex-col transition-all duration-300 z-40`}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-primary-600 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <div>
            <h2 className="font-semibold">AI Data Architect</h2>
            <p className="text-xs opacity-90">
              {currentWorkspace?.name || 'No workspace selected'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title={isExpanded ? 'Minimize' : 'Maximize'}
          >
            {isExpanded ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={toggleChat}
            className="p-1 hover:bg-white/20 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <Sparkles className="w-16 h-16 text-secondary-500 mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Welcome to AI Data Architect
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Describe your data model requirements in plain English and I'll help you
              design optimized models.
            </p>
            <div className="text-xs text-gray-500">
              Try one of these examples:
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            {isAssistantTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-red-700 text-sm">
          Error: {error}
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t bg-gray-50">
        <div className="flex gap-2 mb-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Describe the model you want to create..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            rows={2}
            disabled={isLoading || !currentWorkspace}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim() || !currentWorkspace}
            className="btn-primary h-full px-4"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Example Prompts */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {examplePrompts.map((example, idx) => (
              <button
                key={idx}
                onClick={() => setInput(example)}
                className="text-xs px-3 py-1 bg-white border border-gray-300 rounded-full hover:bg-gray-50 transition-colors text-gray-700"
              >
                {example}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
