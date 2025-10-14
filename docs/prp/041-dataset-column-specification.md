# Feature 4: Dataset and Column Metadata Entry and Management
## Technical Specification

## 1. Overview

### 1.1 Purpose
Provide comprehensive dataset and column metadata management with AI-assisted recommendations for business names and descriptions. Enable users to create, edit, and manage datasets with rich metadata while maintaining data quality through AI confidence scoring.

### 1.2 Scope
- Dataset CRUD operations with multi-tenant isolation
- Column (formerly NodeItem) management with inline editing
- AI-assisted metadata enhancement (business names, descriptions)
- Validation and data quality tracking
- Real-time collaborative editing
- Git sync integration for version control
- Search and filtering capabilities

### 1.3 Key Features
- **Context-Aware AI Recommendations**: AI analyzes column names, data types, and sample values to suggest relevant business names and descriptions
- **Confidence Scoring**: Track AI confidence (0-100) to help users prioritize manual reviews
- **Bulk Operations**: Apply AI enhancements to multiple columns simultaneously
- **Inline Editing**: Quick edits directly in the column grid
- **Reference Management**: Define column-level references (FK, BusinessKey, NaturalKey)
- **Multi-Tenant Security**: Company-level isolation with RLS policies

---

## 2. Data Model

### 2.1 Dataset Entity

**Table**: `datasets`

```sql
CREATE TABLE datasets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id),
  project_id UUID REFERENCES projects(id),

  -- Identity
  fqn VARCHAR NOT NULL,
  name VARCHAR NOT NULL,

  -- Classification
  medallion_layer VARCHAR CHECK (medallion_layer IN ('Raw', 'Bronze', 'Silver', 'Gold')),
  entity_type VARCHAR CHECK (entity_type IN ('Table', 'Staging', 'PersistentStaging', 'DataVault', 'DataMart')),
  entity_subtype VARCHAR CHECK (entity_subtype IN ('Dimension', 'Fact', 'Hub', 'Link', 'Satellite', 'LinkSatellite', 'PIT', 'Bridge')),
  materialization_type VARCHAR CHECK (materialization_type IN ('Table', 'View', 'MaterializedView')),

  -- Documentation
  description TEXT,
  metadata JSONB,

  -- AI metadata
  ai_confidence_score INTEGER CHECK (ai_confidence_score BETWEEN 0 AND 100),

  -- Ownership and Security
  owner_id UUID REFERENCES users(id),
  visibility VARCHAR NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'locked')),
  is_locked BOOLEAN DEFAULT false,

  -- Source control sync tracking
  source_control_file_path VARCHAR,
  source_control_commit_sha VARCHAR,
  has_uncommitted_changes BOOLEAN DEFAULT false,
  last_synced_at TIMESTAMP,
  sync_status VARCHAR DEFAULT 'synced' CHECK (sync_status IN ('synced', 'pending', 'conflict', 'error')),
  sync_error_message TEXT,

  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(account_id, fqn)
);
```

**Metadata JSONB Structure**:
```json
{
  "source_system": "salesforce",
  "business_owner": "jane.doe@company.com",
  "technical_owner": "john.smith@company.com",
  "refresh_frequency": "daily",
  "data_classification": "sensitive",
  "retention_days": 2555,
  "custom_properties": {
    "cost_center": "marketing",
    "sla_hours": 24
  }
}
```

### 2.2 Column Entity

**Table**: `columns`

```sql
CREATE TABLE columns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,

  -- Identity
  fqn VARCHAR NOT NULL,
  name VARCHAR NOT NULL,

  -- Data type
  data_type VARCHAR NOT NULL,

  -- Documentation
  description TEXT,
  business_name VARCHAR,

  -- Properties
  is_primary_key BOOLEAN DEFAULT false,
  is_foreign_key BOOLEAN DEFAULT false,
  is_nullable BOOLEAN DEFAULT true,
  default_value TEXT,

  -- Reference (replaces separate references table)
  reference_column_id UUID REFERENCES columns(id) ON DELETE SET NULL,
  reference_type VARCHAR CHECK (reference_type IN ('FK', 'BusinessKey', 'NaturalKey')),
  reference_description TEXT,

  -- Transformation
  transformation_logic TEXT,

  -- AI metadata
  ai_confidence_score INTEGER CHECK (ai_confidence_score BETWEEN 0 AND 100),

  -- Position
  position INTEGER,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(dataset_id, name)
);
```

