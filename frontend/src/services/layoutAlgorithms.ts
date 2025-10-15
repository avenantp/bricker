/**
 * Layout Algorithms Service
 * Provides automatic node positioning using various algorithms
 * Based on specification: docs/prp/051-dataset-diagram-view-specification.md
 */

import dagre from 'dagre';
import type {
  DiagramNode,
  DiagramEdge,
  LayoutType,
  LayoutOptions,
  LayoutResult,
  DEFAULT_NODE_DIMENSIONS,
} from '../types/diagram';

// =====================================================
// Constants
// =====================================================

const DEFAULT_LAYOUT_OPTIONS: Record<LayoutType, LayoutOptions> = {
  hierarchical: {
    type: 'hierarchical',
    direction: 'TB',
    spacing: { horizontal: 400, vertical: 200 },
    animate: true,
    duration: 300,
  },
  force: {
    type: 'force',
    spacing: { horizontal: 150, vertical: 150 },
    animate: true,
    duration: 500,
  },
  circular: {
    type: 'circular',
    spacing: { horizontal: 300, vertical: 300 },
    animate: true,
    duration: 400,
  },
  dagre: {
    type: 'dagre',
    direction: 'LR',
    spacing: { horizontal: 200, vertical: 100 },
    animate: true,
    duration: 300,
  },
};

// =====================================================
// Helper Functions
// =====================================================

/**
 * Get node dimensions based on expansion state
 */
function getNodeDimensions(node: DiagramNode): { width: number; height: number } {
  if (node.data.isExpanded) {
    const columnCount = node.data.columns?.length || 0;
    const baseHeight = DEFAULT_NODE_DIMENSIONS.expanded.height;
    const columnHeight = columnCount * DEFAULT_NODE_DIMENSIONS.columnHeight;
    return {
      width: DEFAULT_NODE_DIMENSIONS.expanded.width,
      height: baseHeight + columnHeight,
    };
  }
  return DEFAULT_NODE_DIMENSIONS.collapsed;
}

/**
 * Calculate bounding box of all nodes
 */
function getNodesBoundingBox(nodes: DiagramNode[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  centerX: number;
  centerY: number;
} {
  if (nodes.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, centerX: 0, centerY: 0 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    const dims = getNodeDimensions(node);
    minX = Math.min(minX, node.position.x);
    maxX = Math.max(maxX, node.position.x + dims.width);
    minY = Math.min(minY, node.position.y);
    maxY = Math.max(maxY, node.position.y + dims.height);
  });

  return {
    minX,
    maxX,
    minY,
    maxY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}

// =====================================================
// Hierarchical Layout (using dagre)
// =====================================================

/**
 * Apply hierarchical layout using dagre
 */
export function applyHierarchicalLayout(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  options?: Partial<LayoutOptions>
): LayoutResult {
  const opts = { ...DEFAULT_LAYOUT_OPTIONS.hierarchical, ...options };

  // Create dagre graph
  const graph = new dagre.graphlib.Graph();
  graph.setDefaultEdgeLabel(() => ({}));

  // Configure graph
  graph.setGraph({
    rankdir: opts.direction || 'TB',
    nodesep: opts.spacing?.horizontal || 400,
    ranksep: opts.spacing?.vertical || 200,
    marginx: 50,
    marginy: 50,
  });

  // Add nodes to graph
  nodes.forEach((node) => {
    const dims = getNodeDimensions(node);
    graph.setNode(node.id, {
      width: dims.width,
      height: dims.height,
    });
  });

  // Add edges to graph
  edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  // Run layout algorithm
  dagre.layout(graph);

  // Apply positions to nodes
  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = graph.node(node.id);
    const dims = getNodeDimensions(node);

    // dagre returns center position, convert to top-left
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - dims.width / 2,
        y: nodeWithPosition.y - dims.height / 2,
      },
    };
  });

  return {
    nodes: layoutedNodes,
    edges,
  };
}

// =====================================================
// Dagre Layout (alternative configuration)
// =====================================================

/**
 * Apply dagre layout with left-to-right direction
 */
export function applyDagreLayout(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  options?: Partial<LayoutOptions>
): LayoutResult {
  const opts = { ...DEFAULT_LAYOUT_OPTIONS.dagre, ...options };

  // Use hierarchical layout with LR direction
  return applyHierarchicalLayout(nodes, edges, {
    ...opts,
    direction: 'LR',
  });
}

// =====================================================
// Force-Directed Layout
// =====================================================

/**
 * Apply force-directed layout (simple implementation)
 * For production, consider using d3-force or similar
 */
