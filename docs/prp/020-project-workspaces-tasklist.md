# Task List: Projects and Workspaces Management

## Phase 1: Database Foundation (Week 1)

### 1.1 Database Schema Verification
- [x] **1.1.1** Verify `projects` table schema matches specification
- [x] **1.1.2** Verify `project_users` table schema matches specification
- [x] **1.1.3** Verify `workspaces` table schema matches specification
- [x] **1.1.4** Verify `workspace_users` table schema matches specification
- [x] **1.1.5** Verify `source_control_commits` table schema matches specification
- [x] **1.1.6** Verify all indexes are created
- [x] **1.1.7** Verify all foreign key constraints
- [x] **1.1.8** Verify all check constraints

### 1.2 Row Level Security (RLS) Policies
- [ ] **1.2.1** Create RLS policy for `projects` SELECT (account isolation)
- [ ] **1.2.2** Create RLS policy for `projects` INSERT (account members only)
- [ ] **1.2.3** Create RLS policy for `projects` UPDATE (owner/admin only)
- [ ] **1.2.4** Create RLS policy for `projects` DELETE (owner only)
- [ ] **1.2.5** Create RLS policy for `workspaces` SELECT (account isolation)
- [ ] **1.2.6** Create RLS policy for `workspaces` INSERT (project members only)
- [ ] **1.2.7** Create RLS policy for `workspaces` UPDATE (owner/admin only)
- [ ] **1.2.8** Create RLS policy for `workspaces` DELETE (owner/admin only)
- [ ] **1.2.9** Create RLS policies for `project_users` (manage access control)
- [ ] **1.2.10** Create RLS policies for `workspace_users` (manage access control)
- [ ] **1.2.11** Test all RLS policies with different user roles
- [ ] **1.2.12** Document RLS policies and test results

### 1.3 Database Functions and Triggers
- [ ] **1.3.1** Create function `has_project_access(project_id, user_id)`
- [ ] **1.3.2** Create function `get_project_user_role(project_id, user_id)`
- [ ] **1.3.3** Create function `has_workspace_access(workspace_id, user_id)`
- [ ] **1.3.4** Create function `get_workspace_user_role(workspace_id, user_id)`
- [ ] **1.3.5** Create trigger to auto-update `updated_at` on projects
- [ ] **1.3.6** Create trigger to auto-update `updated_at` on workspaces
- [ ] **1.3.7** Create trigger to add project owner to project_users automatically
- [ ] **1.3.8** Create trigger to add workspace owner to workspace_users automatically
- [ ] **1.3.9** Test all functions and triggers
- [ ] **1.3.10** Document all functions and triggers

### 1.4 Sample Data for Development
- [ ] **1.4.1** Create seed script for sample projects
- [ ] **1.4.2** Create seed script for sample workspaces
- [ ] **1.4.3** Create seed script for project/workspace users
- [ ] **1.4.4** Create seed script for source control configurations
- [ ] **1.4.5** Run seed scripts in development environment
- [ ] **1.4.6** Verify seed data integrity

---

## Phase 2: TypeScript Types and Interfaces (Week 1)

### 2.1 Core Type Definitions
- [ ] **2.1.1** Create `Project` interface in `frontend/src/types/project.ts`
- [ ] **2.1.2** Create `CreateProjectInput` type
- [ ] **2.1.3** Create `UpdateProjectInput` type
- [ ] **2.1.4** Create `ProjectConfiguration` type
- [ ] **2.1.5** Create `ProjectType` enum
- [ ] **2.1.6** Create `ProjectMember` interface
- [ ] **2.1.7** Create `ProjectRole` enum
- [ ] **2.1.8** Create `ProjectStats` interface
- [ ] **2.1.9** Create `Workspace` interface in `frontend/src/types/workspace.ts`
- [ ] **2.1.10** Create `CreateWorkspaceInput` type
- [ ] **2.1.11** Create `UpdateWorkspaceInput` type
- [ ] **2.1.12** Create `WorkspaceSettings` type
- [ ] **2.1.13** Create `WorkspaceMember` interface
- [ ] **2.1.14** Create `WorkspaceRole` enum
- [ ] **2.1.15** Create `WorkspaceStats` interface
- [ ] **2.1.16** Export all types from `frontend/src/types/index.ts`

### 2.2 Source Control Types
- [ ] **2.2.1** Create `SourceControlProvider` type
- [ ] **2.2.2** Create `SourceControlCredentials` interface
- [ ] **2.2.3** Create `SourceControlConnectionConfig` interface
- [ ] **2.2.4** Create `SourceControlConnectionStatus` enum
- [ ] **2.2.5** Create `SourceControlSyncStatus` enum
- [ ] **2.2.6** Create `Repository` interface
- [ ] **2.2.7** Create `Branch` interface
- [ ] **2.2.8** Create `Commit` interface
- [ ] **2.2.9** Create `CommitResult` interface
- [ ] **2.2.10** Create `SyncResult` interface
- [ ] **2.2.11** Create `Conflict` interface
- [ ] **2.2.12** Create `ConflictResolutionStrategy` enum
- [ ] **2.2.13** Create `FileChange` interface
- [ ] **2.2.14** Create `FileContent` interface
- [ ] **2.2.15** Create `CommitComparison` interface
- [ ] **2.2.16** Export all types from `frontend/src/types/source-control.ts`

### 2.3 API Response Types
- [ ] **2.3.1** Create `PaginatedResponse<T>` generic type
- [ ] **2.3.2** Create `PaginationParams` interface
- [ ] **2.3.3** Create `ApiError` interface
- [ ] **2.3.4** Create `HealthCheck` interface
- [ ] **2.3.5** Create `ConnectionTestResult` interface
- [ ] **2.3.6** Create `SourceControlStatus` interface
- [ ] **2.3.7** Export all types from `frontend/src/types/api.ts`

---

## Phase 3: Source Control Provider Abstraction (Week 2)

### 3.1 Provider Interface
- [ ] **3.1.1** Create `SourceControlProvider` interface in `frontend/src/lib/source-control/provider.ts`
- [ ] **3.1.2** Define authentication methods
- [ ] **3.1.3** Define repository operations methods
- [ ] **3.1.4** Define branch operations methods
- [ ] **3.1.5** Define file operations methods
- [ ] **3.1.6** Define commit operations methods
- [ ] **3.1.7** Define sync operations methods
- [ ] **3.1.8** Add comprehensive JSDoc documentation

