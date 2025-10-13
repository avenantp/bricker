/**
 * Column service for CRUD operations
 * Handles columns within datasets, including references
 * Based on technical specifications in docs/prp/001-technical-specifications-refactored.md
 */

import { supabase } from './supabase';
import type {
  Column,
  CreateColumnPayload,
  UpdateColumnPayload,
  ColumnWithReference,
  ColumnReference,
  BatchColumnOperationResult,
} from '../types/column';

/**
 * Create a new column in a dataset
 */
export async function createColumn(
  payload: CreateColumnPayload,
  userId: string
): Promise<Column> {
  const now = new Date().toISOString();

  // Auto-generate FQN if not provided
  let fqn = payload.fqn;
  if (!fqn) {
    // Get dataset to build FQN
    const { data: dataset } = await supabase
      .from('datasets')
      .select('fqn')
      .eq('dataset_id', payload.dataset_id)
      .single();

    if (dataset) {
      fqn = `${dataset.fqn}.${payload.name}`;
    } else {
      throw new Error('Dataset not found');
    }
  }

  // Prepare column object
  const column = {
    dataset_id: payload.dataset_id,
    name: payload.name,
    fqn: fqn,
    data_type: payload.data_type,
    description: payload.description || null,
    business_name: payload.business_name || null,
    is_primary_key: payload.is_primary_key || false,
    is_foreign_key: payload.is_foreign_key || false,
    is_nullable: payload.is_nullable !== false, // Default true
    default_value: payload.default_value || null,
    reference_column_id: payload.reference_column_id || null,
    reference_type: payload.reference_type || null,
    reference_description: payload.reference_description || null,
    transformation_logic: payload.transformation_logic || null,
    ai_confidence_score: null,
    position: payload.position || null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('columns')
    .insert(column)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create column: ${error.message}`);
  }

  // Mark dataset as uncommitted
  await markDatasetAsUncommitted(payload.dataset_id);

  // Log creation in audit_logs
  await logAuditChange('column', data.column_id, 'create', userId, {
    column_name: data.name,
    dataset_id: payload.dataset_id,
  });

  return data;
}

/**
 * Get a column by ID
 */
export async function getColumn(columnId: string): Promise<Column | null> {
  const { data, error } = await supabase
    .from('columns')
    .select('*')
    .eq('column_id', columnId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw new Error(`Failed to fetch column: ${error.message}`);
  }

  return data;
}

/**
 * Get a column with reference details
 */
export async function getColumnWithReference(
  columnId: string
): Promise<ColumnWithReference | null> {
  const { data, error } = await supabase
    .from('columns')
    .select(`
      *,
      referenced_column:columns!reference_column_id(
        column_id,
        name,
        dataset_id,
        datasets!inner(
          name,
          fqn
        )
      )
    `)
    .eq('column_id', columnId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw new Error(`Failed to fetch column with reference: ${error.message}`);
  }

  // Transform the response
  const column = data as any;
  if (column.referenced_column) {
    return {
      ...column,
      referenced_column: {
        column_id: column.referenced_column.column_id,
        column_name: column.referenced_column.name,
        dataset_id: column.referenced_column.dataset_id,
        dataset_name: column.referenced_column.datasets.name,
        dataset_fqn: column.referenced_column.datasets.fqn,
      },
    };
  }

  return column;
}

/**
 * Update a column
 */
export async function updateColumn(
  columnId: string,
  payload: UpdateColumnPayload,
  userId: string
): Promise<Column> {
  const now = new Date().toISOString();

  // Get existing column to check if name changed
  const existingColumn = await getColumn(columnId);
  if (!existingColumn) {
    throw new Error('Column not found');
  }

  // Update FQN if name changed
  let updates: any = {
    ...payload,
    updated_at: now,
  };

  if (payload.name && payload.name !== existingColumn.name) {
    const { data: dataset } = await supabase
      .from('datasets')
      .select('fqn')
      .eq('dataset_id', existingColumn.dataset_id)
      .single();

    if (dataset) {
      updates.fqn = `${dataset.fqn}.${payload.name}`;
    }
  }

  const { data, error } = await supabase
    .from('columns')
    .update(updates)
    .eq('column_id', columnId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update column: ${error.message}`);
  }

  // Mark dataset as uncommitted
  await markDatasetAsUncommitted(existingColumn.dataset_id);

  // Log update in audit_logs
  await logAuditChange('column', columnId, 'update', userId, {
    changes: payload,
  });

  return data;
}

/**
 * Delete a column
 */
export async function deleteColumn(
  columnId: string,
  userId: string
): Promise<void> {
  // Get column info before deleting
  const column = await getColumn(columnId);
  if (!column) {
    throw new Error('Column not found');
  }

  const { error } = await supabase
    .from('columns')
    .delete()
    .eq('column_id', columnId);

  if (error) {
    throw new Error(`Failed to delete column: ${error.message}`);
  }

  // Mark dataset as uncommitted
  await markDatasetAsUncommitted(column.dataset_id);

  // Log deletion in audit_logs
  await logAuditChange('column', columnId, 'delete', userId, {
    column_name: column.name,
    dataset_id: column.dataset_id,
  });
}

/**
 * Get all columns for a dataset
 */
