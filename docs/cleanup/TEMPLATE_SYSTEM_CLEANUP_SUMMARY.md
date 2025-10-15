# Template System Cleanup Summary

## Analysis Result

After analyzing your requirements and the current database state, here's the recommendation for template-related tables:

## Current State (6 Template Tables)

✅ `templates` - 0 rows
✅ `template_fragments` - 0 rows
✅ `template_compositions` - 0 rows
✅ `template_composition_nodes` - 0 rows
✅ `template_composition_edges` - 0 rows
✅ `template_composition_versions` - 0 rows

## Recommended Changes

### ✅ KEEP (1 table)
- **`templates`** - Will be enhanced to support:
  - System templates (global, account_id = NULL)
  - Company templates (account_id set)
  - Full templates and Fragment templates (via template_type)
  - Entity type/subtype filtering

### ❌ REMOVE (5 tables)

#### 1. `template_fragments`
**Why Remove**: Fragments should just be templates with `template_type = 'Fragment'`. No need for separate table.

**Replacement**: Use single `templates` table with `template_type` column

#### 2-5. Template Composition System
- `template_compositions`
- `template_composition_nodes`
- `template_composition_edges`
- `template_composition_versions`

**Why Remove**:
- Overly complex visual composition system (React Flow-based)
- Not in refactored specification
- Template composition can be done via Jinja2 `{% include %}` and `{% extends %}`
- Can be added later as enhancement if truly needed

### ✅ ADD (1 new table)
- **`template_overrides`** - New table for hierarchical override system

## Your Requirements Met

### Requirement: Global System Templates
✅ **Solution**: `templates` table with `is_system = true` and `account_id = NULL`

### Requirement: Fragments
✅ **Solution**: `templates` table with `template_type = 'Fragment'`

### Requirement: Override at Project Level
✅ **Solution**: `template_overrides` with `project_id` set

### Requirement: Override at Workspace Level
✅ **Solution**: `template_overrides` with `workspace_id` set

### Requirement: Override at Dataset Level
✅ **Solution**: `template_overrides` with `dataset_id` set

### Requirement: Override by Dataset Type
✅ **Solution**: `template_overrides` with `applies_to_entity_type` and `applies_to_entity_subtype`

## Priority Resolution System

When generating code for a dataset, templates are resolved in this order:

1. **Priority 3**: Dataset-specific override (most specific)
2. **Priority 2**: Workspace-level override (for entity type)
3. **Priority 1**: Project-level override (for entity type)
4. **Priority 0**: Base system template (least specific)

Example:
```
Dataset: Hub_Customer (entity_type='DataVault', entity_subtype='Hub')

Resolution Order:
1. Check: template_overrides WHERE dataset_id = 'Hub_Customer'
2. Check: template_overrides WHERE workspace_id = 'current_workspace' AND entity_type = 'DataVault' AND entity_subtype = 'Hub'
3. Check: template_overrides WHERE project_id = 'current_project' AND entity_type = 'DataVault' AND entity_subtype = 'Hub'
4. Check: templates WHERE is_system = true AND entity_type = 'DataVault' AND entity_subtype = 'Hub'
```

## Enhanced `templates` Table Schema