**Common Data Types**:
- String: VARCHAR, CHAR, TEXT, STRING
- Numeric: INT, BIGINT, DECIMAL, NUMERIC, FLOAT, DOUBLE
- Date/Time: DATE, TIMESTAMP, DATETIME, TIME
- Boolean: BOOLEAN, BOOL
- Binary: BINARY, VARBINARY, BLOB
- Complex: ARRAY, STRUCT, MAP, JSON

---

## 3. Architecture

### 3.1 Service Layer

```typescript
// frontend/src/lib/dataset-service.ts
export class DatasetService {
  // CRUD Operations
  static async createDataset(data: CreateDatasetInput): Promise<Dataset>
  static async getDataset(id: string): Promise<Dataset>
  static async updateDataset(id: string, data: UpdateDatasetInput): Promise<Dataset>
  static async deleteDataset(id: string): Promise<void>
  
  // Bulk Operations
  static async bulkUpdateDatasets(updates: DatasetUpdate[]): Promise<Dataset[]>
  
  // Search and Filter
  static async searchDatasets(query: DatasetSearchQuery): Promise<Dataset[]>
  
  // AI Enhancement
  static async enhanceDatasetMetadata(id: string): Promise<Dataset>
  
  // Git Sync
  static async commitDataset(id: string, message: string): Promise<void>
  static async syncFromGit(id: string): Promise<Dataset>
}

// frontend/src/lib/column-service.ts
export class ColumnService {
  // CRUD Operations
  static async createColumn(datasetId: string, data: CreateColumnInput): Promise<Column>
  static async updateColumn(id: string, data: UpdateColumnInput): Promise<Column>
  static async deleteColumn(id: string): Promise<void>
  static async deleteMultipleColumns(ids: string[]): Promise<void>
  
  // Bulk Operations
  static async bulkUpdateColumns(updates: ColumnUpdate[]): Promise<Column[]>
  static async reorderColumns(datasetId: string, order: string[]): Promise<void>
  
  // AI Enhancement
  static async enhanceColumnMetadata(
    id: string, 
    options: AIEnhancementOptions
  ): Promise<AIEnhancementResult>
  
  static async bulkEnhanceColumns(
    columnIds: string[], 
    options: AIEnhancementOptions
  ): Promise<AIEnhancementResult[]>
  
  // Reference Management
  static async setColumnReference(
    columnId: string, 
    referenceData: ColumnReferenceInput
  ): Promise<Column>
  
  static async removeColumnReference(columnId: string): Promise<Column>
}
```

### 3.2 AI Service Integration

```typescript
// frontend/src/lib/ai-enhancement-service.ts
export class AIEnhancementService {
  /**
   * Generate business name suggestion for a column
   * @param column - Column metadata
   * @param context - Dataset and related information
   * @returns Suggested business name with confidence score
   */
  static async suggestBusinessName(
    column: Column,
    context: DatasetContext
  ): Promise<AIBusinessNameSuggestion>
  
  /**
   * Generate description for a column
   * @param column - Column metadata
   * @param context - Dataset and related information
   * @returns Suggested description with confidence score
   */
  static async suggestDescription(
    column: Column,
    context: DatasetContext
  ): Promise<AIDescriptionSuggestion>
  
  /**
   * Batch enhance multiple columns
   * @param columns - Array of columns to enhance
   * @param context - Dataset context
   * @param options - Enhancement options
   * @returns Array of enhancement results
   */
  static async batchEnhanceColumns(
    columns: Column[],
    context: DatasetContext,
    options: BatchEnhancementOptions
  ): Promise<BatchEnhancementResult>
  
  /**
   * Validate and estimate cost before enhancement
   * @param columnCount - Number of columns to enhance
   * @returns Cost estimation
   */
  static async estimateEnhancementCost(
    columnCount: number
  ): Promise<CostEstimate>
}

// Types
interface DatasetContext {
  datasetName: string;
  datasetDescription?: string;
  medallionLayer?: string;
  entityType?: string;
  relatedDatasets?: string[];
  existingColumns?: Column[];
}

interface AIBusinessNameSuggestion {
  suggestedName: string;
  confidence: number; // 0-100
  reasoning: string;
}

interface AIDescriptionSuggestion {
  suggestedDescription: string;
  confidence: number;
  reasoning: string;
}

interface BatchEnhancementOptions {
  enhanceBusinessNames: boolean;
  enhanceDescriptions: boolean;
  confidenceThreshold?: number; // Only apply if confidence > threshold
  autoApplyHighConfidence?: boolean; // Auto-apply if confidence > 80
}

interface BatchEnhancementResult {
  enhancements: ColumnEnhancement[];
  totalProcessed: number;
  autoApplied: number;
  requiresReview: number;
  estimatedCost: number;
}

interface ColumnEnhancement {
  columnId: string;
  columnName: string;
  businessName?: AIBusinessNameSuggestion;
  description?: AIDescriptionSuggestion;
  applied: boolean;
}

interface CostEstimate {
  columnCount: number;
  estimatedTokens: number;
  estimatedCost: number; // USD
  modelUsed: string;
}
```

