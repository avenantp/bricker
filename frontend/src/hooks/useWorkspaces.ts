/**
 * Workspace Hooks
 *
 * React Query hooks for managing workspaces including queries and mutations.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import {
  Workspace,
  WorkspaceWithDetails,
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceSettings,
  WorkspaceStats,
  CreateWorkspaceInput,
  UpdateWorkspaceInput
} from '@/types/workspace';
import { PaginatedResponse } from '@/types/api';
import { createWorkspaceService, GetWorkspacesParams } from '@/lib/services';

const workspaceService = createWorkspaceService();

// =====================================================
// Query Keys
// =====================================================

export const workspaceKeys = {
  all: ['workspaces'] as const,
  lists: () => [...workspaceKeys.all, 'list'] as const,
  list: (params: GetWorkspacesParams) => [...workspaceKeys.lists(), params] as const,
  details: () => [...workspaceKeys.all, 'detail'] as const,
  detail: (id: string) => [...workspaceKeys.details(), id] as const,
  members: (id: string) => [...workspaceKeys.detail(id), 'members'] as const,
  settings: (id: string) => [...workspaceKeys.detail(id), 'settings'] as const,
  stats: (id: string) => [...workspaceKeys.detail(id), 'stats'] as const
};

// =====================================================
// Query Hooks
// =====================================================

/**
 * Hook to fetch paginated list of workspaces
 */
export function useWorkspaces(
  params: GetWorkspacesParams = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<WorkspaceWithDetails>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: workspaceKeys.list(params),
    queryFn: () => workspaceService.getWorkspaces(params),
    staleTime: 30000, // 30 seconds
    ...options
  });
}

/**
 * Hook to fetch a single workspace
 */
export function useWorkspace(
  workspaceId: string,
  options?: Omit<UseQueryOptions<WorkspaceWithDetails>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: workspaceKeys.detail(workspaceId),
    queryFn: () => workspaceService.getWorkspace(workspaceId),
    enabled: !!workspaceId,
    staleTime: 60000, // 1 minute
    ...options
  });
}

/**
 * Hook to fetch workspace members
 */
export function useWorkspaceMembers(
  workspaceId: string,
  options?: Omit<UseQueryOptions<WorkspaceMember[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: workspaceKeys.members(workspaceId),
    queryFn: () => workspaceService.getWorkspaceMembers(workspaceId),
    enabled: !!workspaceId,
    staleTime: 30000,
    ...options
  });
}

/**
 * Hook to fetch workspace settings
 */
export function useWorkspaceSettings(
  workspaceId: string,
  options?: Omit<UseQueryOptions<WorkspaceSettings>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: workspaceKeys.settings(workspaceId),
    queryFn: () => workspaceService.getWorkspaceSettings(workspaceId),
    enabled: !!workspaceId,
    staleTime: 60000,
    ...options
  });
}

/**
 * Hook to fetch workspace statistics
 */
export function useWorkspaceStats(
  workspaceId: string,
  options?: Omit<UseQueryOptions<WorkspaceStats>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: workspaceKeys.stats(workspaceId),
    queryFn: () => workspaceService.getWorkspaceStats(workspaceId),
    enabled: !!workspaceId,
    staleTime: 60000,
    ...options
  });
}

// =====================================================
// Mutation Hooks
// =====================================================

/**
 * Hook to create a workspace
 */
export function useCreateWorkspace(
  options?: UseMutationOptions<Workspace, Error, { input: CreateWorkspaceInput; userId: string }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, userId }) => workspaceService.createWorkspace(input, userId),
    onSuccess: (data) => {
      // Invalidate workspaces list
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });

      // Set the new workspace in cache
      queryClient.setQueryData(workspaceKeys.detail(data.id), data);

      // Invalidate project detail (workspace count may have changed)
      if (data.project_id) {
        queryClient.invalidateQueries({ queryKey: ['projects', 'detail', data.project_id] });
      }
    },
    ...options
  });
}

/**
 * Hook to update a workspace
 */
export function useUpdateWorkspace(
  options?: UseMutationOptions<Workspace, Error, { workspaceId: string; input: UpdateWorkspaceInput }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, input }) => workspaceService.updateWorkspace(workspaceId, input),
    onMutate: async ({ workspaceId, input }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: workspaceKeys.detail(workspaceId) });

      // Snapshot previous value
      const previousWorkspace = queryClient.getQueryData<WorkspaceWithDetails>(workspaceKeys.detail(workspaceId));

      // Optimistically update
      if (previousWorkspace) {
        queryClient.setQueryData<WorkspaceWithDetails>(workspaceKeys.detail(workspaceId), {
          ...previousWorkspace,
          ...input,
          updated_at: new Date().toISOString()
        });
      }

      return { previousWorkspace };
    },
    onError: (err, { workspaceId }, context) => {
      // Rollback on error
      if (context?.previousWorkspace) {
        queryClient.setQueryData(workspaceKeys.detail(workspaceId), context.previousWorkspace);
      }
    },
    onSuccess: (data, { workspaceId }) => {
      // Update cache with server data
      queryClient.setQueryData(workspaceKeys.detail(workspaceId), data);

      // Invalidate lists to show updated data
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });
    },
    ...options
  });
}

/**
 * Hook to delete a workspace
 */
