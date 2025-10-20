# Database Migration Cleanup Summary

**Date**: October 21, 2025
**Source**: Database backup from October 20, 2025 (`docs/prp/archive/db_cluster-20-10-2025@13-48-23.backup`)

## Overview

This document summarizes the comprehensive database migration cleanup performed to consolidate 45+ incremental migration files into a clean, unified initialization script. The new system provides a fresh starting point for all database operations.

---

## What Changed

### 1. New Initialization Scripts

Three new initialization scripts have been created in `supabase/migrations/`:

| File | Purpose | Contents |
|------|---------|----------|
| `00_init_complete_schema.sql` | Core database structure | All tables, views, and custom types |
| `00_init_functions.sql` | Database functions | All stored procedures and helper functions |
| `00_init_constraints_and_policies.sql` | Database constraints | Indexes, foreign keys, triggers, and RLS policies |

These scripts replace all previous migration files and represent the current production schema.

### 2. Archived Migration Files

All legacy migration files have been moved to archive directories:

- **Backend**: `backend/migrations/archive/` (30 files)
- **Supabase**: `supabase/migrations/archive/` (15 files)

The only file retained in `backend/migrations/` is:
- `RECOVERY_restore_workspace_datasets_table.sql` (kept for emergency recovery)

---

## Database Schema Summary

### Core Tables (27 Total)

#### Multi-Tenancy & User Management
| Table | Purpose | Key Features |
|-------|---------|--------------|
| `accounts` | Multi-tenant root organization | Subscription management, usage tracking, soft delete |
| `users` | User profiles and authentication | Email verification, password reset, security tracking |
| `account_users` | Account membership | Role management, invitation tracking, active status |

#### Projects & Workspaces
| Table | Purpose | Key Features |
|-------|---------|--------------|
| `projects` | Project containers | Source control configuration, visibility settings |
| `workspaces` | Workspace subdivisions | Branch-specific source control  |
| `workspace_users` | Workspace access control | Role-based permissions |
| `project_users` | Project access control | Role-based permissions |

#### Data Management
| Table | Purpose | Key Features |
|-------|---------|--------------|
| `connections` | Account-level connections | Encrypted credentials, connection testing |
| `datasets` | Data table definitions | FQN, sync tracking, soft delete |
| `columns` | Column metadata | Data types, business metadata, data quality |
| `lineage` | Data lineage tracking | Column-level lineage, transformation logic |

#### Visualization
| Table | Purpose | Key Features |
|-------|---------|--------------|
| `diagrams` | Visual diagrams | Version tracking, diagram state, templates |
| `diagram_datasets` | Dataset positioning | Location data, expand/collapse state |
| `workspace_datasets` | Workspace-dataset join (deprecated) | Kept for compatibility |

#### Subscription & Billing
| Table | Purpose | Key Features |
|-------|---------|--------------|
| `subscription_plans` | Available plans | Pricing, limits, features |
| `subscriptions` | Active subscriptions | Stripe integration, trial management |
| `payments` | Payment history | Stripe payment intents, invoices |
| `usage_events` | Usage tracking | Event logging, quantity tracking |

#### Security & Access
| Table | Purpose | Key Features |
|-------|---------|--------------|
| `invitations` | User invitations | Token-based, expiration, soft delete |
| `api_tokens` | API authentication | Scoped access, usage tracking, revocation |
| `audit_logs` | Audit trail | Change tracking, IP logging, commit tracking |

#### Configuration & Templates
| Table | Purpose | Key Features |
|-------|---------|--------------|
| `configurations` | Workspace configurations | Type-based config, encryption support |
| `environments` | Environment definitions | Account/project/workspace scoped |
| `macros` | Reusable macros | Template content, parameters |
| `templates` | Script templates | Hierarchical, variables, categories |
| `template_fragments` | Template injections | Injection points, ordering |

#### Metadata & Caching
| Table | Purpose | Key Features |
|-------|---------|--------------|
| `connection_metadata_cache` | Connection metadata | Stale detection, type-based caching |
| `source_control_commits` | Commit tracking | SHA tracking, file paths, author info |

