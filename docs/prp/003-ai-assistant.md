# Product Requirements Document: AI Assistant Integration
## Conversational Data Modeling & Architecture Recommendations

## Executive Summary

Extend the Databricks Automation Script Generator with an AI-powered conversational assistant that enables users to request data models, architectural patterns, and script generation through natural language. The assistant leverages Claude with MCP servers to provide intelligent recommendations based on existing schemas, best practices, and Databricks optimization patterns.

## Product Vision

Transform data modeling from a manual, technical process into a conversational experience where users can describe their requirements in plain English and receive production-ready data models, architectures, and scripts.

## Core Value Proposition

- **Natural Language to Data Models** - "Create a dimension based on product and category" → Full dimensional model
- **Architecture Recommendations** - "Recommend a data vault model optimized for Databricks" → Complete hub, link, satellite structure
- **Intelligent Context Awareness** - Assistant understands existing schema, relationships, and organizational patterns
- **Best Practice Guidance** - Automatically applies Databricks optimizations (partitioning, Z-ordering, liquid clustering)
- **Interactive Refinement** - Users can iterate on suggestions through conversation

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     React Frontend                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Chat Interface (AI Assistant)                       │   │
│  │  - Natural language input                            │   │
│  │  - Streaming responses                               │   │
│  │  - Visual model preview                              │   │
│  └─────────────────────────────────────────────────────┘   │
│                            │                                 │
│                            ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  React Flow Canvas                                   │   │
│  │  - Auto-generated from AI suggestions                │   │
│  │  - User can modify and refine                        │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │ WebSocket / HTTP
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   Backend API Server                         │
│                   (Node.js / FastAPI)                        │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Claude Integration Layer                             │  │
│  │  - Prompt engineering                                 │  │
│  │  - Context management                                 │  │
│  │  - Response streaming                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                            │                                 │
│                            ▼                                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  MCP Server Manager                                   │  │
│  │  - Orchestrates multiple MCP servers                  │  │
│  │  - Routes tool calls                                  │  │
│  │  - Caches results                                     │  │
│  └──────────────────────────────────────────────────────┘  │
│         │              │              │              │       │
│         ▼              ▼              ▼              ▼       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ Schema   │  │ Pattern  │  │ Template │  │Databricks│  │
│  │ Analysis │  │ Library  │  │Generator │  │Optimizer │  │
│  │   MCP    │  │   MCP    │  │   MCP    │  │   MCP    │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Technical Architecture

### Backend Server Options

**Option 1: Node.js + TypeScript (Recommended)**
```typescript
// Advantages:
// - Same language as frontend
// - Excellent MCP SDK support (@modelcontextprotocol/sdk)
// - Great WebSocket support
// - Easy deployment (Vercel, Railway, Render)

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import Anthropic from '@anthropic-ai/sdk';
```

**Option 2: Python + FastAPI**
```python
# Advantages:
# - Better for complex data processing
# - Native Jinja2 support
# - Rich data engineering libraries (pandas, sqlglot)
# - Strong typing with Pydantic

from fastapi import FastAPI, WebSocket
from anthropic import Anthropic
from mcp import Server
```

**Recommendation**: Start with **Node.js** for consistency, migrate to Python if heavy data processing is needed.

### MCP Server Architecture

Create **specialized MCP servers** that Claude can use to fulfill user requests:

## MCP Server Specifications

### 1. Schema Analysis MCP Server

**Purpose**: Analyze existing database schemas and extract metadata for intelligent recommendations

**Server Name**: `schema-analyzer`

**Capabilities**
- Parse existing database schemas from Supabase
- Extract table relationships (foreign keys, implicit relationships)
- Identify naming patterns and conventions
- Detect data types and constraints
- Analyze column distributions and cardinality
- Identify potential dimension/fact candidates

**Tools to Expose**

