# Feature 3: Create and Manage Connections - Detailed Task List

## Overview
This task list covers the complete implementation of connection management for Microsoft SQL Server, Salesforce, Workday, ServiceNow, File Systems, and Databricks, including metadata import capabilities.

**Estimated Effort**: 120-160 hours (3-4 weeks)

---

## Phase 3.1: Database Schema & Foundation (16 hours)

### 3.1.1 Create Connections Table Schema ✓
**Priority**: P0 (Critical)
**Effort**: 4 hours

- [x] Create `connections` table with all fields from spec
- [x] Add account_id for multi-tenant isolation
- [x] Add owner_id and visibility for access control
- [x] Add configuration JSONB field for vendor-specific settings
- [x] Add test_status and test_error_message fields
- [x] Add import_settings and last_import_at fields
- [x] Create unique constraint on (account_id, workspace_id, name)
- [x] Test table creation

**Files**: 
- `backend/migrations/003_create_connections_table.sql`

**Acceptance Criteria**:
- Table created successfully
- All constraints working
- Indexes created

---

### 3.1.2 Create Connection Metadata Cache Table ✓
**Priority**: P1 (High)
**Effort**: 2 hours

- [x] Create `connection_metadata_cache` table
- [x] Add metadata_type field (schema, table, column, index, constraint)
- [x] Add metadata JSONB field
- [x] Add caching fields (cached_at, expires_at, is_stale)
- [x] Create indexes on connection_id and metadata_type
- [x] Test table creation

**Files**: 
- `backend/migrations/003_create_connections_table.sql`

---

### 3.1.3 Setup Row-Level Security (RLS) Policies ✓
**Priority**: P0 (Critical)
**Effort**: 4 hours

- [x] Enable RLS on connections table
- [x] Create isolation policy (account-level)
- [x] Create update policy (owner + admin only)
- [x] Create delete policy (owner + admin only)
- [x] Test RLS with different user roles
- [x] Verify cross-account isolation

**Files**: 
- `backend/migrations/004_connections_rls_policies.sql`

---

### 3.1.4 Create Connection Indexes ✓
**Priority**: P0 (Critical)
**Effort**: 2 hours

- [x] Create index on account_id
- [x] Create index on workspace_id
- [x] Create index on owner_id
- [x] Create index on connection_type
- [x] Create index on is_active
- [x] Test query performance

**Files**: 
- `backend/migrations/003_create_connections_table.sql`

---

### 3.1.5 Create TypeScript Types ✓
**Priority**: P0 (Critical)
**Effort**: 4 hours

- [x] Create `Connection` interface
- [x] Create vendor-specific configuration types
  - [x] MSSQLConfiguration
  - [x] SalesforceConfiguration
  - [x] WorkdayConfiguration
  - [x] ServiceNowConfiguration
  - [x] FileSystemConfiguration
  - [x] DatabricksConfiguration
- [x] Create `ConnectionFilters` interface
- [x] Create `TestConnectionResult` interface
- [x] Create `ImportMetadataOptions` interface
- [x] Create `ImportMetadataResult` interface
- [x] Create `SchemaInfo`, `TableInfo`, `TableMetadata` interfaces

**Files**: 
- `frontend/src/types/connection.ts`

---

## Phase 3.2: Backend Service Layer (32 hours)

### 3.2.1 Create Encryption Service ✓
**Priority**: P0 (Critical)
**Effort**: 6 hours
**Status**: DEFERRED - Will implement in future phase

- [ ] Implement AES-256-GCM encryption (DEFERRED)
- [ ] Create `encrypt(plaintext)` function
- [ ] Create `decrypt(ciphertext)` function
- [ ] Add error handling for invalid encrypted values
- [ ] Write unit tests for encryption/decryption
- [ ] Test with various input lengths
- [ ] Setup environment variable for encryption key

**Files**: 
- `backend/src/lib/encryption-service.ts`
- `backend/src/lib/__tests__/encryption-service.test.ts`

