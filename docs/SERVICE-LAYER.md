## Service Layer Documentation

## Overview

The service layer provides a clean abstraction over data access and business logic for the Projects and Workspaces management system. It encapsulates all interactions with Supabase, implements business rules, and provides a consistent API for the application.

**Location**: `frontend/src/lib/services/`

## Architecture

The service layer follows these principles:

1. **Single Responsibility**: Each service handles a specific domain (Projects, Workspaces, Source Control)
2. **Dependency Injection**: Services accept Supabase client configuration
3. **Error Handling**: All methods throw descriptive errors that can be caught by callers
4. **Type Safety**: Full TypeScript types for all inputs and outputs
5. **Validation**: Input validation before database operations
6. **Business Logic**: Implements business rules (e.g., cascading deletes, permission checks)

## Services

### 1. ProjectService

Manages project lifecycle, members, and permissions.

**File**: `frontend/src/lib/services/project-service.ts`

#### Key Methods

**CRUD Operations**:
- `getProjects(params)` - List projects with pagination and filters
- `getProject(id)` - Get single project with details
- `createProject(input, userId)` - Create new project
- `updateProject(id, input)` - Update project
- `deleteProject(id)` - Delete project (with cascade check)

**Member Management**:
- `getProjectMembers(projectId)` - List all members
- `addProjectMember(projectId, userId, role, invitedBy)` - Add member
- `updateProjectMemberRole(projectId, userId, newRole)` - Change role
- `removeProjectMember(projectId, userId)` - Remove member

**Permissions**:
- `hasProjectAccess(projectId, userId)` - Check access
- `getProjectUserRole(projectId, userId)` - Get user's role
- `canEditProject(projectId, userId)` - Check edit permission
- `canDeleteProject(projectId, userId)` - Check delete permission
- `canManageProjectMembers(projectId, userId)` - Check member management permission

**Analytics**:
- `getProjectStats(projectId)` - Get statistics (workspace count, dataset count, etc.)
- `searchProjects(query, accountId)` - Search by name/description

**Utilities**:
- `getCurrentUserId()` - Get authenticated user
- `isProjectNameAvailable(name, accountId, excludeId?)` - Check name uniqueness

#### Usage Example

```typescript
import { createProjectService } from '@/lib/services';
import { ProjectType, ProjectVisibility } from '@/types';

const projectService = createProjectService();

// Create project
const project = await projectService.createProject({
  account_id: 'account-uuid',
  name: 'My Data Vault Project',
  description: 'Data Vault 2.0 implementation',
  project_type: ProjectType.DataVault,
  visibility: ProjectVisibility.Private,
  configuration: {
    medallion_layers_enabled: true,
    data_vault_preferences: {
      hub_naming_pattern: 'HUB_{name}',
      hash_algorithm: 'SHA-256'
    }
  }
}, userId);

// Get projects with filtering
const response = await projectService.getProjects({
  account_id: 'account-uuid',
  project_type: ProjectType.DataVault,
  search: 'vault',
  page: 1,
  limit: 20,
  sort_by: 'updated_at',
  sort_order: 'desc'
});

// Check permissions
const canEdit = await projectService.canEditProject(project.id, userId);
if (canEdit) {
  await projectService.updateProject(project.id, {
    description: 'Updated description'
  });
}

// Add member
await projectService.addProjectMember(
  project.id,
  'user-uuid',
  ProjectRole.Editor,
  userId
);

// Get stats
const stats = await projectService.getProjectStats(project.id);
console.log(`${stats.workspace_count} workspaces, ${stats.dataset_count} datasets`);
```

---

### 2. WorkspaceService

Manages workspace lifecycle, members, settings, and source control status.

**File**: `frontend/src/lib/services/workspace-service.ts`

#### Key Methods

**CRUD Operations**:
- `getWorkspaces(params)` - List workspaces with pagination and filters
- `getWorkspace(id)` - Get single workspace with details
- `createWorkspace(input, userId)` - Create new workspace
- `updateWorkspace(id, input)` - Update workspace
- `deleteWorkspace(id)` - Delete workspace (with cascade check)

**Member Management**:
- `getWorkspaceMembers(workspaceId)` - List all members
- `addWorkspaceMember(workspaceId, userId, role, invitedBy)` - Add member
- `updateWorkspaceMemberRole(workspaceId, userId, newRole)` - Change role
- `removeWorkspaceMember(workspaceId, userId)` - Remove member

**Settings**:
- `getWorkspaceSettings(workspaceId)` - Get settings
- `updateWorkspaceSettings(workspaceId, settings)` - Update settings

**Permissions**:
- `hasWorkspaceAccess(workspaceId, userId)` - Check access
- `getWorkspaceUserRole(workspaceId, userId)` - Get user's role
- `canEditWorkspace(workspaceId, userId)` - Check edit permission
- `canDeleteWorkspace(workspaceId, userId)` - Check delete permission
- `canManageWorkspaceMembers(workspaceId, userId)` - Check member management permission

