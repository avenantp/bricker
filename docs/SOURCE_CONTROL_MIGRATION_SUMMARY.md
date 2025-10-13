# Source Control Migration Summary

## Overview
This document tracks the migration from "git" terminology to "source-control" terminology to support multiple source control systems (GitHub, GitLab, Bitbucket, Azure DevOps, etc.).

## Completed Changes

### Backend Changes ✅

1. **File Renamed:**
   - `backend/src/routes/git-sync.ts` → `backend/src/routes/source-control-sync.ts`

2. **API Routes Updated:**
   - `/api/git-sync/*` → `/api/source-control-sync/*`
   - All endpoints now use "source-control" terminology

3. **Backend Functions Updated:**
   - `getGitHubClientForWorkspace()` → `getSourceControlClientForWorkspace()`
   - Added support for `source_control_provider` field (currently supports 'github', extensible for others)

4. **Database Table References:**
   - `git_commits` → `source_control_commits`
   - Console logs updated to use "Source Control Sync" instead of "Git Sync"

5. **Backend Server Updated:**
   - `backend/src/index.ts` now imports and uses `sourceControlSyncRouter`
   - API endpoint documented as `/api/source-control-sync/*`

## Required Database Column Changes

These columns need to be renamed in Supabase:

### Table: `workspaces`
- `github_repo` → `source_control_repo`
- `github_branch` → `source_control_branch`
- Add new column: `source_control_provider` (VARCHAR, default: 'github')

### Table: `datasets`
- `github_commit_sha` → `source_control_commit_sha`
- `github_file_path` → `source_control_file_path`

### Table: `git_commits` (rename entire table)
- Rename table: `git_commits` → `source_control_commits`

### Settings JSON field
In `workspaces.settings`:
- `github_token` → `source_control_token`

## Required Frontend Changes

### 1. Service Layer

**File: `frontend/src/lib/git-sync-service.ts`**
- Rename to: `frontend/src/lib/source-control-sync-service.ts`
- Update all function names:
  - `commitDataset` → remains same (generic)
  - `pullFromGit` → `pullFromSourceControl`
  - `pushToGit` → `pushToSourceControl`
- Update API endpoints: `/api/git-sync/*` → `/api/source-control-sync/*`
- Update all variable names containing "git" or "github"

### 2. React Query Hooks

**File: `frontend/src/hooks/useGitSync.ts`**
- Rename to: `frontend/src/hooks/useSourceControlSync.ts`
- Update hook names:
  - `useGitSync` → `useSourceControlSync`
  - `usePullFromGit` → `usePullFromSourceControl`
  - `usePushToGit` → `usePushToSourceControl`
- Update query keys:
  - `gitSyncKeys` → `sourceControlSyncKeys`
  - `gitSync.all` → `sourceControlSync.all`

### 3. Type Definitions

**File: `frontend/src/types/dataset.ts`**
- Update interface properties:
  - `github_commit_sha` → `source_control_commit_sha`
  - `github_file_path` → `source_control_file_path`
- Update `GitCommit` type → `SourceControlCommit`
- Add `SourceControlProvider` type: `'github' | 'gitlab' | 'bitbucket' | 'azure_devops'`

### 4. Components

**File: `frontend/src/components/Canvas/GitSyncPanel.tsx`**
- Rename to: `SourceControlSyncPanel.tsx`
- Update component name and all references
- Update UI text: "Git Sync" → "Source Control Sync"

**File: `frontend/src/components/Canvas/GitHistoryPanel.tsx`**
- Rename to: `SourceControlHistoryPanel.tsx`
- Update component name and references

**File: `frontend/src/components/Canvas/DatasetEditorDialog.tsx`**
- Update "Git Sync Status" → "Source Control Sync Status"
- Update property names in UI

**File: `frontend/src/components/Canvas/index.ts`**
- Update exports to use new component names

### 5. Store Updates

**File: `frontend/src/store/types.ts`**
- Rename UI state: `isGitSyncPanelOpen` → `isSourceControlSyncPanelOpen`
- Update action: `toggleGitSyncPanel` → `toggleSourceControlSyncPanel`

**File: `frontend/src/store/useStore.ts`**
- Update implementation to match type changes

## Database Migration Script

```sql
-- Migration: Rename Git columns to Source Control
-- Run this on Supabase

-- 1. Add source_control_provider column to workspaces
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS source_control_provider VARCHAR(50) DEFAULT 'github';

-- 2. Rename workspace columns
ALTER TABLE workspaces
RENAME COLUMN github_repo TO source_control_repo;

ALTER TABLE workspaces
RENAME COLUMN github_branch TO source_control_branch;

-- 3. Rename dataset columns
ALTER TABLE datasets
RENAME COLUMN github_commit_sha TO source_control_commit_sha;

ALTER TABLE datasets
RENAME COLUMN github_file_path TO source_control_file_path;

-- 4. Rename git_commits table
ALTER TABLE git_commits
RENAME TO source_control_commits;

-- 5. Update indexes (if any exist with git in the name)
-- List indexes first:
-- SELECT * FROM pg_indexes WHERE tablename IN ('workspaces', 'datasets', 'source_control_commits');
-- Then rename as needed

-- 6. Update RLS policies (if they reference old column names)
-- Check existing policies:
-- SELECT * FROM pg_policies WHERE tablename IN ('workspaces', 'datasets', 'source_control_commits');
```

## Testing Checklist

After making all changes:

- [ ] Backend compiles without errors
- [ ] Frontend compiles without errors
- [ ] API endpoint `/api/source-control-sync/:workspace_id/uncommitted` works
- [ ] API endpoint `/api/source-control-sync/:workspace_id/commit` works
- [ ] API endpoint `/api/source-control-sync/:workspace_id/pull` works
- [ ] API endpoint `/api/source-control-sync/:workspace_id/push` works
- [ ] All database queries work with new column names
- [ ] UI displays "Source Control" instead of "Git"
- [ ] Source control provider can be configured (GitHub as default)
- [ ] Existing GitHub integrations still work
- [ ] Commit history displays correctly
- [ ] Uncommitted changes are tracked properly

## Future Extensibility

With these changes, adding support for other source control providers requires:

1. Create provider-specific client (e.g., `GitLabClient`, `BitbucketClient`)
2. Update `getSourceControlClientForWorkspace()` in `backend/src/routes/source-control-sync.ts`
3. Add provider option to workspace settings UI
4. No changes needed to API contracts or database schema

## Notes

- The term "commit" is universal across all source control systems, so it remains unchanged
- YAML format is provider-agnostic
- The GitHub client implementation remains for backward compatibility
- All changes maintain backward compatibility with existing data (GitHub provider is default)
