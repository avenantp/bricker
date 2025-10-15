# Source Control Sync Guide

Uroq uses a **database-first** approach to source control integration, where your Supabase database is the primary source of truth and you explicitly commit changes to Git.

## Overview

### Database-First Workflow

1. **Edit in Database**: Make changes to datasets, columns, lineage in real-time
2. **Track Changes**: Uroq tracks uncommitted changes automatically
3. **Commit to Git**: Explicitly commit your changes with a message
4. **Pull from Git**: Pull changes made by others or in other environments
5. **Resolve Conflicts**: Handle conflicts when database and Git diverge

### Benefits

- **Real-time collaboration**: Multiple users can edit simultaneously
- **Version control**: Full history of all changes
- **Rollback capability**: Revert to any previous version
- **Branch-based development**: Use Git branches for feature development
- **CI/CD integration**: Automated testing and deployment

## Connecting to Source Control

### Supported Providers

- GitHub
- GitLab
- Bitbucket
- Azure DevOps

### Prerequisites

1. A Git repository for your data models
2. Access token with repository permissions
3. Admin or owner role in the workspace

### Connection Steps

#### 1. Generate Access Token

**GitHub:**
1. Go to Settings → Developer settings → Personal access tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo` (full control)
4. Generate and copy the token

**GitLab:**
1. Go to Preferences → Access Tokens
2. Add a token with `api` and `write_repository` scopes
3. Generate and copy the token

**Bitbucket:**
1. Go to Personal settings → App passwords
2. Create app password with `Repositories: Read and write` permission
3. Generate and copy the password

#### 2. Configure Workspace

1. Open your workspace
2. Go to **Settings** → **Source Control**
3. Enter connection details:
   - **Provider**: GitHub, GitLab, Bitbucket, or Azure DevOps
   - **Repository URL**: `https://github.com/username/repo`
   - **Branch**: `main` or your feature branch
   - **Access Token**: Paste your token
4. Click **"Test Connection"**
5. If successful, click **"Save"**

#### 3. Initial Sync

After connecting, choose how to sync:

**Option A: Push Database to Git** (Recommended for new repositories)
- All datasets in database will be exported to YAML
- Files created in `datasets/` directory
- Initial commit made to Git

**Option B: Pull from Git** (For existing repositories)
- Datasets imported from YAML files
- Database updated with Git content
- Workspace synced with repository

## Understanding Sync Status

### Dataset Sync Status

Each dataset has a sync status indicator:

- **🟢 Synced**: Database matches Git, no changes
- **🟡 Uncommitted Changes**: Database has changes not in Git
- **🔵 Pending**: Changes staged but not yet committed
- **🔴 Conflict**: Database and Git have conflicting changes
- **⚠️ Error**: Sync failed (check error message)

### Viewing Uncommitted Changes

1. Click the **Source Control** icon in the toolbar
2. See list of datasets with uncommitted changes
3. Review specific changes for each dataset
4. Click a dataset to see detailed diff

**Change Types:**
- ✏️ **Modified**: Dataset properties or columns changed
- ➕ **Added**: New dataset created
- ❌ **Deleted**: Dataset removed
- 🔗 **Lineage**: Lineage relationships changed

## Committing Changes

### Basic Commit

1. Click **"Source Control"** icon (shows count of uncommitted changes)
2. Review uncommitted changes
3. Select datasets to commit (or commit all)
4. Enter commit message:
   ```
   Add customer dimension table

   - Add customer_id as primary key
   - Add email, name columns
   - Link to orders fact table
   ```
5. Click **"Commit"**

### Commit Message Best Practices

**Good commit messages:**
```
✅ "Add orders fact table with customer FK"
✅ "Update customers table: add phone_number column"
✅ "Fix lineage from bronze to silver customers"
✅ "Add data quality rules to all dimensions"
```

**Poor commit messages:**
```
❌ "updates"
❌ "fix"
❌ "WIP"
❌ "asdf"
```

