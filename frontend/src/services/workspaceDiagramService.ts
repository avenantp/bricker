/**
 * Workspace Diagram Service
 * Handles all API interactions for workspace diagrams
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
    .from('workspace_diagrams')
    .select('*')
    .is('deleted_at', null)
    .order('is_default', { ascending: false })
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

  if (filters.is_default !== undefined) {
    query = query.eq('is_default', filters.is_default);
  }

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
    .from('workspace_diagrams')
    .select(`
      *,
      workspaces!inner(
        name
      )
    `)
    .is('deleted_at', null)
    .order('is_default', { ascending: false })
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

  if (filters.is_default !== undefined) {
    query = query.eq('is_default', filters.is_default);
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
    .from('workspace_diagrams')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error) {
    console.error('[WorkspaceDiagramService] Error fetching diagram:', error);
    throw error;
  }

  return data as WorkspaceDiagram;
}

/**
 * Get the default diagram for a workspace
 */
export async function getDefaultWorkspaceDiagram(workspaceId: string) {
  const { data, error } = await supabase
    .from('workspace_diagrams')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('is_default', true)
    .is('deleted_at', null)
    .single();

  if (error) {
    // If no default found, get the first diagram
    if (error.code === 'PGRST116') {
      const { data: diagrams, error: listError } = await supabase
        .from('workspace_diagrams')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('deleted_at', null)
        .order('created_at', { ascending: true })
        .limit(1);

      if (listError) {
        console.error('[WorkspaceDiagramService] Error fetching first diagram:', listError);
        throw listError;
      }

      return diagrams?.[0] as WorkspaceDiagram | null;
    }

    console.error('[WorkspaceDiagramService] Error fetching default diagram:', error);
    throw error;
  }

  return data as WorkspaceDiagram;
}

/**
 * Create a new workspace diagram
 */
export async function createWorkspaceDiagram(input: CreateWorkspaceDiagramInput) {
  const { data, error } = await supabase
    .from('workspace_diagrams')
    .insert({
      workspace_id: input.workspace_id,
      name: input.name,
      description: input.description || null,
      is_default: input.is_default || false,
      diagram_type: input.diagram_type || 'dataset',
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
    .from('workspace_diagrams')
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
 * Soft delete a workspace diagram
 */
export async function deleteWorkspaceDiagram(id: string) {
  const { error } = await supabase
    .from('workspace_diagrams')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('[WorkspaceDiagramService] Error deleting diagram:', error);
    throw error;
  }
}

/**
 * Set a diagram as the default for its workspace
 */
export async function setDefaultDiagram(id: string) {
  // The database trigger will automatically unset other defaults
  return updateWorkspaceDiagram(id, { is_default: true });
}

/**
 * Count datasets in a diagram
 */
export async function countDatasetsInDiagram(diagramId: string) {
  const { count, error } = await supabase
    .from('datasets')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_diagram_id', diagramId)
    .is('deleted_at', null);

  if (error) {
    console.error('[WorkspaceDiagramService] Error counting datasets:', error);
    throw error;
  }

  return count || 0;
}
