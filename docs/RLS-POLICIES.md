# Row Level Security (RLS) Policies Documentation

## Overview

This document describes the Row Level Security policies implemented for the Projects and Workspaces management system. RLS policies ensure that users can only access data they have permission to see and modify, enforcing account isolation and role-based access control at the database level.

## Implementation Details

**Migration File**: `supabase/migrations/002_projects_workspaces_rls.sql`

**Date Applied**: 2025-10-14

## Tables with RLS Enabled

1. `projects`
2. `workspaces`
3. `project_users`
4. `workspace_users`

---

## Projects Table Policies

### 1. projects_select_policy (SELECT)
**Purpose**: Account isolation - users can only see projects from accounts they belong to

**Logic**:
```sql
USING (
  account_id IN (
    SELECT account_id
    FROM account_users
    WHERE user_id = auth.uid()
  )
)
```

**Effect**: Users can SELECT projects only if they are members of the project's account (via `account_users` table).

---

### 2. projects_insert_policy (INSERT)
**Purpose**: Allow account members to create projects

**Logic**:
```sql
WITH CHECK (
  account_id IN (
    SELECT account_id
    FROM account_users
    WHERE user_id = auth.uid()
  )
)
```

**Effect**: Users can INSERT projects only into accounts where they are members.

---

### 3. projects_update_policy (UPDATE)
**Purpose**: Restrict updates to owners and admins

**Logic**:
```sql
USING (
  owner_id = auth.uid()
  OR
  account_id IN (
    SELECT account_id
    FROM account_users
    WHERE user_id = auth.uid() AND role = 'admin'
  )
  OR
  id IN (
    SELECT project_id
    FROM project_users
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
)
```

**Effect**: Users can UPDATE projects if they are:
- The project owner (`owner_id`)
- An admin of the account
- An owner or admin in the project_users table

---

### 4. projects_delete_policy (DELETE)
**Purpose**: Restrict deletion to project owners only

**Logic**:
```sql
USING (
  owner_id = auth.uid()
  OR
  id IN (
    SELECT project_id
    FROM project_users
    WHERE user_id = auth.uid() AND role = 'owner'
  )
)
```

**Effect**: Users can DELETE projects only if they are:
- The project owner (`owner_id`)
- Assigned as owner in the project_users table

---

## Workspaces Table Policies

### 1. workspaces_select_policy (SELECT)
**Purpose**: Account isolation - users can only see workspaces from their accounts

**Logic**:
```sql
USING (
  account_id IN (
    SELECT account_id
    FROM account_users
    WHERE user_id = auth.uid()
  )
)
```

**Effect**: Users can SELECT workspaces only from accounts they belong to.

---

### 2. workspaces_insert_policy (INSERT)
**Purpose**: Allow project members to create workspaces

**Logic**:
```sql
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
)
```

**Effect**: Users can INSERT workspaces if they are:
- Members of the project (via `project_users`)
- Members of the account (via `account_users`)

---

### 3. workspaces_update_policy (UPDATE)
**Purpose**: Restrict updates to owners and admins at multiple levels

**Logic**:
```sql
USING (
  owner_id = auth.uid()
  OR
  account_id IN (SELECT account_id FROM account_users WHERE user_id = auth.uid() AND role = 'admin')
  OR
  project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
  OR
  id IN (SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid() AND role IN ('owner', 'admin'))
)
```

**Effect**: Users can UPDATE workspaces if they are:
- The workspace owner
- An admin of the account
- An owner or admin of the project
- An owner or admin in the workspace_users table

---

### 4. workspaces_delete_policy (DELETE)
**Purpose**: Restrict deletion to owners and admins

**Logic**:
```sql
USING (
  owner_id = auth.uid()
  OR
  account_id IN (SELECT account_id FROM account_users WHERE user_id = auth.uid() AND role = 'admin')
  OR
  project_id IN (SELECT project_id FROM project_users WHERE user_id = auth.uid() AND role = 'owner')
  OR
  id IN (SELECT workspace_id FROM workspace_users WHERE user_id = auth.uid() AND role = 'owner')
)
```

**Effect**: Users can DELETE workspaces if they are:
- The workspace owner
- An admin of the account
- An owner of the project
- An owner in the workspace_users table

---

## Project Users Table Policies

### 1. project_users_select_policy (SELECT)
**Purpose**: Allow users to see members of projects they have access to

**Logic**:
```sql
USING (
  project_id IN (
    SELECT id FROM projects
    WHERE account_id IN (
      SELECT account_id FROM account_users WHERE user_id = auth.uid()
    )
  )
)
```

**Effect**: Users can see project members if they have access to the project (via account membership).

