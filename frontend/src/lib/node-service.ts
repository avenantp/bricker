/**
 * Node service for CRUD operations
 * Handles node management with GitHub storage and Supabase UUID registry
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabase';
import { GitHubClient, parseGitHubRepo } from './github-api';
import type {
  Node,
  NodeItem,
  CreateNodePayload,
  UpdateNodePayload,
  CreateNodeItemPayload,
  UpdateNodeItemPayload,
  NodeState,
  NodeSyncStatus,
  NodeFilters,
  BatchNodeOperationResult,
  NodeConflict,
  ConflictResolutionStrategy,
  ConflictResolutionResult,
} from '../types/node';
import type { CanvasNode } from '../types/canvas';
import * as yaml from 'js-yaml';
import {
  detectNodeConflict as detectConflict,
  getNodeConflict,
  resolveConflict as resolveNodeConflict,
  attemptAutoMerge,
} from './conflict-resolution';

/**
 * Generate FQN from project, layer, and name
 */
function generateFQN(
  catalog: string,
  schema: string,
  tableName: string
): string {
  return `${catalog}.${schema}.${tableName}`;
}

/**
 * Generate GitHub path for node
 */
function generateNodePath(projectId: string, nodeUuid: string): string {
  return `metadata/nodes/${projectId}/${nodeUuid}.yml`;
}

/**
 * Convert Node to YAML format for GitHub storage
 */
function nodeToYAML(node: Node): string {
  return yaml.dump(node, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
  });
}

/**
 * Parse YAML to Node object
 */
function yamlToNode(yamlContent: string): Node {
  return yaml.load(yamlContent) as Node;
}

/**
 * Convert Node to CanvasNode for React Flow
 */
export function nodeToCanvasNode(
  node: Node,
  position: { x: number; y: number }
): CanvasNode {
  return {
    id: node.uuid,
    type: 'dataNode',
    position,
    data: {
      uuid: node.uuid,
      fqn: node.fqn,
      project_id: node.project_id,
      name: node.name,
      medallion_layer: node.medallion_layer,
      entity_type: node.entity_type,
      entity_subtype: node.entity_subtype,
      materialization_type: node.materialization_type,
      description: node.description,
      metadata: node.metadata,
      ai_confidence_score: node.ai_confidence_score,
      git_commit_hash: node.git_commit_hash,
      created_at: node.created_at,
      updated_at: node.updated_at,
    },
  };
}

/**
 * Create a new node in GitHub and register UUID in Supabase
 */
export async function createNode(
  payload: CreateNodePayload,
  githubToken: string,
  githubRepo: string
): Promise<Node> {
  // Generate UUID
  const uuid = uuidv4();
  const now = new Date().toISOString();

  // Get project configuration for FQN
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('configuration')
    .eq('id', payload.project_id)
    .single();

  if (projectError) {
    throw new Error(`Failed to fetch project: ${projectError.message}`);
  }

  const catalog = project?.configuration?.default_catalog || 'main';
  const schema = project?.configuration?.default_schema || payload.medallion_layer.toLowerCase();
  const fqn = generateFQN(catalog, schema, payload.name);

  // Create node object
  const node: Node = {
    uuid,
    fqn,
    project_id: payload.project_id,
    name: payload.name,
    medallion_layer: payload.medallion_layer,
    entity_type: payload.entity_type,
    entity_subtype: payload.entity_subtype || null,
    materialization_type: payload.materialization_type || null,
    description: payload.description,
    metadata: payload.metadata || {},
    node_items: [],
    created_at: now,
    updated_at: now,
  };

  // Save to GitHub
  const githubClient = new GitHubClient(githubToken);
  const { owner, repo } = parseGitHubRepo(githubRepo);
  const nodePath = generateNodePath(payload.project_id, uuid);
  const yamlContent = nodeToYAML(node);

  const commitSha = await githubClient.upsertFile(
    owner,
    repo,
    nodePath,
    yamlContent,
    `Create node: ${node.name}`
  );

  node.git_commit_hash = commitSha;

  // Register UUID in Supabase
  await registerNodeUUID(uuid, payload.project_id, fqn, nodePath, commitSha);

  return node;
}

/**
 * Read a node from GitHub
 */
export async function getNode(
  uuid: string,
  githubToken: string,
  githubRepo: string
): Promise<Node | null> {
  // Get node state from Supabase to find GitHub path
  const { data: nodeState, error } = await supabase
    .from('node_state')
    .select('*')
    .eq('uuid', uuid)
    .single();

  if (error || !nodeState) {
    return null;
  }

  // Load from GitHub
  const githubClient = new GitHubClient(githubToken);
  const { owner, repo } = parseGitHubRepo(githubRepo);

  try {
    const { content } = await githubClient.getFileContent(
      owner,
      repo,
      nodeState.github_path
    );

    return yamlToNode(content);
  } catch (error) {
    console.error('Failed to load node from GitHub:', error);
    return null;
  }
}

