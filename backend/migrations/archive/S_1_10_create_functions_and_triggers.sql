-- =====================================================
-- Migration: S.1.10 - Create Database Functions & Triggers
-- =====================================================
-- Description: Create helper functions and triggers for usage tracking,
-- limit checking, and automatic counter updates
-- Author: System
-- Date: 2025-01-15
-- Version: 1.0
-- =====================================================

-- =====================================================
-- SECTION 1: Usage Calculation Functions
-- =====================================================

-- Function to calculate current usage for an account
CREATE OR REPLACE FUNCTION calculate_account_usage(p_account_id UUID)
RETURNS TABLE (
  user_count INTEGER,
  project_count INTEGER,
  dataset_count INTEGER,
  monthly_ai_requests INTEGER,
  storage_mb INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Count active users
    (SELECT COUNT(*)::INTEGER
     FROM account_users
     WHERE account_id = p_account_id
       AND is_active = true
    ) as user_count,

    -- Count projects
    (SELECT COUNT(*)::INTEGER
     FROM projects
     WHERE account_id = p_account_id
       AND deleted_at IS NULL
    ) as project_count,

    -- Count datasets
    (SELECT COUNT(*)::INTEGER
     FROM datasets
     WHERE account_id = p_account_id
       AND deleted_at IS NULL
    ) as dataset_count,

    -- Count AI requests in current billing period
    (SELECT COUNT(*)::INTEGER
     FROM usage_events
     WHERE account_id = p_account_id
       AND event_type = 'ai_request'
       AND created_at >= COALESCE(
         (SELECT usage_reset_date FROM accounts WHERE id = p_account_id),
         NOW() - INTERVAL '30 days'
       )
    ) as monthly_ai_requests,

    -- Calculate storage (placeholder - adjust based on actual storage tracking)
    (SELECT COALESCE(SUM(quantity), 0)::INTEGER
     FROM usage_events
     WHERE account_id = p_account_id
       AND event_type = 'storage_used'
       AND unit = 'mb'
       AND created_at >= NOW() - INTERVAL '1 day'
    ) as storage_mb;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION calculate_account_usage IS 'Calculate current resource usage for an account across all tracked metrics';

-- =====================================================
-- SECTION 2: Limit Checking Functions
-- =====================================================

-- Function to check if a resource limit would be exceeded
CREATE OR REPLACE FUNCTION check_resource_limit(
  p_account_id UUID,
  p_resource_type VARCHAR,
  p_increment INTEGER DEFAULT 1
)
RETURNS TABLE (
  allowed BOOLEAN,
  current_usage INTEGER,
  limit_value INTEGER,
  percentage NUMERIC,
  message TEXT
) AS $$
DECLARE
  v_account RECORD;
  v_current INTEGER;
  v_limit INTEGER;
  v_new_total INTEGER;
  v_pct NUMERIC;
BEGIN
  -- Get account limits
  SELECT * INTO v_account
  FROM accounts
  WHERE id = p_account_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 0, 0::NUMERIC, 'Account not found'::TEXT;
    RETURN;
  END IF;

  -- Determine current usage and limit based on resource type
  CASE p_resource_type
    WHEN 'users' THEN
      v_current := v_account.current_user_count;
      v_limit := v_account.max_users;

    WHEN 'projects' THEN
      v_current := v_account.current_project_count;
      v_limit := v_account.max_projects;

    WHEN 'datasets' THEN
      v_current := v_account.current_dataset_count;
      v_limit := v_account.max_datasets;

    WHEN 'ai_requests' THEN
      v_current := v_account.current_monthly_ai_requests;
      v_limit := v_account.max_monthly_ai_requests;

    WHEN 'storage' THEN
      v_current := v_account.current_storage_mb;
      v_limit := v_account.max_storage_mb;

    ELSE
      RETURN QUERY SELECT false, 0, 0, 0::NUMERIC, 'Unknown resource type'::TEXT;
      RETURN;
  END CASE;

  -- Calculate new total and percentage
  v_new_total := v_current + p_increment;

  -- Handle unlimited resources (limit = -1)
  IF v_limit = -1 THEN
    RETURN QUERY SELECT
      true,
      v_current,
      v_limit,
      0::NUMERIC,
      'Unlimited'::TEXT;
    RETURN;
  END IF;

  v_pct := ROUND((v_new_total::NUMERIC / v_limit::NUMERIC) * 100, 2);

  -- Check if allowed
  IF v_new_total > v_limit THEN
    RETURN QUERY SELECT
      false,
      v_current,
      v_limit,
      v_pct,
      format('Limit exceeded. Current: %s, Limit: %s, Attempted: %s', v_current, v_limit, v_new_total)::TEXT;
  ELSE
    -- Return with appropriate warning message based on percentage
    RETURN QUERY SELECT
      true,
      v_current,
      v_limit,
      v_pct,
      CASE
        WHEN v_pct >= 95 THEN format('Critical: %s%% of limit used', v_pct)
        WHEN v_pct >= 90 THEN format('Warning: %s%% of limit used', v_pct)
        WHEN v_pct >= 80 THEN format('Notice: %s%% of limit used', v_pct)
        ELSE 'OK'
      END::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_resource_limit IS 'Check if incrementing a resource would exceed account limits and return usage details';

-- =====================================================
-- SECTION 3: Usage Counter Update Functions
-- =====================================================

-- Function to increment usage counter
CREATE OR REPLACE FUNCTION increment_usage_counter(
  p_account_id UUID,
  p_resource_type VARCHAR,
  p_amount INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_column VARCHAR;
BEGIN
  -- Determine which column to update
  CASE p_resource_type
    WHEN 'users' THEN v_column := 'current_user_count';
    WHEN 'projects' THEN v_column := 'current_project_count';
    WHEN 'datasets' THEN v_column := 'current_dataset_count';
    WHEN 'ai_requests' THEN v_column := 'current_monthly_ai_requests';
    WHEN 'storage' THEN v_column := 'current_storage_mb';
    ELSE RETURN false;
  END CASE;

  -- Update the counter using dynamic SQL
  EXECUTE format('UPDATE accounts SET %I = %I + $1, updated_at = NOW() WHERE id = $2', v_column, v_column)
  USING p_amount, p_account_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to decrement usage counter
CREATE OR REPLACE FUNCTION decrement_usage_counter(
  p_account_id UUID,
  p_resource_type VARCHAR,
  p_amount INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_column VARCHAR;
BEGIN
  -- Determine which column to update
  CASE p_resource_type
    WHEN 'users' THEN v_column := 'current_user_count';
    WHEN 'projects' THEN v_column := 'current_project_count';
    WHEN 'datasets' THEN v_column := 'current_dataset_count';
    WHEN 'ai_requests' THEN v_column := 'current_monthly_ai_requests';
    WHEN 'storage' THEN v_column := 'current_storage_mb';
    ELSE RETURN false;
  END CASE;

  -- Update the counter (don't go below 0)
  EXECUTE format('UPDATE accounts SET %I = GREATEST(%I - $1, 0), updated_at = NOW() WHERE id = $2', v_column, v_column)
  USING p_amount, p_account_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Function to recalculate and sync all usage counters
CREATE OR REPLACE FUNCTION sync_usage_counters(p_account_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_usage RECORD;
BEGIN
  -- Calculate actual usage
  SELECT * INTO v_usage FROM calculate_account_usage(p_account_id);

  -- Update all counters
  UPDATE accounts
  SET
    current_user_count = v_usage.user_count,
    current_project_count = v_usage.project_count,
    current_dataset_count = v_usage.dataset_count,
    current_monthly_ai_requests = v_usage.monthly_ai_requests,
    current_storage_mb = v_usage.storage_mb,
    updated_at = NOW()
  WHERE id = p_account_id;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_usage_counters IS 'Recalculate and synchronize all usage counters for an account (use for data integrity checks)';

-- =====================================================
-- SECTION 4: Monthly Usage Reset Function
-- =====================================================

-- Function to reset monthly usage counters (AI requests)
CREATE OR REPLACE FUNCTION reset_monthly_usage(p_account_id UUID DEFAULT NULL)
RETURNS INTEGER AS $$
DECLARE
  v_reset_count INTEGER := 0;
BEGIN
  IF p_account_id IS NULL THEN
    -- Reset all accounts that are due for reset
    UPDATE accounts
    SET
      current_monthly_ai_requests = 0,
      usage_reset_date = NOW(),
      updated_at = NOW()
    WHERE usage_reset_date IS NULL
       OR usage_reset_date < NOW() - INTERVAL '30 days';

    GET DIAGNOSTICS v_reset_count = ROW_COUNT;
  ELSE
    -- Reset specific account
    UPDATE accounts
    SET
      current_monthly_ai_requests = 0,
      usage_reset_date = NOW(),
      updated_at = NOW()
    WHERE id = p_account_id;

    GET DIAGNOSTICS v_reset_count = ROW_COUNT;
  END IF;

  RETURN v_reset_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reset_monthly_usage IS 'Reset monthly AI request counter for accounts. Call with NULL to reset all due accounts, or with account_id for specific account';

-- =====================================================
-- SECTION 5: API Token Generation Functions
-- =====================================================

-- Function to generate API token prefix (first 8 chars for display)
CREATE OR REPLACE FUNCTION generate_api_token_prefix()
RETURNS VARCHAR AS $$
BEGIN
  -- Generate format: uro_XXXXXXXX
  RETURN 'uro_' || substring(encode(gen_random_bytes(6), 'hex'), 1, 8);
END;
$$ LANGUAGE plpgsql;

-- Function to generate full API token
CREATE OR REPLACE FUNCTION generate_api_token()
RETURNS VARCHAR AS $$
BEGIN
  -- Generate secure 32-byte token
  -- Format: uro_XXXXXXXX_YYYYYYYY...
  RETURN 'uro_' || encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_api_token IS 'Generate a secure API token with uro_ prefix';

-- =====================================================
-- SECTION 6: Trigger Functions
-- =====================================================

-- Trigger function to update user count when account_users changes
CREATE OR REPLACE FUNCTION update_account_user_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- New user added
    PERFORM increment_usage_counter(NEW.account_id, 'users', 1);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if is_active changed
    IF OLD.is_active = true AND NEW.is_active = false THEN
      -- User deactivated
      PERFORM decrement_usage_counter(NEW.account_id, 'users', 1);
    ELSIF OLD.is_active = false AND NEW.is_active = true THEN
      -- User reactivated
      PERFORM increment_usage_counter(NEW.account_id, 'users', 1);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- User removed
    IF OLD.is_active = true THEN
      PERFORM decrement_usage_counter(OLD.account_id, 'users', 1);
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update project count
CREATE OR REPLACE FUNCTION update_account_project_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- New project created
    PERFORM increment_usage_counter(NEW.account_id, 'projects', 1);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if soft deleted
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      -- Project soft deleted
      PERFORM decrement_usage_counter(NEW.account_id, 'projects', 1);
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      -- Project restored
      PERFORM increment_usage_counter(NEW.account_id, 'projects', 1);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- Project hard deleted
    IF OLD.deleted_at IS NULL THEN
      PERFORM decrement_usage_counter(OLD.account_id, 'projects', 1);
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger function to update dataset count
CREATE OR REPLACE FUNCTION update_account_dataset_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- New dataset created
    PERFORM increment_usage_counter(NEW.account_id, 'datasets', 1);
    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    -- Check if soft deleted
    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      -- Dataset soft deleted
      PERFORM decrement_usage_counter(NEW.account_id, 'datasets', 1);
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      -- Dataset restored
      PERFORM increment_usage_counter(NEW.account_id, 'datasets', 1);
    END IF;
    RETURN NEW;

  ELSIF TG_OP = 'DELETE' THEN
    -- Dataset hard deleted
    IF OLD.deleted_at IS NULL THEN
      PERFORM decrement_usage_counter(OLD.account_id, 'datasets', 1);
    END IF;
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SECTION 7: Create Triggers
-- =====================================================

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trg_account_users_count ON account_users;
DROP TRIGGER IF EXISTS trg_projects_count ON projects;
DROP TRIGGER IF EXISTS trg_datasets_count ON datasets;

-- Create trigger for account_users
CREATE TRIGGER trg_account_users_count
  AFTER INSERT OR UPDATE OR DELETE ON account_users
  FOR EACH ROW
  EXECUTE FUNCTION update_account_user_count();

-- Create trigger for projects (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
    CREATE TRIGGER trg_projects_count
      AFTER INSERT OR UPDATE OR DELETE ON projects
      FOR EACH ROW
      EXECUTE FUNCTION update_account_project_count();
  END IF;
END $$;

-- Create trigger for datasets (if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'datasets') THEN
    CREATE TRIGGER trg_datasets_count
      AFTER INSERT OR UPDATE OR DELETE ON datasets
      FOR EACH ROW
      EXECUTE FUNCTION update_account_dataset_count();
  END IF;
END $$;

-- =====================================================
-- SECTION 8: Helper Views
-- =====================================================

-- View for account usage summary
CREATE OR REPLACE VIEW account_usage_summary AS
SELECT
  a.id,
  a.name,
  a.subscription_tier,
  a.subscription_status,

  -- User usage
  a.current_user_count,
  a.max_users,
  CASE
    WHEN a.max_users = -1 THEN 0
    ELSE ROUND((a.current_user_count::NUMERIC / NULLIF(a.max_users, 0)::NUMERIC) * 100, 2)
  END as user_percentage,

  -- Project usage
  a.current_project_count,
  a.max_projects,
  CASE
    WHEN a.max_projects = -1 THEN 0
    ELSE ROUND((a.current_project_count::NUMERIC / NULLIF(a.max_projects, 0)::NUMERIC) * 100, 2)
  END as project_percentage,

  -- Dataset usage
  a.current_dataset_count,
  a.max_datasets,
  CASE
    WHEN a.max_datasets = -1 THEN 0
    ELSE ROUND((a.current_dataset_count::NUMERIC / NULLIF(a.max_datasets, 0)::NUMERIC) * 100, 2)
  END as dataset_percentage,

  -- AI request usage
  a.current_monthly_ai_requests,
  a.max_monthly_ai_requests,
  CASE
    WHEN a.max_monthly_ai_requests = -1 THEN 0
    ELSE ROUND((a.current_monthly_ai_requests::NUMERIC / NULLIF(a.max_monthly_ai_requests, 0)::NUMERIC) * 100, 2)
  END as ai_request_percentage,

  -- Storage usage
  a.current_storage_mb,
  a.max_storage_mb,
  CASE
    WHEN a.max_storage_mb = -1 THEN 0
    ELSE ROUND((a.current_storage_mb::NUMERIC / NULLIF(a.max_storage_mb, 0)::NUMERIC) * 100, 2)
  END as storage_percentage,

  a.usage_reset_date,
  a.trial_end_date,
  a.created_at,
  a.updated_at
FROM accounts a
WHERE a.deleted_at IS NULL;

GRANT SELECT ON account_usage_summary TO authenticated;

COMMENT ON VIEW account_usage_summary IS 'Consolidated view of account resource usage with percentages';

-- =====================================================
-- SECTION 9: Scheduled Job Setup (Documentation)
-- =====================================================

-- NOTE: These are examples of scheduled jobs that should be set up
-- using pg_cron or an external scheduler

-- Example: Reset monthly usage for all accounts (run monthly)
-- SELECT cron.schedule('reset-monthly-usage', '0 0 1 * *', 'SELECT reset_monthly_usage()');

-- Example: Auto-expire invitations (run daily)
-- SELECT cron.schedule('expire-invitations', '0 0 * * *', 'SELECT auto_expire_invitations()');

-- Example: Cleanup old expired invitations (run weekly)
-- SELECT cron.schedule('cleanup-invitations', '0 0 * * 0', 'SELECT cleanup_expired_invitations(30)');

-- Example: Sync usage counters for all accounts (run daily for data integrity)
-- SELECT cron.schedule('sync-usage-counters', '0 2 * * *',
--   'SELECT sync_usage_counters(id) FROM accounts WHERE deleted_at IS NULL');

-- =====================================================
-- SECTION 10: Testing Functions
-- =====================================================

-- Function to test usage calculation
CREATE OR REPLACE FUNCTION test_usage_calculations(p_account_id UUID)
RETURNS TABLE (
  test_name VARCHAR,
  expected_value INTEGER,
  actual_value INTEGER,
  status VARCHAR
) AS $$
DECLARE
  v_usage RECORD;
  v_account RECORD;
BEGIN
  -- Get calculated usage
  SELECT * INTO v_usage FROM calculate_account_usage(p_account_id);

  -- Get stored usage
  SELECT * INTO v_account FROM accounts WHERE id = p_account_id;

  -- Test user count
  RETURN QUERY SELECT
    'User Count'::VARCHAR,
    v_usage.user_count,
    v_account.current_user_count,
    CASE WHEN v_usage.user_count = v_account.current_user_count THEN 'PASS' ELSE 'FAIL' END::VARCHAR;

  -- Test project count
  RETURN QUERY SELECT
    'Project Count'::VARCHAR,
    v_usage.project_count,
    v_account.current_project_count,
    CASE WHEN v_usage.project_count = v_account.current_project_count THEN 'PASS' ELSE 'FAIL' END::VARCHAR;

  -- Test dataset count
  RETURN QUERY SELECT
    'Dataset Count'::VARCHAR,
    v_usage.dataset_count,
    v_account.current_dataset_count,
    CASE WHEN v_usage.dataset_count = v_account.current_dataset_count THEN 'PASS' ELSE 'FAIL' END::VARCHAR;

  -- Test AI request count
  RETURN QUERY SELECT
    'AI Request Count'::VARCHAR,
    v_usage.monthly_ai_requests,
    v_account.current_monthly_ai_requests,
    CASE WHEN v_usage.monthly_ai_requests = v_account.current_monthly_ai_requests THEN 'PASS' ELSE 'FAIL' END::VARCHAR;

  -- Test storage
  RETURN QUERY SELECT
    'Storage (MB)'::VARCHAR,
    v_usage.storage_mb,
    v_account.current_storage_mb,
    CASE WHEN v_usage.storage_mb = v_account.current_storage_mb THEN 'PASS' ELSE 'FAIL' END::VARCHAR;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION test_usage_calculations IS 'Test function to verify usage counters match calculated values';

-- =====================================================
-- SECTION 11: Grant Permissions
-- =====================================================

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION calculate_account_usage TO authenticated;
GRANT EXECUTE ON FUNCTION check_resource_limit TO authenticated;
GRANT EXECUTE ON FUNCTION generate_api_token TO authenticated;
GRANT EXECUTE ON FUNCTION generate_api_token_prefix TO authenticated;
GRANT EXECUTE ON FUNCTION test_usage_calculations TO authenticated;

-- These functions should only be callable by service role
GRANT EXECUTE ON FUNCTION increment_usage_counter TO service_role;
GRANT EXECUTE ON FUNCTION decrement_usage_counter TO service_role;
GRANT EXECUTE ON FUNCTION sync_usage_counters TO service_role;
GRANT EXECUTE ON FUNCTION reset_monthly_usage TO service_role;

-- =====================================================
-- SECTION 12: Migration Verification
-- =====================================================

DO $$
DECLARE
  v_function_count INTEGER;
  v_trigger_count INTEGER;
BEGIN
  -- Count created functions
  SELECT COUNT(*) INTO v_function_count
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname IN (
      'calculate_account_usage',
      'check_resource_limit',
      'increment_usage_counter',
      'decrement_usage_counter',
      'sync_usage_counters',
      'reset_monthly_usage',
      'generate_api_token',
      'generate_api_token_prefix',
      'test_usage_calculations'
    );

  -- Count created triggers
  SELECT COUNT(*) INTO v_trigger_count
  FROM pg_trigger
  WHERE tgname IN (
    'trg_account_users_count',
    'trg_projects_count',
    'trg_datasets_count'
  );

  RAISE NOTICE 'Migration S.1.10 completed successfully!';
  RAISE NOTICE 'Functions created: %', v_function_count;
  RAISE NOTICE 'Triggers created: %', v_trigger_count;
END $$;

-- =====================================================
-- End of Migration S.1.10
-- =====================================================

SELECT 'Database functions and triggers created successfully!' AS status;
