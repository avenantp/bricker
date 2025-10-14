# React Query Hooks Documentation

## Overview

This document describes all React Query hooks available for managing Projects, Workspaces, and Source Control integration. These hooks provide a declarative API for data fetching, caching, synchronization, and mutations with built-in loading, error, and success states.

**Location**: `frontend/src/hooks/`

## Architecture

The hooks layer provides:

1. **Declarative Data Fetching**: Use hooks in components to fetch data
2. **Automatic Caching**: Data is cached and shared across components
3. **Background Updates**: Stale data is refetched automatically
4. **Optimistic Updates**: UI updates immediately before server confirms
5. **Error Handling**: Built-in error states and retry logic
6. **Loading States**: Automatic loading indicators
7. **Cache Invalidation**: Smart cache updates after mutations

## React Query Configuration

### QueryClient Setup

**File**: `frontend/src/lib/react-query-client.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';
import { createQueryClient, setupQueryErrorHandlers } from '@/lib/react-query-client';

// Create client
const queryClient = createQueryClient();

// Setup error handlers
setupQueryErrorHandlers(queryClient);

// Wrap app with QueryClientProvider
<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

### Default Configuration

- **Stale Time**: 60 seconds (data stays fresh for 1 minute)
- **Cache Time**: 5 minutes (inactive queries removed after 5 minutes)
- **Retries**: 2 retries for 5xx errors, no retries for 4xx errors
- **Retry Delay**: Exponential backoff (1s, 2s, 4s...)
- **Refetch on Window Focus**: Enabled
- **Refetch on Reconnect**: Enabled

---

## Project Hooks

**File**: `frontend/src/hooks/useProjects.ts`

### Query Hooks

#### useProjects

Fetch paginated list of projects with filtering and sorting.

```typescript
import { useProjects } from '@/hooks';

function ProjectsList() {
  const { data, isLoading, error, refetch } = useProjects({
    account_id: 'account-uuid',
    project_type: 'DataVault',
    search: 'vault',
    page: 1,
    limit: 20,
    sort_by: 'updated_at',
    sort_order: 'desc'
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.data.map(project => (
        <div key={project.id}>{project.name}</div>
      ))}
      <div>
        Page {data?.pagination.page} of {data?.pagination.total_pages}
      </div>
    </div>
  );
}
```

#### useProject

Fetch a single project with details.

```typescript
import { useProject } from '@/hooks';

function ProjectDetail({ projectId }: { projectId: string }) {
  const { data: project, isLoading } = useProject(projectId);

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1>{project?.name}</h1>
      <p>{project?.description}</p>
      <p>Workspaces: {project?.workspace_count}</p>
      <p>Datasets: {project?.dataset_count}</p>
    </div>
  );
}
```

#### useProjectMembers

Fetch project members.

```typescript
import { useProjectMembers } from '@/hooks';

function ProjectMembers({ projectId }: { projectId: string }) {
  const { data: members } = useProjectMembers(projectId);

  return (
    <div>
      {members?.map(member => (
        <div key={member.id}>
          {member.user?.full_name} - {member.role}
        </div>
      ))}
    </div>
  );
}
```

#### useProjectStats

Fetch project statistics.

```typescript
import { useProjectStats } from '@/hooks';

function ProjectStats({ projectId }: { projectId: string }) {
  const { data: stats } = useProjectStats(projectId);

  return (
    <div>
      <div>Workspaces: {stats?.workspace_count}</div>
      <div>Datasets: {stats?.dataset_count}</div>
      <div>Members: {stats?.member_count}</div>
    </div>
  );
}
```

#### useSearchProjects

Search projects by name or description.

```typescript
import { useState } from 'react';
import { useSearchProjects } from '@/hooks';

function ProjectSearch({ accountId }: { accountId: string }) {
  const [query, setQuery] = useState('');
  const { data: results } = useSearchProjects(query, accountId);

  return (
    <div>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search projects..."
      />
      {results?.map(project => (
        <div key={project.id}>{project.name}</div>
      ))}
    </div>
  );
}
```

### Mutation Hooks

#### useCreateProject

Create a new project.

```typescript
import { useCreateProject } from '@/hooks';
import { ProjectType } from '@/types';