**Source Control**:
- `updateSourceControlStatus(workspaceId, status, additionalData)` - Update connection status
- `markAsSynced(workspaceId, commitSha)` - Mark as synced
- `markAsUnsynced(workspaceId)` - Mark as having uncommitted changes
- `isSourceControlConnected(workspace)` - Check connection status

**Analytics**:
- `getWorkspaceStats(workspaceId)` - Get statistics

**Utilities**:
- `getCurrentUserId()` - Get authenticated user
- `isWorkspaceNameAvailable(name, projectId, excludeId?)` - Check name uniqueness

#### Usage Example

```typescript
import { createWorkspaceService } from '@/lib/services';
import { WorkspaceVisibility } from '@/types';

const workspaceService = createWorkspaceService();

// Create workspace
const workspace = await workspaceService.createWorkspace({
  account_id: 'account-uuid',
  project_id: 'project-uuid',
  name: 'Development Workspace',
  description: 'Development environment',
  visibility: WorkspaceVisibility.Public,
  settings: {
    auto_sync_enabled: true,
    sync_interval_minutes: 30,
    conflict_resolution_strategy: 'manual'
  }
}, userId);

// Get workspaces for project
const response = await workspaceService.getWorkspaces({
  project_id: 'project-uuid',
  source_control_status: 'connected',
  page: 1,
  limit: 20
});

// Update settings
await workspaceService.updateWorkspaceSettings(workspace.id, {
  auto_sync_enabled: false,
  canvas_settings: {
    grid_size: 20,
    snap_to_grid: true
  }
});

// Mark as synced after commit
await workspaceService.markAsSynced(workspace.id, 'commit-sha-here');

// Check connection
if (workspaceService.isSourceControlConnected(workspace)) {
  console.log('Connected to source control');
}
```

---

### 3. SourceControlService

Manages source control integration, commits, syncs, and conflict resolution.

**File**: `frontend/src/lib/services/source-control-service.ts`

#### Key Methods

**Connection**:
- `connect(config, workspaceId)` - Connect to source control
- `disconnect(workspaceId)` - Disconnect from source control
- `testConnection(workspaceId)` - Test connection
- `getConnectionStatus(workspaceId)` - Get current status

**Repository**:
- `listRepositories(provider, credentials, options)` - List available repositories
- `createRepository(provider, credentials, name, isPrivate, options)` - Create new repository
- `initializeRepositoryStructure(workspaceId)` - Create initial folder structure

**Branch**:
- `listBranches(workspaceId)` - List branches
- `createBranch(workspaceId, branchName, fromBranch?)` - Create branch

**Commit & Sync**:
- `commit(params)` - Commit changes to source control
- `sync(params)` - Pull changes from source control
- `getUncommittedChanges(workspaceId)` - List uncommitted changes
- `getCommitHistory(workspaceId, limit)` - Get commit history

**Conflict Resolution**:
- `detectConflicts(workspaceId, changedFiles)` - Detect conflicts
- `resolveConflict(workspaceId, datasetId, strategy)` - Resolve conflict

#### Usage Example

```typescript
import { createSourceControlService } from '@/lib/services';
import {
  SourceControlProvider,
  SourceControlConnectionConfig,
  ConflictResolutionStrategy
} from '@/types';

const scService = createSourceControlService();

// Connect to GitHub
const config: SourceControlConnectionConfig = {
  provider: SourceControlProvider.GitHub,
  credentials: {
    provider: SourceControlProvider.GitHub,
    access_token: 'ghp_xxxxx'
  },
  repo_url: 'https://github.com/owner/repo',
  branch: 'main',
  create_if_not_exists: false
};

const result = await scService.connect(config, workspaceId);
if (result.success) {
  console.log(`Connected as ${result.user?.username}`);
}

// List repositories
const repos = await scService.listRepositories(
  SourceControlProvider.GitHub,
  config.credentials,
  { limit: 20 }
);

// Initialize repository structure
await scService.initializeRepositoryStructure(workspaceId);

// Commit changes
const commitResult = await scService.commit({
  workspace_id: workspaceId,
  message: 'Update datasets',
  dataset_ids: ['dataset-1', 'dataset-2', 'dataset-3']
});

if (commitResult.success) {
  console.log(`Committed ${commitResult.files_committed} files`);
  console.log(`Commit SHA: ${commitResult.commit_sha}`);
}

// Sync from remote
const syncResult = await scService.sync({
  workspace_id: workspaceId,
  conflict_resolution_strategy: ConflictResolutionStrategy.Manual
});

if (syncResult.status === 'conflicts') {
  console.log(`Found ${syncResult.conflicts.length} conflicts`);
  // Handle conflicts...
} else {
  console.log(`Synced: +${syncResult.datasets_added} ~${syncResult.datasets_updated} -${syncResult.datasets_deleted}`);
}

// Get uncommitted changes
const changes = await scService.getUncommittedChanges(workspaceId);
console.log(`${changes.length} uncommitted changes`);

// Get commit history
const history = await scService.getCommitHistory(workspaceId, 10);
history.forEach(commit => {
  console.log(`${commit.sha.substring(0, 7)} - ${commit.message}`);
});
```

