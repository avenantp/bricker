# Soft Delete Implementation

## Overview

Soft delete functionality has been implemented for all core tables in the Uroq database. This allows records to be "deleted" without permanently removing them from the database, enabling recovery and maintaining referential integrity.

## Migration File

**Location**: `backend/migrations/S_4_1_implement_soft_delete.sql`

## Tables with Soft Delete

The following 12 tables now support soft delete:

1. **accounts** - Account records
2. **columns** - Dataset column definitions
3. **configurations** - Workspace configurations
4. **connections** - Data source connections
5. **datasets** - Dataset records
6. **environments** - Environment configurations
7. **invitations** - User invitations
8. **macros** - Code macros
9. **projects** - Project records
10. **templates** - Template definitions
11. **users** - User accounts
12. **workspaces** - Workspace records

## Schema Changes

### Columns Added

Each table now has two additional columns:

- `deleted_at TIMESTAMP` - When the record was soft deleted (NULL = active)
- `deleted_by UUID` - Foreign key to users table, tracks who deleted it

### Indexes Created

For each table:
- **Active Records Index**: `idx_{table}_active` - Filters WHERE deleted_at IS NULL
- **Deleted Records Index**: `idx_{table}_deleted` - Filters WHERE deleted_at IS NOT NULL

These partial indexes improve query performance when filtering by deletion status.

## Helper Functions

### Generic Functions

#### 1. `soft_delete(table_name, record_id, deleted_by_user_id)`
Soft deletes a single record in any supported table.

```sql
-- Example: Soft delete a connection
SELECT soft_delete('connections', 'connection-uuid', 'user-uuid');
```

**Returns**: `BOOLEAN` - true if successful

#### 2. `restore_deleted(table_name, record_id)`
Restores a soft-deleted record by clearing deleted_at and deleted_by.

```sql
-- Example: Restore a deleted workspace
SELECT restore_deleted('workspaces', 'workspace-uuid');
```

**Returns**: `BOOLEAN` - true if successful

#### 3. `permanent_delete(table_name, record_id)`
Permanently deletes a record (only if already soft deleted).

```sql
-- Example: Permanently remove a soft-deleted project
SELECT permanent_delete('projects', 'project-uuid');
```

**Returns**: `BOOLEAN` - true if successful

#### 4. `cleanup_soft_deleted_records(table_name, days_old)`
Permanently deletes soft-deleted records older than specified days.

```sql
-- Example: Clean up datasets deleted 90+ days ago
SELECT cleanup_soft_deleted_records('datasets', 90);
```

**Returns**: `INTEGER` - number of records permanently deleted

### Cascade Functions

These functions handle soft deleting records with dependent relationships:

#### 1. `soft_delete_account(account_id, deleted_by_user_id)`
Soft deletes an account and cascades to:
- All projects in the account
- All workspaces in the account
- All datasets in the account

```sql
SELECT soft_delete_account('account-uuid', 'user-uuid');
```

**Returns**: `JSONB` - Summary with counts:
```json
{
  "success": true,
  "account_id": "uuid",
  "projects_deleted": 5,
  "workspaces_deleted": 12,
  "datasets_deleted": 150
}
```

#### 2. `soft_delete_project(project_id, deleted_by_user_id)`
Soft deletes a project and cascades to all workspaces in the project.

```sql
SELECT soft_delete_project('project-uuid', 'user-uuid');
```

**Returns**: `JSONB` - Summary with counts:
```json
{
  "success": true,
  "project_id": "uuid",
  "workspaces_deleted": 3
}
```

#### 3. `soft_delete_dataset(dataset_id, deleted_by_user_id)`
Soft deletes a dataset and cascades to all columns in the dataset.

```sql
SELECT soft_delete_dataset('dataset-uuid', 'user-uuid');
```

**Returns**: `JSONB` - Summary with counts:
```json
{
  "success": true,
  "dataset_id": "uuid",
  "columns_deleted": 25
}
```

## Active Record Views

Convenience views that automatically filter out soft-deleted records:

- `accounts_active`
- `projects_active`
- `workspaces_active`
- `datasets_active`
- `columns_active`
- `connections_active`
- `configurations_active`
- `environments_active`
- `users_active`
- `macros_active`
- `templates_active`
- `invitations_active`

### Usage

```sql
-- Instead of manually filtering
SELECT * FROM datasets WHERE deleted_at IS NULL;

-- Use the active view
SELECT * FROM datasets_active;
```

## Query Patterns

### Find Active Records

```sql
-- Explicit filter
SELECT * FROM projects WHERE deleted_at IS NULL;

-- Using view
SELECT * FROM projects_active;
```

### Find Deleted Records

```sql
-- All deleted records
SELECT * FROM datasets WHERE deleted_at IS NOT NULL;

-- Recently deleted (last 7 days)
SELECT * FROM workspaces
WHERE deleted_at > NOW() - INTERVAL '7 days';

-- Deleted by specific user
SELECT * FROM connections
WHERE deleted_by = 'user-uuid';
```

### Soft Delete Operations

```sql
-- Soft delete a single record
UPDATE connections
SET deleted_at = NOW(), deleted_by = 'user-uuid'
WHERE id = 'connection-uuid';

-- Or use helper function
SELECT soft_delete('connections', 'connection-uuid', 'user-uuid');
```

### Restore Operations

```sql
-- Restore a single record
UPDATE datasets
SET deleted_at = NULL, deleted_by = NULL
WHERE id = 'dataset-uuid';

-- Or use helper function
SELECT restore_deleted('datasets', 'dataset-uuid');
```

## Application Integration

### Backend API Recommendations

#### 1. Default Behavior
By default, API endpoints should only return active records:

```typescript
// Example: Get all projects
const projects = await db.query('SELECT * FROM projects_active WHERE account_id = $1', [accountId]);
```

#### 2. Include Deleted Flag
For admin views or trash functionality, add a query parameter:

```typescript
// GET /api/projects?includeDeleted=true
const query = includeDeleted
  ? 'SELECT * FROM projects WHERE account_id = $1'
  : 'SELECT * FROM projects_active WHERE account_id = $1';
```

#### 3. Soft Delete Endpoint
Create a delete endpoint that soft deletes by default:

```typescript
// DELETE /api/projects/:id
await db.query(
  'UPDATE projects SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2',
  [userId, projectId]
);

// Or use cascade function for projects
await db.query(
  'SELECT soft_delete_project($1, $2)',
  [projectId, userId]
);
```

#### 4. Restore Endpoint
Create a restore endpoint for deleted items:

```typescript
// POST /api/projects/:id/restore
await db.query(
  'UPDATE projects SET deleted_at = NULL, deleted_by = NULL WHERE id = $1',
  [projectId]
);

// Or use helper function
await db.query('SELECT restore_deleted($1, $2)', ['projects', projectId]);
```

#### 5. Permanent Delete Endpoint
For admin-only permanent deletion:

```typescript
// DELETE /api/admin/projects/:id/permanent
await db.query(
  'DELETE FROM projects WHERE id = $1 AND deleted_at IS NOT NULL',
  [projectId]
);

// Or use helper function
await db.query('SELECT permanent_delete($1, $2)', ['projects', projectId]);
```

### Frontend Recommendations

#### 1. Trash/Recycle Bin View
Show deleted items with restore option:

```typescript
const deletedProjects = await api.get('/projects?includeDeleted=true&deletedOnly=true');
```

#### 2. Confirmation Dialogs
Inform users that deletion is recoverable:

```typescript
const handleDelete = async (id) => {
  if (confirm('Move to trash? You can restore it later.')) {
    await api.delete(`/projects/${id}`);
  }
};
```

#### 3. Restore Action
Add restore functionality in trash view:

```typescript
const handleRestore = async (id) => {
  await api.post(`/projects/${id}/restore`);
  refreshList();
};
```

## RLS Policy Considerations

Row Level Security policies should be updated to exclude soft-deleted records by default:

```sql
-- Example: Update existing RLS policy
DROP POLICY IF EXISTS "Users can view projects in their accounts" ON projects;

CREATE POLICY "Users can view projects in their accounts" ON projects
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
    AND deleted_at IS NULL  -- Exclude soft-deleted records
  );
```

## Maintenance Tasks

### Scheduled Cleanup Job

Set up a scheduled job to permanently delete old soft-deleted records:

```sql
-- Run monthly: Delete records soft-deleted 90+ days ago
SELECT cleanup_soft_deleted_records('projects', 90);
SELECT cleanup_soft_deleted_records('workspaces', 90);
SELECT cleanup_soft_deleted_records('datasets', 90);
SELECT cleanup_soft_deleted_records('connections', 90);
-- etc.
```

### Monitoring Query

Track soft-deleted records across all tables:

```sql
SELECT
  'accounts' as table_name,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_count,
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_count
FROM accounts
UNION ALL
SELECT 'projects',
  COUNT(*) FILTER (WHERE deleted_at IS NULL),
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)
FROM projects
UNION ALL
SELECT 'workspaces',
  COUNT(*) FILTER (WHERE deleted_at IS NULL),
  COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)
FROM workspaces
-- etc.
ORDER BY table_name;
```