### 3.2 GitHub Provider Implementation
- [ ] **3.2.1** Create `GitHubProvider` class in `frontend/src/lib/source-control/providers/github.ts`
- [ ] **3.2.2** Implement `authenticate()` method
- [ ] **3.2.3** Implement `testConnection()` method
- [ ] **3.2.4** Implement `listRepositories()` method
- [ ] **3.2.5** Implement `getRepository()` method
- [ ] **3.2.6** Implement `createRepository()` method
- [ ] **3.2.7** Implement `listBranches()` method
- [ ] **3.2.8** Implement `getBranch()` method
- [ ] **3.2.9** Implement `createBranch()` method
- [ ] **3.2.10** Implement `deleteBranch()` method
- [ ] **3.2.11** Implement `getFile()` method
- [ ] **3.2.12** Implement `createFile()` method
- [ ] **3.2.13** Implement `updateFile()` method
- [ ] **3.2.14** Implement `deleteFile()` method
- [ ] **3.2.15** Implement `batchCommit()` method
- [ ] **3.2.16** Implement `getCommit()` method
- [ ] **3.2.17** Implement `listCommits()` method
- [ ] **3.2.18** Implement `compareCommits()` method
- [ ] **3.2.19** Implement `getLatestCommit()` method
- [ ] **3.2.20** Implement `getChangedFiles()` method
- [ ] **3.2.21** Add rate limiting logic
- [ ] **3.2.22** Add retry logic with exponential backoff
- [ ] **3.2.23** Add comprehensive error handling
- [ ] **3.2.24** Write unit tests for all methods

### 3.3 GitLab Provider Implementation
- [ ] **3.3.1** Create `GitLabProvider` class
- [ ] **3.3.2** Implement all methods from `SourceControlProvider` interface
- [ ] **3.3.3** Add GitLab-specific configurations
- [ ] **3.3.4** Add rate limiting
- [ ] **3.3.5** Add error handling
- [ ] **3.3.6** Write unit tests

### 3.4 Bitbucket Provider Implementation
- [ ] **3.4.1** Create `BitbucketProvider` class
- [ ] **3.4.2** Implement all methods from `SourceControlProvider` interface
- [ ] **3.4.3** Add Bitbucket-specific configurations
- [ ] **3.4.4** Add rate limiting
- [ ] **3.4.5** Add error handling
- [ ] **3.4.6** Write unit tests

### 3.5 Azure DevOps Provider Implementation
- [ ] **3.5.1** Create `AzureDevOpsProvider` class
- [ ] **3.5.2** Implement all methods from `SourceControlProvider` interface
- [ ] **3.5.3** Add Azure DevOps-specific configurations
- [ ] **3.5.4** Add rate limiting
- [ ] **3.5.5** Add error handling
- [ ] **3.5.6** Write unit tests

### 3.6 Provider Factory
- [ ] **3.6.1** Create `SourceControlProviderFactory` class
- [ ] **3.6.2** Implement `create()` method with provider selection logic
- [ ] **3.6.3** Add provider validation
- [ ] **3.6.4** Write unit tests for factory

### 3.7 Rate Limiter
- [ ] **3.7.1** Create `RateLimiter` class in `frontend/src/lib/source-control/rate-limiter.ts`
- [ ] **3.7.2** Implement request queue
- [ ] **3.7.3** Implement min interval enforcement
- [ ] **3.7.4** Add configurable limits per provider
- [ ] **3.7.5** Write unit tests

---

## Phase 4: Service Layer Implementation (Week 2-3)

### 4.1 Project Service
- [ ] **4.1.1** Create `ProjectService` class in `frontend/src/lib/project-service.ts`
- [ ] **4.1.2** Implement `getProjects()` method with pagination
- [ ] **4.1.3** Implement `getProject()` method
- [ ] **4.1.4** Implement `createProject()` method with validation
- [ ] **4.1.5** Implement `updateProject()` method with validation
- [ ] **4.1.6** Implement `deleteProject()` method with cascade check
- [ ] **4.1.7** Implement `getProjectMembers()` method
- [ ] **4.1.8** Implement `addProjectMember()` method
- [ ] **4.1.9** Implement `updateProjectMemberRole()` method
- [ ] **4.1.10** Implement `removeProjectMember()` method
- [ ] **4.1.11** Implement `hasProjectAccess()` method
- [ ] **4.1.12** Implement `getProjectUserRole()` method
- [ ] **4.1.13** Implement `canEditProject()` method
- [ ] **4.1.14** Implement `canDeleteProject()` method
- [ ] **4.1.15** Implement `getProjectStats()` method
- [ ] **4.1.16** Implement `searchProjects()` method
- [ ] **4.1.17** Add comprehensive error handling
- [ ] **4.1.18** Write unit tests for all methods
- [ ] **4.1.19** Write integration tests

### 4.2 Workspace Service
- [ ] **4.2.1** Create `WorkspaceService` class in `frontend/src/lib/workspace-service.ts`
- [ ] **4.2.2** Implement `getWorkspaces()` method with filtering
- [ ] **4.2.3** Implement `getWorkspace()` method
- [ ] **4.2.4** Implement `createWorkspace()` method with validation
- [ ] **4.2.5** Implement `updateWorkspace()` method with validation
- [ ] **4.2.6** Implement `deleteWorkspace()` method with cascade check
- [ ] **4.2.7** Implement `getWorkspaceMembers()` method
- [ ] **4.2.8** Implement `addWorkspaceMember()` method
- [ ] **4.2.9** Implement `updateWorkspaceMemberRole()` method
- [ ] **4.2.10** Implement `removeWorkspaceMember()` method
- [ ] **4.2.11** Implement `getWorkspaceSettings()` method
- [ ] **4.2.12** Implement `updateWorkspaceSettings()` method
- [ ] **4.2.13** Implement `getWorkspaceStats()` method
- [ ] **4.2.14** Add comprehensive error handling
- [ ] **4.2.15** Write unit tests for all methods
- [ ] **4.2.16** Write integration tests

### 4.3 Source Control Service
- [ ] **4.3.1** Create `SourceControlService` class in `frontend/src/lib/source-control-service.ts`
- [ ] **4.3.2** Implement `connect()` method
- [ ] **4.3.3** Implement `disconnect()` method
- [ ] **4.3.4** Implement `testConnection()` method
- [ ] **4.3.5** Implement `getConnectionStatus()` method
- [ ] **4.3.6** Implement `listRepositories()` method
- [ ] **4.3.7** Implement `createRepository()` method
- [ ] **4.3.8** Implement `initializeRepositoryStructure()` method
- [ ] **4.3.9** Implement `listBranches()` method
- [ ] **4.3.10** Implement `createBranch()` method
- [ ] **4.3.11** Implement `commit()` method (push to source control)
- [ ] **4.3.12** Implement `sync()` method (pull from source control)
- [ ] **4.3.13** Implement `getUncommittedChanges()` method
- [ ] **4.3.14** Implement `getCommitHistory()` method
- [ ] **4.3.15** Implement `detectConflicts()` method
- [ ] **4.3.16** Implement `resolveConflict()` method
- [ ] **4.3.17** Add encryption for stored credentials
- [ ] **4.3.18** Add comprehensive error handling
- [ ] **4.3.19** Write unit tests for all methods
- [ ] **4.3.20** Write integration tests with mock providers

