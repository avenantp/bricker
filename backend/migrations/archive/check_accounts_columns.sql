-- Diagnostic query to check what columns exist in accounts table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'accounts'
ORDER BY ordinal_position;
