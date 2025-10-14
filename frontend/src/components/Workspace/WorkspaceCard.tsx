/**
 * Workspace Card Component
 * Displays workspace information in grid or list format
 */

import { useState } from 'react';
import {
  MoreVertical,
  Trash2,
  Settings,
  FolderOpen,
  Users,
  Calendar,
  GitBranch,
  Database,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from 'lucide-react';
import type { WorkspaceWithDetails } from '@/types/workspace';

type ViewMode = 'grid' | 'list';

interface WorkspaceCardProps {
  workspace: WorkspaceWithDetails;
  viewMode?: ViewMode;
  onOpen?: () => void;
  onDelete?: () => void;
  onSettings?: () => void;
}

export function WorkspaceCard({
  workspace,
  viewMode = 'grid',
  onOpen,
  onDelete,
  onSettings,
}: WorkspaceCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const getSourceControlStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'syncing':
        return <AlertCircle className="w-4 h-4 text-blue-600 animate-pulse" />;
      case 'conflict':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSourceControlStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'syncing':
        return 'Syncing...';
      case 'conflict':
        return 'Conflict';
      case 'error':
        return 'Error';
      default:
        return 'Not Connected';
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
                  {workspace.name}
                </h3>
                {workspace.source_control_provider && (
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 rounded text-xs">
                    <GitBranch className="w-3 h-3" />
                    {workspace.source_control_provider}
                  </div>
                )}
              </div>
              {workspace.description && (
                <p className="text-sm text-gray-600 line-clamp-1 mb-2">
                  {workspace.description}
                </p>
              )}
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {workspace.member_count || 0} {workspace.member_count === 1 ? 'member' : 'members'}
                </span>
                <span className="flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  {workspace.dataset_count || 0} {workspace.dataset_count === 1 ? 'dataset' : 'datasets'}
                </span>
                {workspace.source_control_connection_status && (
                  <span className="flex items-center gap-1">
                    {getSourceControlStatusIcon(workspace.source_control_connection_status)}
                    {getSourceControlStatusText(workspace.source_control_connection_status)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Updated {formatDate(workspace.updated_at)}
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
              {workspace.name}
            </h3>
            {workspace.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                {workspace.description}
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

        {/* Source Control Badge */}
        {workspace.source_control_provider && (
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded text-xs font-medium">
              <GitBranch className="w-3 h-3" />
              {workspace.source_control_provider}
            </div>
            {workspace.source_control_connection_status && (
              <div className="flex items-center gap-1.5 text-xs">
                {getSourceControlStatusIcon(workspace.source_control_connection_status)}
                <span className="text-gray-600">
                  {getSourceControlStatusText(workspace.source_control_connection_status)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-400" />
            <span>{workspace.member_count || 0} {workspace.member_count === 1 ? 'member' : 'members'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-gray-400" />
            <span>{workspace.dataset_count || 0} {workspace.dataset_count === 1 ? 'dataset' : 'datasets'}</span>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            Updated {formatDate(workspace.updated_at)}
          </span>
          {workspace.last_synced_at && (
            <span className="truncate" title={`Last synced: ${new Date(workspace.last_synced_at).toLocaleString()}`}>
              Synced {formatDate(workspace.last_synced_at)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
