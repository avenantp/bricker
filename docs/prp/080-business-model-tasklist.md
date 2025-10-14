## 6. Detailed Task List - Business Modeling Diagram

### Phase BM.1: Database Schema Implementation (Week 1)

#### BM.1.1 Extend Datasets Table for Conceptual Models ✓
- [ ] **BM.1.1.1** Create migration file: `BM_1_1_add_conceptual_flag.sql`
- [ ] **BM.1.1.2** Add `is_conceptual BOOLEAN DEFAULT false` column to datasets table
- [ ] **BM.1.1.3** Add `business_context JSONB` column to datasets table
- [ ] **BM.1.1.4** Create index on `is_conceptual` column
- [ ] **BM.1.1.5** Add check constraint to prevent conceptual datasets from having connection_id
- [ ] **BM.1.1.6** Update RLS policies to include conceptual datasets
- [ ] **BM.1.1.7** Add comments to new columns
- [ ] **BM.1.1.8** Test migration on development database
- [ ] **BM.1.1.9** Verify existing datasets remain unaffected (is_conceptual = false)

**Files**:
- `backend/migrations/BM_1_1_add_conceptual_flag.sql`

**SQL Tasks**:
```sql
ALTER TABLE datasets ADD COLUMN is_conceptual BOOLEAN DEFAULT false;
ALTER TABLE datasets ADD COLUMN business_context JSONB;
CREATE INDEX idx_datasets_conceptual ON datasets(is_conceptual) WHERE is_conceptual = true;
ALTER TABLE datasets ADD CONSTRAINT chk_conceptual_no_connection CHECK (
  (is_conceptual = false) OR (is_conceptual = true AND connection_id IS NULL)
);
```

#### BM.1.2 Create Business-Physical Mappings Table ✓
- [ ] **BM.1.2.1** Create migration file: `BM_1_2_create_business_physical_mappings.sql`
- [ ] **BM.1.2.2** Create `business_physical_mappings` table with all columns
- [ ] **BM.1.2.3** Add foreign key constraints
- [ ] **BM.1.2.4** Add check constraints (different datasets, conceptual validation)
- [ ] **BM.1.2.5** Create indexes on business_dataset_id, physical_dataset_id, workspace_id, account_id
- [ ] **BM.1.2.6** Create RLS policies for account isolation
- [ ] **BM.1.2.7** Add update trigger for updated_at
- [ ] **BM.1.2.8** Add comments to table and columns
- [ ] **BM.1.2.9** Test table creation and constraints
- [ ] **BM.1.2.10** Test RLS policies with different accounts

**Files**:
- `backend/migrations/BM_1_2_create_business_physical_mappings.sql`

**Validation**:
- Try to create mapping between two conceptual datasets (should fail)
- Try to create mapping between conceptual and physical dataset (should succeed)
- Verify RLS prevents cross-account access

#### BM.1.3 Create AI Recommendations Table ✓
- [ ] **BM.1.3.1** Create migration file: `BM_1_3_create_ai_recommendations.sql`
- [ ] **BM.1.3.2** Create `ai_mapping_recommendations` table
- [ ] **BM.1.3.3** Add all required columns (confidence_score, rank, match_factors, etc.)
- [ ] **BM.1.3.4** Add foreign key constraints
- [ ] **BM.1.3.5** Add check constraint on confidence_score (0-100)
- [ ] **BM.1.3.6** Add unique constraint on (business_dataset_id, recommended_physical_dataset_id)
- [ ] **BM.1.3.7** Create indexes on business_dataset_id, confidence_score DESC, user_action
- [ ] **BM.1.3.8** Create RLS policies for account isolation
- [ ] **BM.1.3.9** Add comments to table and columns
- [ ] **BM.1.3.10** Test table creation and constraints

**Files**:
- `backend/migrations/BM_1_3_create_ai_recommendations.sql`

#### BM.1.4 Create Conversation Tables ✓
- [ ] **BM.1.4.1** Create migration file: `BM_1_4_create_conversation_tables.sql`
- [ ] **BM.1.4.2** Create `business_model_conversations` table
- [ ] **BM.1.4.3** Create `business_model_messages` table
- [ ] **BM.1.4.4** Add foreign key constraints (cascade on delete)
- [ ] **BM.1.4.5** Add check constraints on role and conversation_type
- [ ] **BM.1.4.6** Create indexes on conversation_id, business_dataset_id, user_id
- [ ] **BM.1.4.7** Create RLS policies for both tables
- [ ] **BM.1.4.8** Add update trigger for conversations.updated_at and last_message_at
- [ ] **BM.1.4.9** Add comments to tables and columns
- [ ] **BM.1.4.10** Test table creation and relationships

**Files**:
- `backend/migrations/BM_1_4_create_conversation_tables.sql`

**Validation**:
- Create conversation and verify it shows up for correct account only
- Add messages and verify last_message_at updates automatically
- Test cascade delete (delete conversation should delete messages)

#### BM.1.5 Create Helper Functions ✓
- [ ] **BM.1.5.1** Create migration file: `BM_1_5_create_helper_functions.sql`
- [ ] **BM.1.5.2** Create function `is_business_dataset(dataset_id UUID) RETURNS BOOLEAN`
- [ ] **BM.1.5.3** Create function `get_mapping_confidence(business_dataset_id UUID, physical_dataset_id UUID) RETURNS DECIMAL`
- [ ] **BM.1.5.4** Create function `get_business_dataset_mappings(business_dataset_id UUID) RETURNS TABLE`
- [ ] **BM.1.5.5** Create function `get_unmapped_business_datasets(workspace_id UUID) RETURNS TABLE`
- [ ] **BM.1.5.6** Create function `expire_old_recommendations()` (scheduled job)
- [ ] **BM.1.5.7** Add comments to functions
- [ ] **BM.1.5.8** Test all functions with sample data

**Files**:
- `backend/migrations/BM_1_5_create_helper_functions.sql`

**Functions to Create**:
```sql
CREATE FUNCTION is_business_dataset(dataset_id UUID) RETURNS BOOLEAN;
CREATE FUNCTION get_mapping_confidence(business_dataset_id UUID, physical_dataset_id UUID) RETURNS DECIMAL;
CREATE FUNCTION get_business_dataset_mappings(business_dataset_id UUID) RETURNS TABLE(...);
CREATE FUNCTION get_unmapped_business_datasets(workspace_id UUID) RETURNS TABLE(...);
CREATE FUNCTION expire_old_recommendations() RETURNS void;
```

---

### Phase BM.2: TypeScript Type Definitions (Week 1)

#### BM.2.1 Create Business Model Types ✓
- [ ] **BM.2.1.1** Create file: `frontend/src/types/business-model.ts`
- [ ] **BM.2.1.2** Define `BusinessContext` interface
- [ ] **BM.2.1.3** Define `BusinessRule` interface
- [ ] **BM.2.1.4** Define `KPI` interface
- [ ] **BM.2.1.5** Define `DataQualityRule` interface
- [ ] **BM.2.1.6** Extend `Dataset` interface with `is_conceptual` and `business_context`
- [ ] **BM.2.1.7** Export all types from index.ts
- [ ] **BM.2.1.8** Add JSDoc comments to all interfaces

**Files**:
- `frontend/src/types/business-model.ts`

**Type Definitions**:
```typescript
export interface BusinessContext {
  business_owner?: string;
  domain?: string;
  glossary_terms?: string[];
  business_rules?: BusinessRule[];
  kpis?: KPI[];
  data_quality_rules?: DataQualityRule[];
}

export interface BusinessRule {
  id: string;
  rule: string;
  expression: string;
  validation_status?: 'valid' | 'warning' | 'error';
}

export interface KPI {
  name: string;
  formula: string;
  target?: number;
  current_value?: number;
  unit?: string;
}

export interface DataQualityRule {
  column: string;
  rule: string;
  validation: string;
  severity?: 'critical' | 'warning' | 'info';
}
```

#### BM.2.2 Create Mapping Types ✓
- [ ] **BM.2.2.1** Create file: `frontend/src/types/business-mapping.ts`
- [ ] **BM.2.2.2** Define `BusinessPhysicalMapping` interface
- [ ] **BM.2.2.3** Define `ColumnMapping` interface
- [ ] **BM.2.2.4** Define `MappingStatus` type
- [ ] **BM.2.2.5** Define `MappingType` type
- [ ] **BM.2.2.6** Define `ColumnMappings` interface (JSONB structure)
- [ ] **BM.2.2.7** Export all types
- [ ] **BM.2.2.8** Add JSDoc comments

**Files**:
- `frontend/src/types/business-mapping.ts`

