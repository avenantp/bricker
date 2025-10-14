# Databricks Metadata Manager - Technical Specification (Refactored)

## 1. Project Overview

### 1.1 Purpose
A React web application for managing metadata used to generate automation scripts for Databricks, featuring visual workflow design, schema modeling, AI-assisted data modeling, and Source-control-based version control.

### 1.2 Technology Stack
- **Frontend**: React with React Flow for diagram visualization
- **Database**: Supabase (PostgreSQL) - Primary source of truth
- **Source Control**: Integrations with GitHub, GitLab, Bitbucket, and Azure DevOps for YAML artifacts and versioning
- **AI Integration**: For metadata discovery, description generation, and modeling assistance

### 1.3 Architecture Pattern
**Database-First with Source Control Sync**:
- Supabase stores all metadata (primary source of truth)
- Users edit metadata in real-time collaborative UI
- Changes tracked in database with audit trail
- Configured source control repositories store YAML representations for version control
- Bidirectional sync: Commit to source control, Pull from source control
- Conflict detection and resolution for concurrent edits

## 2. Data Architecture

### 2.1 Storage Strategy

**Primary Storage (Supabase)**:
- Core application metadata (workspaces, projects, connections, configurations)
- All dataset and column definitions
- References (relationships) between datasets
- Lineage tracking
- Change history and audit logs
- Uncommitted changes tracking
- Source control sync status

**Secondary Storage (Source Control Repositories)**:
- YAML representations of datasets (generated from database)
- Version history through Source control commits
- Code review workflow through Pull Requests
- Backup and disaster recovery
- External editing capability for power users

**Hybrid Workflow**:
1. User creates/edits metadata in UI → Saves to Supabase
2. Changes marked as "uncommitted" in database
3. User reviews uncommitted changes
4. User commits → Generate YAML from database → Push to source control
5. Source control maintains version history
6. Other users can sync from source control to update their database view

### 2.2 Identifier System
- **Fully Qualified Names (FQN)**: Human-readable hierarchical names
- **UUIDs**: Immutable identifiers for lineage tracking
- **Purpose**: Enable renaming while maintaining referential integrity and lineage
- **Scope**: Both Supabase and source control YAML use same UUIDs

## 3. Core Domain Model

### 3.0 Company Entity (Multi-Tenant Root)
```sql
CREATE TABLE companies (
  company_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL,
  company_type VARCHAR NOT NULL, -- 'individual' | 'organization'

  -- Subscription
  subscription_tier VARCHAR DEFAULT 'free', -- free | pro | enterprise
  subscription_status VARCHAR DEFAULT 'active', -- active | suspended | cancelled
  subscription_start_date TIMESTAMP,
  subscription_end_date TIMESTAMP,

  -- Billing
  billing_email VARCHAR,
  billing_address JSONB,

  -- Limits
  max_users INT DEFAULT 1, -- 1 for individual, unlimited for enterprise
  max_projects INT DEFAULT 5,
  max_datasets INT DEFAULT 100,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(name)
);

CREATE INDEX idx_companies_type ON companies(company_type);
CREATE INDEX idx_companies_subscription ON companies(subscription_status);
```

**Business Rules**:
- All users must belong to a company
- Individual users are added as company_type = 'individual'
- All metadata (projects, workspaces, datasets) is isolated by company_id
- Subscription limits enforced at company level
- Company name must be unique across system

**Company Types**:
- **individual**: Single user, self-service account
- **organization**: Multiple users, team-based collaboration

### 3.1 User Entity (Updated for Multi-Tenancy)
```sql
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  -- Identity
  email VARCHAR NOT NULL UNIQUE,
  full_name VARCHAR,
  avatar_url VARCHAR,

  -- Role in company
  company_role VARCHAR NOT NULL DEFAULT 'member', -- admin | member

  -- Authentication (managed by Supabase Auth)
  auth_user_id UUID UNIQUE, -- Reference to auth.users

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth ON users(auth_user_id);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only see users in their company
CREATE POLICY users_isolation_policy ON users
  FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE auth_user_id = auth.uid()));
```

**Company Roles**:
- **admin**: Full access to all company resources, can manage users, billing, and settings
- **member**: Standard user, access based on project/workspace/dataset ownership

### 3.2 Project Entity (Updated for Multi-Tenancy)
```sql
CREATE TABLE projects (
  project_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  name VARCHAR NOT NULL,
  description TEXT,
  project_type VARCHAR, -- Standard | DataVault | Dimensional
  configuration JSONB,

  -- Ownership and Security
  owner_id UUID REFERENCES users(user_id), -- Primary owner
  visibility VARCHAR NOT NULL DEFAULT 'private', -- public | private | locked
  is_locked BOOLEAN DEFAULT false, -- Locked items are read-only except for owner/admin

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(company_id, name)
);

CREATE INDEX idx_projects_company ON projects(company_id);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_visibility ON projects(visibility);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Users can only see projects in their company
CREATE POLICY projects_isolation_policy ON projects
  FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE auth_user_id = auth.uid()));

-- Only owner and admins can update
CREATE POLICY projects_update_policy ON projects
  FOR UPDATE
  USING (
    owner_id = (SELECT user_id FROM users WHERE auth_user_id = auth.uid())
    OR
    (SELECT company_role FROM users WHERE auth_user_id = auth.uid()) = 'admin'
  );
```

**Visibility Levels**:
- **public**: Visible to all members in the company, editable by contributors
- **private**: Visible only to owner, admins, and explicitly granted users
- **locked**: Read-only for all except owner and admins

**Configuration Structure**:
```json
{
  "medallion_layers_enabled": true,
  "data_vault_preferences": {
    "hub_naming_pattern": "HUB_{entity_name}",
    "satellite_naming_pattern": "SAT_{hub}_{descriptor}",
    "link_naming_pattern": "LNK_{entity1}_{entity2}",
    "hash_algorithm": "SHA-256",
    "include_load_date": true,
    "include_record_source": true
  },
  "dimensional_preferences": {
    "dimension_naming_pattern": "DIM_{entity_name}",
    "fact_naming_pattern": "FCT_{entity_name}",
    "surrogate_key_strategy": "hash",
    "default_scd_type": 2
  },
  "default_catalog": "analytics",
  "default_schema": "main"
}
```

### 3.3 Workspace Entity (Updated for Multi-Tenancy)
```sql
CREATE TABLE workspaces (
  workspace_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
  name VARCHAR NOT NULL,
  description TEXT,

  -- Source control integration
  source_branch VARCHAR NOT NULL,
  source_commit_sha VARCHAR,
  source_provider VARCHAR DEFAULT 'github', -- github | gitlab | bitbucket | azure | other
  last_synced_at TIMESTAMP,
  is_synced BOOLEAN DEFAULT false,

  -- Ownership and Security
  owner_id UUID REFERENCES users(user_id),
  visibility VARCHAR NOT NULL DEFAULT 'private', -- public | private | locked
  is_locked BOOLEAN DEFAULT false,

  -- Metadata
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(company_id, project_id, name)
);

CREATE INDEX idx_workspaces_company ON workspaces(company_id);
CREATE INDEX idx_workspaces_project ON workspaces(project_id);
CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);

-- Enable RLS
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Users can only see workspaces in their company
CREATE POLICY workspaces_isolation_policy ON workspaces
  FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE auth_user_id = auth.uid()));
```