---

## Key Features

### 1. Soft Delete Pattern

All major tables support soft delete with two columns:
- `deleted_at` (timestamp) - NULL for active records
- `deleted_by` (uuid) - User who performed the delete

**Active Record Views**: Each soft-deletable table has a corresponding `_active` view:
- `accounts_active`
- `users_active`
- `projects_active`
- `workspaces_active`
- `connections_active`
- `datasets_active`
- `columns_active`
- `configurations_active`
- `environments_active`
- `invitations_active`
- `macros_active`
- `templates_active`

### 2. Comprehensive Audit Columns

Standard audit tracking on all tables:
- `created_at` (timestamp)
- `updated_at` (timestamp)
- `created_by` (uuid)
- `updated_by` (uuid)

### 3. Source Control Integration

**Project-Level Configuration**:
- Provider selection (GitHub, GitLab, Bitbucket, Azure)
- Repository URL
- Default branch
- Encrypted access tokens
- Connection status tracking

**Workspace-Level Configuration**:
- Branch selection
- Commit SHA tracking
- Sync status

**Supported Providers** (enum):
```sql
CREATE TYPE source_control_provider AS ENUM (
    'github',
    'gitlab',
    'bitbucket',
    'azure'
);
```

**Connection Status** (enum):
```sql
CREATE TYPE source_control_connection_status AS ENUM (
    'not_connected',
    'connected',
    'error',
    'pending'
);
```

### 4. Multi-Tenancy Architecture

**Account-Based Isolation**:
- All resources belong to an `account`
- Row-level security enforces isolation
- Usage tracking per account:
  - User count
  - Project count
  - Dataset count
  - Monthly AI requests
  - Storage usage (MB)

**Subscription Tiers**:
- Free tier with limited resources
- Paid tiers with configurable limits
- Trial period support
- Stripe integration for billing

### 5. Database Functions

**Soft Delete Operations**:
```sql
soft_delete(table_name, record_id, deleted_by) -> boolean
restore_deleted(table_name, record_id) -> boolean
permanent_delete(table_name, record_id) -> boolean
cleanup_soft_deleted_records(table_name, days_old) -> integer
```

**Cascading Soft Deletes**:
```sql
soft_delete_account(account_id, deleted_by) -> jsonb
soft_delete_project(project_id, deleted_by) -> jsonb
soft_delete_dataset(dataset_id, deleted_by) -> jsonb
```

**Usage Tracking**:
```sql
increment_usage_counter(account_id, resource_type, amount) -> boolean
decrement_usage_counter(account_id, resource_type, amount) -> boolean
calculate_account_usage(account_id) -> record
sync_usage_counters(account_id) -> boolean
```

**Helper Functions**:
```sql
generate_api_token() -> varchar
hash_api_token(token) -> varchar
get_dataset_fqn(connection_id, schema, name) -> varchar
```

**API Token Management**:
```sql
validate_api_token(token, ip, user_agent) -> table(token_id, account_id, user_id, scopes, is_valid, error)
```

**Diagram Management**:
```sql
add_dataset_to_diagram(diagram_id, dataset_id, location, user_id) -> uuid
remove_dataset_from_diagram(diagram_id, dataset_id) -> boolean
```

### 6. Automated Triggers

**Timestamp Updates**:
- `update_updated_at_column()` - Universal updated_at trigger

**Usage Counter Maintenance**:
- `update_account_user_count()` - Track user additions/removals
- `update_account_project_count()` - Track project lifecycle
- `update_account_dataset_count()` - Track dataset lifecycle

**Ownership & Metadata**:
- `set_dataset_owner()` - Auto-assign dataset ownership
- `update_dataset_fqn()` - Maintain fully qualified names
- `add_project_owner_to_project_users()` - Auto-add project owners
- `add_workspace_owner_to_workspace_users()` - Auto-add workspace owners

**Auth Integration**:
- `handle_new_user()` - Sync Supabase auth to users table

### 7. Row-Level Security (RLS)