```typescript
{
  name: "analyze_schema",
  description: "Analyze database schema and extract metadata",
  inputSchema: {
    type: "object",
    properties: {
      workspace_id: { type: "string" },
      tables: { 
        type: "array",
        items: { type: "string" },
        description: "Table names to analyze (e.g., ['product', 'productcategory'])"
      }
    }
  }
}

{
  name: "find_relationships",
  description: "Discover relationships between tables",
  inputSchema: {
    type: "object",
    properties: {
      source_table: { type: "string" },
      target_table: { type: "string" },
      workspace_id: { type: "string" }
    }
  }
}

{
  name: "suggest_keys",
  description: "Recommend primary/foreign key candidates",
  inputSchema: {
    type: "object",
    properties: {
      table_name: { type: "string" },
      workspace_id: { type: "string" }
    }
  }
}

{
  name: "get_table_metadata",
  description: "Get detailed metadata for specific tables",
  inputSchema: {
    type: "object",
    properties: {
      table_names: { type: "array", items: { type: "string" } },
      workspace_id: { type: "string" },
      include_stats: { type: "boolean", default: true }
    }
  }
}

{
  name: "detect_modeling_patterns",
  description: "Identify existing modeling patterns in schema",
  inputSchema: {
    type: "object",
    properties: {
      workspace_id: { type: "string" }
    }
  }
}
```

**Response Format**
```json
{
  "tables": [
    {
      "name": "product",
      "columns": [
        {
          "name": "product_id",
          "type": "integer",
          "nullable": false,
          "is_primary_key": true,
          "cardinality": "high"
        },
        {
          "name": "category_id",
          "type": "integer",
          "nullable": false,
          "is_foreign_key": true,
          "references": "productcategory.category_id"
        }
      ],
      "row_count": 15000,
      "modeling_suggestions": {
        "type": "fact_candidate",
        "reason": "High cardinality, many foreign keys"
      }
    }
  ],
  "relationships": [
    {
      "type": "many_to_one",
      "from": "product.category_id",
      "to": "productcategory.category_id"
    }
  ]
}
```

### 2. Pattern Library MCP Server

**Purpose**: Provide access to data modeling patterns, best practices, and templates

**Server Name**: `pattern-library`

**Capabilities**
- Store and retrieve data modeling patterns
- Data Vault 2.0 patterns (Hubs, Links, Satellites)
- Kimball dimensional modeling patterns (Dimensions, Facts, Bridges)
- Databricks-specific optimizations
- Industry-specific patterns (retail, finance, healthcare)

**Tools to Expose**

```typescript
{
  name: "get_pattern",
  description: "Retrieve a specific modeling pattern",
  inputSchema: {
    type: "object",
    properties: {
      pattern_type: { 
        type: "string",
        enum: ["data_vault", "kimball_dimension", "kimball_fact", 
               "bridge_table", "slowly_changing_dimension"]
      },
      optimization: {
        type: "string",
        enum: ["databricks", "general", "high_volume", "real_time"]
      }
    }
  }
}

{
  name: "recommend_pattern",
  description: "Recommend patterns based on table characteristics",
  inputSchema: {
    type: "object",
    properties: {
      table_metadata: { type: "object" },
      use_case: { type: "string" },
      scale: { type: "string", enum: ["small", "medium", "large", "xlarge"] }
    }
  }
}

{
  name: "get_databricks_optimizations",
  description: "Get Databricks-specific optimization recommendations",
  inputSchema: {
    type: "object",
    properties: {
      pattern_type: { type: "string" },
      data_volume: { type: "string" },
      access_pattern: { 
        type: "string",
        enum: ["batch", "streaming", "interactive", "mixed"]
      }
    }
  }
}

{
  name: "list_patterns",
  description: "List available patterns with descriptions",
  inputSchema: {
    type: "object",
    properties: {
      category: { type: "string" },
      tags: { type: "array", items: { type: "string" } }
    }
  }
}
```

**Pattern Examples**

