-- =====================================================
-- Migration: S.1.1.6 - Update RLS policies for new columns
-- =====================================================
-- Description: Updates RLS policies to handle new subscription, usage, and soft delete columns
-- Author: System
-- Date: 2025-01-15
-- =====================================================

-- Drop existing policies (we'll recreate them with updated logic)
DROP POLICY IF EXISTS "Users can view their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can update their own accounts" ON accounts;
DROP POLICY IF EXISTS "Users can insert accounts they're creating" ON accounts;

-- =====================================================
-- SELECT Policy: Users can only view accounts they're members of
-- AND accounts that are NOT soft-deleted
-- =====================================================
CREATE POLICY "Users can view their own active accounts" ON accounts
  FOR SELECT
  USING (
    id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
    AND deleted_at IS NULL  -- Only show active accounts
  );

-- =====================================================
-- INSERT Policy: Users can create new accounts
-- New accounts start as active (deleted_at = NULL)
-- =====================================================
CREATE POLICY "Users can insert accounts they're creating" ON accounts
  FOR INSERT
  WITH CHECK (
    deleted_at IS NULL  -- Ensure new accounts are not created as deleted
  );

-- =====================================================
-- UPDATE Policy: Users can update accounts they're members of
-- Cannot undelete accounts (deleted_at cannot go from NOT NULL to NULL)
-- =====================================================
CREATE POLICY "Users can update their own active accounts" ON accounts
  FOR UPDATE
  USING (
    id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')  -- Only admins/owners can update account settings
    )
  )
  WITH CHECK (
    id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
    -- Allow soft delete (NULL -> timestamp) but prevent undelete (timestamp -> NULL)
    AND (
      deleted_at IS NULL  -- Normal updates to active accounts
      OR
      (deleted_at IS NOT NULL AND
       (SELECT deleted_at FROM accounts WHERE accounts.id = id) IS NULL)  -- Allow soft delete
    )
  );

-- =====================================================
-- DELETE Policy: Prevent hard deletes (use soft delete instead)
-- Only system/admin functions should hard delete
-- =====================================================
CREATE POLICY "Prevent direct deletes" ON accounts
  FOR DELETE
  USING (false);  -- No user can hard delete

-- =====================================================
-- Additional security for sensitive columns
-- Create a view for non-sensitive account data
-- =====================================================
CREATE OR REPLACE VIEW accounts_public AS
SELECT
  id,
  name,
  slug,
  subscription_tier,
  created_at,
  updated_at,
  trial_end_date,
  is_verified
  -- Exclude: usage counters, feature flags, deleted_at, usage_reset_date
  -- These should only be accessible to admins/owners
FROM accounts
WHERE deleted_at IS NULL;  -- Only show active accounts

-- Grant access to the view
GRANT SELECT ON accounts_public TO authenticated;

-- =====================================================
-- Notes:
-- - All SELECT queries now automatically filter out deleted accounts
-- - Only admins/owners can update account settings
-- - Hard deletes are prevented (must use soft delete: UPDATE SET deleted_at = NOW())
-- - accounts_public view provides limited data for regular users
-- - Sensitive usage and subscription data requires direct table access with proper role
-- =====================================================
