-- =====================================================
-- Sample Data Seeds for Development
-- Seed: 001_sample_projects_workspaces
-- =====================================================

-- NOTE: This seed script is designed for DEVELOPMENT ONLY
-- DO NOT run in production

-- =====================================================
-- CLEANUP (Optional - Comment out if you want to preserve data)
-- =====================================================

-- Uncomment to clean up existing test data before seeding
-- DELETE FROM workspace_users WHERE workspace_id IN (SELECT id FROM workspaces WHERE name LIKE 'Sample%' OR name LIKE 'Dev%' OR name LIKE 'Staging%' OR name LIKE 'Production%');
-- DELETE FROM project_users WHERE project_id IN (SELECT id FROM projects WHERE name LIKE 'Sample%');
-- DELETE FROM workspaces WHERE name LIKE 'Sample%' OR name LIKE 'Dev%' OR name LIKE 'Staging%' OR name LIKE 'Production%';
-- DELETE FROM projects WHERE name LIKE 'Sample%';

-- =====================================================
-- HELPER: Get or Create Sample Account
-- =====================================================

-- This assumes you have at least one account in your system
-- Replace with actual account_id or use a function to get it

DO $$
DECLARE
  v_account_id UUID;
  v_user_id UUID;
  v_project_standard_id UUID;
  v_project_datavault_id UUID;
  v_project_dimensional_id UUID;
  v_workspace_dev_id UUID;
  v_workspace_staging_id UUID;
  v_workspace_prod_id UUID;
