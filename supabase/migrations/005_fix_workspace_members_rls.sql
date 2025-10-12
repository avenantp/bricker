-- ============================================================================
-- Fix infinite recursion in workspace_members RLS policies
-- ============================================================================

-- Drop the problematic INSERT policy
DROP POLICY IF EXISTS "Owners and admins can add members" ON public.workspace_members;

-- Create new INSERT policy that allows:
-- 1. Workspace owners to add members (checked via workspaces table to avoid recursion)
-- 2. Users to add themselves as owner when creating a workspace
CREATE POLICY "Owners and admins can add members"
  ON public.workspace_members
  FOR INSERT
  WITH CHECK (
    -- Allow if user is the workspace owner (check via workspaces table)
    workspace_id IN (
      SELECT id
      FROM public.workspaces
      WHERE owner_id = auth.uid()
    )
    OR
    -- Allow if user is already a workspace member with owner/admin role
    workspace_id IN (
      SELECT workspace_id
      FROM public.workspace_members
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );
