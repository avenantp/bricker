# Uroq Developer Documentation

Welcome to the Uroq developer documentation! This guide will help you understand the architecture, contribute to the codebase, and build on top of Uroq.

## 📚 Documentation Sections

### Getting Started
- [Development Setup](./development-setup.md) - Set up your local development environment
- [Project Structure](./project-structure.md) - Understanding the codebase organization
- [Contribution Guide](./contribution-guide.md) - How to contribute to Uroq

### Architecture
- [Architecture Overview](./architecture-overview.md) - High-level system architecture
- [Database Schema](./database-schema.md) - Complete database documentation
- [Multi-Tenant Architecture](./multi-tenant-architecture.md) - Company isolation and RLS
- [Source Control Sync](./source-control-sync-architecture.md) - Database-first Git sync

### Frontend Development
- [Component Documentation](./component-documentation.md) - React components guide
- [State Management](./state-management.md) - Zustand stores and React Query
- [Canvas System](./canvas-system.md) - React Flow canvas implementation
- [Type System](./type-system.md) - TypeScript types and interfaces

### Backend Development
- [API Documentation](./api-documentation.md) - REST API endpoints
- [Service Layer](./service-layer.md) - Business logic and data access
- [Authentication](./authentication.md) - Supabase auth integration
- [Source Control Services](./source-control-services.md) - Git integration services

### Testing
- [Testing Guide](./testing-guide.md) - Writing and running tests
- [Test Coverage](./test-coverage.md) - Coverage goals and status

## 🏗️ Architecture at a Glance

### Technology Stack

**Frontend:**
- React 18+ with TypeScript
- React Flow for visual canvas
- Tailwind CSS for styling
- Zustand for client state
- React Query for server state
- Vite for build tooling

**Backend:**
- Node.js with Express
- TypeScript
- Supabase for database and auth
- GitHub/GitLab API for source control

**Database:**
- PostgreSQL (via Supabase)
- Row-Level Security (RLS) for multi-tenancy
- Real-time subscriptions

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Canvas     │  │   Dataset    │  │    Source    │       │
│  │  (React Flow)│  │    Editor    │  │   Control    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         │                  │                  │               │
│  ┌──────────────────────────────────────────────────┐       │
│  │          State Management (Zustand + React Query) │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS/WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Express + Supabase)               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Dataset    │  │   Source     │  │    Auth      │       │
│  │   Service    │  │   Control    │  │   Service    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│         │                  │                  │               │
│  ┌──────────────────────────────────────────────────┐       │
│  │              Supabase Client                      │       │
│  └──────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ PostgreSQL Protocol
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Database (PostgreSQL)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  accounts   │  │   Datasets   │  │   Columns    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │   Projects   │  │  Workspaces  │  │   Lineage    │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                                │
│         RLS Policies for Multi-Tenant Isolation               │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ Git API
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                  Source Control (GitHub/GitLab)               │
│                     YAML Files Repository                     │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Key Concepts

### Multi-Tenant Architecture

**Company-Based Isolation:**
- All resources belong to a company
- Row-Level Security (RLS) enforces isolation
- Subscription tiers control limits
- Shared resources via mapping tables

**Access Control:**
- Company roles: admin, member
- Resource roles: owner, admin, editor, viewer
- Visibility levels: public, private, locked

### Database-First Pattern

**Workflow:**
1. User edits in database (real-time)
2. Changes tracked as uncommitted
3. User commits to Git with message
4. YAML files generated and pushed
5. Pull from Git updates database

**Benefits:**
- Real-time collaboration
- Single source of truth (database)
- Version control (Git)
- Conflict resolution

### Shared Resources

**Datasets Can Be Shared:**
- Created in one project
- Added to multiple projects (via `project_datasets`)
- Positioned in multiple workspaces (via `workspace_datasets`)
- Owner maintains control
- Changes reflected everywhere

## 🚀 Quick Start for Developers

### Prerequisites

```bash
# Required
- Node.js 18+
- npm or pnpm
- Git
- Supabase account

# Optional
- Docker (for local Supabase)
- GitHub account (for source control testing)
```

### Setup

```bash
# Clone repository
git clone https://github.com/your-org/uroq.git
cd uroq

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Run database migrations (if using local Supabase)
cd backend
npm run migrate

# Start development servers
npm run dev          # Starts both frontend and backend

# Or start separately
cd frontend && npm run dev    # Frontend on port 5173
cd backend && npm run dev     # Backend on port 3000
```

