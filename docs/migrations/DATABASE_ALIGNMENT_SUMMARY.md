# Database Alignment Summary

## Overview

This document summarizes the comprehensive migration to align the Supabase database with the refactored technical specification.

## Current Database State (Before Migration)

Based on analysis of the current database:

### Existing Tables (20 required)
- ✅ companies
- ✅ users
- ✅ projects
- ✅ workspaces
- ✅ datasets
- ✅ columns
- ✅ lineage
- ✅ project_datasets
- ✅ workspace_datasets
- ✅ subscription_plans
- ✅ configurations
- ✅ invitations
- ✅ environments
- ✅ connections
- ✅ macros
- ✅ templates
- ✅ template_fragments
- ✅ git_commits (needs renaming to source_code_commits)
- ✅ metadata_changes (needs renaming to audit_logs)
- ✅ project_members (needs renaming to project_users)

### Tables Needing Renaming
- `company_members` → `company_users`
- `project_members` → `project_users`
- `workspace_members` → `workspace_users`
- `git_commits` → `source_code_commits`
- `metadata_changes` → `audit_logs`

### Tables to be Removed (32 deprecated)
- Old architecture: nodes, node_items, node_lineage, relationships, references, branches, data_models, data_model_members
- Legacy: node_state, node_states, audit_log, audit_logs
- Version tables: dataset_versions, column_versions, lineage_versions, sync_history, conflict_resolutions
- Future features: notifications, api_keys, webhooks, integrations, jobs, job_executions, schedules, tags, comments
- Misc: user_preferences, project_configurations, change_history, activity_logs

## Migration Script

**File**: `backend/migrations/ADD_MISSING_TABLES_AND_COLUMNS.sql`

This comprehensive migration script performs 10 parts:

### Part 1: Rename Membership Tables
- `company_members` → `company_users`
- `project_members` → `project_users`
- `workspace_members` → `workspace_users`

**Rationale**: Consistency with `users` table naming convention

### Part 2: Rename Git to Source Code
- `git_commits` → `source_code_commits`
- All related indexes renamed

**Rationale**: Support multiple source control providers (GitHub, GitLab, Bitbucket, Azure DevOps)

### Part 3: Update Datasets Table
**Column Renames**:
- `github_file_path` → `source_file_path`
- `github_commit_sha` → `source_commit_sha`

**New Columns**:
- `company_id` - Multi-tenancy support
- `owner_id` - Resource ownership
- `visibility` - Access control (public/private/locked)

### Part 4: Update Workspaces Table
**Column Renames**:
- `git_branch_name` → `source_branch`
- `git_commit_sha` → `source_commit_sha`

**New Columns**:
- `source_provider` - Provider identifier (github/gitlab/bitbucket/azure/other)
- `company_id` - Multi-tenancy support
- `owner_id` - Resource ownership
- `visibility` - Access control

### Part 5: Update Source Code Commits Table
**New Columns**:
- `source_provider` - Provider identifier
- `company_id` - Multi-tenancy support

### Part 6: Update Projects Table
**New Columns**:
- `company_id` - Multi-tenancy support
- `owner_id` - Resource ownership
- `visibility` - Access control

### Part 7-9: Ensure User Junction Tables Exist
Creates tables if missing:
- `company_users` - Company membership with roles
- `project_users` - Project access with roles
- `workspace_users` - Workspace access with roles

### Part 10: Update Environments Table (Vendor-Agnostic)
**Column Renames**:
- `databricks_workspace_url` → `platform_url`

**New Columns**:
- `target_platform` - Platform identifier (databricks/snowflake/bigquery/redshift/synapse/other)
- `platform_config` - JSONB for platform-specific configuration
- `company_id` - Multi-tenancy support

**Rationale**: Support multiple data platforms (Databricks, Snowflake, BigQuery, Redshift, Azure Synapse)

## Changes Summary

### Tables Renamed (4)
| Old Name | New Name | Reason |
|----------|----------|--------|
| `company_members` | `company_users` | Naming consistency |
| `project_members` | `project_users` | Naming consistency |
| `workspace_members` | `workspace_users` | Naming consistency |
| `git_commits` | `source_code_commits` | Multi-provider support |

### Columns Renamed (5)
| Table | Old Column | New Column |
|-------|------------|------------|
| datasets | `github_file_path` | `source_file_path` |
| datasets | `github_commit_sha` | `source_commit_sha` |
| workspaces | `git_branch_name` | `source_branch` |
| workspaces | `git_commit_sha` | `source_commit_sha` |
| environments | `databricks_workspace_url` | `platform_url` |

### Columns Added

#### datasets table
- `company_id` - Multi-tenant isolation
- `owner_id` - Resource owner
- `visibility` - Access control level