---

## Credential Management

### CredentialEncryption

Handles secure encryption and decryption of source control credentials using Web Crypto API.

**File**: `frontend/src/lib/utils/credential-encryption.ts`

#### Features

- **AES-GCM Encryption**: Industry-standard symmetric encryption
- **PBKDF2 Key Derivation**: Secure key derivation from master key
- **Random IV & Salt**: Unique initialization vector and salt for each encryption
- **256-bit Keys**: Strong encryption keys
- **In-Memory Cache**: Short-lived cache for performance

#### Usage Example

```typescript
import {
  encryptCredentials,
  decryptCredentials,
  storeCredentialsSecurely,
  retrieveCredentialsSecurely,
  isCredentialsExpired,
  sanitizeCredentials
} from '@/lib/utils/credential-encryption';

// Encrypt credentials
const credentials: SourceControlCredentials = {
  provider: SourceControlProvider.GitHub,
  access_token: 'ghp_xxxxx',
  token_expires_at: '2025-12-31T23:59:59Z'
};

const encrypted = await encryptCredentials(credentials);
console.log(encrypted);
// {
//   encrypted: 'base64-encrypted-data',
//   iv: 'base64-iv',
//   salt: 'base64-salt'
// }

// Decrypt credentials
const decrypted = await decryptCredentials(encrypted);

// Check expiry
if (isCredentialsExpired(decrypted)) {
  console.log('Credentials expired');
}

// Sanitize for logging
const safe = sanitizeCredentials(decrypted);
console.log(safe); // { provider: 'github', token_expires_at: '...' }

// Store with caching
const enc = await storeCredentialsSecurely(workspaceId, credentials);
// Save `enc` to database

// Retrieve with caching
const creds = await retrieveCredentialsSecurely(workspaceId, enc);
```

---

## Error Handling

All services throw descriptive errors that should be caught and handled by the calling code.

### Common Error Patterns

```typescript
try {
  await projectService.createProject(input, userId);
} catch (error: any) {
  if (error.message.includes('already exists')) {
    // Handle duplicate name
  } else if (error.message.includes('permission')) {
    // Handle permission error
  } else {
    // Handle generic error
    console.error('Operation failed:', error.message);
  }
}
```

### Error Types

- **Validation Errors**: "Project name is required", "Invalid characters in name"
- **Permission Errors**: "User does not have access", "Cannot delete: insufficient permissions"
- **Dependency Errors**: "Cannot delete project: it has 5 workspace(s)"
- **Connection Errors**: "Failed to connect to GitHub", "Authentication failed"
- **Conflict Errors**: "Sync failed: conflicts detected"

---

## Permission System

Permissions are enforced at the service layer using database functions:

### Project Roles

| Role | View | Edit | Delete | Manage Members |
|------|------|------|--------|----------------|
| Owner | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ❌ | ✅ |
| Editor | ✅ | ✅ | ❌ | ❌ |
| Viewer | ✅ | ❌ | ❌ | ❌ |

### Workspace Roles

| Role | View | Edit | Delete | Manage Members | Commit | Sync |
|------|------|------|--------|----------------|--------|------|
| Owner | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Editor | ✅ | ✅ | ❌ | ❌ | ✅ | ✅ |
| Viewer | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

### Permission Checks

Always check permissions before operations:

```typescript
// Check before editing
if (await projectService.canEditProject(projectId, userId)) {
  await projectService.updateProject(projectId, updates);
} else {
  throw new Error('Insufficient permissions');
}

// Check before deleting
if (await projectService.canDeleteProject(projectId, userId)) {
  await projectService.deleteProject(projectId);
} else {
  throw new Error('Only the owner can delete this project');
}

// Check before managing members
if (await projectService.canManageProjectMembers(projectId, userId)) {
  await projectService.addProjectMember(projectId, newUserId, role, userId);
} else {
  throw new Error('Insufficient permissions to manage members');
}
```

---

## Best Practices

### 1. Always Use Factory Functions

```typescript
// ✅ Good: Use factory function
import { createProjectService } from '@/lib/services';
const service = createProjectService();

// ❌ Bad: Manual instantiation
import { ProjectService } from '@/lib/services';
const service = new ProjectService(url, key);
```

