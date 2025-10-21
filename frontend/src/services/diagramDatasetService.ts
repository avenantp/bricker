/**
 * Diagram Dataset Service
 * Manages the relationship between diagrams and datasets (diagram_datasets table)
 * Handles pending changes and batch saving
 */

import { supabase } from '@/lib/supabase';

export interface DiagramDatasetChange {
  dataset_id: string;
  action: 'add' | 'remove';
  location?: { x: number; y: number };
  is_expanded?: boolean;
}

export interface DiagramDatasetEntry {
  id: string;
  diagram_id: string;
  dataset_id: string;
  location: { x: number; y: number } | null;
  is_expanded: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * Get all datasets in a diagram
 */
export async function getDiagramDatasets(diagramId: string): Promise<DiagramDatasetEntry[]> {
  const { data, error } = await supabase
    .from('diagram_datasets')
    .select('*')
    .eq('diagram_id', diagramId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[DiagramDatasetService] Error fetching diagram datasets:', error);
    throw error;
  }

  return data || [];
}

/**
 * Get dataset IDs in a diagram (lightweight query)
 */
export async function getDiagramDatasetIds(diagramId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('diagram_datasets')
    .select('dataset_id')
    .eq('diagram_id', diagramId);

  if (error) {
    console.error('[DiagramDatasetService] Error fetching diagram dataset IDs:', error);
    throw error;
  }

  return new Set((data || []).map((item) => item.dataset_id));
}

/**
 * Add a dataset to a diagram
 */
export async function addDatasetToDiagram(
  diagramId: string,
  datasetId: string,
  location: { x: number; y: number } | null = null,
  userId?: string
): Promise<DiagramDatasetEntry> {
  const { data, error } = await supabase
    .from('diagram_datasets')
    .insert({
      diagram_id: diagramId,
      dataset_id: datasetId,
      location: location,
      is_expanded: false,
      created_by: userId || null,
    })
    .select()
    .single();

  if (error) {
    console.error('[DiagramDatasetService] Error adding dataset to diagram:', error);
    throw error;
  }

  return data;
}

/**
 * Remove a dataset from a diagram
 */
export async function removeDatasetFromDiagram(
  diagramId: string,
  datasetId: string
): Promise<void> {
  const { error } = await supabase
    .from('diagram_datasets')
    .delete()
    .eq('diagram_id', diagramId)
    .eq('dataset_id', datasetId);

  if (error) {
    console.error('[DiagramDatasetService] Error removing dataset from diagram:', error);
    throw error;
  }
}

/**
 * Update dataset location in diagram
 */
export async function updateDatasetLocation(
  diagramId: string,
  datasetId: string,
  location: { x: number; y: number }
): Promise<void> {
  const { error } = await supabase
    .from('diagram_datasets')
    .update({ location })
    .eq('diagram_id', diagramId)
    .eq('dataset_id', datasetId);

  if (error) {
    console.error('[DiagramDatasetService] Error updating dataset location:', error);
    throw error;
  }
}

/**
 * Update dataset expansion state
 */
export async function updateDatasetExpansion(
  diagramId: string,
  datasetId: string,
  isExpanded: boolean
): Promise<void> {
  const { error } = await supabase
    .from('diagram_datasets')
    .update({ is_expanded: isExpanded })
    .eq('diagram_id', diagramId)
    .eq('dataset_id', datasetId);

  if (error) {
    console.error('[DiagramDatasetService] Error updating dataset expansion:', error);
    throw error;
  }
}

/**
 * Batch save pending changes to diagram_datasets table
 */
export async function savePendingChanges(
  diagramId: string,
  changes: DiagramDatasetChange[],
  userId?: string
): Promise<{ added: number; removed: number; errors: string[] }> {
  const result = {
    added: 0,
    removed: 0,
    errors: [] as string[],
  };

  console.log('[DiagramDatasetService] Saving pending changes:', {
    diagramId,
    changesCount: changes.length,
    changes,
  });

  // Process each change
  for (const change of changes) {
    try {
      if (change.action === 'add') {
        await addDatasetToDiagram(
          diagramId,
          change.dataset_id,
          change.location || null,
          userId
        );
        result.added++;
      } else if (change.action === 'remove') {
        await removeDatasetFromDiagram(diagramId, change.dataset_id);
        result.removed++;
      }
    } catch (error: any) {
      console.error('[DiagramDatasetService] Error processing change:', error);
      result.errors.push(`Failed to ${change.action} dataset ${change.dataset_id}: ${error.message}`);
    }
  }

  console.log('[DiagramDatasetService] Batch save result:', result);

  return result;
}

/**
 * Check if a dataset is in a diagram
 */
export async function isDatasetInDiagram(
  diagramId: string,
  datasetId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('diagram_datasets')
    .select('id')
    .eq('diagram_id', diagramId)
    .eq('dataset_id', datasetId)
    .maybeSingle();

  if (error) {
    console.error('[DiagramDatasetService] Error checking if dataset is in diagram:', error);
    return false;
  }

  return data !== null;
}