export function useDeleteWorkspace(
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId) => workspaceService.deleteWorkspace(workspaceId),
    onSuccess: (_, workspaceId) => {
      // Get workspace to know which project to invalidate
      const workspace = queryClient.getQueryData<Workspace>(workspaceKeys.detail(workspaceId));

      // Remove from cache
      queryClient.removeQueries({ queryKey: workspaceKeys.detail(workspaceId) });

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: workspaceKeys.lists() });

      // Invalidate project detail
      if (workspace?.project_id) {
        queryClient.invalidateQueries({ queryKey: ['projects', 'detail', workspace.project_id] });
      }
    },
    ...options
  });
}

/**
 * Hook to add a workspace member
 */
export function useAddWorkspaceMember(
  options?: UseMutationOptions<
    WorkspaceMember,
    Error,
    { workspaceId: string; userId: string; role: WorkspaceRole; invitedBy: string }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, userId, role, invitedBy }) =>
      workspaceService.addWorkspaceMember(workspaceId, userId, role, invitedBy),
    onSuccess: (data, { workspaceId }) => {
      // Invalidate members list
      queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) });

      // Invalidate workspace detail (member count may have changed)
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });
    },
    ...options
  });
}

/**
 * Hook to update workspace member role
 */
export function useUpdateWorkspaceMemberRole(
  options?: UseMutationOptions<
    WorkspaceMember,
    Error,
    { workspaceId: string; userId: string; newRole: WorkspaceRole }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, userId, newRole }) =>
      workspaceService.updateWorkspaceMemberRole(workspaceId, userId, newRole),
    onMutate: async ({ workspaceId, userId, newRole }) => {
      await queryClient.cancelQueries({ queryKey: workspaceKeys.members(workspaceId) });

      const previousMembers = queryClient.getQueryData<WorkspaceMember[]>(workspaceKeys.members(workspaceId));

      // Optimistically update
      if (previousMembers) {
        const updatedMembers = previousMembers.map(member =>
          member.user_id === userId ? { ...member, role: newRole } : member
        );
        queryClient.setQueryData(workspaceKeys.members(workspaceId), updatedMembers);
      }

      return { previousMembers };
    },
    onError: (err, { workspaceId }, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(workspaceKeys.members(workspaceId), context.previousMembers);
      }
    },
    onSuccess: (data, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) });
    },
    ...options
  });
}

/**
 * Hook to remove a workspace member
 */
export function useRemoveWorkspaceMember(
  options?: UseMutationOptions<void, Error, { workspaceId: string; userId: string }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, userId }) =>
      workspaceService.removeWorkspaceMember(workspaceId, userId),
    onMutate: async ({ workspaceId, userId }) => {
      await queryClient.cancelQueries({ queryKey: workspaceKeys.members(workspaceId) });

      const previousMembers = queryClient.getQueryData<WorkspaceMember[]>(workspaceKeys.members(workspaceId));

      // Optimistically remove
      if (previousMembers) {
        const updatedMembers = previousMembers.filter(member => member.user_id !== userId);
        queryClient.setQueryData(workspaceKeys.members(workspaceId), updatedMembers);
      }

      return { previousMembers };
    },
    onError: (err, { workspaceId }, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(workspaceKeys.members(workspaceId), context.previousMembers);
      }
    },
    onSuccess: (_, { workspaceId }) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.members(workspaceId) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });
    },
    ...options
  });
}

/**
 * Hook to update workspace settings
 */
export function useUpdateWorkspaceSettings(
  options?: UseMutationOptions<WorkspaceSettings, Error, { workspaceId: string; settings: Partial<WorkspaceSettings> }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ workspaceId, settings }) =>
      workspaceService.updateWorkspaceSettings(workspaceId, settings),
    onMutate: async ({ workspaceId, settings }) => {
      await queryClient.cancelQueries({ queryKey: workspaceKeys.settings(workspaceId) });

      const previousSettings = queryClient.getQueryData<WorkspaceSettings>(workspaceKeys.settings(workspaceId));

      // Optimistically update
      if (previousSettings) {
        queryClient.setQueryData<WorkspaceSettings>(workspaceKeys.settings(workspaceId), {
          ...previousSettings,
          ...settings
        });
      }

      return { previousSettings };
    },
    onError: (err, { workspaceId }, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(workspaceKeys.settings(workspaceId), context.previousSettings);
      }
    },
    onSuccess: (data, { workspaceId }) => {
      queryClient.setQueryData(workspaceKeys.settings(workspaceId), data);
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(workspaceId) });
    },
    ...options
  });
}

// =====================================================
// Permission Hooks
// =====================================================

/**
 * Hook to check if user can edit workspace
 */
export function useCanEditWorkspace(workspaceId: string, userId: string) {
  return useQuery({
    queryKey: [...workspaceKeys.detail(workspaceId), 'canEdit', userId],
    queryFn: () => workspaceService.canEditWorkspace(workspaceId, userId),
    enabled: !!workspaceId && !!userId,
    staleTime: 60000
  });
}

/**
 * Hook to check if user can delete workspace
 */
export function useCanDeleteWorkspace(workspaceId: string, userId: string) {
  return useQuery({
    queryKey: [...workspaceKeys.detail(workspaceId), 'canDelete', userId],
    queryFn: () => workspaceService.canDeleteWorkspace(workspaceId, userId),
    enabled: !!workspaceId && !!userId,
    staleTime: 60000
  });
}

/**
 * Hook to check if user can manage workspace members
 */
export function useCanManageWorkspaceMembers(workspaceId: string, userId: string) {
  return useQuery({
    queryKey: [...workspaceKeys.detail(workspaceId), 'canManageMembers', userId],
    queryFn: () => workspaceService.canManageWorkspaceMembers(workspaceId, userId),
    enabled: !!workspaceId && !!userId,
    staleTime: 60000
  });
}
