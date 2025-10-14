# Database Functions and Triggers Documentation

## Overview

This document describes the PostgreSQL functions and triggers implemented for the Projects and Workspaces management system. These database-level automations ensure data consistency, simplify application code, and provide reusable utilities for permission checking.

## Implementation Details

**Migration File**: `supabase/migrations/003_functions_and_triggers.sql`

**Date Applied**: 2025-10-14

---

## Access Control Functions

### 1. has_project_access(project_id, user_id)

**Purpose**: Check if a user has access to a specific project

**Parameters**:
- `p_project_id` (UUID): The project ID to check
- `p_user_id` (UUID): The user ID to check

**Returns**: BOOLEAN

**Logic**:
```sql
Returns TRUE if user:
- Is the project owner (owner_id)
- Is a member of the project's account (via account_users)
- Is explicitly added to the project (via project_users)
```

**Usage Example**:
```typescript
const { data: hasAccess } = await supabase.rpc('has_project_access', {
  p_project_id: projectId,
  p_user_id: userId
});

if (hasAccess) {
  // User can access the project
}
```

**Performance**: Uses indexes on `owner_id`, `account_id`, `project_id`, and `user_id`

---

### 2. get_project_user_role(project_id, user_id)

**Purpose**: Retrieve the role of a user in a specific project

**Parameters**:
- `p_project_id` (UUID): The project ID
- `p_user_id` (UUID): The user ID

**Returns**: VARCHAR (Role name) or NULL if no access

**Role Resolution Order**:
1. **owner** - If user is the project owner (`owner_id`)
2. **admin** - If user is an account admin
3. **owner/admin/editor/viewer** - From `project_users` table (explicit assignment)
4. **viewer** - Default for account members with no explicit role

**Usage Example**:
```typescript
const { data: role } = await supabase.rpc('get_project_user_role', {
  p_project_id: projectId,
  p_user_id: userId
});

if (role === 'owner' || role === 'admin') {
  // User can edit project
}
```

**Performance**: Early exit on first match (owner check first, then admin, then explicit role)

---

### 3. has_workspace_access(workspace_id, user_id)

**Purpose**: Check if a user has access to a specific workspace

**Parameters**:
- `p_workspace_id` (UUID): The workspace ID to check
- `p_user_id` (UUID): The user ID to check

**Returns**: BOOLEAN

**Logic**:
```sql
Returns TRUE if user:
- Is the workspace owner (owner_id)
- Is a member of the workspace's account (via account_users)
- Is a member of the workspace's project (via project_users)
- Is explicitly added to the workspace (via workspace_users)
```

**Usage Example**:
```typescript
const { data: hasAccess } = await supabase.rpc('has_workspace_access', {
  p_workspace_id: workspaceId,
  p_user_id: userId
});

if (!hasAccess) {
  throw new Error('Access denied');
}
```

**Performance**: Leverages multiple indexes, exits on first TRUE condition

---

### 4. get_workspace_user_role(workspace_id, user_id)

**Purpose**: Retrieve the role of a user in a specific workspace

**Parameters**:
- `p_workspace_id` (UUID): The workspace ID
- `p_user_id` (UUID): The user ID

**Returns**: VARCHAR (Role name) or NULL if no access

**Role Resolution Order**:
1. **owner** - If user is the workspace owner (`owner_id`)
2. **admin** - If user is an account admin
3. **owner/admin** - If user is project owner/admin
4. **owner/admin/editor/viewer** - From `workspace_users` table (explicit assignment)
5. **Inherited from project** - User's role in the parent project
6. **viewer** - Default for account members

**Usage Example**:
```typescript
const { data: role } = await supabase.rpc('get_workspace_user_role', {
  p_workspace_id: workspaceId,
  p_user_id: userId
});

switch (role) {
  case 'owner':
  case 'admin':
    // Full access
    break;
  case 'editor':
    // Can edit but not manage members
    break;
  case 'viewer':
    // Read-only
    break;
  default:
    // No access
}
```

