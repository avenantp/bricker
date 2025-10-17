/**
 * useEdgeRouting Hook
 * Automatically calculates and updates edge paths when nodes change position
 * Based on specification: docs/prp/051-dataset-diagram-view-specification.md
 */

import { useEffect, useRef } from 'react';
import { useDiagramStore } from '../store/diagramStore';
import { calculateAllEdgePaths, toReactFlowEdge } from '../services/edgeRouting';

/**
 * Hook to automatically recalculate edge paths when nodes move
 */
export function useEdgeRouting() {
  const nodes = useDiagramStore((state) => state.nodes);
  const edges = useDiagramStore((state) => state.edges);
  const edgeRoutes = useDiagramStore((state) => state.edgeRoutes);
  const setEdges = useDiagramStore((state) => state.setEdges);
  const saveEdgeRoute = useDiagramStore((state) => state.saveEdgeRoute);

  // Track previous node positions to detect changes
  const previousPositionsRef = useRef<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    // Check if any node positions have changed
    let positionsChanged = false;

    // Only process nodes that have positions (are on the diagram)
    const nodesWithPositions = nodes.filter((node) => node.position !== undefined);

    nodesWithPositions.forEach((node) => {
      const prevPos = previousPositionsRef.current[node.id];
      if (
        !prevPos ||
        prevPos.x !== node.position!.x ||
        prevPos.y !== node.position!.y
      ) {
        positionsChanged = true;
      }
      previousPositionsRef.current[node.id] = { ...node.position! };
    });

    // Recalculate edge paths if positions changed
    if (positionsChanged && edges.length > 0 && nodesWithPositions.length > 0) {
      const edgePaths = calculateAllEdgePaths(nodesWithPositions, edges, edgeRoutes);

      // Update edges with new paths
      const updatedEdges = edges.map((edge) => {
        const pathResult = edgePaths[edge.id];
        if (pathResult) {
          return toReactFlowEdge(edge, pathResult);
        }
        return edge;
      });

      setEdges(updatedEdges);
    }
  }, [nodes, edges, edgeRoutes, setEdges]);
}

/**
 * Hook to recalculate edge paths when nodes expand/collapse
 */
export function useEdgeRoutingOnExpansion() {
  const nodes = useDiagramStore((state) => state.nodes);
  const edges = useDiagramStore((state) => state.edges);
  const edgeRoutes = useDiagramStore((state) => state.edgeRoutes);
  const expandedNodes = useDiagramStore((state) => state.expandedNodes);
  const setEdges = useDiagramStore((state) => state.setEdges);

  // Track previous expansion state
  const previousExpansionRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    // Check if expansion state changed
    const expansionChanged =
      previousExpansionRef.current.size !== expandedNodes.size ||
      Array.from(expandedNodes).some((id) => !previousExpansionRef.current.has(id));

    if (expansionChanged) {
      previousExpansionRef.current = new Set(expandedNodes);

      // Only process nodes that have positions (are on the diagram)
      const nodesWithPositions = nodes.filter((node) => node.position !== undefined);

      if (nodesWithPositions.length > 0 && edges.length > 0) {
        // Recalculate all edge paths
        const edgePaths = calculateAllEdgePaths(nodesWithPositions, edges, edgeRoutes);

        const updatedEdges = edges.map((edge) => {
          const pathResult = edgePaths[edge.id];
          if (pathResult) {
            return toReactFlowEdge(edge, pathResult);
          }
          return edge;
        });

        setEdges(updatedEdges);
      }
    }
  }, [nodes, edges, edgeRoutes, expandedNodes, setEdges]);
}

/**
 * Combined hook for all edge routing scenarios
 */
export function useAutoEdgeRouting() {
  useEdgeRouting();
  useEdgeRoutingOnExpansion();
}