**Type Definitions**:
```typescript
export type MappingStatus = 'draft' | 'validated' | 'implemented' | 'deprecated';
export type MappingType = 'direct' | 'derived' | 'aggregated' | 'joined';

export interface ColumnMapping {
  business_column_id: string;
  business_column_name: string;
  physical_column_id?: string;
  physical_column_name?: string;
  transformation?: string;
  mapping_confidence: number;
  ai_rationale?: string;
}

export interface ColumnMappings {
  mappings: ColumnMapping[];
  unmapped_business_columns: Array<{
    business_column_id: string;
    business_column_name: string;
    reason: string;
    ai_suggestion?: string;
  }>;
  unused_physical_columns: Array<{
    physical_column_id: string;
    physical_column_name: string;
    reason: string;
  }>;
}

export interface BusinessPhysicalMapping {
  id: string;
  account_id: string;
  workspace_id: string;
  business_dataset_id: string;
  physical_dataset_id: string;
  mapping_confidence: number;
  mapping_status: MappingStatus;
  mapping_type: MappingType;
  ai_recommendation_score?: number;
  ai_rationale?: string;
  column_mappings: ColumnMappings;
  transformation_sql?: string;
  approved_by?: string;
  approved_at?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}
```

#### BM.2.3 Create AI Recommendation Types ✓
- [ ] **BM.2.3.1** Create file: `frontend/src/types/ai-recommendation.ts`
- [ ] **BM.2.3.2** Define `MatchFactors` interface
- [ ] **BM.2.3.3** Define `MappingRecommendation` interface
- [ ] **BM.2.3.4** Define `UserAction` type
- [ ] **BM.2.3.5** Define `RecommendationFilters` interface
- [ ] **BM.2.3.6** Export all types
- [ ] **BM.2.3.7** Add JSDoc comments

**Files**:
- `frontend/src/types/ai-recommendation.ts`

**Type Definitions**:
```typescript
export interface MatchFactors {
  semantic_similarity: {
    score: number;
    details: string;
  };
  structural_similarity: {
    score: number;
    details: string;
  };
  relationship_match: {
    score: number;
    details: string;
  };
  usage_patterns: {
    score: number;
    details: string;
  };
  domain_alignment: {
    score: number;
    details: string;
  };
  data_quality: {
    score: number;
    details: string;
  };
}

export type UserAction = 'accepted' | 'rejected' | 'modified' | 'pending';

export interface MappingRecommendation {
  id: string;
  account_id: string;
  workspace_id: string;
  business_dataset_id: string;
  recommended_physical_dataset_id: string;
  confidence_score: number;
  recommendation_rank: number;
  match_factors: MatchFactors;
  ai_explanation: string;
  user_action: UserAction;
  user_feedback?: string;
  conversation_id?: string;
  created_at: string;
  expires_at?: string;
}

export interface RecommendationFilters {
  min_confidence?: number;
  max_results?: number;
  user_action?: UserAction;
  exclude_expired?: boolean;
}
```

#### BM.2.4 Create Conversation Types ✓
- [ ] **BM.2.4.1** Create file: `frontend/src/types/business-conversation.ts`
- [ ] **BM.2.4.2** Define `ConversationType` type
- [ ] **BM.2.4.3** Define `ConversationStatus` type
- [ ] **BM.2.4.4** Define `MessageRole` type
- [ ] **BM.2.4.5** Define `Conversation` interface
- [ ] **BM.2.4.6** Define `Message` interface
- [ ] **BM.2.4.7** Define `ConversationFilters` interface
- [ ] **BM.2.4.8** Export all types
- [ ] **BM.2.4.9** Add JSDoc comments

**Files**:
- `frontend/src/types/business-conversation.ts`

**Type Definitions**:
```typescript
export type ConversationType = 'mapping' | 'validation' | 'transformation' | 'general';
export type ConversationStatus = 'active' | 'resolved' | 'archived';
export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  ai_model?: string;
  tokens_used?: number;
  recommendations?: string[]; // Array of recommendation IDs
  artifacts?: {
    type: 'sql' | 'mapping' | 'validation';
    content: any;
  }[];
  created_at: string;
}

export interface Conversation {
  id: string;
  account_id: string;
  workspace_id: string;
  business_dataset_id?: string;
  title: string;
  conversation_type: ConversationType;
  status: ConversationStatus;
  user_id: string;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
}

export interface ConversationFilters {
  business_dataset_id?: string;
  conversation_type?: ConversationType;
  status?: ConversationStatus;
  user_id?: string;
}
```

---

### Phase BM.3: Service Layer Implementation (Week 2)

#### BM.3.1 Create Business Model Service ✓
- [ ] **BM.3.1.1** Create file: `frontend/src/lib/business-model-service.ts`
- [ ] **BM.3.1.2** Implement `createConceptualDataset()` function
- [ ] **BM.3.1.3** Implement `updateConceptualDataset()` function
- [ ] **BM.3.1.4** Implement `deleteConceptualDataset()` function
- [ ] **BM.3.1.5** Implement `getConceptualDatasets()` function with filters
- [ ] **BM.3.1.6** Implement `updateBusinessContext()` function
- [ ] **BM.3.1.7** Implement `addBusinessRule()` function
- [ ] **BM.3.1.8** Implement `updateBusinessRule()` function
- [ ] **BM.3.1.9** Implement `deleteBusinessRule()` function
- [ ] **BM.3.1.10** Implement `addKPI()` function
- [ ] **BM.3.1.11** Implement `updateKPI()` function
- [ ] **BM.3.1.12** Implement `deleteKPI()` function
- [ ] **BM.3.1.13** Add error handling for all functions
- [ ] **BM.3.1.14** Add JSDoc comments
- [ ] **BM.3.1.15** Write unit tests for all functions

**Files**:
- `frontend/src/lib/business-model-service.ts`
- `frontend/src/lib/__tests__/business-model-service.test.ts`

**Key Functions**:
```typescript
export const businessModelService = {
  createConceptualDataset,
  updateConceptualDataset,
  deleteConceptualDataset,
  getConceptualDatasets,
  updateBusinessContext,
  addBusinessRule,
  updateBusinessRule,
  deleteBusinessRule,
  addKPI,
  updateKPI,
  deleteKPI
};
```

#### BM.3.2 Create Mapping Service ✓
- [ ] **BM.3.2.1** Create file: `frontend/src/lib/business-mapping-service.ts`
- [ ] **BM.3.2.2** Implement `createMapping()` function
- [ ] **BM.3.2.3** Implement `updateMapping()` function
- [ ] **BM.3.2.4** Implement `deleteMapping()` function
- [ ] **BM.3.2.5** Implement `getMapping()` function
- [ ] **BM.3.2.6** Implement `getMappingsForBusinessDataset()` function
- [ ] **BM.3.2.7** Implement `getMappingsForPhysicalDataset()` function
- [ ] **BM.3.2.8** Implement `validateMapping()` function
- [ ] **BM.3.2.9** Implement `approveMapping()` function
- [ ] **BM.3.2.10** Implement `updateMappingStatus()` function
- [ ] **BM.3.2.11** Implement `generateColumnMappings()` function
- [ ] **BM.3.2.12** Implement `calculateMappingConfidence()` helper
- [ ] **BM.3.2.13** Add error handling
- [ ] **BM.3.2.14** Add JSDoc comments
- [ ] **BM.3.2.15** Write unit tests

**Files**:
- `frontend/src/lib/business-mapping-service.ts`
- `frontend/src/lib/__tests__/business-mapping-service.test.ts`

**Key Functions**:
```typescript
export const mappingService = {
  createMapping,
  updateMapping,
  deleteMapping,
  getMapping,
  getMappingsForBusinessDataset,
  getMappingsForPhysicalDataset,
  validateMapping,
  approveMapping,
  updateMappingStatus,
  generateColumnMappings,
  calculateMappingConfidence
};
```

#### BM.3.3 Create AI Recommendation Service ✓
- [ ] **BM.3.3.1** Create file: `frontend/src/lib/ai-recommendation-service.ts`
- [ ] **BM.3.3.2** Implement `requestRecommendations()` function
- [ ] **BM.3.3.3** Implement `getRecommendations()` function with filters
- [ ] **BM.3.3.4** Implement `acceptRecommendation()` function
- [ ] **BM.3.3.5** Implement `rejectRecommendation()` function
- [ ] **BM.3.3.6** Implement `provideRecommendationFeedback()` function
- [ ] **BM.3.3.7** Implement `refreshRecommendations()` function
- [ ] **BM.3.3.8** Implement `getRecommendationDetails()` function
- [ ] **BM.3.3.9** Add error handling
- [ ] **BM.3.3.10** Add JSDoc comments
- [ ] **BM.3.3.11** Write unit tests

**Files**:
- `frontend/src/lib/ai-recommendation-service.ts`
- `frontend/src/lib/__tests__/ai-recommendation-service.test.ts`

**Key Functions**:
```typescript
export const recommendationService = {
  requestRecommendations,
  getRecommendations,
  acceptRecommendation,
  rejectRecommendation,
  provideRecommendationFeedback,
  refreshRecommendations,
  getRecommendationDetails
};
```

