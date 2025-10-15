/**
 * Top Navigation Bar
 * Contains app logo, breadcrumbs, search, and user menu
 */

import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Search, Bell, Moon, Sun, Settings } from 'lucide-react';
import { UserMenu } from './UserMenu';
import { useStore } from '@/store/useStore';
import { useProject, useWorkspace } from '@/hooks';
import { useSearch } from '@/contexts/SearchContext';

export function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDarkMode, toggleDarkMode } = useStore();
  const { searchQuery, setSearchQuery, searchPlaceholder } = useSearch();

  // Extract IDs from URL params
  const params = useParams();
  const projectId = params.projectId;
  const workspaceId = params.workspaceId;

  // Fetch project and workspace data for breadcrumbs
  const { data: project } = useProject(projectId || '', {
    enabled: !!projectId
  });
  const { data: workspace } = useWorkspace(workspaceId || '', {
    enabled: !!workspaceId
  });

  // Helper function to check if a string is a UUID
  const isUUID = (str: string) => {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidPattern.test(str);
  };

  // Build breadcrumbs from current path
  const getBreadcrumbs = () => {
    const paths = location.pathname.split('/').filter(Boolean);
    const breadcrumbs = [{ label: 'Home', path: '/' }];

    let currentPath = '';
    paths.forEach((path, index) => {
      currentPath += `/${path}`;

      // Replace UUIDs with actual names
      let label = path;

      // If this is a project ID and we have the project data, use the project name
      if (isUUID(path) && project && path === projectId) {
        label = project.name;
      }
      // If this is a workspace ID and we have the workspace data, use the workspace name
      else if (isUUID(path) && workspace && path === workspaceId) {
        label = workspace.name;
      }
      // Otherwise, capitalize and format path segments
      else if (!isUUID(path)) {
        label = path
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }

      breadcrumbs.push({ label, path: currentPath });
    });

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
      {/* Left Section: Logo and Breadcrumbs */}
      <div className="flex items-center gap-6">
        {/* App Logo */}
        <button
          onClick={() => navigate('/')}
          className="hover:opacity-80 transition-opacity"
        >
          <img
            src={isDarkMode ? '/uroq-logo-light.png' : '/uroq-logo-dark.png'}
            alt="Uroq Logo"
            className="h-8"
          />
        </button>

        {/* Breadcrumbs */}
        <nav className="flex items-center gap-2 text-sm">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.path} className="flex items-center gap-2">
              {index > 0 && (
                <span className="text-gray-400 dark:text-gray-500">/</span>
              )}
              <button
                onClick={() => navigate(crumb.path)}
                className={`${
                  index === breadcrumbs.length - 1
                    ? 'text-gray-900 dark:text-white font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                } transition-colors`}
              >
                {crumb.label}
              </button>
            </div>
          ))}
        </nav>
      </div>

      {/* Right Section: Search, Actions, User Menu */}
      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          ) : (
            <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          )}
        </button>

        {/* Notifications */}
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors relative">
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Settings */}
        <button
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>

        {/* User Menu */}
        <UserMenu />
      </div>
    </div>
  );
}
