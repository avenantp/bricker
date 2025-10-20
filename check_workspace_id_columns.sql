-- Check which tables have workspace_id column
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'workspace_id'
ORDER BY table_name;