#### BM.3.4 Create Conversation Service ✓
- [ ] **BM.3.4.1** Create file: `frontend/src/lib/business-conversation-service.ts`
- [ ] **BM.3.4.2** Implement `startConversation()` function
- [ ] **BM.3.4.3** Implement `sendMessage()` function
- [ ] **BM.3.4.4** Implement `getConversation()` function
- [ ] **BM.3.4.5** Implement `getConversations()` function with filters
- [ ] **BM.3.4.6** Implement `getMessages()` function
- [ ] **BM.3.4.7** Implement `updateConversationStatus()` function
- [ ] **BM.3.4.8** Implement `archiveConversation()` function
- [ ] **BM.3.4.9** Implement `deleteConversation()` function
- [ ] **BM.3.4.10** Add error handling
- [ ] **BM.3.4.11** Add JSDoc comments
- [ ] **BM.3.4.12** Write unit tests

**Files**:
- `frontend/src/lib/business-conversation-service.ts`
- `frontend/src/lib/__tests__/business-conversation-service.test.ts`

**Key Functions**:
```typescript
export const conversationService = {
  startConversation,
  sendMessage,
  getConversation,
  getConversations,
  getMessages,
  updateConversationStatus,
  archiveConversation,
  deleteConversation
};
```

#### BM.3.5 Create Implementation Service ✓
- [ ] **BM.3.5.1** Create file: `frontend/src/lib/business-implementation-service.ts`
- [ ] **BM.3.5.2** Implement `implementPhysicalDataset()` function
- [ ] **BM.3.5.3** Implement `generateTransformationSQL()` function
- [ ] **BM.3.5.4** Implement `createLineageFromMapping()` function
- [ ] **BM.3.5.5** Implement `addSCDColumns()` helper
- [ ] **BM.3.5.6** Implement `validateImplementation()` function
- [ ] **BM.3.5.7** Implement `previewImplementation()` function
- [ ] **BM.3.5.8** Add error handling
- [ ] **BM.3.5.9** Add JSDoc comments
- [ ] **BM.3.5.10** Write unit tests

**Files**:
- `frontend/src/lib/business-implementation-service.ts`
- `frontend/src/lib/__tests__/business-implementation-service.test.ts`

**Key Functions**:
```typescript
export const implementationService = {
  implementPhysicalDataset,
  generateTransformationSQL,
  createLineageFromMapping,
  addSCDColumns,
  validateImplementation,
  previewImplementation
};
```

---

### Phase BM.4: Backend API Implementation (Week 2-3)

#### BM.4.1 Create Business Model API Routes ✓
- [ ] **BM.4.1.1** Create file: `backend/src/routes/business-models.ts`
- [ ] **BM.4.1.2** Implement `POST /api/business-models` (create conceptual dataset)
- [ ] **BM.4.1.3** Implement `GET /api/business-models/:id` (get single)
- [ ] **BM.4.1.4** Implement `GET /api/business-models` (list with filters)
- [ ] **BM.4.1.5** Implement `PUT /api/business-models/:id` (update)
- [ ] **BM.4.1.6** Implement `DELETE /api/business-models/:id` (delete)
- [ ] **BM.4.1.7** Implement `PATCH /api/business-models/:id/business-context` (update context)
- [ ] **BM.4.1.8** Add authentication middleware
- [ ] **BM.4.1.9** Add authorization checks (owner/admin only)
- [ ] **BM.4.1.10** Add request validation
- [ ] **BM.4.1.11** Add error handling
- [ ] **BM.4.1.12** Write API tests

**Files**:
- `backend/src/routes/business-models.ts`
- `backend/src/__tests__/routes/business-models.test.ts`

#### BM.4.2 Create Mapping API Routes ✓
- [ ] **BM.4.2.1** Create file: `backend/src/routes/business-mappings.ts`
- [ ] **BM.4.2.2** Implement `POST /api/business-mappings` (create mapping)
- [ ] **BM.4.2.3** Implement `GET /api/business-mappings/:id` (get single)
- [ ] **BM.4.2.4** Implement `GET /api/business-mappings` (list with filters)
- [ ] **BM.4.2.5** Implement `PUT /api/business-mappings/:id` (update)
- [ ] **BM.4.2.6** Implement `DELETE /api/business-mappings/:id` (delete)
- [ ] **BM.4.2.7** Implement `POST /api/business-mappings/:id/validate` (validate mapping)
- [ ] **BM.4.2.8** Implement `POST /api/business-mappings/:id/approve` (approve)
- [ ] **BM.4.2.9** Add authentication and authorization
- [ ] **BM.4.2.10** Add request validation
- [ ] **BM.4.2.11** Write API tests

**Files**:
- `backend/src/routes/business-mappings.ts`
- `backend/src/__tests__/routes/business-mappings.test.ts`

#### BM.4.3 Create AI Recommendation API Routes ✓
- [ ] **BM.4.3.1** Create file: `backend/src/routes/ai-recommendations.ts`
- [ ] **BM.4.3.2** Implement `POST /api/ai-recommendations/request` (request new recommendations)
- [ ] **BM.4.3.3** Implement `GET /api/ai-recommendations` (list with filters)
- [ ] **BM.4.3.4** Implement `GET /api/ai-recommendations/:id` (get single)
- [ ] **BM.4.3.5** Implement `POST /api/ai-recommendations/:id/accept` (accept)
- [ ] **BM.4.3.6** Implement `POST /api/ai-recommendations/:id/reject` (reject)
- [ ] **BM.4.3.7** Implement `POST /api/ai-recommendations/:id/feedback` (provide feedback)
- [ ] **BM.4.3.8** Add authentication and authorization
- [ ] **BM.4.3.9** Add rate limiting (AI operations are expensive)
- [ ] **BM.4.3.10** Write API tests

**Files**:
- `backend/src/routes/ai-recommendations.ts`
- `backend/src/__tests__/routes/ai-recommendations.test.ts`

#### BM.4.4 Create Conversation API Routes ✓
- [ ] **BM.4.4.1** Create file: `backend/src/routes/business-conversations.ts`
- [ ] **BM.4.4.2** Implement `POST /api/business-conversations` (start conversation)
- [ ] **BM.4.4.3** Implement `GET /api/business-conversations/:id` (get conversation)
- [ ] **BM.4.4.4** Implement `GET /api/business-conversations` (list with filters)
- [ ] **BM.4.4.5** Implement `POST /api/business-conversations/:id/messages` (send message)
- [ ] **BM.4.4.6** Implement `GET /api/business-conversations/:id/messages` (get messages)
- [ ] **BM.4.4.7** Implement `PATCH /api/business-conversations/:id/status` (update status)
- [ ] **BM.4.4.8** Implement `DELETE /api/business-conversations/:id` (delete)
- [ ] **BM.4.4.9** Add WebSocket support for real-time messaging
- [ ] **BM.4.4.10** Add streaming response for AI messages
- [ ] **BM.4.4.11** Write API tests

**Files**:
- `backend/src/routes/business-conversations.ts`
- `backend/src/__tests__/routes/business-conversations.test.ts`

#### BM.4.5 Create Implementation API Routes ✓
- [ ] **BM.4.5.1** Create file: `backend/src/routes/business-implementation.ts`
- [ ] **BM.4.5.2** Implement `POST /api/business-implementation/implement` (implement physical dataset)
- [ ] **BM.4.5.3** Implement `POST /api/business-implementation/preview` (preview implementation)
- [ ] **BM.4.5.4** Implement `POST /api/business-implementation/validate` (validate implementation)
- [ ] **BM.4.5.5** Implement `POST /api/business-implementation/generate-sql` (generate SQL)
- [ ] **BM.4.5.6** Add authentication and authorization
- [ ] **BM.4.5.7** Add request validation
- [ ] **BM.4.5.8** Write API tests

**Files**:
- `backend/src/routes/business-implementation.ts`
- `backend/src/__tests__/routes/business-implementation.test.ts`

---

### Phase BM.5: AI Integration (Week 3-4)

#### BM.5.1 Create MCP Server - Business Model Analyzer ✓
- [ ] **BM.5.1.1** Create directory: `backend/mcp-servers/business-model-analyzer`
- [ ] **BM.5.1.2** Initialize MCP server with `@modelcontextprotocol/sdk`
- [ ] **BM.5.1.3** Implement tool: `analyze_business_dataset`
- [ ] **BM.5.1.4** Implement tool: `find_similar_physical_datasets`
- [ ] **BM.5.1.5** Implement tool: `generate_column_mappings`
- [ ] **BM.5.1.6** Implement tool: `suggest_transformations`
- [ ] **BM.5.1.7** Implement tool: `validate_business_mapping`
- [ ] **BM.5.1.8** Implement tool: `create_physical_from_business`
- [ ] **BM.5.1.9** Add comprehensive error handling
- [ ] **BM.5.1.10** Add logging
- [ ] **BM.5.1.11** Write unit tests for each tool
- [ ] **BM.5.1.12** Write integration tests with Claude

**Files**:
- `backend/mcp-servers/business-model-analyzer/src/index.ts`
- `backend/mcp-servers/business-model-analyzer/src/tools/*.ts`
- `backend/mcp-servers/business-model-analyzer/package.json`
- `backend/mcp-servers/business-model-analyzer/tsconfig.json`

