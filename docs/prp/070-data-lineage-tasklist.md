# Data Lineage - Detailed Task List

## Phase 7.1: Foundation & Service Layer (Week 1)

### 7.1.1 Database Query Optimization
- [ ] **7.1.1.1** Review existing lineage table indexes
- [ ] **7.1.1.2** Add composite indexes for common query patterns:
  ```sql
  CREATE INDEX idx_lineage_downstream_mapping ON lineage(downstream_dataset_id, mapping_type);
  CREATE INDEX idx_lineage_upstream_mapping ON lineage(upstream_dataset_id, mapping_type);
  ```
- [ ] **7.1.1.3** Create materialized view for dataset-level lineage aggregation
- [ ] **7.1.1.4** Test query performance with sample data (1000+ lineage records)
- [ ] **7.1.1.5** Document query patterns and performance benchmarks

**Files**:
- `backend/migrations/007_lineage_optimization.sql`
- `docs/lineage-query-performance.md`

### 7.1.2 TypeScript Type Definitions
- [ ] **7.1.2.1** Create `frontend/src/types/lineage.ts`
- [ ] **7.1.2.2** Define `LineageNode` interface
- [ ] **7.1.2.3** Define `LineageEdge` interface
- [ ] **7.1.2.4** Define `LineageGraph` interface
- [ ] **7.1.2.5** Define `LineagePath` interface
- [ ] **7.1.2.6** Define `LineageAnalysis` interface
- [ ] **7.1.2.7** Define `LineageViewState` interface
- [ ] **7.1.2.8** Export all types from `frontend/src/types/index.ts`
- [ ] **7.1.2.9** Add JSDoc comments for all interfaces
- [ ] **7.1.2.10** Write unit tests for type validation

**Files**:
- `frontend/src/types/lineage.ts` ✅ Created
- `frontend/src/types/index.ts` (update)

### 7.1.3 Lineage Service - Core Methods
- [ ] **7.1.3.1** Create `frontend/src/lib/lineage-service.ts`
- [ ] **7.1.3.2** Implement `getDatasetLineage(datasetId, direction, maxDepth)`
  - Fetch root dataset
  - Initialize graph structure
  - Call traversal methods based on direction
  - Return formatted LineageGraph
- [ ] **7.1.3.3** Implement `getColumnLineage(columnId, direction, maxDepth)`
  - Fetch root column with dataset info
  - Initialize graph structure
  - Call column traversal methods
  - Return formatted LineageGraph
- [ ] **7.1.3.4** Add error handling and retry logic
- [ ] **7.1.3.5** Add logging for debugging
- [ ] **7.1.3.6** Write unit tests (80% coverage)

**Files**:
- `frontend/src/lib/lineage-service.ts` ✅ Created
- `frontend/src/lib/__tests__/lineage-service.test.ts`

### 7.1.4 Lineage Service - Traversal Methods
- [ ] **7.1.4.1** Implement `_traverseUpstream()` (dataset-level)
  - Query lineage table for upstream datasets
  - Recursively traverse up to maxDepth
  - Track visited nodes to prevent cycles
  - Add nodes and edges to graph
- [ ] **7.1.4.2** Implement `_traverseDownstream()` (dataset-level)
  - Query lineage table for downstream datasets
  - Recursively traverse down to maxDepth
  - Track visited nodes
  - Add nodes and edges to graph
- [ ] **7.1.4.3** Implement `_traverseUpstreamColumns()` (column-level)
  - Query for upstream columns
  - Include dataset context
  - Handle column-to-column mappings
  - Recursive traversal with cycle detection
- [ ] **7.1.4.4** Implement `_traverseDownstreamColumns()` (column-level)
  - Query for downstream columns
  - Include dataset context
  - Handle complex transformations
  - Recursive traversal
- [ ] **7.1.4.5** Add cycle detection logic
- [ ] **7.1.4.6** Optimize for large graphs (memoization, pruning)
- [ ] **7.1.4.7** Write unit tests for traversal logic

**Files**:
- `frontend/src/lib/lineage-service.ts` (update)
- `frontend/src/lib/__tests__/lineage-traversal.test.ts`

### 7.1.5 Lineage Service - Analysis Methods
- [ ] **7.1.5.1** Implement `analyzeLineage(datasetId)`
  - Get upstream and downstream graphs
  - Count unique datasets and columns
  - Calculate max depth for both directions
  - Find critical paths
  - Count transformation types
  - Return LineageAnalysis object
