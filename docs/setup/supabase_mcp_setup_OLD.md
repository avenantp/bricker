# Supabase MCP Server Setup Guide

## Overview

This guide walks you through configuring the Supabase Model Context Protocol (MCP) server for the Uroq project with the refactored multi-tenant, subscription-based architecture.

**Key Features**:
- Multi-tenant company isolation
- Subscription-based access control
- Shared resources (datasets across projects/workspaces)
- Database-first Git sync pattern
- Row-level security (RLS) enforcement

---

## Prerequisites

Before starting, ensure you have:
1. A Supabase project created at [supabase.com](https://supabase.com)
2. Your Supabase project URL
3. Your Supabase anon/public key
4. Your Supabase service role key (for MCP server)

---

## Step 1: Gather Supabase Credentials

### 1.1 Get Your Project URL and Keys

1. Go to your Supabase project dashboard
2. Navigate to **Settings** � **API**
3. Note the following values:

```
Project URL: https://<your-project-ref>.supabase.co
anon/public key: eyJhbGc...
service_role key: eyJhbGc...
```

**� Security Note**: The service role key bypasses RLS policies. Keep it secret!

### 1.2 Create Environment Variables

Create or update `.env.local` file in your project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# For backend/MCP server (NEVER expose this in frontend)
SUPABASE_SERVICE_KEY=eyJhbGc...
```

---

## Step 2: Apply Database Schema

### 2.1 Current Schema Status

Your database already has the base company/subscription schema (`supabase-schema-business.sql`). Now we need to add the refactored dataset architecture.

### 2.2 Run Migration Scripts

You'll need to run the new migration scripts in order:

#### Option A: Fresh Installation (Recommended for new projects)

If starting fresh, run these scripts in Supabase SQL Editor:

1. **M_0_1_create_datasets_and_columns.sql** - Creates datasets, columns, lineage tables
2. **M_0_2_create_git_sync_tables.sql** - Creates git_commits and metadata_changes tables

**I NEED TO CREATE THESE**: Should I create these migration scripts now based on our refactored architecture?

#### Option B: Migrating from Existing Data

If you have existing nodes/node_items/node_lineage tables, run:

1. **M_1_1_rename_tables.sql** - Renames existing tables
2. **M_1_2_add_reference_columns.sql** - Adds reference columns to columns table
3. **M_1_3_add_git_sync_columns.sql** - Adds Git sync tracking
4. **M_1_4_create_new_tables.sql** - Creates git_commits and metadata_changes
5. **M_1_5_update_indexes.sql** - Adds performance indexes
6. **M_1_6_migrate_data.sql** - Migrates existing data

---

## Step 3: Add Multi-Tenant Tables

### 3.1 Companies Table Updates

Your `companies` table already exists! We just need to ensure it has the right structure for our refactored design.

**Current structure**: 
- `company_id` (via `id`)
- `company_type` - We need to ADD this
- `subscription_plan_id`
- `subscription_status`

**Action Required**: Run this SQL to add `company_type`:

```sql
-- Add company_type column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='companies' AND column_name='company_type'
    ) THEN
        ALTER TABLE companies ADD COLUMN company_type TEXT
        CHECK (company_type IN ('individual', 'organization'))
        DEFAULT 'organization';
    END IF;
END $$;

-- Update existing companies to set type based on team size
UPDATE companies
SET company_type = CASE
    WHEN company_size = '1-10' THEN 'individual'
    ELSE 'organization'
END
WHERE company_type IS NULL;
```

### 3.2 Users Table Updates

Your `users` table needs to be updated with company relationship:

```sql
-- Add company relationship to users table
DO $$
BEGIN
    -- Add company_id
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='company_id'
    ) THEN
        ALTER TABLE users ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
    END IF;

    -- Add company_role
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='users' AND column_name='company_role'
    ) THEN
        ALTER TABLE users ADD COLUMN company_role TEXT
        CHECK (company_role IN ('admin', 'member'))
        DEFAULT 'member';
    END IF;
END $$;

-- Create index
CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);

