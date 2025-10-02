import type { DataModelYAML } from '../types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface GitHubConnectionStatus {
  connected: boolean;
  repository?: {
    name: string;
    fullName: string;
    description: string;
    private: boolean;
    defaultBranch: string;
    url: string;
  };
}

export const githubApi = {
  /**
   * Connect workspace to GitHub repository
   */
  async connect(
    workspaceId: string,
    githubRepo: string,
    githubToken: string,
    branch?: string
  ): Promise<{ success: boolean; repository: any }> {
    const response = await fetch(`${API_BASE}/api/github/connect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: workspaceId,
        github_repo: githubRepo,
        github_token: githubToken,
        branch: branch || 'main',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to connect to GitHub');
    }

    return response.json();
  },

  /**
   * Get GitHub connection status for workspace
   */
  async getConnectionStatus(workspaceId: string): Promise<GitHubConnectionStatus> {
    const response = await fetch(`${API_BASE}/api/github/status/${workspaceId}`);

    if (!response.ok) {
      throw new Error('Failed to get GitHub status');
    }

    return response.json();
  },

  /**
   * Export data model to GitHub
   */
  async exportModel(workspaceId: string, model: DataModelYAML): Promise<{ success: boolean; commit_sha: string; message: string }> {
    const response = await fetch(`${API_BASE}/api/github/models/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: workspaceId,
        model,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to export model');
    }

    return response.json();
  },

  /**
   * Import data model from GitHub
   */
  async importModel(workspaceId: string, modelId: string): Promise<DataModelYAML> {
    const response = await fetch(`${API_BASE}/api/github/models/import/${workspaceId}/${modelId}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to import model');
    }

    return response.json();
  },

  /**
   * List all models in GitHub
   */
  async listModels(workspaceId: string): Promise<Array<{ id: string; name: string; path: string }>> {
    const response = await fetch(`${API_BASE}/api/github/models/list/${workspaceId}`);

    if (!response.ok) {
      throw new Error('Failed to list models');
    }

    const data = await response.json();
    return data.models;
  },

  /**
   * Delete model from GitHub
   */
  async deleteModel(workspaceId: string, modelId: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/github/models/${workspaceId}/${modelId}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to delete model');
    }
  },

  /**
   * Export template to GitHub
   */
  async exportTemplate(workspaceId: string, template: any): Promise<{ success: boolean; commit_sha: string; message: string }> {
    const response = await fetch(`${API_BASE}/api/github/templates/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: workspaceId,
        template,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to export template');
    }

    return response.json();
  },

  /**
   * List templates in GitHub
   */
  async listTemplates(workspaceId: string, category?: string): Promise<Array<{ id: string; category: string; name: string; path: string }>> {
    const url = category
      ? `${API_BASE}/api/github/templates/list/${workspaceId}?category=${category}`
      : `${API_BASE}/api/github/templates/list/${workspaceId}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Failed to list templates');
    }

    const data = await response.json();
    return data.templates;
  },

  /**
   * Get repository branches
   */
  async listBranches(workspaceId: string): Promise<string[]> {
    const response = await fetch(`${API_BASE}/api/github/branches/${workspaceId}`);

    if (!response.ok) {
      throw new Error('Failed to list branches');
    }

    const data = await response.json();
    return data.branches;
  },

  /**
   * Create a new branch
   */
  async createBranch(workspaceId: string, branchName: string, fromBranch?: string): Promise<void> {
    const response = await fetch(`${API_BASE}/api/github/branches/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        workspace_id: workspaceId,
        branch_name: branchName,
        from_branch: fromBranch,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create branch');
    }
  },
};