### 4.4 Credential Management
- [ ] **4.4.1** Create credential encryption utilities
- [ ] **4.4.2** Create secure credential storage functions
- [ ] **4.4.3** Create credential retrieval functions
- [ ] **4.4.4** Implement credential expiry check
- [ ] **4.4.5** Write unit tests for encryption/decryption

---

## Phase 5: React Query Hooks (Week 3)

### 5.1 Project Hooks
- [ ] **5.1.1** Create `useProjects()` hook in `frontend/src/hooks/useProjects.ts`
- [ ] **5.1.2** Create `useProject()` hook
- [ ] **5.1.3** Create `useCreateProject()` mutation hook
- [ ] **5.1.4** Create `useUpdateProject()` mutation hook
- [ ] **5.1.5** Create `useDeleteProject()` mutation hook
- [ ] **5.1.6** Create `useProjectMembers()` hook
- [ ] **5.1.7** Create `useAddProjectMember()` mutation hook
- [ ] **5.1.8** Create `useUpdateProjectMemberRole()` mutation hook
- [ ] **5.1.9** Create `useRemoveProjectMember()` mutation hook
- [ ] **5.1.10** Create `useProjectStats()` hook
- [ ] **5.1.11** Add optimistic updates for mutations
- [ ] **5.1.12** Configure cache invalidation properly
- [ ] **5.1.13** Add loading and error states
- [ ] **5.1.14** Write tests for hooks

### 5.2 Workspace Hooks
- [ ] **5.2.1** Create `useWorkspaces()` hook in `frontend/src/hooks/useWorkspaces.ts`
- [ ] **5.2.2** Create `useWorkspace()` hook
- [ ] **5.2.3** Create `useCreateWorkspace()` mutation hook
- [ ] **5.2.4** Create `useUpdateWorkspace()` mutation hook
- [ ] **5.2.5** Create `useDeleteWorkspace()` mutation hook
- [ ] **5.2.6** Create `useWorkspaceMembers()` hook
- [ ] **5.2.7** Create `useAddWorkspaceMember()` mutation hook
- [ ] **5.2.8** Create `useUpdateWorkspaceMemberRole()` mutation hook
- [ ] **5.2.9** Create `useRemoveWorkspaceMember()` mutation hook
- [ ] **5.2.10** Create `useWorkspaceStats()` hook
- [ ] **5.2.11** Add optimistic updates for mutations
- [ ] **5.2.12** Configure cache invalidation properly
- [ ] **5.2.13** Write tests for hooks

### 5.3 Source Control Hooks
- [ ] **5.3.1** Create `useSourceControlStatus()` hook in `frontend/src/hooks/useSourceControl.ts`
- [ ] **5.3.2** Create `useConnect()` mutation hook
- [ ] **5.3.3** Create `useDisconnect()` mutation hook
- [ ] **5.3.4** Create `useTestConnection()` mutation hook
- [ ] **5.3.5** Create `useRepositories()` hook
- [ ] **5.3.6** Create `useBranches()` hook
- [ ] **5.3.7** Create `useCommit()` mutation hook
- [ ] **5.3.8** Create `useSync()` mutation hook
- [ ] **5.3.9** Create `useUncommittedChanges()` hook
- [ ] **5.3.10** Create `useCommitHistory()` hook
- [ ] **5.3.11** Create `useResolveConflict()` mutation hook
- [ ] **5.3.12** Configure auto-refresh for status (30s interval)
- [ ] **5.3.13** Add optimistic updates for mutations
- [ ] **5.3.14** Write tests for hooks

---

## Phase 6: UI Components - Projects (Week 4)

### 6.1 ProjectsPage
- [ ] **6.1.1** Create `ProjectsPage` component in `frontend/src/pages/ProjectsPage.tsx`
- [ ] **6.1.2** Add page header with title and create button
- [ ] **6.1.3** Implement search input with debouncing
- [ ] **6.1.4** Create filter panel (type, visibility)
- [ ] **6.1.5** Implement sort dropdown (name, created_at, updated_at)
- [ ] **6.1.6** Add view mode toggle (grid/list)
- [ ] **6.1.7** Implement project grid view
- [ ] **6.1.8** Implement project list view
- [ ] **6.1.9** Add pagination controls
- [ ] **6.1.10** Add loading skeleton
- [ ] **6.1.11** Add empty state
- [ ] **6.1.12** Add error handling
- [ ] **6.1.13** Persist view preferences in localStorage
- [ ] **6.1.14** Write component tests
- [ ] **6.1.15** Write E2E tests

### 6.2 ProjectCard
- [ ] **6.2.1** Create `ProjectCard` component in `frontend/src/components/Project/ProjectCard.tsx`
- [ ] **6.2.2** Add project type icon
- [ ] **6.2.3** Display project name and description
- [ ] **6.2.4** Show workspace count badge
- [ ] **6.2.5** Show dataset count badge
- [ ] **6.2.6** Display visibility indicator
- [ ] **6.2.7** Show last updated timestamp
- [ ] **6.2.8** Add hover effects
- [ ] **6.2.9** Implement quick actions menu (edit, delete, settings)
- [ ] **6.2.10** Add click handler to open project
- [ ] **6.2.11** Add loading state
- [ ] **6.2.12** Write component tests

### 6.3 CreateProjectDialog
- [ ] **6.3.1** Create `CreateProjectDialog` component in `frontend/src/components/Project/CreateProjectDialog.tsx`
- [ ] **6.3.2** Create modal dialog wrapper
- [ ] **6.3.3** Add form header with title
- [ ] **6.3.4** Implement project name input with validation
- [ ] **6.3.5** Implement description textarea
- [ ] **6.3.6** Add project type selector (Standard, DataVault, Dimensional)
- [ ] **6.3.7** Add visibility selector (public, private)
- [ ] **6.3.8** Create collapsible configuration section
- [ ] **6.3.9** Add Data Vault preferences form (when type=DataVault)
- [ ] **6.3.10** Add Dimensional preferences form (when type=Dimensional)
- [ ] **6.3.11** Add Medallion layer toggle
- [ ] **6.3.12** Implement form validation
- [ ] **6.3.13** Add submit button with loading state
- [ ] **6.3.14** Add cancel button
- [ ] **6.3.15** Show validation errors
- [ ] **6.3.16** Handle form submission
- [ ] **6.3.17** Show success message
- [ ] **6.3.18** Write component tests

### 6.4 ProjectSettingsDialog
- [ ] **6.4.1** Create `ProjectSettingsDialog` component in `frontend/src/components/Project/ProjectSettingsDialog.tsx`
- [ ] **6.4.2** Create modal dialog wrapper
- [ ] **6.4.3** Implement tab navigation (General, Configuration, Members, Advanced)
- [ ] **6.4.4** Create General tab with name/description/visibility editors
- [ ] **6.4.5** Create Configuration tab with project-specific settings
- [ ] **6.4.6** Create Members tab (use ProjectMembersTab component)
- [ ] **6.4.7** Create Advanced tab with delete project section
- [ ] **6.4.8** Implement save changes functionality
- [ ] **6.4.9** Add unsaved changes warning
- [ ] **6.4.10** Handle dialog close
- [ ] **6.4.11** Write component tests

