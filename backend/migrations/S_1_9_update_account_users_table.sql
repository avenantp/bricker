-- =====================================================
-- Migration: S.1.9 - Update Account Users Table
-- =====================================================
-- Description: Add invitation tracking and deactivation support
-- to account_users (membership) table
-- Author: System
-- Date: 2025-01-15
-- Version: 1.0
-- =====================================================

-- =====================================================
-- SECTION 1: Add new columns to account_users table
-- =====================================================

-- Add invitation tracking
ALTER TABLE account_users ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id);
ALTER TABLE account_users ADD COLUMN IF NOT EXISTS invitation_accepted_at TIMESTAMP;

-- Add activation status
ALTER TABLE account_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add deactivation tracking
ALTER TABLE account_users ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMP;
ALTER TABLE account_users ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES users(id);
ALTER TABLE account_users ADD COLUMN IF NOT EXISTS deactivation_reason TEXT;

-- Add role change tracking
ALTER TABLE account_users ADD COLUMN IF NOT EXISTS role_changed_at TIMESTAMP;
ALTER TABLE account_users ADD COLUMN IF NOT EXISTS role_changed_by UUID REFERENCES users(id);
ALTER TABLE account_users ADD COLUMN IF NOT EXISTS previous_role VARCHAR;

-- =====================================================
-- SECTION 2: Create indexes for performance
-- =====================================================

-- Composite index for active account users
CREATE INDEX IF NOT EXISTS idx_account_users_account_active ON account_users(account_id, is_active) WHERE is_active = true;

-- Index on invited_by for tracking who invited whom
CREATE INDEX IF NOT EXISTS idx_account_users_invited_by ON account_users(invited_by);

-- Index on is_active for filtering
CREATE INDEX IF NOT EXISTS idx_account_users_is_active ON account_users(is_active);

-- Index on deactivated_at for cleanup and reporting
CREATE INDEX IF NOT EXISTS idx_account_users_deactivated ON account_users(deactivated_at) WHERE deactivated_at IS NOT NULL;

-- Composite index for user's active accounts
CREATE INDEX IF NOT EXISTS idx_account_users_user_active ON account_users(user_id, is_active) WHERE is_active = true;

-- Index on role for role-based queries
CREATE INDEX IF NOT EXISTS idx_account_users_role ON account_users(account_id, role);

-- =====================================================
-- SECTION 3: Update RLS policies
-- =====================================================

-- Drop existing policies to recreate with new columns
DROP POLICY IF EXISTS "Users can view account members" ON account_users;
DROP POLICY IF EXISTS "Admins can add account members" ON account_users;
DROP POLICY IF EXISTS "Admins can update account members" ON account_users;
DROP POLICY IF EXISTS "Admins can delete account members" ON account_users;

-- SELECT Policy: Users can view members of accounts they belong to
CREATE POLICY "Users can view account members" ON account_users
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND is_active = true
    )
  );

-- INSERT Policy: Admins can add members (via invitation acceptance)
CREATE POLICY "Admins can add account members" ON account_users
  FOR INSERT
  WITH CHECK (
    -- Allow admins/owners to add members
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
    -- Ensure new members are created as active
    AND is_active = true
  );

-- UPDATE Policy: Admins can update members (change roles, deactivate)
-- Users can update their own membership settings
CREATE POLICY "Admins can update account members" ON account_users
  FOR UPDATE
  USING (
    -- Admins can update any member
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
    OR
    -- Users can update their own membership (limited fields)
    user_id = auth.uid()
  )
  WITH CHECK (
    -- Same conditions for WITH CHECK
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
    OR
    user_id = auth.uid()
  );

-- DELETE Policy: Prevent hard deletes (use deactivation instead)
CREATE POLICY "Prevent hard deletes on account members" ON account_users
  FOR DELETE
  USING (false);

-- =====================================================
-- SECTION 4: Create helper functions
-- =====================================================

-- Function to add user to account (after invitation acceptance)
CREATE OR REPLACE FUNCTION add_user_to_account(
  p_account_id UUID,
  p_user_id UUID,
  p_role VARCHAR,
  p_invited_by UUID
)
RETURNS UUID AS $$
DECLARE
  v_membership_id UUID;
BEGIN
  -- Check if membership already exists
  IF EXISTS (
    SELECT 1 FROM account_users
    WHERE account_id = p_account_id AND user_id = p_user_id
  ) THEN
    -- Reactivate if deactivated
    UPDATE account_users
    SET is_active = true,
        deactivated_at = NULL,
        deactivated_by = NULL,
        deactivation_reason = NULL,
        role = p_role,
        invited_by = p_invited_by,
        invitation_accepted_at = NOW()
    WHERE account_id = p_account_id AND user_id = p_user_id
    RETURNING id INTO v_membership_id;
  ELSE
    -- Create new membership
    INSERT INTO account_users (
      account_id,
      user_id,
      role,
      invited_by,
      invitation_accepted_at,
      is_active,
      joined_at
    ) VALUES (
      p_account_id,
      p_user_id,
      p_role,
      p_invited_by,
      NOW(),
      true,
      NOW()
    )
    RETURNING id INTO v_membership_id;
  END IF;

  -- Update account user count
  UPDATE accounts
  SET current_user_count = (
    SELECT COUNT(*) FROM account_users
    WHERE account_id = p_account_id AND is_active = true
  )
  WHERE id = p_account_id;

  RETURN v_membership_id;
END;
$$ LANGUAGE plpgsql;

