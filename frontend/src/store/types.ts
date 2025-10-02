import { Node, Edge } from '@xyflow/react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestion?: ModelSuggestion;
}

export interface ModelSuggestion {
  id: string;
  reactflow_model: {
    nodes: Node[];
    edges: Edge[];
  };
  yaml_metadata?: string;
  templates?: Array<{
    type: string;
    content: string;
  }>;
  description?: string;
}

export interface DataModel {
  id: string;
  name: string;
  description?: string;
  nodes: Node[];
  edges: Edge[];
  created_at: Date;
  updated_at: Date;
  workspace_id: string;
}

export interface Workspace {
  id: string;
  name: string;
  owner_id: string;
  created_at: Date;
}

export interface DataModelYAML {
  id: string;
  name: string;
  description?: string;
  model_type: 'dimensional' | 'data_vault' | 'normalized' | 'custom';
  version: number;
  created_at: string;
  updated_at: string;
  nodes: Node[];
  edges: Edge[];
  metadata?: Record<string, any>;
}

export interface AppState {
  // Workspace
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  setCurrentWorkspace: (workspace: Workspace | null) => void;

  // Model
  currentModel: DataModel | null;
  models: DataModel[];
  setCurrentModel: (model: DataModel | null) => void;
  addModel: (model: DataModel) => void;
  updateModel: (id: string, updates: Partial<DataModel>) => void;
  deleteModel: (id: string) => void;

  // React Flow Canvas
  nodes: Node[];
  edges: Edge[];
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  addNode: (node: Node) => void;
  updateNode: (id: string, updates: Partial<Node>) => void;
  deleteNode: (id: string) => void;

  // Chat/Assistant
  messages: Message[];
  isAssistantTyping: boolean;
  addMessage: (message: Message) => void;
  setIsAssistantTyping: (typing: boolean) => void;
  clearMessages: () => void;

  // UI State
  isChatOpen: boolean;
  isPropertiesPanelOpen: boolean;
  selectedNodeId: string | null;
  toggleChat: () => void;
  togglePropertiesPanel: () => void;
  setSelectedNodeId: (id: string | null) => void;
}
