# Database Schema Documentation

This document provides comprehensive documentation of the Uroq database schema, including all tables, columns, relationships, indexes, and Row-Level Security (RLS) policies.

## Schema Overview

Uroq uses PostgreSQL (via Supabase) with the following architectural principles:

1. **Multi-Tenant Isolation**: All data is isolated by `account_id`
2. **Row-Level Security (RLS)**: PostgreSQL RLS policies enforce access control
3. **Shared Resources**: Datasets can be shared across projects via mapping tables
4. **Audit Trail**: Complete change tracking for all metadata
5. **Git Sync**: Tracking of source control synchronization status

## Entity Relationship Diagram

```
┌──────────────┐
│  accounts   │ (Root Entity)
└──────┬───────┘
       │
       ├──────────────────────────────────────┐
       │                                      │
       ▼                                      ▼
┌──────────────┐                      ┌──────────────┐
│    users     │                      │   projects   │
└──────┬───────┘                      └──────┬───────┘
       │                                     │
       │                              ┌──────┴───────┐
       │                              │              │
       │                              ▼              ▼
       │                       ┌──────────────┐  ┌─────────────────┐
       │                       │  workspaces  │  │project_datasets │
       │                       └──────┬───────┘  └────────┬────────┘
       │                              │                   │
       │                              │                   │
       │                              ▼                   ▼
       │                       ┌─────────────────┐  ┌──────────────┐
       │                       │workspace_datasets│  │   datasets   │
       │                       └────────┬────────┘  └──────┬───────┘
       │                                │                   │
       │                                └───────────────────┘
       │                                          │
       │                                    ┌─────┴─────┐
       │                                    │           │
       ▼                                    ▼           ▼
┌─────────────────────┐             ┌──────────────┐  │
│source_control_commits│             │   columns    │  │
└─────────────────────┘             └──────┬───────┘  │
                                           │          │
                                           ▼          ▼
                                    ┌──────────────┐
                                    │   lineage    │
                                    └──────────────┘
```

## Core Tables

### 1. accounts

**Purpose**: Root entity for multi-tenant isolation. Every resource belongs to a company.

**Schema**:
```sql
CREATE TABLE accounts (
  account_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR NOT NULL UNIQUE,
  account_type VARCHAR NOT NULL, -- 'individual' | 'organization'

  -- Subscription
  subscription_tier VARCHAR DEFAULT 'free', -- free | pro | enterprise
  subscription_status VARCHAR DEFAULT 'active', -- active | suspended | cancelled
  subscription_start_date TIMESTAMP,
  subscription_end_date TIMESTAMP,

  -- Billing
  billing_email VARCHAR,
  billing_address JSONB,

  -- Limits (enforced at application level)
  max_users INT DEFAULT 1,
  max_projects INT DEFAULT 5,
  max_datasets INT DEFAULT 100,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes**:
```sql
CREATE INDEX idx_accounts_type ON accounts(account_type);
CREATE INDEX idx_accounts_subscription ON accounts(subscription_status);
```

**Subscription Tiers**:

| Tier       | Max Users | Max Projects | Max Datasets | Price         |
|------------|-----------|--------------|--------------|---------------|
| Free       | 1         | 5            | 100          | $0            |
| Pro        | 10        | Unlimited    | Unlimited    | $49/user/mo   |
| Enterprise | Unlimited | Unlimited    | Unlimited    | Custom        |

**Company Types**:
- **individual**: Single-user accounts (automatically created on signup)
- **organization**: Multi-user organizations

---

### 2. users

**Purpose**: Application users with company membership and roles.

**Schema**:
```sql
CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,

  -- Identity
  email VARCHAR NOT NULL UNIQUE,
  full_name VARCHAR,
  avatar_url VARCHAR,

  -- Role in company
  account_role VARCHAR NOT NULL DEFAULT 'member', -- admin | member

  -- Authentication (managed by Supabase Auth)
  auth_user_id UUID UNIQUE, -- Reference to auth.users

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes**:
```sql
CREATE INDEX idx_users_company ON users(account_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_auth ON users(auth_user_id);
```

