# TypeScript Types Documentation

## Overview

This document provides comprehensive documentation for all TypeScript type definitions used in the Projects and Workspaces management system. These types ensure type safety, provide excellent IDE support, and serve as living documentation for the data structures.

## Location

All type definitions are located in: `frontend/src/types/`

## Type Files

1. **project.ts** - Project-related types
2. **workspace.ts** - Workspace-related types
3. **source-control.ts** - Source control integration types
4. **api.ts** - API response, pagination, and error types
5. **index.ts** - Central export for all types

---

## Project Types (`project.ts`)

### Enums

#### ProjectType
```typescript
enum ProjectType {
  Standard = 'Standard',
  DataVault = 'DataVault',
  Dimensional = 'Dimensional'
}
```
Defines the type of project structure.

#### ProjectVisibility
```typescript
enum ProjectVisibility {
  Public = 'public',      // Visible to all account members
  Private = 'private',    // Visible to owner and explicitly granted users
  Locked = 'locked'       // Read-only except for owner
}
```

#### ProjectRole
```typescript
enum ProjectRole {
  Owner = 'owner',      // Full control
  Admin = 'admin',      // Manage settings and members
  Editor = 'editor',    // Edit content
  Viewer = 'viewer'     // Read-only
}
```

### Core Interfaces

#### Project
```typescript
interface Project {
  id: string;
  account_id: string;
  name: string;
  description: string | null;
  project_type: ProjectType;
  configuration: ProjectConfiguration;
  owner_id: string;
  visibility: ProjectVisibility;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}
```
Matches the database `projects` table structure.

#### ProjectWithDetails
```typescript
interface ProjectWithDetails extends Project {
  owner?: {
    id: string;
    full_name: string;
    email: string;
  };
  workspace_count?: number;
  dataset_count?: number;
  user_role?: ProjectRole;
  member_count?: number;
}
```
Extended project with computed fields for UI display.

#### ProjectMember
```typescript
interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectRole;
  joined_at: string;
  invited_by: string | null;
  user?: {
    id: string;
    full_name: string;
    email: string;
    avatar_url?: string;
  };
}
```

### Configuration Types

#### ProjectConfiguration
```typescript
interface ProjectConfiguration {
  medallion_layers_enabled?: boolean;
  default_catalog?: string;
  default_schema?: string;
  data_vault_preferences?: DataVaultPreferences;
  dimensional_preferences?: DimensionalPreferences;
  naming_conventions?: NamingConventions;
  quality_rules?: QualityRules;
}
```

#### DataVaultPreferences
```typescript
interface DataVaultPreferences {
  hub_naming_pattern: string;
  satellite_naming_pattern: string;
  link_naming_pattern: string;
  hash_algorithm: 'SHA-256' | 'MD5' | 'SHA-1';
  include_load_date: boolean;
  include_record_source: boolean;
  multi_active_satellites: boolean;
  business_vault_enabled: boolean;
}
```

#### DimensionalPreferences
```typescript
interface DimensionalPreferences {
  dimension_naming_pattern: string;
  fact_naming_pattern: string;
  surrogate_key_strategy: 'hash' | 'sequence' | 'uuid';
  default_scd_type: 0 | 1 | 2 | 3 | 4 | 6;
  conformed_dimensions: boolean;
}
```

### Input Types

#### CreateProjectInput
```typescript
interface CreateProjectInput {
  name: string;
  description?: string;
  project_type: ProjectType;
  visibility?: ProjectVisibility;
  configuration?: ProjectConfiguration;
}
```

#### UpdateProjectInput
```typescript
interface UpdateProjectInput {
  name?: string;
  description?: string;
  visibility?: ProjectVisibility;
  configuration?: ProjectConfiguration;
  is_locked?: boolean;
}
```

### Helper Functions

- `canEditProject(role)` - Check if role can edit project
- `canDeleteProject(role)` - Check if role can delete project
- `canManageProjectMembers(role)` - Check if role can manage members
- `validateProjectName(name)` - Validate project name format

---

## Workspace Types (`workspace.ts`)

### Enums

#### WorkspaceVisibility
```typescript
enum WorkspaceVisibility {
  Public = 'public',
  Private = 'private',
  Locked = 'locked'
}
```

#### WorkspaceRole
```typescript
enum WorkspaceRole {
  Owner = 'owner',
  Admin = 'admin',
  Editor = 'editor',
  Viewer = 'viewer'
}
```

#### SourceControlConnectionStatus
```typescript
enum SourceControlConnectionStatus {
  NotConnected = 'not_connected',
  Connected = 'connected',
  Disconnected = 'disconnected',
  Error = 'error',
  Syncing = 'syncing',
  Conflict = 'conflict'
}
```

#### SourceControlSyncStatus
```typescript
enum SourceControlSyncStatus {
  Synced = 'synced',      // Local matches remote
  Ahead = 'ahead',        // Local has uncommitted changes
  Behind = 'behind',      // Remote has new commits
  Diverged = 'diverged'   // Both have changes
}
```