#### BM.5.2 Implement Semantic Similarity Analysis ✓
- [ ] **BM.5.2.1** Create file: `backend/src/ai/semantic-similarity.ts`
- [ ] **BM.5.2.2** Implement `generateEmbedding()` function (using OpenAI/Anthropic)
- [ ] **BM.5.2.3** Implement `cosineSimilarity()` function
- [ ] **BM.5.2.4** Implement `calculateSemanticSimilarity()` function
- [ ] **BM.5.2.5** Implement caching for embeddings (avoid regenerating)
- [ ] **BM.5.2.6** Add batch processing for multiple datasets
- [ ] **BM.5.2.7** Add error handling
- [ ] **BM.5.2.8** Write unit tests

**Files**:
- `backend/src/ai/semantic-similarity.ts`
- `backend/src/ai/__tests__/semantic-similarity.test.ts`

#### BM.5.3 Implement Structural Similarity Analysis ✓
- [ ] **BM.5.3.1** Create file: `backend/src/ai/structural-similarity.ts`
- [ ] **BM.5.3.2** Implement `calculateStructuralSimilarity()` function
- [ ] **BM.5.3.3** Implement `findBestColumnMatch()` function
- [ ] **BM.5.3.4** Implement `stringSimilarity()` helper (Levenshtein or similar)
- [ ] **BM.5.3.5** Implement `areDataTypesCompatible()` helper
- [ ] **BM.5.3.6** Add scoring logic (weighted)
- [ ] **BM.5.3.7** Add error handling
- [ ] **BM.5.3.8** Write unit tests

**Files**:
- `backend/src/ai/structural-similarity.ts`
- `backend/src/ai/__tests__/structural-similarity.test.ts`

#### BM.5.4 Implement Relationship Analysis ✓
- [ ] **BM.5.4.1** Create file: `backend/src/ai/relationship-analysis.ts`
- [ ] **BM.5.4.2** Implement `analyzeRelationshipMatch()` function
- [ ] **BM.5.4.3** Implement `areRelationshipsSimilar()` helper
- [ ] **BM.5.4.4** Implement `getDatasetRelationships()` helper
- [ ] **BM.5.4.5** Add scoring logic
- [ ] **BM.5.4.6** Add error handling
- [ ] **BM.5.4.7** Write unit tests

**Files**:
- `backend/src/ai/relationship-analysis.ts`
- `backend/src/ai/__tests__/relationship-analysis.test.ts`

#### BM.5.5 Implement Overall Confidence Scoring ✓
- [ ] **BM.5.5.1** Create file: `backend/src/ai/confidence-scoring.ts`
- [ ] **BM.5.5.2** Implement `calculateOverallConfidence()` function
- [ ] **BM.5.5.3** Define scoring weights (configurable)
- [ ] **BM.5.5.4** Implement `calculateUsageScore()` helper
- [ ] **BM.5.5.5** Implement `calculateDomainAlignment()` helper
- [ ] **BM.5.5.6** Implement `calculateDataQualityScore()` helper
- [ ] **BM.5.5.7** Add explanation generation
- [ ] **BM.5.5.8** Write unit tests

**Files**:
- `backend/src/ai/confidence-scoring.ts`
- `backend/src/ai/__tests__/confidence-scoring.test.ts`

#### BM.5.6 Implement AI Conversation Handler ✓
- [ ] **BM.5.6.1** Create file: `backend/src/ai/conversation-handler.ts`
- [ ] **BM.5.6.2** Implement `handleChat()` function with streaming
- [ ] **BM.5.6.3** Implement `buildSystemPrompt()` function
- [ ] **BM.5.6.4** Implement `buildWorkspaceContext()` function
- [ ] **BM.5.6.5** Implement tool execution middleware
- [ ] **BM.5.6.6** Implement conversation history management
- [ ] **BM.5.6.7** Add error recovery
- [ ] **BM.5.6.8** Add rate limiting
- [ ] **BM.5.6.9** Write integration tests

**Files**:
- `backend/src/ai/conversation-handler.ts`
- `backend/src/ai/__tests__/conversation-handler.test.ts`

---

### Phase BM.6: UI Components - Business Model Canvas (Week 4-5)

#### BM.6.1 Enhanced Dataset Node Component ✓
- [ ] **BM.6.1.1** Update file: `frontend/src/components/Canvas/DatasetNode.tsx`
- [ ] **BM.6.1.2** Add visual indicator for conceptual datasets (yellow border)
- [ ] **BM.6.1.3** Add badge showing "Conceptual" or "Physical"
- [ ] **BM.6.1.4** Add confidence score badge for mapped conceptual datasets
- [ ] **BM.6.1.5** Add mapping status indicator (dotted line = proposed, solid = implemented)
- [ ] **BM.6.1.6** Update context menu to include business model actions
- [ ] **BM.6.1.7** Add hover tooltip showing business context summary
- [ ] **BM.6.1.8** Update styling for better visual distinction
- [ ] **BM.6.1.9** Write component tests

**Files**:
- `frontend/src/components/Canvas/DatasetNode.tsx`
- `frontend/src/components/Canvas/__tests__/DatasetNode.test.tsx`

#### BM.6.2 Business Model Canvas Toggle ✓
- [ ] **BM.6.2.1** Update file: `frontend/src/components/Canvas/ProjectCanvas.tsx`
- [ ] **BM.6.2.2** Add toggle switch: "Show All" / "Business Models Only" / "Physical Only"
- [ ] **BM.6.2.3** Implement filtering logic based on is_conceptual flag
- [ ] **BM.6.2.4** Add filter to toolbar
- [ ] **BM.6.2.5** Persist filter state in localStorage
- [ ] **BM.6.2.6** Add keyboard shortcut (e.g., 'B' for business toggle)
- [ ] **BM.6.2.7** Write component tests

**Files**:
- `frontend/src/components/Canvas/ProjectCanvas.tsx`

#### BM.6.3 Create Business Dataset Dialog ✓
- [ ] **BM.6.3.1** Create file: `frontend/src/components/BusinessModel/CreateBusinessDatasetDialog.tsx`
- [ ] **BM.6.3.2** Build form with fields: name, description, entity_type, entity_subtype
- [ ] **BM.6.3.3** Add business context section (owner, domain, glossary terms)
- [ ] **BM.6.3.4** Add quick column creation (inline table)
- [ ] **BM.6.3.5** Add validation (required fields)
- [ ] **BM.6.3.6** Implement save functionality
- [ ] **BM.6.3.7** Add success/error notifications
- [ ] **BM.6.3.8** Add loading states
- [ ] **BM.6.3.9** Write component tests

**Files**:
- `frontend/src/components/BusinessModel/CreateBusinessDatasetDialog.tsx`
- `frontend/src/components/BusinessModel/__tests__/CreateBusinessDatasetDialog.test.tsx`

#### BM.6.4 Business Dataset Editor - Business Context Tab ✓
- [ ] **BM.6.4.1** Create file: `frontend/src/components/BusinessModel/BusinessContextTab.tsx`
- [ ] **BM.6.4.2** Build business owner input field
- [ ] **BM.6.4.3** Build domain input field
- [ ] **BM.6.4.4** Build glossary terms tag input
- [ ] **BM.6.4.5** Build business rules section (add/edit/delete)
- [ ] **BM.6.4.6** Create Business Rule editor dialog
- [ ] **BM.6.4.7** Build KPIs section (add/edit/delete)
- [ ] **BM.6.4.8** Create KPI editor dialog
- [ ] **BM.6.4.9** Build data quality rules section
- [ ] **BM.6.4.10** Add save functionality
- [ ] **BM.6.4.11** Add validation
- [ ] **BM.6.4.12** Write component tests

**Files**:
- `frontend/src/components/BusinessModel/BusinessContextTab.tsx`
- `frontend/src/components/BusinessModel/BusinessRuleDialog.tsx`
- `frontend/src/components/BusinessModel/KPIDialog.tsx`
- `frontend/src/components/BusinessModel/__tests__/BusinessContextTab.test.tsx`

#### BM.6.5 Business Dataset Editor - Physical Mappings Tab ✓
- [ ] **BM.6.5.1** Create file: `frontend/src/components/BusinessModel/PhysicalMappingsTab.tsx`
- [ ] **BM.6.5.2** Display list of current mappings (cards)
- [ ] **BM.6.5.3** Show mapping status (validated, draft, implemented)
- [ ] **BM.6.5.4** Show mapping confidence score
- [ ] **BM.6.5.5** Show column-level mappings summary
- [ ] **BM.6.5.6** Add "View Details" button (opens mapping detail modal)
- [ ] **BM.6.5.7** Add "Edit Mapping" button
- [ ] **BM.6.5.8** Add "Implement" button (for validated mappings)
- [ ] **BM.6.5.9** Add "Delete" button with confirmation
- [ ] **BM.6.5.10** Add "Add Mapping Manually" button
- [ ] **BM.6.5.11** Add "Get AI Recommendations" button
- [ ] **BM.6.5.12** Write component tests