**Security Notes**:
- Store ENCRYPTION_KEY in secure environment variable
- Never log decrypted values
- Rotate encryption keys periodically

---

### 3.2.2 Create Base Connection Adapter ✅
**Priority**: P0 (Critical)
**Effort**: 4 hours
**Status**: COMPLETE

- [x] Create `BaseConnectionAdapter` abstract class
- [x] Define abstract methods:
  - [x] `test(): Promise<TestConnectionResult>`
  - [x] `listSchemas(): Promise<SchemaInfo[]>`
  - [x] `listTables(schema): Promise<TableInfo[]>`
  - [x] `getTableMetadata(schema, table): Promise<TableMetadata>`
  - [x] `importMetadata(options): Promise<ImportMetadataResult>`
- [x] Add protected `connection` property
- [x] Add helper methods for error handling
- [x] Document adapter interface

**Files**:
- `frontend/src/lib/connections/adapters/base-adapter.ts`

---

### 3.2.3 Implement MSSQL Adapter ✅
**Priority**: P0 (Critical)
**Effort**: 10 hours
**Status**: COMPLETE

- [x] Install `mssql` npm package (deferred - will use Edge Function)
- [x] Create `MSSQLAdapter` class extending `BaseConnectionAdapter`
- [x] Implement `test()` method (stub with connection string builder)
  - [x] Connect with configuration
  - [x] Build JDBC connection string
  - [x] Return success/failure
- [x] Implement `listSchemas()` method (stub with SQL query)
  - [x] Query `sys.schemas`
  - [x] Exclude system schemas
- [x] Implement `listTables(schema)` method (stub with SQL query)
  - [x] Query `sys.tables`
  - [x] Include row counts
  - [x] Include table types (TABLE, VIEW)
- [x] Implement `getTableMetadata(schema, table)` method (stub with SQL queries)
  - [x] Query `sys.columns` for column definitions
  - [x] Query `sys.indexes` for indexes
  - [x] Query `sys.foreign_keys` for foreign keys
  - [x] Query `sys.key_constraints` for primary keys
  - [x] Detect CDC-enabled tables
- [x] Implement `importMetadata(options)` method (stub)
  - [x] Create datasets for selected tables (placeholder)
  - [x] Create columns for each column (placeholder)
  - [x] Create relationships from foreign keys (placeholder)
  - [x] Handle data type mapping (SQL → Databricks)
  - [x] Return import summary
- [x] Build JDBC connection string method
- [x] Add error handling for network issues
- [ ] Implement via Supabase Edge Function (future task)
- [ ] Write unit tests for each method (future task)

**Files**:
- `frontend/src/lib/connections/adapters/mssql-adapter.ts`

**Data Type Mapping**:
```typescript
const SQL_TO_DATABRICKS_TYPE_MAP = {
  'int': 'INT',
  'bigint': 'BIGINT',
  'varchar': 'STRING',
  'nvarchar': 'STRING',
  'datetime': 'TIMESTAMP',
  'date': 'DATE',
  'decimal': 'DECIMAL',
  'float': 'DOUBLE',
  'bit': 'BOOLEAN',
  // ... more mappings
};
```

---

### 3.2.4 Implement Salesforce Adapter ✓
**Priority**: P1 (High)  
**Effort**: 8 hours

- [ ] Install `jsforce` npm package
- [ ] Create `SalesforceAdapter` class
- [ ] Implement OAuth token refresh logic
- [ ] Implement `test()` method (API call with auth)
- [ ] Implement `listSchemas()` method (returns single schema)
- [ ] Implement `listTables()` method
  - [ ] Call `describe()` API
  - [ ] List all SObjects
  - [ ] Include custom objects
- [ ] Implement `getTableMetadata()` method
  - [ ] Get SObject fields
  - [ ] Extract field types, labels, relationships
