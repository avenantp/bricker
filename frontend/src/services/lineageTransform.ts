/**
 * Lineage Transform Service
 * Transforms lineage data from database format to React Flow diagram format
 * Based on specification: docs/prp/051-dataset-diagram-view-specification.md (Section 5.3)
 */

import type { DiagramNode, DiagramEdge, LineageEdgeData } from '../types/diagram';
import type { LineageWithDetails, DatasetLineageSummary } from '../types/lineage';

// =====================================================
// Lineage Graph Types
// =====================================================

export interface LineageGraph {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  focusedDatasetId: string | null;
}

/**
 * Dataset position in lineage graph
 */
export interface LineagePosition {
  datasetId: string;
  layer: number; // 0 = upstream, 1 = center, 2 = downstream
  position: number; // Position within layer
}

// =====================================================
// Transform Functions
// =====================================================

/**
 * Transform dataset lineage summary into React Flow diagram format
 * @param datasetId - The focused dataset ID
 * @param lineageSummary - Lineage summary from API
 * @param allNodes - All diagram nodes in workspace
 * @param workspaceLineages - All lineage relationships in workspace
 */
export function transformDatasetLineageToDiagram(
  datasetId: string,
  lineageSummary: DatasetLineageSummary,
  allNodes: DiagramNode[],
  workspaceLineages: LineageWithDetails[]
): LineageGraph {
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const processedDatasets = new Set<string>();

  // Helper to find node by dataset ID
  const findNode = (id: string): DiagramNode | undefined => {
    return allNodes.find((n) => n.data.dataset_id === id);
  };

  // Helper to enhance node with lineage highlighting
  const enhanceNodeForLineage = (node: DiagramNode, layer: number): DiagramNode => {
    return {
      ...node,
      position: { x: 0, y: 0 }, // Will be repositioned by layout algorithm
      data: {
        ...node.data,
        isHighlighted: node.data.dataset_id === datasetId,
        highlightType:
          node.data.dataset_id === datasetId
            ? 'selected'
            : layer === 0
            ? 'upstream'
            : layer === 2
            ? 'downstream'
            : undefined,
      },
    };
  };

  // Process focused dataset (center layer)
  const focusedNode = findNode(datasetId);
  if (focusedNode) {
    nodes.push(enhanceNodeForLineage(focusedNode, 1));
    processedDatasets.add(datasetId);
  }

  // Process upstream datasets (layer 0)
  lineageSummary.upstream_datasets.forEach((upstreamSummary) => {
    if (processedDatasets.has(upstreamSummary.dataset_id)) return;

    const node = findNode(upstreamSummary.dataset_id);
    if (node) {
      nodes.push(enhanceNodeForLineage(node, 0));
      processedDatasets.add(upstreamSummary.dataset_id);
    }
  });

  // Process downstream datasets (layer 2)
  lineageSummary.downstream_datasets.forEach((downstreamSummary) => {
    if (processedDatasets.has(downstreamSummary.dataset_id)) return;

    const node = findNode(downstreamSummary.dataset_id);
    if (node) {
      nodes.push(enhanceNodeForLineage(node, 2));
      processedDatasets.add(downstreamSummary.dataset_id);
    }
  });

  // Create edges from lineage relationships
  // Filter lineages to only include those between processed datasets
  const relevantLineages = workspaceLineages.filter(
    (lineage) =>
      processedDatasets.has(lineage.upstream_dataset_id) &&
      processedDatasets.has(lineage.downstream_dataset_id)
  );

  relevantLineages.forEach((lineage) => {
    const edgeId = `lineage-${lineage.lineage_id}`;

    const edgeData: LineageEdgeData = {
      mapping_type: lineage.mapping_type,
      transformation_expression: lineage.transformation_expression,
      source_column_id: lineage.upstream_column_id,
      target_column_id: lineage.downstream_column_id,
    };

    const edge: DiagramEdge = {
      id: edgeId,
      source: lineage.upstream_dataset_id,
      target: lineage.downstream_dataset_id,
      type: 'lineage',
      data: edgeData,
      animated: true, // Animate lineage edges for data flow visualization
    };

    edges.push(edge);
  });

  return {
    nodes,
    edges,
    focusedDatasetId: datasetId,
  };
}

