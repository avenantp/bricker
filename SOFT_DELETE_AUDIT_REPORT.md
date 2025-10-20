# Soft Delete Implementation Audit Report
**Date:** 2025-10-17
**Status:** ⚠️ Critical - Database ready, but application code not using soft deletes

## Executive Summary

The soft delete migration (`S_4_1_implement_soft_delete_SIMPLE.sql`) has been successfully applied to the database. However, **the application code (both backend and frontend) is NOT using soft delete functionality**. All delete operations are still performing hard deletes, which means:

- ❌ Deleted records are permanently removed from the database
- ❌ No audit trail for deleted data
- ❌ No ability to restore deleted records
- ❌ The soft delete infrastructure is in place but unused

**Risk Level:** HIGH - Data loss, compliance issues, no recovery mechanism

---

## Database Status ✅

The database migration has successfully added soft delete support:

### Tables with Soft Delete Columns
All 12 target tables now have:
- `deleted_at TIMESTAMP` - Soft delete timestamp (NULL = active)
- `deleted_by UUID` - References users(id)

**Tables:** accounts, columns, configurations, connections, datasets, environments, invitations, macros, projects, templates, users, workspaces

### Database Functions Created
1. ✅ `soft_delete(table_name, record_id, user_id)` - Generic soft delete
2. ✅ `restore_deleted(table_name, record_id)` - Restore soft deleted records
3. ✅ `permanent_delete(table_name, record_id)` - Permanent delete (only soft deleted records)
4. ✅ `cleanup_soft_deleted_records(table_name, days_old)` - Cleanup old records
5. ✅ `soft_delete_account(account_id, user_id)` - Cascade soft delete for accounts
6. ✅ `soft_delete_project(project_id, user_id)` - Cascade soft delete for projects
7. ✅ `soft_delete_dataset(dataset_id, user_id)` - Cascade soft delete for datasets

### Active Record Views Created
12 views with `_active` suffix that filter out deleted records:
- `accounts_active`, `projects_active`, `workspaces_active`, `datasets_active`, `columns_active`, `connections_active`, `configurations_active`, `environments_active`, `users_active`, `macros_active`, `templates_active`, `invitations_active`

### Indexes Created
Partial indexes for performance:
- Active record indexes: `WHERE deleted_at IS NULL`
- Deleted record indexes: `WHERE deleted_at IS NOT NULL`

---

## Backend API Audit ❌

### Critical Issues Found

#### 1. Datasets Routes (`backend/src/routes/datasets.ts`)

**❌ Hard Delete - Dataset**
- **Location:** Line 254-296
- **Issue:** Uses `.delete()` instead of soft delete
```typescript
// CURRENT CODE (WRONG):
const { error } = await getSupabaseClient()
  .from('datasets')
  .delete()
  .eq('id', dataset_id);
```

**❌ Hard Delete - Column**
- **Location:** Line 412-446
- **Issue:** Uses `.delete()` instead of soft delete
```typescript
// CURRENT CODE (WRONG):
const { error } = await getSupabaseClient()
  .from('columns')
  .delete()
  .eq('id', column_id);
```

**❌ Missing deleted_at Filters**
- **Locations:** Lines 77-117 (GET datasets), 123-146 (GET single dataset), 302-320 (uncommitted datasets), 480-689 (import datasets)
- **Issue:** All SELECT queries don't filter `deleted_at IS NULL`

#### 2. Connections Routes (`backend/src/routes/connections.ts`)

**❌ Hard Delete Endpoint**
- **Location:** Line 350
- **Issue:** Has DELETE endpoint but not fully implemented
```typescript
router.delete('/projects/:projectId/:connectionId', async (req, res) => {
  // This endpoint would need to use soft delete when implemented
});
```

#### 3. Source Control Sync (`backend/src/routes/source-control-sync.ts`)

**❌ Missing deleted_at Filters**
- **Locations:** Lines 121-128 (uncommitted datasets), 182-193 (commit single), 287-297 (commit multiple), 516-521 (push all)
- **Issue:** All dataset queries don't filter out soft deleted records

---

## Frontend Services Audit ❌

### Critical Issues Found

#### 1. Dataset Service (`frontend/src/lib/dataset-service.ts`)

**❌ Hard Delete Function**
- **Location:** Lines 134-157
- **Issue:** `deleteDataset()` uses `.delete()` instead of soft delete
```typescript
// CURRENT CODE (WRONG):
export async function deleteDataset(datasetId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('datasets')
    .delete()
    .eq('id', datasetId);
}
```