- [ ] **7.1.5.2** Implement `findPaths(sourceId, targetId, nodeType)`
  - Use BFS to find all paths
  - Support dataset and column paths
  - Return paths sorted by length
  - Limit to top 10 paths
- [ ] **7.1.5.3** Implement `getImpactAnalysis(nodeId, nodeType)`
  - Get downstream lineage
  - Count affected datasets and columns
  - Identify critical impacts (Gold layer, DataMarts)
  - Return impact summary
- [ ] **7.1.5.4** Implement `_calculateMaxDepth()` helper
  - Use BFS from root node
  - Track depth at each level
  - Return maximum depth found
- [ ] **7.1.5.5** Implement `_findCriticalPaths()` helper
  - Identify longest paths
  - Prioritize paths with most transformations
  - Return top 5 critical paths
- [ ] **7.1.5.6** Add performance optimization (caching)
- [ ] **7.1.5.7** Write unit tests for analysis methods

**Files**:
- `frontend/src/lib/lineage-service.ts` (update)
- `frontend/src/lib/__tests__/lineage-analysis.test.ts`

### 7.1.6 Lineage Service - Utility Methods
- [ ] **7.1.6.1** Implement `validateLineage(lineageId)` - Check if lineage record is valid
- [ ] **7.1.6.2** Implement `detectCycles(graph)` - Find circular dependencies
- [ ] **7.1.6.3** Implement `simplifyGraph(graph, threshold)` - Reduce graph complexity
- [ ] **7.1.6.4** Implement `exportLineage(graph, format)` - Export as JSON/CSV
- [ ] **7.1.6.5** Add graph statistics helper methods
- [ ] **7.1.6.6** Write utility tests

**Files**:
- `frontend/src/lib/lineage-service.ts` (update)
- `frontend/src/lib/__tests__/lineage-utils.test.ts`

---

## Phase 7.2: Layout & Visualization (Week 2)

### 7.2.1 Graph Layout Algorithms
- [ ] **7.2.1.1** Create `frontend/src/lib/layout-utils.ts`
- [ ] **7.2.1.2** Implement hierarchical layout algorithm
  - Use dagre or elkjs
  - Layer nodes by depth
  - Minimize edge crossings
  - Center root node
- [ ] **7.2.1.3** Implement force-directed layout
  - Use d3-force simulation
  - Apply attraction/repulsion forces
  - Stabilize positions
- [ ] **7.2.1.4** Implement circular layout
  - Arrange nodes in circles by depth
  - Place root at center
- [ ] **7.2.1.5** Create `getLayoutedElements(nodes, edges, type)` function
- [ ] **7.2.1.6** Add configuration options for each layout
- [ ] **7.2.1.7** Optimize layout performance for large graphs
- [ ] **7.2.1.8** Write layout tests

**Files**:
- `frontend/src/lib/layout-utils.ts` ✅ Created
- `frontend/src/lib/__tests__/layout-utils.test.ts`

**Dependencies**:
```json
{
  "dagre": "^0.8.5",
  "@types/dagre": "^0.7.52",
  "d3-force": "^3.0.0"
}
```

### 7.2.2 React Flow Setup
- [ ] **7.2.2.1** Install React Flow dependencies
  ```bash
  npm install reactflow
  ```
- [ ] **7.2.2.2** Configure React Flow theme/styling
- [ ] **7.2.2.3** Create custom node types registry
- [ ] **7.2.2.4** Create custom edge types registry
- [ ] **7.2.2.5** Setup viewport controls configuration
- [ ] **7.2.2.6** Configure minimap settings
- [ ] **7.2.2.7** Add React Flow CSS imports

**Files**:
- `package.json` (update)
- `frontend/src/styles/reactflow-custom.css`

### 7.2.3 Lineage Node Component
- [ ] **7.2.3.1** Create `frontend/src/components/Lineage/LineageNode.tsx`
- [ ] **7.2.3.2** Design node visual structure
  - Header with icon
  - Node name/label
  - Type indicator
  - Layer badge
- [ ] **7.2.3.3** Implement color coding by medallion layer
- [ ] **7.2.3.4** Add icon mapping for entity types/subtypes
  - Hub → Hexagon
  - Link → Link icon
  - Satellite → Sparkles
  - Dimension → Database
  - Fact → TrendingUp
  - Generic → Table2
- [ ] **7.2.3.5** Implement root node highlighting (red ring)
- [ ] **7.2.3.6** Implement selection highlighting (blue ring)
- [ ] **7.2.3.7** Add hover effects
- [ ] **7.2.3.8** Support both dataset and column views
  - Show column name + data type for column view
  - Show dataset name + entity type for dataset view
