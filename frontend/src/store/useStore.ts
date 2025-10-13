import { create } from 'zustand';
import { AppState, DataModel, Message, Workspace, Project } from './types';
import { Node, Edge } from '@xyflow/react';

export const useStore = create<AppState>((set) => ({
  // Company
  currentCompany: null,
  userRole: null,
  setCurrentCompany: (company, role) => set({ currentCompany: company, userRole: role }),

  // Workspace
  currentWorkspace: null,
  workspaces: [],
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),

  // Project
  currentProject: null,
  projects: [],
  setCurrentProject: (project) => set({ currentProject: project }),

  // Model
  currentModel: null,
  models: [],
  setCurrentModel: (model) => set({ currentModel: model }),
  addModel: (model) =>
    set((state) => ({
      models: [...state.models, model],
      currentModel: model,
    })),
  updateModel: (id, updates) =>
    set((state) => ({
      models: state.models.map((m) =>
        m.id === id ? { ...m, ...updates, updated_at: new Date() } : m
      ),
      currentModel:
        state.currentModel?.id === id
          ? { ...state.currentModel, ...updates, updated_at: new Date() }
          : state.currentModel,
    })),
  deleteModel: (id) =>
    set((state) => ({
      models: state.models.filter((m) => m.id !== id),
      currentModel: state.currentModel?.id === id ? null : state.currentModel,
    })),

  // React Flow Canvas
  nodes: [],
  edges: [],
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  addNode: (node) =>
    set((state) => ({
      nodes: [...state.nodes, node],
    })),
  updateNode: (id, updates) =>
    set((state) => ({
      nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
    })),
  deleteNode: (id) =>
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== id),
      edges: state.edges.filter((e) => e.source !== id && e.target !== id),
    })),

  // Source Control Sync State
  syncStatus: {
    hasUncommittedChanges: false,
    uncommittedCount: 0,
    conflictCount: 0,
    isSyncing: false,
    lastSyncTime: null,
    syncError: null,
  },
  setSyncStatus: (status) =>
    set((state) => ({
      syncStatus: { ...state.syncStatus, ...status },
    })),
  resetSyncStatus: () =>
    set({
      syncStatus: {
        hasUncommittedChanges: false,
        uncommittedCount: 0,
        conflictCount: 0,
        isSyncing: false,
        lastSyncTime: null,
        syncError: null,
      },
    }),

  // Dataset State
  selectedDatasetId: null,
  setSelectedDatasetId: (id) => set({ selectedDatasetId: id }),

  // Chat/Assistant
  messages: [],
  isAssistantTyping: false,
  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),
  setIsAssistantTyping: (typing) => set({ isAssistantTyping: typing }),
  clearMessages: () => set({ messages: [] }),

  // UI State
  isChatOpen: true,
  isPropertiesPanelOpen: true,
  selectedNodeId: null,
  isDarkMode: false,
  isSourceControlSyncPanelOpen: false,
  toggleChat: () => set((state) => ({ isChatOpen: !state.isChatOpen })),
  togglePropertiesPanel: () =>
    set((state) => ({ isPropertiesPanelOpen: !state.isPropertiesPanelOpen })),
  toggleSourceControlSyncPanel: () =>
    set((state) => ({ isSourceControlSyncPanelOpen: !state.isSourceControlSyncPanelOpen })),
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
  toggleDarkMode: () => set((state) => {
    console.log('[Store] toggleDarkMode called, current:', state.isDarkMode, 'new:', !state.isDarkMode);
    return { isDarkMode: !state.isDarkMode };
  }),
}));
