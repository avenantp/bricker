-- =====================================================
-- Migration: S.1.7 - Create API Tokens Table
-- =====================================================
-- Description: Create API tokens table for programmatic access
-- with secure token hashing, scopes, and usage tracking
-- Author: System
-- Date: 2025-01-15
-- Version: 1.0
-- =====================================================

-- =====================================================
-- SECTION 1: Create API tokens table
-- =====================================================

CREATE TABLE IF NOT EXISTS api_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Token Details
  name VARCHAR NOT NULL, -- User-friendly name (e.g., "Production API", "CI/CD Pipeline")
  description TEXT, -- Optional description of token purpose
  token_hash VARCHAR NOT NULL UNIQUE, -- SHA-256 hash of the actual token
  prefix VARCHAR NOT NULL, -- First 8 chars for display (e.g., 'uroq_1234')

  -- Permissions
  scopes JSONB DEFAULT '[]'::jsonb, -- ['read:datasets', 'write:projects', 'admin:all']

  -- Usage Tracking
  last_used_at TIMESTAMP,
  usage_count INTEGER DEFAULT 0,
  last_used_ip VARCHAR,
  last_used_user_agent TEXT,

  -- Expiry
  expires_at TIMESTAMP,

  -- Status
  is_active BOOLEAN DEFAULT true,
  revoked_at TIMESTAMP,
  revoked_by UUID REFERENCES users(id),
  revoke_reason TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- =====================================================
-- SECTION 2: Create indexes for performance
-- =====================================================

-- Index on account_id for account-level queries
CREATE INDEX IF NOT EXISTS idx_api_tokens_account ON api_tokens(account_id);

-- Index on user_id for user-level queries
CREATE INDEX IF NOT EXISTS idx_api_tokens_user ON api_tokens(user_id);

-- Index on token_hash for authentication lookups (most critical)
CREATE INDEX IF NOT EXISTS idx_api_tokens_hash ON api_tokens(token_hash);

-- Partial index on active tokens only
CREATE INDEX IF NOT EXISTS idx_api_tokens_active ON api_tokens(account_id, user_id, is_active)
WHERE is_active = true;

-- Index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_api_tokens_expires ON api_tokens(expires_at)
WHERE expires_at IS NOT NULL AND is_active = true;

-- Index on last_used_at for activity monitoring
CREATE INDEX IF NOT EXISTS idx_api_tokens_last_used ON api_tokens(last_used_at DESC);

-- Composite index for user's active tokens
CREATE INDEX IF NOT EXISTS idx_api_tokens_user_active ON api_tokens(user_id, is_active, created_at DESC)
WHERE is_active = true;

-- =====================================================
-- SECTION 3: Create Row Level Security (RLS) policies
-- =====================================================

-- Enable RLS on api_tokens table
ALTER TABLE api_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view their own tokens" ON api_tokens;
DROP POLICY IF EXISTS "Users can create tokens for accounts they belong to" ON api_tokens;
DROP POLICY IF EXISTS "Users can update their own tokens" ON api_tokens;
DROP POLICY IF EXISTS "Users can delete their own tokens" ON api_tokens;

-- SELECT Policy: Users can only see their own tokens
CREATE POLICY "Users can view their own tokens" ON api_tokens
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    -- Admins/owners can see all tokens for their account
    (account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    ))
  );

-- INSERT Policy: Users can create tokens for accounts they're members of
CREATE POLICY "Users can create tokens for accounts they belong to" ON api_tokens
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

-- UPDATE Policy: Users can update (use/revoke) their own tokens
-- Admins can revoke any token in their account
CREATE POLICY "Users can update their own tokens" ON api_tokens
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR
    -- Admins can revoke tokens
    (account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    ))
  );

-- DELETE Policy: Users can delete their own tokens
-- Admins can delete any token in their account
CREATE POLICY "Users can delete their own tokens" ON api_tokens
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR
    -- Admins can delete tokens
    (account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    ))
  );