### 3.3 Change Tracking

```typescript
// frontend/src/lib/change-tracker.ts
export class ChangeTracker {
  /**
   * Track a change to a dataset or column
   */
  static async trackChange(change: MetadataChange): Promise<void>
  
  /**
   * Get uncommitted changes for a dataset
   */
  static async getUncommittedChanges(datasetId: string): Promise<MetadataChange[]>
  
  /**
   * Mark changes as committed
   */
  static async markChangesCommitted(
    datasetId: string, 
    commitSha: string
  ): Promise<void>
}

interface MetadataChange {
  id: string;
  dataset_id: string;
  workspace_id: string;
  change_type: 'created' | 'updated' | 'deleted';
  entity_type: 'dataset' | 'column' | 'lineage';
  entity_id: string;
  field_name?: string;
  old_value?: any;
  new_value?: any;
  changed_by: string;
  changed_at: Date;
  committed_in_sha?: string;
}
```

---

## 4. User Interface Components

### 4.1 Dataset Editor Dialog

**Component**: `DatasetEditorDialog.tsx`

**Features**:
- Modal dialog with tabs
- Unsaved changes warning
- Real-time validation
- Git sync status display

**Tabs**:
1. **Properties** - Dataset metadata
2. **Columns** - Column management (PRIMARY TAB FOR THIS FEATURE)
3. **References** - Column-level references
4. **Lineage** - Data lineage
5. **AI Insights** - AI recommendations
6. **History** - Change history and Git commits

**Properties Tab Fields**:
```typescript
interface DatasetProperties {
  name: string;                    // Required, unique within account
  fqn: string;                      // Auto-generated, read-only
  medallion_layer?: MedallionLayer;
  entity_type?: EntityType;
  entity_subtype?: EntitySubtype;
  materialization_type?: MaterializationType;
  description?: string;
  metadata?: Record<string, any>;  // Custom key-value pairs
  ai_confidence_score?: number;    // Display only, set by AI
}
```

### 4.2 Columns Tab (Primary Focus)

**Component**: `ColumnsTab.tsx`

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ [Add Column]  [Enhance with AI]  [Search: ______________ ]  │
├─────────────────────────────────────────────────────────────┤
│ ☐ Name ↕         Type ↕      Business Name    Description   │
├─────────────────────────────────────────────────────────────┤
│ ☐ customer_id   STRING       Customer ID       Unique...    │
│   [Key] [Link]  [Edit]       📝 85%            📝 90%       │
├─────────────────────────────────────────────────────────────┤
│ ☐ first_name    VARCHAR(50)  First Name        Customer...  │
│                 [Edit]       📝 95%            📝 88%       │
├─────────────────────────────────────────────────────────────┤
│ ☐ email         STRING       Email Address     Email...     │
│   [Link]        [Edit]       📝 92%            📝 85%       │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- **Sortable columns** by name, type, confidence
- **Inline editing** for all fields
- **Search/filter** by name, type, description
- **Multi-select** with checkboxes
- **Bulk actions** toolbar
- **AI confidence badges** (🟢 90-100%, 🟡 70-89%, 🔴 <70%)
- **Quick toggles** for PK/FK/Nullable
- **Drag-to-reorder** (future enhancement)

**Inline Editing**:
- Click any cell to edit
- Tab to move to next cell
- Enter to save
- Escape to cancel
- Auto-save on blur

### 4.3 Column Creation Dialog

**Component**: `CreateColumnDialog.tsx`

**Fields**:
```typescript
interface CreateColumnInput {
  name: string;                  // Required
  data_type: string;             // Required, dropdown with common types
  description?: string;
  business_name?: string;
  is_primary_key?: boolean;
  is_foreign_key?: boolean;
  is_nullable?: boolean;
  default_value?: string;
  transformation_logic?: string;
  position?: number;             // Auto-set to end if not provided
}
```