**Files**:
- `frontend/src/components/BusinessModel/PhysicalMappingsTab.tsx`
- `frontend/src/components/BusinessModel/MappingCard.tsx`
- `frontend/src/components/BusinessModel/__tests__/PhysicalMappingsTab.test.tsx`

#### BM.6.6 Business Dataset Editor - AI Recommendations Tab ✓
- [ ] **BM.6.6.1** Create file: `frontend/src/components/BusinessModel/AIRecommendationsTab.tsx`
- [ ] **BM.6.6.2** Display top recommendations in ranked order
- [ ] **BM.6.6.3** Show confidence score prominently
- [ ] **BM.6.6.4** Show match factors breakdown (semantic, structural, etc.)
- [ ] **BM.6.6.5** Display AI explanation text
- [ ] **BM.6.6.6** Add "Accept" button (creates mapping)
- [ ] **BM.6.6.7** Add "View Details" button (opens recommendation detail modal)
- [ ] **BM.6.6.8** Add "Reject" button with optional feedback
- [ ] **BM.6.6.9** Add "Start Conversation" button (opens chat)
- [ ] **BM.6.6.10** Add "Refresh Recommendations" button
- [ ] **BM.6.6.11** Add empty state (no recommendations)
- [ ] **BM.6.6.12** Add loading state
- [ ] **BM.6.6.13** Write component tests

**Files**:
- `frontend/src/components/BusinessModel/AIRecommendationsTab.tsx`
- `frontend/src/components/BusinessModel/RecommendationCard.tsx`
- `frontend/src/components/BusinessModel/__tests__/AIRecommendationsTab.test.tsx`

#### BM.6.7 Business Dataset Editor - Conversations Tab ✓
- [ ] **BM.6.7.1** Create file: `frontend/src/components/BusinessModel/ConversationsTab.tsx`
- [ ] **BM.6.7.2** Display list of conversations (active first)
- [ ] **BM.6.7.3** Show conversation title, status, and message count
- [ ] **BM.6.7.4** Show last message timestamp
- [ ] **BM.6.7.5** Add "Continue" button for active conversations
- [ ] **BM.6.7.6** Add "View" button for resolved conversations
- [ ] **BM.6.7.7** Add "Archive" button
- [ ] **BM.6.7.8** Add "Start New Conversation" button
- [ ] **BM.6.7.9** Add empty state (no conversations)
- [ ] **BM.6.7.10** Write component tests

**Files**:
- `frontend/src/components/BusinessModel/ConversationsTab.tsx`
- `frontend/src/components/BusinessModel/ConversationCard.tsx`
- `frontend/src/components/BusinessModel/__tests__/ConversationsTab.test.tsx`

---

### Phase BM.7: AI Chat Interface (Week 5)

#### BM.7.1 Business Model Chat Component ✓
- [ ] **BM.7.1.1** Create file: `frontend/src/components/BusinessModel/BusinessModelChat.tsx`
- [ ] **BM.7.1.2** Build chat interface layout (header, messages, input)
- [ ] **BM.7.1.3** Display context banner showing current business dataset
- [ ] **BM.7.1.4** Implement message list with auto-scroll
- [ ] **BM.7.1.5** Style user messages (right-aligned, blue)
- [ ] **BM.7.1.6** Style AI messages (left-aligned, gray)
- [ ] **BM.7.1.7** Add typing indicator for AI responses
- [ ] **BM.7.7.8** Implement streaming message updates
- [ ] **BM.7.1.9** Add timestamp to messages
- [ ] **BM.7.1.10** Build message input field with send button
- [ ] **BM.7.1.11** Add keyboard shortcut (Enter to send, Shift+Enter for new line)
- [ ] **BM.7.1.12** Write component tests

**Files**:
- `frontend/src/components/BusinessModel/BusinessModelChat.tsx`
- `frontend/src/components/BusinessModel/__tests__/BusinessModelChat.test.tsx`

#### BM.7.2 AI Recommendation Display in Chat ✓
- [ ] **BM.7.2.1** Create file: `frontend/src/components/BusinessModel/ChatRecommendationCard.tsx`
- [ ] **BM.7.2.2** Display recommended dataset information
- [ ] **BM.7.2.3** Show confidence score and match factors
- [ ] **BM.7.2.4** Display AI explanation
- [ ] **BM.7.2.5** Add action buttons (Accept, Compare, Reject)
- [ ] **BM.7.2.6** Add expand/collapse functionality for multiple recommendations
- [ ] **BM.7.2.7** Implement "Accept" action (creates mapping, updates chat)
- [ ] **BM.7.2.8** Write component tests

**Files**:
- `frontend/src/components/BusinessModel/ChatRecommendationCard.tsx`
- `frontend/src/components/BusinessModel/__tests__/ChatRecommendationCard.test.tsx`

#### BM.7.3 Column Mapping Display in Chat ✓
- [ ] **BM.7.3.1** Create file: `frontend/src/components/BusinessModel/ChatColumnMappings.tsx`
- [ ] **BM.7.3.2** Display direct mappings list
- [ ] **BM.7.3.3** Display derived mappings list with transformation preview
- [ ] **BM.7.3.4** Display missing columns list with suggestions
- [ ] **BM.7.3.5** Add expand/collapse for each section
- [ ] **BM.7.3.6** Add "Edit Mappings" button (opens mapping editor)
- [ ] **BM.7.3.7** Add "Create Dimension" or "Create Physical Dataset" button
- [ ] **BM.7.3.8** Write component tests

**Files**:
- `frontend/src/components/BusinessModel/ChatColumnMappings.tsx`
- `frontend/src/components/BusinessModel/__tests__/ChatColumnMappings.test.tsx`

#### BM.7.4 Conversation Streaming Handler ✓
- [ ] **BM.7.4.1** Create file: `frontend/src/hooks/useBusinessConversation.ts`
- [ ] **BM.7.4.2** Implement WebSocket connection for real-time messaging
- [ ] **BM.7.4.3** Handle SSE (Server-Sent Events) for streaming AI responses
- [ ] **BM.7.4.4** Implement message buffering and display
- [ ] **BM.7.4.5** Handle tool call events (when AI uses MCP tools)
- [ ] **BM.7.4.6** Handle recommendation events (when AI returns recommendations)
- [ ] **BM.7.4.7** Handle error events
- [ ] **BM.7.4.8** Implement reconnection logic
- [ ] **BM.7.4.9** Add cleanup on component unmount
- [ ] **BM.7.4.10** Write hook tests

**Files**:
- `frontend/src/hooks/useBusinessConversation.ts`
- `frontend/src/hooks/__tests__/useBusinessConversation.test.ts`

---

### Phase BM.8: Mapping Validation & Implementation UI (Week 6)

#### BM.8.1 Mapping Validation Dialog ✓
- [ ] **BM.8.1.1** Create file: `frontend/src/components/BusinessModel/MappingValidationDialog.tsx`
- [ ] **BM.8.1.2** Display mapping summary (business → physical dataset names)
- [ ] **BM.8.1.3** Build column-level validation table
- [ ] **BM.8.1.4** Show validation status per column (✅ Valid, ⚠️ Warning, ❌ Error)
- [ ] **BM.8.1.5** Display confidence score per column
- [ ] **BM.8.1.6** Show data type compatibility check
- [ ] **BM.8.1.7** Show nullability compatibility check
- [ ] **BM.8.1.8** Display transformation requirements
- [ ] **BM.8.1.9** Add "View SQL" button for transformations
- [ ] **BM.8.1.10** Add "Edit" button for individual columns
- [ ] **BM.8.1.11** Build data quality checks section
- [ ] **BM.8.1.12** Display overall validation score
- [ ] **BM.8.1.13** Add "Mark as Validated" button
- [ ] **BM.8.1.14** Add "Fix Issues" button (highlights problems)
- [ ] **BM.8.1.15** Write component tests

**Files**:
- `frontend/src/components/BusinessModel/MappingValidationDialog.tsx`
- `frontend/src/components/BusinessModel/__tests__/MappingValidationDialog.test.tsx`

#### BM.8.2 Implementation Wizard ✓
- [ ] **BM.8.2.1** Create file: `frontend/src/components/BusinessModel/ImplementationWizard.tsx`
- [ ] **BM.8.2.2** Build multi-step wizard component
- [ ] **BM.8.2.3** Step 1: Review Configuration
  - Target dataset name input
  - Medallion layer dropdown
  - Entity subtype dropdown
  - SCD type selector (if dimension)
  - Materialization type selector
- [ ] **BM.8.2.4** Step 2: Column Mappings Review
  - Display mapped columns count (✅)
  - Display columns requiring transformation (⚠️)
  - Display missing columns (❌)
  - Add "Review Mappings" button
- [ ] **BM.8.2.5** Step 3: Transformation SQL Preview
  - Display generated SQL with syntax highlighting
  - Add "Copy SQL" button
  - Add "Edit SQL" button (advanced users)
  - Add "Preview Results" button (sample data)