**❌ Batch Delete Function**
- **Location:** Lines 332-354
- **Issue:** Calls the hard delete function
```typescript
export async function batchDeleteDatasets(datasetIds: string[], userId: string) {
  for (const datasetId of datasetIds) {
    await deleteDataset(datasetId, userId); // Calls hard delete
  }
}
```

**❌ Missing deleted_at Filters**
- **Locations:** Lines 77-93, 162-206, 211-235
- **Issue:** `getDataset()` and `getWorkspaceDatasets()` don't filter `deleted_at IS NULL`

#### 2. Project Service (`frontend/src/lib/services/project-service.ts`)

**❌ Hard Delete Project**
- **Location:** Lines 230-255
- **Issue:** `deleteProject()` uses `.delete()`
```typescript
const { error } = await this.supabase
  .from('projects')
  .delete()
  .eq('id', projectId);
```

**❌ Hard Delete Project User**
- **Location:** Lines 352-368
- **Issue:** `removeProjectUser()` uses `.delete()`
```typescript
const { error } = await this.supabase
  .from('project_users')
  .delete()
  .eq('project_id', projectId)
  .eq('user_id', userId);
```

**❌ Missing deleted_at Filters**
- **Locations:** Lines 57-113 (getProjects), 118-143 (getProject)
- **Issue:** All queries don't filter out soft deleted records

#### 3. Workspace Service (`frontend/src/lib/services/workspace-service.ts`)

**❌ Hard Delete Workspace**
- **Location:** Lines 247-272
- **Issue:** `deleteWorkspace()` uses `.delete()`
```typescript
const { error } = await this.supabase
  .from('workspaces')
  .delete()
  .eq('id', workspaceId);
```

**❌ Hard Delete Workspace User**
- **Location:** Lines 369-385
- **Issue:** `removeWorkspaceUser()` uses `.delete()`
```typescript
const { error } = await this.supabase
  .from('workspace_users')
  .delete()
  .eq('workspace_id', workspaceId)
  .eq('user_id', userId);
```

**❌ Missing deleted_at Filters**
- **Locations:** Lines 56-120 (getWorkspaces), 125-163 (getWorkspace)
- **Issue:** All queries don't filter out soft deleted records

---

## Row-Level Security (RLS) Policies

⚠️ **Not Audited Yet** - RLS policies need to be checked to ensure they include `deleted_at IS NULL` filters.

**Action Required:** Inspect all RLS policies for the 12 tables to verify they exclude soft deleted records.

---

## Recommendations

### Priority 1: Critical (Immediate Action Required)

#### 1. Update Backend DELETE Endpoints

**File: `backend/src/routes/datasets.ts`**

Replace hard deletes with soft delete calls:

```typescript
// DELETE /api/datasets/:dataset_id
router.delete('/:dataset_id', async (req, res) => {
  try {
    const { dataset_id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Use soft delete function
    const { data, error } = await getSupabaseClient()
      .rpc('soft_delete_dataset', {
        p_dataset_id: dataset_id,
        p_deleted_by: user_id
      });

    if (error) throw error;

    if (!data?.success) {
      return res.status(404).json({ error: data?.message || 'Dataset not found' });
    }

    res.json({
      success: true,
      message: 'Dataset soft deleted',
      deleted_counts: {
        columns: data.columns_deleted
      }
    });
  } catch (error: any) {
    console.error('[Datasets] Soft delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/datasets/:dataset_id/columns/:column_id
router.delete('/:dataset_id/columns/:column_id', async (req, res) => {
  try {
    const { dataset_id, column_id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Use soft delete function
    const { data, error } = await getSupabaseClient()
      .rpc('soft_delete', {
        p_table_name: 'columns',
        p_record_id: column_id,
        p_deleted_by: user_id
      });

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Column not found or already deleted' });
    }

    // Mark dataset as uncommitted
    await markDatasetUncommitted(dataset_id);

    res.json({ success: true, message: 'Column soft deleted' });
  } catch (error: any) {
    console.error('[Datasets] Soft delete column error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

#### 2. Update Frontend Delete Functions

**File: `frontend/src/lib/dataset-service.ts`**

```typescript
export async function deleteDataset(
  datasetId: string,
  userId: string
): Promise<void> {
  // Get dataset info before deleting for audit log
  const dataset = await getDataset(datasetId);

  // Use soft delete RPC function
  const { data, error } = await supabase.rpc('soft_delete_dataset', {
    p_dataset_id: datasetId,
    p_deleted_by: userId
  });

  if (error) {
    throw new Error(`Failed to soft delete dataset: ${error.message}`);
  }

  if (!data?.success) {
    throw new Error(data?.message || 'Dataset not found or already deleted');
  }

  // Log deletion in audit_logs
  if (dataset) {
    await logAuditChange('dataset', datasetId, 'soft_delete', userId, {
      dataset_name: dataset.name,
      fqn: dataset.fqn,
      columns_deleted: data.columns_deleted
    });
  }
}
```

**File: `frontend/src/lib/services/project-service.ts`**

```typescript
async deleteProject(projectId: string, userId: string): Promise<void> {
  // Check if project has workspaces
  const { count, error: countError } = await this.supabase
    .from('workspaces')
    .select('id', { count: 'exact', head: true })
    .eq('project_id', projectId)
    .is('deleted_at', null); // Only count active workspaces

  if (countError) {
    throw new Error(`Failed to check project dependencies: ${countError.message}`);
  }

  if (count && count > 0) {
    throw new Error(
      `Cannot delete project: it has ${count} active workspace(s). Please delete all workspaces first.`
    );
  }

  // Use soft delete function
  const { data, error } = await this.supabase.rpc('soft_delete_project', {
    p_project_id: projectId,
    p_deleted_by: userId
  });

  if (error) {
    throw new Error(`Failed to soft delete project: ${error.message}`);
  }

  if (!data?.success) {
    throw new Error(data?.message || 'Project not found or already deleted');
  }
}
```

**File: `frontend/src/lib/services/workspace-service.ts`**

```typescript
async deleteWorkspace(workspaceId: string, userId: string): Promise<void> {
  // Check if workspace has datasets (via workspace_datasets mapping)
  const { count, error: countError } = await this.supabase
    .from('workspace_datasets')
    .select('dataset_id', { count: 'exact', head: true })
    .eq('workspace_id', workspaceId);

  if (countError) {
    throw new Error(`Failed to check workspace dependencies: ${countError.message}`);
  }

  // Check if any of those datasets are active
  if (count && count > 0) {
    const { data: datasets } = await this.supabase
      .from('workspace_datasets')
      .select('dataset_id')
      .eq('workspace_id', workspaceId);

    const datasetIds = datasets?.map(d => d.dataset_id) || [];

    if (datasetIds.length > 0) {
      const { count: activeCount } = await this.supabase
        .from('datasets')
        .select('id', { count: 'exact', head: true })
        .in('id', datasetIds)
        .is('deleted_at', null);

      if (activeCount && activeCount > 0) {
        throw new Error(
          `Cannot delete workspace: it has ${activeCount} active dataset(s). Please remove all datasets first.`
        );
      }
    }
  }

  // Use soft delete generic function (no cascade function exists for workspaces)
  const { data, error } = await this.supabase.rpc('soft_delete', {
    p_table_name: 'workspaces',
    p_record_id: workspaceId,
    p_deleted_by: userId
  });

  if (error) {
    throw new Error(`Failed to soft delete workspace: ${error.message}`);
  }

  if (!data) {
    throw new Error('Workspace not found or already deleted');
  }
}
```

#### 3. Add deleted_at Filters to All SELECT Queries

**Backend Routes:**
```typescript
// BEFORE:
let query = getSupabaseClient()
  .from('datasets')
  .select('*')
  .eq('workspace_id', workspace_id);

// AFTER:
let query = getSupabaseClient()
  .from('datasets')
  .select('*')
  .eq('workspace_id', workspace_id)
  .is('deleted_at', null); // Filter out soft deleted records
```

**Frontend Services:**
```typescript
// Option 1: Add filter to every query
const { data, error } = await supabase
  .from('datasets')
  .select('*')
  .eq('workspace_id', workspaceId)
  .is('deleted_at', null); // Add to every query

// Option 2: Use active views (recommended for consistency)
const { data, error } = await supabase
  .from('datasets_active') // Use _active view
  .select('*')
  .eq('workspace_id', workspaceId);
```

### Priority 2: Important (Within 1 Week)

#### 4. Add Restore Functionality

Create endpoints and UI to restore soft deleted records:

```typescript
// Backend endpoint
router.post('/datasets/:dataset_id/restore', async (req, res) => {
  const { dataset_id } = req.params;

  const { data, error } = await getSupabaseClient()
    .rpc('restore_deleted', {
      p_table_name: 'datasets',
      p_record_id: dataset_id
    });

  if (error) throw error;

  res.json({ success: data, message: data ? 'Dataset restored' : 'Dataset not found' });
});