- [ ] **7.2.3.9** Add React Flow handles (top/bottom)
- [ ] **7.2.3.10** Optimize rendering with React.memo
- [ ] **7.2.3.11** Add accessibility attributes
- [ ] **7.2.3.12** Write component tests

**Files**:
- `frontend/src/components/Lineage/LineageNode.tsx` ✅ Created
- `frontend/src/components/Lineage/__tests__/LineageNode.test.tsx`

### 7.2.4 Lineage Edge Component
- [ ] **7.2.4.1** Create `frontend/src/components/Lineage/LineageEdge.tsx`
- [ ] **7.2.4.2** Implement edge styling by mapping type
  - Direct → Solid green
  - Transform → Animated blue
  - Derived → Dashed orange
  - Calculated → Dotted purple
- [ ] **7.2.4.3** Add arrow markers
- [ ] **7.2.4.4** Display transformation expression on hover
- [ ] **7.2.4.5** Implement edge highlighting
- [ ] **7.2.4.6** Add edge labels (mapping type)
- [ ] **7.2.4.7** Support click to show transformation details
- [ ] **7.2.4.8** Optimize rendering
- [ ] **7.2.4.9** Write component tests

**Files**:
- `frontend/src/components/Lineage/LineageEdge.tsx` ✅ Created
- `frontend/src/components/Lineage/__tests__/LineageEdge.test.tsx`

### 7.2.5 Lineage Controls Component
- [ ] **7.2.5.1** Create `frontend/src/components/Lineage/LineageControls.tsx`
- [ ] **7.2.5.2** Build header with title and close button
- [ ] **7.2.5.3** Add view type toggle (Dataset/Column)
- [ ] **7.2.5.4** Add direction buttons (Upstream/Downstream/Both)
- [ ] **7.2.5.5** Add layout selector dropdown
- [ ] **7.2.5.6** Add "Clear Highlights" button
- [ ] **7.2.5.7** Add "Show Analysis" button
- [ ] **7.2.5.8** Add toggle for labels
- [ ] **7.2.5.9** Add toggle for transformations
- [ ] **7.2.5.10** Style as floating panel
- [ ] **7.2.5.11** Make responsive
- [ ] **7.2.5.12** Write component tests

**Files**:
- `frontend/src/components/Lineage/LineageControls.tsx` ✅ Created
- `frontend/src/components/Lineage/__tests__/LineageControls.test.tsx`

### 7.2.6 Lineage Analysis Panel Component
- [ ] **7.2.6.1** Create `frontend/src/components/Lineage/LineageAnalysisPanel.tsx`
- [ ] **7.2.6.2** Build panel header with close button
- [ ] **7.2.6.3** Display upstream/downstream dataset counts
- [ ] **7.2.6.4** Display upstream/downstream column counts
- [ ] **7.2.6.5** Show max depth metrics
- [ ] **7.2.6.6** List transformation type breakdown
- [ ] **7.2.6.7** Show critical paths section
- [ ] **7.2.6.8** Add loading state
- [ ] **7.2.6.9** Add error handling
- [ ] **7.2.6.10** Style as floating panel
- [ ] **7.2.6.11** Add icons for visual appeal
- [ ] **7.2.6.12** Write component tests

**Files**:
- `frontend/src/components/Lineage/LineageAnalysisPanel.tsx` ✅ Created
- `frontend/src/components/Lineage/__tests__/LineageAnalysisPanel.test.tsx`

---

## Phase 7.3: Main Lineage Diagram Component (Week 3)

### 7.3.1 Lineage Diagram - Core Structure
- [ ] **7.3.1.1** Create `frontend/src/components/Lineage/LineageDiagram.tsx`
- [ ] **7.3.1.2** Define component props interface
  - rootNodeId: string
  - rootNodeType: 'dataset' | 'column'
  - onClose: () => void
- [ ] **7.3.1.3** Initialize React Flow state
  - useNodesState hook
  - useEdgesState hook
- [ ] **7.3.1.4** Create LineageViewState state
- [ ] **7.3.1.5** Setup loading and error states
- [ ] **7.3.1.6** Register custom node types
- [ ] **7.3.1.7** Register custom edge types
- [ ] **7.3.1.8** Add basic React Flow component structure

**Files**:
- `frontend/src/components/Lineage/LineageDiagram.tsx` ✅ Created

