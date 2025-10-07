# Template Compositions - YAML Structure

This directory contains YAML files for template compositions that are stored in user workspaces and version-controlled via GitHub.

## Directory Structure

```
metadata/templates/
├── README.md                           # This file
├── fragments/                          # Reusable template fragments
│   ├── headers/
│   │   ├── standard-header.yaml
│   │   └── databricks-header.yaml
│   ├── validations/
│   │   ├── table-exists.yaml
│   │   └── schema-validation.yaml
│   ├── transformations/
│   │   └── staging-transform.yaml
│   └── error-handling/
│       └── try-catch-wrapper.yaml
└── compositions/                       # Main template compositions
    ├── process-staging-table.yaml
    ├── create-dimension-table.yaml
    └── data-quality-check.yaml
```

## YAML Schema

### Template Fragment (`fragments/**/*.yaml`)

```yaml
# Fragment metadata
metadata:
  id: fragment-uuid-v4                 # UUID (generated on creation)
  name: "Table Existence Validation"   # Fragment name
  description: "Validates that a table exists before processing"
  category: validation                 # header, validation, transformation, etc.
  language: sql                        # sql, python, scala
  version: "1.0.0"                     # Semantic version
  author: "user@example.com"
  created_at: "2025-10-07T10:00:00Z"
  updated_at: "2025-10-07T10:00:00Z"
  is_system_template: false            # true = only editable in dev mode
  cloned_from: null                    # UUID of original if cloned

# Template variables
variables:
  - name: table_name
    type: string
    required: true
    default: null
    description: "Name of the table to validate"

  - name: catalog_name
    type: string
    required: true
    default: "main"
    description: "Catalog name"

  - name: schema_name
    type: string
    required: true
    default: "default"
    description: "Schema name"

# Dependencies (other fragment IDs this depends on)
dependencies: []

# The actual template content (Jinja2)
content: |
  -- Validate table exists
  {% if validate_existence %}
  SELECT CASE
    WHEN COUNT(*) = 0 THEN 'ERROR: Table does not exist'
    ELSE 'Table exists'
  END AS validation_result
  FROM information_schema.tables
  WHERE table_catalog = '{{ catalog_name }}'
    AND table_schema = '{{ schema_name }}'
    AND table_name = '{{ table_name }}';
  {% endif %}
```

### Template Composition (`compositions/*.yaml`)

```yaml
# Composition metadata
metadata:
  id: composition-uuid-v4              # UUID
  name: "process-staging-table"        # Composition name
  description: "Process data from staging to curated layer"
  language: sql
  version: "1.0.0"
  author: "user@example.com"
  created_at: "2025-10-07T10:00:00Z"
  updated_at: "2025-10-07T10:00:00Z"
  is_system_template: false
  cloned_from: null
  tags:
    - staging
    - etl
    - data-quality

# Flow graph definition
flow:
  # Nodes in the decision tree
  nodes:
    - id: start
      type: start
      position:
        x: 400
        y: 50
      data:
        label: "Start"

    - id: header-fragment
      type: fragment
      position:
        x: 400
        y: 150
      data:
        label: "Header"
        fragment_id: header-fragment-uuid
        fragment_name: "Standard Header"
        is_enabled: true

    - id: validation-condition
      type: condition
      position:
        x: 400
        y: 300
      data:
        label: "Should Validate?"
        condition: "{% if enable_validation %}"

    - id: validation-fragment
      type: fragment
      position:
        x: 200
        y: 450
      data:
        label: "Table Validation"
        fragment_id: validation-fragment-uuid
        fragment_name: "Table Exists"
        is_enabled: true

    - id: transform-fragment
      type: fragment
      position:
        x: 400
        y: 600
      data:
        label: "Data Transformation"
        fragment_id: transform-fragment-uuid
        fragment_name: "Staging Transform"
        is_enabled: true

    - id: end
      type: end
      position:
        x: 400
        y: 750
      data:
        label: "End"

  # Edges (connections) in the decision tree
  edges:
    - id: e1
      source: start
      target: header-fragment
      type: default

    - id: e2
      source: header-fragment
      target: validation-condition
      type: default

    - id: e3
      source: validation-condition
      target: validation-fragment
      source_handle: "true"
      label: "Yes"

    - id: e4
      source: validation-condition
      target: transform-fragment
      source_handle: "false"
      label: "No"

    - id: e5
      source: validation-fragment
      target: transform-fragment
      type: default

    - id: e6
      source: transform-fragment
      target: end
      type: default

# Compiled template (generated on save)
compiled_template: |
  -- Fragment: Header
  -- Process Staging Table
  -- Generated: 2025-10-07

  {% if enable_validation %}
  -- Fragment: Table Validation
  SELECT CASE
    WHEN COUNT(*) = 0 THEN 'ERROR: Table does not exist'
    ELSE 'Table exists'
  END AS validation_result
  FROM information_schema.tables
  WHERE table_catalog = '{{ catalog_name }}'
    AND table_schema = '{{ schema_name }}'
    AND table_name = '{{ table_name }}';
  {% endif %}

  -- Fragment: Data Transformation
  CREATE OR REPLACE TABLE {{ catalog_name }}.{{ schema_name }}.{{ table_name }}_processed AS
  SELECT * FROM {{ catalog_name }}.{{ schema_name }}.{{ table_name }}
  WHERE updated_at > CURRENT_DATE - INTERVAL '{{ lookback_days }}' DAYS;

# Validation metadata
validation:
  is_valid: true
  errors: []
  warnings: []
  last_validated_at: "2025-10-07T10:30:00Z"
```

