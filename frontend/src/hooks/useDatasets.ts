/**
 * React Query hooks for Dataset operations
 * Provides optimized data fetching, caching, and real-time updates for datasets
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import type {
  Dataset,
  CreateDatasetPayload,
  UpdateDatasetPayload,
} from '@/types/dataset';

// Query keys for React Query cache management
export const datasetKeys = {
  all: ['datasets'] as const,
  lists: () => [...datasetKeys.all, 'list'] as const,
  list: (filters: { workspaceId?: string; projectId?: string }) =>
    [...datasetKeys.lists(), filters] as const,
  details: () => [...datasetKeys.all, 'detail'] as const,
  detail: (id: string) => [...datasetKeys.details(), id] as const,
  uncommitted: (workspaceId: string) =>
    [...datasetKeys.all, 'uncommitted', workspaceId] as const,
  diagramDatasets: (diagramId: string) =>
    [...datasetKeys.all, 'diagram', diagramId] as const,
};

/**
 * Fetch all datasets for a workspace
 * Queries through workspace_datasets junction table
 */
export function useDatasets(workspaceId: string | undefined) {
  return useQuery({
    queryKey: datasetKeys.list({ workspaceId }),
    queryFn: async () => {
      if (!workspaceId) {
        console.log('[useDatasets] No workspaceId provided');
        return [];
      }

      console.log('[useDatasets] Fetching datasets for workspace:', workspaceId);

      const { data, error } = await supabase
        .from('workspace_datasets')
        .select(`
          dataset_id,
          datasets (
            *,
            connections!inner(medallion_layer)
          )
        `)
        .eq('workspace_id', workspaceId);

      console.log('[useDatasets] Query result:', {
        workspaceId,
        rawData: data,
        error,
        dataCount: data?.length || 0
      });

      if (error) {
        console.error('[useDatasets] Query error:', error);
        throw error;
      }

      // Extract datasets from the junction table response and flatten connection data
      const datasets = (data || [])
        .map((item: any) => {
          if (!item.datasets) return null;
          // Flatten the connection medallion_layer into the dataset object
          return {
            ...item.datasets,
            medallion_layer: item.datasets.connections?.medallion_layer || null,
            connections: undefined, // Remove the nested connection object
          };
        })
        .filter((dataset: any) => dataset !== null) as Dataset[];

      console.log('[useDatasets] Extracted datasets:', {
        workspaceId,
        datasetsCount: datasets.length,
        datasets: datasets.map(d => ({ id: d.id, name: d.name, medallion_layer: d.medallion_layer }))
      });

      return datasets;
    },
    enabled: !!workspaceId,
  });
}

/**
 * Fetch datasets for a specific project
 * Queries through project → workspaces → workspace_datasets → datasets
 */