- [ ] Implement `importMetadata()` method
  - [ ] Create datasets for selected objects
  - [ ] Map Salesforce types to Databricks types
  - [ ] Handle lookup relationships
- [ ] Implement rate limiting (API calls/day)
- [ ] Add retry logic with exponential backoff
- [ ] Write unit tests

**Files**: 
- `backend/src/lib/connections/adapters/salesforce-adapter.ts`
- `backend/src/lib/connections/adapters/__tests__/salesforce-adapter.test.ts`

---

### 3.2.5 Implement Workday Adapter ✓
**Priority**: P1 (High)  
**Effort**: 4 hours

- [ ] Research Workday API (SOAP/REST)
- [ ] Create `WorkdayAdapter` class
- [ ] Implement authentication (Integration System User)
- [ ] Implement `test()` method
- [ ] Implement `listSchemas()` (Workday modules)
- [ ] Implement `listTables()` (Workday objects)
- [ ] Implement `getTableMetadata()` (field definitions)
- [ ] Implement `importMetadata()` method
- [ ] Handle pagination
- [ ] Add error handling
- [ ] Write unit tests

**Files**: 
- `backend/src/lib/connections/adapters/workday-adapter.ts`

**Note**: Workday API complexity may require more time for full implementation.

---

### 3.2.6 Implement ServiceNow Adapter ✓
**Priority**: P1 (High)  
**Effort**: 4 hours

- [ ] Install `axios` for REST API calls
- [ ] Create `ServiceNowAdapter` class
- [ ] Implement Basic Auth or OAuth
- [ ] Implement `test()` method (API call)
- [ ] Implement `listSchemas()` (returns single schema)
- [ ] Implement `listTables()` (list ServiceNow tables)
  - [ ] Query `sys_db_object` table
- [ ] Implement `getTableMetadata()` (table columns)
  - [ ] Query `sys_dictionary` table
- [ ] Implement `importMetadata()` method
- [ ] Handle pagination (sysparm_limit, sysparm_offset)
- [ ] Add rate limiting
- [ ] Write unit tests

**Files**: 
- `backend/src/lib/connections/adapters/servicenow-adapter.ts`

---

### 3.2.7 Implement File System Adapter ✓
**Priority**: P2 (Medium)  
**Effort**: 4 hours

- [ ] Create `FileSystemAdapter` class
- [ ] Implement `test()` method (check path exists)
- [ ] Implement `listSchemas()` (list directories)
- [ ] Implement `listTables()` (list files matching pattern)
- [ ] Implement `getTableMetadata()` (parse file headers)
  - [ ] Support CSV, JSON, Parquet detection
- [ ] Implement `importMetadata()` method
  - [ ] Create dataset per file
  - [ ] Infer schema from file
- [ ] Handle recursive directory scanning
- [ ] Add file pattern matching
- [ ] Write unit tests

**Files**: 
- `backend/src/lib/connections/adapters/filesystem-adapter.ts`

---

### 3.2.8 Implement Databricks Adapter ✓
**Priority**: P0 (Critical)  
**Effort**: 6 hours

- [ ] Install `@databricks/sql` package
- [ ] Create `DatabricksAdapter` class
- [ ] Implement PAT authentication
- [ ] Implement `test()` method (test warehouse connection)
- [ ] Implement `listSchemas()` (SHOW SCHEMAS)
- [ ] Implement `listTables()` (SHOW TABLES)
- [ ] Implement `getTableMetadata()` (DESCRIBE TABLE EXTENDED)
  - [ ] Extract columns, partitions, clustering
- [ ] Implement `importMetadata()` method
  - [ ] Import Unity Catalog metadata
  - [ ] Handle external tables
- [ ] Support serverless vs classic compute
- [ ] Write unit tests

**Files**: 
- `backend/src/lib/connections/adapters/databricks-adapter.ts`

---

