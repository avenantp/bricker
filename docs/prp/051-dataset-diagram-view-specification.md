# Dataset Diagram View - Technical Specification

## 1. Overview

### 1.1 Purpose
The Dataset Diagram View provides a visual, interactive canvas for managing datasets and their relationships using React Flow. It serves as the primary interface for data modeling, supporting multiple view states (relationships, lineage) and enabling intuitive data architecture design through drag-and-drop interactions.

### 1.2 Key Capabilities
- Visual representation of datasets with medallion layer color coding
- Interactive node expansion to display columns
- Multiple view states: Relationship View and Lineage View
- Drag-and-drop relationship creation
- Edge alignment management for clean diagram layouts
- Persistent diagram state (positions, expansions, zoom, pan)
- Context-sensitive actions via right-click menus
- Real-time collaboration indicators (future)

### 1.3 Integration Points
- **Data Vault Accelerator**: Right-click → "Accelerate" launches accelerator in new view
- **Lineage Viewer**: Right-click → "View Lineage" switches to lineage view
- **Business Modeling**: Links conceptual models to physical datasets
- **AI Assistant**: Context-aware recommendations for relationships
- **Template Engine**: Diagram data feeds template rendering

---

## 2. Architecture

### 2.1 Component Hierarchy

```
DatasetDiagramView (Container)
├── DiagramToolbar
│   ├── ViewModeToggle (Relationships | Lineage)
│   ├── ZoomControls
│   ├── LayoutControls (Auto-layout, Fit View)
│   ├── FilterPanel
│   └── SearchBar
├── ReactFlowCanvas
│   ├── DatasetNode (Custom Node)
│   │   ├── NodeHeader (Name, Type, Layer Badge)
│   │   ├── NodeBody (Metadata, Stats)
│   │   ├── ExpandableColumnList
│   │   │   ├── ColumnItem
│   │   │   │   ├── ColumnIcon (PK/FK indicator)
│   │   │   │   ├── ColumnName
│   │   │   │   ├── ColumnType
│   │   │   │   └── ColumnActions
│   │   │   └── AddColumnButton
│   │   └── NodeFooter (Actions, Expand/Collapse)
│   ├── RelationshipEdge (Custom Edge)
│   │   ├── EdgePath (Styled by relationship type)
│   │   ├── EdgeLabel (Cardinality, Type)
│   │   └── EdgeMarkers (Arrows, Crow's foot)
│   ├── LineageEdge (Custom Edge)
│   │   ├── EdgePath (Directional flow)
│   │   ├── EdgeLabel (Mapping type)
│   │   └── DataFlowAnimation
│   └── Background (Grid/Dots)
├── ContextMenu
│   ├── DatasetContextMenu
│   │   ├── Edit Properties
│   │   ├── Add Relationship
│   │   ├── View Lineage
│   │   ├── Accelerate (Data Vault)
│   │   ├── Clone Dataset
│   │   ├── Export
│   │   └── Delete
│   ├── EdgeContextMenu
│   │   ├── Edit Relationship
│   │   ├── Delete Relationship
│   │   └── View Details
│   └── CanvasContextMenu
│       ├── Add Dataset
│       ├── Import
│       └── Paste
├── MiniMap
├── Controls
├── EdgeAlignmentHelper
│   ├── SnapGuides (Visual guides)
│   ├── AlignmentPoints (Connection points)
│   └── SmartRouting (Auto-path calculation)
└── DiagramStateManager (Persistence)
```

### 2.2 State Management

**Zustand Store Structure**:
```typescript
interface DiagramStore {
  // View State
  viewMode: 'relationships' | 'lineage';
  selectedDatasetId: string | null;
  expandedNodes: Set<string>;
  highlightedNodes: Set<string>;
  highlightedEdges: Set<string>;
  
  // Canvas State
  nodes: Node[];
  edges: Edge[];
  viewport: { x: number; y: number; zoom: number };
  
  // Filters
  filters: {
    medallionLayers: string[];
    entityTypes: string[];
    searchQuery: string;
  };
  
  // Diagram State Persistence
  savedPositions: Record<string, { x: number; y: number }>;
  edgeRoutes: Record<string, EdgeRoute>;
  
  // Actions
  setViewMode: (mode: 'relationships' | 'lineage') => void;
  toggleNodeExpansion: (nodeId: string) => void;
  updateNodePosition: (nodeId: string, position: Position) => void;
  saveEdgeRoute: (edgeId: string, route: EdgeRoute) => void;
  highlightLineage: (datasetId: string, direction: 'upstream' | 'downstream' | 'both') => void;
  clearHighlights: () => void;
}
```

### 2.3 Data Models

