import { useState, useEffect } from 'react';
import { Save, Trash2, Loader2, AlertTriangle, GitBranch } from 'lucide-react';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useStore } from '@/store/useStore';
import { useNavigate } from 'react-router-dom';

export function WorkspaceSettings() {
  const navigate = useNavigate();
  const { currentWorkspace } = useStore();
  const { updateWorkspace, deleteWorkspace, getUserRole } = useWorkspace();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [githubRepo, setGithubRepo] = useState('');
  const [githubConnectionStatus, setGithubConnectionStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (currentWorkspace) {
      setName(currentWorkspace.name);
      setDescription(currentWorkspace.description || '');
      setGithubRepo(currentWorkspace.github_repo_url || '');
      setGithubConnectionStatus(currentWorkspace.github_connection_status || 'disconnected');

      getUserRole(currentWorkspace.id).then(role => setUserRole(role));
    }
  }, [currentWorkspace]);

  const handleSave = async () => {
    if (!currentWorkspace) return;

    setError(null);
    setSuccess(null);
    setSaving(true);

    try {
      await updateWorkspace(currentWorkspace.id, {
        name,
        description: description || null,
        github_repo_url: githubRepo || null,
      });

      setSuccess('Workspace settings updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update workspace');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentWorkspace) return;

    setDeleting(true);

    try {
      await deleteWorkspace(currentWorkspace.id);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete workspace');
      setDeleting(false);
    }
  };

  const canEdit = userRole === 'owner' || userRole === 'admin';
  const canDelete = userRole === 'owner';

  if (!currentWorkspace) {
    return (
      <div className="p-6">
        <p className="text-gray-500">No workspace selected</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Workspace Settings</h2>
        <p className="text-gray-600 mt-1">
          Manage your workspace configuration and settings
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* General Settings */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">General</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Workspace Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input-field w-full"
              disabled={!canEdit || saving}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-field w-full resize-none"
              rows={3}
              disabled={!canEdit || saving}
            />
          </div>
        </div>
      </div>

      {/* GitHub Integration */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="w-5 h-5 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">GitHub Integration</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GitHub Repository URL
            </label>
            <input
              type="text"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              className="input-field w-full"
              placeholder="https://github.com/username/repo"
              disabled={!canEdit || saving}
            />
            <p className="mt-1 text-xs text-gray-500">
              Repository where node definitions will be stored
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Connection Status
            </label>
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                githubConnectionStatus === 'connected' ? 'bg-green-500' :
                githubConnectionStatus === 'error' ? 'bg-red-500' :
                githubConnectionStatus === 'pending' ? 'bg-yellow-500' :
                'bg-gray-300'
              }`} />
              <span className="text-sm text-gray-700 capitalize">
                {githubConnectionStatus || 'Not connected'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <div>
          {canEdit && (
            <button
              onClick={handleSave}
              disabled={saving || !name}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          )}
        </div>

        {canDelete && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Workspace
          </button>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
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
              Are you sure you want to delete <strong>{currentWorkspace.name}</strong>?
              This will permanently delete all projects, nodes, and configurations associated with this workspace.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-secondary flex-1"
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
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
