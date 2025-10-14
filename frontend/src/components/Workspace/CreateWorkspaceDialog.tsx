/**
 * Create Workspace Dialog
 * Modal dialog for creating a new workspace using React Query hooks
 */

import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useCreateWorkspace } from '../../hooks';
import type { CreateWorkspaceInput } from '@/types/workspace';

interface CreateWorkspaceDialogProps {
  projectId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateWorkspaceDialog({
  projectId,
  onClose,
  onSuccess,
}: CreateWorkspaceDialogProps) {
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  // TODO: Get current user ID from auth context
  const userId = '00000000-0000-0000-0000-000000000000'; // Placeholder

  // Create workspace mutation
  const createWorkspaceMutation = useCreateWorkspace({
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Failed to create workspace:', error);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      return;
    }

    const input: CreateWorkspaceInput = {
      project_id: projectId,
      name: name.trim(),
      description: description.trim() || undefined,
    };

    createWorkspaceMutation.mutate({ input, userId });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Create New Workspace</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {createWorkspaceMutation.isError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Failed to create workspace</p>
                <p className="text-sm text-red-600 mt-1">
                  {createWorkspaceMutation.error?.message || 'An unexpected error occurred'}
                </p>
              </div>
            </div>
          )}

          {/* Workspace Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Workspace Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Development Environment"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-500">
              Choose a descriptive name for this workspace
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this workspace..."
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Optional description to help team members understand the workspace's purpose
            </p>
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">What is a Workspace?</h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Isolated environment for developing data models</li>
              <li>Can be connected to source control (GitHub, GitLab, etc.)</li>
              <li>Contains datasets, configurations, and metadata</li>
              <li>Team members can collaborate within the workspace</li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={createWorkspaceMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={createWorkspaceMutation.isPending || !name.trim()}
            >
              {createWorkspaceMutation.isPending ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