- [ ] **BM.8.2.6** Step 4: Lineage Creation
  - Display message about automatic lineage creation
  - Show visual preview of lineage (optional)
- [ ] **BM.8.2.7** Add navigation buttons (Back, Next, Cancel)
- [ ] **BM.8.2.8** Add final "Create Physical Dataset" button
- [ ] **BM.8.2.9** Implement progress indicator
- [ ] **BM.8.2.10** Add loading states
- [ ] **BM.8.2.11** Add success confirmation
- [ ] **BM.8.2.12** Write component tests

**Files**:
- `frontend/src/components/BusinessModel/ImplementationWizard.tsx`
- `frontend/src/components/BusinessModel/__tests__/ImplementationWizard.test.tsx`

#### BM.8.3 SQL Transformation Editor ✓
- [ ] **BM.8.3.1** Create file: `frontend/src/components/BusinessModel/SQLTransformationEditor.tsx`
- [ ] **BM.8.3.2** Integrate Monaco Editor for SQL editing
- [ ] **BM.8.3.3** Add SQL syntax highlighting
- [ ] **BM.8.3.4** Add auto-completion for table/column names
- [ ] **BM.8.3.5** Add SQL validation (syntax check)
- [ ] **BM.8.3.6** Add "Format SQL" button
- [ ] **BM.8.3.7** Add "Preview Results" button (runs query against sample data)
- [ ] **BM.8.3.8** Add "Save" and "Cancel" buttons
- [ ] **BM.8.3.9** Write component tests

**Files**:
- `frontend/src/components/BusinessModel/SQLTransformationEditor.tsx`
- `frontend/src/components/BusinessModel/__tests__/SQLTransformationEditor.test.tsx`

---

### Phase BM.9: React Query Hooks & State Management (Week 6)

#### BM.9.1 Business Model Hooks ✓
- [ ] **BM.9.1.1** Create file: `frontend/src/hooks/useBusinessModels.ts`
- [ ] **BM.9.1.2** Implement `useBusinessModels()` hook (list with filters)
- [ ] **BM.9.1.3** Implement `useBusinessModel()` hook (single dataset)
- [ ] **BM.9.1.4** Implement `useCreateBusinessModel()` mutation
- [ ] **BM.9.1.5** Implement `useUpdateBusinessModel()` mutation
- [ ] **BM.9.1.6** Implement `useDeleteBusinessModel()` mutation
- [ ] **BM.9.1.7** Implement `useUpdateBusinessContext()` mutation
- [ ] **BM.9.1.8** Add optimistic updates
- [ ] **BM.9.1.9** Add cache invalidation
- [ ] **BM.9.1.10** Write hook tests

**Files**:
- `frontend/src/hooks/useBusinessModels.ts`
- `frontend/src/hooks/__tests__/useBusinessModels.test.ts`

#### BM.9.2 Mapping Hooks ✓
- [ ] **BM.9.2.1** Create file: `frontend/src/hooks/useBusinessMappings.ts`
- [ ] **BM.9.2.2** Implement `useBusinessMappings()` hook (list with filters)
- [ ] **BM.9.2.3** Implement `useBusinessMapping()` hook (single mapping)
- [ ] **BM.9.2.4** Implement `useCreateMapping()` mutation
- [ ] **BM.9.2.5** Implement `useUpdateMapping()` mutation
- [ ] **BM.9.2.6** Implement `useDeleteMapping()` mutation
- [ ] **BM.9.2.7** Implement `useValidateMapping()` mutation
- [ ] **BM.9.2.8** Implement `useApproveMapping()` mutation
- [ ] **BM.9.2.9** Add optimistic updates
- [ ] **BM.9.2.10** Write hook tests

**Files**:
- `frontend/src/hooks/useBusinessMappings.ts`
- `frontend/src/hooks/__tests__/useBusinessMappings.test.ts`

#### BM.9.3 Recommendation Hooks ✓
- [ ] **BM.9.3.1** Create file: `frontend/src/hooks/useAIRecommendations.ts`
- [ ] **BM.9.3.2** Implement `useAIRecommendations()` hook (list with filters)
- [ ] **BM.9.3.3** Implement `useRequestRecommendations()` mutation
- [ ] **BM.9.3.4** Implement `useAcceptRecommendation()` mutation
- [ ] **BM.9.3.5** Implement `useRejectRecommendation()` mutation
- [ ] **BM.9.3.6** Implement `useProvideFeedback()` mutation
- [ ] **BM.9.3.7** Add cache management
- [ ] **BM.9.3.8** Write hook tests

**Files**:
- `frontend/src/hooks/useAIRecommendations.ts`
- `frontend/src/hooks/__tests__/useAIRecommendations.test.ts`

#### BM.9.4 Implementation Hooks ✓
- [ ] **BM.9.4.1** Create file: `frontend/src/hooks/useBusinessImplementation.ts`
- [ ] **BM.9.4.2** Implement `useImplementPhysicalDataset()` mutation
- [ ] **BM.9.4.3** Implement `usePreviewImplementation()` query
- [ ] **BM.9.4.4** Implement `useValidateImplementation()` mutation
- [ ] **BM.9.4.5** Implement `useGenerateSQL()` mutation
- [ ] **BM.9.4.6** Add progress tracking
- [ ] **BM.9.4.7** Write hook tests

**Files**:
- `frontend/src/hooks/useBusinessImplementation.ts`
- `frontend/src/hooks/__tests__/useBusinessImplementation.test.ts`

---

### Phase BM.10: Testing & Integration (Week 7)

#### BM.10.1 Unit Testing ✓
- [ ] **BM.10.1.1** Write tests for all service functions
- [ ] **BM.10.1.2** Write tests for all AI analysis functions
- [ ] **BM.10.1.3** Write tests for all React components
- [ ] **BM.10.1.4** Write tests for all React hooks
- [ ] **BM.10.1.5** Achieve >80% code coverage
- [ ] **BM.10.1.6** Fix any failing tests

#### BM.10.2 Integration Testing ✓
- [ ] **BM.10.2.1** Test full workflow: Create business model → Request recommendations → Accept → Implement
- [ ] **BM.10.2.2** Test AI conversation flow with multiple turns
- [ ] **BM.10.2.3** Test mapping validation with various scenarios
- [ ] **BM.10.2.4** Test implementation with different SCD types
- [ ] **BM.10.2.5** Test error scenarios and recovery
- [ ] **BM.10.2.6** Test with concurrent users (race conditions)

#### BM.10.3 E2E Testing ✓
- [ ] **BM.10.3.1** Write Cypress/Playwright test for creating business model
- [ ] **BM.10.3.2** Write test for requesting and viewing AI recommendations
- [ ] **BM.10.3.3** Write test for AI conversation (chat interface)
- [ ] **BM.10.3.4** Write test for mapping validation
- [ ] **BM.10.3.5** Write test for physical dataset implementation
- [ ] **BM.10.3.6** Write test for viewing lineage of implemented dataset

#### BM.10.4 Performance Testing ✓
- [ ] **BM.10.4.1** Test AI recommendation generation with 100+ physical datasets
- [ ] **BM.10.4.2** Test canvas rendering with mix of conceptual and physical datasets
- [ ] **BM.10.4.3** Test chat interface with long conversations (100+ messages)
- [ ] **BM.10.4.4** Optimize slow queries
- [ ] **BM.10.4.5** Add database indexes where needed
- [ ] **BM.10.4.6** Profile frontend bundle size

---

### Phase BM.11: Documentation & Polish (Week 7)

#### BM.11.1 User Documentation ✓
- [ ] **BM.11.1.1** Write "Business Modeling Guide" (overview)
- [ ] **BM.11.1.2** Create tutorial: "Creating Your First Business Model"
- [ ] **BM.11.1.3** Create tutorial: "Mapping Business Models to Physical Datasets"
- [ ] **BM.11.1.4** Create tutorial: "Using AI to Find the Best Physical Datasets"
- [ ] **BM.11.1.5** Create tutorial: "Implementing a Physical Dimension from Business Model"
- [ ] **BM.11.1.6** Document best practices for business modeling
- [ ] **BM.11.1.7** Create FAQ section
- [ ] **BM.11.1.8** Add troubleshooting guide

**Files**:
- `docs/user-guide/business-modeling-guide.md`
- `docs/tutorials/creating-business-models.md`
- `docs/tutorials/mapping-business-to-physical.md`
- `docs/tutorials/ai-assisted-mapping.md`
- `docs/tutorials/implementing-physical-datasets.md`
- `docs/best-practices/business-modeling.md`
- `docs/faq/business-modeling.md`
- `docs/troubleshooting/business-modeling.md`

#### BM.11.2 Developer Documentation ✓
- [ ] **BM.11.2.1** Document database schema changes
- [ ] **BM.11.2.2** Document API endpoints
- [ ] **BM.11.2.3** Document MCP server tools
- [ ] **BM.11.2.4** Document AI analysis algorithms
- [ ] **BM.11.2.5** Create architecture diagram
- [ ] **BM.11.2.6** Document component hierarchy
- [ ] **BM.11.2.7** Add inline code comments