### 3.2.9 Create Connection Factory ✅
**Priority**: P0 (Critical)
**Effort**: 2 hours
**Status**: COMPLETE

- [x] Create `ConnectionFactory` class
- [x] Implement `createAdapter(connection)` method
- [x] Switch on connection_type
- [x] Return appropriate adapter instance
- [x] Add error handling for unsupported types
- [x] Add helper methods (isAdapterAvailable, getAvailableConnectionTypes)
- [ ] Write unit tests (future task)

**Files**:
- `frontend/src/lib/connections/connection-factory.ts`

---

### 3.2.10 Create Connection Service Layer ✓
**Priority**: P0 (Critical)  
**Effort**: 6 hours

- [ ] Create `ConnectionService` class
- [ ] Implement CRUD operations:
  - [ ] `createConnection(input)` - with encryption
  - [ ] `getConnection(id)` - with decryption
  - [ ] `updateConnection(id, updates)` - with encryption
  - [ ] `deleteConnection(id)`
  - [ ] `listConnections(workspaceId, filters)`
- [ ] Implement `testConnection(id)` method
  - [ ] Create adapter
  - [ ] Call test()
  - [ ] Update test_status and test_error_message
- [ ] Implement `importMetadata(id, options)` method
  - [ ] Create adapter
  - [ ] Call importMetadata()
  - [ ] Track progress
- [ ] Add error handling
- [ ] Write unit tests

**Files**: 
- `backend/src/lib/connections/connection-service.ts`
- `backend/src/lib/connections/__tests__/connection-service.test.ts`

---

## Phase 3.3: Frontend Components (40 hours)

### 3.3.1 Create Connections Page ✓
**Priority**: P0 (Critical)  
**Effort**: 4 hours

- [ ] Create `ConnectionsPage` component
- [ ] Add page header with title and actions
- [ ] Add connection filter sidebar
- [ ] Add connection grid/list view
- [ ] Add create connection FAB
- [ ] Add empty state (no connections yet)
- [ ] Integrate with React Router
- [ ] Add loading states

**Files**: 
- `frontend/src/pages/ConnectionsPage.tsx`

---

### 3.3.2 Create Connection Card Component ✓
**Priority**: P0 (Critical)  
**Effort**: 4 hours

- [ ] Create `ConnectionCard` component
- [ ] Display connection type icon
- [ ] Display connection name and description
- [ ] Display test status badge (success/failed/untested)
- [ ] Display last tested timestamp
- [ ] Add action buttons:
  - [ ] Test Connection
  - [ ] Import Metadata
  - [ ] Edit
  - [ ] Delete
- [ ] Add hover effects
- [ ] Handle click events

**Files**: 
- `frontend/src/components/Connections/ConnectionCard.tsx`

---

### 3.3.3 Create Connection Type Icons ✓
**Priority**: P2 (Medium)  
**Effort**: 2 hours

- [ ] Create icon mapping for each connection type
- [ ] Use Lucide React icons or custom SVGs
- [ ] Create `ConnectionTypeIcon` component
- [ ] Support different sizes
- [ ] Add color coding by type

**Files**: 
- `frontend/src/components/Connections/ConnectionTypeIcon.tsx`

---

### 3.3.4 Create Connection Filters Component ✓
**Priority**: P1 (High)  
**Effort**: 4 hours

- [ ] Create `ConnectionFilters` component
- [ ] Add filter by connection type (checkboxes)
- [ ] Add filter by status (Active/Inactive)
- [ ] Add search by name
- [ ] Add sort options (Name, Created Date, Last Tested)
- [ ] Persist filter state in URL query params
- [ ] Clear filters button

**Files**: 
- `frontend/src/components/Connections/ConnectionFilters.tsx`

---

### 3.3.5 Create MSSQL Connection Editor ✅
**Priority**: P0 (Critical)
**Effort**: 8 hours
**Status**: COMPLETE

