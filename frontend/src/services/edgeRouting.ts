/**
 * Edge Routing Utilities
 * Provides smart edge path calculation and routing algorithms
 * Based on specification: docs/prp/051-dataset-diagram-view-specification.md
 */

import type {
  DiagramNode,
  DiagramEdge,
  EdgeRoute,
  RelationshipEdgeData,
  LineageEdgeData,
} from '../types/diagram';

// =====================================================
// Types & Constants
// =====================================================

export type EdgeAlignmentType = 'straight' | 'bezier' | 'step' | 'smooth-step';

export interface EdgePoint {
  x: number;
  y: number;
}

export interface EdgePathResult {
  path: string; // SVG path string
  controlPoints: EdgePoint[];
  alignmentType: EdgeAlignmentType;
}

// Minimum curve radius for smooth steps
const MIN_CURVE_RADIUS = 10;

// Offset for parallel edges
const PARALLEL_EDGE_OFFSET = 20;

// =====================================================
// Node Position Helpers
// =====================================================

/**
 * Get the center point of a node
 */
export function getNodeCenter(node: DiagramNode): EdgePoint {
  const width = node.data.isExpanded ? 400 : 250;
  const height = node.data.isExpanded ? 240 : 120;

  return {
    x: node.position.x + width / 2,
    y: node.position.y + height / 2,
  };
}

/**
 * Get connection point on node edge
 */
export function getNodeConnectionPoint(
  node: DiagramNode,
  side: 'top' | 'bottom' | 'left' | 'right'
): EdgePoint {
  const width = node.data.isExpanded ? 400 : 250;
  const height = node.data.isExpanded ? 240 : 120;

  const center = getNodeCenter(node);

  switch (side) {
    case 'top':
      return { x: center.x, y: node.position.y };
    case 'bottom':
      return { x: center.x, y: node.position.y + height };
    case 'left':
      return { x: node.position.x, y: center.y };
    case 'right':
      return { x: node.position.x + width, y: center.y };
  }
}

/**
 * Determine which side of the source node to connect from
 */
export function determineConnectionSides(
  sourceNode: DiagramNode,
  targetNode: DiagramNode
): { source: 'top' | 'bottom' | 'left' | 'right'; target: 'top' | 'bottom' | 'left' | 'right' } {
  const sourceCenter = getNodeCenter(sourceNode);
  const targetCenter = getNodeCenter(targetNode);

  const dx = targetCenter.x - sourceCenter.x;
  const dy = targetCenter.y - sourceCenter.y;

  // Determine primary direction
  if (Math.abs(dx) > Math.abs(dy)) {
    // Horizontal primary direction
    if (dx > 0) {
      return { source: 'right', target: 'left' };
    } else {
      return { source: 'left', target: 'right' };
    }
  } else {
    // Vertical primary direction
    if (dy > 0) {
      return { source: 'bottom', target: 'top' };
    } else {
      return { source: 'top', target: 'bottom' };
    }
  }
}

// =====================================================
// Path Generation Functions
// =====================================================

/**
 * Generate straight line path
 */
export function generateStraightPath(start: EdgePoint, end: EdgePoint): EdgePathResult {
  const path = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;

  return {
    path,
    controlPoints: [start, end],
    alignmentType: 'straight',
  };
}

/**
 * Generate bezier curve path
 */
export function generateBezierPath(start: EdgePoint, end: EdgePoint): EdgePathResult {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  // Control points offset (adjust curvature based on distance)
  const offsetX = Math.abs(dx) * 0.5;
  const offsetY = Math.abs(dy) * 0.5;

  const cp1: EdgePoint = {
    x: start.x + offsetX,
    y: start.y,
  };

  const cp2: EdgePoint = {
    x: end.x - offsetX,
    y: end.y,
  };

  const path = `M ${start.x} ${start.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${end.x} ${end.y}`;

  return {
    path,
    controlPoints: [start, cp1, cp2, end],
    alignmentType: 'bezier',
  };
}

/**
 * Generate step path (90-degree angles)
 */
export function generateStepPath(start: EdgePoint, end: EdgePoint): EdgePathResult {
  const midX = (start.x + end.x) / 2;

  const path = `M ${start.x} ${start.y} L ${midX} ${start.y} L ${midX} ${end.y} L ${end.x} ${end.y}`;

  return {
    path,
    controlPoints: [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end],
    alignmentType: 'step',
  };
}

/**
 * Generate smooth step path (rounded corners)
 */
