/**
 * Source Control Sync API Routes
 * Handles source control synchronization operations: commit, pull, push, conflict resolution
 * Supports multiple source control systems: GitHub, GitLab, Bitbucket, Azure DevOps, etc.
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { GitHubClient } from '../github/github-client.js';
import yaml from 'js-yaml';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * Helper to get source control client for a workspace
 * Currently supports GitHub, can be extended for other providers
 */
async function getSourceControlClientForWorkspace(workspaceId: string) {
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('source_control_provider, source_control_repo, source_control_branch, settings')
    .eq('id', workspaceId)
    .single();

  if (error || !workspace || !workspace.source_control_repo) {
    throw new Error('Source control not configured for this workspace');
  }

  const provider = workspace.source_control_provider || 'github';

  // GitHub implementation
  if (provider === 'github') {
    const [owner, repo] = workspace.source_control_repo.split('/');
    if (!owner || !repo) {
      throw new Error('Invalid repository format');
    }

    const token = workspace.settings?.source_control_token || process.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('Source control token not found');
    }

    return new GitHubClient({
      token,
      owner,
      repo,
      branch: workspace.source_control_branch || 'main',
    });
  }

  // Add other providers here (GitLab, Bitbucket, etc.)
  throw new Error(`Source control provider "${provider}" not yet supported`);
}

/**
 * Generate YAML from dataset
 */
function generateDatasetYAML(dataset: any, columns: any[], lineage: any[]) {
  return {
    id: dataset.id,
    name: dataset.name,
    type: dataset.dataset_type,
    description: dataset.description,
    catalog: dataset.catalog_name,
    schema: dataset.schema_name,
    table: dataset.table_name,
    columns: columns.map((col) => ({
      id: col.id,
      name: col.name,
      data_type: col.data_type,
      is_primary_key: col.is_primary_key,
      is_nullable: col.is_nullable,
      description: col.description,
      reference: col.reference_column_id
        ? {
            column_id: col.reference_column_id,
            type: col.reference_type,
            description: col.reference_description,
          }
        : null,
    })),
    lineage: lineage.map((lin) => ({
      id: lin.id,
      source_dataset_id: lin.source_dataset_id,
      target_dataset_id: lin.target_dataset_id,
      transformation_type: lin.transformation_type,
      transformation_logic: lin.transformation_logic,
    })),
    metadata: {
      created_at: dataset.created_at,
      updated_at: dataset.updated_at,
    },
  };
}

/**
 * Get uncommitted changes summary
 * GET /api/source-control-sync/:workspace_id/uncommitted
 */
