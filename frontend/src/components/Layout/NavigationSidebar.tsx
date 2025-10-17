/**
 * Left Navigation Sidebar
 * Main navigation menu for the application
 */

import { useNavigate, useLocation } from 'react-router-dom';
import {
  FolderOpen,
  GitBranch,
  Zap,
  FileCode,
  Settings as SettingsIcon,
  Database,
  BarChart3,
  Users,
  Layers,
} from 'lucide-react';
import { useStore } from '@/store/useStore';

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string | ((currentProject: any) => string);
  badge?: string;
}

const navigationItems: NavItem[] = [
  {
    id: 'projects',
    label: 'Projects',
    icon: FolderOpen,
    path: '/projects',
  },
  {
    id: 'connections',
    label: 'Connections',
    icon: Database,
    // Dynamic path based on project context
    path: (currentProject) =>
      currentProject
        ? `/projects/${currentProject.id}/connections`
        : '/connections',
  },
  {
    id: 'jobs',
    label: 'Jobs',
    icon: Zap,
    path: '/jobs',
  },
  {
    id: 'templates',
    label: 'Templates',
    icon: FileCode,
    path: '/templates',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    path: '/analytics',
  },
  {
    id: 'team',
    label: 'Team',
    icon: Users,
    path: '/team',
  },
  {
    id: 'configuration',
    label: 'Configuration',
    icon: SettingsIcon,
    path: '/configuration',
  },
];

export function NavigationSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentProject = useStore((state) => state.currentProject);

  const getPath = (path: string | ((currentProject: any) => string)): string => {
    return typeof path === 'function' ? path(currentProject) : path;
  };

  const isActive = (path: string | ((currentProject: any) => string)) => {
    const resolvedPath = getPath(path);
    return location.pathname === resolvedPath || location.pathname.startsWith(resolvedPath + '/');
  };

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Navigation Items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          const resolvedPath = getPath(item.path);

          return (
            <button
              key={item.id}
              onClick={() => navigate(resolvedPath)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                active
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'text-blue-600 dark:text-blue-400' : ''}`} />
              <span className={`flex-1 text-left font-medium ${active ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
              {item.badge && (
                <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-xs font-semibold text-blue-900 dark:text-blue-300 mb-1">
            Need Help?
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-400">
            Check out our documentation
          </p>
        </div>
      </div>
    </aside>
  );
}
