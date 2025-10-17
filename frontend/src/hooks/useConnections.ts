/**
 * Connection Hooks
 *
 * React Query hooks for managing connections including queries and mutations.
 */

import { useQuery, useMutation, useQueryClient, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import {
  Connection,
  ConnectionWithDetails,
  CreateConnectionInput,
  UpdateConnectionInput,
  ConnectionFilters,
  TestConnectionResult,
  SchemaInfo,
  TableInfo,
  TableMetadata,
  ImportMetadataOptions,
  ImportMetadataResult
} from '@/types/connection';
import { PaginatedResponse } from '@/types/api';
import { createConnectionService } from '@/lib/services';

const connectionService = createConnectionService();

// =====================================================
// Query Keys
// =====================================================

export const connectionKeys = {
  all: ['connections'] as const,
  lists: () => [...connectionKeys.all, 'list'] as const,
  list: (filters: ConnectionFilters) => [...connectionKeys.lists(), filters] as const,
  details: () => [...connectionKeys.all, 'detail'] as const,
  detail: (id: string) => [...connectionKeys.details(), id] as const,
  schemas: (id: string) => [...connectionKeys.detail(id), 'schemas'] as const,
  tables: (id: string, schema: string) => [...connectionKeys.detail(id), 'tables', schema] as const,
  tableMetadata: (id: string, schema: string, table: string) => [...connectionKeys.detail(id), 'metadata', schema, table] as const
};

// =====================================================
// Query Hooks
// =====================================================

/**
 * Hook to fetch paginated list of connections
 */
export function useConnections(
  filters: ConnectionFilters = {},
  options?: Omit<UseQueryOptions<PaginatedResponse<ConnectionWithDetails>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: connectionKeys.list(filters),
    queryFn: () => connectionService.getConnections(filters),
    staleTime: 30000, // 30 seconds
    ...options
  });
}

/**
 * Hook to fetch a single connection
 */
export function useConnection(
  connectionId: string,
  options?: Omit<UseQueryOptions<ConnectionWithDetails>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: connectionKeys.detail(connectionId),
    queryFn: () => connectionService.getConnection(connectionId),
    enabled: !!connectionId,
    staleTime: 60000, // 1 minute
    ...options
  });
}

/**
 * Hook to fetch schemas from connection
 */
export function useConnectionSchemas(
  connectionId: string,
  options?: Omit<UseQueryOptions<SchemaInfo[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: connectionKeys.schemas(connectionId),
    queryFn: () => connectionService.listSchemas(connectionId),
    enabled: !!connectionId,
    staleTime: 300000, // 5 minutes
    ...options
  });
}

/**
 * Hook to fetch tables from schema
 */
export function useConnectionTables(
  connectionId: string,
  schema: string,
  options?: Omit<UseQueryOptions<TableInfo[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: connectionKeys.tables(connectionId, schema),
    queryFn: () => connectionService.listTables(connectionId, schema),
    enabled: !!connectionId && !!schema,
    staleTime: 300000, // 5 minutes
    ...options
  });
}

/**
 * Hook to fetch table metadata
 */
export function useTableMetadata(
  connectionId: string,
  schema: string,
  table: string,
  options?: Omit<UseQueryOptions<TableMetadata>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: connectionKeys.tableMetadata(connectionId, schema, table),
    queryFn: () => connectionService.getTableMetadata(connectionId, schema, table),
    enabled: !!connectionId && !!schema && !!table,
    staleTime: 600000, // 10 minutes
    ...options
  });
}

// =====================================================
// Mutation Hooks
// =====================================================

/**
 * Hook to create a connection
 */
export function useCreateConnection(
  options?: UseMutationOptions<Connection, Error, CreateConnectionInput>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input) => connectionService.createConnection(input),
    onSuccess: (data) => {
      // Invalidate connections list
      queryClient.invalidateQueries({ queryKey: connectionKeys.lists() });

      // Set the new connection in cache
      queryClient.setQueryData(connectionKeys.detail(data.id), data);
    },
    ...options
  });
}

/**
 * Hook to update a connection
 */
