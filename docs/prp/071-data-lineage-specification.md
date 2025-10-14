# Data Lineage - Technical Specification

## 1. Overview

### 1.1 Purpose
Provide comprehensive data lineage visualization and analysis capabilities at both dataset and column levels, enabling users to understand data flow, dependencies, and impact analysis across their data ecosystem.

### 1.2 Key Features
- **Bidirectional Lineage**: View both upstream (sources) and downstream (targets) lineage
- **Multi-Level Granularity**: Toggle between dataset-level and column-level lineage
- **Interactive Diagram**: Graph-based visualization with highlighting and filtering
- **Context-Aware**: Launch lineage view from any diagram via right-click
- **Impact Analysis**: Identify all affected datasets/columns when making changes
- **Lineage Path Tracing**: Highlight complete data flow paths
- **Filtering and Search**: Focus on specific lineage paths or patterns
- **Export Capabilities**: Export lineage diagrams and reports

### 1.3 Architecture Pattern
**Database-First with Real-time Updates**:
- Lineage stored in `lineage` table (column-level granularity)
- Dataset-level lineage derived by aggregating column lineage
- React Flow for interactive graph visualization
- Real-time lineage updates via Supabase subscriptions
- Cached lineage graphs for performance

---

## 2. Data Model

### 2.1 Lineage Table (Existing Schema)

```sql
CREATE TABLE lineage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces(id),
  
  -- Downstream (target)
  downstream_dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  downstream_column_id UUID REFERENCES columns(id) ON DELETE CASCADE,
  
  -- Upstream (source)
  upstream_dataset_id UUID REFERENCES datasets(id) ON DELETE CASCADE,
  upstream_column_id UUID REFERENCES columns(id) ON DELETE CASCADE,
  
  -- Mapping properties
  mapping_type VARCHAR NOT NULL CHECK (mapping_type IN ('Direct', 'Transform', 'Derived', 'Calculated')),
  transformation_expression TEXT,
  
  -- Lineage metadata
  lineage_type VARCHAR DEFAULT 'direct' CHECK (lineage_type IN ('direct', 'indirect')),
  
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(downstream_column_id, upstream_column_id)
);

-- Indexes for lineage queries
CREATE INDEX idx_lineage_downstream_dataset ON lineage(downstream_dataset_id);
CREATE INDEX idx_lineage_upstream_dataset ON lineage(upstream_dataset_id);
CREATE INDEX idx_lineage_downstream_column ON lineage(downstream_column_id);
CREATE INDEX idx_lineage_upstream_column ON lineage(upstream_column_id);
CREATE INDEX idx_lineage_workspace ON lineage(workspace_id);
```

### 2.2 Lineage Query Patterns

**Dataset-Level Lineage**:
```sql
-- Get all upstream datasets for a target dataset
SELECT DISTINCT
  d.id,
  d.name,
  d.fqn,
  d.entity_type,
  d.entity_subtype,
  d.medallion_layer,
  COUNT(DISTINCT l.id) as lineage_count
FROM datasets d
INNER JOIN lineage l ON d.id = l.upstream_dataset_id
WHERE l.downstream_dataset_id = $1
GROUP BY d.id;

-- Get all downstream datasets for a source dataset
SELECT DISTINCT
  d.id,
  d.name,
  d.fqn,
  d.entity_type,
  d.entity_subtype,
  d.medallion_layer,
  COUNT(DISTINCT l.id) as lineage_count
FROM datasets d
INNER JOIN lineage l ON d.id = l.downstream_dataset_id
WHERE l.upstream_dataset_id = $1
GROUP BY d.id;
```

**Column-Level Lineage**:
```sql
-- Get complete lineage for a column (upstream and downstream)
WITH RECURSIVE lineage_tree AS (
  -- Anchor: Start with target column
  SELECT 
    l.id,
    l.upstream_dataset_id,
    l.upstream_column_id,
    l.downstream_dataset_id,
    l.downstream_column_id,
    l.mapping_type,
    l.transformation_expression,
    0 as depth,
    'downstream' as direction
  FROM lineage l
  WHERE l.upstream_column_id = $1
  
  UNION ALL
  
  -- Recursive: Follow downstream lineage
  SELECT 
    l.id,
    l.upstream_dataset_id,
    l.upstream_column_id,
    l.downstream_dataset_id,
    l.downstream_column_id,
    l.mapping_type,
    l.transformation_expression,
    lt.depth + 1,
    'downstream'
  FROM lineage l
  INNER JOIN lineage_tree lt ON l.upstream_column_id = lt.downstream_column_id
  WHERE lt.depth < 10 -- Prevent infinite recursion
)
SELECT * FROM lineage_tree;
```

**Multi-Hop Lineage**:
```sql
-- Trace lineage across multiple hops (e.g., Bronze -> Silver -> Gold)
WITH RECURSIVE lineage_path AS (
  SELECT 
    l.upstream_dataset_id as source_dataset_id,
    l.downstream_dataset_id as target_dataset_id,
    l.upstream_column_id as source_column_id,
    l.downstream_column_id as target_column_id,
    1 as hop_count,
    ARRAY[l.upstream_dataset_id] as path,
    l.mapping_type,
    l.transformation_expression
  FROM lineage l
  WHERE l.upstream_dataset_id = $1
  
  UNION ALL
  
  SELECT 
    lp.source_dataset_id,
    l.downstream_dataset_id,
    lp.source_column_id,
    l.downstream_column_id,
    lp.hop_count + 1,
    lp.path || l.downstream_dataset_id,
    l.mapping_type,
    l.transformation_expression
  FROM lineage_path lp
  INNER JOIN lineage l ON lp.target_dataset_id = l.upstream_dataset_id
  WHERE lp.hop_count < 5
    AND NOT (l.downstream_dataset_id = ANY(lp.path)) -- Prevent cycles
)
SELECT DISTINCT * FROM lineage_path;
```