#### workspaces table
- `company_id` - Multi-tenant isolation
- `owner_id` - Resource owner
- `visibility` - Access control level
- `source_provider` - Source control provider

#### projects table
- `company_id` - Multi-tenant isolation
- `owner_id` - Resource owner
- `visibility` - Access control level

#### source_code_commits table
- `company_id` - Multi-tenant isolation
- `source_provider` - Source control provider

#### environments table
- `target_platform` - Data platform identifier
- `platform_config` - Platform-specific configuration (JSONB)
- `company_id` - Multi-tenant isolation

### New Tables Created (if missing)
- `company_users` - Company membership
- `project_users` - Project access control
- `workspace_users` - Workspace access control

## Source Control Provider Support

The `source_provider` column supports:

| Value | Provider | Description |
|-------|----------|-------------|
| `github` | GitHub | Default, cloud or enterprise |
| `gitlab` | GitLab | Cloud or self-hosted |
| `bitbucket` | Bitbucket | Cloud or server |
| `azure` | Azure DevOps | Services or server |
| `other` | Custom | Custom Git provider |

## Data Platform Support

The `target_platform` column in environments table supports:

| Value | Platform | Description |
|-------|----------|-------------|
| `databricks` | Databricks | Default, AWS/Azure/GCP |
| `snowflake` | Snowflake | Cloud data platform |
| `bigquery` | BigQuery | Google Cloud Platform |
| `redshift` | Redshift | AWS data warehouse |
| `synapse` | Azure Synapse | Azure analytics service |
| `other` | Custom | Custom data platform |

### Platform Configuration Examples

**Databricks**:
```json
{
  "workspace_url": "https://dbc-12345678-9abc.cloud.databricks.com",
  "cluster_id": "1234-567890-abc123",
  "compute_type": "serverless"
}
```

**Snowflake**:
```json
{
  "account": "xy12345.us-east-1",
  "warehouse": "COMPUTE_WH",
  "role": "TRANSFORMER"
}
```

**BigQuery**:
```json
{
  "project_id": "my-gcp-project",
  "location": "US"
}
```

## Multi-Tenancy Support

All core entities now include:
- `company_id` - For company isolation
- `owner_id` - For resource ownership
- `visibility` - For access control:
  - `public` - Visible to all company members
  - `private` - Visible only to owner and admins
  - `locked` - Read-only for non-owners/admins

## Migration Steps

### 1. Backup Database
```bash
# Create backup in Supabase dashboard before proceeding
Settings → Database → Backups → Create backup
```

### 2. Run Cleanup Script (Optional)
```sql
-- First remove deprecated tables
-- Execute: backend/migrations/CLEANUP_COMPLETE_remove_all_deprecated.sql
```

### 3. Run Main Migration
```sql
-- Add missing tables and columns
-- Execute: backend/migrations/ADD_MISSING_TABLES_AND_COLUMNS.sql
```

### 4. Verify Changes
```sql
-- Check renamed tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('company_users', 'project_users', 'workspace_users', 'source_code_commits')
ORDER BY table_name;

-- Check added columns
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    column_name IN ('company_id', 'owner_id', 'visibility', 'source_provider', 'target_platform', 'platform_config', 'platform_url')
    OR column_name LIKE 'source_%'
  )
ORDER BY table_name, column_name;
```

### 5. Populate Multi-Tenancy Data
```sql
-- Set company_id for existing projects
UPDATE projects p
SET company_id = u.company_id
FROM users u
WHERE p.created_by = u.id
AND p.company_id IS NULL;

-- Set owner_id for existing projects
UPDATE projects
SET owner_id = created_by
WHERE owner_id IS NULL;

-- Repeat for workspaces and datasets
```

## Code Changes Required

### TypeScript Types

Update interfaces to match new schema:

```typescript
// Update table names
type CompanyUser = { /* formerly CompanyMember */ }
type ProjectUser = { /* formerly ProjectMember */ }
type WorkspaceUser = { /* formerly WorkspaceMember */ }
type SourceCodeCommit = { /* formerly GitCommit */ }

// Update column names
interface Workspace {
  source_branch: string; // was git_branch_name
  source_commit_sha: string | null; // was git_commit_sha
  source_provider: SourceProvider;
  company_id: string;
  owner_id: string;
  visibility: 'public' | 'private' | 'locked';
}

interface Dataset {
  source_file_path: string | null; // was github_file_path
  source_commit_sha: string | null; // was github_commit_sha
  company_id: string;
  owner_id: string;
  visibility: 'public' | 'private' | 'locked';
}

type SourceProvider = 'github' | 'gitlab' | 'bitbucket' | 'azure' | 'other';

interface Environment {
  platform_url: string | null; // was databricks_workspace_url
  target_platform: TargetPlatform;
  platform_config: PlatformConfig | null;
  company_id: string;
}

type TargetPlatform = 'databricks' | 'snowflake' | 'bigquery' | 'redshift' | 'synapse' | 'other';

type PlatformConfig = {
  databricks?: {
    workspace_url: string;
    cluster_id?: string;
    compute_type?: string;
  };
  snowflake?: {
    account: string;
    warehouse: string;
    role: string;
  };
  bigquery?: {
    project_id: string;
    location: string;
  };
  // ... other platform configs
};
```

