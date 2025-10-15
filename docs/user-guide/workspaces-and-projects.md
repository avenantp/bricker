# Workspaces and Projects Guide

This guide explains how to organize your data models using projects and workspaces in Uroq.

## Projects

### What is a Project?

A **project** is a top-level container for organizing related datasets and data models.

**Characteristics:**
- Contains multiple workspaces
- Has its own access control
- Can contain or reference datasets
- Maps to business domain or use case
- Has a specific modeling type

**Examples:**
- "Customer 360" - All customer-related data
- "Sales Analytics" - Sales performance dashboards
- "Data Warehouse" - Enterprise data warehouse
- "ML Feature Store" - Machine learning features

### Creating a Project

**Steps:**
1. Click **"New Project"** on dashboard
2. Fill in project details:
   ```
   Name: Customer 360
   Description: Unified customer data platform
   Type: Dimensional
   Visibility: Public
   ```
3. Click **"Create Project"**

**Project Properties:**

#### Name
- **Required**: Yes
- **Unique**: Within company
- **Format**: Letters, numbers, spaces, hyphens
- **Examples**: "Customer Analytics", "Sales-Dashboard"

#### Description
- **Required**: No
- **Purpose**: Explain the project's purpose
- **Best Practice**: Include business objectives

#### Project Type
- **Standard**: General-purpose data models
- **Data Vault**: Hub-Link-Satellite architecture
- **Dimensional**: Star/snowflake schemas

#### Visibility
- **Public**: All company members can see
- **Private**: Only you and admins can see

### Project Settings

Access settings via project menu → **Settings**.

#### General
- **Name**: Change project name
- **Description**: Update description
- **Type**: Cannot change after creation
- **Owner**: Transfer ownership to another user

#### Access Control
- **Visibility**: Change between public/private/locked
- **Members**: Add/remove project members
- **Roles**: Assign roles (owner, admin, editor, viewer)

#### Source Control
- **Repository**: Git repository for this project
- **Default Branch**: Main branch name
- **Auto-sync**: Automatically sync changes

#### Environments
- **Development**: Dev environment settings
- **Staging**: Staging environment settings
- **Production**: Prod environment settings

### Managing Projects

#### Viewing Projects
1. Dashboard shows all accessible projects
2. Filter by:
   - Owned by me
   - Shared with me
   - Recently accessed
3. Search by name or description

#### Archiving Projects
1. Open project
2. Go to **Settings** → **General**
3. Click **"Archive Project"**
4. Confirm archiving

**Effects:**
- Project removed from active list
- No longer counts toward limits
- Can be restored later
- Datasets remain accessible

#### Deleting Projects
1. Open project
2. Go to **Settings** → **Danger Zone**
3. Click **"Delete Project"**
4. Type project name to confirm
5. Click **"Delete Permanently"**

**⚠️ Warning:**
- Permanently deletes project
- Does NOT delete datasets (they remain shared)
- Deletes workspaces in project
- Cannot be undone

## Workspaces

### What is a Workspace?

A **workspace** represents a Git branch and contains a canvas with dataset visualizations.

**Characteristics:**
- Maps to a source control branch
- Has its own canvas layout
- Contains positioned datasets
- Independent of other workspaces
- Can sync with Git

**Common Workspace Patterns:**

**Branch-Based:**
```
main → Production-ready models
development → Work in progress
feature/analytics → Feature development
```

**Environment-Based:**
```
production → Production environment
staging → Staging environment
development → Development environment
```

**User-Based:**
```
john-sandbox → John's experimental work
team-shared → Shared team workspace
```

### Creating a Workspace

**Steps:**
1. Open a project
2. Click **"New Workspace"**
3. Fill in workspace details:
   ```
   Name: development
   Description: Development workspace for team
   Source Control Branch: develop
   Visibility: Public
   ```
4. Click **"Create Workspace"**

**Workspace Properties:**

#### Name
- **Required**: Yes
- **Unique**: Within project
- **Best Practice**: Match Git branch name
- **Examples**: "main", "development", "feature-customer-segmentation"

#### Description
- **Required**: No
- **Purpose**: Explain workspace purpose
- **Example**: "Development workspace for analytics team"

#### Source Control
- **Branch**: Git branch this workspace syncs with
- **Repository**: Inherited from project
- **Auto-sync**: Sync on changes

#### Canvas
- **Layout**: Saved positions of datasets
- **Zoom Level**: Canvas zoom state
- **View Settings**: Grid, snap-to-grid, etc.

### Working with the Canvas

#### Canvas Basics

**Navigation:**
- **Zoom In/Out**: Mouse wheel or +/- buttons
- **Pan**: Click and drag canvas
- **Fit to Screen**: Double-click canvas
- **Select All**: Ctrl/Cmd + A

**Dataset Operations:**
- **Add Dataset**: Right-click → "Add Dataset"
- **Move Dataset**: Drag to new position
- **Select Multiple**: Ctrl/Cmd + Click
- **Delete Dataset**: Select → Delete key

**Layout Options:**
- **Auto-Layout**: Automatically arrange datasets
- **Grid Snap**: Snap to grid when moving
- **Alignment Guides**: Visual alignment helpers
- **Zoom Levels**: 10% to 200%

#### Canvas Layout Strategies

**Left-to-Right Flow:**
```
[Source] → [Bronze] → [Silver] → [Gold]
```
- Sources on left
- Transformations in middle
- Targets on right
- Clear data flow direction

**Layered Layout:**
```
[Raw Layer]
[Bronze Layer]
[Silver Layer]
[Gold Layer]
```
- Layers stacked vertically
- Each layer grouped together
- Clear medallion architecture