### Making Changes

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes
# ... edit files ...

# Run tests
npm test

# Run linting
npm run lint

# Commit changes
git add .
git commit -m "feat: add your feature"

# Push and create PR
git push origin feature/your-feature-name
```

## 📖 Common Development Tasks

### Adding a New API Endpoint

1. Define types in `frontend/src/types/`
2. Create service function in `frontend/src/lib/`
3. Create API route in `backend/src/routes/`
4. Add React Query hook in `frontend/src/hooks/`
5. Write tests
6. Update API documentation

### Adding a New Canvas Component

1. Create component in `frontend/src/components/Canvas/`
2. Define node type in `frontend/src/types/canvas.ts`
3. Register in React Flow
4. Add to component exports
5. Write component tests
6. Update component documentation

### Adding a Database Table

1. Create migration in `backend/migrations/`
2. Add RLS policies for multi-tenancy
3. Add indexes for performance
4. Create TypeScript types
5. Update schema documentation
6. Test isolation

### Adding a Source Control Provider

1. Create client in `backend/src/lib/source-control/`
2. Implement interface (connect, commit, pull, push)
3. Add provider enum value
4. Update UI to show new provider
5. Write integration tests
6. Document provider setup

## 🧪 Testing

### Running Tests

```bash
# Frontend tests (Vitest)
cd frontend
npm test                 # Run tests
npm test:watch           # Watch mode
npm test:coverage        # Coverage report

# Backend tests (Jest)
cd backend
npm test                 # Run tests
npm test:watch           # Watch mode
npm test:coverage        # Coverage report
```

### Test Coverage Goals

- **Services**: 80%+
- **API Routes**: 75%+
- **Components**: 60%+
- **Overall**: 70%+

## 📝 Code Standards

### TypeScript

- Use strict mode
- Define explicit types
- Avoid `any` type
- Use interfaces for objects

### React

- Functional components with hooks
- Extract complex logic to custom hooks
- Use TypeScript for props
- Follow component structure

### Naming Conventions

**Files:**
- `kebab-case.ts` for files
- `PascalCase.tsx` for components

**Variables:**
- `camelCase` for variables
- `PascalCase` for types/interfaces
- `UPPER_CASE` for constants

**Database:**
- `snake_case` for tables/columns
- Pluralized table names
- Descriptive column names

## 🔒 Security

### Multi-Tenant Security

- **Always** filter by `account_id`
- **Never** bypass RLS policies
- **Test** cross-company isolation
- **Verify** user permissions

### Authentication

- Use Supabase Auth
- Validate JWT tokens
- Check user roles
- Enforce RLS policies

### Source Control

- Encrypt access tokens
- Never commit secrets
- Use environment variables
- Validate Git URLs

## 🐛 Debugging

### Frontend

```bash
# React DevTools
# Install browser extension

# Console logging
console.log('[Dataset]', dataset);

# React Query DevTools
# Automatically available in dev mode
```

### Backend

```bash
# Node debugging
node --inspect src/index.ts

# Or use VS Code debugger
# See .vscode/launch.json
```

### Database

```bash
# Supabase Studio
# Available at: https://app.supabase.com

# Direct SQL queries
# Use Supabase SQL Editor

# Check RLS policies
SELECT * FROM pg_policies;
```

## 📚 Additional Resources

### Internal Documentation
- [Architecture Overview](./architecture-overview.md)
- [Database Schema](./database-schema.md)
- [API Documentation](./api-documentation.md)
- [Component Documentation](./component-documentation.md)

### External Resources
- [React Documentation](https://react.dev)
- [React Flow Documentation](https://reactflow.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### Community
- GitHub Issues: Report bugs and request features
- Discussions: Ask questions and share ideas
- Discord: Join our developer community
- Weekly Calls: Join our developer sync meetings

## 🤝 Contributing

We welcome contributions! Please read our [Contribution Guide](./contribution-guide.md) for:
- Code of conduct
- Development workflow
- Pull request process
- Code review guidelines
- Release process

## 📧 Contact

- **Technical Questions**: dev@uroq.com
- **Bug Reports**: bugs@uroq.com
- **Feature Requests**: features@uroq.com
- **Security Issues**: security@uroq.com

---

**Happy Coding!** 🚀

Last Updated: 2025-01-15
Version: 2.0.0