**Dataset Node Data**:
```typescript
interface DatasetNodeData {
  // Dataset Metadata
  dataset_id: string;
  name: string;
  fqn: string;
  medallion_layer: MedallionLayer;
  entity_type: EntityType;
  entity_subtype?: EntitySubtype;
  description?: string;
  
  // Visual State
  isExpanded: boolean;
  isHighlighted: boolean;
  highlightType?: 'upstream' | 'downstream' | 'selected';
  
  // Columns (when expanded)
  columns?: Column[];
  
  // Stats
  columnCount: number;
  relationshipCount: number;
  lineageCount: { upstream: number; downstream: number };
  
  // AI Metadata
  ai_confidence_score?: number;
  
  // Sync Status
  sync_status?: 'synced' | 'pending' | 'conflict' | 'error';
}
```

**Edge Route Data**:
```typescript
interface EdgeRoute {
  edge_id: string;
  path: string; // SVG path
  controlPoints: Position[];
  alignmentType: 'straight' | 'bezier' | 'step' | 'smooth-step';
  userModified: boolean; // Has user manually adjusted?
}
```

**Diagram State Persistence**:
```typescript
interface DiagramState {
  workspace_id: string;
  diagram_id: string;
  view_mode: 'relationships' | 'lineage';
  viewport: Viewport;
  node_positions: Record<string, Position>;
  node_expansions: Record<string, boolean>;
  edge_routes: Record<string, EdgeRoute>;
  filters: FilterState;
  last_saved: string;
  version: number;
}
```

---

## 3. View Modes

### 3.1 Relationship View

**Purpose**: Visualize dataset relationships (foreign keys, business keys, natural keys)

**Visual Characteristics**:
- Nodes arranged by medallion layer (left-to-right or top-to-bottom)
- Edges represent relationships between datasets
- Edge styling varies by relationship type:
  - **FK**: Solid line, dark color
  - **BusinessKey**: Dashed line, medium color
  - **NaturalKey**: Dotted line, light color
- Crow's foot notation for cardinality (1:1, 1:M, M:M)

**Interactions**:
- **Click Node**: Select dataset, show metadata panel
- **Double-Click Node**: Expand to show columns
- **Click Edge**: Show relationship details
- **Drag Edge**: Create new relationship
- **Right-Click Node**: Context menu
- **Right-Click Edge**: Edge context menu
- **Drag Node**: Reposition (saved to state)

**Layout Algorithm**:
- **Initial Layout**: Hierarchical based on medallion layers
  - Raw/Bronze: Left
  - Silver: Center
  - Gold: Right
- **Auto-Layout**: ELK layered algorithm with constraints
- **Manual Override**: User can drag nodes, positions are persisted

### 3.2 Lineage View

**Purpose**: Visualize data lineage at dataset or column level

**Visual Characteristics**:
- Selected dataset in center (highlighted)
- Upstream datasets to the left
- Downstream datasets to the right
- Edges represent data flow (transformations)
- Edge labels show mapping types (Direct, Transform, Derived)
- Animated edge flow to indicate direction

**Interactions**:
- **Click Node**: Highlight its lineage
- **Toggle Column View**: Expand all nodes to show column-level lineage
- **Click Edge**: Show transformation expression
- **Hover Edge**: Preview source-to-target mappings
- **Right-Click Node**: Context menu with "Focus on this dataset"

**Layout Algorithm**:
- **Dagre Layout**: Directed acyclic graph with flow direction left-to-right
- **Level Assignment**: Based on distance from selected node
- **Column Layout** (when expanded): Align columns vertically

---

## 4. Node Expansion

### 4.1 Collapsed State

**Visual Design**:
```
┌─────────────────────────────────┐
│ 🔷 dim_customer          [Gold] │ ← Header with icon and layer badge
├─────────────────────────────────┤
│ Dimension • Type 2 SCD          │ ← Metadata
│ 15 columns • 3 relationships    │ ← Stats
├─────────────────────────────────┤
│ [Expand] [Edit] [More]          │ ← Footer actions
└─────────────────────────────────┘
```

**Dimensions**: 250px wide × 120px tall

### 4.2 Expanded State

