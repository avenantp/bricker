# Migration Task List - Refactored Architecture

## Overview
This document tracks the migration from the current node-based architecture to the refactored dataset-based architecture with database-first Git sync pattern and **MULTI-TENANT SUBSCRIPTION SYSTEM**.

**Key Architectural Changes**:
1. **References/Relationships table ELIMINATED**: References are now stored directly on the `columns` table via a `reference_column_id` self-referencing foreign key.
2. **Multi-Tenant Subscription System**: All metadata is isolated by `company_id` with subscription-based access control.
3. **Shared Resources**: Datasets can be shared across projects and workspaces via mapping tables.
4. **Multi-Level Security**: Project, workspace, and dataset-level security with ownership and visibility controls.

---

## Phase M.0: Multi-Tenant Foundation (NEW)

### M.0.1 Create Companies and Multi-Tenant Structure ⭐ NEW
- [ ] Create `companies` table with subscription fields
- [ ] Update `users` table to add `company_id` and `company_role`
- [ ] Add RLS policies for company isolation
- [ ] Create indexes for multi-tenant queries
- [ ] Test company isolation

**Files**: `backend/migrations/M_0_1_create_companies_and_multi_tenancy.sql`


**SQL Tasks**:
- CREATE TABLE companies with subscription fields
- ALTER TABLE users ADD COLUMN company_id
- ALTER TABLE users ADD COLUMN company_role
- CREATE RLS policies on users table
- CREATE indexes on companies and users

### M.0.2 Add Multi-Tenancy to Core Tables ⭐ NEW
- [ ] Add `company_id` to `projects` table
- [ ] Add `owner_id` and `visibility` to `projects` table
- [ ] Add `company_id` to `workspaces` table
- [ ] Add `owner_id` and `visibility` to `workspaces` table
- [ ] Add `company_id` to `datasets` table
- [ ] Add `owner_id` and `visibility` to `datasets` table
- [ ] Create RLS policies for all tables
- [ ] Test isolation and access control

**Files**: `backend/migrations/M_0_2_add_multi_tenancy_to_core_tables.sql`

**SQL Tasks**:
- ALTER TABLE projects ADD COLUMN company_id, owner_id, visibility, is_locked
- ALTER TABLE workspaces ADD COLUMN company_id, owner_id, visibility, is_locked
- ALTER TABLE datasets ADD COLUMN company_id, owner_id, visibility, is_locked
- CREATE RLS policies on projects, workspaces, datasets
- CREATE indexes on company_id, owner_id, visibility

### M.0.3 Create Mapping Tables for Shared Resources ⭐ NEW
- [ ] Create `project_datasets` mapping table
- [ ] Create `workspace_datasets` mapping table
- [ ] Add canvas_position to workspace_datasets
- [ ] Create indexes on mapping tables
- [ ] Create RLS policies for mapping tables
- [ ] Test shared resource queries

**Files**: `backend/migrations/M_0_3_create_mapping_tables.sql`

**SQL Tasks**:
- CREATE TABLE project_datasets (project_id, dataset_id, added_at, added_by)
- CREATE TABLE workspace_datasets (workspace_id, dataset_id, canvas_position, added_at, added_by)
- CREATE RLS policies on mapping tables
- CREATE indexes on mapping tables

---

## Phase M.1: Database Migration

### M.1.1 Rename Core Tables �
- [ ] Create SQL migration script
- [ ] Rename `nodes` � `datasets` (if exists)
- [ ] Rename `node_items` � `columns` (if exists)
- [ ] Rename `node_lineage` � `lineage` (if exists)
- [ ] Rename `branches` � `workspaces` (if exists)
- [ ] Test migration on development database

**Files**: `backend/migrations/M_1_1_rename_tables.sql`

### M.1.2 Add Reference Columns to columns Table �
- [ ] Add `reference_column_id UUID` column
- [ ] Add `reference_type VARCHAR` column
- [ ] Add `reference_description TEXT` column
- [ ] Add check constraint for `reference_type`
- [ ] Create index on `reference_column_id`
- [ ] Add foreign key constraint (self-referencing)

**Files**: `backend/migrations/M_1_2_add_reference_columns.sql`

