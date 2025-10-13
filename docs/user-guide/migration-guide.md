# Migration Guide - Version 1.x to 2.0

This guide helps users migrate from Bricker 1.x (node-based architecture) to Bricker 2.0 (refactored dataset-based architecture with multi-tenancy).

## What's Changed

### Major Changes

#### 1. Multi-Tenant Architecture
- **Before**: Single-tenant, all users see everything
- **After**: Company-based isolation, subscription tiers, access control

#### 2. Terminology
- **Node** → **Dataset**
- **NodeItem** → **Column**
- **Relationship** → **Column Reference**
- **Branch** → **Workspace** (still maps to Git branch)

#### 3. References Storage
- **Before**: Separate `relationships` table
- **After**: References stored on `columns` table with `reference_column_id`

#### 4. Source Control Workflow
- **Before**: Git-first (edit YAML, sync to database)
- **After**: Database-first (edit database, commit to Git)

#### 5. Shared Resources
- **Before**: Datasets belong to one project
- **After**: Datasets can be shared across projects via mapping tables

### Breaking Changes

#### API Changes
- Endpoints renamed: `/api/nodes/*` → `/api/datasets/*`
- Endpoints renamed: `/api/node-items/*` → `/api/columns/*`
- Endpoints removed: `/api/relationships/*` (use column references)
- New endpoints: `/api/source-control-sync/*`

#### Database Schema
- Table renamed: `nodes` → `datasets`
- Table renamed: `node_items` → `columns`
- Table renamed: `node_lineage` → `lineage`
- Table renamed: `branches` → `workspaces`
- Table renamed: `git_commits` → `source_control_commits`
- Table removed: `relationships` (merged into `columns`)
- Tables added: `companies`, `company_users`, `project_datasets`, `workspace_datasets`

#### UI Changes
- Component renamed: `DataNode` → `DatasetNode`
- Component renamed: `NodeEditorDialog` → `DatasetEditorDialog`
- New components: `SourceControlSyncPanel`, `UncommittedChangesDialog`

## Migration Steps

### Step 1: Understand the New Structure

**Old Structure:**
```
User
└── Project
     └── Branch
          └── Nodes (Tables)
               └── NodeItems (Columns)
               └── Relationships (FKs)
```

**New Structure:**
```
Company
└── Users (with roles)
     └── Projects
          └── Workspaces (Branches)
               └── Datasets (on canvas with positions)
                    └── Columns (with references)
                    └── Lineage (data flow)
```

### Step 2: Automatic Migration

When you upgrade to 2.0, automatic migration runs:

**Database Migration:**
1. ✅ Tables renamed (nodes → datasets, etc.)
2. ✅ Company created for your account
3. ✅ User assigned to company
4. ✅ Projects assigned `company_id`
5. ✅ Datasets assigned `company_id`
6. ✅ Relationships converted to column references
7. ✅ Mapping tables populated

**Data Preserved:**
- ✅ All your projects
- ✅ All your datasets (formerly nodes)
- ✅ All your columns (formerly node items)
- ✅ All your lineage
- ✅ All your relationships (as column references)

### Step 3: Review Your Data

**Check Projects:**
1. Go to Dashboard
2. Verify all projects appear
3. Verify project ownership

**Check Workspaces:**
1. Open each project
2. Verify workspaces (formerly branches)
3. Verify Git connections still work

**Check Datasets:**
1. Open each workspace
2. Verify datasets appear on canvas
3. Verify canvas positions preserved

**Check Columns:**
1. Open dataset editor
2. Verify all columns present
3. Verify data types correct

**Check References:**
1. Go to dataset editor → References tab
2. Verify relationships converted to column references
3. Verify reference types (FK, BusinessKey, etc.)

### Step 4: Update Source Control

**If Using Git Integration:**

**Old Workflow:**
1. Edit YAML files in Git
2. Sync to database

**New Workflow:**
1. Edit datasets in database (UI)
2. Commit to Git (UI)

**Migration:**
1. Your existing YAML files remain valid
2. Git connection preserved
3. Initial sync pulls from Git
4. Future edits use database-first

**Steps:**
1. Go to Workspace Settings → Source Control
2. Verify connection still works
3. Click **"Test Connection"**
4. Click **"Pull from Git"** to sync latest
5. Going forward, edit in UI and commit

### Step 5: Update Integrations

**If You Have:**

**Custom Scripts:**
- Update API endpoints
- Update table names
- Update column references

**Before:**
```sql
SELECT * FROM nodes WHERE project_id = 'proj_123';
SELECT * FROM node_items WHERE node_id = 'node_123';
```

**After:**
```sql
SELECT * FROM datasets WHERE project_id = 'proj_123';
SELECT * FROM columns WHERE dataset_id = 'ds_123';
```

