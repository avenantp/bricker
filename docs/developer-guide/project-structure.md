# Project Structure Guide

This guide explains the organization of the Bricker codebase.

## Repository Structure

```
bricker/
├── frontend/              # React frontend application
├── backend/               # Node.js backend application
├── docs/                  # Documentation
├── .github/               # GitHub workflows and templates
├── package.json           # Root package.json (monorepo)
└── README.md             # Project README
```

## Frontend Structure

```
frontend/
├── public/                # Static assets
│   ├── favicon.ico
│   └── index.html
│
├── src/
│   ├── components/        # React components
│   │   ├── Canvas/       # Canvas-related components
│   │   ├── Common/       # Shared components
│   │   ├── Dashboard/    # Dashboard components
│   │   ├── Settings/     # Settings components
│   │   └── Auth/         # Authentication components
│   │
│   ├── hooks/            # Custom React hooks
│   │   ├── useDatasets.ts
│   │   ├── useGitSync.ts
│   │   ├── useRealtimeSync.ts
│   │   └── useAuth.ts
│   │
│   ├── lib/              # Service layer (API calls)
│   │   ├── dataset-service.ts
│   │   ├── column-service.ts
│   │   ├── lineage-service.ts
│   │   ├── git-sync-service.ts
│   │   ├── yaml-generator.ts
│   │   ├── yaml-parser.ts
│   │   └── supabase.ts
│   │
│   ├── store/            # State management
│   │   ├── useStore.ts
│   │   └── types.ts
│   │
│   ├── types/            # TypeScript type definitions
│   │   ├── dataset.ts
│   │   ├── column.ts
│   │   ├── lineage.ts
│   │   ├── canvas.ts
│   │   ├── company.ts
│   │   └── index.ts
│   │
│   ├── utils/            # Utility functions
│   │   ├── format.ts
│   │   ├── validation.ts
│   │   └── constants.ts
│   │
│   ├── pages/            # Page components
│   │   ├── Dashboard.tsx
│   │   ├── Project.tsx
│   │   ├── Workspace.tsx
│   │   └── Settings.tsx
│   │
│   ├── App.tsx           # Root component
│   ├── main.tsx          # Entry point
│   └── vite-env.d.ts     # Vite type definitions
│
├── tests/                # Frontend tests
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
├── .env.example          # Environment variables template
├── package.json          # Frontend dependencies
├── tsconfig.json         # TypeScript configuration
├── vite.config.ts        # Vite configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── postcss.config.js     # PostCSS configuration
```

## Backend Structure

```
backend/
├── src/
│   ├── routes/           # API routes
│   │   ├── auth.ts
│   │   ├── companies.ts
│   │   ├── projects.ts
│   │   ├── workspaces.ts
│   │   ├── datasets.ts
│   │   ├── columns.ts
│   │   ├── lineage.ts
│   │   ├── git-sync.ts
│   │   └── index.ts
│   │
│   ├── services/         # Business logic
│   │   ├── auth-service.ts
│   │   ├── company-service.ts
│   │   ├── dataset-service.ts
│   │   ├── git-service.ts
│   │   └── yaml-service.ts
│   │
│   ├── middleware/       # Express middleware
│   │   ├── auth.ts
│   │   ├── error-handler.ts
│   │   ├── validation.ts
│   │   ├── change-tracking.ts
│   │   └── rate-limit.ts
│   │
│   ├── lib/              # Utility libraries
│   │   ├── supabase.ts
│   │   ├── github.ts
│   │   ├── gitlab.ts
│   │   ├── encryption.ts
│   │   └── logger.ts
│   │
│   ├── types/            # TypeScript types
│   │   ├── api.ts
│   │   ├── database.ts
│   │   └── index.ts
│   │
│   ├── config/           # Configuration
│   │   ├── database.ts
│   │   ├── auth.ts
│   │   └── constants.ts
│   │
│   └── index.ts          # Entry point
│
├── migrations/           # Database migrations
│   ├── M_0_1_create_companies_and_multi_tenancy.sql
│   ├── M_0_2_add_multi_tenancy_to_core_tables.sql
│   ├── M_0_3_create_mapping_tables.sql
│   └── ...
│
├── seeds/                # Database seed data
│   ├── 001_companies.ts
│   ├── 002_users.ts
│   └── 003_projects.ts
│
├── tests/                # Backend tests
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── .env.example          # Environment variables template
├── package.json          # Backend dependencies
├── tsconfig.json         # TypeScript configuration
└── jest.config.js        # Jest configuration
```

