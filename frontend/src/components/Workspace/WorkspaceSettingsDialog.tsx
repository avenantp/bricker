/**
 * Workspace Settings Dialog
 * Modal dialog for managing workspace settings
 */

import { useState, useEffect } from 'react';
import { X, Settings, AlertCircle, GitBranch, RefreshCw } from 'lucide-react';
import { useWorkspace, useUpdateWorkspace, useProjectBranches } from '../../hooks';
import type { UpdateWorkspaceInput } from '@/types/workspace';

interface WorkspaceSettingsDialogProps {
  workspaceId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function WorkspaceSettingsDialog({
  workspaceId,
  onClose,
  onSuccess,
}: WorkspaceSettingsDialogProps) {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch workspace data
  const { data: workspace, isLoading } = useWorkspace(workspaceId);

  // Fetch available branches if project has source control
  const { data: branches, isLoading: branchesLoading, refetch: refetchBranches } = useProjectBranches(
    workspace?.project_id || '',
    {
      enabled: !!workspace?.project_id && !!workspace?.project_source_control_provider
    }
  );

  // Update mutation
  const updateWorkspaceMutation = useUpdateWorkspace({
    onSuccess: () => {
      setHasUnsavedChanges(false);
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Failed to update workspace:', error);
    }
  });

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sourceControlBranch, setSourceControlBranch] = useState('');

  // Initialize form when workspace loads
  useEffect(() => {
    if (workspace) {
      setName(workspace.name);
      setDescription(workspace.description || '');
      setSourceControlBranch(workspace.source_control_branch || '');
    }
  }, [workspace]);

  const handleSave = () => {
    const input: UpdateWorkspaceInput = {};

    if (name !== workspace?.name) input.name = name;
    if (description !== (workspace?.description || '')) input.description = description;
    if (sourceControlBranch !== (workspace?.source_control_branch || '')) {
      input.source_control_branch = sourceControlBranch || null;
    }

    if (Object.keys(input).length > 0) {
      updateWorkspaceMutation.mutate({ workspaceId, input });
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmed) return;
    }
    onClose();
  };

  if (isLoading || !workspace) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full h-[400px] flex items-center justify-center">
          <div className="text-gray-500">Loading workspace settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Workspace Settings</h2>
              <p className="text-sm text-gray-600">{workspace.name}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={updateWorkspaceMutation.isPending}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Error Message */}
            {updateWorkspaceMutation.isError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Failed to update workspace</p>
                  <p className="text-sm text-red-600 mt-1">
                    {updateWorkspaceMutation.error?.message || 'An unexpected error occurred'}
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
                onChange={(e) => {
                  setName(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Development Environment"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setHasUnsavedChanges(true);
                }}
                placeholder="Describe the purpose of this workspace..."
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="mt-1 text-xs text-gray-500">
                Optional description to help team members understand the workspace's purpose
              </p>
            </div>

            {/* Source Control Branch */}
            {workspace.project_source_control_provider && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="branch" className="block text-sm font-medium text-gray-700 flex items-center gap-2">
                    <GitBranch className="w-4 h-4" />
                    Source Control Branch
                  </label>
                  <button
                    type="button"
                    onClick={() => refetchBranches()}
                    disabled={branchesLoading}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"
                    title="Refresh branches"
                  >
                    <RefreshCw className={`w-3 h-3 ${branchesLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                {branches && branches.length > 0 ? (
                  <select
                    id="branch"
                    value={sourceControlBranch || workspace.project_source_control_default_branch || ''}
                    onChange={(e) => {
                      setSourceControlBranch(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a branch...</option>
                    {branches.map((branch) => (
                      <option key={branch} value={branch}>
                        {branch}
                      </option>
                    ))}
                  </select>
                ) : branchesLoading ? (
                  <div className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                    Loading branches...
                  </div>
                ) : (
                  <input
                    id="branch"
                    type="text"
                    value={sourceControlBranch}
                    onChange={(e) => {
                      setSourceControlBranch(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={workspace.project_source_control_default_branch || 'main'}
                  />
                )}

                <p className="mt-1 text-xs text-gray-500">
                  {branches && branches.length > 0
                    ? `Select the branch this workspace connects to (${branches.length} available)`
                    : 'Branch in the project repository that this workspace connects to'}
                </p>
              </div>
            )}

            {/* Project Info (Read-only) */}
            {workspace.project && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Project</h4>
                <p className="text-sm text-gray-900">{workspace.project.name}</p>
                {workspace.project_source_control_provider && (
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                    <GitBranch className="w-3 h-3" />
                    Connected to {workspace.project_source_control_provider}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div>
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertCircle className="w-4 h-4" />
                <span>You have unsaved changes</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              disabled={updateWorkspaceMutation.isPending}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={updateWorkspaceMutation.isPending || !hasUnsavedChanges || !name.trim()}
            >
              {updateWorkspaceMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