**Visual Design**:
```
┌─────────────────────────────────────────────┐
│ 🔷 dim_customer                      [Gold] │
├─────────────────────────────────────────────┤
│ Dimension • Type 2 SCD                      │
│ 15 columns • 3 relationships                │
├─────────────────────────────────────────────┤
│ Columns:                                    │
│ ┌─────────────────────────────────────────┐ │
│ │ 🔑 customer_key      BIGINT         PK  │ │ ← Primary key
│ │ 🔗 customer_id       STRING         FK  │ │ ← Foreign key
│ │    customer_name     STRING             │ │
│ │    email             STRING             │ │
│ │    segment           STRING             │ │
│ │    effective_date    DATE               │ │
│ │    end_date          DATE               │ │
│ │    is_current        BOOLEAN            │ │
│ │ ... 7 more columns                      │ │
│ └─────────────────────────────────────────┘ │
│ [+] Add Column                              │
├─────────────────────────────────────────────┤
│ [Collapse] [Edit] [More]                    │
└─────────────────────────────────────────────┘
```

**Dimensions**: 400px wide × (120px + 40px × column_count) tall

**Behavior**:
- Smooth animation on expand/collapse (300ms)
- Scroll if column list exceeds viewport
- Hovering column shows full details in tooltip
- Click column to select for relationship creation

### 4.3 Column-Level Lineage (Lineage View Only)

**When toggled**:
- All nodes in lineage view expand automatically
- Edges connect specific columns instead of nodes
- Edge labels show transformation expressions
- Column highlighting on hover shows connected columns

---

## 5. Edge Management

### 5.1 Edge Alignment System

**Problem**: Edges can overlap, cross awkwardly, or obscure content

**Solution**: Smart edge routing with alignment helpers

**Features**:
- **Snap Guides**: Visual guides appear when dragging edge endpoints
- **Connection Points**: Pre-defined anchor points on node borders (top, right, bottom, left, center)
- **Smart Routing**: Automatic path calculation to avoid node overlaps
- **Manual Adjustment**: User can add control points by clicking on edge
- **Persistence**: Edge routes saved to diagram state

**Edge Route Types**:
1. **Straight**: Direct line (for short distances)
2. **Bezier**: Smooth curve (default)
3. **Step**: Right-angle bends (for clean orthogonal routing)
4. **Smooth Step**: Rounded right-angle bends

**Implementation**:
```typescript
interface EdgeAlignmentHelper {
  calculatePath(
    source: Node,
    target: Node,
    obstacles: Node[],
    routeType: EdgeRouteType
  ): EdgePath;
  
  findBestConnectionPoints(
    source: Node,
    target: Node
  ): { sourcePoint: ConnectionPoint; targetPoint: ConnectionPoint };
  
  addControlPoint(
    edge: Edge,
    position: Position
  ): Edge;
  
  optimizeRoute(edge: Edge): Edge;
}
```

### 5.2 Edge Styling by Type

**Relationship Edges**:
```typescript
const edgeStyles: Record<RelationshipType, EdgeStyle> = {
  FK: {
    stroke: '#3b82f6', // Blue
    strokeWidth: 2,
    strokeDasharray: 'none',
    markerEnd: 'arrow',
    markerStart: 'circle',
  },
  BusinessKey: {
    stroke: '#8b5cf6', // Purple
    strokeWidth: 2,
    strokeDasharray: '5,5',
    markerEnd: 'arrow',
    markerStart: 'diamond',
  },
  NaturalKey: {
    stroke: '#10b981', // Green
    strokeWidth: 1.5,
    strokeDasharray: '2,2',
    markerEnd: 'arrow',
    markerStart: 'square',
  },
};
```

**Lineage Edges**:
```typescript
const lineageEdgeStyles: Record<MappingType, EdgeStyle> = {
  Direct: {
    stroke: '#22c55e', // Green
    strokeWidth: 2,
    strokeDasharray: 'none',
    animated: true,
  },
  Transform: {
    stroke: '#f59e0b', // Amber
    strokeWidth: 2,
    strokeDasharray: 'none',
    animated: true,
  },
  Derived: {
    stroke: '#8b5cf6', // Purple
    strokeWidth: 2,
    strokeDasharray: '5,5',
    animated: true,
  },
  Calculated: {
    stroke: '#6366f1', // Indigo
    strokeWidth: 1.5,
    strokeDasharray: '2,2',
    animated: false,
  },
};
```

### 5.3 Cardinality Display

**Crow's Foot Notation**:
- **1:1**: Single line both ends
- **1:M**: Single line source, crow's foot target
- **M:M**: Crow's foot both ends

**Label Positioning**:
- Centered on edge path
- Background with slight transparency
- Font size: 12px
- Format: "1:M" or "M:M"

---

## 6. Diagram State Persistence

### 6.1 Storage Strategy

**Two-Tier Persistence**:
1. **Local Storage** (Immediate): Real-time updates for responsive UX
2. **Supabase** (Debounced): Saved every 5 seconds or on workspace switch