export function useProjectDatasets(projectId: string | undefined) {
  return useQuery({
    queryKey: datasetKeys.list({ projectId }),
    queryFn: async () => {
      if (!projectId) return [];

      // Step 1: Get all workspaces for this project
      const { data: workspaces, error: workspaceError } = await supabase
        .from('workspaces')
        .select('id')
        .eq('project_id', projectId);

      if (workspaceError) throw workspaceError;

      const workspaceIds = workspaces?.map((w) => w.id) || [];
      if (workspaceIds.length === 0) return [];

      // Step 2: Get all datasets in these workspaces through workspace_datasets
      const { data, error } = await supabase
        .from('workspace_datasets')
        .select(`
          dataset_id,
          datasets (
            *,
            connections!inner(medallion_layer)
          )
        `)
        .in('workspace_id', workspaceIds);

      if (error) throw error;

      // Step 3: Extract unique datasets (same dataset may be in multiple workspaces) and flatten connection data
      const datasetsMap = new Map<string, Dataset>();
      data?.forEach((wd: any) => {
        if (wd.datasets && !datasetsMap.has(wd.datasets.id)) {
          // Flatten the connection medallion_layer into the dataset object
          const dataset = {
            ...wd.datasets,
            medallion_layer: wd.datasets.connections?.medallion_layer || null,
            connections: undefined, // Remove the nested connection object
          };
          datasetsMap.set(dataset.id, dataset);
        }
      });

      return Array.from(datasetsMap.values()) as Dataset[];
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch a single dataset by ID
 * NOTE: Joins with connections to populate medallion_layer
 */
export function useDataset(datasetId: string | undefined) {
  return useQuery({
    queryKey: datasetKeys.detail(datasetId || ''),
    queryFn: async () => {
      if (!datasetId) return null;

      const { data, error } = await supabase
        .from('datasets')
        .select(`
          *,
          connections!inner(medallion_layer)
        `)
        .eq('id', datasetId)
        .single();

      if (error) throw error;

      // Flatten the connection medallion_layer into the dataset object
      return {
        ...data,
        medallion_layer: data.connections?.medallion_layer || null,
        connections: undefined, // Remove the nested connection object
      } as Dataset;
    },
    enabled: !!datasetId,
  });
}

/**
 * Fetch uncommitted datasets for a workspace
 * Queries through workspace_datasets junction table
 */
export function useUncommittedDatasets(workspaceId: string | undefined) {
  return useQuery({
    queryKey: datasetKeys.uncommitted(workspaceId || ''),
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from('workspace_datasets')
        .select(`
          dataset_id,
          datasets!inner (
            *,
            connections!inner(medallion_layer)
          )
        `)
        .eq('workspace_id', workspaceId)
        .eq('datasets.has_uncommitted_changes', true);

      if (error) throw error;

      // Extract datasets from the junction table response and flatten connection data
      const datasets = (data || [])
        .map((item: any) => {
          if (!item.datasets) return null;
          // Flatten the connection medallion_layer into the dataset object
          return {
            ...item.datasets,
            medallion_layer: item.datasets.connections?.medallion_layer || null,
            connections: undefined, // Remove the nested connection object
          };
        })
        .filter((dataset: any) => dataset !== null) as Dataset[];

      return datasets;
    },
    enabled: !!workspaceId,
    refetchInterval: 30000, // Poll every 30 seconds for uncommitted changes
  });
}

/**
 * Create a new dataset
 */
export function useCreateDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateDatasetPayload) => {
      const { data, error } = await supabase
        .from('datasets')
        .insert({
          workspace_id: payload.workspace_id,
          project_id: payload.project_id,
          name: payload.name,
          dataset_type: payload.dataset_type,
          description: payload.description,
          schema_name: payload.schema_name,
          table_name: payload.table_name,
          catalog_name: payload.catalog_name,
          has_uncommitted_changes: true, // New datasets are uncommitted
          sync_status: 'not_synced',
        })
        .select()
        .single();

      if (error) throw error;
      return data as Dataset;
    },
    onSuccess: (data, variables) => {
      // Invalidate workspace datasets list
      queryClient.invalidateQueries({
        queryKey: datasetKeys.list({ workspaceId: variables.workspace_id }),
      });
      // Invalidate project datasets list if project_id provided
      if (variables.project_id) {
        queryClient.invalidateQueries({
          queryKey: datasetKeys.list({ projectId: variables.project_id }),
        });
      }
      // Invalidate uncommitted datasets
      queryClient.invalidateQueries({
        queryKey: datasetKeys.uncommitted(variables.workspace_id),
      });
    },
  });
}

/**
 * Update an existing dataset
 */
export function useUpdateDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      datasetId,
      updates,
    }: {
      datasetId: string;
      updates: UpdateDatasetPayload;
    }) => {
      const { data, error } = await supabase
        .from('datasets')
        .update({
          ...updates,
          has_uncommitted_changes: true, // Mark as uncommitted
          updated_at: new Date().toISOString(),
        })
        .eq('id', datasetId)
        .select()
        .single();

      if (error) throw error;
      return data as Dataset;
    },
    onSuccess: (data) => {
      // Invalidate specific dataset
      queryClient.invalidateQueries({
        queryKey: datasetKeys.detail(data.id),
      });
      // Invalidate workspace datasets list
      queryClient.invalidateQueries({
        queryKey: datasetKeys.list({ workspaceId: data.workspace_id }),
      });
      // Invalidate uncommitted datasets
      queryClient.invalidateQueries({
        queryKey: datasetKeys.uncommitted(data.workspace_id),
      });
    },
  });
}