**RLS Policies**:
```sql
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can only see users in their company
CREATE POLICY users_isolation_policy ON users
  FOR SELECT
  USING (account_id = (SELECT account_id FROM users WHERE auth_user_id = auth.uid()));
```

**Company Roles**:
- **admin**: Full access to all company resources, can manage users and settings
- **member**: Standard user, access based on resource ownership/visibility

---

### 3. projects

**Purpose**: Top-level container for organizing datasets and workspaces.

**Schema**:
```sql
CREATE TABLE projects (
  project_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,

  -- Identity
  name VARCHAR NOT NULL,
  description TEXT,
  project_type VARCHAR, -- Standard | DataVault | Dimensional

  -- Configuration
  configuration JSONB,

  -- Ownership and Security
  owner_id UUID REFERENCES users(user_id),
  visibility VARCHAR NOT NULL DEFAULT 'private', -- public | private | locked
  is_locked BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(account_id, name)
);
```

**Indexes**:
```sql
CREATE INDEX idx_projects_company ON projects(account_id);
CREATE INDEX idx_projects_owner ON projects(owner_id);
CREATE INDEX idx_projects_visibility ON projects(visibility);
```

**RLS Policies**:
```sql
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Users can only see projects in their company
CREATE POLICY projects_isolation_policy ON projects
  FOR SELECT
  USING (account_id = (SELECT account_id FROM users WHERE auth_user_id = auth.uid()));

-- Only owner and admins can update
CREATE POLICY projects_update_policy ON projects
  FOR UPDATE
  USING (
    owner_id = (SELECT user_id FROM users WHERE auth_user_id = auth.uid())
    OR
    (SELECT account_role FROM users WHERE auth_user_id = auth.uid()) = 'admin'
  );
```

**Visibility Levels**:
- **public**: Visible to all members in the company
- **private**: Visible only to owner, admins, and explicitly granted users
- **locked**: Read-only for all except owner and admins

**Configuration Structure** (JSONB):
```json
{
  "medallion_layers_enabled": true,
  "data_vault_preferences": {
    "hub_naming_pattern": "HUB_{entity_name}",
    "satellite_naming_pattern": "SAT_{hub}_{descriptor}",
    "link_naming_pattern": "LNK_{entity1}_{entity2}"
  },
  "dimensional_preferences": {
    "dimension_naming_pattern": "DIM_{entity_name}",
    "fact_naming_pattern": "FCT_{entity_name}"
  },
  "default_catalog": "analytics",
  "default_schema": "main"
}
```

---

### 4. workspaces

**Purpose**: Workspace maps to a Git branch and contains a canvas layout.

**Schema**:
```sql
CREATE TABLE workspaces (
  workspace_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,

  -- Identity
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

  UNIQUE(account_id, project_id, name)
);
```

**Indexes**:
```sql
CREATE INDEX idx_workspaces_company ON workspaces(account_id);
CREATE INDEX idx_workspaces_project ON workspaces(project_id);
CREATE INDEX idx_workspaces_owner ON workspaces(owner_id);
```

**RLS Policies**:
```sql
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

-- Users can only see workspaces in their company
CREATE POLICY workspaces_isolation_policy ON workspaces
  FOR SELECT
  USING (account_id = (SELECT account_id FROM users WHERE auth_user_id = auth.uid()));
```

---

### 5. datasets

**Purpose**: Represents a data entity (table, view, etc.) with metadata and sync status.

