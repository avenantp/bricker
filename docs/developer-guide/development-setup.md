# Development Setup Guide

This guide walks you through setting up your local development environment for Uroq.

## Prerequisites

### Required Software

**Node.js and npm:**
```bash
# Required: Node.js 18.x or higher
node --version  # Should be v18.0.0 or higher
npm --version   # Should be 9.0.0 or higher
```

**Install Node.js:**
- Download from [nodejs.org](https://nodejs.org/)
- Or use nvm (recommended):
  ```bash
  # Install nvm
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

  # Install Node.js
  nvm install 18
  nvm use 18
  ```

**Git:**
```bash
# Check if installed
git --version

# Install if needed:
# macOS: brew install git
# Windows: https://git-scm.com/download/win
# Linux: sudo apt install git
```

**Text Editor/IDE:**
- VS Code (recommended) - [code.visualstudio.com](https://code.visualstudio.com/)
- WebStorm
- Any editor with TypeScript support

### Optional Software

**Docker (for local Supabase):**
```bash
# Check if installed
docker --version
docker-compose --version

# Install: https://docs.docker.com/get-docker/
```

**pnpm (alternative to npm):**
```bash
# Install globally
npm install -g pnpm

# Verify
pnpm --version
```

## Account Setup

### Supabase Account

**Option 1: Use Supabase Cloud (Recommended for Development)**
1. Go to [supabase.com](https://supabase.com)
2. Sign up for free account
3. Create new project
4. Note your project URL and anon key

**Option 2: Run Supabase Locally (Advanced)**
```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase
supabase init

# Start local Supabase
supabase start

# Note the URLs and keys output
```

### GitHub Account

**For Source Control Integration:**
1. Create GitHub account at [github.com](https://github.com)
2. Create personal access token:
   - Settings → Developer settings → Personal access tokens → Fine-grained tokens
   - Generate new token
   - Permissions needed:
     - Repository access: Contents (read/write)
     - Metadata (read)
   - Save token securely

## Project Setup

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/your-org/uroq.git
cd uroq

# Or if you forked it:
git clone https://github.com/your-username/uroq.git
cd uroq
```

### 2. Install Dependencies

**Root level (if using monorepo):**
```bash
npm install
```

**Or install separately:**
```bash
# Frontend dependencies
cd frontend
npm install

# Backend dependencies
cd ../backend
npm install
```

**Using pnpm (alternative):**
```bash
# Root level
pnpm install

# Or separately
cd frontend && pnpm install
cd ../backend && pnpm install
```

### 3. Environment Configuration

**Frontend Environment:**

Create `frontend/.env`:
```bash
# Copy example file
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env`:
```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# API Configuration
VITE_API_URL=http://localhost:3000

# Environment
VITE_ENV=development

# Feature Flags
VITE_ENABLE_GIT_SYNC=true
VITE_ENABLE_MULTI_TENANT=true
```

**Backend Environment:**

Create `backend/.env`:
```bash
# Copy example file
cp backend/.env.example backend/.env
```

Edit `backend/.env`:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
SUPABASE_ANON_KEY=your-anon-key-here

# Database Configuration
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# JWT Configuration
JWT_SECRET=your-jwt-secret-here

# GitHub Configuration (optional for development)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret

# Encryption Key (for tokens)
ENCRYPTION_KEY=your-32-character-encryption-key

# CORS Configuration
CORS_ORIGIN=http://localhost:5173

# Logging
LOG_LEVEL=debug
```

**Get Supabase Keys:**
1. Go to your Supabase project dashboard
2. Settings → API
3. Copy:
   - Project URL → `SUPABASE_URL`
   - anon/public key → `SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_KEY` (keep secret!)

**Generate Secrets:**
```bash
# Generate random secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Database Setup

**Option A: Using Supabase Cloud**

Run migrations via Supabase dashboard:
1. Go to SQL Editor in Supabase dashboard
2. Run migration files in order:
   - `backend/migrations/M_0_1_create_accounts_and_multi_tenancy.sql`
   - `backend/migrations/M_0_2_add_multi_tenancy_to_core_tables.sql`
   - `backend/migrations/M_0_3_create_mapping_tables.sql`
   - Continue with remaining migrations...

**Option B: Using Supabase CLI (Local)**

```bash
# Navigate to backend
cd backend

# Run migrations
supabase db push

# Or run individual migration
psql $DATABASE_URL -f migrations/M_0_1_create_accounts_and_multi_tenancy.sql
```

**Option C: Using Migration Script**

```bash
# Navigate to backend
cd backend

# Run migration script
npm run migrate

# Or run specific migration
npm run migrate -- M_0_1
```

**Verify Database Setup:**
```bash
# Check tables exist
psql $DATABASE_URL -c "\dt"

# Should see tables:
# - accounts
# - users
# - projects
# - workspaces
# - datasets
# - columns
# - lineage
# - project_datasets
# - workspace_datasets
# - source_control_commits
# - metadata_changes
```

### 5. Seed Data (Optional)

```bash
# Run seed script
cd backend
npm run seed

# This creates:
# - Test company
# - Test users
# - Sample projects
# - Sample datasets
# - Sample lineage
```

## Running the Application

### Development Mode

**Option 1: Run Both Servers Simultaneously (Recommended)**

From root directory:
```bash
npm run dev
```

This starts:
- Frontend dev server on `http://localhost:5173`
- Backend dev server on `http://localhost:3000`

**Option 2: Run Servers Separately**

Terminal 1 - Frontend:
```bash
cd frontend
npm run dev
```

Terminal 2 - Backend:
```bash
cd backend
npm run dev
```

### Production Build

**Build Frontend:**
```bash
cd frontend
npm run build

# Preview build
npm run preview
```

**Build Backend:**
```bash
cd backend
npm run build

# Run production build
npm start
```

## Verify Setup

### 1. Check Frontend

Open browser to `http://localhost:5173`

**Expected:**
- Login page loads
- No console errors
- Can create account
- Can log in

### 2. Check Backend

```bash
# Test health endpoint
curl http://localhost:3000/health

# Expected response:
# {"status":"ok","timestamp":"2025-01-15T12:00:00.000Z"}
```

### 3. Check Database Connection

```bash
# Test database query
curl http://localhost:3000/api/accounts

# Expected: List of accounts or empty array []
```

### 4. Check Authentication

```bash
# Create test user
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test123456!",
    "full_name": "Test User"
  }'

# Expected: User object with JWT token
```

## Development Tools

### VS Code Extensions (Recommended)

```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "bradlc.vscode-tailwindcss",
    "Prisma.prisma",
    "ms-vscode.vscode-typescript-next",
    "streetsidesoftware.code-spell-checker",
    "eamodio.gitlens"
  ]
}
```

Install all:
```bash
# Extensions are listed in .vscode/extensions.json
# VS Code will prompt to install them
```

### VS Code Settings

Create `.vscode/settings.json`:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative",
  "files.exclude": {
    "**/.git": true,
    "**/node_modules": true,
    "**/dist": true,
    "**/.next": true
  }
}
```

### Browser Extensions

**React Developer Tools:**
- Chrome: [Chrome Web Store](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- Firefox: [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)

**Redux DevTools (if using Redux):**
- Chrome: [Chrome Web Store](https://chrome.google.com/webstore/detail/redux-devtools/lmhkpmbekcpmknklioeibfkpmmfibljd)

### Database Tools

**Supabase Studio:**
- Built-in to Supabase dashboard
- Access at: `https://app.supabase.com/project/your-project-id`

**pgAdmin (Alternative):**
- Download: [pgadmin.org](https://www.pgadmin.org/)
- Connect using `DATABASE_URL` from `.env`

**DBeaver (Alternative):**
- Download: [dbeaver.io](https://dbeaver.io/)
- Free, cross-platform SQL client

## Common Setup Issues

### Port Already in Use

**Error:** `Port 3000 already in use`

**Solution:**
```bash
# Find process using port
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Or change port in backend/.env
PORT=3001
```

### Cannot Connect to Database

**Error:** `ECONNREFUSED` or `Connection refused`

**Solutions:**
1. Check Supabase project is running
2. Verify `SUPABASE_URL` in `.env`
3. Check database URL format:
   ```
   postgresql://user:password@host:port/database
   ```
4. Ensure IP is allowed in Supabase settings

### Module Not Found Errors

**Error:** `Cannot find module 'X'`

**Solution:**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Or clear npm cache
npm cache clean --force
npm install
```

### TypeScript Errors

**Error:** `Cannot find type definitions`

**Solution:**
```bash
# Install missing type definitions
npm install --save-dev @types/node @types/react @types/react-dom

# Restart TypeScript server in VS Code
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

### Environment Variables Not Loading

**Error:** `undefined` when accessing `process.env.X`

**Solution:**
1. Restart dev server after changing `.env`
2. Check `.env` file is in correct directory
3. Verify variable names match exactly (case-sensitive)
4. For Vite, ensure variables start with `VITE_`

## Development Workflow

### Daily Workflow

```bash
# 1. Pull latest changes
git pull origin main

# 2. Install any new dependencies
npm install

# 3. Start dev servers
npm run dev

# 4. Make changes
# ... edit files ...

# 5. Run tests
npm test

# 6. Lint and format
npm run lint
npm run format

# 7. Commit changes
git add .
git commit -m "feat: add new feature"
git push origin feature/your-branch
```

### Working with Branches

```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes and commit
git add .
git commit -m "feat: implement feature"

# Push to remote
git push origin feature/your-feature-name

# Create pull request on GitHub
# ... follow PR template ...

# After PR merged, update main
git checkout main
git pull origin main
git branch -d feature/your-feature-name
```

### Database Migrations

```bash
# Create new migration
npm run migrate:create migration_name

# Run migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Reset database (CAUTION: deletes all data)
npm run migrate:reset
```

## Next Steps

**Now that your environment is set up:**

1. **Read Architecture Documentation**
   - [Architecture Overview](./architecture-overview.md)
   - [Database Schema](./database-schema.md)

2. **Explore the Codebase**
   - [Project Structure](./project-structure.md)
   - [Component Documentation](./component-documentation.md)

3. **Start Contributing**
   - [Contribution Guide](./contribution-guide.md)
   - Pick an issue from GitHub Issues
   - Follow the development workflow

4. **Run Tests**
   - [Testing Guide](./testing-guide.md)
   - Ensure tests pass before committing

## Getting Help

**If you encounter issues:**

1. Check this guide's troubleshooting section
2. Search GitHub Issues for similar problems
3. Ask in Discord #dev-help channel
4. Contact dev team at dev@uroq.com

**Useful Resources:**
- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Node.js Documentation](https://nodejs.org/docs)

---

**Last Updated**: 2025-01-15
**Version**: 2.0.0
