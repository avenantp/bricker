/**
 * Workspace Diagram Service
 * Handles all API interactions for workspace diagrams
 *
 * UPDATED: Now uses the 'diagrams' table instead of deprecated 'workspace_diagrams' table
 * Diagrams table provides better structure with diagram_datasets mapping
 */

import { supabase } from '@/lib/supabase';
import type {
  WorkspaceDiagram,
  WorkspaceDiagramWithDetails,
  CreateWorkspaceDiagramInput,
  UpdateWorkspaceDiagramInput,
  WorkspaceDiagramFilters,
} from '@/types/workspaceDiagram';

/**
 * Fetch workspace diagrams with optional filters
 */
export async function getWorkspaceDiagrams(filters: WorkspaceDiagramFilters = {}) {
  let query = supabase
    .from('diagrams')
    .select('*')
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.workspace_id) {
    query = query.eq('workspace_id', filters.workspace_id);
  }

  if (filters.account_id) {
    query = query.eq('account_id', filters.account_id);
  }

  if (filters.diagram_type) {
    query = query.eq('diagram_type', filters.diagram_type);
  }

  // Note: is_default is not in diagrams table, we can add it if needed
  // For now, we'll skip this filter
  // if (filters.is_default !== undefined) {
  //   query = query.eq('is_default', filters.is_default);
  // }

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[WorkspaceDiagramService] Error fetching diagrams:', error);
    throw error;
  }

  return data as WorkspaceDiagram[];
}

/**
 * Fetch workspace diagrams with additional details
 */
export async function getWorkspaceDiagramsWithDetails(filters: WorkspaceDiagramFilters = {}) {
  let query = supabase
    .from('diagrams')
    .select(`
      *,
      workspaces!inner(
        name
      )
    `)
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.workspace_id) {
    query = query.eq('workspace_id', filters.workspace_id);
  }

  if (filters.account_id) {
    query = query.eq('account_id', filters.account_id);
  }

  if (filters.diagram_type) {
    query = query.eq('diagram_type', filters.diagram_type);
  }

  if (filters.search) {
    query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[WorkspaceDiagramService] Error fetching diagrams with details:', error);
    throw error;
  }

  // Transform the response to flatten workspace name
  const transformed = data?.map((diagram: any) => ({
    ...diagram,
    workspace_name: diagram.workspaces?.name,
    workspaces: undefined, // Remove nested object
  })) as WorkspaceDiagramWithDetails[];

  return transformed;
}

/**
 * Fetch a single workspace diagram by ID
 */
export async function getWorkspaceDiagram(id: string) {
  const { data, error } = await supabase
    .from('diagrams')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('[WorkspaceDiagramService] Error fetching diagram:', error);
    throw error;
  }

  return data as WorkspaceDiagram;
}

/**
 * Get the first/default diagram for a workspace
 * Note: diagrams table doesn't have is_default field, so we just get the first one
 */
export async function getDefaultWorkspaceDiagram(workspaceId: string) {
  const { data, error } = await supabase
    .from('diagrams')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true })
    .limit(1);

  if (error) {
    console.error('[WorkspaceDiagramService] Error fetching default diagram:', error);
    throw error;
  }

  return data?.[0] as WorkspaceDiagram | null;
}

/**
 * Create a new workspace diagram
 */
export async function createWorkspaceDiagram(input: CreateWorkspaceDiagramInput) {
  const { data, error } = await supabase
    .from('diagrams')
    .insert({
      workspace_id: input.workspace_id,
      account_id: input.account_id, // Required in diagrams table
      name: input.name,
      description: input.description || null,
      diagram_type: input.diagram_type || 'dataset',
      // Note: is_default is not in diagrams table
    })
    .select()
    .single();

  if (error) {
    console.error('[WorkspaceDiagramService] Error creating diagram:', error);
    throw error;
  }

  return data as WorkspaceDiagram;
}

/**
 * Update an existing workspace diagram
 */
export async function updateWorkspaceDiagram(id: string, input: UpdateWorkspaceDiagramInput) {
  const { data, error } = await supabase
    .from('diagrams')
    .update(input)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[WorkspaceDiagramService] Error updating diagram:', error);
    throw error;
  }

  return data as WorkspaceDiagram;
}

/**
 * Delete a workspace diagram (hard delete)
 */
export async function deleteWorkspaceDiagram(id: string) {
  const { error } = await supabase
    .from('diagrams')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[WorkspaceDiagramService] Error deleting diagram:', error);
    throw error;
  }
}

/**
 * Set a diagram as the default for its workspace
 * Note: diagrams table doesn't have is_default field
 * This function is kept for API compatibility but doesn't do anything
 * @deprecated diagrams table doesn't support default flag
 */
export async function setDefaultDiagram(id: string) {
  console.warn('[WorkspaceDiagramService] setDefaultDiagram is deprecated - diagrams table does not support is_default field');
  // Just return the diagram unchanged
  return getWorkspaceDiagram(id);
}

/**
 * Count datasets in a diagram
 * Now uses diagram_datasets mapping table
 */
export async function countDatasetsInDiagram(diagramId: string) {
  const { count, error } = await supabase
    .from('diagram_datasets')
    .select('*', { count: 'exact', head: true })
    .eq('diagram_id', diagramId);

  if (error) {
    console.error('[WorkspaceDiagramService] Error counting datasets:', error);
    throw error;
  }

  return count || 0;
}

/**
 * Get all dataset IDs in a diagram
 * Returns a set of dataset IDs that are in the specified diagram
 */
export async function getDiagramDatasetIds(diagramId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('diagram_datasets')
    .select('dataset_id')
    .eq('diagram_id', diagramId);

  if (error) {
    console.error('[WorkspaceDiagramService] Error fetching diagram datasets:', error);
    throw error;
  }

  return new Set((data || []).map((item) => item.dataset_id));
}

/**
 * Add a dataset to a diagram
 */
export async function addDatasetToDiagram(diagramId: string, datasetId: string, userId?: string) {
  const { data, error } = await supabase
    .from('diagram_datasets')
    .insert({
      diagram_id: diagramId,
      dataset_id: datasetId,
      created_by: userId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[WorkspaceDiagramService] Error adding dataset to diagram:', error);
    throw error;
  }

  return data;
}

/**
 * Remove a dataset from a diagram
 */
export async function removeDatasetFromDiagram(diagramId: string, datasetId: string) {
  const { error } = await supabase
    .from('diagram_datasets')
    .delete()
    .eq('diagram_id', diagramId)
    .eq('dataset_id', datasetId);

  if (error) {
    console.error('[WorkspaceDiagramService] Error removing dataset from diagram:', error);
    throw error;
  }
}
