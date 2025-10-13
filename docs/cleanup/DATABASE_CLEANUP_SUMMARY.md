# Database Cleanup Summary

## Overview

Your Supabase database currently has **53 tables**, but according to the refactored technical specification, only **18 tables** are required (after renaming membership tables for consistency). This cleanup will remove **31 deprecated/unused tables** and rename **3 membership tables**.

**Important**: The membership tables (`company_members`, `project_members`, `workspace_members`) will be **renamed** (not removed) to follow the `*_users` naming convention for consistency with the `users` table.

## Current State

### Tables to Remove (31 total)

#### 1. Old Architecture Tables (8 tables)
These were part of the original node-based architecture and have been replaced:

- `nodes` → Replaced by `datasets`
- `node_items` → Replaced by `columns`
- `node_lineage` → Replaced by `lineage`
- `relationships` → Eliminated (now `columns.reference_column_id`)
- `references` → Eliminated (now `columns.reference_column_id`)
- `data_models` → Replaced by `datasets`
- `data_model_members` → Eliminated
- `branches` → Replaced by `workspaces`

#### 2. Node-Related Legacy Tables (3 tables)
- `node_state` - Old Git sync status tracking
- `node_states` - Legacy variant
- `uuid_registry` - UUID to GitHub path mapping (replaced by `datasets.dataset_id` + `github_file_path`)

#### 3. Duplicate/Unused Audit Tables (4 tables)
- `audit_log` → Not in spec
- Old `audit_logs` → Replaced by new `audit_logs` table
- `change_history` → Replaced by `audit_logs`
- `activity_logs` → Replaced by `audit_logs`

#### 4. Version Tables (5 tables)
These are replaced by Git-based versioning:

- `dataset_versions` → Using `git_commits`
- `column_versions` → Using `git_commits`
- `lineage_versions` → Using `git_commits`
- `sync_history` → Using `git_commits`
- `conflict_resolutions` → Not in spec

#### 5. Configuration Tables (2 tables)
- `project_configurations` → Using `projects.configuration` JSONB column
- `user_preferences` → Not in spec

#### 6. Future Feature Tables (9 tables)
These are not part of the current refactored spec:

- `notifications`
- `api_keys`
- `webhooks`
- `integrations`
- `jobs`
- `job_executions`
- `schedules`
- `tags`
- `comments`

---

## Tables That Will Remain (18 tables)

### Multi-Tenant Foundation (3 tables)
- `companies` - Root tenant entity with subscription management
- `users` - User accounts with company association
- `company_users` - Company membership (renamed from company_members for consistency)

### Projects (3 tables)
- `projects` - Project definitions with multi-tenancy
- `project_users` - Project access control (renamed from project_members for consistency)
- `project_datasets` - Many-to-many mapping for shared datasets

### Workspaces (3 tables)
- `workspaces` - Workspace (branch) management
- `workspace_users` - Workspace access control (renamed from workspace_members for consistency)
- `workspace_datasets` - Many-to-many mapping with canvas positions

### Data Model (3 tables)
- `datasets` - Core data entities (formerly nodes)
- `columns` - Column definitions with self-referencing references
- `lineage` - Data lineage tracking

### Source Control Sync (2 tables)
- `source_code_commits` - Source control commit history (GitHub, GitLab, Bitbucket, Azure DevOps)
- `audit_logs` - Complete audit trail and change tracking

### Supporting Tables (5 tables)
- `environments` - Environment configurations (dev/staging/prod)
- `connections` - Data source connections
- `macros` - Reusable code snippets
- `templates` - Jinja2 templates
- `template_fragments` - Template injection points

### System Tables (3 tables)
- `subscription_plans` - Subscription tier definitions
- `invitations` - User invitation management
- `configurations` - System-wide configurations

---

## Cleanup Script

The complete cleanup script is located at:
```
backend/migrations/CLEANUP_COMPLETE_remove_all_deprecated.sql
```

