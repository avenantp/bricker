/**
 * Mock Diagram Data Generator
 * Provides sample data for testing the diagram view
 */

import type { DiagramNode, DiagramEdge, Column } from '../types/diagram';
import type { MedallionLayer, DatasetType } from '../types/canvas';

/**
 * Generate mock columns for a dataset
 */
function generateMockColumns(datasetName: string, count: number): Column[] {
  const columns: Column[] = [];

  // Always add an ID column as primary key
  columns.push({
    column_id: `${datasetName}_id_col`,
    name: `${datasetName}_id`,
    data_type: 'BIGINT',
    description: `Unique identifier for ${datasetName}`,
    is_primary_key: true,
    is_foreign_key: false,
    is_nullable: false,
    position: 0,
  });

  // Generate additional columns
  const columnTypes = ['VARCHAR(255)', 'INTEGER', 'DECIMAL(10,2)', 'TIMESTAMP', 'BOOLEAN'];
  const columnPrefixes = ['name', 'code', 'value', 'amount', 'date', 'status', 'type', 'flag'];

  for (let i = 1; i < count; i++) {
    const prefix = columnPrefixes[i % columnPrefixes.length];
    const dataType = columnTypes[i % columnTypes.length];

    columns.push({
      column_id: `${datasetName}_col_${i}`,
      name: `${prefix}_${i}`,
      data_type: dataType,
      description: `${prefix} column for ${datasetName}`,
      is_primary_key: false,
      is_foreign_key: false,
      is_nullable: i % 3 !== 0, // Every 3rd column is NOT NULL
      position: i,
    });
  }

  return columns;
}

/**
 * Generate mock dataset nodes
 */
export function generateMockNodes(count: number = 10, withPositions: boolean = false): DiagramNode[] {
  const nodes: DiagramNode[] = [];
  const medallionLayers: MedallionLayer[] = ['Source', 'Raw', 'Bronze', 'Silver', 'Gold'];
  const datasetTypes: DatasetType[] = ['Table', 'View', 'Dimension', 'Fact', 'Hub', 'Link', 'Satellite'];

  for (let i = 0; i < count; i++) {
    const layer = medallionLayers[i % medallionLayers.length];
    const datasetType = datasetTypes[i % datasetTypes.length];

    const datasetName = `${layer.toLowerCase()}_dataset_${i + 1}`;
    const columnCount = 5 + (i % 15); // 5-20 columns

    nodes.push({
      id: `node-${i + 1}`,
      type: 'dataset',
      // Only include position if explicitly requested
      ...(withPositions && {
        position: {
          x: (i % 4) * 400 + 50,
          y: Math.floor(i / 4) * 300 + 50,
        },
      }),
      data: {
        dataset_id: `dataset-${i + 1}`,
        name: datasetName,
        fully_qualified_name: `main_catalog.default_schema.${datasetName}`, // Updated from fqn
        connection_id: `connection-${(i % 3) + 1}`, // Mock connection ID
        schema: 'default_schema', // Mock schema
        medallion_layer: layer,
        dataset_type: datasetType,
        description: `Sample ${layer} layer dataset for testing`,
        isExpanded: false,
        isHighlighted: false,
        columns: generateMockColumns(datasetName, columnCount),
        columnCount,
        relationshipCount: Math.floor(Math.random() * 5),
        lineageCount: {
          upstream: Math.floor(Math.random() * 3),
          downstream: Math.floor(Math.random() * 3),
        },
        ai_confidence_score: 70 + Math.floor(Math.random() * 30),
        sync_status: 'synced',
        has_uncommitted_changes: i % 5 === 0,
      },
    });
  }

  return nodes;
}

/**
 * Generate mock relationship edges
 */
