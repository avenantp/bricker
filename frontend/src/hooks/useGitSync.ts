/**
 * React Query hooks for Git Sync operations
 * Manages Git synchronization, commits, pulls, pushes, and conflict resolution
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  commitDataset,
  commitMultipleDatasets,
  pullFromGit,
  pushToGit,
  getUncommittedChanges,
  getCommitHistory,
  resolveConflict,
} from '@/lib/git-sync-service';
import type {
  GitCommit,
  UncommittedChangeSummary,
  DatasetConflict,
  ConflictResolutionStrategy,
} from '@/types/dataset';
import { datasetKeys } from './useDatasets';

// Query keys for Git sync operations
export const gitSyncKeys = {
  all: ['gitSync'] as const,
  uncommittedChanges: (workspaceId: string) =>
    [...gitSyncKeys.all, 'uncommittedChanges', workspaceId] as const,
  commitHistory: (datasetId: string) =>
    [...gitSyncKeys.all, 'commitHistory', datasetId] as const,
  conflicts: (workspaceId: string) => [...gitSyncKeys.all, 'conflicts', workspaceId] as const,
};

/**
 * Get uncommitted changes for a workspace
 */
export function useUncommittedChanges(workspaceId: string | undefined) {
  return useQuery({
    queryKey: gitSyncKeys.uncommittedChanges(workspaceId || ''),
    queryFn: async () => {
      if (!workspaceId) return [];
      return await getUncommittedChanges(workspaceId);
    },
    enabled: !!workspaceId,
    refetchInterval: 30000, // Poll every 30 seconds
  });
}

/**
 * Get commit history for a dataset
 */
export function useCommitHistory(datasetId: string | undefined) {
  return useQuery({
    queryKey: gitSyncKeys.commitHistory(datasetId || ''),
    queryFn: async () => {
      if (!datasetId) return [];
      return await getCommitHistory(datasetId);
    },
    enabled: !!datasetId,
  });
}

/**
 * Commit a single dataset to Git
 */
export function useCommitDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      datasetId,
      message,
      workspaceId,
    }: {
      datasetId: string;
      message: string;
      workspaceId: string;
    }) => {
      return await commitDataset(datasetId, message, workspaceId);
    },
    onSuccess: (_, variables) => {
      // Invalidate uncommitted changes
      queryClient.invalidateQueries({
        queryKey: gitSyncKeys.uncommittedChanges(variables.workspaceId),
      });
      // Invalidate dataset
      queryClient.invalidateQueries({
        queryKey: datasetKeys.detail(variables.datasetId),
      });
      // Invalidate commit history
      queryClient.invalidateQueries({
        queryKey: gitSyncKeys.commitHistory(variables.datasetId),
      });
      // Invalidate datasets list
      queryClient.invalidateQueries({
        queryKey: datasetKeys.list({ workspaceId: variables.workspaceId }),
      });
    },
  });
}

/**
 * Commit multiple datasets to Git
 */
export function useCommitMultipleDatasets() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      datasetIds,
      message,
      workspaceId,
    }: {
      datasetIds: string[];
      message: string;
      workspaceId: string;
    }) => {
      return await commitMultipleDatasets(datasetIds, message, workspaceId);
    },
    onSuccess: (_, variables) => {
      // Invalidate uncommitted changes
      queryClient.invalidateQueries({
        queryKey: gitSyncKeys.uncommittedChanges(variables.workspaceId),
      });
      // Invalidate all committed datasets
      variables.datasetIds.forEach((datasetId) => {
        queryClient.invalidateQueries({
          queryKey: datasetKeys.detail(datasetId),
        });
        queryClient.invalidateQueries({
          queryKey: gitSyncKeys.commitHistory(datasetId),
        });
      });
      // Invalidate datasets list
      queryClient.invalidateQueries({
        queryKey: datasetKeys.list({ workspaceId: variables.workspaceId }),
      });
    },
  });
}

/**
 * Pull changes from Git
 */
export function usePullFromGit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId }: { workspaceId: string }) => {
      return await pullFromGit(workspaceId);
    },
    onSuccess: (_, variables) => {
      // Invalidate all dataset-related queries
      queryClient.invalidateQueries({
        queryKey: datasetKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: gitSyncKeys.uncommittedChanges(variables.workspaceId),
      });
      queryClient.invalidateQueries({
        queryKey: gitSyncKeys.conflicts(variables.workspaceId),
      });
    },
  });
}

