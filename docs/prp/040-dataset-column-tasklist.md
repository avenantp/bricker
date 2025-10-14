# Feature 4: Dataset and Column Metadata Management
## Detailed Task List

---

## Phase 4.1: Database & Backend Foundation (Week 1)

### 4.1.1 Database Schema Validation âœ…
- [ ] **4.1.1.1** Verify `datasets` table exists with all required columns
- [ ] **4.1.1.2** Verify `columns` table exists with reference columns
- [ ] **4.1.1.3** Verify `account_id` exists on both tables for multi-tenancy
- [ ] **4.1.1.4** Verify `owner_id` and `visibility` columns exist
- [ ] **4.1.1.5** Test RLS policies for company isolation
- [ ] **4.1.1.6** Verify all indexes are created
- [ ] **4.1.1.7** Test foreign key constraints
- [ ] **4.1.1.8** Verify unique constraints (account_id, fqn) and (dataset_id, name)

**Status**: âœ… Complete (schema already migrated per 01_initial_schema.sql)

### 4.1.2 TypeScript Type Definitions âœ…
- [ ] **4.1.2.1** Create `frontend/src/types/dataset.ts`
- [ ] **4.1.2.2** Define `Dataset` interface matching database schema
- [ ] **4.1.2.3** Define `CreateDatasetInput` type
- [ ] **4.1.2.4** Define `UpdateDatasetInput` type
- [ ] **4.1.2.5** Create `frontend/src/types/column.ts`
- [ ] **4.1.2.6** Define `Column` interface with reference properties
- [ ] **4.1.2.7** Define `CreateColumnInput` type
- [ ] **4.1.2.8** Define `UpdateColumnInput` type
- [ ] **4.1.2.9** Define enum types (MedallionLayer, EntityType, etc.)
- [ ] **4.1.2.10** Create `frontend/src/types/index.ts` for central exports

**Files**:
- `frontend/src/types/dataset.ts` âœ…
- `frontend/src/types/column.ts` âœ…
- `frontend/src/types/index.ts` âœ…

**Status**: âœ… Complete

### 4.1.3 Dataset Service Layer âœ…
- [ ] **4.1.3.1** Create `frontend/src/lib/dataset-service.ts`
- [ ] **4.1.3.2** Implement `createDataset(input: CreateDatasetInput): Promise<Dataset>`
- [ ] **4.1.3.3** Implement `getDataset(id: string): Promise<Dataset>`
- [ ] **4.1.3.4** Implement `updateDataset(id: string, data: UpdateDatasetInput): Promise<Dataset>`
- [ ] **4.1.3.5** Implement `deleteDataset(id: string): Promise<void>`
- [ ] **4.1.3.6** Implement `searchDatasets(query: DatasetSearchQuery): Promise<Dataset[]>`
- [ ] **4.1.3.7** Implement `bulkUpdateDatasets(updates: DatasetUpdate[]): Promise<Dataset[]>`
- [ ] **4.1.3.8** Add error handling and validation
- [ ] **4.1.3.9** Add change tracking for all mutations
- [ ] **4.1.3.10** Write unit tests for dataset service

**Files**: `frontend/src/lib/dataset-service.ts` âœ…

**Status**: âœ… Complete

### 4.1.4 Column Service Layer âœ…
- [ ] **4.1.4.1** Create `frontend/src/lib/column-service.ts`
- [ ] **4.1.4.2** Implement `createColumn(datasetId: string, data: CreateColumnInput): Promise<Column>`
- [ ] **4.1.4.3** Implement `updateColumn(id: string, data: UpdateColumnInput): Promise<Column>`
- [ ] **4.1.4.4** Implement `deleteColumn(id: string): Promise<void>`
- [ ] **4.1.4.5** Implement `deleteMultipleColumns(ids: string[]): Promise<void>`
- [ ] **4.1.4.6** Implement `bulkUpdateColumns(updates: ColumnUpdate[]): Promise<Column[]>`
- [ ] **4.1.4.7** Implement `reorderColumns(datasetId: string, order: string[]): Promise<void>`
- [ ] **4.1.4.8** Implement `setColumnReference(columnId: string, referenceData: ColumnReferenceInput): Promise<Column>`
- [ ] **4.1.4.9** Implement `removeColumnReference(columnId: string): Promise<Column>`
- [ ] **4.1.4.10** Add validation for unique column names (case-insensitive)
- [ ] **4.1.4.11** Write unit tests for column service

**Files**: `frontend/src/lib/column-service.ts` âœ…

**Status**: âœ… Complete