### 7.3.2 Lineage Diagram - Data Loading
- [ ] **7.3.2.1** Implement `loadLineage()` function
  - Call lineageService based on viewType
  - Handle errors gracefully
  - Set loading states
- [ ] **7.3.2.2** Convert LineageGraph to React Flow format
  - Map nodes to React Flow nodes
  - Map edges to React Flow edges
  - Apply layout algorithm
  - Set initial positions
- [ ] **7.3.2.3** Add useEffect to load on mount
- [ ] **7.3.2.4** Add useEffect to reload on viewState changes
- [ ] **7.3.2.5** Implement refresh functionality
- [ ] **7.3.2.6** Add debouncing for rapid changes
- [ ] **7.3.2.7** Test loading with various datasets

**Files**:
- `frontend/src/components/Lineage/LineageDiagram.tsx` (update)

### 7.3.3 Lineage Diagram - Interaction Handlers
- [ ] **7.3.3.1** Implement `onNodeClick` handler
  - Update selectedNodeId
  - Find path from root to clicked node
  - Highlight path nodes and edges
  - Update viewState
- [ ] **7.3.3.2** Implement `onEdgeClick` handler
  - Show transformation details modal
  - Display mapping type and expression
- [ ] **7.3.3.3** Implement `onNodeHover` handler (optional)
  - Show tooltip with node details
- [ ] **7.3.3.4** Implement `onPaneClick` handler
  - Clear selections
  - Reset highlights
- [ ] **7.3.3.5** Add keyboard shortcuts
  - Escape → Clear selection
  - F → Fit view
  - 1/2/3 → Change layout
- [ ] **7.3.3.6** Test all interactions

**Files**:
- `frontend/src/components/Lineage/LineageDiagram.tsx` (update)

### 7.3.4 Lineage Diagram - View State Management
- [ ] **7.3.4.1** Implement `toggleViewType()` callback
  - Switch between dataset and column
  - Reload lineage
  - Reset highlights
- [ ] **7.3.4.2** Implement `changeDirection()` callback
  - Update direction state
  - Reload lineage
- [ ] **7.3.4.3** Implement `changeLayout()` callback
  - Recalculate positions
  - Animate transition
- [ ] **7.3.4.4** Implement `clearHighlights()` callback
  - Reset highlighted nodes/edges
  - Clear selected path
- [ ] **7.3.4.5** Implement `toggleAnalysis()` callback
  - Show/hide analysis panel
- [ ] **7.3.4.6** Add state persistence (localStorage)
- [ ] **7.3.4.7** Test state transitions

**Files**:
- `frontend/src/components/Lineage/LineageDiagram.tsx` (update)

### 7.3.5 Lineage Diagram - Path Highlighting
- [ ] **7.3.5.1** Implement `findPathBetweenNodes()` helper
  - Use BFS to find path
  - Return array of node IDs and edge IDs
- [ ] **7.3.5.2** Implement `highlightPath()` function
  - Update node data with isHighlighted
  - Update edge data with isHighlighted
  - Apply visual styles
- [ ] **7.3.5.3** Implement `clearPath()` function
  - Remove highlights
  - Reset visual styles
- [ ] **7.3.5.4** Add animation for highlight transitions
- [ ] **7.3.5.5** Test path highlighting

**Files**:
- `frontend/src/components/Lineage/LineageDiagram.tsx` (update)
- `frontend/src/lib/path-utils.ts`

### 7.3.6 Lineage Diagram - Performance Optimization
- [ ] **7.3.6.1** Implement viewport culling (hide off-screen nodes)
- [ ] **7.3.6.2** Add virtualization for large graphs (1000+ nodes)
- [ ] **7.3.6.3** Memoize expensive calculations
  - Layout calculation
  - Path finding
  - Node/edge data mapping
- [ ] **7.3.6.4** Debounce zoom/pan events
- [ ] **7.3.6.5** Lazy load analysis data
- [ ] **7.3.6.6** Add loading skeleton for initial render
- [ ] **7.3.6.7** Profile and optimize render performance
- [ ] **7.3.6.8** Test with large datasets (500+ nodes)

**Files**:
- `frontend/src/components/Lineage/LineageDiagram.tsx` (update)

### 7.3.7 Lineage Diagram - Export & Actions
- [ ] **7.3.7.1** Implement "Export as Image" functionality
  - Use html-to-image library
  - Support PNG and SVG formats
  - Add download trigger
- [ ] **7.3.7.2** Implement "Export as JSON" functionality
  - Serialize graph structure
  - Include metadata
