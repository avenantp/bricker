/**
 * Workspace Diagrams Page
 * Displays list of diagrams for a specific workspace
 */

import { useState, useEffect } from 'react';
import { Plus, FileText, Star, MoreVertical, Trash2, Settings, ArrowLeft, Edit } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkspaceDiagrams, useWorkspace, useDeleteWorkspaceDiagram, useSetDefaultDiagram } from '../hooks';
import { useSearch } from '../contexts/SearchContext';
import { AppLayout } from '../components/Layout';
import { EditDiagramDialog } from '../components/Diagram/EditDiagramDialog';
import type { WorkspaceDiagram } from '@/types/workspaceDiagram';

export function WorkspaceDiagramsPage() {
  const navigate = useNavigate();
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { searchQuery: globalSearch, setSearchPlaceholder } = useSearch();

  // State
  const [diagramToDelete, setDiagramToDelete] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState<string | null>(null);
  const [diagramToEdit, setDiagramToEdit] = useState<string | null>(null);

  // Set search placeholder for this page
  useEffect(() => {
    setSearchPlaceholder('Search diagrams...');
  }, [setSearchPlaceholder]);

  // Fetch workspace details
  const { data: workspace } = useWorkspace(workspaceId || '');

  // Fetch diagrams
  const { data: diagrams, isLoading, error, refetch } = useWorkspaceDiagrams({
    workspace_id: workspaceId,
    search: globalSearch || undefined,
  });

  // Mutations
  const deleteDiagramMutation = useDeleteWorkspaceDiagram();
  const setDefaultMutation = useSetDefaultDiagram();

  // Handlers
  const handleOpenDiagram = (diagramId: string) => {
    navigate(`/workspaces/${workspaceId}/diagrams/${diagramId}`);
  };

  const handleDeleteDiagram = async (diagramId: string) => {
    if (!confirm('Are you sure you want to delete this diagram? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteDiagramMutation.mutateAsync(diagramId);
      setDiagramToDelete(null);
      refetch();
    } catch (error) {
      console.error('Error deleting diagram:', error);
      alert('Failed to delete diagram. Please try again.');
    }
  };

  const handleSetDefault = async (diagramId: string) => {
    try {
      await setDefaultMutation.mutateAsync(diagramId);
      refetch();
    } catch (error) {
      console.error('Error setting default diagram:', error);
      alert('Failed to set default diagram. Please try again.');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return date.toLocaleDateString();
  };

  if (!workspaceId) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">
              No Workspace Selected
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              Please select a workspace to view diagrams
            </p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (workspace?.project_id) {
                  navigate(`/projects/${workspace.project_id}/workspaces`);
                } else {
                  navigate(-1);
                }
              }}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors flex-shrink-0"
              title="Back to workspaces"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {workspace?.name || 'Workspace'} - Diagrams
              </h1>
            </div>

            {/* New Diagram Button */}
            <div className="flex-1 flex items-center justify-end gap-3">
              <button
                onClick={() => navigate(`/workspaces/${workspaceId}/diagrams/new`)}
                className="btn-primary inline-flex items-center gap-2 flex-shrink-0 !py-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                New Diagram
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {isLoading ? (
          // Loading skeleton
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 animate-pulse"
              >
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          // Error state
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <p className="text-red-600 dark:text-red-400 font-medium mb-2">Error loading diagrams</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error.message}</p>
              <button
                onClick={() => refetch()}
                className="btn-primary"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : !diagrams || diagrams.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <FileText className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                {globalSearch ? 'No diagrams found' : 'No diagrams yet'}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {globalSearch
                  ? 'Try adjusting your search query'
                  : 'Create your first diagram to get started'}
              </p>
              {!globalSearch && (
                <button
                  onClick={() => navigate(`/workspaces/${workspaceId}/diagrams/new`)}
                  className="btn-primary inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create Your First Diagram
                </button>
              )}
            </div>
          </div>
        ) : (
          // Diagrams grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {diagrams.map((diagram) => (
              <div
                key={diagram.id}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-400 transition-all cursor-pointer group"
                onClick={() => handleOpenDiagram(diagram.id)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors truncate">
                          {diagram.name}
                        </h3>
                        {diagram.is_default && (
                          <Star className="w-5 h-5 text-yellow-500 fill-current flex-shrink-0" title="Default diagram" />
                        )}
                      </div>
                      {diagram.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                          {diagram.description}
                        </p>
                      )}
                    </div>

                    {/* Actions Menu */}
                    <div className="relative ml-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(showMenu === diagram.id ? null : diagram.id);
                        }}
                        className="btn-icon p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>

                      {showMenu === diagram.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowMenu(null);
                            }}
                          />
                          <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDiagramToEdit(diagram.id);
                                setShowMenu(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <Edit className="w-4 h-4" />
                              Edit
                            </button>
                            {!diagram.is_default && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetDefault(diagram.id);
                                  setShowMenu(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                              >
                                <Star className="w-4 h-4" />
                                Set as Default
                              </button>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteDiagram(diagram.id);
                                setShowMenu(null);
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Diagram Type Badge */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                      {diagram.diagram_type}
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <span>Updated {formatDate(diagram.updated_at)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit Diagram Dialog */}
      {diagramToEdit && (
        <EditDiagramDialog
          diagramId={diagramToEdit}
          onClose={() => setDiagramToEdit(null)}
          onSuccess={() => {
            refetch();
            setDiagramToEdit(null);
          }}
        />
      )}
    </AppLayout>
  );
}
