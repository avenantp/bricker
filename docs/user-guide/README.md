# Uroq User Guide

Welcome to Uroq! This guide will help you get started with creating and managing data models, tracking lineage, and syncing with source control.

## 📚 Documentation Sections

### Getting Started
- [Getting Started Guide](./getting-started.md) - Quick start for new users
- [Migration Guide](./migration-guide.md) - Guide for users migrating from previous versions

### Core Features
- [Workspaces and Projects](./workspaces-and-projects.md) - Organizing your data models
- [Datasets and Lineage](./datasets-and-lineage.md) - Creating datasets and tracking data flow
- [Source Control Sync](./source-control-sync.md) - Syncing with GitHub/GitLab

### Multi-Tenant Features
- [accounts and Subscriptions](./multi-tenancy.md) - Understanding multi-tenant architecture
- [Access Control](./access-control.md) - Managing permissions and visibility

## 🎯 Quick Links

### For New Users
1. [Create your first project](./getting-started.md#creating-your-first-project)
2. [Create your first workspace](./getting-started.md#creating-your-first-workspace)
3. [Add your first dataset](./getting-started.md#creating-your-first-dataset)
4. [Connect to source control](./source-control-sync.md#connecting-github)

### Common Tasks
- [Create a dataset](./datasets-and-lineage.md#creating-datasets)
- [Add columns to a dataset](./datasets-and-lineage.md#managing-columns)
- [Define column references](./datasets-and-lineage.md#column-references)
- [Track data lineage](./datasets-and-lineage.md#tracking-lineage)
- [Commit changes to Git](./source-control-sync.md#committing-changes)
- [Share datasets across projects](./multi-tenancy.md#sharing-datasets)

### For Administrators
- [Manage company settings](./multi-tenancy.md#company-settings)
- [Manage user access](./access-control.md#managing-users)
- [Upgrade subscription](./multi-tenancy.md#subscription-tiers)
- [Configure source control](./source-control-sync.md#workspace-configuration)

## 🏗️ Architecture Overview

Uroq uses a **database-first** architecture where:

1. **Supabase Database** is the primary source of truth
2. **Real-time editing** happens in the database
3. **Explicit commits** push changes to Git
4. **Bidirectional sync** keeps database and Git in sync

### Key Concepts

- **Company**: Multi-tenant root - all resources belong to a company
- **Project**: Top-level container for organizing datasets
- **Workspace**: Maps to a Git branch, contains datasets with canvas positions
- **Dataset**: Represents a table, view, or data entity (formerly "Node")
- **Column**: Field within a dataset (formerly "NodeItem")
- **Lineage**: Tracks data flow from source to target columns

## 📖 What's New

### Version 2.0 (Refactored Architecture)

#### Multi-Tenancy
- **Company-based isolation** - All resources isolated by company
- **Subscription tiers** - Free, Pro, and Enterprise plans
- **Shared resources** - Datasets can be shared across projects
- **Access control** - Fine-grained permissions with public/private/locked visibility

#### Source Control Integration
- **Database-first workflow** - Edit in database, commit to Git
- **Uncommitted changes tracking** - See what's changed before committing
- **Conflict resolution** - Handle conflicts when pulling from Git
- **Commit history** - View full history of dataset changes

#### Terminology Changes
- `Node` → `Dataset` (represents a table or data entity)
- `NodeItem` → `Column` (field within a dataset)
- `Relationship` → `Column Reference` (stored on column, not separate table)
- `Branch` → `Workspace` (maps to Git branch)

#### Architecture Improvements
- **Column-level references** - References stored directly on columns
- **Improved lineage tracking** - Column-level lineage with transformations
- **Mapping tables** - Datasets can belong to multiple projects/workspaces
- **Better sync status** - Track uncommitted changes, sync errors, conflicts

## 🆘 Getting Help

### Documentation
- Browse the guides in this directory
- Check the [API Documentation](../api/README.md)
- Review the [Technical Specifications](../prp/001-technical-specifications-refactored.md)

### Support
- Report issues on GitHub
- Contact support at support@uroq.com
- Join our community forum

## 🔄 Migration from Version 1.x

If you're upgrading from a previous version, please read the [Migration Guide](./migration-guide.md) which covers:
- What's changed in the new architecture
- How to migrate existing data models
- New features and capabilities
- Breaking changes and how to handle them

## 📝 Contributing

Found an error in the documentation? Want to add examples?
- Submit a pull request
- Open an issue
- Contact the documentation team

---

**Last Updated**: 2025-01-15
**Version**: 2.0.0