**Performance**: Cascading checks with early exits

---

## Utility Functions

### 5. get_user_projects(user_id)

**Purpose**: Retrieve all projects accessible by a user with their roles

**Parameters**:
- `p_user_id` (UUID): The user ID

**Returns**: TABLE with columns:
- `project_id` (UUID)
- `project_name` (VARCHAR)
- `project_type` (VARCHAR)
- `account_id` (UUID)
- `user_role` (VARCHAR)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Usage Example**:
```typescript
const { data: projects } = await supabase.rpc('get_user_projects', {
  p_user_id: userId
});

// projects is an array of project objects with role included
projects.forEach(project => {
  console.log(`${project.project_name}: ${project.user_role}`);
});
```

**Benefits**:
- Single query instead of multiple joins
- Automatically includes user role
- Sorted by most recently updated

---

### 6. get_user_workspaces(user_id, project_id?)

**Purpose**: Retrieve all workspaces accessible by a user with their roles

**Parameters**:
- `p_user_id` (UUID): The user ID
- `p_project_id` (UUID, optional): Filter by specific project

**Returns**: TABLE with columns:
- `workspace_id` (UUID)
- `workspace_name` (VARCHAR)
- `project_id` (UUID)
- `project_name` (VARCHAR)
- `account_id` (UUID)
- `user_role` (VARCHAR)
- `source_control_status` (VARCHAR)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Usage Example**:
```typescript
// Get all workspaces
const { data: allWorkspaces } = await supabase.rpc('get_user_workspaces', {
  p_user_id: userId,
  p_project_id: null
});

// Get workspaces for specific project
const { data: projectWorkspaces } = await supabase.rpc('get_user_workspaces', {
  p_user_id: userId,
  p_project_id: projectId
});
```

**Benefits**:
- Includes project information
- Shows source control status
- Automatically includes user role
- Sorted by most recently updated

---

## Triggers

### 7. projects_updated_at

**Type**: BEFORE UPDATE trigger on `projects` table

**Purpose**: Automatically update `updated_at` timestamp when a project is modified

**Function**: `update_updated_at_column()`

**Behavior**:
- Fires before every UPDATE operation
- Sets `NEW.updated_at = NOW()`
- Ensures `updated_at` is always current

**Example**:
```typescript
// No need to manually set updated_at
await supabase
  .from('projects')
  .update({ name: 'New Name' })
  .eq('id', projectId);

// updated_at is automatically set by trigger
```

**Benefits**:
- Consistency across all updates
- Cannot forget to update timestamp
- Reduces application code

---

### 8. workspaces_updated_at

**Type**: BEFORE UPDATE trigger on `workspaces` table

**Purpose**: Automatically update `updated_at` timestamp when a workspace is modified

**Function**: `update_updated_at_column()`

**Behavior**: Same as `projects_updated_at` trigger

**Example**:
```typescript
await supabase
  .from('workspaces')
  .update({ description: 'Updated' })
  .eq('id', workspaceId);

// updated_at automatically updated
```

---

### 9. project_owner_to_users

**Type**: AFTER INSERT trigger on `projects` table

**Purpose**: Automatically add project owner to `project_users` table

**Function**: `add_project_owner_to_project_users()`

**Behavior**:
- Fires after a new project is inserted
- If `owner_id` is set, adds entry to `project_users` with role='owner'
- Uses `ON CONFLICT` to handle duplicates gracefully
- If owner already exists, updates role to 'owner'

**Example**:
```typescript
// Create project
const { data: project } = await supabase
  .from('projects')
  .insert({
    account_id: accountId,
    name: 'My Project',
    owner_id: userId
  })
  .select()
  .single();

// Trigger automatically adds to project_users:
// { project_id: project.id, user_id: userId, role: 'owner' }
```

**Benefits**:
- Ensures owner always has explicit role
- Simplifies permission checks
- Maintains data integrity

---

### 10. workspace_owner_to_users

**Type**: AFTER INSERT trigger on `workspaces` table