export function generateMockEdges(nodes: DiagramNode[]): DiagramEdge[] {
  const edges: DiagramEdge[] = [];

  // Create relationships between consecutive nodes
  for (let i = 0; i < nodes.length - 1; i++) {
    const sourceNode = nodes[i];
    const targetNode = nodes[i + 1];

    edges.push({
      id: `edge-${i + 1}`,
      source: sourceNode.id,
      target: targetNode.id,
      type: 'relationship',
      data: {
        relationship_type: i % 2 === 0 ? 'FK' : 'BusinessKey',
        cardinality: i % 3 === 0 ? '1:1' : '1:M',
        source_columns: [sourceNode.data.columns[0].column_id],
        target_columns: [targetNode.data.columns[0].column_id],
        description: `Relationship between ${sourceNode.data.name} and ${targetNode.data.name}`,
      },
    });
  }

  // Add some cross-layer relationships
  if (nodes.length >= 6) {
    edges.push({
      id: `edge-cross-1`,
      source: nodes[0].id,
      target: nodes[4].id,
      type: 'relationship',
      data: {
        relationship_type: 'FK',
        cardinality: 'M:M',
        source_columns: [],
        target_columns: [],
      },
    });

    edges.push({
      id: `edge-cross-2`,
      source: nodes[2].id,
      target: nodes[5].id,
      type: 'relationship',
      data: {
        relationship_type: 'NaturalKey',
        cardinality: '1:M',
        source_columns: [],
        target_columns: [],
      },
    });
  }

  return edges;
}

/**
 * Generate mock lineage edges
 */
export function generateMockLineageEdges(nodes: DiagramNode[]): DiagramEdge[] {
  const edges: DiagramEdge[] = [];

  // Create lineage flow through medallion layers
  const rawNodes = nodes.filter((n) => n.data.medallion_layer === 'Raw');
  const bronzeNodes = nodes.filter((n) => n.data.medallion_layer === 'Bronze');
  const silverNodes = nodes.filter((n) => n.data.medallion_layer === 'Silver');
  const goldNodes = nodes.filter((n) => n.data.medallion_layer === 'Gold');

  // Raw -> Bronze
  rawNodes.forEach((rawNode, i) => {
    const targetBronze = bronzeNodes[i % bronzeNodes.length];
    if (targetBronze) {
      edges.push({
        id: `lineage-raw-bronze-${i}`,
        source: rawNode.id,
        target: targetBronze.id,
        type: 'lineage',
        data: {
          mapping_type: 'Direct',
          source_column_id: rawNode.data.columns[0]?.column_id,
          target_column_id: targetBronze.data.columns[0]?.column_id,
        },
      });
    }
  });

  // Bronze -> Silver
  bronzeNodes.forEach((bronzeNode, i) => {
    const targetSilver = silverNodes[i % silverNodes.length];
    if (targetSilver) {
      edges.push({
        id: `lineage-bronze-silver-${i}`,
        source: bronzeNode.id,
        target: targetSilver.id,
        type: 'lineage',
        data: {
          mapping_type: i % 2 === 0 ? 'Transform' : 'Derived',
          transformation_expression: `TRANSFORM(${bronzeNode.data.name})`,
          source_column_id: bronzeNode.data.columns[1]?.column_id,
          target_column_id: targetSilver.data.columns[1]?.column_id,
        },
      });
    }
  });

  // Silver -> Gold
  silverNodes.forEach((silverNode, i) => {
    const targetGold = goldNodes[i % goldNodes.length];
    if (targetGold) {
      edges.push({
        id: `lineage-silver-gold-${i}`,
        source: silverNode.id,
        target: targetGold.id,
        type: 'lineage',
        data: {
          mapping_type: 'Calculated',
          transformation_expression: `AGGREGATE(${silverNode.data.name})`,
          source_column_id: silverNode.data.columns[2]?.column_id,
          target_column_id: targetGold.data.columns[2]?.column_id,
        },
      });
    }
  });

  return edges;
}

/**
 * Generate complete mock diagram data
 */
export function generateMockDiagramData(nodeCount: number = 12, withPositions: boolean = false) {
  const nodes = generateMockNodes(nodeCount, withPositions);
  const relationshipEdges = generateMockEdges(nodes);
  const lineageEdges = generateMockLineageEdges(nodes);

  return {
    nodes,
    relationshipEdges,
    lineageEdges,
    allEdges: [...relationshipEdges, ...lineageEdges],
  };
}
