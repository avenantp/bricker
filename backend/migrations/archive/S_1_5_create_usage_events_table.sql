-- =====================================================
-- Migration: S.1.5 - Create Usage Events Table
-- =====================================================
-- Description: Creates usage_events table for tracking resource usage and metering
-- Author: System
-- Date: 2025-01-15
-- Version: 1.0
-- =====================================================

-- =====================================================
-- SECTION 1: Create usage_events table
-- =====================================================

CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Event Details
  event_type VARCHAR NOT NULL CHECK (event_type IN (
    'ai_request',
    'dataset_created',
    'dataset_deleted',
    'project_created',
    'project_deleted',
    'user_invited',
    'user_added',
    'user_removed',
    'storage_used',
    'storage_freed',
    'api_call',
    'workspace_created',
    'workspace_deleted',
    'connection_created',
    'connection_deleted'
  )),
  event_category VARCHAR CHECK (event_category IN ('ai', 'resource', 'api', 'storage', 'team')),

  -- Quantity
  quantity INTEGER DEFAULT 1, -- How many units consumed
  unit VARCHAR, -- 'request', 'mb', 'count', 'bytes'

  -- Context
  resource_type VARCHAR, -- 'dataset', 'project', 'workspace', 'user', etc.
  resource_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional context

  -- Timestamp
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add comments
COMMENT ON TABLE usage_events IS 'Tracks all resource usage events for metering and analytics';
COMMENT ON COLUMN usage_events.account_id IS 'Reference to the account that generated this usage event';
COMMENT ON COLUMN usage_events.user_id IS 'Reference to the user who performed the action (NULL for system events)';
COMMENT ON COLUMN usage_events.event_type IS 'Type of usage event (ai_request, dataset_created, etc.)';
COMMENT ON COLUMN usage_events.event_category IS 'High-level category for grouping events';
COMMENT ON COLUMN usage_events.quantity IS 'Number of units consumed (default 1)';
COMMENT ON COLUMN usage_events.unit IS 'Unit of measurement (request, mb, count, bytes)';
COMMENT ON COLUMN usage_events.resource_type IS 'Type of resource this event relates to';
COMMENT ON COLUMN usage_events.resource_id IS 'ID of the specific resource (if applicable)';
COMMENT ON COLUMN usage_events.metadata IS 'Additional context as JSON (flexible structure)';
COMMENT ON COLUMN usage_events.created_at IS 'Timestamp when the event occurred';

-- =====================================================
-- SECTION 2: Create indexes
-- =====================================================

-- Index on account_id for querying events by account
CREATE INDEX IF NOT EXISTS idx_usage_events_account ON usage_events(account_id);

-- Index on user_id for querying events by user
CREATE INDEX IF NOT EXISTS idx_usage_events_user ON usage_events(user_id);

-- Index on event_type for filtering by event type
CREATE INDEX IF NOT EXISTS idx_usage_events_type ON usage_events(event_type);

-- Index on created_at for chronological queries
CREATE INDEX IF NOT EXISTS idx_usage_events_created ON usage_events(created_at DESC);

-- Composite index on account_id, event_type, and created_at (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_usage_events_account_type_created
  ON usage_events(account_id, event_type, created_at DESC);

-- Composite index on account_id and created_at for account usage history
CREATE INDEX IF NOT EXISTS idx_usage_events_account_created
  ON usage_events(account_id, created_at DESC);

-- Index on event_category for category-based filtering
CREATE INDEX IF NOT EXISTS idx_usage_events_category ON usage_events(event_category);

-- Index on resource_type and resource_id for resource-specific queries
CREATE INDEX IF NOT EXISTS idx_usage_events_resource ON usage_events(resource_type, resource_id);

-- Partial index on AI requests for efficient metering
CREATE INDEX IF NOT EXISTS idx_usage_events_ai_requests
  ON usage_events(account_id, created_at DESC)
  WHERE event_type = 'ai_request';

-- =====================================================
-- SECTION 3: Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on usage_events table
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view usage events for accounts they're members of
CREATE POLICY "Users can view their account usage events" ON usage_events
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Only backend services can insert usage events (via service role)
CREATE POLICY "Service role can insert usage events" ON usage_events
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role'
  );

-- Policy: Prevent updates (usage events are immutable)
CREATE POLICY "Prevent usage event updates" ON usage_events
  FOR UPDATE
  USING (false);

-- Policy: Prevent direct deletion (use retention policies instead)
CREATE POLICY "Prevent direct usage event deletion" ON usage_events
  FOR DELETE
  USING (false);

-- =====================================================
-- SECTION 4: Create helper functions
-- =====================================================

-- Function to count AI requests for an account in the current period
CREATE OR REPLACE FUNCTION count_ai_requests_current_period(p_account_id UUID)
RETURNS INTEGER AS $$
DECLARE
  request_count INTEGER;
  reset_date TIMESTAMP;