---

## 3. Lineage Service Layer

### 3.1 TypeScript Interfaces

```typescript
// frontend/src/types/lineage.ts

export interface LineageNode {
  id: string; // dataset_id or column_id
  type: 'dataset' | 'column';
  dataset_id: string;
  dataset_name: string;
  dataset_fqn: string;
  entity_type: string;
  entity_subtype: string;
  medallion_layer: string;
  column_id?: string;
  column_name?: string;
  column_data_type?: string;
}

export interface LineageEdge {
  id: string; // lineage.id
  source: string; // upstream node id
  target: string; // downstream node id
  mapping_type: 'Direct' | 'Transform' | 'Derived' | 'Calculated';
  transformation_expression?: string;
  lineage_type: 'direct' | 'indirect';
}

export interface LineageGraph {
  nodes: LineageNode[];
  edges: LineageEdge[];
  rootNodeId: string; // The node we started lineage from
  direction: 'upstream' | 'downstream' | 'both';
  depth: number; // How many hops we traversed
}

export interface LineagePath {
  nodes: LineageNode[];
  edges: LineageEdge[];
  hops: number;
  totalTransformations: number;
}

export interface LineageAnalysis {
  totalUpstreamDatasets: number;
  totalDownstreamDatasets: number;
  totalUpstreamColumns: number;
  totalDownstreamColumns: number;
  maxUpstreamDepth: number;
  maxDownstreamDepth: number;
  criticalPaths: LineagePath[]; // Longest or most complex paths
  transformationTypes: Record<string, number>; // Count by mapping_type
}

export interface LineageViewState {
  viewType: 'dataset' | 'column';
  direction: 'upstream' | 'downstream' | 'both';
  selectedNodeId: string | null;
  selectedPath: string[] | null; // Array of node IDs forming a path
  highlightedNodes: Set<string>;
  highlightedEdges: Set<string>;
  filters: {
    mappingTypes: string[];
    medallionLayers: string[];
    entityTypes: string[];
  };
  layout: 'hierarchical' | 'force' | 'circular';
  showLabels: boolean;
  showTransformations: boolean;
}
```

### 3.2 Lineage Service