RLS is enabled on sensitive tables:
- `account_users` - Account membership isolation
- `users` - User profile isolation
- `invitations` - Invitation access control
- `api_tokens` - Token ownership
- `connections` - Account-based isolation
- `connection_metadata_cache` - Derived from connection access
- `diagrams` - Account + visibility-based access
- `diagram_datasets` - Derived from diagram access

**Policy Examples**:
```sql
-- Users can only see members of accounts they belong to
CREATE POLICY "Users can view account members"
    ON account_users FOR SELECT
    USING (account_id IN (
        SELECT account_id FROM account_users
        WHERE user_id = auth.uid() AND is_active = true
    ));

-- Connection isolation by account
CREATE POLICY "connections_isolation_policy"
    ON connections FOR SELECT
    USING (account_id IN (
        SELECT account_id FROM account_users
        WHERE user_id = auth.uid()
    ));
```

### 8. Comprehensive Indexing

**Performance Indexes**:
- Active record filtering (`WHERE deleted_at IS NULL`)
- Foreign key relationships
- Common query patterns (account_id, user_id)
- Full-text search support
- Time-series queries (created_at DESC)

**Examples**:
```sql
-- Fast active record lookups
CREATE INDEX idx_datasets_active
    ON datasets (account_id)
    WHERE deleted_at IS NULL;

-- Usage event time-series
CREATE INDEX idx_usage_events_account_created
    ON usage_events (account_id, created_at DESC);

-- Token expiration cleanup
CREATE INDEX idx_api_tokens_expires
    ON api_tokens (expires_at)
    WHERE expires_at IS NOT NULL AND is_active = true;
```

---

## Migration Strategy

### For New Installations

Run the three initialization scripts in order:
```bash
psql -f supabase/migrations/00_init_complete_schema.sql
psql -f supabase/migrations/00_init_functions.sql
psql -f supabase/migrations/00_init_constraints_and_policies.sql
```

Or use Supabase CLI:
```bash
npx supabase db reset
```

### For Existing Databases

**Option 1: Continue with current database** (No action needed)
- Your existing database already has this schema
- The new scripts represent your current state
- Future migrations will build on top of these scripts

**Option 2: Fresh start** (Destructive - USE WITH CAUTION)
```bash
# Backup first!
pg_dump your_database > backup.sql

# Drop and recreate
npx supabase db reset

# Restore data if needed
psql -f your_data_restore.sql
```

---

## Testing the New Scripts

A test checklist has been added to the todo list. Key validation points:

1. **Schema Creation**:
   - All 27 tables created successfully
   - All views created
   - All enums/types defined

2. **Function Validation**:
   - Soft delete operations work correctly
   - Triggers fire appropriately
   - Usage counters update automatically

3. **Constraint Validation**:
   - Foreign keys enforce referential integrity
   - Unique constraints prevent duplicates
   - Check constraints validate data

4. **RLS Validation**:
   - Policies properly isolate tenant data
   - Users can only access their own resources
   - Admin roles have appropriate permissions

5. **Performance**:
   - Indexes improve query performance
   - Active record views perform well
   - Common queries use indexes

---

## Cleanup Job Integration

The soft delete system integrates with the existing cleanup job:

```bash
# Run cleanup (default: 90 days)
npm run cleanup

# Custom retention periods
npm run cleanup:30   # 30 days
npm run cleanup:60   # 60 days
npm run cleanup:90   # 90 days
```

The cleanup job uses the `cleanup_soft_deleted_records()` function to permanently remove records that have been soft-deleted for the specified number of days.

---

## Frontend Integration

### Soft Delete Components

The frontend includes React components for managing soft-deleted records:

**Components**:
- `SoftDeleteAuditDashboard.tsx` - View deletion metrics across all tables
- `RecentlyDeletedView.tsx` - Generic component for displaying deleted items
- `RecentlyDeletedDatasetsPage.tsx` - Example page for datasets

