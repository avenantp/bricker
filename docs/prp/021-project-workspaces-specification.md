 Management

**Version**: 2.0  
**Last Updated**: 2025-01-15  
**Status**: In Development

---

## 1. Overview

### 1.1 Purpose

The Projects and Workspaces module provides the foundational organizational structure for the Databricks Metadata Manager. It enables users to organize their data modeling work into logical projects, with workspaces serving as isolated environments for development, testing, and production scenarios. This module supports optional source control integration with multiple vendors (GitHub, GitLab, Bitbucket, Azure DevOps) for version control and collaboration.

### 1.2 Key Features

- **Multi-tenant Project Management**: Account-isolated projects with role-based access control
- **Flexible Workspace Model**: Multiple workspaces per project for environment separation
- **Source Control Integration**: Optional bidirectional sync with multiple source control providers
- **Version Control**: Track changes, view history, and manage versions
- **Collaborative Features**: Team-based access control with granular permissions
- **Audit Trail**: Complete history of all changes and operations

### 1.3 Business Value

- **Organization**: Logical separation of work by project and environment
- **Collaboration**: Multiple users can work simultaneously with proper isolation
- **Version Control**: Track changes and maintain history of all metadata
- **Flexibility**: Optional source control integration based on team needs
- **Security**: Fine-grained access control at project and workspace levels
- **Scalability**: Support for unlimited projects and workspaces per account

---

## 2. Data Architecture

### 2.1 Entity Relationship Diagram

```
accounts (1) ────────── (*) projects
                              │
                              │ (1)
                              │
                              ├─── (*) project_users
                              │
                              └─── (*) workspaces
                                        │
                                        ├─── (*) workspace_users
                                        │
                                        ├─── (*) workspace_datasets (mapping)
                                        │
                                        └─── (*) source_control_commits
```

### 2.2 Core Tables

#### 2.2.1 Projects Table

```sql
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- Identity
  name VARCHAR NOT NULL,
  description TEXT,
  
  -- Configuration
  project_type VARCHAR CHECK (project_type IN ('Standard', 'DataVault', 'Dimensional')),
  configuration JSONB,

  -- Ownership and Security
  owner_id UUID REFERENCES users(id),
  visibility VARCHAR NOT NULL DEFAULT 'private' 
    CHECK (visibility IN ('public', 'private', 'locked')),
  is_locked BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(account_id, name)
);

CREATE INDEX idx_projects_account ON projects(account_id);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_visibility ON projects(visibility);
CREATE INDEX idx_projects_type ON projects(project_type);
```

**Project Configuration Schema**:
```json
{
  "medallion_layers_enabled": true,
  "default_catalog": "analytics",
  "default_schema": "main",
  
  "data_vault_preferences": {
    "hub_naming_pattern": "HUB_{entity_name}",
    "satellite_naming_pattern": "SAT_{hub}_{descriptor}",
    "link_naming_pattern": "LNK_{entity1}_{entity2}",
    "hash_algorithm": "SHA-256",
    "include_load_date": true,
    "include_record_source": true,
    "multi_active_satellites": false,
    "business_vault_enabled": false
  },
  
  "dimensional_preferences": {
    "dimension_naming_pattern": "DIM_{entity_name}",
    "fact_naming_pattern": "FCT_{entity_name}",
    "surrogate_key_strategy": "hash",
    "default_scd_type": 2,
    "conformed_dimensions": true
  },
  
  "naming_conventions": {
    "case_style": "snake_case",
    "prefix_enabled": true,
    "suffix_enabled": false
  },
  
  "quality_rules": {
    "require_descriptions": true,
    "require_business_names": true,
    "min_confidence_score": 70
  }
}
```

**Visibility Levels**:
- **public**: Visible to all account members, editable by editors
- **private**: Visible only to owner, admins, and explicitly granted users
- **locked**: Read-only except for owner and account admins

#### 2.2.2 Project Users Table (Access Control)

```sql
CREATE TABLE project_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Role
  role VARCHAR NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  
  -- Metadata
  joined_at TIMESTAMP DEFAULT NOW(),
  invited_by UUID REFERENCES users(id),
  
  UNIQUE(project_id, user_id)
);

CREATE INDEX idx_project_users_project ON project_users(project_id);
CREATE INDEX idx_project_users_user ON project_users(user_id);
CREATE INDEX idx_project_users_role ON project_users(role);
```

**Role Permissions**:

| Action | Owner | Admin | Editor | Viewer |
|--------|-------|-------|--------|--------|
| View project | ✅ | ✅ | ✅ | ✅ |
| Edit project settings | ✅ | ✅ | ❌ | ❌ |
| Delete project | ✅ | ❌ | ❌ | ❌ |
| Create workspace | ✅ | ✅ | ✅ | ❌ |
| Manage users | ✅ | ✅ | ❌ | ❌ |
| Create datasets | ✅ | ✅ | ✅ | ❌ |
| Edit datasets | ✅ | ✅ | ✅ | ❌ |
| Delete datasets | ✅ | ✅ | ✅ | ❌ |

#### 2.2.3 Workspaces Table

```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Identity
  name VARCHAR NOT NULL,
  description TEXT,

  -- Source Control Integration (Optional)
  source_control_repo_url VARCHAR,
  source_control_branch VARCHAR,
  source_control_commit_sha VARCHAR,
  source_control_provider VARCHAR DEFAULT 'github' 
    CHECK (source_control_provider IN ('github', 'gitlab', 'bitbucket', 'azure', 'other')),
  source_control_connection_status VARCHAR 
    CHECK (source_control_connection_status IN ('connected', 'disconnected', 'error', 'syncing')),
  last_synced_at TIMESTAMP,
  is_synced BOOLEAN DEFAULT false,

  -- Ownership and Security
  owner_id UUID REFERENCES users(id),
  visibility VARCHAR NOT NULL DEFAULT 'private' 
    CHECK (visibility IN ('public', 'private', 'locked')),
  is_locked BOOLEAN DEFAULT false,

  -- Settings
  settings JSONB DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(account_id, project_id, name)
);

CREATE INDEX idx_workspaces_account ON workspaces(account_id);
CREATE INDEX idx_workspaces_project ON workspaces(project_id);
CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX idx_workspaces_source_control_status ON workspaces(source_control_connection_status);
CREATE INDEX idx_workspaces_branch ON workspaces(source_control_branch);
```

**Workspace Settings Schema**:
```json
{
  "auto_sync_enabled": false,
  "sync_interval_minutes": 15,
  "conflict_resolution_strategy": "manual",
  "default_medallion_layer": "Bronze",
  "canvas_settings": {
    "grid_enabled": true,
    "grid_size": 15,
    "snap_to_grid": true,
    "show_minimap": true,
    "default_zoom": 1.0
  },
  "diagram_settings": {
    "layout_algorithm": "hierarchical",
    "node_spacing": 100,
    "edge_routing": "orthogonal"
  }
}
```

#### 2.2.4 Workspace Users Table (Access Control)

```sql
CREATE TABLE workspace_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Role
  role VARCHAR NOT NULL CHECK (role IN ('owner', 'admin', 'editor', 'viewer')),
  
  -- Metadata
  joined_at TIMESTAMP DEFAULT NOW(),
  invited_by UUID REFERENCES users(id),
  
  UNIQUE(workspace_id, user_id)
);

CREATE INDEX idx_workspace_users_workspace ON workspace_users(workspace_id);
CREATE INDEX idx_workspace_users_user ON workspace_users(user_id);
CREATE INDEX idx_workspace_users_role ON workspace_users(role);
```

#### 2.2.5 Source Control Commits Table

```sql
CREATE TABLE source_control_commits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,

  -- Source Control Metadata
  commit_sha VARCHAR NOT NULL,
  commit_message TEXT,
  author VARCHAR,
  committed_at TIMESTAMP,
  source_control_provider VARCHAR DEFAULT 'github' 
    CHECK (source_control_provider IN ('github', 'gitlab', 'bitbucket', 'azure', 'other')),

  -- Files Affected
  files_changed JSONB,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_source_control_commits_account ON source_control_commits(account_id);
CREATE INDEX idx_source_control_commits_workspace ON source_control_commits(workspace_id);
CREATE INDEX idx_source_control_commits_project ON source_control_commits(project_id);
CREATE INDEX idx_source_control_commits_sha ON source_control_commits(commit_sha);
CREATE INDEX idx_source_control_commits_committed_at ON source_control_commits(committed_at);
```

**Files Changed Schema**:
```json
[
  {
    "path": "/datasets/gold/dim_customer.yml",
    "action": "added" | "modified" | "deleted",
    "dataset_id": "uuid"
  }
]
```

