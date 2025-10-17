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
        columns (*),
        lineage (*)
      `
      )
      .eq('id', dataset_id)
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
 * Delete dataset
 * DELETE /api/datasets/:dataset_id
 */
router.delete('/:dataset_id', async (req, res) => {
  try {
    const { dataset_id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Get dataset before deletion
    const { data: dataset } = await getSupabaseClient()
      .from('datasets')
      .select('*')
      .eq('id', dataset_id)
      .single();

    // Delete dataset (cascades to columns and lineage via database constraints)
    const { error } = await getSupabaseClient()
      .from('datasets')
      .delete()
      .eq('id', dataset_id);

    if (error) throw error;

    // Track deletion
    if (dataset) {
      await trackChange(
        user_id,
        dataset_id,
        'dataset',
        dataset_id,
        'delete',
        dataset,
        null
      );
    }

    res.json({ success: true, message: 'Dataset deleted' });
  } catch (error: any) {
    console.error('[Datasets] Delete error:', error);
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
 * Delete column
 * DELETE /api/datasets/:dataset_id/columns/:column_id
 */
router.delete('/:dataset_id/columns/:column_id', async (req, res) => {
  try {
    const { dataset_id, column_id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Get column before deletion
    const { data: column } = await getSupabaseClient()
      .from('columns')
      .select('*')
      .eq('id', column_id)
      .single();

    // Delete column
    const { error } = await getSupabaseClient().from('columns').delete().eq('id', column_id);

    if (error) throw error;

    // Track deletion
    if (column) {
      await trackChange(user_id, dataset_id, 'column', column_id, 'delete', column, null);
    }

    // Mark dataset as uncommitted
    await markDatasetUncommitted(dataset_id);

    res.json({ success: true, message: 'Column deleted' });
  } catch (error: any) {
    console.error('[Datasets] Delete column error:', error);
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
          .maybeSingle();

        if (checkError) {
          console.error(`[Datasets] Error checking for existing dataset ${fqn}:`, checkError);
          errors.push({ table: fqn, error: checkError.message });
          continue;
        }

        let dataset = existingDataset;

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

          // Create columns if provided
          if (table.columns && table.columns.length > 0) {
            const columnsToInsert = table.columns.map((col: any, index: number) => ({
              dataset_id: dataset.id,
              fqn: `${fqn}.${col.name || col.column_name}`,
              name: col.name || col.column_name,
              data_type: col.data_type,
              position: col.ordinal_position !== undefined ? col.ordinal_position : index + 1,
              is_nullable: col.is_nullable !== undefined ? col.is_nullable : true,
              is_primary_key: col.is_primary_key || false,
              is_foreign_key: col.is_foreign_key || false,
              default_value: col.default_value || null,
              description: col.description || null,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }));

            const { data: columns, error: columnsError } = await getSupabaseClient()
              .from('columns')
              .insert(columnsToInsert)
              .select();

            if (columnsError) {
              console.error(`[Datasets] Error creating columns for ${fqn}:`, columnsError);
              errors.push({ table: fqn, error: `Column creation failed: ${columnsError.message}` });
            } else {
              console.log(`[Datasets] Created ${columns.length} column(s) for dataset ${dataset.id}`);
            }
          }

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
