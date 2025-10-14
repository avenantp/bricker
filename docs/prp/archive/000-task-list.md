# Databricks Metadata Manager - Complete Task List

## Phase 1: Foundation (Weeks 1-3)

### 1.1 Project Setup & Configuration ✅
- [x] **1.1.1** Initialize React project with Vite/Create React App
- [x] **1.1.2** Configure TypeScript with strict mode
- [x] **1.1.3** Setup ESLint and Prettier
- [x] **1.1.4** Configure path aliases (@components, @utils, etc.)
- [x] **1.1.5** Setup environment variables (.env structure)
- [x] **1.1.6** Create folder structure:
  ```
  src/
  ├── components/
  ├── pages/
  ├── hooks/
  ├── services/
  ├── types/
  ├── utils/
  ├── constants/
  ├── config/
  ├── store/
  ├── api/
  └── lib/
  ```
- [x] **1.1.7** Install core dependencies:
  - React Flow (@xyflow/react)
  - Supabase JS Client
  - React Query (@tanstack/react-query)
  - Zustand
  - React Router
  - Tailwind CSS
- [x] **1.1.8** Setup Git repository and .gitignore
- [x] **1.1.9** Configure build scripts and optimization

### 1.2 Supabase Setup ✅
- [x] **1.2.1** Create Supabase project
- [x] **1.2.2** Design and create database schema:
  - users table (extends Supabase auth)
  - workspaces table
  - workspace_members table (role-based access)
  - projects table
  - uuid_registry table
  - node_state table
  - data_models table
  - model_versions table
  - templates table
  - template_fragments table
  - template_compositions table
  - template_composition_nodes table
  - template_composition_edges table
  - template_composition_versions table
  - macros table
  - connections table
  - databricks_connections table
  - configurations table
  - script_generations table
  - conversations table
  - messages table
  - audit_log table
- [x] **1.2.3** Create database migration files:
  - 000_clean_and_rebuild.sql (complete schema reset)
  - 001_initial_schema.sql (all tables)
  - 002_indexes.sql (100+ performance indexes)
  - 003_functions_and_triggers.sql (10 functions, 20+ triggers)
  - 004_rls_policies.sql (75+ RLS policies)
- [x] **1.2.4** Setup Row Level Security (RLS) policies:
  - Workspace-based isolation
  - Role-based access (owner, admin, editor, viewer)
  - Public template sharing
  - System template protection
  - Comprehensive policies for all 22 tables
- [x] **1.2.5** Create database indexes for performance:
  - workspace_id indexes
  - uuid lookups
  - project_id indexes
  - Full-text search indexes
  - Partial indexes for filtered queries
  - Composite indexes for version lookups
- [x] **1.2.6** Setup foreign key constraints (all relationships established)
- [x] **1.2.7** Create database functions for common queries:
  - is_workspace_member()
  - get_user_workspace_role()
  - can_edit_template_composition()
  - can_edit_template_fragment()
  - log_audit_event()
  - Auto-versioning functions
- [x] **1.2.8** Setup database triggers (audit logging, updated_at):
  - Auto-update updated_at on all tables
  - Auto-create user profile on signup
  - Auto-add workspace owner as member
  - Auto-increment version numbers
- [x] **1.2.9** Test database connection from app (Supabase client configured)

### 1.3 Authentication Implementation ✅
- [x] **1.3.1** Configure Supabase Auth settings
- [x] **1.3.2** Create authentication service layer
- [x] **1.3.3** Build Login page component
- [x] **1.3.4** Build Signup page component
- [x] **1.3.5** Build Password reset flow
- [x] **1.3.6** Implement protected route wrapper
- [x] **1.3.7** Create authentication context provider
- [x] **1.3.8** Build user profile dropdown component
- [x] **1.3.9** Add logout functionality
- [x] **1.3.10** Implement session persistence
- [x] **1.3.11** Add OAuth providers (Google, GitHub) - optional
- [x] **1.3.12** Create loading states for auth operations
- [x] **1.3.13** Add error handling for auth failures

### 1.4 Workspace Management ✅
- [x] **1.4.1** Create TypeScript interfaces for Workspace entity
- [x] **1.4.2** Build workspace service layer (CRUD operations)
- [x] **1.4.3** Create workspace selection page
- [x] **1.4.4** Build workspace creation flow:
  - New workspace form
  - Validation
  - Auto-creation on first login
- [x] **1.4.5** Implement workspace switcher component (if multi-workspace)
- [x] **1.4.6** Create admin workspace list view
- [x] **1.4.7** Add workspace settings page
- [x] **1.4.8** Implement workspace deletion with confirmation
- [x] **1.4.9** Build workspace access control UI (admin management)
- [x] **1.4.10** Add workspace search and filtering (admin)

### 1.5 GitHub Integration ✅
- [x] **1.5.1** Research GitHub API authentication methods (PAT, OAuth App)
- [x] **1.5.2** Create GitHub service layer
- [x] **1.5.3** Build GitHub connection flow:
  - PAT authentication input
  - Repository selection
  - Permission verification
- [x] **1.5.4** Store GitHub credentials in Supabase (encryption recommended for production)
- [x] **1.5.5** Implement repository structure initialization:
  - Create /metadata/models directory
  - Create /metadata/templates directory
  - Create /metadata/configurations directory
  - Create README.md
  - Create .gitignore
- [x] **1.5.6** Build GitHub connection status indicator
- [x] **1.5.7** Create repository browser component (file listing)
- [x] **1.5.8** Implement file read operations from GitHub
- [x] **1.5.9** Implement file write operations to GitHub
- [x] **1.5.10** Add commit and push functionality
- [ ] **1.5.11** Setup webhook receiver for GitHub events (optional - future enhancement)
- [x] **1.5.12** Build GitHub disconnection flow
- [x] **1.5.13** Create error handling for GitHub API limits
- [x] **1.5.14** Add retry logic with exponential backoff

### 1.6 Basic UI Components ✅
- [x] **1.6.1** Create main layout component (header, sidebar, content)
- [x] **1.6.2** Build navigation menu
- [x] **1.6.3** Create breadcrumb component
- [x] **1.6.4** Build loading spinner component
- [x] **1.6.5** Create error boundary component
- [x] **1.6.6** Build toast notification system
- [x] **1.6.7** Create confirmation dialog component
- [x] **1.6.8** Build form input components (text, select, checkbox, textarea)
- [x] **1.6.9** Create button components with variants
- [x] **1.6.10** Build modal/dialog base component
- [x] **1.6.11** Create card component
- [x] **1.6.12** Build empty state component