### M.1.3 Add Git Sync Columns to datasets Table �
- [ ] Add `github_file_path VARCHAR`
- [ ] Add `github_commit_sha VARCHAR`
- [ ] Add `has_uncommitted_changes BOOLEAN DEFAULT false`
- [ ] Add `last_synced_at TIMESTAMP`
- [ ] Add `sync_status VARCHAR DEFAULT 'synced'`
- [ ] Add `sync_error_message TEXT`
- [ ] Create indexes on sync columns

**Files**: `backend/migrations/M_1_3_add_git_sync_columns.sql`

### M.1.4 Create New Tables �
- [ ] Create `git_commits` table
- [ ] Create `metadata_changes` table (with `entity_type` excluding 'reference')
- [ ] Create all indexes
- [ ] Test table creation

**Files**: `backend/migrations/M_1_4_create_new_tables.sql`

### M.1.5 Update Indexes and Constraints �
- [ ] Add indexes on `datasets` table
- [ ] Add indexes on `columns` table
- [ ] Add indexes on `lineage` table
- [ ] Add check constraints for enums
- [ ] Test query performance

**Files**: `backend/migrations/M_1_5_update_indexes.sql`

### M.1.6 Migrate Existing Data �
- [ ] Mark all datasets as uncommitted
- [ ] Generate initial YAML files
- [ ] Create initial Git commit
- [ ] Update sync status
- [ ] Verify data integrity

**Files**: `backend/migrations/M_1_6_migrate_data.sql`

---

## Phase M.2: Code Migration

### M.2.1 Update TypeScript Interfaces ✅
- [x] Rename `Node` → `Dataset` in `frontend/src/types/`
- [x] Rename `NodeItem` → `Column`
- [x] Remove `Relationship` interface
- [x] Add reference properties to `Column` interface
- [x] Add Git sync properties to `Dataset` interface
- [x] Create lineage types (separate from column)
- [x] Create central index.ts for exports

**Files**:
- `frontend/src/types/dataset.ts` ✅ Created
- `frontend/src/types/column.ts` ✅ Created
- `frontend/src/types/lineage.ts` ✅ Created
- `frontend/src/types/index.ts` ✅ Created

### M.2.2 Migrate Service Layer ✅
- [x] Rename `node-service.ts` → `dataset-service.ts`
- [x] Update all CRUD operations
- [x] Add change tracking to mutations
- [x] Remove `relationship-service.ts`
- [x] Update `column-service.ts` to handle references
- [x] Create `git-sync-service.ts`
- [x] Create `yaml-generator.ts`
- [x] Create `yaml-parser.ts`

**Files**:
- `frontend/src/lib/dataset-service.ts` ✅ Created
- `frontend/src/lib/column-service.ts` ✅ Created
- `frontend/src/lib/lineage-service.ts` ✅ Created
- `frontend/src/lib/git-sync-service.ts` ✅ Created
- `frontend/src/lib/yaml-generator.ts` ✅ Created
- `frontend/src/lib/yaml-parser.ts` ✅ Created

### M.2.3 Update Canvas Components ✅
- [x] Rename `DataNode` → `DatasetNode` component
- [x] Keep `RelationshipEdge` for column references (still useful)
- [x] Update `ProjectCanvas` to use DatasetNode
- [x] Add Git sync status badges
- [x] Add uncommitted changes indicators
- [x] Update context menus (DatasetContextMenu)
- [x] Update Canvas components index file

**Files**:
- `frontend/src/components/Canvas/DatasetNode.tsx` ✅ Created
- `frontend/src/components/Canvas/DatasetContextMenu.tsx` ✅ Created
- `frontend/src/components/Canvas/ProjectCanvas.tsx` ✅ Updated
- `frontend/src/components/Canvas/RelationshipEdge.tsx` ✅ Kept (for column references)
- `frontend/src/components/Canvas/index.ts` ✅ Updated
- `frontend/src/types/canvas.ts` ✅ Updated (added sync status fields)

### M.2.4 Update Editor Dialog ✅
- [x] Rename `NodeEditorDialog` → `DatasetEditorDialog`
- [x] Update References tab to show column-level references
- [x] Add Git Sync Status section to Properties tab
- [x] Add History tab with uncommitted changes indicator
- [x] Add Commit Dialog for uncommitted changes
- [x] Update all props and callbacks to use dataset types
- [x] Update terminology throughout (node → dataset)