**Files**:
- `docs/developer/business-modeling-architecture.md`
- `docs/developer/business-modeling-api.md`
- `docs/developer/ai-analysis-algorithms.md`
- `docs/developer/mcp-business-model-analyzer.md`

#### BM.11.3 Video Tutorials ✓
- [ ] **BM.11.3.1** Record video: "Introduction to Business Modeling" (5 min)
- [ ] **BM.11.3.2** Record video: "Creating Business Models Step-by-Step" (8 min)
- [ ] **BM.11.3.3** Record video: "AI-Assisted Physical Mapping" (10 min)
- [ ] **BM.11.3.4** Record video: "Implementing Physical Datasets" (7 min)
- [ ] **BM.11.3.5** Record video: "Validating Mappings and Data Quality" (6 min)
- [ ] **BM.11.3.6** Edit and publish all videos
- [ ] **BM.11.3.7** Create video playlist and embed in documentation

**Files**:
- `docs/videos/business-modeling-intro.mp4`
- `docs/videos/creating-business-models.mp4`
- `docs/videos/ai-assisted-mapping.mp4`
- `docs/videos/implementing-physical-datasets.mp4`
- `docs/videos/validating-mappings.mp4`

#### BM.11.4 UI/UX Polish ✓
- [ ] **BM.11.4.1** Review all business modeling UI components for consistency
- [ ] **BM.11.4.2** Ensure color scheme matches overall application
- [ ] **BM.11.4.3** Add micro-interactions (hover effects, transitions)
- [ ] **BM.11.4.4** Improve loading states with skeleton loaders
- [ ] **BM.11.4.5** Add empty states with helpful guidance
- [ ] **BM.11.4.6** Improve error messages (clear, actionable)
- [ ] **BM.11.4.7** Add success confirmations with next steps
- [ ] **BM.11.4.8** Ensure responsive design for tablets
- [ ] **BM.11.4.9** Add keyboard shortcuts documentation
- [ ] **BM.11.4.10** Improve accessibility (ARIA labels, focus management)
- [ ] **BM.11.4.11** Add contextual help tooltips
- [ ] **BM.11.4.12** Conduct user testing session
- [ ] **BM.11.4.13** Implement feedback from user testing

#### BM.11.5 Error Handling & Edge Cases ✓
- [ ] **BM.11.5.1** Handle case: Business dataset with no columns
- [ ] **BM.11.5.2** Handle case: No physical datasets available for recommendations
- [ ] **BM.11.5.3** Handle case: AI service unavailable
- [ ] **BM.11.5.4** Handle case: Mapping validation fails
- [ ] **BM.11.5.5** Handle case: Implementation fails (rollback)
- [ ] **BM.11.5.6** Handle case: Conversation connection drops
- [ ] **BM.11.5.7** Handle case: User tries to implement without validating
- [ ] **BM.11.5.8** Handle case: Duplicate business dataset names
- [ ] **BM.11.5.9** Handle case: Circular mapping references
- [ ] **BM.11.5.10** Add comprehensive error logging

---

## Phase BM.12: Deployment & Monitoring (Week 8)

#### BM.12.1 Database Deployment ✓
- [ ] **BM.12.1.1** Review all migration files
- [ ] **BM.12.1.2** Test migrations on staging database
- [ ] **BM.12.1.3** Create rollback scripts for each migration
- [ ] **BM.12.1.4** Deploy migrations to production
- [ ] **BM.12.1.5** Verify data integrity post-migration
- [ ] **BM.12.1.6** Monitor database performance
- [ ] **BM.12.1.7** Create database backup before and after

**Files**:
- `backend/migrations/rollback/BM_*.sql`

#### BM.12.2 Backend Deployment ✓
- [ ] **BM.12.2.1** Deploy MCP server (business-model-analyzer)
- [ ] **BM.12.2.2** Configure AI service credentials (OpenAI/Anthropic API keys)
- [ ] **BM.12.2.3** Deploy backend API routes
- [ ] **BM.12.2.4** Configure rate limiting for AI endpoints
- [ ] **BM.12.2.5** Set up monitoring for AI service usage and costs
- [ ] **BM.12.2.6** Configure WebSocket support for chat
- [ ] **BM.12.2.7** Test all endpoints in production
- [ ] **BM.12.2.8** Monitor error rates

#### BM.12.3 Frontend Deployment ✓
- [ ] **BM.12.3.1** Build production frontend bundle
- [ ] **BM.12.3.2** Optimize bundle size (code splitting, lazy loading)
- [ ] **BM.12.3.3** Deploy frontend to hosting (Vercel/Netlify/AWS)
- [ ] **BM.12.3.4** Verify all routes work correctly
- [ ] **BM.12.3.5** Test business modeling features in production
- [ ] **BM.12.3.6** Monitor client-side errors (Sentry)

#### BM.12.4 Monitoring & Observability ✓
- [ ] **BM.12.4.1** Set up monitoring dashboards:
  - Business models created per day
  - AI recommendations requested per day
  - Mappings created per day
  - Physical datasets implemented per day
  - Conversation messages per day
- [ ] **BM.12.4.2** Set up alerts:
  - AI service errors
  - High recommendation latency (>5 seconds)
  - Failed implementations
  - WebSocket connection failures
- [ ] **BM.12.4.3** Set up cost tracking for AI API usage
- [ ] **BM.12.4.4** Monitor database query performance
- [ ] **BM.12.4.5** Create operational runbook

**Files**:
- `docs/operations/business-modeling-monitoring.md`
- `docs/operations/business-modeling-runbook.md`

#### BM.12.5 Launch Preparation ✓
- [ ] **BM.12.5.1** Create feature announcement
- [ ] **BM.12.5.2** Prepare demo account with sample business models
- [ ] **BM.12.5.3** Create walkthrough video for marketing
- [ ] **BM.12.5.4** Update application changelog
- [ ] **BM.12.5.5** Prepare customer support training materials
- [ ] **BM.12.5.6** Set up feedback collection mechanism
- [ ] **BM.12.5.7** Create post-launch monitoring checklist

#### BM.12.6 Soft Launch ✓
- [ ] **BM.12.6.1** Enable feature for beta users only
- [ ] **BM.12.6.2** Monitor usage patterns
- [ ] **BM.12.6.3** Collect feedback from beta users
- [ ] **BM.12.6.4** Fix critical issues
- [ ] **BM.12.6.5** Optimize based on usage data
- [ ] **BM.12.6.6** Conduct retrospective with team

#### BM.12.7 Full Launch ✓
- [ ] **BM.12.7.1** Enable feature for all users
- [ ] **BM.12.7.2** Send feature announcement email
- [ ] **BM.12.7.3** Publish blog post
- [ ] **BM.12.7.4** Update in-app help/onboarding
- [ ] **BM.12.7.5** Monitor metrics closely for 48 hours
- [ ] **BM.12.7.6** Respond to user feedback
- [ ] **BM.12.7.7** Fix any critical bugs immediately
- [ ] **BM.12.7.8** Celebrate! 🎉

---

## Phase BM.13: Post-Launch Enhancements (Ongoing)

#### BM.13.1 User Feedback Integration ✓
- [ ] **BM.13.1.1** Set up regular feedback review cadence (weekly)
- [ ] **BM.13.1.2** Prioritize enhancement requests
- [ ] **BM.13.1.3** Create enhancement backlog
- [ ] **BM.13.1.4** Plan quarterly feature releases

#### BM.13.2 AI Model Improvements ✓
- [ ] **BM.13.2.1** Collect training data from user interactions
- [ ] **BM.13.2.2** Analyze recommendation accuracy over time
- [ ] **BM.13.2.3** Tune confidence scoring weights based on user feedback
- [ ] **BM.13.2.4** Improve AI prompts based on conversation outcomes
- [ ] **BM.13.2.5** Add learning from user modifications to recommendations

#### BM.13.3 Advanced Features (Future) ✓
- [ ] **BM.13.3.1** Collaborative business modeling (multiple users editing same model)
- [ ] **BM.13.3.2** Business model templates (pre-built industry models)
- [ ] **BM.13.3.3** Version history for business models
- [ ] **BM.13.3.4** Business model comparison tool
- [ ] **BM.13.3.5** Automated mapping suggestions based on naming conventions
- [ ] **BM.13.3.6** Integration with data catalogs (Alation, Collibra)
- [ ] **BM.13.3.7** Export business models to documentation formats (PDF, Confluence)
- [ ] **BM.13.3.8** Business impact analysis (what if I change this model?)
- [ ] **BM.13.3.9** ML-powered data quality prediction
- [ ] **BM.13.3.10** Natural language query interface for business models

---

## Success Metrics

