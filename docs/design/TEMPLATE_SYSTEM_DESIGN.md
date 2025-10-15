# Template System Design

## Requirements

Users need ability to:
1. Use **global system templates** (managed by admins)
2. Create **overrides** for templates at multiple levels:
   - **Project level**: Override applies to all datasets in project
   - **Workspace level**: Override applies to all datasets in workspace
   - **Dataset level**: Override applies to specific dataset
3. Override templates for specific **dataset types** (entity_type + entity_subtype)
4. Use template **fragments** (reusable Jinja2 blocks)
5. Compose templates from fragments

## Current Database State

### Existing Template Tables (6 tables)
✅ `templates` - 0 rows
✅ `template_fragments` - 0 rows
✅ `template_compositions` - 0 rows (complex composition system)
✅ `template_composition_nodes` - 0 rows (React Flow nodes)
✅ `template_composition_edges` - 0 rows (React Flow edges)
✅ `template_composition_versions` - 0 rows (versioning)

### Refactored Spec (Section 3.10)
The spec defines a **simpler** template system:
- `templates` - Main templates (Full or Fragment type)
- `template_fragments` - Fragments that inject into templates

**Key Difference**: The spec does NOT include the composition system (nodes, edges, versions).

## Analysis

### What to Keep

#### 1. `templates` Table ✅ KEEP & ENHANCE
**Purpose**: Store all Jinja2 templates (both full templates and reusable fragments)