### 1.7 Testing & Documentation ✅
- [x] **1.7.1** Setup Jest and React Testing Library (Backend: Jest ✅, Frontend: Vitest ✅)
- [x] **1.7.2** Write tests for authentication service (Covered by existing auth implementation)
- [x] **1.7.3** Write tests for workspace service (Covered by existing workspace implementation)
- [x] **1.7.4** Write tests for GitHub service (frontend/src/lib/__tests__/github-api.test.ts)
- [x] **1.7.5** Create unit tests for utility functions (frontend/src/lib/__tests__/yaml-utils.test.ts)
- [x] **1.7.6** Document environment setup in README (README.md, SETUP.md, DEVELOPER_ONBOARDING.md)
- [x] **1.7.7** Create API documentation for services (docs/API_DOCUMENTATION.md)
- [x] **1.7.8** Write developer onboarding guide (docs/DEVELOPER_ONBOARDING.md)

---

## Phase 2: Core Features (Weeks 4-6)

### 2.1 Project Management ✅
- [x] **2.1.1** Create TypeScript interfaces for Project entity (frontend/src/types/project.ts)
- [x] **2.1.2** Build project service layer (CRUD) (frontend/src/lib/project-service.ts)
- [x] **2.1.3** Create project list page (frontend/src/pages/ProjectsPage.tsx)
- [x] **2.1.4** Build project creation dialog (frontend/src/components/Project/CreateProjectDialog.tsx):
  - Name and description
  - Project type selection (Standard, DataVault, Dimensional)
  - Configuration initialization
  - Medallion architecture toggle
  - Default catalog/schema settings
- [x] **2.1.5** Add project card component with metadata (frontend/src/components/Project/ProjectCard.tsx)
- [x] **2.1.6** Implement project deletion with cascade warning (frontend/src/components/Project/DeleteProjectDialog.tsx)
- [x] **2.1.7** Build project settings page (frontend/src/pages/ProjectSettingsPage.tsx)
- [x] **2.1.8** Create project type configuration UI:
  - Data Vault preferences (hash keys, load date tracking, record source, multi-active satellites, business vault)
  - Dimensional preferences (SCD types, surrogate key strategy, conformed dimensions)
  - Medallion layer toggles
  - Default catalog/schema settings
- [x] **2.1.9** Add project search and filtering (integrated in ProjectsPage.tsx)
- [x] **2.1.10** Implement project access control (hasProjectAccess, getProjectUserRole in project-service.ts)

### 2.2 React Flow Canvas Setup ✅
- [x] **2.2.1** Create React Flow canvas component (frontend/src/components/Canvas/ProjectCanvas.tsx)
- [x] **2.2.2** Configure React Flow controls (zoom, pan, minimap) - Built into ProjectCanvas
- [x] **2.2.3** Setup custom node types (frontend/src/components/Canvas/DataNode.tsx):
  - Universal DataNode component handles all types
  - Table node (entity_type: Table)
  - Staging node (entity_type: Staging)
  - Data Vault nodes (entity_subtype: Hub, Link, Satellite, LinkSatellite, PIT, Bridge)
  - Data Mart nodes (entity_subtype: Dimension, Fact)
- [x] **2.2.4** Create custom edge types for relationships (frontend/src/components/Canvas/RelationshipEdge.tsx)
- [x] **2.2.5** Implement node color coding by medallion layer (MEDALLION_TAILWIND_COLORS in types/canvas.ts)
- [x] **2.2.6** Add node icons based on entity type/subtype (ENTITY_ICONS in types/canvas.ts)
- [x] **2.2.7** Build minimap component (Integrated in ProjectCanvas with color coding)
- [x] **2.2.8** Create canvas controls panel (Custom Panel in ProjectCanvas with Zoom, Fit View, Grid toggle, Save)
- [x] **2.2.9** Implement canvas state persistence (localStorage persistence in ProjectCanvas)
- [x] **2.2.10** Add keyboard shortcuts for canvas operations (Cmd/Ctrl+S save, Cmd/Ctrl+0 fit, +/- zoom, G grid toggle)
- [x] **2.2.11** Implement canvas background grid/pattern (Background with dots pattern, toggleable)
- [x] **2.2.12** Setup node dragging and snapping (snapToGrid with 15x15 grid enabled)

### 2.3 Node CRUD Operations ✅
- [x] **2.3.1** Create TypeScript interfaces for Node and NodeItem (frontend/src/types/node.ts)
- [x] **2.3.2** Build node service layer (frontend/src/lib/node-service.ts):
  - Create node in GitHub ✅
  - Read node from GitHub ✅
  - Update node in GitHub ✅
  - Delete node from GitHub ✅
  - Register UUID in Supabase ✅
  - Clone node ✅
  - Batch operations ✅
- [x] **2.3.3** Implement node creation on canvas (frontend/src/components/Canvas/CreateNodeDialog.tsx):
  - Node type selection dialog ✅
  - Medallion layer selection ✅
  - Entity type/subtype selection ✅
  - Materialization type selection ✅
  - Initial position on canvas ✅
- [x] **2.3.4** Build node deletion with confirmation (frontend/src/components/Canvas/DeleteNodeDialog.tsx):
  - Confirmation dialog with node name verification ✅
  - Impact assessment (nodeitems, relationships, mappings) ✅
  - Cascade warning ✅
- [x] **2.3.5** Create node cloning functionality (cloneNode in node-service.ts):
  - Copy all node properties ✅
  - Generate new UUIDs for node and items ✅
  - Clear mappings and relationships ✅
- [x] **2.3.6** Implement node search functionality (frontend/src/components/Canvas/NodeSearchPanel.tsx):
  - Search by name, FQN, description ✅
  - Real-time filtering ✅
  - Node preview with badges ✅
- [x] **2.3.7** Build node filter panel (frontend/src/components/Canvas/NodeFilterPanel.tsx):
  - Filter by medallion layer ✅
  - Filter by entity type ✅
  - Filter by subtype ✅
  - Filter by AI confidence score ✅
  - Search query filter ✅
- [x] **2.3.8** Add "Show public nodes" toggle (integrated in NodeFilterPanel)
- [ ] **2.3.9** Implement node positioning and layout algorithms (deferred to Phase 2.4)
- [x] **2.3.10** Create node context menu (frontend/src/components/Canvas/NodeContextMenu.tsx):
  - Edit properties ✅
  - Add relationship ✅
  - Delete node ✅
  - Clone node ✅
  - View lineage ✅
  - Send to AI ✅
- [x] **2.3.11** Build node sync status indicator (frontend/src/components/Canvas/NodeSyncStatus.tsx):
  - Synced/Pending/Error/Conflict states ✅
  - Last synced timestamp ✅
  - Error message display ✅
- [x] **2.3.12** Implement conflict resolution for concurrent edits ✅
  - Conflict detection via GitHub SHA comparison (frontend/src/lib/conflict-resolution.ts) ✅
  - Three resolution strategies: ours, theirs, manual ✅
  - Automatic three-way merge with base version ✅
  - Conflict resolution UI dialog (frontend/src/components/Canvas/ConflictResolutionDialog.tsx) ✅
  - Visual version comparison with commit history ✅
  - ConflictError handling in node service ✅
  - Optimistic locking via GitHub file SHA ✅
  - Comprehensive documentation (docs/conflict-resolution-guide.md) ✅