export function applyForceLayout(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  options?: Partial<LayoutOptions>
): LayoutResult {
  const opts = { ...DEFAULT_LAYOUT_OPTIONS.force, ...options };
  const spacing = opts.spacing?.horizontal || 150;

  // Simple force simulation (basic implementation)
  // In production, integrate with d3-force for better results
  const layoutedNodes = nodes.map((node, index) => {
    // Create a grid-like starting position
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const row = Math.floor(index / cols);
    const col = index % cols;

    return {
      ...node,
      position: {
        x: col * spacing,
        y: row * spacing,
      },
    };
  });

  // Apply repulsion between nodes
  for (let iteration = 0; iteration < 50; iteration++) {
    layoutedNodes.forEach((nodeA, i) => {
      layoutedNodes.forEach((nodeB, j) => {
        if (i === j) return;

        const dx = nodeB.position.x - nodeA.position.x;
        const dy = nodeB.position.y - nodeA.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < spacing * 2) {
          const force = (spacing * 2 - distance) / distance;
          nodeA.position.x -= (dx * force) / 10;
          nodeA.position.y -= (dy * force) / 10;
        }
      });
    });

    // Apply attraction along edges
    edges.forEach((edge) => {
      const sourceNode = layoutedNodes.find((n) => n.id === edge.source);
      const targetNode = layoutedNodes.find((n) => n.id === edge.target);

      if (sourceNode && targetNode) {
        const dx = targetNode.position.x - sourceNode.position.x;
        const dy = targetNode.position.y - sourceNode.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > spacing) {
          const force = (distance - spacing) / distance;
          sourceNode.position.x += (dx * force) / 20;
          sourceNode.position.y += (dy * force) / 20;
          targetNode.position.x -= (dx * force) / 20;
          targetNode.position.y -= (dy * force) / 20;
        }
      }
    });
  }

  return {
    nodes: layoutedNodes,
    edges,
  };
}

// =====================================================
// Circular Layout
// =====================================================

/**
 * Apply circular layout
 */
export function applyCircularLayout(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  options?: Partial<LayoutOptions>
): LayoutResult {
  const opts = { ...DEFAULT_LAYOUT_OPTIONS.circular, ...options };
  const radius = 300;
  const centerX = 400;
  const centerY = 400;

  const layoutedNodes = nodes.map((node, index) => {
    const angle = (2 * Math.PI * index) / nodes.length;
    const x = centerX + radius * Math.cos(angle);
    const y = centerY + radius * Math.sin(angle);

    const dims = getNodeDimensions(node);

    return {
      ...node,
      position: {
        x: x - dims.width / 2,
        y: y - dims.height / 2,
      },
    };
  });

  return {
    nodes: layoutedNodes,
    edges,
  };
}

// =====================================================
// Main Layout Function
// =====================================================

/**
 * Apply layout algorithm based on type
 */
export function applyLayout(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  layoutType: LayoutType,
  options?: Partial<LayoutOptions>
): LayoutResult {
  console.log(`[LayoutService] Applying ${layoutType} layout to ${nodes.length} nodes`);

  switch (layoutType) {
    case 'hierarchical':
      return applyHierarchicalLayout(nodes, edges, options);

    case 'dagre':
      return applyDagreLayout(nodes, edges, options);

    case 'force':
      return applyForceLayout(nodes, edges, options);

    case 'circular':
      return applyCircularLayout(nodes, edges, options);

    default:
      console.warn(`[LayoutService] Unknown layout type: ${layoutType}, using hierarchical`);
      return applyHierarchicalLayout(nodes, edges, options);
  }
}

// =====================================================
// Layout Utilities
// =====================================================

/**
 * Center layout on canvas
 */
export function centerLayout(nodes: DiagramNode[], canvasWidth: number, canvasHeight: number): DiagramNode[] {
  const bbox = getNodesBoundingBox(nodes);
  const offsetX = canvasWidth / 2 - bbox.centerX;
  const offsetY = canvasHeight / 2 - bbox.centerY;

  return nodes.map((node) => ({
    ...node,
    position: {
      x: node.position.x + offsetX,
      y: node.position.y + offsetY,
    },
  }));
}

/**
 * Get recommended layout type based on graph structure
 */
export function getRecommendedLayout(nodes: DiagramNode[], edges: DiagramEdge[]): LayoutType {
  const nodeCount = nodes.length;
  const edgeCount = edges.length;
  const density = nodeCount > 0 ? edgeCount / nodeCount : 0;

  // Simple heuristics
  if (nodeCount < 5) {
    return 'circular';
  }

  if (density < 1) {
    // Sparse graph
    return 'hierarchical';
  }

  if (density > 2) {
    // Dense graph
    return 'force';
  }

  return 'hierarchical';
}

/**
 * Validate layout result
 */
export function validateLayout(result: LayoutResult): boolean {
  // Check if all nodes have valid positions
  const hasInvalidPositions = result.nodes.some(
    (node) =>
      !isFinite(node.position.x) ||
      !isFinite(node.position.y) ||
      isNaN(node.position.x) ||
      isNaN(node.position.y)
  );

  if (hasInvalidPositions) {
    console.error('[LayoutService] Layout produced invalid positions');
    return false;
  }

  // Check for overlapping nodes (basic check)
  for (let i = 0; i < result.nodes.length; i++) {
    for (let j = i + 1; j < result.nodes.length; j++) {
      const nodeA = result.nodes[i];
      const nodeB = result.nodes[j];
      const dimsA = getNodeDimensions(nodeA);
      const dimsB = getNodeDimensions(nodeB);

      const overlapX =
        nodeA.position.x < nodeB.position.x + dimsB.width &&
        nodeA.position.x + dimsA.width > nodeB.position.x;
      const overlapY =
        nodeA.position.y < nodeB.position.y + dimsB.height &&
        nodeA.position.y + dimsA.height > nodeB.position.y;

      if (overlapX && overlapY) {
        console.warn(`[LayoutService] Nodes ${nodeA.id} and ${nodeB.id} are overlapping`);
      }
    }
  }

  return true;
}