**Structure:**
```
<type>: <summary>

<detailed description>
<list of changes>
```

**Types:**
- `feat`: New dataset or feature
- `update`: Modify existing dataset
- `fix`: Fix errors or issues
- `refactor`: Restructure without changing behavior
- `docs`: Documentation updates
- `lineage`: Lineage changes

### Committing Multiple Datasets

When committing multiple related datasets:

1. Group related changes in one commit
2. Describe the overall purpose
3. List specific datasets affected

**Example:**
```
feat: Add customer analytics mart

Created gold layer customer analytics:
- dim_customer: Customer dimension with SCD Type 2
- fact_orders: Orders fact table
- fact_customer_lifetime_value: Aggregated metrics

Added lineage from silver to gold layer.
```

## Pulling Changes from Git

### When to Pull

Pull changes when:
- Another team member committed changes
- You made changes in another environment
- You want the latest version from Git

### Pull Process

1. Click **"Source Control"** → **"Pull"**
2. Uroq fetches latest changes from Git
3. Review incoming changes:
   - Datasets added by others
   - Datasets modified by others
   - Datasets deleted by others
4. Choose how to handle conflicts (if any)
5. Click **"Pull Changes"**

### Pull Strategies

**Fast-Forward** (No conflicts):
- Database is behind Git, no local changes
- Simply updates database with Git content
- No conflicts to resolve

**Merge** (Has conflicts):
- Both database and Git have changes
- Uroq attempts auto-merge
- Manual resolution needed if conflicts detected

## Conflict Resolution

### Understanding Conflicts

Conflicts occur when:
- You modified a dataset in database
- Someone else modified the same dataset in Git
- Changes overlap (same property changed)

### Conflict Types

1. **Property Conflict**: Same property changed differently
   ```
   Database: name = "customers_final"
   Git:      name = "customers_v2"
   ```

2. **Column Conflict**: Column added/modified/deleted in both places
   ```
   Database: Added column "phone_number"
   Git:      Deleted column "phone"
   ```

3. **Lineage Conflict**: Different lineage relationships defined
   ```
   Database: customers → orders
   Git:      customers → invoices
   ```

### Resolving Conflicts

#### Automatic Resolution

Uroq attempts to auto-resolve when possible:
- Non-overlapping changes merged automatically
- New columns from both sides kept
- New lineage from both sides kept

#### Manual Resolution

When auto-resolution fails:

1. **Review Conflict**:
   - See database version
   - See Git version
   - See differences highlighted

2. **Choose Resolution**:
   - **Keep Database**: Use your changes, discard Git
   - **Keep Git**: Use Git changes, discard yours
   - **Merge**: Combine both (edit manually)

3. **Apply Resolution**:
   - Click chosen resolution strategy
   - Review merged result
   - Click **"Resolve"**

4. **Commit Resolution**:
   - Uroq creates merge commit
   - Documents conflict resolution
   - Syncs with Git

#### Example Resolution

**Conflict:**
```
Property: description
Database: "Customer master data from Salesforce"
Git:      "Customer dimension with SCD Type 2"
```

**Resolution Options:**
1. **Keep Database**: Preserve your description
2. **Keep Git**: Use their description
3. **Merge**: Combine both
   ```
   "Customer master data from Salesforce with SCD Type 2"
   ```

## Viewing Commit History

### Dataset History

1. Open dataset editor
2. Go to **"History"** tab
3. See list of all commits affecting this dataset
4. Click commit to see changes

**Commit Details:**
- Commit SHA
- Author and date
- Commit message
- Files changed
- Diff view (what changed)

### Workspace History

1. Click **"Source Control"** → **"History"**
2. See all commits in workspace
3. Filter by:
   - Author
   - Date range
   - Dataset
   - Change type

### Comparing Versions

1. Select two commits to compare
2. Click **"Compare"**
3. See diff of all datasets
4. See what changed between versions

