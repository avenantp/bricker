# Supabase MCP Server Setup for Claude CLI

## Overview

This guide is for setting up the Supabase MCP server with **Claude CLI** (claude.ai/code), NOT Claude Desktop.

---

## Quick Setup (3 Commands)

### Step 1: Get Your Supabase Connection Details

You need:
- Your Supabase project reference: `dhclhobnxhdkkxrbtmkb` (from your URL)
- Your database password (from `.env` file as `SUPABASE_SERVICE_KEY` or database password)

### Step 2: Add the MCP Server

```bash
cd C:\Code\bricker

# Add the PostgreSQL MCP server for Supabase
claude mcp add supabase npx -- -y @modelcontextprotocol/server-postgres "postgresql://postgres:YOUR_PASSWORD@db.dhclhobnxhdkkxrbtmkb.supabase.co:5432/postgres"
```

**Important**: Replace `YOUR_PASSWORD` with your actual database password.

### Step 3: Verify It's Working

```bash
# List all MCP servers
claude mcp list

# Check server details
claude mcp get supabase
```

You should see:
```
supabase: ... - ✓ Connected
```

---

## What Was Configured

The MCP server configuration was added to: `C:\Users\peter\.claude.json`

This configuration is:
- **Local config** - Private to you in this project
- **stdio type** - Standard input/output communication
- **Connected** - Ready to use

---

## Usage

Now you can ask Claude Code to query your database directly:

### Example Queries

```
List all tables in the public schema
```

```
Show me the schema for the datasets table
```

```
What indexes exist on the columns table?
```

```
Show me all RLS policies on the datasets table
```

```
Count how many rows are in each table
```

### Advanced Usage

```
Using the supabase MCP server:
1. Check if a table named 'script_generations' exists
2. Show me the foreign keys that reference 'datasets'
3. List all tables that have a 'workspace_id' column
```

---

## MCP Server Commands

### List All Configured Servers
```bash
claude mcp list
```

### Get Server Details
```bash
claude mcp get supabase
```

### Remove Server
```bash
claude mcp remove supabase -s local
```

### Re-add Server (if needed)
```bash
claude mcp add supabase npx -- -y @modelcontextprotocol/server-postgres "postgresql://postgres:YOUR_PASSWORD@db.dhclhobnxhdkkxrbtmkb.supabase.co:5432/postgres"
```

---

## Security Best Practices

### Current Setup
- Uses your database password directly in the connection string
- Stored in `~/.claude.json` (local config, not in git)
- Has full read/write access to the database

### Recommended: Create Read-Only User

For safer usage, create a read-only database user:

```sql
-- Run in Supabase SQL Editor
CREATE ROLE mcp_readonly;
GRANT CONNECT ON DATABASE postgres TO mcp_readonly;
GRANT USAGE ON SCHEMA public TO mcp_readonly;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO mcp_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO mcp_readonly;

-- Create the user
CREATE USER mcp_user WITH PASSWORD 'your_secure_password_here';
GRANT mcp_readonly TO mcp_user;
```

Then update your MCP server:
```bash
claude mcp remove supabase -s local
claude mcp add supabase npx -- -y @modelcontextprotocol/server-postgres "postgresql://mcp_user:your_secure_password_here@db.dhclhobnxhdkkxrbtmkb.supabase.co:5432/postgres"
```

---

## Troubleshooting

### Server Shows as Disconnected

**Check 1**: Verify your password is correct
```bash
# Test connection with psql (if installed)
psql "postgresql://postgres:YOUR_PASSWORD@db.dhclhobnxhdkkxrbtmkb.supabase.co:5432/postgres"
```

**Check 2**: Ensure your Supabase project is not paused
- Go to https://supabase.com/dashboard
- Check project status

**Check 3**: Verify port 5432 is not blocked
- Check firewall settings
- Ensure you're not on a restricted network

### MCP Server Not Available in Session

**Solution**: The MCP server is configured but may need to be approved for the current session.

Try running a query and when prompted, approve the MCP server usage.

### Connection String Issues

**Common mistakes**:
- ❌ Using pooler URL (should be direct connection)
- ❌ Wrong password or special characters not escaped
- ❌ Wrong project reference ID
- ❌ Missing port `:5432`

**Correct format**:
```
postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres
```

---

## Comparison: MCP vs Node.js Scripts

| Feature | MCP Server | Node.js Scripts |
|---------|-----------|-----------------|
| Setup | One `claude mcp add` command | Requires `@supabase/supabase-js` package |
| Usage | Natural language queries | Write JavaScript code |
| Access | Direct PostgreSQL connection | Via Supabase REST API |
| Authentication | Database password | Service key (JWT) |
| Best For | Interactive schema exploration | Automation & scripts |

**Recommendation**: Use BOTH
- **MCP Server**: For asking Claude to inspect schema, query data, analyze structure
- **Node.js Scripts**: For automated tasks, migrations, CI/CD

---

## What You Can Do Now

### Database Exploration
- ✅ List all tables and their schemas
- ✅ View indexes and foreign keys
- ✅ Check RLS policies
- ✅ Count rows in tables
- ✅ Analyze table relationships

### Schema Understanding
- ✅ Ask Claude to explain table structure
- ✅ Find tables with specific columns
- ✅ Understand foreign key relationships
- ✅ Check for naming convention violations

### Migration Planning
- ✅ Check if tables/columns exist before creating
- ✅ Verify foreign key targets exist
- ✅ Find dependent objects before dropping
- ✅ Validate migration results

### NOT Available (By Design)
- ❌ Cannot execute INSERT/UPDATE/DELETE (unless you enable write access)
- ❌ Cannot create tables directly (would bypass migrations)
- ❌ Cannot modify RLS policies (security)

---

## Status

✅ **Supabase MCP Server Configured and Connected**

Configuration location: `C:\Users\peter\.claude.json`
Project: `C:\Code\bricker`
Status: Connected ✓

You can now ask Claude to query your database directly!

---

## Next Steps

1. ✅ MCP server configured
2. ⬜ Test with: "List all tables in the public schema"
3. ⬜ Explore your schema: "Show me the datasets table structure"
4. ⬜ Use for migrations: "Check if table X exists before I create it"
5. ⬜ Optional: Set up read-only user for safer access

---

## Resources

- **PostgreSQL MCP Server**: https://github.com/modelcontextprotocol/servers/tree/main/src/postgres
- **Claude CLI Docs**: https://docs.claude.com/claude-code
- **Supabase Connection**: https://supabase.com/docs/guides/database/connecting-to-postgres