**Validation Rules**:
- Name must be unique within dataset (case-insensitive)
- Name must match pattern: `^[a-zA-Z_][a-zA-Z0-9_]*$`
- Data type must be non-empty
- Business name is optional but recommended

### 4.4 AI Enhancement Dialog

**Component**: `AIEnhancementDialog.tsx`

**Workflow**:
1. **Selection Step**: Choose columns to enhance
2. **Configuration Step**: Set options (business names, descriptions, threshold)
3. **Preview Step**: Review AI suggestions
4. **Review Step**: Accept/reject/edit suggestions
5. **Apply Step**: Apply approved changes

**Preview UI**:
```
┌──────────────────────────────────────────────────────────────┐
│ AI Enhancement Preview                    [Close] [Apply All] │
├──────────────────────────────────────────────────────────────┤
│ customer_id                                                   │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Business Name: Customer ID  (Confidence: 85%) 🟡         │ │
│ │ Original: customer_id                                    │ │
│ │ Reasoning: Standard naming convention for customer ID    │ │
│ │ [✓ Accept]  [✗ Reject]  [✎ Edit]                        │ │
│ └──────────────────────────────────────────────────────────┘ │
│ ┌──────────────────────────────────────────────────────────┐ │
│ │ Description: Unique identifier... (Confidence: 90%) 🟢   │ │
│ │ Original: (empty)                                        │ │
│ │ Reasoning: Common description for primary key fields     │ │
│ │ [✓ Accept]  [✗ Reject]  [✎ Edit]                        │ │
│ └──────────────────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────────────────┤
│ first_name                                                    │
│ (similar structure)                                           │
└──────────────────────────────────────────────────────────────┘
```

**Confidence Indicators**:
- 🟢 Green (90-100%): High confidence, auto-apply option
- 🟡 Yellow (70-89%): Medium confidence, requires review
- 🔴 Red (<70%): Low confidence, manual review recommended

**Cost Display**:
- Show estimated cost before processing
- Track actual cost after processing
- Display tokens used

### 4.5 Column References Management

**Component**: `ColumnReferencesTab.tsx`

**Reference Types**:
- **FK (Foreign Key)**: Referential integrity relationship
- **BusinessKey**: Business key relationship (logical)
- **NaturalKey**: Natural key relationship (source system key)

**UI**:
```
┌────────────────────────────────────────────────────────────┐
│ Column References                     [Add Reference]       │
├────────────────────────────────────────────────────────────┤
│ customer_id → dim_customer.customer_key                    │
│ Type: FK  |  Description: Links to customer dimension      │
│ [Edit] [Delete]                                            │
├────────────────────────────────────────────────────────────┤
│ product_code → product.product_id                          │
│ Type: BusinessKey  |  Description: Business key match      │
│ [Edit] [Delete]                                            │
└────────────────────────────────────────────────────────────┘
```

**Add Reference Dialog**:
- Select target dataset
- Select target column
- Choose reference type
- Add description

---

## 5. API Endpoints

### 5.1 Dataset Endpoints

```typescript
// GET /api/datasets/:id
// Get dataset by ID with columns
GET /api/datasets/:id
Response: {
  dataset: Dataset;
  columns: Column[];
}

// POST /api/datasets
// Create new dataset
POST /api/datasets
Body: CreateDatasetInput
Response: Dataset

// PUT /api/datasets/:id
// Update dataset
PUT /api/datasets/:id
Body: UpdateDatasetInput
Response: Dataset

// DELETE /api/datasets/:id
// Delete dataset
DELETE /api/datasets/:id
Response: { success: boolean }

// GET /api/datasets
// Search/filter datasets
GET /api/datasets?search=customer&layer=Gold&type=Dimension
Response: {
  datasets: Dataset[];
  total: number;
  page: number;
  pageSize: number;
}
```

### 5.2 Column Endpoints

