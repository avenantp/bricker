/**
 * Create Project Dialog
 * Modal dialog for creating a new project using React Query hooks
 */

import { useState } from 'react';
import { AlertCircle, GitBranch, Eye, EyeOff } from 'lucide-react';
import { BaseDialog, DialogField, DialogInput, DialogTextarea, DialogSelect } from '@/components/Common/BaseDialog';
import { useCreateProject } from '../../hooks';
import type { ProjectVisibility, CreateProjectInput } from '@/types/project';
import { SourceControlProvider } from '@/types/source-control';

interface CreateProjectDialogProps {
  accountId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateProjectDialog({
  accountId,
  onClose,
  onSuccess,
}: CreateProjectDialogProps) {
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<ProjectVisibility>('private');

  // Source control state
  const [enableSourceControl, setEnableSourceControl] = useState(false);
  const [provider, setProvider] = useState<SourceControlProvider>(SourceControlProvider.GitHub);
  const [repoUrl, setRepoUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [username, setUsername] = useState('');

  // TODO: Get current user ID from auth context
  const userId = '00000000-0000-0000-0000-000000000000'; // Placeholder

  // Create project mutation
  const createProjectMutation = useCreateProject({
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Failed to create project:', error);
    }
  });

  const handleSubmit = async () => {
    if (!name.trim()) {
      return;
    }

    // Validate source control if enabled
    if (enableSourceControl) {
      if (!repoUrl.trim()) {
        alert('Repository URL is required when source control is enabled');
        return;
      }
      if (!accessToken.trim()) {
        alert('Access token is required when source control is enabled');
        return;
      }
    }

    const input: CreateProjectInput = {
      account_id: accountId,
      name: name.trim(),
      description: description.trim() || undefined,
      visibility,
      owner_id: userId
    };

    // Add source control configuration if enabled
    if (enableSourceControl) {
      input.source_control = {
        provider,
        repo_url: repoUrl.trim(),
        access_token: accessToken.trim(),
        default_branch: defaultBranch.trim() || 'main',
        username: username.trim() || undefined
      };
    }

    createProjectMutation.mutate({ input, userId });
  };

  return (
    <BaseDialog
      title="Create New Project"
      isOpen={true}
      onClose={onClose}
      primaryButtonLabel={createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
      onPrimaryAction={handleSubmit}
      primaryButtonDisabled={createProjectMutation.isPending || !name.trim()}
      secondaryButtonLabel="Cancel"
      onSecondaryAction={onClose}
      width="800px"
      height="auto"
    >
      {/* Error Message */}
      {createProjectMutation.isError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-800">Failed to create project</p>
            <p className="text-sm text-red-600 mt-1">
              {createProjectMutation.error?.message || 'An unexpected error occurred'}
            </p>
          </div>
        </div>
      )}

      {/* Project Name */}
      <DialogField label="Project Name" required>
        <DialogInput
          value={name}
          onChange={setName}
          placeholder="My Data Warehouse"
        />
      </DialogField>

      {/* Description */}
      <DialogField label="Description">
        <DialogTextarea
          value={description}
          onChange={setDescription}
          placeholder="Describe the purpose of this project..."
          rows={3}
        />
      </DialogField>

      {/* Visibility */}
      <DialogField label="Visibility" required>
        <div className="grid grid-cols-3 gap-4">
          {(['private', 'team', 'organization'] as ProjectVisibility[]).map((vis) => (
            <button
              key={vis}
              type="button"
              onClick={() => setVisibility(vis)}
              className={`p-4 border-2 rounded-lg transition-all ${
                visibility === vis
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
              }`}
            >
              <div className="font-semibold capitalize">{vis}</div>
              <div className="text-xs mt-1 opacity-75">
                {vis === 'private' && 'Only you'}
                {vis === 'team' && 'Your team'}
                {vis === 'organization' && 'Everyone'}
              </div>
            </button>
          ))}
        </div>
      </DialogField>

      {/* Source Control Section */}
      <div className="border-t border-gray-200 pt-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Source Control</h3>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={enableSourceControl}
              onChange={(e) => setEnableSourceControl(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Enable Source Control</span>
          </label>
        </div>

        {enableSourceControl && (
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            {/* Provider Selection */}
            <DialogField label="Provider" required>
              <DialogSelect
                value={provider}
                onChange={(value) => setProvider(value as SourceControlProvider)}
                options={[
                  { value: SourceControlProvider.GitHub, label: 'GitHub' },
                  { value: SourceControlProvider.GitLab, label: 'GitLab' },
                  { value: SourceControlProvider.Bitbucket, label: 'Bitbucket' },
                  { value: SourceControlProvider.Azure, label: 'Azure DevOps' },
                  { value: SourceControlProvider.Other, label: 'Other' }
                ]}
              />
            </DialogField>

            {/* Repository URL */}
            <DialogField label="Repository URL" required>
              <DialogInput
                value={repoUrl}
                onChange={setRepoUrl}
                placeholder="https://github.com/username/repository"
                type="url"
              />
              <p className="mt-1 text-xs text-gray-500">
                Full URL to your repository (e.g., https://github.com/owner/repo)
              </p>
            </DialogField>

            {/* Access Token */}
            <DialogField label="Access Token" required>
              <div className="relative">
                <DialogInput
                  value={accessToken}
                  onChange={setAccessToken}
                  placeholder="ghp_xxxxxxxxxxxx or pat_xxxxxxxxxxxx"
                  type={showToken ? 'text' : 'password'}
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Personal access token with repo access permissions
              </p>
            </DialogField>

            {/* Default Branch and Username */}
            <div className="grid grid-cols-2 gap-4">
              <DialogField label="Default Branch">
                <DialogInput
                  value={defaultBranch}
                  onChange={setDefaultBranch}
                  placeholder="main"
                />
              </DialogField>

              <DialogField label="Username (Optional)">
                <DialogInput
                  value={username}
                  onChange={setUsername}
                  placeholder="your-username"
                />
              </DialogField>
            </div>

            {/* Info Note */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-800">
                <strong>Note:</strong> Workspaces within this project will connect to specific branches in this repository.
                Your access token will be stored securely and encrypted.
              </p>
            </div>
          </div>
        )}
      </div>
    </BaseDialog>
  );
}