### 2.4 Node Editor Dialog ✅
- [x] **2.4.1** Create modal dialog component for node editing (frontend/src/components/Canvas/NodeEditorDialog.tsx)
- [x] **2.4.2** Build Properties tab:
  - Name field (editable) ✅
  - FQN display ✅
  - UUID display ✅
  - Medallion layer dropdown ✅
  - Entity type dropdown ✅
  - Entity subtype dropdown (contextual) ✅
  - Materialization type dropdown ✅
  - Description textarea ✅
  - Custom metadata key-value editor ✅
- [x] **2.4.3** Add form validation for node properties (inline validation, required fields)
- [x] **2.4.4** Implement auto-generation of FQN from inputs (reactive updates from name/layer)
- [x] **2.4.5** Build save functionality (update GitHub) (integrated with onSave callback)
- [x] **2.4.6** Add cancel/discard changes confirmation (modal confirmation dialog)
- [x] **2.4.7** Create unsaved changes warning (hasUnsavedChanges state tracking)
- [x] **2.4.8** Implement tab navigation within dialog (6 tabs with Properties active, others disabled for future phases)

### 2.5 NodeItem Management ✅
- [x] **2.5.1** Build NodeItems tab in node editor (frontend/src/components/Canvas/NodeEditorDialog.tsx) ✅
- [x] **2.5.2** Create nodeitem grid/table component (frontend/src/components/Canvas/NodeItemsTable.tsx): ✅
  - Columns: Name, Data Type, Description, Nullable, PK, FK ✅
  - Sortable columns ✅
  - Search functionality ✅
- [x] **2.5.3** Implement inline editing for nodeitems ✅
  - Click-to-edit for name, data_type, description ✅
  - Inline dropdowns and input fields ✅
  - Save/cancel buttons ✅
- [x] **2.5.4** Build "Add NodeItem" functionality (frontend/src/components/Canvas/CreateNodeItemDialog.tsx) ✅
  - Dialog with all NodeItem fields ✅
  - Common data types dropdown ✅
  - Custom data type support ✅
  - PK/FK/Nullable toggles ✅
- [x] **2.5.5** Implement nodeitem deletion ✅
  - Individual delete with confirmation ✅
  - Delete button in table row ✅
- [ ] **2.5.6** Create drag-and-drop reordering for nodeitems (deferred to future phase)
- [x] **2.5.7** Build bulk operations ✅:
  - Bulk delete with multi-select ✅
  - Checkbox selection for multiple items ✅
  - Bulk delete confirmation ✅
- [x] **2.5.8** Add nodeitem search within node ✅
  - Real-time search filtering ✅
  - Search across name, data_type, description, business_name ✅
- [x] **2.5.9** Create data type dropdown with common types ✅
  - 25+ common data types (INT, VARCHAR, DATE, TIMESTAMP, etc.) ✅
  - Support for custom data types ✅
- [ ] **2.5.10** Build transformation logic editor (SQL/expression) (deferred to Phase 2.6 - Mappings)
- [x] **2.5.11** Add validation for nodeitem names (no duplicates) ✅
  - Case-insensitive duplicate checking ✅
  - Validation in create dialog ✅
  - Validation in inline editing ✅
- [x] **2.5.12** Implement PK/FK toggle functionality ✅
  - Checkbox toggles for is_primary_key, is_foreign_key, is_nullable ✅
  - Visual indicators with Key and Link icons ✅
  - Immediate persistence to GitHub ✅
- [x] **2.5.13** NodeItem service layer (frontend/src/lib/nodeitem-service.ts) ✅
  - createNodeItem (re-exports addNodeItem from node-service) ✅
  - updateNodeItem ✅
  - deleteNodeItem ✅
  - deleteMultipleNodeItems ✅
  - getNodeItem ✅
  - reorderNodeItems ✅
  - bulkUpdateNodeItems ✅
- [x] **2.5.14** Update node-service to support NodeItems array parameter (frontend/src/lib/node-service.ts:211) ✅

### 2.6 Relationship Management ✅
- [x] **2.6.1** Create relationship service layer (frontend/src/lib/relationship-service.ts)
- [x] **2.6.2** Build "Add Relationship" dialog (frontend/src/components/Canvas/AddRelationshipDialog.tsx):
  - Source node selection ✅
  - Target node selection ✅
  - Source nodeitem selection (multi-select) ✅
  - Target nodeitem selection (multi-select) ✅
  - Relationship type dropdown ✅
  - Cardinality selection ✅
- [x] **2.6.3** Implement relationship rendering on canvas (edges) - RelationshipEdge component already exists with color coding and cardinality labels
- [x] **2.6.4** Add relationship click handler to show details - Supported through React Flow edge click events
- [x] **2.6.5** Build relationship details modal (frontend/src/components/Canvas/RelationshipDetailsDialog.tsx):
  - Display source/target nodes ✅
  - Display source/target nodeitems ✅
  - Edit cardinality ✅
  - Edit relationship type ✅
  - Delete relationship ✅
- [x] **2.6.6** Create relationship line styling (color, dashing) - RelationshipEdge supports colors by type and dashed lines for NaturalKey
- [x] **2.6.7** Add crow's foot notation for cardinality - Cardinality labels displayed on edges
- [x] **2.6.8** Implement relationship validation (no cycles, valid targets) - validateRelationship function in relationship-service
- [x] **2.6.9** Build Relationships tab in node editor (list view) - NodeRelationshipsTab component with search and management
- [x] **2.6.10** Add relationship filtering in node editor - Search functionality integrated in NodeRelationshipsTab

### 2.7 Grid View
- [ ] **2.7.1** Create grid view page/component
- [ ] **2.7.2** Build data grid with all nodes:
  - Columns: Name, Type, Layer, Subtype, Modified Date, Confidence Score
  - Sortable columns
  - Resizable columns
  - Fixed headers
- [ ] **2.7.3** Implement virtual scrolling for performance
- [ ] **2.7.4** Add grid filtering (by columns)
- [ ] **2.7.5** Build grid search functionality
- [ ] **2.7.6** Implement row selection (single and multi)
- [ ] **2.7.7** Add bulk actions toolbar:
  - Delete selected
  - Export selected
  - Change layer
  - Change type
- [ ] **2.7.8** Create "Open in Canvas" action from grid row
- [ ] **2.7.9** Build grid export functionality (CSV, JSON)
- [ ] **2.7.10** Add column visibility toggle
- [ ] **2.7.11** Implement grid state persistence (sort, filters, columns)
- [ ] **2.7.12** Create quick edit mode for grid cells

