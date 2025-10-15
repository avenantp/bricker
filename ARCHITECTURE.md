# Uroq Architecture

This document describes the complete architecture of the Uroq Databricks Automation Builder.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              React Frontend (Port 5173)                     │ │
│  │                                                              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │ │
│  │  │ Chat         │  │ React Flow   │  │ Properties      │  │ │
│  │  │ Interface    │  │ Canvas       │  │ Panel           │  │ │
│  │  └──────────────┘  └──────────────┘  └─────────────────┘  │ │
│  │                                                              │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │          Zustand State Management                     │  │ │
│  │  │  - Workspace, Models, Nodes, Edges, Messages          │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └──────────────────────────────────────────────────────────── │
└─────────────────────────────────────────────────────────────────┘
                              ↓ HTTP/SSE
┌─────────────────────────────────────────────────────────────────┐
│                    Node.js Backend (Port 3001)                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Express API Server                                         │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │ │
│  │  │ Chat         │  │ Patterns     │  │ Status          │  │ │
│  │  │ Endpoint     │  │ Endpoint     │  │ Endpoint        │  │ │
│  │  └──────────────┘  └──────────────┘  └─────────────────┘  │ │
│  │                                                              │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │          Assistant Handler                            │  │ │
│  │  │  - Claude integration                                 │  │ │
│  │  │  - Context building                                   │  │ │
│  │  │  - Streaming responses                                │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  │                                                              │ │
│  │  ┌──────────────────────────────────────────────────────┐  │ │
│  │  │          MCP Server Manager                           │  │ │
│  │  │  - Manages 4 MCP server connections                   │  │ │
│  │  │  - Routes tool calls                                  │  │ │
│  │  │  - Aggregates tool definitions                        │  │ │
│  │  └──────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓ Stdio
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Servers                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Schema       │  │ Pattern      │  │ Model        │          │
│  │ Analyzer     │  │ Library      │  │ Generator    │          │
│  │              │  │              │  │              │          │
│  │ 5 tools      │  │ 4 tools      │  │ 5 tools      │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│  ┌──────────────┐                                               │
│  │ Databricks   │                                               │
│  │ Optimizer    │                                               │
│  │              │                                               │
│  │ 4 tools      │                                               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   External Services                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Anthropic    │  │ Supabase     │  │ GitHub       │          │
│  │ (Claude)     │  │ (Database)   │  │ (Metadata)   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. User Initiates Chat

```
User types message → Chat Interface → useChat hook → API Client
→ POST /api/assistant/chat → Assistant Handler → Claude API
→ Claude analyzes & calls MCP tools → MCP Server Manager
→ Individual MCP servers execute tools → Return results to Claude
→ Claude synthesizes response → Stream to frontend → Update UI
```

### 2. Apply AI Suggestion

```
User clicks "Apply to Canvas" → ChatMessage component
→ setNodes/setEdges in Zustand store → React Flow re-renders
→ Custom TableNode components display → Canvas updates visually
```

### 3. Manual Node Creation

```
User drags node from sidebar → onDragStart → dataTransfer set
→ User drops on canvas → onDrop → Create new node
→ addNode to Zustand store → React Flow renders
```

## Component Architecture

### Frontend Components

```
App.tsx
├── Header (Logo, Workspace selector, Settings)
├── Sidebar (Node types, Models list)
├── FlowCanvas (React Flow)
│   ├── Background
│   ├── Controls
│   ├── MiniMap
│   └── Custom Nodes (TableNode)
├── PropertiesPanel (Selected node details)
└── ChatInterface
    ├── ChatMessage (Message display)
    └── Input area
```

### Backend Modules

```
index.ts (Server entry)
├── Express setup
├── CORS & middleware
└── Routes
    └── assistant.ts
        ├── POST /chat
        ├── GET /conversations/:id
        ├── POST /apply-suggestion
        ├── GET /patterns
        └── GET /status

assistant/handler.ts
├── handleChat
├── buildSystemPrompt
└── processToolUses

mcp/mcp-manager.ts
├── initialize (Connect to MCP servers)
├── getToolDefinitions
└── executeTool
```

## State Management

### Zustand Store Structure

```typescript
AppState {
  // Workspace
  currentWorkspace: Workspace | null
  workspaces: Workspace[]

  // Models
  currentModel: DataModel | null
  models: DataModel[]

  // React Flow
  nodes: Node[]
  edges: Edge[]

  // Chat
  messages: Message[]
  isAssistantTyping: boolean

  // UI State
  isChatOpen: boolean
  isPropertiesPanelOpen: boolean
  selectedNodeId: string | null

  // Actions (setters)
  setCurrentWorkspace(workspace)
  addModel(model)
  setNodes(nodes)
  addMessage(message)
  // ... etc
}
```

## MCP Server Tools

### Schema Analyzer (5 tools)
1. `analyze_schema` - Full schema analysis with relationships
2. `find_relationships` - Detect FK relationships
3. `suggest_keys` - Recommend PK/FK candidates
4. `get_table_metadata` - Detailed table info
5. `detect_modeling_patterns` - Identify Star Schema, Data Vault, etc.

### Pattern Library (4 tools)
1. `get_pattern` - Retrieve specific pattern (Data Vault, Kimball)
2. `recommend_pattern` - Suggest patterns based on metadata
3. `get_databricks_optimizations` - Get optimization recommendations
4. `list_patterns` - List all available patterns