```yaml
# Data Vault Hub Pattern
patterns:
  - id: dv_hub
    name: "Data Vault Hub"
    category: "data_vault"
    description: "Core business entity with unique business key"
    databricks_optimizations:
      - liquid_clustering: ["hub_key"]
      - delta_features: ["change_data_feed", "deletion_vectors"]
    structure:
      required_columns:
        - name: "{entity}_hub_key"
          type: "BIGINT"
          description: "Surrogate key (sequence or hash)"
        - name: "{entity}_business_key"
          type: "STRING"
          description: "Natural business key"
        - name: "load_date"
          type: "TIMESTAMP"
          description: "When record loaded"
        - name: "record_source"
          type: "STRING"
          description: "Source system identifier"
      partitioning:
        columns: ["load_date"]
        strategy: "date_trunc('day', load_date)"
      constraints:
        - type: "primary_key"
          columns: ["{entity}_hub_key"]
        - type: "unique"
          columns: ["{entity}_business_key"]
    jinja_template: |
      CREATE TABLE {{ catalog }}.{{ schema }}.hub_{{ entity_name }}
      (
        {{ entity_name }}_hub_key BIGINT GENERATED ALWAYS AS IDENTITY,
        {{ entity_name }}_business_key STRING NOT NULL,
        load_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
        record_source STRING NOT NULL,
        CONSTRAINT pk_hub_{{ entity_name }} PRIMARY KEY({{ entity_name }}_hub_key),
        CONSTRAINT uk_hub_{{ entity_name }} UNIQUE({{ entity_name }}_business_key)
      )
      USING DELTA
      CLUSTER BY ({{ entity_name }}_hub_key)
      PARTITIONED BY (DATE(load_date))
      TBLPROPERTIES (
        'delta.enableChangeDataFeed' = 'true',
        'delta.enableDeletionVectors' = 'true'
      );

# Kimball Type 2 SCD
  - id: kimball_scd_type2
    name: "Slowly Changing Dimension - Type 2"
    category: "kimball"
    description: "Track historical changes with effective dates"
    databricks_optimizations:
      - z_order: ["natural_key"]
      - delta_features: ["change_data_feed"]
      - partitioning: "effective_date"
    structure:
      required_columns:
        - name: "{dimension}_key"
          type: "BIGINT"
          description: "Surrogate key"
        - name: "{dimension}_natural_key"
          type: "STRING"
          description: "Business key"
        - name: "effective_date"
          type: "DATE"
        - name: "end_date"
          type: "DATE"
        - name: "is_current"
          type: "BOOLEAN"
    jinja_template: |
      CREATE TABLE {{ catalog }}.{{ schema }}.dim_{{ dimension_name }}
      (
        {{ dimension_name }}_key BIGINT GENERATED ALWAYS AS IDENTITY,
        {{ dimension_name }}_natural_key STRING NOT NULL,
        {% for attr in attributes %}
        {{ attr.name }} {{ attr.type }},
        {% endfor %}
        effective_date DATE NOT NULL,
        end_date DATE,
        is_current BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT pk_dim_{{ dimension_name }} PRIMARY KEY({{ dimension_name }}_key)
      )
      USING DELTA
      PARTITIONED BY (effective_date)
      TBLPROPERTIES (
        'delta.enableChangeDataFeed' = 'true'
      );
```

### 3. Model Generator MCP Server

**Purpose**: Generate React Flow models and YAML metadata from natural language descriptions

**Server Name**: `model-generator`

**Capabilities**
- Convert natural language to React Flow node structures
- Generate YAML metadata files
- Create Jinja2 templates for scripts
- Apply naming conventions
- Generate documentation

**Tools to Expose**

```typescript
{
  name: "generate_dimensional_model",
  description: "Generate Kimball dimensional model from source tables",
  inputSchema: {
    type: "object",
    properties: {
      source_tables: { type: "array", items: { type: "string" } },
      dimension_attributes: { type: "array", items: { type: "object" } },
      grain: { type: "string" },
      workspace_id: { type: "string" }
    }
  }
}

{
  name: "generate_data_vault_model",
  description: "Generate Data Vault 2.0 model (hubs, links, satellites)",
  inputSchema: {
    type: "object",
    properties: {
      source_tables: { type: "array", items: { type: "string" } },
      business_keys: { type: "object" },
      relationships: { type: "array" },
      workspace_id: { type: "string" }
    }
  }
}

{
  name: "generate_reactflow_nodes",
  description: "Convert data model to React Flow node/edge structure",
  inputSchema: {
    type: "object",
    properties: {
      model_spec: { type: "object" },
      layout: { type: "string", enum: ["hierarchical", "force", "circular"] }
    }
  }
}

{
  name: "generate_yaml_metadata",
  description: "Generate YAML metadata file for GitHub storage",
  inputSchema: {
    type: "object",
    properties: {
      model: { type: "object" },
      workspace_id: { type: "string" }
    }
  }
}

{
  name: "generate_templates",
  description: "Generate Jinja2 templates for model deployment",
  inputSchema: {
    type: "object",
    properties: {
      model: { type: "object" },
      template_types: { 
        type: "array", 
        items: { type: "string", enum: ["ddl", "etl", "dml", "test"] }
      }
    }
  }
}
```

