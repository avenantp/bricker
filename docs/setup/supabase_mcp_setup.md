# Supabase MCP Server Setup Guide

## Overview
Set up a Model Context Protocol (MCP) server that gives Claude direct access to query your Supabase database schema, inspect tables, run queries, and understand your database structure.

---

## Part 1: Install MCP Server for PostgreSQL

### Step 1: Install the Official PostgreSQL MCP Server

The easiest approach is to use the official MCP server for PostgreSQL, which works perfectly with Supabase.

```bash
# This will be installed automatically by Claude Desktop
# No manual installation needed - just configure it
```

---

## Part 2: Configure Claude Desktop

### Step 1: Get Your Supabase Connection String

1. Go to your Supabase project dashboard
2. Click on **Settings** (gear icon) → **Database**
3. Scroll to **Connection string** section
4. Copy the **Connection string** in the format:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with your actual database password

**Important**: Use the **direct connection** string, not the pooler connection string.

### Step 2: Configure Claude Desktop

**For macOS**:
```bash
# Open the config file
open ~/Library/Application\ Support/Claude/claude_desktop_config.json
```

**For Windows**:
```bash
# Navigate to:
%APPDATA%\Claude\claude_desktop_config.json
```

**For Linux**:
```bash
# Open the config file
nano ~/.config/Claude/claude_desktop_config.json
```

### Step 3: Add MCP Server Configuration

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
      ]
    }
  }
}
```

**Full example with actual values**:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres:mySecurePassword123@db.abcdefghijklmnop.supabase.co:5432/postgres"
      ]
    }
  }
}
```

**Security Note**: This file is local to your machine and not committed to git. Keep your password secure.

### Step 4: Restart Claude Desktop

1. **Quit Claude Desktop completely** (not just close the window)
   - macOS: `Cmd+Q`
   - Windows: Right-click tray icon → Quit
2. **Reopen Claude Desktop**
3. You should see a small 🔌 icon or indicator showing the MCP server is connected

---

## Part 3: Verify MCP Server Works

### Test in Claude Desktop

Open Claude Desktop and try this prompt:

```
List all tables in the public schema using the supabase MCP server.
```

Claude should respond with a list of your tables!

### More Test Prompts

```
Using the supabase MCP server, show me the schema for the datasets table.
```

```
Using the supabase MCP server, what indexes exist on the datasets table?
```

```
Using the supabase MCP server, show me all tables that have a workspace_id column.
```

---

## Part 4: Add MCP Server to Your Claude Code Project

Now let's make your **project** aware of this MCP server so Claude Code can use it too.

### Step 1: Create Project MCP Configuration

In your project root, create a new directory and file:

```bash
mkdir -p .claude
touch .claude/mcp-config.json
```

### Step 2: Add MCP Configuration to Project

**File**: `.claude/mcp-config.json`

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
      ],
      "description": "Direct access to Supabase PostgreSQL database"
    }
  }
}
```

### Step 3: Create Environment Variable Alternative (More Secure)

Instead of hardcoding the connection string, use environment variables:

**File**: `.env.mcp` (add to .gitignore!)

```bash
SUPABASE_DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
```

**File**: `.claude/mcp-config.json`

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres"
      ],
      "env": {
        "POSTGRES_CONNECTION_STRING": "${SUPABASE_DATABASE_URL}"
      },
      "description": "Direct access to Supabase PostgreSQL database"
    }
  }
}
```

### Step 4: Update .gitignore

Add to your `.gitignore`:

```
.env.mcp
.claude/mcp-config.json
```

**Then create a template**:

**File**: `.claude/mcp-config.json.example`

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres"
      ],
      "description": "Direct access to Supabase PostgreSQL database"
    }
  }
}
```

---

## Part 5: Create Supabase Context File

Create a context file that tells Claude about your specific database conventions:

**File**: `.claude/contexts/supabase.md`

```markdown
# Supabase Database Context

## Connection
This project uses the `supabase` MCP server for direct database access.
Always use the MCP server to inspect current schema before making changes.

