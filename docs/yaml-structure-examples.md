# YAML File Structure for GitHub Storage

## Project YAML Example

**Location**: `metadata/projects/{project-slug}.yml`

```yaml
# Project: Customer Data Pipeline
# ID: 550e8400-e29b-41d4-a716-446655440000
# Owner: john@company.com
# Visibility: private
# Status: unlocked

metadata:
  id: 550e8400-e29b-41d4-a716-446655440000
  name: Customer Data Pipeline
  description: ETL pipeline for customer data ingestion and transformation
  version: 1.2.0

  # Ownership & Access
  owner_id: 123e4567-e89b-12d3-a456-426614174000
  created_by: 123e4567-e89b-12d3-a456-426614174000
  visibility: private  # or 'public'
  is_locked: false
  locked_by: null
  locked_at: null

  # References
  account_id: 789e4567-e89b-12d3-a456-426614174000
  workspace_id: 456e4567-e89b-12d3-a456-426614174000

  # GitHub tracking
  github_repo: mycompany/uroq-metadata
  github_branch: main
  github_path: metadata/projects/customer-data-pipeline.yml

  # Timestamps
  created_at: 2025-10-01T10:00:00Z
  updated_at: 2025-10-07T14:30:00Z
  last_synced_at: 2025-10-07T14:30:00Z

# Project members (for private projects)
members:
  - user_id: 123e4567-e89b-12d3-a456-426614174000
    role: owner
    added_at: 2025-10-01T10:00:00Z
  - user_id: 234e4567-e89b-12d3-a456-426614174001
    role: editor
    added_at: 2025-10-02T11:00:00Z
  - user_id: 345e4567-e89b-12d3-a456-426614174002
    role: viewer
    added_at: 2025-10-03T09:00:00Z

# Related data models
data_models:
  - id: 660e8400-e29b-41d4-a716-446655440001
    name: Customer Dimension
    path: metadata/models/customer-dimension.yml
  - id: 660e8400-e29b-41d4-a716-446655440002
    name: Orders Fact
    path: metadata/models/orders-fact.yml

# Project configuration
settings:
  databricks_workspace: https://myorg.databricks.com
  default_catalog: main
  default_schema: customer
  tags:
    - customer-data
    - production
    - critical
```

---

## Data Model YAML Example

**Location**: `metadata/models/{model-slug}.yml`

