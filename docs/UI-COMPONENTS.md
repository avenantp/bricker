# UI Components Documentation

This document provides comprehensive documentation for all React UI components created for the Projects and Workspaces management system.

## Table of Contents

- [Overview](#overview)
- [Project Components](#project-components)
  - [ProjectsPage](#projectspage)
  - [ProjectCard](#projectcard)
  - [CreateProjectDialog](#createprojectdialog)
  - [DeleteProjectDialog](#deleteprojectdialog)
- [Workspace Components](#workspace-components)
  - [WorkspacesPage](#workspacespage)
  - [WorkspaceCard](#workspacecard)
  - [CreateWorkspaceDialog](#createworkspacedialog)
  - [DeleteWorkspaceDialog](#deleteworkspacedialog)
- [Source Control Components](#source-control-components)
  - [SourceControlConnectionDialog](#sourcecontrolconnectiondialog)
  - [SourceControlStatusPanel](#sourcecontrolstatuspanel)
- [Design Patterns](#design-patterns)
- [Usage Examples](#usage-examples)

---

## Overview

All UI components follow these design principles:

- **React Query Integration**: All data fetching and mutations use React Query hooks
- **TypeScript**: Fully typed with strict TypeScript
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Responsive Design**: Mobile-friendly layouts
- **Accessibility**: ARIA labels and keyboard navigation
- **Loading States**: Skeleton loaders and spinners
- **Error Handling**: User-friendly error messages
- **Optimistic Updates**: Immediate UI feedback for mutations

---

## Project Components

### ProjectsPage

**Location**: `frontend/src/pages/ProjectsPage.tsx`

Full-featured projects listing page with advanced filtering, search, pagination, and view modes.

#### Features

- **Search**: Real-time project name and description search
- **Filters**:
  - Project type (Standard, DataVault, Dimensional)
  - Visibility (private, team, organization)
  - Sort by (name, created_at, updated_at)
- **View Modes**: Grid and list views (persisted in localStorage)
- **Pagination**: Client-side pagination with page numbers
- **Loading States**: Animated skeleton loaders
- **Empty States**: Contextual empty states based on filters

#### Props

None (standalone page component)

#### State

```typescript
const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
const [search, setSearch] = useState('');
const [projectType, setProjectType] = useState<ProjectType | 'all'>('all');
const [visibility, setVisibility] = useState<ProjectVisibility | 'all'>('all');
const [sortBy, setSortBy] = useState<'name' | 'created_at' | 'updated_at'>('updated_at');
const [page, setPage] = useState(1);
```

#### React Query Hooks

```typescript
const { data, isLoading, error, refetch } = useProjects({
  account_id: accountId,
  project_type: projectType !== 'all' ? projectType : undefined,
  visibility: visibility !== 'all' ? visibility : undefined,
  search: search || undefined,
  sort_by: sortBy,
  sort_order: 'desc',
  page,
  limit: 20
});
```

#### Usage

```tsx
import { ProjectsPage } from '@/pages/ProjectsPage';

// In your router
<Route path="/projects" element={<ProjectsPage />} />
```

---

### ProjectCard

**Location**: `frontend/src/components/Project/ProjectCard.tsx`

Reusable card component for displaying project information in grid or list format.

#### Features

- **Dual View Modes**: Adapts layout for grid or list display
- **Action Menu**: Dropdown menu with Open, Duplicate, Settings, Delete
- **Project Stats**: Member count, workspace count
- **Type Badges**: Visual indicators for project type and visibility
- **Owner Information**: Displays project owner name
- **Timestamps**: Relative time formatting (e.g., "2 days ago")

#### Props

```typescript
interface ProjectCardProps {
  project: ProjectWithDetails;
  viewMode?: 'grid' | 'list';
  onOpen?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onSettings?: () => void;
}
```

#### Usage

```tsx
<ProjectCard
  project={project}
  viewMode="grid"
  onOpen={() => navigate(`/projects/${project.id}`)}
  onDuplicate={() => handleDuplicate(project.id, project.name)}
  onDelete={() => handleDelete(project.id)}
  onSettings={() => navigate(`/projects/${project.id}/settings`)}
/>
```

---

### CreateProjectDialog

**Location**: `frontend/src/components/Project/CreateProjectDialog.tsx`

Modal dialog for creating new projects with validation and error handling.

#### Features

- **Form Validation**: Required fields and client-side validation
- **Project Type Selection**: Visual buttons for Standard, DataVault, Dimensional
- **Visibility Selection**: Private, team, or organization
- **Error Handling**: Displays mutation errors with AlertCircle icon
- **Loading States**: Disabled inputs and loading button during submission
- **Auto-focus**: Name input auto-focused on mount

#### Props

```typescript
interface CreateProjectDialogProps {
  accountId: string;
  onClose: () => void;
  onSuccess?: () => void;
}
```

#### React Query Hooks

```typescript
const createProjectMutation = useCreateProject({
  onSuccess: () => {
    onSuccess?.();
  },
  onError: (error) => {
    console.error('Failed to create project:', error);
  }
});
```

#### Usage

```tsx
{showCreateDialog && (
  <CreateProjectDialog
    accountId={accountId}
    onClose={() => setShowCreateDialog(false)}
    onSuccess={() => {
      setShowCreateDialog(false);
      refetch();
    }}
  />
)}
```

---

### DeleteProjectDialog

**Location**: `frontend/src/components/Project/DeleteProjectDialog.tsx`

Confirmation dialog for deleting projects with cascade warnings.

#### Features

- **Cascade Warnings**: Lists what will be deleted (workspaces, datasets, etc.)
- **Confirmation Required**: User must check a confirmation checkbox
- **Error Handling**: Displays deletion errors
- **Disabled State**: All inputs disabled during deletion
- **Irreversible Warning**: Clear messaging about permanent deletion

#### Props

```typescript
interface DeleteProjectDialogProps {
  projectId: string;
  onClose: () => void;
  onSuccess?: () => void;
}
```

#### React Query Hooks

```typescript
const deleteProjectMutation = useDeleteProject({
  onSuccess: () => {
    onSuccess?.();
  },
  onError: (error) => {
    console.error('Failed to delete project:', error);
  }
});
```

#### Usage

```tsx
{projectToDelete && (
  <DeleteProjectDialog
    projectId={projectToDelete}
    onClose={() => setProjectToDelete(null)}
    onSuccess={() => {
      setProjectToDelete(null);
      refetch();
    }}
  />
)}
```

---

## Workspace Components

### WorkspacesPage

**Location**: `frontend/src/pages/WorkspacesPage.tsx`

Workspaces listing page with project context and navigation.

#### Features

- **Project Context**: Displays parent project name
- **Breadcrumb Navigation**: Back to projects link
- **Search and Filters**: Similar to ProjectsPage
- **View Modes**: Grid and list views
- **Pagination**: Full pagination support
- **Loading/Error/Empty States**: Comprehensive state handling

#### Props

Uses `useParams` to get `projectId` from URL

#### React Query Hooks

```typescript
const { data: project } = useProject(projectId || '', {
  enabled: !!projectId
});

const { data, isLoading, error, refetch } = useWorkspaces({
  project_id: projectId,
  search: search || undefined,
  sort_by: sortBy,
  sort_order: 'desc',
  page,
  limit: 20
});
```

#### Usage

```tsx
import { WorkspacesPage } from '@/pages/WorkspacesPage';

// In your router
<Route path="/projects/:projectId/workspaces" element={<WorkspacesPage />} />
```

---

### WorkspaceCard

**Location**: `frontend/src/components/Workspace/WorkspaceCard.tsx`

Card component for displaying workspace information with source control status.

#### Features

- **Dual View Modes**: Grid and list layouts
- **Source Control Status**: Visual indicators for connection status
  - Connected (green checkmark)
  - Syncing (blue spinner)
  - Conflict (yellow warning)
  - Error (red X)
  - Not connected (gray X)
- **Workspace Stats**: Member count, dataset count
- **Sync Information**: Last synced timestamp
- **Action Menu**: Open, Settings, Delete

#### Props

```typescript
interface WorkspaceCardProps {
  workspace: WorkspaceWithDetails;
  viewMode?: 'grid' | 'list';
  onOpen?: () => void;
  onDelete?: () => void;
  onSettings?: () => void;
}
```

#### Usage

```tsx
<WorkspaceCard
  workspace={workspace}
  viewMode="grid"
  onOpen={() => navigate(`/workspaces/${workspace.id}`)}
  onDelete={() => handleDelete(workspace.id)}
  onSettings={() => navigate(`/workspaces/${workspace.id}/settings`)}
/>
```

---

### CreateWorkspaceDialog

**Location**: `frontend/src/components/Workspace/CreateWorkspaceDialog.tsx`

Modal dialog for creating new workspaces within a project.

#### Features

- **Simple Form**: Name and description fields
- **Workspace Info Box**: Educational content about workspaces
- **Auto-focus**: Name input focused on mount
- **Form Validation**: Required fields
- **Error Handling**: Mutation error display

#### Props

```typescript
interface CreateWorkspaceDialogProps {
  projectId: string;
  onClose: () => void;
  onSuccess?: () => void;
}
```

#### React Query Hooks

```typescript
const createWorkspaceMutation = useCreateWorkspace({
  onSuccess: () => {
    onSuccess?.();
  },
  onError: (error) => {
    console.error('Failed to create workspace:', error);
  }
});
```

#### Usage

```tsx
{showCreateDialog && projectId && (
  <CreateWorkspaceDialog
    projectId={projectId}
    onClose={() => setShowCreateDialog(false)}
    onSuccess={() => {
      setShowCreateDialog(false);
      refetch();
    }}
  />
)}
```

---

### DeleteWorkspaceDialog

**Location**: `frontend/src/components/Workspace/DeleteWorkspaceDialog.tsx`

Confirmation dialog for deleting workspaces.

#### Features

- **Cascade Warnings**: Lists all data that will be deleted
- **Confirmation Checkbox**: Required before deletion
- **Source Control Warning**: Notes that source control connection will be removed
- **Error Handling**: Displays deletion errors

#### Props

```typescript
interface DeleteWorkspaceDialogProps {
  workspaceId: string;
  onClose: () => void;
  onSuccess?: () => void;
}
```

#### Usage

```tsx
{workspaceToDelete && (
  <DeleteWorkspaceDialog
    workspaceId={workspaceToDelete}
    onClose={() => setWorkspaceToDelete(null)}
    onSuccess={() => {
      setWorkspaceToDelete(null);
      refetch();
    }}
  />
)}
```

---

## Source Control Components

### SourceControlConnectionDialog

**Location**: `frontend/src/components/SourceControl/SourceControlConnectionDialog.tsx`

Modal dialog for connecting a workspace to source control (GitHub, GitLab, Bitbucket, Azure DevOps).

#### Features

- **Provider Selection**: Visual buttons for 4 providers
  - GitHub
  - GitLab
  - Bitbucket
  - Azure DevOps
- **Repository Configuration**: URL, branch, access token
- **Test Connection**: Validates credentials before connecting
- **Connection Status**: Success/failure feedback with icons
- **Security Info**: Notes about token encryption
- **Help Text**: Instructions for creating access tokens

#### Props

```typescript
interface SourceControlConnectionDialogProps {
  workspaceId: string;
  onClose: () => void;
  onSuccess?: () => void;
}
```

#### React Query Hooks

```typescript
const connectMutation = useConnect({
  onSuccess: () => {
    onSuccess?.();
  },
  onError: (error) => {
    console.error('Failed to connect:', error);
  }
});

const testConnectionMutation = useTestConnection({
  onSuccess: (result) => {
    setTestResult(result);
  },
  onError: () => {
    setTestResult({
      success: false,
      message: 'Failed to test connection. Please check your credentials.'
    });
  }
});
```

#### Usage

```tsx
{showConnectionDialog && (
  <SourceControlConnectionDialog
    workspaceId={workspaceId}
    onClose={() => setShowConnectionDialog(false)}
    onSuccess={() => {
      setShowConnectionDialog(false);
      refetch();
    }}
  />
)}
```

---

### SourceControlStatusPanel

**Location**: `frontend/src/components/SourceControl/SourceControlStatusPanel.tsx`

Panel component displaying source control status, uncommitted changes, and recent commits.

#### Features

- **Connection Status Display**:
  - Connected (green)
  - Syncing (blue with spinner)
  - Conflict (yellow)
  - Error (red)
  - Not connected (gray with connect button)
- **Uncommitted Changes List**: Shows up to 5 changes with type badges (added, modified, deleted)
- **Recent Commits**: Displays last 5 commits with author and date
- **Quick Actions**:
  - Sync button (with loading spinner)
  - Settings button
  - Commit button (when changes present)
- **Disconnect Confirmation**: Modal for disconnecting repository
- **Auto-refresh**: Status and changes refresh every 30 seconds

#### Props

```typescript
interface SourceControlStatusPanelProps {
  workspaceId: string;
  onConnect?: () => void;
  onCommit?: () => void;
  onViewHistory?: () => void;
}
```

#### React Query Hooks

```typescript
const { data: status, isLoading: statusLoading } = useSourceControlStatus(workspaceId);
const { data: uncommittedChanges, isLoading: changesLoading } = useUncommittedChanges(workspaceId);
const { data: commitHistory, isLoading: historyLoading } = useCommitHistory(workspaceId, 5);

const syncMutation = useSync({
  onSuccess: (result) => {
    console.log('Sync successful:', result);
  },
  onError: (error) => {
    console.error('Sync failed:', error);
  },
});

const disconnectMutation = useDisconnect({
  onSuccess: () => {
    setShowDisconnectConfirm(false);
  },
  onError: (error) => {
    console.error('Disconnect failed:', error);
  },
});
```

#### Usage

```tsx
<SourceControlStatusPanel
  workspaceId={workspaceId}
  onConnect={() => setShowConnectionDialog(true)}
  onCommit={() => setShowCommitDialog(true)}
  onViewHistory={() => navigate(`/workspaces/${workspaceId}/history`)}
/>
```

---

## Design Patterns

### 1. React Query Integration

All components use React Query hooks for data fetching and mutations:

```typescript
// Query
const { data, isLoading, error, refetch } = useProjects(params);

// Mutation
const mutation = useCreateProject({
  onSuccess: () => {
    // Handle success
  },
  onError: (error) => {
    // Handle error
  }
});
```

### 2. Loading States

Components implement three types of loading states:

**Skeleton Loaders** (for initial load):
```tsx
<div className="animate-pulse">
  <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
</div>
```

**Spinners** (for actions):
```tsx
{isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
```

**Button Loading States**:
```tsx
<button disabled={isPending}>
  {isPending ? 'Creating...' : 'Create Project'}
</button>
```

### 3. Error Handling

Consistent error display across components:

```tsx
{isError && (
  <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
    <div>
      <p className="text-sm font-medium text-red-800">Error Title</p>
      <p className="text-sm text-red-600 mt-1">{error?.message}</p>
    </div>
  </div>
)}
```

### 4. Empty States

Contextual empty states with actions:

```tsx
{data.length === 0 && (
  <div className="flex flex-col items-center justify-center py-12">
    <div className="text-center">
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {hasFilters ? 'No results found' : 'Get started'}
      </h3>
      <p className="text-sm text-gray-500 mb-6">
        {hasFilters ? 'Try adjusting your filters' : 'Create your first item'}
      </p>
      {!hasFilters && (
        <button onClick={handleCreate}>Create Now</button>
      )}
    </div>
  </div>
)}
```

### 5. Modal Dialogs

All dialogs follow the same structure:

```tsx
<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
  <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full">
    {/* Header */}
    <div className="flex items-center justify-between p-6 border-b">
      <h2>Title</h2>
      <button onClick={onClose}><X /></button>
    </div>

    {/* Content */}
    <div className="p-6">
      {/* Form or content */}
    </div>

    {/* Actions */}
    <div className="flex items-center justify-end gap-3 p-6 border-t">
      <button onClick={onClose}>Cancel</button>
      <button onClick={handleSubmit}>Submit</button>
    </div>
  </div>
</div>
```

### 6. View Mode Persistence

Grid/list view preferences are persisted:

```typescript
const [viewMode, setViewMode] = useState<ViewMode>(() => {
  const saved = localStorage.getItem('projectsViewMode');
  return (saved === 'grid' || saved === 'list') ? saved : 'grid';
});

const handleViewModeChange = (mode: ViewMode) => {
  setViewMode(mode);
  localStorage.setItem('projectsViewMode', mode);
};
```

---

## Usage Examples

### Complete Projects Flow

```tsx
import { ProjectsPage } from '@/pages/ProjectsPage';
import { ProjectCard } from '@/components/Project/ProjectCard';
import { CreateProjectDialog } from '@/components/Project/CreateProjectDialog';
import { DeleteProjectDialog } from '@/components/Project/DeleteProjectDialog';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/projects" element={<ProjectsPage />} />
        <Route path="/projects/:projectId" element={<ProjectDetailPage />} />
        <Route path="/projects/:projectId/settings" element={<ProjectSettingsPage />} />
      </Routes>
    </Router>
  );
}
```

### Complete Workspaces Flow

```tsx
import { WorkspacesPage } from '@/pages/WorkspacesPage';
import { WorkspaceCard } from '@/components/Workspace/WorkspaceCard';
import { CreateWorkspaceDialog } from '@/components/Workspace/CreateWorkspaceDialog';
import { DeleteWorkspaceDialog } from '@/components/Workspace/DeleteWorkspaceDialog';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/projects/:projectId/workspaces" element={<WorkspacesPage />} />
        <Route path="/workspaces/:workspaceId" element={<WorkspaceDetailPage />} />
        <Route path="/workspaces/:workspaceId/settings" element={<WorkspaceSettingsPage />} />
      </Routes>
    </Router>
  );
}
```

### Source Control Integration

```tsx
import { SourceControlStatusPanel } from '@/components/SourceControl/SourceControlStatusPanel';
import { SourceControlConnectionDialog } from '@/components/SourceControl/SourceControlConnectionDialog';

function WorkspaceDetailPage() {
  const { workspaceId } = useParams();
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);

  return (
    <div>
      <h1>Workspace Details</h1>

      <SourceControlStatusPanel
        workspaceId={workspaceId}
        onConnect={() => setShowConnectionDialog(true)}
      />

      {showConnectionDialog && (
        <SourceControlConnectionDialog
          workspaceId={workspaceId}
          onClose={() => setShowConnectionDialog(false)}
          onSuccess={() => {
            setShowConnectionDialog(false);
            // Refresh data
          }}
        />
      )}
    </div>
  );
}
```

---

## Best Practices

1. **Always use React Query hooks** - Never fetch data directly in components
2. **Handle all states** - Loading, error, empty, and success states
3. **Provide user feedback** - Show loading spinners and success/error messages
4. **Validate forms** - Client-side validation before submission
5. **Disable during mutations** - Disable buttons and inputs during API calls
6. **Clean up state** - Reset form state after successful submissions
7. **Use TypeScript strictly** - No `any` types, always define interfaces
8. **Implement accessibility** - ARIA labels, keyboard navigation, focus management
9. **Test error scenarios** - Handle network errors, validation errors, etc.
10. **Keep components focused** - Single responsibility, small and reusable

---

## Component Dependencies

```
ProjectsPage
  ├── ProjectCard
  ├── CreateProjectDialog
  └── DeleteProjectDialog

WorkspacesPage
  ├── WorkspaceCard
  ├── CreateWorkspaceDialog
  └── DeleteWorkspaceDialog

WorkspaceDetailPage (future)
  └── SourceControlStatusPanel
      ├── SourceControlConnectionDialog
      └── CommitDialog (future)
```

---

## Future Enhancements

- **CommitDialog**: Dialog for committing changes with message
- **SyncDialog**: Advanced sync options dialog
- **ConflictResolutionDialog**: UI for resolving merge conflicts
- **CommitHistoryPanel**: Full commit history with diff viewer
- **ProjectSettingsDialog**: Edit project settings
- **WorkspaceSettingsDialog**: Edit workspace settings
- **ProjectMembersTab**: Manage project members
- **WorkspaceMembersTab**: Manage workspace members
- **BulkActions**: Select and delete/archive multiple items
- **Advanced Filters**: More filter options and saved filter presets
- **Export/Import**: Export projects/workspaces to JSON/YAML

---

## Conclusion

This UI component library provides a complete, production-ready solution for managing Projects, Workspaces, and Source Control integration. All components follow React best practices, use TypeScript for type safety, integrate with React Query for data management, and provide excellent user experience with comprehensive loading, error, and empty states.
