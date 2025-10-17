# Database Migration Impact Analysis
## Migration: S_2_1_modify_datasets_table_structure.sql

**Date:** 2025-10-16
**Status:** Pending Implementation

---

## Database Schema Changes

### Datasets Table - Removed Columns
- ❌ `workspace_id` (UUID) - Removed, datasets now linked via connections
- ❌ `project_id` (UUID) - Removed, datasets now linked via connections
- ❌ `fqn` (VARCHAR) - Removed, replaced by `fully_qualified_name`

### Datasets Table - Added Columns
- ✅ `connection_id` (UUID) - Foreign key to connections table
- ✅ `schema` (VARCHAR) - Schema name within catalog
- ✅ `fully_qualified_name` (VARCHAR) - Auto-generated from connection.catalog.schema.name

### Connections Table - Added Columns
- ✅ `catalog` (VARCHAR) - Catalog name (e.g., Unity Catalog)

### Indexes Changed
- Dropped: `idx_datasets_workspace`, `idx_datasets_project`, `idx_datasets_fqn`
- Added: `idx_datasets_connection`, `idx_datasets_schema`, `idx_datasets_fully_qualified_name`

### Constraints Changed
- Dropped: UNIQUE (account_id, fqn)
- Added: UNIQUE (account_id, fully_qualified_name)

---

## Impact Analysis

### 🔴 High Impact - Requires Code Changes

#### 1. Frontend Types (TypeScript)

**Files to Update:**
- `frontend/src/types/dataset.ts` - Main dataset interface
- `frontend/src/types/diagram.ts` - Diagram node data interface

**Changes Needed:**
```typescript
// BEFORE
export interface Dataset {
  workspace_id?: string;
  project_id?: string;
  fqn: string;
  // ...
}

// AFTER
export interface Dataset {
  connection_id?: string;
  schema?: string;
  fully_qualified_name: string;  // Auto-generated
  // ...
}
```

#### 2. Backend API Routes

**Files to Update:**
- `backend/src/routes/datasets.ts`

**Changes Needed:**
- Line 66-96: GET /:workspace_id - **BREAKING**: Route parameter uses workspace_id
  - **Solution**: Change to use connection_id or account_id, or query workspace_datasets mapping table
- Line 103-126: GET /detail/:dataset_id - No changes needed
- Line 132-181: POST / - Remove workspace_id, project_id; add connection_id, schema
- Line 187-234: PUT /:dataset_id - Update to use new schema fields
- Line 288-306: GET /:workspace_id/uncommitted - **BREAKING**: Uses workspace_id filter

**Recommended Changes:**
```typescript
// BEFORE
router.get('/:workspace_id', async (req, res) => {
  const { workspace_id } = req.params;
  const query = supabase.from('datasets')
    .select('*')
    .eq('workspace_id', workspace_id);
  // ...
});

// AFTER - Option 1: Use workspace_datasets mapping table
router.get('/workspace/:workspace_id', async (req, res) => {
  const { workspace_id } = req.params;

  // Get datasets through mapping table
  const { data: mappings } = await supabase
    .from('workspace_datasets')
    .select('dataset_id')
    .eq('workspace_id', workspace_id);

  const datasetIds = mappings?.map(m => m.dataset_id) || [];

  const { data } = await supabase
    .from('datasets')
    .select('*, connections(*)')  // Include connection for FQN
    .in('id', datasetIds);
  // ...
});

// AFTER - Option 2: Use connection_id directly
router.get('/connection/:connection_id', async (req, res) => {
  const { connection_id } = req.params;
  const { data } = await supabase
    .from('datasets')
    .select('*, connections(*)')
    .eq('connection_id', connection_id);
  // ...
});
```

#### 3. Mock Data Generators

**Files to Update:**
- `frontend/src/utils/mockDiagramData.ts`

**Changes Needed:**
```typescript
// BEFORE
{
  dataset_id: `dataset-${i + 1}`,
  name: datasetName,
  fqn: `catalog.schema.${datasetName}`,
  // ...
}

// AFTER
{
  dataset_id: `dataset-${i + 1}`,
  name: datasetName,
  connection_id: `connection-${i % 3 + 1}`,  // Mock connection
  schema: 'default_schema',
  fully_qualified_name: `catalog.default_schema.${datasetName}`,  // Will be auto-generated in DB
  // ...
}
```

#### 4. React Components

**Files to Update:**
- `frontend/src/components/Diagram/DatasetDetailsPanel.tsx`
- `frontend/src/components/Canvas/DatasetPropertiesTab.tsx`
- `frontend/src/components/Canvas/DatasetEditorDialog.tsx`