export function generateSmoothStepPath(start: EdgePoint, end: EdgePoint): EdgePathResult {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const midX = (start.x + end.x) / 2;

  // Determine curve radius based on available space
  const radius = Math.min(MIN_CURVE_RADIUS, Math.abs(dx) / 4, Math.abs(dy) / 4);

  let path = `M ${start.x} ${start.y}`;

  // Horizontal segment to midpoint
  if (Math.abs(dx) > radius * 2) {
    const beforeCorner1 = midX - Math.sign(dx) * radius;
    path += ` L ${beforeCorner1} ${start.y}`;

    // First corner (rounded)
    const corner1End = { x: midX, y: start.y + Math.sign(dy) * radius };
    path += ` Q ${midX} ${start.y}, ${corner1End.x} ${corner1End.y}`;

    // Vertical segment
    const beforeCorner2 = end.y - Math.sign(dy) * radius;
    path += ` L ${midX} ${beforeCorner2}`;

    // Second corner (rounded)
    const corner2End = { x: midX + Math.sign(dx) * radius, y: end.y };
    path += ` Q ${midX} ${end.y}, ${corner2End.x} ${corner2End.y}`;

    // Final horizontal segment
    path += ` L ${end.x} ${end.y}`;
  } else {
    // Fallback to straight line if not enough space
    path += ` L ${end.x} ${end.y}`;
  }

  return {
    path,
    controlPoints: [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end],
    alignmentType: 'smooth-step',
  };
}

// =====================================================
// Smart Edge Routing
// =====================================================

/**
 * Calculate optimal edge path based on node positions
 */
export function calculateEdgePath(
  sourceNode: DiagramNode,
  targetNode: DiagramNode,
  alignmentType?: EdgeAlignmentType,
  customRoute?: EdgeRoute
): EdgePathResult {
  // Use custom route if provided and marked as user-modified
  if (customRoute && customRoute.userModified) {
    return {
      path: customRoute.path,
      controlPoints: customRoute.controlPoints,
      alignmentType: customRoute.alignmentType as EdgeAlignmentType,
    };
  }

  // Determine connection points
  const sides = determineConnectionSides(sourceNode, targetNode);
  const start = getNodeConnectionPoint(sourceNode, sides.source);
  const end = getNodeConnectionPoint(targetNode, sides.target);

  // Use specified alignment or default to smooth-step
  const alignment = alignmentType || 'smooth-step';

  switch (alignment) {
    case 'straight':
      return generateStraightPath(start, end);
    case 'bezier':
      return generateBezierPath(start, end);
    case 'step':
      return generateStepPath(start, end);
    case 'smooth-step':
      return generateSmoothStepPath(start, end);
    default:
      return generateSmoothStepPath(start, end);
  }
}

/**
 * Calculate paths for all edges
 */
export function calculateAllEdgePaths(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  savedRoutes: Record<string, EdgeRoute> = {}
): Record<string, EdgePathResult> {
  const edgePaths: Record<string, EdgePathResult> = {};

  edges.forEach((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);

    if (sourceNode && targetNode) {
      const savedRoute = savedRoutes[edge.id];
      const alignment = savedRoute?.alignmentType as EdgeAlignmentType | undefined;

      edgePaths[edge.id] = calculateEdgePath(sourceNode, targetNode, alignment, savedRoute);
    }
  });

  return edgePaths;
}

// =====================================================
// Edge Label Positioning
// =====================================================

/**
 * Calculate position for edge label (at midpoint)
 */
export function calculateEdgeLabelPosition(path: EdgePathResult): EdgePoint {
  const points = path.controlPoints;

  if (points.length === 2) {
    // Straight line - use midpoint
    return {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2,
    };
  } else if (points.length === 4) {
    // Bezier or step - use midpoint of middle section
    return {
      x: (points[1].x + points[2].x) / 2,
      y: (points[1].y + points[2].y) / 2,
    };
  }

  // Fallback
  return points[Math.floor(points.length / 2)];
}

// =====================================================
// Edge Collision Detection
// =====================================================

/**
 * Check if two edges are approximately parallel (within tolerance)
 */
export function areEdgesParallel(
  edge1Start: EdgePoint,
  edge1End: EdgePoint,
  edge2Start: EdgePoint,
  edge2End: EdgePoint,
  tolerance: number = 10
): boolean {
  const dx1 = edge1End.x - edge1Start.x;
  const dy1 = edge1End.y - edge1Start.y;
  const dx2 = edge2End.x - edge2Start.x;
  const dy2 = edge2End.y - edge2Start.y;

  // Calculate angles
  const angle1 = Math.atan2(dy1, dx1);
  const angle2 = Math.atan2(dy2, dx2);

  const angleDiff = Math.abs(angle1 - angle2);

  return angleDiff < tolerance * (Math.PI / 180);
}

/**
 * Offset edge path for parallel edges
 */
