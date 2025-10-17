/**
 * Project Connections Routes
 *
 * Endpoints for managing connections associated with projects via project_connections junction table
 */

import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env' });

const router = Router();

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * GET /api/projects/:projectId/connections
 * Get all connections linked to a project
 */
router.get('/:projectId/connections', async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.headers['x-user-id'] as string;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // Get connections linked to this project via project_connections
      const { data, error, count } = await supabase
        .from('project_connections')
        .select(`
          id,
          created_at,
          connection:connections (
            *,
            owner:users!owner_id(id, full_name, email)
          )
        `, { count: 'exact' })
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Project Connections] Error fetching project connections:', error);
        return res.status(500).json({ error: error.message });
      }

      // Transform the data to return connection objects with project_connection_id
      const connections = data?.map((pc: any) => ({
        ...pc.connection,
        project_connection_id: pc.id,
        linked_at: pc.created_at
      })) || [];

      res.json({
        data: connections,
        total: count || 0
      });
    } catch (error: any) {
      console.error('[Project Connections] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * POST /api/projects/:projectId/connections
   * Link an existing connection to a project
   */
  router.post('/:projectId/connections', async (req, res) => {
    try {
      const { projectId } = req.params;
      const { connection_id } = req.body;
      const userId = req.headers['x-user-id'] as string;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      if (!connection_id) {
        return res.status(400).json({ error: 'connection_id is required' });
      }

      // Create project connection link
      const { data, error } = await supabase
        .from('project_connections')
        .insert({
          project_id: projectId,
          connection_id: connection_id,
          created_by: userId
        })
        .select()
        .single();

      if (error) {
        console.error('[Project Connections] Error linking connection to project:', error);

        // Check for unique constraint violation
        if (error.code === '23505') {
          return res.status(409).json({ error: 'Connection is already linked to this project' });
        }

        return res.status(500).json({ error: error.message });
      }

      res.status(201).json(data);
    } catch (error: any) {
      console.error('[Project Connections] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * DELETE /api/projects/:projectId/connections/:connectionId
   * Unlink a connection from a project
   */
  router.delete('/:projectId/connections/:connectionId', async (req, res) => {
    try {
      const { projectId, connectionId } = req.params;
      const userId = req.headers['x-user-id'] as string;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const { error } = await supabase
        .from('project_connections')
        .delete()
        .eq('project_id', projectId)
        .eq('connection_id', connectionId);

      if (error) {
        console.error('[Project Connections] Error unlinking connection from project:', error);
        return res.status(500).json({ error: error.message });
      }

      res.status(204).send();
    } catch (error: any) {
      console.error('[Project Connections] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  /**
   * GET /api/projects/:projectId/connections/available
   * Get all account connections that are NOT yet linked to this project
   */
  router.get('/:projectId/connections/available', async (req, res) => {
    try {
      const { projectId } = req.params;
      const userId = req.headers['x-user-id'] as string;

      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // First, get the project's account_id
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('account_id')
        .eq('id', projectId)
        .single();

      if (projectError) {
        console.error('[Project Connections] Error fetching project:', projectError);
        return res.status(500).json({ error: projectError.message });
      }

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      // Get all account connections
      const { data: allConnections, error: connectionsError } = await supabase
        .from('connections')
        .select(`
          *,
          owner:users!owner_id(id, full_name, email)
        `)
        .eq('account_id', project.account_id)
        .order('name', { ascending: true });

      if (connectionsError) {
        console.error('[Project Connections] Error fetching connections:', connectionsError);
        return res.status(500).json({ error: connectionsError.message });
      }

      // Get already linked connections for this project
      const { data: linkedConnections, error: linkedError } = await supabase
        .from('project_connections')
        .select('connection_id')
        .eq('project_id', projectId);

      if (linkedError) {
        console.error('[Project Connections] Error fetching linked connections:', linkedError);
        return res.status(500).json({ error: linkedError.message });
      }

      // Filter out already linked connections
      const linkedIds = new Set(linkedConnections?.map((pc: any) => pc.connection_id) || []);
      const availableConnections = allConnections?.filter(
        (conn: any) => !linkedIds.has(conn.id)
      ) || [];

      res.json({
        data: availableConnections,
        total: availableConnections.length
      });
    } catch (error: any) {
      console.error('[Project Connections] Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

export default router;