**Schema**:
```sql
CREATE TABLE datasets (
  dataset_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,

  -- Identity
  fqn VARCHAR NOT NULL, -- Fully Qualified Name: catalog.schema.table
  name VARCHAR NOT NULL,

  -- Classification
  medallion_layer VARCHAR, -- Raw | Bronze | Silver | Gold
  entity_type VARCHAR, -- Table | Staging | PersistentStaging | DataVault | DataMart
  entity_subtype VARCHAR, -- Dimension | Fact | Hub | Link | Satellite | PIT | Bridge
  materialization_type VARCHAR, -- Table | View | MaterializedView

  -- Documentation
  description TEXT,
  metadata JSONB,

  -- AI metadata
  ai_confidence_score INT, -- 0-100

  -- Ownership and Security
  owner_id UUID REFERENCES users(user_id),
  visibility VARCHAR NOT NULL DEFAULT 'private', -- public | private | locked
  is_locked BOOLEAN DEFAULT false,

  -- Source control sync tracking
  source_file_path VARCHAR, -- Path in repo: /datasets/{layer}/{name}.yml
  source_commit_sha VARCHAR, -- Last committed SHA
  has_uncommitted_changes BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMP,
  sync_status VARCHAR DEFAULT 'synced', -- synced | pending | conflict | error
  sync_error_message TEXT,

  -- Audit
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(account_id, fqn)
);
```

**Indexes**:
```sql
CREATE INDEX idx_datasets_company ON datasets(account_id);
CREATE INDEX idx_datasets_owner ON datasets(owner_id);
CREATE INDEX idx_datasets_fqn ON datasets(fqn);
CREATE INDEX idx_datasets_visibility ON datasets(visibility);
CREATE INDEX idx_datasets_sync_status ON datasets(sync_status);
CREATE INDEX idx_datasets_uncommitted ON datasets(has_uncommitted_changes)
  WHERE has_uncommitted_changes = true;
```

**RLS Policies**:
```sql
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

-- Users can only see datasets in their company
CREATE POLICY datasets_isolation_policy ON datasets
  FOR SELECT
  USING (account_id = (SELECT account_id FROM users WHERE auth_user_id = auth.uid()));

-- Only owner and admins can update
CREATE POLICY datasets_update_policy ON datasets
  FOR UPDATE
  USING (
    owner_id = (SELECT user_id FROM users WHERE auth_user_id = auth.uid())
    OR
    (SELECT account_role FROM users WHERE auth_user_id = auth.uid()) = 'admin'
  );
```

**Medallion Layers**:
- **Raw**: Landing zone, data as-is from source
- **Bronze**: Raw ingestion with minimal transformation
- **Silver**: Cleansed/Conformed business-ready data
- **Gold**: Aggregated, business-focused marts

**Entity Types**:
- **Table**: Standard database table
- **Staging**: Temporary staging area
- **PersistentStaging**: Staging with history
- **DataVault**: Data Vault 2.0 pattern
- **DataMart**: Business-specific subset

**Entity Subtypes** (for Data Vault and Dimensional):
- **Dimension**: Descriptive attributes
- **Fact**: Measurable events/transactions
- **Hub**: Business keys (Data Vault)
- **Link**: Relationships (Data Vault)
- **Satellite**: Descriptive attributes (Data Vault)
- **PIT**: Point-in-time tables (Data Vault)
- **Bridge**: Many-to-many relationships (Data Vault)

**Metadata Structure** (JSONB):
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

---

### 6. columns

**Purpose**: Columns within datasets, with reference support.

**Schema**:
```sql
CREATE TABLE columns (
  column_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID REFERENCES datasets(dataset_id) ON DELETE CASCADE,

  -- Identity
  fqn VARCHAR NOT NULL, -- dataset_fqn.column_name
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
  transformation_logic TEXT, -- SQL expression

  -- AI metadata
  ai_confidence_score INT, -- 0-100

  -- Position
  position INT,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(dataset_id, name),
  CONSTRAINT check_reference_type CHECK (
    reference_type IS NULL OR
    reference_type IN ('FK', 'BusinessKey', 'NaturalKey')
  )
);
```

**Indexes**:
```sql
CREATE INDEX idx_columns_dataset ON columns(dataset_id);
CREATE INDEX idx_columns_fqn ON columns(fqn);
CREATE INDEX idx_columns_reference ON columns(reference_column_id);
```

