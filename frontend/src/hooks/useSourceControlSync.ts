/**
 * React Query hooks for Source Control Sync operations
 * Manages source control synchronization, commits, pulls, pushes, and conflict resolution
 * Supports multiple providers: GitHub, GitLab, Bitbucket, Azure DevOps, etc.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  commitDataset,
  commitMultipleDatasets,
  pullFromSourceControl,
  pushToSourceControl,
  getUncommittedChanges,
  getCommitHistory,
  resolveConflict,
} from '@/lib/source-control-sync-service';
import type {
  SourceControlCommit,
  UncommittedChangeSummary,
  DatasetConflict,
  ConflictResolutionStrategy,
} from '@/types/dataset';
import { datasetKeys } from './useDatasets';

// Query keys for source control sync operations
export const sourceControlSyncKeys = {
  all: ['sourceControlSync'] as const,
  uncommittedChanges: (workspaceId: string) =>
    [...sourceControlSyncKeys.all, 'uncommittedChanges', workspaceId] as const,
  commitHistory: (datasetId: string) =>
    [...sourceControlSyncKeys.all, 'commitHistory', datasetId] as const,
  conflicts: (workspaceId: string) => [...sourceControlSyncKeys.all, 'conflicts', workspaceId] as const,
};

/**
 * Get uncommitted changes for a workspace
 */
export function useUncommittedChanges(workspaceId: string | undefined) {
  return useQuery({
    queryKey: sourceControlSyncKeys.uncommittedChanges(workspaceId || ''),
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
export function useCommitHistory(workspaceId: string | undefined, datasetId: string | undefined) {
  return useQuery({
    queryKey: sourceControlSyncKeys.commitHistory(datasetId || ''),
    queryFn: async () => {
      if (!workspaceId || !datasetId) return [];
      return await getCommitHistory(workspaceId, datasetId);
    },
    enabled: !!workspaceId && !!datasetId,
  });
}

/**
 * Commit a single dataset to source control
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
        queryKey: sourceControlSyncKeys.uncommittedChanges(variables.workspaceId),
      });
      // Invalidate dataset
      queryClient.invalidateQueries({
        queryKey: datasetKeys.detail(variables.datasetId),
      });
      // Invalidate commit history
      queryClient.invalidateQueries({
        queryKey: sourceControlSyncKeys.commitHistory(variables.datasetId),
      });
      // Invalidate datasets list
      queryClient.invalidateQueries({
        queryKey: datasetKeys.list({ workspaceId: variables.workspaceId }),
      });
    },
  });
}

/**
 * Commit multiple datasets to source control
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
        queryKey: sourceControlSyncKeys.uncommittedChanges(variables.workspaceId),
      });
      // Invalidate all committed datasets
      variables.datasetIds.forEach((datasetId) => {
        queryClient.invalidateQueries({
          queryKey: datasetKeys.detail(datasetId),
        });
        queryClient.invalidateQueries({
          queryKey: sourceControlSyncKeys.commitHistory(datasetId),
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
 * Pull changes from source control
 */
export function usePullFromSourceControl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId }: { workspaceId: string }) => {
      return await pullFromSourceControl(workspaceId);
    },
    onSuccess: (_, variables) => {
      // Invalidate all dataset-related queries
      queryClient.invalidateQueries({
        queryKey: datasetKeys.all,
      });
      queryClient.invalidateQueries({
        queryKey: sourceControlSyncKeys.uncommittedChanges(variables.workspaceId),
      });
      queryClient.invalidateQueries({
        queryKey: sourceControlSyncKeys.conflicts(variables.workspaceId),
      });
    },
  });
}

/**
 * Push changes to source control
 */
export function usePushToSourceControl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workspaceId }: { workspaceId: string }) => {
      return await pushToSourceControl(workspaceId);
    },
    onSuccess: (_, variables) => {
      // Invalidate uncommitted changes
      queryClient.invalidateQueries({
        queryKey: sourceControlSyncKeys.uncommittedChanges(variables.workspaceId),
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
        queryKey: sourceControlSyncKeys.conflicts(variables.workspaceId),
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
    queryKey: [...sourceControlSyncKeys.uncommittedChanges(workspaceId || ''), 'subscription'],
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
              queryKey: sourceControlSyncKeys.uncommittedChanges(workspaceId),
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
    queryKey: [...sourceControlSyncKeys.all, 'syncStatusSummary', workspaceId],
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
    queryKey: [...sourceControlSyncKeys.all, 'hasUncommittedChanges', workspaceId],
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