// Frontend service
export async function restoreDataset(datasetId: string, userId: string): Promise<void> {
  const { data, error } = await supabase.rpc('restore_deleted', {
    p_table_name: 'datasets',
    p_record_id: datasetId
  });

  if (error) {
    throw new Error(`Failed to restore dataset: ${error.message}`);
  }

  if (!data) {
    throw new Error('Dataset not found or not deleted');
  }

  // Log restoration
  await logAuditChange('dataset', datasetId, 'restore', userId, {});
}
```

#### 5. Audit and Update RLS Policies

Check all RLS policies for the 12 tables and add `deleted_at IS NULL` filters:

```sql
-- Example: Update datasets RLS policy
DROP POLICY IF EXISTS select_datasets_policy ON datasets;

CREATE POLICY select_datasets_policy ON datasets
  FOR SELECT
  USING (
    deleted_at IS NULL  -- Only show active records
    AND (
      -- existing permissions logic
      account_id IN (SELECT account_id FROM user_accounts WHERE user_id = auth.uid())
    )
  );
```

Run this for all policies on: accounts, columns, configurations, connections, datasets, environments, invitations, macros, projects, templates, users, workspaces

#### 6. Implement Cleanup Job

Create a scheduled job to permanently delete old soft deleted records:

```typescript
// backend/src/jobs/cleanup-deleted-records.ts
import { createClient } from '@supabase/supabase-js';

export async function cleanupOldDeletedRecords() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const tables = [
    'accounts', 'columns', 'configurations', 'connections', 'datasets',
    'environments', 'invitations', 'macros', 'projects', 'templates',
    'users', 'workspaces'
  ];

  const results = [];

  for (const table of tables) {
    const { data, error } = await supabase.rpc('cleanup_soft_deleted_records', {
      p_table_name: table,
      p_days_old: 90 // Permanently delete records soft deleted >90 days ago
    });

    if (error) {
      console.error(`Error cleaning up ${table}:`, error);
    } else {
      results.push({ table, deleted_count: data });
    }
  }

  return results;
}

// Schedule with cron or similar
// 0 2 * * 0 = Every Sunday at 2 AM
```

### Priority 3: Enhancement (Nice to Have)

#### 7. Add "Recently Deleted" View in UI

Create a "Trash" or "Recently Deleted" section where users can:
- View soft deleted items
- Restore items
- Permanently delete items

#### 8. Add Soft Delete Audit Dashboard

Track soft delete metrics:
- Number of deleted records by table
- Restoration rate
- Cleanup statistics

---

## Testing Checklist

Before deploying soft delete changes:

- [ ] Test soft delete for datasets (with cascade to columns)
- [ ] Test soft delete for projects (with cascade to workspaces)
- [ ] Test soft delete for accounts (with cascade to projects, workspaces, datasets)
- [ ] Verify all SELECT queries filter `deleted_at IS NULL`
- [ ] Test restore functionality
- [ ] Verify RLS policies exclude soft deleted records
- [ ] Test that soft deleted records don't appear in UI
- [ ] Test cleanup job with test data
- [ ] Verify audit logs capture soft delete operations

---

## Migration Path

### Phase 1: Backend Changes (Week 1)
1. Update datasets.ts DELETE endpoints
2. Update connections.ts DELETE endpoints
3. Add deleted_at filters to all backend SELECT queries
4. Test backend changes

### Phase 2: Frontend Changes (Week 1-2)
1. Update dataset-service.ts delete functions
2. Update project-service.ts delete functions
3. Update workspace-service.ts delete functions
4. Add deleted_at filters to all frontend SELECT queries
5. Test frontend changes

### Phase 3: RLS & Infrastructure (Week 2)
1. Audit and update all RLS policies
2. Implement restore endpoints
3. Create cleanup job
4. Test end-to-end

### Phase 4: UI Enhancements (Week 3)
1. Add "Recently Deleted" view
2. Add restore UI
3. Add audit dashboard

---

## Summary

| Component | Status | Action Required |
|-----------|--------|-----------------|
| Database Schema | ✅ Complete | None |
| Database Functions | ✅ Complete | None |
| Active Views | ✅ Complete | None |
| Indexes | ✅ Complete | None |
| Backend DELETE Endpoints | ❌ Not Implemented | Update to use soft delete functions |
| Backend SELECT Queries | ❌ Missing Filters | Add `deleted_at IS NULL` filters |
| Frontend Delete Services | ❌ Not Implemented | Update to use soft delete RPCs |
| Frontend SELECT Queries | ❌ Missing Filters | Add `deleted_at IS NULL` filters |
| RLS Policies | ⚠️ Unknown | Audit and update with deleted_at filters |
| Restore Functionality | ❌ Not Implemented | Create endpoints and UI |
| Cleanup Job | ❌ Not Implemented | Create scheduled job |

**Overall Status:** 🔴 Database ready, but application not using soft deletes. High risk of data loss.

**Next Steps:** Immediately begin Priority 1 tasks to implement soft delete in application code.
