# Business Modeling Diagram - Technical Specification

## 1. Overview

### 1.1 Purpose
The Business Modeling Diagram feature enables users to create conceptual data models independent of physical database schemas. These models serve as a bridge between business requirements and physical implementation, allowing business analysts and data architects to design ideal data structures before mapping them to actual source systems.

### 1.2 Key Capabilities
- **Conceptual Modeling**: Create datasets and columns without connection to physical sources
- **Business-Friendly Interface**: Design models using business terminology
- **AI-Assisted Physical Mapping**: Convert conceptual models to physical datasets using natural language
- **Context-Aware Recommendations**: AI analyzes existing physical datasets to suggest optimal mappings
- **Relationship Visualization**: Link business models to physical datasets
- **Collaborative Design**: Multiple stakeholders can contribute to business models

### 1.3 User Personas
- **Business Analysts**: Define business requirements and data structures
- **Data Architects**: Bridge business needs with technical implementation
- **Data Engineers**: Understand business context for physical implementations
- **Domain Experts**: Contribute domain knowledge to data models

## 2. Architecture

### 2.1 Conceptual vs Physical Datasets

**Distinction**:
```
Business Dataset (Conceptual)
├── No connection_id (NULL)
├── materialization_type: "Conceptual"
├── entity_type: Dimension | Fact | Table
├── Used for business modeling
└── Can be mapped to physical datasets

Physical Dataset
├── Has connection_id (references connections table)
├── materialization_type: Table | View | MaterializedView
├── entity_type: Table | Staging | DataVault | DataMart
├── Represents actual database objects
└── Can be source for business dataset mappings
```

### 2.2 Database Schema Extensions

#### 2.2.1 Datasets Table Modifications
```sql
-- Add is_conceptual flag to datasets table
ALTER TABLE datasets 
ADD COLUMN is_conceptual BOOLEAN DEFAULT false;

-- Add business_context JSONB for storing business metadata
ALTER TABLE datasets 
ADD COLUMN business_context JSONB;

-- Create index for conceptual datasets
CREATE INDEX idx_datasets_conceptual 
ON datasets(is_conceptual) 
WHERE is_conceptual = true;

COMMENT ON COLUMN datasets.is_conceptual IS 
'Flag indicating if this is a conceptual/business model (true) or physical dataset (false)';

COMMENT ON COLUMN datasets.business_context IS 
'Business metadata: owner, domain, glossary terms, business rules, KPIs, etc.';
```

**business_context Structure**:
```json
{
  "business_owner": "jane.doe@company.com",
  "domain": "Customer Analytics",
  "glossary_terms": ["Customer", "Segmentation", "Lifetime Value"],
  "business_rules": [
    {
      "id": "br_001",
      "rule": "Active customers have purchased in last 12 months",
      "expression": "last_purchase_date >= CURRENT_DATE - INTERVAL '12 months'"
    }
  ],
  "kpis": [
    {
      "name": "Customer Lifetime Value",
      "formula": "SUM(total_purchases) / COUNT(DISTINCT customer_id)",
      "target": 5000
    }
  ],
  "data_quality_rules": [
    {
      "column": "email",
      "rule": "Must be valid email format",
      "validation": "email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}$'"
    }
  ]
}
```

#### 2.2.2 Business to Physical Mapping Table
```sql
CREATE TABLE business_physical_mappings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Business dataset (conceptual)
  business_dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  
  -- Physical dataset (actual)
  physical_dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  
  -- Mapping metadata
  mapping_confidence DECIMAL(5,2) CHECK (mapping_confidence BETWEEN 0 AND 100),
  mapping_status VARCHAR CHECK (mapping_status IN ('draft', 'validated', 'implemented', 'deprecated')),
  mapping_type VARCHAR CHECK (mapping_type IN ('direct', 'derived', 'aggregated', 'joined')),
  
  -- AI-generated recommendations
  ai_recommendation_score DECIMAL(5,2),
  ai_rationale TEXT,
  
  -- Column-level mappings (stored as JSONB)
  column_mappings JSONB,
  
  -- Transformation logic
  transformation_sql TEXT,
  
  -- Approval workflow
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP,
  
  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  CONSTRAINT chk_different_datasets CHECK (business_dataset_id != physical_dataset_id),
  CONSTRAINT chk_business_is_conceptual CHECK (
    (SELECT is_conceptual FROM datasets WHERE id = business_dataset_id) = true
  ),
  CONSTRAINT chk_physical_not_conceptual CHECK (
    (SELECT is_conceptual FROM datasets WHERE id = physical_dataset_id) = false
  )
);

CREATE INDEX idx_business_physical_mappings_business 
ON business_physical_mappings(business_dataset_id);

CREATE INDEX idx_business_physical_mappings_physical 
ON business_physical_mappings(physical_dataset_id);

CREATE INDEX idx_business_physical_mappings_workspace 
ON business_physical_mappings(workspace_id);

CREATE INDEX idx_business_physical_mappings_account 
ON business_physical_mappings(account_id);

-- RLS Policy
CREATE POLICY business_physical_mappings_isolation_policy 
ON business_physical_mappings
FOR SELECT
USING (account_id = (SELECT account_id FROM account_users WHERE user_id = auth.uid()));

COMMENT ON TABLE business_physical_mappings IS 
'Maps conceptual business datasets to physical datasets with AI-assisted recommendations';
```