```typescript
// frontend/src/lib/lineage-service.ts

import { supabase } from './supabase-client';
import {
  LineageNode,
  LineageEdge,
  LineageGraph,
  LineageAnalysis,
  LineagePath
} from '@/types/lineage';

export class LineageService {
  
  /**
   * Get dataset-level lineage graph
   */
  async getDatasetLineage(
    datasetId: string,
    direction: 'upstream' | 'downstream' | 'both' = 'both',
    maxDepth: number = 5
  ): Promise<LineageGraph> {
    
    const nodes: LineageNode[] = [];
    const edges: LineageEdge[] = [];
    const visitedDatasets = new Set<string>();
    
    // Get root dataset
    const { data: rootDataset } = await supabase
      .from('datasets')
      .select('*')
      .eq('id', datasetId)
      .single();
    
    if (!rootDataset) {
      throw new Error('Dataset not found');
    }
    
    nodes.push({
      id: rootDataset.id,
      type: 'dataset',
      dataset_id: rootDataset.id,
      dataset_name: rootDataset.name,
      dataset_fqn: rootDataset.fqn,
      entity_type: rootDataset.entity_type,
      entity_subtype: rootDataset.entity_subtype,
      medallion_layer: rootDataset.medallion_layer
    });
    
    visitedDatasets.add(rootDataset.id);
    
    // Fetch upstream lineage
    if (direction === 'upstream' || direction === 'both') {
      await this._traverseUpstream(datasetId, nodes, edges, visitedDatasets, maxDepth, 0);
    }
    
    // Fetch downstream lineage
    if (direction === 'downstream' || direction === 'both') {
      await this._traverseDownstream(datasetId, nodes, edges, visitedDatasets, maxDepth, 0);
    }
    
    return {
      nodes,
      edges,
      rootNodeId: datasetId,
      direction,
      depth: maxDepth
    };
  }
  
  /**
   * Get column-level lineage graph
   */
  async getColumnLineage(
    columnId: string,
    direction: 'upstream' | 'downstream' | 'both' = 'both',
    maxDepth: number = 5
  ): Promise<LineageGraph> {
    
    const nodes: LineageNode[] = [];
    const edges: LineageEdge[] = [];
    const visitedColumns = new Set<string>();
    
    // Get root column
    const { data: rootColumn } = await supabase
      .from('columns')
      .select(`
        *,
        dataset:datasets(*)
      `)
      .eq('id', columnId)
      .single();
    
    if (!rootColumn) {
      throw new Error('Column not found');
    }
    
    nodes.push({
      id: rootColumn.id,
      type: 'column',
      dataset_id: rootColumn.dataset_id,
      dataset_name: rootColumn.dataset.name,
      dataset_fqn: rootColumn.dataset.fqn,
      entity_type: rootColumn.dataset.entity_type,
      entity_subtype: rootColumn.dataset.entity_subtype,
      medallion_layer: rootColumn.dataset.medallion_layer,
      column_id: rootColumn.id,
      column_name: rootColumn.name,
      column_data_type: rootColumn.data_type
    });
    
    visitedColumns.add(rootColumn.id);
    
    // Fetch upstream lineage
    if (direction === 'upstream' || direction === 'both') {
      await this._traverseUpstreamColumns(columnId, nodes, edges, visitedColumns, maxDepth, 0);
    }
    
    // Fetch downstream lineage
    if (direction === 'downstream' || direction === 'both') {
      await this._traverseDownstreamColumns(columnId, nodes, edges, visitedColumns, maxDepth, 0);
    }
    
    return {
      nodes,
      edges,
      rootNodeId: columnId,
      direction,
      depth: maxDepth
    };
  }
  
  /**
   * Analyze lineage to provide insights
   */
  async analyzeLineage(datasetId: string): Promise<LineageAnalysis> {
    
    const upstreamGraph = await this.getDatasetLineage(datasetId, 'upstream', 10);
    const downstreamGraph = await this.getDatasetLineage(datasetId, 'downstream', 10);
    
    // Count unique datasets
    const upstreamDatasets = new Set(
      upstreamGraph.nodes.filter(n => n.id !== datasetId).map(n => n.dataset_id)
    );
    const downstreamDatasets = new Set(
      downstreamGraph.nodes.filter(n => n.id !== datasetId).map(n => n.dataset_id)
    );
    
    // Get column counts
    const { count: upstreamColumnCount } = await supabase
      .from('lineage')
      .select('*', { count: 'exact', head: true })
      .eq('downstream_dataset_id', datasetId);
    
    const { count: downstreamColumnCount } = await supabase
      .from('lineage')
      .select('*', { count: 'exact', head: true })
      .eq('upstream_dataset_id', datasetId);
    
    // Calculate depth
    const maxUpstreamDepth = this._calculateMaxDepth(upstreamGraph);
    const maxDownstreamDepth = this._calculateMaxDepth(downstreamGraph);
    
    // Find critical paths (longest paths)
    const criticalPaths = this._findCriticalPaths(upstreamGraph, downstreamGraph);
    
    // Count transformation types
    const allEdges = [...upstreamGraph.edges, ...downstreamGraph.edges];
    const transformationTypes = allEdges.reduce((acc, edge) => {
      acc[edge.mapping_type] = (acc[edge.mapping_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalUpstreamDatasets: upstreamDatasets.size,
      totalDownstreamDatasets: downstreamDatasets.size,
      totalUpstreamColumns: upstreamColumnCount || 0,
      totalDownstreamColumns: downstreamColumnCount || 0,
      maxUpstreamDepth,
      maxDownstreamDepth,
      criticalPaths,
      transformationTypes
    };
  }
  
  /**
   * Find all paths between two nodes
   */
  async findPaths(
    sourceNodeId: string,
    targetNodeId: string,
    nodeType: 'dataset' | 'column'
  ): Promise<LineagePath[]> {
    
    const graph = nodeType === 'dataset'
      ? await this.getDatasetLineage(sourceNodeId, 'downstream', 10)
      : await this.getColumnLineage(sourceNodeId, 'downstream', 10);
    
    const paths: LineagePath[] = [];
    
    // BFS to find all paths
    const queue: { nodeId: string; path: string[]; edges: LineageEdge[] }[] = [
      { nodeId: sourceNodeId, path: [sourceNodeId], edges: [] }
    ];
    
    while (queue.length > 0) {
      const { nodeId, path, edges: currentEdges } = queue.shift()!;
      
      if (nodeId === targetNodeId) {
        // Found a path
        const pathNodes = path.map(id => graph.nodes.find(n => n.id === id)!);
        const transformCount = currentEdges.filter(e => e.mapping_type === 'Transform').length;
        
        paths.push({
          nodes: pathNodes,
          edges: currentEdges,
          hops: path.length - 1,
          totalTransformations: transformCount
        });
        continue;
      }
      
      // Find outgoing edges
      const outgoingEdges = graph.edges.filter(e => e.source === nodeId);
      
      for (const edge of outgoingEdges) {
        if (!path.includes(edge.target)) {
          queue.push({
            nodeId: edge.target,
            path: [...path, edge.target],
            edges: [...currentEdges, edge]
          });
        }
      }
    }
    
    return paths;
  }
  
  /**
   * Get impact analysis for a dataset/column change
   */
  async getImpactAnalysis(
    nodeId: string,
    nodeType: 'dataset' | 'column'
  ): Promise<{
    affectedDatasets: number;
    affectedColumns: number;
    criticalImpacts: LineageNode[];
  }> {
    
    const graph = nodeType === 'dataset'
      ? await this.getDatasetLineage(nodeId, 'downstream', 10)
      : await this.getColumnLineage(nodeId, 'downstream', 10);
    
    const affectedDatasets = new Set(graph.nodes.map(n => n.dataset_id));
    const affectedColumns = new Set(graph.nodes.filter(n => n.type === 'column').map(n => n.column_id));
    
    // Identify critical impacts (Gold layer or published datasets)
    const criticalImpacts = graph.nodes.filter(n => 
      n.medallion_layer === 'Gold' || 
      n.entity_type === 'DataMart'
    );
    
    return {
      affectedDatasets: affectedDatasets.size - 1, // Exclude self
      affectedColumns: affectedColumns.size - 1,
      criticalImpacts
    };
  }
  
  // Private helper methods
  
  private async _traverseUpstream(
    datasetId: string,
    nodes: LineageNode[],
    edges: LineageEdge[],
    visited: Set<string>,
    maxDepth: number,
    currentDepth: number
  ): Promise<void> {
    
    if (currentDepth >= maxDepth) return;
    
    const { data: lineages } = await supabase
      .from('lineage')
      .select(`
        id,
        upstream_dataset_id,
        upstream_column_id,
        mapping_type,
        transformation_expression,
        lineage_type,
        upstream_dataset:datasets!lineage_upstream_dataset_id_fkey(*)
      `)
      .eq('downstream_dataset_id', datasetId);
    
    if (!lineages) return;
    
    for (const lineage of lineages) {
      const upstreamDataset = lineage.upstream_dataset;
      
      if (!visited.has(upstreamDataset.id)) {
        visited.add(upstreamDataset.id);
        
        nodes.push({
          id: upstreamDataset.id,
          type: 'dataset',
          dataset_id: upstreamDataset.id,
          dataset_name: upstreamDataset.name,
          dataset_fqn: upstreamDataset.fqn,
          entity_type: upstreamDataset.entity_type,
          entity_subtype: upstreamDataset.entity_subtype,
          medallion_layer: upstreamDataset.medallion_layer
        });
        
        edges.push({
          id: lineage.id,
          source: upstreamDataset.id,
          target: datasetId,
          mapping_type: lineage.mapping_type,
          transformation_expression: lineage.transformation_expression,
          lineage_type: lineage.lineage_type
        });
        
        // Recurse
        await this._traverseUpstream(
          upstreamDataset.id,
          nodes,
          edges,
          visited,
          maxDepth,
          currentDepth + 1
        );
      }
    }
  }
  
  private async _traverseDownstream(
    datasetId: string,
    nodes: LineageNode[],
    edges: LineageEdge[],
    visited: Set<string>,
    maxDepth: number,
    currentDepth: number
  ): Promise<void> {
    
    if (currentDepth >= maxDepth) return;
    
    const { data: lineages } = await supabase
      .from('lineage')
      .select(`
        id,
        downstream_dataset_id,
        downstream_column_id,
        mapping_type,
        transformation_expression,
        lineage_type,
        downstream_dataset:datasets!lineage_downstream_dataset_id_fkey(*)
      `)
      .eq('upstream_dataset_id', datasetId);
    
    if (!lineages) return;
    
    for (const lineage of lineages) {
      const downstreamDataset = lineage.downstream_dataset;
      
      if (!visited.has(downstreamDataset.id)) {
        visited.add(downstreamDataset.id);
        
        nodes.push({
          id: downstreamDataset.id,
          type: 'dataset',
          dataset_id: downstreamDataset.id,
          dataset_name: downstreamDataset.name,
          dataset_fqn: downstreamDataset.fqn,
          entity_type: downstreamDataset.entity_type,
          entity_subtype: downstreamDataset.entity_subtype,
          medallion_layer: downstreamDataset.medallion_layer
        });
        
        edges.push({
          id: lineage.id,
          source: datasetId,
          target: downstreamDataset.id,
          mapping_type: lineage.mapping_type,
          transformation_expression: lineage.transformation_expression,
          lineage_type: lineage.lineage_type
        });
        
        // Recurse
        await this._traverseDownstream(
          downstreamDataset.id,
          nodes,
          edges,
          visited,
          maxDepth,
          currentDepth + 1
        );
      }
    }
  }
  
  private async _traverseUpstreamColumns(
    columnId: string,
    nodes: LineageNode[],
    edges: LineageEdge[],
    visited: Set<string>,
    maxDepth: number,
    currentDepth: number
  ): Promise<void> {
    
    if (currentDepth >= maxDepth) return;
    
    const { data: lineages } = await supabase
      .from('lineage')
      .select(`
        id,
        upstream_column_id,
        mapping_type,
        transformation_expression,
        lineage_type,
        upstream_column:columns!lineage_upstream_column_id_fkey(
          *,
          dataset:datasets(*)
        )
      `)
      .eq('downstream_column_id', columnId);
    
    if (!lineages) return;
    
    for (const lineage of lineages) {
      const upstreamColumn = lineage.upstream_column;
      
      if (!visited.has(upstreamColumn.id)) {
        visited.add(upstreamColumn.id);
        
        nodes.push({
          id: upstreamColumn.id,
          type: 'column',
          dataset_id: upstreamColumn.dataset_id,
          dataset_name: upstreamColumn.dataset.name,
          dataset_fqn: upstreamColumn.dataset.fqn,
          entity_type: upstreamColumn.dataset.entity_type,
          entity_subtype: upstreamColumn.dataset.entity_subtype,
          medallion_layer: upstreamColumn.dataset.medallion_layer,
          column_id: upstreamColumn.id,
          column_name: upstreamColumn.name,
          column_data_type: upstreamColumn.data_type
        });
        
        edges.push({
          id: lineage.id,
          source: upstreamColumn.id,
          target: columnId,
          mapping_type: lineage.mapping_type,
          transformation_expression: lineage.transformation_expression,
          lineage_type: lineage.lineage_type
        });
        
        // Recurse
        await this._traverseUpstreamColumns(
          upstreamColumn.id,
          nodes,
          edges,
          visited,
          maxDepth,
          currentDepth + 1
        );
      }
    }
  }
  
  private async _traverseDownstreamColumns(
    columnId: string,
    nodes: LineageNode[],
    edges: LineageEdge[],
    visited: Set<string>,
    maxDepth: number,
    currentDepth: number
  ): Promise<void> {
    
    if (currentDepth >= maxDepth) return;
    
    const { data: lineages } = await supabase
      .from('lineage')
      .select(`
        id,
        downstream_column_id,
        mapping_type,
        transformation_expression,
        lineage_type,
        downstream_column:columns!lineage_downstream_column_id_fkey(
          *,
          dataset:datasets(*)
        )
      `)
      .eq('upstream_column_id', columnId);
    
    if (!lineages) return;
    
    for (const lineage of lineages) {
      const downstreamColumn = lineage.downstream_column;
      
      if (!visited.has(downstreamColumn.id)) {
        visited.add(downstreamColumn.id);
        
        nodes.push({
          id: downstreamColumn.id,
          type: 'column',
          dataset_id: downstreamColumn.dataset_id,
          dataset_name: downstreamColumn.dataset.name,
          dataset_fqn: downstreamColumn.dataset.fqn,
          entity_type: downstreamColumn.dataset.entity_type,
          entity_subtype: downstreamColumn.dataset.entity_subtype,
          medallion_layer: downstreamColumn.dataset.medallion_layer,
          column_id: downstreamColumn.id,
          column_name: downstreamColumn.name,
          column_data_type: downstreamColumn.data_type
        });
        
        edges.push({
          id: lineage.id,
          source: columnId,
          target: downstreamColumn.id,
          mapping_type: lineage.mapping_type,
          transformation_expression: lineage.transformation_expression,
          lineage_type: lineage.lineage_type
        });
        
        // Recurse
        await this._traverseDownstreamColumns(
          downstreamColumn.id,
          nodes,
          edges,
          visited,
          maxDepth,
          currentDepth + 1
        );
      }
    }
  }
  
  private _calculateMaxDepth(graph: LineageGraph): number {
    // BFS from root to find max depth
    const visited = new Set<string>();
    const queue: { nodeId: string; depth: number }[] = [
      { nodeId: graph.rootNodeId, depth: 0 }
    ];
    let maxDepth = 0;
    
    while (queue.length > 0) {
      const { nodeId, depth } = queue.shift()!;
      
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      
      maxDepth = Math.max(maxDepth, depth);
      
      const outgoingEdges = graph.edges.filter(e => e.source === nodeId);
      for (const edge of outgoingEdges) {
        queue.push({ nodeId: edge.target, depth: depth + 1 });
      }
    }
    
    return maxDepth;
  }
  
  private _findCriticalPaths(
    upstreamGraph: LineageGraph,
    downstreamGraph: LineageGraph
  ): LineagePath[] {
    // Find top 5 longest paths
    const allPaths: LineagePath[] = [];
    
    // Simplified: just return paths with most transformations
    // In production, implement proper path finding
    
    return allPaths.slice(0, 5);
  }
}

export const lineageService = new LineageService();
```

