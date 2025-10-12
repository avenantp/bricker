/**
 * Conflict Resolution Service
 * Handles detection and resolution of concurrent edit conflicts for nodes
 */

import { GitHubClient, parseGitHubRepo } from './github-api';
import * as yaml from 'js-yaml';
import type {
  Node,
  NodeConflict,
  NodeVersion,
  ConflictResolutionStrategy,
  ConflictResolutionResult,
} from '../types/node';

/**
 * Parse YAML to Node object
 */
function yamlToNode(yamlContent: string): Node {
  return yaml.load(yamlContent) as Node;
}

/**
 * Convert Node to YAML format
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
 * Detect if a conflict exists for a node
 */
export async function detectNodeConflict(
  nodeUuid: string,
  githubPath: string,
  expectedSha: string,
  githubToken: string,
  githubRepo: string
): Promise<boolean> {
  const githubClient = new GitHubClient(githubToken);
  const { owner, repo } = parseGitHubRepo(githubRepo);

  return await githubClient.detectConflict(owner, repo, githubPath, expectedSha);
}

/**
 * Get node conflict details with version comparison
 */
export async function getNodeConflict(
  nodeUuid: string,
  githubPath: string,
  ourCommitSha: string, // The SHA we started from
  githubToken: string,
  githubRepo: string
): Promise<NodeConflict | null> {
  const githubClient = new GitHubClient(githubToken);
  const { owner, repo } = parseGitHubRepo(githubRepo);

  try {
    // Get current version from GitHub (their version)
    const { content: theirContent, sha: theirSha } = await githubClient.getFileContent(
      owner,
      repo,
      githubPath
    );
    const theirNode = yamlToNode(theirContent);
    const theirCommitInfo = await githubClient.getCommitInfo(owner, repo, theirSha);

    // Get our version from the commit we started from
    const { content: ourContent } = await githubClient.getFileContentAtCommit(
      owner,
      repo,
      githubPath,
      ourCommitSha
    );
    const ourNode = yamlToNode(ourContent);
    const ourCommitInfo = await githubClient.getCommitInfo(owner, repo, ourCommitSha);

    // If they're the same, no conflict
    if (theirSha === ourCommitSha) {
      return null;
    }

    // Find common ancestor for three-way merge
    const baseCommitSha = await githubClient.findCommonAncestor(
      owner,
      repo,
      ourCommitSha,
      theirSha
    );

    let baseVersion: NodeVersion | undefined;
    if (baseCommitSha) {
      try {
        const { content: baseContent } = await githubClient.getFileContentAtCommit(
          owner,
          repo,
          githubPath,
          baseCommitSha
        );
        const baseNode = yamlToNode(baseContent);
        const baseCommitInfo = await githubClient.getCommitInfo(owner, repo, baseCommitSha);

        baseVersion = {
          node: baseNode,
          commit_sha: baseCommitSha,
          commit_message: baseCommitInfo.message,
          commit_author: baseCommitInfo.author,
          commit_timestamp: baseCommitInfo.timestamp,
        };
      } catch (error) {
        console.warn('Failed to load base version:', error);
      }
    }

    // Identify conflicting fields
    const conflictFields = identifyConflictFields(ourNode, theirNode);

    return {
      uuid: nodeUuid,
      fqn: theirNode.fqn,
      our_version: {
        node: ourNode,
        commit_sha: ourCommitSha,
        commit_message: ourCommitInfo.message,
        commit_author: ourCommitInfo.author,
        commit_timestamp: ourCommitInfo.timestamp,
      },
      their_version: {
        node: theirNode,
        commit_sha: theirSha,
        commit_message: theirCommitInfo.message,
        commit_author: theirCommitInfo.author,
        commit_timestamp: theirCommitInfo.timestamp,
      },
      base_version: baseVersion,
      conflict_fields: conflictFields,
    };
  } catch (error: any) {
    console.error('Failed to get node conflict:', error);
    return null;
  }
}

/**
 * Identify fields that differ between two node versions
 */
