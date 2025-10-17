-- Check all triggers on the datasets table
SELECT
    trigger_name,
    event_manipulation,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE event_object_table = 'datasets'
ORDER BY trigger_name;

-- Check all functions that reference deleted_at
SELECT
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_definition LIKE '%deleted_at%'
ORDER BY routine_name;