```typescript
// GET /api/datasets/:datasetId/columns
// Get all columns for dataset
GET /api/datasets/:datasetId/columns
Response: Column[]

// POST /api/datasets/:datasetId/columns
// Create column
POST /api/datasets/:datasetId/columns
Body: CreateColumnInput
Response: Column

// PUT /api/columns/:id
// Update column
PUT /api/columns/:id
Body: UpdateColumnInput
Response: Column

// DELETE /api/columns/:id
// Delete column
DELETE /api/columns/:id
Response: { success: boolean }

// POST /api/columns/bulk-update
// Bulk update columns
POST /api/columns/bulk-update
Body: { updates: ColumnUpdate[] }
Response: Column[]

// DELETE /api/columns/bulk-delete
// Bulk delete columns
DELETE /api/columns/bulk-delete
Body: { ids: string[] }
Response: { success: boolean; deletedCount: number }

// POST /api/datasets/:datasetId/columns/reorder
// Reorder columns
POST /api/datasets/:datasetId/columns/reorder
Body: { columnIds: string[] }
Response: { success: boolean }
```

### 5.3 AI Enhancement Endpoints

```typescript
// POST /api/ai/enhance-column
// Enhance single column
POST /api/ai/enhance-column
Body: {
  columnId: string;
  datasetContext: DatasetContext;
  options: AIEnhancementOptions;
}
Response: AIEnhancementResult

// POST /api/ai/enhance-columns-batch
// Batch enhance columns
POST /api/ai/enhance-columns-batch
Body: {
  columnIds: string[];
  datasetContext: DatasetContext;
  options: BatchEnhancementOptions;
}
Response: BatchEnhancementResult

// POST /api/ai/estimate-cost
// Estimate enhancement cost
POST /api/ai/estimate-cost
Body: {
  columnCount: number;
}
Response: CostEstimate
```

---

## 6. Validation Rules

### 6.1 Dataset Validation

```typescript
const datasetValidationRules = {
  name: {
    required: true,
    minLength: 1,
    maxLength: 255,
    pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
    unique: true, // within account
  },
  fqn: {
    required: true,
    format: '{layer}.{schema}.{name}',
    unique: true, // within account
  },
  medallion_layer: {
    enum: ['Raw', 'Bronze', 'Silver', 'Gold'],
  },
  entity_type: {
    enum: ['Table', 'Staging', 'PersistentStaging', 'DataVault', 'DataMart'],
  },
  entity_subtype: {
    conditional: {
      if: { entity_type: 'DataVault' },
      enum: ['Hub', 'Link', 'Satellite', 'LinkSatellite', 'PIT', 'Bridge'],
    },
    {
      if: { entity_type: 'DataMart' },
      enum: ['Dimension', 'Fact'],
    },
  },
};
```

### 6.2 Column Validation

```typescript
const columnValidationRules = {
  name: {
    required: true,
    minLength: 1,
    maxLength: 255,
    pattern: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
    unique: true, // within dataset (case-insensitive)
  },
  data_type: {
    required: true,
    minLength: 1,
  },
  business_name: {
    maxLength: 255,
  },
  description: {
    maxLength: 2000,
  },
  ai_confidence_score: {
    min: 0,
    max: 100,
  },
  reference_type: {
    enum: ['FK', 'BusinessKey', 'NaturalKey'],
    conditional: {
      if: { reference_column_id: 'not null' },
      required: true,
    },
  },
};
```

---

## 7. Security & Access Control

### 7.1 Multi-Tenant Isolation

**RLS Policies** (Supabase):

```sql
-- Datasets isolation policy
CREATE POLICY datasets_isolation_policy ON datasets
  FOR SELECT
  USING (account_id = (SELECT account_id FROM users WHERE id = auth.uid()));

-- Datasets update policy (only owner and admins)
CREATE POLICY datasets_update_policy ON datasets
  FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR
    (SELECT role FROM account_users WHERE account_id = datasets.account_id AND user_id = auth.uid()) = 'admin'
  );

-- Columns inherit dataset permissions
CREATE POLICY columns_isolation_policy ON columns
  FOR SELECT
  USING (
    dataset_id IN (
      SELECT id FROM datasets 
      WHERE account_id = (SELECT account_id FROM users WHERE id = auth.uid())
    )
  );
```

### 7.2 Ownership & Visibility

**Access Matrix**:

| Role | Public Dataset | Private Dataset | Locked Dataset |
|------|---------------|-----------------|----------------|
| Admin | Read/Write | Read/Write | Read/Write |
| Owner | Read/Write | Read/Write | Read/Write |
| Member | Read/Write | No Access | Read Only |

**Visibility Rules**:
- `public`: Visible to all members in account
- `private`: Visible only to owner and admins
- `locked`: Read-only except for owner and admins

---

## 8. Performance Optimization

### 8.1 Database Indexes

