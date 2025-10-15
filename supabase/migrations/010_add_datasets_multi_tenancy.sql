-- =====================================================
-- Migration: 010_add_datasets_multi_tenancy
-- Add multi-tenancy and security fields to datasets table
-- Feature 4: Dataset and Column Metadata Management
-- Task 4.1.2: TypeScript Type Definitions
-- =====================================================

-- Add account_id column for multi-tenancy
-- This is a required field for isolating data by account/company
ALTER TABLE datasets
ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES accounts(id) ON DELETE CASCADE;

-- Add owner_id column for ownership tracking
ALTER TABLE datasets
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add visibility column for access control
ALTER TABLE datasets
ADD COLUMN IF NOT EXISTS visibility VARCHAR NOT NULL DEFAULT 'private'
  CHECK (visibility IN ('public', 'private', 'locked'));

-- Add is_locked column for locking datasets
ALTER TABLE datasets
ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN datasets.account_id IS 'Account/Company ID for multi-tenant isolation';
COMMENT ON COLUMN datasets.owner_id IS 'User ID of the dataset owner';
COMMENT ON COLUMN datasets.visibility IS 'Access control: public (all account members), private (owner + admins), locked (read-only except owner + admins)';
COMMENT ON COLUMN datasets.is_locked IS 'Whether the dataset is locked for editing';

-- Update existing rows to have account_id populated
-- IMPORTANT: This assumes workspace_id exists and workspaces table has account_id
-- If your schema is different, adjust this UPDATE statement accordingly
UPDATE datasets
SET account_id = (
  SELECT w.account_id
  FROM workspaces w
  WHERE w.id = datasets.workspace_id
)
WHERE account_id IS NULL AND workspace_id IS NOT NULL;

-- Make account_id NOT NULL after populating existing rows
-- If you have datasets without workspace_id, you'll need to handle those first
-- Uncomment the following line after verifying all datasets have account_id
-- ALTER TABLE datasets ALTER COLUMN account_id SET NOT NULL;

-- Create index on account_id for faster queries
CREATE INDEX IF NOT EXISTS idx_datasets_account_id ON datasets(account_id);

-- Create index on owner_id for faster owner lookups
CREATE INDEX IF NOT EXISTS idx_datasets_owner_id ON datasets(owner_id);

-- Create index on visibility for access control queries
CREATE INDEX IF NOT EXISTS idx_datasets_visibility ON datasets(visibility);

-- Create composite index for multi-tenant queries
CREATE INDEX IF NOT EXISTS idx_datasets_account_fqn ON datasets(account_id, fqn);

-- Update unique constraint to include account_id (drop old, create new)
-- This ensures FQN is unique within an account, not globally
ALTER TABLE datasets DROP CONSTRAINT IF EXISTS datasets_fqn_key;
ALTER TABLE datasets ADD CONSTRAINT datasets_account_fqn_unique UNIQUE(account_id, fqn);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================
-- NOTE: RLS is currently DISABLED per migration 004_disable_rls.sql
-- Access control is handled at the application layer.
-- The following policies are provided for reference but are COMMENTED OUT.
-- Uncomment and enable RLS if you want database-level access control.
-- =====================================================

/*
-- Enable RLS on datasets table if not already enabled
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see datasets from their account
CREATE POLICY IF NOT EXISTS datasets_isolation_policy ON datasets
  FOR SELECT
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can create datasets in their account
CREATE POLICY IF NOT EXISTS datasets_create_policy ON datasets
  FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Users can update datasets based on visibility and role
CREATE POLICY IF NOT EXISTS datasets_update_policy ON datasets
  FOR UPDATE
  USING (
    -- Dataset must be in user's account
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
    AND (
      -- User is the owner
      owner_id = auth.uid()
      OR
      -- User is an admin in the account
      EXISTS (
        SELECT 1
        FROM account_users
        WHERE account_id = datasets.account_id
          AND user_id = auth.uid()
          AND role = 'admin'
      )
      OR
      -- Dataset is public and not locked
      (visibility = 'public' AND is_locked = false)
    )
  );

-- Policy: Users can delete datasets if they are owner or admin
CREATE POLICY IF NOT EXISTS datasets_delete_policy ON datasets
  FOR DELETE
  USING (
    -- Dataset must be in user's account
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
    AND (
      -- User is the owner
      owner_id = auth.uid()
      OR
      -- User is an admin in the account
      EXISTS (
        SELECT 1
        FROM account_users
        WHERE account_id = datasets.account_id
          AND user_id = auth.uid()
          AND role = 'admin'
      )
    )
  );
*/

-- =====================================================
-- Trigger: Auto-set owner_id on insert
-- =====================================================

CREATE OR REPLACE FUNCTION set_dataset_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- Set owner_id to current user if not already set
  IF NEW.owner_id IS NULL THEN
    NEW.owner_id := auth.uid();
  END IF;

  -- Set created_by to current user if not already set
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_set_dataset_owner ON datasets;

CREATE TRIGGER trigger_set_dataset_owner
  BEFORE INSERT ON datasets
  FOR EACH ROW
  EXECUTE FUNCTION set_dataset_owner();

-- =====================================================
-- END OF MIGRATION
-- =====================================================

-- IMPORTANT NOTES:
-- 1. Review the UPDATE statement that populates account_id from workspaces
-- 2. After verifying all datasets have account_id, uncomment the NOT NULL constraint
-- 3. Test RLS policies in your Supabase dashboard before deploying to production
-- 4. Ensure account_users table exists with columns: account_id, user_id, role
-- 5. This migration assumes auth.uid() function is available (Supabase auth)
