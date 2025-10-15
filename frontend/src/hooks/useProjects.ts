/**
 * Project Hooks
 *
 * React Query hooks for managing projects including queries and mutations.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import {
  Project,
  ProjectWithDetails,
  ProjectUser,
  ProjectRole,
  ProjectStats,
  CreateProjectInput,
  UpdateProjectInput
} from '@/types/project';
import { PaginatedResponse } from '@/types/api';
import { createProjectService, GetProjectsParams } from '@/lib/services';

const projectService = createProjectService();

// =====================================================
// Query Keys
// =====================================================

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (params: GetProjectsParams) => [...projectKeys.lists(), params] as const,
  details: () => [...projectKeys.all, 'detail'] as const,
  detail: (id: string) => [...projectKeys.details(), id] as const,
  users: (id: string) => [...projectKeys.detail(id), 'users'] as const,
  stats: (id: string) => [...projectKeys.detail(id), 'stats'] as const,
  search: (query: string, accountId: string) => [...projectKeys.all, 'search', query, accountId] as const
};

// =====================================================
// Query Hooks
// =====================================================

/**
 * Hook to fetch paginated list of projects
 */
export function useProjects(
  params: GetProjectsParams = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<ProjectWithDetails>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: projectKeys.list(params),
    queryFn: () => projectService.getProjects(params),
    staleTime: 30000, // 30 seconds
    ...options
  });
}

/**
 * Hook to fetch a single project
 */
export function useProject(
  projectId: string,
  options?: Omit<UseQueryOptions<ProjectWithDetails>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => projectService.getProject(projectId),
    enabled: !!projectId,
    staleTime: 60000, // 1 minute
    ...options
  });
}

/**
 * Hook to fetch project users
 */
export function useProjectUsers(
  projectId: string,
  options?: Omit<UseQueryOptions<ProjectUser[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: projectKeys.users(projectId),
    queryFn: () => projectService.getProjectUsers(projectId),
    enabled: !!projectId,
    staleTime: 30000,
    ...options
  });
}

/**
 * Hook to fetch project statistics
 */
export function useProjectStats(
  projectId: string,
  options?: Omit<UseQueryOptions<ProjectStats>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: projectKeys.stats(projectId),
    queryFn: () => projectService.getProjectStats(projectId),
    enabled: !!projectId,
    staleTime: 60000,
    ...options
  });
}

/**
 * Hook to search projects
 */
export function useSearchProjects(
  query: string,
  accountId: string,
  options?: Omit<UseQueryOptions<Project[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: projectKeys.search(query, accountId),
    queryFn: () => projectService.searchProjects(query, accountId),
    enabled: !!query && query.length >= 2 && !!accountId,
    staleTime: 10000,
    ...options
  });
}

// =====================================================
// Mutation Hooks
// =====================================================

/**
 * Hook to create a project
 */
export function useCreateProject(
  options?: UseMutationOptions<Project, Error, { input: CreateProjectInput; userId: string }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ input, userId }) => projectService.createProject(input, userId),
    onSuccess: (data) => {
      // Invalidate projects list
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });

      // Optionally set the new project in cache
      queryClient.setQueryData(projectKeys.detail(data.id), data);
    },
    ...options
  });
}

/**
 * Hook to update a project
 */
export function useUpdateProject(
  options?: UseMutationOptions<Project, Error, { projectId: string; input: UpdateProjectInput }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, input }) => projectService.updateProject(projectId, input),
    onMutate: async ({ projectId, input }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: projectKeys.detail(projectId) });

      // Snapshot previous value
      const previousProject = queryClient.getQueryData<ProjectWithDetails>(projectKeys.detail(projectId));

      // Optimistically update
      if (previousProject) {
        queryClient.setQueryData<ProjectWithDetails>(projectKeys.detail(projectId), {
          ...previousProject,
          ...input,
          updated_at: new Date().toISOString()
        });
      }

      return { previousProject };
    },
    onError: (err, { projectId }, context) => {
      // Rollback on error
      if (context?.previousProject) {
        queryClient.setQueryData(projectKeys.detail(projectId), context.previousProject);
      }
    },
    onSuccess: (data, { projectId }) => {
      // Update cache with server data
      queryClient.setQueryData(projectKeys.detail(projectId), data);

      // Invalidate lists to show updated data
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
    ...options
  });
}

/**
 * Hook to delete a project
 */
export function useDeleteProject(
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId) => projectService.deleteProject(projectId),
    onSuccess: (_, projectId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: projectKeys.detail(projectId) });

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });
    },
    ...options
  });
}

/**
 * Hook to add a project user
 */
export function useAddProjectUser(
  options?: UseMutationOptions<
    ProjectUser,
    Error,
    { projectId: string; userId: string; role: ProjectRole; invitedBy: string }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, userId, role, invitedBy }) =>
      projectService.addProjectUser(projectId, userId, role, invitedBy),
    onSuccess: (data, { projectId }) => {
      // Invalidate users list
      queryClient.invalidateQueries({ queryKey: projectKeys.users(projectId) });

      // Invalidate project detail (user count may have changed)
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
    ...options
  });
}

/**
 * Hook to update project user role
 */
