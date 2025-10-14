/**
 * Source Control Hooks
 *
 * React Query hooks for managing source control integration.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import {
  SourceControlProvider as SourceControlProviderEnum,
  SourceControlCredentials,
  SourceControlConnectionConfig,
  SourceControlConnectionStatus,
  ConnectionTestResult,
  Repository,
  Branch,
  Commit,
  CommitResult,
  SyncResult,
  FileChange
} from '@/types/source-control';
import { createSourceControlService, CommitParams, SyncParams } from '@/lib/services';
import { workspaceKeys } from './useWorkspaces';

const sourceControlService = createSourceControlService();

// =====================================================
// Query Keys
// =====================================================

export const sourceControlKeys = {
  all: ['sourceControl'] as const,
  connection: (workspaceId: string) => [...sourceControlKeys.all, 'connection', workspaceId] as const,
  status: (workspaceId: string) => [...sourceControlKeys.all, 'status', workspaceId] as const,
  repositories: (provider: SourceControlProviderEnum, organization?: string) =>
    [...sourceControlKeys.all, 'repositories', provider, organization] as const,
  branches: (workspaceId: string) => [...sourceControlKeys.all, 'branches', workspaceId] as const,
  uncommittedChanges: (workspaceId: string) => [...sourceControlKeys.all, 'uncommittedChanges', workspaceId] as const,
  commitHistory: (workspaceId: string, limit: number) =>
    [...sourceControlKeys.all, 'commitHistory', workspaceId, limit] as const
};

// =====================================================
// Query Hooks
// =====================================================

/**
 * Hook to get connection status
 */
export function useSourceControlStatus(
  workspaceId: string,
  options?: Omit<UseQueryOptions<SourceControlConnectionStatus>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: sourceControlKeys.status(workspaceId),
    queryFn: () => sourceControlService.getConnectionStatus(workspaceId),
    enabled: !!workspaceId,
    staleTime: 30000, // 30 seconds
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    ...options
  });
}

/**
 * Hook to list repositories
 */
export function useRepositories(
  provider: SourceControlProviderEnum,
  credentials: SourceControlCredentials,
  options?: {
    organization?: string;
    limit?: number;
  } & Omit<UseQueryOptions<Repository[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: sourceControlKeys.repositories(provider, options?.organization),
    queryFn: () => sourceControlService.listRepositories(provider, credentials, options),
    enabled: !!provider && !!credentials.access_token,
    staleTime: 60000,
    ...options
  });
}

/**
 * Hook to list branches
 */
export function useBranches(
  workspaceId: string,
  options?: Omit<UseQueryOptions<Branch[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: sourceControlKeys.branches(workspaceId),
    queryFn: () => sourceControlService.listBranches(workspaceId),
    enabled: !!workspaceId,
    staleTime: 60000,
    ...options
  });
}

/**
 * Hook to get uncommitted changes
 */
export function useUncommittedChanges(
  workspaceId: string,
  options?: Omit<UseQueryOptions<FileChange[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: sourceControlKeys.uncommittedChanges(workspaceId),
    queryFn: () => sourceControlService.getUncommittedChanges(workspaceId),
    enabled: !!workspaceId,
    staleTime: 10000, // 10 seconds - more frequent for uncommitted changes
    refetchInterval: 30000, // Auto-refresh every 30 seconds
    ...options
  });
}

/**
 * Hook to get commit history
 */
export function useCommitHistory(
  workspaceId: string,
  limit: number = 20,
  options?: Omit<UseQueryOptions<Commit[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: sourceControlKeys.commitHistory(workspaceId, limit),
    queryFn: () => sourceControlService.getCommitHistory(workspaceId, limit),
    enabled: !!workspaceId,
    staleTime: 60000,
    ...options
  });
}

// =====================================================
// Mutation Hooks
// =====================================================

/**
 * Hook to connect to source control
 */
export function useConnect(
  options?: UseMutationOptions<
    ConnectionTestResult,
    Error,
    { config: SourceControlConnectionConfig; workspaceId: string }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ config, workspaceId }) => sourceControlService.connect(config, workspaceId),
    onSuccess: (data, { workspaceId }) => {
      // Invalidate workspace detail (connection info changed)
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });

      // Invalidate connection status
      queryClient.invalidateQueries({ queryKey: sourceControlKeys.status(workspaceId) });

      // Prefetch branches and commit history
      queryClient.prefetchQuery({
        queryKey: sourceControlKeys.branches(workspaceId),
        queryFn: () => sourceControlService.listBranches(workspaceId)
      });

      queryClient.prefetchQuery({
        queryKey: sourceControlKeys.commitHistory(workspaceId, 20),
        queryFn: () => sourceControlService.getCommitHistory(workspaceId, 20)
      });
    },
    ...options
  });
}

/**
 * Hook to disconnect from source control
 */
export function useDisconnect(
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId) => sourceControlService.disconnect(workspaceId),
    onSuccess: (_, workspaceId) => {
      // Invalidate workspace detail
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });

      // Remove source control related queries
      queryClient.removeQueries({ queryKey: sourceControlKeys.status(workspaceId) });
      queryClient.removeQueries({ queryKey: sourceControlKeys.branches(workspaceId) });
      queryClient.removeQueries({ queryKey: sourceControlKeys.uncommittedChanges(workspaceId) });
      queryClient.removeQueries({ queryKey: sourceControlKeys.commitHistory(workspaceId, 20) });
    },
    ...options
  });
}

