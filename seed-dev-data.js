// Script to seed development database with sample data
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function seedDatabase() {
  log('\n========================================', 'blue');
  log('Seeding Development Database', 'blue');
  log('========================================\n', 'blue');

  // Check authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    log('❌ No authenticated user found. Please sign in first.', 'red');
    log('   Run the app and sign in before running seed script.', 'yellow');
    return;
  }

  log(`✓ Authenticated as: ${user.email}`, 'green');
  log(`  User ID: ${user.id}\n`, 'green');

  // Check for account
  const { data: userAccounts } = await supabase
    .from('account_users')
    .select('account_id, role')
    .eq('user_id', user.id);

  if (!userAccounts || userAccounts.length === 0) {
    log('❌ No accounts found for this user.', 'red');
    log('   Please complete signup and create an account first.', 'yellow');
    return;
  }

  const accountId = userAccounts[0].account_id;
  log(`✓ Using account: ${accountId}\n`, 'green');

  // =====================================================
  // Seed Sample Projects
  // =====================================================
  log('Step 1: Creating sample projects...', 'cyan');
  log('─────────────────────────────────────', 'cyan');

  const projects = [
    {
      name: 'Sample Standard Project',
      description: 'A standard project for general data modeling and management',
      project_type: 'Standard',
      visibility: 'public',
      configuration: {
        medallion_layers_enabled: true,
        default_catalog: 'main',
        default_schema: 'default',
        naming_conventions: {
          case_style: 'snake_case',
          prefix_enabled: false,
          suffix_enabled: false
        },
        quality_rules: {
          require_descriptions: true,
          require_business_names: false,
          min_confidence_score: 70
        }
      }
    },
    {
      name: 'Sample Data Vault Project',
      description: 'Enterprise data warehouse using Data Vault 2.0 methodology',
      project_type: 'DataVault',
      visibility: 'public',
      configuration: {
        medallion_layers_enabled: true,
        default_catalog: 'analytics',
        default_schema: 'raw_vault',
        data_vault_preferences: {
          hub_naming_pattern: 'HUB_{entity_name}',
          satellite_naming_pattern: 'SAT_{hub}_{descriptor}',
          link_naming_pattern: 'LNK_{entity1}_{entity2}',
          hash_algorithm: 'SHA-256',
          include_load_date: true,
          include_record_source: true,
          multi_active_satellites: true,
          business_vault_enabled: true
        }
      }
    },
    {
      name: 'Sample Dimensional Project',
      description: 'Star schema dimensional model for business intelligence',
      project_type: 'Dimensional',
      visibility: 'public',
      configuration: {
        medallion_layers_enabled: false,
        default_catalog: 'analytics',
        default_schema: 'reporting',
        dimensional_preferences: {
          dimension_naming_pattern: 'DIM_{entity_name}',
          fact_naming_pattern: 'FCT_{entity_name}',
          surrogate_key_strategy: 'hash',
          default_scd_type: 2,
          conformed_dimensions: true
        }
      }
    }
  ];

  const createdProjects = [];

  for (const project of projects) {
    // Check if project already exists
    const { data: existing } = await supabase
      .from('projects')
      .select('id, name')
      .eq('account_id', accountId)
      .eq('name', project.name)
      .single();

    if (existing) {
      log(`  ⚠ Project already exists: ${project.name}`, 'yellow');
      createdProjects.push(existing);
    } else {
      const { data: newProject, error } = await supabase
        .from('projects')
        .insert({
          account_id: accountId,
          owner_id: user.id,
          ...project
        })
        .select()
        .single();

      if (error) {
        log(`  ❌ Error creating ${project.name}: ${error.message}`, 'red');
      } else {
        log(`  ✓ Created project: ${newProject.name}`, 'green');
        createdProjects.push(newProject);
      }
    }
  }

  log(`\n✓ Projects: ${createdProjects.length} ready\n`, 'green');

  // =====================================================
  // Seed Sample Workspaces
  // =====================================================
  log('Step 2: Creating sample workspaces...', 'cyan');
  log('──────────────────────────────────────', 'cyan');

  const workspaces = [
    {
      projectName: 'Sample Standard Project',
      workspaces: [
        {
          name: 'Development',
          description: 'Development environment for testing and experimentation',
          visibility: 'public',
          source_control_provider: 'github',
          settings: {
            auto_sync_enabled: false,
            sync_interval_minutes: 15,
            conflict_resolution_strategy: 'manual',
            default_medallion_layer: 'Bronze',
            canvas_settings: {
              grid_enabled: true,
              grid_size: 15,
              snap_to_grid: true,
              show_minimap: true,
              default_zoom: 1.0
            }
          }
        },
        {
          name: 'Staging',
          description: 'Pre-production environment for final testing',
          visibility: 'public',
          source_control_provider: 'github',
          settings: {
            auto_sync_enabled: true,
            sync_interval_minutes: 30,
            conflict_resolution_strategy: 'manual',
            default_medallion_layer: 'Silver'
          }
        },
        {
          name: 'Production',
          description: 'Production environment - handle with care',
          visibility: 'locked',
          source_control_provider: 'github',
          is_locked: true,
          settings: {
            auto_sync_enabled: true,
            sync_interval_minutes: 60,
            conflict_resolution_strategy: 'manual',
            default_medallion_layer: 'Gold'
          }
        }
      ]
    },
    {
      projectName: 'Sample Data Vault Project',
      workspaces: [
        {
          name: 'Development',
          description: 'Data Vault development workspace',
          visibility: 'public',
          source_control_provider: 'gitlab',
          settings: {
            auto_sync_enabled: false,
            sync_interval_minutes: 15
          }
        }
      ]
    },
    {
      projectName: 'Sample Dimensional Project',
      workspaces: [
        {
          name: 'Development',
          description: 'Dimensional model development workspace',
          visibility: 'public',
          source_control_provider: 'bitbucket',
          settings: {
            auto_sync_enabled: false,
            sync_interval_minutes: 15
          }
        }
      ]
    }
  ];

  let workspaceCount = 0;

  for (const projectWorkspaces of workspaces) {
    const project = createdProjects.find(p => p.name === projectWorkspaces.projectName);

    if (!project) {
      log(`  ⚠ Project not found: ${projectWorkspaces.projectName}`, 'yellow');
      continue;
    }

    for (const workspace of projectWorkspaces.workspaces) {
      // Check if workspace already exists
      const { data: existing } = await supabase
        .from('workspaces')
        .select('id, name')
        .eq('account_id', accountId)
        .eq('project_id', project.id)
        .eq('name', workspace.name)
        .single();

      if (existing) {
        log(`  ⚠ Workspace already exists: ${projectWorkspaces.projectName} / ${workspace.name}`, 'yellow');
        workspaceCount++;
      } else {
        const { data: newWorkspace, error } = await supabase
          .from('workspaces')
          .insert({
            account_id: accountId,
            project_id: project.id,
            owner_id: user.id,
            ...workspace,
            source_control_connection_status: 'disconnected'
          })
          .select()
          .single();

        if (error) {
          log(`  ❌ Error creating workspace: ${error.message}`, 'red');
        } else {
          log(`  ✓ Created workspace: ${projectWorkspaces.projectName} / ${newWorkspace.name}`, 'green');
          workspaceCount++;
        }
      }
    }
  }

  log(`\n✓ Workspaces: ${workspaceCount} ready\n`, 'green');

  // =====================================================
  // Verify Data
  // =====================================================
  log('Step 3: Verifying seeded data...', 'cyan');
  log('─────────────────────────────────────', 'cyan');

  const { data: allProjects } = await supabase
    .from('projects')
    .select('id, name, project_type')
    .eq('account_id', accountId)
    .ilike('name', 'Sample%');

  log(`\n📊 Projects Created:`, 'magenta');
  allProjects?.forEach(p => {
    log(`   • ${p.name} (${p.project_type})`, 'cyan');
  });

  const { data: allWorkspaces } = await supabase
    .from('workspaces')
    .select('id, name, project_id, projects(name)')
    .eq('account_id', accountId)
    .in('project_id', allProjects?.map(p => p.id) || []);

  log(`\n📊 Workspaces Created:`, 'magenta');
  allWorkspaces?.forEach(w => {
    log(`   • ${w.projects?.name} / ${w.name}`, 'cyan');
  });

  // Check triggers worked
  const { data: projectUsers } = await supabase
    .from('project_users')
    .select('project_id, role')
    .in('project_id', allProjects?.map(p => p.id) || [])
    .eq('user_id', user.id);

  log(`\n📊 Project User Assignments (via trigger):`, 'magenta');
  log(`   • ${projectUsers?.length || 0} assignments created`, 'cyan');

  const { data: workspaceUsers } = await supabase
    .from('workspace_users')
    .select('workspace_id, role')
    .in('workspace_id', allWorkspaces?.map(w => w.id) || [])
    .eq('user_id', user.id);

  log(`\n📊 Workspace User Assignments (via trigger):`, 'magenta');
  log(`   • ${workspaceUsers?.length || 0} assignments created`, 'cyan');

  // Summary
  log('\n========================================', 'blue');
  log('✅ Seed Data Complete!', 'green');
  log('========================================', 'blue');
  log(`✓ ${allProjects?.length || 0} sample projects`, 'green');
  log(`✓ ${allWorkspaces?.length || 0} sample workspaces`, 'green');
  log(`✓ ${projectUsers?.length || 0} project user assignments`, 'green');
  log(`✓ ${workspaceUsers?.length || 0} workspace user assignments`, 'green');
  log('\nYou can now explore the app with sample data! 🎉\n', 'green');
}

// Run seeding
seedDatabase().catch(error => {
  log(`\n❌ Seeding failed with error: ${error.message}`, 'red');
  console.error(error);
});