/**
 * Push changes to Git
 */
export function usePushToGit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId }: { workspaceId: string }) => {
      return await pushToGit(workspaceId);
    },
    onSuccess: (_, variables) => {
      // Invalidate uncommitted changes
      queryClient.invalidateQueries({
        queryKey: gitSyncKeys.uncommittedChanges(variables.workspaceId),
      });
      // Invalidate datasets list
      queryClient.invalidateQueries({
        queryKey: datasetKeys.list({ workspaceId: variables.workspaceId }),
      });
    },
  });
}

/**
 * Resolve a merge conflict
 */
export function useResolveConflict() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conflict,
      strategy,
      workspaceId,
    }: {
      conflict: DatasetConflict;
      strategy: ConflictResolutionStrategy;
      workspaceId: string;
    }) => {
      return await resolveConflict(conflict, strategy);
    },
    onSuccess: (_, variables) => {
      // Invalidate conflicts
      queryClient.invalidateQueries({
        queryKey: gitSyncKeys.conflicts(variables.workspaceId),
      });
      // Invalidate dataset
      queryClient.invalidateQueries({
        queryKey: datasetKeys.detail(variables.conflict.dataset_id),
      });
      // Invalidate datasets list
      queryClient.invalidateQueries({
        queryKey: datasetKeys.list({ workspaceId: variables.workspaceId }),
      });
    },
  });
}

/**
 * Real-time subscription to uncommitted changes
 * Uses Supabase Realtime to listen for dataset updates
 */
export function useUncommittedChangesSubscription(
  workspaceId: string | undefined,
  onUpdate?: () => void
) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: [...gitSyncKeys.uncommittedChanges(workspaceId || ''), 'subscription'],
    queryFn: async () => {
      if (!workspaceId) return null;

      // Set up realtime subscription
      const channel = supabase
        .channel(`datasets-${workspaceId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'datasets',
            filter: `workspace_id=eq.${workspaceId}`,
          },
          (payload) => {
            console.log('Dataset changed:', payload);
            // Invalidate uncommitted changes query
            queryClient.invalidateQueries({
              queryKey: gitSyncKeys.uncommittedChanges(workspaceId),
            });
            // Invalidate datasets list
            queryClient.invalidateQueries({
              queryKey: datasetKeys.list({ workspaceId }),
            });
            // Call custom callback
            onUpdate?.();
          }
        )
        .subscribe();

      return channel;
    },
    enabled: !!workspaceId,
    staleTime: Infinity, // Subscription never goes stale
  });
}

/**
 * Sync status summary for workspace
 * Returns counts of synced/unsynced/conflict datasets
 */
export function useSyncStatusSummary(workspaceId: string | undefined) {
  return useQuery({
    queryKey: [...gitSyncKeys.all, 'syncStatusSummary', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return null;

      const { data, error } = await supabase
        .from('datasets')
        .select('sync_status, has_uncommitted_changes')
        .eq('workspace_id', workspaceId);

      if (error) throw error;

      const summary = {
        total: data.length,
        synced: data.filter(
          (d) => d.sync_status === 'synced' && !d.has_uncommitted_changes
        ).length,
        uncommitted: data.filter((d) => d.has_uncommitted_changes).length,
        conflicts: data.filter((d) => d.sync_status === 'conflict').length,
        errors: data.filter((d) => d.sync_status === 'error').length,
        notSynced: data.filter((d) => d.sync_status === 'not_synced').length,
      };

      return summary;
    },
    enabled: !!workspaceId,
    refetchInterval: 30000, // Poll every 30 seconds
  });
}

/**
 * Check if workspace has uncommitted changes
 * Lightweight query for quick status checks
 */
export function useHasUncommittedChanges(workspaceId: string | undefined) {
  return useQuery({
    queryKey: [...gitSyncKeys.all, 'hasUncommittedChanges', workspaceId],
    queryFn: async () => {
      if (!workspaceId) return false;

      const { count, error } = await supabase
        .from('datasets')
        .select('id', { count: 'exact', head: true })
        .eq('workspace_id', workspaceId)
        .eq('has_uncommitted_changes', true);

      if (error) throw error;
      return (count || 0) > 0;
    },
    enabled: !!workspaceId,
    refetchInterval: 30000, // Poll every 30 seconds
  });
}
