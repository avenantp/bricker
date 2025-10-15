/**
 * Project Settings Dialog
 * Multi-tab dialog for managing project settings
 */

import { useState, useEffect } from 'react';
import { X, Settings, Users, Sliders, AlertCircle, GitBranch, CheckCircle, XCircle, RefreshCw, Trash2, Eye, EyeOff } from 'lucide-react';
import {
  useProject,
  useUpdateProject,
  useProjectUsers,
  useProjectSourceControlStatus,
  useConnectProjectSourceControl,
  useDisconnectProjectSourceControl,
  useTestProjectSourceControl,
  useProjectBranches
} from '../../hooks';
import { ProjectType, ProjectVisibility, UpdateProjectInput } from '@/types/project';
import { SourceControlProvider } from '@/types/source-control';
import { getProviderDisplayName, getConnectionStatusColor } from '@/types/workspace';

interface ProjectSettingsDialogProps {
  projectId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

type TabId = 'general' | 'source-control' | 'configuration' | 'users';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const tabs: Tab[] = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'source-control', label: 'Source Control', icon: GitBranch },
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

          {activeTab === 'source-control' && (
            <SourceControlTab projectId={projectId} />
          )}

          {activeTab === 'configuration' && (
            <ConfigurationTab
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
  configuration: any;
}

function ConfigurationTab({ configuration }: ConfigurationTabProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Project Configuration
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

// Source Control Tab Component
interface SourceControlTabProps {
  projectId: string;
}

function SourceControlTab({ projectId }: SourceControlTabProps) {
  const { data: project } = useProject(projectId);
  const { data: status, refetch: refetchStatus } = useProjectSourceControlStatus(projectId);
  const { data: branches } = useProjectBranches(projectId, { enabled: !!project?.source_control_provider });
  const { refetch: testConnection } = useTestProjectSourceControl(projectId);

  const connectMutation = useConnectProjectSourceControl();
  const disconnectMutation = useDisconnectProjectSourceControl();

  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState<SourceControlProvider>(SourceControlProvider.GitHub);
  const [repoUrl, setRepoUrl] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [defaultBranch, setDefaultBranch] = useState('main');
  const [username, setUsername] = useState('');
  const [testResult, setTestResult] = useState<{ connected: boolean; message: string } | null>(null);

  const handleConnect = async () => {
    if (!repoUrl.trim() || !accessToken.trim()) {
      alert('Repository URL and Access Token are required');
      return;
    }

    connectMutation.mutate(
      {
        projectId,
        provider,
        repoUrl: repoUrl.trim(),
        accessToken: accessToken.trim(),
        defaultBranch: defaultBranch.trim() || 'main',
        username: username.trim() || undefined
      },
      {
        onSuccess: () => {
          setIsConnecting(false);
          setAccessToken('');
          refetchStatus();
        }
      }
    );
  };

  const handleDisconnect = async () => {
    if (!window.confirm('Are you sure you want to disconnect source control? This will not affect existing workspaces but they will no longer sync.')) {
      return;
    }

    disconnectMutation.mutate(projectId, {
      onSuccess: () => {
        setRepoUrl('');
        setAccessToken('');
        setDefaultBranch('main');
        setUsername('');
        refetchStatus();
      }
    });
  };

  const handleTest = async () => {
    const result = await testConnection();
    setTestResult(result.data || null);
  };

  const isConnected = project?.source_control_provider !== null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Source Control</h3>

        {!isConnected && !isConnecting && (
          <>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <p className="text-sm text-blue-800">
                Connect this project to a source control repository. Workspaces within this project can then connect to specific branches.
              </p>
            </div>

            <button
              onClick={() => setIsConnecting(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <GitBranch className="w-4 h-4" />
              Connect Source Control
            </button>
          </>
        )}

        {isConnecting && !isConnected && (
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Provider *</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as SourceControlProvider)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={SourceControlProvider.GitHub}>GitHub</option>
                <option value={SourceControlProvider.GitLab}>GitLab</option>
                <option value={SourceControlProvider.Bitbucket}>Bitbucket</option>
                <option value={SourceControlProvider.Azure}>Azure DevOps</option>
                <option value={SourceControlProvider.Other}>Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Repository URL *</label>
              <input
                type="url"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/username/repository"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Access Token *</label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={accessToken}
                  onChange={(e) => setAccessToken(e.target.value)}
                  placeholder="ghp_xxxxxxxxxxxx or pat_xxxxxxxxxxxx"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Default Branch</label>
                <input
                  type="text"
                  value={defaultBranch}
                  onChange={(e) => setDefaultBranch(e.target.value)}
                  placeholder="main"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Username (Optional)</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="your-username"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleConnect}
                disabled={connectMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {connectMutation.isPending ? 'Connecting...' : 'Connect'}
              </button>
              <button
                onClick={() => setIsConnecting(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>

            {connectMutation.isError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{connectMutation.error?.message}</p>
              </div>
            )}
          </div>
        )}

        {isConnected && status && (
          <div className="space-y-4">
            <div className="p-4 border border-gray-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    getConnectionStatusColor(project.source_control_connection_status) === 'green' ? 'bg-green-500' :
                    getConnectionStatusColor(project.source_control_connection_status) === 'red' ? 'bg-red-500' :
                    'bg-gray-400'
                  }`} />
                  <div>
                    <p className="font-medium text-gray-900">
                      {getProviderDisplayName(project.source_control_provider)}
                    </p>
                    <p className="text-sm text-gray-600">{project.source_control_repo_url}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTest}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Test
                  </button>
                  <button
                    onClick={handleDisconnect}
                    disabled={disconnectMutation.isPending}
                    className="px-3 py-1 text-sm border border-red-300 rounded-lg text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Disconnect
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-200">
                <div>
                  <p className="text-xs text-gray-500">Default Branch</p>
                  <p className="text-sm font-medium text-gray-900">{status.default_branch || 'main'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Workspaces</p>
                  <p className="text-sm font-medium text-gray-900">{status.workspace_count}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Last Synced</p>
                  <p className="text-sm font-medium text-gray-900">
                    {status.last_synced_at ? new Date(status.last_synced_at).toLocaleString() : 'Never'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Credentials</p>
                  <p className="text-sm font-medium text-gray-900">
                    {status.has_credentials ? (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Stored
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-600">
                        <XCircle className="w-4 h-4" />
                        Missing
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {testResult && (
              <div className={`p-3 border rounded-lg ${
                testResult.connected
                  ? 'bg-green-50 border-green-200'
                  : 'bg-red-50 border-red-200'
              }`}>
                <p className={`text-sm ${testResult.connected ? 'text-green-800' : 'text-red-800'}`}>
                  {testResult.message}
                </p>
              </div>
            )}

            {branches && branches.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Available Branches ({branches.length})</h4>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                  <div className="space-y-1">
                    {branches.map((branch) => (
                      <div
                        key={branch}
                        className="px-2 py-1 text-sm text-gray-700 hover:bg-gray-50 rounded"
                      >
                        {branch}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
