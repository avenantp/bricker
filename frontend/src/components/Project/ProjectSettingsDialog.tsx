/**
 * Project Settings Dialog
 * Multi-tab dialog for managing project settings
 */

import { useState, useEffect } from 'react';
import { X, Settings, Users, Sliders, AlertCircle } from 'lucide-react';
import { useProject, useUpdateProject, useProjectUsers } from '../../hooks';
import { ProjectType, ProjectVisibility, UpdateProjectInput } from '@/types/project';

interface ProjectSettingsDialogProps {
  projectId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

type TabId = 'general' | 'configuration' | 'users';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: Tab[] = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'configuration', label: 'Configuration', icon: Sliders },
  { id: 'users', label: 'Users', icon: Users },
];

export function ProjectSettingsDialog({
  projectId,
  onClose,
  onSuccess,
}: ProjectSettingsDialogProps) {
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Fetch project data
  const { data: project, isLoading } = useProject(projectId);
  const { data: users } = useProjectUsers(projectId);

  // Update mutation
  const updateProjectMutation = useUpdateProject({
    onSuccess: () => {
      setHasUnsavedChanges(false);
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Failed to update project:', error);
    }
  });

  // Form state for general tab
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<ProjectVisibility>(ProjectVisibility.Private);
  const [isLocked, setIsLocked] = useState(false);

  // Initialize form when project loads
  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description || '');
      setVisibility(project.visibility);
      setIsLocked(project.is_locked);
    }
  }, [project]);

  const handleSave = () => {
    const input: UpdateProjectInput = {};

    if (name !== project?.name) input.name = name;
    if (description !== (project?.description || '')) input.description = description;
    if (visibility !== project?.visibility) input.visibility = visibility;
    if (isLocked !== project?.is_locked) input.is_locked = isLocked;

    if (Object.keys(input).length > 0) {
      updateProjectMutation.mutate({ projectId, input });
    }
  };

  const handleClose = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to close?'
      );
      if (!confirmed) return;
    }
    onClose();
  };

  if (isLoading || !project) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full h-[600px] flex items-center justify-center">
          <div className="text-gray-500">Loading project settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Project Settings</h2>
              <p className="text-sm text-gray-600">{project.name}</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={updateProjectMutation.isPending}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && (
            <GeneralTab
              name={name}
              description={description}
              visibility={visibility}
              isLocked={isLocked}
              projectType={project.project_type}
              onNameChange={(value) => {
                setName(value);
                setHasUnsavedChanges(true);
              }}
              onDescriptionChange={(value) => {
                setDescription(value);
                setHasUnsavedChanges(true);
              }}
              onVisibilityChange={(value) => {
                setVisibility(value);
                setHasUnsavedChanges(true);
              }}
              onIsLockedChange={(value) => {
                setIsLocked(value);
                setHasUnsavedChanges(true);
              }}
            />
          )}

          {activeTab === 'configuration' && (
            <ConfigurationTab
              projectType={project.project_type}
              configuration={project.configuration}
            />
          )}

          {activeTab === 'users' && (
            <UsersTab
              projectId={projectId}
              users={users || []}
              currentUserRole={project.user_role}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div>
            {hasUnsavedChanges && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <AlertCircle className="w-4 h-4" />
                <span>You have unsaved changes</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              disabled={updateProjectMutation.isPending}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={updateProjectMutation.isPending || !hasUnsavedChanges}
            >
              {updateProjectMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {updateProjectMutation.isError && (
          <div className="px-6 py-3 bg-red-50 border-t border-red-200">
            <p className="text-sm text-red-600">
              {updateProjectMutation.error?.message || 'Failed to save changes'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// General Tab Component
interface GeneralTabProps {
  name: string;
  description: string;
  visibility: ProjectVisibility;
  isLocked: boolean;
  projectType: ProjectType;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onVisibilityChange: (value: ProjectVisibility) => void;
  onIsLockedChange: (value: boolean) => void;
}

function GeneralTab({
  name,
  description,
  visibility,
  isLocked,
  projectType,
  onNameChange,
  onDescriptionChange,
  onVisibilityChange,
  onIsLockedChange,
}: GeneralTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h3>

        {/* Project Name */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter project name"
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Enter project description"
          />
        </div>

        {/* Project Type (Read-only) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Type
          </label>
          <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700">
            {projectType}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Project type cannot be changed after creation
          </p>
        </div>

        {/* Visibility */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Visibility
          </label>
          <select
            value={visibility}
            onChange={(e) => onVisibilityChange(e.target.value as ProjectVisibility)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="private">Private</option>
            <option value="public">Public</option>
            <option value="locked">Locked</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Control who can access this project
          </p>
        </div>

        {/* Lock Project */}
        <div className="flex items-start gap-3">
          <input
            id="isLocked"
            type="checkbox"
            checked={isLocked}
            onChange={(e) => onIsLockedChange(e.target.checked)}
            className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <div className="flex-1">
            <label htmlFor="isLocked" className="text-sm font-medium text-gray-700 cursor-pointer">
              Lock project
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Prevent any modifications to the project until unlocked
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Configuration Tab Component
interface ConfigurationTabProps {
  projectType: ProjectType;
  configuration: any;
}

function ConfigurationTab({ projectType, configuration }: ConfigurationTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {projectType} Configuration
        </h3>

        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            Advanced configuration settings will be available in a future update.
          </p>
        </div>

        {/* Display current configuration as JSON */}
        {configuration && Object.keys(configuration).length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Current Configuration</h4>
            <pre className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-xs overflow-auto max-h-96">
              {JSON.stringify(configuration, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}

// Users Tab Component
interface UsersTabProps {
  projectId: string;
  users: any[];
  currentUserRole?: string;
}

function UsersTab({ users, currentUserRole }: UsersTabProps) {
  const canManageUsers = currentUserRole === 'owner' || currentUserRole === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Project Users</h3>
        {canManageUsers && (
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
            Add User
          </button>
        )}
      </div>

      {users.length === 0 ? (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">No users yet</p>
          <p className="text-sm text-gray-500">Add users to collaborate on this project</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">
                    {user.user?.full_name?.charAt(0) || 'U'}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {user.user?.full_name || 'Unknown User'}
                  </p>
                  <p className="text-sm text-gray-600">{user.user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  user.role === 'owner' ? 'bg-purple-100 text-purple-700' :
                  user.role === 'admin' ? 'bg-blue-100 text-blue-700' :
                  user.role === 'editor' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {user.role}
                </span>
                {canManageUsers && user.role !== 'owner' && (
                  <button className="text-gray-400 hover:text-red-600 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800">
          Full user management features will be available in a future update.
        </p>
      </div>
    </div>
  );
}