export function useUpdateProjectUserRole(
  options?: UseMutationOptions<
    ProjectUser,
    Error,
    { projectId: string; userId: string; newRole: ProjectRole }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, userId, newRole }) =>
      projectService.updateProjectUserRole(projectId, userId, newRole),
    onMutate: async ({ projectId, userId, newRole }) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.users(projectId) });

      const previousUsers = queryClient.getQueryData<ProjectUser[]>(projectKeys.users(projectId));

      // Optimistically update
      if (previousUsers) {
        const updatedUsers = previousUsers.map(user =>
          user.user_id === userId ? { ...user, role: newRole } : user
        );
        queryClient.setQueryData(projectKeys.users(projectId), updatedUsers);
      }

      return { previousUsers };
    },
    onError: (err, { projectId }, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(projectKeys.users(projectId), context.previousUsers);
      }
    },
    onSuccess: (data, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.users(projectId) });
    },
    ...options
  });
}

/**
 * Hook to remove a project user
 */
export function useRemoveProjectUser(
  options?: UseMutationOptions<void, Error, { projectId: string; userId: string }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, userId }) =>
      projectService.removeProjectUser(projectId, userId),
    onMutate: async ({ projectId, userId }) => {
      await queryClient.cancelQueries({ queryKey: projectKeys.users(projectId) });

      const previousUsers = queryClient.getQueryData<ProjectUser[]>(projectKeys.users(projectId));

      // Optimistically remove
      if (previousUsers) {
        const updatedUsers = previousUsers.filter(user => user.user_id !== userId);
        queryClient.setQueryData(projectKeys.users(projectId), updatedUsers);
      }

      return { previousUsers };
    },
    onError: (err, { projectId }, context) => {
      if (context?.previousUsers) {
        queryClient.setQueryData(projectKeys.users(projectId), context.previousUsers);
      }
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: projectKeys.users(projectId) });
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
    },
    ...options
  });
}

// =====================================================
// Permission Hooks
// =====================================================

/**
 * Hook to check if user can edit project
 */
export function useCanEditProject(projectId: string, userId: string) {
  return useQuery({
    queryKey: [...projectKeys.detail(projectId), 'canEdit', userId],
    queryFn: () => projectService.canEditProject(projectId, userId),
    enabled: !!projectId && !!userId,
    staleTime: 60000
  });
}

/**
 * Hook to check if user can delete project
 */
export function useCanDeleteProject(projectId: string, userId: string) {
  return useQuery({
    queryKey: [...projectKeys.detail(projectId), 'canDelete', userId],
    queryFn: () => projectService.canDeleteProject(projectId, userId),
    enabled: !!projectId && !!userId,
    staleTime: 60000
  });
}

/**
 * Hook to check if user can manage project users
 */
export function useCanManageProjectUsers(projectId: string, userId: string) {
  return useQuery({
    queryKey: [...projectKeys.detail(projectId), 'canManageUsers', userId],
    queryFn: () => projectService.canManageProjectUsers(projectId, userId),
    enabled: !!projectId && !!userId,
    staleTime: 60000
  });
}

// =====================================================
// Source Control Hooks
// =====================================================

/**
 * Hook to connect project to source control
 */
export function useConnectProjectSourceControl(
  options?: UseMutationOptions<
    Project,
    Error,
    {
      projectId: string;
      provider: string;
      repoUrl: string;
      accessToken: string;
      refreshToken?: string;
      defaultBranch?: string;
      username?: string;
    }
  >
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, provider, repoUrl, accessToken, refreshToken, defaultBranch, username }) =>
      projectService.connectSourceControl(projectId, {
        provider,
        repo_url: repoUrl,
        access_token: accessToken,
        refresh_token: refreshToken,
        default_branch: defaultBranch,
        username
      }),
    onSuccess: (data, { projectId }) => {
      // Update project in cache
      queryClient.setQueryData(projectKeys.detail(projectId), data);

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });

      // Invalidate source control status
      queryClient.invalidateQueries({ queryKey: [...projectKeys.detail(projectId), 'sourceControl'] });
    },
    ...options
  });
}

/**
 * Hook to disconnect project from source control
 */
export function useDisconnectProjectSourceControl(
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (projectId) => projectService.disconnectSourceControl(projectId),
    onSuccess: (_, projectId) => {
      // Invalidate project detail
      queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() });

      // Invalidate source control status
      queryClient.invalidateQueries({ queryKey: [...projectKeys.detail(projectId), 'sourceControl'] });
    },
    ...options
  });
}

/**
 * Hook to test project source control connection
 */
export function useTestProjectSourceControl(
  projectId: string,
  options?: Omit<UseQueryOptions<{ connected: boolean; message: string }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...projectKeys.detail(projectId), 'sourceControl', 'test'],
    queryFn: () => projectService.testSourceControl(projectId),
    enabled: false, // Manual trigger only
    staleTime: 0, // Always fresh
    ...options
  });
}

/**
 * Hook to get project source control status
 */
export function useProjectSourceControlStatus(
  projectId: string,
  options?: Omit<UseQueryOptions<any>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...projectKeys.detail(projectId), 'sourceControl', 'status'],
    queryFn: () => projectService.getSourceControlStatus(projectId),
    enabled: !!projectId,
    staleTime: 30000,
    ...options
  });
}

/**
 * Hook to get available branches from project repository
 */
export function useProjectBranches(
  projectId: string,
  options?: Omit<UseQueryOptions<string[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...projectKeys.detail(projectId), 'sourceControl', 'branches'],
    queryFn: () => projectService.getProjectBranches(projectId),
    enabled: !!projectId,
    staleTime: 60000, // 1 minute
    ...options
  });
}
