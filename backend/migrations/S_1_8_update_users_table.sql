-- =====================================================
-- Migration: S.1.8 - Update Users Table
-- =====================================================
-- Description: Add missing columns to users table for enhanced
-- user profile management, notifications, and email verification
-- Author: System
-- Date: 2025-01-15
-- Version: 1.0
-- =====================================================

-- =====================================================
-- SECTION 1: Add new columns to users table
-- =====================================================

-- Note: Some columns already exist in the base schema
-- Using IF NOT EXISTS to ensure idempotency

-- Add preferences for user customization
-- (Already exists in base schema, but adding IF NOT EXISTS for safety)
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- Add notification settings
ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
  "email_notifications": true,
  "usage_alerts": true,
  "billing_alerts": true,
  "security_alerts": true,
  "invitation_alerts": true,
  "team_updates": true,
  "product_updates": false,
  "marketing_emails": false
}'::jsonb;

-- Add activity tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMP;

-- Add email verification
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_token VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verification_sent_at TIMESTAMP;

-- Add password reset functionality
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_token VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_reset_expires TIMESTAMP;

-- Add account security tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_failed_login_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_locked_until TIMESTAMP;

-- Add timezone and locale preferences
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR DEFAULT 'UTC';
ALTER TABLE users ADD COLUMN IF NOT EXISTS locale VARCHAR DEFAULT 'en-US';

-- Add onboarding tracking
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_step VARCHAR;
ALTER TABLE users ADD COLUMN IF NOT EXISTS onboarding_completed_at TIMESTAMP;

-- =====================================================
-- SECTION 2: Create indexes for performance
-- =====================================================

-- Index on is_email_verified for filtering unverified users
CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(is_email_verified) WHERE is_email_verified = false;

-- Index on email_verification_token for lookups
CREATE INDEX IF NOT EXISTS idx_users_email_verification_token ON users(email_verification_token) WHERE email_verification_token IS NOT NULL;

-- Index on password_reset_token for lookups
CREATE INDEX IF NOT EXISTS idx_users_password_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;

-- Index on last_seen_at for activity queries
CREATE INDEX IF NOT EXISTS idx_users_last_seen_at ON users(last_seen_at DESC NULLS LAST);

-- Index on account_locked_until for security checks (without NOW() check to avoid immutability error)
CREATE INDEX IF NOT EXISTS idx_users_locked_accounts ON users(account_locked_until) WHERE account_locked_until IS NOT NULL;

-- =====================================================
-- SECTION 3: Update RLS policies
-- =====================================================

-- Drop existing policies to recreate with new columns
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can view profiles of account members" ON users;

-- SELECT Policy: Users can view their own profile and profiles of users in their accounts
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT
  USING (
    id = auth.uid()
    OR
    -- Can see profiles of users in same account
    id IN (
      SELECT au2.user_id
      FROM account_users au1
      JOIN account_users au2 ON au1.account_id = au2.account_id
      WHERE au1.user_id = auth.uid()
    )
  );

-- UPDATE Policy: Users can update their own profile
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- =====================================================
-- SECTION 4: Create helper functions
-- =====================================================

-- Function to generate email verification token
CREATE OR REPLACE FUNCTION generate_email_verification_token()
RETURNS VARCHAR AS $$
BEGIN
  -- Generate a secure random token (32 bytes = 64 hex characters)
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to generate password reset token
CREATE OR REPLACE FUNCTION generate_password_reset_token()
RETURNS VARCHAR AS $$
BEGIN
  -- Generate a secure random token (32 bytes = 64 hex characters)
  RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Function to send email verification
CREATE OR REPLACE FUNCTION request_email_verification(p_user_id UUID)
RETURNS TABLE (
  verification_token VARCHAR,
  verification_link TEXT
) AS $$
DECLARE
  v_token VARCHAR;
  v_link TEXT;
BEGIN
  -- Generate new verification token
  v_token := generate_email_verification_token();

  -- Update user record
  UPDATE users
  SET email_verification_token = v_token,
      email_verification_sent_at = NOW()
  WHERE id = p_user_id;

  -- Generate verification link (base URL should be configured in app)
  v_link := '/verify-email?token=' || v_token;

  RETURN QUERY SELECT v_token, v_link;
