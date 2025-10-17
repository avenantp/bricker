# Database Migration Changes Summary
## Migration S_2_1: Dataset Table Structure Changes

**Date:** 2025-10-16
**Status:** ✅ Frontend Updated | ⏳ Backend Pending | ⏳ Migration Pending

---

## Overview

This migration restructures the datasets table to better align with connection-based architecture:
- Removed direct workspace and project references
- Added connection-based fully qualified names
- Introduced auto-generated FQN calculation

---

## Files Modified

### ✅ Completed Changes

#### 1. **Migration SQL**
- **File:** `backend/migrations/S_2_1_modify_datasets_table_structure.sql`
- **Status:** Created
- **Description:** Complete migration script with:
  - Column additions/removals
  - Trigger for auto-FQN generation
  - Index updates
  - Data migration
  - Constraint updates

#### 2. **Frontend Type Definitions**

**File:** `frontend/src/types/dataset.ts`
- ✅ Updated `Dataset` interface:
  - Removed: `workspace_id`, `project_id`, `fqn`
  - Added: `connection_id`, `schema`, `fully_qualified_name`
- ✅ Updated `CreateDatasetInput` interface:
  - Removed: `workspace_id`, `project_id`, `fqn`
  - Added: `connection_id`, `schema`
- ✅ Updated `UpdateDatasetInput` interface:
  - Removed: `fqn`
  - Added: `connection_id`, `schema`
- ✅ Updated `DatasetConflict` interface:
  - Changed: `fqn` → `fully_qualified_name`

**File:** `frontend/src/types/diagram.ts`
- ✅ Updated `DatasetNodeData` interface:
  - Changed: `fqn` → `fully_qualified_name`
  - Added: `connection_id`, `schema`

#### 3. **Mock Data Generators**

**File:** `frontend/src/utils/mockDiagramData.ts`
- ✅ Updated `generateMockNodes()` function:
  - Changed: `fqn` → `fully_qualified_name`
  - Added: `connection_id` (mock value: `connection-${i % 3 + 1}`)
  - Added: `schema` (mock value: `default_schema`)

#### 4. **React Components**

**File:** `frontend/src/components/Diagram/DatasetTreeView.tsx`
- ✅ Line 67: Updated search filter to use `fully_qualified_name`
- ✅ Line 211: Updated tooltip to use `fully_qualified_name`

#### 5. **Documentation**

**File:** `docs/migration-impact-analysis.md`
- ✅ Created comprehensive impact analysis document
- ✅ Lists all affected files and required changes
- ✅ Includes migration checklist and rollback plan

---

### ⏳ Pending Changes

#### 1. **Backend API Routes**

**File:** `backend/src/routes/datasets.ts`

**Required Changes:**

```typescript
// ❌ CURRENT - Line 66-96
router.get('/:workspace_id', async (req, res) => {
  const { workspace_id } = req.params;
  const query = supabase.from('datasets')
    .select('*')
    .eq('workspace_id', workspace_id);
  // ...
});

// ✅ REQUIRED - Use workspace_datasets mapping
router.get('/workspace/:workspace_id', async (req, res) => {
  const { workspace_id } = req.params;

  // Get datasets through workspace_datasets mapping table
  const { data: mappings } = await supabase
    .from('workspace_datasets')
    .select('dataset_id')
    .eq('workspace_id', workspace_id);

  const datasetIds = mappings?.map(m => m.dataset_id) || [];

  const { data } = await supabase
    .from('datasets')
    .select(`
      *,
      connections (
        id,
        name,
        catalog,
        connection_type
      )
    `)
    .in('id', datasetIds)
    .order('created_at', { ascending: false });

  res.json({ datasets: data || [] });
});
```

**Routes to Update:**
1. ✅ `GET /api/datasets/:workspace_id` → Change to use workspace_datasets mapping
2. ✅ `POST /api/datasets` → Remove workspace_id from body, add connection_id
3. ✅ `PUT /api/datasets/:dataset_id` → Allow updating connection_id and schema
4. ✅ `GET /api/datasets/:workspace_id/uncommitted` → Use workspace_datasets mapping

#### 2. **Additional Components with FQN References**

**Files Requiring Updates (13 total):**
1. `frontend/src/components/Diagram/DatasetDetailsPanel.tsx`
2. `frontend/src/components/Canvas/DatasetNode.tsx`
3. `frontend/src/components/Diagram/DatasetContextMenu.tsx`
4. `frontend/src/components/Canvas/DatasetPropertiesTab.tsx`
5. `frontend/src/components/Canvas/RelationshipDetailsDialog.tsx`
6. `frontend/src/components/Canvas/NodeSearchPanel.tsx`
7. `frontend/src/components/Canvas/NodeRelationshipsTab.tsx`
8. `frontend/src/components/Canvas/NodeEditorDialog.tsx`
9. `frontend/src/components/Canvas/DeleteNodeDialog.tsx`
10. `frontend/src/components/Canvas/DataNode.tsx`
11. `frontend/src/components/Canvas/CreateColumnDialog.tsx`
12. `frontend/src/components/Canvas/AddRelationshipDialog.tsx`
13. `frontend/src/components/Diagram/DatasetTreeView.tsx` ✅ (Already updated)

**Required Change:**
- Replace all instances of `.fqn` with `.fully_qualified_name`
- Replace all instances of `fqn:` with `fully_qualified_name:`

#### 3. **Service Layer**

**Files to Update:**
- `frontend/src/lib/dataset-service.ts`
- `frontend/src/lib/yaml-generator.ts`
- `frontend/src/lib/yaml-parser.ts`

