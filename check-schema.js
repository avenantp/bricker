// Quick script to check Supabase schema
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dhclhobnxhdkkxrbtmkb.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoY2xob2JueGhka2t4cmJ0bWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3OTQ1NjQsImV4cCI6MjA3NTM3MDU2NH0.c5YGbmUX_CB9J7y256tICcxyxy4ikkF40TDB3eMii88';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('Checking accounts table...');

  // Try to get one row from accounts to see the structure
  const { data: accountSample, error: accountError } = await supabase
    .from('accounts')
    .select('*')
    .limit(1);

  console.log('Accounts table sample:', accountSample);
  console.log('Accounts table error:', accountError);

  console.log('\nChecking account_users table...');

  // Try to get one row from account_users
  const { data: accountUserSample, error: accountUserError } = await supabase
    .from('account_users')
    .select('*')
    .limit(1);

  console.log('Account_users table sample:', accountUserSample);
  console.log('Account_users table error:', accountUserError);

  console.log('\nChecking workspaces table...');

  const { data: workspaceSample, error: workspaceError } = await supabase
    .from('workspaces')
    .select('*')
    .limit(1);

  console.log('Workspaces table sample:', workspaceSample);
  console.log('Workspaces table error:', workspaceError);

  console.log('\nChecking workspace_members table...');

  const { data: workspaceMemberSample, error: workspaceMemberError } = await supabase
    .from('workspace_members')
    .select('*')
    .limit(1);

  console.log('Workspace_members table sample:', workspaceMemberSample);
  console.log('Workspace_members table error:', workspaceMemberError);
}

checkSchema();