**Business Rules**:
- Each workspace maps to a source control branch
- Default workspace name: "main" (maps to main branch)
- Users can create feature workspaces (maps to feature branches)
- Workspace contains datasets (via mapping table)
- Changes in workspace are isolated until committed to source control
- Supports multiple source control providers (GitHub, GitLab, Bitbucket, Azure DevOps)

### 3.4 Dataset Entity (formerly Node, Updated for Multi-Tenancy and Sharing)
```sql
CREATE TABLE datasets (
  dataset_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(company_id) ON DELETE CASCADE,

  -- Identity
  fqn VARCHAR NOT NULL, -- Fully Qualified Name
  name VARCHAR NOT NULL,

  -- Classification
  medallion_layer VARCHAR, -- Raw | Bronze | Silver | Gold
  entity_type VARCHAR, -- Table | Staging | PersistentStaging | DataVault | DataMart
  entity_subtype VARCHAR, -- Dimension | Fact | Hub | Link | Satellite | LinkSatellite | PIT | Bridge | null
  materialization_type VARCHAR, -- Table | View | MaterializedView | null

  -- Documentation
  description TEXT,
  metadata JSONB,

  -- AI metadata
  ai_confidence_score INT, -- 0-100

  -- Ownership and Security
  owner_id UUID REFERENCES users(user_id), -- Primary owner
  visibility VARCHAR NOT NULL DEFAULT 'private', -- public | private | locked
  is_locked BOOLEAN DEFAULT false,

  -- Source control sync tracking
  source_file_path VARCHAR, -- Path in repo: /datasets/{layer}/{name}.yml
  source_commit_sha VARCHAR, -- Last committed SHA for this dataset
  has_uncommitted_changes BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMP,
  sync_status VARCHAR DEFAULT 'synced', -- synced | pending | conflict | error
  sync_error_message TEXT,

  -- Audit
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(company_id, fqn)
);

CREATE INDEX idx_datasets_company ON datasets(company_id);
CREATE INDEX idx_datasets_owner ON datasets(owner_id);
CREATE INDEX idx_datasets_fqn ON datasets(fqn);
CREATE INDEX idx_datasets_visibility ON datasets(visibility);
CREATE INDEX idx_datasets_sync_status ON datasets(sync_status);
CREATE INDEX idx_datasets_uncommitted ON datasets(has_uncommitted_changes) WHERE has_uncommitted_changes = true;

-- Enable RLS
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

-- Users can only see datasets in their company
CREATE POLICY datasets_isolation_policy ON datasets
  FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE auth_user_id = auth.uid()));

-- Only owner and admins can update
CREATE POLICY datasets_update_policy ON datasets
  FOR UPDATE
  USING (
    owner_id = (SELECT user_id FROM users WHERE auth_user_id = auth.uid())
    OR
    (SELECT company_role FROM users WHERE auth_user_id = auth.uid()) = 'admin'
  );
```

**Metadata JSON Structure**:
```json
{
  "source_system": "salesforce",
  "business_owner": "jane.doe@company.com",
  "technical_owner": "john.smith@company.com",
  "refresh_frequency": "daily",
  "data_classification": "sensitive",
  "retention_days": 2555,
  "custom_properties": {
    "cost_center": "marketing",
    "sla_hours": 24
  }
}
```

**Dataset Classification Hierarchy**:
```
Medallion Layer
├── Raw (Landing zone)
├── Bronze (Raw ingestion)
├── Silver (Cleansed/Conformed)
└── Gold (Business-ready)
    ├── Entity Type
    │   ├── Table (generic table)
    │   ├── Staging (temporary staging)
    │   ├── Persistent Staging
    │   ├── Data Vault
    │   │   └── Subtype: Hub, Link, Satellite, LinkSatellite, PIT, Bridge
    │   └── Data Mart
    │       └── Subtype: Dimension, Fact
```

### 3.4 Column Entity (formerly NodeItem)
```sql
CREATE TABLE columns (
  column_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID REFERENCES datasets(dataset_id) ON DELETE CASCADE,

  -- Identity
  fqn VARCHAR NOT NULL,
  name VARCHAR NOT NULL,

  -- Data type
  data_type VARCHAR NOT NULL,

  -- Documentation
  description TEXT,
  business_name VARCHAR,

  -- Properties
  is_primary_key BOOLEAN DEFAULT false,
  is_foreign_key BOOLEAN DEFAULT false,
  is_nullable BOOLEAN DEFAULT true,
  default_value TEXT,

  -- Reference (replaces separate references table)
  reference_column_id UUID REFERENCES columns(column_id) ON DELETE SET NULL,
  reference_type VARCHAR, -- FK | BusinessKey | NaturalKey
  reference_description TEXT,

  -- Transformation
  transformation_logic TEXT, -- SQL expression or reference

  -- AI metadata
  ai_confidence_score INT, -- 0-100

  -- Position
  position INT,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(dataset_id, name),
  CONSTRAINT check_reference_type CHECK (reference_type IS NULL OR reference_type IN ('FK', 'BusinessKey', 'NaturalKey'))
);

CREATE INDEX idx_columns_dataset ON columns(dataset_id);
CREATE INDEX idx_columns_fqn ON columns(fqn);
CREATE INDEX idx_columns_reference ON columns(reference_column_id);
```

**Reference Properties** (stored directly on columns):
- **reference_column_id**: UUID pointing to another column in a different (or same) dataset
- **reference_type**: Type of reference relationship
  - **FK**: Foreign Key relationship (referential integrity)
  - **BusinessKey**: Business key relationship (logical relationship)
  - **NaturalKey**: Natural key relationship (source system key)
- **reference_description**: Optional description of the reference

**Note**: Each column can reference exactly one other column. For composite keys referencing multiple columns, create multiple column records that each reference their corresponding column in the target dataset.

### 3.5 Mapping Tables (Shared Resources)

Datasets, columns, and lineage can be shared across multiple projects and workspaces within a company. Mapping tables track these many-to-many relationships.

#### 3.5.1 Project-Dataset Mapping
```sql
CREATE TABLE project_datasets (
  project_dataset_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(project_id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES datasets(dataset_id) ON DELETE CASCADE,

  -- When was this dataset added to this project
  added_at TIMESTAMP DEFAULT NOW(),
  added_by UUID REFERENCES users(user_id),

  UNIQUE(project_id, dataset_id)
);

CREATE INDEX idx_project_datasets_project ON project_datasets(project_id);
CREATE INDEX idx_project_datasets_dataset ON project_datasets(dataset_id);

-- Enable RLS
ALTER TABLE project_datasets ENABLE ROW LEVEL SECURITY;

-- Users can only see mappings for projects in their company
CREATE POLICY project_datasets_isolation_policy ON project_datasets
  FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM projects
      WHERE company_id = (SELECT company_id FROM users WHERE auth_user_id = auth.uid())
    )
  );
```

**Business Rules**:
- A dataset can exist in multiple projects within same company
- When dataset is created, it's automatically added to current project
- Dataset can be explicitly added to other projects
- Deleting mapping doesn't delete dataset (only removes from project)
- Deleting dataset removes all mappings

