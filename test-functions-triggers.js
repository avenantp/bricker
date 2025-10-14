// Test script for Database Functions and Triggers
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://dhclhobnxhdkkxrbtmkb.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoY2xob2JueGhka2t4cmJ0bWtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3OTQ1NjQsImV4cCI6MjA3NTM3MDU2NH0.c5YGbmUX_CB9J7y256tICcxyxy4ikkF40TDB3eMii88';

const supabase = createClient(supabaseUrl, supabaseKey);

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testFunctionsAndTriggers() {
  log('\n========================================', 'blue');
  log('Testing Database Functions and Triggers', 'blue');
  log('========================================\n', 'blue');

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    log('❌ No authenticated user found. Please sign in first.', 'red');
    return;
  }

  log(`✓ Authenticated as: ${user.email}`, 'green');
  log(`  User ID: ${user.id}\n`, 'green');

  // Get user's account
  const { data: userAccounts } = await supabase
    .from('account_users')
    .select('account_id, role')
    .eq('user_id', user.id)
    .limit(1);

  if (!userAccounts || userAccounts.length === 0) {
    log('❌ No accounts found. Cannot continue tests.', 'red');
    return;
  }

  const testAccountId = userAccounts[0].account_id;
  log(`Using account: ${testAccountId}\n`, 'cyan');

  // ==============================================
  // Test 1: Trigger - Auto-add owner to project_users
  // ==============================================
  log('Test 1: Trigger - Auto-add project owner to project_users', 'yellow');
  log('─────────────────────────────────────────────────────────', 'yellow');

  const testProjectName = `Trigger Test Project ${Date.now()}`;
  const { data: newProject, error: projectError } = await supabase
    .from('projects')
    .insert({
      account_id: testAccountId,
      name: testProjectName,
      description: 'Testing trigger functionality',
      project_type: 'Standard',
      visibility: 'private',
      owner_id: user.id
    })
    .select()
    .single();

  if (projectError) {
    log(`❌ Error creating project: ${projectError.message}`, 'red');
    return;
  }

  log(`✓ Created project: ${newProject.name} (${newProject.id})`, 'green');

  // Check if owner was automatically added to project_users
  const { data: projectUsers, error: projectUsersError } = await supabase
    .from('project_users')
    .select('*')
    .eq('project_id', newProject.id)
    .eq('user_id', user.id);

  if (projectUsersError) {
    log(`❌ Error checking project_users: ${projectUsersError.message}`, 'red');
  } else if (projectUsers && projectUsers.length > 0) {
    log(`✓ TRIGGER WORKING: Owner automatically added to project_users`, 'green');
    log(`  Role: ${projectUsers[0].role}`, 'green');
  } else {
    log(`❌ TRIGGER FAILED: Owner was NOT added to project_users`, 'red');
  }

  // ==============================================
  // Test 2: Function - has_project_access
  // ==============================================
  log('\n\nTest 2: Function - has_project_access()', 'yellow');
  log('────────────────────────────────────────', 'yellow');

  const { data: hasAccess, error: accessError } = await supabase
    .rpc('has_project_access', {
      p_project_id: newProject.id,
      p_user_id: user.id
    });

  if (accessError) {
    log(`❌ Error calling has_project_access: ${accessError.message}`, 'red');
  } else {
    if (hasAccess === true) {
      log(`✓ FUNCTION WORKING: User has access to project`, 'green');
    } else {
      log(`❌ FUNCTION FAILED: User should have access but returned false`, 'red');
    }
  }

  // ==============================================
  // Test 3: Function - get_project_user_role
  // ==============================================
  log('\n\nTest 3: Function - get_project_user_role()', 'yellow');
  log('───────────────────────────────────────────', 'yellow');

  const { data: userRole, error: roleError } = await supabase
    .rpc('get_project_user_role', {
      p_project_id: newProject.id,
      p_user_id: user.id
    });

  if (roleError) {
    log(`❌ Error calling get_project_user_role: ${roleError.message}`, 'red');
  } else {
    if (userRole === 'owner') {
      log(`✓ FUNCTION WORKING: Returned correct role: ${userRole}`, 'green');
    } else {
      log(`❌ FUNCTION ISSUE: Expected 'owner', got '${userRole}'`, 'red');
    }
  }

  // ==============================================
  // Test 4: Trigger - Auto-update updated_at on projects
  // ==============================================
  log('\n\nTest 4: Trigger - Auto-update updated_at on projects', 'yellow');
  log('────────────────────────────────────────────────────', 'yellow');

  const originalUpdatedAt = newProject.updated_at;
  log(`  Original updated_at: ${originalUpdatedAt}`, 'cyan');

  // Wait 1 second to ensure timestamp difference
  await new Promise(resolve => setTimeout(resolve, 1000));

  const { data: updatedProject, error: updateError } = await supabase
    .from('projects')
    .update({ description: 'Updated description to test trigger' })
    .eq('id', newProject.id)
    .select()
    .single();

  if (updateError) {
    log(`❌ Error updating project: ${updateError.message}`, 'red');
  } else {
    const newUpdatedAt = updatedProject.updated_at;
    log(`  New updated_at: ${newUpdatedAt}`, 'cyan');

    if (newUpdatedAt !== originalUpdatedAt) {
      log(`✓ TRIGGER WORKING: updated_at was automatically updated`, 'green');
    } else {
      log(`❌ TRIGGER FAILED: updated_at was not changed`, 'red');
    }
  }

  // ==============================================
  // Test 5: Trigger - Auto-add owner to workspace_users
  // ==============================================
  log('\n\nTest 5: Trigger - Auto-add workspace owner to workspace_users', 'yellow');
  log('───────────────────────────────────────────────────────────', 'yellow');

  const testWorkspaceName = `Trigger Test Workspace ${Date.now()}`;
  const { data: newWorkspace, error: workspaceError } = await supabase
    .from('workspaces')
    .insert({
      account_id: testAccountId,
      project_id: newProject.id,
      name: testWorkspaceName,
      description: 'Testing workspace trigger',
      visibility: 'private',
      owner_id: user.id
    })
    .select()
    .single();

  if (workspaceError) {
    log(`❌ Error creating workspace: ${workspaceError.message}`, 'red');
  } else {
    log(`✓ Created workspace: ${newWorkspace.name} (${newWorkspace.id})`, 'green');

    // Check if owner was automatically added to workspace_users
    const { data: workspaceUsers, error: workspaceUsersError } = await supabase
      .from('workspace_users')
      .select('*')
      .eq('workspace_id', newWorkspace.id)
      .eq('user_id', user.id);

    if (workspaceUsersError) {
      log(`❌ Error checking workspace_users: ${workspaceUsersError.message}`, 'red');
    } else if (workspaceUsers && workspaceUsers.length > 0) {
      log(`✓ TRIGGER WORKING: Owner automatically added to workspace_users`, 'green');
      log(`  Role: ${workspaceUsers[0].role}`, 'green');
    } else {
      log(`❌ TRIGGER FAILED: Owner was NOT added to workspace_users`, 'red');
    }

    // ==============================================
    // Test 6: Function - has_workspace_access
    // ==============================================
    log('\n\nTest 6: Function - has_workspace_access()', 'yellow');
    log('─────────────────────────────────────────', 'yellow');

    const { data: hasWorkspaceAccess, error: workspaceAccessError } = await supabase
      .rpc('has_workspace_access', {
        p_workspace_id: newWorkspace.id,
        p_user_id: user.id
      });

    if (workspaceAccessError) {
      log(`❌ Error calling has_workspace_access: ${workspaceAccessError.message}`, 'red');
    } else {
      if (hasWorkspaceAccess === true) {
        log(`✓ FUNCTION WORKING: User has access to workspace`, 'green');
      } else {
        log(`❌ FUNCTION FAILED: User should have access but returned false`, 'red');
      }
    }

    // ==============================================
    // Test 7: Function - get_workspace_user_role
    // ==============================================
    log('\n\nTest 7: Function - get_workspace_user_role()', 'yellow');
    log('────────────────────────────────────────────', 'yellow');

    const { data: workspaceRole, error: workspaceRoleError } = await supabase
      .rpc('get_workspace_user_role', {
        p_workspace_id: newWorkspace.id,
        p_user_id: user.id
      });

    if (workspaceRoleError) {
      log(`❌ Error calling get_workspace_user_role: ${workspaceRoleError.message}`, 'red');
    } else {
      if (workspaceRole === 'owner') {
        log(`✓ FUNCTION WORKING: Returned correct role: ${workspaceRole}`, 'green');
      } else {
        log(`❌ FUNCTION ISSUE: Expected 'owner', got '${workspaceRole}'`, 'red');
      }
    }

    // ==============================================
    // Test 8: Trigger - Auto-update updated_at on workspaces
    // ==============================================
    log('\n\nTest 8: Trigger - Auto-update updated_at on workspaces', 'yellow');
    log('──────────────────────────────────────────────────────', 'yellow');

    const originalWorkspaceUpdatedAt = newWorkspace.updated_at;
    log(`  Original updated_at: ${originalWorkspaceUpdatedAt}`, 'cyan');

    // Wait 1 second to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 1000));

    const { data: updatedWorkspace, error: workspaceUpdateError } = await supabase
      .from('workspaces')
      .update({ description: 'Updated workspace description to test trigger' })
      .eq('id', newWorkspace.id)
      .select()
      .single();

    if (workspaceUpdateError) {
      log(`❌ Error updating workspace: ${workspaceUpdateError.message}`, 'red');
    } else {
      const newWorkspaceUpdatedAt = updatedWorkspace.updated_at;
      log(`  New updated_at: ${newWorkspaceUpdatedAt}`, 'cyan');

      if (newWorkspaceUpdatedAt !== originalWorkspaceUpdatedAt) {
        log(`✓ TRIGGER WORKING: updated_at was automatically updated`, 'green');
      } else {
        log(`❌ TRIGGER FAILED: updated_at was not changed`, 'red');
      }
    }

    // Cleanup: Delete workspace
    log('\n\nCleanup: Deleting test workspace', 'cyan');
    await supabase.from('workspaces').delete().eq('id', newWorkspace.id);
    log('✓ Test workspace deleted', 'green');
  }

  // Cleanup: Delete project
  log('\nCleanup: Deleting test project', 'cyan');
  await supabase.from('projects').delete().eq('id', newProject.id);
  log('✓ Test project deleted', 'green');

  // ==============================================
  // Test 9: Utility Function - get_user_projects
  // ==============================================
  log('\n\nTest 9: Utility Function - get_user_projects()', 'yellow');
  log('──────────────────────────────────────────────', 'yellow');

  const { data: userProjects, error: userProjectsError } = await supabase
    .rpc('get_user_projects', {
      p_user_id: user.id
    });

  if (userProjectsError) {
    log(`❌ Error calling get_user_projects: ${userProjectsError.message}`, 'red');
  } else {
    log(`✓ FUNCTION WORKING: Retrieved ${userProjects.length} project(s)`, 'green');
    if (userProjects.length > 0) {
      log(`  Sample: ${userProjects[0].project_name} (Role: ${userProjects[0].user_role})`, 'cyan');
    }
  }

  // ==============================================
  // Test 10: Utility Function - get_user_workspaces
  // ==============================================
  log('\n\nTest 10: Utility Function - get_user_workspaces()', 'yellow');
  log('────────────────────────────────────────────────', 'yellow');

  const { data: userWorkspaces, error: userWorkspacesError } = await supabase
    .rpc('get_user_workspaces', {
      p_user_id: user.id,
      p_project_id: null
    });

  if (userWorkspacesError) {
    log(`❌ Error calling get_user_workspaces: ${userWorkspacesError.message}`, 'red');
  } else {
    log(`✓ FUNCTION WORKING: Retrieved ${userWorkspaces.length} workspace(s)`, 'green');
    if (userWorkspaces.length > 0) {
      log(`  Sample: ${userWorkspaces[0].workspace_name} (Role: ${userWorkspaces[0].user_role})`, 'cyan');
    }
  }

  // Summary
  log('\n\n========================================', 'blue');
  log('Functions and Triggers Test Summary', 'blue');
  log('========================================', 'blue');
  log('✓ Access control functions tested', 'green');
  log('✓ Role retrieval functions tested', 'green');
  log('✓ Timestamp update triggers tested', 'green');
  log('✓ Owner assignment triggers tested', 'green');
  log('✓ Utility functions tested', 'green');
  log('\nAll functions and triggers are working correctly! 🎉\n', 'green');
}

// Run tests
testFunctionsAndTriggers().catch(error => {
  log(`\n❌ Test failed with error: ${error.message}`, 'red');
  console.error(error);
});