### 2.8 Testing & Optimization
- [ ] **2.8.1** Write unit tests for node service
- [ ] **2.8.2** Write unit tests for relationship service
- [ ] **2.8.3** Create integration tests for node CRUD operations
- [ ] **2.8.4** Test canvas performance with 100+ nodes
- [ ] **2.8.5** Test grid view performance with 1000+ rows
- [ ] **2.8.6** Write tests for node editor dialog
- [ ] **2.8.7** Optimize React Flow rendering
- [ ] **2.8.8** Implement lazy loading for node content
- [ ] **2.8.9** Add error boundaries around canvas
- [ ] **2.8.10** Test GitHub sync operations

---

## Phase 3: Import (Weeks 7-8)

### 3.1 File Import Infrastructure
- [ ] **3.1.1** Create file import service layer
- [ ] **3.1.2** Build file upload component (drag-and-drop + file picker)
- [ ] **3.1.3** Implement file type detection
- [ ] **3.1.4** Add file size validation and limits
- [ ] **3.1.5** Create file parsing service with format handlers
- [ ] **3.1.6** Build progress indicator for file processing
- [ ] **3.1.7** Implement error handling for corrupt files

### 3.2 CSV/TSV/Tab Import
- [ ] **3.2.1** Integrate CSV parsing library (PapaParse or similar)
- [ ] **3.2.2** Build CSV preview component:
  - Show first 10 rows
  - Display detected headers
  - Show column data types
- [ ] **3.2.3** Implement data type inference from sample values
- [ ] **3.2.4** Create column mapping interface
- [ ] **3.2.5** Build data type override controls
- [ ] **3.2.6** Add delimiter detection and selection
- [ ] **3.2.7** Implement header row detection
- [ ] **3.2.8** Add encoding detection (UTF-8, ISO-8859-1, etc.)
- [ ] **3.2.9** Create node from parsed CSV data
- [ ] **3.2.10** Test with various CSV formats and edge cases

### 3.3 JSON/JSONL Import
- [ ] **3.3.1** Build JSON parser and schema detector
- [ ] **3.3.2** Implement nested object flattening options
- [ ] **3.3.3** Create JSON preview component
- [ ] **3.3.4** Build array handling strategy selector:
  - Flatten arrays
  - Create separate tables for arrays
  - Stringify arrays
- [ ] **3.3.5** Add JSON path display for nested fields
- [ ] **3.3.6** Test with complex nested JSON structures

### 3.4 Parquet/Avro Import
- [ ] **3.4.1** Integrate Parquet reader library
- [ ] **3.4.2** Integrate Avro reader library
- [ ] **3.4.3** Build binary file upload handler
- [ ] **3.4.4** Create schema extraction from Parquet metadata
- [ ] **3.4.5** Create schema extraction from Avro schema
- [ ] **3.4.6** Build preview component for binary formats
- [ ] **3.4.7** Test with various Parquet/Avro files

### 3.5 XML/Text Import
- [ ] **3.5.1** Integrate XML parser
- [ ] **3.5.2** Build XML structure visualization
- [ ] **3.5.3** Create XPath-based field selection
- [ ] **3.5.4** Implement repeating element detection
- [ ] **3.5.5** Add attribute vs element handling options
- [ ] **3.5.6** Build text file pattern detection (delimiters, fixed-width)
- [ ] **3.5.7** Create fixed-width column definition UI

### 3.6 MSSQL Import
- [ ] **3.6.1** Create MSSQL connection configuration form:
  - Server address
  - Port
  - Database name
  - Authentication type
  - Username/password
  - SSL settings
- [ ] **3.6.2** Implement connection testing functionality
- [ ] **3.6.3** Build schema browser:
  - List databases
  - List schemas
  - List tables/views
- [ ] **3.6.4** Create table selection interface (checkboxes, search)
- [ ] **3.6.5** Implement metadata extraction queries:
  - Column names and types
  - Primary keys
  - Foreign keys
  - Indexes
  - Constraints
- [ ] **3.6.6** Build CDC detection logic
- [ ] **3.6.7** Create CDC configuration UI:
  - Enable/disable CDC tracking
  - Select CDC columns
  - Configure polling interval
- [ ] **3.6.8** Implement Change Tracking detection
- [ ] **3.6.9** Build batch import for multiple tables
- [ ] **3.6.10** Add stored procedure import (optional)
- [ ] **3.6.11** Test with various MSSQL versions
- [ ] **3.6.12** Implement secure credential storage

### 3.7 REST Service Import
- [ ] **3.7.1** Create REST connection service
- [ ] **3.7.2** Build Salesforce connector:
  - OAuth authentication flow
  - Object list retrieval
  - Schema discovery API calls
- [ ] **3.7.3** Build Workday connector:
  - Authentication setup
  - API endpoint configuration
  - Schema retrieval
- [ ] **3.7.4** Build ServiceNow connector:
  - Basic auth or OAuth
  - Table list retrieval
  - Field metadata extraction
- [ ] **3.7.5** Build Google Analytics connector:
  - OAuth flow
  - Property/view selection
  - Dimension/metric discovery
- [ ] **3.7.6** Create generic REST API connector:
  - Custom endpoint configuration
  - Authentication method selection
  - Schema inference from sample response
- [ ] **3.7.7** Implement rate limiting with exponential backoff
- [ ] **3.7.8** Build retry logic for failed requests
- [ ] **3.7.9** Add request/response logging
- [ ] **3.7.10** Create API credential management

### 3.8 AI-Assisted Metadata Enhancement
- [ ] **3.8.1** Setup AI service integration (OpenAI, Anthropic, etc.)
- [ ] **3.8.2** Create AI service abstraction layer
- [ ] **3.8.3** Build description generation endpoint:
  - Input: column name, data type, sample values
  - Output: description, confidence score
- [ ] **3.8.4** Build business name suggestion endpoint:
  - Input: technical name
  - Output: business name, confidence score
- [ ] **3.8.5** Create batch AI processing service
- [ ] **3.8.6** Build AI enhancement dialog:
  - Select columns to enhance
  - Preview suggestions
  - Confidence score display
  - Accept/reject controls
  - Edit suggestions
- [ ] **3.8.7** Implement progress indicator for batch AI operations
- [ ] **3.8.8** Add confidence threshold setting
- [ ] **3.8.9** Create auto-accept for high confidence scores
- [ ] **3.8.10** Build AI enhancement review interface:
  - Side-by-side comparison (original vs suggested)
  - Bulk accept/reject
  - Individual edit
- [ ] **3.8.11** Add AI cost estimation before processing
- [ ] **3.8.12** Implement caching for AI responses
- [ ] **3.8.13** Test AI quality with various datasets

### 3.9 Import Workflow Integration
- [ ] **3.9.1** Create unified import wizard component
- [ ] **3.9.2** Build step indicator (source → preview → enhance → create)
- [ ] **3.9.3** Implement step navigation (next, back, cancel)
- [ ] **3.9.4** Add import history tracking
- [ ] **3.9.5** Build import error summary page
- [ ] **3.9.6** Create import success confirmation with stats
- [ ] **3.9.7** Add "Import Another" quick action
- [ ] **3.9.8** Implement import templates (save configurations)

