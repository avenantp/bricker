/**
 * Projects Page
 * Displays list of projects in the current workspace
 */

import { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../hooks/useWorkspace';
import { useProject } from '../hooks/useProject';
import { getProjects, duplicateProject } from '../lib/project-service';
import type { Project, ProjectType, ProjectFilters } from '../types/project';
import { ProjectCard } from '../components/Project/ProjectCard';
import { CreateProjectDialog } from '../components/Project/CreateProjectDialog';
import { DeleteProjectDialog } from '../components/Project/DeleteProjectDialog';

export function ProjectsPage() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<ProjectType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'updated_at'>(
    'updated_at'
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Load projects when workspace changes
  useEffect(() => {
    if (!currentWorkspace?.id) {
      setProjects([]);
      setLoading(false);
      return;
    }

    loadProjects();
  }, [currentWorkspace?.id, searchQuery, filterType, sortBy]);

  const loadProjects = async () => {
    if (!currentWorkspace?.id) return;

    setLoading(true);
    setError(null);

    try {
      const filters: ProjectFilters = {
        workspace_id: currentWorkspace.id,
        sort_by: sortBy,
        sort_order: 'desc',
      };

      if (searchQuery) {
        filters.search = searchQuery;
      }

      if (filterType !== 'all') {
        filters.project_type = filterType;
      }

      const data = await getProjects(currentWorkspace.id, filters);
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = () => {
    setShowCreateDialog(true);
  };

  const handleProjectCreated = (newProject: Project) => {
    setProjects((prev) => [newProject, ...prev]);
    setShowCreateDialog(false);
  };

  const handleOpenProject = (project: Project) => {
    // Navigate to project canvas or details
    navigate(`/projects/${project.id}`);
  };

  const handleEditProject = (project: Project) => {
    navigate(`/projects/${project.id}/settings`);
  };

  const handleDeleteProject = (project: Project) => {
    setProjectToDelete(project);
  };

  const handleProjectDeleted = () => {
    if (projectToDelete) {
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      setProjectToDelete(null);
    }
  };

  const handleDuplicateProject = async (project: Project) => {
    try {
      const newProject = await duplicateProject(
        project.id,
        `${project.name} (Copy)`,
        false
      );
      setProjects((prev) => [newProject, ...prev]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate project');
    }
  };

  const handleProjectSettings = (project: Project) => {
    navigate(`/projects/${project.id}/settings`);
  };

  if (!currentWorkspace) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            No Workspace Selected
          </h2>
          <p className="text-gray-500">
            Please select a workspace to view projects
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
            <p className="text-sm text-gray-500 mt-1">
              {currentWorkspace.name}
            </p>
          </div>
          <button
            onClick={handleCreateProject}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ProjectType | 'all')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="Standard">Standard</option>
            <option value="DataVault">Data Vault</option>
            <option value="Dimensional">Dimensional</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) =>
              setSortBy(e.target.value as 'name' | 'created_at' | 'updated_at')
            }
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="updated_at">Last Updated</option>
            <option value="created_at">Date Created</option>
            <option value="name">Name</option>
          </select>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading projects...</div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-600 mb-2">Error loading projects</p>
              <p className="text-sm text-gray-500">{error}</p>
              <button
                onClick={loadProjects}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Retry
              </button>
            </div>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                {searchQuery || filterType !== 'all'
                  ? 'No projects found'
                  : 'No projects yet'}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {searchQuery || filterType !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Create your first project to get started'}
              </p>
              {!searchQuery && filterType === 'all' && (
                <button
                  onClick={handleCreateProject}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Project
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onOpen={handleOpenProject}
                onEdit={handleEditProject}
                onDelete={handleDeleteProject}
                onDuplicate={handleDuplicateProject}
                onSettings={handleProjectSettings}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      {showCreateDialog && currentWorkspace && (
        <CreateProjectDialog
          workspaceId={currentWorkspace.id}
          onClose={() => setShowCreateDialog(false)}
          onProjectCreated={handleProjectCreated}
        />
      )}

      {/* Delete Dialog */}
      {projectToDelete && (
        <DeleteProjectDialog
          project={projectToDelete}
          onClose={() => setProjectToDelete(null)}
          onDeleted={handleProjectDeleted}
        />
      )}
    </div>
  );
}
