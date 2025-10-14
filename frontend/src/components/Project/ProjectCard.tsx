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
} from 'lucide-react';
import type { ProjectWithDetails } from '@/types/project';

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

  const getProjectTypeColor = (type: string) => {
    switch (type) {
      case 'DataVault':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Dimensional':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Standard':
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getVisibilityColor = (visibility: string) => {
    switch (visibility) {
      case 'private':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      case 'team':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'organization':
        return 'bg-indigo-100 text-indigo-700 border-indigo-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
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

  if (viewMode === 'list') {
    return (
      <div
        className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
        onClick={onOpen}
      >
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-lg font-semibold text-gray-900 truncate">
                  {project.name}
                </h3>
                <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getProjectTypeColor(project.project_type)}`}>
                  {project.project_type}
                </span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded border ${getVisibilityColor(project.visibility)}`}>
                  {project.visibility}
                </span>
              </div>
              {project.description && (
                <p className="text-sm text-gray-600 line-clamp-1 mb-2">
                  {project.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {project.member_count || 0} {project.member_count === 1 ? 'member' : 'members'}
                </span>
                <span className="flex items-center gap-1">
                  <FolderOpen className="w-3 h-3" />
                  {project.workspace_count || 0} {project.workspace_count === 1 ? 'workspace' : 'workspaces'}
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
                className="btn-icon text-gray-400 hover:text-gray-600"
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
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    {onOpen && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpen();
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
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
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
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
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </button>
                    )}
                    {onDelete && (
                      <>
                        <div className="border-t border-gray-200 my-1" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete();
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
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
      </div>
    );
  }

  // Grid view
  return (
    <div
      className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
      onClick={onOpen}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate mb-2">
              {project.name}
            </h3>
            {project.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-3">
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
              className="btn-icon p-1 text-gray-400 hover:text-gray-600"
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
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  {onOpen && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpen();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
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
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
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
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Settings
                    </button>
                  )}
                  {onDelete && (
                    <>
                      <div className="border-t border-gray-200 my-1" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete();
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
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
          <span className={`px-2 py-1 text-xs font-medium rounded border ${getProjectTypeColor(project.project_type)}`}>
            {project.project_type}
          </span>
          <span className={`px-2 py-1 text-xs font-medium rounded border ${getVisibilityColor(project.visibility)}`}>
            {project.visibility}
          </span>
        </div>

        {/* Stats */}
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span>{project.member_count || 0} {project.member_count === 1 ? 'member' : 'members'}</span>
          </div>
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-gray-400" />
            <span>{project.workspace_count || 0} {project.workspace_count === 1 ? 'workspace' : 'workspaces'}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between text-xs text-gray-500">
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
    </div>
  );
}