### 6.5 ProjectMembersTab
- [ ] **6.5.1** Create `ProjectMembersTab` component in `frontend/src/components/Project/ProjectMembersTab.tsx`
- [ ] **6.5.2** Display list of current members with avatars
- [ ] **6.5.3** Show member roles
- [ ] **6.5.4** Add "Add Member" button
- [ ] **6.5.5** Create user search/select for adding members
- [ ] **6.5.6** Implement role selector dropdown
- [ ] **6.5.7** Add change role functionality
- [ ] **6.5.8** Add remove member button
- [ ] **6.5.9** Add confirmation dialog for remove
- [ ] **6.5.10** Show pending invitations (if applicable)
- [ ] **6.5.11** Handle permission checks (only show actions if user has permission)
- [ ] **6.5.12** Write component tests

### 6.6 DeleteProjectDialog
- [ ] **6.6.1** Create `DeleteProjectDialog` component in `frontend/src/components/Project/DeleteProjectDialog.tsx`
- [ ] **6.6.2** Create confirmation dialog
- [ ] **6.6.3** Show project name
- [ ] **6.6.4** Display impact assessment (workspace count, dataset count)
- [ ] **6.6.5** Add text input to type project name for confirmation
- [ ] **6.6.6** Validate confirmation text
- [ ] **6.6.7** Add delete button (enabled only when confirmation matches)
- [ ] **6.6.8** Show loading state during deletion
- [ ] **6.6.9** Handle deletion errors
- [ ] **6.6.10** Show success message
- [ ] **6.6.11** Redirect after successful deletion
- [ ] **6.6.12** Write component tests

---

## Phase 7: UI Components - Workspaces (Week 4-5)

### 7.1 WorkspacesPage
- [ ] **7.1.1** Create `WorkspacesPage` component in `frontend/src/pages/WorkspacesPage.tsx`
- [ ] **7.1.2** Add page header with project name and create workspace button
- [ ] **7.1.3** Implement search input
- [ ] **7.1.4** Create filter panel (source control status)
- [ ] **7.1.5** Add sort dropdown
- [ ] **7.1.6** Add view mode toggle (grid/list)
- [ ] **7.1.7** Implement workspace grid view
- [ ] **7.1.8** Implement workspace list view
- [ ] **7.1.9** Add loading skeleton
- [ ] **7.1.10** Add empty state
- [ ] **7.1.11** Add error handling
- [ ] **7.1.12** Write component tests
- [ ] **7.1.13** Write E2E tests

### 7.2 WorkspaceCard
- [ ] **7.2.1** Create `WorkspaceCard` component in `frontend/src/components/Workspace/WorkspaceCard.tsx`
- [ ] **7.2.2** Display workspace name and description
- [ ] **7.2.3** Show source control connection status badge
- [ ] **7.2.4** Display branch name (if connected)
- [ ] **7.2.5** Show last synced timestamp
- [ ] **7.2.6** Display uncommitted changes badge
- [ ] **7.2.7** Show dataset count
- [ ] **7.2.8** Add hover effects
- [ ] **7.2.9** Implement quick actions menu (open, settings, delete)
- [ ] **7.2.10** Add click handler to open workspace
- [ ] **7.2.11** Write component tests

### 7.3 CreateWorkspaceDialog
- [ ] **7.3.1** Create `CreateWorkspaceDialog` component in `frontend/src/components/Workspace/CreateWorkspaceDialog.tsx`
- [ ] **7.3.2** Create modal dialog wrapper
- [ ] **7.3.3** Add form header
- [ ] **7.3.4** Implement workspace name input with validation
- [ ] **7.3.5** Implement description textarea
- [ ] **7.3.6** Add visibility selector
- [ ] **7.3.7** Add "Connect to source control" toggle
- [ ] **7.3.8** Show source control options when toggle enabled
- [ ] **7.3.9** Implement form validation
- [ ] **7.3.10** Add submit button with loading state
- [ ] **7.3.11** Handle form submission
- [ ] **7.3.12** Show success message
- [ ] **7.3.13** Optionally open source control dialog after creation
- [ ] **7.3.14** Write component tests

### 7.4 WorkspaceSettingsDialog
- [ ] **7.4.1** Create `WorkspaceSettingsDialog` component in `frontend/src/components/Workspace/WorkspaceSettingsDialog.tsx`
- [ ] **7.4.2** Create modal dialog wrapper
- [ ] **7.4.3** Implement tab navigation (General, Source Control, Canvas, Members, Advanced)
- [ ] **7.4.4** Create General tab
- [ ] **7.4.5** Create Source Control tab (use SourceControlConnectionPanel)
- [ ] **7.4.6** Create Canvas tab with default settings
- [ ] **7.4.7** Create Members tab (use WorkspaceMembersTab component)
- [ ] **7.4.8** Create Advanced tab with delete workspace section
- [ ] **7.4.9** Implement save changes functionality
- [ ] **7.4.10** Add unsaved changes warning
- [ ] **7.4.11** Write component tests

### 7.5 WorkspaceMembersTab
- [ ] **7.5.1** Create `WorkspaceMembersTab` component (similar to ProjectMembersTab)
- [ ] **7.5.2** Display list of members
- [ ] **7.5.3** Add member functionality
- [ ] **7.5.4** Change role functionality
- [ ] **7.5.5** Remove member functionality
- [ ] **7.5.6** Write component tests

### 7.6 DeleteWorkspaceDialog
- [ ] **7.6.1** Create `DeleteWorkspaceDialog` component
- [ ] **7.6.2** Create confirmation dialog
- [ ] **7.6.3** Show workspace name
- [ ] **7.6.4** Display impact assessment
- [ ] **7.6.5** Add confirmation text input
- [ ] **7.6.6** Implement delete functionality
- [ ] **7.6.7** Write component tests

---

## Phase 8: UI Components - Source Control (Week 5)

### 8.1 SourceControlConnectionDialog
- [ ] **8.1.1** Create `SourceControlConnectionDialog` component in `frontend/src/components/SourceControl/SourceControlConnectionDialog.tsx`
- [ ] **8.1.2** Create multi-step wizard dialog
- [ ] **8.1.3** Implement Step 1: Provider Selection (GitHub, GitLab, Bitbucket, Azure DevOps)
- [ ] **8.1.4** Implement Step 2: Authentication (PAT input, or OAuth flow)
- [ ] **8.1.5** Implement Step 3: Repository Selection (list repos or create new)
- [ ] **8.1.6** Implement Step 4: Branch Selection (list branches or create new)
- [ ] **8.1.7** Implement Step 5: Test & Connect
- [ ] **8.1.8** Add step navigation (Next, Back, Cancel buttons)
- [ ] **8.1.9** Add loading states for async operations
- [ ] **8.1.10** Show validation errors at each step
- [ ] **8.1.11** Display connection success message
- [ ] **8.1.12** Close dialog and refresh workspace on success
- [ ] **8.1.13** Write component tests
- [ ] **8.1.14** Write E2E test for full connection flow