function identifyConflictFields(node1: Node, node2: Node): string[] {
  const fields: string[] = [];

  // Compare basic fields
  if (node1.name !== node2.name) fields.push('name');
  if (node1.fqn !== node2.fqn) fields.push('fqn');
  if (node1.medallion_layer !== node2.medallion_layer) fields.push('medallion_layer');
  if (node1.entity_type !== node2.entity_type) fields.push('entity_type');
  if (node1.entity_subtype !== node2.entity_subtype) fields.push('entity_subtype');
  if (node1.materialization_type !== node2.materialization_type)
    fields.push('materialization_type');
  if (node1.description !== node2.description) fields.push('description');

  // Compare metadata (deep comparison)
  if (JSON.stringify(node1.metadata) !== JSON.stringify(node2.metadata)) {
    fields.push('metadata');
  }

  // Compare node items
  if (node1.node_items.length !== node2.node_items.length) {
    fields.push('node_items');
  } else {
    const items1 = node1.node_items.map((i) => i.uuid).sort();
    const items2 = node2.node_items.map((i) => i.uuid).sort();
    if (JSON.stringify(items1) !== JSON.stringify(items2)) {
      fields.push('node_items');
    } else {
      // Check if any item was modified
      for (let i = 0; i < node1.node_items.length; i++) {
        const item1 = node1.node_items.find((item) => item.uuid === items1[i]);
        const item2 = node2.node_items.find((item) => item.uuid === items2[i]);
        if (item1 && item2 && JSON.stringify(item1) !== JSON.stringify(item2)) {
          fields.push('node_items');
          break;
        }
      }
    }
  }

  if (node1.ai_confidence_score !== node2.ai_confidence_score) {
    fields.push('ai_confidence_score');
  }

  return fields;
}

/**
 * Resolve conflict using specified strategy
 */
export async function resolveConflict(
  conflict: NodeConflict,
  strategy: ConflictResolutionStrategy,
  manualMergedNode?: Node
): Promise<ConflictResolutionResult> {
  let mergedNode: Node;
  let conflictsResolved = 0;
  let conflictsRemaining = 0;

  switch (strategy) {
    case 'ours':
      // Keep our version, discard their changes
      mergedNode = {
        ...conflict.our_version.node,
        updated_at: new Date().toISOString(),
      };
      conflictsResolved = conflict.conflict_fields.length;
      break;

    case 'theirs':
      // Accept their version, discard our changes
      mergedNode = {
        ...conflict.their_version.node,
        updated_at: new Date().toISOString(),
      };
      conflictsResolved = conflict.conflict_fields.length;
      break;

    case 'manual':
      // User provided manually merged version
      if (!manualMergedNode) {
        throw new Error('Manual merge requires merged node to be provided');
      }
      mergedNode = {
        ...manualMergedNode,
        updated_at: new Date().toISOString(),
      };
      conflictsResolved = conflict.conflict_fields.length;
      break;

    default:
      throw new Error(`Unknown conflict resolution strategy: ${strategy}`);
  }

  return {
    resolved: true,
    merged_node: mergedNode,
    strategy_used: strategy,
    conflicts_resolved: conflictsResolved,
    conflicts_remaining: conflictsRemaining,
  };
}

/**
 * Automatic three-way merge (when base version is available)
 * Tries to automatically merge non-conflicting changes
 */
