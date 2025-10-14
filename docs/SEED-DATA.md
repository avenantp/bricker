# Development Seed Data Documentation

## Overview

This document describes the seed data scripts used to populate the development database with sample projects, workspaces, and related data. Seed data makes it easier to develop and test features without manually creating data.

## Files

- **SQL Seed**: `supabase/seeds/001_sample_projects_workspaces.sql`
- **JavaScript Seed**: `seed-dev-data.js`
- **Node Helper**: Use JavaScript version for easier execution

---

## Running Seed Data

### Method 1: JavaScript Script (Recommended)

```bash
node seed-dev-data.js
```

**Prerequisites**:
- You must be signed in to the application
- Your account must exist
- Environment variables must be set (`.env` file)

**Advantages**:
- Idempotent (can run multiple times)
- Checks for existing data
- Provides detailed output
- Verifies data after seeding

---

### Method 2: SQL Script (Advanced)

**Via Supabase Dashboard**:
1. Go to SQL Editor in Supabase dashboard
2. Copy contents of `supabase/seeds/001_sample_projects_workspaces.sql`
3. Paste and execute

**Via Supabase CLI**:
```bash
npx supabase db push --seed
```

**Note**: SQL script requires manual account/user setup

---

## Seed Data Contents

### Projects (3)

#### 1. Sample Standard Project
- **Type**: Standard
- **Visibility**: Public
- **Description**: General data modeling and management
- **Configuration**:
  - Medallion layers enabled
  - Default catalog: `main`
  - Default schema: `default`
  - Snake case naming
  - Quality rules: descriptions required

#### 2. Sample Data Vault Project
- **Type**: DataVault
- **Visibility**: Public
- **Description**: Enterprise data warehouse using Data Vault 2.0
- **Configuration**:
  - Medallion layers enabled
  - Default catalog: `analytics`
  - Default schema: `raw_vault`
  - Data Vault preferences:
    - Hub naming: `HUB_{entity_name}`
    - Satellite naming: `SAT_{hub}_{descriptor}`
    - Link naming: `LNK_{entity1}_{entity2}`
    - SHA-256 hashing
    - Multi-active satellites enabled
    - Business vault enabled

#### 3. Sample Dimensional Project
- **Type**: Dimensional
- **Visibility**: Public
- **Description**: Star schema dimensional model for BI
- **Configuration**:
  - Medallion layers disabled
  - Default catalog: `analytics`
  - Default schema: `reporting`
  - Dimensional preferences:
    - Dimension naming: `DIM_{entity_name}`
    - Fact naming: `FCT_{entity_name}`
    - Surrogate key strategy: hash
    - SCD Type 2 default
    - Conformed dimensions enabled

---

### Workspaces (5)

#### Standard Project Workspaces

**1. Development**
- **Description**: Development environment for testing
- **Visibility**: Public
- **Source Control**: GitHub (disconnected)
- **Settings**:
  - Auto-sync: Disabled
  - Sync interval: 15 minutes
  - Conflict resolution: Manual
  - Default layer: Bronze
  - Canvas: Grid enabled, minimap on, zoom 1.0

**2. Staging**
- **Description**: Pre-production for final testing
- **Visibility**: Public
- **Source Control**: GitHub (disconnected)
- **Settings**:
  - Auto-sync: Enabled
  - Sync interval: 30 minutes
  - Default layer: Silver

**3. Production**
- **Description**: Production environment
- **Visibility**: Locked
- **Source Control**: GitHub (disconnected)
- **Is Locked**: Yes
- **Settings**:
  - Auto-sync: Enabled
  - Sync interval: 60 minutes
  - Default layer: Gold

#### Data Vault Project Workspaces

**4. Development**
- **Description**: Data Vault development workspace
- **Visibility**: Public
- **Source Control**: GitLab (disconnected)
- **Settings**:
  - Auto-sync: Disabled
  - Sync interval: 15 minutes

#### Dimensional Project Workspaces

**5. Development**
- **Description**: Dimensional model development workspace
- **Visibility**: Public
- **Source Control**: Bitbucket (disconnected)
- **Settings**:
  - Auto-sync: Disabled
  - Sync interval: 15 minutes

---

## Auto-Generated Data

### Project Users

When projects are created, triggers automatically:
- Add project owner to `project_users` table
- Assign role: `owner`

**Expected**: 3 project user assignments (one per project)

### Workspace Users

When workspaces are created, triggers automatically:
- Add workspace owner to `workspace_users` table
- Assign role: `owner`

**Expected**: 5 workspace user assignments (one per workspace)

---

## Data Relationships

```
Account (your account)
├── Sample Standard Project
│   ├── Development Workspace
│   ├── Staging Workspace
│   └── Production Workspace
├── Sample Data Vault Project
│   └── Development Workspace
└── Sample Dimensional Project
    └── Development Workspace
```

---

## Verification

After seeding, you can verify data:

### Projects
```sql
SELECT id, name, project_type, visibility
FROM projects
WHERE name LIKE 'Sample%'
ORDER BY name;
```

### Workspaces
```sql
SELECT
  p.name AS project_name,
  w.name AS workspace_name,
  w.visibility,
  w.source_control_provider
FROM workspaces w
INNER JOIN projects p ON p.id = w.project_id
WHERE p.name LIKE 'Sample%'
ORDER BY p.name, w.name;
```

### Project User Assignments
```sql
SELECT
  p.name AS project_name,
  pu.role,
  COUNT(*) AS count
FROM project_users pu
INNER JOIN projects p ON p.id = pu.project_id
WHERE p.name LIKE 'Sample%'
GROUP BY p.name, pu.role;
```