**Data Structure**:
```typescript
// Supabase table: diagram_states
CREATE TABLE diagram_states (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  diagram_type VARCHAR NOT NULL DEFAULT 'dataset', -- dataset | business_model | lineage
  
  -- State Data
  view_mode VARCHAR NOT NULL DEFAULT 'relationships',
  viewport JSONB NOT NULL, -- {x, y, zoom}
  node_positions JSONB NOT NULL, -- {node_id: {x, y}}
  node_expansions JSONB NOT NULL, -- {node_id: boolean}
  edge_routes JSONB, -- {edge_id: {path, controlPoints, alignmentType}}
  filters JSONB, -- Current filter state
  
  -- Metadata
  last_modified_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  
  UNIQUE(workspace_id, diagram_type)
);

CREATE INDEX idx_diagram_states_workspace ON diagram_states(workspace_id);
CREATE INDEX idx_diagram_states_account ON diagram_states(account_id);
```

### 6.2 Save Operations

**Auto-Save Logic**:
```typescript
class DiagramStatePersistence {
  private saveTimeout: NodeJS.Timeout | null = null;
  private isDirty = false;
  
  markDirty() {
    this.isDirty = true;
    this.scheduleSave();
  }
  
  private scheduleSave() {
    if (this.saveTimeout) clearTimeout(this.saveTimeout);
    
    this.saveTimeout = setTimeout(async () => {
      if (this.isDirty) {
        await this.saveToSupabase();
        this.isDirty = false;
      }
    }, 5000); // 5 second debounce
  }
  
  async saveToSupabase() {
    const state = this.buildStateSnapshot();
    
    await supabase
      .from('diagram_states')
      .upsert({
        workspace_id: state.workspace_id,
        diagram_type: 'dataset',
        ...state,
        updated_at: new Date().toISOString(),
        version: state.version + 1,
      }, {
        onConflict: 'workspace_id,diagram_type',
      });
  }
  
  async loadFromSupabase(workspaceId: string) {
    const { data } = await supabase
      .from('diagram_states')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('diagram_type', 'dataset')
      .single();
    
    if (data) {
      this.applyStateSnapshot(data);
    }
  }
}
```

### 6.3 Conflict Resolution

**Scenario**: Multiple users editing same workspace diagram

**Detection**:
- On save, check `version` number
- If remote version > local version → conflict

**Resolution**:
1. **Auto-Merge** (preferred):
   - Non-overlapping changes merge automatically
   - Example: User A moves Node 1, User B moves Node 2 → Both changes apply
2. **Manual Resolution** (if conflicts):
   - Show diff dialog
   - User chooses: "Keep Mine" | "Take Theirs" | "Merge"
3. **Optimistic UI**:
   - Show changes immediately
   - Revert on conflict with notification

---

## 7. Relationship Creation

### 7.1 Drag-and-Drop Workflow

**Step 1: Initiate**
- User clicks "Add Relationship" button on node, or
- User drags from a column in expanded node

**Step 2: Select Target**
- Hovering over potential target nodes highlights them
- Valid targets based on:
  - No self-references
  - No duplicate relationships
  - Matching data types (if column-level)

**Step 3: Configure**
- Dialog appears:
  - **Relationship Type**: FK | BusinessKey | NaturalKey
  - **Cardinality**: 1:1 | 1:M | M:M
  - **Source Columns**: Multi-select dropdown
  - **Target Columns**: Multi-select dropdown (same count as source)
  - **Description**: Optional text

**Step 4: Create**
- Validate selections
- Create relationship in backend
- Render edge on canvas
- Update node relationship counts

### 7.2 Relationship Validation

**Rules**:
```typescript
function validateRelationship(
  sourceDataset: Dataset,
  targetDataset: Dataset,
  sourceColumns: Column[],
  targetColumns: Column[],
  relationshipType: RelationshipType
): ValidationResult {
  const errors: string[] = [];
  
  // Rule 1: No self-references
  if (sourceDataset.id === targetDataset.id) {
    errors.push('Cannot create relationship to same dataset');
  }
  
  // Rule 2: Column count match
  if (sourceColumns.length !== targetColumns.length) {
    errors.push('Source and target column counts must match');
  }
  
  // Rule 3: Data type compatibility
  for (let i = 0; i < sourceColumns.length; i++) {
    if (!areTypesCompatible(sourceColumns[i].data_type, targetColumns[i].data_type)) {
      errors.push(`Column ${i}: Incompatible data types`);
    }
  }
  
  // Rule 4: No duplicate relationships
  const existing = getExistingRelationships(sourceDataset.id, targetDataset.id);
  const isDuplicate = existing.some(rel => 
    arrayEquals(rel.source_columns, sourceColumns.map(c => c.id)) &&
    arrayEquals(rel.target_columns, targetColumns.map(c => c.id))
  );
  if (isDuplicate) {
    errors.push('Relationship already exists');
  }
  
  // Rule 5: FK relationships should target PK
  if (relationshipType === 'FK') {
    const allTargetPK = targetColumns.every(c => c.is_primary_key);
    if (!allTargetPK) {
      errors.push('FK relationships should target primary key columns');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}
```

