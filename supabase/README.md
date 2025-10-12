# Uroq Database Schema - Supabase Setup

This directory contains the complete database schema and migration files for the Uroq Databricks Automation Metadata Manager application.

## Overview

The database schema is organized into multiple migration files for easier management and deployment:

1. **001_initial_schema.sql** - Core table definitions
2. **002_indexes.sql** - Performance indexes including full-text search
3. **003_functions_and_triggers.sql** - Database functions and triggers
4. **004_rls_policies.sql** - Row Level Security policies

## Database Architecture

### Storage Strategy

- **Supabase Database**: Core application metadata (workspaces, projects, connections, configurations, UUIDs)
- **GitHub Repository**: Node and NodeItem definitions (versioned, user-owned)
- **Hybrid Tracking**: Supabase maintains UUID registry and state tracking for GitHub-stored nodes

### Key Tables

#### User & Workspace Management
- `users` - User profiles extending Supabase auth.users
- `workspaces` - Workspaces with GitHub repository connections
- `workspace_members` - Collaboration with role-based access (owner, admin, editor, viewer)
- `projects` - Projects within workspaces (Standard, DataVault, Dimensional)

#### Node Metadata (GitHub Integration)
- `uuid_registry` - UUID tracking for GitHub-stored nodes and nodeitems
- `node_state` - GitHub sync status tracking

#### Data Models
- `data_models` - React Flow visual models
- `model_versions` - Version history for data models

#### Template System
- `templates` - Jinja2 full templates
- `template_fragments` - Reusable template pieces
- `template_compositions` - Decision tree compositions
- `template_composition_nodes` - Nodes in composition flow
- `template_composition_edges` - Edges in composition flow
- `template_composition_versions` - Version history for compositions

#### Code Reusability
- `macros` - Reusable code snippets (all public)

#### Connections & Configurations
- `connections` - External service connections (MSSQL, REST APIs)
- `databricks_connections` - Databricks workspace connections (encrypted)
- `configurations` - Reusable cluster/job configurations

#### Script Generation & AI
- `script_generations` - AI-generated Databricks scripts
- `conversations` - AI assistant chat history
- `messages` - Individual conversation messages

#### Audit & Security
- `audit_log` - Audit trail for sensitive operations

## Migration Process

### Option 1: Supabase Dashboard (Recommended for Development)

1. Log in to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run each migration file in order:
   - `001_initial_schema.sql`
   - `002_indexes.sql`
   - `003_functions_and_triggers.sql`
   - `004_rls_policies.sql`

### Option 2: Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Initialize Supabase in your project (if not already done)
supabase init

# Link to your remote project
supabase link --project-ref your-project-ref

# Apply migrations
supabase db push
```

### Option 3: Direct psql Connection

```bash
# Connect to your Supabase database
psql "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"

# Run each migration
\i supabase/migrations/001_initial_schema.sql
\i supabase/migrations/002_indexes.sql
\i supabase/migrations/003_functions_and_triggers.sql
\i supabase/migrations/004_rls_policies.sql
```

## Legacy Files (Reference Only)

The following files are kept for reference but are superseded by the new migration files:

- `schema.sql` - Original schema (now in 001_initial_schema.sql)
- `template-fragments.sql` - Template tables (now in 001_initial_schema.sql)
- `rls-policies.sql` - Original RLS (now in 004_rls_policies.sql)
- `migrations/sync-auth-users.sql` - Auth sync (now handled by trigger in 003)
- `migrations/update-fragment-categories.sql` - Fragment categories (in 001)

## Security Features

### Row Level Security (RLS)

All tables have RLS enabled with granular policies:

- **Workspace Isolation**: Users can only access data in their workspaces
- **Role-Based Access**: owner > admin > editor > viewer
- **Public Sharing**: Templates, fragments, and macros can be marked public
- **System Templates**: Protected templates requiring dev mode to edit

### Encryption

- Databricks tokens stored encrypted
- Connection credentials stored encrypted (use Supabase Vault)

### Audit Logging

All sensitive operations are logged to `audit_log` table with:
- User ID and workspace ID
- Action type and entity affected
- Old and new values
- IP address and user agent

## Key Features

### Automatic Triggers

- `updated_at` columns automatically updated on row changes
- New users automatically get profile entries
- Workspace owners automatically added as members
- Model/composition versions auto-increment

### Helper Functions

- `is_workspace_member(workspace_id, user_id)` - Check workspace membership
- `get_user_workspace_role(workspace_id, user_id)` - Get user's role
- `can_edit_template_composition(composition_id, user_id, dev_mode)` - Permission check
- `can_edit_template_fragment(fragment_id, user_id, dev_mode)` - Permission check
- `log_audit_event(...)` - Log audit events

### Performance Optimizations

- Comprehensive indexes on foreign keys
- Partial indexes for common filters (is_public, is_active, etc.)
- Full-text search indexes on templates, fragments, and macros
- Composite indexes for version lookups

## Environment Variables

Required environment variables (see `.env.example`):

```env
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-key
DATABASE_URL=your-database-url

# Frontend (VITE_ prefix)
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Testing Database Connection

After running migrations, test the connection:

```typescript
// In your application
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

// Test query
const { data, error } = await supabase
  .from('workspaces')
  .select('*')
  .limit(1);

console.log('Connection test:', { data, error });
```

## Development Notes

### Adding New Migrations

When adding new migrations:

1. Create a new file: `00X_migration_name.sql`
2. Include clear comments
3. Use `CREATE TABLE IF NOT EXISTS` for idempotency
4. Add corresponding indexes in `002_indexes.sql` (or new file)
5. Update RLS policies if needed
6. Test thoroughly in development environment first

### Rollback Strategy

Each migration should have a corresponding rollback script:

```sql
-- Example rollback for 001_initial_schema.sql
DROP TABLE IF EXISTS public.audit_log CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
-- ... etc
```

## Phase 1.2 Completion Checklist

- [x] Database schema designed per specifications
- [x] All required tables created
- [x] Foreign key constraints established
- [x] Performance indexes created
- [x] Row Level Security (RLS) policies implemented
- [x] Database functions for common queries
- [x] Triggers for audit logging and updated_at
- [x] Full-text search indexes
- [x] Migration files organized
- [x] Documentation complete
- [ ] Migrations applied to Supabase project
- [ ] Database connection tested from application

## Next Steps

1. Apply migrations to your Supabase project
2. Test database connection from the application
3. Verify RLS policies work as expected
4. Move to Phase 1.3: Authentication Implementation