---

## 4. UI Components

### 4.1 Lineage Diagram Component

```typescript
// frontend/src/components/Lineage/LineageDiagram.tsx

import React, { useEffect, useState, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
  Panel
} from 'reactflow';
import 'reactflow/dist/style.css';
import { LineageGraph, LineageViewState } from '@/types/lineage';
import { lineageService } from '@/lib/lineage-service';
import { LineageNode as LineageNodeComponent } from './LineageNode';
import { LineageEdge as LineageEdgeComponent } from './LineageEdge';
import { LineageControls } from './LineageControls';
import { LineageAnalysisPanel } from './LineageAnalysisPanel';
import { getLayoutedElements } from '@/lib/layout-utils';

const nodeTypes = {
  lineageNode: LineageNodeComponent
};

const edgeTypes = {
  lineageEdge: LineageEdgeComponent
};

interface LineageDiagramProps {
  rootNodeId: string;
  rootNodeType: 'dataset' | 'column';
  onClose: () => void;
}

export function LineageDiagram({
  rootNodeId,
  rootNodeType,
  onClose
}: LineageDiagramProps) {
  
  const [viewState, setViewState] = useState<LineageViewState>({
    viewType: rootNodeType,
    direction: 'both',
    selectedNodeId: rootNodeId,
    selectedPath: null,
    highlightedNodes: new Set(),
    highlightedEdges: new Set(),
    filters: {
      mappingTypes: [],
      medallionLayers: [],
      entityTypes: []
    },
    layout: 'hierarchical',
    showLabels: true,
    showTransformations: true
  });
  
  const [lineageGraph, setLineageGraph] = useState<LineageGraph | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(false);
  
  // Load lineage data
  useEffect(() => {
    loadLineage();
  }, [rootNodeId, rootNodeType, viewState.direction, viewState.viewType]);
  
  const loadLineage = async () => {
    setIsLoading(true);
    
    try {
      const graph = viewState.viewType === 'dataset'
        ? await lineageService.getDatasetLineage(rootNodeId, viewState.direction, 5)
        : await lineageService.getColumnLineage(rootNodeId, viewState.direction, 5);
      
      setLineageGraph(graph);
      
      // Convert to React Flow format
      const flowNodes = graph.nodes.map(node => ({
        id: node.id,
        type: 'lineageNode',
        data: {
          ...node,
          isRoot: node.id === rootNodeId,
          isHighlighted: viewState.highlightedNodes.has(node.id),
          viewType: viewState.viewType
        },
        position: { x: 0, y: 0 } // Will be calculated by layout
      }));
      
      const flowEdges = graph.edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: 'lineageEdge',
        data: {
          ...edge,
          isHighlighted: viewState.highlightedEdges.has(edge.id),
          showTransformation: viewState.showTransformations
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 20,
          height: 20
        },
        animated: edge.mapping_type === 'Transform'
      }));
      
      // Apply layout
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        flowNodes,
        flowEdges,
        viewState.layout
      );
      
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      
    } catch (error) {
      console.error('Failed to load lineage:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle node click
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setViewState(prev => ({
      ...prev,
      selectedNodeId: node.id
    }));
    
    // Highlight path from root to this node
    if (lineageGraph) {
      const path = findPathBetweenNodes(lineageGraph.rootNodeId, node.id);
      if (path) {
        setViewState(prev => ({
          ...prev,
          selectedPath: path.nodeIds,
          highlightedNodes: new Set(path.nodeIds),
          highlightedEdges: new Set(path.edgeIds)
        }));
      }
    }
  }, [lineageGraph]);
  
  // Handle edge click
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    // Show transformation details
    console.log('Edge clicked:', edge);
  }, []);
  
  // Toggle view type
  const toggleViewType = useCallback(() => {
    setViewState(prev => ({
      ...prev,
      viewType: prev.viewType === 'dataset' ? 'column' : 'dataset'
    }));
  }, []);
  
  // Change direction
  const changeDirection = useCallback((direction: 'upstream' | 'downstream' | 'both') => {
    setViewState(prev => ({ ...prev, direction }));
  }, []);
  
  // Change layout
  const changeLayout = useCallback((layout: 'hierarchical' | 'force' | 'circular') => {
    setViewState(prev => ({ ...prev, layout }));
  }, []);
  
  // Clear highlights
  const clearHighlights = useCallback(() => {
    setViewState(prev => ({
      ...prev,
      selectedPath: null,
      highlightedNodes: new Set(),
      highlightedEdges: new Set()
    }));
  }, []);
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading lineage...</div>
      </div>
    );
  }
  
  return (
    <div className="w-full h-full relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as any;
            if (data.isRoot) return '#ef4444'; // red
            if (data.isHighlighted) return '#3b82f6'; // blue
            return '#6b7280'; // gray
          }}
        />
        
        <Panel position="top-left">
          <LineageControls
            viewState={viewState}
            onToggleViewType={toggleViewType}
            onChangeDirection={changeDirection}
            onChangeLayout={changeLayout}
            onClearHighlights={clearHighlights}
            onToggleAnalysis={() => setShowAnalysis(!showAnalysis)}
            onClose={onClose}
          />
        </Panel>
        
        {showAnalysis && lineageGraph && (
          <Panel position="top-right">
            <LineageAnalysisPanel
              rootNodeId={rootNodeId}
              rootNodeType={rootNodeType}
              onClose={() => setShowAnalysis(false)}
            />
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}

// Helper function
function findPathBetweenNodes(sourceId: string, targetId: string): {
  nodeIds: string[];
  edgeIds: string[];
} | null {
  // BFS to find path
  // Implementation details...
  return null;
}
```