### Service Layer Updates

1. **Rename services**:
   - `git-sync-service.ts` → `source-code-sync-service.ts`

2. **Update queries**:
   - Change table references
   - Update column names
   - Add company_id filters to all queries

3. **Update RLS context**:
   - Use company_id for isolation
   - Respect visibility settings
   - Check owner_id for permissions

### UI Component Updates

1. **Rename components**:
   - `GitSyncPanel` → `SourceCodeSyncPanel`
   - Update all references

2. **Add provider selection**:
   - Dropdown for source_provider
   - Provider-specific configurations

3. **Add visibility controls**:
   - Public/Private/Locked toggles
   - Visibility indicators

## Verification Queries

### Check Table Counts
```sql
SELECT
  (SELECT COUNT(*) FROM company_users) as company_users,
  (SELECT COUNT(*) FROM project_users) as project_users,
  (SELECT COUNT(*) FROM workspace_users) as workspace_users,
  (SELECT COUNT(*) FROM source_code_commits) as source_code_commits;
```

### Check Multi-Tenancy Columns
```sql
SELECT
  COUNT(*) FILTER (WHERE company_id IS NOT NULL) as with_company,
  COUNT(*) FILTER (WHERE owner_id IS NOT NULL) as with_owner,
  COUNT(*) as total
FROM projects;
```

### Check Source Provider Distribution
```sql
SELECT source_provider, COUNT(*)
FROM workspaces
GROUP BY source_provider;
```

### Check Platform Distribution
```sql
SELECT target_platform, COUNT(*)
FROM environments
GROUP BY target_platform;
```

## Rollback Plan

If issues occur, rollback script:

```sql
-- Rollback table renames
ALTER TABLE company_users RENAME TO company_members;
ALTER TABLE project_users RENAME TO project_members;
ALTER TABLE workspace_users RENAME TO workspace_members;
ALTER TABLE source_code_commits RENAME TO git_commits;

-- Rollback column renames
ALTER TABLE datasets RENAME COLUMN source_file_path TO github_file_path;
ALTER TABLE datasets RENAME COLUMN source_commit_sha TO github_commit_sha;
ALTER TABLE workspaces RENAME COLUMN source_branch TO git_branch_name;
ALTER TABLE workspaces RENAME COLUMN source_commit_sha TO git_commit_sha;

-- Drop added columns
ALTER TABLE datasets DROP COLUMN IF EXISTS company_id;
ALTER TABLE datasets DROP COLUMN IF EXISTS owner_id;
ALTER TABLE datasets DROP COLUMN IF EXISTS visibility;

-- Rollback environments table changes
ALTER TABLE environments RENAME COLUMN platform_url TO databricks_workspace_url;
ALTER TABLE environments DROP COLUMN IF EXISTS target_platform;
ALTER TABLE environments DROP COLUMN IF EXISTS platform_config;
-- etc...
```

## Benefits

1. **Multi-Provider Support**: No longer tied to GitHub for source control
2. **Platform Agnostic**: Support for multiple data platforms (Databricks, Snowflake, BigQuery, Redshift, Synapse)
3. **Multi-Tenancy**: Complete company isolation
4. **Access Control**: Flexible visibility settings
5. **Ownership Model**: Clear resource ownership
6. **Consistent Naming**: All membership tables follow *_users pattern
7. **Future-Proof**: Easy to add new source control and data platform providers

## Next Steps

1. ✅ Review migration script
2. ⬜ Create database backup
3. ⬜ Run migration script
4. ⬜ Verify all changes
5. ⬜ Update TypeScript types
6. ⬜ Update service layer
7. ⬜ Update UI components
8. ⬜ Test thoroughly
9. ⬜ Deploy to production

## References

- Technical Specification: `docs/prp/001-technical-specifications-refactored.md`
- Migration Script: `backend/migrations/ADD_MISSING_TABLES_AND_COLUMNS.sql`
- Cleanup Script: `backend/migrations/CLEANUP_COMPLETE_remove_all_deprecated.sql`
- Git to Source Code Mapping: `docs/migrations/GIT_TO_SOURCE_CODE_MAPPING.md`
