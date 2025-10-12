/**
 * Create Project Dialog
 * Modal dialog for creating a new project
 */

import { useState } from 'react';
import { X } from 'lucide-react';
import type { ProjectType, CreateProjectPayload, Project } from '../../types/project';
import { createProject } from '../../lib/project-service';

interface CreateProjectDialogProps {
  workspaceId: string;
  onClose: () => void;
  onProjectCreated: (project: Project) => void;
}

export function CreateProjectDialog({
  workspaceId,
  onClose,
  onProjectCreated,
}: CreateProjectDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('Standard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Configuration state
  const [medallionEnabled, setMedallionEnabled] = useState(false);
  const [defaultCatalog, setDefaultCatalog] = useState('');
  const [defaultSchema, setDefaultSchema] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Project name is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload: CreateProjectPayload = {
        workspace_id: workspaceId,
        name: name.trim(),
        description: description.trim() || undefined,
        project_type: projectType,
        configuration: {
          medallion_layers_enabled: medallionEnabled,
          default_catalog: defaultCatalog || undefined,
          default_schema: defaultSchema || undefined,
        },
      };

      const newProject = await createProject(payload);
      onProjectCreated(newProject);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create project');
    } finally {
      setLoading(false);
    }
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
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
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

          {/* Configuration */}
          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">
              Configuration (Optional)
            </h3>

            {/* Medallion Architecture */}
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={medallionEnabled}
                  onChange={(e) => setMedallionEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">
                  Enable Medallion Architecture (Bronze/Silver/Gold)
                </span>
              </label>
            </div>

            {/* Default Catalog */}
            <div className="mb-4">
              <label htmlFor="catalog" className="block text-sm font-medium text-gray-700 mb-2">
                Default Catalog
              </label>
              <input
                id="catalog"
                type="text"
                value={defaultCatalog}
                onChange={(e) => setDefaultCatalog(e.target.value)}
                placeholder="main"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Default Schema */}
            <div>
              <label htmlFor="schema" className="block text-sm font-medium text-gray-700 mb-2">
                Default Schema
              </label>
              <input
                id="schema"
                type="text"
                value={defaultSchema}
                onChange={(e) => setDefaultSchema(e.target.value)}
                placeholder="default"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