### 4.1.5 Validation Utilities
- [ ] **4.1.5.1** Create `frontend/src/utils/validation.ts`
- [ ] **4.1.5.2** Implement `validateDatasetName(name: string, existingNames: string[]): ValidationResult`
- [ ] **4.1.5.3** Implement `validateColumnName(name: string, existingNames: string[]): ValidationResult`
- [ ] **4.1.5.4** Implement `validateFQN(fqn: string): ValidationResult`
- [ ] **4.1.5.5** Implement `validateDataType(dataType: string): ValidationResult`
- [ ] **4.1.5.6** Implement `validateConfidenceScore(score: number): ValidationResult`
- [ ] **4.1.5.7** Create validation error message constants
- [ ] **4.1.5.8** Write unit tests for validation functions

**Files**: `frontend/src/utils/validation.ts`

---

## Phase 4.2: Core UI Components (Week 2)

### 4.2.1 Dataset Editor Dialog Foundation
- [ ] **4.2.1.1** Create `frontend/src/components/Canvas/DatasetEditorDialog.tsx`
- [ ] **4.2.1.2** Implement modal dialog wrapper with header/footer
- [ ] **4.2.1.3** Create tab navigation component (6 tabs)
- [ ] **4.2.1.4** Implement unsaved changes detection
- [ ] **4.2.1.5** Add confirmation dialog for unsaved changes
- [ ] **4.2.1.6** Implement keyboard shortcuts (Cmd+S to save, Esc to close)
- [ ] **4.2.1.7** Add loading states for async operations
- [ ] **4.2.1.8** Create error boundary for dialog
- [ ] **4.2.1.9** Add accessibility attributes (ARIA labels, focus management)
- [ ] **4.2.1.10** Test dialog open/close behavior

**Files**: `frontend/src/components/Canvas/DatasetEditorDialog.tsx`

### 4.2.2 Properties Tab
- [ ] **4.2.2.1** Create `frontend/src/components/Canvas/DatasetPropertiesTab.tsx`
- [ ] **4.2.2.2** Build form with all dataset fields:
  - Name input (required, with validation)
  - FQN display (read-only, auto-generated)
  - UUID display (read-only)
  - Medallion layer dropdown
  - Entity type dropdown
  - Entity subtype dropdown (conditional based on entity type)
  - Materialization type dropdown
  - Description textarea
- [ ] **4.2.2.3** Implement reactive FQN generation from name and layer
- [ ] **4.2.2.4** Add custom metadata key-value editor
- [ ] **4.2.2.5** Implement inline validation with error messages
- [ ] **4.2.2.6** Add Git Sync Status section:
  - Last committed SHA
  - Uncommitted changes indicator
  - Last synced timestamp
  - Commit button (if uncommitted changes)
  - Discard changes button
- [ ] **4.2.2.7** Add AI confidence score display (if present)
- [ ] **4.2.2.8** Implement save functionality (call dataset service)
- [ ] **4.2.2.9** Test form validation and submission

**Files**: `frontend/src/components/Canvas/DatasetPropertiesTab.tsx`

### 4.2.3 Columns Tab - Table Component
- [ ] **4.2.3.1** Create `frontend/src/components/Canvas/ColumnsTab.tsx`
- [ ] **4.2.3.2** Create `frontend/src/components/Canvas/ColumnsTable.tsx`
- [ ] **4.2.3.3** Implement table header with sortable columns:
  - Checkbox for multi-select
  - Name (sortable)
  - Data Type (sortable)
  - Business Name (sortable)
  - Description
  - PK/FK indicators
  - AI Confidence badges
  - Actions column
- [ ] **4.2.3.4** Implement table body with column rows
- [ ] **4.2.3.5** Add empty state (when no columns)
- [ ] **4.2.3.6** Implement column sorting (client-side)
- [ ] **4.2.3.7** Add loading skeleton for async data
- [ ] **4.2.3.8** Implement virtual scrolling for 100+ columns (optional optimization)
- [ ] **4.2.3.9** Style table with Tailwind CSS
- [ ] **4.2.3.10** Test table rendering with various data sets

**Files**:
- `frontend/src/components/Canvas/ColumnsTab.tsx`
- `frontend/src/components/Canvas/ColumnsTable.tsx`

### 4.2.4 Columns Tab - Inline Editing
- [ ] **4.2.4.1** Create `frontend/src/components/Canvas/EditableCell.tsx`
- [ ] **4.2.4.2** Implement click-to-edit behavior
- [ ] **4.2.4.3** Add input types for different field types:
  - Text input for name, business_name
  - Dropdown for data_type
  - Textarea for description
- [ ] **4.2.4.4** Implement keyboard navigation (Tab, Enter, Escape)
- [ ] **4.2.4.5** Add validation on blur
- [ ] **4.2.4.6** Show validation errors inline
- [ ] **4.2.4.7** Implement auto-save on valid input
- [ ] **4.2.4.8** Add undo/redo functionality (optional)
- [ ] **4.2.4.9** Add optimistic UI updates
- [ ] **4.2.4.10** Test inline editing flows