-- =====================================================
-- SECTION 4: Create helper functions
-- =====================================================

-- Function to generate API token prefix
CREATE OR REPLACE FUNCTION generate_api_token_prefix()
RETURNS VARCHAR AS $$
BEGIN
  -- Generate format: uroq_XXXXXXXX (where X is random alphanumeric)
  RETURN 'uroq_' || substring(encode(gen_random_bytes(6), 'hex'), 1, 8);
END;
$$ LANGUAGE plpgsql;

-- Function to hash API token (SHA-256)
CREATE OR REPLACE FUNCTION hash_api_token(p_token VARCHAR)
RETURNS VARCHAR AS $$
BEGIN
  -- Use pgcrypto extension for SHA-256 hashing
  RETURN encode(digest(p_token, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to validate and use API token
CREATE OR REPLACE FUNCTION validate_api_token(
  p_token VARCHAR,
  p_ip_address VARCHAR DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
  token_id UUID,
  account_id UUID,
  user_id UUID,
  scopes JSONB,
  is_valid BOOLEAN,
  error_message TEXT
) AS $$
DECLARE
  v_token_hash VARCHAR;
  v_token_record api_tokens;
BEGIN
  -- Hash the incoming token
  v_token_hash := hash_api_token(p_token);

  -- Look up token by hash
  SELECT * INTO v_token_record
  FROM api_tokens
  WHERE token_hash = v_token_hash;

  -- Check if token exists
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::UUID, NULL::UUID, NULL::UUID, NULL::JSONB, false, 'Invalid token'::TEXT;
    RETURN;
  END IF;

  -- Check if token is active
  IF NOT v_token_record.is_active THEN
    RETURN QUERY SELECT
      v_token_record.id,
      v_token_record.account_id,
      v_token_record.user_id,
      v_token_record.scopes,
      false,
      'Token has been revoked'::TEXT;
    RETURN;
  END IF;

  -- Check if token is expired
  IF v_token_record.expires_at IS NOT NULL AND v_token_record.expires_at < NOW() THEN
    -- Auto-revoke expired token
    UPDATE api_tokens
    SET is_active = false,
        revoked_at = NOW(),
        revoke_reason = 'Token expired'
    WHERE id = v_token_record.id;

    RETURN QUERY SELECT
      v_token_record.id,
      v_token_record.account_id,
      v_token_record.user_id,
      v_token_record.scopes,
      false,
      'Token has expired'::TEXT;
    RETURN;
  END IF;

  -- Token is valid - update usage stats
  UPDATE api_tokens
  SET last_used_at = NOW(),
      usage_count = usage_count + 1,
      last_used_ip = COALESCE(p_ip_address, last_used_ip),
      last_used_user_agent = COALESCE(p_user_agent, last_used_user_agent)
  WHERE id = v_token_record.id;

  -- Return valid token info
  RETURN QUERY SELECT
    v_token_record.id,
    v_token_record.account_id,
    v_token_record.user_id,
    v_token_record.scopes,
    true,
    NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to revoke API token
CREATE OR REPLACE FUNCTION revoke_api_token(
  p_token_id UUID,
  p_revoked_by UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE api_tokens
  SET is_active = false,
      revoked_at = NOW(),
      revoked_by = p_revoked_by,
      revoke_reason = p_reason
  WHERE id = p_token_id
    AND is_active = true;

  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_api_tokens(p_days_old INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  -- Auto-revoke tokens that have been expired for more than p_days_old days
  UPDATE api_tokens
  SET is_active = false,
      revoked_at = NOW(),
      revoke_reason = 'Automatically revoked - expired ' || p_days_old || ' days ago'
  WHERE is_active = true
    AND expires_at IS NOT NULL
    AND expires_at < NOW() - (p_days_old || ' days')::INTERVAL;

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get active tokens for a user
CREATE OR REPLACE FUNCTION get_user_api_tokens(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name VARCHAR,
  description TEXT,
  prefix VARCHAR,
  scopes JSONB,
  last_used_at TIMESTAMP,
  usage_count INTEGER,
  expires_at TIMESTAMP,
  created_at TIMESTAMP
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name,
    t.description,
    t.prefix,
    t.scopes,
    t.last_used_at,
    t.usage_count,
    t.expires_at,
    t.created_at
  FROM api_tokens t
  WHERE t.user_id = p_user_id
    AND t.is_active = true
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if token has specific scope
CREATE OR REPLACE FUNCTION token_has_scope(p_token_scopes JSONB, p_required_scope VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if token has 'admin:all' scope (grants all permissions)
  IF p_token_scopes ? 'admin:all' THEN
    RETURN true;
  END IF;

  -- Check if token has the specific required scope
  RETURN p_token_scopes ? p_required_scope;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- SECTION 5: Create views for common queries
-- =====================================================

-- View for active API tokens with user details
CREATE OR REPLACE VIEW active_api_tokens AS
SELECT
  t.id,
  t.account_id,
  t.user_id,
  t.name,
  t.description,
  t.prefix,
  t.scopes,
  t.last_used_at,
  t.usage_count,
  t.expires_at,
  t.created_at,
  t.created_by,
  u.email as user_email,
  u.full_name as user_name,
  a.name as account_name,
  a.slug as account_slug,
  CASE
    WHEN t.expires_at IS NULL THEN NULL
    WHEN t.expires_at > NOW() THEN t.expires_at - NOW()
    ELSE INTERVAL '0'
  END as time_until_expiry
FROM api_tokens t
JOIN users u ON t.user_id = u.id
JOIN accounts a ON t.account_id = a.id
WHERE t.is_active = true
  AND a.deleted_at IS NULL
ORDER BY t.last_used_at DESC NULLS LAST;

GRANT SELECT ON active_api_tokens TO authenticated;

-- View for token usage statistics
CREATE OR REPLACE VIEW api_token_usage_stats AS
SELECT
  t.account_id,
  a.name as account_name,
  COUNT(*) as total_tokens,
  COUNT(*) FILTER (WHERE t.is_active = true) as active_tokens,
  COUNT(*) FILTER (WHERE t.is_active = false) as revoked_tokens,
  COUNT(*) FILTER (WHERE t.expires_at IS NOT NULL AND t.expires_at < NOW()) as expired_tokens,
  SUM(t.usage_count) as total_usage_count,
  MAX(t.last_used_at) as last_token_use
FROM api_tokens t
JOIN accounts a ON t.account_id = a.id
WHERE a.deleted_at IS NULL
GROUP BY t.account_id, a.name
ORDER BY total_usage_count DESC NULLS LAST;

-- =====================================================
-- SECTION 6: Add comments for documentation
-- =====================================================

COMMENT ON TABLE api_tokens IS 'API tokens for programmatic access with secure hashing and scope-based permissions';
COMMENT ON COLUMN api_tokens.name IS 'User-friendly name for the token (e.g., "Production API", "CI/CD Pipeline")';
COMMENT ON COLUMN api_tokens.token_hash IS 'SHA-256 hash of the actual token - never store plaintext tokens';
COMMENT ON COLUMN api_tokens.prefix IS 'First 8 characters of token for display purposes (e.g., "uroq_1234")';
COMMENT ON COLUMN api_tokens.scopes IS 'Array of permission scopes (e.g., ["read:datasets", "write:projects", "admin:all"])';
COMMENT ON COLUMN api_tokens.usage_count IS 'Number of times this token has been used for authentication';
COMMENT ON COLUMN api_tokens.last_used_at IS 'Timestamp of last successful authentication with this token';
COMMENT ON COLUMN api_tokens.last_used_ip IS 'IP address from which token was last used';
COMMENT ON COLUMN api_tokens.last_used_user_agent IS 'User agent from which token was last used';
COMMENT ON COLUMN api_tokens.expires_at IS 'Optional expiry timestamp - NULL means no expiry';
COMMENT ON COLUMN api_tokens.is_active IS 'Whether token is active (false = revoked)';
COMMENT ON COLUMN api_tokens.revoked_at IS 'Timestamp when token was revoked';
COMMENT ON COLUMN api_tokens.revoked_by IS 'User who revoked the token';
COMMENT ON COLUMN api_tokens.revoke_reason IS 'Reason for token revocation';

-- =====================================================
-- SECTION 7: Migration notes and recommendations
-- =====================================================

-- NOTES:
-- 1. Tokens are hashed using SHA-256 before storage (never store plaintext)
-- 2. Token format: {prefix}_{random_string} (e.g., "uroq_abc123_xyz789...")
-- 3. Prefix allows visual identification without exposing security
-- 4. Scopes follow pattern: {action}:{resource} (e.g., "read:datasets", "write:projects")
-- 5. Special scope "admin:all" grants all permissions
-- 6. Tokens can optionally expire (expires_at can be NULL for no expiry)
-- 7. Usage tracking updates on every successful authentication
-- 8. Expired tokens are auto-revoked on validation attempt

-- RECOMMENDATIONS:
-- 1. Token generation (in application code):
--    a. Generate random 32-byte string: crypto.randomBytes(32).toString('hex')
--    b. Create prefix: generate_api_token_prefix()
--    c. Full token: {prefix}_{random_string}
--    d. Hash before storage: hash_api_token(full_token)
--    e. Return full token to user ONCE (never show again)
-- 2. Token validation (in API middleware):
--    a. Extract token from Authorization header: "Bearer {token}"
--    b. Call validate_api_token(token, ip, user_agent)
--    c. Check is_valid flag
--    d. Verify required scopes using token_has_scope()
-- 3. Scope design:
--    - read:datasets, write:datasets, delete:datasets
--    - read:projects, write:projects, delete:projects
--    - read:users, write:users, delete:users
--    - admin:all (grants all permissions)
-- 4. Expiry recommendations:
--    - Short-lived tokens: 30-90 days
--    - Long-lived tokens: 1 year
--    - No expiry: Only for trusted internal services
-- 5. Security best practices:
--    - Always use HTTPS for API requests
--    - Never log full tokens (only prefix)
--    - Rotate tokens regularly
--    - Revoke unused tokens
--    - Monitor usage_count for anomalies
--    - Run cleanup_expired_api_tokens() daily
-- 6. Usage tracking event:
--    - Track 'api_token_created' in usage_events
--    - Track 'api_token_revoked' in usage_events
--    - Optionally track 'api_call' on each API request

-- EXAMPLE USAGE IN APPLICATION:
--
-- // Generate token (backend)
-- const randomString = crypto.randomBytes(32).toString('hex');
-- const prefix = await db.query('SELECT generate_api_token_prefix()');
-- const fullToken = `${prefix}_${randomString}`;
-- const tokenHash = await db.query('SELECT hash_api_token($1)', [fullToken]);
--
-- await db.query(`
--   INSERT INTO api_tokens (account_id, user_id, name, token_hash, prefix, scopes, expires_at)
--   VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '90 days')
-- `, [accountId, userId, tokenName, tokenHash, prefix, scopes]);
--
-- // Return fullToken to user (ONLY ONCE)
-- return { token: fullToken, prefix: prefix };
--
-- // Validate token (API middleware)
-- const result = await db.query(`
--   SELECT * FROM validate_api_token($1, $2, $3)
-- `, [token, req.ip, req.headers['user-agent']]);
--
-- if (!result.is_valid) {
--   return res.status(401).json({ error: result.error_message });
-- }
--
-- // Check scope
-- const hasScope = await db.query(`
--   SELECT token_has_scope($1, $2)
-- `, [result.scopes, 'read:datasets']);

-- =====================================================
-- End of Migration S.1.7
-- =====================================================

SELECT 'API tokens table created successfully!' AS status;
