/**
 * Soft Delete Audit Dashboard
 *
 * Shows metrics and statistics for soft deleted records across the system
 */

import React, { useState, useEffect } from 'react';
import { Trash2, RotateCcw, TrendingUp, TrendingDown, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface TableStats {
  table_name: string;
  total_records: number;
  deleted_records: number;
  deleted_percentage: number;
  oldest_deleted_at: string | null;
  newest_deleted_at: string | null;
}

interface RecentActivity {
  table_name: string;
  action: 'delete' | 'restore';
  count: number;
  last_activity: string;
}

export function SoftDeleteAuditDashboard() {
  const [stats, setStats] = useState<TableStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    loadStats();
  }, [selectedPeriod]);

  const loadStats = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Tables to analyze
      const tables = [
        'datasets',
        'projects',
        'workspaces',
        'columns',
        'connections',
        'configurations',
        'environments',
        'macros',
        'templates'
      ];

      const statsData: TableStats[] = [];

      for (const table of tables) {
        try {
          // Get total count
          const { count: totalCount } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

          // Get deleted count
          const { count: deletedCount } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true })
            .not('deleted_at', 'is', null);

          // Get date range of deleted items
          const { data: dateRange } = await supabase
            .from(table)
            .select('deleted_at')
            .not('deleted_at', 'is', null)
            .order('deleted_at', { ascending: true })
            .limit(1);

          const { data: newestDeleted } = await supabase
            .from(table)
            .select('deleted_at')
            .not('deleted_at', 'is', null)
            .order('deleted_at', { ascending: false })
            .limit(1);

          const total = totalCount || 0;
          const deleted = deletedCount || 0;
          const percentage = total > 0 ? (deleted / total) * 100 : 0;

          statsData.push({
            table_name: table,
            total_records: total,
            deleted_records: deleted,
            deleted_percentage: percentage,
            oldest_deleted_at: dateRange && dateRange[0] ? dateRange[0].deleted_at : null,
            newest_deleted_at: newestDeleted && newestDeleted[0] ? newestDeleted[0].deleted_at : null,
          });
        } catch (tableError) {
          console.error(`Error loading stats for ${table}:`, tableError);
        }
      }

      setStats(statsData.sort((a, b) => b.deleted_records - a.deleted_records));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const totalDeleted = stats.reduce((sum, stat) => sum + stat.deleted_records, 0);
  const totalRecords = stats.reduce((sum, stat) => sum + stat.total_records, 0);
  const overallPercentage = totalRecords > 0 ? (totalDeleted / totalRecords) * 100 : 0;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <p className="text-gray-900 dark:text-gray-100 font-medium">Error loading audit data</p>
          <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">{error}</p>
          <button onClick={loadStats} className="btn-primary mt-4">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Soft Delete Audit Dashboard
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Monitor soft deleted records across all tables
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="btn-secondary"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button onClick={loadStats} className="btn-secondary">
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Deleted
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                {totalDeleted.toLocaleString()}
              </p>
            </div>
            <Trash2 className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Records
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                {totalRecords.toLocaleString()}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Deletion Rate
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                {overallPercentage.toFixed(1)}%
              </p>
            </div>
            {overallPercentage > 10 ? (
              <TrendingUp className="h-8 w-8 text-red-500" />
            ) : (
              <TrendingDown className="h-8 w-8 text-green-500" />
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Tables Tracked
              </p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                {stats.length}
              </p>
            </div>
            <RotateCcw className="h-8 w-8 text-primary-500" />
          </div>
        </div>
      </div>

      {/* Table Stats */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
            Deleted Records by Table
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Table
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total Records
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Deleted
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Percentage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Oldest Deleted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Newest Deleted
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {stats.map((stat) => (
                <tr key={stat.table_name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                      {stat.table_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {stat.total_records.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm text-gray-900 dark:text-gray-100">
                      {stat.deleted_records.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="text-sm">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          stat.deleted_percentage > 10
                            ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                            : stat.deleted_percentage > 5
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
                            : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                        }`}
                      >
                        {stat.deleted_percentage.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(stat.oldest_deleted_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(stat.newest_deleted_at)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Warning Banner for High Deletion Rate */}
      {overallPercentage > 15 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-500 mr-3 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-800 dark:text-red-200">
              <p className="font-medium">High deletion rate detected</p>
              <p className="mt-1">
                Over 15% of records are soft deleted. Consider running the cleanup job to permanently
                remove old deleted records and free up storage space.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
