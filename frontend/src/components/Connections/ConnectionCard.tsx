/**
 * Connection Card Component
 * Displays connection information in a card format
 */

import { useState } from 'react';
import {
  MoreVertical,
  Trash2,
  Edit,
  Database,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Copy
} from 'lucide-react';
import type { ConnectionWithDetails } from '@/types/connection';
import { getConnectionTypeLabel, getTestStatusColor, getTestStatusLabel } from '@/types/connection';
import { useTestDataConnection } from '@/hooks';

interface ConnectionCardProps {
  connection: ConnectionWithDetails;
  onEdit?: () => void;
  onDelete?: () => void;
  onClone?: () => void;
}

export function ConnectionCard({ connection, onEdit, onDelete, onClone }: ConnectionCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const testConnectionMutation = useTestDataConnection();

  const handleTest = async () => {
    try {
      await testConnectionMutation.mutateAsync(connection.id);
    } catch (error) {
      console.error('Failed to test connection:', error);
    }
  };

  const getStatusIcon = () => {
    const color = getTestStatusColor(connection.test_status);

    switch (color) {
      case 'green':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'red':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'yellow':
        return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all">
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {connection.name}
              </h3>
            </div>
            {connection.description && (
              <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                {connection.description}
              </p>
            )}
          </div>

          {/* Actions Menu */}
          <div className="relative ml-2">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  {onEdit && (
                    <button
                      onClick={() => {
                        onEdit();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                  {onClone && (
                    <button
                      onClick={() => {
                        onClone();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Copy className="w-4 h-4" />
                      Clone
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => {
                        onDelete();
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Connection Type Badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
            {getConnectionTypeLabel(connection.connection_type)}
          </span>
          <div className="flex items-center gap-1.5 text-xs">
            {getStatusIcon()}
            <span className="text-gray-600">
              {getTestStatusLabel(connection.test_status)}
            </span>
          </div>
        </div>

        {/* Test Button */}
        <button
          onClick={handleTest}
          disabled={testConnectionMutation.isPending}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testConnectionMutation.isPending ? 'Testing...' : 'Test Connection'}
        </button>
      </div>

      {/* Footer */}
      {connection.last_tested_at && (
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <p className="text-xs text-gray-500">
            Last tested: {new Date(connection.last_tested_at).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  );
}