```sql
-- Datasets indexes
CREATE INDEX idx_datasets_account ON datasets(account_id);
CREATE INDEX idx_datasets_workspace ON datasets(workspace_id);
CREATE INDEX idx_datasets_project ON datasets(project_id);
CREATE INDEX idx_datasets_owner ON datasets(owner_id);
CREATE INDEX idx_datasets_fqn ON datasets(fqn);
CREATE INDEX idx_datasets_name ON datasets(name);
CREATE INDEX idx_datasets_visibility ON datasets(visibility);
CREATE INDEX idx_datasets_sync_status ON datasets(sync_status);
CREATE INDEX idx_datasets_uncommitted ON datasets(has_uncommitted_changes) 
  WHERE has_uncommitted_changes = true;

-- Columns indexes
CREATE INDEX idx_columns_dataset ON columns(dataset_id);
CREATE INDEX idx_columns_fqn ON columns(fqn);
CREATE INDEX idx_columns_name ON columns(name);
CREATE INDEX idx_columns_reference ON columns(reference_column_id);
CREATE INDEX idx_columns_is_pk ON columns(is_primary_key) 
  WHERE is_primary_key = true;
CREATE INDEX idx_columns_is_fk ON columns(is_foreign_key) 
  WHERE is_foreign_key = true;

-- Full-text search indexes
CREATE INDEX idx_datasets_search ON datasets USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX idx_columns_search ON columns USING gin(to_tsvector('english', name || ' ' || COALESCE(business_name, '') || ' ' || COALESCE(description, '')));
```

### 8.2 Query Optimization

```typescript
// Use select specific fields instead of *
const optimizedQuery = supabase
  .from('datasets')
  .select('id, name, fqn, medallion_layer, entity_type, owner_id')
  .eq('account_id', accountId)
  .eq('visibility', 'public');

// Batch queries for related data
const { data: datasets } = await supabase
  .from('datasets')
  .select(`
    id,
    name,
    columns:columns(id, name, data_type, business_name)
  `)
  .eq('account_id', accountId);

// Use pagination for large result sets
const { data, count } = await supabase
  .from('datasets')
  .select('*', { count: 'exact' })
  .range(0, 49) // First 50 results
  .order('created_at', { ascending: false });
```

### 8.3 Caching Strategy

```typescript
// React Query caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

// Cache keys
const datasetKeys = {
  all: ['datasets'] as const,
  lists: () => [...datasetKeys.all, 'list'] as const,
  list: (filters: DatasetFilters) => [...datasetKeys.lists(), filters] as const,
  details: () => [...datasetKeys.all, 'detail'] as const,
  detail: (id: string) => [...datasetKeys.details(), id] as const,
  columns: (datasetId: string) => [...datasetKeys.detail(datasetId), 'columns'] as const,
};
```

---

## 9. Testing Strategy

### 9.1 Unit Tests

```typescript
// Dataset service tests
describe('DatasetService', () => {
  test('creates dataset with valid data', async () => {
    const input = {
      name: 'test_dataset',
      medallion_layer: 'Silver',
      entity_type: 'Table',
    };
    const result = await DatasetService.createDataset(input);
    expect(result.name).toBe('test_dataset');
    expect(result.fqn).toMatch(/silver\..*\.test_dataset/);
  });

  test('validates unique name within account', async () => {
    await DatasetService.createDataset({ name: 'test_dataset' });
    await expect(
      DatasetService.createDataset({ name: 'test_dataset' })
    ).rejects.toThrow('Dataset name must be unique');
  });
});

// Column service tests
describe('ColumnService', () => {
  test('creates column with AI enhancement', async () => {
    const result = await ColumnService.createColumn(datasetId, {
      name: 'customer_id',
      data_type: 'STRING',
    });
    expect(result.name).toBe('customer_id');
  });

  test('validates unique column name (case-insensitive)', async () => {
    await ColumnService.createColumn(datasetId, {
      name: 'customer_id',
      data_type: 'STRING',
    });
    await expect(
      ColumnService.createColumn(datasetId, {
        name: 'CUSTOMER_ID',
        data_type: 'INT',
      })
    ).rejects.toThrow('Column name must be unique');
  });
});

// AI enhancement tests
describe('AIEnhancementService', () => {
  test('suggests business name with confidence', async () => {
    const result = await AIEnhancementService.suggestBusinessName(
      { name: 'cust_id', data_type: 'INT' },
      { datasetName: 'customers' }
    );
    expect(result.suggestedName).toBe('Customer ID');
    expect(result.confidence).toBeGreaterThan(70);
  });

  test('batch enhances multiple columns', async () => {
    const columns = [
      { id: '1', name: 'cust_id', data_type: 'INT' },
      { id: '2', name: 'first_nm', data_type: 'VARCHAR' },
    ];
    const result = await AIEnhancementService.batchEnhanceColumns(
      columns,
      { datasetName: 'customers' },
      { enhanceBusinessNames: true, enhanceDescriptions: true }
    );
    expect(result.enhancements.length).toBe(2);
  });
});
```

