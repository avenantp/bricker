# Bricker Setup Guide

Complete setup instructions for running the Bricker Databricks Automation Builder.

## Prerequisites

- **Node.js** 18+ and npm
- **Anthropic API Key** (for Claude integration)
- **Git** for version control
- **Supabase Account** (optional, for production database)
- **GitHub Token** (optional, for metadata storage)

## Quick Start

### 1. Install Dependencies

```bash
# Install all workspace dependencies
npm install
```

### 2. Set Up Supabase (Required for Authentication)

**Follow the detailed guide**: `supabase/SETUP_GUIDE.md`

Quick steps:
1. Create Supabase project at [https://supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` in SQL Editor
3. Run `supabase/rls-policies.sql` in SQL Editor
4. Copy API credentials from Settings > API

### 3. Set Up Environment Variables

```bash
# Copy the example environment file
cp .env.example .env
```

Edit `.env` and add your credentials:

```env
# Required
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Required for Authentication
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Backend
PORT=3001
NODE_ENV=development
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here

# Optional
DATABASE_URL=postgresql://user:password@localhost:5432/bricker
GITHUB_TOKEN=ghp_your-token
VITE_API_URL=http://localhost:3001
```

### 4. Build MCP Servers

```bash
# Build all MCP servers (required before starting backend)
npm run build --workspaces
```

This compiles TypeScript for:
- `schema-analyzer` - Analyzes database schemas
- `pattern-library` - Provides data modeling patterns
- `model-generator` - Generates React Flow models
- `databricks-optimizer` - Databricks optimization recommendations

### 5. Start Development Servers

**Option A: Start Everything (Recommended)**

```bash
npm run dev
```

This starts both backend (port 3001) and frontend (port 5173) concurrently.

**Option B: Start Individually**

Terminal 1 - Backend:
```bash
npm run dev:backend
```

Terminal 2 - Frontend:
```bash
npm run dev:frontend
```

### 6. Open the Application

Navigate to: **http://localhost:5173**

You should see:
- **Authentication page** (if Supabase is set up)
- Sign up with email/password or GitHub
- After login:
  - Header with Bricker logo and workspace selector
  - Sidebar with node types and models
  - React Flow canvas (empty initially)
  - AI Assistant chat (bottom-right corner)

## First Steps

### 1. Create an Account

1. On the auth page, click **"Sign up"**
2. Enter your email and password
3. Check your email for verification link
4. Click link to verify account
5. Sign in with your credentials

### 2. Create a Workspace

1. After signing in, click **"Create Workspace"**
2. Enter a name (e.g., "My Databricks Project")
3. Add a description (optional)
4. Click **"Create"**

### 3. Test the AI Assistant

1. Click the **Sparkles** icon (bottom-right) to open the AI chat
2. Try an example prompt:
   - "Create a dimension from product and category tables"
   - "Recommend a data vault model optimized for Databricks"
   - "Generate a Type 2 SCD for customers"
3. The AI will analyze your request and generate a model
4. Click **"Apply to Canvas"** to add nodes to the React Flow canvas

### Verify Backend Connection

Check backend status at: **http://localhost:3001/api/assistant/status**

You should see:
```json
{
  "mcp_servers": {
    "schema-analyzer": "connected",
    "pattern-library": "connected",
    "model-generator": "connected",
    "databricks-optimizer": "connected"
  },
  "available_tools": 13,
  "tools": [...]
}
```

## Project Structure

```
bricker/
├── backend/              # Node.js API server
│   ├── src/
│   │   ├── assistant/   # Claude integration
│   │   ├── mcp/         # MCP server manager
│   │   ├── routes/      # API endpoints
│   │   └── index.ts     # Server entry point
│   └── package.json
│
├── frontend/            # React application
│   ├── src/
│   │   ├── api/        # Backend API client
│   │   ├── components/ # React components
│   │   │   ├── Chat/   # AI assistant chat
│   │   │   ├── Flow/   # React Flow canvas
│   │   │   └── Layout/ # Header, sidebar, panels
│   │   ├── hooks/      # Custom React hooks
│   │   ├── store/      # Zustand state management
│   │   ├── App.tsx     # Main app component
│   │   └── main.tsx    # Entry point
│   └── package.json
│
└── mcp-servers/        # MCP servers (AI tools)
    ├── schema-analyzer/
    ├── pattern-library/
    ├── model-generator/
    └── databricks-optimizer/
```

## Troubleshooting

### MCP Servers Not Connecting

**Symptom**: Backend shows "error" status for MCP servers

**Solution**:
1. Ensure all MCP servers are built:
   ```bash
   npm run build --workspace=mcp-servers/schema-analyzer
   npm run build --workspace=mcp-servers/pattern-library
   npm run build --workspace=mcp-servers/model-generator
   npm run build --workspace=mcp-servers/databricks-optimizer
   ```

2. Check backend logs for specific errors
3. Verify Node.js version is 18+

### Chat Not Streaming Responses

**Symptom**: Chat messages not appearing in real-time

**Solution**:
1. Check that `ANTHROPIC_API_KEY` is set correctly in `.env`
2. Verify API key has sufficient credits
3. Check browser console for errors
4. Ensure backend is running and accessible

### React Flow Canvas Empty After Applying Suggestion

**Symptom**: Clicking "Apply to Canvas" doesn't show nodes

**Solution**:
1. Open browser DevTools console
2. Check for React Flow errors
3. Verify `@xyflow/react` is installed:
   ```bash
   cd frontend && npm install @xyflow/react
   ```

### Frontend Not Proxying to Backend

**Symptom**: API calls fail with CORS or 404 errors

**Solution**:
1. Ensure backend is running on port 3001
2. Check `vite.config.ts` proxy configuration
3. Restart frontend dev server

## Development Workflow

### Adding New MCP Tools

1. Edit the appropriate MCP server in `mcp-servers/*/src/index.ts`
2. Add new tool to `getTools()` method
3. Implement tool handler
4. Rebuild: `npm run build --workspace=mcp-servers/[server-name]`
5. Restart backend

### Modifying Data Models

1. Update types in `frontend/src/store/types.ts`
2. Update Zustand store in `frontend/src/store/useStore.ts`
3. Update React Flow nodes in `frontend/src/components/Flow/nodes/`

### Testing AI Prompts

Use the `/api/assistant/chat` endpoint directly:

```bash
curl -X POST http://localhost:3001/api/assistant/chat \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "workspace_1",
    "message": "Create a dimension from product and category tables",
    "stream": false
  }'
```

## Production Deployment

### Backend (Railway/Render)

1. Set environment variables in platform
2. Build command: `npm run build --workspaces`
3. Start command: `npm run start --workspace=backend`
4. Ensure MCP servers are built in production

### Frontend (Vercel/Netlify)

1. Build command: `npm run build --workspace=frontend`
2. Output directory: `frontend/dist`
3. Set `VITE_API_URL` to production backend URL

## Next Steps

- **Connect Supabase**: Set up database for workspace persistence
- **Add GitHub Integration**: Enable YAML metadata versioning
- **Implement Authentication**: Add Supabase auth for multi-user support
- **Create Templates**: Build reusable Jinja2 templates
- **Add Tests**: Write unit and integration tests

## Support

- **Documentation**: See `README.md` and `CLAUDE.md`
- **Issues**: https://github.com/your-org/bricker/issues
- **PRD**: See `docs/prp/` for product requirements

## License

MIT
