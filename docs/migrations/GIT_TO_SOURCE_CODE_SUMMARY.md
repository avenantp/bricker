# Git to Source Code Provider Renaming - Summary

## Overview

Successfully renamed all `git` and `github` references to generic `source_code` and `source_*` terminology to support multiple source control providers (GitHub, GitLab, Bitbucket, Azure DevOps, etc.).

## Changes Made

### 1. Table Renames

| Old Name | New Name |
|----------|----------|
| `git_commits` | `source_code_commits` |

### 2. Column Renames

#### datasets table
| Old Name | New Name |
|----------|----------|
| `github_file_path` | `source_file_path` |
| `github_commit_sha` | `source_commit_sha` |

#### workspaces table
| Old Name | New Name |
|----------|----------|
| `git_branch_name` | `source_branch` |
| `git_commit_sha` | `source_commit_sha` |

### 3. New Columns Added

| Table | Column | Type | Default | Description |
|-------|--------|------|---------|-------------|
| `workspaces` | `source_provider` | VARCHAR | 'github' | Source control provider identifier |
| `source_code_commits` | `source_provider` | VARCHAR | 'github' | Source control provider identifier |

### 4. Index Renames

| Old Name | New Name |
|----------|----------|
| `idx_git_commits_workspace` | `idx_source_code_commits_workspace` |
| `idx_git_commits_project` | `idx_source_code_commits_project` |
| `idx_git_commits_sha` | `idx_source_code_commits_sha` |
| `idx_git_commits_committed_at` | `idx_source_code_commits_committed_at` |
| `idx_git_commits_company` | `idx_source_code_commits_company` |
| `idx_git_commits_created_by` | `idx_source_code_commits_created_by` |
| `idx_datasets_github_path` | `idx_datasets_source_path` |

### 5. RLS Policy Updates (if applicable)

If RLS policies exist, they will need to be recreated with new names:
- `git_commits_isolation_policy` → `source_code_commits_isolation_policy`
- `git_commits_select_policy` → `source_code_commits_select_policy`
- `git_commits_insert_policy` → `source_code_commits_insert_policy`

## Supported Source Control Providers

The `source_provider` column supports the following values:

| Value | Provider | Description |
|-------|----------|-------------|
| `github` | GitHub | Default provider, GitHub cloud or Enterprise |
| `gitlab` | GitLab | GitLab cloud or self-hosted |
| `bitbucket` | Bitbucket | Bitbucket Cloud or Server |
| `azure` | Azure DevOps | Azure DevOps Services or Server |
| `other` | Custom | Custom or self-hosted Git provider |

## Migration Files

### 1. Main Renaming Script
**File**: `backend/migrations/RENAME_git_to_source_code.sql`

This script performs all the renaming operations:
- Renames tables
- Renames columns
- Adds new `source_provider` columns
- Renames indexes
- Provides verification queries

**Usage**:
```sql
-- Run in Supabase SQL Editor
-- Execute: backend/migrations/RENAME_git_to_source_code.sql
```

### 2. Updated Documentation

#### Technical Specifications
**File**: `docs/prp/001-technical-specifications-refactored.md`
- Updated Section 3.3: Workspace Entity (source_branch, source_commit_sha, source_provider)
- Updated Section 3.4: Dataset Entity (source_file_path, source_commit_sha)
- Updated Section 3.6: Source Control Sync Tables (source_code_commits table)
- Updated all business rules and documentation

#### Cleanup Documentation
**File**: `docs/cleanup/DATABASE_CLEANUP_SUMMARY.md`
- Updated "Source Control Sync" section
- Changed references from `git_commits` to `source_code_commits`

**File**: `backend/migrations/CLEANUP_COMPLETE_remove_all_deprecated.sql`
- Updated all comments and RAISE NOTICE statements
- Changed references from `git_commits` to `source_code_commits`
- Updated documentation headers

### 3. Mapping Reference
**File**: `docs/migrations/GIT_TO_SOURCE_CODE_MAPPING.md`

Complete mapping of all old to new names with rationale and migration strategy.

## Verification Steps

After running the migration, verify the changes:

### 1. Check Table Rename
```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'source_code_commits';
```
Expected: 1 row

### 2. Check Column Renames
```sql
SELECT table_name, column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    column_name IN ('source_file_path', 'source_commit_sha', 'source_branch', 'source_provider')
    OR table_name = 'source_code_commits'
  )
ORDER BY table_name, column_name;
```