router.get('/:workspace_id/uncommitted', async (req, res) => {
  try {
    const { workspace_id } = req.params;

    // Get all uncommitted datasets with change counts
    const { data: datasets, error } = await supabase
      .from('datasets')
      .select('id, name, updated_at')
      .eq('workspace_id', workspace_id)
      .eq('has_uncommitted_changes', true);

    if (error) throw error;

    // Get change counts for each dataset
    const summary = await Promise.all(
      datasets.map(async (dataset) => {
        const { count: changeCount } = await supabase
          .from('metadata_changes')
          .select('*', { count: 'exact', head: true })
          .eq('dataset_id', dataset.id)
          .is('committed_at', null);

        // Get entity types with changes
        const { data: changes } = await supabase
          .from('metadata_changes')
          .select('entity_type')
          .eq('dataset_id', dataset.id)
          .is('committed_at', null);

        const entityTypes = Array.from(
          new Set(changes?.map((c) => c.entity_type) || [])
        );

        return {
          dataset_id: dataset.id,
          dataset_name: dataset.name,
          change_count: changeCount || 0,
          entity_types: entityTypes,
          last_changed_at: dataset.updated_at,
        };
      })
    );

    res.json({ uncommitted_changes: summary });
  } catch (error: any) {
    console.error('[Source Control Sync] Get uncommitted error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Commit single dataset to source control
 * POST /api/source-control-sync/:workspace_id/commit
 */
router.post('/:workspace_id/commit', async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { dataset_id, message, user_id } = req.body;

    if (!dataset_id || !message || !user_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sourceControl = await getSourceControlClientForWorkspace(workspace_id);

    // Get dataset with columns and lineage
    const { data: dataset, error: datasetError } = await supabase
      .from('datasets')
      .select(
        `
        *,
        columns (*),
        lineage (*)
      `
      )
      .eq('id', dataset_id)
      .single();

    if (datasetError) throw datasetError;

    // Generate YAML
    const yamlData = generateDatasetYAML(
      dataset,
      dataset.columns || [],
      dataset.lineage || []
    );
    const yamlContent = yaml.dump(yamlData);

    // Commit to source control
    const filePath = `metadata/datasets/${dataset.name.toLowerCase().replace(/\s+/g, '_')}.yaml`;
    const commitResult = await sourceControl.commitFile(filePath, yamlContent, message);

    // Create commit record
    const { data: commit } = await supabase
      .from('source_control_commits')
      .insert({
        dataset_id,
        workspace_id,
        commit_sha: commitResult.sha,
        commit_message: message,
        commit_author: user_id,
        committed_at: new Date().toISOString(),
        file_path: filePath,
      })
      .select()
      .single();

    // Mark changes as committed
    await supabase
      .from('metadata_changes')
      .update({ committed_at: new Date().toISOString(), commit_id: commit.id })
      .eq('dataset_id', dataset_id)
      .is('committed_at', null);

    // Update dataset sync status
    await supabase
      .from('datasets')
      .update({
        has_uncommitted_changes: false,
        sync_status: 'synced',
        source_control_commit_sha: commitResult.sha,
        source_control_file_path: filePath,
        last_synced_at: new Date().toISOString(),
        sync_error_message: null,
      })
      .eq('id', dataset_id);

    res.json({
      success: true,
      commit_sha: commitResult.sha,
      commit_id: commit.id,
      message: `Dataset "${dataset.name}" committed to source control`,
    });
  } catch (error: any) {
    console.error('[Source Control Sync] Commit error:', error);

    // Mark dataset with sync error
    if (req.body.dataset_id) {
      await supabase
        .from('datasets')
        .update({
          sync_status: 'error',
          sync_error_message: error.message,
        })
        .eq('id', req.body.dataset_id);
    }

    res.status(500).json({ error: error.message });
  }
});

/**
 * Commit multiple datasets
 * POST /api/source-control-sync/:workspace_id/commit-multiple
 */
router.post('/:workspace_id/commit-multiple', async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { dataset_ids, message, user_id } = req.body;

    if (!dataset_ids || !Array.isArray(dataset_ids) || !message || !user_id) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const sourceControl = await getSourceControlClientForWorkspace(workspace_id);
    const results = [];

    // Commit each dataset
    for (const dataset_id of dataset_ids) {
      try {
        // Get dataset with columns and lineage
        const { data: dataset, error: datasetError } = await supabase
          .from('datasets')
          .select(
            `
            *,
            columns (*),
            lineage (*)
          `
          )
          .eq('id', dataset_id)
          .single();

        if (datasetError) throw datasetError;

        // Generate YAML
        const yamlData = generateDatasetYAML(
          dataset,
          dataset.columns || [],
          dataset.lineage || []
        );
        const yamlContent = yaml.dump(yamlData);

        // Commit to source control
        const filePath = `metadata/datasets/${dataset.name.toLowerCase().replace(/\s+/g, '_')}.yaml`;
        const commitResult = await sourceControl.commitFile(
          filePath,
          yamlContent,
          `${message} (${dataset.name})`
        );

        // Create commit record
        const { data: commit } = await supabase
          .from('source_control_commits')
          .insert({
            dataset_id,
            workspace_id,
            commit_sha: commitResult.sha,
            commit_message: message,
            commit_author: user_id,
            committed_at: new Date().toISOString(),
            file_path: filePath,
          })
          .select()
          .single();

        // Mark changes as committed
        await supabase
          .from('metadata_changes')
          .update({ committed_at: new Date().toISOString(), commit_id: commit.id })
          .eq('dataset_id', dataset_id)
          .is('committed_at', null);

        // Update dataset sync status
        await supabase
          .from('datasets')
          .update({
            has_uncommitted_changes: false,
            sync_status: 'synced',
            source_control_commit_sha: commitResult.sha,
            source_control_file_path: filePath,
            last_synced_at: new Date().toISOString(),
            sync_error_message: null,
          })
          .eq('id', dataset_id);

        results.push({
          dataset_id,
          dataset_name: dataset.name,
          success: true,
          commit_sha: commitResult.sha,
        });
      } catch (error: any) {
        console.error(`[Source Control Sync] Error committing dataset ${dataset_id}:`, error);
        results.push({
          dataset_id,
          success: false,
          error: error.message,
        });

        // Mark dataset with sync error
        await supabase
          .from('datasets')
          .update({
            sync_status: 'error',
            sync_error_message: error.message,
          })
          .eq('id', dataset_id);
      }
    }

    const successCount = results.filter((r) => r.success).length;

    res.json({
      success: successCount > 0,
      results,
      summary: {
        total: dataset_ids.length,
        succeeded: successCount,
        failed: dataset_ids.length - successCount,
      },
      message: `${successCount} of ${dataset_ids.length} datasets committed to source control`,
    });
  } catch (error: any) {
    console.error('[Source Control Sync] Commit multiple error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Pull changes from source control
 * POST /api/source-control-sync/:workspace_id/pull
 */
router.post('/:workspace_id/pull', async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    const sourceControl = await getSourceControlClientForWorkspace(workspace_id);

    // Get all YAML files from source control
    const files = await sourceControl.listFiles('metadata/datasets');
    const updates = [];
    const conflicts = [];

    for (const file of files) {
      try {
        // Get file content
        const content = await sourceControl.getFileContent(file.path);
        const yamlData = yaml.load(content) as any;

        // Check if dataset exists locally
        const { data: existingDataset } = await supabase
          .from('datasets')
          .select('*, source_control_commit_sha')
          .eq('id', yamlData.id)
          .single();

        if (existingDataset) {
          // Check for conflicts
          if (
            existingDataset.has_uncommitted_changes &&
            existingDataset.source_control_commit_sha !== file.sha
          ) {
            conflicts.push({
              dataset_id: yamlData.id,
              dataset_name: yamlData.name,
              local_sha: existingDataset.source_control_commit_sha,
              remote_sha: file.sha,
            });
            continue;
          }

          // Update existing dataset
          await supabase
            .from('datasets')
            .update({
              name: yamlData.name,
              dataset_type: yamlData.type,
              description: yamlData.description,
              catalog_name: yamlData.catalog,
              schema_name: yamlData.schema,
              table_name: yamlData.table,
              source_control_commit_sha: file.sha,
              source_control_file_path: file.path,
              last_synced_at: new Date().toISOString(),
              sync_status: 'synced',
            })
            .eq('id', yamlData.id);

          updates.push({ dataset_id: yamlData.id, action: 'updated' });
        } else {
          // Create new dataset from source control
          const { data: newDataset } = await supabase
            .from('datasets')
            .insert({
              id: yamlData.id,
              workspace_id,
              name: yamlData.name,
              dataset_type: yamlData.type,
              description: yamlData.description,
              catalog_name: yamlData.catalog,
              schema_name: yamlData.schema,
              table_name: yamlData.table,
              source_control_commit_sha: file.sha,
              source_control_file_path: file.path,
              last_synced_at: new Date().toISOString(),
              sync_status: 'synced',
              has_uncommitted_changes: false,
            })
            .select()
            .single();

          updates.push({ dataset_id: newDataset.id, action: 'created' });
        }
      } catch (error: any) {
        console.error(`[Source Control Sync] Error processing file ${file.path}:`, error);
      }
    }

    res.json({
      success: true,
      updates,
      conflicts,
      message: `Pulled ${updates.length} datasets from source control${conflicts.length > 0 ? `, ${conflicts.length} conflicts detected` : ''}`,
    });
  } catch (error: any) {
    console.error('[Source Control Sync] Pull error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Push changes to source control
 * POST /api/source-control-sync/:workspace_id/push
 */
router.post('/:workspace_id/push', async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID required' });
    }

    // Get all uncommitted datasets
    const { data: datasets, error } = await supabase
      .from('datasets')
      .select('id')
      .eq('workspace_id', workspace_id)
      .eq('has_uncommitted_changes', true);

    if (error) throw error;

    if (!datasets || datasets.length === 0) {
      return res.json({
        success: true,
        message: 'No uncommitted changes to push',
        pushed_count: 0,
      });
    }

    // Commit all uncommitted datasets
    const dataset_ids = datasets.map((d) => d.id);
    const commitResult = await router.stack
      .find((layer: any) => layer.route?.path === '/:workspace_id/commit-multiple')
      ?.handle(
        {
          ...req,
          body: { dataset_ids, message: 'Bulk push to source control', user_id },
        },
        res,
        () => {}
      );

    // Response is handled by commit-multiple endpoint
  } catch (error: any) {
    console.error('[Source Control Sync] Push error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get commit history for a dataset
 * GET /api/source-control-sync/:workspace_id/history/:dataset_id
 */
router.get('/:workspace_id/history/:dataset_id', async (req, res) => {
  try {
    const { dataset_id } = req.params;

    const { data: commits, error } = await supabase
      .from('source_control_commits')
      .select('*')
      .eq('dataset_id', dataset_id)
      .order('committed_at', { ascending: false});

    if (error) throw error;

    res.json({ commits: commits || [] });
  } catch (error: any) {
    console.error('[Source Control Sync] Get history error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
