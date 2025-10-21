/**
 * Datasets API Routes
 * Handles dataset CRUD operations with change tracking
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Lazy-load Supabase client to avoid loading before environment variables are set
let supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabase) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      throw new Error('Supabase credentials not configured');
    }
    supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );
  }
  return supabase;
}

/**
 * Middleware to track changes
 */
async function trackChange(
  userId: string,
  datasetId: string,
  entityType: 'dataset' | 'column' | 'lineage',
  entityId: string,
  changeType: 'insert' | 'update' | 'delete',
  oldValue: any = null,
  newValue: any = null
) {
  try {
    await getSupabaseClient().from('metadata_changes').insert({
      dataset_id: datasetId,
      entity_type: entityType,
      entity_id: entityId,
      change_type: changeType,
      old_value: oldValue,
      new_value: newValue,
      changed_by: userId,
    });
  } catch (error) {
    console.error('[Change Tracking] Error:', error);
    // Don't fail the request if change tracking fails
  }
}

/**
 * Mark dataset as uncommitted after changes
 */
async function markDatasetUncommitted(datasetId: string) {
  try {
    await getSupabaseClient()
      .from('datasets')
      .update({
        has_uncommitted_changes: true,
        sync_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', datasetId);
  } catch (error) {
    console.error('[Dataset] Error marking as uncommitted:', error);
  }
}

/**
 * Get all datasets for a workspace
 * GET /api/datasets/:workspace_id
 */
router.get('/:workspace_id', async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { project_id } = req.query;

    let query = getSupabaseClient()
      .from('datasets')
      .select('*')
      .eq('workspace_id', workspace_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (project_id) {
      // Filter by project through workspaces
      // Get all workspace IDs for this project
      const { data: workspaces } = await getSupabaseClient()
        .from('workspaces')
        .select('id')
        .eq('project_id', project_id);

      const workspaceIds = workspaces?.map((w) => w.id) || [];

      // Get all dataset IDs in these workspaces
      const { data: mappings } = await getSupabaseClient()
        .from('workspace_datasets')
        .select('dataset_id')
        .in('workspace_id', workspaceIds);

      const datasetIds = mappings?.map((m) => m.dataset_id) || [];
      query = query.in('id', datasetIds);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ datasets: data || [] });
  } catch (error: any) {
    console.error('[Datasets] Get error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get single dataset by ID
 * GET /api/datasets/detail/:dataset_id
 */
router.get('/detail/:dataset_id', async (req, res) => {
  try {
    const { dataset_id } = req.params;

    const { data, error } = await getSupabaseClient()
      .from('datasets')
      .select(
        `
        *,
        columns!inner (*)
      `
      )
      .eq('id', dataset_id)
      .is('deleted_at', null)
      .is('columns.deleted_at', null)
      .single();

    if (error) throw error;

    res.json({ dataset: data });
  } catch (error: any) {
    console.error('[Datasets] Get detail error:', error);
    res.status(404).json({ error: 'Dataset not found' });
  }
});

/**
 * Create new dataset
 * POST /api/datasets
 */
router.post('/', async (req, res) => {
  try {
    const { workspace_id, project_id, user_id, ...datasetData } = req.body;

    if (!workspace_id || !user_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create dataset
    const { data: dataset, error } = await getSupabaseClient()
      .from('datasets')
      .insert({
        workspace_id,
        ...datasetData,
        has_uncommitted_changes: true,
        sync_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Track change
    await trackChange(
      user_id,
      dataset.id,
      'dataset',
      dataset.id,
      'insert',
      null,
      dataset
    );

    // Note: Datasets are added to workspaces via workspace_datasets, not directly to projects.
    // Projects contain datasets through: project → workspaces → workspace_datasets → datasets

    res.status(201).json({ dataset });
  } catch (error: any) {
    console.error('[Datasets] Create error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update dataset
 * PUT /api/datasets/:dataset_id
 */
router.put('/:dataset_id', async (req, res) => {
  try {
    const { dataset_id } = req.params;
    const { user_id, ...updates } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Get old value
    const { data: oldDataset } = await getSupabaseClient()
      .from('datasets')
      .select('*')
      .eq('id', dataset_id)
      .single();

    // Update dataset
    const { data: dataset, error } = await getSupabaseClient()
      .from('datasets')
      .update({
        ...updates,
        has_uncommitted_changes: true,
        sync_status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', dataset_id)
      .select()
      .single();

    if (error) throw error;

    // Track change
    await trackChange(
      user_id,
      dataset_id,
      'dataset',
      dataset_id,
      'update',
      oldDataset,
      dataset
    );

    res.json({ dataset });
  } catch (error: any) {
    console.error('[Datasets] Update error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete dataset (soft delete)
 * DELETE /api/datasets/:dataset_id
 */
router.delete('/:dataset_id', async (req, res) => {
  try {
    const { dataset_id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Use soft delete function (cascades to columns)
    const { data, error } = await getSupabaseClient()
      .rpc('soft_delete_dataset', {
        p_dataset_id: dataset_id,
        p_deleted_by: user_id
      });

    if (error) throw error;

    if (!data?.success) {
      return res.status(404).json({ error: data?.message || 'Dataset not found or already deleted' });
    }

    // Track deletion
    await trackChange(
      user_id,
      dataset_id,
      'dataset',
      dataset_id,
      'delete',
      { id: dataset_id },
      null
    );

    res.json({
      success: true,
      message: 'Dataset soft deleted',
      deleted_counts: {
        columns: data.columns_deleted
      }
    });
  } catch (error: any) {
    console.error('[Datasets] Soft delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Restore soft deleted dataset
 * POST /api/datasets/:dataset_id/restore
 */
router.post('/:dataset_id/restore', async (req, res) => {
  try {
    const { dataset_id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Use restore function
    const { data, error } = await getSupabaseClient()
      .rpc('restore_deleted', {
        p_table_name: 'datasets',
        p_record_id: dataset_id
      });

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Dataset not found or not deleted' });
    }

    // Track restoration
    await trackChange(
      user_id,
      dataset_id,
      'dataset',
      dataset_id,
      'restore',
      null,
      { id: dataset_id }
    );

    res.json({ success: true, message: 'Dataset restored' });
  } catch (error: any) {
    console.error('[Datasets] Restore error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get soft deleted datasets for a workspace
 * GET /api/datasets/:workspace_id/deleted
 */
router.get('/:workspace_id/deleted', async (req, res) => {
  try {
    const { workspace_id } = req.params;

    const { data, error } = await getSupabaseClient()
      .from('datasets')
      .select('*')
      .eq('workspace_id', workspace_id)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) throw error;

    res.json({ datasets: data || [] });
  } catch (error: any) {
    console.error('[Datasets] Get deleted error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get uncommitted datasets for a workspace
 * GET /api/datasets/:workspace_id/uncommitted
 */
router.get('/:workspace_id/uncommitted', async (req, res) => {
  try {
    const { workspace_id } = req.params;

    const { data, error } = await getSupabaseClient()
      .from('datasets')
      .select('*')
      .eq('workspace_id', workspace_id)
      .eq('has_uncommitted_changes', true)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (error) throw error;

    res.json({ datasets: data || [] });
  } catch (error: any) {
    console.error('[Datasets] Get uncommitted error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create column for dataset
 * POST /api/datasets/:dataset_id/columns
 */
router.post('/:dataset_id/columns', async (req, res) => {
  try {
    const { dataset_id } = req.params;
    const { user_id, ...columnData } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Create column
    const { data: column, error } = await getSupabaseClient()
      .from('columns')
      .insert({
        dataset_id,
        ...columnData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Track change
    await trackChange(user_id, dataset_id, 'column', column.id, 'insert', null, column);

    // Mark dataset as uncommitted
    await markDatasetUncommitted(dataset_id);

    res.status(201).json({ column });
  } catch (error: any) {
    console.error('[Datasets] Create column error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update column
 * PUT /api/datasets/:dataset_id/columns/:column_id
 */
router.put('/:dataset_id/columns/:column_id', async (req, res) => {
  try {
    const { dataset_id, column_id } = req.params;
    const { user_id, ...updates } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Get old value
    const { data: oldColumn } = await getSupabaseClient()
      .from('columns')
      .select('*')
      .eq('id', column_id)
      .single();

    // Update column
    const { data: column, error } = await getSupabaseClient()
      .from('columns')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', column_id)
      .select()
      .single();

    if (error) throw error;

    // Track change
    await trackChange(user_id, dataset_id, 'column', column_id, 'update', oldColumn, column);

    // Mark dataset as uncommitted
    await markDatasetUncommitted(dataset_id);

    res.json({ column });
  } catch (error: any) {
    console.error('[Datasets] Update column error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Permanently delete dataset (only if already soft deleted)
 * DELETE /api/datasets/:dataset_id/permanent
 */
router.delete('/:dataset_id/permanent', async (req, res) => {
  try {
    const { dataset_id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Use permanent delete function
    const { data, error } = await getSupabaseClient()
      .rpc('permanent_delete', {
        p_table_name: 'datasets',
        p_record_id: dataset_id
      });

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Dataset not found or not soft deleted' });
    }

    res.json({ success: true, message: 'Dataset permanently deleted' });
  } catch (error: any) {
    console.error('[Datasets] Permanent delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete column (soft delete)
 * DELETE /api/datasets/:dataset_id/columns/:column_id
 */
router.delete('/:dataset_id/columns/:column_id', async (req, res) => {
  try {
    const { dataset_id, column_id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Use soft delete function
    const { data, error } = await getSupabaseClient()
      .rpc('soft_delete', {
        p_table_name: 'columns',
        p_record_id: column_id,
        p_deleted_by: user_id
      });

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Column not found or already deleted' });
    }

    // Track deletion
    await trackChange(user_id, dataset_id, 'column', column_id, 'delete', { id: column_id }, null);

    // Mark dataset as uncommitted
    await markDatasetUncommitted(dataset_id);

    res.json({ success: true, message: 'Column soft deleted' });
  } catch (error: any) {
    console.error('[Datasets] Soft delete column error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Restore soft deleted column
 * POST /api/datasets/:dataset_id/columns/:column_id/restore
 */
router.post('/:dataset_id/columns/:column_id/restore', async (req, res) => {
  try {
    const { dataset_id, column_id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Use restore function
    const { data, error } = await getSupabaseClient()
      .rpc('restore_deleted', {
        p_table_name: 'columns',
        p_record_id: column_id
      });

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Column not found or not deleted' });
    }

    // Track restoration
    await trackChange(user_id, dataset_id, 'column', column_id, 'restore', null, { id: column_id });

    // Mark dataset as uncommitted
    await markDatasetUncommitted(dataset_id);

    res.json({ success: true, message: 'Column restored' });
  } catch (error: any) {
    console.error('[Datasets] Restore column error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Add dataset to project (DEPRECATED)
 * POST /api/datasets/:dataset_id/projects/:project_id
 *
 * @deprecated Datasets belong to workspaces, not directly to projects.
 * Use POST /api/datasets/:dataset_id/workspaces/:workspace_id instead.
 */
router.post('/:dataset_id/projects/:project_id', async (req, res) => {
  res.status(410).json({
    error: 'Endpoint deprecated. Datasets belong to workspaces, not directly to projects. Use workspace endpoints instead.',
    message: 'Use POST /api/datasets/:dataset_id/workspaces/:workspace_id to add dataset to a workspace.'
  });
});

/**
 * Remove dataset from project (DEPRECATED)
 * DELETE /api/datasets/:dataset_id/projects/:project_id
 *
 * @deprecated Datasets belong to workspaces, not directly to projects.
 * Use DELETE /api/datasets/:dataset_id/workspaces/:workspace_id instead.
 */
router.delete('/:dataset_id/projects/:project_id', async (req, res) => {
  res.status(410).json({
    error: 'Endpoint deprecated. Datasets belong to workspaces, not directly to projects. Use workspace endpoints instead.',
    message: 'Use DELETE /api/datasets/:dataset_id/workspaces/:workspace_id to remove dataset from a workspace.'
  });
});

/**
 * Import metadata from SQL Server extraction
 * POST /api/datasets/import
 */
router.post('/import', async (req, res) => {
  try {
    const { workspace_id, account_id, user_id, connection_id, tables } = req.body;

    if (!workspace_id || !account_id || !user_id || !connection_id || !tables) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`[Datasets] Importing ${tables.length} table(s) for workspace ${workspace_id}`);

    const createdDatasets = [];
    const addedDatasets = [];
    const errors = [];

    // Process each table
    for (const table of tables) {
      try {
        // Generate FQN for logging and error tracking
        const fqn = `${table.schema}.${table.name}`;

        console.log(`[Datasets] Processing table: ${fqn}`);

        // Check if dataset already exists for this account
        // Note: fully_qualified_name is auto-generated, so we check by connection_id, schema, and name
        const { data: existingDataset, error: checkError } = await getSupabaseClient()
          .from('datasets')
          .select('*')
          .eq('account_id', account_id)
          .eq('connection_id', connection_id)
          .eq('schema', table.schema)
          .eq('name', table.name)
          .is('deleted_at', null)
          .maybeSingle();

        if (checkError) {
          console.error(`[Datasets] Error checking for existing dataset ${fqn}:`, checkError);
          errors.push({ table: fqn, error: checkError.message });
          continue;
        }

        let dataset = existingDataset;
        let datasetWasCreated = false;

        if (existingDataset) {
          console.log(`[Datasets] Dataset ${fqn} already exists (ID: ${existingDataset.id})`);

          // Check if dataset is already in the workspace
          const { data: workspaceLink, error: workspaceLinkError } = await getSupabaseClient()
            .from('workspace_datasets')
            .select('id')
            .eq('workspace_id', workspace_id)
            .eq('dataset_id', existingDataset.id)
            .maybeSingle();

          if (workspaceLinkError) {
            console.error(`[Datasets] Error checking workspace link:`, workspaceLinkError);
          }

          if (!workspaceLink) {
            // Add existing dataset to workspace
            const { error: workspaceDatasetError } = await getSupabaseClient()
              .from('workspace_datasets')
              .insert({
                workspace_id,
                dataset_id: existingDataset.id,
                added_by: user_id,
              });

            if (workspaceDatasetError) {
              console.error(`[Datasets] Error adding existing dataset to workspace:`, workspaceDatasetError);
              errors.push({ table: fqn, error: `Failed to add to workspace: ${workspaceDatasetError.message}` });
            } else {
              console.log(`[Datasets] Added existing dataset ${existingDataset.id} to workspace ${workspace_id}`);
              addedDatasets.push({
                id: existingDataset.id,
                name: existingDataset.name,
                fqn: existingDataset.fully_qualified_name || fqn,
                status: 'added_to_workspace',
              });
            }
          } else {
            console.log(`[Datasets] Dataset ${fqn} already in workspace`);
            addedDatasets.push({
              id: existingDataset.id,
              name: existingDataset.name,
              fqn: existingDataset.fully_qualified_name || fqn,
              status: 'already_in_workspace',
            });
          }
        } else {
          datasetWasCreated = true;
          // Create new dataset
          console.log(`[Datasets] Creating new dataset for ${fqn}`);

          const { data: newDataset, error: datasetError } = await getSupabaseClient()
            .from('datasets')
            .insert({
              account_id,
              connection_id,
              schema: table.schema,
              name: table.name,
              dataset_type: table.type === 'VIEW' ? 'View' : 'Table',
              description: table.description || null,
              has_uncommitted_changes: true,
              sync_status: 'pending',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();

          if (datasetError) {
            console.error(`[Datasets] Error creating dataset ${fqn}:`, datasetError);
            errors.push({ table: fqn, error: datasetError.message });
            continue;
          }

          dataset = newDataset;
          console.log(`[Datasets] Created dataset ${dataset.id} for ${fqn}`);

          // Track change for new dataset
          await trackChange(
            user_id,
            dataset.id,
            'dataset',
            dataset.id,
            'insert',
            null,
            dataset
          );

          // Add dataset to workspace
          const { error: workspaceDatasetError } = await getSupabaseClient()
            .from('workspace_datasets')
            .insert({
              workspace_id,
              dataset_id: dataset.id,
              added_by: user_id,
            });

          if (workspaceDatasetError) {
            console.error(`[Datasets] Error adding dataset to workspace:`, workspaceDatasetError);
            // Don't fail the import if workspace mapping fails, just log it
          } else {
            console.log(`[Datasets] Added dataset ${dataset.id} to workspace ${workspace_id}`);
          }

          createdDatasets.push({
            id: dataset.id,
            name: dataset.name,
            fqn: dataset.fully_qualified_name || fqn,
            status: 'created',
          });
        }

        // Check if columns exist for this dataset (for both new and existing datasets)
        const { data: existingColumns } = await getSupabaseClient()
          .from('columns')
          .select('id')
          .eq('dataset_id', dataset.id)
          .is('deleted_at', null);

        // Create columns if provided and they don't exist yet
        if (table.columns && table.columns.length > 0 && (!existingColumns || existingColumns.length === 0)) {
          console.log(`[Datasets] Creating ${table.columns.length} column(s) for dataset ${dataset.id}`);

          // Find primary key columns from keys metadata
          const primaryKeyColumns = new Set<string>();
          if (table.keys && table.keys.length > 0) {
            const primaryKeys = table.keys.filter((key: any) => key.type === 'PRIMARY KEY');
            for (const pk of primaryKeys) {
              if (pk.columns) {
                for (const colName of pk.columns) {
                  primaryKeyColumns.add(colName);
                }
              }
            }
          }

          const columnsToInsert = table.columns.map((col: any, index: number) => {
            const columnName = col.name || col.column_name;
            return {
              dataset_id: dataset.id,
              name: columnName,
              data_type: col.data_type,
              ordinal_position: col.ordinal_position || index + 1,
              is_nullable: col.is_nullable !== undefined ? col.is_nullable : true,
              is_primary_key: primaryKeyColumns.has(columnName),
              is_foreign_key: false, // Will be set to true when we create references below
              default_value: col.default_value || col.column_default || null,
              max_length: col.max_length || null,
              precision: col.precision || null,
              scale: col.scale || null,
              is_identity: col.is_identity || false,
              is_computed: col.is_computed || false,
            };
          });

          const { data: columns, error: columnsError } = await getSupabaseClient()
            .from('columns')
            .insert(columnsToInsert)
            .select();

          if (columnsError) {
            console.error(`[Datasets] Error creating columns for ${fqn}:`, columnsError);
            errors.push({ table: fqn, error: `Column creation failed: ${columnsError.message}` });
          } else {
            console.log(`[Datasets] Created ${columns.length} column(s) for dataset ${dataset.id}`);

            // Now process foreign keys to create references
            if (table.keys && table.keys.length > 0) {
              const foreignKeys = table.keys.filter((key: any) => key.type === 'FOREIGN KEY');

              for (const fk of foreignKeys) {
                try {
                  // Find the referenced dataset by schema and table name
                  const { data: referencedDataset, error: refDatasetError } = await getSupabaseClient()
                    .from('datasets')
                    .select('id')
                    .eq('account_id', account_id)
                    .eq('connection_id', connection_id)
                    .eq('schema', fk.referenced_schema)
                    .eq('name', fk.referenced_table)
                    .is('deleted_at', null)
                    .maybeSingle();

                  if (refDatasetError || !referencedDataset) {
                    console.warn(`[Datasets] Referenced dataset ${fk.referenced_schema}.${fk.referenced_table} not found for FK ${fk.name}`);
                    continue;
                  }

                  // For each column in the foreign key, create a reference
                  for (let i = 0; i < (fk.columns?.length || 0); i++) {
                    const sourceColumnName = fk.columns[i];
                    const targetColumnName = fk.referenced_columns?.[i];

                    if (!sourceColumnName || !targetColumnName) {
                      console.warn(`[Datasets] Missing column names for FK ${fk.name}`);
                      continue;
                    }

                    // Find source column ID
                    const sourceColumn = columns.find((c: any) => c.name === sourceColumnName);
                    if (!sourceColumn) {
                      console.warn(`[Datasets] Source column ${sourceColumnName} not found for FK ${fk.name}`);
                      continue;
                    }

                    // Find target column ID
                    const { data: targetColumns, error: targetColError } = await getSupabaseClient()
                      .from('columns')
                      .select('id')
                      .eq('dataset_id', referencedDataset.id)
                      .eq('name', targetColumnName)
                      .is('deleted_at', null)
                      .maybeSingle();

                    if (targetColError || !targetColumns) {
                      console.warn(`[Datasets] Target column ${targetColumnName} not found in ${fk.referenced_schema}.${fk.referenced_table}`);
                      continue;
                    }

                    // Create the reference
                    const { error: refError } = await getSupabaseClient()
                      .from('references')
                      .insert({
                        source_column_id: sourceColumn.id,
                        target_column_id: targetColumns.id,
                        relationship_type: 'foreign_key',
                        constraint_name: fk.name,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                      });

                    if (refError) {
                      console.error(`[Datasets] Error creating reference for FK ${fk.name}:`, refError);
                    } else {
                      console.log(`[Datasets] Created reference: ${sourceColumnName} -> ${fk.referenced_schema}.${fk.referenced_table}.${targetColumnName}`);

                      // Mark source column as foreign key
                      await getSupabaseClient()
                        .from('columns')
                        .update({ is_foreign_key: true })
                        .eq('id', sourceColumn.id);
                    }
                  }
                } catch (fkError: any) {
                  console.error(`[Datasets] Error processing FK ${fk.name}:`, fkError);
                }
              }
            }
          }
        } else if (existingColumns && existingColumns.length > 0) {
          console.log(`[Datasets] Dataset ${dataset.id} already has ${existingColumns.length} column(s), skipping column creation`);
        }
      } catch (tableError: any) {
        console.error(`[Datasets] Error importing table ${table.schema}.${table.name}:`, tableError);
        errors.push({ table: `${table.schema}.${table.name}`, error: tableError.message });
      }
    }

    const totalProcessed = createdDatasets.length + addedDatasets.length;

    const response = {
      success: errors.length === 0,
      imported_count: totalProcessed,
      created_count: createdDatasets.length,
      added_count: addedDatasets.length,
      created_datasets: createdDatasets,
      added_datasets: addedDatasets,
      errors: errors.length > 0 ? errors : undefined,
      message: errors.length === 0
        ? `Successfully processed ${totalProcessed} dataset(s) (${createdDatasets.length} created, ${addedDatasets.length} added to workspace)`
        : `Processed ${totalProcessed} dataset(s) with ${errors.length} error(s)`,
    };

    console.log(`[Datasets] Import complete: ${createdDatasets.length} created, ${addedDatasets.length} added, ${errors.length} errors`);

    res.status(errors.length === 0 ? 201 : 207).json(response);
  } catch (error: any) {
    console.error('[Datasets] Import error:', error);
    res.status(500).json({ error: error.message, success: false });
  }
});

export default router;