export function attemptAutoMerge(
  baseNode: Node,
  ourNode: Node,
  theirNode: Node
): { success: boolean; mergedNode?: Node; conflicts: string[] } {
  const conflicts: string[] = [];
  const merged = { ...baseNode };

  // Compare each field and try to merge
  const fields: (keyof Node)[] = [
    'name',
    'fqn',
    'medallion_layer',
    'entity_type',
    'entity_subtype',
    'materialization_type',
    'description',
    'ai_confidence_score',
  ];

  for (const field of fields) {
    const baseValue = baseNode[field];
    const ourValue = ourNode[field];
    const theirValue = theirNode[field];

    if (ourValue !== theirValue) {
      // Both changed the field
      if (ourValue !== baseValue && theirValue !== baseValue) {
        conflicts.push(field);
      } else if (ourValue !== baseValue) {
        // Only we changed it, use our value
        (merged as any)[field] = ourValue;
      } else {
        // Only they changed it, use their value
        (merged as any)[field] = theirValue;
      }
    } else {
      // Both have same value (or both unchanged)
      (merged as any)[field] = ourValue;
    }
  }

  // Handle metadata separately (more complex)
  if (
    JSON.stringify(ourNode.metadata) !== JSON.stringify(theirNode.metadata)
  ) {
    if (
      JSON.stringify(ourNode.metadata) !== JSON.stringify(baseNode.metadata) &&
      JSON.stringify(theirNode.metadata) !== JSON.stringify(baseNode.metadata)
    ) {
      // Both modified metadata - try to merge keys
      const mergedMetadata = { ...baseNode.metadata };
      let hasConflict = false;

      const allKeys = new Set([
        ...Object.keys(ourNode.metadata || {}),
        ...Object.keys(theirNode.metadata || {}),
      ]);

      for (const key of allKeys) {
        const baseValue = (baseNode.metadata as any)?.[key];
        const ourValue = (ourNode.metadata as any)?.[key];
        const theirValue = (theirNode.metadata as any)?.[key];

        if (ourValue !== theirValue) {
          if (ourValue !== baseValue && theirValue !== baseValue) {
            hasConflict = true;
            // Take their value for now
            (mergedMetadata as any)[key] = theirValue;
          } else if (ourValue !== baseValue) {
            (mergedMetadata as any)[key] = ourValue;
          } else {
            (mergedMetadata as any)[key] = theirValue;
          }
        } else {
          (mergedMetadata as any)[key] = ourValue;
        }
      }

      if (hasConflict) {
        conflicts.push('metadata');
      }
      merged.metadata = mergedMetadata;
    } else if (JSON.stringify(ourNode.metadata) !== JSON.stringify(baseNode.metadata)) {
      merged.metadata = ourNode.metadata;
    } else {
      merged.metadata = theirNode.metadata;
    }
  }

  // Handle node_items (simplified - merge by UUID)
  const mergedItems = new Map<string, any>();
  const baseItems = new Map(baseNode.node_items.map((item) => [item.uuid, item]));
  const ourItems = new Map(ourNode.node_items.map((item) => [item.uuid, item]));
  const theirItems = new Map(theirNode.node_items.map((item) => [item.uuid, item]));

  // Get all item UUIDs
  const allItemUuids = new Set([
    ...baseItems.keys(),
    ...ourItems.keys(),
    ...theirItems.keys(),
  ]);

  for (const uuid of allItemUuids) {
    const baseItem = baseItems.get(uuid);
    const ourItem = ourItems.get(uuid);
    const theirItem = theirItems.get(uuid);

    if (!baseItem) {
      // Item was added
      if (ourItem && theirItem) {
        // Both added same UUID (unlikely but check)
        if (JSON.stringify(ourItem) === JSON.stringify(theirItem)) {
          mergedItems.set(uuid, ourItem);
        } else {
          conflicts.push(`node_items.${uuid}`);
          mergedItems.set(uuid, theirItem); // Prefer theirs
        }
      } else if (ourItem) {
        mergedItems.set(uuid, ourItem);
      } else if (theirItem) {
        mergedItems.set(uuid, theirItem);
      }
    } else {
      // Item existed in base
      if (!ourItem && !theirItem) {
        // Both deleted - OK
        continue;
      } else if (!ourItem) {
        // We deleted, they kept/modified
        conflicts.push(`node_items.${uuid}.deleted_by_us`);
        mergedItems.set(uuid, theirItem!);
      } else if (!theirItem) {
        // They deleted, we kept/modified
        conflicts.push(`node_items.${uuid}.deleted_by_them`);
        mergedItems.set(uuid, ourItem);
      } else {
        // Both modified
        if (JSON.stringify(ourItem) === JSON.stringify(theirItem)) {
          mergedItems.set(uuid, ourItem);
        } else {
          conflicts.push(`node_items.${uuid}.modified_by_both`);
          mergedItems.set(uuid, theirItem); // Prefer theirs
        }
      }
    }
  }

  merged.node_items = Array.from(mergedItems.values());
  merged.updated_at = new Date().toISOString();

  return {
    success: conflicts.length === 0,
    mergedNode: conflicts.length === 0 ? (merged as Node) : undefined,
    conflicts,
  };
}