/**
 * Hook to test connection
 */
export function useTestConnection(
  options?: UseMutationOptions<ConnectionTestResult, Error, string>
) {
  return useMutation({
    mutationFn: (workspaceId) => sourceControlService.testConnection(workspaceId),
    ...options
  });
}

/**
 * Hook to create repository
 */
export function useCreateRepository(
  options?: UseMutationOptions<
    Repository,
    Error,
    {
      provider: SourceControlProviderEnum;
      credentials: SourceControlCredentials;
      name: string;
      isPrivate: boolean;
      options?: { description?: string; organization?: string };
    }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ provider, credentials, name, isPrivate, options: repoOptions }) =>
      sourceControlService.createRepository(provider, credentials, name, isPrivate, repoOptions),
    onSuccess: (data, { provider, options: repoOptions }) => {
      // Invalidate repositories list
      queryClient.invalidateQueries({
        queryKey: sourceControlKeys.repositories(provider, repoOptions?.organization)
      });
    },
    ...options
  });
}

/**
 * Hook to initialize repository structure
 */
export function useInitializeRepositoryStructure(
  options?: UseMutationOptions<void, Error, string>
) {
  return useMutation({
    mutationFn: (workspaceId) => sourceControlService.initializeRepositoryStructure(workspaceId),
    ...options
  });
}

/**
 * Hook to create branch
 */
export function useCreateBranch(
  options?: UseMutationOptions<Branch, Error, { workspaceId: string; branchName: string; fromBranch?: string }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, branchName, fromBranch }) =>
      sourceControlService.createBranch(workspaceId, branchName, fromBranch),
    onSuccess: (data, { workspaceId }) => {
      // Invalidate branches list
      queryClient.invalidateQueries({ queryKey: sourceControlKeys.branches(workspaceId) });
    },
    ...options
  });
}

/**
 * Hook to commit changes
 */
export function useCommit(
  options?: UseMutationOptions<CommitResult, Error, CommitParams>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => sourceControlService.commit(params),
    onSuccess: (data, params) => {
      // Invalidate uncommitted changes
      queryClient.invalidateQueries({ queryKey: sourceControlKeys.uncommittedChanges(params.workspace_id) });

      // Invalidate commit history
      queryClient.invalidateQueries({ queryKey: sourceControlKeys.commitHistory(params.workspace_id, 20) });

      // Invalidate workspace detail (sync status changed)
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(params.workspace_id) });

      // Update connection status to connected
      queryClient.setQueryData<SourceControlConnectionStatus>(
        sourceControlKeys.status(params.workspace_id),
        'connected'
      );
    },
    ...options
  });
}

/**
 * Hook to sync (pull) changes
 */
export function useSync(
  options?: UseMutationOptions<SyncResult, Error, SyncParams>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params) => sourceControlService.sync(params),
    onMutate: async (params) => {
      // Set status to syncing
      queryClient.setQueryData<SourceControlConnectionStatus>(
        sourceControlKeys.status(params.workspace_id),
        'syncing'
      );
    },
    onSuccess: (data, params) => {
      // Update status based on result
      const status: SourceControlConnectionStatus = data.status === 'conflicts' ? 'conflict' : 'connected';
      queryClient.setQueryData<SourceControlConnectionStatus>(
        sourceControlKeys.status(params.workspace_id),
        status
      );

      // Invalidate workspace detail
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(params.workspace_id) });

      // Invalidate commit history
      queryClient.invalidateQueries({ queryKey: sourceControlKeys.commitHistory(params.workspace_id, 20) });

      // If datasets were changed, invalidate dataset queries
      if (data.datasets_added > 0 || data.datasets_updated > 0 || data.datasets_deleted > 0) {
        queryClient.invalidateQueries({ queryKey: ['datasets', 'list'] });
      }
    },
    onError: (err, params) => {
      // Set status to error
      queryClient.setQueryData<SourceControlConnectionStatus>(
        sourceControlKeys.status(params.workspace_id),
        'error'
      );
    },
    ...options
  });
}

/**
 * Hook to resolve conflict
 */
export function useResolveConflict(
  options?: UseMutationOptions<
    void,
    Error,
    { workspaceId: string; datasetId: string; strategy: 'ours' | 'theirs' | 'manual' }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, datasetId, strategy }) =>
      sourceControlService.resolveConflict(workspaceId, datasetId, strategy),
    onSuccess: (data, { workspaceId }) => {
      // Invalidate connection status (conflicts may be resolved)
      queryClient.invalidateQueries({ queryKey: sourceControlKeys.status(workspaceId) });

      // Invalidate workspace detail
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });
    },
    ...options
  });
}

// =====================================================
// Utility Hooks
// =====================================================

/**
 * Hook to auto-refresh source control status
 * Useful for components that need real-time status updates
 */
export function useAutoRefreshSourceControlStatus(workspaceId: string, enabled: boolean = true) {
  return useSourceControlStatus(workspaceId, {
    enabled,
    refetchInterval: 30000 // Refresh every 30 seconds
  });
}

/**
 * Hook to check if workspace has uncommitted changes
 */
export function useHasUncommittedChanges(workspaceId: string) {
  const { data: changes } = useUncommittedChanges(workspaceId);
  return changes && changes.length > 0;
}

/**
 * Hook to get uncommitted changes count
 */
export function useUncommittedChangesCount(workspaceId: string) {
  const { data: changes } = useUncommittedChanges(workspaceId);
  return changes?.length || 0;
}