END;
$$ LANGUAGE plpgsql;

-- Function to verify email
CREATE OR REPLACE FUNCTION verify_email(p_token VARCHAR)
RETURNS TABLE (
  success BOOLEAN,
  user_id UUID,
  message TEXT
) AS $$
DECLARE
  v_user users;
BEGIN
  -- Find user by verification token
  SELECT * INTO v_user
  FROM users
  WHERE email_verification_token = p_token;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Invalid verification token'::TEXT;
    RETURN;
  END IF;

  -- Check if already verified
  IF v_user.is_email_verified THEN
    RETURN QUERY SELECT false, v_user.id, 'Email already verified'::TEXT;
    RETURN;
  END IF;

  -- Verify email
  UPDATE users
  SET is_email_verified = true,
      email_verification_token = NULL,
      email_verification_sent_at = NULL
  WHERE id = v_user.id;

  RETURN QUERY SELECT true, v_user.id, 'Email verified successfully'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to request password reset
CREATE OR REPLACE FUNCTION request_password_reset(p_email VARCHAR)
RETURNS TABLE (
  success BOOLEAN,
  reset_token VARCHAR,
  reset_link TEXT,
  message TEXT
) AS $$
DECLARE
  v_user users;
  v_token VARCHAR;
  v_link TEXT;
BEGIN
  -- Find user by email
  SELECT * INTO v_user
  FROM users
  WHERE email = p_email
    AND is_active = true;

  IF NOT FOUND THEN
    -- Don't reveal if email exists or not (security)
    RETURN QUERY SELECT true, NULL::VARCHAR, NULL::TEXT, 'If the email exists, a reset link has been sent'::TEXT;
    RETURN;
  END IF;

  -- Check if account is locked
  IF v_user.account_locked_until IS NOT NULL AND v_user.account_locked_until > NOW() THEN
    RETURN QUERY SELECT false, NULL::VARCHAR, NULL::TEXT, 'Account is temporarily locked due to multiple failed login attempts'::TEXT;
    RETURN;
  END IF;

  -- Generate reset token (expires in 1 hour)
  v_token := generate_password_reset_token();

  -- Update user record
  UPDATE users
  SET password_reset_token = v_token,
      password_reset_expires = NOW() + INTERVAL '1 hour'
  WHERE id = v_user.id;

  -- Generate reset link
  v_link := '/reset-password?token=' || v_token;

  RETURN QUERY SELECT true, v_token, v_link, 'Password reset link generated'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to validate password reset token
CREATE OR REPLACE FUNCTION validate_password_reset_token(p_token VARCHAR)
RETURNS TABLE (
  valid BOOLEAN,
  user_id UUID,
  user_email VARCHAR,
  message TEXT
) AS $$
DECLARE
  v_user users;
BEGIN
  -- Find user by reset token
  SELECT * INTO v_user
  FROM users
  WHERE password_reset_token = p_token
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, 'Invalid reset token'::TEXT;
    RETURN;
  END IF;

  -- Check if token has expired
  IF v_user.password_reset_expires < NOW() THEN
    -- Clear expired token
    UPDATE users
    SET password_reset_token = NULL,
        password_reset_expires = NULL
    WHERE id = v_user.id;

    RETURN QUERY SELECT false, NULL::UUID, NULL::VARCHAR, 'Reset token has expired'::TEXT;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, v_user.id, v_user.email, 'Token is valid'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to complete password reset
CREATE OR REPLACE FUNCTION complete_password_reset(p_token VARCHAR)
RETURNS TABLE (
  success BOOLEAN,
  user_id UUID,
  message TEXT
) AS $$
DECLARE
  v_user users;