**column_mappings Structure**:
```json
{
  "mappings": [
    {
      "business_column_id": "uuid-1",
      "business_column_name": "customer_lifetime_value",
      "physical_column_id": "uuid-2",
      "physical_column_name": "total_revenue",
      "transformation": "SUM(total_revenue)",
      "mapping_confidence": 95,
      "ai_rationale": "Strong semantic match: customer_lifetime_value ≈ total_revenue aggregation"
    },
    {
      "business_column_id": "uuid-3",
      "business_column_name": "customer_segment",
      "physical_column_id": "uuid-4",
      "physical_column_name": "segment_code",
      "transformation": "CASE WHEN segment_code = 'A' THEN 'Premium' WHEN segment_code = 'B' THEN 'Standard' ELSE 'Basic' END",
      "mapping_confidence": 88,
      "ai_rationale": "Semantic mapping with value transformation required"
    }
  ],
  "unmapped_business_columns": [
    {
      "business_column_id": "uuid-5",
      "business_column_name": "customer_satisfaction_score",
      "reason": "No matching physical column found",
      "ai_suggestion": "Consider adding to customer survey data"
    }
  ],
  "unused_physical_columns": [
    {
      "physical_column_id": "uuid-6",
      "physical_column_name": "internal_audit_flag",
      "reason": "Not relevant to business model"
    }
  ]
}
```

#### 2.2.3 AI Mapping Recommendations Table
```sql
CREATE TABLE ai_mapping_recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Source business dataset
  business_dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  
  -- Recommended physical dataset
  recommended_physical_dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,
  
  -- Recommendation metadata
  confidence_score DECIMAL(5,2) NOT NULL CHECK (confidence_score BETWEEN 0 AND 100),
  recommendation_rank INTEGER NOT NULL,
  
  -- AI reasoning
  match_factors JSONB, -- semantic, structural, relationship, usage patterns
  ai_explanation TEXT,
  
  -- User feedback
  user_action VARCHAR CHECK (user_action IN ('accepted', 'rejected', 'modified', 'pending')),
  user_feedback TEXT,
  
  -- Conversation context (for AI chat)
  conversation_id UUID,
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- Recommendations expire after time
  
  UNIQUE(business_dataset_id, recommended_physical_dataset_id)
);

CREATE INDEX idx_ai_recommendations_business 
ON ai_mapping_recommendations(business_dataset_id);

CREATE INDEX idx_ai_recommendations_confidence 
ON ai_mapping_recommendations(confidence_score DESC);

CREATE INDEX idx_ai_recommendations_pending 
ON ai_mapping_recommendations(user_action) 
WHERE user_action = 'pending';

-- RLS Policy
CREATE POLICY ai_mapping_recommendations_isolation_policy 
ON ai_mapping_recommendations
FOR SELECT
USING (account_id = (SELECT account_id FROM account_users WHERE user_id = auth.uid()));

COMMENT ON TABLE ai_mapping_recommendations IS 
'AI-generated recommendations for mapping business datasets to physical datasets';
```

**match_factors Structure**:
```json
{
  "semantic_similarity": {
    "score": 92,
    "details": "High similarity between 'customer_lifetime_value' and 'total_customer_revenue'"
  },
  "structural_similarity": {
    "score": 85,
    "details": "80% column overlap between business and physical datasets"
  },
  "relationship_match": {
    "score": 78,
    "details": "Both datasets have relationships to 'customer' and 'transactions'"
  },
  "usage_patterns": {
    "score": 90,
    "details": "Physical dataset frequently used in similar contexts"
  },
  "domain_alignment": {
    "score": 95,
    "details": "Both datasets belong to 'Customer Analytics' domain"
  },
  "data_quality": {
    "score": 88,
    "details": "Physical dataset has high completeness (95%) and accuracy"
  }
}
```

#### 2.2.4 Business Model Conversations Table
```sql
CREATE TABLE business_model_conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Business dataset context
  business_dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  
  -- Conversation metadata
  title VARCHAR,
  conversation_type VARCHAR CHECK (conversation_type IN ('mapping', 'validation', 'transformation', 'general')),
  status VARCHAR CHECK (status IN ('active', 'resolved', 'archived')),
  
  -- Participants
  user_id UUID REFERENCES users(id),
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_message_at TIMESTAMP
);

CREATE TABLE business_model_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES business_model_conversations(id) ON DELETE CASCADE,
  
  -- Message content
  role VARCHAR NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  
  -- AI context
  ai_model VARCHAR, -- claude-sonnet-4-5-20250929
  tokens_used INTEGER,
  
  -- Attached recommendations/artifacts
  recommendations JSONB, -- Array of recommendation IDs
  artifacts JSONB, -- Generated SQL, mappings, etc.
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_conversations_business_dataset 
ON business_model_conversations(business_dataset_id);

CREATE INDEX idx_conversations_user 
ON business_model_conversations(user_id);

CREATE INDEX idx_messages_conversation 
ON business_model_messages(conversation_id);

-- RLS Policies
CREATE POLICY business_conversations_isolation_policy 
ON business_model_conversations
FOR SELECT
USING (account_id = (SELECT account_id FROM account_users WHERE user_id = auth.uid()));

CREATE POLICY business_messages_isolation_policy 
ON business_model_messages
FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM business_model_conversations 
    WHERE account_id = (SELECT account_id FROM account_users WHERE user_id = auth.uid())
  )
);
```

### 2.3 Service Layer Architecture

