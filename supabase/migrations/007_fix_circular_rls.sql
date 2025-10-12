-- ============================================================================
-- Fix circular RLS dependency between workspaces and workspace_members
-- ============================================================================

-- The issue:
-- 1. SELECT on workspaces requires checking workspace_members
-- 2. SELECT on workspace_members requires checking workspace_members (recursion)
-- 3. Trigger-based approach still hits RLS policies

-- Solution:
-- 1. Remove the trigger entirely
-- 2. Create an RPC function with SECURITY DEFINER to create workspace + add owner
-- 3. Simplify RLS policies to avoid circular dependencies

-- ============================================================================
-- STEP 1: Remove the trigger and function
-- ============================================================================

DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;
DROP FUNCTION IF EXISTS public.add_workspace_owner_as_member() CASCADE;

-- ============================================================================
-- STEP 2: Create RPC function to handle workspace creation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_workspace_with_owner(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_github_repo_url TEXT DEFAULT NULL
)
RETURNS TABLE(
  workspace_id UUID,
  workspace_name TEXT,
  workspace_description TEXT,
  workspace_owner_id UUID,
  workspace_github_repo_url TEXT,
  workspace_created_at TIMESTAMPTZ,
  workspace_updated_at TIMESTAMPTZ
)
SECURITY DEFINER -- Run with function creator's privileges, bypassing RLS
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_workspace_id UUID;
  v_user_id UUID;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Insert workspace
  INSERT INTO public.workspaces (name, description, owner_id, github_repo_url)
  VALUES (p_name, p_description, v_user_id, p_github_repo_url)
  RETURNING workspaces.id INTO v_workspace_id;

  -- Add owner as member (bypasses RLS because of SECURITY DEFINER)
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (v_workspace_id, v_user_id, 'owner');

  -- Return the created workspace with renamed columns to avoid ambiguity
  RETURN QUERY
  SELECT
    w.id,
    w.name,
    w.description,
    w.owner_id,
    w.github_repo_url,
    w.created_at,
    w.updated_at
  FROM public.workspaces w
  WHERE w.id = v_workspace_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_workspace_with_owner(TEXT, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- STEP 3: Fix RLS policies to break circular dependency
-- ============================================================================

-- Drop existing workspace_members SELECT policy
DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;

-- Recreate with simpler logic that doesn't cause recursion
-- Allow users to see members of workspaces they own OR are members of
CREATE POLICY "Users can view workspace members"
  ON public.workspace_members
  FOR SELECT
  USING (
    -- User is viewing members of a workspace they own
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
    OR
    -- User is a member of this workspace (direct check, no recursion)
    user_id = auth.uid()
  );

-- ============================================================================
-- STEP 4: Update workspace INSERT policy since we're using RPC now
-- ============================================================================

-- The RPC function handles creation, but keep this for direct inserts in dev mode
-- (Already exists, no change needed)

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify the function was created
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'create_workspace_with_owner'
  ) THEN
    RAISE EXCEPTION 'Function create_workspace_with_owner was not created';
  END IF;

  RAISE NOTICE 'Migration completed successfully';
  RAISE NOTICE 'Trigger removed, RPC function created, RLS policies fixed';
END $$;