**Response Format**
```json
{
  "reactflow_model": {
    "nodes": [
      {
        "id": "dim_product",
        "type": "dimension",
        "data": {
          "label": "Dim Product",
          "table_type": "dimension",
          "scd_type": 2,
          "columns": [...],
          "optimizations": {
            "partitioning": ["effective_date"],
            "clustering": ["product_natural_key"],
            "cdf_enabled": true
          }
        },
        "position": { "x": 100, "y": 100 }
      }
    ],
    "edges": [
      {
        "id": "e1",
        "source": "source_product",
        "target": "dim_product",
        "type": "data_flow"
      }
    ]
  },
  "yaml_metadata": "...",
  "templates": [
    {
      "type": "ddl",
      "content": "..."
    }
  ],
  "documentation": "..."
}
```

### 4. Databricks Optimizer MCP Server

**Purpose**: Provide Databricks-specific optimization recommendations

**Server Name**: `databricks-optimizer`

**Capabilities**
- Analyze table size and access patterns
- Recommend partitioning strategies
- Suggest clustering columns
- Recommend Delta Lake features
- Estimate costs and performance

**Tools to Expose**

```typescript
{
  name: "recommend_partitioning",
  description: "Recommend optimal partitioning strategy",
  inputSchema: {
    type: "object",
    properties: {
      table_name: { type: "string" },
      row_count: { type: "number" },
      access_pattern: { type: "string" },
      date_columns: { type: "array" }
    }
  }
}

{
  name: "recommend_clustering",
  description: "Recommend Z-Order or Liquid Clustering",
  inputSchema: {
    type: "object",
    properties: {
      table_name: { type: "string" },
      query_patterns: { type: "array" },
      cardinality: { type: "object" }
    }
  }
}

{
  name: "recommend_delta_features",
  description: "Recommend Delta Lake features (CDF, DV, etc.)",
  inputSchema: {
    type: "object",
    properties: {
      table_name: { type: "string" },
      use_case: { type: "string" },
      change_frequency: { type: "string" }
    }
  }
}

{
  name: "estimate_performance",
  description: "Estimate query performance and costs",
  inputSchema: {
    type: "object",
    properties: {
      model: { type: "object" },
      query_workload: { type: "string" }
    }
  }
}
```

## Backend API Design

### API Endpoints

```typescript
// Chat endpoint with streaming
POST /api/assistant/chat
Request: {
  workspace_id: string;
  message: string;
  context?: {
    current_model?: object;
    selected_tables?: string[];
  };
  stream: boolean;
}
Response: Server-Sent Events stream

// Get conversation history
GET /api/assistant/conversations/:workspace_id
Response: {
  conversations: Array<{
    id: string;
    messages: Array<{role: string, content: string}>;
    created_at: string;
  }>
}

// Apply AI suggestion to canvas
POST /api/assistant/apply-suggestion
Request: {
  workspace_id: string;
  suggestion_id: string;
  model_data: object;
}
Response: {
  success: boolean;
  model_id: string;
}

// Get available patterns
GET /api/assistant/patterns
Response: {
  patterns: Array<PatternDefinition>
}
```

### Backend Implementation Example

```typescript
// backend/src/assistant/handler.ts
import Anthropic from '@anthropic-ai/sdk';
import { MCPServerManager } from './mcp-manager';

export class AssistantHandler {
  private anthropic: Anthropic;
  private mcpManager: MCPServerManager;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    
    this.mcpManager = new MCPServerManager([
      'schema-analyzer',
      'pattern-library',
      'model-generator',
      'databricks-optimizer'
    ]);
  }

  async handleChat(request: ChatRequest): Promise<AsyncIterable<string>> {
    const { workspace_id, message, context } = request;

    // Build context from workspace
    const workspaceContext = await this.buildWorkspaceContext(workspace_id);
    
    // System prompt with MCP tool descriptions
    const systemPrompt = this.buildSystemPrompt(workspaceContext);

    // Stream response from Claude
    return this.anthropic.messages.stream({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: message
      }],
      tools: this.mcpManager.getToolDefinitions(),
    }).on('tool_use', async (toolUse) => {
      // Execute MCP tool
      const result = await this.mcpManager.executeTool(
        toolUse.name,
        toolUse.input
      );
      return result;
    });
  }

  private buildSystemPrompt(context: WorkspaceContext): string {
    return `You are an expert data architect specializing in Databricks and data modeling.

