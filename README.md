# Uroq

A React-based web application that enables users to visually design and generate Databricks automation scripts through an intuitive interface combining data modeling, template management, and workflow visualization.

## Project Structure

```
uroq/
├── frontend/              # React frontend application
├── backend/              # Node.js backend API with Claude integration
├── mcp-servers/          # MCP servers for AI assistant
│   ├── schema-analyzer/  # Analyze database schemas
│   ├── pattern-library/  # Data modeling patterns
│   ├── model-generator/  # Generate React Flow models
│   └── databricks-optimizer/ # Databricks optimizations
├── docs/                 # Documentation
│   └── prp/             # Product requirement documents
└── CLAUDE.md            # Claude Code guidance

```

## Features

### Core Features
- **Authentication & Authorization**: Supabase-powered auth with email/password and GitHub OAuth
- **Multi-Workspace Support**: Create and manage multiple workspaces with role-based access control
- **Visual Data Modeling**: React Flow-based designer for Databricks objects
- **AI Assistant**: Conversational interface powered by Claude for model design
- **Template System**: Jinja2 templates for script generation
- **Pattern Library**: Pre-built Data Vault and Kimball patterns
- **Databricks Optimizations**: Automatic liquid clustering, partitioning, CDF, etc.
- **GitHub Integration**: Version-control data models and templates as YAML files
  - Export models directly from canvas to GitHub
  - Import models from GitHub repositories
  - Branch management and version history
- **Real-time Collaboration**: Workspace members can collaborate on models

### MCP Servers
1. **Schema Analyzer**: Analyzes existing database schemas, detects relationships
2. **Pattern Library**: Provides Data Vault 2.0 and Kimball dimensional patterns
3. **Model Generator**: Converts natural language to React Flow models
4. **Databricks Optimizer**: Recommends partitioning, clustering, Delta features

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Anthropic API key (required)
- Supabase account (required for authentication)
- GitHub account (optional, for OAuth and metadata storage)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd uroq
```

2. Install dependencies:
```bash
npm install
```

3. Set up Supabase:
```bash
# See supabase/SETUP_GUIDE.md for detailed instructions
# 1. Create Supabase project
# 2. Run schema.sql
# 3. Run rls-policies.sql
# 4. Get API credentials
```

4. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials:
# - ANTHROPIC_API_KEY (required)
# - VITE_SUPABASE_URL (required)
# - VITE_SUPABASE_ANON_KEY (required)
# - SUPABASE_SERVICE_KEY (backend, required)
```

5. Build MCP servers:
```bash
npm run build --workspaces
```

6. Start development servers:
```bash
npm run dev
```

This will start:
- Backend API on http://localhost:3001
- Frontend on http://localhost:5173 (when implemented)

### Environment Variables

See `.env.example` for required environment variables:

**Required:**
- `ANTHROPIC_API_KEY`: Your Claude API key
- `VITE_SUPABASE_URL`: Supabase project URL (frontend)
- `VITE_SUPABASE_ANON_KEY`: Supabase anon key (frontend)
- `SUPABASE_URL`: Supabase project URL (backend)
- `SUPABASE_SERVICE_KEY`: Supabase service role key (backend)

**Optional:**
- `DATABASE_URL`: PostgreSQL connection string
- `GITHUB_TOKEN`: GitHub personal access token (for workspace-level GitHub integration)

## Development

### Backend API

The backend provides REST endpoints for the AI assistant:

- `POST /api/assistant/chat` - Chat with AI assistant (streaming)
- `GET /api/assistant/conversations/:workspace_id` - Get conversation history
- `POST /api/assistant/apply-suggestion` - Apply AI suggestion to canvas
- `GET /api/assistant/patterns` - Get available patterns
- `GET /api/assistant/status` - Get MCP server status

### MCP Servers

Each MCP server is a standalone Node.js process that exposes tools via the Model Context Protocol:

**Schema Analyzer Tools:**
- `analyze_schema` - Analyze tables and extract metadata
- `find_relationships` - Discover relationships between tables
- `suggest_keys` - Recommend primary/foreign keys
- `get_table_metadata` - Get detailed table metadata
- `detect_modeling_patterns` - Identify existing patterns