### 7.3 Add Relationship Dialog

**UI Design**:
```
┌─────────────────────────────────────────────┐
│ Add Relationship                            │
├─────────────────────────────────────────────┤
│                                             │
│ Source Dataset: dim_customer                │
│ Target Dataset: fct_orders                  │
│                                             │
│ Relationship Type: ●FK ○BusinessKey ○Natural│
│                                             │
│ Cardinality: ●1:M ○1:1 ○M:M                 │
│                                             │
│ Source Columns:                             │
│ ┌─────────────────────────────────────────┐ │
│ │ ☑ customer_key                          │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Target Columns:                             │
│ ┌─────────────────────────────────────────┐ │
│ │ ☑ customer_key                          │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ Description (optional):                     │
│ ┌─────────────────────────────────────────┐ │
│ │                                         │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│            [Cancel]  [Create Relationship]  │
└─────────────────────────────────────────────┘
```

---

## 8. Context Menus

### 8.1 Dataset Node Context Menu

**Trigger**: Right-click on dataset node

**Menu Items**:
```typescript
[
  {
    label: 'Edit Properties',
    icon: <Edit />,
    action: () => openDatasetEditor(node.id),
  },
  {
    label: 'Add Relationship',
    icon: <Link />,
    action: () => startRelationshipCreation(node.id),
  },
  { separator: true },
  {
    label: 'View Lineage',
    icon: <GitBranch />,
    action: () => switchToLineageView(node.id),
    badge: node.lineageCount.upstream + node.lineageCount.downstream,
  },
  {
    label: 'Accelerate (Data Vault)',
    icon: <Zap />,
    action: () => openDataVaultAccelerator(node.id),
    disabled: node.medallion_layer !== 'Bronze',
  },
  { separator: true },
  {
    label: 'Clone Dataset',
    icon: <Copy />,
    action: () => cloneDataset(node.id),
  },
  {
    label: 'Export as YAML',
    icon: <Download />,
    action: () => exportDataset(node.id, 'yaml'),
  },
  { separator: true },
  {
    label: 'Delete',
    icon: <Trash />,
    action: () => confirmDelete(node.id),
    destructive: true,
  },
]
```

### 8.2 Edge Context Menu

**Trigger**: Right-click on relationship edge

**Menu Items**:
```typescript
[
  {
    label: 'Edit Relationship',
    icon: <Edit />,
    action: () => openRelationshipEditor(edge.id),
  },
  {
    label: 'View Details',
    icon: <Info />,
    action: () => showRelationshipDetails(edge.id),
  },
  { separator: true },
  {
    label: 'Realign Edge',
    icon: <RefreshCw />,
    action: () => realignEdge(edge.id),
  },
  {
    label: 'Add Control Point',
    icon: <Plus />,
    action: () => addEdgeControlPoint(edge.id),
  },
  { separator: true },
  {
    label: 'Delete Relationship',
    icon: <Trash />,
    action: () => confirmDeleteRelationship(edge.id),
    destructive: true,
  },
]
```

### 8.3 Canvas Context Menu

**Trigger**: Right-click on empty canvas area

**Menu Items**:
```typescript
[
  {
    label: 'Add Dataset',
    icon: <Plus />,
    action: () => openCreateDatasetDialog(clickPosition),
  },
  {
    label: 'Import Metadata',
    icon: <Upload />,
    action: () => openImportDialog(),
  },
  { separator: true },
  {
    label: 'Auto-Layout',
    icon: <Layout />,
    submenu: [
      { label: 'Hierarchical', action: () => applyLayout('hierarchical') },
      { label: 'Force Directed', action: () => applyLayout('force') },
      { label: 'Circular', action: () => applyLayout('circular') },
    ],
  },
  {
    label: 'Fit View',
    icon: <Maximize />,
    action: () => fitView(),
  },
  { separator: true },
  {
    label: 'Export Diagram',
    icon: <Download />,
    submenu: [
      { label: 'Export as PNG', action: () => exportDiagram('png') },
      { label: 'Export as SVG', action: () => exportDiagram('svg') },
      { label: 'Export as JSON', action: () => exportDiagram('json') },
    ],
  },
]
```

---

## 9. Diagram Toolbar

### 9.1 Toolbar Layout

