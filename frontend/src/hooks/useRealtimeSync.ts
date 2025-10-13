/**
 * Real-time Sync Hook
 * Manages Supabase real-time subscriptions for datasets and Git sync status
 * Automatically updates Zustand store and React Query cache
 */

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';
import { datasetKeys } from './useDatasets';
import { gitSyncKeys } from './useGitSync';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Subscribe to real-time dataset changes for a workspace
 * Automatically updates React Query cache and Zustand store
 */
export function useRealtimeDatasets(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  const { setSyncStatus } = useStore();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!workspaceId) return;

    // Create channel for dataset changes
    const channel = supabase
      .channel(`datasets-workspace-${workspaceId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'datasets',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          console.log('[Realtime] Dataset inserted:', payload.new);
          // Invalidate datasets list
          queryClient.invalidateQueries({
            queryKey: datasetKeys.list({ workspaceId }),
          });
          // Invalidate uncommitted changes
          queryClient.invalidateQueries({
            queryKey: gitSyncKeys.uncommittedChanges(workspaceId),
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'datasets',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          console.log('[Realtime] Dataset updated:', payload.new);
          const dataset = payload.new as any;

          // Update specific dataset in cache
          queryClient.setQueryData(datasetKeys.detail(dataset.id), dataset);

          // Invalidate datasets list
          queryClient.invalidateQueries({
            queryKey: datasetKeys.list({ workspaceId }),
          });

          // Invalidate uncommitted changes if sync status changed
          if (dataset.has_uncommitted_changes || dataset.sync_status) {
            queryClient.invalidateQueries({
              queryKey: gitSyncKeys.uncommittedChanges(workspaceId),
            });

            // Update sync status in store
            updateSyncStatusFromDatasets(workspaceId, setSyncStatus, queryClient);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'datasets',
          filter: `workspace_id=eq.${workspaceId}`,
        },
        (payload) => {
          console.log('[Realtime] Dataset deleted:', payload.old);
          const datasetId = (payload.old as any).id;

          // Remove from cache
          queryClient.removeQueries({
            queryKey: datasetKeys.detail(datasetId),
          });

          // Invalidate datasets list
          queryClient.invalidateQueries({
            queryKey: datasetKeys.list({ workspaceId }),
          });

          // Invalidate uncommitted changes
          queryClient.invalidateQueries({
            queryKey: gitSyncKeys.uncommittedChanges(workspaceId),
          });
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription status:', status);
      });

    channelRef.current = channel;

    // Cleanup on unmount
    return () => {
      console.log('[Realtime] Unsubscribing from datasets channel');
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [workspaceId, queryClient, setSyncStatus]);

  return {
    isSubscribed: channelRef.current?.state === 'joined',
    channel: channelRef.current,
  };
}

/**
 * Subscribe to real-time column changes for a dataset
 */
export function useRealtimeColumns(datasetId: string | undefined) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!datasetId) return;

    const channel = supabase
      .channel(`columns-dataset-${datasetId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'columns',
          filter: `dataset_id=eq.${datasetId}`,
        },
        (payload) => {
          console.log('[Realtime] Column changed:', payload);

          // Invalidate dataset detail (which includes columns)
          queryClient.invalidateQueries({
            queryKey: datasetKeys.detail(datasetId),
          });

          // Mark dataset as having uncommitted changes
          queryClient.setQueryData(
            datasetKeys.detail(datasetId),
            (old: any) => old ? { ...old, has_uncommitted_changes: true } : old
          );
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [datasetId, queryClient]);

  return {
    isSubscribed: channelRef.current?.state === 'joined',
    channel: channelRef.current,
  };
}

/**
 * Subscribe to real-time Git commit changes
 */
export function useRealtimeGitCommits(datasetId: string | undefined) {
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!datasetId) return;

    const channel = supabase
      .channel(`git-commits-dataset-${datasetId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'git_commits',
          filter: `dataset_id=eq.${datasetId}`,
        },
        (payload) => {
          console.log('[Realtime] New commit:', payload.new);

          // Invalidate commit history
          queryClient.invalidateQueries({
            queryKey: gitSyncKeys.commitHistory(datasetId),
          });

          // Invalidate dataset (to update sync status)
          queryClient.invalidateQueries({
            queryKey: datasetKeys.detail(datasetId),
          });
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [datasetId, queryClient]);

  return {
    isSubscribed: channelRef.current?.state === 'joined',
    channel: channelRef.current,
  };
}

/**
 * Subscribe to all real-time updates for a workspace
 * Convenience hook that combines all subscriptions
 */
export function useRealtimeWorkspace(workspaceId: string | undefined) {
  const datasets = useRealtimeDatasets(workspaceId);

  return {
    isSubscribed: datasets.isSubscribed,
    channels: {
      datasets: datasets.channel,
    },
  };
}

/**
 * Subscribe to all real-time updates for a specific dataset
 * Convenience hook that combines dataset, columns, and commits subscriptions
 */
export function useRealtimeDataset(datasetId: string | undefined) {
  const columns = useRealtimeColumns(datasetId);
  const commits = useRealtimeGitCommits(datasetId);

  return {
    isSubscribed: columns.isSubscribed && commits.isSubscribed,
    channels: {
      columns: columns.channel,
      commits: commits.channel,
    },
  };
}

/**
 * Helper function to update sync status from datasets
 */
async function updateSyncStatusFromDatasets(
  workspaceId: string,
  setSyncStatus: (status: any) => void,
  queryClient: any
) {
  try {
    const { data, error } = await supabase
      .from('datasets')
      .select('has_uncommitted_changes, sync_status')
      .eq('workspace_id', workspaceId);

    if (error) throw error;

    const uncommittedCount = data.filter((d) => d.has_uncommitted_changes).length;
    const conflictCount = data.filter((d) => d.sync_status === 'conflict').length;

    setSyncStatus({
      hasUncommittedChanges: uncommittedCount > 0,
      uncommittedCount,
      conflictCount,
    });
  } catch (error) {
    console.error('[Realtime] Failed to update sync status:', error);
  }
}

/**
 * Monitor sync status and update store
 * Polls for sync status changes and updates Zustand store
 */
export function useSyncStatusMonitor(workspaceId: string | undefined) {
  const { setSyncStatus, resetSyncStatus } = useStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!workspaceId) {
      resetSyncStatus();
      return;
    }

    // Initial fetch
    updateSyncStatusFromDatasets(workspaceId, setSyncStatus, queryClient);

    // Poll every 30 seconds
    const interval = setInterval(() => {
      updateSyncStatusFromDatasets(workspaceId, setSyncStatus, queryClient);
    }, 30000);

    return () => {
      clearInterval(interval);
    };
  }, [workspaceId, setSyncStatus, resetSyncStatus, queryClient]);
}