**Pattern Library Tools:**
- `get_pattern` - Retrieve specific pattern
- `recommend_pattern` - Recommend patterns based on metadata
- `get_databricks_optimizations` - Get optimization recommendations
- `list_patterns` - List all available patterns

**Model Generator Tools:**
- `generate_dimensional_model` - Generate Kimball dimension
- `generate_data_vault_model` - Generate Data Vault model
- `generate_reactflow_nodes` - Convert to React Flow format
- `generate_yaml_metadata` - Generate YAML metadata
- `generate_templates` - Generate DDL/ETL templates

**Databricks Optimizer Tools:**
- `recommend_partitioning` - Partitioning strategy
- `recommend_clustering` - Z-Order or Liquid Clustering
- `recommend_delta_features` - CDF, Deletion Vectors, etc.
- `estimate_performance` - Performance and cost estimates

## Architecture

### Data Flow

1. User types natural language request in chat
2. Backend forwards to Claude with MCP tool definitions
3. Claude analyzes request and calls appropriate MCP tools
4. MCP servers process requests and return structured data
5. Claude synthesizes results into recommendations
6. Frontend displays suggestions with React Flow preview
7. User can apply suggestions to canvas or iterate

### Technology Stack

**Frontend:**
- React 18+ with TypeScript
- React Flow for visual designer
- Tailwind CSS
- Zustand for state management

**Backend:**
- Node.js with Express
- Anthropic SDK (Claude)
- MCP SDK
- Supabase for database
- Nunjucks for Jinja2 templating

**Storage:**
- Supabase (PostgreSQL) for runtime data
- GitHub for YAML metadata (version controlled)

## Testing

Uroq includes comprehensive unit and integration tests for all components.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage reports
npm run test:coverage

# Test specific packages
npm test --workspace=backend          # Backend integration tests
npm test --workspace=frontend         # Frontend unit tests
npm test --workspace=mcp-servers/schema-analyzer      # Schema Analyzer only
npm test --workspace=mcp-servers/pattern-library      # Pattern Library only
npm test --workspace=mcp-servers/model-generator      # Model Generator only
npm test --workspace=mcp-servers/databricks-optimizer # Databricks Optimizer only
```

### Test Coverage

- **Frontend**: GitHub API client, YAML utilities, React components
- **Backend**: MCP communication, end-to-end workflows, error handling
- **Schema Analyzer**: Table analysis, relationship detection, pattern recognition
- **Pattern Library**: Data Vault, Kimball, Databricks optimizations
- **Model Generator**: Dimensional/Data Vault model generation, React Flow models
- **Databricks Optimizer**: Partitioning, clustering, Delta features, performance estimation

### Testing Frameworks

- **Frontend**: Vitest + React Testing Library
- **Backend**: Jest + Node test utilities
- **MCP Servers**: Jest

See [TESTING.md](./TESTING.md) for comprehensive testing documentation.

## Deployment

### Backend

The backend can be deployed to:
- Railway (recommended)
- Render
- AWS ECS/Fargate
- Google Cloud Run

### Frontend

The frontend can be deployed to:
- Vercel
- Netlify
- Cloudflare Pages

## Documentation

### Getting Started
- [README.md](./README.md) - Project overview and quick start (this file)
- [SETUP.md](./SETUP.md) - Complete setup guide with troubleshooting
- [docs/DEVELOPER_ONBOARDING.md](./docs/DEVELOPER_ONBOARDING.md) - New developer onboarding guide

### Architecture & Development
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture and data flow
- [TESTING.md](./TESTING.md) - Comprehensive testing guide
- [docs/API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) - Complete API reference
- [CLAUDE.md](./CLAUDE.md) - Guidance for Claude Code

### Feature Documentation
- [docs/AUTHENTICATION.md](./docs/AUTHENTICATION.md) - Authentication & authorization guide
- [docs/GITHUB_INTEGRATION.md](./docs/GITHUB_INTEGRATION.md) - GitHub integration guide
- [supabase/SETUP_GUIDE.md](./supabase/SETUP_GUIDE.md) - Supabase setup instructions

### Product Requirements
- [docs/prp/000-task-list.md](./docs/prp/000-task-list.md) - Complete task list with phases
- [docs/prp/001-technical-specifications.md](./docs/prp/001-technical-specifications.md) - Technical specifications

## License

MIT

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.