## Documentation Structure

```
docs/
├── user-guide/           # User documentation
│   ├── README.md
│   ├── getting-started.md
│   ├── workspaces-and-projects.md
│   ├── datasets-and-lineage.md
│   ├── source-control-sync.md
│   ├── multi-tenancy.md
│   └── migration-guide.md
│
├── developer-guide/      # Developer documentation
│   ├── README.md
│   ├── development-setup.md (this file)
│   ├── project-structure.md
│   ├── architecture-overview.md
│   ├── database-schema.md
│   ├── api-documentation.md
│   ├── component-documentation.md
│   ├── state-management.md
│   ├── canvas-system.md
│   ├── type-system.md
│   ├── service-layer.md
│   ├── authentication.md
│   ├── source-control-services.md
│   ├── testing-guide.md
│   ├── test-coverage.md
│   └── contribution-guide.md
│
└── prp/                  # Project Requirements (PRD)
    ├── 000-task-list-refactored.md
    ├── 001-technical-specifications-refactored.md
    └── 002-automation.md
```

## Key Directories Explained

### Frontend Components

**`frontend/src/components/Canvas/`**
- Canvas-related React components
- Dataset visualization components
- React Flow integration

**Key Files:**
- `DatasetNode.tsx` - Dataset node component
- `RelationshipEdge.tsx` - Edge component for references
- `ProjectCanvas.tsx` - Main canvas container
- `DatasetEditorDialog.tsx` - Dataset editor modal
- `GitSyncPanel.tsx` - Git sync UI
- `DatasetContextMenu.tsx` - Right-click menu

**`frontend/src/components/Common/`**
- Reusable UI components
- Shared across application

**Key Files:**
- `Button.tsx` - Button component
- `Input.tsx` - Input component
- `Select.tsx` - Select dropdown
- `Modal.tsx` - Modal dialog
- `Loading.tsx` - Loading spinner
- `ErrorBoundary.tsx` - Error boundary

**`frontend/src/components/Dashboard/`**
- Dashboard-specific components
- Project listing
- Company overview

**`frontend/src/components/Settings/`**
- Settings page components
- Company settings
- User settings
- Subscription management

### Frontend Hooks

**`frontend/src/hooks/`**
- Custom React hooks
- Encapsulate reusable logic

**Key Files:**
- `useDatasets.ts` - Dataset CRUD operations
- `useGitSync.ts` - Git sync operations
- `useRealtimeSync.ts` - Real-time subscriptions
- `useAuth.ts` - Authentication state
- `useCompany.ts` - Company data

### Frontend Services

**`frontend/src/lib/`**
- Service layer for API calls
- Data transformation logic

**Key Files:**
- `dataset-service.ts` - Dataset API calls
- `column-service.ts` - Column API calls
- `lineage-service.ts` - Lineage API calls
- `git-sync-service.ts` - Git sync API calls
- `yaml-generator.ts` - Generate YAML from datasets
- `yaml-parser.ts` - Parse YAML to datasets
- `supabase.ts` - Supabase client initialization

### Frontend Types

**`frontend/src/types/`**
- TypeScript type definitions
- Interfaces and types

**Key Files:**
- `dataset.ts` - Dataset types
- `column.ts` - Column types
- `lineage.ts` - Lineage types
- `canvas.ts` - Canvas/React Flow types
- `company.ts` - Company and user types
- `index.ts` - Exports all types

### Backend Routes

**`backend/src/routes/`**
- Express route handlers
- API endpoint definitions

**Key Files:**
- `auth.ts` - Authentication endpoints
- `companies.ts` - Company management
- `projects.ts` - Project CRUD
- `workspaces.ts` - Workspace CRUD
- `datasets.ts` - Dataset CRUD
- `columns.ts` - Column CRUD
- `lineage.ts` - Lineage CRUD
- `git-sync.ts` - Git sync endpoints

