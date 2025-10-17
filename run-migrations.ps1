# =====================================================
# Run Database Migrations
# =====================================================
# This script runs pending database migrations in order
# =====================================================

# Configuration - Update these with your database details
$DB_HOST = "localhost"
$DB_PORT = "5432"
$DB_NAME = "uroq"
$DB_USER = "postgres"

# IMPORTANT: Set your database password
# Option 1: Set it here (not recommended for production)
# $DB_PASSWORD = "your_password_here"

# Option 2: Use environment variable (recommended)
if ($env:PGPASSWORD) {
    $DB_PASSWORD = $env:PGPASSWORD
} else {
    Write-Host "Please enter your PostgreSQL password:" -ForegroundColor Yellow
    $securePassword = Read-Host -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
    $DB_PASSWORD = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

# Set PGPASSWORD environment variable for psql
$env:PGPASSWORD = $DB_PASSWORD

# Migration files in order
$migrations = @(
    "RECOVERY_restore_workspace_datasets_table.sql",
    "S_2_4_deprecate_project_datasets_table.sql",
    "S_2_5_consolidate_project_source_control_credentials.sql",
    "S_2_6_update_source_control_functions.sql"
)

$migrationsPath = Join-Path $PSScriptRoot "backend\migrations"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Database Migration Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Database: $DB_NAME@$DB_HOST:$DB_PORT" -ForegroundColor Gray
Write-Host "User: $DB_USER" -ForegroundColor Gray
Write-Host "Migrations Path: $migrationsPath" -ForegroundColor Gray
Write-Host ""

# Check if psql is available
try {
    $psqlVersion = & psql --version 2>&1
    Write-Host "PostgreSQL Client: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "ERROR: psql command not found. Please install PostgreSQL client tools." -ForegroundColor Red
    Write-Host "Download from: https://www.postgresql.org/download/" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test database connection
Write-Host "Testing database connection..." -ForegroundColor Yellow
$testQuery = "SELECT version();"
$connectionTest = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c $testQuery 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Cannot connect to database" -ForegroundColor Red
    Write-Host $connectionTest -ForegroundColor Red
    exit 1
}

Write-Host "✓ Database connection successful" -ForegroundColor Green
Write-Host ""

# Confirm before proceeding
Write-Host "========================================" -ForegroundColor Yellow
Write-Host "Ready to run $($migrations.Count) migration(s)" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Yellow
foreach ($migration in $migrations) {
    Write-Host "  - $migration" -ForegroundColor Gray
}
Write-Host ""
Write-Host "WARNING: This will modify your database schema." -ForegroundColor Yellow
$confirmation = Read-Host "Do you want to proceed? (yes/no)"

if ($confirmation -ne "yes") {
    Write-Host "Migration cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Running Migrations" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$successCount = 0
$errorCount = 0

foreach ($migration in $migrations) {
    $migrationFile = Join-Path $migrationsPath $migration

    if (-not (Test-Path $migrationFile)) {
        Write-Host "⚠ SKIPPED: $migration (file not found)" -ForegroundColor Yellow
        continue
    }

    Write-Host "Running: $migration" -ForegroundColor Cyan

    $output = & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $migrationFile 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✓ SUCCESS: $migration" -ForegroundColor Green
        $successCount++

        # Show NOTICE messages if any
        $notices = $output | Select-String -Pattern "NOTICE:"
        if ($notices) {
            foreach ($notice in $notices) {
                Write-Host "  $notice" -ForegroundColor Gray
            }
        }
    } else {
        Write-Host "✗ FAILED: $migration" -ForegroundColor Red
        Write-Host $output -ForegroundColor Red
        $errorCount++
    }

    Write-Host ""
}

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Migration Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Failed: $errorCount" -ForegroundColor $(if ($errorCount -gt 0) { "Red" } else { "Gray" })
Write-Host ""

if ($errorCount -eq 0) {
    Write-Host "✓ All migrations completed successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠ Some migrations failed. Please review the errors above." -ForegroundColor Yellow
}

Write-Host ""

# Clear password from environment
$env:PGPASSWORD = $null
