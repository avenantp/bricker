const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface ChatRequest {
  workspace_id: string;
  message: string;
  context?: {
    current_model?: any;
    selected_tables?: string[];
  };
  stream?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async chat(request: ChatRequest): Promise<Response> {
    const response = await fetch(`${this.baseUrl}/api/assistant/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...request, stream: true }),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response;
  }

  async getConversations(workspaceId: string) {
    const response = await fetch(
      `${this.baseUrl}/api/assistant/conversations/${workspaceId}`
    );

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  async applySuggestion(data: {
    workspace_id: string;
    suggestion_id?: string;
    model_data: any;
  }) {
    const response = await fetch(`${this.baseUrl}/api/assistant/apply-suggestion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getPatterns() {
    const response = await fetch(`${this.baseUrl}/api/assistant/patterns`);

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }

  async getStatus() {
    const response = await fetch(`${this.baseUrl}/api/assistant/status`);

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    return response.json();
  }
}

export const apiClient = new ApiClient();