**Route Structure:**
```typescript
// Example: datasets.ts
router.get('/api/datasets', listDatasets);
router.get('/api/datasets/:id', getDataset);
router.post('/api/datasets', createDataset);
router.put('/api/datasets/:id', updateDataset);
router.delete('/api/datasets/:id', deleteDataset);
```

### Backend Services

**`backend/src/services/`**
- Business logic
- Data access layer

**Key Files:**
- `auth-service.ts` - Authentication logic
- `company-service.ts` - Company operations
- `dataset-service.ts` - Dataset business logic
- `git-service.ts` - Git operations
- `yaml-service.ts` - YAML generation/parsing

**Service Pattern:**
```typescript
// Services handle business logic
export class DatasetService {
  async create(data: CreateDatasetDto): Promise<Dataset> {
    // Validation
    // Business logic
    // Database operations
    // Return result
  }
}
```

### Backend Middleware

**`backend/src/middleware/`**
- Express middleware functions
- Request processing

**Key Files:**
- `auth.ts` - JWT authentication
- `error-handler.ts` - Error handling
- `validation.ts` - Request validation
- `change-tracking.ts` - Track changes for Git sync
- `rate-limit.ts` - Rate limiting

**Middleware Pattern:**
```typescript
export const authenticate = async (req, res, next) => {
  // Validate JWT token
  // Attach user to request
  // Call next()
};
```

### Database Migrations

**`backend/migrations/`**
- SQL migration files
- Version-controlled schema changes

**Naming Convention:**
```
M_<phase>_<sequence>_<description>.sql
```

**Examples:**
- `M_0_1_create_companies_and_multi_tenancy.sql`
- `M_1_2_add_reference_columns.sql`

**Migration Structure:**
```sql
-- M_1_2_add_reference_columns.sql

-- Add columns
ALTER TABLE columns ADD COLUMN reference_column_id UUID;
ALTER TABLE columns ADD COLUMN reference_type VARCHAR;

-- Add constraints
ALTER TABLE columns ADD CONSTRAINT fk_reference_column
  FOREIGN KEY (reference_column_id) REFERENCES columns(id);

-- Add indexes
CREATE INDEX idx_columns_reference_column_id ON columns(reference_column_id);
```

## Important Files

### Configuration Files

**Root Level:**
- `package.json` - Root dependencies and scripts
- `.gitignore` - Git ignore patterns
- `README.md` - Project README

**Frontend:**
- `frontend/package.json` - Frontend dependencies
- `frontend/vite.config.ts` - Vite bundler configuration
- `frontend/tsconfig.json` - TypeScript configuration
- `frontend/tailwind.config.js` - Tailwind CSS configuration
- `frontend/.env.example` - Environment variables template

**Backend:**
- `backend/package.json` - Backend dependencies
- `backend/tsconfig.json` - TypeScript configuration
- `backend/jest.config.js` - Jest test configuration
- `backend/.env.example` - Environment variables template

### Entry Points

**Frontend Entry Point:**
```
frontend/src/main.tsx
  └── App.tsx
      └── Router
          └── Pages
```

**Backend Entry Point:**
```
backend/src/index.ts
  └── Express app
      └── Middleware
      └── Routes
      └── Error handling
```

## Naming Conventions

### Files

**TypeScript Files:**
- `kebab-case.ts` for utilities, services, types
- `PascalCase.tsx` for React components

**Examples:**
```
✅ Good:
dataset-service.ts
column-service.ts
DatasetNode.tsx
ProjectCanvas.tsx

❌ Bad:
DatasetService.ts
column_service.ts
datasetNode.tsx
project-canvas.tsx
```

### Directories

**All Lowercase with Hyphens:**
```
✅ Good:
components/
source-control/
git-sync/

❌ Bad:
Components/
sourceControl/
Git_Sync/
```

### Components

**Component Files:**
- One component per file
- File name matches component name
- Export default for main component
- Export named for additional exports

**Example:**
```typescript
// DatasetNode.tsx
export default function DatasetNode({ data }: Props) {
  // Component code
}

export type DatasetNodeProps = { /* ... */ };
export const DatasetNodeMemo = memo(DatasetNode);
```

### Services

**Service Files:**
- One service per file
- Functions or class-based
- Export all functions

