# Git to Source Code Provider Renaming

## Overview

To support multiple source code providers (GitHub, GitLab, Bitbucket, Azure DevOps, etc.), we're renaming all `git` and `github` references to more generic `source_code` terms.

## Table Name Changes

| Old Name | New Name |
|----------|----------|
| `git_commits` | `source_code_commits` |

## Column Name Changes

| Old Name | New Name | Used In |
|----------|----------|---------|
| `github_file_path` | `source_file_path` | datasets |
| `github_repo` | `source_repo` | projects |
| `github_branch` | `source_branch` | workspaces |
| `github_owner` | `source_owner` | projects |
| `github_url` | `source_url` | projects |
| `git_provider` | `source_provider` | projects |
| `git_sync` | `source_sync` | various |

## Index Name Changes

| Old Name | New Name |
|----------|----------|
| `idx_git_commits_workspace` | `idx_source_code_commits_workspace` |
| `idx_git_commits_project` | `idx_source_code_commits_project` |
| `idx_git_commits_sha` | `idx_source_code_commits_sha` |
| `idx_git_commits_committed_at` | `idx_source_code_commits_committed_at` |
| `idx_git_commits_company` | `idx_source_code_commits_company` |
| `idx_git_commits_created_by` | `idx_source_code_commits_created_by` |
| `idx_datasets_github_path` | `idx_datasets_source_path` |

## RLS Policy Name Changes

| Old Name | New Name |
|----------|----------|
| `git_commits_isolation_policy` | `source_code_commits_isolation_policy` |
| `git_commits_select_policy` | `source_code_commits_select_policy` |
| `git_commits_insert_policy` | `source_code_commits_insert_policy` |

## Foreign Key Constraint Changes

Any foreign keys referencing:
- `git_commits` → `source_code_commits`
- `git_commits(commit_sha)` → `source_code_commits(commit_sha)`

## Provider Enum Values

The `source_provider` column will support:
- `github` (GitHub)
- `gitlab` (GitLab)
- `bitbucket` (Bitbucket)
- `azure` (Azure DevOps)
- `other` (Custom/self-hosted)

## Migration Strategy

1. **Rename table**: `git_commits` → `source_code_commits`
2. **Rename columns** in all affected tables
3. **Recreate indexes** with new names
4. **Recreate RLS policies** with new names
5. **Update foreign key constraints**
6. **Update documentation**

## Files That Need Updates

### Migration Files
- `backend/migrations/M_0_1_create_datasets_and_columns.sql`
- `backend/migrations/M_0_2_create_git_sync_tables.sql`
- `backend/migrations/M_0_4_create_datasets_and_columns.sql`
- `backend/migrations/M_0_5_create_git_sync_tables.sql`
- `backend/migrations/M_1_2_add_git_sync_columns.sql`
- `backend/migrations/M_1_3_create_new_tables.sql`
- `backend/migrations/CLEANUP_COMPLETE_remove_all_deprecated.sql`
- `backend/migrations/README.md`

### Documentation Files
- `docs/prp/001-technical-specifications-refactored.md`
- `docs/prp/000-task-list-refactored.md`
- `docs/cleanup/DATABASE_CLEANUP_SUMMARY.md`

### Schema Files (if still in use)
- `supabase/migrations/*.sql`
- `supabase-schema.sql`
- Other schema definition files

## Rationale

- **Provider Agnostic**: Not tied to Git or GitHub specifically
- **Future-Proof**: Easy to add support for GitLab, Bitbucket, Azure DevOps
- **Clear Intent**: "source_code" clearly indicates version control for code
- **Consistent Naming**: Aligns with multi-provider architecture