```typescript
// Business Model Service Layer

interface BusinessModelService {
  // Dataset Management
  createConceptualDataset(params: CreateConceptualDatasetParams): Promise<Dataset>;
  updateConceptualDataset(id: string, updates: Partial<Dataset>): Promise<Dataset>;
  deleteConceptualDataset(id: string): Promise<void>;
  getConceptualDatasets(workspaceId: string, filters?: DatasetFilters): Promise<Dataset[]>;
  
  // AI-Assisted Mapping
  requestMappingRecommendations(businessDatasetId: string, context?: string): Promise<MappingRecommendation[]>;
  createPhysicalMapping(params: CreateMappingParams): Promise<BusinessPhysicalMapping>;
  validateMapping(mappingId: string): Promise<ValidationResult>;
  implementMapping(mappingId: string): Promise<Dataset>; // Creates physical dataset
  
  // Conversation Management
  startConversation(businessDatasetId: string, initialMessage: string): Promise<Conversation>;
  sendMessage(conversationId: string, message: string): Promise<Message>;
  getConversationHistory(conversationId: string): Promise<Message[]>;
  
  // Analysis
  analyzeBusinessModel(businessDatasetId: string): Promise<AnalysisResult>;
  findSimilarPhysicalDatasets(businessDatasetId: string): Promise<SimilarityMatch[]>;
  suggestTransformations(businessDatasetId: string, physicalDatasetId: string): Promise<TransformationSuggestion[]>;
}
```

## 3. User Interface Design

### 3.1 Business Modeling Canvas

**Layout**:
```
┌─────────────────────────────────────────────────────────────────┐
│ Business Modeling Canvas                    [Toggle: Business]  │
├─────────────────────────────────────────────────────────────────┤
│ [+ New Business Model]  [AI Assistant]  [View Mappings]         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐         ┌──────────────────┐            │
│  │ Customer         │────────>│ Orders           │            │
│  │ [Dimension]      │         │ [Fact]           │            │
│  │ 🟡 Conceptual    │         │ 🟡 Conceptual    │            │
│  └──────────────────┘         └──────────────────┘            │
│         │                            │                         │
│         │ [Link to Physical]         │ [Link to Physical]      │
│         ▼                            ▼                         │
│  ┌──────────────────┐         ┌──────────────────┐            │
│  │ stg_customers    │         │ stg_order_lines  │            │
│  │ [Staging]        │         │ [Staging]        │            │
│  │ 🔵 Physical      │         │ 🔵 Physical      │            │
│  │ 95% match        │         │ 88% match        │            │
│  └──────────────────┘         └──────────────────┘            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Visual Indicators**:
- **🟡 Yellow Border**: Conceptual/Business dataset
- **🔵 Blue Border**: Physical dataset
- **Dotted Line**: Proposed mapping (not yet implemented)
- **Solid Line**: Implemented mapping
- **Confidence Badge**: AI confidence score (e.g., "95% match")

### 3.2 Business Dataset Editor

**Enhanced Node Editor Dialog**:
```typescript
interface BusinessDatasetEditorProps {
  dataset: Dataset;
  isConceptual: boolean;
  onSave: (updates: Partial<Dataset>) => Promise<void>;
}

