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
};

/**
 * Fetch all datasets for a workspace
 */
export function useDatasets(workspaceId: string | undefined) {
  return useQuery({
    queryKey: datasetKeys.list({ workspaceId }),
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Dataset[];
    },
    enabled: !!workspaceId,
  });
}

/**
 * Fetch datasets for a specific project
 */
export function useProjectDatasets(projectId: string | undefined) {
  return useQuery({
    queryKey: datasetKeys.list({ projectId }),
    queryFn: async () => {
      if (!projectId) return [];

      // Query through project_datasets mapping table
      const { data, error } = await supabase
        .from('project_datasets')
        .select(`
          dataset_id,
          datasets (*)
        `)
        .eq('project_id', projectId);

      if (error) throw error;

      // Extract datasets from the join
      return (data?.map((pd: any) => pd.datasets).filter(Boolean) || []) as Dataset[];
    },
    enabled: !!projectId,
  });
}

/**
 * Fetch a single dataset by ID
 */
export function useDataset(datasetId: string | undefined) {
  return useQuery({
    queryKey: datasetKeys.detail(datasetId || ''),
    queryFn: async () => {
      if (!datasetId) return null;

      const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .eq('id', datasetId)
        .single();

      if (error) throw error;
      return data as Dataset;
    },
    enabled: !!datasetId,
  });
}

/**
 * Fetch uncommitted datasets for a workspace
 */
export function useUncommittedDatasets(workspaceId: string | undefined) {
  return useQuery({
    queryKey: datasetKeys.uncommitted(workspaceId || ''),
    queryFn: async () => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from('datasets')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('has_uncommitted_changes', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return data as Dataset[];
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
 * Add dataset to a project (via mapping table)
 */
export function useAddDatasetToProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      datasetId,
    }: {
      projectId: string;
      datasetId: string;
    }) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      const { error } = await supabase.from('project_datasets').insert({
        project_id: projectId,
        dataset_id: datasetId,
        added_by: user.user.id,
      });

      if (error) throw error;
      return { projectId, datasetId };
    },
    onSuccess: ({ projectId }) => {
      // Invalidate project datasets list
      queryClient.invalidateQueries({
        queryKey: datasetKeys.list({ projectId }),
      });
    },
  });
}

/**
 * Remove dataset from a project (via mapping table)
 */
export function useRemoveDatasetFromProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      projectId,
      datasetId,
    }: {
      projectId: string;
      datasetId: string;
    }) => {
      const { error } = await supabase
        .from('project_datasets')
        .delete()
        .eq('project_id', projectId)
        .eq('dataset_id', datasetId);

      if (error) throw error;
      return { projectId, datasetId };
    },
    onSuccess: ({ projectId }) => {
      // Invalidate project datasets list
      queryClient.invalidateQueries({
        queryKey: datasetKeys.list({ projectId }),
      });
    },
  });
}