## Project Details
- Database: PostgreSQL 15.x (Supabase)
- Project Name: Databricks Metadata Manager
- Schema: public (default)

## Naming Conventions

### Tables
- Format: snake_case, plural
- Examples: `datasets`, `columns`, `lineage`, `workspaces`

### Primary Keys
- Format: `{table_name}_id`
- Type: UUID with `DEFAULT uuid_generate_v4()`
- Examples: `dataset_id`, `column_id`, `workspace_id`

### Foreign Keys
- Format: `{referenced_table}_id`
- Examples: `workspace_id`, `project_id`, `dataset_id`
- Always indexed: `CREATE INDEX idx_{table}_{fk_column} ON {table}({fk_column})`

### Timestamps
- All tables must have: `created_at TIMESTAMP DEFAULT NOW()`
- All tables must have: `updated_at TIMESTAMP DEFAULT NOW()`
- Auto-update trigger required on `updated_at`

### Audit Columns
- `created_by UUID REFERENCES users(user_id)` on all major tables
- `updated_by UUID REFERENCES users(user_id)` on tables with updates

## Standard Column Template

```sql
CREATE TABLE table_name (
  table_name_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(workspace_id),
  
  -- Your columns here
  name VARCHAR NOT NULL,
  description TEXT,
  
  -- Standard audit columns
  created_by UUID REFERENCES users(user_id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(workspace_id, name)
);
```

## Required Setup for New Tables

### 1. Create Indexes
```sql
-- Foreign key indexes
CREATE INDEX idx_table_name_workspace ON table_name(workspace_id);

-- Filtered indexes for common queries
CREATE INDEX idx_table_name_active ON table_name(workspace_id) 
  WHERE deleted_at IS NULL;
```

### 2. Enable Row Level Security (RLS)
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- Workspace isolation policy
CREATE POLICY "workspace_isolation" ON table_name
  FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Admin access policy
CREATE POLICY "admin_access" ON table_name
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE user_id = auth.uid() 
      AND role = 'admin'
    )
  );
```

### 3. Create Update Trigger
```sql
CREATE TRIGGER update_table_name_updated_at 
  BEFORE UPDATE ON table_name
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
```

## Database Functions

### update_updated_at_column()
```sql
-- Already exists in database
-- Automatically sets updated_at = NOW() on UPDATE
```

### is_workspace_member(p_workspace_id UUID)
```sql
-- Check if current user is member of workspace
-- Returns BOOLEAN
```

### get_user_workspace_role(p_workspace_id UUID)
```sql
-- Get current user's role in workspace
-- Returns VARCHAR (owner, admin, editor, viewer)
```

## Current Schema Overview

### Core Tables (in dependency order)
1. `users` - Extended from auth.users
2. `workspaces` - Development branches (formerly branches)
3. `projects` - Project containers
4. `datasets` - Tables/views metadata (formerly nodes)
5. `columns` - Column definitions (formerly node_items)
6. `lineage` - Column-level lineage (formerly node_lineage)
7. `environments` - Deployment targets
8. `connections` - External connections
9. `git_commits` - Git sync history
10. `audit_log` - Audit trail (formerly metadata_changes)
11. `macros` - Reusable code fragments
12. `templates` - Jinja templates
13. `template_fragments` - Template overrides

### Key Relationships
- `workspaces.project_id` → `projects.project_id`
- `datasets.workspace_id` → `workspaces.workspace_id`
- `datasets.project_id` → `projects.project_id`
- `columns.dataset_id` → `datasets.dataset_id`
- `references.source_dataset_id` → `datasets.dataset_id`
- `references.target_dataset_id` → `datasets.dataset_id`
- `lineage.downstream_dataset_id` → `datasets.dataset_id`
- `lineage.upstream_dataset_id` → `datasets.dataset_id`

## Migration Process

### Creating a New Migration

1. **Check current schema using MCP server**:
   ```
   Using the supabase MCP server, show me the current schema for the datasets table.
   ```

2. **Create migration file**:
   - Format: `supabase/migrations/{version}_{description}.sql`
   - Example: `supabase/migrations/012_add_ai_enhancements_table.sql`
   - Version: Next sequential 3-digit number

3. **Migration template**:
   ```sql
   -- Migration: {version}_{description}
   -- Created: {date}
   -- Description: {what this migration does}
   
   -- Create table
   CREATE TABLE IF NOT EXISTS table_name (...);
   
   -- Create indexes
   CREATE INDEX ...;
   
   -- Enable RLS
   ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
   
   -- Create policies
   CREATE POLICY ...;
   
   -- Create triggers
   CREATE TRIGGER ...;
   
   -- Comments
   COMMENT ON TABLE table_name IS '...';
   ```

4. **Test migration**:
   ```sql
   -- Always test on development first
   -- Verify RLS policies work
   -- Check index usage with EXPLAIN ANALYZE
   ```

## Common Queries

### Check if table exists
```sql
SELECT EXISTS (
  SELECT FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename = 'table_name'
);
```

### List all indexes on a table
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'table_name' 
AND schemaname = 'public';
```