**Reference Types**:
- **FK**: Foreign Key relationship (referential integrity)
- **BusinessKey**: Business key relationship (logical relationship)
- **NaturalKey**: Natural key relationship (source system key)

**Data Types** (examples):
- Numeric: `TINYINT`, `SMALLINT`, `INTEGER`, `BIGINT`, `DECIMAL(p,s)`, `FLOAT`, `DOUBLE`
- String: `CHAR(n)`, `VARCHAR(n)`, `STRING`, `TEXT`
- Date/Time: `DATE`, `TIMESTAMP`, `TIMESTAMP_NTZ`, `TIME`
- Boolean: `BOOLEAN`
- Binary: `BINARY`, `VARBINARY(n)`
- Complex: `ARRAY<type>`, `STRUCT<field:type>`, `MAP<key,value>`, `JSON`

---

### 7. project_datasets (Mapping Table)

**Purpose**: Many-to-many mapping between projects and datasets (shared resources).

**Schema**:
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
```

**Indexes**:
```sql
CREATE INDEX idx_project_datasets_project ON project_datasets(project_id);
CREATE INDEX idx_project_datasets_dataset ON project_datasets(dataset_id);
```

**RLS Policies**:
```sql
ALTER TABLE project_datasets ENABLE ROW LEVEL SECURITY;

-- Users can only see mappings for projects in their company
CREATE POLICY project_datasets_isolation_policy ON project_datasets
  FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM projects
      WHERE account_id = (SELECT account_id FROM users WHERE auth_user_id = auth.uid())
    )
  );
```

**Usage**:
- Dataset created in Project A can be added to Project B
- Both projects reference the same dataset (no duplication)
- Changes to dataset reflected in all projects

---

### 8. workspace_datasets (Mapping Table)

**Purpose**: Many-to-many mapping between workspaces and datasets with canvas positions.

**Schema**:
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
```

**Indexes**:
```sql
CREATE INDEX idx_workspace_datasets_workspace ON workspace_datasets(workspace_id);
CREATE INDEX idx_workspace_datasets_dataset ON workspace_datasets(dataset_id);
```

**RLS Policies**:
```sql
ALTER TABLE workspace_datasets ENABLE ROW LEVEL SECURITY;

-- Users can only see mappings for workspaces in their company
CREATE POLICY workspace_datasets_isolation_policy ON workspace_datasets
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspaces
      WHERE account_id = (SELECT account_id FROM users WHERE auth_user_id = auth.uid())
    )
  );
```

**Canvas Position Structure** (JSONB):
```json
{
  "x": 100,
  "y": 150
}
```

**Usage**:
- Same dataset can appear in multiple workspaces
- Each workspace has its own canvas position for the dataset
- Moving dataset on canvas only affects current workspace

---

### 9. lineage

**Purpose**: Tracks data lineage (how data flows from source to target columns).