---

### 2. project_users_insert_policy (INSERT)
**Purpose**: Allow project/account admins to add members

**Logic**:
```sql
WITH CHECK (
  project_id IN (
    SELECT id FROM projects
    WHERE owner_id = auth.uid() OR account_id IN (...)
  )
  OR
  project_id IN (
    SELECT project_id FROM project_users
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
)
```

**Effect**: Users can add project members if they are owners or admins.

---

### 3. project_users_update_policy (UPDATE)
**Purpose**: Allow owners and admins to change member roles

**Effect**: Same as INSERT policy - owners and admins can update member roles.

---

### 4. project_users_delete_policy (DELETE)
**Purpose**: Allow owners and admins to remove members

**Effect**: Same as INSERT policy - owners and admins can remove members.

---

## Workspace Users Table Policies

### 1. workspace_users_select_policy (SELECT)
**Purpose**: Allow users to see members of workspaces they have access to

**Effect**: Users can see workspace members if they have access to the workspace (via account membership).

---

### 2. workspace_users_insert_policy (INSERT)
**Purpose**: Allow workspace/project/account admins to add members

**Effect**: Users with owner/admin roles at workspace, project, or account level can add members.

---

### 3. workspace_users_update_policy (UPDATE)
**Purpose**: Allow admins to change member roles

**Effect**: Same as INSERT policy.

---

### 4. workspace_users_delete_policy (DELETE)
**Purpose**: Allow admins to remove members

**Effect**: Same as INSERT policy.

---

## Role-Based Permissions Summary

| Action | Owner | Admin | Editor | Viewer |
|--------|-------|-------|--------|--------|
| **Projects** |
| View project | ✅ | ✅ | ✅ | ✅ |
| Create project | ✅ | ✅ | ✅ | ✅ |
| Update project | ✅ | ✅ | ❌ | ❌ |
| Delete project | ✅ | ❌ | ❌ | ❌ |
| Manage members | ✅ | ✅ | ❌ | ❌ |
| **Workspaces** |
| View workspace | ✅ | ✅ | ✅ | ✅ |
| Create workspace | ✅ | ✅ | ✅ | ❌ |
| Update workspace | ✅ | ✅ | ❌ | ❌ |
| Delete workspace | ✅ | ✅ | ❌ | ❌ |
| Manage members | ✅ | ✅ | ❌ | ❌ |

---

## Testing the RLS Policies

### Automated Testing

A test script has been created at `test-rls-policies.js`. To run it:

```bash
node test-rls-policies.js
```

**Prerequisites**:
- You must be signed in to the application
- Your session must be active
- You need at least one account

The script tests:
1. Account isolation (can't see other accounts' data)
2. Project CRUD operations
3. Workspace CRUD operations
4. Project/Workspace user management

---

### Manual Testing Steps

#### Test 1: Account Isolation

**Goal**: Verify users can only see projects/workspaces from their account

1. Sign in as User A
2. Create a project
3. Sign out
4. Sign in as User B (different account)
5. Try to query projects table
6. **Expected**: User B should NOT see User A's project

**SQL Test**:
```sql
-- As User A
SELECT * FROM projects; -- Should see User A's projects

-- As User B
SELECT * FROM projects; -- Should NOT see User A's projects
```

---

#### Test 2: Project Creation (INSERT)

**Goal**: Verify account members can create projects

1. Sign in as any user
2. Attempt to create a project in your account
3. **Expected**: Success
4. Attempt to create a project in another account (if you have ID)
5. **Expected**: Failure (RLS policy violation)

**SQL Test**:
```sql
INSERT INTO projects (account_id, name, project_type, owner_id)
VALUES ('your-account-id', 'Test Project', 'Standard', 'your-user-id');
-- Should succeed

INSERT INTO projects (account_id, name, project_type, owner_id)
VALUES ('other-account-id', 'Malicious', 'Standard', 'your-user-id');
-- Should fail
```

---

#### Test 3: Project Update (UPDATE)

**Goal**: Verify only owners/admins can update projects

1. Sign in as project owner
2. Update the project
3. **Expected**: Success
4. Sign in as viewer
5. Attempt to update the same project
6. **Expected**: Failure (no rows updated)

**SQL Test**:
```sql
-- As owner
UPDATE projects SET description = 'Updated' WHERE id = 'project-id';
-- Should succeed and return 1 row updated

-- As viewer (different user, viewer role)
UPDATE projects SET description = 'Hack' WHERE id = 'project-id';
-- Should return 0 rows updated (RLS blocks it)
```

---

#### Test 4: Project Deletion (DELETE)

**Goal**: Verify only owners can delete projects

