-- =====================================================
-- VERIFICATION: Audit Columns Status (Before Migration)
-- =====================================================
-- Description: Run this before S_3_1_standardize_audit_columns.sql
--              to see the current state of audit columns
-- =====================================================

-- =====================================================
-- Query 1: Show all tables and their audit columns
-- =====================================================

SELECT
  table_name,
  COUNT(*) FILTER (WHERE column_name = 'created_at') as has_created_at,
  COUNT(*) FILTER (WHERE column_name = 'created_by') as has_created_by,
  COUNT(*) FILTER (WHERE column_name = 'updated_at') as has_updated_at,
  COUNT(*) FILTER (WHERE column_name = 'updated_by') as has_updated_by,
  COUNT(*) FILTER (WHERE column_name = 'added_at') as has_added_at,
  COUNT(*) FILTER (WHERE column_name = 'added_by') as has_added_by
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('created_at', 'created_by', 'updated_at', 'updated_by', 'added_at', 'added_by')
GROUP BY table_name
ORDER BY table_name;

-- =====================================================
-- Query 2: List tables using OLD column naming (added_at, added_by)
-- =====================================================

SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('added_at', 'added_by')
ORDER BY table_name, column_name;

-- =====================================================
-- Query 3: List tables MISSING standard audit columns
-- =====================================================

WITH core_tables AS (
  SELECT unnest(ARRAY[
    'accounts', 'users', 'workspaces', 'projects', 'connections',
    'datasets', 'columns', 'diagrams', 'lineage_edges',
    'workspace_members', 'project_members', 'account_users',
    'workspace_datasets', 'diagram_datasets'
  ]) AS table_name
),
table_columns AS (
  SELECT
    t.table_name,
    COUNT(*) FILTER (WHERE c.column_name = 'created_at') as has_created_at,
    COUNT(*) FILTER (WHERE c.column_name = 'created_by') as has_created_by,
    COUNT(*) FILTER (WHERE c.column_name = 'updated_at') as has_updated_at,
    COUNT(*) FILTER (WHERE c.column_name = 'updated_by') as has_updated_by
  FROM core_tables t
  LEFT JOIN information_schema.columns c
    ON c.table_schema = 'public'
    AND c.table_name = t.table_name
    AND c.column_name IN ('created_at', 'created_by', 'updated_at', 'updated_by')
  GROUP BY t.table_name
)
SELECT
  table_name,
  CASE WHEN has_created_at = 0 THEN 'MISSING' ELSE 'OK' END as created_at_status,
  CASE WHEN has_created_by = 0 THEN 'MISSING' ELSE 'OK' END as created_by_status,
  CASE WHEN has_updated_at = 0 THEN 'MISSING' ELSE 'OK' END as updated_at_status,
  CASE WHEN has_updated_by = 0 THEN 'MISSING' ELSE 'OK' END as updated_by_status
FROM table_columns
WHERE has_created_at = 0 OR has_created_by = 0 OR has_updated_at = 0 OR has_updated_by = 0
ORDER BY table_name;

-- =====================================================
-- Query 4: Show all triggers on updated_at
-- =====================================================

SELECT
  event_object_table as table_name,
  trigger_name,
  event_manipulation as event,
  action_timing as timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND (
    trigger_name LIKE '%updated_at%'
    OR action_statement LIKE '%updated_at%'
  )
ORDER BY event_object_table;

-- =====================================================
-- Query 5: Show workspace_datasets and diagram_datasets structure
-- =====================================================

SELECT
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('workspace_datasets', 'diagram_datasets')
  AND column_name IN ('id', 'created_at', 'created_by', 'updated_at', 'updated_by', 'added_at', 'added_by')
ORDER BY table_name, ordinal_position;

-- =====================================================
-- Summary
-- =====================================================

DO $$
DECLARE
  old_columns_count INTEGER;
  missing_columns_count INTEGER;
BEGIN
  -- Count tables still using old naming
  SELECT COUNT(DISTINCT table_name) INTO old_columns_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND column_name IN ('added_at', 'added_by');

  -- Count tables missing standard columns
  WITH core_tables AS (
    SELECT unnest(ARRAY[
      'accounts', 'users', 'workspaces', 'projects', 'connections',
      'datasets', 'columns', 'diagrams', 'lineage_edges',
      'workspace_members', 'project_members', 'account_users',
      'workspace_datasets', 'diagram_datasets'
    ]) AS table_name
  ),
  table_audit_status AS (
    SELECT
      t.table_name,
      COUNT(*) FILTER (WHERE c.column_name = 'created_at') as has_created_at,
      COUNT(*) FILTER (WHERE c.column_name = 'created_by') as has_created_by,
      COUNT(*) FILTER (WHERE c.column_name = 'updated_at') as has_updated_at,
      COUNT(*) FILTER (WHERE c.column_name = 'updated_by') as has_updated_by
    FROM core_tables t
    LEFT JOIN information_schema.columns c
      ON c.table_schema = 'public'
      AND c.table_name = t.table_name
      AND c.column_name IN ('created_at', 'created_by', 'updated_at', 'updated_by')
    GROUP BY t.table_name
  )
  SELECT COUNT(*) INTO missing_columns_count
  FROM table_audit_status
  WHERE has_created_at = 0 OR has_created_by = 0 OR has_updated_at = 0 OR has_updated_by = 0;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'AUDIT COLUMNS VERIFICATION SUMMARY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tables using OLD naming (added_at/added_by): %', old_columns_count;
  RAISE NOTICE 'Tables MISSING standard audit columns: %', missing_columns_count;
  RAISE NOTICE '========================================';

  IF old_columns_count > 0 OR missing_columns_count > 0 THEN
    RAISE NOTICE 'ACTION REQUIRED: Run S_3_1_standardize_audit_columns.sql';
  ELSE
    RAISE NOTICE 'STATUS: All audit columns are standardized!';
  END IF;
END $$;