**Schema**:
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

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(downstream_column_id, upstream_column_id)
);
```

**Indexes**:
```sql
CREATE INDEX idx_lineage_downstream_dataset ON lineage(downstream_dataset_id);
CREATE INDEX idx_lineage_upstream_dataset ON lineage(upstream_dataset_id);
CREATE INDEX idx_lineage_downstream_column ON lineage(downstream_column_id);
CREATE INDEX idx_lineage_upstream_column ON lineage(upstream_column_id);
CREATE INDEX idx_lineage_workspace ON lineage(workspace_id);
```

**Mapping Types**:
- **Direct**: Simple column-to-column mapping (no transformation)
- **Transform**: Transformation applied (e.g., `UPPER(source_col)`)
- **Derived**: Derived from multiple sources (e.g., `CONCAT(first, last)`)
- **Calculated**: Calculated field with no source mapping

---

### 10. source_control_commits

**Purpose**: Tracks Git commits related to metadata changes.

**Schema**:
```sql
CREATE TABLE source_control_commits (
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

  -- Audit
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes**:
```sql
CREATE INDEX idx_source_control_commits_workspace ON source_control_commits(workspace_id);
CREATE INDEX idx_source_control_commits_sha ON source_control_commits(commit_sha);
```

**Files Changed Structure** (JSONB):
```json
[
  {
    "path": "datasets/gold/dim_customer.yml",
    "action": "modified",
    "dataset_id": "550e8400-e29b-41d4-a716-446655440000"
  },
  {
    "path": "datasets/gold/fct_orders.yml",
    "action": "added",
    "dataset_id": "660e8400-e29b-41d4-a716-446655440000"
  }
]
```

---

### 11. metadata_changes (Audit Log)

**Purpose**: Complete audit trail of all metadata changes.

**Schema**:
```sql
CREATE TABLE metadata_changes (
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

  -- Git correlation
  committed_in_sha VARCHAR
);
```

**Indexes**:
```sql
CREATE INDEX idx_metadata_changes_dataset ON metadata_changes(dataset_id);
CREATE INDEX idx_metadata_changes_workspace ON metadata_changes(workspace_id);
CREATE INDEX idx_metadata_changes_entity ON metadata_changes(entity_type, entity_id);
CREATE INDEX idx_metadata_changes_uncommitted ON metadata_changes(committed_in_sha)
  WHERE committed_in_sha IS NULL;
```

**Entity Types**:
- **dataset**: Changes to dataset properties
- **column**: Changes to column properties
- **lineage**: Changes to lineage relationships

**Note**: `entity_type` no longer includes 'reference' since references are now tracked as column properties.

---

## Helper Functions (RLS)

### auth.account_id()

Returns the current user's company ID.

```sql
CREATE FUNCTION auth.account_id() RETURNS UUID AS $$
  SELECT account_id FROM users WHERE auth_user_id = auth.uid()
$$ LANGUAGE SQL STABLE;
```

### auth.is_admin()

Checks if the current user is a company admin.

```sql
CREATE FUNCTION auth.is_admin() RETURNS BOOLEAN AS $$
  SELECT account_role = 'admin' FROM users WHERE auth_user_id = auth.uid()
$$ LANGUAGE SQL STABLE;
```

### auth.uid()

Built-in Supabase function that returns the current authenticated user's UUID from `auth.users`.

---

## Common Queries

### Get all datasets for a project (including shared)

```sql
SELECT d.*
FROM datasets d
INNER JOIN project_datasets pd ON d.dataset_id = pd.dataset_id
WHERE pd.project_id = $1;
```

### Get all datasets for a workspace with canvas positions

```sql
SELECT d.*, wd.canvas_position
FROM datasets d
INNER JOIN workspace_datasets wd ON d.dataset_id = wd.dataset_id
WHERE wd.workspace_id = $1;
```

### Get uncommitted datasets in a workspace

```sql
SELECT d.*
FROM datasets d
INNER JOIN workspace_datasets wd ON d.dataset_id = wd.dataset_id
WHERE wd.workspace_id = $1
  AND d.has_uncommitted_changes = true;
```

### Get lineage for a column (upstream sources)

```sql
SELECT
  l.*,
  up_ds.name AS upstream_dataset_name,
  up_col.name AS upstream_column_name
FROM lineage l
INNER JOIN datasets up_ds ON l.upstream_dataset_id = up_ds.dataset_id
INNER JOIN columns up_col ON l.upstream_column_id = up_col.column_id
WHERE l.downstream_column_id = $1;
```

### Get lineage for a column (downstream targets)

```sql
SELECT
  l.*,
  down_ds.name AS downstream_dataset_name,
  down_col.name AS downstream_column_name
FROM lineage l
INNER JOIN datasets down_ds ON l.downstream_dataset_id = down_ds.dataset_id
INNER JOIN columns down_col ON l.downstream_column_id = down_col.column_id
WHERE l.upstream_column_id = $1;
```

### Get all uncommitted changes for a workspace

```sql
SELECT *
FROM metadata_changes
WHERE workspace_id = $1
  AND committed_in_sha IS NULL
ORDER BY changed_at DESC;
```

### Get all projects using a specific dataset

```sql
SELECT p.*
FROM projects p
INNER JOIN project_datasets pd ON p.project_id = pd.project_id
WHERE pd.dataset_id = $1;
```

---

## Data Integrity

### Foreign Key Constraints

All foreign keys use `ON DELETE CASCADE` or `ON DELETE SET NULL`:
- `account_id` references: `ON DELETE CASCADE` (delete all company data)
- `project_id`, `workspace_id`, `dataset_id` references: `ON DELETE CASCADE`
- `reference_column_id`: `ON DELETE SET NULL` (preserve column, remove reference)
- `owner_id`, `created_by`: No cascade (allow orphaned records)

### Check Constraints

- `columns.reference_type`: Must be NULL or one of ('FK', 'BusinessKey', 'NaturalKey')
- Application-level validation for other enum fields

### Unique Constraints

- `accounts.name`: Globally unique
- `users.email`: Globally unique
- `users.auth_user_id`: Globally unique
- `projects (account_id, name)`: Unique within company
- `workspaces (account_id, project_id, name)`: Unique within project
- `datasets (account_id, fqn)`: Unique FQN within company
- `columns (dataset_id, name)`: Unique column name within dataset
- `lineage (downstream_column_id, upstream_column_id)`: Unique lineage path
- `project_datasets (project_id, dataset_id)`: No duplicates
- `workspace_datasets (workspace_id, dataset_id)`: No duplicates

---

## Performance Considerations

### Index Usage

**Company Isolation**:
- All queries should filter by `account_id` to leverage `idx_*_company` indexes
- RLS policies automatically enforce this

**Relationship Lookups**:
- Foreign key indexes: `idx_columns_dataset`, `idx_lineage_upstream_column`, etc.
- Reference lookups: `idx_columns_reference`

**Sync Status**:
- Partial index on `has_uncommitted_changes = true` for efficient uncommitted queries
- Index on `sync_status` for filtering by sync state

**Audit Trail**:
- Partial index on uncommitted changes: `idx_metadata_changes_uncommitted`

### Query Optimization Tips

1. **Always filter by account_id first** (even though RLS does this)
2. **Use indexes on foreign keys** for JOIN operations
3. **Limit result sets** with LIMIT/OFFSET for pagination
4. **Use EXPLAIN ANALYZE** to verify query plans
5. **Consider materialized views** for complex lineage queries

---

## Migration Scripts

Migration files are located in `backend/migrations/` and follow the naming convention:

```
M_<phase>_<sequence>_<description>.sql
```

**Migration Order**:
1. **M.0**: Multi-tenant foundation (accounts, users, mapping tables)
2. **M.1**: Database migration (rename tables, add columns, create new tables)
3. **M.2**: Code migration (TypeScript, components, services)
4. **M.3**: Documentation updates
5. **M.4**: Deployment

---

## Security Best Practices

### Row-Level Security (RLS)

**Always Enabled**: All user-facing tables have RLS enabled
**Company Isolation**: All policies enforce `account_id` filtering
**Role-Based Access**: Admins have broader access than members

### Query Safety

```sql
-- ✅ GOOD: Filter by account_id explicitly
SELECT * FROM datasets WHERE account_id = $1;

-- ❌ BAD: Missing account_id filter (RLS will add it, but be explicit)
SELECT * FROM datasets WHERE dataset_id = $1;

-- ✅ GOOD: Check ownership before update
UPDATE datasets SET name = $2
WHERE dataset_id = $1
  AND (owner_id = $3 OR is_admin($4));
```

### Sensitive Data

- **GitHub tokens**: Encrypted before storage
- **Passwords**: Never stored (Supabase Auth handles this)
- **Billing info**: Encrypted in `billing_address` JSONB

---

## Next Steps

- Review [Architecture Overview](./architecture-overview.md)
- Study [API Documentation](./api-documentation.md)
- Explore [Source Control Services](./source-control-services.md)
- Read [Testing Guide](./testing-guide.md)

---

**Last Updated**: 2025-01-15
**Version**: 2.0.0