export function useUpdateConnection(
  options?: UseMutationOptions<Connection, Error, { connectionId: string; input: UpdateConnectionInput }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ connectionId, input }) => connectionService.updateConnection(connectionId, input),
    onMutate: async ({ connectionId, input }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: connectionKeys.detail(connectionId) });

      // Snapshot previous value
      const previousConnection = queryClient.getQueryData<ConnectionWithDetails>(connectionKeys.detail(connectionId));

      // Optimistically update
      if (previousConnection) {
        queryClient.setQueryData<ConnectionWithDetails>(connectionKeys.detail(connectionId), {
          ...previousConnection,
          ...input,
          updated_at: new Date().toISOString()
        });
      }

      return { previousConnection };
    },
    onError: (err, { connectionId }, context) => {
      // Rollback on error
      if (context?.previousConnection) {
        queryClient.setQueryData(connectionKeys.detail(connectionId), context.previousConnection);
      }
    },
    onSuccess: (data, { connectionId }) => {
      // Update cache with server data
      queryClient.setQueryData(connectionKeys.detail(connectionId), data);

      // Invalidate lists to show updated data
      queryClient.invalidateQueries({ queryKey: connectionKeys.lists() });
    },
    ...options
  });
}

/**
 * Hook to delete a connection
 */
export function useDeleteConnection(
  options?: UseMutationOptions<void, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId) => connectionService.deleteConnection(connectionId),
    onSuccess: (_, connectionId) => {
      // Remove from cache
      queryClient.removeQueries({ queryKey: connectionKeys.detail(connectionId) });

      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: connectionKeys.lists() });
    },
    ...options
  });
}

/**
 * Hook to test a data connection
 */
export function useTestDataConnection(
  options?: UseMutationOptions<TestConnectionResult, Error, string>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (connectionId) => connectionService.testConnection(connectionId),
    onSuccess: (result, connectionId) => {
      // Invalidate connection detail to refresh test status
      queryClient.invalidateQueries({ queryKey: connectionKeys.detail(connectionId) });

      // Also invalidate lists to update status in list view
      queryClient.invalidateQueries({ queryKey: connectionKeys.lists() });
    },
    ...options
  });
}

/**
 * Hook to import metadata from connection
 */
export function useImportMetadata(
  options?: UseMutationOptions<ImportMetadataResult, Error, { connectionId: string; options: ImportMetadataOptions }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ connectionId, options: importOptions }) =>
      connectionService.importMetadata(connectionId, importOptions),
    onSuccess: (result, { connectionId }) => {
      // Invalidate connection to refresh last_import_at
      queryClient.invalidateQueries({ queryKey: connectionKeys.detail(connectionId) });

      // Invalidate workspace datasets if import was successful
      if (result.success && result.datasets_created > 0) {
        // You might want to invalidate dataset queries here
        // queryClient.invalidateQueries({ queryKey: ['datasets'] });
      }
    },
    ...options
  });
}

// =====================================================
// Project Connection Hooks
// =====================================================

/**
 * Hook to fetch connections linked to a project
 */
export function useProjectConnections(
  projectId: string,
  options?: Omit<UseQueryOptions<PaginatedResponse<ConnectionWithDetails>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...connectionKeys.all, 'project', projectId],
    queryFn: () => connectionService.getProjectConnections(projectId),
    enabled: !!projectId,
    staleTime: 30000, // 30 seconds
    ...options
  });
}

/**
 * Hook to fetch available connections (not yet linked to project)
 */
export function useAvailableProjectConnections(
  projectId: string,
  options?: Omit<UseQueryOptions<ConnectionWithDetails[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: [...connectionKeys.all, 'project', projectId, 'available'],
    queryFn: () => connectionService.getAvailableProjectConnections(projectId),
    enabled: !!projectId,
    staleTime: 30000, // 30 seconds
    ...options
  });
}

/**
 * Hook to link a connection to a project
 */
export function useLinkConnectionToProject(
  options?: UseMutationOptions<void, Error, { projectId: string; connectionId: string }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, connectionId }) =>
      connectionService.linkConnectionToProject(projectId, connectionId),
    onSuccess: (_, { projectId }) => {
      // Invalidate project connections list
      queryClient.invalidateQueries({ queryKey: [...connectionKeys.all, 'project', projectId] });

      // Invalidate available connections list
      queryClient.invalidateQueries({ queryKey: [...connectionKeys.all, 'project', projectId, 'available'] });
    },
    ...options
  });
}

/**
 * Hook to unlink a connection from a project
 */
export function useUnlinkConnectionFromProject(
  options?: UseMutationOptions<void, Error, { projectId: string; connectionId: string }>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ projectId, connectionId }) =>
      connectionService.unlinkConnectionFromProject(projectId, connectionId),
    onSuccess: (_, { projectId }) => {
      // Invalidate project connections list
      queryClient.invalidateQueries({ queryKey: [...connectionKeys.all, 'project', projectId] });

      // Invalidate available connections list
      queryClient.invalidateQueries({ queryKey: [...connectionKeys.all, 'project', projectId, 'available'] });
    },
    ...options
  });
}
