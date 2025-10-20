/**
 * Workspaces API Routes
 * Handles workspace restore and permanent delete operations
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Lazy-load Supabase client
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
 * Restore soft deleted workspace
 * POST /api/workspaces/:workspace_id/restore
 */
router.post('/:workspace_id/restore', async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Use restore function
    const { data, error } = await getSupabaseClient()
      .rpc('restore_deleted', {
        p_table_name: 'workspaces',
        p_record_id: workspace_id
      });

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Workspace not found or not deleted' });
    }

    res.json({ success: true, message: 'Workspace restored' });
  } catch (error: any) {
    console.error('[Workspaces] Restore error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get soft deleted workspaces for a project
 * GET /api/workspaces/deleted/:project_id
 */
router.get('/deleted/:project_id', async (req, res) => {
  try {
    const { project_id } = req.params;

    const { data, error } = await getSupabaseClient()
      .from('workspaces')
      .select('*')
      .eq('project_id', project_id)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) throw error;

    res.json({ workspaces: data || [] });
  } catch (error: any) {
    console.error('[Workspaces] Get deleted error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Permanently delete workspace (only if already soft deleted)
 * DELETE /api/workspaces/:workspace_id/permanent
 */
router.delete('/:workspace_id/permanent', async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Use permanent delete function
    const { data, error } = await getSupabaseClient()
      .rpc('permanent_delete', {
        p_table_name: 'workspaces',
        p_record_id: workspace_id
      });

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Workspace not found or not soft deleted' });
    }

    res.json({ success: true, message: 'Workspace permanently deleted' });
  } catch (error: any) {
    console.error('[Workspaces] Permanent delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