/**
 * Update a node in GitHub
 */
export async function updateNode(
  uuid: string,
  payload: UpdateNodePayload,
  githubToken: string,
  githubRepo: string,
  updatedNodeItems?: NodeItem[]
): Promise<Node> {
  // Load existing node
  const existingNode = await getNode(uuid, githubToken, githubRepo);
  if (!existingNode) {
    throw new Error('Node not found');
  }

  // Get current SHA from node_state
  const { data: nodeState, error: stateError } = await supabase
    .from('node_state')
    .select('github_sha, github_path')
    .eq('uuid', uuid)
    .single();

  if (stateError || !nodeState) {
    throw new Error('Node state not found');
  }

  // Update node object
  const updatedNode: Node = {
    ...existingNode,
    ...payload,
    updated_at: new Date().toISOString(),
  };

  // Update node_items if provided
  if (updatedNodeItems !== undefined) {
    updatedNode.node_items = updatedNodeItems;
  }

  // Regenerate FQN if name or layer changed
  if (payload.name || payload.medallion_layer) {
    const { data: project } = await supabase
      .from('projects')
      .select('configuration')
      .eq('id', existingNode.project_id)
      .single();

    const catalog = project?.configuration?.default_catalog || 'main';
    const schema = project?.configuration?.default_schema ||
      (payload.medallion_layer || existingNode.medallion_layer).toLowerCase();
    updatedNode.fqn = generateFQN(
      catalog,
      schema,
      payload.name || existingNode.name
    );
  }

  // Save to GitHub
  const githubClient = new GitHubClient(githubToken);
  const { owner, repo } = parseGitHubRepo(githubRepo);
  const yamlContent = nodeToYAML(updatedNode);

  const commitSha = await githubClient.upsertFile(
    owner,
    repo,
    nodeState.github_path,
    yamlContent,
    `Update node: ${updatedNode.name}`,
    'main',
    nodeState.github_sha
  );

  updatedNode.git_commit_hash = commitSha;

  // Update Supabase state
  await updateNodeState(uuid, {
    fqn: updatedNode.fqn,
    github_sha: commitSha,
    sync_status: 'synced',
    last_synced_at: new Date().toISOString(),
  });

  return updatedNode;
}

/**
 * Delete a node from GitHub and Supabase
 */
export async function deleteNode(
  uuid: string,
  githubToken: string,
  githubRepo: string
): Promise<void> {
  // Get node state
  const { data: nodeState, error } = await supabase
    .from('node_state')
    .select('*')
    .eq('uuid', uuid)
    .single();

  if (error || !nodeState) {
    throw new Error('Node not found');
  }

  // Delete from GitHub
  const githubClient = new GitHubClient(githubToken);
  const { owner, repo } = parseGitHubRepo(githubRepo);

  await githubClient.deleteFile(
    owner,
    repo,
    nodeState.github_path,
    `Delete node: ${nodeState.fqn}`,
    nodeState.github_sha
  );

  // Delete from Supabase (UUID registry and node_state)
  await supabase.from('uuid_registry').delete().eq('uuid', uuid);
  await supabase.from('node_state').delete().eq('uuid', uuid);
}

/**
 * Clone a node
 */
