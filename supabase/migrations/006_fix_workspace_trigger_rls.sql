-- ============================================================================
-- Fix infinite recursion caused by workspace owner trigger
-- ============================================================================

-- The issue: When a workspace is created, a trigger automatically adds the
-- owner as a member. This INSERT triggers the RLS policy which checks
-- workspace_members, causing infinite recursion.

-- Solution: Modify the trigger function to use SECURITY DEFINER so it
-- bypasses RLS policies

-- Drop and recreate the function with SECURITY DEFINER
DROP FUNCTION IF EXISTS public.add_workspace_owner_as_member() CASCADE;

CREATE OR REPLACE FUNCTION public.add_workspace_owner_as_member()
RETURNS TRIGGER
SECURITY DEFINER -- This makes the function run with the permissions of the function creator (bypassing RLS)
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;

CREATE TRIGGER on_workspace_created
  AFTER INSERT ON public.workspaces
  FOR EACH ROW
  EXECUTE FUNCTION public.add_workspace_owner_as_member();

-- Also update the RLS policy to be simpler since the trigger handles owner addition
DROP POLICY IF EXISTS "Owners and admins can add members" ON public.workspace_members;

CREATE POLICY "Owners and admins can add members"
  ON public.workspace_members
  FOR INSERT
  WITH CHECK (
    -- Allow if user is workspace owner OR admin/owner member
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = workspace_members.workspace_id
        AND user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );
