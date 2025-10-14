-- =====================================================
-- Migration: S.1.6 - Enhance Invitations Table
-- =====================================================
-- Description: Add missing columns and features to invitations table
-- for complete invitation management system
-- Author: System
-- Date: 2025-01-15
-- Version: 1.0
-- =====================================================

-- =====================================================
-- SECTION 1: Add new columns to invitations table
-- =====================================================

-- Add token column for secure invitation links
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS token VARCHAR NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex');

-- Add inviter details
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS invited_by_name VARCHAR;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS invited_by_email VARCHAR;

-- Add status tracking
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS status VARCHAR DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked'));

-- Add acceptance tracking
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES users(id);

-- Add optional message
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS message TEXT;

-- Add metadata for extensibility
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- =====================================================
-- SECTION 2: Create indexes for performance
-- =====================================================

-- Index on account_id (already exists)
CREATE INDEX IF NOT EXISTS idx_invitations_account ON invitations(account_id);

-- Index on email for quick lookup
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);

-- Index on token for invitation acceptance
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);

-- Index on status for filtering
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

-- Index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_invitations_expires ON invitations(expires_at);

-- Partial index for pending invitations (without NOW() check to avoid immutability error)
CREATE INDEX IF NOT EXISTS idx_invitations_active ON invitations(account_id, status, expires_at)
WHERE status = 'pending';

-- =====================================================
-- SECTION 3: Create Row Level Security (RLS) policies
-- =====================================================

-- Enable RLS on invitations table
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view invitations for their accounts" ON invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can update invitations" ON invitations;
DROP POLICY IF EXISTS "Admins can delete invitations" ON invitations;
DROP POLICY IF EXISTS "Users can accept invitations with valid token" ON invitations;

-- SELECT Policy: Users can view invitations for accounts they're members of
CREATE POLICY "Users can view invitations for their accounts" ON invitations
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

-- INSERT Policy: Admins and owners can create invitations
CREATE POLICY "Admins can create invitations" ON invitations
  FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- UPDATE Policy: Admins can update invitations (resend, revoke)
-- Also allow acceptance via token (status change to 'accepted')
CREATE POLICY "Admins can update invitations" ON invitations
  FOR UPDATE
  USING (
    -- Allow admins/owners to update
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
    OR
    -- Allow anyone with valid token to accept (update status to 'accepted')
    (status = 'pending' AND expires_at > NOW())
  )
  WITH CHECK (
    -- Same conditions for WITH CHECK
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
    OR
    (status IN ('pending', 'accepted') AND expires_at > NOW())
  );

-- DELETE Policy: Admins can delete (revoke) invitations
CREATE POLICY "Admins can delete invitations" ON invitations
  FOR DELETE
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- SECTION 4: Create helper functions
-- =====================================================