- [x] Create `MSSQLConnectionEditor` component
- [x] Add form fields:
  - [x] Connection name (required)
  - [x] Server address (required)
  - [x] Port (default 1433)
  - [x] Database name (required)
  - [x] Authentication type (3-way toggle: SQL Auth, Windows Auth, Azure AD)
  - [x] Username (required for SQL/Azure AD)
  - [x] Password (required, secure input with show/hide toggle)
- [x] Add Advanced Settings accordion:
  - [x] Connection timeout
  - [x] Command timeout
  - [x] Application name
- [x] Add SSL settings:
  - [x] Enable SSL/TLS encryption checkbox
  - [x] Trust server certificate option
- [x] Add CDC Settings accordion:
  - [x] Enable CDC tracking (checkbox)
  - [x] Placeholder for CDC table selection
- [x] Add form validation with error messages
- [x] Add real-time connection string builder
- [x] Add connection string preview with copy-to-clipboard
- [ ] Add "Test Connection" button (future - needs Edge Function)
- [ ] Show test results inline (future)
- [x] Save connection handler
- [x] Handle errors gracefully

**Files**:
- `frontend/src/components/Connections/Editors/MSSQLConnectionEditor.tsx`

---

### 3.3.6 Create Salesforce Connection Editor ✓
**Priority**: P1 (High)  
**Effort**: 6 hours

- [ ] Create `SalesforceConnectionEditor` component
- [ ] Add form fields:
  - [ ] Connection name
  - [ ] Instance URL (with suggestions: na1, na2, etc.)
  - [ ] API version (dropdown)
  - [ ] OAuth Client ID
  - [ ] OAuth Client Secret
- [ ] Add OAuth flow button (alternative to manual entry)
- [ ] Add Advanced Settings:
  - [ ] Batch size
  - [ ] Rate limit per day
- [ ] Implement "Test Connection" with OAuth token refresh
- [ ] Show OAuth status (token expiry)
- [ ] Handle OAuth callback
- [ ] Write component tests

**Files**: 
- `frontend/src/components/Connections/Editors/SalesforceConnectionEditor.tsx`

---

### 3.3.7 Create Workday Connection Editor ✓
**Priority**: P1 (High)  
**Effort**: 4 hours

- [ ] Create `WorkdayConnectionEditor` component
- [ ] Add form fields:
  - [ ] Connection name
  - [ ] Tenant name
  - [ ] Base URL
  - [ ] API version
  - [ ] Username
  - [ ] Password
- [ ] Add Advanced Settings:
  - [ ] Timeout
  - [ ] Page size
- [ ] Add "Test Connection" functionality
- [ ] Save configuration

**Files**: 
- `frontend/src/components/Connections/Editors/WorkdayConnectionEditor.tsx`

---

### 3.3.8 Create ServiceNow Connection Editor ✓
**Priority**: P1 (High)  
**Effort**: 4 hours

- [ ] Create `ServiceNowConnectionEditor` component
- [ ] Add form fields:
  - [ ] Connection name
  - [ ] Instance URL
  - [ ] Authentication type (Basic, OAuth)
  - [ ] Username
  - [ ] Password
  - [ ] API version
- [ ] Add Advanced Settings:
  - [ ] Page size
  - [ ] Rate limit
- [ ] Add "Test Connection"
- [ ] Save configuration

**Files**: 
- `frontend/src/components/Connections/Editors/ServiceNowConnectionEditor.tsx`

---

### 3.3.9 Create File System Connection Editor ✓
**Priority**: P2 (Medium)  
**Effort**: 3 hours

- [ ] Create `FileSystemConnectionEditor` component
- [ ] Add form fields:
  - [ ] Connection name
  - [ ] Base path (with file browser)
  - [ ] Supported file formats (multi-select)
  - [ ] Recursive scan (checkbox)
  - [ ] File pattern (regex/glob)
- [ ] Add path validation (exists, readable)
- [ ] Preview files in directory
- [ ] Save configuration

