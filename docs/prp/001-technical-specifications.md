# UROQ Databricks Automation Metadata Manager - Technical Specification

## 1. Project Overview

### 1.1 Purpose
A React web application for managing metadata used to generate automation scripts for Databricks, featuring visual workflow design, schema modeling, and AI-assisted data modeling.

### 1.2 Technology Stack
- **Frontend**: React with React Flow for diagram visualization
- **Backend/Database**: Supabase (PostgreSQL)
- **Version Control**: GitHub integration for node metadata
- **AI Integration**: For metadata discovery, description generation, and modeling assistance

## 2. Data Architecture

### 2.1 Storage Strategy
- **Supabase Database**: Core application metadata (workspaces, projects, connections, configurations, UUIDs)
- **GitHub Repository**: Node and NodeItem definitions (versioned, user-owned)
- **Hybrid Tracking**: Supabase maintains UUID registry and state tracking for GitHub-stored nodes

### 2.2 Identifier System
- **Fully Qualified Names (FQN)**: Human-readable hierarchical names
- **UUIDs**: Immutable identifiers for lineage tracking
- **Purpose**: Enable renaming while maintaining referential integrity and lineage

## 3. Core Domain Model

### 3.1 Workspace Entity
```
Workspace
├── id (UUID)
├── name
├── owner_user_id
├── github_repo_url (required)
├── github_connection_status
├── created_at
├── updated_at
└── settings (JSON)
```

**Business Rules**:
- One workspace per user by default
- Admin users can view all workspaces
- GitHub repo connection required during workspace creation
- New user flow: Sign in → Create Workspace → Connect GitHub repo (blocking)

### 3.2 Project Entity
```
Project
├── id (UUID)
├── workspace_id (FK)
├── name
├── description
├── project_type (Standard | DataVault | Dimensional)
├── configuration (JSON)
│   ├── medallion_layers_enabled
│   ├── data_vault_preferences
│   └── dimensional_preferences
├── created_at
└── updated_at
```

**Access Control**:
- Regular users: Own workspace projects only
- Admin users: All projects across all workspaces

### 3.3 Node Entity (Stored in GitHub)
```
Node
├── uuid (tracked in Supabase)
├── fqn (Fully Qualified Name)
├── project_id
├── name
├── medallion_layer (Raw | Bronze | Silver | Gold)
├── entity_type (Table | Staging | PersistentStaging | DataVault | DataMart)
├── entity_subtype (Dimension | Fact | Hub | Link | Satellite | LinkSatellite | PIT | Bridge | null)
├── materialization_type (Table | View | MaterializedView | null)
├── description
├── metadata (JSON)
│   ├── source_system
│   ├── business_owner
│   ├── technical_owner
│   ├── refresh_frequency
│   └── custom_properties
├── ai_confidence_score (0-100)
├── node_items[] (array of NodeItem)
├── created_at
├── updated_at
└── git_commit_hash
```

**Node Classification Hierarchy**:
```
Medallion Layer
├── Raw (Landing)
├── Bronze
├── Silver
└── Gold
    ├── Entity Type
    │   ├── Table
    │   ├── Staging
    │   ├── Persistent Staging
    │   ├── Data Vault
    │   │   └── Subtype: Hub, Link, Satellite, LinkSatellite, PIT, Bridge
    │   └── Data Mart
    │       └── Subtype: Dimension, Fact
```

### 3.4 NodeItem Entity (Stored in GitHub within Node)
```
NodeItem (Column/Attribute)
├── uuid (tracked in Supabase)
├── fqn
├── node_uuid (parent)
├── name
├── data_type
├── description
├── business_name
├── is_primary_key
├── is_foreign_key
├── is_nullable
├── default_value
├── transformation_logic
├── ai_confidence_score (0-100)
├── source_mappings[] (array)
│   └── SourceMapping
│       ├── source_node_uuid
│       ├── source_nodeitem_uuid
│       ├── mapping_type (Direct | Transform | Derived | Calculated)
│       └── transformation_expression
├── target_mappings[] (array)
│   └── TargetMapping
│       ├── target_node_uuid
│       ├── target_nodeitem_uuid
│       └── mapping_type
├── relationships[] (array)
│   └── Relationship
│       ├── related_node_uuid
│       ├── related_nodeitem_uuid
│       ├── relationship_type (FK | BusinessKey | NaturalKey)
│       └── cardinality
├── created_at
└── updated_at
```

