-- Verification query for soft delete implementation
-- Run this to verify all tables have the necessary columns

SELECT
  table_name,
  COUNT(*) FILTER (WHERE column_name = 'deleted_at') as has_deleted_at,
  COUNT(*) FILTER (WHERE column_name = 'deleted_by') as has_deleted_by
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'accounts', 'columns', 'configurations', 'connections', 'datasets',
    'environments', 'invitations', 'macros', 'projects', 'templates',
    'users', 'workspaces'
  )
  AND column_name IN ('deleted_at', 'deleted_by')
GROUP BY table_name
ORDER BY table_name;

-- Verify views exist
SELECT
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name LIKE '%_active'
ORDER BY table_name;

-- Verify functions exist
SELECT
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN (
  'soft_delete',
  'restore_deleted',
  'permanent_delete',
  'cleanup_soft_deleted_records',
  'soft_delete_account',
  'soft_delete_project',
  'soft_delete_dataset'
)
ORDER BY proname;