export async function cloneNode(
  sourceUuid: string,
  newName: string,
  githubToken: string,
  githubRepo: string,
  position?: { x: number; y: number }
): Promise<Node> {
  // Load source node
  const sourceNode = await getNode(sourceUuid, githubToken, githubRepo);
  if (!sourceNode) {
    throw new Error('Source node not found');
  }

  // Create new node with copied properties
  const newUuid = uuidv4();
  const now = new Date().toISOString();

  // Get project configuration for FQN
  const { data: project } = await supabase
    .from('projects')
    .select('configuration')
    .eq('id', sourceNode.project_id)
    .single();

  const catalog = project?.configuration?.default_catalog || 'main';
  const schema = project?.configuration?.default_schema ||
    sourceNode.medallion_layer.toLowerCase();

  const clonedNode: Node = {
    ...sourceNode,
    uuid: newUuid,
    name: newName,
    fqn: generateFQN(catalog, schema, newName),
    description: sourceNode.description
      ? `Copy of ${sourceNode.description}`
      : undefined,
    node_items: sourceNode.node_items.map((item) => ({
      ...item,
      uuid: uuidv4(), // Generate new UUIDs for items
      node_uuid: newUuid,
      fqn: `${generateFQN(catalog, schema, newName)}.${item.name}`,
      source_mappings: [], // Clear mappings for clone
      target_mappings: [],
      relationships: [],
      created_at: now,
      updated_at: now,
    })),
    created_at: now,
    updated_at: now,
    git_commit_hash: undefined,
  };

  // Save to GitHub
  const githubClient = new GitHubClient(githubToken);
  const { owner, repo } = parseGitHubRepo(githubRepo);
  const nodePath = generateNodePath(sourceNode.project_id, newUuid);
  const yamlContent = nodeToYAML(clonedNode);

  const commitSha = await githubClient.upsertFile(
    owner,
    repo,
    nodePath,
    yamlContent,
    `Clone node: ${newName} (from ${sourceNode.name})`
  );

  clonedNode.git_commit_hash = commitSha;

  // Register in Supabase
  await registerNodeUUID(newUuid, sourceNode.project_id, clonedNode.fqn, nodePath, commitSha);

  // Register cloned node items
  for (const item of clonedNode.node_items) {
    await registerNodeItemUUID(item.uuid, newUuid, item.fqn);
  }

  return clonedNode;
}

/**
 * Get all nodes for a project
 */