### 9.2 Integration Tests

```typescript
describe('Dataset and Column Integration', () => {
  test('creates dataset with columns and AI enhancement', async () => {
    // Create dataset
    const dataset = await DatasetService.createDataset({
      name: 'customers',
      medallion_layer: 'Silver',
      entity_type: 'Table',
    });

    // Add columns
    const columns = await Promise.all([
      ColumnService.createColumn(dataset.id, {
        name: 'customer_id',
        data_type: 'INT',
        is_primary_key: true,
      }),
      ColumnService.createColumn(dataset.id, {
        name: 'first_name',
        data_type: 'VARCHAR(50)',
      }),
    ]);

    // Enhance with AI
    const enhanced = await ColumnService.bulkEnhanceColumns(
      columns.map((c) => c.id),
      { enhanceBusinessNames: true, enhanceDescriptions: true }
    );

    expect(enhanced.length).toBe(2);
    expect(enhanced[0].businessName).toBeDefined();
    expect(enhanced[0].description).toBeDefined();
  });
});
```

### 9.3 E2E Tests

```typescript
describe('Dataset Management E2E', () => {
  test('complete workflow: create, edit, enhance, commit', async () => {
    // Navigate to project canvas
    await page.goto('/projects/test-project');

    // Create dataset
    await page.click('[data-testid="create-dataset-button"]');
    await page.fill('[name="name"]', 'test_customers');
    await page.selectOption('[name="medallion_layer"]', 'Silver');
    await page.click('[data-testid="create-button"]');

    // Open dataset editor
    await page.click('[data-testid="dataset-node-test_customers"]');

    // Switch to Columns tab
    await page.click('[data-testid="columns-tab"]');

    // Add column
    await page.click('[data-testid="add-column-button"]');
    await page.fill('[name="name"]', 'customer_id');
    await page.selectOption('[name="data_type"]', 'INT');
    await page.click('[data-testid="save-column-button"]');

    // Enhance with AI
    await page.click('[data-testid="enhance-ai-button"]');
    await page.click('[data-testid="select-all-columns"]');
    await page.click('[data-testid="enhance-button"]');
    await page.waitForSelector('[data-testid="enhancement-complete"]');

    // Review and apply
    await page.click('[data-testid="apply-all-button"]');

    // Commit to Git
    await page.click('[data-testid="commit-button"]');
    await page.fill('[name="commitMessage"]', 'Add customers dataset');
    await page.click('[data-testid="commit-confirm-button"]');

    // Verify sync status
    await expect(page.locator('[data-testid="sync-status"]')).toHaveText('Synced');
  });
});
```

---

## 10. Error Handling

### 10.1 Validation Errors

```typescript
class ValidationError extends Error {
  constructor(
    public field: string,
    public message: string,
    public code: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Usage
if (!name.match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
  throw new ValidationError(
    'name',
    'Name must start with letter or underscore and contain only alphanumeric characters',
    'INVALID_NAME_FORMAT'
  );
}
```

### 10.2 AI Service Errors

```typescript
class AIServiceError extends Error {
  constructor(
    public message: string,
    public code: string,
    public retryable: boolean
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

// Retry logic
async function enhanceWithRetry(
  column: Column,
  maxRetries = 3
): Promise<AIEnhancementResult> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await AIEnhancementService.suggestBusinessName(column, context);
    } catch (error) {
      if (error instanceof AIServiceError && error.retryable && i < maxRetries - 1) {
        await delay(Math.pow(2, i) * 1000); // Exponential backoff
        continue;
      }
      throw error;
    }
  }
}
```

### 10.3 User-Friendly Error Messages