// New tabs specific to business models:
// 1. Properties (standard)
// 2. Columns (standard)
// 3. Business Context (NEW)
// 4. Physical Mappings (NEW)
// 5. AI Recommendations (NEW)
// 6. Conversations (NEW)
```

#### Tab 3: Business Context
```
┌─────────────────────────────────────────────────────────────────┐
│ Business Context                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Business Owner:                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ jane.doe@company.com                                        │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Domain:                                                         │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Customer Analytics                                          │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Glossary Terms:                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ [Customer] [Segmentation] [Lifetime Value] [+ Add]         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Business Rules:                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Rule ID: br_001                                             │ │
│ │ Active customers have purchased in last 12 months           │ │
│ │ Expression: last_purchase_date >= CURRENT_DATE - 12 months │ │
│ │ [Edit] [Delete]                                             │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ [+ Add Business Rule]                                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ KPIs:                                                           │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Customer Lifetime Value                                     │ │
│ │ Formula: SUM(total_purchases) / COUNT(DISTINCT customer_id) │ │
│ │ Target: 5000                                                │ │
│ │ [Edit] [Delete]                                             │ │
│ ├─────────────────────────────────────────────────────────────┤ │
│ │ [+ Add KPI]                                                 │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Tab 4: Physical Mappings
```
┌─────────────────────────────────────────────────────────────────┐
│ Physical Mappings                                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Current Mappings:                                               │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ stg_customers                                 [95% match]   │ │
│ │ Status: ✅ Validated                                         │ │
│ │ Type: Direct mapping                                        │ │
│ │                                                             │ │
│ │ Column Mappings:                                            │ │
│ │ • customer_id → customer_key (Direct)                       │ │
│ │ • customer_name → full_name (Direct)                        │ │
│ │ • customer_segment → segment_code (Transformed)             │ │
│ │ • customer_lifetime_value → total_revenue (Aggregated)      │ │
│ │                                                             │ │
│ │ [View Details] [Edit Mapping] [Implement]                  │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ crm_accounts                                  [78% match]   │ │
│ │ Status: 📝 Draft                                             │ │
│ │ Type: Derived mapping (requires transformation)             │ │
│ │                                                             │ │
│ │ [View Details] [Edit Mapping] [Delete]                     │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [+ Add Mapping Manually] [🤖 Get AI Recommendations]            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Tab 5: AI Recommendations
```
┌─────────────────────────────────────────────────────────────────┐
│ AI Recommendations                                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Top Recommended Physical Datasets:                              │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 1. stg_customers                            [95% confidence] │ │
│ │                                                             │ │
│ │ Match Factors:                                              │ │
│ │ • Semantic Similarity: 92%                                  │ │
│ │ • Structural Similarity: 85%                                │ │
│ │ • Relationship Match: 78%                                   │ │
│ │ • Usage Patterns: 90%                                       │ │
│ │                                                             │ │
│ │ AI Explanation:                                             │ │
│ │ "This dataset is the best match because it contains all     │ │
│ │ required customer attributes (name, email, segment) and     │ │
│ │ has high data quality (95% completeness). The dataset is    │ │
│ │ frequently used in customer analytics workflows."           │ │
│ │                                                             │ │
│ │ [Accept] [View Details] [Start Conversation]               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 2. crm_accounts                             [78% confidence] │ │
│ │                                                             │ │
│ │ AI Explanation:                                             │ │
│ │ "Alternative source with different structure. Requires      │ │
│ │ additional transformations for segment derivation."         │ │
│ │                                                             │ │
│ │ [Accept] [View Details] [Reject]                           │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [Refresh Recommendations] [View All]                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Tab 6: Conversations
```
┌─────────────────────────────────────────────────────────────────┐
│ AI Conversations                                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Active Conversations:                                           │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ "Create physical dimension from stg_customers"              │ │
│ │ Started: 2 hours ago • 8 messages                           │ │
│ │ Status: 🟢 Active                                            │ │
│ │ [Continue] [Archive]                                        │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ "Help map customer segment field"                           │ │
│ │ Started: 1 day ago • 12 messages                            │ │
│ │ Status: ✅ Resolved                                          │ │
│ │ [View] [Archive]                                            │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ [+ Start New Conversation]                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 AI Conversation Interface

**Embedded Chat within Business Model Context**:
```
┌─────────────────────────────────────────────────────────────────┐
│ 🤖 AI Business Model Assistant                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Context: Business Dataset "Customer Dimension"                  │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ User: I need to create a physical dimension from my        │   │
│ │ business model "Customer Dimension". Can you help?          │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ AI: I've analyzed your workspace and found 3 potential     │   │
│ │ datasets that can be used to create your Customer          │   │
│ │ Dimension:                                                  │   │
│ │                                                             │   │
│ │ 1. **stg_customers** (95% match)                            │   │
│ │    - Contains: customer_id, first_name, last_name, email,  │   │
│ │      segment_code, registration_date                        │   │
│ │    - High data quality: 95% completeness                    │   │
│ │    - Frequently used in customer analytics                  │   │
│ │                                                             │   │
│ │ 2. **crm_accounts** (78% match)                             │   │
│ │    - Contains: account_id, account_name, account_type,     │   │
│ │      industry                                               │   │
│ │    - Requires transformations for customer segment          │   │
│ │                                                             │   │
│ │ 3. **salesforce_contacts** (72% match)                      │   │
│ │    - Contains: contact_id, name, email, status              │   │
│ │    - Missing: segment information                           │   │
│ │                                                             │   │
│ │ Would you like me to proceed with **stg_customers**?        │   │
│ │                                                             │   │
│ │ [Accept stg_customers] [Compare Options] [Manual Selection]│   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ User: Yes, use stg_customers. How will you map the fields? │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ AI: Here's the proposed mapping for your Customer          │   │
│ │ Dimension:                                                  │   │
│ │                                                             │   │
│ │ **Direct Mappings** (no transformation needed):            │   │
│ │ • customer_key ← customer_id (surrogate key)                │   │
│ │ • customer_name ← CONCAT(first_name, ' ', last_name)       │   │
│ │ • email ← email                                             │   │
│ │                                                             │   │
│ │ **Derived Mappings** (transformation required):            │   │
│ │ • customer_segment ← CASE WHEN segment_code = 'A' THEN      │   │
│ │   'Premium' WHEN segment_code = 'B' THEN 'Standard'        │   │
│ │   ELSE 'Basic' END                                          │   │
│ │                                                             │   │
│ │ **Missing from Source** (will need additional data):       │   │
│ │ • customer_lifetime_value (suggested: calculate from       │   │
│ │   fct_orders)                                               │   │
│ │                                                             │   │
│ │ I can create the dimension with Type 2 SCD tracking for    │   │
│ │ historical changes. Should I proceed?                       │   │
│ │                                                             │   │
│ │ [✅ Create Dimension] [Edit Mappings] [Add More Sources]    │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ [Type your message...]                          [Send]     │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4 Mapping Validation Interface