BEGIN
  -- Get the usage reset date from the account
  SELECT usage_reset_date INTO reset_date
  FROM accounts
  WHERE id = p_account_id;

  -- If no reset date, use beginning of current month
  IF reset_date IS NULL THEN
    reset_date := date_trunc('month', NOW());
  END IF;

  -- Count AI requests since reset date
  SELECT COUNT(*) INTO request_count
  FROM usage_events
  WHERE account_id = p_account_id
    AND event_type = 'ai_request'
    AND created_at >= reset_date;

  RETURN request_count;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION count_ai_requests_current_period IS 'Counts AI requests since last usage reset';

-- Function to get usage summary for an account
CREATE OR REPLACE FUNCTION get_usage_summary(
  p_account_id UUID,
  p_start_date TIMESTAMP DEFAULT NULL,
  p_end_date TIMESTAMP DEFAULT NULL
)
RETURNS TABLE (
  event_type VARCHAR,
  event_count BIGINT,
  total_quantity BIGINT
) AS $$
BEGIN
  -- Default to last 30 days if no dates provided
  IF p_start_date IS NULL THEN
    p_start_date := NOW() - INTERVAL '30 days';
  END IF;
  IF p_end_date IS NULL THEN
    p_end_date := NOW();
  END IF;

  RETURN QUERY
  SELECT
    ue.event_type,
    COUNT(*) as event_count,
    SUM(ue.quantity)::BIGINT as total_quantity
  FROM usage_events ue
  WHERE ue.account_id = p_account_id
    AND ue.created_at >= p_start_date
    AND ue.created_at <= p_end_date
  GROUP BY ue.event_type
  ORDER BY event_count DESC;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_usage_summary IS 'Returns usage summary grouped by event type for a time period';

