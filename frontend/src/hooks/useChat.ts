import { useState, useCallback } from 'react';
import { apiClient, ChatRequest } from '@/api/client';
import { useStore } from '@/store/useStore';
import { Message } from '@/store/types';

export function useChat() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addMessage, setIsAssistantTyping, currentWorkspace } = useStore();

  const sendMessage = useCallback(
    async (messageText: string, context?: ChatRequest['context']) => {
      if (!currentWorkspace) {
        setError('No workspace selected');
        return;
      }

      setIsLoading(true);
      setError(null);

      // Add user message
      const userMessage: Message = {
        id: `msg_${Date.now()}`,
        role: 'user',
        content: messageText,
        timestamp: new Date(),
      };
      addMessage(userMessage);

      try {
        setIsAssistantTyping(true);

        const response = await apiClient.chat({
          workspace_id: currentWorkspace.id,
          message: messageText,
          context,
          stream: true,
        });

        // Handle streaming response
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error('No response body');
        }

        let assistantContent = '';
        let currentSuggestion: any = null;

        const assistantMessageId = `msg_${Date.now()}_assistant`;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6);

              if (dataStr === '[DONE]') {
                continue;
              }

              try {
                const data = JSON.parse(dataStr);

                if (data.type === 'content') {
                  assistantContent += data.text;

                  // Update or add assistant message
                  const assistantMessage: Message = {
                    id: assistantMessageId,
                    role: 'assistant',
                    content: assistantContent,
                    timestamp: new Date(),
                    suggestion: currentSuggestion,
                  };

                  // Update the message in store
                  const messages = useStore.getState().messages;
                  const existingIndex = messages.findIndex(
                    (m) => m.id === assistantMessageId
                  );

                  if (existingIndex >= 0) {
                    // Update existing message
                    useStore.setState({
                      messages: messages.map((m) =>
                        m.id === assistantMessageId ? assistantMessage : m
                      ),
                    });
                  } else {
                    // Add new message
                    addMessage(assistantMessage);
                  }
                } else if (data.type === 'suggestion') {
                  currentSuggestion = data.suggestion;
                } else if (data.type === 'tool_use') {
                  console.log('Tool used:', data.tool, data.input);
                } else if (data.type === 'error') {
                  setError(data.error);
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }

        // Final update with suggestion if available
        if (currentSuggestion) {
          const messages = useStore.getState().messages;
          useStore.setState({
            messages: messages.map((m) =>
              m.id === assistantMessageId
                ? { ...m, suggestion: currentSuggestion }
                : m
            ),
          });
        }
      } catch (err) {
        console.error('Chat error:', err);
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
        setIsAssistantTyping(false);
      }
    },
    [currentWorkspace, addMessage, setIsAssistantTyping]
  );

  return {
    sendMessage,
    isLoading,
    error,
  };
}
