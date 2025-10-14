/**
 * Create Project Dialog
 * Modal dialog for creating a new project using React Query hooks
 */

import { useState } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { useCreateProject } from '../../hooks';
import type { ProjectType, ProjectVisibility, CreateProjectInput } from '@/types/project';

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
  const [projectType, setProjectType] = useState<ProjectType>('Standard');
  const [visibility, setVisibility] = useState<ProjectVisibility>('private');

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      return;
    }

    const input: CreateProjectInput = {
      account_id: accountId,
      name: name.trim(),
      description: description.trim() || undefined,
      project_type: projectType,
      visibility,
      owner_id: userId
    };

    createProjectMutation.mutate({ input, userId });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Create New Project</h2>
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
          {createProjectMutation.isError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
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
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Project Name *
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Data Warehouse"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
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
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the purpose of this project..."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Project Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Type *
            </label>
            <div className="grid grid-cols-3 gap-4">
              {(['Standard', 'DataVault', 'Dimensional'] as ProjectType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setProjectType(type)}
                  className={`p-4 border-2 rounded-lg transition-all ${
                    projectType === type
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  <div className="font-semibold">{type}</div>
                  <div className="text-xs mt-1 opacity-75">
                    {type === 'Standard' && 'General purpose'}
                    {type === 'DataVault' && 'Data Vault 2.0'}
                    {type === 'Dimensional' && 'Kimball dimensional'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Visibility */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Visibility *
            </label>
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
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={createProjectMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={createProjectMutation.isPending || !name.trim()}
            >
              {createProjectMutation.isPending ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
