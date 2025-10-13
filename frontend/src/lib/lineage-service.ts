/**
 * Lineage service for CRUD operations
 * Handles column-level data lineage tracking
 * Based on technical specifications in docs/prp/001-technical-specifications-refactored.md
 */

import { supabase } from './supabase';
import type {
  Lineage,
  CreateLineagePayload,
  UpdateLineagePayload,
  LineageWithDetails,
  ColumnLineageSummary,
  DatasetLineageSummary,
  BatchLineageOperationResult,
} from '../types/lineage';

/**
 * Create a new lineage relationship
 */
export async function createLineage(
  payload: CreateLineagePayload,
  userId: string
): Promise<Lineage> {
  const now = new Date().toISOString();

  const lineage = {
    workspace_id: payload.workspace_id,
    downstream_dataset_id: payload.downstream_dataset_id,
    downstream_column_id: payload.downstream_column_id,
    upstream_dataset_id: payload.upstream_dataset_id,
    upstream_column_id: payload.upstream_column_id,
    mapping_type: payload.mapping_type,
    transformation_expression: payload.transformation_expression || null,
    lineage_type: payload.lineage_type || 'direct',
    created_at: now,
  };

  const { data, error } = await supabase
    .from('lineage')
    .insert(lineage)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create lineage: ${error.message}`);
  }

  // Mark downstream dataset as uncommitted
  await markDatasetAsUncommitted(payload.downstream_dataset_id);

  // Log creation in audit_logs
  await logAuditChange('lineage', data.lineage_id, 'create', userId, {
    downstream_dataset_id: payload.downstream_dataset_id,
    upstream_dataset_id: payload.upstream_dataset_id,
    mapping_type: payload.mapping_type,
  });

  return data;
}

/**
 * Get a lineage by ID
 */
export async function getLineage(lineageId: string): Promise<Lineage | null> {
  const { data, error } = await supabase
    .from('lineage')
    .select('*')
    .eq('lineage_id', lineageId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch lineage: ${error.message}`);
  }

  return data;
}

/**
 * Get lineage with full details (joined with datasets and columns)
 */
export async function getLineageWithDetails(
  lineageId: string
): Promise<LineageWithDetails | null> {
  const { data, error } = await supabase
    .from('lineage')
    .select(`
      *,
      downstream_dataset:datasets!downstream_dataset_id(
        name,
        fqn
      ),
      downstream_column:columns!downstream_column_id(
        name
      ),
      upstream_dataset:datasets!upstream_dataset_id(
        name,
        fqn
      ),
      upstream_column:columns!upstream_column_id(
        name
      )
    `)
    .eq('lineage_id', lineageId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch lineage with details: ${error.message}`);
  }

  // Transform to LineageWithDetails
  const lineage = data as any;
  return {
    ...lineage,
    downstream_dataset_name: lineage.downstream_dataset.name,
    downstream_dataset_fqn: lineage.downstream_dataset.fqn,
    downstream_column_name: lineage.downstream_column.name,
    upstream_dataset_name: lineage.upstream_dataset.name,
    upstream_dataset_fqn: lineage.upstream_dataset.fqn,
    upstream_column_name: lineage.upstream_column.name,
  };
}

/**
 * Update a lineage relationship
 */
export async function updateLineage(
  lineageId: string,
  payload: UpdateLineagePayload,
  userId: string
): Promise<Lineage> {
  const { data, error } = await supabase
    .from('lineage')
    .update(payload)
    .eq('lineage_id', lineageId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update lineage: ${error.message}`);
  }

  // Mark downstream dataset as uncommitted
  await markDatasetAsUncommitted(data.downstream_dataset_id);

  // Log update in audit_logs
  await logAuditChange('lineage', lineageId, 'update', userId, {
    changes: payload,
  });

  return data;
}

/**
 * Delete a lineage relationship
 */
