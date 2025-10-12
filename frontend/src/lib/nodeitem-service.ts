/**
 * NodeItem Service
 * Manages CRUD operations for NodeItems within Nodes
 * Phase 2.5 - NodeItem Management
 */

import type {
  NodeItem,
  CreateNodeItemPayload,
  UpdateNodeItemPayload,
} from '../types/node';
import { getNode, updateNode, addNodeItem } from './node-service';

/**
 * Create a new NodeItem within a Node
 * Re-exports the existing addNodeItem function from node-service
 */
export const createNodeItem = addNodeItem;

/**
 * Update an existing NodeItem
 */
export async function updateNodeItem(
  nodeUuid: string,
  nodeItemUuid: string,
  updates: UpdateNodeItemPayload,
  githubToken: string,
  githubRepo: string
): Promise<NodeItem> {
  // Get the parent node
  const node = await getNode(nodeUuid, githubToken, githubRepo);

  if (!node) {
    throw new Error(`Node with UUID ${nodeUuid} not found`);
  }

  // Find the NodeItem
  const itemIndex = node.node_items.findIndex((item) => item.uuid === nodeItemUuid);

  if (itemIndex === -1) {
    throw new Error(`NodeItem with UUID ${nodeItemUuid} not found`);
  }

  const existingItem = node.node_items[itemIndex];

  // Check for duplicate names if name is being updated
  if (updates.name && updates.name !== existingItem.name) {
    const existingNames = node.node_items
      .filter((item) => item.uuid !== nodeItemUuid)
      .map((item) => item.name.toLowerCase());

    if (existingNames.includes(updates.name.toLowerCase())) {
      throw new Error(`A NodeItem with the name "${updates.name}" already exists in this node`);
    }
  }

  // Update the NodeItem
  const updatedItem: NodeItem = {
    ...existingItem,
    ...updates,
    updated_at: new Date().toISOString(),
  };

  // Update FQN if name changed
  if (updates.name) {
    updatedItem.fqn = `${node.fqn}.${updates.name}`;
  }

  // Replace in array
  const updatedNodeItems = [...node.node_items];
  updatedNodeItems[itemIndex] = updatedItem;

  // Update the node in GitHub
  await updateNode(
    nodeUuid,
    { metadata: { ...node.metadata } }, // Trigger update
    githubToken,
    githubRepo,
    updatedNodeItems
  );

  return updatedItem;
}

/**
 * Delete a NodeItem
 */
export async function deleteNodeItem(
  nodeUuid: string,
  nodeItemUuid: string,
  githubToken: string,
  githubRepo: string
): Promise<void> {
  // Get the parent node
  const node = await getNode(nodeUuid, githubToken, githubRepo);

  if (!node) {
    throw new Error(`Node with UUID ${nodeUuid} not found`);
  }

  // Check if NodeItem exists
  const itemExists = node.node_items.some((item) => item.uuid === nodeItemUuid);

  if (!itemExists) {
    throw new Error(`NodeItem with UUID ${nodeItemUuid} not found`);
  }

  // Remove from array
  const updatedNodeItems = node.node_items.filter((item) => item.uuid !== nodeItemUuid);

  // Update the node in GitHub
  await updateNode(
    nodeUuid,
    { metadata: { ...node.metadata } }, // Trigger update
    githubToken,
    githubRepo,
    updatedNodeItems
  );
}

/**
 * Delete multiple NodeItems
 */
export async function deleteMultipleNodeItems(
  nodeUuid: string,
  nodeItemUuids: string[],
  githubToken: string,
  githubRepo: string
): Promise<void> {
  // Get the parent node
  const node = await getNode(nodeUuid, githubToken, githubRepo);

  if (!node) {
    throw new Error(`Node with UUID ${nodeUuid} not found`);
  }

  // Remove all specified items
  const updatedNodeItems = node.node_items.filter(
    (item) => !nodeItemUuids.includes(item.uuid)
  );

  // Update the node in GitHub
  await updateNode(
    nodeUuid,
    { metadata: { ...node.metadata } }, // Trigger update
    githubToken,
    githubRepo,
    updatedNodeItems
  );
}

/**
 * Get a specific NodeItem
 */
export async function getNodeItem(
  nodeUuid: string,
  nodeItemUuid: string,
  githubToken: string,
  githubRepo: string
): Promise<NodeItem | null> {
  // Get the parent node
  const node = await getNode(nodeUuid, githubToken, githubRepo);

  if (!node) {
    return null;
  }

  // Find the NodeItem
  const item = node.node_items.find((item) => item.uuid === nodeItemUuid);

  return item || null;
}

/**
 * Reorder NodeItems within a Node
 * @param nodeUuid - UUID of the parent node
 * @param orderedUuids - Array of NodeItem UUIDs in the desired order
 */
export async function reorderNodeItems(
  nodeUuid: string,
  orderedUuids: string[],
  githubToken: string,
  githubRepo: string
): Promise<void> {
  // Get the parent node
  const node = await getNode(nodeUuid, githubToken, githubRepo);

  if (!node) {
    throw new Error(`Node with UUID ${nodeUuid} not found`);
  }

  // Create a map for quick lookup
  const itemMap = new Map(node.node_items.map((item) => [item.uuid, item]));

  // Reorder based on provided UUIDs
  const reorderedItems: NodeItem[] = [];

  for (const uuid of orderedUuids) {
    const item = itemMap.get(uuid);
    if (item) {
      reorderedItems.push(item);
      itemMap.delete(uuid);
    }
  }

  // Add any remaining items that weren't in the ordered list
  itemMap.forEach((item) => {
    reorderedItems.push(item);
  });

  // Update the node in GitHub
  await updateNode(
    nodeUuid,
    { metadata: { ...node.metadata } }, // Trigger update
    githubToken,
    githubRepo,
    reorderedItems
  );
}

/**
 * Bulk update NodeItems
 * Useful for updating data types or nullable flags across multiple items
 */
export async function bulkUpdateNodeItems(
  nodeUuid: string,
  updates: Array<{ uuid: string; updates: UpdateNodeItemPayload }>,
  githubToken: string,
  githubRepo: string
): Promise<void> {
  // Get the parent node
  const node = await getNode(nodeUuid, githubToken, githubRepo);

  if (!node) {
    throw new Error(`Node with UUID ${nodeUuid} not found`);
  }

  // Create updated items array
  const updatedNodeItems = node.node_items.map((item) => {
    const update = updates.find((u) => u.uuid === item.uuid);

    if (update) {
      const updatedItem = {
        ...item,
        ...update.updates,
        updated_at: new Date().toISOString(),
      };

      // Update FQN if name changed
      if (update.updates.name) {
        updatedItem.fqn = `${node.fqn}.${update.updates.name}`;
      }

      return updatedItem;
    }

    return item;
  });

  // Update the node in GitHub
  await updateNode(
    nodeUuid,
    { metadata: { ...node.metadata } }, // Trigger update
    githubToken,
    githubRepo,
    updatedNodeItems
  );
}