#### SourceControlProvider
```typescript
enum SourceControlProvider {
  GitHub = 'github',
  GitLab = 'gitlab',
  Bitbucket = 'bitbucket',
  Azure = 'azure',
  Other = 'other'
}
```

### Core Interfaces

#### Workspace
```typescript
interface Workspace {
  id: string;
  account_id: string;
  project_id: string;
  name: string;
  description: string | null;
  source_control_repo_url: string | null;
  source_control_branch: string | null;
  source_control_commit_sha: string | null;
  source_control_provider: SourceControlProvider | null;
  source_control_connection_status: SourceControlConnectionStatus | null;
  last_synced_at: string | null;
  is_synced: boolean;
  owner_id: string;
  visibility: WorkspaceVisibility;
  is_locked: boolean;
  settings: WorkspaceSettings;
  created_at: string;
  updated_at: string;
}
```

#### WorkspaceSettings
```typescript
interface WorkspaceSettings {
  auto_sync_enabled?: boolean;
  sync_interval_minutes?: number;
  conflict_resolution_strategy?: 'manual' | 'ours' | 'theirs';
  default_medallion_layer?: 'Bronze' | 'Silver' | 'Gold';
  canvas_settings?: CanvasSettings;
  diagram_settings?: DiagramSettings;
}
```

### Helper Functions

- `canEditWorkspace(role)` - Check if role can edit workspace
- `canDeleteWorkspace(role)` - Check if role can delete workspace
- `isSourceControlConnected(workspace)` - Check if source control is connected
- `getProviderDisplayName(provider)` - Get friendly provider name
- `getConnectionStatusColor(status)` - Get status badge color

---

## Source Control Types (`source-control.ts`)

### Credentials and Configuration

#### SourceControlCredentials
```typescript
interface SourceControlCredentials {
  provider: SourceControlProvider;
  access_token: string;
  refresh_token?: string;
  token_expires_at?: string;
  username?: string;
}
```

#### SourceControlConnectionConfig
```typescript
interface SourceControlConnectionConfig {
  provider: SourceControlProvider;
  credentials: SourceControlCredentials;
  repo_url: string;
  branch: string;
  create_if_not_exists?: boolean;
}
```

### Repository Types

#### Repository
```typescript
interface Repository {
  id: string;
  name: string;
  full_name: string;
  url: string;
  is_private: boolean;
  default_branch: string;
  created_at: string;
  updated_at: string;
}
```

#### Branch
```typescript
interface Branch {
  name: string;
  commit_sha: string;
  protected: boolean;
  url?: string;
}
```

#### Commit
```typescript
interface Commit {
  sha: string;
  message: string;
  author: string;
  author_email?: string;
  committed_at: string;
  url?: string;
  files_changed?: FileChange[];
}
```

### Sync Operations

#### CommitResult
```typescript
interface CommitResult {
  success: boolean;
  commit_sha?: string;
  files_committed: number;
  commit_url?: string;
  error?: string;
}
```

#### SyncResult
```typescript
interface SyncResult {
  status: 'up_to_date' | 'synced' | 'conflicts';
  datasets_updated: number;
  datasets_added: number;
  datasets_deleted: number;
  conflicts: Conflict[];
  commit_sha?: string;
}
```

### Conflict Resolution

#### ConflictResolutionStrategy
```typescript
enum ConflictResolutionStrategy {
  Ours = 'ours',       // Keep local changes
  Theirs = 'theirs',   // Keep remote changes
  Manual = 'manual'    // Manual resolution
}
```

#### Conflict
```typescript
interface Conflict {
  dataset_id: string;
  dataset_name: string;
  conflicting_fields: ConflictingField[];
  local_commit_sha?: string;
  remote_commit_sha: string;
}
```

### Error Classes

- `SourceControlError` - Base error class
- `SourceControlConnectionError` - Connection-specific errors
- `SourceControlSyncError` - Sync-specific errors
- `ConflictError` - Conflict-specific errors

### Helper Functions

- `parseRepoUrl(url)` - Parse repository URL into components
- `validateBranchName(branch)` - Validate git branch name
- `getShortSha(sha)` - Get 7-character short SHA
- `getRelativeTime(date)` - Get relative time string ("2 hours ago")

---

## API Types (`api.ts`)

### Pagination

#### PaginationMeta
```typescript
interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}
```

#### PaginatedResponse<T>
```typescript
interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}
```

### API Responses

#### ApiResponse<T>
```typescript
interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
}
```

#### ApiErrorResponse
```typescript
interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  code?: string;
  details?: Record<string, any>;
}
```

### Health Checks

#### SystemHealthCheck
```typescript
interface SystemHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: HealthCheck;
    sourceControl?: HealthCheck;
  };
}
```

### Helper Functions

- `isApiErrorResponse(response)` - Type guard for error responses
- `isPaginatedResponse(response)` - Type guard for paginated responses
- `createPaginatedResponse(data, page, limit, total)` - Create paginated response
- `validatePaginationParams(params)` - Validate and normalize pagination params