**Usage**:
```typescript
import { RecentlyDeletedView } from '../components/SoftDelete/RecentlyDeletedView';

<RecentlyDeletedView
  items={deletedItems}
  title="Recently Deleted Datasets"
  entityType="dataset"
  isLoading={loading}
  error={error}
  onRestore={handleRestore}
  onPermanentDelete={handlePermanentDelete}
  onRefresh={loadData}
  emptyMessage="No recently deleted datasets"
/>
```

---

## Database Diagram

```
┌─────────────┐
│  accounts   │ (Multi-tenant root)
└──────┬──────┘
       │
       ├─────► account_users ◄────┐
       │                          │
       ├─────► subscriptions      │
       │       │                  │
       │       └─────► subscription_plans
       │                          │
       ├─────► payments            │
       ├─────► api_tokens          │
       ├─────► invitations         │
       ├─────► usage_events        │
       │                          │
       ├─────► projects ◄──────────┘
       │       │
       │       ├─────► project_users
       │       │
       │       └─────► workspaces
       │               │
       │               ├─────► workspace_users
       │               ├─────► workspace_datasets (deprecated)
       │               ├─────► diagrams
       │               │       │
       │               │       └─────► diagram_datasets ◄─────┐
       │               │                                      │
       │               ├─────► configurations                 │
       │               ├─────► environments                   │
       │               └─────► audit_logs                     │
       │                                                      │
       ├─────► connections                                    │
       │       │                                              │
       │       ├─────► connection_metadata_cache              │
       │       │                                              │
       │       └─────► datasets ◄──────────────────────────────┤
       │               │                                      │
       │               ├─────► columns                        │
       │               │                                      │
       │               └─────► lineage                        │
       │                                                      │
       ├─────► templates ◄─────────────────────────────────────┘
       │       │
       │       └─────► template_fragments
       │
       ├─────► macros
       │
       ├─────► environments
       │
       └─────► source_control_commits
```

---

## Key Naming Conventions

### Table Names
- Plural nouns (e.g., `accounts`, `users`, `projects`)
- Join tables use composite names (e.g., `account_users`, `diagram_datasets`)

### Column Names
- Snake_case (e.g., `created_at`, `deleted_by`, `subscription_tier`)
- Foreign keys end in `_id` (e.g., `account_id`, `user_id`)
- Boolean fields start with `is_` or `has_` (e.g., `is_active`, `has_uncommitted_changes`)

### Enum Types
- Singular form (e.g., `source_control_provider`, not `providers`)
- Use snake_case for type names
- Use lowercase for enum values (e.g., `'github'`, `'connected'`)

### Function Names
- Action verbs (e.g., `soft_delete`, `restore_deleted`, `calculate_account_usage`)
- Use snake_case consistently

### View Names
- Table name + `_active` for active record views
- Descriptive names for complex views

---

## Data Types Reference

### Custom Enums

```sql
-- Source control providers
CREATE TYPE source_control_provider AS ENUM (
    'github', 'gitlab', 'bitbucket', 'azure'
);

-- Connection status
CREATE TYPE source_control_connection_status AS ENUM (
    'not_connected', 'connected', 'error', 'pending'
);

-- Project types
CREATE TYPE project_type AS ENUM (
    'data_vault', 'dimensional', 'standard'
);
```

### Common UUID Columns
- `id` - Primary key (generated via `uuid_generate_v4()`)
- `account_id` - Multi-tenant isolation
- `user_id` - User reference
- `owner_id` - Resource owner
- `created_by` / `updated_by` / `deleted_by` - Audit trail

### Common JSONB Columns
- `settings` - Flexible configuration storage
- `metadata` - Additional key-value data
- `scopes` - Array of permission scopes
- `features` - Feature flags array
- `diagram_state` - Visual diagram state
- `location` - Positioning data
- `old_values` / `new_values` - Audit change tracking

---

## Security Considerations

### Encrypted Fields
- `password_encrypted` (connections)
- `source_control_access_token_encrypted` (projects)
- API tokens are hashed before storage

### Sensitive Data
- User passwords are hashed (not stored in plaintext)
- API tokens are hashed using SHA-256
- Connection credentials are encrypted at rest
- RLS policies enforce data isolation