### 4.2 Lineage Node Component

```typescript
// frontend/src/components/Lineage/LineageNode.tsx

import React, { memo } from 'react';
import { Handle, Position } from 'reactflow';
import { LineageNode as LineageNodeType } from '@/types/lineage';
import { 
  Database, 
  Table2, 
  Columns, 
  Hexagon,
  Link as LinkIcon,
  Sparkles,
  TrendingUp
} from 'lucide-react';

interface LineageNodeProps {
  data: LineageNodeType & {
    isRoot: boolean;
    isHighlighted: boolean;
    viewType: 'dataset' | 'column';
  };
}

export const LineageNode = memo(({ data }: LineageNodeProps) => {
  
  const getIcon = () => {
    if (data.viewType === 'column') {
      return <Columns className="w-4 h-4" />;
    }
    
    switch (data.entity_subtype) {
      case 'Hub':
        return <Hexagon className="w-4 h-4" />;
      case 'Link':
        return <LinkIcon className="w-4 h-4" />;
      case 'Satellite':
        return <Sparkles className="w-4 h-4" />;
      case 'Dimension':
        return <Database className="w-4 h-4" />;
      case 'Fact':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Table2 className="w-4 h-4" />;
    }
  };
  
  const getLayerColor = () => {
    const colors = {
      Raw: 'border-gray-400 bg-gray-50',
      Bronze: 'border-amber-600 bg-amber-50',
      Silver: 'border-gray-400 bg-gray-100',
      Gold: 'border-yellow-500 bg-yellow-50'
    };
    return colors[data.medallion_layer as keyof typeof colors] || 'border-gray-300 bg-white';
  };
  
  const nodeClasses = [
    'px-4 py-2 rounded-lg border-2 shadow-md',
    'transition-all duration-200',
    getLayerColor(),
    data.isRoot && 'ring-4 ring-red-500',
    data.isHighlighted && 'ring-2 ring-blue-500 shadow-lg'
  ].filter(Boolean).join(' ');
  
  return (
    <div className={nodeClasses}>
      <Handle type="target" position={Position.Top} />
      
      <div className="flex items-center gap-2">
        {getIcon()}
        <div>
          <div className="font-semibold text-sm">
            {data.viewType === 'column' ? data.column_name : data.dataset_name}
          </div>
          {data.viewType === 'column' && (
            <div className="text-xs text-gray-500">{data.column_data_type}</div>
          )}
          {data.viewType === 'dataset' && (
            <div className="text-xs text-gray-500">{data.entity_subtype || data.entity_type}</div>
          )}
        </div>
      </div>
      
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
});

LineageNode.displayName = 'LineageNode';
```