**Purpose**: Automatically add workspace owner to `workspace_users` table

**Function**: `add_workspace_owner_to_workspace_users()`

**Behavior**: Same as `project_owner_to_users` trigger

**Example**:
```typescript
// Create workspace
const { data: workspace } = await supabase
  .from('workspaces')
  .insert({
    account_id: accountId,
    project_id: projectId,
    name: 'Dev Workspace',
    owner_id: userId
  })
  .select()
  .single();

// Trigger automatically adds to workspace_users:
// { workspace_id: workspace.id, user_id: userId, role: 'owner' }
```

**Benefits**: Same as project_owner_to_users

---

## Testing

### Automated Testing

A comprehensive test script is available at `test-functions-triggers.js`.

**Run tests**:
```bash
node test-functions-triggers.js
```

**Prerequisites**:
- Authenticated user session
- At least one account

**Tests Performed**:
1. Project owner auto-assignment trigger
2. `has_project_access()` function
3. `get_project_user_role()` function
4. Project `updated_at` trigger
5. Workspace owner auto-assignment trigger
6. `has_workspace_access()` function
7. `get_workspace_user_role()` function
8. Workspace `updated_at` trigger
9. `get_user_projects()` utility function
10. `get_user_workspaces()` utility function

---

### Manual Testing

#### Test 1: Owner Assignment Triggers

```sql
-- Insert project
INSERT INTO projects (account_id, name, owner_id, project_type)
VALUES ('account-id', 'Test', 'user-id', 'Standard')
RETURNING id;

-- Check if owner was added to project_users
SELECT * FROM project_users
WHERE project_id = 'returned-id' AND user_id = 'user-id';
-- Should return one row with role='owner'
```

#### Test 2: Updated At Triggers

```sql
-- Update project
UPDATE projects SET name = 'Updated Name' WHERE id = 'project-id'
RETURNING updated_at;

-- updated_at should be recent timestamp
```

#### Test 3: Access Functions

```sql
-- Test has_project_access
SELECT has_project_access('project-id', 'user-id');
-- Returns true/false

-- Test get_project_user_role
SELECT get_project_user_role('project-id', 'user-id');
-- Returns role string or NULL
```

#### Test 4: Utility Functions

```sql
-- Get user's projects
SELECT * FROM get_user_projects('user-id');

-- Get user's workspaces
SELECT * FROM get_user_workspaces('user-id', NULL);
```

---

## Performance Considerations

### Indexes

All functions leverage existing indexes:

```sql
-- Projects
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_account ON projects(account_id);

-- Workspaces
CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX idx_workspaces_account ON workspaces(account_id);
CREATE INDEX idx_workspaces_project ON workspaces(project_id);

-- Access control tables
CREATE INDEX idx_project_users_user ON project_users(user_id);
CREATE INDEX idx_project_users_project ON project_users(project_id);
CREATE INDEX idx_workspace_users_user ON workspace_users(user_id);
CREATE INDEX idx_workspace_users_workspace ON workspace_users(workspace_id);
CREATE INDEX idx_account_users_user ON account_users(user_id);
```

### Function Optimization

1. **SECURITY DEFINER**: Functions run with creator's privileges
   - Allows access to underlying tables even with RLS enabled
   - Be cautious with modifications

2. **Early Exits**: Role resolution uses cascading checks
   - Stops at first match
   - Owner checks first (fastest)

3. **Exists vs Count**: Uses `EXISTS` for boolean checks
   - More efficient than `COUNT(*) > 0`
   - Stops after finding first match

---

## Security Considerations

### SECURITY DEFINER Functions

All functions use `SECURITY DEFINER`, meaning they execute with the privileges of the function creator (typically superuser).

**Implications**:
- Functions bypass RLS policies
- Can access any data in tables
- Must validate inputs carefully

**Mitigations**:
- Functions only return boolean or role strings
- No direct data exposure
- All queries filtered by user_id parameter
- Cannot be used to bypass account isolation

### Trigger Security

