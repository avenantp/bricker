/**
 * Source Control Sync service for synchronizing datasets with source control systems
 * Handles commits, pull, push, and conflict resolution
 * Supports multiple providers: GitHub, GitLab, Bitbucket, Azure DevOps, etc.
 * Based on technical specifications in docs/prp/001-technical-specifications-refactored.md
 */

import { supabase } from './supabase';
import type {
  Dataset,
  DatasetConflict,
  ConflictResolutionStrategy,
  ConflictResolutionResult,
  UncommittedChangeSummary,
  SourceControlCommit,
} from '../types/dataset';

/**
 * Commit changes for a dataset to source control
 */
export async function commitDataset(
  datasetId: string,
  commitMessage: string,
  workspaceId: string
): Promise<SourceControlCommit> {
  const response = await fetch(`/api/source-control-sync/${workspaceId}/commit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dataset_id: datasetId,
      message: commitMessage,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to commit dataset');
  }

  return await response.json();
}

/**
 * Commit multiple datasets to source control
 */
export async function commitMultipleDatasets(
  datasetIds: string[],
  commitMessage: string,
  workspaceId: string
): Promise<{
  success: boolean;
  results: Array<{ dataset_id: string; success: boolean; error?: string }>;
  summary: { total: number; succeeded: number; failed: number };
}> {
  const response = await fetch(`/api/source-control-sync/${workspaceId}/commit-multiple`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dataset_ids: datasetIds,
      message: commitMessage,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to commit datasets');
  }

  return await response.json();
}

/**
 * Pull changes from source control for a workspace
 */
export async function pullFromSourceControl(
  workspaceId: string
): Promise<{
  success: boolean;
  updates: Array<{ dataset_id: string; action: 'created' | 'updated' }>;
  conflicts: Array<{
    dataset_id: string;
    dataset_name: string;
    local_sha: string;
    remote_sha: string;
  }>;
}> {
  const response = await fetch(`/api/source-control-sync/${workspaceId}/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: (await supabase.auth.getUser()).data.user?.id,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to pull from source control');
  }

  return await response.json();
}

/**
 * Push changes to source control (commits all uncommitted datasets)
 */
export async function pushToSourceControl(
  workspaceId: string
): Promise<{
  success: boolean;
  results: Array<{ dataset_id: string; success: boolean }>;
}> {
  const response = await fetch(`/api/source-control-sync/${workspaceId}/push`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: (await supabase.auth.getUser()).data.user?.id,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to push to source control');
  }

  return await response.json();
}

/**
 * Get uncommitted changes summary for a workspace
 */
export async function getUncommittedChanges(
  workspaceId: string
): Promise<UncommittedChangeSummary[]> {
  const response = await fetch(`/api/source-control-sync/${workspaceId}/uncommitted`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get uncommitted changes');
  }

  const data = await response.json();
  return data.uncommitted_changes || [];
}

/**
 * Get commit history for a dataset
 */
export async function getCommitHistory(
  workspaceId: string,
  datasetId: string
): Promise<SourceControlCommit[]> {
  const response = await fetch(
    `/api/source-control-sync/${workspaceId}/history/${datasetId}`
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to get commit history');
  }

  const data = await response.json();
  return data.commits || [];
}

/**
 * Resolve a dataset conflict
 * Note: This is a client-side helper. The actual resolution happens via commit
 */
export async function resolveConflict(
  conflict: DatasetConflict,
  strategy: ConflictResolutionStrategy
): Promise<ConflictResolutionResult> {
  let resolvedDataset: Dataset;

  switch (strategy) {
    case 'ours':
      // Keep our changes - just commit current version
      resolvedDataset = conflict.our_version.dataset;
      break;

    case 'theirs':
      // Accept their changes - update local with remote version
      resolvedDataset = conflict.their_version.dataset;
      await supabase
        .from('datasets')
        .update(resolvedDataset)
        .eq('id', conflict.dataset_id);
      break;

    case 'manual':
      // Manual merge would require UI intervention
      throw new Error('Manual merge requires user interaction');

    default:
      throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
  }

  return {
    resolved: true,
    merged_dataset: resolvedDataset,
    strategy_used: strategy,
    conflicts_resolved: conflict.conflict_fields.length,
    conflicts_remaining: 0,
  };
}
