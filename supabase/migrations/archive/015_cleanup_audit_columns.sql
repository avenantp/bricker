-- =====================================================
-- Clean up audit columns across all tables
-- Migration: 015_cleanup_audit_columns
-- Purpose:
--   1. Remove deleted_at and deleted_by columns from ALL tables
--   2. Ensure tables with any audit column have ALL audit columns
--      (created_at, created_by, updated_at, updated_by)
-- =====================================================

-- =====================================================
-- PART 1: Remove deleted_at and deleted_by columns
-- =====================================================

DO $$
DECLARE
    r RECORD;
BEGIN
    -- Find all columns named deleted_at or deleted_by in public schema
    FOR r IN
        SELECT
            table_name,
            column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name IN ('deleted_at', 'deleted_by')
        ORDER BY table_name, column_name
    LOOP
        RAISE NOTICE 'Dropping column %.% from table %', r.column_name, r.table_name, r.table_name;
        EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS %I CASCADE', r.table_name, r.column_name);
    END LOOP;
END $$;

-- =====================================================
-- PART 2: Standardize audit columns
-- =====================================================

DO $$
DECLARE
    t RECORD;
    has_created_at BOOLEAN;
    has_created_by BOOLEAN;
    has_updated_at BOOLEAN;
    has_updated_by BOOLEAN;
    needs_standardization BOOLEAN;
BEGIN
    -- Find all tables in public schema
    FOR t IN
        SELECT DISTINCT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name NOT LIKE 'pg_%'
          AND table_name NOT LIKE '_prisma_%'
        ORDER BY table_name
    LOOP
        -- Check which audit columns exist
        SELECT
            BOOL_OR(column_name = 'created_at'),
            BOOL_OR(column_name = 'created_by'),
            BOOL_OR(column_name = 'updated_at'),
            BOOL_OR(column_name = 'updated_by')
        INTO
            has_created_at,
            has_created_by,
            has_updated_at,
            has_updated_by
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = t.table_name
          AND column_name IN ('created_at', 'created_by', 'updated_at', 'updated_by');

        -- If table has any audit column, ensure it has all of them
        needs_standardization := has_created_at OR has_created_by OR has_updated_at OR has_updated_by;

        IF needs_standardization THEN
            RAISE NOTICE 'Standardizing audit columns for table: %', t.table_name;

            -- Add missing created_at
            IF NOT has_created_at THEN
                RAISE NOTICE '  Adding created_at to %', t.table_name;
                EXECUTE format('ALTER TABLE %I ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL', t.table_name);
            END IF;

            -- Add missing created_by
            IF NOT has_created_by THEN
                RAISE NOTICE '  Adding created_by to %', t.table_name;
                EXECUTE format('ALTER TABLE %I ADD COLUMN created_by UUID REFERENCES auth.users(id) DEFAULT NULL', t.table_name);
            END IF;

            -- Add missing updated_at
            IF NOT has_updated_at THEN
                RAISE NOTICE '  Adding updated_at to %', t.table_name;
                EXECUTE format('ALTER TABLE %I ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL', t.table_name);
            END IF;

            -- Add missing updated_by
            IF NOT has_updated_by THEN
                RAISE NOTICE '  Adding updated_by to %', t.table_name;
                EXECUTE format('ALTER TABLE %I ADD COLUMN updated_by UUID REFERENCES auth.users(id) DEFAULT NULL', t.table_name);
            END IF;
        END IF;
    END LOOP;
END $$;

-- =====================================================
-- PART 3: Drop any soft delete functions
-- =====================================================

DROP FUNCTION IF EXISTS soft_delete_project(UUID);
DROP FUNCTION IF EXISTS soft_delete_workspace(UUID);
DROP FUNCTION IF EXISTS soft_delete_dataset(UUID);

-- =====================================================
-- PART 4: Update any RLS policies that reference deleted_at
-- =====================================================

-- This will be handled by individual table migrations if needed
-- For now, we're just removing the column so policies will error
-- if they still reference deleted_at

-- =====================================================
-- Summary Report
-- =====================================================

DO $$
DECLARE
    r RECORD;
    total_tables INT := 0;
    tables_with_audit INT := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE 'AUDIT COLUMN CLEANUP SUMMARY';
    RAISE NOTICE '=====================================================';
    RAISE NOTICE '';

    RAISE NOTICE 'Tables with complete audit columns:';
    RAISE NOTICE '';

    FOR r IN
        SELECT
            t.table_name,
            COUNT(CASE WHEN c.column_name IN ('created_at', 'created_by', 'updated_at', 'updated_by') THEN 1 END) as audit_count
        FROM information_schema.tables t
        LEFT JOIN information_schema.columns c ON c.table_schema = t.table_schema AND c.table_name = t.table_name
        WHERE t.table_schema = 'public'
          AND t.table_type = 'BASE TABLE'
          AND t.table_name NOT LIKE 'pg_%'
          AND t.table_name NOT LIKE '_prisma_%'
        GROUP BY t.table_name
        HAVING COUNT(CASE WHEN c.column_name IN ('created_at', 'created_by', 'updated_at', 'updated_by') THEN 1 END) > 0
        ORDER BY t.table_name
    LOOP
        total_tables := total_tables + 1;
        IF r.audit_count = 4 THEN
            tables_with_audit := tables_with_audit + 1;
            RAISE NOTICE '  ✓ % (% audit columns)', r.table_name, r.audit_count;
        ELSE
            RAISE NOTICE '  ⚠ % (% audit columns - incomplete)', r.table_name, r.audit_count;
        END IF;
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE 'Total tables with audit columns: %', total_tables;
    RAISE NOTICE 'Tables with complete audit columns: %', tables_with_audit;
    RAISE NOTICE '';
    RAISE NOTICE '=====================================================';
END $$;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
