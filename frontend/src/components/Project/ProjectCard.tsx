/**
 * Project Card Component
 * Displays project information in grid or list format
 */

import { useState } from 'react';
import {
  MoreVertical,
  Trash2,
  Copy,
  Settings,
  FolderOpen,
  Users,
  Calendar,
  GitBranch,
  CheckCircle,
  XCircle,
  AlertCircle,
  Lock,
  Unlock,
} from 'lucide-react';
import type { ProjectWithDetails } from '@/types/project';
import { getProviderDisplayName, getConnectionStatusColor } from '@/types/workspace';
import { Card } from '@/components/ui/Card';

type ViewMode = 'grid' | 'list';

interface ProjectCardProps {
  project: ProjectWithDetails;
  viewMode?: ViewMode;
  onOpen?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onSettings?: () => void;
}

export function ProjectCard({
  project,
  viewMode = 'grid',
  onOpen,
  onDelete,
  onDuplicate,
  onSettings,
}: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);


  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'private':
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600';
      case 'team':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-700';
      case 'organization':
        return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-700';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600';
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

  const getSourceControlStatusIcon = () => {
    if (!project.source_control_provider) {
      return <XCircle className="w-4 h-4 text-gray-400 dark:text-gray-500" />;
    }

    const statusColor = getConnectionStatusColor(project.source_control_connection_status);

    switch (statusColor) {
      case 'green':
        return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-500" />;
      case 'red':
        return <XCircle className="w-4 h-4 text-red-600 dark:text-red-500" />;
      case 'yellow':
      case 'orange':
        return <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-500" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-400 dark:text-gray-500" />;
    }
  };

  if (viewMode === 'list') {
    return (
      <Card
        variant="bordered"
        padding="none"
        interactive
        viewMode="list"
        onClick={onOpen}
      >
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                  {project.name}
                </h3>
                {project.is_locked ? (
                  <Lock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                ) : (
                  <Unlock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                )}
                <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getVisibilityColor(project.visibility)}`}>
                  {project.visibility}
                </span>
              </div>
              {project.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-1 mb-2">
                  {project.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {project.user_count || 1} {project.user_count === 1 ? 'user' : 'users'}
                </span>
                <span className="flex items-center gap-1">
                  <FolderOpen className="w-3 h-3" />
                  {project.workspace_count || 0} {project.workspace_count === 1 ? 'workspace' : 'workspaces'}
                </span>
                <span className="flex items-center gap-1">
                  <GitBranch className="w-3 h-3" />
                  {getProviderDisplayName(project.source_control_provider)}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Updated {formatDate(project.updated_at)}
                </span>
              </div>
            </div>

            {/* Actions Menu */}
            <div className="relative ml-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(!showMenu);
                }}
                className="btn-icon text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <MoreVertical className="w-5 h-5" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                    }}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                    {onOpen && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpen();
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <FolderOpen className="w-4 h-4" />
                        Open
                      </button>
                    )}
                    {onDuplicate && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDuplicate();
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Copy className="w-4 h-4" />
                        Duplicate
                      </button>
                    )}
                    {onSettings && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSettings();
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </button>
                    )}
                    {onDelete && (
                      <>
                        <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Grid view
  return (
    <Card
      variant="bordered"
      padding="none"
      interactive
      viewMode="grid"
      onClick={onOpen}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate mb-2">
              {project.name}
            </h3>
            {project.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                {project.description}
              </p>
            )}
          </div>

          {/* Actions Menu */}
          <div className="relative ml-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="btn-icon p-1 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-20">
                  {onOpen && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <FolderOpen className="w-4 h-4" />
                      Open
                    </button>
                  )}
                  {onDuplicate && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Duplicate
                    </button>
                  )}
                  {onSettings && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSettings();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                  )}
                  {onDelete && (
                    <>
                      <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete();
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {project.is_locked ? (
            <Lock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          ) : (
            <Unlock className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          )}
          <span className={`px-2 py-1 text-xs font-medium rounded border ${getVisibilityColor(project.visibility)}`}>
            {project.visibility}
          </span>
        </div>

        {/* Stats */}
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span>{project.user_count || 1} {project.user_count === 1 ? 'user' : 'users'}</span>
          </div>
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-gray-400 dark:text-gray-500" />
            <span>{project.workspace_count || 0} {project.workspace_count === 1 ? 'workspace' : 'workspaces'}</span>
          </div>
          <div className="flex items-center gap-2">
            {getSourceControlStatusIcon()}
            <span className="text-xs">
              {project.source_control_provider
                ? getProviderDisplayName(project.source_control_provider)
                : 'No source control'}
            </span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 rounded-b-lg">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Updated {formatDate(project.updated_at)}
          </span>
          {project.owner && (
            <span className="truncate" title={project.owner.email}>
              {project.owner.full_name}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