### Rate Limiting
- Failed login tracking via `failed_login_attempts`
- Account lockout after 5 failed attempts (30-minute lockout)
- Token usage tracking for abuse detection

---

## Known Limitations & Future Improvements

### Current Limitations
1. **workspace_datasets table** is deprecated but kept for backward compatibility
2. Some foreign keys reference `auth.users` instead of `public.users` (legacy)
3. Hard delete policies exist on some tables but should generally be avoided

### Planned Improvements
1. Add full-text search indexes for better search performance
2. Implement database partitioning for large tables (usage_events, audit_logs)
3. Add materialized views for common aggregations
4. Implement change data capture (CDC) for real-time updates

---

## Maintenance

### Regular Tasks

**Weekly**:
- Monitor soft-deleted record count
- Review audit logs for suspicious activity

**Monthly**:
- Run cleanup job to remove old soft-deleted records
- Archive old usage events (>365 days)
- Review and optimize slow queries

**Quarterly**:
- Analyze table sizes and plan for partitioning
- Review RLS policies for security gaps
- Update subscription plan limits based on usage patterns

### Monitoring Queries

```sql
-- Check soft delete statistics
SELECT
    table_name,
    COUNT(*) FILTER (WHERE deleted_at IS NULL) as active_count,
    COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted_count,
    ROUND(COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)::numeric /
          NULLIF(COUNT(*), 0) * 100, 2) as deleted_percentage
FROM (
    SELECT 'accounts' as table_name, deleted_at FROM accounts
    UNION ALL
    SELECT 'datasets', deleted_at FROM datasets
    UNION ALL
    SELECT 'projects', deleted_at FROM projects
    -- Add other tables...
) stats
GROUP BY table_name
ORDER BY deleted_percentage DESC;

-- Account usage summary
SELECT
    a.name,
    a.subscription_tier,
    a.current_user_count || '/' || a.max_users as users,
    a.current_project_count || '/' || a.max_projects as projects,
    a.current_dataset_count || '/' || a.max_datasets as datasets,
    a.current_monthly_ai_requests || '/' || a.max_monthly_ai_requests as ai_requests
FROM accounts a
WHERE a.deleted_at IS NULL
ORDER BY a.name;

-- Find inactive API tokens
SELECT
    t.name,
    u.email,
    t.last_used_at,
    DATE_PART('day', NOW() - t.last_used_at) as days_inactive
FROM api_tokens t
JOIN users u ON u.id = t.user_id
WHERE t.is_active = true
  AND t.last_used_at < NOW() - INTERVAL '90 days'
ORDER BY t.last_used_at;
```

---

## Support & Troubleshooting

### Common Issues

**Issue**: Soft-deleted records not appearing in queries
**Solution**: Query the base table directly or include `WHERE deleted_at IS NOT NULL`

**Issue**: Usage counters out of sync
**Solution**: Run `SELECT sync_usage_counters(account_id)` for affected accounts

**Issue**: RLS blocking legitimate access
**Solution**: Verify user is member of account via `account_users` table

### Debugging Tips

1. **Check RLS status**:
   ```sql
   SELECT schemaname, tablename, rowsecurity
   FROM pg_tables
   WHERE schemaname = 'public';
   ```

2. **View active policies**:
   ```sql
   SELECT schemaname, tablename, policyname, permissive, roles, qual, with_check
   FROM pg_policies
   WHERE schemaname = 'public';
   ```

3. **Test as specific user**:
   ```sql
   SET LOCAL role TO authenticated;
   SET LOCAL request.jwt.claim.sub TO 'user-uuid';
   -- Run your query
   ```

---

## References

- **Backup Source**: `docs/prp/archive/db_cluster-20-10-2025@13-48-23.backup`
- **Migration Scripts**: `supabase/migrations/00_init_*.sql`
- **Archived Migrations**: `backend/migrations/archive/`, `supabase/migrations/archive/`
- **Supabase Documentation**: https://supabase.com/docs
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/

---

**Last Updated**: October 21, 2025
**Database Version**: PostgreSQL 17.6
**Supabase Version**: Latest
