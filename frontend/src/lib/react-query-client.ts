/**
 * React Query Client Configuration
 *
 * Configures the QueryClient with appropriate defaults for
 * caching, retries, and error handling.
 */

import { QueryClient, DefaultOptions } from '@tanstack/react-query';

/**
 * Default options for all queries and mutations
 */
const queryConfig: DefaultOptions = {
  queries: {
    // Stale time: How long data is considered fresh (default: 0)
    staleTime: 60000, // 1 minute

    // Cache time: How long inactive queries stay in cache (default: 5 minutes)
    gcTime: 5 * 60 * 1000, // 5 minutes

    // Retry configuration
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors (client errors)
      if (error?.statusCode >= 400 && error?.statusCode < 500) {
        return false;
      }

      // Retry up to 2 times for other errors
      return failureCount < 2;
    },

    // Retry delay with exponential backoff
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),

    // Refetch configuration
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchOnReconnect: true, // Refetch when network reconnects
    refetchOnMount: true, // Refetch when component mounts

    // Enable/disable network mode
    networkMode: 'online' // Only run queries when online
  },

  mutations: {
    // Retry configuration for mutations
    retry: (failureCount, error: any) => {
      // Don't retry on 4xx errors
      if (error?.statusCode >= 400 && error?.statusCode < 500) {
        return false;
      }

      // Don't retry mutations by default to avoid duplicate operations
      return false;
    },

    // Network mode
    networkMode: 'online'
  }
};

/**
 * Create and configure the QueryClient
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: queryConfig
  });
}

/**
 * Singleton QueryClient instance
 */
export const queryClient = createQueryClient();

/**
 * Query key factories
 * Centralized location for all query keys used in the application
 */
export const queryKeys = {
  // Projects
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (params: Record<string, any>) => [...queryKeys.projects.lists(), params] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.projects.details(), id] as const,
    members: (id: string) => [...queryKeys.projects.detail(id), 'members'] as const,
    stats: (id: string) => [...queryKeys.projects.detail(id), 'stats'] as const
  },

  // Workspaces
  workspaces: {
    all: ['workspaces'] as const,
    lists: () => [...queryKeys.workspaces.all, 'list'] as const,
    list: (params: Record<string, any>) => [...queryKeys.workspaces.lists(), params] as const,
    details: () => [...queryKeys.workspaces.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.workspaces.details(), id] as const,
    members: (id: string) => [...queryKeys.workspaces.detail(id), 'members'] as const,
    settings: (id: string) => [...queryKeys.workspaces.detail(id), 'settings'] as const,
    stats: (id: string) => [...queryKeys.workspaces.detail(id), 'stats'] as const
  },

  // Source Control
  sourceControl: {
    all: ['sourceControl'] as const,
    status: (workspaceId: string) => [...queryKeys.sourceControl.all, 'status', workspaceId] as const,
    repositories: (provider: string, org?: string) =>
      [...queryKeys.sourceControl.all, 'repositories', provider, org] as const,
    branches: (workspaceId: string) => [...queryKeys.sourceControl.all, 'branches', workspaceId] as const,
    uncommittedChanges: (workspaceId: string) =>
      [...queryKeys.sourceControl.all, 'uncommittedChanges', workspaceId] as const,
    commitHistory: (workspaceId: string, limit: number) =>
      [...queryKeys.sourceControl.all, 'commitHistory', workspaceId, limit] as const
  },

  // Datasets
  datasets: {
    all: ['datasets'] as const,
    lists: () => [...queryKeys.datasets.all, 'list'] as const,
    list: (params: Record<string, any>) => [...queryKeys.datasets.lists(), params] as const,
    details: () => [...queryKeys.datasets.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.datasets.details(), id] as const
  },

  // Users
  users: {
    all: ['users'] as const,
    current: () => [...queryKeys.users.all, 'current'] as const,
    detail: (id: string) => [...queryKeys.users.all, 'detail', id] as const
  },

  // Accounts
  accounts: {
    all: ['accounts'] as const,
    current: () => [...queryKeys.accounts.all, 'current'] as const,
    detail: (id: string) => [...queryKeys.accounts.all, 'detail', id] as const
  }
};

/**
 * Helper function to invalidate all queries related to a project
 */
export function invalidateProjectQueries(queryClient: QueryClient, projectId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.members(projectId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.stats(projectId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
}

/**
 * Helper function to invalidate all queries related to a workspace
 */
export function invalidateWorkspaceQueries(queryClient: QueryClient, workspaceId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.detail(workspaceId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.members(workspaceId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.settings(workspaceId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.stats(workspaceId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.workspaces.lists() });
  queryClient.invalidateQueries({ queryKey: queryKeys.sourceControl.status(workspaceId) });
  queryClient.invalidateQueries({ queryKey: queryKeys.sourceControl.uncommittedChanges(workspaceId) });
}

/**
 * Helper function to prefetch common data for a workspace
 */
export async function prefetchWorkspaceData(queryClient: QueryClient, workspaceId: string) {
  const promises = [
    queryClient.prefetchQuery({
      queryKey: queryKeys.workspaces.detail(workspaceId),
      queryFn: async () => {
        const { createWorkspaceService } = await import('@/lib/services');
        const service = createWorkspaceService();
        return service.getWorkspace(workspaceId);
      }
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.workspaces.members(workspaceId),
      queryFn: async () => {
        const { createWorkspaceService } = await import('@/lib/services');
        const service = createWorkspaceService();
        return service.getWorkspaceMembers(workspaceId);
      }
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.sourceControl.status(workspaceId),
      queryFn: async () => {
        const { createSourceControlService } = await import('@/lib/services');
        const service = createSourceControlService();
        return service.getConnectionStatus(workspaceId);
      }
    })
  ];

  await Promise.allSettled(promises);
}

/**
 * Helper function to prefetch common data for a project
 */
export async function prefetchProjectData(queryClient: QueryClient, projectId: string) {
  const promises = [
    queryClient.prefetchQuery({
      queryKey: queryKeys.projects.detail(projectId),
      queryFn: async () => {
        const { createProjectService } = await import('@/lib/services');
        const service = createProjectService();
        return service.getProject(projectId);
      }
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.projects.members(projectId),
      queryFn: async () => {
        const { createProjectService } = await import('@/lib/services');
        const service = createProjectService();
        return service.getProjectMembers(projectId);
      }
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.projects.stats(projectId),
      queryFn: async () => {
        const { createProjectService } = await import('@/lib/services');
        const service = createProjectService();
        return service.getProjectStats(projectId);
      }
    })
  ];

  await Promise.allSettled(promises);
}

/**
 * Custom error handler for React Query
 */
export function handleQueryError(error: any) {
  console.error('Query error:', error);

  // Add custom error handling logic here
  // For example: show toast notifications, track errors, etc.

  if (error?.statusCode === 401) {
    // Handle unauthorized - redirect to login
    console.error('Unauthorized - user needs to log in');
  } else if (error?.statusCode === 403) {
    // Handle forbidden - show permission error
    console.error('Forbidden - insufficient permissions');
  } else if (error?.statusCode === 404) {
    // Handle not found
    console.error('Resource not found');
  } else if (error?.statusCode >= 500) {
    // Handle server errors
    console.error('Server error - please try again later');
  }
}

/**
 * Set up global error handlers for React Query
 */
export function setupQueryErrorHandlers(queryClient: QueryClient) {
  queryClient.getQueryCache().config.onError = handleQueryError;
  queryClient.getMutationCache().config.onError = handleQueryError;
}