Current Workspace Context:
- Workspace: ${context.workspace_name}
- Available Tables: ${context.tables.join(', ')}
- Existing Models: ${context.existing_models.length}
- Modeling Patterns Used: ${context.patterns_used.join(', ')}

Your Role:
1. Help users design data models through conversation
2. Recommend appropriate modeling patterns (Data Vault, Kimball, etc.)
3. Apply Databricks optimizations automatically
4. Generate React Flow visualizations and YAML metadata
5. Create deployment-ready Jinja2 templates

You have access to MCP tools to:
- Analyze existing schemas (schema-analyzer)
- Retrieve modeling patterns (pattern-library)
- Generate models and templates (model-generator)
- Optimize for Databricks (databricks-optimizer)

When a user asks to "create a dimension based on product and productcategory tables":
1. Use schema-analyzer to get table metadata
2. Use pattern-library to get Kimball dimension pattern
3. Use model-generator to create the dimension model
4. Use databricks-optimizer to add optimizations
5. Return React Flow JSON and YAML for the user to review

Always explain your recommendations and allow the user to refine them.`;
  }
}
```

### MCP Server Manager

```typescript
// backend/src/assistant/mcp-manager.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export class MCPServerManager {
  private clients: Map<string, Client> = new Map();

  constructor(serverNames: string[]) {
    this.initializeServers(serverNames);
  }

  private async initializeServers(serverNames: string[]) {
    for (const name of serverNames) {
      const transport = new StdioClientTransport({
        command: 'node',
        args: [`./mcp-servers/${name}/dist/index.js`],
      });

      const client = new Client({
        name: `mcp-client-${name}`,
        version: '1.0.0',
      }, {
        capabilities: {}
      });

      await client.connect(transport);
      this.clients.set(name, client);
    }
  }

  getToolDefinitions() {
    const tools = [];
    for (const [serverName, client] of this.clients) {
      const serverTools = client.listTools();
      tools.push(...serverTools);
    }
    return tools;
  }

  async executeTool(toolName: string, input: any) {
    // Find which server has this tool
    for (const [serverName, client] of this.clients) {
      const tools = await client.listTools();
      if (tools.some(t => t.name === toolName)) {
        return await client.callTool({ name: toolName, arguments: input });
      }
    }
    throw new Error(`Tool ${toolName} not found`);
  }
}
```

## Frontend Implementation

### Chat Interface Component

```typescript
// frontend/src/components/AIAssistant/ChatInterface.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  suggestion?: ModelSuggestion;
}

interface ModelSuggestion {
  reactflow_model: any;
  yaml_metadata: string;
  templates: any[];
}

export function ChatInterface({ workspaceId, onApplySuggestion }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Stream response from backend
      const response = await fetch('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          message: input,
          stream: true
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let currentSuggestion = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === 'content') {
              assistantMessage += data.text;
              // Update message in real-time
              setMessages(prev => {
                const newMessages = [...prev];
                const lastMsg = newMessages[newMessages.length - 1];
                if (lastMsg?.role === 'assistant') {
                  lastMsg.content = assistantMessage;
                } else {
                  newMessages.push({
                    role: 'assistant',
                    content: assistantMessage
                  });
                }
                return newMessages;
              });
            } else if (data.type === 'suggestion') {
              currentSuggestion = data.suggestion;
            }
          }
        }
      }

      // Add final suggestion
      if (currentSuggestion) {
        setMessages(prev => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].suggestion = currentSuggestion;
          return newMessages;
        });
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplySuggestion = (suggestion: ModelSuggestion) => {
    onApplySuggestion(suggestion);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-semibold">AI Data Architect</h2>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Ask me to design models, recommend patterns, or generate scripts
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              
              {msg.suggestion && (
                <div className="mt-4 p-3 bg-white rounded border">
                  <h4 className="font-semibold mb-2">Suggested Model</h4>
                  <div className="text-sm space-y-2">
                    <div>
                      Nodes: {msg.suggestion.reactflow_model.nodes.length}
                    </div>
                    <div>
                      Templates: {msg.suggestion.templates.length}
                    </div>
                    <button
                      onClick={() => handleApplySuggestion(msg.suggestion)}
                      className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Apply to Canvas
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Describe the model you want to create..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
        
        {/* Example prompts */}
        <div className="mt-2 flex flex-wrap gap-2">
          {[
            "Create a dimension from product and category tables",
            "Recommend a data vault model optimized for Databricks",
            "Generate a Type 2 SCD for customers"
          ].map((example, idx) => (
            <button
              key={idx}
              onClick={() => setInput(example)}
              className="text-xs px-2 py-1 bg-gray-100 rounded hover:bg-gray-200"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

## Conversation Examples

### Example 1: Create Dimension

**User**: "I need to create a dimension based on the product and productcategory tables"

**Claude (via MCP tools)**:
1. Calls `schema-analyzer.get_table_metadata(['product', 'productcategory'])`
2. Calls `pattern-library.get_pattern('kimball_dimension')`
3. Calls `model-generator.generate_dimensional_model(...)`
4. Calls `databricks-optimizer.recommend_clustering(...)`

**Response**:
```
I'll create a Type 2 Slowly Changing Dimension for products with their categories. 