### Quantitative Metrics
- **Adoption Rate**: % of users who create at least one business model
- **AI Recommendation Acceptance Rate**: % of AI recommendations accepted by users
- **Mapping Success Rate**: % of mappings successfully implemented as physical datasets
- **Time to Physical Dataset**: Average time from business model creation to physical implementation
- **AI Conversation Satisfaction**: Average rating of AI assistance (1-5 stars)
- **Error Rate**: % of implementation failures
- **AI Cost per Implementation**: Average AI API cost per successful implementation

### Qualitative Metrics
- **User Satisfaction**: Feedback surveys (NPS score)
- **Feature Usefulness**: "How useful is business modeling?" (1-5 scale)
- **AI Quality**: "How accurate are AI recommendations?" (1-5 scale)
- **Ease of Use**: "How easy is it to map business models to physical datasets?" (1-5 scale)

### Target Goals (First 3 Months)
- **50+ business models created** across all accounts
- **80%+ AI recommendation acceptance rate** (high confidence recommendations)
- **90%+ mapping success rate** (successful implementations)
- **<15 minutes average time** from business model to physical dataset
- **4.5+ average AI conversation satisfaction rating**
- **<5% error rate** on implementations
- **<$0.50 average AI cost per implementation**

---

## Risk Assessment & Mitigation

### Technical Risks

#### Risk 1: AI Service Reliability
**Impact**: High  
**Probability**: Medium  
**Mitigation**:
- [ ] Implement retry logic with exponential backoff
- [ ] Add fallback to cached recommendations
- [ ] Set up monitoring and alerts for AI service failures
- [ ] Provide manual mapping option when AI unavailable
- [ ] Cache embeddings to reduce API calls

#### Risk 2: Performance with Large Workspaces
**Impact**: Medium  
**Probability**: Medium  
**Mitigation**:
- [ ] Implement pagination for recommendations
- [ ] Add database indexes on all foreign keys
- [ ] Use virtual scrolling for large lists
- [ ] Cache frequently accessed data
- [ ] Profile and optimize slow queries

#### Risk 3: Complex Mapping Edge Cases
**Impact**: Medium  
**Probability**: High  
**Mitigation**:
- [ ] Comprehensive testing with various scenarios
- [ ] Clear error messages with recovery suggestions
- [ ] Manual override option for all AI recommendations
- [ ] Validation step before implementation
- [ ] Rollback mechanism for failed implementations

#### Risk 4: WebSocket Connection Stability
**Impact**: Medium  
**Probability**: Low  
**Mitigation**:
- [ ] Implement automatic reconnection
- [ ] Graceful degradation (fallback to polling)
- [ ] Message buffering during disconnections
- [ ] User notification of connection issues
- [ ] Heartbeat mechanism to detect stale connections

### User Experience Risks

#### Risk 5: AI Recommendations Not Meeting Expectations
**Impact**: High  
**Probability**: Medium  
**Mitigation**:
- [ ] Set clear expectations (confidence scores, explanations)
- [ ] Provide multiple recommendations (not just top 1)
- [ ] Allow manual mapping as alternative
- [ ] Collect feedback to improve over time
- [ ] Transparent about AI limitations

#### Risk 6: Learning Curve Too Steep
**Impact**: Medium  
**Probability**: Medium  
**Mitigation**:
- [ ] Comprehensive onboarding tutorial
- [ ] Contextual help throughout interface
- [ ] Video tutorials
- [ ] Sample business models to start with
- [ ] Clear documentation with examples

#### Risk 7: Confusion Between Conceptual and Physical
**Impact**: Medium  
**Probability**: Medium  
**Mitigation**:
- [ ] Clear visual distinction (yellow vs blue)
- [ ] Consistent terminology throughout UI
- [ ] Tooltips explaining concepts
- [ ] Prevent invalid operations (e.g., conceptual dataset can't have connection)
- [ ] User documentation explaining difference

---

## Dependencies

### External Dependencies
- **Anthropic Claude API** (or OpenAI GPT-4): For AI recommendations and conversations
- **Supabase**: Database and real-time subscriptions
- **Monaco Editor**: SQL editing component
- **React Flow**: Canvas visualization
- **WebSocket Server**: Real-time chat

### Internal Dependencies
- **Phase 1 & 2 Complete**: Authentication, workspace management, database schema
- **Phase 2 Complete**: Dataset and column management
- **Dataset Service**: Must support conceptual flag
- **Lineage Service**: For automatic lineage creation
- **Template Service**: For SQL generation (Phase 5 integration)

---

## Estimated Effort

### By Role

**Backend Developer** (280 hours):
- Database schema: 20 hours
- API routes: 40 hours
- MCP server: 60 hours
- AI analysis algorithms: 80 hours
- Testing: 40 hours
- Deployment: 20 hours
- Documentation: 20 hours

**Frontend Developer** (320 hours):
- Type definitions: 20 hours
- Service layer: 40 hours
- UI components: 120 hours
- Chat interface: 60 hours
- State management: 30 hours
- Testing: 30 hours
- Polish: 20 hours

**AI/ML Engineer** (160 hours):
- Semantic similarity: 40 hours
- Structural analysis: 40 hours
- Confidence scoring: 40 hours
- Prompt engineering: 20 hours
- Testing & tuning: 20 hours

**Technical Writer** (40 hours):
- User documentation: 20 hours
- Developer documentation: 10 hours
- Video tutorials: 10 hours

**Total**: ~800 hours (approximately 20 weeks for 2-person team, or 10 weeks for 4-person team)

---

## Notes for AI-Assisted Development

### Development Order Priority
1. **Start with data model** (database schema first)
2. **Build service layer** before UI components
3. **Implement basic AI recommendations** before complex chat interface
4. **Test each component** before integration
5. **Polish incrementally** rather than at the end

### Key Technical Decisions

#### AI Model Selection
**Recommended**: Claude Sonnet 4.5
- Excellent context understanding
- Strong structured output generation
- Good with SQL and data modeling
- MCP support built-in

**Alternative**: GPT-4 Turbo
- Similar capabilities
- Slightly lower cost
- Well-documented API

#### Database Design Philosophy
- **is_conceptual flag** clearly separates business models from physical datasets
- **JSONB for business_context** allows flexible metadata without schema changes
- **Separate tables for mappings and recommendations** enables clean separation of concerns
- **Conversation storage** enables full chat history and learning

#### Component Architecture
- **Reuse existing DatasetNode** with conditional rendering for conceptual vs physical
- **Tab-based editor** keeps complexity manageable
- **Separate chat component** can be reused in other contexts
- **Hook-based state management** follows React best practices

### Common Pitfalls to Avoid
1. **Don't conflate conceptual and physical datasets** - Always check is_conceptual flag
2. **Don't block UI on AI operations** - Always show loading states, allow cancellation
3. **Don't ignore edge cases** - Handle missing data, failed validations, etc.
4. **Don't skip validation** - Validate mappings before implementation
5. **Don't hard-code confidence thresholds** - Make them configurable
6. **Don't forget rollback** - Implementation must be atomic (all or nothing)
7. **Don't ignore costs** - Monitor and optimize AI API usage

### Testing Strategy
- **Unit test** all service functions and AI algorithms
- **Integration test** full workflows end-to-end
- **Mock AI responses** for predictable testing
- **Test with real AI** in staging environment
- **Load test** with 100+ datasets
- **User test** before launch

---

## Appendix: Sample Data

### Sample Business Dataset (YAML)
```yaml
id: "550e8400-e29b-41d4-a716-446655440000"
account_id: "account-uuid"
workspace_id: "workspace-uuid"
name: "Customer Dimension (Business Model)"
description: "Conceptual model for customer analytics dimension"
is_conceptual: true
entity_type: "Dimension"
entity_subtype: "Dimension"
materialization_type: "Conceptual"

business_context:
  business_owner: "jane.doe@company.com"
  domain: "Customer Analytics"
  glossary_terms:
    - "Customer"
    - "Segmentation"
    - "Lifetime Value"
  business_rules:
    - id: "br_001"
      rule: "Active customers have purchased in last 12 months"
      expression: "last_purchase_date >= CURRENT_DATE - INTERVAL '12 months'"
  kpis:
    - name: "Customer Lifetime Value"
      formula: "SUM(total_purchases) / COUNT(DISTINCT customer_id)"
      target: 5000

columns:
  - id: "col-001"
    name: "customer_key"
    data_type: "BIGINT"
    description: "Surrogate key for customer dimension"
    business_name: "Customer Key"
    is_primary_key: true
    
  - id: "col-002"
    name: "customer_id"
    data_type: "STRING"
    description: "Natural key from source system"
    business_name: "Customer ID"
    
  - id: "col-003"
    name: "customer_name"
    data_type: "STRING"
    description: "Full name of customer"
    business_name: "Customer Name"
    
  - id: "col-004"
    name: "customer_segment"
    data_type: "STRING"
    description: "Customer segmentation (Premium, Standard, Basic)"
    business_name: "Customer Segment"
    
  - id: "col-005"
    name: "customer_lifetime_value"
    data_type: "DECIMAL(18,2)"
    description: "Total lifetime value of customer"
    business_name: "Customer Lifetime Value"