### 2.3 Row Level Security (RLS) Policies

```sql
-- Projects: Account isolation
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_isolation_policy ON projects
  FOR SELECT
  USING (account_id = (SELECT account_id FROM users WHERE id = auth.uid()));

CREATE POLICY projects_update_policy ON projects
  FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR
    (SELECT role FROM account_users WHERE account_id = projects.account_id AND user_id = auth.uid()) = 'admin'
    OR
    (SELECT role FROM project_users WHERE project_id = projects.id AND user_id = auth.uid()) IN ('owner', 'admin')
  );

-- Workspaces: Account isolation
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

CREATE POLICY workspaces_isolation_policy ON workspaces
  FOR SELECT
  USING (account_id = (SELECT account_id FROM users WHERE id = auth.uid()));

CREATE POLICY workspaces_update_policy ON workspaces
  FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR
    (SELECT role FROM account_users WHERE account_id = workspaces.account_id AND user_id = auth.uid()) = 'admin'
    OR
    (SELECT role FROM workspace_users WHERE workspace_id = workspaces.id AND user_id = auth.uid()) IN ('owner', 'admin')
  );
```

---

## 3. Source Control Integration Architecture

### 3.1 Supported Providers

| Provider | Authentication | API Version | Notes |
|----------|---------------|-------------|-------|
| GitHub | PAT, OAuth App | REST v3 | Full support |
| GitLab | PAT, OAuth | REST v4 | Full support |
| Bitbucket | PAT, OAuth | REST v2 | Full support |
| Azure DevOps | PAT | REST v6.0 | Full support |

### 3.2 Source Control Service Abstraction

```typescript
// Abstract interface for all source control providers
interface SourceControlProvider {
  // Authentication
  authenticate(credentials: SourceControlCredentials): Promise<boolean>;
  testConnection(): Promise<ConnectionStatus>;
  
  // Repository Operations
  listRepositories(): Promise<Repository[]>;
  getRepository(repoUrl: string): Promise<Repository>;
  createRepository(name: string, isPrivate: boolean): Promise<Repository>;
  
  // Branch Operations
  listBranches(repoUrl: string): Promise<Branch[]>;
  getBranch(repoUrl: string, branchName: string): Promise<Branch>;
  createBranch(repoUrl: string, branchName: string, fromBranch: string): Promise<Branch>;
  deleteBranch(repoUrl: string, branchName: string): Promise<void>;
  
  // File Operations
  getFile(repoUrl: string, branch: string, path: string): Promise<FileContent>;
  createFile(repoUrl: string, branch: string, path: string, content: string, message: string): Promise<Commit>;
  updateFile(repoUrl: string, branch: string, path: string, content: string, message: string, sha: string): Promise<Commit>;
  deleteFile(repoUrl: string, branch: string, path: string, message: string, sha: string): Promise<Commit>;
  
  // Commit Operations
  getCommit(repoUrl: string, sha: string): Promise<Commit>;
  listCommits(repoUrl: string, branch: string, since?: Date): Promise<Commit[]>;
  compareCommits(repoUrl: string, baseSha: string, headSha: string): Promise<CommitComparison>;
  
  // Sync Operations
  getLatestCommit(repoUrl: string, branch: string): Promise<Commit>;
  getChangedFiles(repoUrl: string, branch: string, fromSha: string, toSha: string): Promise<FileChange[]>;
}

// Provider-specific implementations
class GitHubProvider implements SourceControlProvider { /* ... */ }
class GitLabProvider implements SourceControlProvider { /* ... */ }
class BitbucketProvider implements SourceControlProvider { /* ... */ }
class AzureDevOpsProvider implements SourceControlProvider { /* ... */ }

// Factory to create appropriate provider
class SourceControlProviderFactory {
  static create(provider: SourceControlProviderType, credentials: SourceControlCredentials): SourceControlProvider {
    switch (provider) {
      case 'github':
        return new GitHubProvider(credentials);
      case 'gitlab':
        return new GitLabProvider(credentials);
      case 'bitbucket':
        return new BitbucketProvider(credentials);
      case 'azure':
        return new AzureDevOpsProvider(credentials);
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}
```

### 3.3 Source Control Workflow States

```typescript
type SourceControlConnectionStatus = 
  | 'not_connected'      // No source control configured
  | 'connected'          // Connected and synced
  | 'disconnected'       // Connection lost or credentials expired
  | 'error'              // Error state (auth failed, repo not found, etc.)
  | 'syncing'            // Currently syncing
  | 'conflict';          // Merge conflict detected

type SourceControlSyncStatus =
  | 'synced'             // Local matches remote
  | 'ahead'              // Local has uncommitted changes
  | 'behind'             // Remote has new commits
  | 'diverged';          // Both local and remote have changes
```

### 3.4 Sync Operations

#### 3.4.1 Initial Connection Flow

```
User Action → Configure Source Control → Test Connection → Create Repository (if needed)
    ↓
Select/Create Branch → Initialize Directory Structure → Mark as Connected
```

**Directory Structure** (created on initialization):
```
/
├── datasets/
│   ├── raw/
│   ├── bronze/
│   ├── silver/
│   └── gold/
├── templates/
│   ├── system/
│   └── custom/
├── configurations/
└── README.md
```

#### 3.4.2 Push to Source Control (Commit)

```typescript
async function commitToSourceControl(
  workspaceId: string,
  commitMessage: string,
  datasetIds?: string[]  // Optional: specific datasets to commit
): Promise<CommitResult> {
  
  const workspace = await getWorkspace(workspaceId);
  const provider = SourceControlProviderFactory.create(
    workspace.source_control_provider,
    await getStoredCredentials(workspaceId)
  );
  
  // Get uncommitted datasets (or specific ones)
  const datasets = datasetIds 
    ? await getDatasetsByIds(datasetIds)
    : await getUncommittedDatasets(workspaceId);
  
  // Generate YAML for each dataset
  const fileOperations: FileOperation[] = [];
  for (const dataset of datasets) {
    const yamlContent = await generateYAMLFromDataset(dataset);
    const filePath = `datasets/${dataset.medallion_layer?.toLowerCase()}/${dataset.name}.yml`;
    
    fileOperations.push({
      type: 'create_or_update',
      path: filePath,
      content: yamlContent,
      previousSha: dataset.source_control_commit_sha
    });
  }
  
  // Commit all files in a batch
  const commit = await provider.batchCommit(
    workspace.source_control_repo_url,
    workspace.source_control_branch,
    fileOperations,
    commitMessage
  );
  
  // Update workspace and datasets
  await updateWorkspace(workspaceId, {
    source_control_commit_sha: commit.sha,
    last_synced_at: new Date(),
    is_synced: true,
    source_control_connection_status: 'connected'
  });
  
  for (const dataset of datasets) {
    await updateDataset(dataset.id, {
      has_uncommitted_changes: false,
      source_control_commit_sha: commit.sha,
      last_synced_at: new Date(),
      sync_status: 'synced'
    });
  }
  
  // Log commit
  await createSourceControlCommit({
    account_id: workspace.account_id,
    project_id: workspace.project_id,
    workspace_id: workspaceId,
    commit_sha: commit.sha,
    commit_message: commitMessage,
    author: commit.author,
    committed_at: commit.committed_at,
    source_control_provider: workspace.source_control_provider,
    files_changed: datasets.map(d => ({
      path: d.source_control_file_path,
      action: 'modified',
      dataset_id: d.id
    }))
  });
  
  return {
    success: true,
    commitSha: commit.sha,
    filesCommitted: datasets.length
  };
}
```

#### 3.4.3 Pull from Source Control (Sync)

