# Architecture Overview

This document provides a comprehensive overview of Bricker's system architecture, design patterns, and key architectural decisions.

## High-Level Architecture

### System Overview

Bricker is a modern web application built on a three-tier architecture:

```
┌─────────────────────────────────────────────────────────────────┐
│                        Client Layer                              │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  React 18 + TypeScript + React Flow + Tailwind CSS         │ │
│  │  State: Zustand (client) + React Query (server)            │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS/WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                           │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  Node.js + Express + TypeScript                            │ │
│  │  Business Logic + Git Integration + YAML Processing        │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ PostgreSQL Protocol
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Data Layer                                 │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  PostgreSQL (via Supabase)                                 │ │
│  │  Row-Level Security (RLS) + Real-time Subscriptions        │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Git API
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Source Control Layer                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  GitHub / GitLab / Bitbucket / Azure DevOps                │ │
│  │  YAML Files + Version History                              │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Core Architectural Patterns

### 1. Multi-Tenant Architecture

**Company-Based Isolation:**

```
┌─────────────────────────────────────────────────────────────────┐
│                        Company (Root Entity)                     │
│  company_id: UUID (Isolation Boundary)                          │
│  company_type: individual | organization                        │
│  subscription_tier: free | pro | enterprise                     │
└─────────────────────────────────────────────────────────────────┘
         │
         ├─────────────────┬─────────────────┬──────────────────┐
         ▼                 ▼                 ▼                  ▼
    ┌─────────┐      ┌──────────┐     ┌──────────┐      ┌──────────┐
    │  Users  │      │ Projects │     │Workspaces│      │ Datasets │
    │ (roles) │      │(owner_id)│     │(owner_id)│      │(owner_id)│
    └─────────┘      └──────────┘     └──────────┘      └──────────┘
```

**Key Features:**
- Every resource has `company_id` for isolation
- Row-Level Security (RLS) enforces boundaries
- Subscription tiers control resource limits
- Resources have owners and visibility levels

**Isolation Enforcement:**
```sql
-- RLS Policy Example
CREATE POLICY "Users can only access their company's datasets"
ON datasets
FOR SELECT
USING (company_id = auth.company_id());
```

### 2. Database-First Pattern

**Workflow:**

```
User Action (UI)
    ↓
Database Update (Supabase)
    ↓
Mark as Uncommitted (has_uncommitted_changes = true)
    ↓
User Commits (via UI)
    ↓
Generate YAML Files
    ↓
Push to Git (GitHub/GitLab/etc)
    ↓
Update sync status (synced, commit_sha stored)
```

**Benefits:**
- Real-time collaboration (multiple users edit simultaneously)
- Single source of truth (database is authoritative)
- Version control (Git for history)
- Conflict resolution (merge strategies)

**Tracking Changes:**
```typescript
// Every mutation tracked in metadata_changes table
{
  entity_type: 'dataset' | 'column' | 'lineage',
  entity_id: UUID,
  change_type: 'create' | 'update' | 'delete',
  old_value: JSONB,
  new_value: JSONB,
  changed_by: UUID,
  changed_at: timestamp
}
```

### 3. Shared Resources Pattern

**Datasets Can Be Shared:**

```
Company
  ├── Project A
  │    ├── Dataset 1 (owner: User X)
  │    └── Dataset 2 (owner: User Y)
  │
  ├── Project B
  │    ├── Dataset 1 (shared from Project A)
  │    └── Dataset 3 (owner: User Z)
  │
  └── Workspaces
       ├── Workspace W1 (Project A)
       │    └── Dataset 1 (position: x=100, y=100)
       │
       └── Workspace W2 (Project B)
            └── Dataset 1 (position: x=200, y=150)