```
┌────────────────────────────────────────────────────────────────┐
│ [Relationships ▾] | [🔍 Search...] | [Filter ▾] | [-] [+] [⊡] │
└────────────────────────────────────────────────────────────────┘
```

### 9.2 View Mode Toggle

**Options**:
- **Relationships**: Show dataset relationships
- **Lineage**: Show data lineage flow

**Behavior**:
- Switching view modes persists in diagram state
- Smooth transition animation (fade out, rearrange, fade in)

### 9.3 Search Bar

**Features**:
- Real-time filtering as user types
- Search across:
  - Dataset names
  - Dataset FQNs
  - Dataset descriptions
  - Column names (when expanded)
- Highlight matching nodes
- Navigate through matches with ↑↓ keys

### 9.4 Filter Panel

**Filters**:
```typescript
interface DiagramFilters {
  medallionLayers: MedallionLayer[]; // Multi-select
  entityTypes: EntityType[]; // Multi-select
  entitySubtypes: EntitySubtype[]; // Multi-select
  hasRelationships: boolean;
  hasLineage: boolean;
  aiConfidenceMin: number; // Slider 0-100
  syncStatus: SyncStatus[]; // Multi-select
}
```

**UI**:
```
┌────────────────────────────┐
│ Filter Datasets            │
├────────────────────────────┤
│ Medallion Layer:           │
│ ☑ Raw  ☑ Bronze            │
│ ☑ Silver  ☑ Gold           │
│                            │
│ Entity Type:               │
│ ☑ Table  ☐ Staging         │
│ ☑ DataVault  ☑ DataMart    │
│                            │
│ Entity Subtype:            │
│ ☑ Dimension  ☑ Fact        │
│ ☑ Hub  ☑ Satellite         │
│                            │
│ Options:                   │
│ ☐ Has Relationships        │
│ ☐ Has Lineage              │
│                            │
│ AI Confidence:             │
│ [====●=========] 50%        │
│                            │
│ Sync Status:               │
│ ☑ Synced  ☐ Pending        │
│ ☐ Conflict  ☐ Error        │
│                            │
│  [Reset]  [Apply]          │
└────────────────────────────┘
```

### 9.5 Zoom Controls

**Buttons**:
- **Zoom In** (+): Increase zoom by 0.2
- **Zoom Out** (-): Decrease zoom by 0.2
- **Fit View** (⊡): Reset zoom to fit all nodes

**Keyboard Shortcuts**:
- `Cmd/Ctrl + +`: Zoom in
- `Cmd/Ctrl + -`: Zoom out
- `Cmd/Ctrl + 0`: Fit view

---

## 10. Layout Algorithms

### 10.1 Hierarchical Layout (Medallion-Based)

**Purpose**: Organize nodes by medallion layer from left to right

**Algorithm**:
```typescript
function hierarchicalLayout(nodes: Node[]): NodePosition[] {
  const layers = groupBy(nodes, n => n.data.medallion_layer);
  const layerOrder = ['Raw', 'Bronze', 'Silver', 'Gold'];
  
  const positions: NodePosition[] = [];
  let xOffset = 100;
  
  for (const layer of layerOrder) {
    const layerNodes = layers[layer] || [];
    const layerHeight = layerNodes.length * 200; // Node height + spacing
    let yOffset = (viewportHeight - layerHeight) / 2; // Center vertically
    
    for (const node of layerNodes) {
      positions.push({
        node_id: node.id,
        x: xOffset,
        y: yOffset,
      });
      yOffset += 200;
    }
    
    xOffset += 400; // Move to next layer
  }
  
  return positions;
}
```

### 10.2 Force-Directed Layout

**Purpose**: Organic layout with natural clustering

**Library**: D3-force or `elkjs`

**Parameters**:
- **Charge**: Repulsion between nodes (-300)
- **Link Distance**: Desired edge length (150)
- **Center Force**: Pull towards center (0.1)
- **Collision**: Prevent overlap (node radius + 20)

### 10.3 Circular Layout

**Purpose**: Arrange nodes in a circle

**Algorithm**:
```typescript
function circularLayout(nodes: Node[]): NodePosition[] {
  const centerX = viewportWidth / 2;
  const centerY = viewportHeight / 2;
  const radius = Math.min(viewportWidth, viewportHeight) / 3;
  const angleStep = (2 * Math.PI) / nodes.length;
  
  return nodes.map((node, i) => ({
    node_id: node.id,
    x: centerX + radius * Math.cos(i * angleStep),
    y: centerY + radius * Math.sin(i * angleStep),
  }));
}
```

### 10.4 Lineage Layout (Dagre)

**Purpose**: Directed acyclic graph with clear flow direction

**Library**: `dagre`