```typescript
async function syncFromSourceControl(
  workspaceId: string
): Promise<SyncResult> {
  
  const workspace = await getWorkspace(workspaceId);
  const provider = SourceControlProviderFactory.create(
    workspace.source_control_provider,
    await getStoredCredentials(workspaceId)
  );
  
  // Mark as syncing
  await updateWorkspace(workspaceId, {
    source_control_connection_status: 'syncing'
  });
  
  try {
    // Get latest commit
    const latestCommit = await provider.getLatestCommit(
      workspace.source_control_repo_url,
      workspace.source_control_branch
    );
    
    // Check if already up-to-date
    if (workspace.source_control_commit_sha === latestCommit.sha) {
      await updateWorkspace(workspaceId, {
        source_control_connection_status: 'connected',
        is_synced: true
      });
      return { status: 'up_to_date', conflicts: [], updated: [] };
    }
    
    // Get changed files
    const changedFiles = await provider.getChangedFiles(
      workspace.source_control_repo_url,
      workspace.source_control_branch,
      workspace.source_control_commit_sha || '',
      latestCommit.sha
    );
    
    // Process changes
    const conflicts: Conflict[] = [];
    const updated: Dataset[] = [];
    
    for (const file of changedFiles) {
      if (file.status === 'removed') {
        await deleteDatasetByPath(workspaceId, file.path);
      } else {
        const fileContent = await provider.getFile(
          workspace.source_control_repo_url,
          workspace.source_control_branch,
          file.path
        );
        
        const result = await parseAndUpdateDataset(
          workspaceId,
          file.path,
          fileContent.content,
          latestCommit.sha
        );
        
        if (result.conflict) {
          conflicts.push(result.conflict);
        } else {
          updated.push(result.dataset);
        }
      }
    }
    
    // Update workspace if no conflicts
    if (conflicts.length === 0) {
      await updateWorkspace(workspaceId, {
        source_control_commit_sha: latestCommit.sha,
        last_synced_at: new Date(),
        is_synced: true,
        source_control_connection_status: 'connected'
      });
    } else {
      await updateWorkspace(workspaceId, {
        source_control_connection_status: 'conflict'
      });
    }
    
    return {
      status: conflicts.length > 0 ? 'conflicts' : 'synced',
      conflicts,
      updated,
      commitSha: latestCommit.sha
    };
    
  } catch (error) {
    await updateWorkspace(workspaceId, {
      source_control_connection_status: 'error'
    });
    throw error;
  }
}
```

#### 3.4.4 Auto-Sync (Background Process)

```typescript
// Background job that runs periodically
async function autoSyncWorkspaces(): Promise<void> {
  // Get all workspaces with auto-sync enabled
  const workspaces = await supabase
    .from('workspaces')
    .select('*')
    .eq('source_control_connection_status', 'connected')
    .filter('settings->auto_sync_enabled', 'eq', true);
  
  for (const workspace of workspaces.data) {
    try {
      // Check last sync time
      const settings = workspace.settings as WorkspaceSettings;
      const intervalMinutes = settings.sync_interval_minutes || 15;
      const lastSyncTime = new Date(workspace.last_synced_at);
      const now = new Date();
      const minutesSinceSync = (now.getTime() - lastSyncTime.getTime()) / 60000;
      
      if (minutesSinceSync >= intervalMinutes) {
        await syncFromSourceControl(workspace.id);
        
        // Notify users via websocket if changes detected
        // (implementation in real-time module)
      }
    } catch (error) {
      console.error(`Auto-sync failed for workspace ${workspace.id}:`, error);
    }
  }
}

// Schedule with cron or similar
setInterval(autoSyncWorkspaces, 5 * 60 * 1000); // Check every 5 minutes
```

---

## 4. API Endpoints

### 4.1 Projects

#### GET /api/projects
Get all projects for current user's account.

**Query Parameters**:
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `search` (string): Search term for name/description
- `type` (string): Filter by project_type
- `sort` (string): Sort field (default: created_at)
- `order` (string): Sort order (asc/desc, default: desc)

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "account_id": "uuid",
      "name": "Customer Analytics",
      "description": "Customer data warehouse",
      "project_type": "DataVault",
      "configuration": { /* ... */ },
      "owner_id": "uuid",
      "visibility": "public",
      "is_locked": false,
      "created_at": "2025-01-15T10:00:00Z",
      "updated_at": "2025-01-15T10:00:00Z",
      "owner": {
        "id": "uuid",
        "full_name": "John Doe",
        "email": "john@example.com"
      },
      "workspace_count": 3,
      "dataset_count": 45,
      "user_role": "owner"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 15,
    "total_pages": 1
  }
}
```

#### GET /api/projects/:id
Get project by ID.

**Response**:
```json
{
  "id": "uuid",
  "account_id": "uuid",
  "name": "Customer Analytics",
  "description": "Customer data warehouse",
  "project_type": "DataVault",
  "configuration": { /* ... */ },
  "owner_id": "uuid",
  "visibility": "public",
  "is_locked": false,
  "created_at": "2025-01-15T10:00:00Z",
  "updated_at": "2025-01-15T10:00:00Z",
  "owner": {
    "id": "uuid",
    "full_name": "John Doe",
    "email": "john@example.com"
  },
  "workspaces": [
    {
      "id": "uuid",
      "name": "development",
      "description": "Dev environment"
    }
  ],
  "members": [
    {
      "user_id": "uuid",
      "full_name": "Jane Smith",
      "email": "jane@example.com",
      "role": "editor",
      "joined_at": "2025-01-15T10:00:00Z"
    }
  ],
  "user_role": "owner"
}
```

#### POST /api/projects
Create new project.

**Request Body**:
```json
{
  "name": "Customer Analytics",
  "description": "Customer data warehouse",
  "project_type": "DataVault",
  "visibility": "public",
  "configuration": {
    "medallion_layers_enabled": true,
    "data_vault_preferences": {
      "hub_naming_pattern": "HUB_{entity_name}"
    }
  }
}
```

**Response**: Created project object (201)

#### PUT /api/projects/:id
Update project.

**Request Body**: Partial project object

**Response**: Updated project object (200)

#### DELETE /api/projects/:id
Delete project (requires owner role).

**Query Parameters**:
- `confirm` (boolean): Must be true to confirm deletion

**Response**: 204 No Content

#### POST /api/projects/:id/members
Add user to project.

**Request Body**:
```json
{
  "user_id": "uuid",
  "role": "editor"
}
```

**Response**: 201 Created

#### PUT /api/projects/:id/members/:userId
Update user role in project.

**Request Body**:
```json
{
  "role": "admin"
}
```

**Response**: 200 OK

#### DELETE /api/projects/:id/members/:userId
Remove user from project.

**Response**: 204 No Content

### 4.2 Workspaces

#### GET /api/workspaces
Get all workspaces (filtered by user's projects).

**Query Parameters**:
- `project_id` (uuid): Filter by project
- `page` (number): Page number
- `limit` (number): Items per page
- `search` (string): Search term

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "name": "development",
      "description": "Development environment",
      "source_control_repo_url": "https://github.com/org/repo",
      "source_control_branch": "dev",
      "source_control_commit_sha": "abc123",
      "source_control_provider": "github",
      "source_control_connection_status": "connected",
      "last_synced_at": "2025-01-15T14:30:00Z",
      "is_synced": true,
      "owner_id": "uuid",
      "visibility": "public",
      "settings": { /* ... */ },
      "created_at": "2025-01-15T10:00:00Z",
      "project": {
        "id": "uuid",
        "name": "Customer Analytics"
      },
      "user_role": "editor",
      "uncommitted_changes_count": 3
    }
  ],
  "pagination": { /* ... */ }
}
```

#### GET /api/workspaces/:id
Get workspace by ID.

**Response**: Workspace object with full details

#### POST /api/workspaces
Create new workspace.

**Request Body**:
```json
{
  "project_id": "uuid",
  "name": "staging",
  "description": "Staging environment",
  "visibility": "public",
  "settings": {
    "auto_sync_enabled": false
  }
}
```

**Response**: Created workspace object (201)

#### PUT /api/workspaces/:id
Update workspace.

**Request Body**: Partial workspace object

**Response**: Updated workspace object (200)

#### DELETE /api/workspaces/:id
Delete workspace.

**Response**: 204 No Content

### 4.3 Source Control Integration

#### POST /api/workspaces/:id/source-control/connect
Connect workspace to source control.

**Request Body**:
```json
{
  "provider": "github",
  "credentials": {
    "access_token": "ghp_xxxxx"
  },
  "repo_url": "https://github.com/org/repo",
  "branch": "main",
  "create_if_not_exists": true
}
```

**Response**:
```json
{
  "success": true,
  "connection_status": "connected",
  "repo_url": "https://github.com/org/repo",
  "branch": "main"
}
```

#### POST /api/workspaces/:id/source-control/disconnect
Disconnect workspace from source control.

**Response**: 200 OK

#### POST /api/workspaces/:id/source-control/test
Test source control connection.

**Response**:
```json
{
  "connected": true,
  "repo_exists": true,
  "branch_exists": true,
  "has_access": true
}
```

#### GET /api/workspaces/:id/source-control/status
Get sync status.

**Response**:
```json
{
  "connection_status": "connected",
  "sync_status": "ahead",
  "uncommitted_changes": 3,
  "unpulled_commits": 0,
  "last_synced_at": "2025-01-15T14:30:00Z",
  "latest_commit": {
    "sha": "abc123",
    "message": "Updated customer dimension",
    "author": "John Doe",
    "committed_at": "2025-01-15T14:00:00Z"
  }
}
```

