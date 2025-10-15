/**
 * Dataset service for CRUD operations
 * Database-first architecture with Supabase as source of truth
 * Based on technical specifications in docs/prp/001-technical-specifications-refactored.md
 */

import { supabase } from './supabase';
import type {
  Dataset,
  CreateDatasetInput,
  CreateDatasetPayload,
  UpdateDatasetInput,
  UpdateDatasetPayload,
  DatasetFilters,
  BatchDatasetOperationResult,
  DatasetWithPosition,
} from '../types/dataset';
import type { CanvasNode } from '../types/canvas';

/**
 * Create a new dataset in Supabase
 */
export async function createDataset(
  payload: CreateDatasetPayload,
  userId: string
): Promise<Dataset> {
  const now = new Date().toISOString();

  // Prepare dataset object
  const dataset = {
    account_id: payload.account_id,
    workspace_id: payload.workspace_id,
    project_id: payload.project_id,
    name: payload.name,
    fqn: payload.fqn,
    medallion_layer: payload.medallion_layer || null,
    entity_type: payload.entity_type || null,
    entity_subtype: payload.entity_subtype || null,
    materialization_type: payload.materialization_type || null,
    description: payload.description || null,
    metadata: payload.metadata || null,
    ai_confidence_score: null,
    owner_id: payload.owner_id || userId,
    visibility: payload.visibility || 'private',
    is_locked: false,
    has_uncommitted_changes: true, // New dataset is uncommitted
    sync_status: 'not_synced' as const,
    source_control_file_path: null,
    source_control_commit_sha: null,
    last_synced_at: null,
    sync_error_message: null,
    created_by: userId,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('datasets')
    .insert(dataset)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create dataset: ${error.message}`);
  }

  // Log creation in audit_logs
  await logAuditChange('dataset', data.id, 'create', userId, {
    dataset_name: data.name,
    fqn: data.fqn,
  });

  return data;
}

/**
 * Get a dataset by ID
 */
export async function getDataset(datasetId: string): Promise<Dataset | null> {
  const { data, error } = await supabase
    .from('datasets')
    .select('*')
    .eq('id', datasetId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to fetch dataset: ${error.message}`);
  }

  return data;
}

/**
 * Update a dataset in Supabase
 */
