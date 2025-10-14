/**
 * Workspaces Page
 * Displays list of workspaces with filtering, search, and pagination
 *
 * Uses React Query hooks for data fetching and mutations.
 */

import { useState } from 'react';
import { Plus, Search, Grid, List, FolderOpen, Folders } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkspaces, useProject } from '../hooks';
import { WorkspaceCard } from '../components/Workspace/WorkspaceCard';
import { CreateWorkspaceDialog } from '../components/Workspace/CreateWorkspaceDialog';
import { DeleteWorkspaceDialog } from '../components/Workspace/DeleteWorkspaceDialog';
import { Breadcrumb } from '../components/Navigation/Breadcrumb';

type ViewMode = 'grid' | 'list';

export function WorkspacesPage() {
  const navigate = useNavigate();
  const { projectId } = useParams<{ projectId: string }>();

  // View mode state (persisted in localStorage)
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem('workspacesViewMode');
    return (saved === 'grid' || saved === 'list') ? saved : 'grid';
  });

  // Filter and search state
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'updated_at'>('updated_at');
  const [page, setPage] = useState(1);

  // Dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<string | null>(null);

  // Fetch project details
  const { data: project } = useProject(projectId || '', {
    enabled: !!projectId
  });

  // Fetch workspaces
  const { data, isLoading, error, refetch } = useWorkspaces({
    project_id: projectId,
    search: search || undefined,
    sort_by: sortBy,
    sort_order: 'desc',
    page,
    limit: 20
  });

  // Handlers
  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('workspacesViewMode', mode);
  };

  const handleOpenWorkspace = (workspaceId: string) => {
    navigate(`/workspaces/${workspaceId}`);
  };

  const handleDeleteWorkspace = (workspaceId: string) => {
    setWorkspaceToDelete(workspaceId);
  };

  const handleWorkspaceDeleted = () => {
    setWorkspaceToDelete(null);
    refetch();
  };

  const handleWorkspaceSettings = (workspaceId: string) => {
    navigate(`/workspaces/${workspaceId}/settings`);
  };

  if (!projectId) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            No Project Selected
          </h2>
          <p className="text-gray-500">
            Please select a project to view workspaces
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Breadcrumb
                items={[
                  {
                    label: 'Projects',
                    href: '/projects',
                    icon: <Folders className="w-4 h-4" />
                  },
                  {
                    label: project?.name || 'Workspaces',
                    icon: <FolderOpen className="w-4 h-4" />
                  }
                ]}
                showHome={false}
              />
              <h1 className="text-3xl font-bold text-gray-900 mt-2">
                {project?.name || 'Workspaces'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage workspaces for this project
              </p>
            </div>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Workspace
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search workspaces..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              {/* Sort */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'created_at' | 'updated_at')}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                <option value="updated_at">Last Updated</option>
                <option value="created_at">Date Created</option>
                <option value="name">Name (A-Z)</option>
              </select>

              {/* View Mode Toggle */}
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => handleViewModeChange('grid')}
                  className={`px-3 py-2 ${
                    viewMode === 'grid'
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                  } transition-colors`}
                  title="Grid view"
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleViewModeChange('list')}
                  className={`px-3 py-2 border-l border-gray-300 ${
                    viewMode === 'list'
                      ? 'bg-blue-50 text-blue-600'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
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
              <p className="text-red-600 font-medium mb-2">Error loading workspaces</p>
              <p className="text-sm text-gray-500 mb-4">{error.message}</p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
                {search ? 'No workspaces found' : 'No workspaces yet'}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {search
                  ? 'Try adjusting your search query'
                  : 'Create your first workspace to get started'}
              </p>
              {!search && (
                <button
                  onClick={() => setShowCreateDialog(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First Workspace
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Workspaces grid/list */}
            <div className={viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
              : 'space-y-4'
            }>
              {data.data.map((workspace) => (
                <WorkspaceCard
                  key={workspace.id}
                  workspace={workspace}
                  viewMode={viewMode}
                  onOpen={() => handleOpenWorkspace(workspace.id)}
                  onDelete={() => handleDeleteWorkspace(workspace.id)}
                  onSettings={() => handleWorkspaceSettings(workspace.id)}
                />
              ))}
            </div>

            {/* Pagination */}
            {data.pagination.total_pages > 1 && (
              <div className="mt-8 flex items-center justify-between border-t border-gray-200 pt-4">
                <div className="text-sm text-gray-500">
                  Showing {((page - 1) * data.pagination.limit) + 1} to{' '}
                  {Math.min(page * data.pagination.limit, data.pagination.total)} of{' '}
                  {data.pagination.total} workspaces
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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
                          className={`px-3 py-1 border rounded-lg text-sm ${
                            page === pageNum
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setPage(p => Math.min(data.pagination.total_pages, p + 1))}
                    disabled={page === data.pagination.total_pages}
                    className="px-3 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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
      {showCreateDialog && projectId && (
        <CreateWorkspaceDialog
          projectId={projectId}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => {
            setShowCreateDialog(false);
            refetch();
          }}
        />
      )}

      {workspaceToDelete && (
        <DeleteWorkspaceDialog
          workspaceId={workspaceToDelete}
          onClose={() => setWorkspaceToDelete(null)}
          onSuccess={handleWorkspaceDeleted}
        />
      )}
    </div>
  );
}
