-- ============================================================================
-- Backfill missing users and fix create_workspace_with_owner function
-- ============================================================================

-- The issue:
-- Users who signed up before the handle_new_user trigger was created
-- don't have records in public.users table, causing foreign key violations

-- Solution:
-- 1. Backfill any missing users from auth.users to public.users
-- 2. Update create_workspace_with_owner to auto-create user record if missing

-- ============================================================================
-- STEP 1: Backfill missing users
-- ============================================================================

INSERT INTO public.users (id, email, full_name, avatar_url)
SELECT
  au.id,
  au.email,
  au.raw_user_meta_data->>'full_name',
  au.raw_user_meta_data->>'avatar_url'
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STEP 2: Update create_workspace_with_owner to handle missing users
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

  -- Ensure user exists in public.users table
  -- This handles cases where user signed up before trigger was created
  INSERT INTO public.users (id, email, full_name, avatar_url)
  SELECT
    au.id,
    au.email,
    au.raw_user_meta_data->>'full_name',
    au.raw_user_meta_data->>'avatar_url'
  FROM auth.users au
  WHERE au.id = v_user_id
  ON CONFLICT (id) DO NOTHING;

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
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  auth_user_count INTEGER;
  public_user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO auth_user_count FROM auth.users;
  SELECT COUNT(*) INTO public_user_count FROM public.users;

  RAISE NOTICE 'Migration completed successfully';
  RAISE NOTICE 'Auth users: %, Public users: %', auth_user_count, public_user_count;

  IF auth_user_count != public_user_count THEN
    RAISE WARNING 'Mismatch between auth.users (%) and public.users (%)', auth_user_count, public_user_count;
  END IF;
END $$;