export async function updateDataset(
  datasetId: string,
  payload: UpdateDatasetPayload,
  userId: string
): Promise<Dataset> {
  const now = new Date().toISOString();

  // Mark as uncommitted
  const updates = {
    ...payload,
    has_uncommitted_changes: true,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('datasets')
    .update(updates)
    .eq('id', datasetId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update dataset: ${error.message}`);
  }

  // Log update in audit_logs
  await logAuditChange('dataset', datasetId, 'update', userId, {
    changes: payload,
  });

  return data;
}

/**
 * Delete a dataset from Supabase
 */
export async function deleteDataset(
  datasetId: string,
  userId: string
): Promise<void> {
  // Get dataset info before deleting for audit log
  const dataset = await getDataset(datasetId);

  const { error } = await supabase
    .from('datasets')
    .delete()
    .eq('id', datasetId);

  if (error) {
    throw new Error(`Failed to delete dataset: ${error.message}`);
  }

  // Log deletion in audit_logs
  if (dataset) {
    await logAuditChange('dataset', datasetId, 'delete', userId, {
      dataset_name: dataset.name,
      fqn: dataset.fqn,
    });
  }
}

/**
 * Get all datasets for a workspace
 */
export async function getWorkspaceDatasets(
  workspaceId: string,
  filters?: DatasetFilters
): Promise<Dataset[]> {
  let query = supabase
    .from('datasets')
    .select('*')
    .eq('workspace_id', workspaceId);

  // Apply filters
  if (filters?.medallion_layers && filters.medallion_layers.length > 0) {
    query = query.in('medallion_layer', filters.medallion_layers);
  }

  if (filters?.entity_types && filters.entity_types.length > 0) {
    query = query.in('entity_type', filters.entity_types);
  }

  if (filters?.entity_subtypes && filters.entity_subtypes.length > 0) {
    query = query.in('entity_subtype', filters.entity_subtypes);
  }

  if (filters?.min_confidence_score !== undefined) {
    query = query.gte('ai_confidence_score', filters.min_confidence_score);
  }

  if (filters?.sync_status && filters.sync_status.length > 0) {
    query = query.in('sync_status', filters.sync_status);
  }

  if (filters?.show_uncommitted_only) {
    query = query.eq('has_uncommitted_changes', true);
  }

  if (filters?.search_query) {
    const searchLower = filters.search_query.toLowerCase();
    query = query.or(
      `name.ilike.%${searchLower}%,fqn.ilike.%${searchLower}%,description.ilike.%${searchLower}%`
    );
  }

  const { data, error } = await query.order('name');

  if (error) {
    throw new Error(`Failed to fetch workspace datasets: ${error.message}`);
  }

  return data || [];
}

/**
 * Get datasets with canvas positions for a workspace
 */
export async function getWorkspaceDatasetsWithPositions(
  workspaceId: string
): Promise<DatasetWithPosition[]> {
  const { data, error } = await supabase
    .from('workspace_datasets')
    .select(`
      canvas_position,
      datasets!inner(*)
    `)
    .eq('workspace_id', workspaceId);

  if (error) {
    throw new Error(`Failed to fetch workspace datasets: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  // Transform to include position
  return data.map((item: any) => ({
    ...item.datasets,
    position: item.canvas_position || { x: 0, y: 0 },
  }));
}

/**
 * Update canvas position for a dataset in a workspace
 */
export async function updateDatasetPosition(
  workspaceId: string,
  datasetId: string,
  position: { x: number; y: number }
): Promise<void> {
  const { error } = await supabase
    .from('workspace_datasets')
    .update({ canvas_position: position })
    .eq('workspace_id', workspaceId)
    .eq('dataset_id', datasetId); // This references the join table, so dataset_id is correct here

  if (error) {
    throw new Error(`Failed to update dataset position: ${error.message}`);
  }
}

/**
 * Clone a dataset
 */
export async function cloneDataset(
  sourceDatasetId: string,
  newName: string,
  userId: string
): Promise<Dataset> {
  // Get source dataset
  const sourceDataset = await getDataset(sourceDatasetId);
  if (!sourceDataset) {
    throw new Error('Source dataset not found');
  }

  // Create new dataset with copied properties
  const now = new Date().toISOString();

  const newDataset = {
    account_id: sourceDataset.account_id,
    workspace_id: sourceDataset.workspace_id,
    project_id: sourceDataset.project_id,
    name: newName,
    fqn: sourceDataset.fqn.replace(sourceDataset.name, newName),
    medallion_layer: sourceDataset.medallion_layer,
    entity_type: sourceDataset.entity_type,
    entity_subtype: sourceDataset.entity_subtype,
    materialization_type: sourceDataset.materialization_type,
    description: sourceDataset.description
      ? `Copy of ${sourceDataset.description}`
      : null,
    metadata: sourceDataset.metadata ? { ...sourceDataset.metadata } : null,
    ai_confidence_score: sourceDataset.ai_confidence_score,
    owner_id: userId,
    visibility: sourceDataset.visibility,
    is_locked: false,
    has_uncommitted_changes: true,
    sync_status: 'not_synced' as const,
    source_control_file_path: null,
    source_control_commit_sha: null,
    last_synced_at: null,
    sync_error_message: null,
    created_by: userId,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('datasets')
    .insert(newDataset)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to clone dataset: ${error.message}`);
  }

  // Log clone in audit_logs
  await logAuditChange('dataset', data.id, 'create', userId, {
    cloned_from: sourceDatasetId,
    dataset_name: data.name,
  });

  return data;
}

/**
 * Search datasets by name or FQN
 */
export async function searchDatasets(
  workspaceId: string,
  query: string
): Promise<Dataset[]> {
  return getWorkspaceDatasets(workspaceId, { search_query: query });
}

/**
 * Batch delete datasets
 */
export async function batchDeleteDatasets(
  datasetIds: string[],
  userId: string
): Promise<BatchDatasetOperationResult> {
  const result: BatchDatasetOperationResult = {
    successful: [],
    failed: [],
  };

  for (const datasetId of datasetIds) {
    try {
      await deleteDataset(datasetId, userId);
      result.successful.push(datasetId);
    } catch (error: any) {
      result.failed.push({
        dataset_id: datasetId,
        error: error.message,
      });
    }
  }

  return result;
}

/**
 * Convert Dataset to CanvasNode for React Flow
 */
export function datasetToCanvasNode(
  dataset: DatasetWithPosition
): CanvasNode {
  return {
    id: dataset.id,
    type: 'dataNode',
    position: dataset.position,
    data: {
      uuid: dataset.id,
      fqn: dataset.fqn,
      project_id: dataset.project_id,
      name: dataset.name,
      medallion_layer: dataset.medallion_layer,
      entity_type: dataset.entity_type,
      entity_subtype: dataset.entity_subtype,
      materialization_type: dataset.materialization_type,
      description: dataset.description,
      metadata: dataset.metadata,
      ai_confidence_score: dataset.ai_confidence_score,
      git_commit_hash: dataset.source_control_commit_sha,
      created_at: dataset.created_at,
      updated_at: dataset.updated_at,
    },
  };
}

/**
 * Get uncommitted datasets count for a workspace
 */
export async function getUncommittedDatasetsCount(
  workspaceId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('datasets')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId)
    .eq('has_uncommitted_changes', true);

  if (error) {
    throw new Error(`Failed to count uncommitted datasets: ${error.message}`);
  }

  return count || 0;
}

/**
 * Mark dataset as synced
 */
export async function markDatasetAsSynced(
  datasetId: string,
  commitSha: string,
  filePath: string
): Promise<void> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('datasets')
    .update({
      has_uncommitted_changes: false,
      sync_status: 'synced',
      source_control_commit_sha: commitSha,
      source_control_file_path: filePath,
      last_synced_at: now,
      sync_error_message: null,
    })
    .eq('id', datasetId);

  if (error) {
    throw new Error(`Failed to mark dataset as synced: ${error.message}`);
  }
}

/**
 * Mark dataset as having sync error
 */
export async function markDatasetSyncError(
  datasetId: string,
  errorMessage: string
): Promise<void> {
  const { error } = await supabase
    .from('datasets')
    .update({
      sync_status: 'error',
      sync_error_message: errorMessage,
    })
    .eq('id', datasetId);

  if (error) {
    throw new Error(`Failed to mark dataset sync error: ${error.message}`);
  }
}

/**
 * Log audit change to audit_logs table
 */
async function logAuditChange(
  entityType: 'dataset' | 'column' | 'lineage',
  entityId: string,
  action: string,
  userId: string,
  changes: Record<string, any>
): Promise<void> {
  try {
    // Get user's company_id
    const { data: user } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', userId)
      .single();

    const companyId = user?.company_id;

    await supabase.from('audit_logs').insert({
      company_id: companyId,
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
      action: action,
      changes: changes,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    // Log error but don't fail the operation
    console.error('Failed to log audit change:', error);
  }
}