**Files**: 
- `frontend/src/components/Connections/Editors/FileSystemConnectionEditor.tsx`

---

### 3.3.10 Create Databricks Connection Editor ✓
**Priority**: P0 (Critical)  
**Effort**: 6 hours

- [ ] Create `DatabricksConnectionEditor` component
- [ ] Add form fields:
  - [ ] Connection name
  - [ ] Workspace URL
  - [ ] PAT Token (secure input)
  - [ ] Catalog (default: main)
  - [ ] Schema (default: default)
- [ ] Add Compute Settings:
  - [ ] Compute type (Serverless, Classic)
  - [ ] Cluster ID (if classic)
  - [ ] Warehouse ID (if serverless)
- [ ] Add Advanced Settings:
  - [ ] Timeout
  - [ ] Enable Unity Catalog
- [ ] Add "Test Connection"
- [ ] Show warehouse status
- [ ] Save configuration

**Files**: 
- `frontend/src/components/Connections/Editors/DatabricksConnectionEditor.tsx`

---

### 3.3.11 Create Connection Editor Router ✓
**Priority**: P0 (Critical)  
**Effort**: 2 hours

- [ ] Create `ConnectionEditorDialog` component
- [ ] Route to correct editor based on connection_type
- [ ] Handle create vs edit mode
- [ ] Pass common props (onSave, onCancel)
- [ ] Add loading state while saving
- [ ] Show success/error notifications

**Files**: 
- `frontend/src/components/Connections/ConnectionEditorDialog.tsx`

---

### 3.3.12 Create Metadata Import Dialog ✓
**Priority**: P0 (Critical)  
**Effort**: 10 hours

- [ ] Create `MetadataImportDialog` component
- [ ] Implement multi-step wizard:
  - **Step 1: Select Schemas & Tables**
    - [ ] List schemas in left panel
    - [ ] List tables in right panel
    - [ ] Multi-select tables with checkboxes
    - [ ] Show table row counts
    - [ ] Search/filter tables
  - **Step 2: Configure Import**
    - [ ] Choose medallion layer (Bronze/Silver/Gold)
    - [ ] Choose entity type (Table/Staging)
    - [ ] AI-enhance metadata (checkbox)
    - [ ] Import relationships (checkbox)
  - **Step 3: Preview**
    - [ ] Show list of datasets to be created
    - [ ] Show column count per dataset
    - [ ] Estimate time
  - **Step 4: Importing**
    - [ ] Progress bar
    - [ ] Current table being imported
    - [ ] Real-time log
  - **Step 5: Complete**
    - [ ] Summary: X datasets created, Y columns, Z relationships
    - [ ] Link to view imported datasets
    - [ ] "Import More" button
- [ ] Add step navigation (Next, Back, Cancel)
- [ ] Handle errors gracefully
- [ ] Show partial success (some tables failed)

**Files**: 
- `frontend/src/components/Connections/MetadataImportDialog.tsx`
- `frontend/src/components/Connections/SchemaTableSelector.tsx`
- `frontend/src/components/Connections/ImportOptionsForm.tsx`
- `frontend/src/components/Connections/ImportPreview.tsx`
- `frontend/src/components/Connections/ImportProgress.tsx`
- `frontend/src/components/Connections/ImportSummary.tsx`

---

## Phase 3.4: Integration & Testing (32 hours)

### 3.4.1 Create Connection React Hooks ✓
**Priority**: P0 (Critical)  
**Effort**: 4 hours

- [ ] Create `useConnections()` hook (list)
- [ ] Create `useConnection(id)` hook (get single)
- [ ] Create `useCreateConnection()` mutation hook
- [ ] Create `useUpdateConnection()` mutation hook
- [ ] Create `useDeleteConnection()` mutation hook
- [ ] Create `useTestConnection()` mutation hook
- [ ] Create `useImportMetadata()` mutation hook
- [ ] Integrate with React Query
- [ ] Handle optimistic updates
- [ ] Handle error states

