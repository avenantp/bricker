# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Uroq is a React-based web application that enables users to visually design and generate Databricks automation scripts through an intuitive interface combining data modeling, template management, and workflow visualization.

**Core Goal**: Democratize Databricks automation by providing a visual, template-driven approach to script generation that bridges the gap between data engineers and automation requirements.

## Technology Stack

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
- Jinja2 (via Nunjucks - JavaScript implementation)
- Python-compatible syntax for Databricks familiarity

**AI Integration**
- Claude API for intelligent script generation and validation
- Template suggestion and optimization

## Architecture

### Core Components

1. **Data Model Designer** - React Flow-based visual interface for defining:
   - Tables (Delta, External, Managed)
   - Notebooks, Jobs, Workflows, Clusters
   - Unity Catalog objects
   - Data flow and dependencies

2. **Template Management System** - Template library with:
   - Categories: job definitions, notebook orchestration, table creation/management, data quality checks, monitoring/alerting, security/access control
   - Variation system (toggleable features within templates)
   - Jinja2 templating with variable substitution

3. **Script Generation Engine** - Combines data models + templates → Databricks scripts
   - Supports SQL, Python, Scala output
   - Claude integration for optimization and validation
   - Dependency resolution

4. **GitHub Integration** - Version-controlled metadata management:
   - `/metadata/models/` - Data model YAML files
   - `/metadata/templates/` - Template YAML files
   - `/metadata/configurations/` - Workspace configs

5. **Workspace Management** - Multi-workspace support with role-based access control (Admin, Editor, Viewer)

### Data Flow

1. User designs data model visually (React Flow)
2. Model exported to YAML (committed to GitHub)
3. User selects templates and configures variations
4. Script generation engine processes: model + template + variables → Databricks script
5. Claude reviews and optimizes (optional)
6. Generated scripts can be downloaded or committed to GitHub

### Supabase Schema

Key tables:
- `users`, `workspaces`, `workspace_members` - Authentication and workspace management
- `configurations` - Connection, cluster, and job configurations
- `script_generations` - Generated script history and status
- `databricks_connections` - Encrypted Databricks workspace credentials

## YAML Metadata Structure

### Data Models
```yaml
data_models:
  - id: model_001
    name: "Pipeline Name"
    nodes:
      - id: node_001
        type: source_table | transformation | destination
        properties:
          catalog: main
          schema: raw
          table: table_name
    edges:
      - source: node_001
        target: node_002
```

### Templates
```yaml
templates:
  - id: template_001
    name: "Template Name"
    category: table_management | job_orchestration | etc
    variables:
      - name: var_name
        type: string | array | boolean | object
        required: true/false
    variations:
      - id: variation_id
        enabled: false
        adds_variables: [...]
    template_content: |
      Jinja2 template content
```

## MCP Server Integration

The project uses MCP servers for Databricks integration:

1. **Databricks Workspace MCP** - Cluster management, SQL execution, schema validation, job status
2. **GitHub Metadata MCP** - YAML file management in repositories
3. **Template Validation MCP** - Template syntax validation and testing
4. **Script Testing MCP** - Dry-run execution and rollback capabilities

## Development Phases

The project is structured in 6 phases:
1. Foundation - Auth, workspace management, database schema (Weeks 1-3)
2. Visual Designer - React Flow integration, node library (Weeks 4-6)
3. Template System - Editor, Jinja2 parsing, variations (Weeks 7-9)
4. Script Generation - Engine, Claude integration, validation (Weeks 10-12)
5. Testing & MCP - MCP servers, Databricks API integration (Weeks 13-14)
6. Polish & Launch - Testing, optimization, documentation (Weeks 15-16)

## UI Standards & Component Guidelines

### Button Classes

All buttons in the application MUST use standardized CSS classes defined in `frontend/src/index.css`. **Never use inline button styles.**

**Available Button Classes:**

1. **`.btn-primary`** - Primary action buttons
   - Use for: Main actions like "Save", "Create", "Submit", "New Project"
   - Styling: `bg-primary-500` (teal in light mode, orange in dark mode) with white text
   - Example:
   ```tsx
   <button onClick={handleSave} className="btn-primary">
     Save Changes
   </button>

   // With icon:
   <button onClick={handleCreate} className="btn-primary inline-flex items-center gap-2">
     <Plus className="w-5 h-5" />
     New Project
   </button>
   ```

2. **`.btn-secondary`** - Secondary action buttons
   - Use for: Secondary actions like "Cancel", "Previous/Next" pagination, "Back"
   - Styling: `bg-gray-200` (light mode) / `bg-gray-700` (dark mode) with appropriate text colors
   - Example:
   ```tsx
   <button onClick={handleCancel} className="btn-secondary">
     Cancel
   </button>

   // Pagination:
   <button onClick={handleNext} className="btn-secondary text-sm px-3 py-1">
     Next
   </button>
   ```

3. **`.btn-icon`** - Icon-only buttons
   - Use for: Settings icons, close buttons, menu toggles, expand/collapse buttons
   - Styling: Minimal padding with hover state, no background color by default
   - Example:
   ```tsx
   <button onClick={handleClose} className="btn-icon" title="Close">
     <X className="w-5 h-5 text-gray-500" />
   </button>

   // With additional layout:
   <button onClick={toggleMenu} className="btn-icon flex items-center gap-2">
     <Menu className="w-5 h-5" />
   </button>
   ```

**Important Notes:**
- All button classes include built-in disabled states (`disabled:opacity-50 disabled:cursor-not-allowed`)
- All button classes include smooth transitions (`transition-colors`)
- Size modifiers (like `text-sm px-3 py-1`) can override default padding when needed
- Layout classes (like `inline-flex items-center gap-2`) should be added for buttons with icons
- Color overrides are allowed for special cases (e.g., red for delete: `btn-primary !bg-red-600 !hover:bg-red-700`)

### Dark Mode Support

All UI components must support dark mode using Tailwind's `dark:` modifier:
- Background colors: `bg-white dark:bg-gray-800`
- Text colors: `text-gray-900 dark:text-gray-100`
- Border colors: `border-gray-200 dark:border-gray-700`
- The dark mode toggle updates `document.documentElement.classList` with the `dark` class

### Color Palette

**Primary Colors (CSS variables):**
- Light mode: Teal/Dark Green (`#1e413a`)
- Dark mode: Orange (`#f46428`)

**Secondary Colors:**
- Vibrant Orange: `#FF3D12`

**Accent Colors:**
- Steel Blue: `#4682b4` (for secondary UI elements like view mode toggles)

**Use Tailwind color utilities:**
- Primary actions: `bg-primary-500`, `hover:bg-primary-600`
- Accent elements: `bg-accent-300` (light mode) / `bg-accent-500` (dark mode)
- Focus rings: `focus:ring-primary-500`

## Security Notes

- Databricks tokens stored encrypted in Supabase
- Row-level security on all database tables
- GitHub fine-grained access tokens
- Input sanitization for all template variables
- Audit logging for all operations