### List all RLS policies
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'table_name';
```

### Check foreign key constraints
```sql
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'table_name';
```

## Workflow with MCP Server

### Before Creating a Table
1. Use MCP to check if table already exists
2. Use MCP to check naming conflicts
3. Use MCP to verify foreign key targets exist

### After Creating a Table
1. Use MCP to verify table created successfully
2. Use MCP to check indexes were created
3. Use MCP to verify RLS policies are active
4. Test a query to ensure RLS works

### Before Altering a Table
1. Use MCP to check current schema
2. Use MCP to find dependent objects
3. Plan migration to avoid breaking changes

## Best Practices

1. ✅ Always use MCP server to inspect before making changes
2. ✅ Always create indexes on foreign keys
3. ✅ Always enable RLS on new tables
4. ✅ Always add updated_at trigger
5. ✅ Always test RLS policies work correctly
6. ✅ Always add comments to tables and complex columns
7. ✅ Use transactions for complex migrations
8. ✅ Test migrations on development first

## Common Mistakes to Avoid

1. ❌ Creating tables without RLS
2. ❌ Forgetting to index foreign keys
3. ❌ Not adding updated_at trigger
4. ❌ Using wrong data types (TEXT vs VARCHAR)
5. ❌ Circular foreign key dependencies
6. ❌ Not testing RLS policies
7. ❌ Hardcoding values instead of using DEFAULT
8. ❌ Not adding proper constraints (NOT NULL, UNIQUE)

## References
- Supabase Docs: https://supabase.com/docs
- PostgreSQL 15 Docs: https://www.postgresql.org/docs/15/
- MCP Server: https://github.com/modelcontextprotocol/servers
```

---

## Part 6: Usage Examples

### Example 1: Inspect Schema Before Migration

```
Before I create a new migration, use the supabase MCP server to:
1. Check if a table named 'ai_enhancements' already exists
2. Show me the current schema for the 'datasets' table
3. List all foreign keys that reference 'datasets'

I need this information to plan my migration safely.
```

### Example 2: Verify Migration Results

```
I just ran a migration to add the 'sync_status' column to datasets.

Use the supabase MCP server to:
1. Verify the column was added successfully
2. Check what data type it has
3. Show me if there's an index on this column
```

### Example 3: Debug RLS Policies

```
Use the supabase MCP server to:
1. Show me all RLS policies on the 'datasets' table
2. Check if RLS is enabled on this table
3. List the exact policy definitions

I'm debugging why a user can't see their datasets.
```

### Example 4: Create New Table with Full Context

```
Reference .claude/contexts/supabase.md for our database conventions.

Using the supabase MCP server:
1. First check if 'script_generations' table already exists
2. Show me the schema for 'datasets' table (to match FK structure)

Then create a migration for a new 'script_generations' table:
- Links to datasets table
- Stores generated script content
- Tracks generation status
- Follow all our conventions (RLS, indexes, triggers)

Show me the complete migration SQL before I apply it.
```

