-- Update template_fragments category constraint to match data warehouse categories
-- Drop the old constraint
ALTER TABLE public.template_fragments
DROP CONSTRAINT IF EXISTS template_fragments_category_check;

-- Add the new constraint with data warehouse categories
ALTER TABLE public.template_fragments
ADD CONSTRAINT template_fragments_category_check
CHECK (category IN (
  'data_vault', 'data_mart', 'staging', 'landing', 'jobs', 'pipelines', 'custom'
));