**Files**:
- `frontend/src/components/Canvas/DatasetEditorDialog.tsx` ✅ Created
- `frontend/src/components/Canvas/index.ts` ✅ Updated

### M.2.5 Create Git Sync UI Components ✅
- [x] Create `GitSyncPanel` component
- [x] Create `UncommittedChangesDialog` component
- [x] Create `ConflictResolutionDialog` component
- [x] Create `GitHistoryPanel` component
- [x] Add to Canvas index exports

**Files**:
- `frontend/src/components/Canvas/GitSyncPanel.tsx` ✅ Created
- `frontend/src/components/Canvas/UncommittedChangesDialog.tsx` ✅ Created
- `frontend/src/components/Canvas/ConflictResolutionDialog.tsx` ✅ Updated
- `frontend/src/components/Canvas/GitHistoryPanel.tsx` ✅ Created
- `frontend/src/components/Canvas/index.ts` ✅ Updated

### M.2.6 Update State Management ✅
- [x] Update React Query hooks for datasets
- [x] Add hooks for Git sync operations
- [x] Update Zustand stores
- [x] Add real-time subscriptions for uncommitted changes

**Files**:
- `frontend/src/hooks/useDatasets.ts` ✅ Created
- `frontend/src/hooks/useGitSync.ts` ✅ Created
- `frontend/src/hooks/useRealtimeSync.ts` ✅ Created
- `frontend/src/store/useStore.ts` ✅ Updated
- `frontend/src/store/types.ts` ✅ Updated

### M.2.7 Update API Routes ✅
- [x] Update all API endpoints
- [x] Add Git sync endpoints
- [x] Add change tracking middleware
- [x] Update error handling

**Files**:
- `backend/src/routes/datasets.ts` ✅ Created
- `backend/src/routes/git-sync.ts` ✅ Created
- `backend/src/middleware/change-tracking.ts` ✅ Created
- `backend/src/middleware/error-handler.ts` ✅ Created
- `backend/src/index.ts` ✅ Updated

### M.2.8 Testing & Validation ✅
- [x] Write unit tests for services
- [x] Write integration tests for Git sync
- [x] Write E2E tests for full workflows
- [x] Performance testing
- [x] Security audit

---

## Phase M.3: Documentation Updates

### M.3.1 Update User Documentation ✅
- [x] Update user guide
- [x] Create Git sync guide
- [x] Update API documentation
- [x] Create migration guide for users

### M.3.2 Update Developer Documentation ✅
- [x] Update architecture diagrams
- [x] Update database schema documentation
- [x] Update component documentation
- [x] Update contribution guide

---

## Phase M.4: Deployment

### M.4.1 Staging Deployment �
- [ ] Deploy database migrations to staging
- [ ] Deploy new code to staging
- [ ] Run smoke tests
- [ ] Gather feedback

### M.4.2 Production Deployment �
- [ ] Schedule maintenance window
- [ ] Create database backup
- [ ] Run migrations
- [ ] Deploy new code
- [ ] Monitor system health
- [ ] Rollback plan ready

---

## Notes

### Key Architectural Changes

#### 1. Multi-Tenant Subscription System (NEW)
- **Company Isolation**: All metadata isolated by `company_id`
  - Individual users: `company_type = 'individual'`
  - Organizations: `company_type = 'organization'`
- **Subscription Tiers**: free | pro | enterprise
- **Access Control**:
  - Company admins: full access to all company resources
  - Resource owners: can edit and change visibility status
  - Members: access based on resource visibility
- **Visibility Levels**:
  - `public`: visible to all members in company
  - `private`: visible only to owner and admins
  - `locked`: read-only except for owner and admins

#### 2. Shared Resources (NEW)
- **Datasets can be shared** across multiple projects and workspaces
- **Mapping Tables**:
  - `project_datasets`: tracks which datasets belong to which projects
  - `workspace_datasets`: tracks which datasets appear in which workspaces (with canvas positions)
- **Benefits**:
  - Reuse datasets across projects without duplication
  - Same dataset can appear in multiple workspaces with different positions
  - Centralized dataset management