### 4.3 Lineage Controls Component

```typescript
// frontend/src/components/Lineage/LineageControls.tsx

import React from 'react';
import { LineageViewState } from '@/types/lineage';
import {
  X,
  ArrowUp,
  ArrowDown,
  ArrowLeftRight,
  Table2,
  Columns,
  Network,
  BarChart3,
  Eraser
} from 'lucide-react';

interface LineageControlsProps {
  viewState: LineageViewState;
  onToggleViewType: () => void;
  onChangeDirection: (direction: 'upstream' | 'downstream' | 'both') => void;
  onChangeLayout: (layout: 'hierarchical' | 'force' | 'circular') => void;
  onClearHighlights: () => void;
  onToggleAnalysis: () => void;
  onClose: () => void;
}

export function LineageControls({
  viewState,
  onToggleViewType,
  onChangeDirection,
  onChangeLayout,
  onClearHighlights,
  onToggleAnalysis,
  onClose
}: LineageControlsProps) {
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-3 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Lineage View</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {/* View Type Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600">View:</span>
        <button
          onClick={onToggleViewType}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
            viewState.viewType === 'dataset'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          <Table2 className="w-3 h-3" />
          Dataset
        </button>
        <button
          onClick={onToggleViewType}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
            viewState.viewType === 'column'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          <Columns className="w-3 h-3" />
          Column
        </button>
      </div>
      
      {/* Direction */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600">Direction:</span>
        <button
          onClick={() => onChangeDirection('upstream')}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
            viewState.direction === 'upstream'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          <ArrowUp className="w-3 h-3" />
          Upstream
        </button>
        <button
          onClick={() => onChangeDirection('downstream')}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
            viewState.direction === 'downstream'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          <ArrowDown className="w-3 h-3" />
          Downstream
        </button>
        <button
          onClick={() => onChangeDirection('both')}
          className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
            viewState.direction === 'both'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 text-gray-700'
          }`}
        >
          <ArrowLeftRight className="w-3 h-3" />
          Both
        </button>
      </div>
      
      {/* Layout */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-600">Layout:</span>
        <select
          value={viewState.layout}
          onChange={(e) => onChangeLayout(e.target.value as any)}
          className="text-xs border rounded px-2 py-1"
        >
          <option value="hierarchical">Hierarchical</option>
          <option value="force">Force-Directed</option>
          <option value="circular">Circular</option>
        </select>
      </div>
      
      {/* Actions */}
      <div className="flex flex-col gap-1 pt-2 border-t">
        <button
          onClick={onClearHighlights}
          className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-gray-100 rounded"
        >
          <Eraser className="w-3 h-3" />
          Clear Highlights
        </button>
        <button
          onClick={onToggleAnalysis}
          className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-gray-100 rounded"
        >
          <BarChart3 className="w-3 h-3" />
          Show Analysis
        </button>
      </div>
    </div>
  );
}
```

### 4.4 Lineage Analysis Panel

```typescript
// frontend/src/components/Lineage/LineageAnalysisPanel.tsx

