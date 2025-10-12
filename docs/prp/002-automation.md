# Product Requirements Document: Databricks Automation Script Generator

## Executive Summary

A React-based web application that enables users to visually design and generate Databricks automation scripts through an intuitive interface combining data modeling, template management, and workflow visualization.

## Product Overview

### Vision
Democratize Databricks automation by providing a visual, template-driven approach to script generation that bridges the gap between data engineers and automation requirements.

### Core Value Proposition
- Visual workflow design for complex Databricks operations
- User-friendly templating system for script generation
- Version-controlled metadata management
- Seamless integration with existing Databricks infrastructure

## Technical Architecture

### Technology Stack

**Frontend**
- React 18+ with TypeScript
- React Flow for visual workflow designer
- Tailwind CSS for styling
- Zustand or Redux for state management

**Backend/Storage**
- Supabase for user configurations and runtime data
- YAML files for metadata (version-controlled via GitHub)
- GitHub API integration for file management

**Templating**
- Jinja2 (via Nunjucks - JavaScript implementation) for templating
- Custom syntax highlighting and validation
- Python-compatible syntax for Databricks familiarity

**AI Integration**
- Claude API for intelligent script generation and validation
- Template suggestion and optimization

## Core Features

### 1. User Authentication & Workspace Management

**Requirements**
- Supabase authentication (email/OAuth)
- Multi-workspace support
- Role-based access control (Admin, Editor, Viewer)
- Workspace-level configuration inheritance

**Database Schema (Supabase)**
```
users
  - id (uuid, pk)
  - email (text)
  - created_at (timestamp)
  - last_login (timestamp)

workspaces
  - id (uuid, pk)
  - name (text)
  - owner_id (uuid, fk -> users)
  - github_repo (text)
  - github_branch (text)
  - created_at (timestamp)

workspace_members
  - workspace_id (uuid, fk)
  - user_id (uuid, fk)
  - role (enum: admin, editor, viewer)
  - joined_at (timestamp)

user_preferences
  - user_id (uuid, pk, fk)
  - workspace_id (uuid, fk)
  - theme (text)
  - default_template_language (text)
  - preferences_json (jsonb)
```

### 2. Data Model Designer (React Flow)

**Requirements**
- Visual node-based interface for defining data models
- Support for Databricks-specific constructs:
  - Tables (Delta, External, Managed)
  - Notebooks
  - Jobs
  - Workflows
  - Clusters
  - Unity Catalog objects
- Drag-and-drop node creation
- Connection lines showing data flow and dependencies
- Node properties panel
- Zoom, pan, minimap controls
- Export to YAML format

**Node Types**
- Source nodes (external data, tables)
- Transformation nodes (notebooks, SQL queries)
- Destination nodes (tables, external systems)
- Control nodes (conditions, loops, triggers)
- Job configuration nodes

**YAML Metadata Structure**
```yaml
data_models:
  - id: model_001
    name: "Customer Data Pipeline"
    description: "ETL pipeline for customer data"
    nodes:
      - id: node_001
        type: source_table
        properties:
          catalog: main
          schema: raw
          table: customers
          format: delta
        position:
          x: 100
          y: 100
      - id: node_002
        type: transformation
        properties:
          notebook_path: /Workspace/transforms/clean_customers
          cluster_config: standard_cluster
        position:
          x: 300
          y: 100
    edges:
      - source: node_001
        target: node_002
        type: data_flow
    metadata:
      created_by: user@example.com
      created_at: 2025-10-02T10:00:00Z
      version: 1.0.0
```

### 3. Template Management System

**Requirements**
- Template library with categorization
- Search and filter capabilities
- Template versioning
- Template variations (toggleable features)
- Live preview with sample data
- Syntax validation and linting
- Import/export templates

**Template Categories**
- Job definitions
- Notebook orchestration
- Table creation/management
- Data quality checks
- Monitoring and alerting
- Security and access control

