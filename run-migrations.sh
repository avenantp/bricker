#!/bin/bash

# =====================================================
# Run Database Migrations
# =====================================================
# This script runs pending database migrations in order
# =====================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;37m'
NC='\033[0m' # No Color

# Configuration - Update these with your database details
DB_HOST="${PGHOST:-localhost}"
DB_PORT="${PGPORT:-5432}"
DB_NAME="${PGDATABASE:-uroq}"
DB_USER="${PGUSER:-postgres}"

# Password handling
if [ -z "$PGPASSWORD" ]; then
    echo -e "${YELLOW}Please enter your PostgreSQL password:${NC}"
    read -s DB_PASSWORD
    export PGPASSWORD="$DB_PASSWORD"
fi

# Migration files in order
migrations=(
    "RECOVERY_restore_workspace_datasets_table.sql"
    "S_2_4_deprecate_project_datasets_table.sql"
    "S_2_5_consolidate_project_source_control_credentials.sql"
    "S_2_6_update_source_control_functions.sql"
)

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
MIGRATIONS_PATH="$SCRIPT_DIR/backend/migrations"

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Database Migration Script${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${GRAY}Database: $DB_NAME@$DB_HOST:$DB_PORT${NC}"
echo -e "${GRAY}User: $DB_USER${NC}"
echo -e "${GRAY}Migrations Path: $MIGRATIONS_PATH${NC}"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo -e "${RED}ERROR: psql command not found. Please install PostgreSQL client tools.${NC}"
    echo -e "${YELLOW}Install with: sudo apt-get install postgresql-client (Ubuntu/Debian)${NC}"
    echo -e "${YELLOW}            : brew install postgresql (macOS)${NC}"
    exit 1
fi

PSQL_VERSION=$(psql --version)
echo -e "${GREEN}PostgreSQL Client: $PSQL_VERSION${NC}"
echo ""

# Test database connection
echo -e "${YELLOW}Testing database connection...${NC}"
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "SELECT version();" &> /dev/null; then
    echo -e "${RED}ERROR: Cannot connect to database${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Database connection successful${NC}"
echo ""

# Confirm before proceeding
echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Ready to run ${#migrations[@]} migration(s)${NC}"
echo -e "${YELLOW}========================================${NC}"
for migration in "${migrations[@]}"; do
    echo -e "${GRAY}  - $migration${NC}"
done
echo ""
echo -e "${YELLOW}WARNING: This will modify your database schema.${NC}"
read -p "Do you want to proceed? (yes/no): " confirmation

if [ "$confirmation" != "yes" ]; then
    echo -e "${YELLOW}Migration cancelled.${NC}"
    exit 0
fi

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Running Migrations${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

success_count=0
error_count=0

for migration in "${migrations[@]}"; do
    migration_file="$MIGRATIONS_PATH/$migration"

    if [ ! -f "$migration_file" ]; then
        echo -e "${YELLOW}⚠ SKIPPED: $migration (file not found)${NC}"
        continue
    fi

    echo -e "${CYAN}Running: $migration${NC}"

    output=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file" 2>&1)
    exit_code=$?

    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ SUCCESS: $migration${NC}"
        ((success_count++))

        # Show NOTICE messages if any
        notices=$(echo "$output" | grep "NOTICE:")
        if [ ! -z "$notices" ]; then
            echo "$notices" | while IFS= read -r line; do
                echo -e "${GRAY}  $line${NC}"
            done
        fi
    else
        echo -e "${RED}✗ FAILED: $migration${NC}"
        echo -e "${RED}$output${NC}"
        ((error_count++))
    fi

    echo ""
done

# Summary
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  Migration Summary${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${GREEN}Successful: $success_count${NC}"

if [ $error_count -gt 0 ]; then
    echo -e "${RED}Failed: $error_count${NC}"
else
    echo -e "${GRAY}Failed: $error_count${NC}"
fi

echo ""

if [ $error_count -eq 0 ]; then
    echo -e "${GREEN}✓ All migrations completed successfully!${NC}"
else
    echo -e "${YELLOW}⚠ Some migrations failed. Please review the errors above.${NC}"
fi

echo ""

# Clear password from environment
unset PGPASSWORD
