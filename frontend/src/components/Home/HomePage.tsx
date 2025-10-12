import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Settings, LogOut, User, ChevronRight, FolderOpen, Shield, Boxes, FlaskConical, Moon, Sun, Loader2 } from 'lucide-react';
import { UroqLogo } from '../Logo/UroqLogo';
import { DevModeBanner } from '../DevMode/DevModeBanner';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useCanAccessAdmin, useDevMode } from '@/hooks/useDevMode';
import { useStore } from '@/store/useStore';
import { supabase } from '@/lib/supabase';

interface Project {
  id: string;
  name: string;
  description: string | null;
  workspace_id: string;
  created_at: string;
  updated_at: string;
}

export function HomePage() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { workspaces, loading: workspacesLoading, createWorkspace } = useWorkspace();
  const { currentWorkspace, setCurrentWorkspace, userRole, isDarkMode, toggleDarkMode } = useStore();
  const canAccessAdmin = useCanAccessAdmin();
  const { isDevMode } = useDevMode();

  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDescription, setNewWorkspaceDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Load projects for current workspace
  useEffect(() => {
    if (!currentWorkspace) return;

    const loadProjects = async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('workspace_id', currentWorkspace.id)
          .order('updated_at', { ascending: false });

        if (!error && data) {
          setProjects(data);
        } else if (error) {
          console.error('Error loading projects:', error);
          // Table might not exist yet, that's okay
          setProjects([]);
        }
      } catch (err) {
        console.error('Failed to load projects:', err);
        setProjects([]);
      }
    };

    loadProjects();
  }, [currentWorkspace]);

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleProjectClick = (projectId: string) => {
    navigate(`/workspace/${currentWorkspace?.id}/project/${projectId}`);
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      const workspace = await createWorkspace(newWorkspaceName, newWorkspaceDescription);
      setCurrentWorkspace({
        id: workspace.id,
        name: workspace.name,
        owner_id: workspace.owner_id,
        created_at: new Date(workspace.created_at),
      });
      setShowCreateWorkspace(false);
      setNewWorkspaceName('');
      setNewWorkspaceDescription('');
    } catch (error) {
      console.error('Failed to create workspace:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Dev Mode Banner */}
      <DevModeBanner />

      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <UroqLogo size="sm" />

          <div className="flex items-center gap-4">
            {/* Dev Mode - Template Editor */}
            {isDevMode && (
              <button
                onClick={() => navigate('/templates')}
                className="flex items-center gap-2 px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-all shadow-sm"
                title="Template Editor (Dev Mode)"
              >
                <FlaskConical className="w-4 h-4" />
                <span className="text-sm font-medium">Templates</span>
              </button>
            )}

            {canAccessAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <Shield className="w-4 h-4" />
                Admin
              </button>
            )}

            <button
              onClick={() => {
                console.log('[HomePage] Dark mode button clicked!');
                console.log('[HomePage] Current isDarkMode:', isDarkMode);
                toggleDarkMode();
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? (
                <Sun className="w-5 h-5 text-yellow-600" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              )}
            </button>

            <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-primary-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-2">
                  <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{user?.email}</p>
                    {userRole && (
                      <p className="text-xs text-gray-600 dark:text-gray-300 capitalize">{userRole}</p>
                    )}
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <aside className="w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {currentWorkspace ? 'Projects' : 'Workspaces'}
                  </h3>
                  <button
                    onClick={() => currentWorkspace ? navigate(`/workspace/${currentWorkspace.id}/new`) : setShowCreateWorkspace(true)}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    title={currentWorkspace ? "Create Project" : "Create Workspace"}
                  >
                    <Plus className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </button>
                </div>
              </div>

              <div className="p-2">
                {currentWorkspace ? (
                  // Show projects when workspace is selected
                  projects.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-300">
                      No projects yet.
                    </div>
                  ) : (
                    projects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => navigate(`/workspace/${currentWorkspace.id}/project/${project.id}`)}
                        className="w-full px-3 py-2 rounded-lg text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
                      >
                        <div className="flex items-center gap-2">
                          <Boxes className="w-4 h-4" />
                          <span className="text-sm truncate">{project.name}</span>
                        </div>
                        {project.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                            {project.description}
                          </div>
                        )}
                      </button>
                    ))
                  )
                ) : (
                  // Show workspaces when no workspace is selected
                  workspacesLoading ? (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-300">Loading...</div>
                  ) : workspaces.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-300">No workspaces</div>
                  ) : (
                    workspaces.map((workspace) => (
                      <button
                        key={workspace.id}
                        onClick={() => setCurrentWorkspace({
                          id: workspace.id,
                          name: workspace.name,
                          owner_id: workspace.owner_id,
                          created_at: new Date(workspace.created_at)
                        })}
                        className={`w-full px-3 py-2 rounded-lg text-left transition-colors ${
                          currentWorkspace?.id === workspace.id
                            ? 'bg-primary-50/30 text-primary-900 font-medium'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <FolderOpen className="w-4 h-4" />
                          <span className="text-sm truncate">{workspace.name}</span>
                        </div>
                      </button>
                    ))
                  )
                )}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {!currentWorkspace ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                <FolderOpen className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No Workspace Selected
                </h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Select a workspace from the sidebar or create a new one to get started.
                </p>
                <button
                  onClick={() => setShowCreateWorkspace(true)}
                  className="btn-primary"
                >
                  Create Your First Workspace
                </button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    {currentWorkspace.name}
                  </h1>
                  <p className="text-gray-600 dark:text-gray-300">
                    Manage your automation projects
                  </p>
                </div>

                {/* Search and Create */}
                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search projects..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <button
                    onClick={() => navigate(`/workspace/${currentWorkspace.id}/new`)}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Create Project
                  </button>
                </div>

                {/* Projects List */}
                {filteredProjects.length === 0 ? (
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
                    <Boxes className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                      No Projects Yet
                    </h2>
                    <p className="text-gray-600 dark:text-gray-300 mb-6">
                      Create your first project to start building automation.
                    </p>
                    <button
                      onClick={() => navigate(`/workspace/${currentWorkspace.id}/new`)}
                      className="btn-primary"
                    >
                      Create Your First Project
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredProjects.map((project) => (
                      <button
                        key={project.id}
                        onClick={() => handleProjectClick(project.id)}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow text-left group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1 group-hover:text-primary-500">
                              {project.name}
                            </h3>
                            {project.description && (
                              <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">
                                {project.description}
                              </p>
                            )}
                            <p className="text-xs text-gray-500 dark:text-gray-500">
                              Updated {new Date(project.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 flex-shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Create Workspace Modal */}
      {showCreateWorkspace && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Create New Workspace
            </h2>

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Workspace Name *
                </label>
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  className="input-field w-full"
                  placeholder="My Workspace"
                  required
                  disabled={creating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newWorkspaceDescription}
                  onChange={(e) => setNewWorkspaceDescription(e.target.value)}
                  className="input-field w-full resize-none"
                  rows={3}
                  placeholder="Data models for our data warehouse..."
                  disabled={creating}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateWorkspace(false);
                    setNewWorkspaceName('');
                    setNewWorkspaceDescription('');
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
    </div>
  );
}
