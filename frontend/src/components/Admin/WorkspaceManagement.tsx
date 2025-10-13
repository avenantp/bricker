import { useState, useEffect } from 'react';
import { Search, FolderOpen, Users, Calendar, GitBranch, Trash2, Settings as SettingsIcon, Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

interface WorkspaceWithDetails {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  source_control_repo_url: string | null;
  source_control_connection_status: string | null;
  created_at: string;
  updated_at: string;
  owner_email?: string;
  member_count?: number;
  project_count?: number;
}

export function WorkspaceManagement() {
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<WorkspaceWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWorkspace, setSelectedWorkspace] = useState<WorkspaceWithDetails | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWorkspaces();
  }, []);

  const loadWorkspaces = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all workspaces with owner information
      const { data: workspacesData, error: workspacesError } = await supabase
        .from('workspaces')
        .select(`
          *,
          users!workspaces_owner_id_fkey(email)
        `)
        .order('created_at', { ascending: false });

      if (workspacesError) throw workspacesError;

      // Get member counts
      const { data: memberCounts, error: memberError } = await supabase
        .from('workspace_members')
        .select('workspace_id, user_id');

      if (memberError) throw memberError;

      // Get project counts
      const { data: projectCounts, error: projectError } = await supabase
        .from('projects')
        .select('workspace_id, id');

      if (projectError) {
        // Projects table might not exist yet
        console.log('Projects table not found, skipping count');
      }

      // Combine data
      const workspacesWithDetails = (workspacesData || []).map((ws: any) => ({
        ...ws,
        owner_email: ws.users?.email || 'Unknown',
        member_count: memberCounts?.filter(m => m.workspace_id === ws.id).length || 0,
        project_count: projectCounts?.filter(p => p.workspace_id === ws.id).length || 0,
      }));

      setWorkspaces(workspacesWithDetails);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load workspaces');
      console.error('Error loading workspaces:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (workspaceId: string) => {
    setDeleting(true);

    try {
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspaceId);

      if (error) throw error;

      await loadWorkspaces();
      setShowDeleteConfirm(false);
      setSelectedWorkspace(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workspace');
    } finally {
      setDeleting(false);
    }
  };

  const filteredWorkspaces = workspaces.filter(ws =>
    ws.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ws.owner_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ws.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Workspace Management</h2>
        <p className="text-gray-600">
          View and manage all workspaces across the platform
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search workspaces by name, owner, or description..."
            className="input-field w-full pl-10"
          />
        </div>
      </div>

      {/* Workspaces List */}
      {filteredWorkspaces.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {searchQuery ? 'No workspaces found' : 'No workspaces yet'}
          </h3>
          <p className="text-gray-600">
            {searchQuery ? 'Try adjusting your search query' : 'Workspaces will appear here once users create them'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Workspace
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Members
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Projects
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  GitHub
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredWorkspaces.map((workspace) => (
                <tr key={workspace.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">{workspace.name}</span>
                      </div>
                      {workspace.description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">
                          {workspace.description}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{workspace.owner_email}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Users className="w-4 h-4" />
                      <span>{workspace.member_count || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600">
                      {workspace.project_count || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {workspace.source_control_repo_url ? (
                        <>
                          <div className={`w-2 h-2 rounded-full ${
                            workspace.source_control_connection_status === 'connected' ? 'bg-green-500' :
                            workspace.source_control_connection_status === 'error' ? 'bg-red-500' :
                            workspace.source_control_connection_status === 'pending' ? 'bg-yellow-500' :
                            'bg-gray-300'
                          }`} />
                          <GitBranch className="w-4 h-4 text-gray-400" />
                        </>
                      ) : (
                        <span className="text-xs text-gray-400">Not connected</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(workspace.created_at).toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          // Navigate to workspace settings
                          navigate(`/workspace/${workspace.id}/settings`);
                        }}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        title="Workspace Settings"
                      >
                        <SettingsIcon className="w-4 h-4 text-gray-600" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedWorkspace(workspace);
                          setShowDeleteConfirm(true);
                        }}
                        className="p-1 hover:bg-red-100 rounded transition-colors"
                        title="Delete Workspace"
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && selectedWorkspace && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Delete Workspace</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-6">
              Are you sure you want to delete <strong>{selectedWorkspace.name}</strong>?
              This will permanently delete:
            </p>

            <ul className="text-sm text-gray-700 mb-6 space-y-1 list-disc list-inside">
              <li>{selectedWorkspace.member_count || 0} workspace member(s)</li>
              <li>{selectedWorkspace.project_count || 0} project(s)</li>
              <li>All associated configurations and data</li>
            </ul>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedWorkspace(null);
                }}
                className="btn-secondary flex-1"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(selectedWorkspace.id)}
                className="btn-danger flex-1 flex items-center justify-center gap-2"
                disabled={deleting}
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