**API Calls:**
```javascript
// Before
fetch('/api/nodes/node_123')
fetch('/api/relationships?source_id=node_123')

// After
fetch('/api/datasets/ds_123')
fetch('/api/columns?dataset_id=ds_123')
// References are on columns now
```

**Webhooks:**
- Update webhook URLs
- Update payload structure
- Test webhook delivery

### Step 6: Set Up Company

**Individual Users:**
- Company auto-created
- Named after your email
- Free tier by default
- No action needed

**Team Users:**
1. Go to Settings → Company
2. Upgrade to Pro or Enterprise
3. Invite team members
4. Assign roles (admin/member)
5. Configure access control

### Step 7: Configure Access Control

**Set Dataset Visibility:**
1. Open dataset editor
2. Go to Properties tab
3. Set visibility:
   - **Public**: Team can see
   - **Private**: Only you and admins
   - **Locked**: Read-only for team

**Share Datasets:**
1. Create dataset in Project A
2. Set visibility: Public
3. Add to Project B:
   - Open Project B
   - Click "Add Existing Dataset"
   - Select dataset from Project A
   - Add to canvas

### Step 8: Test Functionality

**Test Checklist:**

- [ ] Can view all projects
- [ ] Can open workspaces
- [ ] Can see datasets on canvas
- [ ] Can open dataset editor
- [ ] Can see all columns
- [ ] Can see column references (formerly relationships)
- [ ] Can create new datasets
- [ ] Can edit existing datasets
- [ ] Can commit to Git
- [ ] Can pull from Git
- [ ] Can view commit history
- [ ] Can invite team members (Pro/Enterprise)
- [ ] Can share datasets across projects

**If Issues:**
- Check migration log (Settings → Migration Status)
- Contact support with specifics
- We'll help resolve any issues

## New Features to Explore

### 1. Source Control Sync

**Try It:**
1. Make changes to datasets
2. See uncommitted changes indicator
3. Click "Source Control" icon
4. Review changes
5. Commit with message
6. See commit in Git

**Benefits:**
- Real-time collaboration
- Change tracking
- Rollback capability

### 2. Shared Datasets

**Try It:**
1. Create dataset in Project A
2. Set visibility: Public
3. Add to Project B
4. Edit in Project A
5. See changes in Project B

**Benefits:**
- No duplication
- Single source of truth
- Consistent data models

### 3. Column References

**Try It:**
1. Open dataset editor
2. Select column
3. Add reference to another column
4. See visual connection on canvas

**Benefits:**
- References on columns (no separate table)
- Multiple reference types
- Easier to manage

### 4. Access Control

**Try It:**
1. Set dataset visibility
2. Lock production datasets
3. Share with specific users
4. Control who can edit

**Benefits:**
- Data governance
- Prevent accidental changes
- Collaboration control

### 5. Impact Analysis

**Try It:**
1. Select dataset
2. View lineage
3. See upstream sources
4. See downstream targets

**Benefits:**
- Understand dependencies
- Change impact assessment
- Compliance reporting

## FAQ

### Will my data be lost?
**No.** All data is preserved and migrated automatically.

### Do I need to recreate anything?
**No.** Projects, datasets, columns, relationships all migrated.

### Can I rollback to 1.x?
**Yes, for 30 days.** Contact support if needed.

### What if migration fails?
**We help fix it.** Migration includes verification, support available.

### Do I need a new subscription?
**No.** Free tier includes previous features. Upgrade for team features.

### Will Git integration still work?
**Yes.** Git connections preserved, workflow changes to database-first.

### What about my YAML files?
**Still valid.** Can pull from Git initially, then use database-first.

### Do API integrations break?
**Some endpoints changed.** Update to new endpoints (documented).

### Can I use old terminology?
**UI shows new terms.** Old terms documented for reference.

### How long does migration take?
**Few minutes.** Depends on data size, runs automatically.

## Getting Help

### Documentation
- [Getting Started](./getting-started.md)
- [Workspaces and Projects](./workspaces-and-projects.md)
- [Datasets and Lineage](./datasets-and-lineage.md)
- [Source Control Sync](./source-control-sync.md)
- [Multi-Tenancy](./multi-tenancy.md)

### Support
- Migration support: migration@bricker.com
- General support: support@bricker.com
- Documentation: docs.bricker.com
- Community forum: community.bricker.com

### Feedback
We want to hear from you:
- What went well?
- What was confusing?
- What could be better?

Send feedback to feedback@bricker.com

---

**Welcome to Bricker 2.0!** 🎉

We're excited to have you on the new platform. The migration preserves all your work while unlocking powerful new capabilities for team collaboration, data governance, and source control integration.

---

**Last Updated**: 2025-01-15
**Version**: 2.0.0