Expected results:
- `datasets.source_file_path`
- `datasets.source_commit_sha`
- `workspaces.source_branch`
- `workspaces.source_commit_sha`
- `workspaces.source_provider`
- `source_code_commits.*` (all columns)

### 3. Check Indexes
```sql
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%source_code%'
ORDER BY indexname;
```

Expected: All renamed indexes should appear

### 4. Check Default Values
```sql
SELECT table_name, column_name, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'source_provider';
```

Expected: Both should have default value `'github'::character varying`

## Code Changes Required

### 1. TypeScript Types/Interfaces

Update all interfaces to use new column names:

```typescript
// OLD
interface Workspace {
  workspace_id: string;
  git_branch_name: string;
  git_commit_sha: string | null;
  // ...
}

interface Dataset {
  dataset_id: string;
  github_file_path: string | null;
  github_commit_sha: string | null;
  // ...
}

// NEW
interface Workspace {
  workspace_id: string;
  source_branch: string;
  source_commit_sha: string | null;
  source_provider: 'github' | 'gitlab' | 'bitbucket' | 'azure' | 'other';
  // ...
}

interface Dataset {
  dataset_id: string;
  source_file_path: string | null;
  source_commit_sha: string | null;
  // ...
}

interface SourceCodeCommit { // renamed from GitCommit
  commit_id: string;
  source_provider: 'github' | 'gitlab' | 'bitbucket' | 'azure' | 'other';
  // ...
}
```

### 2. Service Layer

Rename and update services:
- `git-sync-service.ts` → `source-code-sync-service.ts`
- Update all method names and variable references
- Update table/column references in queries

### 3. API Routes

Update API endpoints:
- `/api/git/sync` → `/api/source-code/sync`
- `/api/git/commit` → `/api/source-code/commit`
- etc.

### 4. React Components

Update component references:
- Rename `GitSyncPanel.tsx` → `SourceCodeSyncPanel.tsx`
- Update all prop types and state references
- Update UI text (e.g., "Git Sync" → "Source Code Sync")

## Benefits

### 1. Provider Agnostic
- No longer tied to Git or GitHub specifically
- Easy to add support for new providers

### 2. Future-Proof
- Can support GitLab, Bitbucket, Azure DevOps without schema changes
- `source_provider` column allows filtering/routing per provider

### 3. Clear Intent
- "source_code" clearly indicates version control for code
- More accurate terminology than "git" (which is implementation detail)

### 4. Consistent Naming
- Aligns with multi-provider architecture
- Follows established naming patterns

## Next Steps

1. ✅ **Run Migration Script**: Execute `RENAME_git_to_source_code.sql` in Supabase
2. ⬜ **Verify Changes**: Run verification queries
3. ⬜ **Update TypeScript Types**: Update all interfaces and types
4. ⬜ **Update Service Layer**: Rename and update services
5. ⬜ **Update API Routes**: Update endpoint paths
6. ⬜ **Update React Components**: Update UI components
7. ⬜ **Test Thoroughly**: Ensure all functionality works
8. ⬜ **Update Frontend Constants**: Add provider enum/constants
9. ⬜ **Implement Provider Selection UI**: Add UI for choosing provider

## Rollback Plan

If needed, rollback script would reverse all changes:

```sql
-- Rollback: source_code_commits → git_commits
ALTER TABLE source_code_commits RENAME TO git_commits;
ALTER TABLE git_commits DROP COLUMN IF EXISTS source_provider;

-- Rollback: datasets columns
ALTER TABLE datasets RENAME COLUMN source_file_path TO github_file_path;
ALTER TABLE datasets RENAME COLUMN source_commit_sha TO github_commit_sha;

-- Rollback: workspaces columns
ALTER TABLE workspaces RENAME COLUMN source_branch TO git_branch_name;
ALTER TABLE workspaces RENAME COLUMN source_commit_sha TO git_commit_sha;
ALTER TABLE workspaces DROP COLUMN IF EXISTS source_provider;

-- Rollback indexes
ALTER INDEX idx_source_code_commits_workspace RENAME TO idx_git_commits_workspace;
-- ... etc for all indexes
```

## References

- Technical Specification: `docs/prp/001-technical-specifications-refactored.md`
- Migration Script: `backend/migrations/RENAME_git_to_source_code.sql`
- Mapping Document: `docs/migrations/GIT_TO_SOURCE_CODE_MAPPING.md`
- Cleanup Script: `backend/migrations/CLEANUP_COMPLETE_remove_all_deprecated.sql`