#### POST /api/workspaces/:id/source-control/commit
Commit changes to source control.

**Request Body**:
```json
{
  "message": "Updated customer dimension",
  "dataset_ids": ["uuid1", "uuid2"]  // Optional: commit specific datasets
}
```

**Response**:
```json
{
  "success": true,
  "commit_sha": "abc123",
  "files_committed": 2,
  "commit_url": "https://github.com/org/repo/commit/abc123"
}
```

#### POST /api/workspaces/:id/source-control/sync
Pull changes from source control.

**Response**:
```json
{
  "status": "synced",
  "datasets_updated": 2,
  "datasets_added": 1,
  "datasets_deleted": 0,
  "conflicts": [],
  "commit_sha": "def456"
}
```

#### GET /api/workspaces/:id/source-control/commits
Get commit history.

**Query Parameters**:
- `limit` (number): Number of commits (default: 20)
- `since` (date): Get commits since date

**Response**:
```json
{
  "commits": [
    {
      "sha": "abc123",
      "message": "Updated customer dimension",
      "author": "John Doe",
      "committed_at": "2025-01-15T14:00:00Z",
      "files_changed": [
        {
          "path": "/datasets/gold/dim_customer.yml",
          "action": "modified"
        }
      ]
    }
  ]
}
```

#### GET /api/workspaces/:id/source-control/uncommitted-changes
Get list of uncommitted changes.

**Response**:
```json
{
  "changes": [
    {
      "dataset_id": "uuid",
      "dataset_name": "dim_customer",
      "change_count": 5,
      "changes": [
        {
          "field": "description",
          "old_value": "Customer dimension",
          "new_value": "Customer dimension with SCD Type 2",
          "changed_at": "2025-01-15T14:00:00Z",
          "changed_by": "John Doe"
        }
      ]
    }
  ],
  "total_datasets": 3,
  "total_changes": 12
}
```

---

## 5. Frontend Components

### 5.1 Project Components

#### 5.1.1 ProjectsPage
**Path**: `frontend/src/pages/ProjectsPage.tsx`

Main page displaying all projects for current account.

**Features**:
- Project grid/list view
- Search and filter
- Sort options
- Create project button
- Project cards with quick actions

**Props**: None (uses current account context)

**State**:
```typescript
interface ProjectsPageState {
  projects: Project[];
  loading: boolean;
  searchTerm: string;
  filters: {
    type?: ProjectType;
    visibility?: VisibilityLevel;
  };
  sortBy: 'name' | 'created_at' | 'updated_at';
  sortOrder: 'asc' | 'desc';
  viewMode: 'grid' | 'list';
}
```

#### 5.1.2 ProjectCard
**Path**: `frontend/src/components/Project/ProjectCard.tsx`

Card component for displaying project summary.

**Props**:
```typescript
interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onDelete: (projectId: string) => void;
  onOpen: (projectId: string) => void;
}
```

**Features**:
- Project icon based on type
- Workspace count
- Dataset count
- Last updated timestamp
- Quick actions menu (edit, delete, settings)
- Click to open project

#### 5.1.3 CreateProjectDialog
**Path**: `frontend/src/components/Project/CreateProjectDialog.tsx`

Modal dialog for creating new project.

**Props**:
```typescript
interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (project: Project) => void;
}
```

**Form Fields**:
- Project name (required)
- Description (optional)
- Project type (Standard, DataVault, Dimensional)
- Visibility (public, private)
- Configuration options (collapsed by default)

**Validation**:
- Name required, unique within account
- Name length: 3-100 characters
- Valid characters: alphanumeric, spaces, hyphens, underscores

#### 5.1.4 ProjectSettingsDialog
**Path**: `frontend/src/components/Project/ProjectSettingsDialog.tsx`

Dialog for editing project settings.

**Tabs**:
1. **General**: Name, description, visibility
2. **Configuration**: Project-specific settings
3. **Members**: User access control
4. **Advanced**: Danger zone (delete project)

**Props**:
```typescript
interface ProjectSettingsDialogProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
}
```

#### 5.1.5 ProjectMembersTab
**Path**: `frontend/src/components/Project/ProjectMembersTab.tsx`

Component for managing project members.

**Features**:
- List current members with roles
- Add new member (search users)
- Change member role
- Remove member
- Show pending invitations

### 5.2 Workspace Components

#### 5.2.1 WorkspacesPage
**Path**: `frontend/src/pages/WorkspacesPage.tsx`

Main page for managing workspaces within a project.

**Props**:
```typescript
interface WorkspacesPageProps {
  projectId: string;
}
```

**Features**:
- Workspace list/grid
- Filter by sync status
- Create workspace button
- Quick actions per workspace

#### 5.2.2 WorkspaceCard
**Path**: `frontend/src/components/Workspace/WorkspaceCard.tsx`

Card component for workspace display.

**Props**:
```typescript
interface WorkspaceCardProps {
  workspace: Workspace;
  onOpen: (workspaceId: string) => void;
  onSettings: (workspaceId: string) => void;
  onDelete: (workspaceId: string) => void;
}
```

**Features**:
- Source control status indicator
- Branch name display
- Last sync timestamp
- Uncommitted changes badge
- Dataset count

#### 5.2.3 CreateWorkspaceDialog
**Path**: `frontend/src/components/Workspace/CreateWorkspaceDialog.tsx`

Modal for creating new workspace.

**Props**:
```typescript
interface CreateWorkspaceDialogProps {
  projectId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: (workspace: Workspace) => void;
}
```

**Form Fields**:
- Workspace name
- Description
- Visibility
- Source control connection (optional)

#### 5.2.4 WorkspaceSettingsDialog
**Path**: `frontend/src/components/Workspace/WorkspaceSettingsDialog.tsx`

Comprehensive workspace settings.

**Tabs**:
1. **General**: Name, description, visibility
2. **Source Control**: Connection settings
3. **Canvas**: Default settings for canvas
4. **Members**: User access control
5. **Advanced**: Delete workspace

### 5.3 Source Control Components

#### 5.3.1 SourceControlConnectionDialog
**Path**: `frontend/src/components/SourceControl/SourceControlConnectionDialog.tsx`

Dialog for connecting workspace to source control.

**Props**:
```typescript
interface SourceControlConnectionDialogProps {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
```

**Steps**:
1. **Provider Selection**: Choose GitHub, GitLab, Bitbucket, Azure DevOps
2. **Authentication**: Enter credentials (PAT or OAuth)
3. **Repository**: Select existing or create new
4. **Branch**: Select or create branch
5. **Test & Connect**: Verify connection and initialize

#### 5.3.2 SourceControlStatusPanel
**Path**: `frontend/src/components/SourceControl/SourceControlStatusPanel.tsx`

Panel showing current sync status.

**Props**:
```typescript
interface SourceControlStatusPanelProps {
  workspaceId: string;
}
```

**Display**:
- Connection status indicator
- Branch name
- Last sync timestamp
- Uncommitted changes count
- Unpulled commits count
- Quick actions: Commit, Sync, View History

#### 5.3.3 CommitDialog
**Path**: `frontend/src/components/SourceControl/CommitDialog.tsx`

Dialog for committing changes.

**Props**:
```typescript
interface CommitDialogProps {
  workspaceId: string;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}
```

**Features**:
- Commit message input (required)
- List of changed datasets with diff preview
- Select all / specific datasets to commit
- Show file paths that will be created/updated

#### 5.3.4 SyncDialog
**Path**: `frontend/src/components/SourceControl/SyncDialog.tsx`

Dialog for syncing from source control.

**Features**:
- Show commits to be pulled
- Preview changes
- Conflict detection
- Sync button
- Progress indicator

#### 5.3.5 CommitHistoryPanel
**Path**: `frontend/src/components/SourceControl/CommitHistoryPanel.tsx`

Panel showing commit history.

**Props**:
```typescript
interface CommitHistoryPanelProps {
  workspaceId: string;
}
```

**Features**:
- List of commits (paginated)
- Commit details (message, author, date, files)
- Link to source control provider
- View commit diff

#### 5.3.6 ConflictResolutionDialog
**Path**: `frontend/src/components/SourceControl/ConflictResolutionDialog.tsx`

Dialog for resolving merge conflicts.

**Props**:
```typescript
interface ConflictResolutionDialogProps {
  workspaceId: string;
  conflicts: Conflict[];
  open: boolean;
  onClose: () => void;
  onResolved: () => void;
}
```

**Features**:
- List conflicts per dataset
- Side-by-side diff view
- Resolution strategies: Ours, Theirs, Manual
- Manual merge interface
- Apply resolution button

---

## 6. Service Layer Implementation