BEGIN
  -- Validate token first
  SELECT * INTO v_user
  FROM users
  WHERE password_reset_token = p_token
    AND password_reset_expires > NOW()
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, 'Invalid or expired reset token'::TEXT;
    RETURN;
  END IF;

  -- Clear reset token and update password change timestamp
  -- Note: Actual password update should be done by auth system (e.g., Supabase Auth)
  UPDATE users
  SET password_reset_token = NULL,
      password_reset_expires = NULL,
      password_changed_at = NOW(),
      failed_login_attempts = 0,
      account_locked_until = NULL
  WHERE id = v_user.id;

  RETURN QUERY SELECT true, v_user.id, 'Password reset successful'::TEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to track failed login attempts
CREATE OR REPLACE FUNCTION track_failed_login(p_email VARCHAR)
RETURNS TABLE (
  attempts_remaining INTEGER,
  locked_until TIMESTAMP,
  message TEXT
) AS $$
DECLARE
  v_user users;
  v_max_attempts INTEGER := 5;
  v_lockout_duration INTERVAL := INTERVAL '30 minutes';
BEGIN
  -- Find user
  SELECT * INTO v_user
  FROM users
  WHERE email = p_email;

  IF NOT FOUND THEN
    -- Don't reveal if user exists
    RETURN QUERY SELECT 0, NULL::TIMESTAMP, 'Invalid credentials'::TEXT;
    RETURN;
  END IF;

  -- Increment failed attempts
  UPDATE users
  SET failed_login_attempts = failed_login_attempts + 1,
      last_failed_login_at = NOW(),
      account_locked_until = CASE
        WHEN failed_login_attempts + 1 >= v_max_attempts THEN NOW() + v_lockout_duration
        ELSE account_locked_until
      END
  WHERE id = v_user.id
  RETURNING failed_login_attempts, account_locked_until INTO v_user.failed_login_attempts, v_user.account_locked_until;

  -- Check if account is now locked
  IF v_user.failed_login_attempts >= v_max_attempts THEN
    RETURN QUERY SELECT
      0,
      v_user.account_locked_until,
      'Account locked due to too many failed login attempts. Please try again in 30 minutes or reset your password.'::TEXT;
  ELSE
    RETURN QUERY SELECT
      v_max_attempts - v_user.failed_login_attempts,
      NULL::TIMESTAMP,
      'Invalid credentials. ' || (v_max_attempts - v_user.failed_login_attempts)::TEXT || ' attempts remaining.'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to reset failed login attempts (on successful login)