**Mapping Architecture**:
- **Many-to-One**: Multiple sources can map to one target
- **One-to-Many**: One source can map to multiple targets
- **Purpose**: Support Data Vault (multiple sources) and Data Mart (fan-out) patterns

### 3.5 Connection Entity
```
Connection
├── id (UUID)
├── workspace_id (FK)
├── name
├── connection_type (MSSQL | Salesforce | Workday | ServiceNow | GoogleAnalytics | RestAPI)
├── configuration (JSON - encrypted credentials)
├── is_active
├── created_at
└── updated_at
```

### 3.6 Macro Entity
```
Macro
├── id (UUID)
├── name
├── description
├── code_fragment
├── language (SQL | Python | Scala)
├── parameters (JSON array)
├── is_public (always true)
├── created_by_user_id
├── created_at
└── updated_at
```

**Access**: All macros are public and accessible to all users

### 3.7 Template Entity
```
Template
├── id (UUID)
├── name
├── template_type (Full | Fragment)
├── description
├── jinja_content
├── is_system (boolean)
├── parent_template_id (FK, for clones)
├── injection_points[] (array of strings)
├── created_at
└── updated_at
```

**Template Management**:
- System templates stored in Supabase
- Users can clone to GitHub repo for customization
- Support fragment overrides and injection at designated points

## 4. Feature Requirements

### 4.1 User Authentication & Workspace Initialization

**User Flow**:
1. User signs in (Supabase Auth)
2. System checks for existing workspace
3. If no workspace exists:
   - Create workspace
   - Prompt for GitHub repo connection
   - Block access until repo connected
4. Load workspace dashboard

**Admin Capabilities**:
- View all workspaces in system
- Access any project across workspaces
- Manage system templates and configurations

### 4.2 Project Canvas (React Flow)

**Visual Editor Requirements**:

**Canvas View**:
- Drag-and-drop node creation
- Pan and zoom controls
- Mini-map for navigation
- Node search with filters (medallion layer, entity type, subtype)
- Toggle between diagram view and grid view

**Node Representation**:
- Visual indicators for medallion layer (color coding)
- Icon for entity type/subtype
- Display FQN and name
- Show AI confidence score badge if < 80%
- Connection lines for relationships

**Node Search Panel**:
```
Search Features:
├── Text search (name, description)
├── Filter by medallion layer
├── Filter by entity type
├── Filter by subtype
├── Filter by AI confidence score
├── Show public nodes (from other projects)
└── Show private nodes (current project)
```

**Grid View**:
- Sortable columns: Name, Type, Layer, Subtype, Modified Date, Confidence Score
- Inline editing capabilities
- Bulk selection and actions
- Export to CSV

**Interactions**:
- **Click node**: Open node editor dialog
- **Right-click node**: Context menu
  - Edit properties
  - Add relationship
  - Delete node
  - Clone node
  - View lineage
  - Send to AI for analysis
- **Click relationship line**: Show relationship details modal
  - Display source and target nodes/nodeitems
  - Edit cardinality
  - Edit relationship type
  - Delete relationship

### 4.3 Metadata Import

**4.3.1 File Import**

**Supported Formats**:
- CSV (.csv)
- TSV (.tsv)
- Tab-delimited (.tab)
- JSON (.json)
- JSON Lines (.jsonl)
- Avro (.avro)
- Parquet (.parquet)
- Plain text (.txt)
- XML (.xml)

**Import Process**:
1. User drags file onto canvas or uses file picker
2. System parses file and infers schema
3. Display preview with detected columns and data types
4. User reviews and adjusts:
   - Column names
   - Data types
   - Nullable flags
   - Primary keys
