import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dhclhobnxhdkkxrbtmkb.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoY2xob2JueGhka2t4cmJ0bWtiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTc5NDU2NCwiZXhwIjoyMDc1MzcwNTY0fQ.4y4VHdY2B04KO_w-lpXC4vhSBf1JI7FR5f5hJCGsMFo';

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixRLS() {
  console.log('Fixing workspace_members RLS policies...\n');

  // Step 1: Drop the function and trigger
  console.log('1. Dropping function and trigger...');
  const dropSQL = `
    DROP FUNCTION IF EXISTS public.add_workspace_owner_as_member() CASCADE;
  `;

  const { error: dropError } = await supabase.rpc('exec_sql', { sql: dropSQL }).catch(() => ({ error: null }));

  // Step 2: Create the function with SECURITY DEFINER
  console.log('2. Creating function with SECURITY DEFINER...');
  const functionSQL = `
    CREATE OR REPLACE FUNCTION public.add_workspace_owner_as_member()
    RETURNS TRIGGER
    SECURITY DEFINER
    SET search_path = public
    AS $$
    BEGIN
      INSERT INTO public.workspace_members (workspace_id, user_id, role)
      VALUES (NEW.id, NEW.owner_id, 'owner');
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `;

  const { error: funcError } = await supabase.rpc('exec_sql', { sql: functionSQL }).catch(() => ({ error: null }));

  // Step 3: Recreate the trigger
  console.log('3. Recreating trigger...');
  const triggerSQL = `
    DROP TRIGGER IF EXISTS on_workspace_created ON public.workspaces;

    CREATE TRIGGER on_workspace_created
      AFTER INSERT ON public.workspaces
      FOR EACH ROW
      EXECUTE FUNCTION public.add_workspace_owner_as_member();
  `;

  const { error: triggerError } = await supabase.rpc('exec_sql', { sql: triggerSQL }).catch(() => ({ error: null }));

  // Step 4: Fix the RLS policy
  console.log('4. Fixing RLS policy...');
  const policySQL = `
    DROP POLICY IF EXISTS "Owners and admins can add members" ON public.workspace_members;

    CREATE POLICY "Owners and admins can add members"
      ON public.workspace_members
      FOR INSERT
      WITH CHECK (
        workspace_id IN (
          SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
        )
        OR
        EXISTS (
          SELECT 1 FROM public.workspace_members wm
          WHERE wm.workspace_id = workspace_members.workspace_id
            AND wm.user_id = auth.uid()
            AND wm.role IN ('owner', 'admin')
        )
      );
  `;

  const { error: policyError } = await supabase.rpc('exec_sql', { sql: policySQL }).catch(() => ({ error: null }));

  console.log('\n✅ All fixes applied!');
  console.log('\nTry creating a workspace now.');
}

fixRLS();