### 2. Handle Errors Appropriately

```typescript
// ✅ Good: Handle specific errors
try {
  await service.createProject(input, userId);
} catch (error: any) {
  if (error.message.includes('name is required')) {
    showValidationError('Name is required');
  } else {
    showGenericError(error.message);
  }
}

// ❌ Bad: Silent failure
try {
  await service.createProject(input, userId);
} catch {}
```

### 3. Check Permissions Before Operations

```typescript
// ✅ Good: Check permission first
if (await service.canEditProject(id, userId)) {
  await service.updateProject(id, updates);
}

// ❌ Bad: Assume permission
await service.updateProject(id, updates); // May fail
```

### 4. Validate Input Before Service Calls

```typescript
// ✅ Good: Validate early
if (!projectName.trim()) {
  throw new Error('Name cannot be empty');
}
await service.createProject({ name: projectName, ... }, userId);

// ❌ Bad: Let service handle all validation
await service.createProject({ name: '', ... }, userId);
```

### 5. Use Pagination for Lists

```typescript
// ✅ Good: Use pagination
const response = await service.getProjects({
  account_id: accountId,
  page: 1,
  limit: 20
});

// ❌ Bad: Load everything
const response = await service.getProjects({
  account_id: accountId
}); // Could return thousands of projects
```

---

## Testing

### Unit Tests

Test individual methods with mocked Supabase client:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { ProjectService } from '@/lib/services';

describe('ProjectService', () => {
  it('should create project with valid input', async () => {
    const service = new ProjectService(mockUrl, mockKey);
    const project = await service.createProject(validInput, userId);
    expect(project.name).toBe(validInput.name);
  });

  it('should throw error with invalid name', async () => {
    const service = new ProjectService(mockUrl, mockKey);
    await expect(
      service.createProject({ ...validInput, name: '' }, userId)
    ).rejects.toThrow('Project name is required');
  });
});
```

### Integration Tests

Test with real Supabase instance (test database):

```typescript
import { createProjectService } from '@/lib/services';

describe('ProjectService Integration', () => {
  it('should create and retrieve project', async () => {
    const service = createProjectService();
    const created = await service.createProject(input, userId);
    const retrieved = await service.getProject(created.id);
    expect(retrieved.id).toBe(created.id);
  });
});
```

---

## Performance Considerations

### 1. Pagination

Always use pagination for list operations to avoid loading too much data:

```typescript
// Load 20 projects at a time
const response = await projectService.getProjects({
  account_id,
  page: 1,
  limit: 20
});
```

### 2. Selective Queries

Only select fields you need:

```typescript
// Service methods use select() with specific fields
.select('id, name, description, created_at')
```

### 3. Caching

Use React Query or similar for caching service responses:

```typescript
const { data, isLoading } = useQuery({
  queryKey: ['projects', accountId],
  queryFn: () => projectService.getProjects({ account_id: accountId }),
  staleTime: 60000 // Cache for 1 minute
});
```

### 4. Credential Caching

Credentials are cached in memory for 5 minutes to avoid repeated decryption:

```typescript
// First call: decrypts
const creds1 = await retrieveCredentialsSecurely(workspaceId, encrypted);

// Second call within 5 minutes: uses cache
const creds2 = await retrieveCredentialsSecurely(workspaceId, encrypted);
```

---

## Security

### Credentials

- ✅ Stored encrypted in database
- ✅ Encrypted with AES-GCM using PBKDF2 key derivation
- ✅ Unique IV and salt per encryption
- ✅ Cached in memory for short duration only
- ✅ Never logged in plain text

### Row Level Security

- ✅ All queries go through RLS policies
- ✅ Account-level isolation
- ✅ Role-based access control
- ✅ Owner/admin/editor/viewer permissions

### Input Validation

- ✅ All inputs validated before database operations
- ✅ Protection against invalid characters
- ✅ Length limits enforced
- ✅ SQL injection prevented by parameterized queries

---

## Files

- `frontend/src/lib/services/project-service.ts` - Project service
- `frontend/src/lib/services/workspace-service.ts` - Workspace service
- `frontend/src/lib/services/source-control-service.ts` - Source control service
- `frontend/src/lib/services/index.ts` - Service exports
- `frontend/src/lib/utils/credential-encryption.ts` - Encryption utilities

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-14 | Initial service layer documentation | Claude Code |

---

## Related Documentation

- [TypeScript Types Documentation](./TYPESCRIPT-TYPES.md)
- [Source Control Providers Documentation](./SOURCE-CONTROL-PROVIDERS.md)
- [Database Functions and Triggers](./DATABASE-FUNCTIONS-TRIGGERS.md)
- [RLS Policies Documentation](./RLS-POLICIES.md)

---

**Status**: ✅ Phase 4 (Service Layer Implementation) COMPLETE
