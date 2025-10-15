/**
 * Projects Page
 * Displays list of projects with filtering, search, and pagination
 *
 * Uses React Query hooks for data fetching and mutations.
 */

import { useState, useEffect } from 'react';
import { Plus, Search, Grid, List } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProjects, useAccount } from '../hooks';
import { useStore } from '../store/useStore';
import type { ProjectType, ProjectVisibility } from '@/types/project';
import { ProjectCard } from '../components/Project/ProjectCard';
import { CreateProjectDialog } from '../components/Project/CreateProjectDialog';
import { DeleteProjectDialog } from '../components/Project/DeleteProjectDialog';
import { ProjectSettingsDialog } from '../components/Project/ProjectSettingsDialog';
import { AppLayout } from '../components/Layout';

type ViewMode = 'grid' | 'list';

export function ProjectsPage() {
  const navigate = useNavigate();
  const { isDarkMode } = useStore();

  // Fetch user's account
  const { data: account, isLoading: isLoadingAccount } = useAccount();

  // Apply dark mode class to document element
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // View mode state (persisted in localStorage)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('projectsViewMode');
    return (saved === 'grid' || saved === 'list') ? saved : 'grid';
  });

  // Filter and search state
  const [search, setSearch] = useState('');
  const [projectType, setProjectType] = useState<ProjectType | 'all'>('all');
  const [visibility, setVisibility] = useState<ProjectVisibility | 'all'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'updated_at'>('updated_at');
  const [page, setPage] = useState(1);

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [projectToEdit, setProjectToEdit] = useState<string | null>(null);

  // Fetch projects with React Query
  const { data, isLoading, error, refetch } = useProjects({
    account_id: account?.id,
    project_type: projectType !== 'all' ? projectType : undefined,
    visibility: visibility !== 'all' ? visibility : undefined,
    search: search || undefined,
    sort_by: sortBy,
    sort_order: 'desc',
    page,
    limit: 20
  });

  // Handlers
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('projectsViewMode', mode);
  };

  const handleOpenProject = (projectId: string) => {
    // Navigate to the workspaces page for this project
    navigate(`/projects/${projectId}/workspaces`);
  };

  const handleDuplicateProject = (projectId: string, name: string) => {
    // TODO: Implement duplicate project functionality
    console.log('Duplicate project:', projectId, name);
  };

  const handleDeleteProject = (projectId: string) => {
    setProjectToDelete(projectId);
  };

  const handleProjectDeleted = () => {
    setProjectToDelete(null);
    refetch();
  };

  const handleProjectSettings = (projectId: string) => {
    setProjectToEdit(projectId);
  };

  return (
    <AppLayout>
      {/* Page Header with Actions */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Projects</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Manage your data modeling projects
              </p>
            </div>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="btn-primary inline-flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Project
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1); // Reset to first page on search
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              {/* Project Type */}
              <select
                value={projectType}
                onChange={(e) => {
                  setProjectType(e.target.value as ProjectType | 'all');
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="all">All Types</option>
                <option value="Standard">Standard</option>
                <option value="DataVault">Data Vault</option>
                <option value="Dimensional">Dimensional</option>
              </select>

              {/* Visibility */}
              <select
                value={visibility}
                onChange={(e) => {
                  setVisibility(e.target.value as ProjectVisibility | 'all');
                  setPage(1);
                }}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="all">All Visibility</option>
                <option value="private">Private</option>
                <option value="public">Public</option>
                <option value="locked">Locked</option>
              </select>

              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'created_at' | 'updated_at')}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="updated_at">Last Updated</option>
                <option value="created_at">Date Created</option>
                <option value="name">Name (A-Z)</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                <button
                  onClick={() => handleViewModeChange('grid')}
                  className={`px-3 py-2 ${
                    viewMode === 'grid'
                      ? 'bg-accent-300 dark:bg-accent-500 text-gray-600 dark:text-gray-300'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  } transition-colors`}
                  title="Grid view"
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleViewModeChange('list')}
                  className={`px-3 py-2 border-l border-gray-300 dark:border-gray-600 ${
                    viewMode === 'list'
                      ? 'bg-accent-300 dark:bg-accent-500 text-gray-600 dark:text-gray-300'
                      : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                  } transition-colors`}
                  title="List view"
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {isLoadingAccount ? (
          // Loading account
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <p className="text-gray-500 dark:text-gray-400">Loading account information...</p>
            </div>
          </div>
        ) : !account ? (
          // No account found
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 font-medium mb-2">No account found</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Please contact support</p>
            </div>
          </div>
        ) : isLoading ? (
          // Loading skeleton
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          // Error state
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <p className="text-red-600 font-medium mb-2">Error loading projects</p>
              <p className="text-sm text-gray-500 mb-4">{error.message}</p>
              <button
                onClick={() => refetch()}
                className="btn-primary"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : !data || data.data.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {search || projectType !== 'all' || visibility !== 'all'
                  ? 'No projects found'
                  : 'No projects yet'}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {search || projectType !== 'all' || visibility !== 'all'
                  ? 'Try adjusting your filters or search query'
                  : 'Get started by creating your first project'}
              </p>
              {!search && projectType === 'all' && visibility === 'all' && (
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First Project
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Projects grid/list */}
            <div className={viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
            }>
              {data.data.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  viewMode={viewMode}
                  onOpen={() => handleOpenProject(project.id)}
                  onDuplicate={() => handleDuplicateProject(project.id, project.name)}
                  onDelete={() => handleDeleteProject(project.id)}
                  onSettings={() => handleProjectSettings(project.id)}
                />
              ))}
            </div>

            {/* Pagination */}
            {data.pagination.total_pages > 1 && (
              <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-4">
                <div className="text-sm text-gray-500">
                  Showing {((page - 1) * data.pagination.limit) + 1} to{' '}
                  {Math.min(page * data.pagination.limit, data.pagination.total)} of{' '}
                  {data.pagination.total} projects
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn-secondary text-sm px-3 py-1"
                  >
                    Previous
                  </button>

                  {/* Page numbers */}
                  <div className="flex gap-1">
                    {Array.from({ length: Math.min(5, data.pagination.total_pages) }, (_, i) => {
                      let pageNum: number;
                      if (data.pagination.total_pages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= data.pagination.total_pages - 2) {
                        pageNum = data.pagination.total_pages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setPage(pageNum)}
                          className={page === pageNum ? 'btn-primary text-sm px-3 py-1' : 'btn-secondary text-sm px-3 py-1'}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setPage(p => Math.min(data.pagination.total_pages, p + 1))}
                    disabled={page === data.pagination.total_pages}
                    className="btn-secondary text-sm px-3 py-1"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Dialogs */}
      {showCreateDialog && account && (
        <CreateProjectDialog
          accountId={account.id}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => {
            setShowCreateDialog(false);
            refetch();
          }}
        />
      )}

      {projectToDelete && (
        <DeleteProjectDialog
          projectId={projectToDelete}
          onClose={() => setProjectToDelete(null)}
          onSuccess={handleProjectDeleted}
        />
      )}

      {projectToEdit && (
        <ProjectSettingsDialog
          projectId={projectToEdit}
          onClose={() => setProjectToEdit(null)}
          onSuccess={() => {
            refetch();
          }}
        />
      )}
    </AppLayout>
  );
}