function CreateProjectForm({ accountId, userId }: Props) {
  const createProject = useCreateProject({
    onSuccess: (project) => {
      console.log('Created:', project.name);
      navigate(`/projects/${project.id}`);
    },
    onError: (error) => {
      console.error('Failed:', error.message);
    }
  });

  const handleSubmit = () => {
    createProject.mutate({
      input: {
        account_id: accountId,
        name: 'My Project',
        project_type: ProjectType.Standard,
        description: 'Description here'
      },
      userId
    });
  };

  return (
    <button
      onClick={handleSubmit}
      disabled={createProject.isPending}
    >
      {createProject.isPending ? 'Creating...' : 'Create Project'}
    </button>
  );
}
```

#### useUpdateProject

Update an existing project.

```typescript
import { useUpdateProject } from '@/hooks';

function EditProjectForm({ projectId }: { projectId: string }) {
  const updateProject = useUpdateProject({
    onSuccess: () => {
      console.log('Project updated');
    }
  });

  const handleSubmit = (updates: UpdateProjectInput) => {
    updateProject.mutate({
      projectId,
      input: updates
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={updateProject.isPending}>
        Save Changes
      </button>
    </form>
  );
}
```

#### useDeleteProject

Delete a project.

```typescript
import { useDeleteProject } from '@/hooks';

function DeleteProjectButton({ projectId }: { projectId: string }) {
  const deleteProject = useDeleteProject({
    onSuccess: () => {
      navigate('/projects');
    }
  });

  const handleDelete = () => {
    if (confirm('Are you sure?')) {
      deleteProject.mutate(projectId);
    }
  };

  return (
    <button onClick={handleDelete} disabled={deleteProject.isPending}>
      Delete Project
    </button>
  );
}
```

#### useAddProjectMember

Add a member to a project.

```typescript
import { useAddProjectMember } from '@/hooks';
import { ProjectRole } from '@/types';

function AddMemberForm({ projectId, currentUserId }: Props) {
  const addMember = useAddProjectMember({
    onSuccess: () => {
      console.log('Member added');
    }
  });

  const handleAdd = (userId: string, role: ProjectRole) => {
    addMember.mutate({
      projectId,
      userId,
      role,
      invitedBy: currentUserId
    });
  };

  return (
    <button onClick={() => handleAdd('user-uuid', ProjectRole.Editor)}>
      Add Member
    </button>
  );
}
```

#### useUpdateProjectMemberRole

Update a member's role.

```typescript
import { useUpdateProjectMemberRole } from '@/hooks';

function MemberRoleSelector({ projectId, userId, currentRole }: Props) {
  const updateRole = useUpdateProjectMemberRole();

  const handleChange = (newRole: ProjectRole) => {
    updateRole.mutate({
      projectId,
      userId,
      newRole
    });
  };

  return (
    <select value={currentRole} onChange={(e) => handleChange(e.target.value as ProjectRole)}>
      <option value="owner">Owner</option>
      <option value="admin">Admin</option>
      <option value="editor">Editor</option>
      <option value="viewer">Viewer</option>
    </select>
  );
}
```

#### useRemoveProjectMember

Remove a member from a project.

```typescript
import { useRemoveProjectMember } from '@/hooks';

function RemoveMemberButton({ projectId, userId }: Props) {
  const removeMember = useRemoveProjectMember();

  const handleRemove = () => {
    if (confirm('Remove this member?')) {
      removeMember.mutate({ projectId, userId });
    }
  };

  return (
    <button onClick={handleRemove}>Remove</button>
  );
}
```

### Permission Hooks

#### useCanEditProject

Check if user can edit project.

```typescript
import { useCanEditProject } from '@/hooks';

function EditButton({ projectId, userId }: Props) {
  const { data: canEdit } = useCanEditProject(projectId, userId);

  if (!canEdit) return null;

  return <button>Edit Project</button>;
}
```

#### useCanDeleteProject

Check if user can delete project.

```typescript
import { useCanDeleteProject } from '@/hooks';

function DeleteButton({ projectId, userId }: Props) {
  const { data: canDelete } = useCanDeleteProject(projectId, userId);

  if (!canDelete) return null;

  return <button>Delete Project</button>;
}
```

#### useCanManageProjectMembers

Check if user can manage members.

```typescript
import { useCanManageProjectMembers } from '@/hooks';

function MembersPanel({ projectId, userId }: Props) {
  const { data: canManage } = useCanManageProjectMembers(projectId, userId);

  return (
    <div>
      <MembersList />
      {canManage && <AddMemberButton />}
    </div>
  );
}
```

---

## Workspace Hooks

**File**: `frontend/src/hooks/useWorkspaces.ts`

### Query Hooks

#### useWorkspaces

Fetch paginated list of workspaces.

```typescript
import { useWorkspaces } from '@/hooks';

function WorkspacesList({ projectId }: { projectId: string }) {
  const { data, isLoading } = useWorkspaces({
    project_id: projectId,
    source_control_status: 'connected',
    page: 1,
    limit: 20
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {data?.data.map(workspace => (
        <div key={workspace.id}>{workspace.name}</div>
      ))}
    </div>
  );
}
```

#### useWorkspace

Fetch a single workspace.

```typescript
import { useWorkspace } from '@/hooks';

function WorkspaceDetail({ workspaceId }: { workspaceId: string }) {
  const { data: workspace } = useWorkspace(workspaceId);

  return (
    <div>
      <h1>{workspace?.name}</h1>
      <p>Datasets: {workspace?.dataset_count}</p>
      <p>Status: {workspace?.source_control_connection_status}</p>
    </div>
  );
}
```

#### useWorkspaceMembers

Fetch workspace members.

```typescript
import { useWorkspaceMembers } from '@/hooks';

function WorkspaceMembers({ workspaceId }: { workspaceId: string }) {
  const { data: members } = useWorkspaceMembers(workspaceId);

  return (
    <div>
      {members?.map(member => (
        <div key={member.id}>
          {member.user?.full_name} - {member.role}
        </div>
      ))}
    </div>
  );
}
```

#### useWorkspaceSettings

Fetch workspace settings.

```typescript
import { useWorkspaceSettings } from '@/hooks';

function WorkspaceSettings({ workspaceId }: { workspaceId: string }) {
  const { data: settings } = useWorkspaceSettings(workspaceId);

  return (
    <div>
      <div>Auto-sync: {settings?.auto_sync_enabled ? 'Enabled' : 'Disabled'}</div>
      <div>Sync interval: {settings?.sync_interval_minutes} minutes</div>
    </div>
  );
}
```

#### useWorkspaceStats

Fetch workspace statistics.

```typescript
import { useWorkspaceStats } from '@/hooks';

function WorkspaceStats({ workspaceId }: { workspaceId: string }) {
  const { data: stats } = useWorkspaceStats(workspaceId);

  return (
    <div>
      <div>Datasets: {stats?.dataset_count}</div>
      <div>Members: {stats?.member_count}</div>
      <div>Synced: {stats?.is_synced ? 'Yes' : 'No'}</div>
    </div>
  );
}
```

### Mutation Hooks

Similar to project hooks, workspace hooks provide:
- `useCreateWorkspace`
- `useUpdateWorkspace`
- `useDeleteWorkspace`
- `useAddWorkspaceMember`
- `useUpdateWorkspaceMemberRole`
- `useRemoveWorkspaceMember`
- `useUpdateWorkspaceSettings`

Permission hooks:
- `useCanEditWorkspace`
- `useCanDeleteWorkspace`
- `useCanManageWorkspaceMembers`

---

## Source Control Hooks

**File**: `frontend/src/hooks/useSourceControl.ts`

### Query Hooks

#### useSourceControlStatus

Get connection status with auto-refresh.

```typescript
import { useSourceControlStatus } from '@/hooks';

function SourceControlStatus({ workspaceId }: { workspaceId: string }) {
  const { data: status } = useSourceControlStatus(workspaceId);

  return (
    <div className={`status-${status}`}>
      Status: {status}
    </div>
  );
}
```

#### useRepositories

List available repositories.

```typescript
import { useRepositories } from '@/hooks';
import { SourceControlProvider } from '@/types';

function RepositorySelector({ credentials }: Props) {
  const { data: repos } = useRepositories(
    SourceControlProvider.GitHub,
    credentials,
    { limit: 20 }
  );

  return (
    <select>
      {repos?.map(repo => (
        <option key={repo.id} value={repo.url}>
          {repo.full_name}
        </option>
      ))}
    </select>
  );
}
```

#### useBranches

List branches.

```typescript
import { useBranches } from '@/hooks';

function BranchSelector({ workspaceId }: { workspaceId: string }) {
  const { data: branches } = useBranches(workspaceId);

  return (
    <select>
      {branches?.map(branch => (
        <option key={branch.name} value={branch.name}>
          {branch.name}
        </option>
      ))}
    </select>
  );
}
```

#### useUncommittedChanges

Get uncommitted changes with auto-refresh.

```typescript
import { useUncommittedChanges } from '@/hooks';

function UncommittedChangesBadge({ workspaceId }: { workspaceId: string }) {
  const { data: changes } = useUncommittedChanges(workspaceId);

  if (!changes || changes.length === 0) return null;

  return (
    <span className="badge">
      {changes.length} uncommitted changes
    </span>
  );
}
```

#### useCommitHistory

Get commit history.

```typescript
import { useCommitHistory } from '@/hooks';

function CommitHistory({ workspaceId }: { workspaceId: string }) {
  const { data: commits } = useCommitHistory(workspaceId, 20);

  return (
    <div>
      {commits?.map(commit => (
        <div key={commit.sha}>
          <strong>{commit.sha.substring(0, 7)}</strong>
          <p>{commit.message}</p>
          <small>{commit.author} - {commit.committed_at}</small>
        </div>
      ))}
    </div>
  );
}
```

### Mutation Hooks

#### useConnect

Connect to source control.

```typescript
import { useConnect } from '@/hooks';
import { SourceControlProvider } from '@/types';

function ConnectButton({ workspaceId }: { workspaceId: string }) {
  const connect = useConnect({
    onSuccess: (result) => {
      if (result.success) {
        console.log('Connected:', result.message);
      }
    }
  });

  const handleConnect = () => {
    connect.mutate({
      workspaceId,
      config: {
        provider: SourceControlProvider.GitHub,
        credentials: {
          provider: SourceControlProvider.GitHub,
          access_token: 'ghp_xxxxx'
        },
        repo_url: 'https://github.com/owner/repo',
        branch: 'main'
      }
    });
  };

  return (
    <button onClick={handleConnect} disabled={connect.isPending}>
      {connect.isPending ? 'Connecting...' : 'Connect'}
    </button>
  );
}
```

#### useCommit

Commit changes.

```typescript
import { useCommit } from '@/hooks';

function CommitButton({ workspaceId, datasetIds }: Props) {
  const commit = useCommit({
    onSuccess: (result) => {
      if (result.success) {
        console.log('Committed:', result.commit_sha);
      }
    }
  });

  const handleCommit = (message: string) => {
    commit.mutate({
      workspace_id: workspaceId,
      message,
      dataset_ids: datasetIds
    });
  };

  return (
    <button onClick={() => handleCommit('Update datasets')}>
      Commit Changes
    </button>
  );
}
```

#### useSync

Sync (pull) changes.

```typescript
import { useSync } from '@/hooks';
import { ConflictResolutionStrategy } from '@/types';

function SyncButton({ workspaceId }: { workspaceId: string }) {
  const sync = useSync({
    onSuccess: (result) => {
      console.log(`Synced: +${result.datasets_added} ~${result.datasets_updated}`);
    }
  });

  const handleSync = () => {
    sync.mutate({
      workspace_id: workspaceId,
      conflict_resolution_strategy: ConflictResolutionStrategy.Manual
    });
  };

  return (
    <button onClick={handleSync} disabled={sync.isPending}>
      {sync.isPending ? 'Syncing...' : 'Sync'}
    </button>
  );
}
```

#### Other Mutation Hooks

- `useDisconnect` - Disconnect from source control
- `useTestConnection` - Test connection
- `useCreateRepository` - Create new repository
- `useInitializeRepositoryStructure` - Initialize folder structure
- `useCreateBranch` - Create new branch
- `useResolveConflict` - Resolve conflict

### Utility Hooks

#### useAutoRefreshSourceControlStatus

Auto-refresh status every 30 seconds.

```typescript
import { useAutoRefreshSourceControlStatus } from '@/hooks';

function WorkspaceHeader({ workspaceId }: { workspaceId: string }) {
  const { data: status } = useAutoRefreshSourceControlStatus(workspaceId, true);

  return <div>Status: {status}</div>;
}
```

#### useHasUncommittedChanges

Check if has uncommitted changes.

```typescript
import { useHasUncommittedChanges } from '@/hooks';

function CommitButton({ workspaceId }: { workspaceId: string }) {
  const hasChanges = useHasUncommittedChanges(workspaceId);

  return (
    <button disabled={!hasChanges}>
      Commit Changes
    </button>
  );
}
```

#### useUncommittedChangesCount

Get count of uncommitted changes.

```typescript
import { useUncommittedChangesCount } from '@/hooks';

function ChangesBadge({ workspaceId }: { workspaceId: string }) {
  const count = useUncommittedChangesCount(workspaceId);

  if (count === 0) return null;

  return <span className="badge">{count}</span>;
}
```

---

## Best Practices

### 1. Enable Queries Conditionally

```typescript
// ✅ Good: Only fetch when ID exists
const { data } = useProject(projectId, {
  enabled: !!projectId
});

// ❌ Bad: Always fetches
const { data } = useProject(projectId);
```

### 2. Handle Loading and Error States

```typescript
// ✅ Good: Handle all states
const { data, isLoading, error } = useProject(projectId);

if (isLoading) return <Spinner />;
if (error) return <ErrorMessage error={error} />;
if (!data) return null;

return <ProjectView project={data} />;
```

### 3. Use Optimistic Updates for Better UX

```typescript
// ✅ Good: Optimistic update (already implemented in hooks)
const updateProject = useUpdateProject();
updateProject.mutate({ projectId, input: updates });
// UI updates immediately, rolls back on error
```

### 4. Provide Feedback During Mutations

```typescript
// ✅ Good: Show loading state
const deleteProject = useDeleteProject({
  onSuccess: () => toast.success('Project deleted'),
  onError: (error) => toast.error(error.message)
});

<button disabled={deleteProject.isPending}>
  {deleteProject.isPending ? 'Deleting...' : 'Delete'}
</button>
```

### 5. Invalidate Related Queries

```typescript
// ✅ Good: Hooks already invalidate related queries
// No manual invalidation needed!
```

### 6. Use staleTime Appropriately

```typescript
// Frequent updates: short stale time
const { data } = useUncommittedChanges(workspaceId); // 10 seconds

// Infrequent updates: longer stale time
const { data } = useProjectStats(projectId); // 60 seconds
```

---

## Performance Tips

### 1. Prefetch Data

```typescript
import { prefetchProjectData, queryClient } from '@/lib/react-query-client';

// Prefetch on hover
<Link
  to={`/projects/${projectId}`}
  onMouseEnter={() => prefetchProjectData(queryClient, projectId)}
>
  View Project
</Link>
```

### 2. Use Pagination

```typescript
// ✅ Good: Paginated
const { data } = useProjects({ page: 1, limit: 20 });

// ❌ Bad: Load all
const { data } = useProjects(); // Could load thousands
```

### 3. Debounce Search Queries

```typescript
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

const [query, setQuery] = useState('');
const debouncedQuery = useDebouncedValue(query, 300);
const { data } = useSearchProjects(debouncedQuery, accountId);
```

---

## Testing

### Unit Tests

```typescript
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useProjects } from '@/hooks';

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient()}>
    {children}
  </QueryClientProvider>
);

test('useProjects fetches projects', async () => {
  const { result } = renderHook(() => useProjects({ account_id: 'test' }), { wrapper });

  await waitFor(() => expect(result.current.isSuccess).toBe(true));

  expect(result.current.data).toBeDefined();
});
```

---

## Files

- `frontend/src/hooks/useProjects.ts` - Project hooks
- `frontend/src/hooks/useWorkspaces.ts` - Workspace hooks
- `frontend/src/hooks/useSourceControl.ts` - Source control hooks
- `frontend/src/hooks/index.ts` - Hook exports
- `frontend/src/lib/react-query-client.ts` - Query client configuration

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-14 | Initial React Query hooks documentation | Claude Code |

---

## Related Documentation

- [Service Layer Documentation](./SERVICE-LAYER.md)
- [TypeScript Types Documentation](./TYPESCRIPT-TYPES.md)
- [Source Control Providers Documentation](./SOURCE-CONTROL-PROVIDERS.md)

---

**Status**: ✅ Phase 5 (React Query Hooks) COMPLETE
