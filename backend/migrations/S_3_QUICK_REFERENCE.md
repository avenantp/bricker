# Audit Columns - Quick Reference

## Before Migration (Current State)

### Junction Tables Use Different Names:
```typescript
// workspace_datasets table
{
  id: UUID
  workspace_id: UUID
  dataset_id: UUID
  added_at: TIMESTAMP      // ← Non-standard
  added_by: UUID           // ← Non-standard
  // NO updated_at
  // NO updated_by
}

// diagram_datasets table
{
  id: UUID
  diagram_id: UUID
  dataset_id: UUID
  added_at: TIMESTAMP      // ← Non-standard
  added_by: UUID           // ← Non-standard
  // NO updated_at
  // NO updated_by
}
```

### Regular Tables Use Standard Names:
```typescript
// datasets, diagrams, connections, etc.
{
  created_at: TIMESTAMP    // ✅ Standard
  updated_at: TIMESTAMP    // ✅ Standard
  // Some tables missing created_by/updated_by
}
```

## After Migration (New Standard)

### ALL Tables Will Have:
```typescript
{
  created_by: UUID         // ✅ Who created
  created_at: TIMESTAMP    // ✅ When created
  updated_by: UUID         // ✅ Who last updated
  updated_at: TIMESTAMP    // ✅ When last updated (auto-updated by trigger)
}
```

## Code Changes Required

### TypeScript/JavaScript (Frontend & Backend)

**Search for these patterns:**
```typescript
// ❌ OLD (will break after migration)
.select('added_at, added_by')
.order('added_at')
added_at: string
added_by: string
addedAt
addedBy

// ✅ NEW (after migration)
.select('created_at, created_by')
.order('created_at')
created_at: string
created_by: string
createdAt
createdBy
```

### SQL Queries

**Search for these patterns:**
```sql
-- ❌ OLD
SELECT added_at, added_by FROM workspace_datasets
ORDER BY added_at DESC

-- ✅ NEW
SELECT created_at, created_by FROM workspace_datasets
ORDER BY created_at DESC
```

### Function Signatures

**Database Functions Updated:**
```sql
-- ❌ OLD
get_diagram_datasets() RETURNS TABLE (added_at TIMESTAMP)
add_dataset_to_diagram(..., added_by UUID)

-- ✅ NEW
get_diagram_datasets() RETURNS TABLE (created_at TIMESTAMP)
add_dataset_to_diagram(..., created_by UUID)
```

## Migration Command

```bash
# Step 1: Verify current state
psql "$DATABASE_URL" -f backend/migrations/S_3_0_verify_audit_columns_before.sql

# Step 2: Run migration
psql "$DATABASE_URL" -f backend/migrations/S_3_1_standardize_audit_columns.sql

# Step 3: Verify success
psql "$DATABASE_URL" -f backend/migrations/S_3_0_verify_audit_columns_before.sql
```

## Files to Update After Migration

### Frontend
- `frontend/src/hooks/useDatasets.ts` ✅ (already updated)
- `frontend/src/services/workspaceDiagramService.ts`
- `frontend/src/types/*.ts` (search for added_at/added_by)

### Backend
- `backend/src/routes/datasets.ts`
- `backend/src/routes/diagrams.ts`
- Any files with Supabase queries

### Search Commands
```bash
# Find all references
grep -r "added_at" --include="*.ts" --include="*.tsx" .
grep -r "added_by" --include="*.ts" --include="*.tsx" .
grep -r "addedAt" --include="*.ts" --include="*.tsx" .
grep -r "addedBy" --include="*.ts" --include="*.tsx" .
```

## Verification Queries

```sql
-- Check all audit columns are present
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('created_at', 'created_by', 'updated_at', 'updated_by')
ORDER BY table_name, column_name;

-- Verify NO old columns remain
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('added_at', 'added_by');
-- Should return 0 rows

-- Check triggers are created
SELECT event_object_table, trigger_name
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name LIKE '%updated_at%';
```