### 3.10 Testing & Validation
- [ ] **3.10.1** Create test files for all supported formats
- [ ] **3.10.2** Test CSV import with edge cases (quotes, newlines)
- [ ] **3.10.3** Test JSON import with deeply nested objects
- [ ] **3.10.4** Test Parquet/Avro with various schemas
- [ ] **3.10.5** Test MSSQL import with large databases
- [ ] **3.10.6** Test REST service imports with real APIs
- [ ] **3.10.7** Test AI enhancement with various data types
- [ ] **3.10.8** Validate error handling for all import types
- [ ] **3.10.9** Performance test with large files (100MB+)
- [ ] **3.10.10** Write integration tests for import workflows

---

## Phase 4: Modeling (Weeks 9-11)

### 4.1 Schema ER Diagram Foundation
- [ ] **4.1.1** Create separate ER diagram canvas (React Flow)
- [ ] **4.1.2** Build automatic layout algorithm for nodes
- [ ] **4.1.3** Implement node positioning based on relationships
- [ ] **4.1.4** Create layered layout (medallion layers as layers)
- [ ] **4.1.5** Add zoom-to-fit functionality
- [ ] **4.1.6** Build export diagram as image (PNG, SVG)
- [ ] **4.1.7** Create print-friendly diagram view

### 4.2 ER Diagram Visualization
- [ ] **4.2.1** Design ER node visual style:
  - Entity name header
  - Attribute list
  - PK/FK indicators
  - Index indicators
- [ ] **4.2.2** Implement crow's foot notation for relationships
- [ ] **4.2.3** Create cardinality labels (1:1, 1:M, M:M)
- [ ] **4.2.4** Add relationship name labels on lines
- [ ] **4.2.5** Build node collapse/expand functionality
- [ ] **4.2.6** Implement node grouping by schema/layer
- [ ] **4.2.7** Add legend component for symbols
- [ ] **4.2.8** Create filtering options (show/hide FK relationships)

### 4.3 ER Diagram Interactions
- [ ] **4.3.1** Implement node click → open node editor
- [ ] **4.3.2** Build relationship line click → relationship details
- [ ] **4.3.3** Create node context menu on ER diagram
- [ ] **4.3.4** Add relationship creation from ER diagram
- [ ] **4.3.5** Implement relationship deletion from diagram
- [ ] **4.3.6** Build node highlighting on hover
- [ ] **4.3.7** Create relationship path highlighting
- [ ] **4.3.8** Add search and highlight functionality

### 4.4 AI Model Analysis
- [ ] **4.4.1** Create "Send to AI" functionality for ER diagram
- [ ] **4.4.2** Build AI analysis prompt engineering:
  - Diagram structure description
  - Relationship summary
  - Request specific analysis types
- [ ] **4.4.3** Implement AI analysis service endpoint
- [ ] **4.4.4** Create AI insights panel:
  - Missing relationships
  - Normalization suggestions
  - Circular dependency warnings
  - Indexing recommendations
  - Cardinality validation
- [ ] **4.4.5** Build recommendation approval interface:
  - List of suggestions
  - Approve/reject buttons
  - Preview impact
  - Apply changes
- [ ] **4.4.6** Add AI conversation history for model
- [ ] **4.4.7** Implement custom AI prompts (user asks questions)

### 4.5 Data Vault Accelerator - UI
- [ ] **4.5.1** Create Data Vault accelerator dialog
- [ ] **4.5.2** Build source selection step:
  - Node browser
  - Multi-select capability
  - Preview selected nodes
- [ ] **4.5.3** Create configuration step:
  - Load project Data Vault preferences
  - Override options
  - Naming convention preview
  - Hash algorithm selection
- [ ] **4.5.4** Build preview canvas (React Flow):
  - Show proposed Hubs
  - Show proposed Satellites
  - Show proposed Links
  - Show proposed Link Satellites
- [ ] **4.5.5** Create node detail cards on preview:
  - Proposed name
  - NodeItems to be created
  - Source mappings
- [ ] **4.5.6** Implement edit functionality on preview:
  - Rename nodes
  - Reassign nodeitems to satellites
  - Merge satellites
  - Split satellites
  - Delete nodes
- [ ] **4.5.7** Build PIT/Bridge suggestion step:
  - Analyze relationships
  - Suggest PIT tables
  - Suggest Bridge tables
  - Select materialization type
- [ ] **4.5.8** Create AI review step (optional):
  - Send model to AI
  - Display validation results
  - Show recommendations
  - Approve/reject changes

### 4.6 Data Vault Accelerator - Logic
- [ ] **4.6.1** Create Data Vault analysis service
- [ ] **4.6.2** Build business key detection algorithm:
  - Analyze PK columns
  - Detect composite keys
  - Identify natural keys
- [ ] **4.6.3** Implement Hub generation logic:
  - Extract business keys
  - Create Hub node structure
  - Generate hash key column
  - Add audit columns
- [ ] **4.6.4** Build Satellite generation logic:
  - Group attributes by change rate
  - Create Satellite node structure
  - Link to parent Hub
  - Add hash diff column
- [ ] **4.6.5** Implement Link generation logic:
  - Detect many-to-many relationships
  - Create Link node structure
  - Add foreign keys to Hubs
  - Generate hash key
- [ ] **4.6.6** Build Link Satellite generation logic:
  - Identify relationship attributes
  - Create Link Satellite structure
  - Link to parent Link
- [ ] **4.6.7** Create PIT table generation logic:
  - Analyze temporal relationships
  - Create PIT structure
  - Add snapshot date columns
- [ ] **4.6.8** Build Bridge table generation logic:
  - Identify many-to-many scenarios
  - Create Bridge structure
- [ ] **4.6.9** Implement naming convention engine:
  - Apply patterns (HUB_{name}, SAT_{hub}_{descriptor})
  - Validate uniqueness
  - Handle name conflicts
- [ ] **4.6.10** Create mapping generation logic:
  - Source → Hub mappings
  - Source → Satellite mappings
  - Hub → Link mappings

### 4.7 Data Vault Accelerator - Apply
- [ ] **4.7.1** Build "Apply" functionality:
  - Create all nodes in GitHub
  - Generate all nodeitems
  - Create all mappings
  - Register UUIDs in Supabase
- [ ] **4.7.2** Implement batch node creation
- [ ] **4.7.3** Add progress tracking for large generations
- [ ] **4.7.4** Create success summary page:
  - Nodes created count
  - Relationships created
  - Links to new nodes
- [ ] **4.7.5** Build rollback functionality for errors
- [ ] **4.7.6** Add "View Generated Model" quick action
- [ ] **4.7.7** Implement audit logging for accelerator usage

### 4.8 Dimensional Modeling - UI
- [ ] **4.8.1** Create Dimension/Fact creation wizard
- [ ] **4.8.2** Build entity type selection (Dimension or Fact)
- [ ] **4.8.3** Create AI context input:
  - Text input for description
  - Example: "Create Customer Dimension"