/**
 * Transform workspace-wide lineage into full lineage graph
 * Shows all datasets and their lineage relationships
 */
export function transformWorkspaceLineageToDiagram(
  allNodes: DiagramNode[],
  workspaceLineages: LineageWithDetails[]
): LineageGraph {
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];
  const datasetIds = new Set<string>();

  // Collect all dataset IDs involved in lineage
  workspaceLineages.forEach((lineage) => {
    datasetIds.add(lineage.upstream_dataset_id);
    datasetIds.add(lineage.downstream_dataset_id);
  });

  // Filter nodes to only those with lineage and reset positions
  allNodes.forEach((node) => {
    if (!datasetIds.has(node.data.dataset_id)) return;

    nodes.push({
      ...node,
      position: { x: 0, y: 0 }, // Will be repositioned by layout algorithm
      data: {
        ...node.data,
        isHighlighted: false,
        highlightType: undefined,
      },
    });
  });

  // Create edges from lineage relationships
  workspaceLineages.forEach((lineage) => {
    const edgeId = `lineage-${lineage.lineage_id}`;

    const edgeData: LineageEdgeData = {
      mapping_type: lineage.mapping_type,
      transformation_expression: lineage.transformation_expression,
      source_column_id: lineage.upstream_column_id,
      target_column_id: lineage.downstream_column_id,
    };

    const edge: DiagramEdge = {
      id: edgeId,
      source: lineage.upstream_dataset_id,
      target: lineage.downstream_dataset_id,
      type: 'lineage',
      data: edgeData,
      animated: true,
    };

    edges.push(edge);
  });

  return {
    nodes,
    edges,
    focusedDatasetId: null,
  };
}

/**
 * Calculate lineage counts for each dataset
 * Updates node data with upstream/downstream lineage counts
 */
export function calculateLineageCounts(
  nodes: DiagramNode[],
  edges: DiagramEdge[]
): DiagramNode[] {
  const upstreamCounts = new Map<string, number>();
  const downstreamCounts = new Map<string, number>();

  // Count unique upstream/downstream datasets for each dataset
  edges.forEach((edge) => {
    // Count downstream
    const currentDown = downstreamCounts.get(edge.source) || 0;
    downstreamCounts.set(edge.source, currentDown + 1);

    // Count upstream
    const currentUp = upstreamCounts.get(edge.target) || 0;
    upstreamCounts.set(edge.target, currentUp + 1);
  });

  // Update nodes with counts
  return nodes.map((node) => ({
    ...node,
    data: {
      ...node.data,
      lineageCount: {
        upstream: upstreamCounts.get(node.id) || 0,
        downstream: downstreamCounts.get(node.id) || 0,
      },
    },
  }));
}

/**
 * Get unique datasets involved in lineage
 */
export function getLineageDatasetIds(lineages: LineageWithDetails[]): Set<string> {
  const datasetIds = new Set<string>();

  lineages.forEach((lineage) => {
    datasetIds.add(lineage.upstream_dataset_id);
    datasetIds.add(lineage.downstream_dataset_id);
  });

  return datasetIds;
}

/**
 * Group lineages by dataset pair (for multi-column lineages)
 */
export function groupLineagesByDatasetPair(
  lineages: LineageWithDetails[]
): Map<string, LineageWithDetails[]> {
  const grouped = new Map<string, LineageWithDetails[]>();

  lineages.forEach((lineage) => {
    const key = `${lineage.upstream_dataset_id}->${lineage.downstream_dataset_id}`;
    const existing = grouped.get(key) || [];
    existing.push(lineage);
    grouped.set(key, existing);
  });

  return grouped;
}