**Template Structure (YAML)**
```yaml
templates:
  - id: template_001
    name: "Delta Table Creation"
    category: table_management
    description: "Create a managed Delta table with optimizations"
    language: jinja2
    variables:
      - name: catalog_name
        type: string
        required: true
        description: "Unity Catalog name"
      - name: schema_name
        type: string
        required: true
      - name: table_name
        type: string
        required: true
      - name: partition_columns
        type: array
        required: false
        default: []
      - name: enable_cdf
        type: boolean
        required: false
        default: false
    variations:
      - id: with_constraints
        name: "Add table constraints"
        enabled: false
        adds_variables:
          - name: primary_key
            type: array
          - name: check_constraints
            type: array
      - id: with_tblproperties
        name: "Custom table properties"
        enabled: false
        adds_variables:
          - name: custom_properties
            type: object
    template_content: |
      CREATE TABLE IF NOT EXISTS {{ catalog_name }}.{{ schema_name }}.{{ table_name }}
      (
        {% for column in columns %}
        {{ column.name }} {{ column.type }}{% if column.comment %} COMMENT '{{ column.comment }}'{% endif %}{% if not loop.last %},{% endif %}
        {% endfor %}
      )
      USING DELTA
      {% if partition_columns|length > 0 %}
      PARTITIONED BY ({% for col in partition_columns %}{{ col }}{% if not loop.last %}, {% endif %}{% endfor %})
      {% endif %}
      {% if enable_cdf %}
      TBLPROPERTIES (
        'delta.enableChangeDataFeed' = 'true'
      )
      {% endif %}
      {% if variations.with_constraints.enabled %}
      {% if primary_key %}
      CONSTRAINT pk_{{ table_name }} PRIMARY KEY ({% for col in primary_key %}{{ col }}{% if not loop.last %}, {% endif %}{% endfor %})
      {% endif %}
      {% endif %}
    output_type: sql
    tags:
      - delta
      - ddl
      - tables
```

### 4. Template Editor

**Requirements**
- Monaco editor with custom language support
- Real-time syntax validation
- Variable autocomplete
- Template preview with sample data
- Variation toggle interface
- Side-by-side diff view for variations
- Error highlighting and suggestions

**User Interface Components**
- Left panel: Template list and search
- Center panel: Template editor
- Right panel: Variables configuration and variations
- Bottom panel: Preview output

### 5. Script Generation Engine

**Requirements**
- Combine data models + templates → Databricks scripts
- Support multiple output formats (SQL, Python, Scala)
- Variable substitution and validation
- Dependency resolution
- Claude integration for:
  - Template optimization
  - Error detection and fixing
  - Best practice suggestions
  - Documentation generation

**Generation Flow**
1. User selects data model
2. User selects template(s)
3. User configures variables and variations
4. System validates all inputs
5. Claude reviews and optimizes (optional)
6. Generate final scripts
7. Preview with syntax highlighting
8. Download or commit to GitHub

### 6. Configuration Management (Supabase)

**Database Schema**
```
configurations
  - id (uuid, pk)
  - workspace_id (uuid, fk)
  - name (text)
  - type (enum: connection, cluster, job)
  - config_json (jsonb)
  - is_active (boolean)
  - created_at (timestamp)
  - updated_at (timestamp)

script_generations
  - id (uuid, pk)
  - workspace_id (uuid, fk)
  - user_id (uuid, fk)
  - model_id (text)
  - template_ids (text[])
  - variables_json (jsonb)
  - generated_script (text)
  - status (enum: draft, generated, deployed, failed)
  - created_at (timestamp)

databricks_connections
  - id (uuid, pk)
  - workspace_id (uuid, fk)
  - name (text)
  - host (text)
  - token_encrypted (text)
  - workspace_id_databricks (text)
  - is_default (boolean)
```

### 7. GitHub Integration

**Requirements**
- OAuth authentication with GitHub
- Repository selection and branch management
- Automatic commit of YAML metadata files
- Pull request creation for script changes
- Conflict resolution interface
- Commit history viewer

**File Structure in GitHub**
```
/metadata
  /models
    - customer_pipeline.yaml
    - product_pipeline.yaml
  /templates
    - delta_table_creation.yaml
    - job_orchestration.yaml
  /configurations
    - workspace_config.yaml
```

### 8. Testing & Validation

**Requirements**
- Dry-run mode for script generation
- Databricks API integration for validation
- Test data generation
- Execution logs and error tracking
- Rollback capabilities

## User Workflows

### Workflow 1: Create New Data Model
1. User logs in and selects workspace
2. Clicks "New Model" in Data Models section
3. Drag nodes onto React Flow canvas
4. Configure node properties in side panel
5. Draw connections between nodes
6. Save model (commits YAML to GitHub)

### Workflow 2: Generate Scripts from Model
1. User selects existing data model
2. Clicks "Generate Scripts"
3. System suggests relevant templates
4. User selects templates and enables variations
5. Fills in required variables
6. Previews generated output
7. Claude reviews and suggests improvements
8. User approves and downloads/deploys scripts