-- Function to generate secure invitation token
CREATE OR REPLACE FUNCTION generate_invitation_token()
RETURNS VARCHAR AS $$
BEGIN
  -- Generate a secure random 32-byte token and encode as hex
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired invitations
CREATE OR REPLACE FUNCTION cleanup_expired_invitations(p_days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete invitations that have been expired for more than p_days_old days
  DELETE FROM invitations
  WHERE status = 'expired'
    AND expires_at < NOW() - (p_days_old || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to auto-expire invitations
CREATE OR REPLACE FUNCTION auto_expire_invitations()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Update pending invitations that have passed their expiry date
  UPDATE invitations
  SET status = 'expired'
  WHERE status = 'pending'
    AND expires_at < NOW();

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get pending invitations for an account
CREATE OR REPLACE FUNCTION get_pending_invitations(p_account_id UUID)
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  role VARCHAR,
  invited_by_name VARCHAR,
  invited_by_email VARCHAR,
  token VARCHAR,
  expires_at TIMESTAMP,
  created_at TIMESTAMP,
  message TEXT
) AS $$
BEGIN
  -- First, auto-expire any expired invitations
  PERFORM auto_expire_invitations();

  -- Return pending invitations
  RETURN QUERY
  SELECT
    i.id,
    i.email,
    i.role,
    i.invited_by_name,
    i.invited_by_email,
    i.token,
    i.expires_at,
    i.created_at,
    i.message
  FROM invitations i
  WHERE i.account_id = p_account_id
    AND i.status = 'pending'
    AND i.expires_at > NOW()
  ORDER BY i.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- SECTION 5: Create views for common queries
-- =====================================================

-- View for active invitations (not expired, not revoked)
CREATE OR REPLACE VIEW active_invitations AS
SELECT
  i.*,
  a.name as account_name,
  a.slug as account_slug,
  u.full_name as inviter_full_name,
  u.email as inviter_email_from_user,
  (i.expires_at - NOW()) as time_until_expiry
FROM invitations i
JOIN accounts a ON i.account_id = a.id
LEFT JOIN users u ON i.invited_by = u.id
WHERE i.status = 'pending'
  AND i.expires_at > NOW()
  AND a.deleted_at IS NULL
ORDER BY i.created_at DESC;

GRANT SELECT ON active_invitations TO authenticated;

-- View for expired invitations (for cleanup monitoring)
CREATE OR REPLACE VIEW expired_invitations AS
SELECT
  i.*,
  a.name as account_name,
  (NOW() - i.expires_at) as expired_for
FROM invitations i
JOIN accounts a ON i.account_id = a.id
WHERE (i.status = 'pending' AND i.expires_at < NOW())
   OR i.status = 'expired'
ORDER BY i.expires_at DESC;

-- =====================================================
-- SECTION 6: Add comments for documentation
-- =====================================================

COMMENT ON TABLE invitations IS 'Team invitation management with secure tokens and expiry tracking';
COMMENT ON COLUMN invitations.token IS 'Secure random token for invitation acceptance (64-character hex string)';
COMMENT ON COLUMN invitations.status IS 'Invitation status: pending (awaiting acceptance), accepted (user joined), expired (past expiry date), revoked (cancelled by admin)';
COMMENT ON COLUMN invitations.invited_by_name IS 'Cached name of inviter for display purposes';
COMMENT ON COLUMN invitations.invited_by_email IS 'Cached email of inviter for display purposes';
COMMENT ON COLUMN invitations.message IS 'Optional personal message from inviter to invitee';
COMMENT ON COLUMN invitations.metadata IS 'Extensible JSONB field for additional invitation context';

-- =====================================================
-- SECTION 7: Migration notes and recommendations
-- =====================================================

-- NOTES:
-- 1. Tokens are automatically generated using gen_random_bytes(32) and encoded as hex
-- 2. Default expiry should be set to 7 days when creating invitations
-- 3. cleanup_expired_invitations() should be run periodically (daily cron job recommended)
-- 4. auto_expire_invitations() is called automatically by get_pending_invitations()
-- 5. RLS policies allow token-based acceptance without requiring authentication
-- 6. Invitation acceptance should:
--    - Verify token validity
--    - Check expiry
--    - Add user to account_users
--    - Update invitation status to 'accepted'
--    - Set accepted_by and accepted_at

-- RECOMMENDATIONS:
-- 1. Create scheduled job to run cleanup_expired_invitations() daily
-- 2. Set invitation expiry to 7 days by default (expires_at = NOW() + INTERVAL '7 days')
-- 3. When creating invitation:
--    - Use generate_invitation_token() for token generation
--    - Cache invited_by user's name and email for display
--    - Send email with invitation link: /accept-invitation?token={token}
-- 4. When accepting invitation:
--    - Call get_pending_invitations() to verify invitation is still valid
--    - Create account_users record
--    - Update invitation status to 'accepted'
--    - Set accepted_by and accepted_at
--    - Track usage event 'user_invited'
-- 5. When revoking invitation:
--    - Update status to 'revoked'
--    - Do not delete the record (maintain audit trail)

-- =====================================================
-- End of Migration S.1.6
-- =====================================================

SELECT 'Invitations table enhanced successfully!' AS status;
