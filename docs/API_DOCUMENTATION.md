# API Documentation

Comprehensive API documentation for Uroq's backend services, frontend utilities, and MCP servers.

## Table of Contents

- [Backend REST API](#backend-rest-api)
- [GitHub Service](#github-service)
- [YAML Utilities](#yaml-utilities)
- [MCP Server APIs](#mcp-server-apis)

---

## Backend REST API

Base URL: `http://localhost:3001` (development)

### Authentication

All endpoints except `/api/assistant/status` require authentication via Supabase JWT token.

**Headers:**
```http
Authorization: Bearer <jwt_token>
```

### Assistant Endpoints

#### POST /api/assistant/chat

Start a conversation with the AI assistant using streaming responses.

**Request Body:**
```json
{
  "workspace_id": "ws_123",
  "conversation_id": "conv_456", // optional, for continuing conversation
  "message": "Help me design a customer dimension table"
}
```

**Response:** Server-Sent Events (SSE) stream

```
data: {"type":"text","content":"I can help"}

data: {"type":"tool_use","tool":"generate_dimensional_model","input":{}}

data: {"type":"result","content":"..."}

data: [DONE]
```

**Event Types:**
- `text`: Claude's text response
- `tool_use`: Claude calling an MCP tool
- `tool_result`: Result from MCP tool execution
- `result`: Final result
- `error`: Error occurred

**Status Codes:**
- `200 OK`: Stream started successfully
- `400 Bad Request`: Invalid request body
- `401 Unauthorized`: Missing or invalid authentication
- `500 Internal Server Error`: Server error

---

#### GET /api/assistant/conversations/:workspace_id

Get conversation history for a workspace.

**Path Parameters:**
- `workspace_id` (string, required): Workspace ID

**Query Parameters:**
- `limit` (number, optional): Number of conversations to return (default: 50)
- `offset` (number, optional): Pagination offset (default: 0)

**Response:**
```json
{
  "conversations": [
    {
      "id": "conv_123",
      "workspace_id": "ws_123",
      "title": "Customer Dimension Design",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T01:00:00Z",
      "message_count": 5
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

**Status Codes:**
- `200 OK`: Success
- `401 Unauthorized`: Missing or invalid authentication
- `404 Not Found`: Workspace not found

---

#### GET /api/assistant/conversations/:conversation_id/messages

Get messages for a specific conversation.

**Path Parameters:**
- `conversation_id` (string, required): Conversation ID

**Response:**
```json
{
  "messages": [
    {
      "id": "msg_123",
      "conversation_id": "conv_123",
      "role": "user",
      "content": "Help me design a customer dimension",
      "created_at": "2024-01-01T00:00:00Z"
    },
    {
      "id": "msg_124",
      "conversation_id": "conv_123",
      "role": "assistant",
      "content": "I can help you design a customer dimension...",
      "tool_calls": [...],
      "created_at": "2024-01-01T00:01:00Z"
    }
  ]
}
```

**Status Codes:**
- `200 OK`: Success
- `401 Unauthorized`: Missing or invalid authentication
- `404 Not Found`: Conversation not found

---

#### POST /api/assistant/apply-suggestion

Apply an AI suggestion to the canvas.

**Request Body:**
```json
{
  "workspace_id": "ws_123",
  "project_id": "proj_456",
  "suggestion": {
    "type": "add_nodes",
    "nodes": [
      {
        "id": "node_1",
        "type": "dimension",
        "data": {...}
      }
    ],
    "edges": [...]
  }
}
```

**Response:**
```json
{
  "success": true,
  "applied_nodes": ["node_1"],
  "applied_edges": ["edge_1"]
}
```

**Status Codes:**
- `200 OK`: Suggestion applied successfully
- `400 Bad Request`: Invalid suggestion format
- `401 Unauthorized`: Missing or invalid authentication
- `404 Not Found`: Project not found

---

#### GET /api/assistant/patterns

Get available data modeling patterns.

**Query Parameters:**
- `type` (string, optional): Filter by pattern type (`data_vault`, `kimball`, `databricks`)

**Response:**
```json
{
  "patterns": [
    {
      "id": "data_vault_hub",
      "name": "Data Vault Hub",
      "type": "data_vault",
      "description": "Central business entity",
      "template": {...}
    }
  ]
}
```

**Status Codes:**
- `200 OK`: Success
- `500 Internal Server Error`: Server error

---

#### GET /api/assistant/status

Get MCP server status (no authentication required).

**Response:**
```json
{
  "servers": {
    "schema_analyzer": {
      "status": "running",
      "tools": 5,
      "version": "1.0.0"
    },
    "pattern_library": {
      "status": "running",
      "tools": 4,
      "version": "1.0.0"
    },
    "model_generator": {
      "status": "running",
      "tools": 5,
      "version": "1.0.0"
    },
    "databricks_optimizer": {
      "status": "running",
      "tools": 4,
      "version": "1.0.0"
    }
  },
  "total_tools": 18
}
```

**Status Codes:**
- `200 OK`: Success

---

### GitHub Endpoints

#### POST /api/github/connect

Connect workspace to GitHub repository.

**Request Body:**
```json
{
  "workspace_id": "ws_123",
  "github_token": "ghp_xxxxx",
  "github_repo": "owner/repo",
  "github_branch": "main"
}
```

**Response:**
```json
{
  "success": true,
  "connection_id": "conn_123",
  "repo_initialized": true
}
```

**Status Codes:**
- `200 OK`: Connected successfully
- `400 Bad Request`: Invalid GitHub token or repo
- `401 Unauthorized`: Missing or invalid authentication
- `409 Conflict`: Workspace already connected to GitHub

---

#### DELETE /api/github/disconnect/:workspace_id

Disconnect workspace from GitHub.

**Path Parameters:**
- `workspace_id` (string, required): Workspace ID

**Response:**
```json
{
  "success": true
}
```

**Status Codes:**
- `200 OK`: Disconnected successfully
- `401 Unauthorized`: Missing or invalid authentication
- `404 Not Found`: Connection not found

---

#### GET /api/github/repos/:workspace_id/files

List files in GitHub repository.

**Path Parameters:**
- `workspace_id` (string, required): Workspace ID

**Query Parameters:**
- `path` (string, optional): Directory path (default: `metadata`)
- `type` (string, optional): Filter by type (`projects`, `models`)

**Response:**
```json
{
  "files": [
    {
      "name": "customer-dimension.yml",
      "path": "metadata/models/customer-dimension.yml",
      "sha": "abc123",
      "size": 1024
    }
  ]
}
```

**Status Codes:**
- `200 OK`: Success
- `401 Unauthorized`: Missing or invalid authentication
- `404 Not Found`: Workspace or path not found

---

## GitHub Service

Frontend service for interacting with GitHub API.

### GitHubClient

**Constructor:**
```typescript
new GitHubClient(token: string)
```

**Parameters:**
- `token` (string): GitHub personal access token

---

#### getFileContent()

Get file content from GitHub repository.

```typescript
async getFileContent(
  owner: string,
  repo: string,
  path: string,
  branch: string = 'main'
): Promise<{ content: string; sha: string }>
```

**Parameters:**
- `owner` (string): Repository owner
- `repo` (string): Repository name
- `path` (string): File path
- `branch` (string, optional): Branch name (default: `main`)

**Returns:** Promise resolving to file content and SHA

**Throws:**
- `Error`: If file not found or API error

**Example:**
```typescript
const client = new GitHubClient('ghp_token');
const { content, sha } = await client.getFileContent(
  'owner',
  'repo',
  'metadata/models/customer.yml'
);
```

---

#### upsertFile()

Create or update file in GitHub repository.

```typescript
async upsertFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string = 'main',
  sha?: string
): Promise<string>
```

**Parameters:**
- `owner` (string): Repository owner
- `repo` (string): Repository name
- `path` (string): File path
- `content` (string): File content
- `message` (string): Commit message
- `branch` (string, optional): Branch name (default: `main`)
- `sha` (string, optional): Existing file SHA (required for updates)

**Returns:** Promise resolving to commit SHA

**Example:**
```typescript
const commitSha = await client.upsertFile(
  'owner',
  'repo',
  'metadata/models/customer.yml',
  yamlContent,
  'Update customer dimension',
  'main',
  existingSha
);
```

---

#### deleteFile()

Delete file from GitHub repository.

```typescript
async deleteFile(
  owner: string,
  repo: string,
  path: string,
  message: string,
  sha: string,
  branch: string = 'main'
): Promise<void>
```

**Parameters:**
- `owner` (string): Repository owner
- `repo` (string): Repository name
- `path` (string): File path
- `message` (string): Commit message
- `sha` (string): File SHA
- `branch` (string, optional): Branch name (default: `main`)

**Example:**
```typescript
await client.deleteFile(
  'owner',
  'repo',
  'metadata/models/old-model.yml',
  'Delete old model',
  'abc123'
);
```

---

#### saveProject()

Save project to GitHub repository.

```typescript
async saveProject(
  owner: string,
  repo: string,
  project: ProjectYAML,
  existingSha?: string
): Promise<string>
```

**Parameters:**
- `owner` (string): Repository owner
- `repo` (string): Repository name
- `project` (ProjectYAML): Project object
- `existingSha` (string, optional): Existing file SHA

**Returns:** Promise resolving to commit SHA

**Example:**
```typescript
const commitSha = await client.saveProject('owner', 'repo', projectData);
```

---

#### loadProject()

Load project from GitHub repository.

```typescript
async loadProject(
  owner: string,
  repo: string,
  path: string,
  branch: string = 'main'
): Promise<{ project: ProjectYAML; sha: string }>
```

**Parameters:**
- `owner` (string): Repository owner
- `repo` (string): Repository name
- `path` (string): File path
- `branch` (string, optional): Branch name (default: `main`)

**Returns:** Promise resolving to project object and file SHA

**Example:**
```typescript
const { project, sha } = await client.loadProject(
  'owner',
  'repo',
  'metadata/projects/my-project.yml'
);
```

---

#### listFiles()

List YAML files in directory.

```typescript
async listFiles(
  owner: string,
  repo: string,
  path: string,
  branch: string = 'main'
): Promise<Array<{ name: string; path: string; sha: string }>>
```

**Parameters:**
- `owner` (string): Repository owner
- `repo` (string): Repository name
- `path` (string): Directory path
- `branch` (string, optional): Branch name (default: `main`)

**Returns:** Promise resolving to array of YAML files

**Example:**
```typescript
const files = await client.listFiles('owner', 'repo', 'metadata/models');
```

---

#### ensureRepository()

Ensure repository exists, create if it doesn't.

```typescript
async ensureRepository(
  owner: string,
  repo: string,
  isPrivate: boolean = true
): Promise<void>
```

**Parameters:**
- `owner` (string): Repository owner
- `repo` (string): Repository name
- `isPrivate` (boolean, optional): Create as private repository (default: `true`)

**Example:**
```typescript
await client.ensureRepository('owner', 'uroq-metadata', true);
```

---

### Helper Functions

#### parseGitHubRepo()

Parse GitHub repository string into owner and repo name.

```typescript
function parseGitHubRepo(repoString: string): { owner: string; repo: string }
```

**Parameters:**
- `repoString` (string): Repository string in format `owner/repo`

**Returns:** Object with owner and repo

**Throws:**
- `Error`: If format is invalid

**Example:**
```typescript
const { owner, repo } = parseGitHubRepo('anthropic/uroq');
// { owner: 'anthropic', repo: 'uroq' }
```

---

## YAML Utilities

Utilities for converting between TypeScript objects and YAML format.

### exportProjectToYAML()

Export project object to YAML string.

```typescript
function exportProjectToYAML(project: ProjectYAML): string
```

**Parameters:**
- `project` (ProjectYAML): Project object

**Returns:** YAML string with comment header

**Example:**
```typescript
const yaml = exportProjectToYAML({
  metadata: {
    id: 'proj_123',
    name: 'My Project',
    // ...
  }
});
```

---

### exportDataModelToYAML()

Export data model object to YAML string.

```typescript
function exportDataModelToYAML(model: DataModelYAML): string
```

**Parameters:**
- `model` (DataModelYAML): Data model object

**Returns:** YAML string with comment header

---

### parseProjectYAML()

Parse YAML string to project object.

```typescript
function parseProjectYAML(yamlContent: string): ProjectYAML
```

**Parameters:**
- `yamlContent` (string): YAML content

**Returns:** Project object

**Throws:**
- `Error`: If YAML is invalid

---

### parseDataModelYAML()

Parse YAML string to data model object.

```typescript
function parseDataModelYAML(yamlContent: string): DataModelYAML
```

**Parameters:**
- `yamlContent` (string): YAML content

**Returns:** Data model object

**Throws:**
- `Error`: If YAML is invalid

---

### generateSlug()

Generate URL-safe slug from name.

```typescript
function generateSlug(name: string): string
```

**Parameters:**
- `name` (string): Name to convert

**Returns:** Slug string

**Example:**
```typescript
generateSlug('My Project Name'); // 'my-project-name'
generateSlug('Project @#$ Name'); // 'project-name'
```

---

### generateProjectPath()

Generate GitHub path for project file.

```typescript
function generateProjectPath(workspaceSlug: string, projectSlug: string): string
```

**Parameters:**
- `workspaceSlug` (string): Workspace slug
- `projectSlug` (string): Project slug

**Returns:** File path

**Example:**
```typescript
generateProjectPath('my-workspace', 'my-project');
// 'metadata/projects/my-workspace/my-project.yml'
```

---

### generateDataModelPath()

Generate GitHub path for data model file.

```typescript
function generateDataModelPath(projectSlug: string, modelSlug: string): string
```

**Parameters:**
- `projectSlug` (string): Project slug
- `modelSlug` (string): Model slug

**Returns:** File path

**Example:**
```typescript
generateDataModelPath('my-project', 'customer-dimension');
// 'metadata/models/my-project/customer-dimension.yml'
```

---

## MCP Server APIs

MCP servers expose tools via the Model Context Protocol.

### Schema Analyzer Tools

#### analyze_schema

Analyze database schema and extract metadata.

**Input:**
```json
{
  "connection_string": "postgresql://...",
  "schema_name": "public"
}
```

**Output:**
```json
{
  "tables": [
    {
      "table_name": "customers",
      "columns": [
        {
          "name": "id",
          "type": "bigint",
          "nullable": false,
          "is_primary_key": true
        }
      ],
      "row_count": 10000
    }
  ]
}
```

---

#### find_relationships

Discover relationships between tables.

**Input:**
```json
{
  "tables": [...]
}
```

**Output:**
```json
{
  "relationships": [
    {
      "from_table": "orders",
      "from_column": "customer_id",
      "to_table": "customers",
      "to_column": "id",
      "relationship_type": "many_to_one"
    }
  ]
}
```

---

### Pattern Library Tools

#### get_pattern

Get specific data modeling pattern.

**Input:**
```json
{
  "pattern_id": "data_vault_hub"
}
```

**Output:**
```json
{
  "pattern": {
    "id": "data_vault_hub",
    "name": "Data Vault Hub",
    "template": {...}
  }
}
```

---

#### recommend_pattern

Recommend patterns based on requirements.

**Input:**
```json
{
  "requirements": {
    "scale": "enterprise",
    "history_tracking": true
  }
}
```

**Output:**
```json
{
  "recommendations": [
    {
      "pattern_id": "data_vault",
      "confidence": 0.95,
      "reason": "Excellent for enterprise scale with audit requirements"
    }
  ]
}
```

---

### Model Generator Tools

#### generate_dimensional_model

Generate Kimball dimensional model.

**Input:**
```json
{
  "entity_name": "customer",
  "entity_type": "dimension",
  "scd_type": 2,
  "columns": [...]
}
```

**Output:**
```json
{
  "model": {
    "table_name": "dim_customer",
    "columns": [...],
    "constraints": [...]
  }
}
```

---

### Databricks Optimizer Tools

#### recommend_partitioning

Recommend partitioning strategy.

**Input:**
```json
{
  "table_metadata": {
    "row_count": 10000000,
    "columns": [...]
  }
}
```

**Output:**
```json
{
  "recommendations": [
    {
      "type": "partition",
      "columns": ["date"],
      "reason": "High cardinality date column",
      "estimated_improvement": "30%"
    }
  ]
}
```

---

#### recommend_clustering

Recommend clustering strategy.

**Input:**
```json
{
  "table_metadata": {...},
  "query_patterns": [...]
}
```

**Output:**
```json
{
  "recommendations": [
    {
      "type": "liquid_clustering",
      "columns": ["customer_id", "region"],
      "reason": "High cardinality columns frequently used in filters"
    }
  ]
}
```

---

## Error Handling

All APIs use standard HTTP status codes and return error responses in this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {}
  }
}
```

**Common Error Codes:**
- `INVALID_REQUEST`: Request validation failed
- `UNAUTHORIZED`: Authentication required or invalid
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource conflict
- `INTERNAL_ERROR`: Server error
- `RATE_LIMIT_EXCEEDED`: Too many requests

---

## Rate Limiting

- Backend API: 100 requests per minute per user
- GitHub API: Subject to GitHub's rate limits (5000/hour for authenticated requests)
- MCP servers: No rate limiting (internal only)

---

## Versioning

API version is included in the URL path:

- Current version: `v1`
- Example: `POST /api/v1/assistant/chat`

Breaking changes will be released as new versions (v2, v3, etc.) with 6-month deprecation period for old versions.