**Mapping Validation Dialog**:
```
┌─────────────────────────────────────────────────────────────────┐
│ Validate Mapping: Customer Dimension → stg_customers           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Column-Level Validation:                                        │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ customer_key → customer_id                                │   │
│ │ Status: ✅ Valid                                           │   │
│ │ Confidence: 100%                                          │   │
│ │ Data Type: BIGINT → BIGINT ✅                              │   │
│ │ Nullability: NOT NULL → NOT NULL ✅                        │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ customer_segment → segment_code                           │   │
│ │ Status: ⚠️  Needs Transformation                           │   │
│ │ Confidence: 88%                                           │   │
│ │ Data Type: STRING → STRING ✅                              │   │
│ │ Nullability: NOT NULL → NOT NULL ✅                        │   │
│ │ Values: 'Premium', 'Standard', 'Basic' → 'A', 'B', 'C'   │   │
│ │ Transformation: CASE statement required                   │   │
│ │ [View SQL] [Edit]                                         │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ customer_lifetime_value → (not mapped)                    │   │
│ │ Status: ❌ Missing                                         │   │
│ │ Suggestion: Calculate from fct_orders.total_revenue       │   │
│ │ [Add Calculated Column] [Remove from Model] [Get AI Help] │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ Data Quality Checks:                                            │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Source Data Completeness: 95% ✅                           │   │
│ │ Source Data Freshness: Last updated 2 hours ago ✅         │   │
│ │ Duplicate Keys: 0.1% ⚠️                                    │   │
│ │ Null Values in Required Fields: 0% ✅                      │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ Overall Validation Score: 88% ✅                                │
│                                                                 │
│ [Mark as Validated] [Fix Issues] [Cancel]                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.5 Implementation Workflow

**Create Physical Dataset from Business Model**:
```
┌─────────────────────────────────────────────────────────────────┐
│ Implement Physical Dimension                                    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Step 1: Review Configuration                                    │
│                                                                 │
│ Target Dataset Name:                                            │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ dim_customer                                              │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ Medallion Layer:                                                │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ [Gold ▼]                                                  │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ Entity Subtype:                                                 │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ [Dimension ▼]                                             │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ SCD Type:                                                       │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ [Type 2 ▼]                                                │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ Step 2: Column Mappings                                         │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ ✅ 8 columns mapped                                        │   │
│ │ ⚠️  1 column requires transformation                       │   │
│ │ ❌ 1 column missing from source                            │   │
│ │ [Review Mappings]                                         │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ Step 3: Transformation SQL                                      │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ CREATE OR REPLACE TABLE gold.dim_customer AS              │   │
│ │ SELECT                                                    │   │
│ │   customer_id AS customer_key,                            │   │
│ │   CONCAT(first_name, ' ', last_name) AS customer_name,    │   │
│ │   email,                                                  │   │
│ │   CASE                                                    │   │
│ │     WHEN segment_code = 'A' THEN 'Premium'                │   │
│ │     WHEN segment_code = 'B' THEN 'Standard'               │   │
│ │     ELSE 'Basic'                                          │   │
│ │   END AS customer_segment,                                │   │
│ │   registration_date AS effective_date,                    │   │
│ │   NULL AS end_date,                                       │   │
│ │   TRUE AS is_current                                      │   │
│ │ FROM silver.stg_customers;                                │   │
│ │                                                           │   │
│ │ [Copy SQL] [Edit SQL] [Preview Results]                  │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ Step 4: Lineage Creation                                        │
│                                                                 │
│ ┌───────────────────────────────────────────────────────────┐   │
│ │ Lineage will be automatically created for all mapped      │   │
│ │ columns, linking dim_customer to stg_customers.           │   │
│ └───────────────────────────────────────────────────────────┘   │
│                                                                 │
│ [< Back] [Create Physical Dataset] [Cancel]                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 4. AI Integration Architecture

### 4.1 MCP Server: Business Model Analyzer

**Purpose**: Analyze business models and recommend physical dataset mappings

**Server Name**: `business-model-analyzer`

**Tools to Expose**:

```typescript
{
  name: "analyze_business_dataset",
  description: "Analyze a business dataset and recommend physical mappings",
  inputSchema: {
    type: "object",
    properties: {
      business_dataset_id: { type: "string" },
      workspace_id: { type: "string" },
      context: { 
        type: "string",
        description: "Additional context from user (e.g., 'focus on customer analytics')"
      }
    },
    required: ["business_dataset_id", "workspace_id"]
  }
}

{
  name: "find_similar_physical_datasets",
  description: "Find physical datasets similar to a business model",
  inputSchema: {
    type: "object",
    properties: {
      business_dataset_id: { type: "string" },
      workspace_id: { type: "string" },
      min_confidence: { 
        type: "number",
        default: 70,
        description: "Minimum confidence score (0-100)"
      },
      max_results: {
        type: "integer",
        default: 5,
        description: "Maximum number of recommendations"
      }
    },
    required: ["business_dataset_id", "workspace_id"]
  }
}

{
  name: "generate_column_mappings",
  description: "Generate column-level mappings between business and physical datasets",
  inputSchema: {
    type: "object",
    properties: {
      business_dataset_id: { type: "string" },
      physical_dataset_id: { type: "string" },
      workspace_id: { type: "string" }
    },
    required: ["business_dataset_id", "physical_dataset_id", "workspace_id"]
  }
}

{
  name: "suggest_transformations",
  description: "Suggest SQL transformations for mapped columns",
  inputSchema: {
    type: "object",
    properties: {
      mapping_id: { type: "string" },
      workspace_id: { type: "string" }
    },
    required: ["mapping_id", "workspace_id"]
  }
}

{
  name: "validate_business_mapping",
  description: "Validate a business-to-physical mapping",
  inputSchema: {
    type: "object",
    properties: {
      mapping_id: { type: "string" },
      workspace_id: { type: "string" }
    },
    required: ["mapping_id", "workspace_id"]
  }
}

{
  name: "create_physical_from_business",
  description: "Create a physical dataset from a business model with mappings",
  inputSchema: {
    type: "object",
    properties: {
      business_dataset_id: { type: "string" },
      mapping_id: { type: "string" },
      workspace_id: { type: "string" },
      target_layer: {
        type: "string",
        enum: ["Bronze", "Silver", "Gold"]
      },
      scd_type: {
        type: "integer",
        enum: [0, 1, 2, 3]
      }
    },
    required: ["business_dataset_id", "mapping_id", "workspace_id"]
  }
}
```

### 4.2 AI Analysis Algorithms

#### 4.2.1 Semantic Similarity Analysis
```typescript
async function calculateSemanticSimilarity(
  businessDataset: Dataset,
  physicalDataset: Dataset
): Promise<number> {
  // Use embeddings to compare dataset names and descriptions
  const businessEmbedding = await generateEmbedding(
    `${businessDataset.name} ${businessDataset.description}`
  );
  
  const physicalEmbedding = await generateEmbedding(
    `${physicalDataset.name} ${physicalDataset.description}`
  );
  
  const similarity = cosineSimilarity(businessEmbedding, physicalEmbedding);
  
  return similarity * 100; // Convert to percentage
}
```