export function offsetEdgeForParallel(
  path: EdgePathResult,
  offsetAmount: number
): EdgePathResult {
  // Simple offset implementation - move control points perpendicular to edge direction
  const offsetPoints = path.controlPoints.map((point, index) => {
    if (index === 0 || index === path.controlPoints.length - 1) {
      // Don't offset start and end points (keep them at node connection points)
      return point;
    }

    // Calculate perpendicular offset
    const prevPoint = path.controlPoints[index - 1];
    const nextPoint = path.controlPoints[index + 1] || point;

    const dx = nextPoint.x - prevPoint.x;
    const dy = nextPoint.y - prevPoint.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) return point;

    // Perpendicular vector
    const perpX = -dy / length;
    const perpY = dx / length;

    return {
      x: point.x + perpX * offsetAmount,
      y: point.y + perpY * offsetAmount,
    };
  });

  // Regenerate path with offset points
  let newPath = `M ${offsetPoints[0].x} ${offsetPoints[0].y}`;

  if (path.alignmentType === 'straight') {
    newPath += ` L ${offsetPoints[offsetPoints.length - 1].x} ${offsetPoints[offsetPoints.length - 1].y}`;
  } else if (path.alignmentType === 'bezier' && offsetPoints.length === 4) {
    newPath += ` C ${offsetPoints[1].x} ${offsetPoints[1].y}, ${offsetPoints[2].x} ${offsetPoints[2].y}, ${offsetPoints[3].x} ${offsetPoints[3].y}`;
  } else {
    // Step or smooth-step - rebuild with L commands
    for (let i = 1; i < offsetPoints.length; i++) {
      newPath += ` L ${offsetPoints[i].x} ${offsetPoints[i].y}`;
    }
  }

  return {
    path: newPath,
    controlPoints: offsetPoints,
    alignmentType: path.alignmentType,
  };
}

// =====================================================
// Edge Markers (Arrowheads)
// =====================================================

/**
 * Generate SVG marker definitions for edge arrowheads
 */
export function generateEdgeMarkers(): string {
  return `
    <defs>
      <!-- Default arrow -->
      <marker
        id="arrow"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
      </marker>

      <!-- Highlighted arrow -->
      <marker
        id="arrow-highlighted"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#8b5cf6" />
      </marker>

      <!-- Selected arrow -->
      <marker
        id="arrow-selected"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="8"
        markerHeight="8"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
      </marker>

      <!-- Diamond (for many-to-many relationships) -->
      <marker
        id="diamond"
        viewBox="0 0 10 10"
        refX="5"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto"
      >
        <path d="M 0 5 L 5 0 L 10 5 L 5 10 z" fill="white" stroke="currentColor" stroke-width="1" />
      </marker>
    </defs>
  `;
}

/**
 * Get marker ID for edge based on relationship type
 */
export function getEdgeMarker(
  edge: DiagramEdge,
  isHighlighted: boolean,
  isSelected: boolean
): string {
  if (isSelected) return 'url(#arrow-selected)';
  if (isHighlighted) return 'url(#arrow-highlighted)';

  // Check if it's a relationship edge
  const edgeData = edge.data as RelationshipEdgeData | LineageEdgeData;

  if ('cardinality' in edgeData) {
    // Relationship edge
    if (edgeData.cardinality?.includes('many')) {
      return 'url(#diamond)';
    }
  }

  return 'url(#arrow)';
}

// =====================================================
// Utilities
// =====================================================

/**
 * Convert edge path to React Flow edge format
 */
export function toReactFlowEdge(
  edge: DiagramEdge,
  pathResult: EdgePathResult
): DiagramEdge {
  return {
    ...edge,
    data: {
      ...edge.data,
      route: {
        edge_id: edge.id,
        path: pathResult.path,
        controlPoints: pathResult.controlPoints,
        alignmentType: pathResult.alignmentType,
        userModified: false,
      },
    },
  };
}

/**
 * Calculate edge distance (for interaction hit testing)
 */
export function pointToEdgeDistance(
  point: EdgePoint,
  edgeStart: EdgePoint,
  edgeEnd: EdgePoint
): number {
  const dx = edgeEnd.x - edgeStart.x;
  const dy = edgeEnd.y - edgeStart.y;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    // Edge is a point
    const dpx = point.x - edgeStart.x;
    const dpy = point.y - edgeStart.y;
    return Math.sqrt(dpx * dpx + dpy * dpy);
  }

  // Calculate projection
  const t = Math.max(
    0,
    Math.min(1, ((point.x - edgeStart.x) * dx + (point.y - edgeStart.y) * dy) / lengthSquared)
  );

  const projectionX = edgeStart.x + t * dx;
  const projectionY = edgeStart.y + t * dy;

  const distX = point.x - projectionX;
  const distY = point.y - projectionY;

  return Math.sqrt(distX * distX + distY * distY);
}