export async function getDatasetColumns(
  datasetId: string
): Promise<Column[]> {
  const { data, error } = await supabase
    .from('columns')
    .select('*')
    .eq('dataset_id', datasetId)
    .order('position', { ascending: true, nullsFirst: false })
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch dataset columns: ${error.message}`);
  }

  return data || [];
}

/**
 * Get all columns for a dataset with reference details
 */
export async function getDatasetColumnsWithReferences(
  datasetId: string
): Promise<ColumnWithReference[]> {
  const { data, error } = await supabase
    .from('columns')
    .select(`
      *,
      referenced_column:columns!reference_column_id(
        column_id,
        name,
        dataset_id,
        datasets!inner(
          name,
          fqn
        )
      )
    `)
    .eq('dataset_id', datasetId)
    .order('position', { ascending: true, nullsFirst: false })
    .order('name');

  if (error) {
    throw new Error(`Failed to fetch dataset columns: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  // Transform the response
  return data.map((col: any) => {
    if (col.referenced_column) {
      return {
        ...col,
        referenced_column: {
          column_id: col.referenced_column.column_id,
          column_name: col.referenced_column.name,
          dataset_id: col.referenced_column.dataset_id,
          dataset_name: col.referenced_column.datasets.name,
          dataset_fqn: col.referenced_column.datasets.fqn,
        },
      };
    }
    return col;
  });
}

/**
 * Reorder columns within a dataset
 */
export async function reorderColumns(
  datasetId: string,
  orderedColumnIds: string[],
  userId: string
): Promise<void> {
  // Update position for each column
  const updates = orderedColumnIds.map((columnId, index) =>
    supabase
      .from('columns')
      .update({ position: index })
      .eq('column_id', columnId)
  );

  await Promise.all(updates);

  // Mark dataset as uncommitted
  await markDatasetAsUncommitted(datasetId);

  // Log reorder in audit_logs
  await logAuditChange('column', datasetId, 'reorder', userId, {
    ordered_column_ids: orderedColumnIds,
  });
}

/**
 * Bulk update columns
 */
export async function bulkUpdateColumns(
  updates: Array<{ column_id: string; updates: UpdateColumnPayload }>,
  userId: string
): Promise<BatchColumnOperationResult> {
  const result: BatchColumnOperationResult = {
    successful: [],
    failed: [],
  };

  for (const update of updates) {
    try {
      await updateColumn(update.column_id, update.updates, userId);
      result.successful.push(update.column_id);
    } catch (error: any) {
      result.failed.push({
        column_id: update.column_id,
        error: error.message,
      });
    }
  }

  return result;
}

/**
 * Batch delete columns
 */
export async function batchDeleteColumns(
  columnIds: string[],
  userId: string
): Promise<BatchColumnOperationResult> {
  const result: BatchColumnOperationResult = {
    successful: [],
    failed: [],
  };

  for (const columnId of columnIds) {
    try {
      await deleteColumn(columnId, userId);
      result.successful.push(columnId);
    } catch (error: any) {
      result.failed.push({
        column_id: columnId,
        error: error.message,
      });
    }
  }

  return result;
}

/**
 * Get all columns that reference a specific column
 */
export async function getColumnsReferencingColumn(
  targetColumnId: string
): Promise<Column[]> {
  const { data, error } = await supabase
    .from('columns')
    .select('*')
    .eq('reference_column_id', targetColumnId);

  if (error) {
    throw new Error(`Failed to fetch referencing columns: ${error.message}`);
  }

  return data || [];
}

/**
 * Get all column references in a workspace
 */
export async function getWorkspaceColumnReferences(
  workspaceId: string
): Promise<ColumnReference[]> {
  // Get all datasets in workspace
  const { data: datasets } = await supabase
    .from('datasets')
    .select('dataset_id')
    .eq('workspace_id', workspaceId);

  if (!datasets || datasets.length === 0) {
    return [];
  }

  const datasetIds = datasets.map((d) => d.dataset_id);

  // Get all columns with references in these datasets
  const { data, error } = await supabase
    .from('columns')
    .select(`
      column_id,
      name,
      dataset_id,
      reference_column_id,
      reference_type,
      reference_description,
      source_dataset:datasets!dataset_id(
        name,
        dataset_id
      ),
      target_column:columns!reference_column_id(
        column_id,
        name,
        dataset_id,
        target_dataset:datasets!dataset_id(
          name
        )
      )
    `)
    .in('dataset_id', datasetIds)
    .not('reference_column_id', 'is', null);

  if (error) {
    throw new Error(`Failed to fetch column references: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  // Transform to ColumnReference format
  return data
    .filter((col: any) => col.target_column)
    .map((col: any) => ({
      source_column_id: col.column_id,
      source_column_name: col.name,
      source_dataset_id: col.dataset_id,
      source_dataset_name: col.source_dataset.name,
      target_column_id: col.target_column.column_id,
      target_column_name: col.target_column.name,
      target_dataset_id: col.target_column.dataset_id,
      target_dataset_name: col.target_column.target_dataset.name,
      reference_type: col.reference_type,
      reference_description: col.reference_description,
    }));
}

/**
 * Create a reference from one column to another
 */
export async function createColumnReference(
  sourceColumnId: string,
  targetColumnId: string,
  referenceType: 'FK' | 'BusinessKey' | 'NaturalKey',
  description: string | undefined,
  userId: string
): Promise<Column> {
  const updates: UpdateColumnPayload = {
    reference_column_id: targetColumnId,
    reference_type: referenceType,
    reference_description: description,
    is_foreign_key: referenceType === 'FK',
  };

  return updateColumn(sourceColumnId, updates, userId);
}

/**
 * Remove reference from a column
 */
export async function removeColumnReference(
  columnId: string,
  userId: string
): Promise<Column> {
  const updates: UpdateColumnPayload = {
    reference_column_id: null,
    reference_type: null,
    reference_description: null,
  };

  return updateColumn(columnId, updates, userId);
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
