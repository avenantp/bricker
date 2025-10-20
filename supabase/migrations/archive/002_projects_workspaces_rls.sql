-- =====================================================
-- Row Level Security Policies for Projects & Workspaces
-- Migration: 002_projects_workspaces_rls
-- =====================================================

-- =====================================================
-- PROJECTS TABLE RLS POLICIES
-- =====================================================

-- Enable RLS on projects table
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Projects SELECT policy: Users can only see projects from their account
CREATE POLICY projects_select_policy ON projects
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

-- Projects INSERT policy: Account members can create projects
CREATE POLICY projects_insert_policy ON projects
  FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

-- Projects UPDATE policy: Owner, account admins, or project admins can update
CREATE POLICY projects_update_policy ON projects
  FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
    OR
    id IN (
      SELECT project_id
      FROM project_users
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Projects DELETE policy: Only project owner can delete
CREATE POLICY projects_delete_policy ON projects
  FOR DELETE
  USING (
    owner_id = auth.uid()
    OR
    id IN (
      SELECT project_id
      FROM project_users
      WHERE user_id = auth.uid()
        AND role = 'owner'
    )
  );

-- =====================================================
-- WORKSPACES TABLE RLS POLICIES
-- =====================================================

-- Enable RLS on workspaces table
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Workspaces SELECT policy: Users can see workspaces from their account
CREATE POLICY workspaces_select_policy ON workspaces
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

-- Workspaces INSERT policy: Project members can create workspaces
CREATE POLICY workspaces_insert_policy ON workspaces
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id
      FROM project_users
      WHERE user_id = auth.uid()
    )
    OR
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

-- Workspaces UPDATE policy: Owner, account admins, project admins, or workspace admins
CREATE POLICY workspaces_update_policy ON workspaces
  FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
    OR
    project_id IN (
      SELECT project_id
      FROM project_users
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
    OR
    id IN (
      SELECT workspace_id
      FROM workspace_users
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Workspaces DELETE policy: Owner, account admins, or workspace/project owners
CREATE POLICY workspaces_delete_policy ON workspaces
  FOR DELETE
  USING (
    owner_id = auth.uid()
    OR
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
    OR
    project_id IN (
      SELECT project_id
      FROM project_users
      WHERE user_id = auth.uid()
        AND role = 'owner'
    )
    OR
    id IN (
      SELECT workspace_id
      FROM workspace_users
      WHERE user_id = auth.uid()
        AND role = 'owner'
    )
  );

-- =====================================================
-- PROJECT_USERS TABLE RLS POLICIES
-- =====================================================

-- Enable RLS on project_users table
ALTER TABLE project_users ENABLE ROW LEVEL SECURITY;

-- Project Users SELECT: Users can see members of projects they have access to
CREATE POLICY project_users_select_policy ON project_users
  FOR SELECT
  USING (
    project_id IN (
      SELECT id
      FROM projects
      WHERE account_id IN (
        SELECT account_id
        FROM account_users
        WHERE user_id = auth.uid()
      )
    )
  );

-- Project Users INSERT: Project owners/admins and account admins can add members
CREATE POLICY project_users_insert_policy ON project_users
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id
      FROM projects
      WHERE owner_id = auth.uid()
        OR account_id IN (
          SELECT account_id
          FROM account_users
          WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    )
    OR
    project_id IN (
      SELECT project_id
      FROM project_users
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Project Users UPDATE: Project owners/admins and account admins can update roles
CREATE POLICY project_users_update_policy ON project_users
  FOR UPDATE
  USING (
    project_id IN (
      SELECT id
      FROM projects
      WHERE owner_id = auth.uid()
        OR account_id IN (
          SELECT account_id
          FROM account_users
          WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    )
    OR
    project_id IN (
      SELECT project_id
      FROM project_users
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Project Users DELETE: Project owners/admins and account admins can remove members
CREATE POLICY project_users_delete_policy ON project_users
  FOR DELETE
  USING (
    project_id IN (
      SELECT id
      FROM projects
      WHERE owner_id = auth.uid()
        OR account_id IN (
          SELECT account_id
          FROM account_users
          WHERE user_id = auth.uid()
            AND role = 'admin'
        )
    )
    OR
    project_id IN (
      SELECT project_id
      FROM project_users
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- WORKSPACE_USERS TABLE RLS POLICIES
-- =====================================================

-- Enable RLS on workspace_users table
ALTER TABLE workspace_users ENABLE ROW LEVEL SECURITY;

-- Workspace Users SELECT: Users can see members of workspaces they have access to
CREATE POLICY workspace_users_select_policy ON workspace_users
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT id
      FROM workspaces
      WHERE account_id IN (
        SELECT account_id
        FROM account_users
        WHERE user_id = auth.uid()
      )
    )
  );

-- Workspace Users INSERT: Workspace/project owners/admins can add members
CREATE POLICY workspace_users_insert_policy ON workspace_users
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id
      FROM workspaces
      WHERE owner_id = auth.uid()
        OR account_id IN (
          SELECT account_id
          FROM account_users
          WHERE user_id = auth.uid()
            AND role = 'admin'
        )
        OR project_id IN (
          SELECT project_id
          FROM project_users
          WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    )
    OR
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_users
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Workspace Users UPDATE: Workspace/project owners/admins can update roles
CREATE POLICY workspace_users_update_policy ON workspace_users
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT id
      FROM workspaces
      WHERE owner_id = auth.uid()
        OR account_id IN (
          SELECT account_id
          FROM account_users
          WHERE user_id = auth.uid()
            AND role = 'admin'
        )
        OR project_id IN (
          SELECT project_id
          FROM project_users
          WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    )
    OR
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_users
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- Workspace Users DELETE: Workspace/project owners/admins can remove members
CREATE POLICY workspace_users_delete_policy ON workspace_users
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT id
      FROM workspaces
      WHERE owner_id = auth.uid()
        OR account_id IN (
          SELECT account_id
          FROM account_users
          WHERE user_id = auth.uid()
            AND role = 'admin'
        )
        OR project_id IN (
          SELECT project_id
          FROM project_users
          WHERE user_id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    )
    OR
    workspace_id IN (
      SELECT workspace_id
      FROM workspace_users
      WHERE user_id = auth.uid()
        AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- END OF MIGRATION
-- =====================================================