import React, { useEffect, useState } from 'react';
import { X, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { lineageService } from '@/lib/lineage-service';
import { LineageAnalysis } from '@/types/lineage';

interface LineageAnalysisPanelProps {
  rootNodeId: string;
  rootNodeType: 'dataset' | 'column';
  onClose: () => void;
}

export function LineageAnalysisPanel({
  rootNodeId,
  rootNodeType,
  onClose
}: LineageAnalysisPanelProps) {
  
  const [analysis, setAnalysis] = useState<LineageAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    loadAnalysis();
  }, [rootNodeId]);
  
  const loadAnalysis = async () => {
    setIsLoading(true);
    try {
      const result = await lineageService.analyzeLineage(rootNodeId);
      setAnalysis(result);
    } catch (error) {
      console.error('Failed to load analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-4 w-80">
        <div>Loading analysis...</div>
      </div>
    );
  }
  
  if (!analysis) {
    return null;
  }
  
  return (
    <div className="bg-white rounded-lg shadow-lg p-4 w-80 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Lineage Analysis</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-100 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {/* Metrics */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-gray-600">
            <TrendingUp className="w-4 h-4 text-green-500" />
            Upstream Datasets
          </span>
          <span className="font-semibold">{analysis.totalUpstreamDatasets}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-gray-600">
            <TrendingDown className="w-4 h-4 text-blue-500" />
            Downstream Datasets
          </span>
          <span className="font-semibold">{analysis.totalDownstreamDatasets}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Upstream Columns</span>
          <span className="font-semibold">{analysis.totalUpstreamColumns}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Downstream Columns</span>
          <span className="font-semibold">{analysis.totalDownstreamColumns}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Max Upstream Depth</span>
          <span className="font-semibold">{analysis.maxUpstreamDepth}</span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Max Downstream Depth</span>
          <span className="font-semibold">{analysis.maxDownstreamDepth}</span>
        </div>
      </div>
      
      {/* Transformation Types */}
      <div className="pt-2 border-t">
        <h4 className="text-sm font-semibold mb-2">Transformation Types</h4>
        <div className="space-y-1">
          {Object.entries(analysis.transformationTypes).map(([type, count]) => (
            <div key={type} className="flex items-center justify-between text-xs">
              <span className="text-gray-600">{type}</span>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Critical Paths */}
      {analysis.criticalPaths.length > 0 && (
        <div className="pt-2 border-t">
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500" />
            Critical Paths
          </h4>
          <div className="space-y-1 text-xs text-gray-600">
            {analysis.criticalPaths.map((path, idx) => (
              <div key={idx}>
                Path {idx + 1}: {path.hops} hops, {path.totalTransformations} transforms
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## 5. Integration Points

### 5.1 Dataset Context Menu Integration

```typescript
// In DatasetContextMenu.tsx - Add lineage option

{
  icon: <Network className="w-4 h-4" />,
  label: 'View Lineage',
  onClick: () => onViewLineage(dataset.id)
}
```

### 5.2 Column Context Menu Integration

```typescript
// Add to column row actions

<button
  onClick={() => onViewLineage(column.id, 'column')}
  className="p-1 hover:bg-gray-100 rounded"
  title="View Column Lineage"
>
  <Network className="w-3 h-3" />
</button>
```

### 5.3 Diagram View Integration

```typescript
// In any diagram view, add right-click handler

const handleNodeRightClick = (event: React.MouseEvent, node: Node) => {
  event.preventDefault();
  setContextMenu({
    x: event.clientX,
    y: event.clientY,
    options: [
      {
        label: 'View Lineage',
        onClick: () => openLineageDiagram(node.id)
      },
      // ... other options
    ]
  });
};
```

---

## 6. Testing Strategy

### 6.1 Unit Tests

```typescript
// Test lineage service methods
describe('LineageService', () => {
  
  test('getDatasetLineage returns correct graph structure', async () => {
    const graph = await lineageService.getDatasetLineage('dataset-1', 'both', 3);
    
    expect(graph.nodes).toBeDefined();
    expect(graph.edges).toBeDefined();
    expect(graph.rootNodeId).toBe('dataset-1');
  });
  
  test('getColumnLineage traverses multiple hops', async () => {
    const graph = await lineageService.getColumnLineage('column-1', 'downstream', 5);
    
    expect(graph.depth).toBe(5);
    expect(graph.nodes.every(n => n.type === 'column')).toBe(true);
  });
  
  test('analyzeLineage provides accurate metrics', async () => {
    const analysis = await lineageService.analyzeLineage('dataset-1');
    
    expect(analysis.totalUpstreamDatasets).toBeGreaterThanOrEqual(0);
    expect(analysis.transformationTypes).toBeDefined();
  });
  
  test('findPaths returns all paths between nodes', async () => {
    const paths = await lineageService.findPaths('source-1', 'target-1', 'dataset');
    
    expect(Array.isArray(paths)).toBe(true);
    paths.forEach(path => {
      expect(path.nodes[0].id).toBe('source-1');
      expect(path.nodes[path.nodes.length - 1].id).toBe('target-1');
    });
  });
});
```

### 6.2 Integration Tests

```typescript
// Test full lineage workflow
describe('Lineage Diagram Integration', () => {
  
  test('renders lineage diagram from dataset', async () => {
    render(<LineageDiagram rootNodeId="dataset-1" rootNodeType="dataset" onClose={jest.fn()} />);
    
    await waitFor(() => {
      expect(screen.getByText(/Loading lineage/)).not.toBeInTheDocument();
    });
    
    expect(screen.getByText('Dataset View')).toBeInTheDocument();
  });
  
  test('toggles between dataset and column view', async () => {
    const { user } = renderWithUser(<LineageDiagram />);
    
    await user.click(screen.getByText('Column'));
    
    expect(await screen.findByText('Column View')).toBeInTheDocument();
  });
  
  test('highlights path on node click', async () => {
    const { user } = renderWithUser(<LineageDiagram />);
    
    const node = screen.getByText('target-dataset');
    await user.click(node);
    
    // Verify highlights applied
    expect(node.parentElement).toHaveClass('ring-2 ring-blue-500');
  });
});
```

---

## 7. Performance Considerations

### 7.1 Query Optimization

- **Indexed Queries**: All lineage queries use indexed columns
- **Depth Limiting**: Configurable max depth to prevent runaway queries
- **Cycle Detection**: Prevent infinite loops in recursive queries
- **Caching**: Cache lineage graphs for frequently accessed datasets

### 7.2 UI Optimization

- **Virtual Rendering**: Only render nodes in viewport
- **Lazy Loading**: Load lineage on-demand when user opens diagram
- **Debounced Updates**: Debounce highlight updates
- **Memoization**: Memoize expensive calculations (layout, path finding)

### 7.3 Scalability

- **Pagination**: For extremely large lineage graphs, paginate nodes
- **Filtering**: Allow users to filter lineage by layer, type
- **Aggregation**: Show dataset-level lineage first, drill to columns
- **Progressive Loading**: Load immediate hops first, then expand

---

## 8. Future Enhancements

### 8.1 Advanced Features

- **Lineage Search**: Full-text search across lineage
- **Lineage Diffing**: Compare lineage between versions
- **Lineage Validation**: Detect broken lineage
- **Lineage Export**: Export lineage as PDF, JSON, CSV
- **Lineage Versioning**: Track lineage changes over time
- **Lineage Notifications**: Alert on lineage changes
- **AI-Powered Insights**: Use AI to suggest optimizations

### 8.2 Integration Enhancements

- **dbt Integration**: Import dbt lineage
- **Tableau/PowerBI**: Show BI tool lineage
- **Data Catalog**: Sync with data catalog systems
- **Governance**: Integrate with data governance policies

---

## Success Metrics

- **Lineage Query Performance**: < 2s for 100-node graphs
- **UI Responsiveness**: < 500ms for interactions
- **Accuracy**: 100% lineage accuracy
- **User Adoption**: > 80% of users use lineage feature
- **Support Tickets**: < 5% related to lineage issues