```typescript
const errorMessages = {
  DUPLICATE_NAME: 'A dataset with this name already exists. Please choose a different name.',
  INVALID_NAME_FORMAT: 'Name must start with a letter or underscore and contain only letters, numbers, and underscores.',
  COLUMN_DUPLICATE_NAME: 'A column with this name already exists in this dataset.',
  AI_SERVICE_UNAVAILABLE: 'AI enhancement is temporarily unavailable. Please try again later.',
  INSUFFICIENT_CREDITS: 'You have insufficient credits for AI enhancement. Please upgrade your plan.',
  GIT_SYNC_CONFLICT: 'This dataset has been modified by another user. Please refresh and try again.',
};
```

---

## 11. Future Enhancements

### 11.1 Advanced AI Features
- **Smart Data Type Inference**: Analyze sample data to suggest data types
- **Relationship Discovery**: AI detects potential FK relationships
- **Anomaly Detection**: Flag unusual column names or missing metadata
- **Quality Scoring**: Overall dataset quality score based on metadata completeness

### 11.2 Collaboration Features
- **Real-Time Editing**: See other users' cursors and edits
- **Comments**: Add comments to columns for discussion
- **Approval Workflows**: Require approval before committing metadata changes
- **Change Notifications**: Notify users when datasets they care about are modified

### 11.3 Data Profiling Integration
- **Sample Data Preview**: Show sample values for columns
- **Statistics**: Min, max, avg, distinct count, null %
- **Distribution Charts**: Histograms for numeric columns
- **Data Quality Checks**: Automated validation rules

### 11.4 Template Library
- **Column Templates**: Pre-defined column sets (e.g., SCD Type 2 columns)
- **Dataset Templates**: Templates for common patterns (e.g., Dimension, Fact)
- **Naming Conventions**: Enforced naming standards
- **Metadata Templates**: Standard metadata schemas by industry

---

## 12. Success Metrics

### 12.1 User Adoption
- % of datasets with AI-enhanced metadata
- Average confidence score of AI suggestions
- % of AI suggestions accepted vs. rejected
- Time saved per dataset (vs. manual entry)

### 12.2 Data Quality
- % of columns with business names
- % of columns with descriptions
- Average metadata completeness score
- % of columns with references defined

### 12.3 Performance
- Average time to create dataset with 50 columns
- Average time for AI enhancement (per column)
- 95th percentile API response time
- Search query response time

---

## 13. Documentation Requirements

### 13.1 User Documentation
- "Getting Started: Creating Your First Dataset"
- "Column Management Best Practices"
- "Using AI to Enhance Metadata"
- "Understanding Confidence Scores"
- "Managing Column References"
- "Git Sync and Version Control"

### 13.2 Developer Documentation
- API Reference (OpenAPI/Swagger)
- Database Schema Diagram
- Service Layer Architecture
- AI Enhancement Implementation Guide
- Testing Guidelines
- Deployment Checklist

---

## Appendix A: TypeScript Interfaces

```typescript
// Complete type definitions
interface Dataset {
  id: string;
  account_id: string;
  workspace_id?: string;
  project_id?: string;
  fqn: string;
  name: string;
  medallion_layer?: MedallionLayer;
  entity_type?: EntityType;
  entity_subtype?: EntitySubtype;
  materialization_type?: MaterializationType;
  description?: string;
  metadata?: Record<string, any>;
  ai_confidence_score?: number;
  owner_id?: string;
  visibility: 'public' | 'private' | 'locked';
  is_locked: boolean;
  source_control_file_path?: string;
  source_control_commit_sha?: string;
  has_uncommitted_changes: boolean;
  last_synced_at?: Date;
  sync_status: 'synced' | 'pending' | 'conflict' | 'error';
  sync_error_message?: string;
  created_by?: string;
  created_at: Date;
  updated_at: Date;
}

interface Column {
  id: string;
  dataset_id: string;
  fqn: string;
  name: string;
  data_type: string;
  description?: string;
  business_name?: string;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  is_nullable: boolean;
  default_value?: string;
  reference_column_id?: string;
  reference_type?: 'FK' | 'BusinessKey' | 'NaturalKey';
  reference_description?: string;
  transformation_logic?: string;
  ai_confidence_score?: number;
  position: number;
  created_at: Date;
  updated_at: Date;
}

type MedallionLayer = 'Raw' | 'Bronze' | 'Silver' | 'Gold';
type EntityType = 'Table' | 'Staging' | 'PersistentStaging' | 'DataVault' | 'DataMart';
type EntitySubtype = 'Dimension' | 'Fact' | 'Hub' | 'Link' | 'Satellite' | 'LinkSatellite' | 'PIT' | 'Bridge';
type MaterializationType = 'Table' | 'View' | 'MaterializedView';
```
