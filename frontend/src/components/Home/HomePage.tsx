import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Settings, LogOut, User, ChevronRight, FolderOpen, Shield, Boxes } from 'lucide-react';
import { UrckLogo } from '../Logo/UrckLogo';
import { DevModeBanner } from '../DevMode/DevModeBanner';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useCanAccessAdmin } from '@/hooks/useDevMode';
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
  const { workspaces, loading: workspacesLoading } = useWorkspace();
  const { currentWorkspace, setCurrentWorkspace, userRole } = useStore();
  const canAccessAdmin = useCanAccessAdmin();

  const [projects, setProjects] = useState<Project[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

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

  const handleCreateWorkspace = async () => {
    // TODO: Implement workspace creation modal
    setShowCreateWorkspace(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Dev Mode Banner */}
      <DevModeBanner />

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <UrckLogo size="sm" />

          <div className="flex items-center gap-4">
            {canAccessAdmin && (
              <button
                onClick={() => navigate('/admin')}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Shield className="w-4 h-4" />
                Admin
              </button>
            )}

            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-gray-600" />
            </button>

            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user?.email}</p>
                    {userRole && (
                      <p className="text-xs text-gray-600 capitalize">{userRole}</p>
                    )}
                  </div>
                  <button
                    onClick={() => signOut()}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
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
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Workspaces</h3>
                  <button
                    onClick={handleCreateWorkspace}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                    title="Create Workspace"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              <div className="p-2">
                {workspacesLoading ? (
                  <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
                ) : workspaces.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-gray-500">No workspaces</div>
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
                          ? 'bg-primary-50 text-primary-900 font-medium'
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4" />
                        <span className="text-sm truncate">{workspace.name}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            {!currentWorkspace ? (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  No Workspace Selected
                </h2>
                <p className="text-gray-600 mb-6">
                  Select a workspace from the sidebar or create a new one to get started.
                </p>
                <button
                  onClick={handleCreateWorkspace}
                  className="btn-primary"
                >
                  Create Your First Workspace
                </button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="mb-6">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {currentWorkspace.name}
                  </h1>
                  <p className="text-gray-600">
                    Manage your Databricks automation projects
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
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                    <Boxes className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">
                      No Projects Yet
                    </h2>
                    <p className="text-gray-600 mb-6">
                      Create your first project to start building Databricks automation.
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
                        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-left group"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1 group-hover:text-primary-600">
                              {project.name}
                            </h3>
                            {project.description && (
                              <p className="text-gray-600 text-sm mb-3">
                                {project.description}
                              </p>
                            )}
                            <p className="text-xs text-gray-500">
                              Updated {new Date(project.updated_at).toLocaleDateString()}
                            </p>
                          </div>
                          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-600 flex-shrink-0" />
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
    </div>
  );
}