-- Function to track an event (convenience function for application layer)
CREATE OR REPLACE FUNCTION track_usage_event(
  p_account_id UUID,
  p_user_id UUID,
  p_event_type VARCHAR,
  p_event_category VARCHAR DEFAULT NULL,
  p_quantity INTEGER DEFAULT 1,
  p_unit VARCHAR DEFAULT NULL,
  p_resource_type VARCHAR DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO usage_events (
    account_id,
    user_id,
    event_type,
    event_category,
    quantity,
    unit,
    resource_type,
    resource_id,
    metadata
  ) VALUES (
    p_account_id,
    p_user_id,
    p_event_type,
    p_event_category,
    p_quantity,
    p_unit,
    p_resource_type,
    p_resource_id,
    p_metadata
  )
  RETURNING id INTO event_id;

  RETURN event_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION track_usage_event IS 'Convenience function to create a usage event';

-- =====================================================
-- SECTION 5: Create views for common queries
-- =====================================================

-- View: AI request usage by account (current month)
CREATE OR REPLACE VIEW ai_usage_current_month AS
SELECT
  ue.account_id,
  a.name as account_name,
  COUNT(*) as ai_request_count,
  a.max_monthly_ai_requests as ai_request_limit,
  ROUND((COUNT(*)::NUMERIC / NULLIF(a.max_monthly_ai_requests, 0)) * 100, 2) as usage_percentage
FROM usage_events ue
JOIN accounts a ON ue.account_id = a.id
WHERE ue.event_type = 'ai_request'
  AND ue.created_at >= date_trunc('month', NOW())
  AND a.deleted_at IS NULL
GROUP BY ue.account_id, a.name, a.max_monthly_ai_requests;

COMMENT ON VIEW ai_usage_current_month IS 'AI request usage for all accounts in current month';

-- Grant access to the view
GRANT SELECT ON ai_usage_current_month TO authenticated;

-- View: Recent usage events (last 24 hours)
CREATE OR REPLACE VIEW recent_usage_events AS
SELECT
  ue.*,
  a.name as account_name,
  u.email as user_email
FROM usage_events ue
JOIN accounts a ON ue.account_id = a.id
LEFT JOIN users u ON ue.user_id = u.id
WHERE ue.created_at > NOW() - INTERVAL '24 hours'
  AND a.deleted_at IS NULL
ORDER BY ue.created_at DESC;

COMMENT ON VIEW recent_usage_events IS 'Usage events from the last 24 hours';

-- Grant access to the view
GRANT SELECT ON recent_usage_events TO authenticated;

-- View: Usage summary by account (last 30 days)
CREATE OR REPLACE VIEW usage_summary_last_30_days AS
SELECT
  ue.account_id,
  a.name as account_name,
  ue.event_category,
  ue.event_type,
  COUNT(*) as event_count,
  SUM(ue.quantity) as total_quantity
FROM usage_events ue
JOIN accounts a ON ue.account_id = a.id
WHERE ue.created_at > NOW() - INTERVAL '30 days'
  AND a.deleted_at IS NULL
GROUP BY ue.account_id, a.name, ue.event_category, ue.event_type
ORDER BY ue.account_id, event_count DESC;

COMMENT ON VIEW usage_summary_last_30_days IS 'Usage summary by account for the last 30 days';

-- Grant access to the view
GRANT SELECT ON usage_summary_last_30_days TO authenticated;

-- =====================================================
-- SECTION 6: Create triggers for automatic counter updates
-- =====================================================

-- Function to update account counters when usage events are created
CREATE OR REPLACE FUNCTION update_account_counters_on_usage_event()
RETURNS TRIGGER AS $$
BEGIN
  -- Update current_monthly_ai_requests for AI requests
  IF NEW.event_type = 'ai_request' THEN
    UPDATE accounts
    SET current_monthly_ai_requests = current_monthly_ai_requests + NEW.quantity
    WHERE id = NEW.account_id;
  END IF;

  -- Update current_user_count for user events
  IF NEW.event_type = 'user_added' THEN
    UPDATE accounts
    SET current_user_count = current_user_count + 1
    WHERE id = NEW.account_id;
  ELSIF NEW.event_type = 'user_removed' THEN
    UPDATE accounts
    SET current_user_count = GREATEST(current_user_count - 1, 0)
    WHERE id = NEW.account_id;
  END IF;

  -- Update current_project_count for project events
  IF NEW.event_type = 'project_created' THEN
    UPDATE accounts
    SET current_project_count = current_project_count + 1
    WHERE id = NEW.account_id;
  ELSIF NEW.event_type = 'project_deleted' THEN
    UPDATE accounts
    SET current_project_count = GREATEST(current_project_count - 1, 0)
    WHERE id = NEW.account_id;
  END IF;

  -- Update current_dataset_count for dataset events
  IF NEW.event_type = 'dataset_created' THEN
    UPDATE accounts
    SET current_dataset_count = current_dataset_count + 1
    WHERE id = NEW.account_id;
  ELSIF NEW.event_type = 'dataset_deleted' THEN
    UPDATE accounts
    SET current_dataset_count = GREATEST(current_dataset_count - 1, 0)
    WHERE id = NEW.account_id;
  END IF;

  -- Update current_storage_mb for storage events
  IF NEW.event_type = 'storage_used' THEN
    UPDATE accounts
    SET current_storage_mb = current_storage_mb + NEW.quantity
    WHERE id = NEW.account_id;
  ELSIF NEW.event_type = 'storage_freed' THEN
    UPDATE accounts
    SET current_storage_mb = GREATEST(current_storage_mb - NEW.quantity, 0)
    WHERE id = NEW.account_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_account_counters_on_usage_event IS 'Automatically updates account usage counters when events are tracked';

-- Create trigger for automatic counter updates
DROP TRIGGER IF EXISTS usage_event_counter_update_trigger ON usage_events;
CREATE TRIGGER usage_event_counter_update_trigger
  AFTER INSERT ON usage_events
  FOR EACH ROW
  EXECUTE FUNCTION update_account_counters_on_usage_event();

-- =====================================================
-- SECTION 7: Data retention and partitioning (optional)
-- =====================================================

-- Note: For high-volume usage tracking, consider:
-- 1. Table partitioning by created_at (monthly partitions)
-- 2. Automated archival of old events (>1 year)
-- 3. Summary tables for historical analytics

-- Function to archive old usage events (can be run by scheduled job)
CREATE OR REPLACE FUNCTION archive_old_usage_events(p_days_to_keep INTEGER DEFAULT 365)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete events older than specified days
  DELETE FROM usage_events
  WHERE created_at < NOW() - (p_days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION archive_old_usage_events IS 'Archives (deletes) usage events older than specified days';

-- =====================================================
-- Migration Notes
-- =====================================================

-- NOTES:
-- 1. Usage events are immutable (no updates allowed)
-- 2. Events automatically update account counters via trigger
-- 3. AI requests are tracked with event_type='ai_request'
-- 4. Resource creation/deletion events update respective counters
-- 5. Storage events track space used/freed in MB
-- 6. Metadata field allows flexible additional context
-- 7. Helper functions provided for common usage queries
-- 8. Views created for AI usage, recent events, and summaries

-- EVENT TYPE MEANINGS:
-- - ai_request: AI/LLM API call made
-- - dataset_created: New dataset created
-- - dataset_deleted: Dataset removed
-- - project_created: New project created
-- - project_deleted: Project removed
-- - user_invited: User invited to account
-- - user_added: User added to account (invitation accepted)
-- - user_removed: User removed from account
-- - storage_used: Storage space consumed (in MB)
-- - storage_freed: Storage space freed (in MB)
-- - api_call: API endpoint called
-- - workspace_created: New workspace created
-- - workspace_deleted: Workspace removed
-- - connection_created: New connection created
-- - connection_deleted: Connection removed

-- AUTOMATIC COUNTER UPDATES:
-- When usage events are inserted, account counters are automatically updated:
-- - ai_request → current_monthly_ai_requests
-- - user_added/removed → current_user_count
-- - project_created/deleted → current_project_count
-- - dataset_created/deleted → current_dataset_count
-- - storage_used/freed → current_storage_mb

-- NEXT STEPS:
-- 1. Integrate usage tracking in application code
-- 2. Create scheduled job for monthly AI request counter reset
-- 3. Create scheduled job for archiving old events (optional)
-- 4. Create usage dashboard UI (Phase S.5)
-- 5. Add usage warning notifications (Phase S.7)

-- =====================================================
-- End of Migration S.1.5
-- =====================================================