### Model Generator (5 tools)
1. `generate_dimensional_model` - Create Kimball dimension
2. `generate_data_vault_model` - Create Data Vault (hubs, links, satellites)
3. `generate_reactflow_nodes` - Convert to React Flow format
4. `generate_yaml_metadata` - Generate YAML metadata
5. `generate_templates` - Generate DDL/ETL templates

### Databricks Optimizer (4 tools)
1. `recommend_partitioning` - Optimal partitioning strategy
2. `recommend_clustering` - Z-Order or Liquid Clustering
3. `recommend_delta_features` - CDF, Deletion Vectors, etc.
4. `estimate_performance` - Performance and cost estimates

## Communication Protocols

### Frontend ↔ Backend

**Protocol**: HTTP/HTTPS + Server-Sent Events (SSE)

**Chat Endpoint** (`POST /api/assistant/chat`):
- Request: JSON with workspace_id, message, context
- Response: SSE stream with chunks:
  - `data: {"type": "content", "text": "..."}`
  - `data: {"type": "tool_use", "tool": "...", "input": {...}}`
  - `data: {"type": "suggestion", "suggestion": {...}}`
  - `data: [DONE]`

### Backend ↔ MCP Servers

**Protocol**: Model Context Protocol (stdio)

**Tool Call Flow**:
1. Backend sends: `{ name: "analyze_schema", arguments: {...} }`
2. MCP server processes request
3. MCP server returns: `{ content: [{ type: "text", text: "..." }] }`

### Backend ↔ Claude

**Protocol**: Anthropic SDK (HTTP/HTTPS)

**Streaming**:
```typescript
anthropic.messages.stream({
  model: 'claude-sonnet-4-5-20250929',
  messages: [...],
  tools: [...],
  stream: true
})
```

## Security Considerations

### API Keys
- Backend stores `ANTHROPIC_API_KEY` in environment
- Never exposed to frontend
- Supabase keys split: `ANON_KEY` (frontend) vs `SERVICE_KEY` (backend)

### CORS
- Configured in Express to allow frontend origin
- Production: Restrict to specific domains

### Input Validation
- Zod schemas validate all MCP tool inputs
- Express validates request bodies
- React sanitizes user inputs

## Performance Optimizations

### Frontend
- **React.memo** on TableNode to prevent unnecessary re-renders
- **Zustand** for efficient state updates
- **React Flow** lazy loading of nodes
- **Code splitting** for large components

### Backend
- **Connection pooling** for MCP servers (persistent connections)
- **Streaming responses** for real-time feedback
- **Concurrent tool execution** when possible

### MCP Servers
- **Efficient schema queries** (limit columns, use indexes)
- **Caching** of pattern definitions
- **Lazy loading** of optimization rules

## Scalability

### Horizontal Scaling

**Backend**:
- Stateless API servers (can run multiple instances)
- Load balancer distributes requests
- Shared MCP server pool

**MCP Servers**:
- Independent processes (can scale separately)
- Multiple instances per server type
- Round-robin distribution

### Vertical Scaling

**Backend**:
- Increase memory for larger context windows
- More CPU cores for concurrent requests

**Database**:
- Supabase auto-scales
- Connection pooling (pgBouncer)

## Monitoring & Debugging

### Logs

**Backend**:
```
[Server] Starting Uroq Backend API...
[MCP Manager] Initializing MCP servers...
[MCP Manager] ✓ schema-analyzer connected
[Assistant] Processing chat request for workspace: workspace_1
[MCP Manager] Executing analyze_schema on schema-analyzer
```

**MCP Servers**:
```
[MCP Error] Error in tool execution
Schema Analyzer MCP Server running on stdio
```

### Health Checks

- `GET /health` - Backend health
- `GET /api/assistant/status` - MCP server status

### Metrics to Track

- **Chat latency**: Time from request to first token
- **Tool execution time**: Individual MCP tool performance
- **Error rates**: Failed tool calls, API errors
- **Token usage**: Claude API consumption

## Future Architecture Enhancements

### Planned Features

1. **WebSocket Support** - Replace SSE for bi-directional communication
2. **Redis Caching** - Cache MCP tool results
3. **Queue System** - Bull/BullMQ for background jobs
4. **Real-time Collaboration** - Multiple users editing same model
5. **Version Control** - Full git integration for models
6. **Databricks Direct Connection** - Execute scripts directly

### Scalability Improvements

1. **Microservices** - Split backend into separate services
2. **Container Orchestration** - Kubernetes deployment
3. **CDN** - Static asset delivery
4. **Edge Functions** - Serverless API endpoints

## Technology Choices

### Why React Flow?
- Built specifically for node-based UIs
- Excellent performance with large graphs
- Rich plugin ecosystem
- TypeScript support

### Why Zustand over Redux?
- Simpler API, less boilerplate
- Better TypeScript inference
- Smaller bundle size
- Sufficient for our use case

### Why MCP?
- Standardized protocol for AI tool integration
- Clean separation of concerns
- Easy to add new tools
- Claude native support

### Why Node.js Backend?
- Same language as frontend (TypeScript)
- Excellent streaming support
- Strong MCP SDK
- Easy deployment

## Deployment Architecture

### Development
```
Localhost
├── Frontend: localhost:5173 (Vite dev server)
├── Backend: localhost:3001 (tsx watch)
└── MCP Servers: spawned by backend
```

### Production
```
Vercel (Frontend)
    ↓
Railway/Render (Backend + MCP Servers)
    ↓
Supabase (Database)
    ↓
GitHub (Metadata YAML)
```

---

**Last Updated**: 2025-10-02
**Version**: 1.0.0