- [ ] **7.3.7.3** Add "Print" functionality
  - Optimize layout for printing
  - Generate print-friendly view
- [ ] **7.3.7.4** Add "Share" functionality (optional)
  - Generate shareable link
  - Embed parameters in URL
- [ ] **7.3.7.5** Test export features

**Files**:
- `frontend/src/components/Lineage/LineageDiagram.tsx` (update)
- `frontend/src/lib/export-utils.ts`

**Dependencies**:
```json
{
  "html-to-image": "^1.11.11"
}
```

### 7.3.8 Lineage Diagram - Error Handling
- [ ] **7.3.8.1** Add error boundary around diagram
- [ ] **7.3.8.2** Handle lineage service errors
  - Display user-friendly error messages
  - Provide retry button
- [ ] **7.3.8.3** Handle empty lineage
  - Show "No lineage found" message
  - Suggest actions (add mappings)
- [ ] **7.3.8.4** Handle timeout errors
  - Show timeout message
  - Offer to load partial results
- [ ] **7.3.8.5** Add logging for debugging
- [ ] **7.3.8.6** Test error scenarios

**Files**:
- `frontend/src/components/Lineage/LineageDiagram.tsx` (update)
- `frontend/src/components/Lineage/LineageErrorBoundary.tsx`

---

## Phase 7.4: Integration with Existing UI (Week 4)

### 7.4.1 Dataset Context Menu Integration
- [ ] **7.4.1.1** Open `frontend/src/components/Canvas/DatasetContextMenu.tsx`
- [ ] **7.4.1.2** Add "View Lineage" menu item
  - Icon: Network
  - Label: "View Lineage"
  - onClick: trigger lineage dialog
- [ ] **7.4.1.3** Add menu item after "View Details"
- [ ] **7.4.1.4** Test context menu

**Files**:
- `frontend/src/components/Canvas/DatasetContextMenu.tsx` (update)

### 7.4.2 Column Row Actions Integration
- [ ] **7.4.2.1** Open `frontend/src/components/Canvas/ColumnRow.tsx` (or equivalent)
- [ ] **7.4.2.2** Add lineage icon button to actions
  - Icon: Network (small)
  - Tooltip: "View Column Lineage"
  - onClick: trigger column lineage dialog
- [ ] **7.4.2.3** Position button next to edit/delete
- [ ] **7.4.2.4** Test column lineage trigger

**Files**:
- `frontend/src/components/Canvas/ColumnRow.tsx` (update)

### 7.4.3 Diagram View Right-Click Integration
- [ ] **7.4.3.1** Open `frontend/src/components/Canvas/ProjectCanvas.tsx`
- [ ] **7.4.3.2** Add right-click handler for nodes
  ```typescript
  const handleNodeContextMenu = (event, node) => {
    event.preventDefault();
    // Show context menu with lineage option
  };
  ```
- [ ] **7.4.3.3** Create context menu component if not exists
- [ ] **7.4.3.4** Add "View Lineage" option to context menu
- [ ] **7.4.3.5** Handle lineage dialog opening
- [ ] **7.4.3.6** Test right-click on various node types

**Files**:
- `frontend/src/components/Canvas/ProjectCanvas.tsx` (update)
- `frontend/src/components/Canvas/CanvasContextMenu.tsx` (create or update)

### 7.4.4 Lineage Dialog Container
- [ ] **7.4.4.1** Create `frontend/src/components/Lineage/LineageDialog.tsx`
- [ ] **7.4.4.2** Build fullscreen modal container
  - Dark overlay
  - Close button
  - Escape key handler
- [ ] **7.4.4.3** Embed LineageDiagram component
- [ ] **7.4.4.4** Handle open/close state
- [ ] **7.4.4.5** Add loading state while opening
- [ ] **7.4.4.6** Add z-index layering
- [ ] **7.4.4.7** Test modal behavior

**Files**:
- `frontend/src/components/Lineage/LineageDialog.tsx`

### 7.4.5 Global Lineage State Management
- [ ] **7.4.5.1** Add lineage state to Zustand store
  ```typescript
  interface LineageState {
    isOpen: boolean;
    rootNodeId: string | null;
    rootNodeType: 'dataset' | 'column' | null;
    openLineage: (id, type) => void;
    closeLineage: () => void;
  }
  ```
- [ ] **7.4.5.2** Create `useLineage()` hook
- [ ] **7.4.5.3** Update store with lineage actions
- [ ] **7.4.5.4** Test state management