```

**Mapping Tables:**
- `project_datasets`: Tracks which datasets belong to which projects
- `workspace_datasets`: Tracks dataset positions in workspaces

**Benefits:**
- No duplication (single dataset, multiple uses)
- Centralized updates (change once, reflected everywhere)
- Consistent data models across projects

### 4. Layered Architecture

**Frontend Layers:**

```
┌─────────────────────────────────────────────────────────────────┐
│  Presentation Layer (Components)                                 │
│  - React components                                              │
│  - UI logic                                                      │
│  - User interactions                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  State Management Layer (Hooks + Stores)                        │
│  - React Query (server state)                                    │
│  - Zustand (client state)                                        │
│  - Custom hooks                                                  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Service Layer (API Clients)                                     │
│  - API calls                                                     │
│  - Data transformation                                           │
│  - Error handling                                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Network Layer (HTTP)                                            │
│  - Supabase client                                               │
│  - REST API                                                      │
│  - WebSocket (real-time)                                         │
└─────────────────────────────────────────────────────────────────┘
```

**Backend Layers:**

```
┌─────────────────────────────────────────────────────────────────┐
│  API Layer (Routes)                                              │
│  - Express routes                                                │
│  - Request validation                                            │
│  - Response formatting                                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Business Logic Layer (Services)                                 │
│  - Business rules                                                │
│  - Data validation                                               │
│  - Git operations                                                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Data Access Layer (Supabase Client)                            │
│  - Database queries                                              │
│  - RLS enforcement                                               │
│  - Transaction management                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Patterns

### 1. Create Dataset Flow

```
User clicks "Add Dataset"
    ↓
Component renders DatasetEditorDialog
    ↓
User fills form and clicks "Create"
    ↓
Component calls createDataset hook
    ↓
Hook calls dataset-service.createDataset()
    ↓
Service makes POST /api/datasets
    ↓
Backend route validates request
    ↓
Service layer creates dataset in DB
    ↓
Middleware marks as uncommitted
    ↓
Response returned to frontend
    ↓
React Query invalidates cache
    ↓
UI updates with new dataset
    ↓
Sync indicator shows "uncommitted"
```

### 2. Git Sync Flow

```
User clicks "Commit Changes"
    ↓
GitSyncPanel shows uncommitted changes
    ↓
User enters commit message
    ↓
User clicks "Commit"
    ↓
Frontend calls commitChanges()
    ↓
Backend:
  1. Fetch uncommitted datasets/columns/lineage
  2. Generate YAML for each dataset
  3. Create Git tree structure
  4. Commit to Git repository (GitHub API)
  5. Update datasets: has_uncommitted_changes = false
  6. Update datasets: github_commit_sha = <sha>
  7. Update datasets: sync_status = 'synced'
  8. Create record in source_control_commits table
    ↓
Response: { success: true, commit_sha: "abc123" }
    ↓
Frontend updates UI
    ↓
Sync indicator shows "synced"
```

### 3. Real-Time Collaboration Flow

```
User A edits Dataset X
    ↓
Change saved to Supabase
    ↓
Supabase broadcasts change (PostgreSQL NOTIFY)
    ↓
All connected clients receive update via WebSocket
    ↓
User B's client receives change
    ↓
React Query updates cache
    ↓
User B sees Dataset X update in real-time
```

### 4. Pull from Git Flow

```
User clicks "Pull from Git"
    ↓
Backend:
  1. Fetch latest commit from Git
  2. Compare commit_sha with stored sha
  3. If different:
     a. Fetch YAML files from Git
     b. Parse YAML to dataset objects
     c. For each dataset:
        - If exists in DB: check for conflicts
        - If conflict: mark for resolution
        - If no conflict: update DB
        - If not exists: create in DB
     d. Update sync status
  4. Return result
    ↓
Frontend shows:
  - Success message
  - Conflict resolution dialog (if conflicts)
  - Updated datasets
```

## Security Architecture

### 1. Authentication Flow

```
User enters credentials
    ↓
Frontend calls Supabase Auth
    ↓
Supabase validates credentials
    ↓
Returns JWT token
    ↓
Frontend stores token (localStorage)
    ↓
All API requests include token in Authorization header
    ↓
Backend validates JWT token
    ↓
Extracts user_id and company_id from token
    ↓
Attaches to request context
    ↓
RLS policies enforce access control
```

### 2. Row-Level Security (RLS)

**Policy Structure:**

```sql
-- Company Isolation Policy
CREATE POLICY "company_isolation"
ON datasets
USING (company_id = auth.company_id());

-- Visibility Policy
CREATE POLICY "visibility_policy"
ON datasets
FOR SELECT
USING (
  company_id = auth.company_id()
  AND (
    visibility = 'public'
    OR owner_id = auth.uid()
    OR auth.is_admin()
  )
);

-- Edit Policy
CREATE POLICY "edit_policy"
ON datasets
FOR UPDATE
USING (
  company_id = auth.company_id()
  AND (
    owner_id = auth.uid()
    OR auth.is_admin()
  )
  AND visibility != 'locked'
);
```