**Files**: `frontend/src/components/Canvas/EditableCell.tsx`

### 4.2.5 Columns Tab - Toolbar & Actions
- [ ] **4.2.5.1** Create toolbar component at top of ColumnsTab
- [ ] **4.2.5.2** Add "Add Column" button (opens CreateColumnDialog)
- [ ] **4.2.5.3** Add "Enhance with AI" button (opens AIEnhancementDialog)
- [ ] **4.2.5.4** Add search input with real-time filtering
- [ ] **4.2.5.5** Implement search across name, data_type, business_name, description
- [ ] **4.2.5.6** Add bulk actions dropdown (appears when items selected):
  - Delete selected columns
  - Enhance selected columns with AI
  - Export selected columns
- [ ] **4.2.5.7** Add column count display (e.g., "12 columns, 3 selected")
- [ ] **4.2.5.8** Add "Select All" / "Deselect All" checkbox
- [ ] **4.2.5.9** Style toolbar with sticky positioning
- [ ] **4.2.5.10** Test toolbar interactions

**Files**: `frontend/src/components/Canvas/ColumnsToolbar.tsx`

### 4.2.6 PK/FK/Nullable Indicators
- [ ] **4.2.6.1** Create `frontend/src/components/Canvas/ColumnIndicators.tsx`
- [ ] **4.2.6.2** Design icon/badge for Primary Key (🔑 or "PK" badge)
- [ ] **4.2.6.3** Design icon/badge for Foreign Key (🔗 or "FK" badge)
- [ ] **4.2.6.4** Design icon/badge for Nullable (? or "NULL" badge)
- [ ] **4.2.6.5** Implement toggle functionality on click
- [ ] **4.2.6.6** Add tooltips explaining each indicator
- [ ] **4.2.6.7** Update database on toggle
- [ ] **4.2.6.8** Show loading state during update
- [ ] **4.2.6.9** Handle errors gracefully
- [ ] **4.2.6.10** Test indicator toggles

**Files**: `frontend/src/components/Canvas/ColumnIndicators.tsx`

### 4.2.7 AI Confidence Badges
- [ ] **4.2.7.1** Create `frontend/src/components/Canvas/AIConfidenceBadge.tsx`
- [ ] **4.2.7.2** Design badge colors:
  - 🟢 Green for 90-100% (high confidence)
  - 🟡 Yellow for 70-89% (medium confidence)
  - 🔴 Red for <70% (low confidence)
- [ ] **4.2.7.3** Show percentage value in badge
- [ ] **4.2.7.4** Add tooltip with confidence explanation
- [ ] **4.2.7.5** Position badge next to business name and description fields
- [ ] **4.2.7.6** Hide badge if no AI confidence score
- [ ] **4.2.7.7** Add click handler to show AI reasoning (optional)
- [ ] **4.2.7.8** Style with Tailwind CSS
- [ ] **4.2.7.9** Test badge rendering with different confidence levels

**Files**: `frontend/src/components/Canvas/AIConfidenceBadge.tsx`

---

## Phase 4.3: Column Management Dialogs (Week 3)

### 4.3.1 Create Column Dialog
- [ ] **4.3.1.1** Create `frontend/src/components/Canvas/CreateColumnDialog.tsx`
- [ ] **4.3.1.2** Build form with all fields:
  - Name input (required)
  - Data type dropdown (required, with common types)
  - Business name input (optional)
  - Description textarea (optional)
  - Is Primary Key checkbox
  - Is Foreign Key checkbox
  - Is Nullable checkbox
  - Default value input (optional)
  - Transformation logic textarea (optional)
- [ ] **4.3.1.3** Implement data type dropdown with search:
  - 25+ common data types (INT, VARCHAR, DATE, TIMESTAMP, etc.)
  - Allow custom data type input
  - Group by category (String, Numeric, Date/Time, etc.)
- [ ] **4.3.1.4** Add validation:
  - Name uniqueness check (case-insensitive within dataset)
  - Name format validation (alphanumeric + underscore only)
  - Required field validation
- [ ] **4.3.1.5** Show validation errors inline
- [ ] **4.3.1.6** Implement position auto-calculation (add to end)
- [ ] **4.3.1.7** Add "Create" and "Cancel" buttons
- [ ] **4.3.1.8** Call column service on submit
- [ ] **4.3.1.9** Show success toast on creation
- [ ] **4.3.1.10** Close dialog and refresh table on success
- [ ] **4.3.1.11** Test dialog with various input combinations

**Files**: `frontend/src/components/Canvas/CreateColumnDialog.tsx`

