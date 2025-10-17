# Apply Audit Column Cleanup Migration

## Problem
The application is encountering errors like:
```
record "old" has no field "deleted_at"
```

This happens because database triggers are trying to access `deleted_at` columns that don't exist on all tables.

## Solution
Run the migration script `015_cleanup_audit_columns.sql` which will:
1. **Remove** `deleted_at` and `deleted_by` columns from ALL tables
2. **Standardize** audit columns - ensure any table with audit columns has all four: `created_at`, `created_by`, `updated_at`, `updated_by`
3. **Drop** soft delete functions that reference deleted_at
4. **Report** which tables were affected

## How to Apply (Option 1: Supabase Dashboard)

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/015_cleanup_audit_columns.sql`
5. Paste into the SQL Editor
6. Click **Run**
7. Check the output for the summary report

## How to Apply (Option 2: Command Line with psql)

If you have PostgreSQL client tools installed:

```bash
# Windows PowerShell
$env:PGPASSWORD = "your-password"
psql -h db.dhclhobnxhdkkxrbtmkb.supabase.co -p 5432 -U postgres -d postgres -f supabase/migrations/015_cleanup_audit_columns.sql

# Linux/Mac
PGPASSWORD='your-password' psql -h db.dhclhobnxhdkkxrbtmkb.supabase.co -p 5432 -U postgres -d postgres -f supabase/migrations/015_cleanup_audit_columns.sql
```

## Expected Output

You should see messages like:
```
NOTICE:  Dropping column deleted_at from table projects
NOTICE:  Dropping column deleted_at from table workspaces
NOTICE:  Dropping column deleted_at from table datasets
NOTICE:  Standardizing audit columns for table: datasets
NOTICE:    Adding created_by to datasets
...
NOTICE:  =====================================================
NOTICE:  AUDIT COLUMN CLEANUP SUMMARY
NOTICE:  =====================================================
NOTICE:  Tables with complete audit columns:
NOTICE:    ✓ accounts (4 audit columns)
NOTICE:    ✓ projects (4 audit columns)
...
```

## After Migration

After successfully running the migration:
1. Restart your application servers
2. Clear any cached data
3. Test the dataset editing functionality
4. Verify no more `deleted_at` errors appear in the console

## Rollback (if needed)

If you need to rollback, you would need to:
1. Identify which tables need deleted_at columns added back
2. Review migration 007 to see which tables originally had deleted_at
3. Add back only the columns that were intentionally included

However, this migration is designed to **fix** the issue, not cause problems. The deleted_at columns were causing trigger errors.