export async function deleteLineage(
  lineageId: string,
  userId: string
): Promise<void> {
  // Get lineage info before deleting
  const lineage = await getLineage(lineageId);
  if (!lineage) {
    throw new Error('Lineage not found');
  }

  const { error } = await supabase
    .from('lineage')
    .delete()
    .eq('lineage_id', lineageId);

  if (error) {
    throw new Error(`Failed to delete lineage: ${error.message}`);
  }

  // Mark downstream dataset as uncommitted
  await markDatasetAsUncommitted(lineage.downstream_dataset_id);

  // Log deletion in audit_logs
  await logAuditChange('lineage', lineageId, 'delete', userId, {
    downstream_dataset_id: lineage.downstream_dataset_id,
    upstream_dataset_id: lineage.upstream_dataset_id,
  });
}

/**
 * Get all lineage for a column (both upstream and downstream)
 */
export async function getColumnLineage(
  columnId: string
): Promise<ColumnLineageSummary> {
  // Get column and dataset info
  const { data: column } = await supabase
    .from('columns')
    .select(`
      column_id,
      name,
      dataset_id,
      datasets!inner(
        name
      )
    `)
    .eq('column_id', columnId)
    .single();

  if (!column) {
    throw new Error('Column not found');
  }

  // Get upstream lineages (sources)
  const { data: upstreamData, error: upstreamError } = await supabase
    .from('lineage')
    .select(`
      *,
      upstream_dataset:datasets!upstream_dataset_id(
        name,
        fqn
      ),
      upstream_column:columns!upstream_column_id(
        name
      ),
      downstream_dataset:datasets!downstream_dataset_id(
        name,
        fqn
      ),
      downstream_column:columns!downstream_column_id(
        name
      )
    `)
    .eq('downstream_column_id', columnId);

  if (upstreamError) {
    throw new Error(`Failed to fetch upstream lineage: ${upstreamError.message}`);
  }

  // Get downstream lineages (targets)
  const { data: downstreamData, error: downstreamError } = await supabase
    .from('lineage')
    .select(`
      *,
      upstream_dataset:datasets!upstream_dataset_id(
        name,
        fqn
      ),
      upstream_column:columns!upstream_column_id(
        name
      ),
      downstream_dataset:datasets!downstream_dataset_id(
        name,
        fqn
      ),
      downstream_column:columns!downstream_column_id(
        name
      )
    `)
    .eq('upstream_column_id', columnId);

  if (downstreamError) {
    throw new Error(`Failed to fetch downstream lineage: ${downstreamError.message}`);
  }

  // Transform to LineageWithDetails
  const transformLineage = (lineage: any): LineageWithDetails => ({
    ...lineage,
    downstream_dataset_name: lineage.downstream_dataset.name,
    downstream_dataset_fqn: lineage.downstream_dataset.fqn,
    downstream_column_name: lineage.downstream_column.name,
    upstream_dataset_name: lineage.upstream_dataset.name,
    upstream_dataset_fqn: lineage.upstream_dataset.fqn,
    upstream_column_name: lineage.upstream_column.name,
  });

  return {
    column_id: column.column_id,
    column_name: column.name,
    dataset_id: column.dataset_id,
    dataset_name: (column as any).datasets.name,
    upstream_lineages: (upstreamData || []).map(transformLineage),
    downstream_lineages: (downstreamData || []).map(transformLineage),
  };
}

/**
 * Get all lineage for a dataset
 */