### 6.1 Project Service
**Path**: `frontend/src/lib/project-service.ts`

```typescript
export class ProjectService {
  // CRUD Operations
  async getProjects(params?: GetProjectsParams): Promise<PaginatedResponse<Project>>;
  async getProject(projectId: string): Promise<Project>;
  async createProject(project: CreateProjectInput): Promise<Project>;
  async updateProject(projectId: string, updates: Partial<Project>): Promise<Project>;
  async deleteProject(projectId: string): Promise<void>;
  
  // Member Management
  async getProjectMembers(projectId: string): Promise<ProjectMember[]>;
  async addProjectMember(projectId: string, userId: string, role: ProjectRole): Promise<void>;
  async updateProjectMemberRole(projectId: string, userId: string, role: ProjectRole): Promise<void>;
  async removeProjectMember(projectId: string, userId: string): Promise<void>;
  
  // Permissions
  async hasProjectAccess(projectId: string, userId: string): Promise<boolean>;
  async getProjectUserRole(projectId: string, userId: string): Promise<ProjectRole | null>;
  async canEditProject(projectId: string, userId: string): Promise<boolean>;
  async canDeleteProject(projectId: string, userId: string): Promise<boolean>;
  
  // Statistics
  async getProjectStats(projectId: string): Promise<ProjectStats>;
  
  // Search
  async searchProjects(query: string): Promise<Project[]>;
}
```

### 6.2 Workspace Service
**Path**: `frontend/src/lib/workspace-service.ts`

```typescript
export class WorkspaceService {
  // CRUD Operations
  async getWorkspaces(projectId?: string): Promise<Workspace[]>;
  async getWorkspace(workspaceId: string): Promise<Workspace>;
  async createWorkspace(workspace: CreateWorkspaceInput): Promise<Workspace>;
  async updateWorkspace(workspaceId: string, updates: Partial<Workspace>): Promise<Workspace>;
  async deleteWorkspace(workspaceId: string): Promise<void>;
  
  // Member Management
  async getWorkspaceMembers(workspaceId: string): Promise<WorkspaceMember[]>;
  async addWorkspaceMember(workspaceId: string, userId: string, role: WorkspaceRole): Promise<void>;
  async updateWorkspaceMemberRole(workspaceId: string, userId: string, role: WorkspaceRole): Promise<void>;
  async removeWorkspaceMember(workspaceId: string, userId: string): Promise<void>;
  
  // Settings
  async getWorkspaceSettings(workspaceId: string): Promise<WorkspaceSettings>;
  async updateWorkspaceSettings(workspaceId: string, settings: Partial<WorkspaceSettings>): Promise<void>;
  
  // Statistics
  async getWorkspaceStats(workspaceId: string): Promise<WorkspaceStats>;
}
```

### 6.3 Source Control Service
**Path**: `frontend/src/lib/source-control-service.ts`

```typescript
export class SourceControlService {
  private provider: SourceControlProvider;
  
  // Connection Management
  async connect(workspaceId: string, config: SourceControlConnectionConfig): Promise<void>;
  async disconnect(workspaceId: string): Promise<void>;
  async testConnection(workspaceId: string): Promise<ConnectionTestResult>;
  async getConnectionStatus(workspaceId: string): Promise<SourceControlStatus>;
  
  // Repository Operations
  async listRepositories(credentials: SourceControlCredentials): Promise<Repository[]>;
  async createRepository(name: string, isPrivate: boolean): Promise<Repository>;
  async listBranches(workspaceId: string): Promise<Branch[]>;
  async createBranch(workspaceId: string, branchName: string, fromBranch: string): Promise<Branch>;
  
  // Sync Operations
  async commit(workspaceId: string, message: string, datasetIds?: string[]): Promise<CommitResult>;
  async sync(workspaceId: string): Promise<SyncResult>;
  async getUncommittedChanges(workspaceId: string): Promise<UncommittedChange[]>;
  async getCommitHistory(workspaceId: string, limit?: number): Promise<Commit[]>;
  
  // Conflict Resolution
  async detectConflicts(workspaceId: string): Promise<Conflict[]>;
  async resolveConflict(
    workspaceId: string,
    datasetId: string,
    strategy: ConflictResolutionStrategy
  ): Promise<void>;
}
```

---

## 7. State Management

### 7.1 React Query Hooks

```typescript
// Projects
export function useProjects(params?: GetProjectsParams) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: () => projectService.getProjects(params),
  });
}

export function useProject(projectId: string) {
  return useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProject(projectId),
    enabled: !!projectId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (project: CreateProjectInput) => projectService.createProject(project),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

// Workspaces
export function useWorkspaces(projectId?: string) {
  return useQuery({
    queryKey: ['workspaces', projectId],
    queryFn: () => workspaceService.getWorkspaces(projectId),
  });
}

export function useWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => workspaceService.getWorkspace(workspaceId),
    enabled: !!workspaceId,
  });
}

// Source Control
export function useSourceControlStatus(workspaceId: string) {
  return useQuery({
    queryKey: ['source-control-status', workspaceId],
    queryFn: () => sourceControlService.getConnectionStatus(workspaceId),
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: !!workspaceId,
  });
}

export function useCommit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ workspaceId, message, datasetIds }: CommitParams) =>
      sourceControlService.commit(workspaceId, message, datasetIds),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['source-control-status', variables.workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['uncommitted-changes', variables.workspaceId] });
    },
  });
}

export function useSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (workspaceId: string) => sourceControlService.sync(workspaceId),
    onSuccess: (_, workspaceId) => {
      queryClient.invalidateQueries({ queryKey: ['source-control-status', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['workspace', workspaceId] });
      queryClient.invalidateQueries({ queryKey: ['datasets', workspaceId] });
    },
  });
}
```

### 7.2 Zustand Store (UI State)

```typescript
interface ProjectWorkspaceStore {
  // Current selections
  currentProjectId: string | null;
  currentWorkspaceId: string | null;
  
  // UI state
  projectsViewMode: 'grid' | 'list';
  workspacesViewMode: 'grid' | 'list';
  
  // Dialogs
  createProjectDialogOpen: boolean;
  createWorkspaceDialogOpen: boolean;
  sourceControlDialogOpen: boolean;
  commitDialogOpen: boolean;
  
  // Actions
  setCurrentProject: (projectId: string | null) => void;
  setCurrentWorkspace: (workspaceId: string | null) => void;
  setProjectsViewMode: (mode: 'grid' | 'list') => void;
  setWorkspacesViewMode: (mode: 'grid' | 'list') => void;
  openCreateProjectDialog: () => void;
  closeCreateProjectDialog: () => void;
  openCreateWorkspaceDialog: () => void;
  closeCreateWorkspaceDialog: () => void;
  openSourceControlDialog: () => void;
  closeSourceControlDialog: () => void;
  openCommitDialog: () => void;
  closeCommitDialog: () => void;
}

export const useProjectWorkspaceStore = create<ProjectWorkspaceStore>((set) => ({
  currentProjectId: null,
  currentWorkspaceId: null,
  projectsViewMode: 'grid',
  workspacesViewMode: 'grid',
  createProjectDialogOpen: false,
  createWorkspaceDialogOpen: false,
  sourceControlDialogOpen: false,
  commitDialogOpen: false,
  
  setCurrentProject: (projectId) => set({ currentProjectId: projectId }),
  setCurrentWorkspace: (workspaceId) => set({ currentWorkspaceId: workspaceId }),
  setProjectsViewMode: (mode) => set({ projectsViewMode: mode }),
  setWorkspacesViewMode: (mode) => set({ workspacesViewMode: mode }),
  openCreateProjectDialog: () => set({ createProjectDialogOpen: true }),
  closeCreateProjectDialog: () => set({ createProjectDialogOpen: false }),
  openCreateWorkspaceDialog: () => set({ createWorkspaceDialogOpen: true }),
  closeCreateWorkspaceDialog: () => set({ createWorkspaceDialogOpen: false }),
  openSourceControlDialog: () => set({ sourceControlDialogOpen: true }),
  closeSourceControlDialog: () => set({ sourceControlDialogOpen: false }),
  openCommitDialog: () => set({ commitDialogOpen: true }),
  closeCommitDialog: () => set({ commitDialogOpen: false }),
}));
```

---

## 8. Error Handling and Validation

### 8.1 Validation Rules

**Project**:
- Name: Required, 3-100 characters, unique within account
- Project type: Must be one of Standard, DataVault, Dimensional
- Visibility: Must be one of public, private, locked
- Configuration: Must be valid JSON matching schema

**Workspace**:
- Name: Required, 3-100 characters, unique within project
- Visibility: Must be one of public, private, locked
- Source control branch: Must be valid branch name format
- Settings: Must be valid JSON matching schema

