/**
 * Node Sync Status Component
 * Shows GitHub sync status for nodes
 */

import { Check, Cloud, AlertCircle, RefreshCw } from 'lucide-react';
import type { NodeSyncStatus as SyncStatus } from '../../types/node';

interface NodeSyncStatusProps {
  status: SyncStatus;
  lastSyncedAt?: string;
  errorMessage?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function NodeSyncStatus({
  status,
  lastSyncedAt,
  errorMessage,
  showLabel = false,
  size = 'md',
}: NodeSyncStatusProps) {
  const getStatusConfig = () => {
    switch (status) {
      case 'synced':
        return {
          icon: Check,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          label: 'Synced',
          description: 'Synced with GitHub',
        };
      case 'pending':
        return {
          icon: Cloud,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          label: 'Pending',
          description: 'Waiting to sync',
        };
      case 'error':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          label: 'Error',
          description: errorMessage || 'Sync failed',
        };
      case 'conflict':
        return {
          icon: AlertCircle,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          label: 'Conflict',
          description: 'Merge conflict detected',
        };
      default:
        return {
          icon: RefreshCw,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50',
          label: 'Unknown',
          description: 'Unknown status',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const formatLastSynced = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return 'just now';
  };

  if (showLabel) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-2 py-1 rounded ${config.bgColor}`}
        title={config.description}
      >
        <Icon className={`${iconSizes[size]} ${config.color}`} />
        <span className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
        {lastSyncedAt && status === 'synced' && (
          <span className="text-xs text-gray-500">
            {formatLastSynced(lastSyncedAt)}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center p-1 rounded ${config.bgColor}`}
      title={`${config.label}: ${config.description}${
        lastSyncedAt ? ` (${formatLastSynced(lastSyncedAt)})` : ''
      }`}
    >
      <Icon className={`${iconSizes[size]} ${config.color}`} />
    </div>
  );
}