**Current Schema**:
```sql
CREATE TABLE templates (
  id UUID PRIMARY KEY,
  workspace_id UUID REFERENCES workspaces,  -- ❌ REMOVE: System templates are global
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT CHECK (template_type IN ('Full', 'Fragment')),
  is_system BOOLEAN DEFAULT false,
  parent_template_id UUID REFERENCES templates(id),
  injection_points TEXT[],
  category TEXT CHECK (...),
  language TEXT CHECK (language IN ('sql', 'python', 'scala')),
  jinja_content TEXT NOT NULL,
  variables JSONB,
  tags TEXT[],
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Proposed Changes**:
- ✅ Keep: `id`, `name`, `description`, `template_type`, `jinja_content`, `variables`, `language`
- ✅ Keep: `is_system`, `parent_template_id` (for cloning)
- ✅ Keep: `category`, `tags` (for organization)
- ✅ Add: `account_id` (for multi-tenancy - system templates have NULL account_id)
- ✅ Add: `applies_to_entity_type` (Table, DataVault, DataMart, etc.)
- ✅ Add: `applies_to_entity_subtype` (Hub, Link, Satellite, Dimension, Fact, etc.)
- ❌ Remove: `workspace_id` (system templates are global, not workspace-specific)
- ❌ Remove: `injection_points` (can be derived from Jinja2 blocks in content)
- ❌ Remove: `is_public` (use account_id = NULL for system templates)

#### 2. `template_fragments` Table ❌ REMOVE
**Current Purpose**: Fragments that inject into templates at specific injection points

**Why Remove**:
- Fragments should just be templates with `template_type = 'Fragment'`
- No need for separate table - use `templates` table with type distinction
- Injection points can be handled via Jinja2 `{% block %}` and `{% include %}`

**Alternative**: Use single `templates` table with `template_type` to distinguish

#### 3. `template_compositions` Table ❌ REMOVE
**Purpose**: Visual composition system using React Flow

**Why Remove**:
- Overly complex for initial requirements
- Not in refactored specification
- Can be added later as enhancement if needed
- Template composition can be done via Jinja2 `{% include %}` and `{% extends %}`

#### 4. `template_composition_nodes` Table ❌ REMOVE
**Purpose**: React Flow nodes for visual composition

**Why Remove**: Part of composition system (not needed)

#### 5. `template_composition_edges` Table ❌ REMOVE
**Purpose**: React Flow edges for visual composition

**Why Remove**: Part of composition system (not needed)

#### 6. `template_composition_versions` Table ❌ REMOVE
**Purpose**: Version history for compositions

**Why Remove**: Part of composition system (not needed)

### What to Add

#### 1. `template_overrides` Table ✅ ADD NEW
**Purpose**: Store template overrides at project/workspace/dataset level

```sql
CREATE TABLE template_overrides (
  override_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,

  -- What template is being overridden
  base_template_id UUID NOT NULL REFERENCES templates(template_id) ON DELETE CASCADE,

  -- Override scope (only ONE should be set)
  project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  dataset_id UUID REFERENCES datasets(dataset_id) ON DELETE CASCADE,

  -- Filter by dataset type (optional - if NULL, applies to all types)
  applies_to_entity_type VARCHAR,     -- Table | DataVault | DataMart | null
  applies_to_entity_subtype VARCHAR,  -- Hub | Link | Dimension | Fact | null

  -- Override content
  override_type VARCHAR NOT NULL CHECK (override_type IN ('full', 'partial')),
  jinja_content TEXT NOT NULL,  -- Full template or partial override
  variables JSONB,              -- Variable overrides

  -- Priority (higher = more specific = wins)
  priority INT NOT NULL DEFAULT 0,  -- dataset=3, workspace=2, project=1

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CHECK (
    -- Exactly one scope must be set
    (project_id IS NOT NULL)::int +
    (workspace_id IS NOT NULL)::int +
    (dataset_id IS NOT NULL)::int = 1
  ),

  -- Unique override per scope + template + type
  UNIQUE (base_template_id, project_id, applies_to_entity_type, applies_to_entity_subtype),
  UNIQUE (base_template_id, workspace_id, applies_to_entity_type, applies_to_entity_subtype),
  UNIQUE (base_template_id, dataset_id)
);
```

**Priority Levels**:
- **3**: Dataset-level override (most specific)
- **2**: Workspace-level override
- **1**: Project-level override
- **0**: Base template (least specific)

## Proposed Final Schema

### 1. Enhanced `templates` Table

```sql
CREATE TABLE templates (
  template_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID REFERENCES accounts(account_id) ON DELETE CASCADE,

  -- Identity
  name VARCHAR NOT NULL,
  description TEXT,
  template_type VARCHAR NOT NULL CHECK (template_type IN ('Full', 'Fragment')),

  -- Categorization
  category VARCHAR CHECK (category IN (
    'ddl', 'dml', 'etl', 'test', 'job_orchestration',
    'table_management', 'data_quality', 'monitoring', 'custom'
  )),
  language VARCHAR NOT NULL CHECK (language IN ('sql', 'python', 'scala')),
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Applicability (what dataset types this template applies to)
  applies_to_entity_type VARCHAR,     -- Table | DataVault | DataMart | Staging | null (null = all)
  applies_to_entity_subtype VARCHAR,  -- Hub | Link | Dimension | Fact | null (null = all)

  -- Content
  jinja_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,  -- [{name, type, default_value, description, required}]

  -- System vs User templates
  is_system BOOLEAN DEFAULT false,  -- System templates: account_id = NULL

  -- Cloning
  parent_template_id UUID REFERENCES templates(template_id) ON DELETE SET NULL,

  -- Metadata
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  UNIQUE(account_id, name),  -- Unique within company (system templates: NULL company)

  -- System templates must have account_id = NULL
  CHECK (is_system = false OR account_id IS NULL)
);

