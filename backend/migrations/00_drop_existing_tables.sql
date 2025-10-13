-- =====================================================
-- DROP ALL EXISTING TABLES
-- =====================================================
-- This script drops ALL tables to ensure clean slate
-- Run this BEFORE running initial_schema.sql
-- =====================================================

-- Drop all tables in reverse dependency order
-- (child tables first, parent tables last)

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
DROP TABLE IF EXISTS company_users CASCADE;

-- Main entity tables
DROP TABLE IF EXISTS workspaces CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS invitations CASCADE;

-- Root tables
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS subscription_plans CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- Note: We're using CASCADE to automatically drop dependent objects
-- This ensures all foreign key constraints are handled

SELECT 'Cleanup complete. All tables dropped. Now run initial_schema.sql' AS status;