**RLS Helpers:**

```sql
-- auth.company_id() returns current user's company
CREATE FUNCTION auth.company_id() RETURNS UUID AS $$
  SELECT company_id FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE;

-- auth.is_admin() checks if user is company admin
CREATE FUNCTION auth.is_admin() RETURNS BOOLEAN AS $$
  SELECT company_role = 'admin' FROM users WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE;
```

### 3. Token Encryption

**Source Control Tokens:**

```typescript
// Tokens encrypted before storage
import { encrypt, decrypt } from './encryption';

// Storing token
const encryptedToken = encrypt(githubToken, process.env.ENCRYPTION_KEY);
await supabase
  .from('source_control_connections')
  .insert({ token: encryptedToken });

// Using token
const { data } = await supabase
  .from('source_control_connections')
  .select('token')
  .single();
const githubToken = decrypt(data.token, process.env.ENCRYPTION_KEY);
```

## State Management Architecture

### Client State (Zustand)

**Store Structure:**

```typescript
interface AppState {
  // UI State
  selectedDatasetId: string | null;
  canvasZoom: number;
  sidebarOpen: boolean;

  // User State
  currentUser: User | null;
  currentCompany: Company | null;

  // Actions
  setSelectedDataset: (id: string | null) => void;
  setCanvasZoom: (zoom: number) => void;
  toggleSidebar: () => void;
}

const useStore = create<AppState>((set) => ({
  selectedDatasetId: null,
  canvasZoom: 1,
  sidebarOpen: true,

  setSelectedDataset: (id) => set({ selectedDatasetId: id }),
  setCanvasZoom: (zoom) => set({ canvasZoom: zoom }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
}));
```

### Server State (React Query)

**Query Structure:**

```typescript
// useDatasets hook
export function useDatasets(projectId: string) {
  return useQuery({
    queryKey: ['datasets', projectId],
    queryFn: () => datasetService.getDatasets(projectId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// useMutation for creating datasets
export function useCreateDataset() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: datasetService.createDataset,
    onSuccess: (data) => {
      // Invalidate and refetch datasets
      queryClient.invalidateQueries({ queryKey: ['datasets'] });

      // Optimistically update cache
      queryClient.setQueryData(
        ['datasets', data.project_id],
        (old: Dataset[]) => [...old, data]
      );
    },
  });
}
```

### Real-Time State (Supabase Subscriptions)

**Subscription Pattern:**

```typescript
// Real-time dataset updates
useEffect(() => {
  const channel = supabase
    .channel('datasets')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'datasets',
        filter: `project_id=eq.${projectId}`,
      },
      (payload) => {
        // Update React Query cache
        queryClient.invalidateQueries(['datasets', projectId]);
      }
    )
    .subscribe();

  return () => {
    channel.unsubscribe();
  };
}, [projectId]);
```

## Canvas Architecture (React Flow)

### Node System

**Dataset Nodes:**

```typescript
// Custom node type
const nodeTypes = {
  dataset: DatasetNode,
};

// Node data structure
interface DatasetNodeData {
  dataset: Dataset;
  columns: Column[];
  syncStatus: 'synced' | 'uncommitted' | 'conflict';
}

// Node component
function DatasetNode({ data }: NodeProps<DatasetNodeData>) {
  return (
    <div className="dataset-node">
      <div className="header">{data.dataset.name}</div>
      <div className="columns">
        {data.columns.map(col => (
          <div key={col.id} className="column">{col.name}</div>
        ))}
      </div>
      <div className="status">{data.syncStatus}</div>
    </div>
  );
}
```

### Edge System

**Column References:**

```typescript
// Custom edge type
const edgeTypes = {
  reference: RelationshipEdge,
};

// Edge data structure
interface ReferenceEdgeData {
  referenceType: 'FK' | 'BusinessKey' | 'NaturalKey';
  sourceColumn: Column;
  targetColumn: Column;
}

// Edge component
function RelationshipEdge({ data }: EdgeProps<ReferenceEdgeData>) {
  return (
    <BaseEdge
      path={edgePath}
      style={{
        stroke: getColorForType(data.referenceType),
        strokeWidth: 2,
      }}
      label={data.referenceType}
    />
  );
}
```

## Git Integration Architecture

### Provider Abstraction

**Interface:**