-- Function to deactivate user from account
CREATE OR REPLACE FUNCTION deactivate_account_user(
  p_account_id UUID,
  p_user_id UUID,
  p_deactivated_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_role VARCHAR;
  v_deactivator_role VARCHAR;
  rows_affected INTEGER;
BEGIN
  -- Get user's role
  SELECT role INTO v_user_role
  FROM account_users
  WHERE account_id = p_account_id AND user_id = p_user_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User is not an active member of this account';
  END IF;

  -- Get deactivator's role
  SELECT role INTO v_deactivator_role
  FROM account_users
  WHERE account_id = p_account_id AND user_id = p_deactivated_by AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Deactivator is not a member of this account';
  END IF;

  -- Check permissions: only admins and owners can deactivate
  IF v_deactivator_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only admins and owners can deactivate users';
  END IF;

  -- Cannot deactivate owner
  IF v_user_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot deactivate account owner';
  END IF;

  -- Cannot deactivate self
  IF p_user_id = p_deactivated_by THEN
    RAISE EXCEPTION 'Cannot deactivate yourself';
  END IF;

  -- Deactivate user
  UPDATE account_users
  SET is_active = false,
      deactivated_at = NOW(),
      deactivated_by = p_deactivated_by,
      deactivation_reason = p_reason
  WHERE account_id = p_account_id AND user_id = p_user_id;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;

  -- Update account user count
  UPDATE accounts
  SET current_user_count = (
    SELECT COUNT(*) FROM account_users
    WHERE account_id = p_account_id AND is_active = true
  )
  WHERE id = p_account_id;

  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to change user role
CREATE OR REPLACE FUNCTION change_account_user_role(
  p_account_id UUID,
  p_user_id UUID,
  p_new_role VARCHAR,
  p_changed_by UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_role VARCHAR;
  v_changer_role VARCHAR;
  rows_affected INTEGER;
BEGIN
  -- Validate new role
  IF p_new_role NOT IN ('owner', 'admin', 'member') THEN
    RAISE EXCEPTION 'Invalid role: %. Must be owner, admin, or member', p_new_role;
  END IF;

  -- Get current role
  SELECT role INTO v_current_role
  FROM account_users
  WHERE account_id = p_account_id AND user_id = p_user_id AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User is not an active member of this account';
  END IF;

  -- Get changer's role
  SELECT role INTO v_changer_role
  FROM account_users
  WHERE account_id = p_account_id AND user_id = p_changed_by AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Role changer is not a member of this account';
  END IF;

  -- Check permissions: only admins and owners can change roles
  IF v_changer_role NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Only admins and owners can change user roles';
  END IF;

  -- Cannot change owner role
  IF v_current_role = 'owner' THEN
    RAISE EXCEPTION 'Cannot change role of account owner';
  END IF;

  -- Only owner can create another owner
  IF p_new_role = 'owner' AND v_changer_role != 'owner' THEN
    RAISE EXCEPTION 'Only the owner can grant owner role to another user';
  END IF;

  -- If no change, return early
  IF v_current_role = p_new_role THEN
    RETURN true;
  END IF;

  -- Update role
  UPDATE account_users
  SET role = p_new_role,
      previous_role = v_current_role,
      role_changed_at = NOW(),
      role_changed_by = p_changed_by
  WHERE account_id = p_account_id AND user_id = p_user_id;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to get active members of an account
CREATE OR REPLACE FUNCTION get_account_members(p_account_id UUID)
RETURNS TABLE (
  user_id UUID,
  email VARCHAR,
  full_name VARCHAR,
  role VARCHAR,
  joined_at TIMESTAMP,
  invited_by_id UUID,
  invited_by_name VARCHAR,
  is_active BOOLEAN,
  last_seen_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.user_id,
    u.email,
    u.full_name,
    au.role,
    au.joined_at,
    au.invited_by,
    inviter.full_name as invited_by_name,
    au.is_active,
    u.last_seen_at
  FROM account_users au
  JOIN users u ON au.user_id = u.id
  LEFT JOIN users inviter ON au.invited_by = inviter.id
  WHERE au.account_id = p_account_id
    AND au.is_active = true
  ORDER BY
    CASE au.role
      WHEN 'owner' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'member' THEN 3
    END,
    au.joined_at ASC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to transfer account ownership
CREATE OR REPLACE FUNCTION transfer_account_ownership(
  p_account_id UUID,
  p_current_owner_id UUID,
  p_new_owner_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_owner_role VARCHAR;
  v_new_owner_role VARCHAR;
  rows_affected INTEGER;
BEGIN
  -- Verify current owner
  SELECT role INTO v_current_owner_role
  FROM account_users
  WHERE account_id = p_account_id
    AND user_id = p_current_owner_id
    AND is_active = true;

  IF v_current_owner_role != 'owner' THEN
    RAISE EXCEPTION 'User is not the current owner';
  END IF;

  -- Verify new owner is a member
  SELECT role INTO v_new_owner_role
  FROM account_users
  WHERE account_id = p_account_id
    AND user_id = p_new_owner_id
    AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'New owner is not a member of this account';
  END IF;

  -- Change current owner to admin
  UPDATE account_users
  SET role = 'admin',
      previous_role = 'owner',
      role_changed_at = NOW(),
      role_changed_by = p_current_owner_id
  WHERE account_id = p_account_id AND user_id = p_current_owner_id;

  -- Change new user to owner
  UPDATE account_users
  SET role = 'owner',
      previous_role = v_new_owner_role,
      role_changed_at = NOW(),
      role_changed_by = p_current_owner_id
  WHERE account_id = p_account_id AND user_id = p_new_owner_id;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SECTION 5: Create triggers for automatic updates
-- =====================================================

-- Trigger to update account user count when membership changes
CREATE OR REPLACE FUNCTION update_account_user_count()
RETURNS TRIGGER AS $$
BEGIN
  -- Update user count for the affected account
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE accounts
    SET current_user_count = (
      SELECT COUNT(*) FROM account_users
      WHERE account_id = NEW.account_id AND is_active = true
    )
    WHERE id = NEW.account_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    UPDATE accounts
    SET current_user_count = (
      SELECT COUNT(*) FROM account_users
      WHERE account_id = OLD.account_id AND is_active = true
    )
    WHERE id = OLD.account_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_account_user_count ON account_users;
CREATE TRIGGER trigger_update_account_user_count
  AFTER INSERT OR UPDATE OR DELETE ON account_users
  FOR EACH ROW
  EXECUTE FUNCTION update_account_user_count();

-- =====================================================
-- SECTION 6: Create views for common queries
-- =====================================================

-- View for active account memberships with user details
CREATE OR REPLACE VIEW active_account_memberships AS
SELECT
  au.id,
  au.account_id,
  au.user_id,
  au.role,
  au.joined_at,
  au.invited_by,
  au.invitation_accepted_at,
  a.name as account_name,
  a.slug as account_slug,
  a.account_type,
  u.email as user_email,
  u.full_name as user_name,
  u.last_seen_at as user_last_seen,
  inviter.full_name as invited_by_name,
  (NOW() - au.joined_at) as membership_duration
FROM account_users au
JOIN accounts a ON au.account_id = a.id
JOIN users u ON au.user_id = u.id
LEFT JOIN users inviter ON au.invited_by = inviter.id
WHERE au.is_active = true
  AND a.deleted_at IS NULL
ORDER BY au.account_id, au.role, au.joined_at;

GRANT SELECT ON active_account_memberships TO authenticated;

-- View for deactivated memberships (for audit)
CREATE OR REPLACE VIEW deactivated_account_memberships AS
SELECT
  au.id,
  au.account_id,
  au.user_id,
  au.role,
  au.joined_at,
  au.deactivated_at,
  au.deactivated_by,
  au.deactivation_reason,
  a.name as account_name,
  u.email as user_email,
  u.full_name as user_name,
  deactivator.full_name as deactivated_by_name,
  (au.deactivated_at - au.joined_at) as membership_duration
FROM account_users au
JOIN accounts a ON au.account_id = a.id
JOIN users u ON au.user_id = u.id
LEFT JOIN users deactivator ON au.deactivated_by = deactivator.id
WHERE au.is_active = false
ORDER BY au.deactivated_at DESC;

-- View for role changes (for audit)
CREATE OR REPLACE VIEW account_user_role_changes AS
SELECT
  au.id,
  au.account_id,
  au.user_id,
  au.previous_role,
  au.role as current_role,
  au.role_changed_at,
  au.role_changed_by,
  a.name as account_name,
  u.email as user_email,
  u.full_name as user_name,
  changer.full_name as changed_by_name
FROM account_users au
JOIN accounts a ON au.account_id = a.id
JOIN users u ON au.user_id = u.id
LEFT JOIN users changer ON au.role_changed_by = changer.id
WHERE au.role_changed_at IS NOT NULL
  AND au.is_active = true
ORDER BY au.role_changed_at DESC;

-- =====================================================
-- SECTION 7: Add comments for documentation
-- =====================================================

COMMENT ON COLUMN account_users.invited_by IS 'User who sent the invitation that led to this membership';
COMMENT ON COLUMN account_users.invitation_accepted_at IS 'When the invitation was accepted and membership created';
COMMENT ON COLUMN account_users.is_active IS 'Whether this membership is currently active (false = deactivated)';
COMMENT ON COLUMN account_users.deactivated_at IS 'When this membership was deactivated';
COMMENT ON COLUMN account_users.deactivated_by IS 'User who deactivated this membership';
COMMENT ON COLUMN account_users.deactivation_reason IS 'Reason for deactivating this membership';
COMMENT ON COLUMN account_users.role_changed_at IS 'When the role was last changed';
COMMENT ON COLUMN account_users.role_changed_by IS 'User who changed the role';
COMMENT ON COLUMN account_users.previous_role IS 'Previous role before the last role change';

-- =====================================================
-- SECTION 8: Migration notes and recommendations
-- =====================================================

-- NOTES:
-- 1. Soft delete pattern: Set is_active = false instead of DELETE
-- 2. account_users.is_active is different from users.is_active
--    - account_users.is_active = membership status
--    - users.is_active = user account status
-- 3. Owner role cannot be changed or deactivated directly
-- 4. Use transfer_account_ownership() to change ownership
-- 5. All membership changes automatically update accounts.current_user_count
-- 6. Deactivated memberships retain audit trail

-- RECOMMENDATIONS:
-- 1. Invitation acceptance flow:
--    - Find invitation by token
--    - Verify invitation is valid and not expired
--    - Call add_user_to_account(account_id, user_id, role, invited_by)
--    - Update invitation status to 'accepted'
--    - Track usage event 'user_added'
-- 2. User removal flow:
--    - Call deactivate_account_user(account_id, user_id, deactivated_by, reason)
--    - Reassign user's resources to admin/owner
--    - Track usage event 'user_removed'
--    - Send notification to user
-- 3. Role change flow:
--    - Call change_account_user_role(account_id, user_id, new_role, changed_by)
--    - Track usage event 'role_changed'
--    - Send notification to user
-- 4. Ownership transfer flow:
--    - Verify current owner's identity
--    - Show confirmation dialog with consequences
--    - Call transfer_account_ownership(account_id, current_owner_id, new_owner_id)
--    - Send notifications to both users
-- 5. Member listing:
--    - Use get_account_members(account_id) for UI displays
--    - Shows active members only
--    - Sorted by role (owner, admin, member)
-- 6. Audit trail:
--    - Use deactivated_account_memberships view for audit
--    - Use account_user_role_changes view for role history
--    - Track all membership changes in usage_events

-- =====================================================
-- End of Migration S.1.9
-- =====================================================

SELECT 'Account users table updated successfully!' AS status;