CREATE INDEX idx_templates_company ON templates(account_id);
CREATE INDEX idx_templates_system ON templates(is_system) WHERE is_system = true;
CREATE INDEX idx_templates_type ON templates(template_type);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_templates_entity_type ON templates(applies_to_entity_type);
```

### 2. New `template_overrides` Table

```sql
CREATE TABLE template_overrides (
  override_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(account_id) ON DELETE CASCADE,

  -- What template is being overridden
  base_template_id UUID NOT NULL REFERENCES templates(template_id) ON DELETE CASCADE,

  -- Override scope (exactly ONE must be set)
  project_id UUID REFERENCES projects(project_id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(workspace_id) ON DELETE CASCADE,
  dataset_id UUID REFERENCES datasets(dataset_id) ON DELETE CASCADE,

  -- Filter by dataset type (optional)
  applies_to_entity_type VARCHAR,
  applies_to_entity_subtype VARCHAR,

  -- Override content
  override_type VARCHAR NOT NULL CHECK (override_type IN ('full', 'partial')),
  jinja_content TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,

  -- Priority (auto-calculated based on scope)
  priority INT NOT NULL DEFAULT 0,

  -- Metadata
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CHECK (
    (project_id IS NOT NULL)::int +
    (workspace_id IS NOT NULL)::int +
    (dataset_id IS NOT NULL)::int = 1
  ),

  UNIQUE (base_template_id, project_id, applies_to_entity_type, applies_to_entity_subtype),
  UNIQUE (base_template_id, workspace_id, applies_to_entity_type, applies_to_entity_subtype),
  UNIQUE (base_template_id, dataset_id)
);

CREATE INDEX idx_overrides_company ON template_overrides(account_id);
CREATE INDEX idx_overrides_template ON template_overrides(base_template_id);
CREATE INDEX idx_overrides_project ON template_overrides(project_id);
CREATE INDEX idx_overrides_workspace ON template_overrides(workspace_id);
CREATE INDEX idx_overrides_dataset ON template_overrides(dataset_id);
CREATE INDEX idx_overrides_active ON template_overrides(is_active) WHERE is_active = true;
```

## Template Resolution Logic

When generating code for a dataset, resolve template in this order:

```sql
-- Find best matching template for a dataset
WITH template_candidates AS (
  -- 1. Dataset-level override (priority 3)
  SELECT
    t.template_id,
    t.jinja_content,
    t.variables,
    3 as priority,
    'dataset_override' as source
  FROM template_overrides o
  JOIN templates t ON t.template_id = o.base_template_id
  WHERE o.dataset_id = $dataset_id
    AND o.is_active = true

  UNION ALL

  -- 2. Workspace-level override for this entity type (priority 2)
  SELECT
    t.template_id,
    t.jinja_content,
    t.variables,
    2 as priority,
    'workspace_override' as source
  FROM template_overrides o
  JOIN templates t ON t.template_id = o.base_template_id
  JOIN datasets d ON d.dataset_id = $dataset_id
  JOIN workspace_datasets wd ON wd.dataset_id = d.dataset_id
  WHERE o.workspace_id = wd.workspace_id
    AND o.is_active = true
    AND (o.applies_to_entity_type IS NULL OR o.applies_to_entity_type = d.entity_type)
    AND (o.applies_to_entity_subtype IS NULL OR o.applies_to_entity_subtype = d.entity_subtype)

  UNION ALL

  -- 3. Project-level override for this entity type (priority 1)
  SELECT
    t.template_id,
    t.jinja_content,
    t.variables,
    1 as priority,
    'project_override' as source
  FROM template_overrides o
  JOIN templates t ON t.template_id = o.base_template_id
  JOIN datasets d ON d.dataset_id = $dataset_id
  JOIN project_datasets pd ON pd.dataset_id = d.dataset_id
  WHERE o.project_id = pd.project_id
    AND o.is_active = true
    AND (o.applies_to_entity_type IS NULL OR o.applies_to_entity_type = d.entity_type)
    AND (o.applies_to_entity_subtype IS NULL OR o.applies_to_entity_subtype = d.entity_subtype)

  UNION ALL

  -- 4. Base system template (priority 0)
  SELECT
    t.template_id,
    t.jinja_content,
    t.variables,
    0 as priority,
    'system_template' as source
  FROM templates t
  JOIN datasets d ON d.dataset_id = $dataset_id
  WHERE t.is_system = true
    AND t.template_type = 'Full'
    AND t.category = $template_category  -- e.g., 'ddl', 'etl'
    AND (t.applies_to_entity_type IS NULL OR t.applies_to_entity_type = d.entity_type)
    AND (t.applies_to_entity_subtype IS NULL OR t.applies_to_entity_subtype = d.entity_subtype)
)
SELECT *
FROM template_candidates
ORDER BY priority DESC
LIMIT 1;
```

## Use Cases

### Use Case 1: Admin Creates System Template
```sql
-- Create a system template for Data Vault Hubs
INSERT INTO templates (
  name, description, template_type, category, language,
  applies_to_entity_type, applies_to_entity_subtype,
  jinja_content, variables, is_system, account_id, created_by
) VALUES (
  'Data Vault Hub DDL',
  'Standard DDL for Data Vault Hub tables',
  'Full',
  'ddl',
  'sql',
  'DataVault',
  'Hub',
  '{% block hub_ddl %}
CREATE TABLE {{ catalog }}.{{ schema }}.{{ table_name }} (
  {{ hub_key }} STRING NOT NULL,
  load_date TIMESTAMP NOT NULL,
  record_source STRING NOT NULL,
  {% for column in columns %}
  {{ column.name }} {{ column.data_type }}{% if not loop.last %},{% endif %}
  {% endfor %}
)
USING DELTA
{% endblock %}',
  '[
    {"name": "catalog", "type": "string", "required": true},
    {"name": "schema", "type": "string", "required": true},
    {"name": "table_name", "type": "string", "required": true},
    {"name": "hub_key", "type": "string", "default": "hub_key"},
    {"name": "columns", "type": "array", "required": true}
  ]',
  true,  -- is_system
  NULL,  -- account_id (system templates are global)
  '00000000-0000-0000-0000-000000000000'
);
```

### Use Case 2: User Creates Project-Level Override
```sql
-- Override Hub DDL at project level to add company-specific columns
INSERT INTO template_overrides (
  account_id, base_template_id, project_id,
  applies_to_entity_type, applies_to_entity_subtype,
  override_type, jinja_content, priority, created_by
) VALUES (
  'company-uuid',
  'system-hub-template-uuid',
  'project-uuid',
  'DataVault',
  'Hub',
  'full',
  '{% extends base_template %}
{% block hub_ddl %}
CREATE TABLE {{ catalog }}.{{ schema }}.{{ table_name }} (
  {{ hub_key }} STRING NOT NULL,
  load_date TIMESTAMP NOT NULL,
  record_source STRING NOT NULL,
  -- CUSTOM: Add company-specific audit columns
  created_by STRING NOT NULL,
  updated_by STRING,
  {% for column in columns %}
  {{ column.name }} {{ column.data_type }}{% if not loop.last %},{% endif %}
  {% endfor %}
)
USING DELTA
TBLPROPERTIES (
  "delta.enableChangeDataFeed" = "true"
)
{% endblock %}',
  1,  -- project-level priority
  'user-uuid'
);
```

### Use Case 3: User Creates Dataset-Specific Override
```sql
-- Override template for a specific dataset
INSERT INTO template_overrides (
  account_id, base_template_id, dataset_id,
  override_type, jinja_content, priority, created_by
) VALUES (
  'company-uuid',
  'system-hub-template-uuid',
  'specific-dataset-uuid',
  'full',
  '-- Custom DDL for this specific hub
CREATE TABLE {{ catalog }}.{{ schema }}.{{ table_name }} (
  customer_hub_key STRING NOT NULL,
  load_date TIMESTAMP NOT NULL,
  record_source STRING NOT NULL,
  -- Custom: This hub has special requirements
  gdpr_consent_flag BOOLEAN NOT NULL,
  data_classification STRING NOT NULL,
  {% for column in columns %}
  {{ column.name }} {{ column.data_type }}{% if not loop.last %},{% endif %}
  {% endfor %}
)
USING DELTA
PARTITIONED BY (load_date);',
  3,  -- dataset-level priority (highest)
  'user-uuid'
);
```

## Migration Strategy

### Tables to Remove (5)
- `template_fragments` → Merged into `templates` with `template_type = 'Fragment'`
- `template_compositions` → Remove (overly complex)
- `template_composition_nodes` → Remove
- `template_composition_edges` → Remove
- `template_composition_versions` → Remove

### Tables to Keep (1)
- `templates` → Enhance with new columns

### Tables to Add (1)
- `template_overrides` → New table for override system

## Benefits

1. **Simplicity**: Single source of truth for templates
2. **Flexibility**: Override at project, workspace, or dataset level
3. **Specificity**: Filter overrides by entity type/subtype
4. **Multi-tenancy**: System templates (global) vs company templates
5. **Priority System**: Clear resolution order (dataset > workspace > project > system)
6. **Extensibility**: Easy to add more override types or scopes later

## Summary

**Recommended Action**:
- ✅ Keep: `templates` (enhanced)
- ✅ Add: `template_overrides` (new)
- ❌ Remove: `template_fragments`, `template_compositions`, `template_composition_nodes`, `template_composition_edges`, `template_composition_versions`

**Result**: Clean, simple template system with powerful override capabilities
