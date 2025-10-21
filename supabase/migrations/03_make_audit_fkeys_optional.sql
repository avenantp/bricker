-- Make audit foreign keys optional for development
-- This allows diagram_datasets and other tables to have NULL created_by/updated_by
-- without requiring a valid user reference

-- Drop existing foreign key constraints for created_by and updated_by
ALTER TABLE ONLY public.diagram_datasets
    DROP CONSTRAINT IF EXISTS diagram_datasets_added_by_fkey;

ALTER TABLE ONLY public.diagram_datasets
    DROP CONSTRAINT IF EXISTS diagram_datasets_updated_by_fkey;

-- Optionally re-add them as nullable (foreign keys allow NULL by default)
-- but with ON DELETE SET NULL to handle user deletions gracefully
ALTER TABLE ONLY public.diagram_datasets
    ADD CONSTRAINT diagram_datasets_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.diagram_datasets
    ADD CONSTRAINT diagram_datasets_updated_by_fkey
    FOREIGN KEY (updated_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON CONSTRAINT diagram_datasets_created_by_fkey ON public.diagram_datasets IS
    'Optional reference to user who created this diagram-dataset relationship';
COMMENT ON CONSTRAINT diagram_datasets_updated_by_fkey ON public.diagram_datasets IS
    'Optional reference to user who last updated this diagram-dataset relationship';