**Files**: 
- `frontend/src/hooks/useConnections.ts`

---

### 3.4.2 Integrate with Projects/Workspaces ✓
**Priority**: P0 (Critical)  
**Effort**: 4 hours

- [ ] Add workspace_id to connection context
- [ ] Filter connections by workspace
- [ ] Show connection count in workspace header
- [ ] Add "Connections" tab to workspace navigation
- [ ] Test workspace isolation

**Files**: 
- `frontend/src/pages/ConnectionsPage.tsx`
- `frontend/src/components/Workspace/WorkspaceHeader.tsx`

---

### 3.4.3 Backend API Routes ✓
**Priority**: P0 (Critical)  
**Effort**: 6 hours

- [ ] Create Express routes:
  - [ ] `POST /api/connections` - Create
  - [ ] `GET /api/connections` - List (with filters)
  - [ ] `GET /api/connections/:id` - Get single
  - [ ] `PUT /api/connections/:id` - Update
  - [ ] `DELETE /api/connections/:id` - Delete
  - [ ] `POST /api/connections/:id/test` - Test connection
  - [ ] `POST /api/connections/:id/import` - Import metadata
  - [ ] `GET /api/connections/:id/schemas` - List schemas
  - [ ] `GET /api/connections/:id/tables` - List tables
  - [ ] `GET /api/connections/:id/metadata` - Get table metadata
- [ ] Add authentication middleware
- [ ] Add authorization checks (owner/admin)
- [ ] Add input validation (Zod schemas)
- [ ] Handle errors with proper HTTP status codes
- [ ] Write integration tests

**Files**: 
- `backend/src/routes/connections.ts`
- `backend/src/routes/__tests__/connections.test.ts`

---

### 3.4.4 Unit Tests - Backend ✓
**Priority**: P0 (Critical)  
**Effort**: 8 hours

- [ ] Test EncryptionService
  - [ ] Test encrypt/decrypt round-trip
  - [ ] Test with various input sizes
  - [ ] Test error handling
- [ ] Test each connection adapter
  - [ ] Mock database/API calls
  - [ ] Test successful connections
  - [ ] Test failed connections
  - [ ] Test metadata extraction
- [ ] Test ConnectionFactory
- [ ] Test ConnectionService
- [ ] Achieve 80%+ code coverage

**Files**: 
- `backend/src/lib/__tests__/*.test.ts`

---

### 3.4.5 Unit Tests - Frontend ✓
**Priority**: P0 (Critical)  
**Effort**: 6 hours

- [ ] Test ConnectionCard component
- [ ] Test connection editor components
- [ ] Test MetadataImportDialog
- [ ] Test connection hooks
- [ ] Test form validation logic
- [ ] Achieve 70%+ code coverage

**Files**: 
- `frontend/src/components/Connections/__tests__/*.test.tsx`

---

### 3.4.6 Integration Tests ✓
**Priority**: P1 (High)  
**Effort**: 8 hours

- [ ] Test MSSQL connection end-to-end (with test database)
- [ ] Test Salesforce connection (with sandbox)
- [ ] Test Databricks connection (with test workspace)
- [ ] Test metadata import full workflow
- [ ] Test error scenarios:
  - [ ] Invalid credentials
  - [ ] Network timeout
  - [ ] Firewall block
  - [ ] Missing permissions
- [ ] Test concurrent connections

**Files**: 
- `backend/src/__tests__/integration/connections.test.ts`

---

### 3.4.7 Security Testing ✓
**Priority**: P0 (Critical)  
**Effort**: 4 hours

- [ ] Test credential encryption in database
- [ ] Test RLS policies (cross-account isolation)
- [ ] Test authorization (non-owner cannot edit)
- [ ] Test SQL injection prevention
- [ ] Test credential leakage in logs/errors
- [ ] Test HTTPS enforcement for API calls