export async function getProjectNodes(
  projectId: string,
  githubToken: string,
  githubRepo: string,
  filters?: NodeFilters
): Promise<Node[]> {
  // Get all node UUIDs for project from Supabase
  let query = supabase
    .from('node_state')
    .select('*')
    .eq('project_id', projectId);

  const { data: nodeStates, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch node states: ${error.message}`);
  }

  if (!nodeStates || nodeStates.length === 0) {
    return [];
  }

  // Load nodes from GitHub
  const githubClient = new GitHubClient(githubToken);
  const { owner, repo } = parseGitHubRepo(githubRepo);

  const nodes: Node[] = [];
  for (const state of nodeStates) {
    try {
      const { content } = await githubClient.getFileContent(
        owner,
        repo,
        state.github_path
      );
      const node = yamlToNode(content);

      // Apply filters
      if (filters) {
        if (
          filters.medallion_layers &&
          filters.medallion_layers.length > 0 &&
          !filters.medallion_layers.includes(node.medallion_layer)
        ) {
          continue;
        }

        if (
          filters.entity_types &&
          filters.entity_types.length > 0 &&
          !filters.entity_types.includes(node.entity_type)
        ) {
          continue;
        }

        if (
          filters.entity_subtypes &&
          filters.entity_subtypes.length > 0 &&
          !filters.entity_subtypes.includes(node.entity_subtype)
        ) {
          continue;
        }

        if (
          filters.min_confidence_score !== undefined &&
          node.ai_confidence_score !== undefined &&
          node.ai_confidence_score < filters.min_confidence_score
        ) {
          continue;
        }

        if (filters.search_query) {
          const searchLower = filters.search_query.toLowerCase();
          const matchesSearch =
            node.name.toLowerCase().includes(searchLower) ||
            node.fqn.toLowerCase().includes(searchLower) ||
            node.description?.toLowerCase().includes(searchLower);

          if (!matchesSearch) {
            continue;
          }
        }
      }

      nodes.push(node);
    } catch (error) {
      console.error(`Failed to load node ${state.uuid}:`, error);
    }
  }

  return nodes;
}

/**
 * Add a NodeItem to a Node
 */
export async function addNodeItem(
  nodeUuid: string,
  payload: CreateNodeItemPayload,
  githubToken: string,
  githubRepo: string
): Promise<NodeItem> {
  // Load node
  const node = await getNode(nodeUuid, githubToken, githubRepo);
  if (!node) {
    throw new Error('Node not found');
  }

  // Create new NodeItem
  const itemUuid = uuidv4();
  const now = new Date().toISOString();

  const newItem: NodeItem = {
    uuid: itemUuid,
    fqn: `${node.fqn}.${payload.name}`,
    node_uuid: nodeUuid,
    name: payload.name,
    data_type: payload.data_type,
    description: payload.description,
    business_name: payload.business_name,
    is_primary_key: payload.is_primary_key || false,
    is_foreign_key: payload.is_foreign_key || false,
    is_nullable: payload.is_nullable !== false, // Default true
    default_value: payload.default_value,
    transformation_logic: payload.transformation_logic,
    source_mappings: [],
    target_mappings: [],
    relationships: [],
    created_at: now,
    updated_at: now,
  };

  // Add to node
  node.node_items.push(newItem);
  node.updated_at = now;

  // Save to GitHub
  const { data: nodeState } = await supabase
    .from('node_state')
    .select('github_sha, github_path')
    .eq('uuid', nodeUuid)
    .single();

  if (!nodeState) {
    throw new Error('Node state not found');
  }

  const githubClient = new GitHubClient(githubToken);
  const { owner, repo } = parseGitHubRepo(githubRepo);
  const yamlContent = nodeToYAML(node);

  const commitSha = await githubClient.upsertFile(
    owner,
    repo,
    nodeState.github_path,
    yamlContent,
    `Add column ${payload.name} to ${node.name}`,
    'main',
    nodeState.github_sha
  );

  // Update Supabase state
  await updateNodeState(nodeUuid, {
    github_sha: commitSha,
    sync_status: 'synced',
    last_synced_at: now,
  });

  // Register NodeItem UUID
  await registerNodeItemUUID(itemUuid, nodeUuid, newItem.fqn);

  return newItem;
}

/**
 * Register node UUID in Supabase
 */
async function registerNodeUUID(
  uuid: string,
  projectId: string,
  fqn: string,
  githubPath: string,
  githubSha: string
): Promise<void> {
  const now = new Date().toISOString();

  // Register in uuid_registry
  await supabase.from('uuid_registry').insert({
    uuid,
    project_id: projectId,
    fqn,
    entity_type: 'node',
    created_at: now,
  });

  // Register in node_state
  await supabase.from('node_state').insert({
    uuid,
    project_id: projectId,
    fqn,
    github_path: githubPath,
    github_sha: githubSha,
    sync_status: 'synced',
    last_synced_at: now,
  });
}

/**
 * Register NodeItem UUID in Supabase
 */
async function registerNodeItemUUID(
  uuid: string,
  nodeUuid: string,
  fqn: string
): Promise<void> {
  // Get project_id from node
  const { data: nodeState } = await supabase
    .from('node_state')
    .select('project_id')
    .eq('uuid', nodeUuid)
    .single();

  if (!nodeState) {
    throw new Error('Node state not found');
  }

  await supabase.from('uuid_registry').insert({
    uuid,
    project_id: nodeState.project_id,
    fqn,
    entity_type: 'nodeitem',
    created_at: new Date().toISOString(),
  });
}

/**
 * Update node state in Supabase
 */
async function updateNodeState(
  uuid: string,
  updates: Partial<NodeState>
): Promise<void> {
  const { error } = await supabase
    .from('node_state')
    .update(updates)
    .eq('uuid', uuid);

  if (error) {
    throw new Error(`Failed to update node state: ${error.message}`);
  }
}

/**
 * Get node sync status
 */
export async function getNodeSyncStatus(uuid: string): Promise<NodeSyncStatus> {
  const { data, error } = await supabase
    .from('node_state')
    .select('sync_status')
    .eq('uuid', uuid)
    .single();

  if (error || !data) {
    return 'error';
  }

  return data.sync_status as NodeSyncStatus;
}

/**
 * Search nodes by name or FQN
 */
export async function searchNodes(
  projectId: string,
  query: string,
  githubToken: string,
  githubRepo: string
): Promise<Node[]> {
  return getProjectNodes(projectId, githubToken, githubRepo, {
    search_query: query,
  });
}

/**
 * Batch delete nodes
 */
export async function batchDeleteNodes(
  uuids: string[],
  githubToken: string,
  githubRepo: string
): Promise<BatchNodeOperationResult> {
  const result: BatchNodeOperationResult = {
    successful: [],
    failed: [],
  };

  for (const uuid of uuids) {
    try {
      await deleteNode(uuid, githubToken, githubRepo);
      result.successful.push(uuid);
    } catch (error: any) {
      result.failed.push({
        uuid,
        error: error.message,
      });
    }
  }

  return result;
}

/**
 * Detect if there's a conflict for a node before updating
 */
export async function detectNodeConflict(
  uuid: string,
  githubToken: string,
  githubRepo: string
): Promise<boolean> {
  const { data: nodeState, error } = await supabase
    .from('node_state')
    .select('github_sha, github_path')
    .eq('uuid', uuid)
    .single();

  if (error || !nodeState) {
    return false;
  }

  return await detectConflict(
    uuid,
    nodeState.github_path,
    nodeState.github_sha,
    githubToken,
    githubRepo
  );
}

/**
 * Get detailed conflict information for a node
 */
export async function getNodeConflictDetails(
  uuid: string,
  githubToken: string,
  githubRepo: string
): Promise<NodeConflict | null> {
  const { data: nodeState, error } = await supabase
    .from('node_state')
    .select('github_sha, github_path')
    .eq('uuid', uuid)
    .single();

  if (error || !nodeState) {
    return null;
  }

  return await getNodeConflict(
    uuid,
    nodeState.github_path,
    nodeState.github_sha,
    githubToken,
    githubRepo
  );
}

/**
 * Update node with conflict detection and resolution
 * Throws ConflictError if conflict detected and no resolution strategy provided
 */
export async function updateNodeWithConflictCheck(
  uuid: string,
  payload: UpdateNodePayload,
  githubToken: string,
  githubRepo: string,
  conflictStrategy?: ConflictResolutionStrategy
): Promise<{ node: Node; hadConflict: boolean; resolution?: ConflictResolutionResult }> {
  // Check for conflict
  const hasConflict = await detectNodeConflict(uuid, githubToken, githubRepo);

  if (!hasConflict) {
    // No conflict, proceed with normal update
    const node = await updateNode(uuid, payload, githubToken, githubRepo);
    return { node, hadConflict: false };
  }

  // Conflict detected
  if (!conflictStrategy) {
    // Mark as conflict in Supabase
    await updateNodeState(uuid, {
      sync_status: 'conflict',
      error_message: 'Concurrent edit detected. Please resolve conflict before saving.',
    });
    throw new ConflictError('Node has been modified by another user. Please resolve conflict.');
  }

  // Get conflict details
  const conflict = await getNodeConflictDetails(uuid, githubToken, githubRepo);
  if (!conflict) {
    throw new Error('Failed to get conflict details');
  }

  // Attempt automatic merge if strategy is not provided
  if (conflictStrategy === 'manual' && conflict.base_version) {
    const autoMerge = attemptAutoMerge(
      conflict.base_version.node,
      conflict.our_version.node,
      conflict.their_version.node
    );

    if (autoMerge.success && autoMerge.mergedNode) {
      // Auto-merge successful, apply payload on top
      const mergedWithPayload = {
        ...autoMerge.mergedNode,
        ...payload,
      };

      const resolution = await resolveNodeConflict(conflict, 'manual', mergedWithPayload);

      if (resolution.merged_node) {
        // Save resolved node
        const savedNode = await saveResolvedNode(
          uuid,
          resolution.merged_node,
          githubToken,
          githubRepo
        );
        return { node: savedNode, hadConflict: true, resolution };
      }
    }
  }

  // Resolve using specified strategy
  let resolution: ConflictResolutionResult;

  if (conflictStrategy === 'ours') {
    // Keep our changes (apply payload to our version)
    const ourVersion = { ...conflict.our_version.node, ...payload };
    resolution = await resolveNodeConflict(conflict, 'ours', ourVersion);
  } else if (conflictStrategy === 'theirs') {
    // Accept their version but apply our payload on top
    const theirVersion = { ...conflict.their_version.node, ...payload };
    resolution = await resolveNodeConflict(conflict, 'theirs', theirVersion);
  } else {
    resolution = await resolveNodeConflict(conflict, conflictStrategy);
  }

  if (!resolution.merged_node) {
    throw new Error('Conflict resolution failed');
  }

  // Save resolved node
  const savedNode = await saveResolvedNode(uuid, resolution.merged_node, githubToken, githubRepo);

  return { node: savedNode, hadConflict: true, resolution };
}

/**
 * Save resolved node after conflict resolution
 */
async function saveResolvedNode(
  uuid: string,
  node: Node,
  githubToken: string,
  githubRepo: string
): Promise<Node> {
  const { data: nodeState, error } = await supabase
    .from('node_state')
    .select('github_path')
    .eq('uuid', uuid)
    .single();

  if (error || !nodeState) {
    throw new Error('Node state not found');
  }

  // Save to GitHub (fetch latest SHA first to avoid another conflict)
  const githubClient = new GitHubClient(githubToken);
  const { owner, repo } = parseGitHubRepo(githubRepo);

  const { sha: latestSha } = await githubClient.getFileContent(
    owner,
    repo,
    nodeState.github_path
  );

  const yamlContent = nodeToYAML(node);

  const commitSha = await githubClient.upsertFile(
    owner,
    repo,
    nodeState.github_path,
    yamlContent,
    `Resolve conflict: ${node.name}`,
    'main',
    latestSha
  );

  node.git_commit_hash = commitSha;

  // Update Supabase state
  await updateNodeState(uuid, {
    fqn: node.fqn,
    github_sha: commitSha,
    sync_status: 'synced',
    last_synced_at: new Date().toISOString(),
    error_message: null,
  });

  return node;
}

/**
 * Custom error for conflicts
 */
export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

// Re-export conflict resolution utilities
export { getNodeConflict, resolveNodeConflict, attemptAutoMerge };