**Star Schema Layout:**
```
      [Dim1]
         ↓
[Dim2] → [Fact] → [Dim3]
         ↓
      [Dim4]
```
- Fact table in center
- Dimensions around edges
- Clear star pattern

#### Canvas Features

**Minimap:**
- Shows overview of entire canvas
- Navigate large canvases quickly
- Indicates current viewport

**Search:**
- Find datasets by name
- Jump to dataset on canvas
- Highlight search results

**Filters:**
- Filter by medallion layer
- Filter by entity type
- Filter by sync status
- Show/hide specific datasets

**Colors:**
- Raw: Red
- Bronze: Orange
- Silver: Silver/Gray
- Gold: Gold/Yellow
- Custom colors per dataset

### Workspace Settings

Access via workspace menu → **Settings**.

#### General
- **Name**: Change workspace name
- **Description**: Update description
- **Owner**: Transfer ownership

#### Canvas
- **Grid Size**: Grid spacing (pixels)
- **Snap to Grid**: Enable/disable snapping
- **Show Grid**: Show/hide grid lines
- **Default Zoom**: Starting zoom level

#### Source Control
- **Branch**: Git branch to sync with
- **Auto-sync**: Automatically pull/push
- **Sync Interval**: How often to check for changes
- **Conflict Strategy**: How to handle conflicts

#### Permissions
- **Members**: Who can access this workspace
- **Default Role**: Role for new members
- **Lock Canvas**: Prevent layout changes

### Managing Workspaces

#### Switching Workspaces
1. Click workspace dropdown
2. See list of all workspaces in project
3. Click workspace to switch

**Keyboard Shortcut:** Ctrl/Cmd + K → Type workspace name

#### Cloning Workspaces
1. Open workspace
2. Go to **Actions** → **Clone Workspace**
3. Enter new workspace name
4. Choose what to copy:
   - Canvas layout (positions)
   - Settings
   - Source control connection
5. Click **"Clone"**

**Use Cases:**
- Create feature branch workspace from main
- Create personal sandbox from team workspace
- Create backup before major changes

#### Comparing Workspaces
1. Select two workspaces
2. Click **"Compare"**
3. See differences:
   - Datasets added/removed
   - Datasets modified
   - Lineage changes
   - Canvas layout differences

**Use Cases:**
- Compare development to production
- Review changes before merging
- Understand branch divergence

## Project-Workspace Hierarchy

### Understanding the Hierarchy

```
Company
  └── Project
       ├── Workspace 1 (main branch)
       │    ├── Dataset A on canvas
       │    └── Dataset B on canvas
       ├── Workspace 2 (dev branch)
       │    ├── Dataset A on canvas (different position)
       │    └── Dataset C on canvas
       └── Workspace 3 (feature branch)
            └── Dataset D on canvas
```

**Key Points:**
- Projects contain workspaces
- Workspaces contain canvas layouts
- Same dataset can appear in multiple workspaces
- Canvas positions are workspace-specific

### Sharing Datasets

**Across Projects:**
- Dataset created in Project A
- Can be added to Project B
- Both projects reference same dataset

**Across Workspaces:**
- Dataset created in Workspace 1
- Automatically available in all workspaces in same project
- Each workspace has own canvas position

**Example:**
```
Project: Customer Analytics
├── Workspace: main
│    └── dim_customer (position: 100, 100)
├── Workspace: development
│    └── dim_customer (position: 200, 150)
└── Workspace: feature-segmentation
     └── dim_customer (position: 300, 200)
```
- Same dim_customer dataset
- Different positions per workspace
- Changes to dataset reflected everywhere

## Best Practices

### Project Organization

**Naming:**
```
✅ Good:
- Customer Analytics
- Sales Dashboard
- Data Warehouse

❌ Bad:
- project1
- new_project
- TEST
```

**Structure:**
```
Company: Acme Corp
├── Customer 360 (customer data)
├── Sales Analytics (sales data)
├── Finance Reporting (finance data)
└── Data Warehouse (enterprise warehouse)
```

**Criteria for Separate Projects:**
- Different business domains
- Different teams/ownership
- Different source control repositories
- Different deployment targets

### Workspace Strategy

**Branch Mapping:**
```
main workspace → main branch (production)
development workspace → develop branch
feature/* workspaces → feature/* branches
```

**Environment Mapping:**
```
production workspace → Production environment
staging workspace → Staging environment
development workspace → Development environment
```

**Best Practices:**
- Keep workspace names consistent with Git branches
- Use descriptive names
- Archive unused workspaces
- Document workspace purposes

### Canvas Management

**Organization:**
- Group related datasets
- Maintain consistent layout across workspaces
- Use colors to indicate layers
- Keep canvas clean and readable

**Positioning:**
- Align datasets in rows/columns
- Use consistent spacing
- Group by medallion layer or entity type
- Leave room for growth

**Maintenance:**
- Regularly clean up unused datasets
- Update positions after adding datasets
- Use auto-layout for initial placement
- Save canvas as image for documentation

## Troubleshooting

### Cannot create workspace
**Cause:** At subscription limit
**Solution:** Archive unused workspaces or upgrade subscription

### Workspace sync failing
**Cause:** Git branch doesn't exist
**Solution:** Create branch in Git first, then connect workspace

### Canvas layout reset
**Cause:** Browser cache cleared
**Solution:** Canvas layout saved in database, reload page

### Dataset not appearing in workspace
**Cause:** Dataset not added to project
**Solution:** Add dataset to project first, then add to canvas

## Getting Help

- See [Getting Started](./getting-started.md)
- See [Datasets and Lineage](./datasets-and-lineage.md)
- See [Source Control Sync](./source-control-sync.md)
- Contact support at support@uroq.com

---

**Next:** [Datasets and Lineage Guide](./datasets-and-lineage.md)