```yaml
# Data Model: Customer Dimension
# ID: 660e8400-e29b-41d4-a716-446655440001
# Type: dimensional (Kimball)
# Visibility: private
# Status: unlocked

metadata:
  id: 660e8400-e29b-41d4-a716-446655440001
  name: Customer Dimension
  description: SCD Type 2 dimension for customer master data
  model_type: dimensional  # dimensional | data_vault | normalized | custom
  version: 2.1.0

  # Ownership & Access
  owner_id: 123e4567-e89b-12d3-a456-426614174000
  created_by: 123e4567-e89b-12d3-a456-426614174000
  visibility: private
  is_locked: false
  locked_by: null
  locked_at: null

  # References
  project_id: 550e8400-e29b-41d4-a716-446655440000
  account_id: 789e4567-e89b-12d3-a456-426614174000
  workspace_id: 456e4567-e89b-12d3-a456-426614174000

  # GitHub tracking
  github_repo: mycompany/uroq-metadata
  github_branch: main
  github_path: metadata/models/customer-dimension.yml

  # Status
  is_archived: false

  # Timestamps
  created_at: 2025-10-01T11:00:00Z
  updated_at: 2025-10-07T15:45:00Z
  last_synced_at: 2025-10-07T15:45:00Z

# React Flow visual representation
visual_model:
  nodes:
    - id: node_001
      type: source_table
      position:
        x: 100
        y: 100
      data:
        label: customer_raw
        catalog: main
        schema: raw
        table: customers
        format: delta

    - id: node_002
      type: transformation
      position:
        x: 350
        y: 100
      data:
        label: Clean & Transform
        notebook_path: /Workspace/etl/clean_customers
        cluster: standard_cluster

    - id: node_003
      type: dimension
      position:
        x: 600
        y: 100
      data:
        label: dim_customer
        catalog: main
        schema: dimensional
        table: dim_customer
        scd_type: 2
        natural_key: customer_id

  edges:
    - id: edge_001
      source: node_001
      target: node_002
      type: data_flow

    - id: edge_002
      source: node_002
      target: node_003
      type: data_flow

# Table schema definition
schema:
  catalog: main
  database: dimensional
  table: dim_customer
  format: delta

  columns:
    - name: customer_key
      type: BIGINT
      nullable: false
      comment: Surrogate key

    - name: customer_id
      type: STRING
      nullable: false
      comment: Natural key

    - name: customer_name
      type: STRING
      nullable: false

    - name: email
      type: STRING
      nullable: true

    - name: phone
      type: STRING
      nullable: true

    - name: address
      type: STRING
      nullable: true

    - name: city
      type: STRING
      nullable: true

    - name: state
      type: STRING
      nullable: true

    - name: zip_code
      type: STRING
      nullable: true

    - name: customer_segment
      type: STRING
      nullable: true

    - name: effective_date
      type: TIMESTAMP
      nullable: false
      comment: SCD Type 2 effective date

    - name: end_date
      type: TIMESTAMP
      nullable: true
      comment: SCD Type 2 end date

    - name: is_current
      type: BOOLEAN
      nullable: false
      comment: SCD Type 2 current flag

    - name: created_at
      type: TIMESTAMP
      nullable: false

    - name: updated_at
      type: TIMESTAMP
      nullable: false

  # Databricks optimizations
  partitioned_by:
    - is_current

  clustered_by:
    type: liquid
    columns:
      - customer_id
      - effective_date

  table_properties:
    delta.enableChangeDataFeed: true
    delta.enableDeletionVectors: true
    delta.autoOptimize.optimizeWrite: true
    delta.autoOptimize.autoCompact: true

# Data quality rules
data_quality:
  - name: no_null_customer_id
    type: not_null
    column: customer_id

  - name: unique_current_customer
    type: unique
    columns:
      - customer_id
      - is_current
    where: is_current = true

  - name: valid_email_format
    type: regex
    column: email
    pattern: ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$

  - name: valid_effective_dates
    type: expression
    expression: effective_date < COALESCE(end_date, CURRENT_TIMESTAMP())

# Model members (for private models)
members:
  - user_id: 123e4567-e89b-12d3-a456-426614174000
    role: owner
  - user_id: 234e4567-e89b-12d3-a456-426614174001
    role: editor

# Tags and categorization
tags:
  - customer
  - dimension
  - scd-type-2
  - production

# Lineage (upstream dependencies)
lineage:
  upstream:
    - type: table
      catalog: main
      schema: raw
      table: customers
    - type: table
      catalog: main
      schema: raw
      table: customer_addresses

  downstream:
    - type: table
      catalog: main
      schema: dimensional
      table: fact_orders
```

---

## File Naming Convention

### Projects
- **Pattern**: `metadata/projects/{workspace-slug}/{project-slug}.yml`
- **Example**: `metadata/projects/customer-analytics/customer-data-pipeline.yml`

### Data Models
- **Pattern**: `metadata/models/{project-slug}/{model-slug}.yml`
- **Example**: `metadata/models/customer-data-pipeline/customer-dimension.yml`

---

## Access Control Flow

### Public Projects/Models
- Visible to **all members** of the company
- Read-only for viewers
- Editable by contributors (if unlocked)

### Private Projects/Models
- Visible only to:
  - Owner
  - Company admins
  - Explicitly added members
- Editable by:
  - Owner (if unlocked)
  - Members with 'editor' role (if unlocked)

### Locking Mechanism
- Owner or admin can lock a project/model
- While locked:
  - **No one can edit** (including owner)
  - Prevents accidental changes in production
  - Must be unlocked before editing
- Lock tracks who locked it and when
