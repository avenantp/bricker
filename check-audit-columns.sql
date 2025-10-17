-- =====================================================
-- Check Audit Column Status
-- Run this to see current state before migration
-- =====================================================

-- Tables with deleted_at or deleted_by columns
SELECT
    '=== TABLES WITH SOFT DELETE COLUMNS ===' as section;

SELECT
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name IN ('deleted_at', 'deleted_by')
ORDER BY table_name, column_name;

-- Audit column status by table
SELECT
    '' as separator;

SELECT
    '=== AUDIT COLUMN STATUS BY TABLE ===' as section;

SELECT
    t.table_name,
    CASE WHEN BOOL_OR(c.column_name = 'created_at') THEN '✓' ELSE '✗' END as created_at,
    CASE WHEN BOOL_OR(c.column_name = 'created_by') THEN '✓' ELSE '✗' END as created_by,
    CASE WHEN BOOL_OR(c.column_name = 'updated_at') THEN '✓' ELSE '✗' END as updated_at,
    CASE WHEN BOOL_OR(c.column_name = 'updated_by') THEN '✓' ELSE '✗' END as updated_by,
    COUNT(CASE WHEN c.column_name IN ('created_at', 'created_by', 'updated_at', 'updated_by') THEN 1 END) as total_audit_cols
FROM information_schema.tables t
LEFT JOIN information_schema.columns c
    ON c.table_schema = t.table_schema
    AND c.table_name = t.table_name
    AND c.column_name IN ('created_at', 'created_by', 'updated_at', 'updated_by')
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND t.table_name NOT LIKE 'pg_%'
  AND t.table_name NOT LIKE '_prisma_%'
GROUP BY t.table_name
HAVING COUNT(CASE WHEN c.column_name IN ('created_at', 'created_by', 'updated_at', 'updated_by') THEN 1 END) > 0
ORDER BY total_audit_cols DESC, t.table_name;

-- Tables needing standardization
SELECT
    '' as separator;

SELECT
    '=== TABLES NEEDING AUDIT COLUMN STANDARDIZATION ===' as section;

SELECT
    t.table_name,
    COUNT(CASE WHEN c.column_name IN ('created_at', 'created_by', 'updated_at', 'updated_by') THEN 1 END) as audit_cols_count,
    array_agg(c.column_name ORDER BY c.column_name) FILTER (WHERE c.column_name IN ('created_at', 'created_by', 'updated_at', 'updated_by')) as existing_audit_cols
FROM information_schema.tables t
LEFT JOIN information_schema.columns c
    ON c.table_schema = t.table_schema
    AND c.table_name = t.table_name
    AND c.column_name IN ('created_at', 'created_by', 'updated_at', 'updated_by')
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND t.table_name NOT LIKE 'pg_%'
  AND t.table_name NOT LIKE '_prisma_%'
GROUP BY t.table_name
HAVING
    COUNT(CASE WHEN c.column_name IN ('created_at', 'created_by', 'updated_at', 'updated_by') THEN 1 END) > 0
    AND COUNT(CASE WHEN c.column_name IN ('created_at', 'created_by', 'updated_at', 'updated_by') THEN 1 END) < 4
ORDER BY t.table_name;
