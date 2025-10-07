import nunjucks from 'nunjucks';
import { Node, Edge } from '@xyflow/react';
import { CompositionNodeData } from '../types/template';

// Configure nunjucks environment
const env = nunjucks.configure({ autoescape: false });

interface CompilationContext {
  variables: Record<string, any>;
  fragments: Map<string, string>;
  visitedNodes: Set<string>;
}

/**
 * Compile a template composition into a final Jinja2 template
 * by traversing the decision tree and combining fragments
 */
export async function compileTemplate(
  nodes: Node<ComposationNodeData>[],
  edges: Edge[]
): Promise<string> {
  const context: CompilationContext = {
    variables: {},
    fragments: new Map(),
    visitedNodes: new Set(),
  };

  // Find the start node
  const startNode = nodes.find((n) => n.type === 'start');
  if (!startNode) {
    throw new Error('No start node found in composition');
  }

  // Build an adjacency map for easier traversal
  const adjacencyMap = buildAdjacencyMap(edges);

  // Traverse the graph and collect fragments
  const templateParts: string[] = [];
  await traverseGraph(startNode.id, nodes, adjacencyMap, context, templateParts);

  // Combine all parts into final template
  const finalTemplate = templateParts.join('\n\n');
  return finalTemplate;
}

/**
 * Build an adjacency map from edges for graph traversal
 */
function buildAdjacencyMap(edges: Edge[]): Map<string, Edge[]> {
  const map = new Map<string, Edge[]>();

  for (const edge of edges) {
    if (!map.has(edge.source)) {
      map.set(edge.source, []);
    }
    map.get(edge.source)!.push(edge);
  }

  return map;
}

/**
 * Traverse the graph depth-first and collect template fragments
 */
async function traverseGraph(
  nodeId: string,
  nodes: Node<CompositionNodeData>[],
  adjacencyMap: Map<string, Edge[]>,
  context: CompilationContext,
  templateParts: string[]
): Promise<void> {
  // Avoid infinite loops
  if (context.visitedNodes.has(nodeId)) {
    return;
  }
  context.visitedNodes.add(nodeId);

  const node = nodes.find((n) => n.id === nodeId);
  if (!node) {
    return;
  }

  // Process the node based on its type
  switch (node.type) {
    case 'start':
      // Just continue to next nodes
      break;

    case 'fragment':
      // Add fragment content if enabled
      if (node.data.data.isEnabled !== false) {
        const fragmentContent =
          node.data.data.editorContent ||
          node.data.data.fragment?.fragment_content ||
          '';

        if (fragmentContent.trim()) {
          templateParts.push(`-- Fragment: ${node.data.data.label}`);
          templateParts.push(fragmentContent);

          // Collect variables
          const variables = node.data.data.fragment?.variables || [];
          for (const variable of variables) {
            context.variables[variable.name] = variable.default;
          }
        }
      }
      break;

    case 'condition':
      // Add conditional logic
      const condition = node.data.data.condition || '';
      if (condition.trim()) {
        templateParts.push(condition);

        // Find true and false branches
        const outgoingEdges = adjacencyMap.get(nodeId) || [];
        const trueEdge = outgoingEdges.find((e) => e.sourceHandle === 'true');
        const falseEdge = outgoingEdges.find((e) => e.sourceHandle === 'false');

        // Traverse true branch
        if (trueEdge) {
          await traverseGraph(
            trueEdge.target,
            nodes,
            adjacencyMap,
            context,
            templateParts
          );
        }

        // Add else clause if false branch exists
        if (falseEdge) {
          templateParts.push('{% else %}');
          await traverseGraph(
            falseEdge.target,
            nodes,
            adjacencyMap,
            context,
            templateParts
          );
        }

        templateParts.push('{% endif %}');

        // Don't continue traversing after condition (branches are handled above)
        return;
      }
      break;

    case 'merge':
      // Merge point - just continue
      break;

    case 'end':
      // End of template
      return;
  }

  // Continue to next nodes (for non-condition nodes)
  const outgoingEdges = adjacencyMap.get(nodeId) || [];
  for (const edge of outgoingEdges) {
    // Skip if this is a condition edge (already handled)
    if (edge.sourceHandle === 'true' || edge.sourceHandle === 'false') {
      continue;
    }

    await traverseGraph(edge.target, nodes, adjacencyMap, context, templateParts);
  }
}

/**
 * Validate a template fragment for Jinja2 syntax
 */
export function validateTemplate(templateContent: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  try {
    // Try to compile with nunjucks
    env.renderString(templateContent, {});
    return { valid: true, errors: [] };
  } catch (error) {
    if (error instanceof Error) {
      errors.push(error.message);
    }
    return { valid: false, errors };
  }
}

/**
 * Extract variables from a template fragment
 */
export function extractVariables(templateContent: string): string[] {
  const variableRegex = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
  const variables = new Set<string>();

  let match;
  while ((match = variableRegex.exec(templateContent)) !== null) {
    variables.add(match[1]);
  }

  return Array.from(variables);
}

/**
 * Render a template with given variables
 */
export function renderTemplate(
  templateContent: string,
  variables: Record<string, any>
): string {
  try {
    return env.renderString(templateContent, variables);
  } catch (error) {
    console.error('Template rendering error:', error);
    throw error;
  }
}
