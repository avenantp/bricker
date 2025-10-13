# Supabase MCP Server Setup Instructions

## What is the Supabase MCP Server?

The Supabase MCP (Model Context Protocol) server is a **hosted HTTP service** that allows AI assistants like Claude to interact directly with your Supabase database, execute SQL queries, manage schemas, and access documentation.

**Key Point**: This is NOT an NPM package. It's a hosted service at `https://mcp.supabase.com/mcp`

---

## Quick Setup (Recommended Method)

### Step 1: Enable MCP Server in Supabase Dashboard

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to the **MCP** tab in the left sidebar
3. Click **"Connect"** button
4. Select the feature groups you want:
   - ✅ **database** (SQL queries, schema management)
   - ✅ **docs** (Search Supabase documentation)
   - ⬜ **functions** (Edge function management) - optional
   - ⬜ **types** (TypeScript generation) - optional
5. Choose your client: **Claude Desktop** or **Claude Code**
6. Copy the generated configuration JSON

### Step 2: Configure Claude Code

**For Claude Code** (current session):
- The configuration needs to be added to Claude Code's settings
- You'll authenticate via browser when first using the MCP server
- The server will have access to your Supabase projects based on your logged-in account

**Configuration will look like**:
```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp",
      "params": {
        "read_only": "true",
        "project_ref": "YOUR_PROJECT_ID",
        "features": "database,docs"
      }
    }
  }
}
```

### Step 3: Get Your Project Reference ID

Your project reference ID is in your Supabase URL:
```
https://YOUR_PROJECT_REF.supabase.co
         ^^^^^^^^^^^^^^^^
         This is your project_ref
```

Or find it in:
- Supabase Dashboard → Settings → API → Project URL

---

## Security Configuration (IMPORTANT)

### Recommended Settings for Development

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp",
      "params": {
        "read_only": "true",           // ⚠️ ONLY allow read operations
        "project_ref": "xxxx",          // 🔒 Scope to ONE project only
        "features": "database,docs"     // 📦 Limit to specific features
      }
    }
  }
}
```

### Security Best Practices

1. **Always use `read_only: true`** for production data
   - This executes all queries as a read-only Postgres user
   - Prevents accidental data modifications

2. **Scope to a specific project** using `project_ref`
   - Prevents AI from accessing other Supabase projects
   - Limits blast radius of potential issues

3. **Use with development projects only**
   - Never connect to production databases initially
   - Test thoroughly in development first

4. **Enable manual approval** in Claude settings
   - Review all SQL queries before execution
   - Understand what the AI is doing

5. **Limit feature groups**
   - Only enable features you actually need
   - Start with `database,docs` only

---

## Available Features

### Database Features
- Execute SQL queries
- View table schemas
- Generate migrations
- Manage database objects

### Documentation Features
- Search Supabase docs
- Get API references
- Find best practices

### Functions Features (Optional)
- Deploy Edge Functions
- View function logs
- Manage function configurations

### Types Features (Optional)
- Generate TypeScript types from schema
- Update type definitions
- Validate type safety

---

## Usage Examples

Once configured, you can ask Claude:

**Database Queries**:
- "List all tables in the public schema"
- "Show me the schema for the datasets table"
- "Count the rows in the users table"
- "What columns exist in the projects table?"

**Schema Management**:
- "Generate a migration to add a column"
- "Show me the RLS policies on the datasets table"
- "What indexes exist on the columns table?"

**Documentation**:
- "How do I set up Row Level Security in Supabase?"
- "What's the best way to handle user authentication?"
- "Show me examples of using realtime subscriptions"

---

## Troubleshooting

### Issue: "MCP server not available"
**Solution**:
- Check that you're using Claude Code (not just Claude)
- Verify the configuration is added correctly
- Restart Claude Code after adding configuration

### Issue: "Authentication failed"
**Solution**:
- Click the authentication link when prompted
- Log in to your Supabase account in the browser
- Select the correct organization

### Issue: "Project not found"
**Solution**:
- Verify your `project_ref` is correct
- Check you have access to the project
- Ensure you're logged in to the right Supabase organization

### Issue: "Permission denied"
**Solution**:
- Check your Supabase user permissions
- Verify RLS policies if in read-only mode
- May need to use service role for some operations

---

## Comparison: MCP Server vs Node.js Scripts

| Feature | MCP Server | Node.js Scripts |
|---------|-----------|-----------------|
| Setup | Browser auth | Environment variables |
| Usage | Natural language | JavaScript code |
| Security | Built-in controls | Manual implementation |
| Queries | AI-assisted | Manual SQL |
| Best For | Interactive exploration | Automation scripts |

**Recommendation**: Use BOTH
- **MCP Server**: For interactive queries, schema exploration, and learning
- **Node.js Scripts**: For automated tasks, migrations, and CI/CD pipelines

---

## Next Steps

1. ✅ Update the setup guide with MCP server information
2. ⬜ Configure the MCP server in your Claude Code settings
3. ⬜ Test basic queries: "List all tables in the public schema"
4. ⬜ Verify read-only mode works
5. ⬜ Test with development data only
6. ⬜ Once comfortable, consider enabling write operations (with caution!)

---

## Configuration File Created

I've created a base configuration file at:
```
.claude/mcp_config.json
```

This file contains the basic setup. You'll need to:
1. Add your `project_ref` from Supabase
2. Adjust the `features` you want enabled
3. Consider if you want `read_only` mode

**Note**: The actual Claude Code configuration location varies by platform and may need to be added through Claude Code's settings UI rather than a config file.

---

## Resources

- **Official Docs**: https://supabase.com/docs/guides/getting-started/mcp
- **GitHub Repo**: https://github.com/supabase-community/supabase-mcp
- **MCP Specification**: https://modelcontextprotocol.io/
- **Supabase Dashboard**: https://supabase.com/dashboard

---

**STATUS**: Documentation updated! You now have accurate information about the Supabase MCP server. To actually use it, you'll need to configure it through Claude Code's settings or configuration interface.
