# Database Migrations

## Current State

This directory contains the consolidated schema for the Uroq application.

### Schema File

- **`initial_schema.sql`** - Complete database schema representing the current state after all migrations

## Migration History

All previous migration files have been consolidated into `initial_schema.sql`. This file represents the final state of the database structure.

### What Migrations Were Applied

1. **Table Renames**:
   - `account_members` → `account_users`
   - `project_members` → `project_users`
   - `workspace_members` → `workspace_users`
   - `git_commits` → `source_code_commits`
   - `metadata_changes` → `audit_logs`
   - `databricks_connections` → `environments`

2. **Column Renames**:
   - `workspaces.github_branch` → `source_branch`
   - `datasets.github_file_path` → `source_file_path`
   - `datasets.github_commit_sha` → `source_commit_sha`
   - `environments.databricks_workspace_url` → `platform_url`

3. **New Columns Added**:
   - Multi-tenancy: `account_id`, `owner_id`, `visibility` to core tables
   - Source control: `source_provider`, `source_commit_sha`
   - Platform agnostic: `target_platform`, `platform_config`

4. **Tables Removed**:
   - Old architecture: nodes, node_items, node_lineage, relationships, references
   - Deprecated: data_models, model_versions, branches
   - Future features: notifications, api_keys, webhooks, etc.

## Database Schema Structure

### Core Tables
- `accounts` - Multi-tenant root
- `subscription_plans` - Subscription tiers
- `users` - User profiles
- `account_users` - Company membership

### Projects & Workspaces
- `projects` - Project management
- `project_users` - Project access control
- `project_datasets` - Project-dataset mapping
- `workspaces` - Workspace/branch management
- `workspace_users` - Workspace access control
- `workspace_datasets` - Workspace-dataset mapping

### Data Model
- `datasets` - Tables, views, etc.
- `columns` - Dataset columns
- `lineage` - Data flow tracking

### Support Tables
- `environments` - Deployment targets (vendor-agnostic)
- `connections` - Data source connections
- `macros` - Reusable code fragments
- `templates` - Jinja2 templates
- `template_fragments` - Template components

### Tracking
- `source_code_commits` - Version control commits
- `audit_logs` - Change tracking

### System
- `configurations` - Workspace settings
- `invitations` - User invitations

## Key Features

### Multi-Tenancy
All core entities include \`account_id\` for company-level isolation using Row Level Security (RLS).

### Resource Ownership
Tables include \`owner_id\` and \`visibility\` (public/private/locked) for fine-grained access control.

### Source Control Provider Support
Support for multiple providers: GitHub, GitLab, Bitbucket, Azure DevOps, and custom providers.

### Platform Vendor Agnostic
Environments support multiple data platforms: Databricks, Snowflake, BigQuery, Redshift, Azure Synapse.

## Applying the Schema

### For New Database
\`\`\`sql
-- Run the initial schema
\i initial_schema.sql
\`\`\`

### For Existing Database
The schema uses \`IF NOT EXISTS\` clauses, so it's safe to run on an existing database. However, it will not modify existing tables or rename columns.

If you need to update an existing database, you should:
1. Back up your database first
2. Run the sync migration script (if applicable)
3. Verify all changes

## Notes

- All migrations have been applied to the production database
- This schema represents the consolidated final state
- Future changes should be applied through new migration files
- Always backup before applying schema changes

## References

- Technical Specification: \`docs/prp/001-technical-specifications-refactored.md\`
- Database Alignment Summary: \`docs/migrations/DATABASE_ALIGNMENT_SUMMARY.md\`
- Git to Source Code Mapping: \`docs/migrations/GIT_TO_SOURCE_CODE_SUMMARY.md\`