**Required Changes:**
- Update API endpoint calls
- Update request/response type mappings
- Handle fully_qualified_name as read-only

#### 4. **Test Files**

**Files to Update:**
- `frontend/src/lib/__tests__/dataset-service.test.ts`
- `backend/src/__tests__/mcp-integration.test.ts`
- `frontend/src/test/test-utils.ts`

**Required Changes:**
- Update mock dataset objects
- Update test assertions
- Update API call expectations

---

## Database Schema Changes Reference

### Datasets Table

| Change Type | Column Name | Data Type | Description |
|-------------|-------------|-----------|-------------|
| ❌ Removed | `workspace_id` | UUID | Moved to workspace_datasets mapping |
| ❌ Removed | `project_id` | UUID | Moved to project_datasets mapping |
| ❌ Removed | `fqn` | VARCHAR | Replaced by fully_qualified_name |
| ✅ Added | `connection_id` | UUID | FK to connections table |
| ✅ Added | `schema` | VARCHAR | Schema name within catalog |
| ✅ Added | `fully_qualified_name` | VARCHAR | Auto-generated: catalog.schema.name |

### Connections Table

| Change Type | Column Name | Data Type | Description |
|-------------|-------------|-----------|-------------|
| ✅ Added | `catalog` | VARCHAR | Catalog name (e.g., Unity Catalog) |

### Indexes

| Change Type | Index Name | Description |
|-------------|------------|-------------|
| ❌ Dropped | `idx_datasets_workspace` | Old workspace_id index |
| ❌ Dropped | `idx_datasets_project` | Old project_id index |
| ❌ Dropped | `idx_datasets_fqn` | Old fqn index |
| ✅ Created | `idx_datasets_connection` | New connection_id index |
| ✅ Created | `idx_datasets_schema` | New schema index |
| ✅ Created | `idx_datasets_fully_qualified_name` | New FQN index |

### Constraints

| Change Type | Constraint | Description |
|-------------|------------|-------------|
| ❌ Dropped | `UNIQUE (account_id, fqn)` | Old unique constraint |
| ✅ Created | `UNIQUE (account_id, fully_qualified_name)` | New unique constraint |

---

## Breaking Changes

### API Changes

**Before:**
```typescript
// GET request
GET /api/datasets/:workspace_id

// POST request
POST /api/datasets
{
  "workspace_id": "uuid",
  "project_id": "uuid",
  "name": "my_table",
  "fqn": "catalog.schema.my_table"
}
```

**After:**
```typescript
// GET request - Route changed
GET /api/datasets/workspace/:workspace_id

// POST request - Body changed
POST /api/datasets
{
  "connection_id": "uuid",
  "name": "my_table",
  "schema": "my_schema"
  // Note: fully_qualified_name is auto-generated
}
```

### Type Changes

**Before:**
```typescript
interface Dataset {
  fqn: string;
  workspace_id?: string;
  project_id?: string;
}
```

**After:**
```typescript
interface Dataset {
  fully_qualified_name: string;  // Read-only, auto-generated
  connection_id?: string;
  schema?: string;
}
```

---

## Migration Steps

### Development Environment

1. **Update Frontend Code**
   ```bash
   cd frontend
   npm run type-check  # Verify no TypeScript errors
   ```

2. **Run Migration**
   ```bash
   cd backend
   psql -h localhost -U postgres -d uroq -f migrations/S_2_1_modify_datasets_table_structure.sql
   ```

3. **Verify Database**
   ```sql
   -- Check datasets table structure
   \d datasets

   -- Test FQN trigger
   INSERT INTO datasets (account_id, connection_id, schema, name)
   VALUES ('account-uuid', 'connection-uuid', 'test_schema', 'test_table');

   SELECT fully_qualified_name FROM datasets WHERE name = 'test_table';
   -- Should return: catalog_name.test_schema.test_table
   ```

4. **Update Backend Code**
   ```bash
   cd backend
   npm run build
   npm test
   ```

5. **Test Application**
   - Create a new dataset
   - Verify FQN is auto-generated
   - Test workspace-based queries
   - Test search functionality

### Production Deployment

1. Backup database
2. Run migration during maintenance window
3. Deploy backend code
4. Deploy frontend code
5. Monitor for errors
6. Verify data integrity

---

## Verification Checklist

- [ ] All TypeScript types updated
- [ ] All mock data generators updated
- [ ] All components updated (fqn → fully_qualified_name)
- [ ] All API routes updated
- [ ] All service layer code updated
- [ ] All tests updated
- [ ] Migration SQL tested on dev database
- [ ] FQN auto-generation verified
- [ ] Workspace queries tested
- [ ] Search functionality tested
- [ ] No TypeScript errors
- [ ] All tests passing

---

## Rollback Procedure

If issues occur after migration:

1. **Restore Database Backup**
   ```bash
   pg_restore -h localhost -U postgres -d uroq backup_file.dump
   ```

2. **Revert Code Changes**
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

3. **Redeploy Previous Version**
   ```bash
   # Deploy previous backend
   cd backend && git checkout <previous-commit> && npm run deploy

   # Deploy previous frontend
   cd frontend && git checkout <previous-commit> && npm run deploy
   ```

---

## Contact & Support

**Migration Created By:** Claude Code
**Date:** 2025-10-16
**Documentation:** See `docs/migration-impact-analysis.md` for detailed analysis

For questions or issues, refer to:
- Migration SQL: `backend/migrations/S_2_1_modify_datasets_table_structure.sql`
- Impact Analysis: `docs/migration-impact-analysis.md`
- Schema Documentation: `backend/migrations/01_initial_schema.sql`