#### 4.2.2 Structural Similarity Analysis
```typescript
async function calculateStructuralSimilarity(
  businessColumns: Column[],
  physicalColumns: Column[]
): Promise<number> {
  let matchCount = 0;
  
  for (const businessCol of businessColumns) {
    const bestMatch = await findBestColumnMatch(businessCol, physicalColumns);
    if (bestMatch.score > 70) {
      matchCount++;
    }
  }
  
  const structuralScore = (matchCount / businessColumns.length) * 100;
  
  return structuralScore;
}

async function findBestColumnMatch(
  businessColumn: Column,
  physicalColumns: Column[]
): Promise<{ column: Column; score: number }> {
  const scores = await Promise.all(
    physicalColumns.map(async (physicalCol) => {
      // Name similarity
      const nameSimilarity = stringSimilarity(
        businessColumn.name,
        physicalCol.name
      );
      
      // Data type compatibility
      const typeCompatibility = areDataTypesCompatible(
        businessColumn.data_type,
        physicalCol.data_type
      ) ? 1 : 0;
      
      // Description similarity (if available)
      const descSimilarity = businessColumn.description && physicalCol.description
        ? await semanticSimilarity(
            businessColumn.description,
            physicalCol.description
          )
        : 0;
      
      // Weighted score
      const score = (
        nameSimilarity * 0.5 +
        typeCompatibility * 0.3 +
        descSimilarity * 0.2
      ) * 100;
      
      return { column: physicalCol, score };
    })
  );
  
  return scores.reduce((best, current) =>
    current.score > best.score ? current : best
  );
}
```

#### 4.2.3 Relationship Analysis
```typescript
async function analyzeRelationshipMatch(
  businessDataset: Dataset,
  physicalDataset: Dataset,
  workspaceId: string
): Promise<number> {
  // Get relationships for both datasets
  const businessRelationships = await getDatasetRelationships(
    businessDataset.id,
    workspaceId
  );
  
  const physicalRelationships = await getDatasetRelationships(
    physicalDataset.id,
    workspaceId
  );
  
  // Compare relationship patterns
  let matchingRelationships = 0;
  
  for (const businessRel of businessRelationships) {
    const matchingPhysicalRel = physicalRelationships.find(
      (physicalRel) =>
        areRelationshipsSimilar(businessRel, physicalRel)
    );
    
    if (matchingPhysicalRel) {
      matchingRelationships++;
    }
  }
  
  const relationshipScore = 
    (matchingRelationships / Math.max(businessRelationships.length, 1)) * 100;
  
  return relationshipScore;
}
```

#### 4.2.4 Overall Confidence Score
```typescript
function calculateOverallConfidence(
  semanticScore: number,
  structuralScore: number,
  relationshipScore: number,
  usageScore: number,
  domainScore: number,
  qualityScore: number
): number {
  // Weighted average
  const weights = {
    semantic: 0.25,
    structural: 0.25,
    relationship: 0.15,
    usage: 0.15,
    domain: 0.10,
    quality: 0.10
  };
  
  const overallScore =
    semanticScore * weights.semantic +
    structuralScore * weights.structural +
    relationshipScore * weights.relationship +
    usageScore * weights.usage +
    domainScore * weights.domain +
    qualityScore * weights.quality;
  
  return Math.round(overallScore);
}
```

### 4.3 AI Conversation Flow

**Example Conversation**:

```typescript
// System Prompt for Business Model Assistant
const systemPrompt = `You are an expert data architect specializing in business data modeling and physical implementation.

Your role is to help users:
1. Understand their business data models
2. Find the best physical datasets to implement them
3. Create accurate mappings between business and physical columns
4. Generate SQL transformations
5. Validate data quality and completeness

You have access to the following tools via MCP:
- analyze_business_dataset: Analyze a business model
- find_similar_physical_datasets: Find matching physical datasets
- generate_column_mappings: Create column-level mappings
- suggest_transformations: Suggest SQL transformations
- validate_business_mapping: Validate mappings
- create_physical_from_business: Implement physical dataset

Context about the current workspace:
- Workspace: ${workspace.name}
- Available Physical Datasets: ${physicalDatasets.length}
- Business Datasets: ${businessDatasets.length}

When helping users:
- Always explain your reasoning
- Provide confidence scores with explanations
- Suggest alternatives when appropriate
- Validate data quality concerns
- Generate production-ready SQL code
- Be conversational and helpful`;

// Example user flow
const conversationFlow = [
  {
    user: "I have a business model called 'Customer Dimension' and I need to create the physical dimension. Can you help?",
    
    assistant_action: async () => {
      // 1. Analyze business dataset
      const analysis = await mcpClient.callTool({
        name: "analyze_business_dataset",
        arguments: {
          business_dataset_id: businessDatasetId,
          workspace_id: workspaceId
        }
      });
      
      // 2. Find similar physical datasets
      const recommendations = await mcpClient.callTool({
        name: "find_similar_physical_datasets",
        arguments: {
          business_dataset_id: businessDatasetId,
          workspace_id: workspaceId,
          max_results: 3
        }
      });
      
      // 3. Respond with recommendations
      return `I've analyzed your "Customer Dimension" business model and found ${recommendations.length} potential physical datasets:

1. **stg_customers** (95% match)
   - High semantic similarity: Contains customer_id, name, email, segment
   - Excellent data quality: 95% completeness, updated 2 hours ago
   - Frequently used in customer analytics workflows
   
2. **crm_accounts** (78% match)
   - Good structural match but requires transformations
   - Contains account-level data that needs customer-level aggregation
   
3. **salesforce_contacts** (72% match)
   - Contains basic customer info but missing segment data

Would you like to proceed with **stg_customers**? I can show you the proposed column mappings.`;
    }
  },
  
  {
    user: "Yes, use stg_customers. Show me the mappings.",
    
    assistant_action: async () => {
      // Generate column mappings
      const mappings = await mcpClient.callTool({
        name: "generate_column_mappings",
        arguments: {
          business_dataset_id: businessDatasetId,
          physical_dataset_id: physicalDatasetId,
          workspace_id: workspaceId
        }
      });
      
      return `Here are the proposed column mappings:

**Direct Mappings** (no transformation):
• customer_key ← customer_id (100% confidence)
• email ← email (100% confidence)

**Derived Mappings** (transformation required):
• customer_name ← CONCAT(first_name, ' ', last_name) (95% confidence)
• customer_segment ← CASE 
    WHEN segment_code = 'A' THEN 'Premium'
    WHEN segment_code = 'B' THEN 'Standard'
    ELSE 'Basic'
  END (88% confidence)

**Missing Columns**:
• customer_lifetime_value - Not available in stg_customers
  Suggestion: Calculate from fct_orders using SUM(order_amount)

Would you like me to:
1. Create the dimension with these mappings
2. Modify the mappings
3. Add calculated columns`;
    }
  },
  
  {
    user: "Create the dimension with Type 2 SCD",
    
    assistant_action: async () => {
      // Create physical dataset
      const result = await mcpClient.callTool({
        name: "create_physical_from_business",
        arguments: {
          business_dataset_id: businessDatasetId,
          mapping_id: mappingId,
          workspace_id: workspaceId,
          target_layer: "Gold",
          scd_type: 2
        }
      });
      
      return `✅ Successfully created **dim_customer** dimension!

Created Features:
• Dataset: gold.dim_customer
• Type: Dimension (Type 2 SCD)
• Columns: 10 (8 mapped + 2 SCD tracking)
• Lineage: Automatic lineage created to stg_customers
• SQL Script: Generated and saved

SCD Tracking Columns Added:
• effective_date: When record became active
• end_date: When record became inactive (NULL for current)
• is_current: Boolean flag for current records

Next Steps:
1. Review the generated SQL in the Templates section
2. Deploy to Databricks using the workflow templates
3. Set up incremental refresh logic

Would you like me to:
- Show you the generated SQL
- Create a workflow template for this dimension
- Set up data quality tests`;
    }
  }
];
```

## 5. Implementation Workflow

### 5.1 Create Business Model
```typescript
async function createBusinessModel(
  workspaceId: string,
  params: {
    name: string;
    description: string;
    entity_type: 'Dimension' | 'Fact' | 'Table';
    columns: Array<{
      name: string;
      data_type: string;
      description?: string;
      business_name?: string;
    }>;
    business_context?: {
      business_owner?: string;
      domain?: string;
      glossary_terms?: string[];
      business_rules?: Array<BusinessRule>;
      kpis?: Array<KPI>;
    };
  }
): Promise<Dataset> {
  // 1. Create conceptual dataset
  const dataset = await datasetService.createDataset({
    workspace_id: workspaceId,
    name: params.name,
    description: params.description,
    entity_type: params.entity_type,
    materialization_type: 'Conceptual',
    is_conceptual: true,
    business_context: params.business_context
  });
  
  // 2. Create columns
  for (const col of params.columns) {
    await columnService.createColumn({
      dataset_id: dataset.id,
      name: col.name,
      data_type: col.data_type,
      description: col.description,
      business_name: col.business_name
    });
  }
  
  // 3. Add to workspace canvas
  await workspaceDatasetService.addDatasetToWorkspace({
    workspace_id: workspaceId,
    dataset_id: dataset.id,
    canvas_position: { x: 100, y: 100 }
  });
  
  return dataset;
}
```

### 5.2 Request AI Recommendations
```typescript
async function requestMappingRecommendations(
  businessDatasetId: string,
  workspaceId: string,
  context?: string
): Promise<MappingRecommendation[]> {
  // 1. Analyze business dataset
  const businessDataset = await datasetService.getDataset(businessDatasetId);
  const businessColumns = await columnService.getColumns(businessDatasetId);
  
  // 2. Get all physical datasets in workspace
  const physicalDatasets = await datasetService.getDatasets({
    workspace_id: workspaceId,
    is_conceptual: false
  });
  
  // 3. Call AI service to analyze and score
  const recommendations: MappingRecommendation[] = [];
  
  for (const physicalDataset of physicalDatasets) {
    const physicalColumns = await columnService.getColumns(physicalDataset.id);
    
    // Calculate similarity scores
    const semanticScore = await calculateSemanticSimilarity(
      businessDataset,
      physicalDataset
    );
    
    const structuralScore = await calculateStructuralSimilarity(
      businessColumns,
      physicalColumns
    );
    
    const relationshipScore = await analyzeRelationshipMatch(
      businessDataset,
      physicalDataset,
      workspaceId
    );
    
    // Get usage patterns from audit logs
    const usageScore = await calculateUsageScore(physicalDataset.id);
    
    // Domain alignment
    const domainScore = await calculateDomainAlignment(
      businessDataset.business_context?.domain,
      physicalDataset.metadata?.domain
    );
    
    // Data quality score
    const qualityScore = await calculateDataQualityScore(physicalDataset.id);
    
    // Calculate overall confidence
    const confidenceScore = calculateOverallConfidence(
      semanticScore,
      structuralScore,
      relationshipScore,
      usageScore,
      domainScore,
      qualityScore
    );
    
    // Only include if above threshold
    if (confidenceScore >= 70) {
      recommendations.push({
        business_dataset_id: businessDatasetId,
        recommended_physical_dataset_id: physicalDataset.id,
        confidence_score: confidenceScore,
        match_factors: {
          semantic_similarity: { score: semanticScore },
          structural_similarity: { score: structuralScore },
          relationship_match: { score: relationshipScore },
          usage_patterns: { score: usageScore },
          domain_alignment: { score: domainScore },
          data_quality: { score: qualityScore }
        },
        ai_explanation: await generateExplanation(
          businessDataset,
          physicalDataset,
          {
            semanticScore,
            structuralScore,
            relationshipScore,
            usageScore,
            domainScore,
            qualityScore
          }
        )
      });
    }
  }
  
  // 4. Sort by confidence score
  recommendations.sort((a, b) => b.confidence_score - a.confidence_score);
  
  // 5. Save recommendations
  for (let i = 0; i < recommendations.length; i++) {
    await supabase.from('ai_mapping_recommendations').insert({
      ...recommendations[i],
      recommendation_rank: i + 1,
      workspace_id: workspaceId,
      account_id: (await getWorkspace(workspaceId)).account_id
    });
  }
  
  return recommendations;
}
```

