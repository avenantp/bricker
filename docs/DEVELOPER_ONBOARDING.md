# Developer Onboarding Guide

Welcome to the Uroq development team! This guide will help you get up and running with the codebase.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Development Environment Setup](#development-environment-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Common Tasks](#common-tasks)
- [Troubleshooting](#troubleshooting)
- [Resources](#resources)

---

## Prerequisites

Before you begin, ensure you have the following installed:

### Required
- **Node.js** 18.x or higher ([Download](https://nodejs.org/))
- **npm** 9.x or higher (comes with Node.js)
- **Git** ([Download](https://git-scm.com/))
- **VS Code** (recommended) or your preferred IDE

### Required Accounts
- **Supabase account** (free tier is fine) - [Sign up](https://supabase.com/)
- **Anthropic API key** - [Get API key](https://console.anthropic.com/)
- **GitHub account** - [Sign up](https://github.com/)

### Optional but Recommended
- **Postman** or **Insomnia** for API testing
- **GitHub Desktop** for GUI-based Git operations
- **Databricks account** for testing integrations (free trial available)

---

## Development Environment Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd uroq
```

### 2. Install Dependencies

Install all dependencies for the monorepo:

```bash
npm install
```

This will install dependencies for:
- Root workspace
- Frontend (`frontend/`)
- Backend (`backend/`)
- All MCP servers (`mcp-servers/*`)

### 3. Set Up Supabase

#### Create a Supabase Project

1. Go to [https://supabase.com/](https://supabase.com/)
2. Click "Start your project"
3. Create a new organization (if you don't have one)
4. Create a new project:
   - Name: `uroq-dev` (or your preferred name)
   - Database Password: Save this securely
   - Region: Choose closest to you
   - Wait for project to be created (2-3 minutes)

#### Run Database Migrations

1. Go to your Supabase project dashboard
2. Click "SQL Editor" in the left sidebar
3. Click "New query"
4. Copy and paste the contents of `supabase/migrations/001_initial_schema.sql`
5. Click "Run"
6. Repeat for remaining migration files in order:
   - `002_indexes.sql`
   - `003_functions_and_triggers.sql`
   - `004_rls_policies.sql`

See [supabase/SETUP_GUIDE.md](../supabase/SETUP_GUIDE.md) for detailed instructions.

#### Get API Credentials

1. In your Supabase project dashboard, click "Settings" → "API"
2. Copy the following values:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **Anon key** (public key)
   - **Service role key** (secret key - keep secure!)

### 4. Configure Environment Variables

Create environment files from examples:

```bash
cp .env.example .env
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

#### Root `.env`

```env
# Anthropic API (Required)
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Supabase (Required)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# GitHub (Optional - for workspace-level GitHub integration)
GITHUB_TOKEN=ghp_xxxxx
```

#### Frontend `.env`

```env
# Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# API Base URL
VITE_API_BASE_URL=http://localhost:3001
```

#### Backend `.env`

```env
# Server
PORT=3001
NODE_ENV=development

# Anthropic
ANTHROPIC_API_KEY=sk-ant-xxxxx

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key

# CORS (comma-separated origins)
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

### 5. Build MCP Servers

Build all MCP servers:

```bash
npm run build --workspaces
```

This compiles TypeScript to JavaScript for all MCP servers.

### 6. Start Development Servers

**Option A: Start all servers in separate terminals**

Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

**Option B: Use root scripts**

```bash
# Start backend
npm run dev:backend

# Start frontend (in another terminal)
npm run dev:frontend
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001

---

## Project Structure

```
uroq/
├── frontend/                  # React frontend application
│   ├── src/
│   │   ├── components/       # React components
│   │   │   ├── ui/          # Reusable UI components
│   │   │   ├── Auth/        # Authentication components
│   │   │   ├── Chat/        # AI chat interface
│   │   │   ├── Layout/      # Layout components
│   │   │   └── Templates/   # Template composer
│   │   ├── hooks/           # Custom React hooks
│   │   ├── lib/             # Utility libraries
│   │   │   ├── github-api.ts      # GitHub client
│   │   │   ├── supabase.ts        # Supabase client
│   │   │   └── yaml-utils.ts      # YAML utilities
│   │   ├── pages/           # Page components
│   │   ├── store/           # Zustand store
│   │   └── test/            # Test utilities
│   ├── public/              # Static assets
│   └── package.json
│
├── backend/                  # Node.js backend API
│   ├── src/
│   │   ├── assistant/       # AI assistant handlers
│   │   ├── github/          # GitHub integration
│   │   ├── mcp/             # MCP manager
│   │   ├── routes/          # Express routes
│   │   ├── __tests__/       # Integration tests
│   │   └── index.ts         # Entry point
│   └── package.json
│
├── mcp-servers/             # MCP server implementations
│   ├── schema-analyzer/     # Schema analysis tools
│   ├── pattern-library/     # Pattern catalog
│   ├── model-generator/     # Model generation
│   └── databricks-optimizer/ # Databricks optimizations
│
├── docs/                    # Documentation
│   ├── prp/                # Product requirements
│   ├── API_DOCUMENTATION.md
│   ├── AUTHENTICATION.md
│   ├── GITHUB_INTEGRATION.md
│   └── DEVELOPER_ONBOARDING.md (this file)
│
├── supabase/               # Supabase migrations
│   └── migrations/
│
├── CLAUDE.md               # Claude Code guidance
├── README.md               # Project README
├── SETUP.md               # Setup instructions
├── TESTING.md             # Testing guide
└── package.json           # Root workspace config
```

### Key Files to Know

- **Frontend Entry**: `frontend/src/main.tsx`
- **Backend Entry**: `backend/src/index.ts`
- **Routes**: `backend/src/routes/`
- **MCP Manager**: `backend/src/mcp/mcp-manager.ts`
- **Supabase Client**: `frontend/src/lib/supabase.ts`
- **GitHub Client**: `frontend/src/lib/github-api.ts`

---

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `refactor/` - Code refactoring
- `docs/` - Documentation updates
- `test/` - Test additions or changes

### 2. Make Your Changes

- Write code following the [Code Style](#code-style) guide
- Add tests for new functionality
- Update documentation as needed
- Test your changes locally

### 3. Commit Your Changes

We use conventional commits:

```bash
git add .
git commit -m "feat: add customer dimension generator"
```

Commit types:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Build process or auxiliary tool changes

### 4. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

### 5. Code Review

- Wait for code review from team members
- Address any feedback
- Once approved, your PR will be merged

---

## Testing

### Run All Tests

```bash
# From root
npm test

# From specific package
cd backend && npm test
cd frontend && npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

View coverage report at `{package}/coverage/index.html`

### Writing Tests

**Frontend (Vitest + React Testing Library):**

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from '../MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

**Backend (Jest):**

```typescript
import { describe, test, expect } from '@jest/globals';
import { myFunction } from '../my-module';

describe('myFunction', () => {
  test('should return expected value', () => {
    const result = myFunction('input');
    expect(result).toBe('expected');
  });
});
```

See [TESTING.md](../TESTING.md) for comprehensive testing guide.

---

## Code Style

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Define proper types/interfaces
- Avoid `any` type

### Linting

Run linter:

```bash
npm run lint

# Auto-fix issues
npm run lint:fix
```

### Formatting

We use Prettier for code formatting:

```bash
npm run format

# Check formatting
npm run format:check
```

### VS Code Settings

Recommended `settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### File Naming Conventions

- Components: `PascalCase.tsx` (e.g., `CustomerForm.tsx`)
- Utilities: `kebab-case.ts` (e.g., `date-utils.ts`)
- Tests: `{filename}.test.ts` (e.g., `date-utils.test.ts`)
- Constants: `UPPER_SNAKE_CASE.ts` (e.g., `API_ENDPOINTS.ts`)

---

## Common Tasks

### Add a New UI Component

1. Create component file:
```bash
touch frontend/src/components/ui/MyComponent.tsx
```

2. Create test file:
```bash
touch frontend/src/components/ui/__tests__/MyComponent.test.tsx
```

3. Export from index:
```typescript
// frontend/src/components/ui/index.ts
export { MyComponent } from './MyComponent';
```

### Add a New API Endpoint

1. Create route handler:
```typescript
// backend/src/routes/my-route.ts
import { Router } from 'express';

const router = Router();

router.get('/endpoint', async (req, res) => {
  // Handler logic
  res.json({ success: true });
});

export default router;
```

2. Register route:
```typescript
// backend/src/index.ts
import myRoute from './routes/my-route';
app.use('/api/my-route', myRoute);
```

3. Add tests:
```typescript
// backend/src/__tests__/my-route.test.ts
```

### Add a New MCP Tool

1. Edit MCP server:
```typescript
// mcp-servers/pattern-library/src/index.ts
server.tool('my_tool', 'Tool description', {
  // Input schema
}, async (params) => {
  // Tool logic
  return { result: 'success' };
});
```

2. Rebuild:
```bash
cd mcp-servers/pattern-library
npm run build
```

3. Add tests:
```typescript
// mcp-servers/pattern-library/src/__tests__/pattern-library.test.ts
```

### Run Database Migrations

```bash
# Manually via Supabase UI (SQL Editor)
# Or use Supabase CLI:
npx supabase db push
```

### Update Documentation

- **API changes**: Update `docs/API_DOCUMENTATION.md`
- **Architecture changes**: Update `ARCHITECTURE.md`
- **Setup changes**: Update `SETUP.md`
- **Testing changes**: Update `TESTING.md`

---

## Troubleshooting

### Port Already in Use

**Problem**: Error: `Port 3001 already in use`

**Solution**:
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3001 | xargs kill -9
```

### Supabase Connection Errors

**Problem**: `Failed to connect to Supabase`

**Solution**:
1. Check `.env` files have correct `SUPABASE_URL` and keys
2. Verify Supabase project is running (check dashboard)
3. Check network connectivity
4. Verify API keys haven't expired

### TypeScript Errors

**Problem**: Type errors in IDE

**Solution**:
```bash
# Rebuild TypeScript
npm run build

# Clear cache
rm -rf node_modules
npm install

# Restart TypeScript server in VS Code
Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

### Test Failures

**Problem**: Tests failing unexpectedly

**Solution**:
```bash
# Clear test cache
npm run test -- --clearCache

# Update snapshots
npm run test -- -u

# Run tests in band (no parallel)
npm run test -- --runInBand
```

### MCP Server Not Starting

**Problem**: MCP tools not available

**Solution**:
1. Rebuild MCP servers:
```bash
npm run build --workspaces
```

2. Check backend logs for errors
3. Verify MCP server paths in `backend/src/mcp/mcp-manager.ts`

### GitHub API Rate Limit

**Problem**: `Rate limit exceeded`

**Solution**:
- Wait for rate limit reset (check headers)
- Use authenticated requests (provide GitHub token)
- Implement caching to reduce API calls

---

## Resources

### Documentation

- [README.md](../README.md) - Project overview
- [SETUP.md](../SETUP.md) - Detailed setup guide
- [ARCHITECTURE.md](../ARCHITECTURE.md) - System architecture
- [TESTING.md](../TESTING.md) - Testing guide
- [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) - API reference
- [CLAUDE.md](../CLAUDE.md) - Claude Code guidance

### External Resources

- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Supabase Documentation](https://supabase.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com/)
- [React Flow Documentation](https://reactflow.dev/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vitest Documentation](https://vitest.dev/)
- [Jest Documentation](https://jestjs.io/)

### Team Communication

- **Slack**: #uroq-dev (development discussions)
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and proposals
- **Weekly Standups**: Mondays 10 AM

### Getting Help

1. Check existing documentation
2. Search GitHub issues
3. Ask in #uroq-dev Slack channel
4. Create a GitHub issue (for bugs or features)
5. Pair with senior developer

---

## Welcome Aboard!

You're all set! Here's a suggested first task to familiarize yourself with the codebase:

1. Run the application locally
2. Create a test account in Supabase
3. Connect to GitHub
4. Create a simple data model using the AI assistant
5. Export the model to GitHub
6. Review the generated YAML files

If you have any questions, don't hesitate to reach out to the team. Happy coding! 🚀
