-- =====================================================
-- Disable Row Level Security Policies
-- Migration: 004_disable_rls
-- Purpose: Move access control from database to application layer
-- =====================================================

-- =====================================================
-- DROP PROJECTS TABLE RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS projects_select_policy ON projects;
DROP POLICY IF EXISTS projects_insert_policy ON projects;
DROP POLICY IF EXISTS projects_update_policy ON projects;
DROP POLICY IF EXISTS projects_delete_policy ON projects;

-- Disable RLS on projects table
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- DROP WORKSPACES TABLE RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS workspaces_select_policy ON workspaces;
DROP POLICY IF EXISTS workspaces_insert_policy ON workspaces;
DROP POLICY IF EXISTS workspaces_update_policy ON workspaces;
DROP POLICY IF EXISTS workspaces_delete_policy ON workspaces;

-- Disable RLS on workspaces table
ALTER TABLE workspaces DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- DROP PROJECT_USERS TABLE RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS project_users_select_policy ON project_users;
DROP POLICY IF EXISTS project_users_insert_policy ON project_users;
DROP POLICY IF EXISTS project_users_update_policy ON project_users;
DROP POLICY IF EXISTS project_users_delete_policy ON project_users;

-- Disable RLS on project_users table
ALTER TABLE project_users DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- DROP WORKSPACE_USERS TABLE RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS workspace_users_select_policy ON workspace_users;
DROP POLICY IF EXISTS workspace_users_insert_policy ON workspace_users;
DROP POLICY IF EXISTS workspace_users_update_policy ON workspace_users;
DROP POLICY IF EXISTS workspace_users_delete_policy ON workspace_users;

-- Disable RLS on workspace_users table
ALTER TABLE workspace_users DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
