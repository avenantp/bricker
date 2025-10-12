/**
 * Project Card Component
 * Displays project information in a card format
 */

import { useState } from 'react';
import {
  MoreVertical,
  Edit,
  Trash2,
  Copy,
  Settings,
  FolderOpen,
} from 'lucide-react';
import type { Project } from '../../types/project';

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
  onDuplicate?: (project: Project) => void;
  onSettings?: (project: Project) => void;
  onOpen?: (project: Project) => void;
}

export function ProjectCard({
  project,
  onEdit,
  onDelete,
  onDuplicate,
  onSettings,
  onOpen,
}: ProjectCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const getProjectTypeColor = (type: string) => {
    switch (type) {
      case 'DataVault':
        return 'bg-purple-100 text-purple-700';
      case 'Dimensional':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  const getProjectTypeIcon = (type: string) => {
    switch (type) {
      case 'DataVault':
        return '🏛️';
      case 'Dimensional':
        return '📊';
      default:
        return '📁';
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

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all group">
      {/* Card Header */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getProjectTypeIcon(project.project_type)}</span>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {project.name}
              </h3>
            </div>
          </div>

          {/* Actions Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-100 transition-colors"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />

                {/* Menu */}
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  {onOpen && (
                    <button
                      onClick={() => {
                        onOpen(project);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <FolderOpen className="w-4 h-4" />
                      Open
                    </button>
                  )}
                  {onEdit && (
                    <button
                      onClick={() => {
                        onEdit(project);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                  {onDuplicate && (
                    <button
                      onClick={() => {
                        onDuplicate(project);
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
                      onClick={() => {
                        onSettings(project);
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
                        onClick={() => {
                          onDelete(project);
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

        {/* Description */}
        {project.description && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {project.description}
          </p>
        )}

        {/* Project Type Badge */}
        <div className="flex items-center gap-2 mb-4">
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${getProjectTypeColor(
              project.project_type
            )}`}
          >
            {project.project_type}
          </span>
          {project.configuration?.medallion_layers_enabled && (
            <span className="px-2 py-1 text-xs font-medium rounded bg-amber-100 text-amber-700">
              Medallion
            </span>
          )}
        </div>

        {/* Configuration Details */}
        {(project.configuration?.default_catalog ||
          project.configuration?.default_schema) && (
          <div className="text-xs text-gray-500 mb-4 space-y-1">
            {project.configuration.default_catalog && (
              <div>
                <span className="font-medium">Catalog:</span>{' '}
                {project.configuration.default_catalog}
              </div>
            )}
            {project.configuration.default_schema && (
              <div>
                <span className="font-medium">Schema:</span>{' '}
                {project.configuration.default_schema}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Updated {formatDate(project.updated_at)}</span>
          <span>Created {formatDate(project.created_at)}</span>
        </div>
      </div>
    </div>
  );
}
