# Audit Columns Standardization Migration

## Overview

This migration standardizes all audit columns across the database to use consistent naming conventions.

### Standard Audit Columns (After Migration)

All tables will have these four audit columns:

| Column | Type | Description |
|--------|------|-------------|
| `created_by` | UUID | User who created the record |
| `created_at` | TIMESTAMP | When the record was created |
| `updated_by` | UUID | User who last updated the record |
| `updated_at` | TIMESTAMP | When the record was last updated |

## Changes Made

### 1. Column Renames

**Junction Tables:**
- `workspace_datasets`: `added_at` → `created_at`, `added_by` → `created_by`
- `diagram_datasets`: `added_at` → `created_at`, `added_by` → `created_by`

### 2. Columns Added

All core tables will have complete audit columns:
- Added `updated_at` and `updated_by` to junction tables
- Added missing audit columns to any tables that don't have them

### 3. Triggers Updated

- Universal `update_updated_at_column()` function created
- Automatic triggers on all tables to update `updated_at` on record modification
- Replaces any custom trigger logic

### 4. Functions Updated

Database functions updated to use new column names:
- `get_diagram_datasets()` - now returns `created_at` instead of `added_at`
- `add_dataset_to_diagram()` - now uses `created_by` instead of `added_by`

## Migration Steps

### Step 1: Verify Current State

Run the verification script to see current audit column status:

```bash
# Using Supabase CLI
supabase db execute --file backend/migrations/S_3_0_verify_audit_columns_before.sql

# Or using psql
psql "$DATABASE_URL" -f backend/migrations/S_3_0_verify_audit_columns_before.sql
```

This will show:
- Tables using old naming (`added_at`, `added_by`)
- Tables missing standard audit columns
- Current trigger status

### Step 2: Review the Migration Script

Read through `S_3_1_standardize_audit_columns.sql` to understand the changes.

**Key Points:**
- Migration is idempotent (safe to run multiple times)
- Existing data is preserved
- Column renames maintain all data
- New columns default to NOW() for timestamps, NULL for user references

### Step 3: Run the Migration

```bash
# Using Supabase CLI
supabase db execute --file backend/migrations/S_3_1_standardize_audit_columns.sql

# Or using psql
psql "$DATABASE_URL" -f backend/migrations/S_3_1_standardize_audit_columns.sql
```

Watch for `NOTICE` messages showing:
- Columns renamed
- Columns added
- Triggers created

### Step 4: Verify Success

Run the verification script again:

```bash
supabase db execute --file backend/migrations/S_3_0_verify_audit_columns_before.sql
```

Expected output:
```
NOTICE:  ========================================
NOTICE:  AUDIT COLUMNS VERIFICATION SUMMARY
NOTICE:  ========================================
NOTICE:  Tables using OLD naming (added_at/added_by): 0
NOTICE:  Tables MISSING standard audit columns: 0
NOTICE:  ========================================
NOTICE:  STATUS: All audit columns are standardized!
```

## Code Updates Required After Migration

After running the database migration, you MUST update application code to use the new column names.

### Frontend Code Changes

**Files to Update:**

1. **`frontend/src/hooks/useDatasets.ts`**
   - Already updated to use `created_at` in workspace_datasets queries
   - ✅ No changes needed (already done)

2. **`frontend/src/services/workspaceDiagramService.ts`**
   - Update `getDiagramDatasetIds()` if it references `added_at`
   - Update `addDatasetToDiagram()` to use `created_by` parameter

3. **`frontend/src/types/`** - Check all type definitions:
   - Update any interfaces referencing `added_at` → `created_at`
   - Update any interfaces referencing `added_by` → `created_by`

### Backend Code Changes

**Files to Update:**

1. **`backend/src/routes/datasets.ts`**
   - Update any queries using `added_at` → `created_at`
   - Update any inserts using `added_by` → `created_by`

2. **`backend/src/routes/diagrams.ts`** (if exists)
   - Update diagram_datasets queries

3. **Any SQL queries or ORM models** that reference:
   - `added_at` → `created_at`
   - `added_by` → `created_by`

### Search and Replace Guide

After confirming the migration is successful, run these searches across your codebase:

```bash
# Search for old column references
grep -r "added_at" frontend/src/
grep -r "added_by" frontend/src/
grep -r "added_at" backend/src/
grep -r "added_by" backend/src/

# Search in TypeScript/JavaScript files only
grep -r "added_at" --include="*.ts" --include="*.tsx" --include="*.js" frontend/
grep -r "added_by" --include="*.ts" --include="*.tsx" --include="*.js" frontend/
```

**Replace with:**
- `added_at` → `created_at`
- `added_by` → `created_by`

## Affected Tables

### Core Entity Tables
These tables have standard `created_at`, `created_by`, `updated_at`, `updated_by`:

- accounts
- users
- workspaces
- projects
- connections
- datasets
- columns
- diagrams
- lineage_edges
- workspace_members
- project_members
- account_users

### Junction/Mapping Tables
These tables have the same audit columns (previously used `added_*`):

- workspace_datasets
- diagram_datasets

## Rollback Plan

If you need to rollback this migration:

1. **Rename columns back:**
   ```sql
   ALTER TABLE workspace_datasets RENAME COLUMN created_at TO added_at;
   ALTER TABLE workspace_datasets RENAME COLUMN created_by TO added_by;
   ALTER TABLE diagram_datasets RENAME COLUMN created_at TO added_at;
   ALTER TABLE diagram_datasets RENAME COLUMN created_by TO added_by;
   ```

2. **Remove added columns:**
   ```sql
   ALTER TABLE workspace_datasets DROP COLUMN IF EXISTS updated_at;
   ALTER TABLE workspace_datasets DROP COLUMN IF EXISTS updated_by;
   ALTER TABLE diagram_datasets DROP COLUMN IF EXISTS updated_at;
   ALTER TABLE diagram_datasets DROP COLUMN IF EXISTS updated_by;
   ```

3. **Restore old function signatures** (check migration for originals)

## Testing Checklist

After migration and code updates:

- [ ] Verify all tables have standard audit columns
- [ ] Test creating new workspace_datasets mappings
- [ ] Test creating new diagram_datasets mappings
- [ ] Test updating existing records (triggers should set updated_at)
- [ ] Verify frontend displays correct timestamps
- [ ] Check that no 400 errors occur from missing columns
- [ ] Run full test suite
- [ ] Check application logs for any SQL errors

## Benefits of Standardization

1. **Consistency** - All tables use the same column names
2. **Predictability** - Developers know what to expect on every table
3. **Maintainability** - Easier to write generic audit logging
4. **Clarity** - `created_at` is clearer than `added_at` for when a record was created
5. **Tracking** - New `updated_by` column allows tracking who made changes

## Support

If you encounter issues during migration:

1. Check the verification script output for specific errors
2. Review the migration logs for failed operations
3. Ensure you have proper database permissions
4. Check that the `users` table exists (required for foreign keys)

## Migration Author

- **Created**: 2025-10-17
- **Purpose**: Standardize audit columns across all tables
- **Breaking Change**: Yes (requires code updates)
- **Database Version**: S_3_1