Based on your schema analysis:
- Product table has 15,247 rows with product_id as primary key
- ProductCategory has 47 categories with category_id as primary key
- Many-to-one relationship: product.category_id → productcategory.category_id

I'm recommending:
✅ Type 2 SCD to track historical product changes
✅ Liquid clustering on product_natural_key for efficient lookups
✅ Partitioning by effective_date for time-travel queries
✅ Change Data Feed enabled for downstream consumers

Here's the model I've generated:
[Shows React Flow preview]

The dimension includes:
- Product attributes: name, description, price
- Category attributes: category_name, category_description
- SCD tracking: effective_date, end_date, is_current
- Optimizations: Liquid clustering, CDF enabled

Would you like me to:
1. Add more attributes from the source tables?
2. Change the SCD type (Type 1, Type 3)?
3. Generate the deployment scripts?
```

### Example 2: Data Vault Recommendation

**User**: "Can you recommend a data vault model for the product and productcategory tables that is optimized for Databricks loads?"

**Claude**:
```
I'll design a Data Vault 2.0 model optimized for high-volume Databricks loads.

After analyzing your schema, here's my recommendation:

**Hubs** (Core Business Entities):
1. Hub_Product
   - product_hub_key (BIGINT, sequence)
   - product_business_key (STRING)
   - load_date, record_source

2. Hub_ProductCategory  
   - category_hub_key (BIGINT)
   - category_business_key (STRING)
   - load_date, record_source

**Link** (Relationship):
3. Link_Product_Category
   - link_key (BIGINT)
   - product_hub_key (FK)
   - category_hub_key (FK)
   - load_date, record_source

**Satellites** (Descriptive Attributes):
4. Sat_Product_Details
   - product_hub_key (FK)
   - load_date, load_end_date
   - product_name, description, price
   - hash_diff (for change detection)

5. Sat_Category_Details
   - category_hub_key (FK)
   - load_date, load_end_date
   - category_name, description
   - hash_diff

**Databricks Optimizations**:
✅ Liquid Clustering on hub keys (10x faster joins)
✅ Partitioned by load_date for time-based queries
✅ Change Data Feed enabled for real-time streaming
✅ Deletion Vectors for efficient updates
✅ IDENTITY columns for auto-incrementing keys

**Loading Strategy**:
- Parallel hub loading (no dependencies)
- Link loading after hubs complete
- Satellite loading can run concurrently
- Auto Loader for continuous ingestion

Estimated load performance:
- Initial load: ~5 min for 15K products
- Incremental: <30s for 1K changes
- Cost: ~$0.50 per run on standard cluster

[React Flow visualization showing all 5 tables with connections]