---

## Usage Examples

### Creating a Project

```typescript
import { CreateProjectInput, ProjectType, ProjectVisibility } from '@/types';

const input: CreateProjectInput = {
  name: 'My Project',
  description: 'A sample project',
  project_type: ProjectType.Standard,
  visibility: ProjectVisibility.Public,
  configuration: {
    medallion_layers_enabled: true,
    default_catalog: 'main',
    default_schema: 'default'
  }
};
```

### Checking Permissions

```typescript
import { ProjectRole, canEditProject, canManageProjectMembers } from '@/types';

const userRole: ProjectRole = ProjectRole.Editor;

if (canEditProject(userRole)) {
  // User can edit the project
}

if (canManageProjectMembers(userRole)) {
  // User can add/remove members
} else {
  // User cannot manage members
}
```

### Handling Paginated Responses

```typescript
import { PaginatedResponse, Project } from '@/types';

const response: PaginatedResponse<Project> = await api.getProjects({
  page: 1,
  limit: 20
});

console.log(`Showing ${response.data.length} of ${response.pagination.total} projects`);
console.log(`Page ${response.pagination.page} of ${response.pagination.total_pages}`);
```

### Working with Source Control

```typescript
import {
  SourceControlProvider,
  SourceControlConnectionConfig,
  CommitParams
} from '@/types';

const config: SourceControlConnectionConfig = {
  provider: SourceControlProvider.GitHub,
  credentials: {
    provider: SourceControlProvider.GitHub,
    access_token: 'ghp_xxxxx'
  },
  repo_url: 'https://github.com/owner/repo',
  branch: 'main'
};

const commitParams: CommitParams = {
  workspace_id: 'uuid',
  message: 'Update datasets',
  dataset_ids: ['id1', 'id2']
};
```

---

## Type Guards

Type guards help with runtime type checking:

```typescript
import { isProjectType, isProjectRole, isSourceControlProvider } from '@/types';

const value = 'Standard';
if (isProjectType(value)) {
  // TypeScript now knows value is ProjectType
  const type: ProjectType = value;
}
```

---

## Validation Functions

Built-in validation functions:

```typescript
import { validateProjectName, validateWorkspaceName, validateBranchName } from '@/types';

const nameResult = validateProjectName('My Project');
if (!nameResult.valid) {
  console.error(nameResult.error);
}

const branchResult = validateBranchName('feature/new-feature');
if (branchResult.valid) {
  // Branch name is valid
}
```

---

## Best Practices

### 1. Always Use Types

```typescript
// ✅ Good: Use explicit types
const project: Project = await getProject(id);

// ❌ Bad: Using 'any'
const project: any = await getProject(id);
```

### 2. Use Type Guards

```typescript
// ✅ Good: Use type guards
if (isApiErrorResponse(response)) {
  console.error(response.error);
} else {
  console.log(response.data);
}

// ❌ Bad: Unsafe type assertion
const data = (response as ApiResponse<Project>).data;
```

### 3. Leverage Helper Functions

```typescript
// ✅ Good: Use helper functions
if (canEditProject(userRole)) {
  // ...
}

// ❌ Bad: Manual checking
if (userRole === 'owner' || userRole === 'admin' || userRole === 'editor') {
  // ...
}
```

### 4. Use Enums for Constants

```typescript
// ✅ Good: Use enums
const type = ProjectType.Standard;

// ❌ Bad: String literals
const type = 'Standard';
```

---

## Integration with React

### Component Props

```typescript
import { Project, ProjectRole } from '@/types';

interface ProjectCardProps {
  project: Project;
  userRole: ProjectRole;
  onEdit: (project: Project) => void;
  onDelete: (projectId: string) => void;
}

export function ProjectCard({ project, userRole, onEdit, onDelete }: ProjectCardProps) {
  // Component implementation
}
```

### React Query Hooks

```typescript
import { useQuery } from '@tanstack/react-query';
import { PaginatedResponse, Project, GetProjectsParams } from '@/types';

export function useProjects(params: GetProjectsParams) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: (): Promise<PaginatedResponse<Project>> => projectService.getProjects(params)
  });
}
```

---

## References

- Project Types: `frontend/src/types/project.ts`
- Workspace Types: `frontend/src/types/workspace.ts`
- Source Control Types: `frontend/src/types/source-control.ts`
- API Types: `frontend/src/types/api.ts`
- Type Index: `frontend/src/types/index.ts`
- Project Specification: `docs/prp/021-project-workspaces-specification.md`

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-14 | Initial TypeScript types documentation | Claude Code |

---

## Checklist for Phase 2.1-2.3 Completion

- [x] **2.1.1-2.1.16** Created all core type definitions
- [x] **2.2.1-2.2.16** Created all source control types
- [x] **2.3.1-2.3.7** Created all API response types
- [x] Exported all types from central index
- [x] Documented all types comprehensively

**Status**: ✅ Phase 2 (TypeScript Types and Interfaces) COMPLETE