**Example:**
```typescript
// dataset-service.ts
export async function getDatasets(projectId: string): Promise<Dataset[]> {
  // Implementation
}

export async function createDataset(data: CreateDatasetDto): Promise<Dataset> {
  // Implementation
}
```

## Import Organization

**Import Order:**
1. External libraries (React, third-party)
2. Internal aliases (`@/components`, `@/lib`)
3. Relative imports (`./`, `../`)
4. Type imports (last)

**Example:**
```typescript
// 1. External libraries
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Node, Edge } from 'reactflow';

// 2. Internal aliases
import { Button } from '@/components/Common';
import { getDatasets } from '@/lib/dataset-service';

// 3. Relative imports
import { DatasetNode } from './DatasetNode';
import { ProjectCanvas } from '../Canvas';

// 4. Type imports
import type { Dataset, Column } from '@/types';
```

## Path Aliases

**TypeScript Path Aliases:**

Frontend `tsconfig.json`:
```json
{
  "compilerOptions": {
    "baseUrl": "src",
    "paths": {
      "@/*": ["./*"],
      "@/components/*": ["components/*"],
      "@/lib/*": ["lib/*"],
      "@/types/*": ["types/*"],
      "@/hooks/*": ["hooks/*"],
      "@/utils/*": ["utils/*"]
    }
  }
}
```

**Usage:**
```typescript
// Instead of:
import { Button } from '../../../components/Common/Button';

// Use:
import { Button } from '@/components/Common/Button';
```

## Code Organization Principles

### Component Structure

**Component File Structure:**
```typescript
// 1. Imports
import React from 'react';
import type { Props } from './types';

// 2. Type definitions
interface DatasetNodeProps {
  id: string;
  name: string;
}

// 3. Constants
const DEFAULT_WIDTH = 200;

// 4. Component
export default function DatasetNode({ id, name }: DatasetNodeProps) {
  // 4a. Hooks
  const [state, setState] = useState();

  // 4b. Handlers
  const handleClick = () => {};

  // 4c. Effects
  useEffect(() => {}, []);

  // 4d. Render
  return <div>{name}</div>;
}

// 5. Exports
export type { DatasetNodeProps };
```

### Service Structure

**Service File Structure:**
```typescript
// 1. Imports
import { supabase } from './supabase';
import type { Dataset } from '@/types';

// 2. Types
interface CreateDatasetDto {
  name: string;
  project_id: string;
}

// 3. Functions
export async function getDatasets(projectId: string): Promise<Dataset[]> {
  const { data, error } = await supabase
    .from('datasets')
    .select('*')
    .eq('project_id', projectId);

  if (error) throw error;
  return data;
}

export async function createDataset(dto: CreateDatasetDto): Promise<Dataset> {
  // Implementation
}
```

## Testing Structure

**Test File Location:**
```
# Place test files next to source files
frontend/src/components/Canvas/
  DatasetNode.tsx
  DatasetNode.test.tsx  # Unit test

# Or in separate test directory
frontend/tests/
  unit/
    components/
      Canvas/
        DatasetNode.test.tsx
```

**Test File Naming:**
- Unit tests: `*.test.tsx` or `*.test.ts`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.test.ts`

## Build Output

**Frontend Build:**
```
frontend/dist/          # Production build
  index.html
  assets/
    index-[hash].js
    index-[hash].css
```

**Backend Build:**
```
backend/dist/           # Compiled TypeScript
  index.js
  routes/
  services/
  middleware/
```

## Getting Started

**Navigate the Codebase:**

1. **Start with entry points:**
   - Frontend: `frontend/src/main.tsx`
   - Backend: `backend/src/index.ts`

2. **Explore key directories:**
   - Components: `frontend/src/components/`
   - Services: `frontend/src/lib/` and `backend/src/services/`
   - Types: `frontend/src/types/` and `backend/src/types/`

3. **Understand data flow:**
   - User interaction → Component
   - Component → Hook → Service
   - Service → API → Backend
   - Backend → Database

## Next Steps

- Read [Architecture Overview](./architecture-overview.md)
- Explore [Component Documentation](./component-documentation.md)
- Review [API Documentation](./api-documentation.md)
- Study [Database Schema](./database-schema.md)

---

**Last Updated**: 2025-01-15
**Version**: 2.0.0
