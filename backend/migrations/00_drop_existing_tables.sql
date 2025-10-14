-- =====================================================
-- DROP ALL EXISTING TABLES
-- =====================================================
-- This script drops ALL tables to ensure clean slate
-- Run this BEFORE running 01_initial_schema.sql
-- =====================================================

-- Drop all tables in reverse dependency order
-- (child tables first, parent tables last)

-- Drop subscription-related tables first
DROP TABLE IF EXISTS usage_events CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS subscriptions CASCADE;

-- Audit and tracking tables
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS source_code_commits CASCADE;

-- Mapping tables
DROP TABLE IF EXISTS workspace_datasets CASCADE;
DROP TABLE IF EXISTS project_datasets CASCADE;

-- Data model tables
DROP TABLE IF EXISTS lineage CASCADE;
DROP TABLE IF EXISTS columns CASCADE;
DROP TABLE IF EXISTS datasets CASCADE;

-- Support tables
DROP TABLE IF EXISTS template_fragments CASCADE;
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS macros CASCADE;
DROP TABLE IF EXISTS connections CASCADE;
DROP TABLE IF EXISTS environments CASCADE;
DROP TABLE IF EXISTS configurations CASCADE;

-- Membership tables
DROP TABLE IF EXISTS workspace_users CASCADE;
DROP TABLE IF EXISTS project_users CASCADE;
DROP TABLE IF EXISTS account_users CASCADE;

-- Main entity tables
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;

-- Root tables
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;

-- Drop views
DROP VIEW IF EXISTS accounts_public CASCADE;
DROP VIEW IF EXISTS active_subscriptions CASCADE;
DROP VIEW IF EXISTS expiring_trials CASCADE;
DROP VIEW IF EXISTS successful_payments CASCADE;
DROP VIEW IF EXISTS recent_failed_payments CASCADE;
DROP VIEW IF EXISTS payment_summary_by_account CASCADE;
DROP VIEW IF EXISTS ai_usage_current_month CASCADE;
DROP VIEW IF EXISTS recent_usage_events CASCADE;
DROP VIEW IF EXISTS usage_summary_last_30_days CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS get_active_subscription CASCADE;
DROP FUNCTION IF EXISTS is_subscription_active CASCADE;
DROP FUNCTION IF EXISTS is_trial_active CASCADE;
DROP FUNCTION IF EXISTS get_total_payments CASCADE;
DROP FUNCTION IF EXISTS get_failed_payment_count CASCADE;
DROP FUNCTION IF EXISTS get_last_successful_payment CASCADE;
DROP FUNCTION IF EXISTS count_ai_requests_current_period CASCADE;
DROP FUNCTION IF EXISTS get_usage_summary CASCADE;
DROP FUNCTION IF EXISTS track_usage_event CASCADE;
DROP FUNCTION IF EXISTS update_account_counters_on_usage_event CASCADE;
DROP FUNCTION IF EXISTS archive_old_usage_events CASCADE;
DROP FUNCTION IF EXISTS log_payment_status_change CASCADE;

-- Note: We're using CASCADE to automatically drop dependent objects
-- This ensures all foreign key constraints are handled

SELECT 'Cleanup complete. All tables dropped. Now run 01_initial_schema.sql' AS status;