CREATE OR REPLACE FUNCTION reset_failed_login_attempts(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET failed_login_attempts = 0,
      last_failed_login_at = NULL,
      account_locked_until = NULL,
      last_login_at = NOW(),
      last_seen_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update last seen timestamp
CREATE OR REPLACE FUNCTION update_last_seen(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET last_seen_at = NOW()
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update notification settings
CREATE OR REPLACE FUNCTION update_notification_settings(
  p_user_id UUID,
  p_settings JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_new_settings JSONB;
BEGIN
  -- Merge new settings with existing settings
  UPDATE users
  SET notification_settings = notification_settings || p_settings
  WHERE id = p_user_id
  RETURNING notification_settings INTO v_new_settings;

  RETURN v_new_settings;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SECTION 5: Create views for user management
-- =====================================================

-- View for unverified users (for admin monitoring)
CREATE OR REPLACE VIEW unverified_users AS
SELECT
  u.id,
  u.email,
  u.full_name,
  u.created_at,
  u.email_verification_sent_at,
  (NOW() - u.created_at) as account_age,
  COALESCE(
    (SELECT COUNT(*) FROM account_users WHERE user_id = u.id),
    0
  ) as account_memberships
FROM users u
WHERE u.is_email_verified = false
  AND u.is_active = true
ORDER BY u.created_at DESC;

-- View for inactive users
CREATE OR REPLACE VIEW inactive_users AS
SELECT
  u.id,
  u.email,
  u.full_name,
  u.last_login_at,
  u.last_seen_at,
  GREATEST(u.last_login_at, u.last_seen_at) as last_activity,
  (NOW() - GREATEST(u.last_login_at, u.last_seen_at)) as inactive_duration
FROM users u
WHERE u.is_active = true
  AND (u.last_login_at IS NOT NULL OR u.last_seen_at IS NOT NULL)
  AND GREATEST(u.last_login_at, u.last_seen_at) < NOW() - INTERVAL '90 days'
ORDER BY last_activity DESC;

-- View for locked accounts
CREATE OR REPLACE VIEW locked_user_accounts AS
SELECT
  u.id,
  u.email,
  u.full_name,
  u.failed_login_attempts,
  u.last_failed_login_at,
  u.account_locked_until,
  (u.account_locked_until - NOW()) as time_until_unlock
FROM users u
WHERE u.account_locked_until IS NOT NULL
  AND u.account_locked_until > NOW()
ORDER BY u.account_locked_until ASC;

-- =====================================================
-- SECTION 6: Add comments for documentation
-- =====================================================

COMMENT ON COLUMN users.preferences IS 'User-specific preferences and settings (theme, language, display options, etc.)';
COMMENT ON COLUMN users.notification_settings IS 'User notification preferences for email, in-app, and push notifications';
COMMENT ON COLUMN users.last_seen_at IS 'Timestamp of last user activity (updated on API requests)';
COMMENT ON COLUMN users.is_email_verified IS 'Whether user has verified their email address';
COMMENT ON COLUMN users.email_verification_token IS 'Token for email verification (one-time use)';
COMMENT ON COLUMN users.email_verification_sent_at IS 'When verification email was last sent';
COMMENT ON COLUMN users.password_reset_token IS 'Token for password reset (one-time use, expires in 1 hour)';
COMMENT ON COLUMN users.password_reset_expires IS 'Expiry timestamp for password reset token';
COMMENT ON COLUMN users.password_changed_at IS 'Timestamp of last password change';
COMMENT ON COLUMN users.failed_login_attempts IS 'Number of consecutive failed login attempts';
COMMENT ON COLUMN users.last_failed_login_at IS 'Timestamp of last failed login attempt';
COMMENT ON COLUMN users.account_locked_until IS 'Timestamp until which account is locked (NULL = not locked)';
COMMENT ON COLUMN users.timezone IS 'User timezone for date/time display (IANA timezone string)';
COMMENT ON COLUMN users.locale IS 'User locale for internationalization (e.g., en-US, fr-FR)';
COMMENT ON COLUMN users.onboarding_completed IS 'Whether user has completed onboarding flow';
COMMENT ON COLUMN users.onboarding_step IS 'Current step in onboarding flow';
COMMENT ON COLUMN users.onboarding_completed_at IS 'When user completed onboarding';

-- =====================================================
-- SECTION 7: Migration notes and recommendations
-- =====================================================

-- NOTES:
-- 1. Email verification tokens expire implicitly (no expiry timestamp)
-- 2. Password reset tokens expire after 1 hour
-- 3. Failed login tracking locks account after 5 attempts for 30 minutes
-- 4. last_seen_at should be updated frequently (on each API request)
-- 5. notification_settings is JSONB for flexibility
-- 6. preferences is JSONB for extensibility

-- RECOMMENDATIONS:
-- 1. Email verification flow:
--    - Call request_email_verification(user_id) after signup
--    - Send email with verification link
--    - User clicks link, call verify_email(token)
--    - Show success message
-- 2. Password reset flow:
--    - User requests reset, call request_password_reset(email)
--    - Send email with reset link
--    - User clicks link, validate token with validate_password_reset_token(token)
--    - User enters new password, update via auth system
--    - Call complete_password_reset(token) to clear token
-- 3. Failed login tracking:
--    - On failed login, call track_failed_login(email)
--    - On successful login, call reset_failed_login_attempts(user_id)
--    - Check account_locked_until before allowing login
-- 4. Activity tracking:
--    - Call update_last_seen(user_id) on each authenticated API request
--    - Use last_seen_at for "last active" displays
-- 5. Notification settings:
--    - Default to all enabled except marketing
--    - Allow users to customize via settings UI
--    - Respect settings before sending emails
-- 6. Onboarding:
--    - Track onboarding progress in onboarding_step
--    - Set onboarding_completed = true when finished
--    - Use for showing/hiding onboarding UI

-- =====================================================
-- End of Migration S.1.8
-- =====================================================

SELECT 'Users table updated successfully!' AS status;