---

### 3.4.8 Performance Testing ✓
**Priority**: P1 (High)  
**Effort**: 4 hours

- [ ] Test metadata import with large tables (1M+ rows)
- [ ] Test connection pooling under load
- [ ] Test concurrent metadata imports
- [ ] Optimize slow queries
- [ ] Add database query logging
- [ ] Monitor memory usage during imports

---

### 3.4.9 Documentation ✓
**Priority**: P1 (High)  
**Effort**: 4 hours

- [ ] Write user guide for creating connections
- [ ] Document each connection type with examples
- [ ] Create troubleshooting guide
- [ ] Document security best practices
- [ ] Add API documentation (OpenAPI/Swagger)
- [ ] Create video tutorial (optional)

**Files**: 
- `docs/connections-user-guide.md`
- `docs/connections-troubleshooting.md`
- `docs/api/connections.yaml`

---

## Phase 3.5: Polish & Deployment (16 hours)

### 3.5.1 UI/UX Refinements ✓
**Priority**: P1 (High)  
**Effort**: 4 hours

- [ ] Review all connection editor forms
- [ ] Improve form validation messages
- [ ] Add contextual help tooltips
- [ ] Improve loading states
- [ ] Add skeleton loaders
- [ ] Improve error messages
- [ ] Add micro-interactions (hover, focus)
- [ ] Test responsive layout on mobile

---

### 3.5.2 Error Handling Improvements ✓
**Priority**: P1 (High)  
**Effort**: 4 hours

- [ ] Create user-friendly error messages for all scenarios
- [ ] Add retry logic with exponential backoff
- [ ] Add timeout handling
- [ ] Show partial progress on failures
- [ ] Add connection health monitoring
- [ ] Log errors to monitoring service (Sentry)

---

### 3.5.3 Performance Optimizations ✓
**Priority**: P1 (High)  
**Effort**: 4 hours

- [ ] Implement metadata caching
- [ ] Optimize database queries
- [ ] Add pagination for large table lists
- [ ] Lazy load connection metadata
- [ ] Optimize bundle size (code splitting)
- [ ] Add service worker caching (optional)

---

### 3.5.4 Deployment Preparation ✓
**Priority**: P0 (Critical)  
**Effort**: 4 hours

- [ ] Setup environment variables for production
- [ ] Configure encryption key rotation
- [ ] Setup database backups
- [ ] Configure monitoring and alerts
- [ ] Create deployment checklist
- [ ] Test staging deployment
- [ ] Prepare rollback plan

---

## Summary

### Total Estimated Effort
- Phase 3.1: 16 hours
- Phase 3.2: 32 hours
- Phase 3.3: 40 hours
- Phase 3.4: 32 hours
- Phase 3.5: 16 hours

**Total: 136 hours** (~3.5 weeks for single developer, ~2 weeks for two developers)

### Priority Breakdown
- **P0 (Critical)**: 96 hours - Must have for MVP
- **P1 (High)**: 32 hours - Important but can be post-MVP
- **P2 (Medium)**: 8 hours - Nice to have, can be future enhancement

### Dependencies
- Requires completed Phase M.0 (Multi-tenant foundation)
- Requires completed Phase M.1 (Database migration)
- Requires completed Phase M.2.1-M.2.3 (Core types and services)

### Success Metrics
- Users can create and test connections for all supported types
- Metadata import completes successfully for 95%+ of tables
- Connection credentials are encrypted in database
- RLS policies enforce account isolation
- Connection testing completes in < 5 seconds
- Metadata import for 100 tables completes in < 2 minutes

### Future Enhancements (Post-MVP)
- Support for additional connection types (Oracle, PostgreSQL, MySQL)
- Connection health monitoring with periodic testing
- Connection usage analytics
- Shared connection pools
- Connection templates (pre-configured)
- Connection migration tool
- Bulk connection operations
- Connection import/export