## YAML Validation Rules

When in dev mode, all YAML files are validated against these rules:

### Structure Validation
1. **Required Fields**:
   - `metadata` object with `id`, `name`, `version`
   - `content` field for fragments
   - `flow` object with `nodes` and `edges` for compositions

2. **Type Validation**:
   - `metadata.id` must be valid UUID v4
   - `metadata.version` must follow semver (e.g., "1.0.0")
   - `metadata.created_at` must be ISO 8601 timestamp
   - `variables[].type` must be one of: string, number, boolean, array, object

3. **Node Type Validation**:
   - `type` must be one of: start, end, fragment, condition, merge
   - Each node must have unique `id`
   - Positions must have numeric `x` and `y`

4. **Edge Validation**:
   - `source` and `target` must reference existing node IDs
   - Each edge must have unique `id`
   - Condition nodes must have `source_handle` of "true" or "false"

### Content Validation
1. **Jinja2 Syntax**: Template content must be valid Jinja2
2. **Variable References**: All variables used in templates must be declared
3. **Fragment Dependencies**: Referenced fragment IDs must exist

### Security Validation
1. **No SQL Injection**: Templates cannot contain dynamic SQL execution
2. **No File System Access**: Templates cannot read/write files
3. **No Network Access**: Templates cannot make external requests

## Example Usage

### Creating a New Fragment

```yaml
# metadata/templates/fragments/validations/row-count-check.yaml
metadata:
  id: 550e8400-e29b-41d4-a716-446655440001
  name: "Row Count Validation"
  description: "Ensures table has minimum row count"
  category: validation
  language: sql
  version: "1.0.0"
  author: "admin@urck.io"
  created_at: "2025-10-07T10:00:00Z"
  updated_at: "2025-10-07T10:00:00Z"
  is_system_template: false
  cloned_from: null

variables:
  - name: min_row_count
    type: number
    required: true
    default: 1
    description: "Minimum expected row count"

  - name: table_full_name
    type: string
    required: true
    description: "Fully qualified table name"

dependencies: []

content: |
  -- Row count validation
  SELECT
    COUNT(*) AS row_count,
    CASE
      WHEN COUNT(*) >= {{ min_row_count }} THEN 'PASS'
      ELSE 'FAIL'
    END AS validation_status
  FROM {{ table_full_name }};
```

### Cloning a System Template

When a user clones a system template to their workspace:

1. Original system template remains unchanged
2. Cloned template gets new UUID
3. `cloned_from` field references original
4. `is_system_template` set to `false`
5. `github_path` set to workspace repo path
6. User can now customize the clone

## GitHub Integration

### Sync Process

1. **Save to Database**: Template saved to Supabase first
2. **Generate YAML**: Convert database record to YAML
3. **Commit to GitHub**: Write YAML to workspace repo
4. **Track Path**: Store GitHub path in database

### File Naming Convention

```
metadata/templates/
  fragments/{category}/{name-slugified}.yaml
  compositions/{name-slugified}.yaml
```

Example:
- Fragment: `metadata/templates/fragments/validations/table-exists.yaml`
- Composition: `metadata/templates/compositions/process-staging-table.yaml`

## Validation Command (Dev Mode Only)

```bash
# Validate all YAML files in workspace
npm run validate:templates

# Validate specific file
npm run validate:templates -- --file metadata/templates/compositions/process-staging-table.yaml

# Auto-fix common issues
npm run validate:templates -- --fix
```

## Best Practices

1. **Version Control**: Always increment version on changes
2. **Descriptive Names**: Use clear, descriptive names for fragments and compositions
3. **Documentation**: Add descriptions to all variables
4. **Testing**: Test templates with sample data before committing
5. **Dependencies**: Minimize fragment dependencies for reusability
6. **Categories**: Use consistent category names across fragments
