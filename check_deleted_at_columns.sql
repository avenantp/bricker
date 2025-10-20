-- Check which tables already have deleted_at columns
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN (
    'accounts', 'columns', 'configurations', 'connections', 'datasets',
    'environments', 'invitations', 'macros', 'projects', 'templates',
    'users', 'workspaces'
  )
  AND column_name IN ('deleted_at', 'deleted_by')
ORDER BY table_name, column_name;