### 4.3.2 Delete Column Confirmation
- [ ] **4.3.2.1** Create `frontend/src/components/Canvas/DeleteColumnDialog.tsx`
- [ ] **4.3.2.2** Show column name being deleted
- [ ] **4.3.2.3** Check for references to this column
- [ ] **4.3.2.4** Display warning if column is referenced by others
- [ ] **4.3.2.5** Show impact assessment (lineage, references)
- [ ] **4.3.2.6** Add confirmation checkbox "I understand this cannot be undone"
- [ ] **4.3.2.7** Implement "Delete" and "Cancel" buttons
- [ ] **4.3.2.8** Call column service on confirm
- [ ] **4.3.2.9** Show success toast on deletion
- [ ] **4.3.2.10** Close dialog and refresh table on success
- [ ] **4.3.2.11** Test deletion with and without references

**Files**: `frontend/src/components/Canvas/DeleteColumnDialog.tsx`

### 4.3.3 Bulk Delete Columns
- [ ] **4.3.3.1** Create `frontend/src/components/Canvas/BulkDeleteColumnsDialog.tsx`
- [ ] **4.3.3.2** Show list of columns to be deleted
- [ ] **4.3.3.3** Display count (e.g., "Delete 5 columns?")
- [ ] **4.3.3.4** Check for references to any selected columns
- [ ] **4.3.3.5** Show combined impact assessment
- [ ] **4.3.3.6** Add confirmation with typing column count (e.g., "Type '5' to confirm")
- [ ] **4.3.3.7** Implement "Delete All" and "Cancel" buttons
- [ ] **4.3.3.8** Call column service for bulk delete
- [ ] **4.3.3.9** Show progress indicator during deletion
- [ ] **4.3.3.10** Show success toast with count deleted
- [ ] **4.3.3.11** Close dialog and refresh table on success
- [ ] **4.3.3.12** Test bulk deletion with various selections

**Files**: `frontend/src/components/Canvas/BulkDeleteColumnsDialog.tsx`

### 4.3.4 Column Data Type Selector
- [ ] **4.3.4.1** Create `frontend/src/components/Canvas/DataTypeSelector.tsx`
- [ ] **4.3.4.2** Build dropdown with common data types:
  - **String**: VARCHAR, CHAR, TEXT, STRING, NVARCHAR
  - **Numeric**: INT, BIGINT, SMALLINT, TINYINT, DECIMAL, NUMERIC, FLOAT, DOUBLE, REAL
  - **Date/Time**: DATE, TIMESTAMP, DATETIME, TIME, TIMESTAMP_NTZ
  - **Boolean**: BOOLEAN, BOOL
  - **Binary**: BINARY, VARBINARY, BLOB
  - **Complex**: ARRAY, STRUCT, MAP, JSON, JSONB
- [ ] **4.3.4.3** Add search/filter functionality
- [ ] **4.3.4.4** Group types by category with headers
- [ ] **4.3.4.5** Add "Custom" option for user-defined types
- [ ] **4.3.4.6** Show placeholder for custom input (e.g., VARCHAR(255))
- [ ] **4.3.4.7** Validate custom input format
- [ ] **4.3.4.8** Style with Tailwind CSS
- [ ] **4.3.4.9** Make component reusable across forms
- [ ] **4.3.4.10** Test with keyboard navigation

**Files**: `frontend/src/components/Canvas/DataTypeSelector.tsx`

---

## Phase 4.4: AI Enhancement Integration (Week 4)

### 4.4.1 AI Enhancement Service
- [ ] **4.4.1.1** Create `frontend/src/lib/ai-enhancement-service.ts`
- [ ] **4.4.1.2** Implement `suggestBusinessName(column: Column, context: DatasetContext): Promise<AIBusinessNameSuggestion>`
- [ ] **4.4.1.3** Implement `suggestDescription(column: Column, context: DatasetContext): Promise<AIDescriptionSuggestion>`
- [ ] **4.4.1.4** Implement `batchEnhanceColumns(columns: Column[], context: DatasetContext, options: BatchEnhancementOptions): Promise<BatchEnhancementResult>`
- [ ] **4.4.1.5** Implement `estimateEnhancementCost(columnCount: number): Promise<CostEstimate>`
- [ ] **4.4.1.6** Add error handling and retry logic
- [ ] **4.4.1.7** Implement rate limiting
- [ ] **4.4.1.8** Add caching for repeated requests
- [ ] **4.4.1.9** Write unit tests for AI service
- [ ] **4.4.1.10** Test with various column types and contexts

**Files**: `frontend/src/lib/ai-enhancement-service.ts`

### 4.4.2 Backend AI API Endpoints
- [ ] **4.4.2.1** Create `backend/src/routes/ai-enhancement.ts`
- [ ] **4.4.2.2** Implement `POST /api/ai/enhance-column` endpoint
- [ ] **4.4.2.3** Implement `POST /api/ai/enhance-columns-batch` endpoint
- [ ] **4.4.2.4** Implement `