### Example 5: Schema Analysis

```
Reference .claude/contexts/supabase.md

Using the supabase MCP server, analyze our database structure:
1. List all tables and their row counts
2. Find any tables missing indexes on foreign keys
3. Find any tables without RLS enabled
4. List any columns that don't follow our naming conventions

Generate a report with recommended fixes.
```

---

## Part 7: Troubleshooting

### MCP Server Not Showing Up

**Check 1**: Is Claude Desktop fully restarted?
```bash
# macOS
pkill -9 Claude
# Then reopen Claude.app
```

**Check 2**: Is the config file valid JSON?
```bash
# Validate JSON syntax
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json | python -m json.tool
```

**Check 3**: Test connection string manually
```bash
# Try connecting with psql
psql "postgresql://postgres:password@db.abc123.supabase.co:5432/postgres"
```

### Connection Fails

**Issue**: Can't connect to Supabase

**Solutions**:
1. Check your Supabase project is not paused
2. Verify password is correct (no special characters causing issues)
3. Check if your IP is whitelisted (if you have IP restrictions)
4. Use the **direct connection** string, not pooler
5. Ensure port 5432 is not blocked by firewall

### MCP Server Shows But Queries Fail

**Issue**: MCP server connected but queries error

**Solutions**:
1. Check you're using the `public` schema
2. Verify your user has SELECT permissions
3. Try a simple query first: `SELECT 1;`
4. Check RLS policies aren't blocking you

---

## Part 8: Advanced Configuration

### Read-Only Access (Safer)

Create a read-only database user for MCP:

```sql
-- In Supabase SQL Editor
CREATE ROLE mcp_readonly;
GRANT CONNECT ON DATABASE postgres TO mcp_readonly;
GRANT USAGE ON SCHEMA public TO mcp_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mcp_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public 
  GRANT SELECT ON TABLES TO mcp_readonly;

-- Create user
CREATE USER mcp_user WITH PASSWORD 'secure_password';
GRANT mcp_readonly TO mcp_user;
```

Update your config to use this user:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://mcp_user:secure_password@db.abc123.supabase.co:5432/postgres"
      ]
    }
  }
}
```

### Multiple Environments

```json
{
  "mcpServers": {
    "supabase-dev": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://postgres:dev_password@db.dev123.supabase.co:5432/postgres"
      ]
    },
    "supabase-prod": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://mcp_user:prod_password@db.prod456.supabase.co:5432/postgres"
      ]
    }
  }
}
```

Then specify which one to use:
```
Using the supabase-dev MCP server, show me all tables.
```

---

## Part 9: Integration with Your Workflow

### Standard Prompt Template

For any database-related task:

```
Reference .claude/contexts/supabase.md for database conventions.

Using the supabase MCP server:
1. [First inspect current state]
2. [Understand what exists]
3. [Check for conflicts]

Then:
[Your actual task]

Show me the SQL/code before executing.
Wait for my approval.
```

### Pre-Flight Checklist

Before any schema change, Claude should:
- ✅ Check if object already exists (MCP)
- ✅ Verify foreign key targets exist (MCP)
- ✅ Check for naming conflicts (MCP)
- ✅ Review conventions (.claude/contexts/supabase.md)
- ✅ Generate migration SQL
- ✅ Show SQL for approval
- ✅ Wait for approval before executing

---

## Summary

You now have:

1. ✅ **MCP Server configured** in Claude Desktop
2. ✅ **Project-level configuration** for Claude Code
3. ✅ **Context file** with your database conventions
4. ✅ **Direct database access** for Claude to inspect schema
5. ✅ **Safe workflow** with inspection before changes

**Next Steps**:

1. Test the MCP server is working in Claude Desktop
2. Try the example prompts above
3. Start using it for your migration tasks
4. Create similar setups for Databricks and Jinja when needed

**Critical**: The MCP server gives Claude **read-only** access by default (via the postgres user). It can inspect but not modify. You'll still review SQL before applying migrations - Claude just has better context now!