### 5.3 Create Physical Mapping
```typescript
async function createPhysicalMapping(
  businessDatasetId: string,
  physicalDatasetId: string,
  workspaceId: string
): Promise<BusinessPhysicalMapping> {
  // 1. Generate column mappings
  const businessColumns = await columnService.getColumns(businessDatasetId);
  const physicalColumns = await columnService.getColumns(physicalDatasetId);
  
  const columnMappings = await generateColumnMappings(
    businessColumns,
    physicalColumns
  );
  
  // 2. Generate transformation SQL
  const transformationSql = await generateTransformationSQL(
    businessDatasetId,
    physicalDatasetId,
    columnMappings
  );
  
  // 3. Calculate mapping confidence
  const mappingConfidence = calculateMappingConfidence(columnMappings);
  
  // 4. Create mapping record
  const mapping = await supabase
    .from('business_physical_mappings')
    .insert({
      business_dataset_id: businessDatasetId,
      physical_dataset_id: physicalDatasetId,
      workspace_id: workspaceId,
      account_id: (await getWorkspace(workspaceId)).account_id,
      mapping_confidence: mappingConfidence,
      mapping_status: 'draft',
      mapping_type: determineMappingType(columnMappings),
      column_mappings: columnMappings,
      transformation_sql: transformationSql,
      created_by: getCurrentUserId()
    })
    .select()
    .single();
  
  return mapping.data;
}
```

### 5.4 Implement Physical Dataset
```typescript
async function implementPhysicalDataset(
  mappingId: string,
  options: {
    target_layer: 'Bronze' | 'Silver' | 'Gold';
    scd_type?: 0 | 1 | 2 | 3;
    auto_create_lineage?: boolean;
  }
): Promise<Dataset> {
  // 1. Get mapping details
  const mapping = await supabase
    .from('business_physical_mappings')
    .select('*, business_dataset:datasets!business_dataset_id(*), physical_dataset:datasets!physical_dataset_id(*)')
    .eq('id', mappingId)
    .single();
  
  const { business_dataset, physical_dataset, column_mappings, transformation_sql } = mapping.data;
  
  // 2. Create new physical dataset
  const newDataset = await datasetService.createDataset({
    workspace_id: mapping.data.workspace_id,
    name: business_dataset.name, // Use business name
    description: business_dataset.description,
    medallion_layer: options.target_layer,
    entity_type: business_dataset.entity_type,
    entity_subtype: business_dataset.entity_subtype,
    materialization_type: 'Table',
    is_conceptual: false,
    metadata: {
      ...business_dataset.metadata,
      source_business_model: business_dataset.id,
      scd_type: options.scd_type
    }
  });
  
  // 3. Create columns based on mappings
  for (const mapping of column_mappings.mappings) {
    const businessColumn = await columnService.getColumn(mapping.business_column_id);
    
    await columnService.createColumn({
      dataset_id: newDataset.id,
      name: businessColumn.name,
      data_type: businessColumn.data_type,
      description: businessColumn.description,
      business_name: businessColumn.business_name,
      transformation_logic: mapping.transformation
    });
  }
  
  // 4. Add SCD tracking columns if Type 2
  if (options.scd_type === 2) {
    await columnService.createColumn({
      dataset_id: newDataset.id,
      name: 'effective_date',
      data_type: 'DATE',
      description: 'Date when this version became effective',
      is_nullable: false
    });
    
    await columnService.createColumn({
      dataset_id: newDataset.id,
      name: 'end_date',
      data_type: 'DATE',
      description: 'Date when this version expired (NULL for current)',
      is_nullable: true
    });
    
    await columnService.createColumn({
      dataset_id: newDataset.id,
      name: 'is_current',
      data_type: 'BOOLEAN',
      description: 'Flag indicating if this is the current version',
      is_nullable: false,
      default_value: 'true'
    });
  }
  
  // 5. Create lineage from physical source to new dataset
  if (options.auto_create_lineage) {
    const newColumns = await columnService.getColumns(newDataset.id);
    const sourceColumns = await columnService.getColumns(physical_dataset.id);
    
    for (const mapping of column_mappings.mappings) {
      const targetColumn = newColumns.find(c => c.name === mapping.business_column_name);
      const sourceColumn = sourceColumns.find(c => c.id === mapping.physical_column_id);
      
      if (targetColumn && sourceColumn) {
        await lineageService.createLineage({
          workspace_id: mapping.data.workspace_id,
          downstream_dataset_id: newDataset.id,
          downstream_column_id: targetColumn.id,
          upstream_dataset_id: physical_dataset.id,
          upstream_column_id: sourceColumn.id,
          mapping_type: mapping.transformation ? 'Transform' : 'Direct',
          transformation_expression: mapping.transformation
        });
      }
    }
  }
  
  // 6. Update mapping status
  await supabase
    .from('business_physical_mappings')
    .update({
      mapping_status: 'implemented',
      updated_at: new Date()
    })
    .eq('id', mappingId);
  
  // 7. Generate SQL script (stored in templates)
  await generateDDLTemplate(newDataset.id, transformation_sql);
  
  return newDataset;
}