**Files**:
- `frontend/src/store/useStore.ts` (update)
- `frontend/src/hooks/useLineage.ts`

### 7.4.6 Navigation Integration
- [ ] **7.4.6.1** Add "Lineage" to main navigation menu (optional)
- [ ] **7.4.6.2** Create dedicated lineage page route (optional)
  - Route: `/workspace/:id/lineage`
  - Display lineage for workspace
- [ ] **7.4.6.3** Add lineage to breadcrumbs when viewing
- [ ] **7.4.6.4** Test navigation

**Files**:
- `frontend/src/components/Layout/Navigation.tsx` (update)
- `frontend/src/pages/LineagePage.tsx` (optional)

---

## Phase 7.5: Advanced Features (Week 5)

### 7.5.1 Lineage Filtering
- [ ] **7.5.1.1** Create `LineageFilters` component
- [ ] **7.5.1.2** Add filter by mapping type
  - Checkboxes: Direct, Transform, Derived, Calculated
  - Apply to edges
- [ ] **7.5.1.3** Add filter by medallion layer
  - Checkboxes: Raw, Bronze, Silver, Gold
  - Apply to nodes
- [ ] **7.5.1.4** Add filter by entity type
  - Checkboxes: Table, DataVault, DataMart, etc.
- [ ] **7.5.1.5** Implement filter logic in diagram
  - Hide filtered nodes/edges
  - Update graph dynamically
- [ ] **7.5.1.6** Add "Clear Filters" button
- [ ] **7.5.1.7** Persist filters in viewState
- [ ] **7.5.1.8** Test filtering

**Files**:
- `frontend/src/components/Lineage/LineageFilters.tsx`
- `frontend/src/components/Lineage/LineageDiagram.tsx` (update)

### 7.5.2 Lineage Search
- [ ] **7.5.2.1** Add search input to LineageControls
- [ ] **7.5.2.2** Implement search by node name
  - Fuzzy search
  - Highlight matching nodes
- [ ] **7.5.2.3** Implement search by FQN
- [ ] **7.5.2.4** Implement search by column name (column view)
- [ ] **7.5.2.5** Add "Jump to Node" functionality
  - Center viewport on found node
  - Highlight node
- [ ] **7.5.2.6** Show search results count
- [ ] **7.5.2.7** Add keyboard shortcut (Ctrl+F)
- [ ] **7.5.2.8** Test search

**Files**:
- `frontend/src/components/Lineage/LineageControls.tsx` (update)
- `frontend/src/components/Lineage/LineageDiagram.tsx` (update)

### 7.5.3 Multi-Select and Bulk Actions
- [ ] **7.5.3.1** Implement multi-node selection
  - Ctrl+Click to add to selection
  - Shift+Click for range selection
  - Drag to select area
- [ ] **7.5.3.2** Show selection count
- [ ] **7.5.3.3** Add "Highlight Path Between Selected" action
  - Find paths between all selected nodes
  - Highlight all paths
- [ ] **7.5.3.4** Add "Export Selected" action
- [ ] **7.5.3.5** Add "Clear Selection" button
- [ ] **7.5.3.6** Test multi-select

**Files**:
- `frontend/src/components/Lineage/LineageDiagram.tsx` (update)

### 7.5.4 Transformation Details Modal
- [ ] **7.5.4.1** Create `TransformationDetailsModal` component
- [ ] **7.5.4.2** Display on edge click
- [ ] **7.5.4.3** Show mapping type
- [ ] **7.5.4.4** Show transformation expression with syntax highlighting
- [ ] **7.5.4.5** Show source and target columns
- [ ] **7.5.4.6** Add "Edit Transformation" button (links to mapping editor)
- [ ] **7.5.4.7** Add "Copy SQL" button
- [ ] **7.5.4.8** Test modal

**Files**:
- `frontend/src/components/Lineage/TransformationDetailsModal.tsx`

### 7.5.5 Lineage Comparison (Diff View)
- [ ] **7.5.5.1** Add "Compare Lineage" feature
- [ ] **7.5.5.2** Allow user to select two datasets/columns
- [ ] **7.5.5.3** Load lineage for both
- [ ] **7.5.5.4** Highlight differences
  - Nodes in A but not B (red)
  - Nodes in B but not A (green)
  - Common nodes (gray)
- [ ] **7.5.5.5** Show diff statistics
- [ ] **7.5.5.6** Test comparison

**Files**:
- `frontend/src/components/Lineage/LineageComparison.tsx`