### 8.2 Error Types

```typescript
export class ProjectNotFoundError extends Error {
  constructor(projectId: string) {
    super(`Project not found: ${projectId}`);
    this.name = 'ProjectNotFoundError';
  }
}

export class WorkspaceNotFoundError extends Error {
  constructor(workspaceId: string) {
    super(`Workspace not found: ${workspaceId}`);
    this.name = 'WorkspaceNotFoundError';
  }
}

export class SourceControlConnectionError extends Error {
  constructor(message: string, public provider: string) {
    super(message);
    this.name = 'SourceControlConnectionError';
  }
}

export class SourceControlSyncError extends Error {
  constructor(message: string, public details?: any) {
    super(message);
    this.name = 'SourceControlSyncError';
  }
}

export class ConflictError extends Error {
  constructor(message: string, public conflicts: Conflict[]) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class PermissionDeniedError extends Error {
  constructor(action: string, resource: string) {
    super(`Permission denied: ${action} on ${resource}`);
    this.name = 'PermissionDeniedError';
  }
}
```

### 8.3 Error Handling Patterns

```typescript
// In UI components
try {
  await createProject(projectData);
  toast.success('Project created successfully');
  onSuccess();
} catch (error) {
  if (error instanceof PermissionDeniedError) {
    toast.error('You do not have permission to create projects');
  } else if (error instanceof ValidationError) {
    toast.error(`Validation failed: ${error.message}`);
  } else {
    toast.error('Failed to create project. Please try again.');
    console.error(error);
  }
}

// In service layer
async createProject(project: CreateProjectInput): Promise<Project> {
  // Validate
  if (!project.name || project.name.length < 3) {
    throw new ValidationError('Project name must be at least 3 characters');
  }
  
  // Check uniqueness
  const existing = await this.getProjectByName(project.name);
  if (existing) {
    throw new ValidationError('A project with this name already exists');
  }
  
  // Create
  try {
    const { data, error } = await supabase
      .from('projects')
      .insert(project)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    if (error.code === '23505') { // Unique violation
      throw new ValidationError('A project with this name already exists');
    }
    throw error;
  }
}
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

**Project Service Tests**:
```typescript
describe('ProjectService', () => {
  describe('createProject', () => {
    it('should create project with valid data', async () => {
      const project = await projectService.createProject({
        name: 'Test Project',
        project_type: 'Standard',
        visibility: 'private'
      });
      
      expect(project).toBeDefined();
      expect(project.name).toBe('Test Project');
    });
    
    it('should throw ValidationError for invalid name', async () => {
      await expect(
        projectService.createProject({
          name: 'ab', // Too short
          project_type: 'Standard',
          visibility: 'private'
        })
      ).rejects.toThrow(ValidationError);
    });
    
    it('should throw ValidationError for duplicate name', async () => {
      await projectService.createProject({
        name: 'Duplicate',
        project_type: 'Standard',
        visibility: 'private'
      });
      
      await expect(
        projectService.createProject({
          name: 'Duplicate',
          project_type: 'Standard',
          visibility: 'private'
        })
      ).rejects.toThrow(ValidationError);
    });
  });
  
  describe('getProjectUserRole', () => {
    it('should return owner role for project owner', async () => {
      const project = await createTestProject();
      const role = await projectService.getProjectUserRole(project.id, project.owner_id);
      expect(role).toBe('owner');
    });
    
    it('should return null for user without access', async () => {
      const project = await createTestProject();
      const otherUser = await createTestUser();
      const role = await projectService.getProjectUserRole(project.id, otherUser.id);
      expect(role).toBeNull();
    });
  });
});
```

**Source Control Service Tests**:
```typescript
describe('SourceControlService', () => {
  describe('connect', () => {
    it('should connect to GitHub successfully', async () => {
      mockGitHubAPI.testConnection.mockResolvedValue(true);
      
      await sourceControlService.connect(workspace.id, {
        provider: 'github',
        credentials: { access_token: 'test-token' },
        repo_url: 'https://github.com/org/repo',
        branch: 'main'
      });
      
      const status = await sourceControlService.getConnectionStatus(workspace.id);
      expect(status.connection_status).toBe('connected');
    });
    
    it('should throw error for invalid credentials', async () => {
      mockGitHubAPI.testConnection.mockRejectedValue(new Error('401 Unauthorized'));
      
      await expect(
        sourceControlService.connect(workspace.id, {
          provider: 'github',
          credentials: { access_token: 'invalid-token' },
          repo_url: 'https://github.com/org/repo',
          branch: 'main'
        })
      ).rejects.toThrow(SourceControlConnectionError);
    });
  });
  
  describe('commit', () => {
    it('should commit changes successfully', async () => {
      const result = await sourceControlService.commit(
        workspace.id,
        'Test commit',
        [dataset1.id, dataset2.id]
      );
      
      expect(result.success).toBe(true);
      expect(result.files_committed).toBe(2);
      expect(result.commit_sha).toBeDefined();
    });
  });
  
  describe('sync', () => {
    it('should sync changes from remote', async () => {
      mockGitHubAPI.getChangedFiles.mockResolvedValue([
        { path: '/datasets/gold/dim_customer.yml', status: 'modified' }
      ]);
      
      const result = await sourceControlService.sync(workspace.id);
      
      expect(result.status).toBe('synced');
      expect(result.datasets_updated).toBe(1);
    });
    
    it('should detect conflicts during sync', async () => {
      // Create local uncommitted changes
      await updateDataset(dataset.id, { description: 'Local change' });
      
      // Mock remote changes
      mockGitHubAPI.getChangedFiles.mockResolvedValue([
        { path: dataset.source_control_file_path, status: 'modified' }
      ]);
      
      const result = await sourceControlService.sync(workspace.id);
      
      expect(result.status).toBe('conflicts');
      expect(result.conflicts.length).toBeGreaterThan(0);
    });
  });
});
```

### 9.2 Integration Tests

```typescript
describe('Project and Workspace Integration', () => {
  it('should create project and workspace together', async () => {
    const project = await projectService.createProject({
      name: 'Integration Test',
      project_type: 'Standard',
      visibility: 'private'
    });
    
    const workspace = await workspaceService.createWorkspace({
      project_id: project.id,
      name: 'development',
      visibility: 'public'
    });
    
    expect(workspace.project_id).toBe(project.id);
    
    const projectWithWorkspaces = await projectService.getProject(project.id);
    expect(projectWithWorkspaces.workspaces).toHaveLength(1);
  });
  
  it('should cascade delete workspace when project is deleted', async () => {
    const project = await createTestProject();
    const workspace = await createTestWorkspace(project.id);
    
    await projectService.deleteProject(project.id);
    
    await expect(
      workspaceService.getWorkspace(workspace.id)
    ).rejects.toThrow(WorkspaceNotFoundError);
  });
});

describe('Source Control End-to-End', () => {
  it('should perform complete commit-sync cycle', async () => {
    // Setup
    const workspace = await setupWorkspaceWithSourceControl();
    const dataset = await createTestDataset(workspace.id);
    
    // Make changes
    await updateDataset(dataset.id, { description: 'Updated description' });
    
    // Commit
    const commitResult = await sourceControlService.commit(
      workspace.id,
      'Update dataset description'
    );
    expect(commitResult.success).toBe(true);
    
    // Verify no uncommitted changes
    const changes = await sourceControlService.getUncommittedChanges(workspace.id);
    expect(changes.length).toBe(0);
    
    // Simulate remote change
    await mockRemoteChange(workspace, dataset);
    
    // Sync
    const syncResult = await sourceControlService.sync(workspace.id);
    expect(syncResult.status).toBe('synced');
    expect(syncResult.datasets_updated).toBe(1);
  });
});
```

### 9.3 E2E Tests (Cypress/Playwright)

```typescript
describe('Project Management Flow', () => {
  it('should create project, workspace, and connect to source control', () => {
    // Login
    cy.login('test@example.com', 'password');
    
    // Navigate to projects
    cy.visit('/projects');
    
    // Create project
    cy.get('[data-testid="create-project-button"]').click();
    cy.get('[data-testid="project-name-input"]').type('E2E Test Project');
    cy.get('[data-testid="project-type-select"]').select('DataVault');
    cy.get('[data-testid="create-project-submit"]').click();
    
    // Verify project created
    cy.contains('E2E Test Project').should('be.visible');
    
    // Open project
    cy.contains('E2E Test Project').click();
    
    // Create workspace
    cy.get('[data-testid="create-workspace-button"]').click();
    cy.get('[data-testid="workspace-name-input"]').type('development');
    cy.get('[data-testid="workspace-description-input"]').type('Dev environment');
    cy.get('[data-testid="create-workspace-submit"]').click();
    
    // Verify workspace created
    cy.contains('development').should('be.visible');
    
    // Connect to source control
    cy.get('[data-testid="workspace-card-development"]').within(() => {
      cy.get('[data-testid="workspace-settings"]').click();
    });
    cy.get('[data-testid="source-control-tab"]').click();
    cy.get('[data-testid="connect-source-control-button"]').click();
    
    // Fill source control form
    cy.get('[data-testid="provider-select"]').select('github');
    cy.get('[data-testid="access-token-input"]').type(Cypress.env('GITHUB_TOKEN'));
    cy.get('[data-testid="repo-url-input"]').type('https://github.com/test/repo');
    cy.get('[data-testid="branch-input"]').type('main');
    cy.get('[data-testid="test-connection-button"]').click();
    
    // Verify connection successful
    cy.contains('Connection successful').should('be.visible');
    cy.get('[data-testid="connect-button"]').click();
    
    // Verify connected status
    cy.get('[data-testid="source-control-status"]').should('contain', 'Connected');
  });
});