**Changes Needed:**
- Replace all references to `dataset.fqn` with `dataset.fully_qualified_name`
- Remove workspace_id and project_id fields from forms
- Add connection_id selector and schema input
- Update display labels

#### 5. Service Layer

**Files to Update:**
- `frontend/src/lib/dataset-service.ts`
- `frontend/src/lib/yaml-generator.ts`
- `frontend/src/lib/yaml-parser.ts`

**Changes Needed:**
- Update API calls to use new query parameters
- Update request/response types
- Handle fully_qualified_name as read-only (auto-generated)

---

### 🟡 Medium Impact - May Require Changes

#### 1. Zustand Store (Diagram State)

**Files to Check:**
- `frontend/src/store/diagramStore.ts`

**Potential Issues:**
- If storing workspace_id in diagram context
- If filtering by workspace_id

#### 2. Search and Filter Hooks

**Files to Check:**
- `frontend/src/hooks/useSearchAndFilter.ts`

**Potential Issues:**
- If filtering by workspace_id or project_id
- Search functionality should now search fully_qualified_name instead of fqn

#### 3. YAML Import/Export

**Files to Check:**
- `frontend/src/lib/yaml-generator.ts`
- `frontend/src/lib/yaml-parser.ts`

**Changes Needed:**
- Update YAML schema to use connection_id instead of workspace_id
- Use fully_qualified_name instead of fqn in exports

---

### 🟢 Low Impact - Minimal Changes

#### 1. Test Files

**Files to Update:**
- `frontend/src/lib/__tests__/dataset-service.test.ts`
- `backend/src/__tests__/mcp-integration.test.ts`

**Changes Needed:**
- Update mock data
- Update test assertions

#### 2. Database Queries

**Files to Check:**
- Any custom SQL queries
- Supabase query builders

---

## Migration Checklist

### Pre-Migration
- [ ] Backup database
- [ ] Review all code changes
- [ ] Update all TypeScript types
- [ ] Update all API routes
- [ ] Update all React components
- [ ] Update mock data generators
- [ ] Run type checking: `npm run type-check`
- [ ] Run tests: `npm test`

### Migration
- [ ] Run migration SQL: `S_2_1_modify_datasets_table_structure.sql`
- [ ] Verify table structure
- [ ] Verify indexes
- [ ] Verify constraints
- [ ] Test FQN trigger with sample data

### Post-Migration
- [ ] Deploy updated backend code
- [ ] Deploy updated frontend code
- [ ] Test dataset creation
- [ ] Test dataset updates
- [ ] Test FQN auto-generation
- [ ] Test connection-based queries
- [ ] Verify existing data integrity

---

## Breaking Changes Summary

### API Endpoints Changed
1. `GET /api/datasets/:workspace_id` → Needs to use workspace_datasets mapping
2. `GET /api/datasets/:workspace_id/uncommitted` → Needs to use workspace_datasets mapping
3. `POST /api/datasets` → Request body changes (remove workspace_id/project_id, add connection_id/schema)

### Data Model Changes
1. Datasets no longer directly reference workspace_id or project_id
2. FQN is now auto-generated and read-only
3. Datasets must have a connection_id

### Frontend Changes
1. All forms creating/editing datasets need connection selector
2. Display components must use fully_qualified_name instead of fqn
3. Filter/search components must query workspace_datasets for workspace-based filtering

---

## Rollback Plan

If issues occur:
1. Restore database backup
2. Revert code changes via git
3. Redeploy previous version

**Rollback SQL:**
```sql
-- Reverse migration (if needed)
ALTER TABLE datasets ADD COLUMN workspace_id UUID;
ALTER TABLE datasets ADD COLUMN project_id UUID;
ALTER TABLE datasets ADD COLUMN fqn VARCHAR;

-- Copy data back
UPDATE datasets SET fqn = fully_qualified_name;

-- Restore foreign keys
ALTER TABLE datasets ADD CONSTRAINT datasets_workspace_fkey
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id);

-- Remove new columns
ALTER TABLE datasets DROP COLUMN connection_id;
ALTER TABLE datasets DROP COLUMN schema;
ALTER TABLE datasets DROP COLUMN fully_qualified_name;

ALTER TABLE connections DROP COLUMN catalog;
```

---

## Recommended Implementation Order

1. ✅ **Create migration SQL** (Done)
2. 🔄 **Update TypeScript types** (Next)
3. 🔄 **Update mock data generators**
4. 🔄 **Update backend API routes**
5. 🔄 **Update frontend service layer**
6. 🔄 **Update React components**
7. 🔄 **Run migration on dev database**
8. 🔄 **Test all functionality**
9. 🔄 **Deploy to production**