**Use Cases:**
- See what changed since yesterday
- Compare development to production
- Audit who made specific changes
- Understand evolution of dataset

## Advanced Features

### Branch-Based Development

**Feature Branch Workflow:**

1. **Create Feature Branch**:
   ```
   Create workspace: "feature-customer-segmentation"
   Map to Git branch: "feature/customer-segmentation"
   ```

2. **Make Changes**:
   - Add new datasets
   - Modify existing datasets
   - Commit to feature branch

3. **Merge to Main**:
   - Create pull request in Git
   - Review and approve
   - Merge feature branch to main
   - Pull changes in main workspace

### YAML File Structure

Datasets are stored as YAML files in Git:

```yaml
# datasets/bronze/customers.yml
---
metadata:
  id: ds_abc123
  name: customers
  fqn: main.bronze.customers
  medallion_layer: Bronze
  entity_type: Table
  materialization_type: Table
  description: Customer master data
  owner_id: user_xyz
  visibility: public
  created_at: '2025-01-15T10:00:00Z'
  updated_at: '2025-01-15T10:30:00Z'

columns:
  - name: customer_id
    data_type: BIGINT
    is_primary_key: true
    is_nullable: false
    description: Unique customer identifier

  - name: email
    data_type: VARCHAR
    is_nullable: false
    description: Customer email address

  - name: first_name
    data_type: VARCHAR
    description: Customer first name

  - name: last_name
    data_type: VARCHAR
    description: Customer last name

lineage:
  - source_column: raw_customers.cust_id
    target_column: customers.customer_id
    mapping_type: Transform
    transformation: CAST(cust_id AS BIGINT)
```

### CI/CD Integration

**Automated Testing:**

1. **On Push**: Run validation tests
   - YAML syntax validation
   - Schema validation
   - Reference integrity checks

2. **On Pull Request**: Run extended tests
   - Impact analysis
   - Breaking change detection
   - Documentation checks

3. **On Merge**: Deploy changes
   - Update documentation
   - Generate DDL scripts
   - Deploy to environments

**Example GitHub Action:**
```yaml
name: Validate Data Models
on: [push, pull_request]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Validate YAML
        run: |
          for file in datasets/**/*.yml; do
            yamllint "$file"
          done
      - name: Check References
        run: |
          python scripts/validate_references.py
```

## Best Practices

### Commit Frequency

- **Commit often**: After completing logical units of work
- **Atomic commits**: Each commit should be self-contained
- **Before breaks**: Commit before lunch, end of day, etc.

### Commit Messages

- **Be descriptive**: Explain what and why, not just what
- **Use imperative mood**: "Add column" not "Added column"
- **Reference issues**: Include issue numbers if applicable

### Collaboration

- **Pull before push**: Always pull latest before committing
- **Communicate**: Let team know about major changes
- **Review changes**: Review others' commits regularly
- **Resolve conflicts promptly**: Don't let conflicts accumulate

### Branch Strategy

- **Main branch**: Production-ready models only
- **Development branches**: Work-in-progress features
- **Short-lived branches**: Merge quickly to avoid drift
- **Descriptive names**: `feature/customer-segmentation`

## Troubleshooting

### "Unable to push: repository is behind"
**Solution**: Pull latest changes first, then push again

### "Conflict detected: cannot auto-merge"
**Solution**: Manually resolve conflicts using conflict resolution UI

### "Authentication failed"
**Solution**: Regenerate access token and update workspace settings

### "YAML parse error"
**Solution**: Check YAML syntax in Git, fix formatting issues

### "Dataset not found in Git"
**Solution**: Dataset may have been deleted; check commit history

## Getting Help

- See [Workspaces and Projects](./workspaces-and-projects.md)
- See [Datasets and Lineage](./datasets-and-lineage.md)
- Contact support at support@uroq.com

---

**Next:** [Multi-Tenancy Guide](./multi-tenancy.md)