describe('Source Control Operations', () => {
  beforeEach(() => {
    cy.login('test@example.com', 'password');
    cy.setupWorkspaceWithSourceControl();
  });
  
  it('should commit and sync changes', () => {
    // Create dataset (will be tracked as uncommitted change)
    cy.visit('/workspace/test-workspace/canvas');
    cy.get('[data-testid="create-dataset-button"]').click();
    cy.get('[data-testid="dataset-name-input"]').type('test_dataset');
    cy.get('[data-testid="create-dataset-submit"]').click();
    
    // Verify uncommitted changes badge
    cy.get('[data-testid="uncommitted-changes-badge"]').should('contain', '1');
    
    // Open commit dialog
    cy.get('[data-testid="commit-button"]').click();
    
    // Fill commit message
    cy.get('[data-testid="commit-message-input"]').type('Add test dataset');
    
    // Verify dataset listed for commit
    cy.get('[data-testid="changed-dataset-list"]').should('contain', 'test_dataset');
    
    // Commit
    cy.get('[data-testid="commit-submit-button"]').click();
    
    // Verify success
    cy.contains('Changes committed successfully').should('be.visible');
    cy.get('[data-testid="uncommitted-changes-badge"]').should('not.exist');
    
    // Simulate remote change
    cy.task('updateRemoteFile', {
      workspace: 'test-workspace',
      file: 'datasets/bronze/test_dataset.yml',
      content: '# Updated remotely'
    });
    
    // Sync
    cy.get('[data-testid="sync-button"]').click();
    
    // Verify sync successful
    cy.contains('Synced successfully').should('be.visible');
    cy.contains('1 dataset updated').should('be.visible');
  });
  
  it('should handle merge conflicts', () => {
    // Create local change
    cy.visit('/workspace/test-workspace/canvas');
    cy.get('[data-testid="dataset-card-customer"]').click();
    cy.get('[data-testid="description-input"]').clear().type('Local description');
    cy.get('[data-testid="save-button"]').click();
    
    // Simulate conflicting remote change
    cy.task('updateRemoteFile', {
      workspace: 'test-workspace',
      file: 'datasets/gold/customer.yml',
      field: 'description',
      value: 'Remote description'
    });
    
    // Attempt sync
    cy.get('[data-testid="sync-button"]').click();
    
    // Verify conflict detected
    cy.contains('Conflicts detected').should('be.visible');
    cy.get('[data-testid="resolve-conflicts-button"]').should('be.visible');
    
    // Open conflict resolution
    cy.get('[data-testid="resolve-conflicts-button"]').click();
    
    // Verify conflict shown
    cy.get('[data-testid="conflict-dataset"]').should('contain', 'customer');
    cy.get('[data-testid="conflict-field"]').should('contain', 'description');
    
    // Choose resolution strategy
    cy.get('[data-testid="resolution-strategy-ours"]').click();
    cy.get('[data-testid="resolve-button"]').click();
    
    // Verify resolution successful
    cy.contains('Conflict resolved').should('be.visible');
  });
});
```

---

## 10. Performance Considerations

### 10.1 Database Query Optimization

**Indexes** (already created in schema):
```sql
-- Project queries
CREATE INDEX idx_projects_account ON projects(account_id);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_visibility ON projects(visibility);
CREATE INDEX idx_projects_type ON projects(project_type);

-- Workspace queries
CREATE INDEX idx_workspaces_account ON workspaces(account_id);
CREATE INDEX idx_workspaces_project ON workspaces(project_id);
CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
CREATE INDEX idx_workspaces_source_control_status ON workspaces(source_control_connection_status);
CREATE INDEX idx_workspaces_branch ON workspaces(source_control_branch);

-- Access control queries
CREATE INDEX idx_project_users_project ON project_users(project_id);
CREATE INDEX idx_project_users_user ON project_users(user_id);
CREATE INDEX idx_workspace_users_workspace ON workspace_users(workspace_id);
CREATE INDEX idx_workspace_users_user ON workspace_users(user_id);
```

**Query Patterns**:
```typescript
// Efficient project listing with member count
const { data: projects } = await supabase
  .from('projects')
  .select(`
    *,
    owner:users!owner_id(id, full_name, email),
    project_users(count),
    workspaces(count)
  `)
  .eq('account_id', accountId)
  .order('created_at', { ascending: false })
  .range(offset, offset + limit - 1);

// Efficient workspace listing with uncommitted changes count
const { data: workspaces } = await supabase
  .from('workspaces')
  .select(`
    *,
    project:projects(id, name),
    owner:users!owner_id(id, full_name, email),
    workspace_datasets(count),
    datasets!inner(
      id,
      has_uncommitted_changes
    )
  `)
  .eq('project_id', projectId)
  .order('created_at', { ascending: false });
```

### 10.2 Frontend Performance

**Code Splitting**:
```typescript
// Lazy load heavy components
const ProjectSettingsDialog = lazy(() => import('./ProjectSettingsDialog'));
const WorkspaceSettingsDialog = lazy(() => import('./WorkspaceSettingsDialog'));
const SourceControlConnectionDialog = lazy(() => import('./SourceControlConnectionDialog'));
const ConflictResolutionDialog = lazy(() => import('./ConflictResolutionDialog'));
```

**React Query Caching**:
```typescript
// Aggressive caching for relatively static data
export function useProjects(params?: GetProjectsParams) {
  return useQuery({
    queryKey: ['projects', params],
    queryFn: () => projectService.getProjects(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
}

// Shorter cache for dynamic data
export function useSourceControlStatus(workspaceId: string) {
  return useQuery({
    queryKey: ['source-control-status', workspaceId],
    queryFn: () => sourceControlService.getConnectionStatus(workspaceId),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refresh every minute
    enabled: !!workspaceId,
  });
}
```

**Virtualization for Large Lists**:
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

function ProjectList({ projects }: { projects: Project[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  
  const virtualizer = useVirtualizer({
    count: projects.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Estimated row height
    overscan: 5,
  });
  
  return (
    <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const project = projects[virtualItem.index];
          return (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <ProjectCard project={project} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

### 10.3 Source Control API Rate Limiting

**Rate Limit Handling**:
```typescript
class RateLimiter {
  private requestQueue: Array<() => Promise<any>> = [];
  private processing = false;
  private lastRequestTime = 0;
  private minInterval: number;
  
  constructor(requestsPerHour: number) {
    this.minInterval = (60 * 60 * 1000) / requestsPerHour;
  }
  
  async enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      if (!this.processing) {
        this.processQueue();
      }
    });
  }
  
  private async processQueue() {
    this.processing = true;
    
    while (this.requestQueue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      if (timeSinceLastRequest < this.minInterval) {
        await this.sleep(this.minInterval - timeSinceLastRequest);
      }
      
      const fn = this.requestQueue.shift();
      if (fn) {
        this.lastRequestTime = Date.now();
        await fn();
      }
    }
    
    this.processing = false;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Usage in provider
class GitHubProvider implements SourceControlProvider {
  private rateLimiter = new RateLimiter(5000); // GitHub: 5000 requests/hour
  
  async getFile(repoUrl: string, branch: string, path: string): Promise<FileContent> {
    return this.rateLimiter.enqueue(() => this.fetchFile(repoUrl, branch, path));
  }
}
```

---

## 11. Security Considerations

### 11.1 Credential Storage

**Encryption at Rest**:
```typescript
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string): string {
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedText: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedText.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
  
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

// Store encrypted credentials
async function storeSourceControlCredentials(
  workspaceId: string,
  credentials: SourceControlCredentials
): Promise<void> {
  const encryptedToken = encrypt(credentials.access_token);
  
  await supabase
    .from('workspace_source_control_credentials')
    .upsert({
      workspace_id: workspaceId,
      encrypted_credentials: encryptedToken,
      provider: credentials.provider
    });
}
```

### 11.2 Access Control Validation

**Server-side Validation**:
```typescript
// Middleware to check project access
export async function requireProjectAccess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const { projectId } = req.params;
  const userId = req.user.id; // From auth middleware
  
  const hasAccess = await projectService.hasProjectAccess(projectId, userId);
  
  if (!hasAccess) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'You do not have access to this project'
    });
  }
  
  next();
}