BEGIN
  -- Get the first available account (for development)
  SELECT id INTO v_account_id FROM accounts LIMIT 1;

  IF v_account_id IS NULL THEN
    RAISE NOTICE 'No accounts found. Please create an account first.';
    RETURN;
  END IF;

  -- Get the owner of this account
  SELECT user_id INTO v_user_id
  FROM account_users
  WHERE account_id = v_account_id AND role = 'owner'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'No account owner found. Cannot create sample data.';
    RETURN;
  END IF;

  RAISE NOTICE 'Using account: % with owner: %', v_account_id, v_user_id;

  -- =====================================================
  -- SAMPLE PROJECTS
  -- =====================================================

  -- Project 1: Standard Project
  INSERT INTO projects (
    account_id,
    name,
    description,
    project_type,
    visibility,
    owner_id,
    configuration
  ) VALUES (
    v_account_id,
    'Sample Standard Project',
    'A standard project for general data modeling and management',
    'Standard',
    'public',
    v_user_id,
    '{
      "medallion_layers_enabled": true,
      "default_catalog": "main",
      "default_schema": "default",
      "naming_conventions": {
        "case_style": "snake_case",
        "prefix_enabled": false,
        "suffix_enabled": false
      },
      "quality_rules": {
        "require_descriptions": true,
        "require_business_names": false,
        "min_confidence_score": 70
      }
    }'::jsonb
  )
  ON CONFLICT (account_id, name)
  DO UPDATE SET
    description = EXCLUDED.description,
    updated_at = NOW()
  RETURNING id INTO v_project_standard_id;

  RAISE NOTICE 'Created/Updated Standard Project: %', v_project_standard_id;

  -- Project 2: Data Vault Project
  INSERT INTO projects (
    account_id,
    name,
    description,
    project_type,
    visibility,
    owner_id,
    configuration
  ) VALUES (
    v_account_id,
    'Sample Data Vault Project',
    'Enterprise data warehouse using Data Vault 2.0 methodology',
    'DataVault',
    'public',
    v_user_id,
    '{
      "medallion_layers_enabled": true,
      "default_catalog": "analytics",
      "default_schema": "raw_vault",
      "data_vault_preferences": {
        "hub_naming_pattern": "HUB_{entity_name}",
        "satellite_naming_pattern": "SAT_{hub}_{descriptor}",
        "link_naming_pattern": "LNK_{entity1}_{entity2}",
        "hash_algorithm": "SHA-256",
        "include_load_date": true,
        "include_record_source": true,
        "multi_active_satellites": true,
        "business_vault_enabled": true
      },
      "naming_conventions": {
        "case_style": "snake_case",
        "prefix_enabled": true,
        "suffix_enabled": false
      },
      "quality_rules": {
        "require_descriptions": true,
        "require_business_names": true,
        "min_confidence_score": 85
      }
    }'::jsonb
  )
  ON CONFLICT (account_id, name)
  DO UPDATE SET
    description = EXCLUDED.description,
    updated_at = NOW()
  RETURNING id INTO v_project_datavault_id;

  RAISE NOTICE 'Created/Updated Data Vault Project: %', v_project_datavault_id;

  -- Project 3: Dimensional Project
  INSERT INTO projects (
    account_id,
    name,
    description,
    project_type,
    visibility,
    owner_id,
    configuration
  ) VALUES (
    v_account_id,
    'Sample Dimensional Project',
    'Star schema dimensional model for business intelligence',
    'Dimensional',
    'public',
    v_user_id,
    '{
      "medallion_layers_enabled": false,
      "default_catalog": "analytics",
      "default_schema": "reporting",
      "dimensional_preferences": {
        "dimension_naming_pattern": "DIM_{entity_name}",
        "fact_naming_pattern": "FCT_{entity_name}",
        "surrogate_key_strategy": "hash",
        "default_scd_type": 2,
        "conformed_dimensions": true
      },
      "naming_conventions": {
        "case_style": "snake_case",
        "prefix_enabled": true,
        "suffix_enabled": false
      },
      "quality_rules": {
        "require_descriptions": true,
        "require_business_names": true,
        "min_confidence_score": 80
      }
    }'::jsonb
  )
  ON CONFLICT (account_id, name)
  DO UPDATE SET
    description = EXCLUDED.description,
    updated_at = NOW()
  RETURNING id INTO v_project_dimensional_id;

  RAISE NOTICE 'Created/Updated Dimensional Project: %', v_project_dimensional_id;

  -- =====================================================
  -- SAMPLE WORKSPACES
  -- =====================================================

  -- Workspace 1: Development (Standard Project)
  INSERT INTO workspaces (
    account_id,
    project_id,
    name,
    description,
    visibility,
    owner_id,
    source_control_provider,
    source_control_connection_status,
    settings
  ) VALUES (
    v_account_id,
    v_project_standard_id,
    'Development',
    'Development environment for testing and experimentation',
    'public',
    v_user_id,
    'github',
    'disconnected',
    '{
      "auto_sync_enabled": false,
      "sync_interval_minutes": 15,
      "conflict_resolution_strategy": "manual",
      "default_medallion_layer": "Bronze",
      "canvas_settings": {
        "grid_enabled": true,
        "grid_size": 15,
        "snap_to_grid": true,
        "show_minimap": true,
        "default_zoom": 1.0
      }
    }'::jsonb
  )
  ON CONFLICT (account_id, project_id, name)
  DO UPDATE SET
    description = EXCLUDED.description,
    updated_at = NOW()
  RETURNING id INTO v_workspace_dev_id;

  RAISE NOTICE 'Created/Updated Development Workspace: %', v_workspace_dev_id;

  -- Workspace 2: Staging (Standard Project)
  INSERT INTO workspaces (
    account_id,
    project_id,
    name,
    description,
    visibility,
    owner_id,
    source_control_provider,
    source_control_connection_status,
    settings
  ) VALUES (
    v_account_id,
    v_project_standard_id,
    'Staging',
    'Pre-production environment for final testing',
    'public',
    v_user_id,
    'github',
    'disconnected',
    '{
      "auto_sync_enabled": true,
      "sync_interval_minutes": 30,
      "conflict_resolution_strategy": "manual",
      "default_medallion_layer": "Silver",
      "canvas_settings": {
        "grid_enabled": true,
        "grid_size": 15,
        "snap_to_grid": true,
        "show_minimap": false,
        "default_zoom": 0.8
      }
    }'::jsonb
  )
  ON CONFLICT (account_id, project_id, name)
  DO UPDATE SET
    description = EXCLUDED.description,
    updated_at = NOW()
  RETURNING id INTO v_workspace_staging_id;

  RAISE NOTICE 'Created/Updated Staging Workspace: %', v_workspace_staging_id;

  -- Workspace 3: Production (Standard Project)
  INSERT INTO workspaces (
    account_id,
    project_id,
    name,
    description,
    visibility,
    owner_id,
    source_control_provider,
    source_control_connection_status,
    is_locked,
    settings
  ) VALUES (
    v_account_id,
    v_project_standard_id,
    'Production',
    'Production environment - handle with care',
    'locked',
    v_user_id,
    'github',
    'disconnected',
    true,
    '{
      "auto_sync_enabled": true,
      "sync_interval_minutes": 60,
      "conflict_resolution_strategy": "manual",
      "default_medallion_layer": "Gold",
      "canvas_settings": {
        "grid_enabled": true,
        "grid_size": 20,
        "snap_to_grid": true,
        "show_minimap": false,
        "default_zoom": 0.75
      }
    }'::jsonb
  )
  ON CONFLICT (account_id, project_id, name)
  DO UPDATE SET
    description = EXCLUDED.description,
    updated_at = NOW()
  RETURNING id INTO v_workspace_prod_id;

  RAISE NOTICE 'Created/Updated Production Workspace: %', v_workspace_prod_id;

  -- Workspace 4: Development (Data Vault Project)
  INSERT INTO workspaces (
    account_id,
    project_id,
    name,
    description,
    visibility,
    owner_id,
    source_control_provider,
    source_control_connection_status,
    settings
  ) VALUES (
    v_account_id,
    v_project_datavault_id,
    'Development',
    'Data Vault development workspace',
    'public',
    v_user_id,
    'gitlab',
    'disconnected',
    '{
      "auto_sync_enabled": false,
      "sync_interval_minutes": 15,
      "conflict_resolution_strategy": "manual",
      "canvas_settings": {
        "grid_enabled": true,
        "grid_size": 15,
        "snap_to_grid": true,
        "show_minimap": true,
        "default_zoom": 1.0
      }
    }'::jsonb
  )
  ON CONFLICT (account_id, project_id, name)
  DO UPDATE SET
    description = EXCLUDED.description,
    updated_at = NOW();

  -- Workspace 5: Development (Dimensional Project)
  INSERT INTO workspaces (
    account_id,
    project_id,
    name,
    description,
    visibility,
    owner_id,
    source_control_provider,
    source_control_connection_status,
    settings
  ) VALUES (
    v_account_id,
    v_project_dimensional_id,
    'Development',
    'Dimensional model development workspace',
    'public',
    v_user_id,
    'bitbucket',
    'disconnected',
    '{
      "auto_sync_enabled": false,
      "sync_interval_minutes": 15,
      "conflict_resolution_strategy": "manual",
      "canvas_settings": {
        "grid_enabled": true,
        "grid_size": 15,
        "snap_to_grid": true,
        "show_minimap": true,
        "default_zoom": 1.0
      }
    }'::jsonb
  )
  ON CONFLICT (account_id, project_id, name)
  DO UPDATE SET
    description = EXCLUDED.description,
    updated_at = NOW();

  RAISE NOTICE 'Sample data seeding completed successfully!';
  RAISE NOTICE 'Projects created: 3';
  RAISE NOTICE 'Workspaces created: 5';
  RAISE NOTICE 'Note: User assignments were created automatically via triggers';