### Workspace User Assignments
```sql
SELECT
  p.name AS project_name,
  w.name AS workspace_name,
  wu.role,
  COUNT(*) AS count
FROM workspace_users wu
INNER JOIN workspaces w ON w.id = wu.workspace_id
INNER JOIN projects p ON p.id = w.project_id
WHERE p.name LIKE 'Sample%'
GROUP BY p.name, w.name, wu.role;
```

---

## Cleanup

To remove all seed data:

```sql
-- Delete workspace users
DELETE FROM workspace_users
WHERE workspace_id IN (
  SELECT w.id FROM workspaces w
  INNER JOIN projects p ON p.id = w.project_id
  WHERE p.name LIKE 'Sample%'
);

-- Delete project users
DELETE FROM project_users
WHERE project_id IN (
  SELECT id FROM projects WHERE name LIKE 'Sample%'
);

-- Delete workspaces
DELETE FROM workspaces
WHERE project_id IN (
  SELECT id FROM projects WHERE name LIKE 'Sample%'
);

-- Delete projects
DELETE FROM projects
WHERE name LIKE 'Sample%';
```

Or use the JavaScript script with cleanup enabled:
```bash
# Edit seed-dev-data.js and uncomment cleanup section
node seed-dev-data.js
```

---

## Idempotency

Both seed scripts are idempotent:
- Check if data already exists before inserting
- Skip existing projects/workspaces
- Safe to run multiple times
- Updates descriptions if run again

**Example Output**:
```
✓ Created project: Sample Standard Project
⚠ Project already exists: Sample Data Vault Project
✓ Created project: Sample Dimensional Project
```

---

## Customization

### Adding More Projects

Edit `seed-dev-data.js`:

```javascript
const projects = [
  // ... existing projects
  {
    name: 'My Custom Project',
    description: 'Custom project description',
    project_type: 'Standard',
    visibility: 'private',
    configuration: {
      // ... custom configuration
    }
  }
];
```

### Adding More Workspaces

```javascript
const workspaces = [
  {
    projectName: 'Sample Standard Project',
    workspaces: [
      // ... existing workspaces
      {
        name: 'QA',
        description: 'Quality assurance environment',
        visibility: 'public',
        source_control_provider: 'github',
        settings: {
          auto_sync_enabled: false
        }
      }
    ]
  }
];
```

---

## Testing Features

### Testing Project Types

Use the seeded projects to test different project types:
- **Standard**: General use case testing
- **DataVault**: Data Vault specific features
- **Dimensional**: Dimensional modeling features

### Testing Workspaces

Use the seeded workspaces to test:
- **Development**: Unrestricted development testing
- **Staging**: Pre-production workflow testing
- **Production**: Locked workspace behavior
- **Different providers**: GitHub, GitLab, Bitbucket integration

### Testing Permissions

1. Sign in as project owner (automatic)
2. Add another user as editor/viewer
3. Test permission differences
4. Verify RLS policies work correctly

---

## Common Issues

### Issue 1: "No accounts found"

**Problem**: Script cannot find an account

**Solution**:
1. Complete the signup flow
2. Ensure account was created
3. Check `account_users` table

### Issue 2: "No authenticated user"

**Problem**: Not signed in

**Solution**:
1. Run `npm run dev`
2. Sign in to the application
3. Keep the session active
4. Run seed script

### Issue 3: Duplicate key errors

**Problem**: Data already exists

**Solution**:
- Script should handle this automatically
- Check output for warnings
- Clean up existing data if needed

### Issue 4: Trigger not firing

**Problem**: Owners not added to user tables

**Solution**:
1. Apply migration `003_functions_and_triggers.sql`
2. Verify triggers exist:
```sql
SELECT * FROM pg_trigger
WHERE tgname IN ('project_owner_to_users', 'workspace_owner_to_users');
```

---

## Benefits of Seed Data

1. **Faster Development**: No need to manually create test data
2. **Consistent Testing**: Everyone has the same baseline data
3. **Feature Demos**: Ready-made data for demonstrations
4. **Different Scenarios**: Multiple project types and workspace configurations
5. **Permission Testing**: Pre-configured user assignments
6. **Integration Testing**: Realistic data relationships

---

## Best Practices

1. **Run Early**: Seed data right after initial setup
2. **Keep Updated**: Update seed scripts as schema changes
3. **Document Changes**: Note any custom additions
4. **Clean Regularly**: Remove old test data periodically
5. **Test Seeding**: Verify seed scripts work before sharing

---

## References

- Seed SQL: `supabase/seeds/001_sample_projects_workspaces.sql`
- Seed JavaScript: `seed-dev-data.js`
- Project Specification: `docs/prp/021-project-workspaces-specification.md`
- Database Functions: `docs/DATABASE-FUNCTIONS-TRIGGERS.md`

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-14 | Initial seed data scripts | Claude Code |

---

## Checklist for Phase 1.4 Completion

- [x] **1.4.1** Created seed script for sample projects
- [x] **1.4.2** Created seed script for sample workspaces
- [x] **1.4.3** Created seed script for project/workspace users (auto-generated via triggers)
- [x] **1.4.4** Created seed script for source control configurations
- [x] **1.4.5** Created JavaScript helper to run seed scripts
- [x] **1.4.6** Documented seed data and verification queries

**Status**: ✅ Phase 1.4 (Sample Data for Development) COMPLETE
