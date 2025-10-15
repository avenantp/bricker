/**
 * Create Workspace Dialog
 * Modal dialog for creating a new workspace using React Query hooks
 */

import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { BaseDialog, DialogField, DialogInput, DialogTextarea } from '@/components/Common/BaseDialog';
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
    <BaseDialog
      title="Create New Workspace"
      isOpen={true}
      onClose={onClose}
      primaryButtonLabel={createWorkspaceMutation.isPending ? 'Creating...' : 'Create Workspace'}
      onPrimaryAction={() => handleSubmit({} as React.FormEvent)}
      primaryButtonDisabled={createWorkspaceMutation.isPending || !name.trim()}
      secondaryButtonLabel="Cancel"
      onSecondaryAction={onClose}
      width="700px"
      height="auto"
    >
      {/* Error Message */}
      {createWorkspaceMutation.isError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
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
      <DialogField label="Workspace Name" required>
        <DialogInput
          value={name}
          onChange={setName}
          placeholder="Development Environment"
        />
        <p className="mt-1 text-xs text-gray-500">
          Choose a descriptive name for this workspace
        </p>
      </DialogField>

      {/* Description */}
      <DialogField label="Description">
        <DialogTextarea
          value={description}
          onChange={setDescription}
          placeholder="Describe the purpose of this workspace..."
          rows={4}
        />
        <p className="mt-1 text-xs text-gray-500">
          Optional description to help team members understand the workspace's purpose
        </p>
      </DialogField>

      {/* Info Box */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">What is a Workspace?</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Isolated environment for developing data models</li>
          <li>Can be connected to source control (GitHub, GitLab, etc.)</li>
          <li>Contains datasets, configurations, and metadata</li>
          <li>Team members can collaborate within the workspace</li>
        </ul>
      </div>
    </BaseDialog>
  );
}
