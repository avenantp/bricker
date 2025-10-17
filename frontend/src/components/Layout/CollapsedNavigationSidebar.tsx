/**
 * Collapsed Navigation Sidebar
 * Icon-only navigation with tooltips
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

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
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
    id: 'workspaces',
    label: 'Workspaces',
    icon: Layers,
    path: '/workspaces',
  },
  {
    id: 'connections',
    label: 'Connections',
    icon: Database,
    path: '/connections',
  },
  {
    id: 'source-control',
    label: 'Source Control',
    icon: GitBranch,
    path: '/source-control',
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

export function CollapsedNavigationSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <aside className="w-16 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      {/* Navigation Items */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <div key={item.id} className="relative group">
              <button
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center justify-center p-3 rounded-lg transition-all ${
                  active
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                aria-label={item.label}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-blue-600 dark:text-blue-400' : ''}`} />
                {item.badge && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>

              {/* Tooltip */}
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {item.label}
                <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700" />
              </div>
            </div>
          );
        })}
      </nav>

      {/* Bottom Section - Help Icon */}
      <div className="p-2 border-t border-gray-200 dark:border-gray-700">
        <div className="relative group">
          <button
            className="w-full flex items-center justify-center p-3 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            aria-label="Help"
          >
            <span className="text-lg font-bold">?</span>
          </button>

          {/* Tooltip */}
          <div className="absolute left-full ml-2 bottom-0 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
            Help & Documentation
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900 dark:border-r-gray-700" />
          </div>
        </div>
      </div>
    </aside>
  );
}