## Migration Application

To apply this migration to your database:

```bash
# Using psql
psql -h your-host -U your-user -d your-database -f backend/migrations/S_4_1_implement_soft_delete.sql

# Or using Supabase CLI (if linked)
npx supabase db push
```

## Rollback Strategy

If you need to rollback this migration:

```sql
-- Remove columns (data will be lost)
ALTER TABLE accounts DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE columns DROP COLUMN IF EXISTS deleted_at, DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE configurations DROP COLUMN IF EXISTS deleted_at, DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE connections DROP COLUMN IF EXISTS deleted_at, DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE datasets DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE environments DROP COLUMN IF EXISTS deleted_at, DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE invitations DROP COLUMN IF EXISTS deleted_at, DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE macros DROP COLUMN IF EXISTS deleted_at, DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE projects DROP COLUMN IF EXISTS deleted_at, DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE templates DROP COLUMN IF EXISTS deleted_at, DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE users DROP COLUMN IF EXISTS deleted_at, DROP COLUMN IF EXISTS deleted_by;
ALTER TABLE workspaces DROP COLUMN IF EXISTS deleted_at, DROP COLUMN IF EXISTS deleted_by;

-- Drop views
DROP VIEW IF EXISTS accounts_active;
DROP VIEW IF EXISTS projects_active;
DROP VIEW IF EXISTS workspaces_active;
DROP VIEW IF EXISTS datasets_active;
DROP VIEW IF EXISTS columns_active;
DROP VIEW IF EXISTS connections_active;
DROP VIEW IF EXISTS configurations_active;
DROP VIEW IF EXISTS environments_active;
DROP VIEW IF EXISTS users_active;
DROP VIEW IF EXISTS macros_active;
DROP VIEW IF EXISTS templates_active;
DROP VIEW IF EXISTS invitations_active;

-- Drop functions
DROP FUNCTION IF EXISTS soft_delete;
DROP FUNCTION IF EXISTS restore_deleted;
DROP FUNCTION IF EXISTS permanent_delete;
DROP FUNCTION IF EXISTS cleanup_soft_deleted_records;
DROP FUNCTION IF EXISTS soft_delete_account;
DROP FUNCTION IF EXISTS soft_delete_project;
DROP FUNCTION IF EXISTS soft_delete_dataset;
```

## Benefits

1. **Data Recovery** - Accidentally deleted records can be restored
2. **Audit Trail** - Track who deleted what and when
3. **Referential Integrity** - Foreign key relationships remain intact
4. **Compliance** - Meet data retention requirements
5. **Performance** - Partial indexes optimize queries for active records
6. **Flexibility** - Easy to implement trash/recycle bin features

## Best Practices

1. **Always use views or explicit filters** in production queries
2. **Set up scheduled cleanup** to prevent database bloat
3. **Log deletion events** for audit purposes
4. **Test restore procedures** regularly
5. **Consider retention policies** for different record types
6. **Document cascade behavior** for dependent records
7. **Update RLS policies** to exclude deleted records
8. **Train users** on the soft delete functionality

## Testing

Verify soft delete implementation:

```sql
-- Test soft delete
SELECT soft_delete('projects', 'test-project-uuid', 'test-user-uuid');

-- Verify record is hidden from active view
SELECT COUNT(*) FROM projects_active WHERE id = 'test-project-uuid'; -- Should return 0

-- Verify record still exists with deleted_at set
SELECT COUNT(*) FROM projects WHERE id = 'test-project-uuid' AND deleted_at IS NOT NULL; -- Should return 1

-- Test restore
SELECT restore_deleted('projects', 'test-project-uuid');

-- Verify record is visible again
SELECT COUNT(*) FROM projects_active WHERE id = 'test-project-uuid'; -- Should return 1

-- Test cascade delete
SELECT soft_delete_account('test-account-uuid', 'test-user-uuid');

-- Verify cascade worked
SELECT COUNT(*) FROM projects WHERE account_id = 'test-account-uuid' AND deleted_at IS NOT NULL;
SELECT COUNT(*) FROM workspaces WHERE account_id = 'test-account-uuid' AND deleted_at IS NOT NULL;
```

## Related Files

- **Migration**: `backend/migrations/S_4_1_implement_soft_delete.sql`
- **Database Recreation Script**: `database_recreation_script.sql` (update needed)
- **This Documentation**: `SOFT_DELETE_IMPLEMENTATION.md`