### 8.2 SourceControlStatusPanel
- [ ] **8.2.1** Create `SourceControlStatusPanel` component in `frontend/src/components/SourceControl/SourceControlStatusPanel.tsx`
- [ ] **8.2.2** Display connection status indicator (color-coded)
- [ ] **8.2.3** Show provider icon (GitHub, GitLab, etc.)
- [ ] **8.2.4** Display repository URL (with link)
- [ ] **8.2.5** Show current branch name
- [ ] **8.2.6** Display last synced timestamp
- [ ] **8.2.7** Show uncommitted changes count
- [ ] **8.2.8** Show unpulled commits count (if any)
- [ ] **8.2.9** Add "Commit" button
- [ ] **8.2.10** Add "Sync" button
- [ ] **8.2.11** Add "View History" button
- [ ] **8.2.12** Add "Disconnect" button
- [ ] **8.2.13** Auto-refresh status every 30 seconds
- [ ] **8.2.14** Handle connection errors gracefully
- [ ] **8.2.15** Write component tests

### 8.3 CommitDialog
- [ ] **8.3.1** Create `CommitDialog` component in `frontend/src/components/SourceControl/CommitDialog.tsx`
- [ ] **8.3.2** Create modal dialog wrapper
- [ ] **8.3.3** Add commit message textarea (required)
- [ ] **8.3.4** Display list of changed datasets
- [ ] **8.3.5** Show diff preview for each dataset (collapsible)
- [ ] **8.3.6** Add "Select All" checkbox
- [ ] **8.3.7** Add individual checkboxes for each dataset
- [ ] **8.3.8** Show file paths that will be created/updated
- [ ] **8.3.9** Add commit button (disabled if no message or no datasets selected)
- [ ] **8.3.10** Show loading state during commit
- [ ] **8.3.11** Display progress (e.g., "Committing 3 of 5 files...")
- [ ] **8.3.12** Handle commit errors
- [ ] **8.3.13** Show success message with commit SHA
- [ ] **8.3.14** Provide link to view commit in source control provider
- [ ] **8.3.15** Write component tests
- [ ] **8.3.16** Write E2E test for commit flow

### 8.4 SyncDialog
- [ ] **8.4.1** Create `SyncDialog` component in `frontend/src/components/SourceControl/SyncDialog.tsx`
- [ ] **8.4.2** Create modal dialog wrapper
- [ ] **8.4.3** Show list of commits to be pulled
- [ ] **8.4.4** Display commit details (message, author, date)
- [ ] **8.4.5** Show files changed in each commit
- [ ] **8.4.6** Preview changes summary (datasets added, updated, deleted)
- [ ] **8.4.7** Detect conflicts before sync
- [ ] **8.4.8** Show conflict warning if detected
- [ ] **8.4.9** Add sync button
- [ ] **8.4.10** Show loading state during sync
- [ ] **8.4.11** Display progress
- [ ] **8.4.12** Handle sync errors
- [ ] **8.4.13** Show success message
- [ ] **8.4.14** Handle conflict detection and redirect to conflict resolution
- [ ] **8.4.15** Write component tests

### 8.5 CommitHistoryPanel
- [ ] **8.5.1** Create `CommitHistoryPanel` component in `frontend/src/components/SourceControl/CommitHistoryPanel.tsx`
- [ ] **8.5.2** Display list of commits (paginated)
- [ ] **8.5.3** Show commit SHA (short version)
- [ ] **8.5.4** Display commit message
- [ ] **8.5.5** Show author name
- [ ] **8.5.6** Display commit date (relative time)
- [ ] **8.5.7** Show files changed count
- [ ] **8.5.8** Make commit clickable to expand details
- [ ] **8.5.9** Show file changes in expanded view
- [ ] **8.5.10** Add "View in [Provider]" link
- [ ] **8.5.11** Implement infinite scroll or "Load More" button
- [ ] **8.5.12** Add loading skeleton
- [ ] **8.5.13** Write component tests

### 8.6 ConflictResolutionDialog
- [ ] **8.6.1** Create `ConflictResolutionDialog` component in `frontend/src/components/SourceControl/ConflictResolutionDialog.tsx`
- [ ] **8.6.2** Create modal dialog wrapper
- [ ] **8.6.3** Display list of conflicts (grouped by dataset)
- [ ] **8.6.4** Show dataset name for each conflict
- [ ] **8.6.5** Display conflicting fields
- [ ] **8.6.6** Implement side-by-side diff view
- [ ] **8.6.7** Add resolution strategy selector (Ours, Theirs, Manual)
- [ ] **8.6.8** For Manual strategy: allow field-by-field selection
- [ ] **8.6.9** Highlight selected values
- [ ] **8.6.10** Add "Resolve All" with single strategy option
- [ ] **8.6.11** Add individual "Resolve" button per dataset
- [ ] **8.6.12** Show resolution progress
- [ ] **8.6.13** Handle resolution errors
- [ ] **8.6.14** Show success message when all resolved
- [ ] **8.6.15** Refresh workspace state after resolution
- [ ] **8.6.16** Write component tests
- [ ] **8.6.17** Write E2E test for conflict resolution flow

### 8.7 UncommittedChangesPanel
- [ ] **8.7.1** Create `UncommittedChangesPanel` component in `frontend/src/components/SourceControl/UncommittedChangesPanel.tsx`
- [ ] **8.7.2** Display list of datasets with uncommitted changes
- [ ] **8.7.3** Show change count per dataset
- [ ] **8.7.4** Group changes by change type (created, updated, deleted)
- [ ] **8.7.5** Make datasets clickable to expand change details
- [ ] **8.7.6** Show field-level changes in expanded view
- [ ] **8.7.7** Display old value vs new value for updates
- [ ] **8.7.8** Show timestamp and user for each change
- [ ] **8.7.9** Add "Commit All" button
- [ ] **8.7.10** Add "Discard All" button with confirmation
- [ ] **8.7.11** Add individual "Discard Changes" per dataset
- [ ] **8.7.12** Implement search/filter for changed datasets
- [ ] **8.7.13** Add loading state
- [ ] **8.7.14** Handle empty state (no changes)
- [ ] **8.7.15** Write component tests

---

## Phase 9: State Management and Routing (Week 5-6)