### 7.5.6 Lineage Versioning (Historical View)
- [ ] **7.5.6.1** Add "View Historical Lineage" feature
- [ ] **7.5.6.2** Allow user to select date/version
- [ ] **7.5.6.3** Query audit_logs for historical lineage
- [ ] **7.5.6.4** Reconstruct lineage graph for that point in time
- [ ] **7.5.6.5** Show version selector
- [ ] **7.5.6.6** Test historical view

**Files**:
- `frontend/src/components/Lineage/LineageVersionSelector.tsx`
- `frontend/src/lib/lineage-service.ts` (add getHistoricalLineage method)

---

## Phase 7.6: Testing & Documentation (Week 6)

### 7.6.1 Unit Testing
- [ ] **7.6.1.1** Write tests for lineage-service.ts
  - Test getDatasetLineage
  - Test getColumnLineage
  - Test analyzeLineage
  - Test findPaths
  - Test traversal methods
  - Aim for 80%+ coverage
- [ ] **7.6.1.2** Write tests for layout-utils.ts
  - Test hierarchical layout
  - Test force layout
  - Test circular layout
- [ ] **7.6.1.3** Write tests for LineageNode component
  - Test rendering
  - Test highlighting
  - Test view types
- [ ] **7.6.1.4** Write tests for LineageEdge component
  - Test edge types
  - Test styling
  - Test interactions
- [ ] **7.6.1.5** Write tests for LineageControls component
- [ ] **7.6.1.6** Write tests for LineageAnalysisPanel component

**Files**:
- `frontend/src/lib/__tests__/*.test.ts`
- `frontend/src/components/Lineage/__tests__/*.test.tsx`

### 7.6.2 Integration Testing
- [ ] **7.6.2.1** Test full lineage workflow (E2E)
  - Open diagram from dataset context menu
  - Toggle view types
  - Change directions
  - Highlight paths
  - Export diagram
- [ ] **7.6.2.2** Test column lineage workflow
  - Open from column row
  - Navigate column graph
  - View transformations
- [ ] **7.6.2.3** Test filtering and search
- [ ] **7.6.2.4** Test performance with large graphs
  - Create test data (500+ nodes)
  - Measure load time
  - Measure interaction responsiveness
- [ ] **7.6.2.5** Test error scenarios
  - No lineage found
  - Network errors
  - Timeout errors

**Files**:
- `frontend/tests/e2e/lineage.spec.ts`

### 7.6.3 Performance Testing
- [ ] **7.6.3.1** Create performance benchmarks
  - Query time for 100-node graph: < 1s
  - Query time for 500-node graph: < 3s
  - UI render time: < 500ms
  - Interaction response time: < 200ms
- [ ] **7.6.3.2** Profile lineage queries
  - Identify slow queries
  - Optimize with indexes
- [ ] **7.6.3.3** Profile React rendering
  - Identify unnecessary re-renders
  - Add memoization
- [ ] **7.6.3.4** Test with production-like data volumes
- [ ] **7.6.3.5** Document performance results

**Files**:
- `docs/lineage-performance-benchmarks.md`

### 7.6.4 User Documentation
- [ ] **7.6.4.1** Write user guide for lineage feature
  - "Understanding Data Lineage"
  - "Viewing Dataset Lineage"
  - "Viewing Column Lineage"
  - "Interpreting Lineage Diagrams"
  - "Using Lineage for Impact Analysis"
- [ ] **7.6.4.2** Create tutorial videos (optional)
  - Video 1: Lineage basics (3 min)
  - Video 2: Column-level lineage (5 min)
  - Video 3: Advanced features (7 min)
- [ ] **7.6.4.3** Add in-app help tooltips
- [ ] **7.6.4.4** Create FAQ section
- [ ] **7.6.4.5** Add to main documentation site

**Files**:
- `docs/user-guide/lineage-feature.md`
- `docs/user-guide/lineage-tutorial.md`
- `docs/user-guide/lineage-faq.md`

### 7.6.5 Developer Documentation
- [ ] **7.6.5.1** Document lineage architecture
  - Data model
  - Service layer
  - UI components
  - Integration points
- [ ] **7.6.5.2** Document lineage service API
  - All public methods
  - Parameters and return types
  - Examples
- [ ] **7.6.5.3** Document graph algorithms
  - Traversal logic
  - Layout algorithms
  - Path finding
- [ ] **7.6.5.4** Create sequence diagrams
  - Lineage query flow
  - UI interaction flow
- [ ] **7.6.5.5** Add JSDoc comments to all code

