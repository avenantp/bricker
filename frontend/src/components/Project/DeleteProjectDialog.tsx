/**
 * Delete Project Confirmation Dialog
 * Shows cascade warning before deleting a project
 */

import { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import type { Project, ProjectDeletionInfo } from '../../types/project';
import { getProjectDeletionInfo, deleteProject } from '../../lib/project-service';

interface DeleteProjectDialogProps {
  project: Project;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteProjectDialog({
  project,
  onClose,
  onDeleted,
}: DeleteProjectDialogProps) {
  const [loading, setLoading] = useState(true);
  const [deletionInfo, setDeletionInfo] = useState<ProjectDeletionInfo | null>(
    null
  );
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDeletionInfo();
  }, [project.id]);

  const loadDeletionInfo = async () => {
    setLoading(true);
    try {
      const info = await getProjectDeletionInfo(project.id);
      setDeletionInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deletion info');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (confirmText !== project.name) {
      setError('Project name does not match');
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await deleteProject(project.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Delete Project</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={deleting}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              Loading deletion info...
            </div>
          ) : error && !deletionInfo ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          ) : deletionInfo ? (
            <>
              {/* Warning Message */}
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800 font-medium mb-2">
                  This action cannot be undone!
                </p>
                <p className="text-sm text-red-700">
                  Deleting this project will permanently remove:
                </p>
              </div>

              {/* Cascade Warning */}
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded">
                  <span className="text-sm text-gray-700">Project</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {deletionInfo.project.name}
                  </span>
                </div>

                {deletionInfo.data_models_count > 0 && (
                  <div className="flex items-center justify-between py-2 px-3 bg-red-50 rounded">
                    <span className="text-sm text-red-700">Data Models</span>
                    <span className="text-sm font-semibold text-red-900">
                      {deletionInfo.data_models_count}
                    </span>
                  </div>
                )}

                {deletionInfo.uuid_registry_count > 0 && (
                  <div className="flex items-center justify-between py-2 px-3 bg-red-50 rounded">
                    <span className="text-sm text-red-700">
                      UUID Registry Entries
                    </span>
                    <span className="text-sm font-semibold text-red-900">
                      {deletionInfo.uuid_registry_count}
                    </span>
                  </div>
                )}

                {!deletionInfo.has_dependencies && (
                  <div className="py-2 px-3 bg-green-50 rounded">
                    <p className="text-sm text-green-700">
                      No dependencies found. This project can be safely deleted.
                    </p>
                  </div>
                )}
              </div>

              {/* Confirmation Input */}
              <div>
                <label
                  htmlFor="confirm"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Type <span className="font-bold">{project.name}</span> to
                  confirm deletion:
                </label>
                <input
                  id="confirm"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={project.name}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={deleting}
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={deleting || confirmText !== project.name || loading}
          >
            {deleting ? 'Deleting...' : 'Delete Project'}
          </button>
        </div>
      </div>
    </div>
  );
}