END $$;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify projects
SELECT
  id,
  name,
  project_type,
  visibility,
  created_at
FROM projects
WHERE name LIKE 'Sample%'
ORDER BY name;

-- Verify workspaces
SELECT
  w.id,
  p.name AS project_name,
  w.name AS workspace_name,
  w.visibility,
  w.source_control_provider,
  w.created_at
FROM workspaces w
INNER JOIN projects p ON p.id = w.project_id
WHERE p.name LIKE 'Sample%'
ORDER BY p.name, w.name;

-- Verify project_users (owners should be auto-added)
SELECT
  p.name AS project_name,
  pu.role,
  COUNT(*) AS user_count
FROM project_users pu
INNER JOIN projects p ON p.id = pu.project_id
WHERE p.name LIKE 'Sample%'
GROUP BY p.name, pu.role
ORDER BY p.name, pu.role;

-- Verify workspace_users (owners should be auto-added)
SELECT
  p.name AS project_name,
  w.name AS workspace_name,
  wu.role,
  COUNT(*) AS user_count
FROM workspace_users wu
INNER JOIN workspaces w ON w.id = wu.workspace_id
INNER JOIN projects p ON p.id = w.project_id
WHERE p.name LIKE 'Sample%'
GROUP BY p.name, w.name, wu.role
ORDER BY p.name, w.name, wu.role;

-- =====================================================
-- END OF SEED SCRIPT
-- =====================================================