/**
 * Delete a dataset
 */
export function useDeleteDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (datasetId: string) => {
      // First get the dataset to know its workspace_id
      const { data: dataset } = await supabase
        .from('datasets')
        .select('workspace_id, project_id')
        .eq('id', datasetId)
        .single();

      const { error } = await supabase.from('datasets').delete().eq('id', datasetId);

      if (error) throw error;
      return { datasetId, workspaceId: dataset?.workspace_id, projectId: dataset?.project_id };
    },
    onSuccess: ({ datasetId, workspaceId, projectId }) => {
      // Remove from cache
      queryClient.removeQueries({
        queryKey: datasetKeys.detail(datasetId),
      });
      // Invalidate workspace datasets list
      if (workspaceId) {
        queryClient.invalidateQueries({
          queryKey: datasetKeys.list({ workspaceId }),
        });
        queryClient.invalidateQueries({
          queryKey: datasetKeys.uncommitted(workspaceId),
        });
      }
      // Invalidate project datasets list
      if (projectId) {
        queryClient.invalidateQueries({
          queryKey: datasetKeys.list({ projectId }),
        });
      }
    },
  });
}

/**
 * Mark dataset as synced (after successful commit to Git)
 */
export function useMarkDatasetSynced() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      datasetId,
      commitSha,
      filePath,
    }: {
      datasetId: string;
      commitSha: string;
      filePath: string;
    }) => {
      const { data, error } = await supabase
        .from('datasets')
        .update({
          has_uncommitted_changes: false,
          sync_status: 'synced',
          github_commit_sha: commitSha,
          github_file_path: filePath,
          last_synced_at: new Date().toISOString(),
          sync_error_message: null,
        })
        .eq('id', datasetId)
        .select()
        .single();

      if (error) throw error;
      return data as Dataset;
    },
    onSuccess: (data) => {
      // Update cache
      queryClient.setQueryData(datasetKeys.detail(data.id), data);
      // Invalidate lists
      queryClient.invalidateQueries({
        queryKey: datasetKeys.list({ workspaceId: data.workspace_id }),
      });
      queryClient.invalidateQueries({
        queryKey: datasetKeys.uncommitted(data.workspace_id),
      });
    },
  });
}

/**
 * Fetch dataset IDs that are in a specific diagram
 * Returns a Set of dataset IDs for efficient lookup
 */
export function useDiagramDatasets(diagramId: string | undefined) {
  return useQuery({
    queryKey: datasetKeys.diagramDatasets(diagramId || ''),
    queryFn: async () => {
      if (!diagramId) return new Set<string>();

      const { data, error } = await supabase
        .from('diagram_datasets')
        .select('dataset_id')
        .eq('diagram_id', diagramId);

      if (error) throw error;
      return new Set((data || []).map((item) => item.dataset_id)) as Set<string>;
    },
    enabled: !!diagramId,
  });
}

/**
 * Add dataset to a project (DEPRECATED)
 * @deprecated Datasets belong to workspaces, not directly to projects.
 * Use workspace-level hooks instead (e.g., add dataset when creating/updating dataset with workspace_id)
 */
export function useAddDatasetToProject() {
  return useMutation({
    mutationFn: async () => {
      throw new Error(
        'useAddDatasetToProject is deprecated. Datasets belong to workspaces, not directly to projects. ' +
        'Datasets are added to projects through their workspace membership.'
      );
    },
  });
}

/**
 * Remove dataset from a project (DEPRECATED)
 * @deprecated Datasets belong to workspaces, not directly to projects.
 * Use workspace-level hooks instead
 */
export function useRemoveDatasetFromProject() {
  return useMutation({
    mutationFn: async () => {
      throw new Error(
        'useRemoveDatasetFromProject is deprecated. Datasets belong to workspaces, not directly to projects. ' +
        'Remove datasets from their workspace instead.'
      );
    },
  });
}
