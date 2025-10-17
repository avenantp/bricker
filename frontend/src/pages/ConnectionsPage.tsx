/**
 * Connections Page
 * Displays list of connections with filtering, search, and management
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, Search, Database, CheckCircle, XCircle, AlertCircle, TrendingUp } from 'lucide-react';
import { useConnections, useProjectConnections, useAccount } from '../hooks';
import { useSearch } from '../contexts/SearchContext';
import { ConnectionCard } from '../components/Connections/ConnectionCard';
import { CreateConnectionDialog } from '../components/Connections/CreateConnectionDialog';
import { EditConnectionDialog } from '../components/Connections/EditConnectionDialog';
import { DeleteConnectionDialog } from '../components/Connections/DeleteConnectionDialog';
import { CloneConnectionDialog } from '../components/Connections/CloneConnectionDialog';
import { AppLayout } from '../components/Layout';
import { ConnectionType } from '@/types/connection';

export function ConnectionsPage() {
  const { projectId } = useParams<{ projectId?: string }>();
  const { searchQuery: globalSearch, setSearchPlaceholder } = useSearch();
  const [selectedType, setSelectedType] = useState<ConnectionType | ''>('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [connectionToEdit, setConnectionToEdit] = useState<string | null>(null);
  const [connectionToDelete, setConnectionToDelete] = useState<string | null>(null);
  const [connectionToClone, setConnectionToClone] = useState<string | null>(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isProjectContext = !!projectId;

  // Set search placeholder for this page
  useEffect(() => {
    setSearchPlaceholder(isProjectContext ? 'Search project connections...' : 'Search connections...');
  }, [setSearchPlaceholder, isProjectContext]);

  // Fetch user's account
  const { data: account, isLoading: isLoadingAccount } = useAccount();

  // Fetch connections based on context
  const accountConnectionsQuery = useConnections(
    {
      search: globalSearch || undefined,
      connection_type: selectedType || undefined
    },
    { enabled: !isProjectContext }
  );

  const projectConnectionsQuery = useProjectConnections(
    projectId || '',
    { enabled: isProjectContext }
  );

  // Use the appropriate query based on context
  const { data, isLoading, error, refetch } = isProjectContext
    ? projectConnectionsQuery
    : accountConnectionsQuery;

  const handleEditConnection = (connectionId: string) => {
    setConnectionToEdit(connectionId);
  };

  const handleConnectionUpdated = () => {
    setConnectionToEdit(null);
    refetch();
  };

  const handleDeleteConnection = (connectionId: string) => {
    setConnectionToDelete(connectionId);
  };

  const handleConnectionDeleted = () => {
    setConnectionToDelete(null);
    refetch();
  };

  const handleCloneConnection = (connectionId: string) => {
    setConnectionToClone(connectionId);
  };

  const handleConnectionCloned = () => {
    setConnectionToClone(null);
    refetch();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if any dialog is open or if user is typing in an input
      const isDialogOpen = showCreateDialog || connectionToEdit || connectionToDelete || showKeyboardHelp;
      const isTyping = (e.target as HTMLElement).tagName === 'INPUT' ||
                       (e.target as HTMLElement).tagName === 'TEXTAREA';

      // Don't trigger shortcuts if user is typing (except for search focus)
      if (isTyping && e.key !== '/') return;

      // Cmd/Ctrl + K or / - Focus search
      if (((e.metaKey || e.ctrlKey) && e.key === 'k') || e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      // Don't trigger other shortcuts if dialog is open or user is typing
      if (isDialogOpen || isTyping) return;

      // N - New connection
      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setShowCreateDialog(true);
        return;
      }

      // R - Refresh connections list
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        refetch();
        return;
      }

      // Cmd/Ctrl + / or ? - Show keyboard shortcuts help
      if (((e.metaKey || e.ctrlKey) && e.key === '/') || e.key === '?') {
        e.preventDefault();
        setShowKeyboardHelp(true);
        return;
      }

      // Escape - Clear search (handled by TopBar)
      // Removed local search clearing logic
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCreateDialog, connectionToEdit, connectionToDelete, showKeyboardHelp, refetch]);

  // Calculate connection statistics
  const stats = useMemo(() => {
    if (!data?.data) {
      return {
        total: 0,
        healthy: 0,
        warning: 0,
        error: 0,
        untested: 0
      };
    }

    return data.data.reduce((acc, conn) => {
      acc.total++;

      switch (conn.test_status) {
        case 'success':
          acc.healthy++;
          break;
        case 'failed':
          acc.error++;
          break;
        case 'warning':
          acc.warning++;
          break;
        default:
          acc.untested++;
      }

      return acc;
    }, {
      total: 0,
      healthy: 0,
      warning: 0,
      error: 0,
      untested: 0
    });
  }, [data?.data]);

  return (
    <AppLayout>
      {/* Header with Actions and Filters */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {isProjectContext ? 'Project Connections' : 'Account Connections'}
              </h1>
            </div>

            {/* Filters */}
            <div className="flex-1 flex items-center justify-end gap-3">
            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as ConnectionType | '')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm flex-shrink-0"
            >
              <option value="">All Types</option>
              {Object.values(ConnectionType).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            </div>

            {/* New Connection Button */}
            <button
              onClick={() => setShowCreateDialog(true)}
              className="btn-primary inline-flex items-center gap-2 flex-shrink-0 !py-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              New Connection
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          // Loading skeleton
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse"
              >
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          // Error state
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-red-600 font-medium mb-2">Error loading connections</p>
            <p className="text-sm text-gray-500 mb-4">{error.message}</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : !data || data.data.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {globalSearch ? 'No connections found' : 'No connections yet'}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {globalSearch
                ? 'Try adjusting your search query'
                : 'Create your first connection to get started'}
            </p>
            {!globalSearch && (
              <button
                onClick={() => setShowCreateDialog(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Your First Connection
              </button>
            )}
          </div>
        ) : (
          // Connections grid
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.data.map((connection) => (
              <ConnectionCard
                key={connection.id}
                connection={connection}
                onEdit={() => handleEditConnection(connection.id)}
                onClone={() => handleCloneConnection(connection.id)}
                onDelete={() => handleDeleteConnection(connection.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dialogs */}
      {showCreateDialog && account && (
        <CreateConnectionDialog
          accountId={account.id}
          onClose={() => setShowCreateDialog(false)}
          onSuccess={() => {
            setShowCreateDialog(false);
            refetch();
          }}
        />
      )}

      {connectionToEdit && (
        <EditConnectionDialog
          connectionId={connectionToEdit}
          onClose={() => setConnectionToEdit(null)}
          onSuccess={handleConnectionUpdated}
        />
      )}

      {connectionToDelete && (
        <DeleteConnectionDialog
          connectionId={connectionToDelete}
          onClose={() => setConnectionToDelete(null)}
          onSuccess={handleConnectionDeleted}
        />
      )}

      {connectionToClone && (
        <CloneConnectionDialog
          connectionId={connectionToClone}
          onClose={() => setConnectionToClone(null)}
          onSuccess={handleConnectionCloned}
        />
      )}

      {/* Keyboard Shortcuts Help Dialog */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">Keyboard Shortcuts</h2>
              <button
                onClick={() => setShowKeyboardHelp(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <Plus className="w-6 h-6 transform rotate-45" />
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Focus search</span>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                      /
                    </kbd>
                    <span className="text-xs text-gray-500">or</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                      Ctrl
                    </kbd>
                    <span className="text-xs text-gray-500">+</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                      K
                    </kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">New connection</span>
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                    N
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Refresh list</span>
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                    R
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Clear search</span>
                  <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                    Esc
                  </kbd>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Show shortcuts</span>
                  <div className="flex items-center gap-2">
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                      ?
                    </kbd>
                    <span className="text-xs text-gray-500">or</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                      Ctrl
                    </kbd>
                    <span className="text-xs text-gray-500">+</span>
                    <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">
                      /
                    </kbd>
                  </div>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
              <button
                onClick={() => setShowKeyboardHelp(false)}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating keyboard shortcuts button */}
      <button
        onClick={() => setShowKeyboardHelp(true)}
        className="fixed bottom-6 right-6 p-3 bg-white border-2 border-gray-300 rounded-full shadow-lg hover:shadow-xl hover:border-blue-500 transition-all group"
        title="Keyboard shortcuts (Press ?)"
      >
        <span className="text-lg font-semibold text-gray-600 group-hover:text-blue-600">?</span>
      </button>
    </AppLayout>
  );
}