5. Optional: Run AI description generation
6. Create node with nodeitems
7. Store in GitHub, register UUID in Supabase

**Metadata Inference Logic**:
- Data type detection based on sample values
- Nullable detection
- Unique value analysis for potential keys
- Format pattern detection (dates, emails, etc.)

**4.3.2 Database Import (MSSQL)**

**Connection Setup**:
- Server address
- Database name
- Authentication (Windows | SQL Server)
- SSL/encryption settings

**Import Options**:
- Select specific schemas
- Select specific tables/views
- Include Change Data Capture (CDC) tables
- Include Change Tracking metadata
- Import stored procedures and functions (optional)

**CDC/CT Handling**:
- Automatically detect CDC enabled tables
- Create corresponding tracking nodeitems
- Map CDC columns (operation, LSN, etc.)
- Configure CDC polling settings

**4.3.3 REST Service Import**

**Supported Services**:
- Salesforce (via REST API)
- Workday (via REST API)
- ServiceNow (via REST API)
- Google Analytics (via Raw Data API)

**Import Process**:
1. Configure connection with API credentials
2. Fetch object/entity list
3. Select objects to import
4. System retrieves metadata schema
5. Create nodes and nodeitems
6. Store API endpoint configurations

**Rate Limiting**: Respect API rate limits with exponential backoff

**4.3.4 AI-Assisted Metadata Enhancement**

**AI Services**:

**Description Generation**:
- Input: Column name, data type, sample values
- Output: Human-readable description
- Confidence score (0-100)

**Business Name Suggestion**:
- Input: Technical column name
- Output: Business-friendly name
- Confidence score (0-100)

**Batch Processing**:
- Process entire node (all nodeitems)
- Progress indicator
- Review interface showing:
  - Original vs suggested values
  - Confidence scores
  - Accept/reject/edit controls

**Confidence Scoring**:
- 90-100: High confidence (green badge)
- 70-89: Medium confidence (yellow badge)
- 0-69: Low confidence (red badge)
- User can set threshold for auto-accept

### 4.4 Schema Modeling (ER Diagram)

**Entity Relationship Diagram**:
- React Flow canvas showing nodes
- Relationship lines between nodes
- Crow's foot notation for cardinality
- Color coding by medallion layer

**Relationship Management**:

**Add Relationship** (Right-click menu):
1. Select source node
2. Click "Add Relationship"
3. Select target node
4. Define:
   - Relationship type (FK, Business Key, Natural Key)
   - Cardinality (1:1, 1:M, M:M)
   - Source nodeitems (can be multiple)
   - Target nodeitems (can be multiple)

**Edit Relationship** (Click line):
- Modify cardinality
- Change related columns
- Add relationship description
- Delete relationship

**AI Analysis**:
- Send diagram to AI with prompt
- AI can:
  - Identify missing relationships
  - Suggest normalization improvements
  - Detect circular dependencies
  - Recommend indexing strategies
  - Validate cardinality correctness
- Display recommendations in side panel
- User approves/rejects suggestions

### 4.5 Data Vault Accelerator

**Activation**:
- Only available when project type = "DataVault"
- Triggered by: Select node → Right-click → "Generate Data Vault Model"

**Accelerator Workflow**:

**Step 1: Source Selection**
- Display selected source node(s)
- Allow multi-select for multiple sources
- Show preview of nodeitems

**Step 2: Configuration**
- Apply pre-configured Data Vault preferences from project settings:
  - Hub identification strategy (business keys)
  - Satellite grouping rules (rate of change)
  - Link creation rules (many-to-many)
  - Naming conventions
  - Hash key algorithms (MD5, SHA-256)

**Step 3: Preview (Logical Model)**
- New React Flow canvas showing proposed structure:
  - **Hubs**: Derived from business keys
  - **Satellites**: Grouped descriptive attributes
  - **Links**: Relationships between hubs
  - **Link Satellites**: Descriptive data about relationships
