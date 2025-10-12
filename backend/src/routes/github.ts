import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { GitHubClient } from '../github/github-client.js';
import { YAMLStorageService } from '../github/yaml-storage.js';
import type { DataModelYAML } from '../github/yaml-storage.js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * Helper to get GitHub client for a workspace
 */
async function getGitHubClientForWorkspace(workspaceId: string): Promise<{ client: GitHubClient; storage: YAMLStorageService } | null> {
  // Get workspace GitHub settings
  const { data: workspace, error } = await supabase
    .from('workspaces')
    .select('github_repo, github_branch, settings')
    .eq('id', workspaceId)
    .single();

  if (error || !workspace || !workspace.github_repo) {
    return null;
  }

  // Parse repo (format: "owner/repo")
  const [owner, repo] = workspace.github_repo.split('/');
  if (!owner || !repo) {
    return null;
  }

  // Get GitHub token from settings (encrypted in production)
  const githubToken = workspace.settings?.github_token || process.env.GITHUB_TOKEN;
  if (!githubToken) {
    return null;
  }

  const client = new GitHubClient({
    token: githubToken,
    owner,
    repo,
    branch: workspace.github_branch || 'main',
  });

  const storage = new YAMLStorageService(client);

  return { client, storage };
}

/**
 * Test GitHub connection for a workspace
 */
router.post('/connect', async (req, res) => {
  try {
    const { workspace_id, github_repo, github_token, branch } = req.body;

    if (!workspace_id || !github_repo || !github_token) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Parse repo
    const [owner, repo] = github_repo.split('/');
    if (!owner || !repo) {
      return res.status(400).json({ error: 'Invalid repository format. Use "owner/repo"' });
    }

    // Test connection
    const client = new GitHubClient({
      token: github_token,
      owner,
      repo,
      branch: branch || 'main',
    });

    const isValid = await client.validateConnection();
    if (!isValid) {
      return res.status(401).json({ error: 'Failed to connect to GitHub repository' });
    }

    // Get repo info
    const repoInfo = await client.getRepoInfo();

    // Initialize repository structure (create directories if needed)
    try {
      await client.initializeRepositoryStructure();
    } catch (initError) {
      console.warn('[GitHub] Failed to initialize repository structure:', initError);
      // Don't fail the connection if initialization fails
    }

    // Update workspace with GitHub settings
    const { error } = await supabase
      .from('workspaces')
      .update({
        github_repo,
        github_branch: branch || 'main',
        settings: {
          github_token, // In production, encrypt this
        },
      })
      .eq('id', workspace_id);

    if (error) {
      return res.status(500).json({ error: 'Failed to save GitHub settings' });
    }

    res.json({
      success: true,
      repository: repoInfo,
    });
  } catch (error: any) {
    console.error('[GitHub] Connection error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get GitHub connection status for a workspace
 */
router.get('/status/:workspace_id', async (req, res) => {
  try {
    const { workspace_id } = req.params;

    const github = await getGitHubClientForWorkspace(workspace_id);

    if (!github) {
      return res.json({
        connected: false,
      });
    }

    const isValid = await github.client.validateConnection();
    const repoInfo = isValid ? await github.client.getRepoInfo() : null;

    res.json({
      connected: isValid,
      repository: repoInfo,
    });
  } catch (error: any) {
    console.error('[GitHub] Status check error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Export data model to GitHub
 */
router.post('/models/export', async (req, res) => {
  try {
    const { workspace_id, model } = req.body as { workspace_id: string; model: DataModelYAML };

    if (!workspace_id || !model) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const github = await getGitHubClientForWorkspace(workspace_id);
    if (!github) {
      return res.status(400).json({ error: 'GitHub not configured for this workspace' });
    }

    // Save model to GitHub
    const commitSha = await github.storage.saveDataModel(model);

    res.json({
      success: true,
      commit_sha: commitSha,
      message: `Model "${model.name}" exported to GitHub`,
    });
  } catch (error: any) {
    console.error('[GitHub] Model export error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Import data model from GitHub
 */
router.get('/models/import/:workspace_id/:model_id', async (req, res) => {
  try {
    const { workspace_id, model_id } = req.params;

    const github = await getGitHubClientForWorkspace(workspace_id);
    if (!github) {
      return res.status(400).json({ error: 'GitHub not configured for this workspace' });
    }

    const model = await github.storage.loadDataModel(model_id);

    if (!model) {
      return res.status(404).json({ error: 'Model not found in GitHub' });
    }

    res.json(model);
  } catch (error: any) {
    console.error('[GitHub] Model import error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * List all models in GitHub
 */
router.get('/models/list/:workspace_id', async (req, res) => {
  try {
    const { workspace_id } = req.params;

    const github = await getGitHubClientForWorkspace(workspace_id);
    if (!github) {
      return res.status(400).json({ error: 'GitHub not configured for this workspace' });
    }

    const models = await github.storage.listDataModels();

    res.json({ models });
  } catch (error: any) {
    console.error('[GitHub] List models error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete model from GitHub
 */
router.delete('/models/:workspace_id/:model_id', async (req, res) => {
  try {
    const { workspace_id, model_id } = req.params;

    const github = await getGitHubClientForWorkspace(workspace_id);
    if (!github) {
      return res.status(400).json({ error: 'GitHub not configured for this workspace' });
    }

    await github.storage.deleteDataModel(model_id);

    res.json({
      success: true,
      message: `Model "${model_id}" deleted from GitHub`,
    });
  } catch (error: any) {
    console.error('[GitHub] Delete model error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Export template to GitHub
 */
router.post('/templates/export', async (req, res) => {
  try {
    const { workspace_id, template } = req.body;

    if (!workspace_id || !template) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const github = await getGitHubClientForWorkspace(workspace_id);
    if (!github) {
      return res.status(400).json({ error: 'GitHub not configured for this workspace' });
    }

    const commitSha = await github.storage.saveTemplate(template);

    res.json({
      success: true,
      commit_sha: commitSha,
      message: `Template "${template.name}" exported to GitHub`,
    });
  } catch (error: any) {
    console.error('[GitHub] Template export error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * List templates in GitHub
 */
router.get('/templates/list/:workspace_id', async (req, res) => {
  try {
    const { workspace_id } = req.params;
    const { category } = req.query;

    const github = await getGitHubClientForWorkspace(workspace_id);
    if (!github) {
      return res.status(400).json({ error: 'GitHub not configured for this workspace' });
    }

    const templates = await github.storage.listTemplates(category as string);

    res.json({ templates });
  } catch (error: any) {
    console.error('[GitHub] List templates error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get repository branches
 */
router.get('/branches/:workspace_id', async (req, res) => {
  try {
    const { workspace_id } = req.params;

    const github = await getGitHubClientForWorkspace(workspace_id);
    if (!github) {
      return res.status(400).json({ error: 'GitHub not configured for this workspace' });
    }

    const branches = await github.client.listBranches();

    res.json({ branches });
  } catch (error: any) {
    console.error('[GitHub] List branches error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create a new branch
 */
router.post('/branches/create', async (req, res) => {
  try {
    const { workspace_id, branch_name, from_branch } = req.body;

    if (!workspace_id || !branch_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const github = await getGitHubClientForWorkspace(workspace_id);
    if (!github) {
      return res.status(400).json({ error: 'GitHub not configured for this workspace' });
    }

    await github.client.createBranch(branch_name, from_branch);

    res.json({
      success: true,
      message: `Branch "${branch_name}" created`,
    });
  } catch (error: any) {
    console.error('[GitHub] Create branch error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
