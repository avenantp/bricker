# Medallion Layer Migration from Datasets to Connections

## Overview

The `medallion_layer` field has been moved from the `datasets` table to the `connections` table. This makes more architectural sense as the medallion layer is typically defined at the connection/source level, not per individual dataset.

## Database Changes

### Migration 06: Move Medallion Layer to Connections

**File:** `supabase/migrations/06_move_medallion_layer_to_connections.sql`

This migration:
1. Adds `medallion_layer` column to `connections` table
2. Migrates existing data from `datasets.medallion_layer` to `connections.medallion_layer`
3. Drops the `medallion_layer` column from `datasets` table

**IMPORTANT:** You must apply both migrations in order:
1. First apply migration 05 (`05_update_columns_schema.sql`) - Updates columns table schema
2. Then apply migration 06 (`06_move_medallion_layer_to_connections.sql`) - Moves medallion_layer

## Backend Changes

### Updated Files

#### `backend/src/routes/datasets.ts`
- **Removed:** Connection fetch for medallion_layer inheritance (lines 635-643)
- **Removed:** `medallion_layer` field from dataset insert (line 738)
- Datasets no longer store medallion_layer directly

**Status:** ✅ Complete

## Frontend Changes

### Type Definitions

#### `frontend/src/types/dataset.ts`
- **Added:** Documentation comments explaining that `medallion_layer` is now sourced from connections
- **Removed:** `medallion_layer` from `CreateDatasetInput` interface (line 87)
- **Removed:** `medallion_layer` from `UpdateDatasetInput` interface (line 110)
- The `Dataset` interface still has `medallion_layer` field (populated from connection when querying)

**Status:** ✅ Complete

#### `frontend/src/types/connection.ts`
- Already has `medallion_layer` field defined (line 362)

**Status:** ✅ Complete

### Services

#### `frontend/src/lib/dataset-service.ts`
- **Updated `createDataset`:** Removed `medallion_layer` from dataset insert (line 37)
- **Updated `getDataset`:** Now joins with connections to populate `medallion_layer` (lines 78-105)
  - Uses `connections!inner(medallion_layer)` join
  - Flattens connection data into dataset object for backwards compatibility

**Status:** ⚠️ Partially Complete

### Components Requiring Updates

The following components/files reference `medallion_layer` and may need updates:

#### High Priority (Direct medallion_layer usage):

1. **`frontend/src/components/Diagram/DatasetDiagramView.tsx`**
   - Likely displays medallion_layer
   - May filter by medallion_layer
   - Action: Review and ensure it handles medallion_layer from connection

2. **`frontend/src/components/Canvas/DatasetNode.tsx`**
   - Displays dataset nodes with medallion_layer styling/badges
   - Action: Review node rendering logic

3. **`frontend/src/components/Diagram/DatasetDetailsPanel.tsx`**
   - Shows dataset details including medallion_layer
   - Action: Consider showing it as read-only (inherited from connection)

4. **`frontend/src/components/Canvas/DatasetEditorDialog.tsx`**
   - May allow editing medallion_layer
   - Action: **REMOVE** medallion_layer editor (should be set on connection instead)

5. **`frontend/src/components/Canvas/CreateNodeDialog.tsx`**
   - Creates new datasets
   - Action: **REMOVE** medallion_layer input field

6. **`frontend/src/components/Canvas/DatasetPropertiesTab.tsx`**
   - Shows/edits dataset properties
   - Action: Show medallion_layer as read-only, indicate it comes from connection

#### Medium Priority (Filtering/Display):

7. **`frontend/src/components/Diagram/DatasetTreeView.tsx`**
   - May group/filter by medallion_layer
   - Action: Verify filtering still works with joined data

8. **`frontend/src/components/Canvas/NodeFilterPanel.tsx`**
   - Filters nodes by medallion_layer
   - Action: Verify filter logic

9. **`frontend/src/services/searchAndFilter.ts`**
   - Search/filter logic for datasets
   - Action: Update filter functions to handle medallion_layer from connection

10. **`frontend/src/hooks/useDatasets.ts`**
    - Hook for fetching datasets
    - Action: Update queries to join with connections

#### Low Priority (Utilities/Config):

11. **`frontend/src/config/nodeColors.ts`**
    - Color mapping for medallion_layer
    - Action: No changes needed (colors still apply)

12. **`frontend/src/lib/yaml-generator.ts` / `yaml-parser.ts`**
    - YAML export/import
    - Action: Update to export medallion_layer from connection, not dataset

13. **`frontend/src/lib/node-service.ts`**
    - Node operations
    - Action: Review node creation/update logic

#### Testing Files:

14. **`frontend/src/test/test-utils.ts`**
    - Mock data
    - Action: Update mock datasets to get medallion_layer from connection

15. **`frontend/src/lib/__tests__/dataset-service.test.ts`**
    - Dataset service tests
    - Action: Update tests for new medallion_layer logic

## Migration Steps

### For You to Complete:

1. **Apply Database Migrations:**
   ```sql
   -- In Supabase SQL Editor, run in order:
   -- 1. Apply 05_update_columns_schema.sql (updates columns table)
   -- 2. Apply 06_move_medallion_layer_to_connections.sql (moves medallion_layer)
   ```

2. **Update Connection UI:**
   - Ensure connection creation/edit forms have medallion_layer field
   - Users should set medallion_layer at connection level, not dataset level

3. **Update Dataset UI:**
   - Remove medallion_layer input fields from dataset creation dialogs
   - Show medallion_layer as read-only in dataset details (indicate it's from connection)

4. **Update Dataset Queries:**
   - Any component that fetches multiple datasets needs to join with connections:
   ```typescript
   const { data } = await supabase
     .from('datasets')
     .select(`
       *,
       connections!inner(medallion_layer)
     `)

   // Then map to flatten:
   const datasets = data.map(d => ({
     ...d,
     medallion_layer: d.connections?.medallion_layer,
     connections: undefined
   }))
   ```

5. **Test Thoroughly:**
   - Create new connection with medallion_layer set
   - Import datasets from that connection
   - Verify datasets inherit medallion_layer
   - Verify filtering/grouping by medallion_layer still works
   - Verify color coding by medallion_layer still works

## Breaking Changes

- ⚠️ **Datasets can no longer have individual medallion_layer values**
- ⚠️ **All datasets from a connection share the same medallion_layer**
- ⚠️ **Dataset creation/update APIs no longer accept medallion_layer**
- ⚠️ **Querying datasets without joining connections will return NULL for medallion_layer**

## Benefits

✅ Cleaner data model - medallion layer is source/connection metadata
✅ Easier management - set once at connection level
✅ Consistency - all datasets from a source have the same layer
✅ Aligns with data architecture best practices

## Questions?

If a use case requires different medallion layers for different datasets from the same connection, we may need to reconsider this approach. However, in typical medallion architecture, all tables from a source system are in the same layer.