- Each generated node shows:
  - Proposed name (following conventions)
  - Nodeitems to be created
  - Mappings from source(s)
- User can:
  - Rename nodes
  - Reassign nodeitems to different satellites
  - Merge/split satellites
  - Add/remove links

**Step 4: Point-in-Time (PIT) & Bridge Tables**
- Based on node relationships, suggest PIT tables
- Suggest Bridge tables for many-to-many scenarios
- User selects materialization type:
  - Table
  - View
  - Materialized View

**Step 5: AI Review** (Optional)
- Send proposed model to AI
- AI validates:
  - Data Vault compliance
  - Naming convention adherence
  - Business key selection appropriateness
  - Missing satellites or links
- Display recommendations
- User accepts/rejects suggestions

**Step 6: Apply**
- Create physical nodes in project
- Generate all nodeitems
- Populate source-to-target mappings
- Store in GitHub
- Register UUIDs in Supabase
- Update canvas

**Preferences Configuration**:
```
Data Vault Preferences:
├── Hub
│   ├── Naming pattern: HUB_{entity_name}
│   ├── Business key strategy: Auto-detect | Manual
│   └── Hash algorithm: MD5 | SHA-256
├── Satellite
│   ├── Naming pattern: SAT_{hub_name}_{descriptor}
│   ├── Grouping strategy: ByChangeRate | BySourceSystem | Manual
│   └── Include audit columns: LoadDate, RecordSource, HashDiff
├── Link
│   ├── Naming pattern: LNK_{entity1}_{entity2}
│   └── Hash algorithm: MD5 | SHA-256
└── Standards
    ├── Include load_date column
    ├── Include record_source column
    └── Use hash keys
```

### 4.6 Dimensional Modeling

**Activation**:
- Create new node with subtype "Dimension" or "Fact"
- Click "AI Assist" button

**Dimension/Fact Creation Workflow**:

**Step 1: AI Source Recommendation**
- User provides context: "Create a Customer Dimension" or "Create Sales Fact"
- AI scans all nodes in project
- Returns sorted list of candidate source nodes:
  - Relevance score (0-100)
  - Brief explanation of why it's relevant
  - Preview of key nodeitems

**Step 2: Source Selection**
- User selects one or more source nodes
- Multi-select supported for facts with multiple sources

**Step 3: Join Inference**
- AI analyzes relationships between selected nodes
- Automatically infers join conditions based on:
  - Defined relationships in nodeitems
  - Foreign key patterns
  - Business key matches
- If joins are ambiguous:
  - Prompt user to select join nodeitems
  - Visual interface showing source and target columns
  - Suggest join type (INNER, LEFT, RIGHT)

**Step 4: Column Selection**
- Display all available nodeitems from selected sources
- Grouped by source node
- User selects columns to include
- For dimensions:
  - Mark slowly changing dimension (SCD) type per column
  - Define surrogate key
- For facts:
  - Identify measures vs dimensions (foreign keys)
  - Define aggregation method for each measure

**Step 5: Preview & Transform**
- Show proposed node structure
- User can:
  - Rename nodeitems
  - Add calculated columns
  - Apply transformations
  - Reorder columns

**Step 6: Apply**
- Create node with selected subtype
- Create all nodeitems
- Populate mappings (source → target)
- Store in GitHub
- Register in Supabase

**AI Assistance Throughout**:
- Suggest business names
- Recommend data types for calculated fields
- Validate SCD configuration
- Suggest indexing for fact foreign keys

### 4.7 Node Editor Dialog

**Triggered By**:
- Click node in canvas
- Double-click node in grid view
- "Edit" from context menu

**Dialog Layout**:

**Tabs**:
1. **Properties**
   - Name (editable)
   - FQN (display only)
   - UUID (display only)
   - Medallion Layer (dropdown)
   - Entity Type (dropdown)
   - Entity Subtype (dropdown, contextual)
   - Materialization Type (dropdown, if applicable)
   - Description (textarea)
   - Custom metadata (key-value pairs)

