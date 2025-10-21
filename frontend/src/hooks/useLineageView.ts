/**
 * useLineageView Hook
 * Manages lineage view state, data fetching, and transformation
 * Based on specification: docs/prp/051-dataset-diagram-view-specification.md (Section 5.3)
 */

import { useState, useEffect, useCallback } from 'react';
import { getDatasetLineage, getWorkspaceLineage } from '../lib/lineage-service';
import {
  transformDatasetLineageToDiagram,
  transformWorkspaceLineageToDiagram,
  calculateLineageCounts,
  type LineageGraph,
} from '../services/lineageTransform';
import type { LineageWithDetails, DatasetLineageSummary } from '../types/lineage';
import type { DiagramNode, DiagramEdge } from '../types/diagram';

export interface UseLineageViewOptions {
  workspaceId: string;
  focusedDatasetId?: string | null;
  allNodes: DiagramNode[];
  enabled?: boolean;
}

export interface UseLineageViewResult {
  // Lineage data
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  isLoading: boolean;
  error: Error | null;

  // Focused dataset
  focusedDatasetId: string | null;
  setFocusedDatasetId: (datasetId: string | null) => void;

  // Raw lineage data
  lineageSummary: DatasetLineageSummary | null;
  workspaceLineages: LineageWithDetails[];

  // Actions
  refetch: () => Promise<void>;
  clearFocus: () => void;
}

/**
 * Hook to fetch and manage lineage view data
 */
export function useLineageView({
  workspaceId,
  focusedDatasetId: initialFocusedDatasetId,
  allNodes,
  enabled = true,
}: UseLineageViewOptions): UseLineageViewResult {
  // State
  const [focusedDatasetId, setFocusedDatasetId] = useState<string | null>(
    initialFocusedDatasetId || null
  );
  const [lineageSummary, setLineageSummary] = useState<DatasetLineageSummary | null>(null);
  const [workspaceLineages, setWorkspaceLineages] = useState<LineageWithDetails[]>([]);
  const [nodes, setNodes] = useState<DiagramNode[]>([]);
  const [edges, setEdges] = useState<DiagramEdge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * Fetch lineage data
   */
  const fetchLineageData = useCallback(async () => {
    if (!enabled || !workspaceId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[useLineageView] Fetching lineage data', {
        workspaceId,
        focusedDatasetId,
      });

      // Always fetch workspace-wide lineages
      const workspaceLineagesData = await getWorkspaceLineage(workspaceId);
      setWorkspaceLineages(workspaceLineagesData);

      // If focused on specific dataset, fetch its lineage summary
      if (focusedDatasetId) {
        const summary = await getDatasetLineage(focusedDatasetId);
        setLineageSummary(summary);

        // Transform to diagram format (focused view)
        const lineageGraph = transformDatasetLineageToDiagram(
          focusedDatasetId,
          summary,
          allNodes,
          workspaceLineagesData
        );

        // Calculate lineage counts
        const nodesWithCounts = calculateLineageCounts(lineageGraph.nodes, lineageGraph.edges);

        setNodes(nodesWithCounts);
        setEdges(lineageGraph.edges);
      } else {
        // Transform to diagram format (workspace view)
        const lineageGraph = transformWorkspaceLineageToDiagram(
          allNodes,
          workspaceLineagesData
        );

        // Calculate lineage counts
        const nodesWithCounts = calculateLineageCounts(lineageGraph.nodes, lineageGraph.edges);

        setNodes(nodesWithCounts);
        setEdges(lineageGraph.edges);
        setLineageSummary(null);
      }

      console.log('[useLineageView] Lineage data fetched successfully');
    } catch (err: any) {
      console.error('[useLineageView] Failed to fetch lineage data:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [enabled, workspaceId, focusedDatasetId, allNodes]);

  /**
   * Fetch lineage data when dependencies change
   */
  useEffect(() => {
    fetchLineageData();
  }, [fetchLineageData]);

  /**
   * Clear focus and show workspace-wide lineage
   */
  const clearFocus = useCallback(() => {
    setFocusedDatasetId(null);
  }, []);

  return {
    nodes,
    edges,
    isLoading,
    error,
    focusedDatasetId,
    setFocusedDatasetId,
    lineageSummary,
    workspaceLineages,
    refetch: fetchLineageData,
    clearFocus,
  };
}
