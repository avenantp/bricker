# Database Migration Guide

This guide explains how to run the pending database migrations for the Uroq project.

## Migrations Included

The migration scripts will execute the following in order:

1. **RECOVERY_restore_workspace_datasets_table.sql**
   - Restores the `workspace_datasets` table that was accidentally dropped
   - Creates indexes and constraints

2. **S_2_4_deprecate_project_datasets_table.sql**
   - Deprecates the `project_datasets` table
   - Projects now access datasets through: project → workspaces → workspace_datasets

3. **S_2_5_consolidate_project_source_control_credentials.sql**
   - Consolidates `project_source_control_credentials` into `projects` table
   - Migrates existing credential data
   - Improves performance by eliminating table joins

4. **S_2_6_update_source_control_functions.sql**
   - Updates database functions to work with consolidated structure
   - Updates: `disconnect_project_source_control`, `get_project_source_control_status`, `has_project_credentials`

## Prerequisites

### All Platforms
- PostgreSQL client tools installed (`psql` command available)
- Database connection details (host, port, database name, username, password)

### Windows
- PowerShell 5.1 or higher

### Linux/macOS
- Bash shell

## Running the Migrations

### Windows (PowerShell)

1. Open PowerShell as Administrator
2. Navigate to the project root:
   ```powershell
   cd C:\Code\uroq
   ```

3. Run the migration script:
   ```powershell
   .\run-migrations.ps1
   ```

4. You will be prompted for:
   - PostgreSQL password (if not set in environment)
   - Confirmation to proceed

### Linux/macOS (Bash)

1. Open Terminal
2. Navigate to the project root:
   ```bash
   cd /path/to/uroq
   ```

3. Run the migration script:
   ```bash
   ./run-migrations.sh
   ```

4. You will be prompted for:
   - PostgreSQL password (if not set in environment)
   - Confirmation to proceed

## Configuration

### Environment Variables (Recommended)

Set these before running the script to avoid being prompted:

```bash
# Linux/macOS
export PGHOST=localhost
export PGPORT=5432
export PGDATABASE=uroq
export PGUSER=postgres
export PGPASSWORD=your_password

# Windows PowerShell
$env:PGHOST="localhost"
$env:PGPORT="5432"
$env:PGDATABASE="uroq"
$env:PGUSER="postgres"
$env:PGPASSWORD="your_password"
```

### Script Configuration

Alternatively, you can edit the configuration at the top of the migration scripts:

**PowerShell (`run-migrations.ps1`):**
```powershell
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "uroq"
$DB_USER = "postgres"
$DB_PASSWORD = "your_password_here"  # Not recommended for production
```

**Bash (`run-migrations.sh`):**
```bash
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"
DB_NAME="${PGDATABASE:-uroq}"
DB_USER="${PGUSER:-postgres}"
```

## What the Scripts Do

1. **Verify PostgreSQL Client**: Checks if `psql` is installed
2. **Test Connection**: Verifies database connectivity
3. **Show Migration Plan**: Lists all migrations to be run
4. **Request Confirmation**: Asks "yes/no" before proceeding
5. **Run Migrations**: Executes each SQL file in order
6. **Show Results**: Displays success/failure for each migration
7. **Summary**: Shows total successful and failed migrations

## Output

The script provides colored output:

- 🟢 **Green**: Successful operations
- 🔴 **Red**: Errors and failures
- 🟡 **Yellow**: Warnings and prompts
- 🔵 **Cyan**: Section headers
- ⚪ **Gray**: Informational messages

Example output:
```
========================================
  Database Migration Script
========================================

Database: uroq@localhost:5432
User: postgres
Migrations Path: C:\Code\uroq\backend\migrations

PostgreSQL Client: psql (PostgreSQL) 15.3

Testing database connection...
✓ Database connection successful

========================================
Ready to run 4 migration(s)
========================================
  - RECOVERY_restore_workspace_datasets_table.sql
  - S_2_4_deprecate_project_datasets_table.sql
  - S_2_5_consolidate_project_source_control_credentials.sql
  - S_2_6_update_source_control_functions.sql

WARNING: This will modify your database schema.
Do you want to proceed? (yes/no): yes

========================================
  Running Migrations
========================================

Running: RECOVERY_restore_workspace_datasets_table.sql
✓ SUCCESS: RECOVERY_restore_workspace_datasets_table.sql
  NOTICE:  workspace_datasets table successfully restored!

Running: S_2_4_deprecate_project_datasets_table.sql
✓ SUCCESS: S_2_4_deprecate_project_datasets_table.sql
  NOTICE:  SUCCESS: project_datasets table dropped

...

========================================
  Migration Summary
========================================

Successful: 4
Failed: 0

✓ All migrations completed successfully!
```

## Troubleshooting

### "psql command not found"

**Windows:**
- Install PostgreSQL from https://www.postgresql.org/download/windows/
- Add PostgreSQL bin directory to PATH (usually `C:\Program Files\PostgreSQL\15\bin`)

**macOS:**
```bash
brew install postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt-get install postgresql-client
```

### "Cannot connect to database"

Check:
- PostgreSQL server is running
- Host, port, database name are correct
- Username and password are correct
- Firewall allows connection to PostgreSQL port (default 5432)

### "Permission denied" (Linux/macOS)

Make the script executable:
```bash
chmod +x run-migrations.sh
```

### Migration fails partway through

- Check the error message in red
- Each migration runs in a transaction, so partial changes are rolled back
- Fix the issue and re-run the script
- Successfully completed migrations will be skipped if they have `IF EXISTS` checks

## Manual Execution

If you prefer to run migrations manually:

```bash
# Navigate to migrations directory
cd backend/migrations

# Run each migration individually
psql -h localhost -p 5432 -U postgres -d uroq -f RECOVERY_restore_workspace_datasets_table.sql
psql -h localhost -p 5432 -U postgres -d uroq -f S_2_4_deprecate_project_datasets_table.sql
psql -h localhost -p 5432 -U postgres -d uroq -f S_2_5_consolidate_project_source_control_credentials.sql
psql -h localhost -p 5432 -U postgres -d uroq -f S_2_6_update_source_control_functions.sql
```

## Safety Features

- ✅ **Connection test** before running migrations
- ✅ **Confirmation prompt** to prevent accidental execution
- ✅ **Transaction wrapping** for atomic operations
- ✅ **Verification steps** in each migration
- ✅ **Clear error messages** with troubleshooting hints
- ✅ **Password cleanup** after execution

## Support

If you encounter issues not covered in this guide:

1. Check the error output carefully
2. Review the migration SQL files for detailed comments
3. Verify your database schema matches expected state
4. Check PostgreSQL logs for additional details

---

**Last Updated:** 2025-10-17
