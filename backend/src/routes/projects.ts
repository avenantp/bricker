/**
 * Projects API Routes
 * Handles project restore and permanent delete operations
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
 * Restore soft deleted project
 * POST /api/projects/:project_id/restore
 */
router.post('/:project_id/restore', async (req, res) => {
  try {
    const { project_id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Use restore function
    const { data, error } = await getSupabaseClient()
      .rpc('restore_deleted', {
        p_table_name: 'projects',
        p_record_id: project_id
      });

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Project not found or not deleted' });
    }

    res.json({ success: true, message: 'Project restored' });
  } catch (error: any) {
    console.error('[Projects] Restore error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get soft deleted projects for an account
 * GET /api/projects/deleted/:account_id
 */
router.get('/deleted/:account_id', async (req, res) => {
  try {
    const { account_id } = req.params;

    const { data, error } = await getSupabaseClient()
      .from('projects')
      .select('*')
      .eq('account_id', account_id)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) throw error;

    res.json({ projects: data || [] });
  } catch (error: any) {
    console.error('[Projects] Get deleted error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Permanently delete project (only if already soft deleted)
 * DELETE /api/projects/:project_id/permanent
 */
router.delete('/:project_id/permanent', async (req, res) => {
  try {
    const { project_id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Use permanent delete function
    const { data, error } = await getSupabaseClient()
      .rpc('permanent_delete', {
        p_table_name: 'projects',
        p_record_id: project_id
      });

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Project not found or not soft deleted' });
    }

    res.json({ success: true, message: 'Project permanently deleted' });
  } catch (error: any) {
    console.error('[Projects] Permanent delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
