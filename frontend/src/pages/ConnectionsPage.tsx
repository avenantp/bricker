/**
 * Connections Page
 * Displays list of connections with filtering, search, and management
 */

import { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Search, Database, CheckCircle, XCircle, AlertCircle, TrendingUp, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { useConnections, useAccount, useWorkspace } from '../hooks';
import { ConnectionCard } from '../components/Connections/ConnectionCard';
import { CreateConnectionDialog } from '../components/Connections/CreateConnectionDialog';
import { EditConnectionDialog } from '../components/Connections/EditConnectionDialog';
import { DeleteConnectionDialog } from '../components/Connections/DeleteConnectionDialog';
import { CloneConnectionDialog } from '../components/Connections/CloneConnectionDialog';
import { ConnectionType } from '@/types/connection';

export function ConnectionsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<ConnectionType | ''>('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [connectionToEdit, setConnectionToEdit] = useState<string | null>(null);
  const [connectionToDelete, setConnectionToDelete] = useState<string | null>(null);
  const [connectionToClone, setConnectionToClone] = useState<string | null>(null);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch user's account
  const { data: account, isLoading: isLoadingAccount } = useAccount();

  // Fetch workspace to get project_id
  const { data: workspace } = useWorkspace(workspaceId || '');

  // Fetch connections
  const { data, isLoading, error, refetch } = useConnections({
    workspace_id: workspaceId,
    search: search || undefined,
    connection_type: selectedType || undefined
  });

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

      // Escape - Clear search
      if (e.key === 'Escape' && search) {
        e.preventDefault();
        setSearch('');
        searchInputRef.current?.blur();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCreateDialog, connectionToEdit, connectionToDelete, showKeyboardHelp, search, refetch]);

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => {
                  if (workspace?.project_id) {
                    navigate(`/projects/${workspace.project_id}/workspaces`);
                  } else {
                    navigate(-1); // Fallback to browser back
                  }
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to workspaces"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Connections</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage data source connections
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Connection
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Banner */}
      {!isLoading && data && data.data.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {/* Total Connections */}
              <div className="flex items-center justify-center gap-3 bg-white rounded-lg px-4 py-3 shadow-sm">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Database className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>

              {/* Healthy Connections */}
              <div className="flex items-center justify-center gap-3 bg-white rounded-lg px-4 py-3 shadow-sm">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-2xl font-bold text-green-600">{stats.healthy}</p>
              </div>

              {/* Warning Connections */}
              <div className="flex items-center justify-center gap-3 bg-white rounded-lg px-4 py-3 shadow-sm">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                </div>
                <p className="text-2xl font-bold text-yellow-600">{stats.warning}</p>
              </div>

              {/* Error Connections */}
              <div className="flex items-center justify-center gap-3 bg-white rounded-lg px-4 py-3 shadow-sm">
                <div className="p-2 bg-red-100 rounded-lg">
                  <XCircle className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-2xl font-bold text-red-600">{stats.error}</p>
              </div>

              {/* Untested Connections */}
              <div className="flex items-center justify-center gap-3 bg-white rounded-lg px-4 py-3 shadow-sm">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <TrendingUp className="w-5 h-5 text-gray-600" />
                </div>
                <p className="text-2xl font-bold text-gray-600">{stats.untested}</p>
              </div>
            </div>

            {/* Health percentage */}
            {stats.total > 0 && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                  <span>Overall Health</span>
                  <span className="font-medium">
                    {Math.round((stats.healthy / stats.total) * 100)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="h-full flex">
                    <div
                      className="bg-green-500 transition-all duration-300"
                      style={{ width: `${(stats.healthy / stats.total) * 100}%` }}
                    />
                    <div
                      className="bg-yellow-500 transition-all duration-300"
                      style={{ width: `${(stats.warning / stats.total) * 100}%` }}
                    />
                    <div
                      className="bg-red-500 transition-all duration-300"
                      style={{ width: `${(stats.error / stats.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search connections... (Press / to focus)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as ConnectionType | '')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">All Types</option>
              {Object.values(ConnectionType).map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
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
              {search ? 'No connections found' : 'No connections yet'}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {search
                ? 'Try adjusting your search query'
                : 'Create your first connection to get started'}
            </p>
            {!search && (
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
      {showCreateDialog && workspaceId && account && (
        <CreateConnectionDialog
          workspaceId={workspaceId}
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
    </div>
  );
}