**Configuration**:
```typescript
const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));
dagreGraph.setGraph({
  rankdir: 'LR', // Left-to-right
  ranksep: 200, // Horizontal spacing
  nodesep: 100, // Vertical spacing
  edgesep: 50, // Edge spacing
});
```

---

## 11. Performance Optimization

### 11.1 Virtual Rendering

**Problem**: Diagram with 500+ nodes causes lag

**Solution**: Viewport culling - only render visible nodes

**Implementation**:
```typescript
function getVisibleNodes(
  allNodes: Node[],
  viewport: Viewport
): Node[] {
  const visibleBounds = {
    minX: -viewport.x / viewport.zoom,
    maxX: (-viewport.x + viewportWidth) / viewport.zoom,
    minY: -viewport.y / viewport.zoom,
    maxY: (-viewport.y + viewportHeight) / viewport.zoom,
  };
  
  return allNodes.filter(node => {
    const nodeWidth = node.data.isExpanded ? 400 : 250;
    const nodeHeight = node.data.isExpanded 
      ? 120 + 40 * (node.data.columns?.length || 0)
      : 120;
    
    return !(
      node.position.x + nodeWidth < visibleBounds.minX ||
      node.position.x > visibleBounds.maxX ||
      node.position.y + nodeHeight < visibleBounds.minY ||
      node.position.y > visibleBounds.maxY
    );
  });
}
```

### 11.2 Edge Simplification

**Problem**: Complex edge paths slow rendering

**Solution**: Simplify paths for distant edges

**Implementation**:
```typescript
function simplifyEdgePath(edge: Edge, zoom: number): string {
  if (zoom < 0.5) {
    // At low zoom, use straight lines
    return `M ${edge.source.x} ${edge.source.y} L ${edge.target.x} ${edge.target.y}`;
  } else {
    // At high zoom, use full bezier curves
    return edge.data.path;
  }
}
```

### 11.3 Memoization

**Strategy**: Cache expensive calculations

**Candidates**:
- Node rendering (React.memo)
- Edge path calculations
- Layout algorithms
- Filter operations

```typescript
const DatasetNode = React.memo(({ data, id }: NodeProps<DatasetNodeData>) => {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison for deep equality
  return (
    prevProps.data.isExpanded === nextProps.data.isExpanded &&
    prevProps.data.isHighlighted === nextProps.data.isHighlighted &&
    prevProps.data.columnCount === nextProps.data.columnCount
  );
});
```

---

## 12. Accessibility

### 12.1 Keyboard Navigation

**Shortcuts**:
- `Tab`: Navigate between nodes
- `Shift + Tab`: Navigate backwards
- `Enter`: Open selected node
- `Escape`: Close dialogs/deselect
- `Delete`: Delete selected node/edge
- `Cmd/Ctrl + C`: Copy selected node
- `Cmd/Ctrl + V`: Paste node
- `Cmd/Ctrl + Z`: Undo
- `Cmd/Ctrl + Shift + Z`: Redo
- `Arrow Keys`: Move selected node (10px increments)
- `Shift + Arrow Keys`: Move selected node (1px increments)

### 12.2 Screen Reader Support

**ARIA Labels**:
```tsx
<div
  role="button"
  aria-label={`Dataset ${node.data.name}, ${node.data.medallion_layer} layer, ${node.data.columnCount} columns`}
  tabIndex={0}
  onKeyDown={handleKeyDown}
>
  {/* Node content */}
</div>
```

**Announcements**:
- When node is selected: "Selected dataset {name}"
- When relationship is created: "Created {type} relationship from {source} to {target}"
- When layout changes: "Layout changed to {layout_type}"

### 12.3 Focus Management