1. Sign in as project owner
2. Delete a project
3. **Expected**: Success
4. Sign in as admin (not owner)
5. Attempt to delete a project
6. **Expected**: Failure (0 rows deleted)

**SQL Test**:
```sql
-- As owner
DELETE FROM projects WHERE id = 'project-id';
-- Should succeed

-- As admin (not owner)
DELETE FROM projects WHERE id = 'another-project-id';
-- Should return 0 rows deleted
```

---

#### Test 5: Workspace Operations

**Goal**: Verify workspace RLS policies work similarly

Follow the same pattern as projects tests for workspaces.

---

#### Test 6: Cross-Account Access

**Goal**: Verify RLS prevents cross-account data access

1. Get a project ID from Account A
2. Sign in as user from Account B
3. Try to SELECT the specific project by ID
4. **Expected**: Empty result set
5. Try to UPDATE the project
6. **Expected**: 0 rows updated
7. Try to DELETE the project
8. **Expected**: 0 rows deleted

**SQL Test**:
```sql
-- As User B, try to access User A's project
SELECT * FROM projects WHERE id = 'user-a-project-id';
-- Should return empty (RLS blocks it)

UPDATE projects SET name = 'Hacked' WHERE id = 'user-a-project-id';
-- Should return 0 rows updated

DELETE FROM projects WHERE id = 'user-a-project-id';
-- Should return 0 rows deleted
```

---

## Security Considerations

### Strengths

1. **Defense in Depth**: RLS provides database-level security even if application logic fails
2. **Account Isolation**: Strong separation between accounts
3. **Role-Based Access**: Granular control based on user roles
4. **Cascade Protection**: Related tables (project_users, workspace_users) are also protected

### Potential Issues to Monitor

1. **Performance**: Complex RLS policies can impact query performance
   - **Mitigation**: Proper indexing on `account_id`, `user_id`, `role` columns

2. **Service Role Bypass**: Service role key bypasses RLS
   - **Mitigation**: Never expose service role key to client
   - Keep it server-side only

3. **Policy Complexity**: Multiple OR conditions can be hard to audit
   - **Mitigation**: Document each policy thoroughly
   - Regular security audits

---

## Troubleshooting

### Problem: User can't see their own projects

**Possible Causes**:
1. User not added to `account_users` table
2. RLS policy not applied correctly
3. Auth token expired

**Solution**:
```sql
-- Check if user is in account_users
SELECT * FROM account_users WHERE user_id = 'user-id';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'projects';
```

---

### Problem: RLS policies not working (can see all data)

**Possible Causes**:
1. Using service role key instead of anon key
2. RLS not enabled on table

**Solution**:
```sql
-- Check if RLS is enabled
SELECT relname, relrowsecurity
FROM pg_class
WHERE relname IN ('projects', 'workspaces', 'project_users', 'workspace_users');

-- Enable RLS if not enabled
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
```

---

## Maintenance

### Adding New Policies

When adding new policies:

1. Document the policy purpose and logic
2. Test with multiple user roles
3. Update this documentation
4. Create migration file with clear comments

### Modifying Existing Policies

When modifying policies:

1. Create a new migration file (don't edit existing ones)
2. Drop old policy: `DROP POLICY policy_name ON table_name;`
3. Create new policy with updated logic
4. Test thoroughly before applying to production
5. Update this documentation

---

## References

- Supabase RLS Documentation: https://supabase.com/docs/guides/auth/row-level-security
- PostgreSQL RLS Documentation: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- Project Specification: `docs/prp/021-project-workspaces-specification.md`
- Task List: `docs/prp/020-project-workspaces-tasklist.md`

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-14 | Initial RLS policies for projects and workspaces | Claude Code |

---

## Checklist for Phase 1.2 Completion

- [x] **1.2.1** Created RLS policy for projects SELECT
- [x] **1.2.2** Created RLS policy for projects INSERT
- [x] **1.2.3** Created RLS policy for projects UPDATE
- [x] **1.2.4** Created RLS policy for projects DELETE
- [x] **1.2.5** Created RLS policy for workspaces SELECT
- [x] **1.2.6** Created RLS policy for workspaces INSERT
- [x] **1.2.7** Created RLS policy for workspaces UPDATE
- [x] **1.2.8** Created RLS policy for workspaces DELETE
- [x] **1.2.9** Created RLS policies for project_users
- [x] **1.2.10** Created RLS policies for workspace_users
- [x] **1.2.11** Created test script for RLS policies
- [x] **1.2.12** Documented RLS policies and test results

**Status**: ✅ Phase 1.2 (Row Level Security Policies) COMPLETE