#### 3. Multi-Level Security (NEW)
- **Project-Level Security**: Projects have owners and visibility
- **Workspace-Level Security**: Workspaces have owners and visibility
- **Dataset-Level Security**: Datasets have owners and visibility
- **Row-Level Security (RLS)**: Enforced in database via Supabase policies
- **Access Hierarchy**:
  1. Admins have full access to everything in their company
  2. Owners can modify and change visibility of their resources
  3. Public resources are visible to all company members
  4. Private resources are visible only to owner and admins
  5. Locked resources are read-only except for owner and admins

#### 4. No Separate References Table
- References are now column properties
  - Each column can have `reference_column_id` pointing to another column
  - Reference types: FK, BusinessKey, NaturalKey
  - Composite keys: Multiple columns each reference their corresponding target column

#### 5. Database-First Pattern
- Supabase is primary source of truth
  - Real-time editing in database
  - Explicit commits to Git
  - Bidirectional sync

#### 6. Git Sync Columns
- Track sync status on datasets
  - `has_uncommitted_changes`
  - `sync_status`
  - `github_commit_sha`

#### 7. Change Tracking
- Full audit trail in `metadata_changes` table
  - entity_type values: 'dataset', 'column', 'lineage' (NO 'reference')

### Migration Order
1. **PHASE M.0**: Multi-tenant foundation (M.0.1 → M.0.3) - MUST RUN FIRST
2. **PHASE M.1**: Database migrations (M.1.1 → M.1.6)
3. **PHASE M.2**: Code migrations (M.2.1 → M.2.8)
4. **PHASE M.3**: Documentation (M.3.1 → M.3.2)
5. **PHASE M.4**: Deployment (M.4.1 → M.4.2)
6. Code can be migrated incrementally with feature flags
7. Test thoroughly at each step
8. Maintain rollback capability

### Testing Checklist
- [ ] All migrations run successfully
- [ ] No data loss
- [ ] **Company isolation working correctly**
- [ ] **RLS policies enforcing access control**
- [ ] **Shared resources working (datasets in multiple projects/workspaces)**
- [ ] **Visibility levels (public/private/locked) working**
- [ ] **Admin vs owner vs member permissions correct**
- [ ] References converted correctly
- [ ] Git sync works bidirectionally
- [ ] Conflict resolution functional
- [ ] Performance acceptable (with company_id indexes)
- [ ] Security validated (RLS policies tested)
- [ ] **Subscription limits enforced**
- [ ] **Individual vs organization companies working**

### Multi-Tenant Hierarchy
```
Company (company_id)
  ├── Users (with company_role: admin | member)
  ├── Projects (with owner_id, visibility)
  │   └── Project-Dataset Mappings
  ├── Workspaces (with owner_id, visibility)
  │   └── Workspace-Dataset Mappings (with canvas positions)
  └── Datasets (with owner_id, visibility)
      ├── Columns (with references)
      └── Lineage
```

### Access Control Examples

**Scenario 1: Company Admin**
- Can see all projects, workspaces, datasets in their company
- Can edit any resource regardless of ownership
- Can change visibility of any resource
- Can manage users and billing

**Scenario 2: Resource Owner**
- Can see their own resources and public resources
- Can edit their own resources
- Can change visibility of their own resources
- Cannot see other users' private resources

**Scenario 3: Regular Member**
- Can see public resources
- Cannot see private resources (unless explicitly granted access)
- Can create new resources (which they own)
- Cannot edit locked resources

**Scenario 4: Shared Dataset**
- Dataset created in Project A by User X
- Dataset is marked as `public`
- User Y adds dataset to Project B (via project_datasets mapping)
- User Z adds dataset to Workspace W in Project B (via workspace_datasets mapping)
- All three users can now see and use the same dataset
- Only User X and admins can edit the dataset (owner control)

### Security Best Practices
1. **Always query with company_id filter** to ensure isolation
2. **Use RLS policies** - never bypass them
3. **Check ownership** before allowing edits
4. **Respect visibility settings** - enforce in queries
5. **Log all access attempts** for audit trail
6. **Validate subscription limits** before allowing operations
7. **Test cross-company isolation** thoroughly
8. **Never expose company_id** to users in URLs (use slugs or opaque IDs)