**Focus Ring**:
- Visible focus indicator (2px solid ring)
- High contrast color (#3b82f6)
- Follows keyboard navigation

**Focus Trap**:
- When dialog opens, trap focus within dialog
- `Escape` closes and returns focus to trigger element

---

## 13. Testing Strategy

### 13.1 Unit Tests

**Test Cases**:
```typescript
describe('DatasetDiagramView', () => {
  describe('Node Expansion', () => {
    it('should expand node and show columns', () => {});
    it('should collapse node and hide columns', () => {});
    it('should animate expansion smoothly', () => {});
  });
  
  describe('Relationship Creation', () => {
    it('should validate source and target nodes', () => {});
    it('should prevent self-referencing relationships', () => {});
    it('should create edge with correct styling', () => {});
  });
  
  describe('Layout Algorithms', () => {
    it('should apply hierarchical layout correctly', () => {});
    it('should respect medallion layer order', () => {});
    it('should handle empty layers gracefully', () => {});
  });
  
  describe('Diagram State Persistence', () => {
    it('should save node positions to local storage', () => {});
    it('should debounce saves to Supabase', () => {});
    it('should load state on mount', () => {});
  });
});
```

### 13.2 Integration Tests

**Scenarios**:
1. User creates dataset → Appears on diagram → Persisted
2. User drags node → Position updates → Saved to state
3. User creates relationship → Edge renders → Persisted
4. User switches to lineage view → Diagram rearranges → State saved

### 13.3 Performance Tests

**Benchmarks**:
- Load time with 100 nodes: < 1 second
- Load time with 500 nodes: < 3 seconds
- Diagram interaction lag: < 16ms (60 FPS)
- Save operation latency: < 200ms
- Layout calculation time: < 500ms

---

## 14. API Endpoints

### 14.1 Diagram State

**GET** `/api/workspaces/:workspace_id/diagram-state`
- Returns: Current diagram state
- Response:
```json
{
  "diagram_id": "uuid",
  "view_mode": "relationships",
  "viewport": {"x": 0, "y": 0, "zoom": 1},
  "node_positions": {"node_uuid": {"x": 100, "y": 200}},
  "node_expansions": {"node_uuid": true},
  "edge_routes": {"edge_uuid": {...}},
  "filters": {...},
  "version": 5
}
```

**PUT** `/api/workspaces/:workspace_id/diagram-state`
- Body: Updated diagram state
- Returns: Updated state with new version number

### 14.2 Datasets

**GET** `/api/workspaces/:workspace_id/datasets`
- Query params: `?medallion_layer=Gold&entity_type=DataMart`
- Returns: Array of datasets with metadata

**GET** `/api/datasets/:dataset_id/columns`
- Returns: Array of columns for dataset

### 14.3 Relationships

**GET** `/api/datasets/:dataset_id/relationships`
- Returns: Array of relationships involving dataset

**POST** `/api/relationships`
- Body:
```json
{
  "source_dataset_id": "uuid",
  "target_dataset_id": "uuid",
  "source_columns": ["uuid"],
  "target_columns": ["uuid"],
  "relationship_type": "FK",
  "cardinality": "1:M"
}
```
- Returns: Created relationship

**DELETE** `/api/relationships/:relationship_id`
- Returns: Success status

### 14.4 Lineage

**GET** `/api/datasets/:dataset_id/lineage?direction=both`
- Query params: `direction=upstream|downstream|both`
- Returns:
```json
{
  "upstream": [
    {
      "dataset_id": "uuid",
      "dataset_name": "stg_customers",
      "column_id": "uuid",
      "column_name": "customer_id",
      "mapping_type": "Direct"
    }
  ],
  "downstream": [...]
}
```

---

## 15. Implementation Phases

### Phase 1: Core Canvas (Week 1-2)
- Setup React Flow canvas
- Create basic dataset node component
- Implement node positioning
- Add zoom/pan controls
- Build minimap

### Phase 2: Node Expansion (Week 2-3)
- Implement expand/collapse functionality
- Build column list component
- Add smooth animations
- Handle dynamic node sizing

### Phase 3: Relationships (Week 3-4)
- Create relationship edge component
- Implement drag-to-create workflow
- Build relationship dialog
- Add validation logic
- Render edges with styling

### Phase 4: Diagram State (Week 4-5)
- Implement local storage persistence
- Add Supabase sync
- Build debouncing logic
- Create conflict resolution
- Add version tracking

### Phase 5: View Modes (Week 5-6)
- Implement relationship view
- Build lineage view
- Add view mode toggle
- Create lineage highlighting
- Implement column-level lineage

### Phase 6: Edge Management (Week 6-7)
- Build edge alignment system
- Implement smart routing
- Add manual control points
- Create edge persistence
- Build edge context menu

### Phase 7: Context Menus (Week 7)
- Implement node context menu
- Build edge context menu
- Create canvas context menu
- Add keyboard shortcuts

### Phase 8: Toolbar & Filters (Week 8)
- Build diagram toolbar
- Implement search functionality
- Create filter panel
- Add zoom controls
- Build view mode selector

### Phase 9: Layout Algorithms (Week 9)
- Implement hierarchical layout
- Add force-directed layout
- Create circular layout
- Build lineage layout (dagre)
- Add auto-layout button

### Phase 10: Performance & Polish (Week 10)
- Optimize viewport culling
- Add edge simplification
- Implement memoization
- Enhance animations
- Fix accessibility issues

### Phase 11: Testing (Week 11-12)
- Write unit tests
- Create integration tests
- Perform performance tests
- Conduct accessibility audit
- User acceptance testing

---
