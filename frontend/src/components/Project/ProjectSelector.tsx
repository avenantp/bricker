import { useState } from 'react';
import { Plus, Check, FolderKanban, ChevronDown, Loader2 } from 'lucide-react';
import { useProject } from '@/hooks/useProject';
import { useStore } from '@/store/useStore';

export function ProjectSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [newProjectType, setNewProjectType] = useState<'Standard' | 'DataVault' | 'Dimensional'>('Standard');
  const [creating, setCreating] = useState(false);

  const { projects, loading, createProject } = useProject();
  const { currentProject, setCurrentProject } = useStore();

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const project = await createProject(newProjectName, newProjectDescription, newProjectType);
      setCurrentProject({
        id: project.id,
        workspace_id: project.workspace_id,
        name: project.name,
        description: project.description || undefined,
        project_type: project.project_type,
        configuration: project.configuration,
        created_at: new Date(project.created_at),
        updated_at: new Date(project.updated_at),
      });
      setShowCreateModal(false);
      setNewProjectName('');
      setNewProjectDescription('');
      setNewProjectType('Standard');
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setCreating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200">
        <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
        <span className="text-sm text-gray-600">Loading projects...</span>
      </div>
    );
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
        >
          <FolderKanban className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">
            {currentProject?.name || 'Select Project'}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <div className="absolute top-full mt-2 right-0 w-72 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
              <div className="p-2">
                <div className="text-xs font-medium text-gray-500 px-3 py-2">
                  YOUR PROJECTS
                </div>

                {projects.length === 0 ? (
                  <div className="px-3 py-8 text-center text-sm text-gray-500">
                    No projects yet. Create your first project to get started.
                  </div>
                ) : (
                  <div className="space-y-1 max-h-80 overflow-y-auto">
                    {projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => {
                          setCurrentProject({
                            id: project.id,
                            workspace_id: project.workspace_id,
                            name: project.name,
                            description: project.description || undefined,
                            project_type: project.project_type,
                            configuration: project.configuration,
                            created_at: new Date(project.created_at),
                            updated_at: new Date(project.updated_at),
                          });
                          setIsOpen(false);
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <FolderKanban className="w-4 h-4 text-gray-600 flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {project.name}
                            </div>
                            {project.description && (
                              <div className="text-xs text-gray-500 truncate">
                                {project.description}
                              </div>
                            )}
                            <div className="text-xs text-gray-400 mt-0.5">
                              {project.project_type}
                            </div>
                          </div>
                        </div>
                        {currentProject?.id === project.id && (
                          <Check className="w-4 h-4 text-primary-500 flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                <div className="border-t border-gray-200 mt-2 pt-2">
                  <button
                    onClick={() => {
                      setShowCreateModal(true);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-primary-500"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">Create Project</span>
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Create New Project
            </h2>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="input-field w-full"
                  placeholder="My Project"
                  required
                  disabled={creating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  className="input-field w-full resize-none"
                  rows={3}
                  placeholder="Project description..."
                  disabled={creating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Type *
                </label>
                <select
                  value={newProjectType}
                  onChange={(e) => setNewProjectType(e.target.value as 'Standard' | 'DataVault' | 'Dimensional')}
                  className="input-field w-full"
                  required
                  disabled={creating}
                >
                  <option value="Standard">Standard</option>
                  <option value="DataVault">Data Vault</option>
                  <option value="Dimensional">Dimensional</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Choose the modeling approach for this project
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setNewProjectName('');
                    setNewProjectDescription('');
                    setNewProjectType('Standard');
                  }}
                  className="btn-secondary flex-1"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                  disabled={creating}
                >
                  {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