### 9.1 Zustand Store
- [ ] **9.1.1** Create `useProjectWorkspaceStore` in `frontend/src/store/projectWorkspaceStore.ts`
- [ ] **9.1.2** Add `currentProjectId` state
- [ ] **9.1.3** Add `currentWorkspaceId` state
- [ ] **9.1.4** Add `projectsViewMode` state (grid/list)
- [ ] **9.1.5** Add `workspacesViewMode` state (grid/list)
- [ ] **9.1.6** Add dialog states (createProject, createWorkspace, sourceControl, commit, sync)
- [ ] **9.1.7** Implement `setCurrentProject` action
- [ ] **9.1.8** Implement `setCurrentWorkspace` action
- [ ] **9.1.9** Implement view mode setters
- [ ] **9.1.10** Implement dialog open/close actions
- [ ] **9.1.11** Add persist middleware for view preferences
- [ ] **9.1.12** Write tests for store

### 9.2 Route Configuration
- [ ] **9.2.1** Add `/projects` route in router configuration
- [ ] **9.2.2** Add `/projects/:projectId` route
- [ ] **9.2.3** Add `/projects/:projectId/settings` route
- [ ] **9.2.4** Add `/projects/:projectId/workspaces` route
- [ ] **9.2.5** Add `/projects/:projectId/workspaces/:workspaceId` route
- [ ] **9.2.6** Add `/projects/:projectId/workspaces/:workspaceId/settings` route
- [ ] **9.2.7** Add protected route wrapper with permission checks
- [ ] **9.2.8** Add breadcrumb configuration for all routes
- [ ] **9.2.9** Test navigation between routes

### 9.3 Context Providers
- [ ] **9.3.1** Create `ProjectContext` in `frontend/src/contexts/ProjectContext.tsx`
- [ ] **9.3.2** Create `WorkspaceContext` in `frontend/src/contexts/WorkspaceContext.tsx`
- [ ] **9.3.3** Implement project context with current project data
- [ ] **9.3.4** Implement workspace context with current workspace data
- [ ] **9.3.5** Add permission helpers to contexts
- [ ] **9.3.6** Wrap appropriate routes with context providers
- [ ] **9.3.7** Write tests for contexts

---

## Phase 10: Integration and Testing (Week 6)

### 10.1 Service Integration
- [ ] **10.1.1** Integrate ProjectService with Supabase
- [ ] **10.1.2** Integrate WorkspaceService with Supabase
- [ ] **10.1.3** Integrate SourceControlService with provider implementations
- [ ] **10.1.4** Test all service methods end-to-end
- [ ] **10.1.5** Verify RLS policies work correctly
- [ ] **10.1.6** Test permission checks across all services
- [ ] **10.1.7** Test error handling for all edge cases

### 10.2 Component Integration Tests
- [ ] **10.2.1** Test ProjectsPage with real data
- [ ] **10.2.2** Test CreateProjectDialog with form submission
- [ ] **10.2.3** Test ProjectSettingsDialog with updates
- [ ] **10.2.4** Test WorkspacesPage with real data
- [ ] **10.2.5** Test CreateWorkspaceDialog with form submission
- [ ] **10.2.6** Test WorkspaceSettingsDialog with updates
- [ ] **10.2.7** Test SourceControlConnectionDialog with provider connection
- [ ] **10.2.8** Test CommitDialog with actual commits
- [ ] **10.2.9** Test SyncDialog with actual syncs
- [ ] **10.2.10** Test ConflictResolutionDialog with real conflicts

### 10.3 End-to-End Tests (Cypress/Playwright)
- [ ] **10.3.1** Write E2E test: Create project flow
  - Login
  - Navigate to projects
  - Click create project
  - Fill form
  - Submit
  - Verify project created
- [ ] **10.3.2** Write E2E test: Create workspace flow
  - Navigate to project
  - Click create workspace
  - Fill form
  - Submit
  - Verify workspace created
- [ ] **10.3.3** Write E2E test: Connect to source control
  - Open workspace settings
  - Navigate to source control tab
  - Click connect
  - Complete wizard
  - Verify connected status
- [ ] **10.3.4** Write E2E test: Commit changes
  - Make changes to dataset
  - Open commit dialog
  - Enter commit message
  - Commit
  - Verify no uncommitted changes
- [ ] **10.3.5** Write E2E test: Sync from source control
  - Simulate remote change
  - Click sync
  - Verify changes pulled
- [ ] **10.3.6** Write E2E test: Resolve conflicts
  - Create local change
  - Simulate remote change
  - Attempt sync
  - Resolve conflict
  - Verify resolution
- [ ] **10.3.7** Write E2E test: Project member management
  - Add member
  - Change role
  - Remove member
- [ ] **10.3.8** Write E2E test: Delete project
  - Navigate to project settings
  - Go to advanced tab
  - Enter confirmation
  - Delete
  - Verify deletion

### 10.4 Performance Testing
- [ ] **10.4.1** Test ProjectsPage with 100+ projects
- [ ] **10.4.2** Test WorkspacesPage with 50+ workspaces
- [ ] **10.4.3** Measure commit time for 10+ datasets
- [ ] **10.4.4** Measure sync time for 10+ changed files
- [ ] **10.4.5** Test pagination performance
- [ ] **10.4.6** Test search performance with large datasets
- [ ] **10.4.7** Measure React Query cache hit rates
- [ ] **10.4.8** Profile component render times
- [ ] **10.4.9** Optimize slow queries identified
- [ ] **10.4.10** Optimize slow components identified

### 10.5 Security Testing
- [ ] **10.5.1** Test RLS policies for project isolation
- [ ] **10.5.2** Test RLS policies for workspace isolation
- [ ] **10.5.3** Verify user cannot access other accounts' data
- [ ] **10.5.4** Test permission checks on all mutations
- [ ] **10.5.5** Verify credential encryption/decryption
- [ ] **10.5.6** Test API rate limiting
- [ ] **10.5.7** Test input sanitization
- [ ] **10.5.8** Verify no SQL injection vulnerabilities
- [ ] **10.5.9** Test CSRF protection
- [ ] **10.5.10** Audit all error messages for information leakage

---

## Phase 11: Documentation (Week 6-7)

### 11.1 User Documentation
- [ ] **11.1.1** Write "Getting Started with Projects" guide
  - Creating your first project
  - Understanding project types
  - Configuring project settings
- [ ] **11.1.2** Write "Working with Workspaces" guide
  - What are workspaces
  - Creating workspaces
  - Workspace settings
  - When to use multiple workspaces
- [ ] **11.1.3** Write "Source Control Integration" guide
  - Supported providers
  - Connecting to GitHub
  - Connecting to GitLab
  - Connecting to Bitbucket
  - Connecting to Azure DevOps
  - Understanding sync status
  - Committing changes
  - Syncing from remote
  - Resolving conflicts
  - Best practices
- [ ] **11.1.4** Write "Collaboration Guide"
  - Inviting team members
  - Understanding roles and permissions
  - Working with shared projects
  - Managing access
- [ ] **11.1.5** Write "Troubleshooting Guide"
  - Common connection issues
  - Resolving sync errors
  - Handling conflicts
  - Permission issues