```typescript
interface GitProvider {
  connect(config: GitConfig): Promise<void>;
  getFile(path: string, ref: string): Promise<string>;
  createOrUpdateFile(path: string, content: string, message: string): Promise<string>;
  deleteFile(path: string, message: string): Promise<void>;
  getCommitHistory(path?: string, limit?: number): Promise<Commit[]>;
}
```

**Implementations:**
- `GitHubProvider` - GitHub API
- `GitLabProvider` - GitLab API
- `BitbucketProvider` - Bitbucket API
- `AzureDevOpsProvider` - Azure DevOps API

### YAML Generation

**Dataset to YAML:**

```typescript
function generateYAML(dataset: Dataset, columns: Column[]): string {
  return `
version: 2.0
dataset:
  id: ${dataset.id}
  name: ${dataset.name}
  fqn: ${dataset.fqn}
  medallion_layer: ${dataset.medallion_layer}
  entity_type: ${dataset.entity_type}

columns:
${columns.map(col => `
  - id: ${col.id}
    name: ${col.name}
    data_type: ${col.data_type}
    is_primary_key: ${col.is_primary_key}
    ${col.reference_column_id ? `
    reference:
      column_id: ${col.reference_column_id}
      type: ${col.reference_type}
    ` : ''}
`).join('')}
`.trim();
}
```

## Performance Optimizations

### 1. Query Optimization

**Indexes:**
```sql
-- Company isolation queries
CREATE INDEX idx_datasets_company_id ON datasets(company_id);
CREATE INDEX idx_projects_company_id ON projects(company_id);

-- Common lookups
CREATE INDEX idx_columns_dataset_id ON columns(dataset_id);
CREATE INDEX idx_lineage_source_column ON lineage(source_column_id);

-- Reference lookups
CREATE INDEX idx_columns_reference_column ON columns(reference_column_id);
```

### 2. Frontend Optimization

**Code Splitting:**
```typescript
// Lazy load heavy components
const ProjectCanvas = lazy(() => import('./components/Canvas/ProjectCanvas'));
const DatasetEditorDialog = lazy(() => import('./components/Canvas/DatasetEditorDialog'));
```

**Memoization:**
```typescript
// Memo expensive calculations
const sortedColumns = useMemo(() => {
  return columns.sort((a, b) => a.position - b.position);
}, [columns]);

// Memo components
const DatasetNode = memo(DatasetNodeComponent);
```

### 3. Real-Time Optimization

**Throttled Updates:**
```typescript
// Throttle real-time updates
const throttledUpdate = useThrottle((payload) => {
  queryClient.invalidateQueries(['datasets']);
}, 1000);
```

## Deployment Architecture

### Production Stack

```
┌─────────────────────────────────────────────────────────────────┐
│  CDN (Cloudflare)                                                │
│  - Static assets                                                 │
│  - Caching                                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Frontend (Vercel/Netlify)                                       │
│  - React SPA                                                     │
│  - SSR/SSG                                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Backend (AWS/Render)                                            │
│  - Node.js API                                                   │
│  - Load balanced                                                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  Database (Supabase)                                             │
│  - PostgreSQL                                                    │
│  - Managed                                                       │
└─────────────────────────────────────────────────────────────────┘
```

## Key Architectural Decisions

### 1. Why Supabase?

**Rationale:**
- Built-in authentication
- Row-Level Security (perfect for multi-tenancy)
- Real-time subscriptions (collaboration)
- PostgreSQL (powerful, reliable)
- Easy to self-host if needed

### 2. Why Database-First (Not Git-First)?

**Rationale:**
- Real-time collaboration (multiple users)
- Immediate feedback (no commit delays)
- Better UX (familiar UI editing)
- Git as backup/version control (not primary)

### 3. Why React Flow?

**Rationale:**
- Visual data modeling
- Built-in zoom/pan/selection
- Custom nodes and edges
- Performance optimized
- Active community

### 4. Why Shared Resources?

**Rationale:**
- No duplication
- Single source of truth
- Easier maintenance
- Consistent models across projects

## Next Steps

- Explore [Database Schema](./database-schema.md)
- Review [API Documentation](./api-documentation.md)
- Study [Component Documentation](./component-documentation.md)
- Read [Source Control Services](./source-control-services.md)

---

**Last Updated**: 2025-01-15
**Version**: 2.0.0