**Files**:
- `docs/developer/lineage-architecture.md`
- `docs/developer/lineage-api.md`
- `docs/developer/lineage-algorithms.md`

### 7.6.6 Final Review & Polish
- [ ] **7.6.6.1** Code review for all lineage components
- [ ] **7.6.6.2** UI/UX review
  - Consistency with app design
  - Accessibility compliance
  - Responsive design
- [ ] **7.6.6.3** Security review
  - RLS policies enforced
  - No data leakage
- [ ] **7.6.6.4** Performance review
  - All benchmarks met
  - No memory leaks
- [ ] **7.6.6.5** Documentation review
  - Complete and accurate
  - Examples work
- [ ] **7.6.6.6** Create release notes

**Files**:
- `CHANGELOG.md` (update)
- `docs/releases/v1.x-lineage-feature.md`

---

## Phase 7.7: Deployment & Monitoring (Week 7)

### 7.7.1 Staging Deployment
- [ ] **7.7.1.1** Deploy database migrations to staging
- [ ] **7.7.1.2** Deploy frontend code to staging
- [ ] **7.7.1.3** Run smoke tests on staging
- [ ] **7.7.1.4** Test with staging data
- [ ] **7.7.1.5** Fix any issues found

### 7.7.2 Production Deployment
- [ ] **7.7.2.1** Schedule deployment window
- [ ] **7.7.2.2** Create database backup
- [ ] **7.7.2.3** Run migrations on production
- [ ] **7.7.2.4** Deploy frontend to production
- [ ] **7.7.2.5** Verify deployment
- [ ] **7.7.2.6** Monitor error rates
- [ ] **7.7.2.7** Rollback plan ready

### 7.7.3 Monitoring Setup
- [ ] **7.7.3.1** Add lineage query metrics
  - Query count
  - Query duration
  - Error rate
- [ ] **7.7.3.2** Add UI interaction metrics
  - Lineage view opens
  - View type toggles
  - Export actions
- [ ] **7.7.3.3** Setup error tracking
  - Capture lineage service errors
  - Capture UI errors
- [ ] **7.7.3.4** Create dashboard for lineage metrics
- [ ] **7.7.3.5** Setup alerts
  - High error rate
  - Slow queries

### 7.7.4 User Training & Rollout
- [ ] **7.7.4.1** Announce feature to users
- [ ] **7.7.4.2** Conduct training sessions
- [ ] **7.7.4.3** Gather initial feedback
- [ ] **7.7.4.4** Create support materials
- [ ] **7.7.4.5** Monitor support tickets

---

## Success Criteria

- [ ] **Functionality**: All lineage features work as specified
- [ ] **Performance**: Lineage queries return in < 2s for 100-node graphs
- [ ] **Usability**: Users can navigate lineage without training
- [ ] **Accuracy**: 100% lineage accuracy (validated by tests)
- [ ] **Test Coverage**: 80%+ code coverage
- [ ] **Documentation**: Complete user and developer docs
- [ ] **Adoption**: > 50% of users use lineage feature in first month
- [ ] **Satisfaction**: > 4.5/5 user satisfaction rating

---

## Dependencies & Prerequisites

### External Libraries
```json
{
  "reactflow": "^11.10.0",
  "dagre": "^0.8.5",
  "@types/dagre": "^0.7.52",
  "d3-force": "^3.0.0",
  "html-to-image": "^1.11.11"
}
```

### Database Prerequisites
- Lineage table with proper indexes
- Audit_logs table for historical lineage
- RLS policies in place

### Backend Prerequisites
- Supabase client configured
- Error handling service
- Logging service

---

## Estimated Effort

- **Phase 7.1**: 20-25 hours
- **Phase 7.2**: 25-30 hours
- **Phase 7.3**: 30-35 hours
- **Phase 7.4**: 15-20 hours
- **Phase 7.5**: 25-30 hours
- **Phase 7.6**: 20-25 hours
- **Phase 7.7**: 10-15 hours

**Total**: 145-180 hours (approximately 4-5 weeks for a single developer)

---

## Risk Mitigation

### High-Risk Areas
1. **Performance with large graphs**: Mitigate with virtualization and pagination
2. **Complex lineage traversal**: Thorough testing with various scenarios
3. **UI responsiveness**: Profile and optimize rendering
4. **Cycle detection**: Robust algorithm with depth limiting

### Contingency Plans
- If performance issues: Implement server-side graph processing
- If UI complexity: Simplify initial release, add advanced features later
- If adoption low: Conduct user research, improve UX