Shall I generate the DDL scripts and merge pipelines?
```

## User Experience Flow

1. **User Opens AI Assistant** (sidebar or modal in app)
2. **Types Natural Language Request**
   - "Create a dimension..."
   - "Recommend a pattern..."
   - "Generate scripts for..."
3. **Claude Analyzes Request**
   - Determines which MCP tools to use
   - Gathers workspace context
   - Retrieves relevant patterns
4. **Claude Responds with Explanation**
   - Describes the approach
   - Shows recommendations
   - Displays visual preview
5. **User Reviews Suggestion**
   - Sees React Flow preview inline
   - Reviews YAML metadata
   - Checks generated templates
6. **User Iterates or Applies**
   - "Can you make it Type 1 instead?"
   - "Add more columns"
   - OR clicks "Apply to Canvas"
7. **Model Applied to React Flow**
   - Nodes/edges added to canvas
   - User can further customize
   - Ready to generate scripts

## Implementation Phases

### Phase 1: Backend Foundation (Week 1-2)
- Set up Node.js backend with Express/Fastify
- Integrate Anthropic SDK
- Create MCP server manager
- Implement basic chat endpoint

### Phase 2: MCP Server Development (Week 3-5)
- Build Schema Analysis MCP server
- Build Pattern Library MCP server
- Build Model Generator MCP server
- Build Databricks Optimizer MCP server
- Test each server independently

### Phase 3: Frontend Integration (Week 6-7)
- Build chat interface component
- Implement streaming response handling
- Create model preview components
- Add "Apply to Canvas" functionality

### Phase 4: Context & Intelligence (Week 8-9)
- Workspace context loading
- Conversation history
- Multi-turn conversations
- Suggestion refinement

### Phase 5: Patterns & Templates (Week 10-11)
- Populate pattern library
- Create Jinja2 templates for common patterns
- Add Databricks optimization rules
- Industry-specific patterns

### Phase 6: Testing & Polish (Week 12)
- End-to-end testing
- Performance optimization
- Error handling
- Documentation

## Technical Requirements

### Backend Infrastructure

**Hosting Options**:
- Railway (recommended for MCP + WebSockets)
- Render
- AWS ECS/Fargate
- Google Cloud Run

**Environment Variables**:
```env
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://...
SUPABASE_SERVICE_KEY=...
DATABASE_URL=postgresql://...
GITHUB_TOKEN=ghp_...
NODE_ENV=production
```

**Dependencies**:
```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.30.0",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "express": "^4.18.0",
    "ws": "^8.16.0",
    "@supabase/supabase-js": "^2.39.0",
    "zod": "^3.22.0"
  }
}
```

## Success Metrics

- **Conversation Success Rate**: >90% of requests result in valid suggestions
- **Time to Model**: <2 minutes from request to applied model
- **User Satisfaction**: >4.5/5 for AI recommendations
- **Iteration Reduction**: 60% fewer manual adjustments needed
- **Pattern Adoption**: >80% of generated models use recommended patterns

## Security Considerations

- **API Key Management**: Store Anthropic API key securely (env vars, secrets manager)
- **Rate Limiting**: Limit requests per user/workspace
- **Input Validation**: Sanitize all user inputs before passing to Claude
- **Output Validation**: Validate generated models before applying
- **Audit Logging**: Log all AI interactions for compliance
- **Cost Controls**: Set token limits and track usage

## Future Enhancements

- **Voice Input**: Speak your requirements
- **Visual Refinement**: Drag nodes to adjust AI suggestions
- **Learning**: AI learns from user modifications
- **Collaborative Mode**: Multiple users interact with same AI session
- **Template Marketplace**: Share and discover patterns
- **Multi-Model Support**: Switch between Claude/GPT/Gemini
- **Offline Mode**: Local LLM for sensitive data

## Cost Estimation

**Anthropic API Costs** (Claude Sonnet 4.5):
- Input: $3 per million tokens
- Output: $15 per million tokens

**Typical Conversation**:
- Input: ~5K tokens (schema + context + message)
- Output: ~2K tokens (response + model)
- Cost per exchange: ~$0.045
- 100 conversations/day: ~$4.50/day = $135/month

**MCP Server Costs**:
- Compute: ~$20-50/month (always-on backend)
- Storage: Negligible

**Total**: ~$155-185/month for 100 conversations/day

## Conclusion

This AI assistant transforms your Databricks automation tool into an intelligent design partner. Users can describe what they want in plain English and receive production-ready, optimized data models in seconds.

The MCP architecture ensures:
- **Extensibility**: Easy to add new patterns and capabilities
- **Maintainability**: Each server has a single responsibility
- **Testability**: Servers can be tested independently
- **Scalability**: Servers can be scaled independently

Combined with your existing visual designer and template system, this creates a powerful end-to-end solution for Databricks automation.