### Workflow 3: Create Custom Template
1. User navigates to Template Library
2. Clicks "Create Template"
3. Defines template metadata (name, category, variables)
4. Writes template using Handlebars syntax
5. Adds variations with toggle options
6. Tests template with sample data
7. Saves template (commits to GitHub)

## MCP Server Recommendations

To effectively test and integrate with Databricks, you should create the following MCP servers:

### 1. Databricks Workspace MCP Server
**Purpose**: Interact with Databricks APIs for validation and testing

**Capabilities**
- List workspaces, clusters, jobs, notebooks
- Execute SQL queries and notebooks
- Validate table schemas
- Check permissions and access controls
- Retrieve job run history

**Tools to Expose**
- `list_clusters` - Get available clusters
- `execute_sql` - Run SQL statements
- `validate_table_schema` - Verify table exists and matches schema
- `get_job_status` - Check job execution status
- `create_test_table` - Create temporary tables for testing
- `run_notebook` - Execute notebooks with parameters

### 2. GitHub Metadata MCP Server
**Purpose**: Manage YAML files in GitHub repositories

**Capabilities**
- Read/write YAML files
- List metadata files by type
- Validate YAML structure
- Create pull requests
- Manage branches

**Tools to Expose**
- `read_metadata_file` - Get contents of YAML file
- `write_metadata_file` - Update or create YAML file
- `list_models` - List all data model files
- `list_templates` - List all template files
- `validate_yaml` - Check YAML syntax and schema
- `create_pr` - Create pull request for changes

### 3. Template Validation MCP Server
**Purpose**: Validate and test templates before generation

**Capabilities**
- Parse template syntax
- Validate variable usage
- Test template rendering
- Check for common errors
- Suggest improvements

**Tools to Expose**
- `validate_template` - Check template syntax
- `render_template` - Generate output with test data
- `list_template_variables` - Extract all variables
- `check_variable_usage` - Verify all variables are used
- `suggest_optimizations` - AI-powered improvement suggestions

### 4. Script Testing MCP Server
**Purpose**: Test generated scripts in safe environment

**Capabilities**
- Create isolated test workspace
- Execute scripts with dry-run mode
- Capture execution logs
- Rollback changes
- Performance profiling

**Tools to Expose**
- `dry_run_script` - Execute without making changes
- `execute_with_logging` - Run with detailed logs
- `validate_sql_syntax` - Check SQL before execution
- `estimate_cost` - Predict resource usage
- `rollback_changes` - Undo script execution

## Implementation Phases

### Phase 1: Foundation (Weeks 1-3)
- Set up React app with TypeScript
- Implement Supabase authentication
- Create basic workspace management
- Design database schema
- Set up GitHub repository structure

### Phase 2: Visual Designer (Weeks 4-6)
- Integrate React Flow
- Build node library for Databricks objects
- Implement property panels
- Add YAML export functionality
- Create GitHub integration for models

### Phase 3: Template System (Weeks 7-9)
- Build template editor with Monaco
- Implement Jinja2/Nunjucks parsing
- Create variable management system
- Add variation toggle functionality
- Build template library UI

### Phase 4: Script Generation (Weeks 10-12)
- Develop generation engine
- Integrate Claude API
- Build preview system
- Add validation and error handling
- Implement download/deploy options

### Phase 5: Testing & MCP (Weeks 13-14)
- Create MCP servers
- Integrate with Databricks APIs
- Build testing interface
- Add execution logging
- Implement rollback capabilities

### Phase 6: Polish & Launch (Weeks 15-16)
- User testing and feedback
- Performance optimization
- Documentation
- Deployment setup
- Training materials

## Success Metrics

- Time to create data model: < 15 minutes
- Script generation success rate: > 95%
- Template reusability: > 70% of scripts use existing templates
- User satisfaction: > 4.5/5
- Reduction in manual scripting time: > 60%

## Security Considerations

- Encrypted storage of Databricks tokens
- Row-level security in Supabase
- GitHub fine-grained access tokens
- Input sanitization for template variables
- Audit logging for all operations
- Rate limiting on API calls

## Future Enhancements

- AI-powered model suggestions
- Collaborative editing (real-time)
- Template marketplace
- Advanced scheduling and triggers
- Multi-cloud support (AWS, Azure, GCP)
- CLI tool for headless generation
- VS Code extension