2. **NodeItems**
   - Grid view of all columns
   - Columns: Name, Data Type, Description, Nullable, PK, FK
   - Inline editing
   - Add/delete nodeitems
   - Reorder (drag-drop)
   - Bulk operations

3. **Mappings**
   - Visual flow showing:
     - Source nodes/nodeitems → Current nodeitem
     - Current nodeitem → Target nodes/nodeitems
   - Click to edit mapping details
   - Add new mappings

4. **Relationships**
   - List of relationships for this node
   - Add/edit/delete relationships
   - Visual preview of related nodes

5. **AI Insights**
   - Confidence scores
   - AI-generated descriptions
   - Suggested improvements
   - Validation warnings

6. **History**
   - Git commit history
   - Change log
   - Version comparison

**Actions**:
- Save
- Save & Close
- Cancel
- Delete Node
- Clone Node
- Export Schema

### 4.8 Macros

**Macro Library**:
- Accessible from main navigation
- Grid view showing all macros
- Search and filter by language

**Macro Structure**:
```
Macro:
├── Name
├── Description
├── Language (SQL | Python | Scala)
├── Code Fragment
├── Parameters[]
│   ├── name
│   ├── data_type
│   ├── default_value
│   └── description
├── Usage Examples
└── Created By
```

**Create Macro**:
- Code editor with syntax highlighting
- Parameter definition interface
- Test/preview functionality
- Auto-save drafts

**Use Macro**:
- Search macro library
- Insert into transformation logic
- Parameter substitution interface
- Preview generated code

**Sharing**: All macros are public and visible to all users

### 4.9 Template Management

**Template Types**:
1. **Full Templates**: Complete Jinja templates for script generation
2. **Fragments**: Reusable template snippets

**System Templates**:
- Stored in Supabase
- Read-only for users
- Maintained by administrators
- Version controlled

**User Templates**:
- Cloned from system templates
- Stored in user's GitHub repo
- Fully editable
- Can override specific fragments

**Template Structure**:
```
Template:
├── Name
├── Type (Full | Fragment)
├── Description
├── Jinja Content
├── Injection Points[] (named locations for fragment insertion)
├── Variables[]
│   ├── name
│   ├── type
│   └── default_value
└── Parent Template (if clone)
```

**Fragment Override Mechanism**:
- System template defines injection points: `{% block custom_validation %}`
- User creates fragment with matching name
- System merges at generation time
- User can preview merged output

**Template Operations**:
- Clone system template to repo
- Edit template in code editor
- Create custom fragments
- Map fragments to injection points
- Preview rendered output with sample data
- Version control through Git

## 5. Technical Implementation Details

### 5.1 State Management
- React Context for global state (workspace, user)
- React Query for server state management
- Zustand for UI state (canvas zoom, filters)

### 5.2 GitHub Integration
- GitHub API for repo operations
- Webhook for change notifications
- Conflict resolution strategy
- Commit signing for audit trail

### 5.3 Supabase Schema
```sql
-- Core tables
workspaces
projects
users
workspace_access (join table for admin access)
connections
configurations
uuid_registry (tracks all UUIDs for nodes/nodeitems)
node_state (tracks GitHub sync status)
templates
macros

-- Audit tables
audit_log
```

### 5.4 AI Integration Points
- Description generation endpoint
- Business name suggestion endpoint
- Confidence scoring endpoint
- Data Vault analysis endpoint
- Dimensional model recommendation endpoint
- General query endpoint (for user prompts)

### 5.5 Performance Considerations
- Lazy loading for large node lists
- Virtual scrolling in grid views
- Debounced search
- Canvas viewport rendering (React Flow handles this)
- Batch UUID lookups
- Caching strategy for GitHub content

## 6. User Interface Guidelines

### 6.1 Navigation Structure
```
Main Navigation:
├── Workspaces (admin only)
├── Projects
│   ├── Canvas (default view)
│   ├── Grid View
│   ├── Schema Model
│   └── Settings
├── Macros
├── Templates
├── Connections
└── Settings
```