### How to Run

1. **Backup your database first** (Supabase dashboard → Settings → Database → Create backup)

2. Open Supabase SQL Editor

3. Copy and paste the contents of `CLEANUP_COMPLETE_remove_all_deprecated.sql`

4. Review the script one more time

5. Execute the script

### What the Script Does

The script is organized into 6 sections:

1. **Section 1**: Removes old architecture tables (8 tables)
2. **Section 2**: Removes node-related legacy tables (3 tables)
3. **Section 3**: Removes duplicate/unused audit tables (4 tables)
4. **Section 4**: Removes version tables (5 tables)
5. **Section 5**: Removes configuration tables (2 tables)
6. **Section 6**: Removes future feature tables (9 tables)

**Note**: Added `uuid_registry` to Section 2 - this table tracked UUID-to-GitHub-path mappings in the old architecture, now replaced by direct columns on the `datasets` table.

Each section provides clear output showing which tables were removed and why.

### Expected Output

```
==========================================
STARTING COMPLETE DATABASE CLEANUP
==========================================

Section 1: Removing old architecture tables...

✅ Removed: nodes (replaced by datasets)
✅ Removed: node_items (replaced by columns)
✅ Removed: node_lineage (replaced by lineage)
... (continues for all 34 tables)

==========================================
CLEANUP COMPLETE!
==========================================

Total tables removed: 31

Remaining tables (18 core tables):
  Multi-tenant:
    • companies
    • users
    • company_users (renamed from company_members)

  Projects:
    • projects
    • project_users (renamed from project_members)
    • project_datasets

  Workspaces:
    • workspaces
    • workspace_users (renamed from workspace_members)
    • workspace_datasets

  Data Model:
    • datasets
    • columns
    • lineage

  Source Control Sync:
    • source_code_commits
    • audit_logs

  Supporting:
    • environments
    • connections
    • macros
    • templates
    • template_fragments

  System:
    • subscription_plans
    • invitations
    • configurations

Database is now clean and aligned with refactored spec!
```

---

## Verification

After running the cleanup script, you can verify the remaining tables by running:

```sql
SELECT table_name,
       (SELECT COUNT(*) FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

You should see exactly **19 tables**.

---

## Safety Notes

✅ **Safe to run**: All tables being removed have **0 rows** (empty tables)

✅ **Uses CASCADE**: Foreign key constraints will be handled automatically

✅ **Idempotent**: Uses `IF EXISTS` so can be run multiple times safely

⚠️ **Review first**: Double-check that none of the "unknown" tables contain data you need

---

## References

- **Technical Specification**: `docs/prp/001-technical-specifications-refactored.md`
- **Task List**: `docs/prp/000-task-list-refactored.md`
- **Analysis Script**: `scripts/get-all-database-tables.js`
- **Cleanup Script**: `backend/migrations/CLEANUP_COMPLETE_remove_all_deprecated.sql`

---

## Table Renaming for Naming Consistency

After the cleanup, you should rename the membership tables to follow the `*_users` naming convention:

1. **Run the renaming migration**:
   - Script location: `backend/migrations/RENAME_membership_tables_to_users.sql`
   - Open Supabase SQL Editor
   - Copy and paste the script
   - Execute to rename all three tables

2. **Tables that will be renamed**:
   - `company_members` → `company_users`
   - `project_members` → `project_users`
   - `workspace_members` → `workspace_users`

3. **Why rename?**
   - Consistency with the `users` table naming convention
   - Clear indication that these tables link users to resources
   - Follows the established naming pattern

---

## Next Steps After Cleanup

Once the database is clean and tables are renamed, you can proceed with:

1. **Phase M.0**: Multi-tenant foundation migrations
2. **Phase M.1**: Database schema updates (add new columns, constraints, indexes)
3. **Phase M.2**: Code migration (TypeScript types, services, components)

See `docs/prp/000-task-list-refactored.md` for complete migration roadmap.