-- Update RLS policy for users
DROP POLICY IF EXISTS "Users can view users in their company" ON users;
CREATE POLICY "Users can view users in their company"
  ON users FOR SELECT
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );
```

### 3.3 Add Multi-Tenancy to Projects/Workspaces

Your existing schema already has `company_id` on projects and workspaces! 

We need to add ownership and visibility columns:

```sql
-- Add ownership and visibility to projects
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS owner_visibility TEXT
  CHECK (owner_visibility IN ('public', 'private', 'locked'))
  DEFAULT 'private';

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

-- Add ownership and visibility to workspaces
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS visibility TEXT
  CHECK (visibility IN ('public', 'private', 'locked'))
  DEFAULT 'private';

ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT FALSE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_projects_visibility ON projects(owner_visibility);
CREATE INDEX IF NOT EXISTS idx_workspaces_visibility ON workspaces(visibility);
```

### 3.4 Create Mapping Tables for Shared Resources

**NEW TABLES NEEDED**: These allow datasets to be shared across projects/workspaces:

```sql
-- Project-Dataset mapping (datasets can be in multiple projects)
CREATE TABLE IF NOT EXISTS project_datasets (
  project_dataset_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES datasets(dataset_id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES users(id),
  UNIQUE(project_id, dataset_id)
);

CREATE INDEX IF NOT EXISTS idx_project_datasets_project ON project_datasets(project_id);
CREATE INDEX IF NOT EXISTS idx_project_datasets_dataset ON project_datasets(dataset_id);

-- Workspace-Dataset mapping (datasets can appear in multiple workspaces with different positions)
CREATE TABLE IF NOT EXISTS workspace_datasets (
  workspace_dataset_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES datasets(dataset_id) ON DELETE CASCADE,
  canvas_position JSONB DEFAULT '{"x": 0, "y": 0}'::jsonb,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  added_by UUID REFERENCES users(id),
  UNIQUE(workspace_id, dataset_id)
);

CREATE INDEX IF NOT EXISTS idx_workspace_datasets_workspace ON workspace_datasets(workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_datasets_dataset ON workspace_datasets(dataset_id);

-- Enable RLS
ALTER TABLE project_datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_datasets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mapping tables
CREATE POLICY "Users can view project_datasets in their company"
  ON project_datasets FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE company_id IN (
        SELECT company_id FROM company_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view workspace_datasets in their company"
  ON workspace_datasets FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM workspaces
      WHERE company_id IN (
        SELECT company_id FROM company_members WHERE user_id = auth.uid()
      )
    )
  );
```

---

## Step 4: Install Supabase Client

### 4.1 Install Supabase JavaScript Client

**Note**: There is currently no official Supabase MCP server package. Instead, we use the Supabase JavaScript client directly with Node.js scripts.

```bash
# Install Supabase client for Node.js scripts
npm install @supabase/supabase-js

# Install dotenv for environment variable management
npm install dotenv
```

### 4.2 Verify Installation

Check that the packages are installed:

```bash
npm list @supabase/supabase-js dotenv
```

Expected output:
```
uroq@1.0.0 C:\Code\uroq
├── @supabase/supabase-js@2.x.x
└── dotenv@16.x.x
```

### 4.3 Environment Variables

Ensure your `.env` file contains:

```bash
# Supabase Configuration
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...

# For frontend (Next.js)
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

**⚠️ Security Note**:
- Never commit `.env` files to Git
- Service key bypasses RLS - keep it secret
- Only use service key in backend/scripts
- Use anon key for frontend applications

---

## Step 5: Test Database Connection

### 5.1 Test MCP Server

Create `scripts/test-mcp.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('Testing Supabase connection...');

  // Test 1: Check companies
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('*')
    .limit(1);

  if (companiesError) {
    console.error('L Companies query failed:', companiesError);
  } else {
    console.log(' Companies table accessible:', companies.length, 'records');
  }

  // Test 2: Check if datasets table exists
  const { data: datasets, error: datasetsError } = await supabase
    .from('datasets')
    .select('count')
    .limit(1);

  if (datasetsError) {
    console.log('� Datasets table not found (need to run migrations)');
  } else {
    console.log(' Datasets table exists');
  }

  // Test 3: Check RLS policies
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .limit(1);

  if (projectsError) {
    console.error('L Projects query failed:', projectsError);
  } else {
    console.log(' Projects table accessible:', projects.length, 'records');
  }

  console.log('\n Connection test complete!');
}

testConnection();
```

Run the test:

```bash
node scripts/test-mcp.js
```

### 5.2 Expected Output

```
Testing Supabase connection...
 Companies table accessible: 1 records
� Datasets table not found (need to run migrations)
 Projects table accessible: 0 records

 Connection test complete!
```

---

## Step 6: Migration Scripts to Create

Based on our refactored architecture, we need to create these migration scripts:

### Scripts I Should Create:

1. **backend/migrations/M_0_1_create_companies_and_multi_tenancy.sql**
   - Create/update companies table with company_type
   - Update users table with company_id and company_role
   - Create RLS policies

2. **backend/migrations/M_0_2_add_multi_tenancy_to_core_tables.sql**
   - Add company_id, owner_id, visibility, is_locked to projects
   - Add company_id, owner_id, visibility, is_locked to workspaces
   - Update RLS policies

3. **backend/migrations/M_0_3_create_mapping_tables.sql**
   - Create project_datasets mapping table
   - Create workspace_datasets mapping table
   - Create RLS policies

4. **backend/migrations/M_0_4_create_datasets_and_columns.sql**
   - Create datasets table with company_id and ownership
   - Create columns table with reference columns
   - Create lineage table
   - Create RLS policies

5. **backend/migrations/M_0_5_create_git_sync_tables.sql**
   - Create git_commits table
   - Create metadata_changes table
   - Create indexes

**QUESTION FOR YOU**: Would you like me to create these migration scripts now? They will be numbered and ready to run in sequence.

---

## Step 7: Security Verification Checklist

After running all migrations, verify:

- [ ] RLS is enabled on all tables
- [ ] Company isolation works (users can't see other companies' data)
- [ ] Ownership checks work (only owners/admins can edit resources)
- [ ] Visibility controls work (public/private/locked)
- [ ] Shared resources work (datasets can be in multiple projects/workspaces)
- [ ] Service role key is stored securely (never in frontend code)
- [ ] Anon key is used for frontend queries
- [ ] Test with multiple companies to ensure complete isolation

---

## Next Steps

1. **Run the migration scripts** I create for you (in order M_0_1 through M_0_5)
2. **Test the connection** using the test script
3. **Verify RLS policies** are working correctly
4. **Set up frontend** Supabase client configuration
5. **Implement services** for datasets, columns, lineage operations

---

## Troubleshooting

### Issue: "permission denied for table X"

**Solution**: Ensure RLS policies are created and service role key is being used for admin operations.

### Issue: "relation 'datasets' does not exist"

**Solution**: Run the migration scripts to create the datasets table.

### Issue: "company_id cannot be null"

**Solution**: Ensure all users are assigned to a company. Individual users should have their own company with `company_type = 'individual'`.

### Issue: "Cannot access other company's data"

**Solution**: This is working as intended! RLS policies enforce company isolation.

---

## Architecture Summary

```
Multi-Tenant Hierarchy:
Company (company_id, company_type)
     Users (company_id, company_role: admin | member)
     Projects (company_id, owner_id, visibility)
        Project-Dataset Mappings (many-to-many)
     Workspaces (company_id, owner_id, visibility)
        Workspace-Dataset Mappings (with canvas positions)
     Datasets (company_id, owner_id, visibility)
         Columns (with self-referencing references)
         Lineage (column-level data flow)
```

**Key Features**:
-  Complete company isolation via RLS
-  Individual users as company_type='individual'
-  Datasets can be shared across projects/workspaces
-  Multi-level security (project, workspace, dataset)
-  Ownership and visibility controls
-  Database-first with Git sync

---

**STATUS**: Ready to create migration scripts. Let me know if you want me to proceed!