### 6.2 Color Coding
- **Raw/Landing**: Gray (#808080)
- **Bronze**: Brown (#CD7F32)
- **Silver**: Silver (#C0C0C0)
- **Gold**: Gold (#FFD700)

### 6.3 Icons
- Hub: Circle with 'H'
- Satellite: Ellipse
- Link: Diamond
- Dimension: Cube
- Fact: Star

## 7. Security & Permissions

### 7.1 Authentication
- Supabase Auth (email/password, OAuth)
- JWT tokens
- Session management

### 7.2 Authorization
- Role-based access control (User, Admin)
- Workspace-level permissions
- Project-level permissions (future: share projects)

### 7.3 Data Protection
- Encrypted credentials in database
- GitHub personal access tokens stored securely
- API keys encrypted at rest
- Audit logging for sensitive operations

## 8. Testing Strategy

### 8.1 Unit Tests
- React component tests
- Utility function tests
- State management tests
- 80% code coverage target

### 8.2 Integration Tests
- Supabase operations
- GitHub API interactions
- File parsing logic
- AI integration endpoints

### 8.3 E2E Tests
- User authentication flow
- Workspace creation and GitHub connection
- Node creation and editing
- Import workflows
- Data Vault accelerator
- Dimensional modeling

### 8.4 Performance Tests
- Large project loading (1000+ nodes)
- Canvas rendering performance
- Search responsiveness
- File import speed

## 9. Deployment & DevOps

### 9.1 Environments
- Development (local)
- Staging
- Production

### 9.2 CI/CD Pipeline
- GitHub Actions
- Automated testing
- Build and deploy to hosting platform
- Database migrations

### 9.3 Monitoring
- Error tracking (Sentry)
- Performance monitoring
- Usage analytics
- Audit log review

## 10. Development Phases

### Phase 1: Foundation (Weeks 1-3)
- [ ] Setup project structure
- [ ] Supabase schema creation
- [ ] Authentication implementation
- [ ] Basic workspace management
- [ ] GitHub integration

### Phase 2: Core Features (Weeks 4-6)
- [ ] Project canvas with React Flow
- [ ] Node CRUD operations
- [ ] NodeItem management
- [ ] Basic relationships
- [ ] Grid view

### Phase 3: Import (Weeks 7-8)
- [ ] File import (CSV, JSON, Parquet)
- [ ] MSSQL import
- [ ] REST service import
- [ ] AI description generation

### Phase 4: Modeling (Weeks 9-11)
- [ ] Schema ER diagram
- [ ] Data Vault accelerator
- [ ] Dimensional modeling assistant
- [ ] Relationship inference

### Phase 5: Templating (Weeks 12-13)
- [ ] Macro library
- [ ] Template management
- [ ] Fragment override system
- [ ] Code generation preview

### Phase 6: Polish & Testing (Weeks 14-16)
- [ ] UI/UX refinements
- [ ] Comprehensive testing
- [ ] Performance optimization
- [ ] Documentation
- [ ] Deployment

## 11. Open Questions & Decisions Needed

1. **AI Provider**: Which AI service (OpenAI, Anthropic, custom model)?
2. **GitHub vs Alternative**: Is GitHub mandatory or support GitLab/Bitbucket?
3. **Real-time Collaboration**: Multi-user editing support needed?
4. **Script Generation**: What's the output format for automation scripts?
5. **Access Control**: Project-level sharing between users?
6. **CDC Polling**: Real-time or scheduled metadata refresh?
7. **Large File Handling**: File size limits for imports?
8. **Template Language**: Jinja only or support others (Mustache, Handlebars)?

## 12. Success Metrics

- Time to create first project: < 5 minutes
- Node creation time: < 30 seconds
- Data Vault generation: < 2 minutes for 10 source tables
- AI confidence score average: > 80%
- User satisfaction: > 4.5/5
- System uptime: > 99.5%