```sql
CREATE TABLE templates (
  template_id UUID PRIMARY KEY,
  account_id UUID REFERENCES accounts,  -- NULL for system templates

  -- Identity
  name VARCHAR NOT NULL,
  description TEXT,
  template_type VARCHAR CHECK (template_type IN ('Full', 'Fragment')),

  -- Categorization
  category VARCHAR CHECK (category IN ('ddl', 'dml', 'etl', ...)),
  language VARCHAR CHECK (language IN ('sql', 'python', 'scala')),
  tags TEXT[],

  -- Applicability (what dataset types this applies to)
  applies_to_entity_type VARCHAR,     -- DataVault | DataMart | null
  applies_to_entity_subtype VARCHAR,  -- Hub | Dimension | null

  -- Content
  jinja_content TEXT NOT NULL,
  variables JSONB,

  -- System vs User
  is_system BOOLEAN DEFAULT false,
  parent_template_id UUID REFERENCES templates,

  created_by UUID REFERENCES users,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## New `template_overrides` Table Schema

```sql
CREATE TABLE template_overrides (
  override_id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts,

  -- What template is being overridden
  base_template_id UUID NOT NULL REFERENCES templates,

  -- Override scope (exactly ONE must be set)
  project_id UUID REFERENCES projects,
  workspace_id UUID REFERENCES workspaces,
  dataset_id UUID REFERENCES datasets,

  -- Filter by dataset type (optional)
  applies_to_entity_type VARCHAR,
  applies_to_entity_subtype VARCHAR,

  -- Override content
  override_type VARCHAR CHECK (override_type IN ('full', 'partial')),
  jinja_content TEXT NOT NULL,
  variables JSONB,

  -- Priority
  priority INT NOT NULL,  -- 3=dataset, 2=workspace, 1=project
  is_active BOOLEAN DEFAULT true,

  created_by UUID REFERENCES users,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,

  CHECK (
    (project_id IS NOT NULL)::int +
    (workspace_id IS NOT NULL)::int +
    (dataset_id IS NOT NULL)::int = 1
  )
);
```

## Use Case Examples

### Example 1: System Admin Creates Global Hub Template
```sql
INSERT INTO templates (
  name, template_type, category, language,
  applies_to_entity_type, applies_to_entity_subtype,
  jinja_content, is_system, account_id
) VALUES (
  'Data Vault Hub DDL',
  'Full',
  'ddl',
  'sql',
  'DataVault',
  'Hub',
  'CREATE TABLE {{ fqn }} (
    {{ hub_key }} STRING NOT NULL,
    load_date TIMESTAMP,
    record_source STRING,
    {% for col in columns %}{{ col.name }} {{ col.data_type }}{% endfor %}
  )',
  true,     -- System template
  NULL      -- Global (no company)
);
```

### Example 2: User Overrides at Project Level
```sql
INSERT INTO template_overrides (
  account_id, base_template_id, project_id,
  applies_to_entity_type, applies_to_entity_subtype,
  override_type, jinja_content, priority
) VALUES (
  'my-company-id',
  'hub-template-id',
  'my-project-id',
  'DataVault',
  'Hub',
  'full',
  'CREATE TABLE {{ fqn }} (
    {{ hub_key }} STRING NOT NULL,
    load_date TIMESTAMP,
    record_source STRING,
    -- PROJECT OVERRIDE: Add audit columns
    created_by STRING,
    updated_by STRING,
    {% for col in columns %}{{ col.name }} {{ col.data_type }}{% endfor %}
  )',
  1  -- Project priority
);
```

### Example 3: User Overrides Specific Dataset
```sql
INSERT INTO template_overrides (
  account_id, base_template_id, dataset_id,
  override_type, jinja_content, priority
) VALUES (
  'my-company-id',
  'hub-template-id',
  'hub-customer-id',
  'full',
  'CREATE TABLE {{ fqn }} (
    customer_hub_key STRING NOT NULL,
    load_date TIMESTAMP,
    record_source STRING,
    -- DATASET OVERRIDE: This hub has special requirements
    gdpr_consent_flag BOOLEAN,
    {% for col in columns %}{{ col.name }} {{ col.data_type }}{% endfor %}
  )
  PARTITIONED BY (load_date)',
  3  -- Dataset priority (highest)
);
```

## Migration Impact

### Tables Removed (5)
- template_fragments
- template_compositions
- template_composition_nodes
- template_composition_edges
- template_composition_versions

### Tables Enhanced (1)
- templates (add new columns)

### Tables Added (1)
- template_overrides (new)

### Final Count
- **Before**: 6 template-related tables
- **After**: 2 template-related tables (templates + template_overrides)
- **Reduction**: 4 fewer tables (-67%)

## Benefits

1. **Simplicity**: 2 tables instead of 6
2. **Flexibility**: Override at any level (project/workspace/dataset)
3. **Type Safety**: Filter by entity type/subtype
4. **Multi-Tenancy**: System templates vs company templates
5. **Clear Priority**: Explicit resolution order
6. **Extensible**: Easy to add more levels or filters later

## Updated Database Count

**Previous**: 53 tables total → Remove 34 → 19 remaining
**Now**: 53 tables total → Remove 39 → 18 remaining

**Additional removals**:
- template_fragments
- template_compositions
- template_composition_nodes
- template_composition_edges
- template_composition_versions

**Final state**: 18 core tables + 1 new (template_overrides) = **19 tables total**

## Next Steps

1. ✅ Run cleanup script to remove 5 template composition tables
2. ⬜ Create migration to enhance `templates` table
3. ⬜ Create migration to add `template_overrides` table
4. ⬜ Migrate any existing data (currently all tables empty)
5. ⬜ Update TypeScript types
6. ⬜ Update services to use new schema
7. ⬜ Implement template resolution logic

## Documentation

Full design document: `docs/design/TEMPLATE_SYSTEM_DESIGN.md`
