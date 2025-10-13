/**
 * Datasets API Routes
 * Handles dataset CRUD operations with change tracking
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

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
    await supabase.from('metadata_changes').insert({
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
    await supabase
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

    let query = supabase
      .from('datasets')
      .select('*')
      .eq('workspace_id', workspace_id)
      .order('created_at', { ascending: false });

    if (project_id) {
      // Filter by project through mapping table
      const { data: mappings } = await supabase
        .from('project_datasets')
        .select('dataset_id')
        .eq('project_id', project_id);

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

    const { data, error } = await supabase
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
    const { data: dataset, error } = await supabase
      .from('datasets')
      .insert({
        workspace_id,
        ...datasetData,
        has_uncommitted_changes: true,
        sync_status: 'not_synced',
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

    // Add to project if project_id provided
    if (project_id) {
      await supabase.from('project_datasets').insert({
        project_id,
        dataset_id: dataset.id,
        added_by: user_id,
      });
    }

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
    const { data: oldDataset } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', dataset_id)
      .single();

    // Update dataset
    const { data: dataset, error } = await supabase
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
    const { data: dataset } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', dataset_id)
      .single();

    // Delete dataset (cascades to columns and lineage via database constraints)
    const { error } = await supabase
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

    const { data, error } = await supabase
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
    const { data: column, error } = await supabase
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
    const { data: oldColumn } = await supabase
      .from('columns')
      .select('*')
      .eq('id', column_id)
      .single();

    // Update column
    const { data: column, error } = await supabase
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
    const { data: column } = await supabase
      .from('columns')
      .select('*')
      .eq('id', column_id)
      .single();

    // Delete column
    const { error } = await supabase.from('columns').delete().eq('id', column_id);

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
 * Add dataset to project
 * POST /api/datasets/:dataset_id/projects/:project_id
 */
router.post('/:dataset_id/projects/:project_id', async (req, res) => {
  try {
    const { dataset_id, project_id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const { error } = await supabase.from('project_datasets').insert({
      project_id,
      dataset_id,
      added_by: user_id,
    });

    if (error) throw error;

    res.json({ success: true, message: 'Dataset added to project' });
  } catch (error: any) {
    console.error('[Datasets] Add to project error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Remove dataset from project
 * DELETE /api/datasets/:dataset_id/projects/:project_id
 */
router.delete('/:dataset_id/projects/:project_id', async (req, res) => {
  try {
    const { dataset_id, project_id } = req.params;

    const { error } = await supabase
      .from('project_datasets')
      .delete()
      .eq('project_id', project_id)
      .eq('dataset_id', dataset_id);

    if (error) throw error;

    res.json({ success: true, message: 'Dataset removed from project' });
  } catch (error: any) {
    console.error('[Datasets] Remove from project error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