#### 3.5.2 Workspace-Dataset Mapping
```sql
CREATE TABLE workspace_datasets (
  workspace_dataset_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES datasets(dataset_id) ON DELETE CASCADE,

  -- Canvas position (workspace-specific)
  canvas_position JSONB, -- {x: number, y: number}

  -- When was this dataset added to this workspace
  added_at TIMESTAMP DEFAULT NOW(),
  added_by UUID REFERENCES users(user_id),

  UNIQUE(workspace_id, dataset_id)
);

CREATE INDEX idx_workspace_datasets_workspace ON workspace_datasets(workspace_id);
CREATE INDEX idx_workspace_datasets_dataset ON workspace_datasets(dataset_id);

-- Enable RLS
ALTER TABLE workspace_datasets ENABLE ROW LEVEL SECURITY;

-- Users can only see mappings for workspaces in their company
CREATE POLICY workspace_datasets_isolation_policy ON workspace_datasets
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspaces
      WHERE company_id = (SELECT company_id FROM users WHERE auth_user_id = auth.uid())
    )
  );
```

**Business Rules**:
- A dataset can appear in multiple workspaces
- Each workspace can have different canvas position for same dataset
- When dataset is created, it's automatically added to current workspace
- Dataset can be explicitly added to other workspaces
- Deleting mapping hides dataset from workspace (doesn't delete dataset)

#### 3.5.3 Shared Resource Query Examples
```sql
-- Get all datasets for a project (including shared ones)
SELECT d.*
FROM datasets d
INNER JOIN project_datasets pd ON d.dataset_id = pd.dataset_id
WHERE pd.project_id = $1;

-- Get all datasets for a workspace with canvas positions
SELECT d.*, wd.canvas_position
FROM datasets d
INNER JOIN workspace_datasets wd ON d.dataset_id = wd.dataset_id
WHERE wd.workspace_id = $1;

-- Find all projects using a specific dataset
SELECT p.*
FROM projects p
INNER JOIN project_datasets pd ON p.project_id = pd.project_id
WHERE pd.dataset_id = $1;

-- Find all workspaces using a specific dataset
SELECT w.*
FROM workspaces w
INNER JOIN workspace_datasets wd ON w.workspace_id = wd.workspace_id
WHERE wd.dataset_id = $1;
```

### 3.6 Lineage Entity
```sql
CREATE TABLE lineage (
  lineage_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(workspace_id),
  
  -- Downstream (target)
  downstream_dataset_id UUID REFERENCES datasets(dataset_id) ON DELETE CASCADE,
  downstream_column_id UUID REFERENCES columns(column_id) ON DELETE CASCADE,
  
  -- Upstream (source)
  upstream_dataset_id UUID REFERENCES datasets(dataset_id) ON DELETE CASCADE,
  upstream_column_id UUID REFERENCES columns(column_id) ON DELETE CASCADE,
  
  -- Mapping properties
  mapping_type VARCHAR NOT NULL, -- Direct | Transform | Derived | Calculated
  transformation_expression TEXT,
  
  -- Lineage metadata
  lineage_type VARCHAR DEFAULT 'direct', -- direct | indirect
  
  created_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(downstream_column_id, upstream_column_id)
);

CREATE INDEX idx_lineage_downstream_dataset ON lineage(downstream_dataset_id);
CREATE INDEX idx_lineage_upstream_dataset ON lineage(upstream_dataset_id);
CREATE INDEX idx_lineage_downstream_column ON lineage(downstream_column_id);
CREATE INDEX idx_lineage_upstream_column ON lineage(upstream_column_id);
CREATE INDEX idx_lineage_workspace ON lineage(workspace_id);
```

**Mapping Types**:
- **Direct**: Simple column-to-column mapping (no transformation)
- **Transform**: Transformation applied (e.g., UPPER(source_col))
- **Derived**: Derived from multiple sources
- **Calculated**: Calculated field (no source mapping)

**Many-to-One Support**: Multiple lineage records can point to same downstream column
**One-to-Many Support**: Single lineage record can have downstream column used by multiple targets

### 3.6 Source Control Sync Tables

#### 3.6.1 Source Code Commits
```sql
CREATE TABLE source_code_commits (
  commit_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(project_id),
  workspace_id UUID REFERENCES workspaces(workspace_id),

  -- Source control metadata
  commit_sha VARCHAR NOT NULL,
  commit_message TEXT,
  author VARCHAR,
  committed_at TIMESTAMP,
  source_provider VARCHAR DEFAULT 'github', -- github | gitlab | bitbucket | azure | other

  -- Files affected
  files_changed JSONB, -- [{path, action: added|modified|deleted, dataset_id}]

  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_source_code_commits_workspace ON source_code_commits(workspace_id);
CREATE INDEX idx_source_code_commits_sha ON source_code_commits(commit_sha);
```

#### 3.6.2 Audit Logs (Change Tracking)
```sql
CREATE TABLE audit_logs (
  change_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID REFERENCES datasets(dataset_id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(workspace_id),

  -- Change details
  change_type VARCHAR NOT NULL, -- created | updated | deleted
  entity_type VARCHAR NOT NULL, -- dataset | column | lineage
  entity_id UUID,
  field_name VARCHAR,
  old_value JSONB,
  new_value JSONB,

  -- Audit
  changed_by UUID REFERENCES users(user_id),
  changed_at TIMESTAMP DEFAULT NOW(),

  -- Source control correlation
  committed_in_sha VARCHAR,

  CREATE INDEX idx_audit_logs_dataset ON audit_logs(dataset_id);
  CREATE INDEX idx_audit_logs_workspace ON audit_logs(workspace_id);
  CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
  CREATE INDEX idx_audit_logs_uncommitted ON audit_logs(committed_in_sha) WHERE committed_in_sha IS NULL;
);
```

**Note**: `entity_type` no longer includes 'reference' since references are now tracked as column properties.

### 3.7 Environment Entity
```sql
CREATE TABLE environments (
  environment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(project_id),

  name VARCHAR NOT NULL, -- dev | staging | prod
  description TEXT,

  -- Maps to workspace/branch
  workspace_id UUID REFERENCES workspaces(workspace_id),

  -- Platform target (vendor-agnostic)
  target_platform VARCHAR, -- databricks | snowflake | bigquery | redshift | synapse
  target_catalog VARCHAR,
  target_schema VARCHAR,
  platform_url VARCHAR, -- Workspace/account URL for the target platform
  platform_config JSONB, -- Platform-specific configuration

  -- Deployment
  auto_deploy BOOLEAN DEFAULT false,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(project_id, name)
);
```

**Environment Mapping Pattern**:
```
Workspace (Branch)    → Environment → Physical Platform
------------------------------------------------------------
main                  → production  → databricks://prod_catalog
dev                   → development → databricks://dev_catalog
feature/new-model     → workspace   → snowflake://{user}_dev_db
```

**Platform Configuration Examples**:
```json
{
  "databricks": {
    "workspace_url": "https://dbc-12345678-9abc.cloud.databricks.com",
    "cluster_id": "1234-567890-abc123",
    "compute_type": "serverless"
  },
  "snowflake": {
    "account": "xy12345.us-east-1",
    "warehouse": "COMPUTE_WH",
    "role": "TRANSFORMER"
  },
  "bigquery": {
    "project_id": "my-gcp-project",
    "location": "US"
  }
}
```

### 3.8 Connection Entity
```sql
CREATE TABLE connections (
  connection_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(workspace_id),

  name VARCHAR NOT NULL,
  connection_type VARCHAR NOT NULL, -- MSSQL | Databricks | Snowflake | Salesforce | etc.
  configuration JSONB, -- Encrypted credentials
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3.9 Macro Entity
```sql
CREATE TABLE macros (
  macro_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  name VARCHAR NOT NULL,
  description TEXT,
  code_fragment TEXT NOT NULL,
  language VARCHAR NOT NULL, -- SQL | Python | Scala
  parameters JSONB, -- [{name, type, default_value, description}]
  usage_example TEXT,
  
  is_public BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(user_id),
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(name)
);
```

### 3.10 Template Entities
```sql
CREATE TABLE templates (
  template_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  name VARCHAR NOT NULL,
  template_type VARCHAR NOT NULL, -- Full | Fragment
  description TEXT,
  jinja_content TEXT NOT NULL,
  
  is_system BOOLEAN DEFAULT false,
  parent_template_id UUID REFERENCES templates(template_id),
  
  injection_points JSONB, -- [{name, description}]
  variables JSONB, -- [{name, type, default_value, description}]
  
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE template_fragments (
  fragment_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES templates(template_id),
  
  name VARCHAR NOT NULL,
  injection_point_name VARCHAR NOT NULL,
  jinja_content TEXT NOT NULL,
  
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(template_id, injection_point_name)
);
```

## 4. Source Control Sync Architecture

### 4.1 Workflow Overview

**Database-First Pattern**:
```
User Action → Supabase (immediate) → Mark Uncommitted → User Commits → Generate YAML → Push to source control
     ↑                                                                                        ↓
     └────────────────────────── Sync from the source control provider ←──────────────────────────────────────────┘
```

**Key Principles**:
1. **Supabase is Source of Truth**: All metadata lives in database
2. **Real-time Collaboration**: Multiple users can edit simultaneously
3. **Explicit Commits**: Users choose when to version in source control
4. **Bidirectional Sync**: Changes flow both ways
5. **Conflict Detection**: Smart detection of concurrent edits
6. **Change Tracking**: Complete audit trail of all changes

### 4.2 Commit to source control Workflow

**Step-by-Step Process**:

1. **User Makes Changes**:
   - Edit dataset properties in UI
   - Add/modify columns
   - Create references
   - Save to Supabase immediately
   - Mark `has_uncommitted_changes = true`
   - Log changes in `audit_logs` table

2. **User Reviews Uncommitted Changes**:
   - View list of all changed datasets in workspace
   - See field-level diff for each dataset
   - Review change summary

3. **User Commits**:
   - Click "Commit to source control" button
   - Enter commit message
   - Select datasets to commit (or commit all)

4. **System Generates YAML**:
   ```typescript
   async function generateYAMLFromDataset(dataset: Dataset): Promise<string> {
     const columns = await getColumns(dataset.dataset_id);
     const references = await getReferences(dataset.dataset_id);
     const lineage = await getLineage(dataset.dataset_id);
     
     return yaml.dump({
       version: '1.0',
       dataset: {
         uuid: dataset.dataset_id,
         fqn: dataset.fqn,
         name: dataset.name,
         medallion_layer: dataset.medallion_layer,
         entity_type: dataset.entity_type,
         entity_subtype: dataset.entity_subtype,
         materialization_type: dataset.materialization_type,
         description: dataset.description,
         metadata: dataset.metadata,
         columns: columns.map(col => ({
           uuid: col.column_id,
           name: col.name,
           data_type: col.data_type,
           description: col.description,
           business_name: col.business_name,
           is_primary_key: col.is_primary_key,
           is_foreign_key: col.is_foreign_key,
           is_nullable: col.is_nullable,
           transformation_logic: col.transformation_logic
         })),
         references: references.map(ref => ({
           reference_id: ref.reference_id,
           target_dataset_uuid: ref.target_dataset_id,
           reference_type: ref.reference_type,
           cardinality: ref.cardinality,
           source_columns: ref.source_columns,
           target_columns: ref.target_columns
         })),
         lineage: lineage.map(lin => ({
           upstream_dataset_uuid: lin.upstream_dataset_id,
           upstream_column_uuid: lin.upstream_column_id,
           mapping_type: lin.mapping_type,
           transformation_expression: lin.transformation_expression
         }))
       }
     });
   }
   ```

5. **System Writes to Source Control**:
   ```typescript
   async function commitToSourceControl(workspaceId: string, commitMessage: string) {
     const workspace = await getWorkspace(workspaceId);
     const uncommittedDatasets = await getUncommittedDatasets(workspaceId);
     
     // Generate YAML for each dataset
     const files: Record<string, string> = {};
     for (const dataset of uncommittedDatasets) {
       const yamlContent = await generateYAMLFromDataset(dataset);
       const filePath = `datasets/${dataset.medallion_layer}/${dataset.name}.yml`;
       files[filePath] = yamlContent;
       
       // Update dataset with file path
       await updateDataset(dataset.dataset_id, {
         source_control_file_path: filePath
       });
     }
     
     // Write files to the configured source control provider
     const commitSha = await sourceControlService.commitFiles({
       branch: workspace.source_control_branch_name,
       files: files,
       message: commitMessage
     });
     
     // Update workspace and datasets
     await updateWorkspace(workspaceId, {
       source_control_commit_sha: commitSha,
       last_synced_at: new Date(),
       is_synced: true
     });
     
     for (const dataset of uncommittedDatasets) {
       await updateDataset(dataset.dataset_id, {
         has_uncommitted_changes: false,
         source_control_commit_sha: commitSha,
         last_synced_at: new Date(),
         sync_status: 'synced'
       });
       
       // Mark changes as committed
       await markChangesCommitted(dataset.dataset_id, commitSha);
     }
     
     // Log commit
     await createSourceControlCommit({
       project_id: workspace.project_id,
       workspace_id: workspaceId,
       commit_sha: commitSha,
       commit_message: commitMessage,
       files_changed: uncommittedDatasets.map(d => ({
         path: d.source_control_file_path,
         action: 'modified',
         dataset_id: d.dataset_id
       }))
     });
   }
   ```

### 4.3 Sync from Source Control Workflow

**Step-by-Step Process**:

1. **User Clicks "Sync from Source Control"**:
   - Or triggered automatically on workspace load
   - Or triggered by source control webhook

2. **System Fetches Latest from the source control provider**:
   ```typescript
   async function syncFromSourceControl(workspaceId: string) {
     const workspace = await getWorkspace(workspaceId);
     const currentSha = workspace.source_control_commit_sha;
     
     // Fetch latest commit from the source control provider
     const latestSha = await sourceControlService.getLatestCommit(workspace.source_control_branch_name);
     
     if (currentSha === latestSha) {
       return { status: 'up-to-date' };
     }
     
     // Get diff between current and latest
     const changedFiles = await sourceControlService.getChangedFiles(
       workspace.source_control_branch_name,
       currentSha,
       latestSha
     );
     
     // Process each changed file
     const conflicts: Conflict[] = [];
     const updated: Dataset[] = [];
     
     for (const file of changedFiles) {
       if (file.status === 'removed') {
         await deleteDatasetByPath(workspaceId, file.path);
       } else {
         const yamlContent = await sourceControlService.getFileContent(
           workspace.source_control_branch_name,
           file.path
         );
         
         const result = await parseAndUpdateDataset(
           workspaceId,
           file.path,
           yamlContent,
           latestSha
         );
         
         if (result.conflict) {
           conflicts.push(result.conflict);
         } else {
           updated.push(result.dataset);
         }
       }
     }
     
     // Update workspace
     if (conflicts.length === 0) {
       await updateWorkspace(workspaceId, {
         source_control_commit_sha: latestSha,
         last_synced_at: new Date(),
         is_synced: true
       });
     }
     
     return {
       status: conflicts.length > 0 ? 'conflicts' : 'synced',
       conflicts,
       updated
     };
   }
   ```

3. **System Parses YAML**:
   ```typescript
   async function parseAndUpdateDataset(
     workspaceId: string,
     filePath: string,
     yamlContent: string,
     sourceControlSha: string
   ): Promise<{ dataset?: Dataset; conflict?: Conflict }> {
     
     const parsed = yaml.load(yamlContent);
     const datasetUuid = parsed.dataset.uuid;
     
     // Check if dataset exists in database
     const existingDataset = await getDatasetByUuid(datasetUuid);
     
     if (!existingDataset) {
       // New dataset from source control - create it
       const dataset = await createDatasetFromYAML(workspaceId, parsed, filePath, sourceControlSha);
       return { dataset };
     }
     
     // Dataset exists - check for conflicts
     if (existingDataset.has_uncommitted_changes) {
       // Conflict: dataset has uncommitted changes in database
       const conflict = await detectConflict(existingDataset, parsed);
       return { conflict };
     }
     
     // No conflict - update from source control
     const dataset = await updateDatasetFromYAML(existingDataset.dataset_id, parsed, sourceControlSha);
     return { dataset };
   }
   ```

4. **Conflict Detection**:
   ```typescript
   async function detectConflict(
     dbDataset: Dataset,
     sourceControlDataset: any
   ): Promise<Conflict> {
     
     const dbColumns = await getColumns(dbDataset.dataset_id);
     const sourceControlColumns = sourceControlDataset.dataset.columns;
     
     const conflicts: FieldConflict[] = [];
     
     // Compare dataset fields
     if (dbDataset.name !== sourceControlDataset.dataset.name) {
       conflicts.push({
         field: 'name',
         database_value: dbDataset.name,
         source_control_value: sourceControlDataset.dataset.name
       });
     }
     
     if (dbDataset.description !== sourceControlDataset.dataset.description) {
       conflicts.push({
         field: 'description',
         database_value: dbDataset.description,
         source_control_value: sourceControlDataset.dataset.description
       });
     }
     
     // Compare columns
     const dbColMap = new Map(dbColumns.map(c => [c.name, c]));
     const sourceControlColMap = new Map(sourceControlColumns.map((c: any) => [c.name, c]));
     
     for (const [colName, dbCol] of dbColMap) {
       const sourceControlCol = sourceControlColMap.get(colName);
       if (!sourceControlCol) {
         conflicts.push({
           field: `column.${colName}`,
           database_value: 'exists',
           source_control_value: 'deleted'
         });
       } else if (dbCol.data_type !== sourceControlCol.data_type) {
         conflicts.push({
           field: `column.${colName}.data_type`,
           database_value: dbCol.data_type,
           source_control_value: sourceControlCol.data_type
         });
       }
     }
     
     return {
       dataset_id: dbDataset.dataset_id,
       dataset_name: dbDataset.name,
       conflicts,
       source_control_sha: sourceControlDataset.source_control_sha
     };
   }
   ```

### 4.4 Conflict Resolution

**Resolution Strategies**:

1. **Take Ours (Database Version)**:
   - Keep all database changes
   - Discard source control changes
   - Generate new YAML from database
   - Force push to source control (with warning)

2. **Take Theirs (Source Control Version)**:
   - Discard all database changes
   - Apply Source control version to database
   - Mark uncommitted changes as resolved
   - Update sync status

3. **Manual Merge**:
   - Show side-by-side comparison
   - User selects field-by-field which version to keep
   - Create merged version in database
   - Generate YAML and commit

**Conflict Resolution UI**:
```typescript
interface ConflictResolutionDialog {
  conflict: Conflict;
  strategy: 'ours' | 'theirs' | 'manual';
  
  manualSelections?: Record<string, 'database' | 'sourceControl'>;
  
  onResolve: (resolution: Resolution) => Promise<void>;
}

async function resolveConflict(
  datasetId: string,
  strategy: 'ours' | 'theirs' | 'manual',
  manualSelections?: Record<string, 'database' | 'sourceControl'>
) {
  
  if (strategy === 'ours') {
    // Keep database version, commit to source control
    const dataset = await getDataset(datasetId);
    const yaml = await generateYAMLFromDataset(dataset);
    await sourceControlService.commitFile({
      path: dataset.source_control_file_path,
      content: yaml,
      message: `Resolve conflict: keep database version for ${dataset.name}`
    });
    
    await updateDataset(datasetId, {
      has_uncommitted_changes: false,
      sync_status: 'synced'
    });
    
  } else if (strategy === 'theirs') {
    // Discard database changes, apply Source control version
    const sourceControlContent = await sourceControlService.getFileContent(
      workspace.source_control_branch_name,
      dataset.source_control_file_path
    );
    
    await updateDatasetFromYAML(datasetId, yaml.load(sourceControlContent), sourceControlSha);
    
    await updateDataset(datasetId, {
      has_uncommitted_changes: false,
      sync_status: 'synced'
    });
    
  } else if (strategy === 'manual') {
    // Apply manual selections
    const dbDataset = await getDataset(datasetId);
    const sourceControlContent = await sourceControlService.getFileContent(
      workspace.source_control_branch_name,
      dataset.source_control_file_path
    );
    const sourceControlDataset = yaml.load(sourceControlContent);
    
    const merged = mergeDatasets(dbDataset, sourceControlDataset, manualSelections);
    
    await updateDataset(datasetId, merged);
    
    const mergedYaml = await generateYAMLFromDataset(merged);
    await sourceControlService.commitFile({
      path: dataset.source_control_file_path,
      content: mergedYaml,
      message: `Resolve conflict: manual merge for ${dataset.name}`
    });
    
    await updateDataset(datasetId, {
      has_uncommitted_changes: false,
      sync_status: 'synced'
    });
  }
}
```

### 4.5 Change Tracking

**Track Every Change**:
```typescript
async function trackChange(
  datasetId: string,
  entityType: 'dataset' | 'column' | 'lineage',
  entityId: string,
  changeType: 'created' | 'updated' | 'deleted',
  fieldName: string,
  oldValue: any,
  newValue: any,
  userId: string
) {

  await supabase.from('audit_logs').insert({
    dataset_id: datasetId,
    workspace_id: workspace.workspace_id,
    entity_type: entityType,
    entity_id: entityId,
    change_type: changeType,
    field_name: fieldName,
    old_value: oldValue,
    new_value: newValue,
    changed_by: userId,
    changed_at: new Date()
  });

  // Mark dataset as having uncommitted changes
  await updateDataset(datasetId, {
    has_uncommitted_changes: true,
    sync_status: 'pending'
  });
}
```

**Query Uncommitted Changes**:
```typescript
async function getUncommittedChanges(workspaceId: string) {
  const changes = await supabase
    .from('audit_logs')
    .select('*')
    .eq('workspace_id', workspaceId)
    .is('committed_in_sha', null)
    .order('changed_at', { ascending: false });
  
  // Group by dataset
  const byDataset = groupBy(changes.data, 'dataset_id');
  
  return Object.entries(byDataset).map(([datasetId, changes]) => ({
    dataset_id: datasetId,
    changes: changes,
    change_count: changes.length
  }));
}
```

### 4.6 Source Control Webhook Integration (e.g., GitHub, GitLab)

**Webhook Handler**:
```typescript
app.post('/webhooks/source-control/push', async (req, res) => {
  const payload = req.body;
  
  // Verify webhook signature
  const signature = req.headers['x-hub-signature-256'];
  if (!verifySourceControlSignature(signature, req.body)) {
    return res.status(401).send('Invalid signature');
  }
  
  const repoUrl = payload.repository.html_url;
  const branchName = payload.ref.split('/').pop();
  const commits = payload.commits;
  
  // Find affected workspace
  const workspace = await supabase
    .from('workspaces')
    .select('*')
    .eq('source_control_branch_name', branchName)
    .single();
  
  if (!workspace.data) {
    return res.status(404).send('Workspace not found');
  }
  
  // Trigger sync from source control
  try {
    await syncFromSourceControl(workspace.data.workspace_id);
    
    // Notify users via websocket
    await notifyWorkspaceUsers(workspace.data.workspace_id, {
      type: 'source_control_sync',
      message: `${commits.length} new commit(s) synced from source control`,
      commits: commits.map((c: any) => ({
        sha: c.id,
        message: c.message,
        author: c.author.name
      }))
    });
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).send('Sync failed');
  }
});
```

### 4.7 YAML File Structure

**Example Dataset YAML**:
```yaml
version: '1.0'

dataset:
  # Identity
  uuid: 550e8400-e29b-41d4-a716-446655440000
  fqn: gold.marts.dim_customer
  name: dim_customer
  
  # Classification
  medallion_layer: Gold
  entity_type: DataMart
  entity_subtype: Dimension
  materialization_type: Table
  
  # Documentation
  description: Customer dimension with SCD Type 2
  
  # Metadata
  metadata:
    source_system: salesforce
    business_owner: jane.doe@company.com
    technical_owner: john.smith@company.com
    refresh_frequency: daily
    scd_type: 2
  
  # Columns
  columns:
    - uuid: 660e8400-e29b-41d4-a716-446655440001
      name: customer_key
      data_type: BIGINT
      description: Surrogate key
      business_name: Customer Key
      is_primary_key: true
      is_foreign_key: false
      is_nullable: false
      position: 1
      
    - uuid: 660e8400-e29b-41d4-a716-446655440002
      name: customer_id
      data_type: STRING
      description: Business key from source
      business_name: Customer ID
      is_primary_key: false
      is_foreign_key: false
      is_nullable: false
      position: 2
      
    - uuid: 660e8400-e29b-41d4-a716-446655440003
      name: customer_name
      data_type: STRING
      description: Full customer name
      business_name: Customer Name
      is_nullable: false
      transformation_logic: CONCAT(first_name, ' ', last_name)
      position: 3
      
    - uuid: 660e8400-e29b-41d4-a716-446655440004
      name: email
      data_type: STRING
      description: Customer email address
      is_nullable: true
      position: 4
      
    - uuid: 660e8400-e29b-41d4-a716-446655440005
      name: valid_from
      data_type: TIMESTAMP
      description: SCD Type 2 start date
      is_nullable: false
      position: 5
      
    - uuid: 660e8400-e29b-41d4-a716-446655440006
      name: valid_to
      data_type: TIMESTAMP
      description: SCD Type 2 end date
      is_nullable: true
      position: 6
      
    - uuid: 660e8400-e29b-41d4-a716-446655440007
      name: is_current
      data_type: BOOLEAN
      description: Current record flag
      is_nullable: false
      position: 7
  
  # References to other datasets
  references:
    - reference_id: 770e8400-e29b-41d4-a716-446655440001
      target_dataset_uuid: 880e8400-e29b-41d4-a716-446655440000
      target_dataset_fqn: gold.marts.fct_orders
      reference_type: FK
      cardinality: "1:M"
      source_columns:
        - 660e8400-e29b-41d4-a716-446655440001
      target_columns:
        - 990e8400-e29b-41d4-a716-446655440010
  
  # Lineage (upstream sources)
  lineage:
    - upstream_dataset_uuid: aa0e8400-e29b-41d4-a716-446655440000
      upstream_dataset_fqn: silver.staging.stg_customers
      upstream_column_uuid: bb0e8400-e29b-41d4-a716-446655440001
      upstream_column_name: id
      downstream_column_uuid: 660e8400-e29b-41d4-a716-446655440002
      downstream_column_name: customer_id
      mapping_type: Direct
      
    - upstream_dataset_uuid: aa0e8400-e29b-41d4-a716-446655440000
      upstream_dataset_fqn: silver.staging.stg_customers
      upstream_column_uuid: bb0e8400-e29b-41d4-a716-446655440002
      upstream_column_name: first_name
      downstream_column_uuid: 660e8400-e29b-41d4-a716-446655440003
      downstream_column_name: customer_name
      mapping_type: Transform
      transformation_expression: CONCAT(first_name, ' ', last_name)
      
    - upstream_dataset_uuid: aa0e8400-e29b-41d4-a716-446655440000
      upstream_dataset_fqn: silver.staging.stg_customers
      upstream_column_uuid: bb0e8400-e29b-41d4-a716-446655440003
      upstream_column_name: last_name
      downstream_column_uuid: 660e8400-e29b-41d4-a716-446655440003
      downstream_column_name: customer_name
      mapping_type: Transform
      transformation_expression: CONCAT(first_name, ' ', last_name)

# Audit trail
created_at: 2025-01-15T10:30:00Z
updated_at: 2025-01-20T14:45:00Z
last_synced_at: 2025-01-20T14:45:00Z
source_control_commit_sha: abc123def456
```

## 5. Feature Requirements

### 5.1 User Authentication & Workspace Initialization

**User Flow**:
1. User signs in (Supabase Auth)
2. System checks for existing workspace
3. If no workspace exists:
   - Create default workspace (maps to "main" branch)
   - Prompt for source control repository connection
   - Block access until repo connected
4. Load workspace dashboard with sync status

**Admin Capabilities**:
- View all workspaces in system
- Access any project across workspaces
- Manage system templates and configurations
- View system-wide Source control sync metrics

### 5.2 Project Canvas (React Flow)

**Visual Editor Requirements**:

**Canvas View**:
- Drag-and-drop dataset creation
- Pan and zoom controls
- Mini-map for navigation
- Dataset search with filters
- Toggle between diagram view and grid view
- **Source control sync status overlay** (new)

**Dataset Representation**:
- Visual indicators for medallion layer (color coding)
- Icon for entity type/subtype
- Display FQN and name
- Show AI confidence score badge if < 80%
- Connection lines for references
- **Sync status badge** (synced/pending/conflict/error) (new)
- **Uncommitted changes indicator** (new)

**Dataset Search Panel**:
```
Search Features:
├── Text search (name, description)
├── Filter by medallion layer
├── Filter by entity type
├── Filter by subtype
├── Filter by AI confidence score
├── Filter by sync status (new)
├── Show uncommitted changes only (new)
└── Show datasets with conflicts (new)
```

**Grid View**:
- Sortable columns: Name, Type, Layer, Subtype, Modified Date, Sync Status (new), Last Synced (new)
- Inline editing capabilities
- Bulk selection and actions
- Export to CSV
- **Bulk commit action** (new)
- **Bulk discard changes action** (new)

**Interactions**:
- **Click dataset**: Open dataset editor dialog
- **Right-click dataset**: Context menu
  - Edit properties
  - Add reference
  - Delete dataset
  - Clone dataset
  - View lineage
  - Send to AI for analysis
  - **Commit changes** (new)
  - **Discard changes** (new)
  - **View change history** (new)
- **Click reference line**: Show reference details modal

### 5.3 Dataset Editor Dialog (formerly Node Editor)

**Tabs**:

1. **Properties**
   - Name (editable)
   - FQN (display only)
   - UUID (display only)
   - Medallion Layer (dropdown)
   - Entity Type (dropdown)
   - Entity Subtype (dropdown)
   - Materialization Type (dropdown)
   - Description (textarea)
   - Custom metadata (key-value pairs)
   - **Source Control Sync Status Section** (new):
     - Last committed SHA
     - Uncommitted changes indicator
     - Last synced timestamp
     - Commit button (if uncommitted changes)
     - Discard changes button

2. **Columns** (formerly NodeItems)
   - Grid view of all columns
   - Columns: Name, Data Type, Description, Nullable, PK, FK
   - Inline editing
   - Add/delete columns
   - Reorder (drag-drop)
   - Bulk operations
   - **Column change indicators** (new)

3. **References** (formerly Relationships)
   - List of references for this dataset
   - Add/edit/delete references
   - Visual preview of related datasets
   - **Reference change indicators** (new)

4. **Lineage** (formerly Mappings)
   - Visual flow showing:
     - Source datasets/columns → Current column
     - Current column → Target datasets/columns
   - Click to edit lineage details
   - Add new lineage
   - **Lineage change indicators** (new)

5. **AI Insights**
   - Confidence scores
   - AI-generated descriptions
   - Suggested improvements
   - Validation warnings

6. **History** (new/enhanced)
   - **Uncommitted changes** (grouped by field)
   - **Source control commit history**
   - **Change log** (all historical changes)
   - Version comparison (side-by-side diff)
   - Restore to previous version

### 5.4 Source Control Sync UI Components (NEW)

#### 5.4.1 Source Control Sync Panel
```
┌─────────────────────────────────────┐
│ Source Control Sync Status                     │
├─────────────────────────────────────┤
│ Branch: main                        │
│ Last Synced: 2 minutes ago          │
│ Status: ● Synced                    │
│                                     │
│ Uncommitted Changes: 5 datasets     │
│                                     │
│ [Commit to source control]  [Pull from source control]   │
└─────────────────────────────────────┘
```

#### 5.4.2 Uncommitted Changes Dialog
```
┌──────────────────────────────────────────────────┐
│ Commit Changes to Source Control                            │
├──────────────────────────────────────────────────┤
│                                                  │
│ Commit Message:                                  │
│ ┌──────────────────────────────────────────────┐ │
│ │ Added customer segmentation model            │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ Select Datasets to Commit:                       │
│                                                  │
│ ☑ dim_customer (3 changes)                      │
│   • name: "customer" → "dim_customer"           │
│   • description: updated                         │
│   • column "segment" added                       │
│                                                  │
│ ☑ fct_orders (1 change)                         │
│   • reference to dim_customer added              │
│                                                  │
│ ☑ stg_customers (2 changes)                     │
│   • column "raw_segment" added                   │
│   • description: updated                         │
│                                                  │
│           [Cancel]  [Commit Selected]           │
└──────────────────────────────────────────────────┘
```

#### 5.4.3 Conflict Resolution Dialog
```
┌──────────────────────────────────────────────────┐
│ Resolve Conflict: dim_customer                   │
├──────────────────────────────────────────────────┤
│                                                  │
│ Conflicting changes detected between your        │
│ database and source control. Choose how to resolve:         │
│                                                  │
│ Resolution Strategy:                             │
│ ○ Take Ours (Keep database version)             │
│ ○ Take Theirs (Use Source control version)                 │
│ ● Manual Merge (Select field-by-field)          │
│                                                  │
│ ┌──────────────────────────────────────────────┐ │
│ │ Field: description                           │ │
│ │                                              │ │
│ │ Database Version:                            │ │
│ │ ○ "Customer dimension with SCD Type 2"      │ │
│ │                                              │ │
│ │ Source Control Version:                                 │ │
│ │ ● "Customer dimension table"                 │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│ ┌──────────────────────────────────────────────┐ │
│ │ Field: column "segment"                      │ │
│ │                                              │ │
│ │ Database Version:                            │ │
│ │ ● data_type: STRING (exists)                 │ │
│ │                                              │ │
│ │ Source Control Version:                                 │ │
│ │ ○ (not present)                              │ │
│ └──────────────────────────────────────────────┘ │
│                                                  │
│              [Cancel]  [Resolve]                 │
└──────────────────────────────────────────────────┘
```

#### 5.4.4 Source Control History Panel
```
┌─────────────────────────────────────┐
│ Source Control History                         │
├─────────────────────────────────────┤
│                                     │
│ ● abc123 (2 hours ago)              │
│   Add customer segmentation         │
│   by john.smith@company.com         │
│   • dim_customer modified           │
│   • fct_orders modified             │
│                                     │
│ ● def456 (1 day ago)                │
│   Initial data vault model          │
│   by jane.doe@company.com           │
│   • hub_customer created            │
│   • sat_customer_details created    │
│   • lnk_customer_order created      │
│                                     │
│ ● ghi789 (3 days ago)               │
│   Import from staging               │
│   by john.smith@company.com         │
│   • stg_customers created           │
│   • stg_orders created              │
│                                     │
└─────────────────────────────────────┘
```

### 5.5 Metadata Import (Updated)

**Import Process Changes**:
1. User imports file/database/API
2. System parses and creates datasets **in Supabase**
3. Datasets marked as `has_uncommitted_changes = true`
4. User reviews imported datasets
5. Optional: AI enhancement
6. User commits imported datasets to source control
7. YAML generated and pushed to source control

**All import types** (CSV, JSON, Parquet, MSSQL, Databricks, Snowflake, REST APIs) now:
- Save directly to database
- Mark as uncommitted
- Allow review before Source control commit
- Support batch commit

### 5.6 Data Vault Accelerator (Updated)

**Apply Step Changes**:
- Create all generated datasets in **Supabase** (not directly in the source control repository)
- Mark all as uncommitted changes
- Show "Generated model has X uncommitted datasets"
- Provide "Review Changes" button
- Provide "Commit All to source control" button
- Allow user to edit generated datasets before committing

### 5.7 Dimensional Modeling (Updated)

**Apply Step Changes**:
- Create dimension/fact in **Supabase** (not directly in the source control repository)
- Mark as uncommitted
- Show "Generated dataset has uncommitted changes"
- Allow user to review and edit
- Commit to source control when ready

### 5.8 Template Rendering (Updated)

**Data Context Preparation**:
- Read datasets from **Supabase** (not directly from the source control repository)
- Include uncommitted changes in rendering
- Generate code from current database state
- Optionally commit generated code to source control

## 6. Technical Implementation Details

### 6.1 Service Layer Architecture

```
Frontend (React)
    ↓
Service Layer
    ├── dataset-service.ts (CRUD + change tracking)
    ├── column-service.ts (CRUD + change tracking)
    ├── reference-service.ts (CRUD + change tracking)
    ├── lineage-service.ts (CRUD + change tracking)
    ├── source-control-sync-service.ts (commit, sync, conflicts)
    ├── yaml-generator.ts (database → YAML)
    ├── yaml-parser.ts (YAML → database)
    ├── conflict-resolver.ts (conflict detection & resolution)
    └── change-tracker.ts (audit trail)
    ↓
Supabase (PostgreSQL)
    ↓
Source control provider (via source-control-sync-service)
```

### 6.2 State Management Strategy

**React Query for Server State**:
- Datasets
- Columns
- References
- Lineage
- Source control commits
- Uncommitted changes
- Conflicts

**Zustand for UI State**:
- Canvas zoom/pan
- Filters
- Selected datasets
- Sidebar open/closed
- Active tab in editor

**React Context for Global State**:
- Current workspace
- Current project
- User info
- Source control sync status

### 6.3 Real-time Collaboration (Future Enhancement)

**Supabase Realtime**:
- Subscribe to changes on `datasets` table
- Notify users when dataset is being edited by another user
- Show "User X is editing" indicator
- Optional: Lock datasets during edit (pessimistic locking)
- Conflict prevention through awareness

### 6.4 Performance Optimizations

**Database**:
- Indexes on all foreign keys
- Partial indexes on `has_uncommitted_changes = true`
- Materialized views for complex lineage queries
- Batch operations for bulk imports

**Frontend**:
- React Query caching
- Virtual scrolling for large lists
- Lazy loading for canvas (viewport culling)
- Debounced search
- Optimistic UI updates

**Source Control Operations**:
- Batch YAML generation
- Parallel file writes
- Incremental commits (only changed files)
- Smart conflict detection (SHA comparison)

### 6.5 Security Considerations

**Database Security**:
- Row Level Security (RLS) policies on all tables
- Workspace-based isolation
- Role-based access control
- Audit logging for all changes

**Source Control Security**:
- Encrypted source control access tokens
- User-scoped tokens (not shared)
- Webhook signature verification
- Rate limiting on Source control operations

**API Security**:
- JWT authentication
- CORS configuration
- Input validation
- SQL injection prevention

## 7. Testing Strategy

### 7.1 Unit Tests
- Dataset/Column/Reference CRUD operations
- YAML generation from database
- YAML parsing to database
- Conflict detection logic
- Conflict resolution strategies
- Change tracking

### 7.2 Integration Tests
- Commit to Source control workflow (end-to-end)
- Sync from Source control workflow (end-to-end)
- Conflict detection and resolution (full cycle)
- Import and commit workflow
- Data Vault accelerator and commit
- Dimensional modeling and commit

### 7.3 E2E Tests
- User creates dataset, edits, commits to source control
- User edits in source control directly, syncs to database
- Two users edit same dataset → conflict → resolution
- Import file → review → commit
- Generate Data Vault model → review → commit

### 7.4 Performance Tests
- 1000+ datasets in database
- 100+ uncommitted changes
- Large YAML file generation
- Bulk commit operations
- Concurrent edit scenarios

## 8. Deployment & Operations

### 8.1 Environment Variables
```
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=

# Source Control Integration
SOURCE_CONTROL_APP_ID=
SOURCE_CONTROL_APP_PRIVATE_KEY=
SOURCE_CONTROL_WEBHOOK_SECRET=

# AI
OPENAI_API_KEY=

# App
APP_URL=
ENVIRONMENT=production
```

### 8.2 Monitoring

**Metrics to Track**:
- Source control sync success rate
- Conflict resolution rate
- Average time to commit
- Database query performance
- Source control API rate limit usage
- Uncommitted changes per workspace
- Dataset count per project

**Alerts**:
- Source control sync failures
- High conflict rate
- Slow query performance
- Source control API rate limit approaching
- Database storage nearing capacity

## 9. Migration from Current Implementation

### 9.1 Data Migration Steps

1. **Rename Tables** (database migration):
   ```sql
   ALTER TABLE nodes RENAME TO datasets;
   ALTER TABLE node_items RENAME TO columns;
   ALTER TABLE node_lineage RENAME TO lineage;
   ALTER TABLE branches RENAME TO workspaces; -- if exists
   ```

2. **Add Reference Columns to columns table**:
   ```sql
   ALTER TABLE columns ADD COLUMN reference_column_id UUID REFERENCES columns(column_id) ON DELETE SET NULL;
   ALTER TABLE columns ADD COLUMN reference_type VARCHAR;
   ALTER TABLE columns ADD COLUMN reference_description TEXT;
   ALTER TABLE columns ADD CONSTRAINT check_reference_type CHECK (reference_type IS NULL OR reference_type IN ('FK', 'BusinessKey', 'NaturalKey'));
   CREATE INDEX idx_columns_reference ON columns(reference_column_id);
   ```

3. **Add Source Control Sync Columns to datasets table**:
   ```sql
   ALTER TABLE datasets ADD COLUMN source_control_file_path VARCHAR;
   ALTER TABLE datasets ADD COLUMN source_control_commit_sha VARCHAR;
   ALTER TABLE datasets ADD COLUMN has_uncommitted_changes BOOLEAN DEFAULT false;
   ALTER TABLE datasets ADD COLUMN last_synced_at TIMESTAMP;
   ALTER TABLE datasets ADD COLUMN sync_status VARCHAR DEFAULT 'synced';
   ALTER TABLE datasets ADD COLUMN sync_error_message TEXT;
   ```

4. **Create New Tables**:
   ```sql
   CREATE TABLE source_code_commits (...);
   CREATE TABLE audit_logs (...);
   ```

5. **Update Indexes and Constraints**

6. **Migrate Existing Data**:
   - Mark all existing datasets as `has_uncommitted_changes = true`
   - Generate initial YAML for all datasets
   - Commit to source control as "Initial migration"
   - Update sync status

### 9.2 Code Migration Steps

1. Update all TypeScript interfaces
2. Rename all service files
3. Update all component imports
4. Add Source control sync UI components
5. Update all API calls
6. Add change tracking to all mutations
7. Test thoroughly

### 9.3 Rollout Strategy

**Phase 1**: Database migration (downtime)
**Phase 2**: Deploy new code with feature flag
**Phase 3**: Test with internal users
**Phase 4**: Enable for all users
**Phase 5**: Monitor and fix issues
**Phase 6**: Remove old code

## 10. Future Enhancements

### 10.1 Advanced Source Control Features
- Branch creation from UI
- Pull Request creation from UI
- Code review workflow in UI
- Merge workspace/branches
- Cherry-pick commits
- Revert to previous commit

### 10.2 Collaboration Features
- Real-time editing indicators
- Dataset locking (pessimistic)
- Comments on datasets
- @mentions in comments
- Activity feed
- Notifications

### 10.3 Advanced Sync Features
- Automatic conflict resolution (AI-powered)
- Smart merge strategies
- Scheduled auto-sync
- Sync only specific datasets
- Partial commits

### 10.4 Version Control Features
- Branching strategy enforcement
- Required reviewers
- Approval workflows
- Protected branches
- Release tagging

## 11. Success Metrics

**User Experience**:
- Time to create and commit first dataset: < 3 minutes
- Conflict resolution time: < 2 minutes
- Sync operation time: < 10 seconds for 100 datasets

**System Performance**:
- Source control commit success rate: > 99%
- Conflict detection accuracy: > 95%
- Database query response time: < 500ms (p95)
- Sync from source control latency: < 5 seconds

**Adoption**:
- Daily active users
- Datasets committed per day
- Conflicts resolved per day
- Source control sync operations per day