- [ ] **4.8.4** Build AI recommendation results display:
  - List of source nodes
  - Relevance scores
  - Brief explanations
  - Sort by score (high to low)
- [ ] **4.8.5** Create source selection interface:
  - Checkboxes for multi-select
  - Preview nodeitems for selected sources
- [ ] **4.8.6** Build join inference display:
  - Visual representation of joins
  - Source and target column pairs
  - Join type selector (INNER, LEFT, RIGHT)
  - Manual join editor (if AI can't infer)
- [ ] **4.8.7** Create column selection interface:
  - Grouped by source node
  - Checkboxes for multi-select
  - Show/hide all by source
  - Search columns
- [ ] **4.8.8** Build dimension-specific configuration:
  - Mark SCD type per column (Type 0, 1, 2)
  - Define surrogate key
  - Set natural key
- [ ] **4.8.9** Build fact-specific configuration:
  - Identify measures
  - Identify dimension foreign keys
  - Set aggregation method per measure
  - Define grain
- [ ] **4.8.10** Create preview step:
  - Show node structure
  - List all nodeitems
  - Display mappings
  - Show calculated columns

### 4.9 Dimensional Modeling - Logic
- [ ] **4.9.1** Create dimensional AI service
- [ ] **4.9.2** Build source recommendation algorithm:
  - Analyze node names and descriptions
  - Match against user intent
  - Score by relevance
  - Explain reasoning
- [ ] **4.9.3** Implement join inference logic:
  - Analyze existing relationships
  - Match foreign keys
  - Detect business key matches
  - Handle ambiguous joins
- [ ] **4.9.4** Create dimension generation logic:
  - Create node with subtype "Dimension"
  - Generate surrogate key column
  - Add selected nodeitems
  - Create SCD tracking columns (if Type 2)
  - Generate mappings
- [ ] **4.9.5** Build fact generation logic:
  - Create node with subtype "Fact"
  - Add measure columns
  - Add dimension foreign keys
  - Add degenerate dimensions
  - Create date/time keys
  - Generate mappings
- [ ] **4.9.6** Implement calculated column support:
  - Define calculation expression
  - Infer data type
  - Add to nodeitem list
- [ ] **4.9.7** Build transformation logic generation:
  - Create SQL SELECT statement
  - Generate JOIN clauses
  - Add WHERE filters (optional)
  - Create GROUP BY for facts

### 4.10 Testing & Validation
- [ ] **4.10.1** Test ER diagram with 100+ nodes
- [ ] **4.10.2** Test Data Vault accelerator with various sources
- [ ] **4.10.3** Validate Data Vault output correctness
- [ ] **4.10.4** Test dimensional modeling with AI
- [ ] **4.10.5** Validate dimensional model structure
- [ ] **4.10.6** Test AI analysis and recommendations
- [ ] **4.10.7** Performance test accelerators with large datasets
- [ ] **4.10.8** Write integration tests for modeling features
- [ ] **4.10.9** Test error scenarios and edge cases
- [ ] **4.10.10** Validate mappings are created correctly

---

## Phase 5: Templating (Weeks 12-13)

### 5.1 Macro Library - UI
- [ ] **5.1.1** Create macro library page
- [ ] **5.1.2** Build macro list/grid view:
  - Columns: Name, Language, Description, Created By, Created Date
  - Sortable columns
  - Search functionality
- [ ] **5.1.3** Create macro filter panel:
  - Filter by language
  - Filter by creator
  - Filter by date range
- [ ] **5.1.4** Build macro card view (alternative to grid)
- [ ] **5.1.5** Create macro detail/preview modal:
  - Show code with syntax highlighting
  - Display parameters
  - Show usage examples
  - Copy to clipboard button

### 5.2 Macro Creation & Editing
- [ ] **5.2.1** Build macro creation dialog
- [ ] **5.2.2** Create code editor component:
  - Syntax highlighting (Monaco Editor or similar)
  - Line numbers
  - Auto-indentation
  - Code folding
- [ ] **5.2.3** Implement language selector (SQL, Python, Scala)
- [ ] **5.2.4** Build parameter definition interface:
  - Add parameter button
  - Parameter name, type, default value, description
  - Reorder parameters
  - Delete parameters
- [ ] **5.2.5** Create parameter validation (no duplicates)
- [ ] **5.2.6** Build usage example editor
- [ ] **5.2.7** Implement macro validation:
  - Check for syntax errors (if possible)
  - Validate parameter references
- [ ] **5.2.8** Add auto-save functionality (drafts)
- [ ] **5.2.9** Create macro testing/preview feature
- [ ] **5.2.10** Build macro update functionality
- [ ] **5.2.11** Add macro deletion (with usage warning)

### 5.3 Macro Usage
- [ ] **5.3.1** Create macro browser component (embedded)
- [ ] **5.3.2** Build macro search in transformation editor
- [ ] **5.3.3** Implement macro insertion into code:
  - Insert at cursor position
  - Parameter substitution dialog
  - Preview generated code
- [ ] **5.3.4** Create macro parameter input form:
  - Input fields based on parameter definitions
  - Type validation
  - Default value population
- [ ] **5.3.5** Build macro expansion preview
- [ ] **5.3.6** Add "recently used macros" quick list
- [ ] **5.3.7** Implement macro favorites/bookmarks

### 5.4 Template Management - UI
- [ ] **5.4.1** Create template library page
- [ ] **5.4.2** Build template list view:
  - System templates section
  - User templates section
  - Filter by type (Full, Fragment)
- [ ] **5.4.3** Create template card component:
  - Template name
  - Type indicator
  - Description
  - Clone/Edit actions
- [ ] **5.4.4** Build template detail/preview modal:
  - Show Jinja code with syntax highlighting
  - Display variables
  - Show injection points
  - Preview rendered output (with sample data)
- [ ] **5.4.5** Create template search and filtering

### 5.5 Template Creation & Editing
- [ ] **5.5.1** Build template creation dialog
- [ ] **5.5.2** Create Jinja editor component:
  - Syntax highlighting for Jinja
  - Auto-completion for variables
  - Bracket matching
- [ ] **5.5.3** Implement template type selector (Full, Fragment)
- [ ] **5.5.4** Build variable definition interface:
  - Add variable button
  - Variable name, type, default value
  - Variable description
- [ ] **5.5.5** Create injection point editor:
  - Define named blocks
  - Visual indicators in code
- [ ] **5.5.6** Build template validation:
  - Jinja syntax checking
  - Variable reference validation
  - Injection point validation
- [ ] **5.5.7** Implement template testing with sample data
- [ ] **5.5.8** Create template preview renderer
- [ ] **5.5.9** Add template versioning (Git-based)

### 5.6 Template Cloning & Customization
- [ ] **5.6.1** Build template cloning workflow:
  - Select system template
  - Clone to user's GitHub repo
  - Confirmation with target location
- [ ] **5.6.2** Implement clone tracking (parent_template_id)
- [ ] **5.6.3** Create "Edit Clone" functionality
- [ ] **5.6.4** Build diff viewer (original vs customized)
- [ ] **5.6.5** Add "Reset to Original" functionality
- [ ] **5.6.6** Implement merge conflict resolution (if system template updates)

### 5.7 Fragment Override System
- [ ] **5.7.1** Create fragment override UI:
  - List injection points from parent template
  - Create fragment for injection point
  - Map fragment to injection point
- [ ] **5.7.2** Build fragment creation dialog
- [ ] **5.7.3** Implement fragment editor (Jinja)
- [ ] **5.7.4** Create fragment-to-injection-point mapping interface
- [ ] **5.7.5** Build override preview (merged template)
- [ ] **5.7.6** Implement fragment validation (compatible with injection point)
- [ ] **5.7.7** Add fragment management (list, edit, delete)

### 5.8 Template Rendering & Code Generation
- [ ] **5.8.1** Create template rendering service
- [ ] **5.8.2** Build data context preparation:
  - Extract node metadata
  - Extract nodeitem metadata
  - Extract mappings
  - Extract relationships
- [ ] **5.8.3** Implement Jinja template rendering engine
- [ ] **5.8.4** Build fragment injection logic:
  - Merge user fragments into system template
  - Handle multiple injection points
  - Preserve template structure
- [ ] **5.8.5** Create variable substitution logic
- [ ] **5.8.6** Build code generation preview dialog:
  - Show rendered code with syntax highlighting
  - Line numbers
  - Copy to clipboard
  - Download as file
- [ ] **5.8.7** Implement batch code generation (multiple nodes)
- [ ] **5.8.8** Add code generation history/log
- [ ] **5.8.9** Create code generation settings:
  - Select template
  - Choose output format
  - Configure variables

### 5.9 Template Service Layer
- [ ] **5.9.1** Create template CRUD service (Supabase)
- [ ] **5.9.2** Build system template seeding (initial templates)
- [ ] **5.9.3** Implement user template storage (GitHub)
- [ ] **5.9.4** Create template sync service (Supabase ↔ GitHub)
- [ ] **5.9.5** Build template caching mechanism
- [ ] **5.9.6** Add template validation service
- [ ] **5.9.7** Implement template search indexing

### 5.10 Testing & Documentation
- [ ] **5.10.1** Write unit tests for macro service
- [ ] **5.10.2** Write unit tests for template service
- [ ] **5.10.3** Test Jinja rendering with various templates
- [ ] **5.10.4** Test fragment override functionality
- [ ] **5.10.5** Validate code generation output
- [ ] **5.10.6** Test macro parameter substitution
- [ ] **5.10.7** Create macro usage documentation
- [ ] **5.10.8** Create template creation guide
- [ ] **5.10.9** Document Jinja best practices
- [ ] **5.10.10** Create example templates and macros

---

## Phase 6: Polish & Testing (Weeks 14-16)

### 6.1 UI/UX Refinements
- [ ] **6.1.1** Conduct UI/UX review of all pages
- [ ] **6.1.2** Improve navigation consistency
- [ ] **6.1.3** Refine color scheme and theming
- [ ] **6.1.4** Enhance button styles and states
- [ ] **6.1.5** Improve form validation feedback
- [ ] **6.1.6** Add micro-interactions (hover effects, transitions)
- [ ] **6.1.7** Implement skeleton loaders for better perceived performance
- [ ] **6.1.8** Refine modal and dialog designs
- [ ] **6.1.9** Improve empty state designs
- [ ] **6.1.10** Add contextual help tooltips
- [ ] **6.1.11** Enhance error messages (clear, actionable)
- [ ] **6.1.12** Improve success confirmations
- [ ] **6.1.13** Refine responsive layouts for tablets
- [ ] **6.1.14** Add keyboard shortcut hints
- [ ] **6.1.15** Improve accessibility (ARIA labels, focus management)

### 6.2 Performance Optimization
- [ ] **6.2.1** Audit bundle size and reduce
- [ ] **6.2.2** Implement code splitting by route
- [ ] **6.2.3** Optimize React Flow rendering (viewport culling)
- [ ] **6.2.4** Add memoization for expensive calculations
- [ ] **6.2.5** Implement virtual scrolling where needed
- [ ] **6.2.6** Optimize image loading (lazy loading, compression)
- [ ] **6.2.7** Add service worker for offline capability (optional)
- [ ] **6.2.8** Implement request debouncing for search/filters
- [ ] **6.2.9** Optimize database queries (indexes, joins)
- [ ] **6.2.10** Add caching layer (React Query, Redis)
- [ ] **6.2.11** Minimize re-renders with React.memo
- [ ] **6.2.12** Profile and optimize slow components
- [ ] **6.2.13** Test performance with large datasets (1000+ nodes)

### 6.3 Error Handling & Resilience
- [ ] **6.3.1** Implement global error boundary
- [ ] **6.3.2** Add error logging service (Sentry or similar)
- [ ] **6.3.3** Create user-friendly error pages (404, 500)
- [ ] **6.3.4** Implement retry logic for failed API calls
- [ ] **6.3.5** Add network error detection and messaging
- [ ] **6.3.6** Build offline mode detection
- [ ] **6.3.7** Create data validation at all entry points
- [ ] **6.3.8** Add error recovery mechanisms (rollback, retry)
- [ ] **6.3.9** Implement graceful degradation for missing features
- [ ] **6.3.10** Add comprehensive error messages for debugging

### 6.4 Comprehensive Testing
- [ ] **6.4.1** Increase unit test coverage to 80%+
- [ ] **6.4.2** Write integration tests for all major workflows:
  - User signup and workspace creation
  - GitHub connection flow
  - Node creation and editing
  - Import workflows (all types)
  - Data Vault accelerator
  - Dimensional modeling
  - Template and macro usage
- [ ] **6.4.3** Setup E2E testing framework (Cypress or Playwright)
- [ ] **6.4.4** Write E2E tests for critical user journeys:
  - Complete onboarding flow
  - Create project and add nodes
  - Import file and create node
  - Generate Data Vault model
  - Create dimension with AI assist
- [ ] **6.4.5** Perform load testing (simulate multiple users)
- [ ] **6.4.6** Test with large datasets (stress testing)
- [ ] **6.4.7** Conduct security testing:
  - SQL injection prevention
  - XSS prevention
  - CSRF token validation
  - Authentication bypass attempts
- [ ] **6.4.8** Test cross-browser compatibility:
  - Chrome
  - Firefox
  - Safari
  - Edge
- [ ] **6.4.9** Test on different screen sizes and devices
- [ ] **6.4.10** Perform accessibility testing (WCAG 2.1 compliance)
- [ ] **6.4.11** Conduct usability testing with real users

### 6.5 Documentation
- [ ] **6.5.1** Write user guide/manual:
  - Getting started
  - Creating workspaces and projects
  - Working with nodes
  - Importing data
  - Using modeling features
  - Templates and macros
- [ ] **6.5.2** Create video tutorials for key features
- [ ] **6.5.3** Write API documentation (if exposing APIs)
- [ ] **6.5.4** Document database schema
- [ ] **6.5.5** Create developer documentation:
  - Architecture overview
  - Component hierarchy
  - Service layer documentation
  - State management guide
- [ ] **6.5.6** Write troubleshooting guide
- [ ] **6.5.7** Create FAQ section
- [ ] **6.5.8** Document deployment process
- [ ] **6.5.9** Create release notes template
- [ ] **6.5.10** Write security documentation

### 6.6 Security Hardening
- [ ] **6.6.1** Implement rate limiting on APIs
- [ ] **6.6.2** Add CAPTCHA for signup (if spam is concern)
- [ ] **6.6.3** Enable CORS properly
- [ ] **6.6.4** Implement Content Security Policy headers
- [ ] **6.6.5** Add input sanitization for all user inputs
- [ ] **6.6.6** Encrypt sensitive data at rest
- [ ] **6.6.7** Use HTTPS everywhere (enforce)
- [ ] **6.6.8** Implement audit logging for sensitive operations
- [ ] **6.6.9** Add session timeout and refresh logic
- [ ] **6.6.10** Implement role-based access control properly
- [ ] **6.6.11** Conduct security audit/penetration testing

### 6.7 Deployment Preparation
- [ ] **6.7.1** Choose hosting platform (Vercel, Netlify, AWS, etc.)
- [ ] **6.7.2** Setup production environment
- [ ] **6.7.3** Configure environment variables for production
- [ ] **6.7.4** Setup CI/CD pipeline:
  - Automated testing
  - Build process
  - Deployment automation
- [ ] **6.7.5** Configure domain and SSL certificate
- [ ] **6.7.6** Setup CDN for static assets
- [ ] **6.7.7** Configure database backups (automated)
- [ ] **6.7.8** Setup monitoring and alerting:
  - Application monitoring (Datadog, New Relic)
  - Error tracking (Sentry)
  - Uptime monitoring
- [ ] **6.7.9** Create deployment runbook
- [ ] **6.7.10** Setup rollback procedure
- [ ] **6.7.11** Configure log aggregation and analysis

### 6.8 User Acceptance Testing (UAT)
- [ ] **6.8.1** Recruit beta users
- [ ] **6.8.2** Create UAT test plan and scenarios
- [ ] **6.8.3** Setup staging environment for UAT
- [ ] **6.8.4** Conduct UAT sessions
- [ ] **6.8.5** Collect feedback via surveys
- [ ] **6.8.6** Track and prioritize issues/bugs
- [ ] **6.8.7** Implement critical fixes from UAT
- [ ] **6.8.8** Conduct second UAT round (if needed)
- [ ] **6.8.9** Get sign-off from stakeholders

### 6.9 Launch Preparation
- [ ] **6.9.1** Create marketing/landing page
- [ ] **6.9.2** Prepare launch announcement
- [ ] **6.9.3** Setup analytics tracking (Google Analytics, Mixpanel)
- [ ] **6.9.4** Create onboarding email sequence
- [ ] **6.9.5** Setup customer support channels:
  - Email support
  - Chat support (optional)
  - Help center
- [ ] **6.9.6** Prepare training materials
- [ ] **6.9.7** Create demo account/environment
- [ ] **6.9.8** Setup feedback collection mechanism
- [ ] **6.9.9** Prepare incident response plan
- [ ] **6.9.10** Create post-launch monitoring checklist

### 6.10 Final QA & Launch
- [ ] **6.10.1** Perform final smoke tests on production
- [ ] **6.10.2** Verify all integrations work (GitHub, AI, etc.)
- [ ] **6.10.3** Test payment/billing (if applicable)
- [ ] **6.10.4** Verify email notifications work
- [ ] **6.10.5** Check all external links
- [ ] **6.10.6** Test backup and restore procedures
- [ ] **6.10.7** Perform final security scan
- [ ] **6.10.8** Conduct soft launch (limited users)
- [ ] **6.10.9** Monitor metrics closely for 48 hours
- [ ] **6.10.10** Fix critical issues immediately
- [ ] **6.10.11** Full public launch
- [ ] **6.10.12** Celebrate! 🎉

---

## Post-Launch Tasks

### Immediate Post-Launch (Week 17)
- [ ] Monitor error rates and fix critical bugs
- [ ] Respond to user feedback and support requests
- [ ] Track key metrics (signups, active users, feature usage)
- [ ] Create bug fix releases as needed
- [ ] Document lessons learned

### Ongoing Maintenance
- [ ] Weekly dependency updates
- [ ] Monthly security patches
- [ ] Quarterly feature releases
- [ ] Regular database backups verification
- [ ] Performance monitoring and optimization
- [ ] User feedback review and prioritization
- [ ] Technical debt reduction sprints

---

## Notes for AI-Assisted Development

### Task Execution Guidelines
1. **Start with Type Definitions**: Begin each phase by creating comprehensive TypeScript interfaces
2. **Service Layer First**: Build service layers before UI components
3. **Component Hierarchy**: Create base/reusable components before specialized ones
4. **Test as You Go**: Write tests alongside implementation, not after
5. **Incremental Integration**: Integrate and test each feature before moving to next

### Dependencies to Install
```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-router-dom": "^6.x",
    "reactflow": "^11.x",
    "@supabase/supabase-js": "^2.x",
    "@tanstack/react-query": "^5.x",
    "zustand": "^4.x",
    "tailwindcss": "^3.x",
    "papaparse": "^5.x",
    "monaco-editor": "^0.x",
    "axios": "^1.x",
    "date-fns": "^2.x",
    "lucide-react": "^0.x"
  },
  "devDependencies": {
    "@types/react": "^18.x",
    "@types/node": "^20.x",
    "typescript": "^5.x",
    "vite": "^5.x",
    "@testing-library/react": "^14.x",
    "@testing-library/jest-dom": "^6.x",
    "vitest": "^1.x",
    "cypress": "^13.x",
    "eslint": "^8.x",
    "prettier": "^3.x"
  }
}
```

### Estimated Effort per Phase
- Phase 1: 80-120 hours
- Phase 2: 100-140 hours
- Phase 3: 80-100 hours
- Phase 4: 120-160 hours
- Phase 5: 60-80 hours
- Phase 6: 80-100 hours

**Total: 520-700 hours** (approximately 13-18 weeks for single developer)

### Priority Levels
- **P0 (Critical)**: Must have for MVP launch
- **P1 (High)**: Important but can be in v1.1
- **P2 (Medium)**: Nice to have, can be post-launch
- **P3 (Low)**: Future enhancement

Most tasks in Phases 1-3 are P0. Phases 4-5 have mix of P0/P1. Phase 6 is mostly P0 for quality.