// Middleware to check specific permission
export function requireProjectPermission(action: 'view' | 'edit' | 'delete') {
  return async (req: Request, res: Response, next: NextFunction) => {
    const { projectId } = req.params;
    const userId = req.user.id;
    
    const role = await projectService.getProjectUserRole(projectId, userId);
    
    const hasPermission = checkPermission(role, action);
    
    if (!hasPermission) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `You do not have permission to ${action} this project`
      });
    }
    
    next();
  };
}

function checkPermission(role: ProjectRole | null, action: string): boolean {
  if (!role) return false;
  
  const permissions = {
    owner: ['view', 'edit', 'delete'],
    admin: ['view', 'edit'],
    editor: ['view', 'edit'],
    viewer: ['view']
  };
  
  return permissions[role]?.includes(action) || false;
}
```

### 11.3 Input Sanitization

```typescript
import DOMPurify from 'dompurify';

export function sanitizeInput(input: string): string {
  // Remove any HTML/script tags
  const clean = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
  
  // Trim whitespace
  return clean.trim();
}

export function validateProjectName(name: string): boolean {
  // Only allow alphanumeric, spaces, hyphens, underscores
  const regex = /^[a-zA-Z0-9\s\-_]+$/;
  return regex.test(name) && name.length >= 3 && name.length <= 100;
}

export function validateBranchName(branch: string): boolean {
  // Git branch name rules
  const regex = /^[a-zA-Z0-9\/_\-\.]+$/;
  return regex.test(branch) && 
         !branch.startsWith('.') && 
         !branch.endsWith('.') &&
         !branch.includes('..') &&
         branch.length >= 1 &&
         branch.length <= 255;
}
```

---

## 12. Monitoring and Observability

### 12.1 Metrics to Track

```typescript
// Prometheus metrics
import { Counter, Histogram, Gauge } from 'prom-client';

// Project metrics
export const projectsCreated = new Counter({
  name: 'projects_created_total',
  help: 'Total number of projects created',
  labelNames: ['account_id', 'project_type']
});

export const projectOperationDuration = new Histogram({
  name: 'project_operation_duration_seconds',
  help: 'Duration of project operations',
  labelNames: ['operation', 'status'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

// Workspace metrics
export const workspacesCreated = new Counter({
  name: 'workspaces_created_total',
  help: 'Total number of workspaces created',
  labelNames: ['account_id', 'project_id']
});

export const activeWorkspaces = new Gauge({
  name: 'active_workspaces',
  help: 'Number of active workspaces',
  labelNames: ['account_id']
});

// Source control metrics
export const sourceControlCommits = new Counter({
  name: 'source_control_commits_total',
  help: 'Total number of commits to source control',
  labelNames: ['workspace_id', 'provider', 'status']
});

export const sourceControlSyncs = new Counter({
  name: 'source_control_syncs_total',
  help: 'Total number of source control syncs',
  labelNames: ['workspace_id', 'provider', 'status']
});

export const sourceControlOperationDuration = new Histogram({
  name: 'source_control_operation_duration_seconds',
  help: 'Duration of source control operations',
  labelNames: ['operation', 'provider', 'status'],
  buckets: [0.5, 1, 2, 5, 10, 30]
});

export const sourceControlConflicts = new Counter({
  name: 'source_control_conflicts_total',
  help: 'Total number of source control conflicts',
  labelNames: ['workspace_id', 'provider', 'resolution_strategy']
});

// Usage in code
async function createProject(project: CreateProjectInput): Promise<Project> {
  const timer = projectOperationDuration.startTimer({ operation: 'create' });
  
  try {
    const result = await this.doCreateProject(project);
    
    projectsCreated.inc({
      account_id: project.account_id,
      project_type: project.project_type
    });
    
    timer({ status: 'success' });
    return result;
  } catch (error) {
    timer({ status: 'error' });
    throw error;
  }
}
```

### 12.2 Logging Strategy

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'projects-workspaces' },
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Usage
logger.info('Project created', {
  projectId: project.id,
  accountId: project.account_id,
  userId: req.user.id
});

logger.warn('Source control sync failed', {
  workspaceId: workspace.id,
  provider: workspace.source_control_provider,
  error: error.message
});

logger.error('Failed to create project', {
  error: error.message,
  stack: error.stack,
  userId: req.user.id,
  projectData: sanitizeForLogging(project)
});
```

### 12.3 Health Checks

```typescript
// Health check endpoint
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      sourceControl: await checkSourceControlProviders()
    }
  };
  
  const allHealthy = Object.values(health.checks).every(check => check.status === 'healthy');
  
  res.status(allHealthy ? 200 : 503).json(health);
});

async function checkDatabase(): Promise<HealthCheck> {
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('count')
      .limit(1);
    
    return {
      status: error ? 'unhealthy' : 'healthy',
      message: error ? error.message : 'Database is accessible'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      message: error.message
    };
  }
}

async function checkSourceControlProviders(): Promise<HealthCheck> {
  const providers = ['github', 'gitlab', 'bitbucket', 'azure'];
  const results = await Promise.all(
    providers.map(async (provider) => {
      try {
        // Test basic API endpoint
        const response = await fetch(getProviderHealthUrl(provider));
        return response.ok;
      } catch {
        return false;
      }
    })
  );
  
  const healthyCount = results.filter(Boolean).length;
  
  return {
    status: healthyCount === providers.length ? 'healthy' : 'degraded',
    message: `${healthyCount}/${providers.length} providers accessible`
  };
}
```

---

## 13. Documentation Requirements

### 13.1 User Documentation

**Required Guides**:
1. **Getting Started with Projects**
   - Creating your first project
   - Understanding project types
   - Configuring project settings
   - Managing project members

2. **Working with Workspaces**
   - Creating workspaces
   - Workspace visibility and access control
   - Workspace settings and configuration

3. **Source Control Integration**
   - Connecting to GitHub/GitLab/Bitbucket/Azure DevOps
   - Understanding sync status
   - Committing changes
   - Syncing from remote
   - Resolving conflicts
   - Best practices

4. **Collaboration**
   - Inviting team members
   - Understanding roles and permissions
   - Working with shared projects
   - Managing access

### 13.2 API Documentation

Generate from TypeScript interfaces using TypeDoc or similar:

```typescript
/**
 * Project Service
 * 
 * Handles all project-related operations including CRUD, member management,
 * and permissions.
 * 
 * @example
 * ```typescript
 * const projectService = new ProjectService();
 * const project = await projectService.createProject({
 *   name: 'My Project',
 *   project_type: 'DataVault',
 *   visibility: 'private'
 * });
 * ```
 */
export class ProjectService {
  /**
   * Creates a new project
   * 
   * @param project - Project creation data
   * @returns Created project
   * @throws {ValidationError} If project data is invalid
   * @throws {PermissionDeniedError} If user lacks permission
   * 
   * @example
   * ```typescript
   * const project = await projectService.createProject({
   *   name: 'Customer Analytics',
   *   description: 'Data warehouse for customer data',
   *   project_type: 'DataVault',
   *   visibility: 'public'
   * });
   * ```
   */
  async createProject(project: CreateProjectInput): Promise<Project> {
    // Implementation
  }
}
```

### 13.3 Developer Documentation

**Architecture Decision Records (ADRs)**:

```markdown
# ADR-001: Multi-Provider Source Control Abstraction

## Status
Accepted

## Context
We need to support multiple source control providers (GitHub, GitLab, Bitbucket, Azure DevOps) while maintaining a consistent internal API.

## Decision
We will implement an abstract interface (`SourceControlProvider`) that all providers must implement, with a factory pattern for instantiation.

## Consequences
**Positive:**
- Easy to add new providers
- Consistent API across providers
- Provider-specific logic is isolated

**Negative:**
- Some provider-specific features may not be exposed
- Abstraction adds complexity

## Implementation
See `frontend/src/lib/source-control/providers/` for provider implementations.
```