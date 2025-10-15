/**
 * Workspace Diagram Hooks
 * React Query hooks for workspace diagram operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  WorkspaceDiagram,
  WorkspaceDiagramWithDetails,
  CreateWorkspaceDiagramInput,
  UpdateWorkspaceDiagramInput,
  WorkspaceDiagramFilters,
} from '@/types/workspaceDiagram';
import * as workspaceDiagramService from '@/services/workspaceDiagramService';

/**
 * Query keys for workspace diagrams
 */
export const workspaceDiagramKeys = {
  all: ['workspace-diagrams'] as const,
  lists: () => [...workspaceDiagramKeys.all, 'list'] as const,
  list: (filters: WorkspaceDiagramFilters) => [...workspaceDiagramKeys.lists(), filters] as const,
  details: () => [...workspaceDiagramKeys.all, 'detail'] as const,
  detail: (id: string) => [...workspaceDiagramKeys.details(), id] as const,
  default: (workspaceId: string) => [...workspaceDiagramKeys.all, 'default', workspaceId] as const,
};

/**
 * Fetch workspace diagrams
 */
export function useWorkspaceDiagrams(filters: WorkspaceDiagramFilters = {}, options = {}) {
  return useQuery({
    queryKey: workspaceDiagramKeys.list(filters),
    queryFn: () => workspaceDiagramService.getWorkspaceDiagrams(filters),
    ...options,
  });
}

/**
 * Fetch workspace diagrams with details
 */
export function useWorkspaceDiagramsWithDetails(filters: WorkspaceDiagramFilters = {}, options = {}) {
  return useQuery({
    queryKey: workspaceDiagramKeys.list({ ...filters, withDetails: true } as any),
    queryFn: () => workspaceDiagramService.getWorkspaceDiagramsWithDetails(filters),
    ...options,
  });
}

/**
 * Fetch a single workspace diagram
 */
export function useWorkspaceDiagram(id: string, options = {}) {
  return useQuery({
    queryKey: workspaceDiagramKeys.detail(id),
    queryFn: () => workspaceDiagramService.getWorkspaceDiagram(id),
    enabled: !!id,
    ...options,
  });
}

/**
 * Fetch the default diagram for a workspace
 */
export function useDefaultWorkspaceDiagram(workspaceId: string, options = {}) {
  return useQuery({
    queryKey: workspaceDiagramKeys.default(workspaceId),
    queryFn: () => workspaceDiagramService.getDefaultWorkspaceDiagram(workspaceId),
    enabled: !!workspaceId,
    ...options,
  });
}

/**
 * Create a new workspace diagram
 */
export function useCreateWorkspaceDiagram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateWorkspaceDiagramInput) =>
      workspaceDiagramService.createWorkspaceDiagram(input),
    onSuccess: (data) => {
      // Invalidate all diagram lists
      queryClient.invalidateQueries({ queryKey: workspaceDiagramKeys.lists() });
      // If this is the default diagram, invalidate the default query
      if (data.is_default) {
        queryClient.invalidateQueries({ queryKey: workspaceDiagramKeys.default(data.workspace_id) });
      }
    },
  });
}

/**
 * Update an existing workspace diagram
 */
export function useUpdateWorkspaceDiagram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateWorkspaceDiagramInput }) =>
      workspaceDiagramService.updateWorkspaceDiagram(id, input),
    onSuccess: (data) => {
      // Invalidate the specific diagram
      queryClient.invalidateQueries({ queryKey: workspaceDiagramKeys.detail(data.id) });
      // Invalidate all lists
      queryClient.invalidateQueries({ queryKey: workspaceDiagramKeys.lists() });
      // If the default status changed, invalidate the default query
      if (data.is_default) {
        queryClient.invalidateQueries({ queryKey: workspaceDiagramKeys.default(data.workspace_id) });
      }
    },
  });
}

/**
 * Delete a workspace diagram
 */
export function useDeleteWorkspaceDiagram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workspaceDiagramService.deleteWorkspaceDiagram(id),
    onSuccess: (_, id) => {
      // Invalidate all diagram queries
      queryClient.invalidateQueries({ queryKey: workspaceDiagramKeys.all });
    },
  });
}

/**
 * Set a diagram as the default for its workspace
 */
export function useSetDefaultDiagram() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workspaceDiagramService.setDefaultDiagram(id),
    onSuccess: (data) => {
      // Invalidate all diagram queries for this workspace
      queryClient.invalidateQueries({ queryKey: workspaceDiagramKeys.lists() });
      queryClient.invalidateQueries({ queryKey: workspaceDiagramKeys.default(data.workspace_id) });
      queryClient.invalidateQueries({ queryKey: workspaceDiagramKeys.detail(data.id) });
    },
  });
}