Triggers run in the database context and cannot be bypassed by application code.

**Benefits**:
- Enforces business rules at database level
- Protection even if application logic is flawed
- Consistent behavior across all clients

---

## Common Issues and Solutions

### Issue 1: Trigger not firing

**Symptoms**: Owner not added to project_users/workspace_users

**Possible Causes**:
1. Trigger not created
2. owner_id is NULL
3. Conflict with existing entry

**Solution**:
```sql
-- Check if triggers exist
SELECT * FROM pg_trigger
WHERE tgname IN ('project_owner_to_users', 'workspace_owner_to_users');

-- Check trigger function
SELECT proname FROM pg_proc WHERE proname LIKE '%owner%';

-- Manually test function
SELECT add_project_owner_to_project_users();
```

---

### Issue 2: updated_at not updating

**Symptoms**: Timestamp remains the same after update

**Possible Causes**:
1. Trigger not created
2. Update didn't actually change any values
3. PostgreSQL optimized away the update

**Solution**:
```sql
-- Check trigger
SELECT * FROM pg_trigger WHERE tgname LIKE '%updated_at%';

-- Force update
UPDATE projects SET updated_at = NOW() WHERE id = 'project-id';
```

---

### Issue 3: Function returns NULL unexpectedly

**Symptoms**: `get_project_user_role()` returns NULL for owner

**Possible Causes**:
1. User not in account_users
2. Owner not in project_users (trigger didn't fire)
3. Cascade of role checks all failed

**Solution**:
```sql
-- Check account_users
SELECT * FROM account_users WHERE user_id = 'user-id';

-- Check project_users
SELECT * FROM project_users
WHERE project_id = 'project-id' AND user_id = 'user-id';

-- Check project owner
SELECT owner_id FROM projects WHERE id = 'project-id';
```

---

## Maintenance

### Modifying Functions

When modifying functions:

1. Create new migration file
2. Use `CREATE OR REPLACE FUNCTION`
3. Test thoroughly before deploying
4. Update this documentation

**Example**:
```sql
-- In new migration file: 004_update_functions.sql
CREATE OR REPLACE FUNCTION has_project_access(
  p_project_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Updated logic here
END;
$$;
```

---

### Adding New Triggers

When adding triggers:

1. Create trigger function first
2. Create trigger second
3. Test with sample data
4. Document in this file

**Example**:
```sql
-- Create function
CREATE OR REPLACE FUNCTION new_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Trigger logic
  RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER trigger_name
  AFTER INSERT ON table_name
  FOR EACH ROW
  EXECUTE FUNCTION new_trigger_function();
```

---

## References

- PostgreSQL Functions: https://www.postgresql.org/docs/current/sql-createfunction.html
- PostgreSQL Triggers: https://www.postgresql.org/docs/current/sql-createtrigger.html
- Supabase Functions: https://supabase.com/docs/guides/database/functions
- Project Specification: `docs/prp/021-project-workspaces-specification.md`

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-14 | Initial functions and triggers | Claude Code |

---

## Checklist for Phase 1.3 Completion

- [x] **1.3.1** Created function `has_project_access(project_id, user_id)`
- [x] **1.3.2** Created function `get_project_user_role(project_id, user_id)`
- [x] **1.3.3** Created function `has_workspace_access(workspace_id, user_id)`
- [x] **1.3.4** Created function `get_workspace_user_role(workspace_id, user_id)`
- [x] **1.3.5** Created trigger to auto-update `updated_at` on projects
- [x] **1.3.6** Created trigger to auto-update `updated_at` on workspaces
- [x] **1.3.7** Created trigger to add project owner to project_users
- [x] **1.3.8** Created trigger to add workspace owner to workspace_users
- [x] **1.3.9** Created test script for all functions and triggers
- [x] **1.3.10** Documented all functions and triggers

**Bonus**:
- [x] Created utility functions `get_user_projects()` and `get_user_workspaces()`

**Status**: ✅ Phase 1.3 (Database Functions and Triggers) COMPLETE