export async function getDatasetLineage(
  datasetId: string
): Promise<DatasetLineageSummary> {
  // Get dataset info
  const { data: dataset } = await supabase
    .from('datasets')
    .select('dataset_id, name, fqn')
    .eq('dataset_id', datasetId)
    .single();

  if (!dataset) {
    throw new Error('Dataset not found');
  }

  // Get all columns in dataset
  const { data: columns } = await supabase
    .from('columns')
    .select('column_id')
    .eq('dataset_id', datasetId);

  if (!columns || columns.length === 0) {
    return {
      dataset_id: dataset.dataset_id,
      dataset_name: dataset.name,
      dataset_fqn: dataset.fqn,
      upstream_datasets: [],
      downstream_datasets: [],
    };
  }

  const columnIds = columns.map((c) => c.column_id);

  // Get upstream datasets
  const { data: upstreamLineages } = await supabase
    .from('lineage')
    .select(`
      upstream_dataset_id,
      datasets!upstream_dataset_id(
        name,
        fqn
      )
    `)
    .in('downstream_column_id', columnIds);

  // Get downstream datasets
  const { data: downstreamLineages } = await supabase
    .from('lineage')
    .select(`
      downstream_dataset_id,
      datasets!downstream_dataset_id(
        name,
        fqn
      )
    `)
    .in('upstream_column_id', columnIds);

  // Aggregate by dataset
  const upstreamMap = new Map<string, any>();
  (upstreamLineages || []).forEach((lineage: any) => {
    const id = lineage.upstream_dataset_id;
    if (!upstreamMap.has(id)) {
      upstreamMap.set(id, {
        dataset_id: id,
        dataset_name: lineage.datasets.name,
        dataset_fqn: lineage.datasets.fqn,
        column_count: 0,
      });
    }
    upstreamMap.get(id).column_count++;
  });

  const downstreamMap = new Map<string, any>();
  (downstreamLineages || []).forEach((lineage: any) => {
    const id = lineage.downstream_dataset_id;
    if (!downstreamMap.has(id)) {
      downstreamMap.set(id, {
        dataset_id: id,
        dataset_name: lineage.datasets.name,
        dataset_fqn: lineage.datasets.fqn,
        column_count: 0,
      });
    }
    downstreamMap.get(id).column_count++;
  });

  return {
    dataset_id: dataset.dataset_id,
    dataset_name: dataset.name,
    dataset_fqn: dataset.fqn,
    upstream_datasets: Array.from(upstreamMap.values()),
    downstream_datasets: Array.from(downstreamMap.values()),
  };
}

/**
 * Get all lineage in a workspace
 */
export async function getWorkspaceLineage(
  workspaceId: string
): Promise<LineageWithDetails[]> {
  const { data, error } = await supabase
    .from('lineage')
    .select(`
      *,
      downstream_dataset:datasets!downstream_dataset_id(
        name,
        fqn
      ),
      downstream_column:columns!downstream_column_id(
        name
      ),
      upstream_dataset:datasets!upstream_dataset_id(
        name,
        fqn
      ),
      upstream_column:columns!upstream_column_id(
        name
      )
    `)
    .eq('workspace_id', workspaceId);

  if (error) {
    throw new Error(`Failed to fetch workspace lineage: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  // Transform to LineageWithDetails
  return data.map((lineage: any) => ({
    ...lineage,
    downstream_dataset_name: lineage.downstream_dataset.name,
    downstream_dataset_fqn: lineage.downstream_dataset.fqn,
    downstream_column_name: lineage.downstream_column.name,
    upstream_dataset_name: lineage.upstream_dataset.name,
    upstream_dataset_fqn: lineage.upstream_dataset.fqn,
    upstream_column_name: lineage.upstream_column.name,
  }));
}

/**
 * Batch delete lineages
 */
export async function batchDeleteLineages(
  lineageIds: string[],
  userId: string
): Promise<BatchLineageOperationResult> {
  const result: BatchLineageOperationResult = {
    successful: [],
    failed: [],
  };

  for (const lineageId of lineageIds) {
    try {
      await deleteLineage(lineageId, userId);
      result.successful.push(lineageId);
    } catch (error: any) {
      result.failed.push({
        lineage_id: lineageId,
        error: error.message,
      });
    }
  }

  return result;
}

/**
 * Delete all lineages for a column
 */
export async function deleteColumnLineages(
  columnId: string,
  userId: string
): Promise<void> {
  // Get all lineages involving this column
  const { data: lineages } = await supabase
    .from('lineage')
    .select('lineage_id')
    .or(`downstream_column_id.eq.${columnId},upstream_column_id.eq.${columnId}`);

  if (!lineages || lineages.length === 0) {
    return;
  }

  const lineageIds = lineages.map((l) => l.lineage_id);
  await batchDeleteLineages(lineageIds, userId);
}

/**
 * Mark dataset as uncommitted (helper function)
 */
async function markDatasetAsUncommitted(datasetId: string): Promise<void> {
  await supabase
    .from('datasets')
    .update({ has_uncommitted_changes: true })
    .eq('dataset_id', datasetId);
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