- [ ] **11.1.6** Create video tutorials
  - Creating a project (3 min)
  - Connecting to source control (5 min)
  - Committing and syncing (4 min)
  - Resolving conflicts (3 min)
- [ ] **11.1.7** Create FAQ section
- [ ] **11.1.8** Add inline help tooltips to UI

### 11.2 API Documentation
- [ ] **11.2.1** Generate API docs from TypeScript with TypeDoc
- [ ] **11.2.2** Document all ProjectService methods
- [ ] **11.2.3** Document all WorkspaceService methods
- [ ] **11.2.4** Document all SourceControlService methods
- [ ] **11.2.5** Document all API endpoints
- [ ] **11.2.6** Add code examples for each method
- [ ] **11.2.7** Document error responses
- [ ] **11.2.8** Create Postman collection for API testing
- [ ] **11.2.9** Publish API documentation

### 11.3 Developer Documentation
- [ ] **11.3.1** Write architecture overview
  - System components
  - Data flow diagrams
  - Service layer architecture
  - State management strategy
- [ ] **11.3.2** Document source control provider abstraction
  - Provider interface
  - Adding new providers
  - Rate limiting strategy
- [ ] **11.3.3** Document database schema
  - ER diagram
  - Table descriptions
  - RLS policies
  - Indexes
- [ ] **11.3.4** Write component documentation
  - Component hierarchy
  - Props documentation
  - State management
  - Styling approach
- [ ] **11.3.5** Create ADRs (Architecture Decision Records)
  - ADR-001: Multi-Provider Source Control Abstraction
  - ADR-002: Database-First Approach
  - ADR-003: Optional Source Control Integration
  - ADR-004: Zustand for UI State
  - ADR-005: React Query for Server State
- [ ] **11.3.6** Write deployment guide
  - Environment variables
  - Database migration steps
  - Source control provider setup
  - Monitoring setup
- [ ] **11.3.7** Create contributing guide
  - Code style
  - Testing requirements
  - PR process
  - Branch naming conventions
- [ ] **11.3.8** Document security practices
  - Credential encryption
  - RLS implementation
  - Input validation
  - Rate limiting

### 11.4 Code Comments and JSDoc
- [ ] **11.4.1** Add JSDoc comments to all service methods
- [ ] **11.4.2** Add JSDoc comments to all hooks
- [ ] **11.4.3** Add comments to complex algorithms
- [ ] **11.4.4** Document component props with JSDoc
- [ ] **11.4.5** Add inline comments for non-obvious code
- [ ] **11.4.6** Review and improve existing comments

---

## Phase 12: Polish and Optimization (Week 7)

### 12.1 UI/UX Refinements
- [ ] **12.1.1** Conduct UI/UX review of all components
- [ ] **12.1.2** Ensure consistent spacing and alignment
- [ ] **12.1.3** Verify color scheme consistency
- [ ] **12.1.4** Improve button states (hover, active, disabled)
- [ ] **12.1.5** Enhance form validation feedback
- [ ] **12.1.6** Add smooth transitions and animations
- [ ] **12.1.7** Implement skeleton loaders for all loading states
- [ ] **12.1.8** Improve empty state designs
- [ ] **12.1.9** Enhance error message clarity
- [ ] **12.1.10** Add success confirmations with appropriate icons
- [ ] **12.1.11** Improve modal dialog designs
- [ ] **12.1.12** Add contextual help where needed
- [ ] **12.1.13** Verify responsive layouts for tablets
- [ ] **12.1.14** Test keyboard navigation
- [ ] **12.1.15** Improve accessibility (ARIA labels, focus management)

### 12.2 Performance Optimization
- [ ] **12.2.1** Audit and reduce bundle size
- [ ] **12.2.2** Implement code splitting for heavy components
- [ ] **12.2.3** Optimize React Query cache configuration
- [ ] **12.2.4** Add React.memo to frequently re-rendering components
- [ ] **12.2.5** Optimize list rendering with virtualization where needed
- [ ] **12.2.6** Debounce expensive operations (search, filter)
- [ ] **12.2.7** Optimize database queries (use explain analyze)
- [ ] **12.2.8** Add database query result caching
- [ ] **12.2.9** Optimize source control API calls (batch where possible)
- [ ] **12.2.10** Profile and optimize slow components
- [ ] **12.2.11** Measure and improve time to interactive
- [ ] **12.2.12** Optimize image loading

### 12.3 Error Handling Improvements
- [ ] **12.3.1** Review all error handling code
- [ ] **12.3.2** Ensure all errors are caught and logged
- [ ] **12.3.3** Improve error messages for users
- [ ] **12.3.4** Add retry logic for transient failures
- [ ] **12.3.5** Implement exponential backoff for retries
- [ ] **12.3.6** Add circuit breaker for external APIs
- [ ] **12.3.7** Create user-friendly error pages
- [ ] **12.3.8** Add error recovery mechanisms
- [ ] **12.3.9** Improve network error detection
- [ ] **12.3.10** Add offline mode detection

### 12.4 Monitoring and Observability
- [ ] **12.4.1** Setup error tracking (Sentry or similar)
- [ ] **12.4.2** Implement metrics collection (Prometheus or similar)
- [ ] **12.4.3** Create dashboards for key metrics
- [ ] **12.4.4** Setup alerting for critical errors
- [ ] **12.4.5** Implement health check endpoint
- [ ] **12.4.6** Add logging for all critical operations
- [ ] **12.4.7** Setup log aggregation (ELK or similar)
- [ ] **12.4.8** Monitor API response times
- [ ] **12.4.9** Track user actions for analytics
- [ ] **12.4.10** Monitor source control API usage and rate limits

### 12.5 Security Hardening
- [ ] **12.5.1** Review all security practices
- [ ] **12.5.2** Ensure credentials are properly encrypted
- [ ] **12.5.3** Verify RLS policies are comprehensive
- [ ] **12.5.4** Test input validation on all inputs
- [ ] **12.5.5** Implement rate limiting on all APIs
- [ ] **12.5.6** Add CAPTCHA if needed
- [ ] **12.5.7** Enable CORS properly
- [ ] **12.5.8** Add Content Security Policy headers
- [ ] **12.5.9** Enforce HTTPS everywhere
- [ ] **12.5.10** Audit all sensitive operations
- [ ] **12.5.11** Implement session timeout
- [ ] **12.5.12** Conduct security audit

---

## Phase 13: Deployment Preparation (Week 7-8)

### 13.1 Environment Configuration
- [ ] **13.1.1** Document all environment variables
- [ ] **13.1.2** Create `.env.example` file
- [ ] **13.1.3** Setup environment variables for development
- [ ] **13.1.4** Setup environment variables for staging
- [ ] **13.1.5** Setup environment variables for production
- [ ] **13.1.6** Verify encryption keys are properly configured
- [ ] **13.1.7** Configure source control provider credentials storage
- [ ] **13.1.8** Setup Supabase connection for each environment
- [ ] **13.1.9** Verify API keys for all services

