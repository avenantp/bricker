/**
 * Change Tracking Middleware
 * Automatically tracks changes to datasets, columns, and lineage
 */

import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export interface ChangeTrackingContext {
  userId: string;
  datasetId: string;
  entityType: 'dataset' | 'column' | 'lineage';
  entityId: string;
  oldValue?: any;
}

/**
 * Middleware to inject change tracking helpers into request
 */
export function changeTrackingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Add tracking helper to request
  (req as any).trackChange = async (
    context: ChangeTrackingContext,
    changeType: 'insert' | 'update' | 'delete',
    newValue?: any
  ) => {
    try {
      await supabase.from('metadata_changes').insert({
        dataset_id: context.datasetId,
        entity_type: context.entityType,
        entity_id: context.entityId,
        change_type: changeType,
        old_value: context.oldValue || null,
        new_value: newValue || null,
        changed_by: context.userId,
        changed_at: new Date().toISOString(),
      });

      console.log(
        `[Change Tracking] Tracked ${changeType} on ${context.entityType} ${context.entityId}`
      );
    } catch (error) {
      console.error('[Change Tracking] Error:', error);
      // Don't fail the request if tracking fails
    }
  };

  // Add helper to mark dataset as uncommitted
  (req as any).markDatasetUncommitted = async (datasetId: string) => {
    try {
      await supabase
        .from('datasets')
        .update({
          has_uncommitted_changes: true,
          sync_status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', datasetId);

      console.log(`[Change Tracking] Marked dataset ${datasetId} as uncommitted`);
    } catch (error) {
      console.error('[Change Tracking] Error marking dataset:', error);
    }
  };

  next();
}

/**
 * Middleware to log all requests
 */
export function requestLoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const start = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor =
      res.statusCode >= 500
        ? '\x1b[31m' // red
        : res.statusCode >= 400
          ? '\x1b[33m' // yellow
          : res.statusCode >= 300
            ? '\x1b[36m' // cyan
            : '\x1b[32m'; // green

    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${statusColor}${res.statusCode}\x1b[0m ${duration}ms`
    );
  });

  next();
}

/**
 * Middleware to validate authentication
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  // In a real implementation, verify the JWT token here
  // For now, we'll assume the frontend handles auth via Supabase client

  next();
}

/**
 * Middleware to validate user has access to workspace
 */
export async function workspaceAccessMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const workspaceId = req.params.workspace_id;
    const userId = req.body.user_id || (req as any).user?.id;

    if (!workspaceId) {
      return next();
    }

    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    // Check if user has access to workspace
    const { data: member, error } = await supabase
      .from('workspace_members')
      .select('role')
      .eq('workspace_id', workspaceId)
      .eq('user_id', userId)
      .single();

    if (error || !member) {
      return res
        .status(403)
        .json({ error: 'Forbidden: You do not have access to this workspace' });
    }

    // Attach role to request for later use
    (req as any).userRole = member.role;

    next();
  } catch (error: any) {
    console.error('[Workspace Access] Error:', error);
    res.status(500).json({ error: 'Failed to verify workspace access' });
  }
}

/**
 * Middleware to validate user can modify a resource
 */
export function canModifyMiddleware(req: Request, res: Response, next: NextFunction) {
  const userRole = (req as any).userRole;

  if (!userRole) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only admin and editor can modify resources
  if (userRole === 'viewer') {
    return res
      .status(403)
      .json({ error: 'Forbidden: Viewers cannot modify resources' });
  }

  next();
}

/**
 * Async error handler wrapper
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