### 13.2 Database Deployment
- [ ] **13.2.1** Create production database migration scripts
- [ ] **13.2.2** Test migrations on staging database
- [ ] **13.2.3** Create rollback scripts
- [ ] **13.2.4** Setup automated database backups
- [ ] **13.2.5** Configure backup retention policy
- [ ] **13.2.6** Test database restore procedure
- [ ] **13.2.7** Document migration process
- [ ] **13.2.8** Create database maintenance scripts

### 13.3 CI/CD Pipeline
- [ ] **13.3.1** Setup GitHub Actions or similar CI/CD
- [ ] **13.3.2** Configure automated testing in pipeline
- [ ] **13.3.3** Add code quality checks (ESLint, Prettier)
- [ ] **13.3.4** Add TypeScript type checking
- [ ] **13.3.5** Configure automated builds
- [ ] **13.3.6** Setup staging deployment
- [ ] **13.3.7** Setup production deployment with approval
- [ ] **13.3.8** Add automated rollback capability
- [ ] **13.3.9** Configure deployment notifications
- [ ] **13.3.10** Test full CI/CD pipeline

### 13.4 Infrastructure Setup
- [ ] **13.4.1** Choose hosting platform (Vercel, AWS, GCP, etc.)
- [ ] **13.4.2** Setup frontend hosting
- [ ] **13.4.3** Setup backend API hosting (if separate)
- [ ] **13.4.4** Configure domain and SSL certificate
- [ ] **13.4.5** Setup CDN for static assets
- [ ] **13.4.6** Configure load balancing (if needed)
- [ ] **13.4.7** Setup monitoring infrastructure
- [ ] **13.4.8** Configure log storage and rotation
- [ ] **13.4.9** Setup backup storage
- [ ] **13.4.10** Test disaster recovery procedures

### 13.5 Pre-Launch Checklist
- [ ] **13.5.1** Run full test suite
- [ ] **13.5.2** Perform security audit
- [ ] **13.5.3** Test all user workflows
- [ ] **13.5.4** Verify all integrations work
- [ ] **13.5.5** Test performance under load
- [ ] **13.5.6** Verify monitoring and alerting
- [ ] **13.5.7** Check all documentation is complete
- [ ] **13.5.8** Ensure backup procedures are tested
- [ ] **13.5.9** Verify rollback capability
- [ ] **13.5.10** Get stakeholder sign-off

---

## Phase 14: Launch and Post-Launch (Week 8)

### 14.1 Soft Launch
- [ ] **14.1.1** Deploy to production
- [ ] **14.1.2** Run smoke tests on production
- [ ] **14.1.3** Invite beta users
- [ ] **14.1.4** Monitor system closely for 48 hours
- [ ] **14.1.5** Collect initial user feedback
- [ ] **14.1.6** Fix critical issues immediately
- [ ] **14.1.7** Monitor error rates
- [ ] **14.1.8** Track key metrics

### 14.2 Full Launch
- [ ] **14.2.1** Announce launch to all users
- [ ] **14.2.2** Publish user documentation
- [ ] **14.2.3** Enable all features
- [ ] **14.2.4** Monitor system health
- [ ] **14.2.5** Respond to user support requests
- [ ] **14.2.6** Track adoption metrics
- [ ] **14.2.7** Collect user feedback
- [ ] **14.2.8** Plan iteration based on feedback

### 14.3 Post-Launch Monitoring
- [ ] **14.3.1** Daily monitoring of error rates
- [ ] **14.3.2** Weekly review of user feedback
- [ ] **14.3.3** Monthly review of performance metrics
- [ ] **14.3.4** Track feature usage
- [ ] **14.3.5** Monitor source control API usage
- [ ] **14.3.6** Review database performance
- [ ] **14.3.7** Check backup success rates
- [ ] **14.3.8** Document lessons learned

---

## Success Metrics

### Quantitative Metrics
- [ ] **Projects Module**:
  - Project creation time < 2 seconds
  - 95% of projects created successfully
  - User can find projects with search in < 1 second
  
- [ ] **Workspaces Module**:
  - Workspace creation time < 2 seconds
  - 95% of workspaces created successfully
  
- [ ] **Source Control Integration**:
  - Connection success rate > 95%
  - Commit time < 5 seconds for 10 datasets
  - Sync time < 10 seconds for 10 changed files
  - Conflict resolution time < 3 minutes
  - Source control API error rate < 2%

### Qualitative Metrics
- [ ] User satisfaction score > 4.0/5.0
- [ ] Documentation clarity score > 4.0/5.0
- [ ] Fewer than 5 critical bugs in first month
- [ ] Positive feedback on source control integration
- [ ] Users successfully resolve conflicts without support

---

## Risk Mitigation

### Technical Risks
- [ ] **Source Control Provider API Changes**
  - Mitigation: Abstract provider interface, monitor changelogs
  
- [ ] **Rate Limiting Issues**
  - Mitigation: Implement robust rate limiter, queue requests
  
- [ ] **Conflict Resolution Complexity**
  - Mitigation: Comprehensive testing, clear UI guidance
  
- [ ] **Credential Security**
  - Mitigation: Encryption at rest, secure storage, audit logging

### Operational Risks
- [ ] **Data Loss**
  - Mitigation: Automated backups, tested restore procedures
  
- [ ] **Performance Degradation**
  - Mitigation: Load testing, monitoring, auto-scaling
  
- [ ] **User Adoption**
  - Mitigation: Clear documentation, video tutorials, support

---

## Estimated Effort

**Total Estimated Hours**: 280-360 hours

**Breakdown by Phase**:
- Phase 1 (Database): 16-20 hours
- Phase 2 (Types): 8-12 hours
- Phase 3 (Providers): 40-50 hours
- Phase 4 (Services): 40-50 hours
- Phase 5 (Hooks): 16-20 hours
- Phase 6 (Projects UI): 40-50 hours
- Phase 7 (Workspaces UI): 32-40 hours
- Phase 8 (Source Control UI): 32-40 hours
- Phase 9 (State/Routing): 12-16 hours
- Phase 10 (Testing): 24-32 hours
- Phase 11 (Documentation): 16-20 hours
- Phase 12 (Polish): 16-20 hours
- Phase 13 (Deployment): 12-16 hours
- Phase 14 (Launch): 8-12 hours

**Timeline**: 7-8 weeks for single developer, 4-5 weeks for two developers working in parallel

---

## Notes

- This task list focuses exclusively on Projects and Workspaces management
- Source control integration is optional but highly recommended
- All tasks should be completed in order within each phase
- Unit tests should be written alongside implementation
- Integration and E2E tests can be written after basic implementation is complete
- Documentation should be updated continuously, not left to the end
- Each phase should include a review checkpoint before moving to the next
- Consider breaking large tasks into smaller subtasks as needed
- Use feature flags to enable gradual rollout
- Maintain changelog for all changes