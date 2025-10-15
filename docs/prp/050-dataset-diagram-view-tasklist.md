# Dataset Diagram View - Task List

## Phase 1: Core Canvas Setup

### 1.1 Project Structure
- [x] **1.1.1** Create diagram feature directory structure:
  ```
  src/components/Diagram/
  ├── DatasetDiagramView.tsx (Container) ✓
  ├── DiagramToolbar.tsx ✓
  ├── nodes/
  │   ├── DatasetNode.tsx ✓
  │   └── ColumnList.tsx ✓
  ├── edges/
  │   └── DiagramEdge.tsx ✓ (includes Relationship & Lineage)
  └── utils/
      ├── layoutAlgorithms.ts ✓
      ├── edgeRouting.ts ✓
      └── diagramStatePersistence.ts ✓
  ```
- [x] **1.1.2** Create TypeScript interfaces in `src/types/diagram.ts` ✓
- [x] **1.1.3** Setup Zustand store in `src/store/diagramStore.ts` ✓

### 1.2 React Flow Canvas
- [ ] **1.2.1** Install React Flow: `npm install @xyflow/react`
- [ ] **1.2.2** Create base `DiagramCanvas.tsx` component with React Flow
- [ ] **1.2.3** Configure React Flow provider with default settings
- [ ] **1.2.4** Add Background component with grid pattern
- [ ] **1.2.5** Add Controls component (zoom, fit view)
- [ ] **1.2.6** Add MiniMap component with node color coding
- [ ] **1.2.7** Setup viewport state management (zoom, pan)
- [ ] **1.2.8** Implement keyboard shortcuts for zoom/pan
- [ ] **1.2.9** Test canvas responsiveness and interaction

### 1.3 Basic Dataset Node
- [ ] **1.3.1** Create `DatasetNode.tsx` custom node component
- [ ] **1.3.2** Implement node header with icon and layer badge:
  - Dataset name display
  - Entity type icon
  - Medallion layer badge with color
- [ ] **1.3.3** Build node body with metadata:
  - Entity type and subtype
  - Column count
  - Relationship count
- [ ] **1.3.4** Create node footer with action buttons:
  - Expand/Collapse button
  - Edit button
  - More actions dropdown
- [ ] **1.3.5** Apply styling with Tailwind CSS:
  - Rounded corners
  - Shadow effects
  - Border colors by medallion layer
  - Hover states
- [ ] **1.3.6** Register custom node type with React Flow
- [ ] **1.3.7** Test node rendering with mock data

### 1.4 Node Positioning
- [ ] **1.4.1** Implement drag-and-drop for nodes
- [ ] **1.4.2** Add snap-to-grid functionality (15x15 grid)
- [ ] **1.4.3** Create `updateNodePosition` action in store
- [ ] **1.4.4** Implement position change handler
- [ ] **1.4.5** Add visual feedback during drag (cursor change, elevation)
- [ ] **1.4.6** Test position persistence to local storage
- [ ] **1.4.7** Implement collision detection (prevent overlap)
- [ ] **1.4.8** Add undo/redo for position changes

### 1.5 Zoom & Pan Controls
- [ ] **1.5.1** Configure zoom range (0.1 to 4.0)
- [ ] **1.5.2** Implement zoom in/out buttons
- [ ] **1.5.3** Add zoom slider control
- [ ] **1.5.4** Create fit-to-view button
- [ ] **1.5.5** Implement double-click to zoom in
- [ ] **1.5.6** Add scroll wheel zoom
- [ ] **1.5.7** Implement pinch-to-zoom (touch devices)
- [ ] **1.5.8** Create pan with middle mouse button
- [ ] **1.5.9** Add pan with space bar + drag
- [ ] **1.5.10** Display current zoom level indicator
- [ ] **1.5.11** Test zoom/pan on different screen sizes

### 1.6 MiniMap
- [ ] **1.6.1** Position MiniMap in bottom-right corner
- [ ] **1.6.2** Customize MiniMap node colors by medallion layer
- [ ] **1.6.3** Implement viewport rectangle indicator
- [ ] **1.6.4** Add click-to-navigate on MiniMap
- [ ] **1.6.5** Create toggle to show/hide MiniMap
- [ ] **1.6.6** Optimize MiniMap performance for large diagrams
- [ ] **1.6.7** Test MiniMap responsiveness

---

## Phase 2: Node Expansion

### 2.1 Expand/Collapse Functionality
- [ ] **2.1.1** Add `isExpanded` state to node data
- [ ] **2.1.2** Create `toggleNodeExpansion` action in store
- [ ] **2.1.3** Implement expand button click handler
- [ ] **2.1.4** Build collapse button click handler
- [ ] **2.1.5** Add expansion state to diagram persistence
- [ ] **2.1.6** Test expansion state persistence
- [ ] **2.1.7** Implement keyboard shortcut for expand/collapse (E key)

### 2.2 Column List Component
- [ ] **2.2.1** Create `ColumnList.tsx` component
- [ ] **2.2.2** Fetch columns from API on node expansion
- [ ] **2.2.3** Implement loading state while fetching columns
- [ ] **2.2.4** Build `ColumnItem.tsx` component:
  - Column icon (PK/FK indicators)
  - Column name
  - Data type
  - Description tooltip on hover
- [ ] **2.2.5** Add scroll container for long column lists
- [ ] **2.2.6** Implement virtual scrolling for 100+ columns
- [ ] **2.2.7** Create "Add Column" button at bottom of list
- [ ] **2.2.8** Test column list rendering with mock data
- [ ] **2.2.9** Handle empty state (no columns)

### 2.3 Dynamic Node Sizing
- [ ] **2.3.1** Calculate node height based on column count
- [ ] **2.3.2** Implement smooth transition on size change (300ms)
- [ ] **2.3.3** Update node bounds in React Flow
- [ ] **2.3.4** Adjust connected edges when node size changes
- [ ] **2.3.5** Test resizing with various column counts (0, 5, 20, 50)
- [ ] **2.3.6** Ensure minimap updates reflect size changes
- [ ] **2.3.7** Optimize performance for multiple simultaneous expansions

### 2.4 Column Selection
- [ ] **2.4.1** Add checkbox to each column item
- [ ] **2.4.2** Implement multi-select functionality (Shift + Click)
- [ ] **2.4.3** Create selected columns state in store
- [ ] **2.4.4** Highlight selected columns visually
- [ ] **2.4.5** Add "Select All" / "Deselect All" buttons
- [ ] **2.4.6** Build selection toolbar (appears when columns selected):
  - Create relationship button
  - Delete columns button
  - Export selected button
- [ ] **2.4.7** Test selection with keyboard (Space to select)

### 2.5 Column Actions
- [ ] **2.5.1** Add hover actions on column items:
  - Edit icon
  - Delete icon
  - Drag handle (for reordering)
- [ ] **2.5.2** Implement inline editing for column name and type
- [ ] **2.5.3** Create column edit dialog (for advanced properties)
- [ ] **2.5.4** Build column delete confirmation
- [ ] **2.5.5** Implement drag-and-drop column reordering
- [ ] **2.5.6** Add visual feedback during column drag
- [ ] **2.5.7** Persist column order changes to backend
- [ ] **2.5.8** Test all column actions

### 2.6 Animation & Transitions
- [ ] **2.6.1** Add expand animation (height transition)
- [ ] **2.6.2** Add collapse animation (height transition)
- [ ] **2.6.3** Implement fade-in for column list
- [ ] **2.6.4** Add smooth scrolling in column container
- [ ] **2.6.5** Create loading skeleton during column fetch
- [ ] **2.6.6** Test animations on different browsers
- [ ] **2.6.7** Ensure animations don't block interactions

---

## Phase 3: Relationship Management

### 3.1 Relationship Edge Component
- [ ] **3.1.1** Create `RelationshipEdge.tsx` custom edge component
- [ ] **3.1.2** Implement edge styling based on relationship type:
  - FK: Solid blue line
  - BusinessKey: Dashed purple line
  - NaturalKey: Dotted green line
- [ ] **3.1.3** Add edge thickness variation (1.5px to 2.5px)
- [ ] **3.1.4** Create cardinality label component
- [ ] **3.1.5** Position cardinality label at edge center
- [ ] **3.1.6** Implement crow's foot notation markers:
  - 1:1: Single line both ends
  - 1:M: Single line source, crow's foot target
  - M:M: Crow's foot both ends
- [ ] **3.1.7** Add hover effect on edges (highlight, tooltip)
- [ ] **3.1.8** Register custom edge type with React Flow
- [ ] **3.1.9** Test edge rendering with mock relationships

### 3.2 Drag-to-Create Relationship
- [ ] **3.2.1** Implement "Add Relationship" button on node footer
- [ ] **3.2.2** Enable drag from node to start relationship creation
- [ ] **3.2.3** Enable drag from column (in expanded node)
- [ ] **3.2.4** Highlight valid target nodes during drag
- [ ] **3.2.5** Show connection preview line while dragging
- [ ] **3.2.6** Implement drop handler on target node
- [ ] **3.2.7** Open `AddRelationshipDialog` on successful drop
- [ ] **3.2.8** Handle invalid drops (show error toast)
- [ ] **3.2.9** Test drag-to-create workflow end-to-end

### 3.3 Add Relationship Dialog
- [ ] **3.3.1** Create `AddRelationshipDialog.tsx` component
- [ ] **3.3.2** Display source and target dataset names (read-only)
- [ ] **3.3.3** Build relationship type radio buttons (FK, BusinessKey, NaturalKey)
- [ ] **3.3.4** Create cardinality selector (1:1, 1:M, M:M)
- [ ] **3.3.5** Implement source columns multi-select dropdown:
  - Show all columns from source dataset
  - Support multi-select
  - Display column data types
- [ ] **3.3.6** Build target columns multi-select dropdown:
  - Show all columns from target dataset
  - Match count with source columns
  - Highlight compatible data types
- [ ] **3.3.7** Add optional description textarea
- [ ] **3.3.8** Implement real-time validation:
  - Column count match
  - Data type compatibility
  - No duplicate relationships
- [ ] **3.3.9** Display validation errors clearly
- [ ] **3.3.10** Create "Create Relationship" button (disabled if invalid)
- [ ] **3.3.11** Add "Cancel" button
- [ ] **3.3.12** Test dialog with various input combinations

### 3.4 Relationship Validation Service
- [ ] **3.4.1** Create `relationshipValidation.ts` utility
- [ ] **3.4.2** Implement `validateRelationship` function:
  - Check for self-references
  - Validate column count match
  - Check data type compatibility
  - Detect duplicate relationships
  - Validate FK targets PK
- [ ] **3.4.3** Create `areTypesCompatible` helper function
- [ ] **3.4.4** Build `getExistingRelationships` query function
- [ ] **3.4.5** Write unit tests for all validation rules
- [ ] **3.4.6** Test validation with edge cases

### 3.5 Relationship Creation
- [ ] **3.5.1** Create `createRelationship` API endpoint
- [ ] **3.5.2** Implement relationship creation service function
- [ ] **3.5.3** Store relationship in `columns` table (via reference_column_id)
- [ ] **3.5.4** Generate relationship ID (UUID)
- [ ] **3.5.5** Create edge in React Flow canvas
- [ ] **3.5.6** Update node relationship counts
- [ ] **3.5.7** Add relationship to diagram state
- [ ] **3.5.8** Show success toast notification
- [ ] **3.5.9** Close dialog and highlight new edge
- [ ] **3.5.10** Test creation with API integration

### 3.6 Edge Click & Details
- [ ] **3.6.1** Implement edge click handler
- [ ] **3.6.2** Create `RelationshipDetailsDialog.tsx` component
- [ ] **3.6.3** Display relationship metadata:
  - Source dataset and columns
  - Target dataset and columns
  - Relationship type
  - Cardinality
  - Description
  - Created date
- [ ] **3.6.4** Add "Edit" button to open edit mode
- [ ] **3.6.5** Build "Delete" button with confirmation
- [ ] **3.6.6** Implement relationship editing (reopen dialog)
- [ ] **3.6.7** Test details dialog with mock data

### 3.7 Relationship Deletion
- [ ] **3.7.1** Create delete confirmation dialog
- [ ] **3.7.2** Implement `deleteRelationship` API endpoint
- [ ] **3.7.3** Build relationship deletion service function
- [ ] **3.7.4** Remove relationship from database
- [ ] **3.7.5** Remove edge from React Flow canvas
- [ ] **3.7.6** Update node relationship counts
- [ ] **3.7.7** Update diagram state
- [ ] **3.7.8** Show success toast
- [ ] **3.7.9** Test deletion workflow

### 3.8 Edge Context Menu
- [ ] **3.8.1** Implement right-click handler on edges
- [ ] **3.8.2** Create `EdgeContextMenu.tsx` component
- [ ] **3.8.3** Add menu items:
  - Edit Relationship
  - View Details
  - Realign Edge
  - Add Control Point
  - Delete Relationship
- [ ] **3.8.4** Position menu at cursor location
- [ ] **3.8.5** Close menu on outside click or action
- [ ] **3.8.6** Test context menu interactions

---

## Phase 4: Diagram State Persistence

### 4.1 Local Storage Persistence
- [ ] **4.1.1** Create `diagramStatePersistence.ts` service
- [ ] **4.1.2** Implement `saveToLocalStorage` function:
  - Serialize diagram state
  - Save viewport (zoom, pan)
  - Save node positions
  - Save node expansions
  - Save edge routes
  - Save filters
- [ ] **4.1.3** Build `loadFromLocalStorage` function
- [ ] **4.1.4** Add state change listeners in Zustand store
- [ ] **4.1.5** Trigger save on state changes (debounced)
- [ ] **4.1.6** Test local storage persistence
- [ ] **4.1.7** Handle quota exceeded errors gracefully

### 4.2 Supabase Persistence
- [ ] **4.2.1** Create `diagram_states` table in Supabase:
  ```sql
  CREATE TABLE diagram_states (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    diagram_type VARCHAR NOT NULL DEFAULT 'dataset',
    view_mode VARCHAR NOT NULL DEFAULT 'relationships',
    viewport JSONB NOT NULL,
    node_positions JSONB NOT NULL,
    node_expansions JSONB NOT NULL,
    edge_routes JSONB,
    filters JSONB,
    last_modified_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    version INTEGER DEFAULT 1,
    UNIQUE(workspace_id, diagram_type)
  );
  ```
- [ ] **4.2.2** Create indexes:
  ```sql
  CREATE INDEX idx_diagram_states_workspace ON diagram_states(workspace_id);
  CREATE INDEX idx_diagram_states_account ON diagram_states(account_id);
  ```
- [ ] **4.2.3** Implement `saveToSupabase` function
- [ ] **4.2.4** Build `loadFromSupabase` function
- [ ] **4.2.5** Add debouncing logic (5 second delay)
- [ ] **4.2.6** Implement version tracking
- [ ] **4.2.7** Test Supabase persistence
- [ ] **4.2.8** Handle network errors gracefully

### 4.3 State Synchronization
- [ ] **4.3.1** Create `DiagramStateManager` class:
  - markDirty() method
  - scheduleSave() method
  - saveToSupabase() method
  - loadFromSupabase() method
  - buildStateSnapshot() method
  - applyStateSnapshot() method
- [ ] **4.3.2** Implement save queue (batch multiple changes)
- [ ] **4.3.3** Add retry logic for failed saves
- [ ] **4.3.4** Create save status indicator in UI (saving/saved/error)
- [ ] **4.3.5** Test state synchronization between local and Supabase
- [ ] **4.3.6** Handle offline mode (queue saves)

### 4.4 Conflict Resolution
- [ ] **4.4.1** Implement version check on save
- [ ] **4.4.2** Detect version mismatch (conflict)
- [ ] **4.4.3** Create `ConflictResolutionDialog.tsx` component
- [ ] **4.4.4** Display conflict information:
  - Local version
  - Remote version
  - Conflicting fields
- [ ] **4.4.5** Implement resolution strategies:
  - **Auto-Merge**: Merge non-overlapping changes
  - **Keep Mine**: Overwrite with local changes
  - **Take Theirs**: Discard local changes
- [ ] **4.4.6** Build diff viewer for manual resolution
- [ ] **4.4.7** Apply resolution and increment version
- [ ] **4.4.8** Test conflict scenarios with multiple users

### 4.5 State Loading on Mount
- [ ] **4.5.1** Implement `useEffect` hook to load state on mount
- [ ] **4.5.2** Check local storage first (faster)
- [ ] **4.5.3** Fall back to Supabase if local storage empty
- [ ] **4.5.4** Apply loaded state to React Flow
- [ ] **4.5.5** Restore viewport (zoom, pan)
- [ ] **4.5.6** Restore node positions
- [ ] **4.5.7** Restore node expansions
- [ ] **4.5.8** Restore filters
- [ ] **4.5.9** Show loading indicator during state load
- [ ] **4.5.10** Test state loading with various scenarios

---

## Phase 5: View Modes

### 5.1 View Mode Toggle
- [ ] **5.1.1** Add view mode state to Zustand store
- [ ] **5.1.2** Create `ViewModeToggle.tsx` component (Relationships | Lineage)
- [ ] **5.1.3** Style toggle as segmented control
- [ ] **5.1.4** Implement toggle click handler
- [ ] **5.1.5** Persist view mode to diagram state
- [ ] **5.1.6** Test view mode switching

### 5.2 Relationship View
- [ ] **5.2.1** Fetch all datasets
- [ ] **5.2.2** Fetch all relationships from API
- [ ] **5.2.3** Transform datasets to React Flow nodes
- [ ] **5.2.4** Transform relationships to React Flow edges
- [ ] **5.2.5** Apply hierarchical layout by medallion layer
- [ ] **5.2.6** Render nodes with relationship counts
- [ ] **5.2.7** Render edges with relationship type styling
- [ ] **5.2.8** Add cardinality labels to edges
- [ ] **5.2.9** Test relationship view with mock data
- [ ] **5.2.10** Optimize rendering for 100+ relationships

### 5.3 Lineage View
- [ ] **5.3.1** Create `LineageView.tsx` component
- [ ] **5.3.2** Implement dataset selection for lineage focus
- [ ] **5.3.3** Fetch upstream lineage from API:
  ```typescript
  GET /api/datasets/:dataset_id/lineage?direction=upstream
  ```
- [ ] **5.3.4** Fetch downstream lineage from API:
  ```typescript
  GET /api/datasets/:dataset_id/lineage?direction=downstream
  ```
- [ ] **5.3.5** Transform lineage data to React Flow nodes and edges
- [ ] **5.3.6** Apply dagre layout (left-to-right flow)
- [ ] **5.3.7** Position selected dataset in center
- [ ] **5.3.8** Position upstream datasets to the left
- [ ] **5.3.9** Position downstream datasets to the right
- [ ] **5.3.10** Render edges with data flow direction
- [ ] **5.3.11** Add edge labels with mapping types
- [ ] **5.3.12** Test lineage view with complex lineage

### 5.4 Lineage Edge Component
- [ ] **5.4.1** Create `LineageEdge.tsx` custom edge component
- [ ] **5.4.2** Style edge by mapping type:
  - Direct: Solid green
  - Transform: Solid amber
  - Derived: Dashed purple
  - Calculated: Dotted indigo
- [ ] **5.4.3** Add animated flow effect (SVG animation)
- [ ] **5.4.4** Create edge label with mapping type
- [ ] **5.4.5** Add transformation expression on hover (tooltip)
- [ ] **5.4.6** Register lineage edge type with React Flow
- [ ] **5.4.7** Test lineage edge rendering

### 5.5 Lineage Highlighting
- [ ] **5.5.1** Implement `highlightLineage` action in store
- [ ] **5.5.2** Add highlight state to nodes and edges
- [ ] **5.5.3** Calculate lineage path from selected node
- [ ] **5.5.4** Highlight all nodes in lineage path
- [ ] **5.5.5** Highlight all edges in lineage path
- [ ] **5.5.6** Dim non-highlighted nodes (reduce opacity)
- [ ] **5.5.7** Dim non-highlighted edges
- [ ] **5.5.8** Add highlight direction indicators (upstream/downstream)
- [ ] **5.5.9** Implement `clearHighlights` action
- [ ] **5.5.10** Test highlighting with complex lineage graphs

### 5.6 Column-Level Lineage
- [ ] **5.6.1** Add "Column View" toggle in lineage mode
- [ ] **5.6.2** Auto-expand all nodes when column view enabled
- [ ] **5.6.3** Fetch column-level lineage from API:
  ```typescript
  GET /api/lineage?dataset_id=xxx&level=column
  ```
- [ ] **5.6.4** Transform column lineage to edges between columns
- [ ] **5.6.5** Update edge sources/targets to specific columns
- [ ] **5.6.6** Adjust edge routing for column-to-column connections
- [ ] **5.6.7** Add column highlighting on hover
- [ ] **5.6.8** Show transformation expression on column edge hover
- [ ] **5.6.9** Test column-level lineage with multiple columns
- [ ] **5.6.10** Optimize layout for dense column lineage

### 5.7 View Transition Animation
- [ ] **5.7.1** Implement fade-out animation (300ms)
- [ ] **5.7.2** Clear current nodes and edges
- [ ] **5.7.3** Calculate new layout
- [ ] **5.7.4** Implement fade-in animation (300ms)
- [ ] **5.7.5** Animate viewport transition (pan/zoom)
- [ ] **5.7.6** Add loading indicator during layout calculation
- [ ] **5.7.7** Test transition smoothness
- [ ] **5.7.8** Handle rapid view mode switching

---

## Phase 6: Edge Management & Routing

### 6.1 Edge Alignment System
- [ ] **6.1.1** Create `edgeRouting.ts` utility service
- [ ] **6.1.2** Implement `calculatePath` function:
  - Accept source node, target node, obstacles
  - Return optimized path (SVG path string)
- [ ] **6.1.3** Create `findBestConnectionPoints` function:
  - Analyze node positions
  - Return optimal anchor points (top/right/bottom/left)
- [ ] **6.1.4** Build `optimizeRoute` function:
  - Check for node intersections
  - Avoid overlapping edges
  - Minimize edge crossings
- [ ] **6.1.5** Implement pathfinding algorithm (A* or similar)
- [ ] **6.1.6** Test edge routing with various node layouts
- [ ] **6.1.7** Optimize performance for 100+ edges

### 6.2 Smart Routing
- [ ] **6.2.1** Implement straight line routing
- [ ] **6.2.2** Implement bezier curve routing
- [ ] **6.2.3** Implement step routing (orthogonal)
- [ ] **6.2.4** Implement smooth step routing (rounded orthogonal)
- [ ] **6.2.5** Add route type selector in edge context menu
- [ ] **6.2.6** Auto-select best route type based on layout
- [ ] **6.2.7** Test all routing types
- [ ] **6.2.8** Compare routing performance

### 6.3 Connection Points
- [ ] **6.3.1** Define connection points on node borders:
  - Top: { x: width / 2, y: 0 }
  - Right: { x: width, y: height / 2 }
  - Bottom: { x: width / 2, y: height }
  - Left: { x: 0, y: height / 2 }
  - Center: { x: width / 2, y: height / 2 }
- [ ] **6.3.2** Create visual indicators for connection points
- [ ] **6.3.3** Highlight connection points on node hover (when creating edge)
- [ ] **6.3.4** Snap edge endpoint to nearest connection point
- [ ] **6.3.5** Allow manual override of connection point
- [ ] **6.3.6** Test connection point snapping

### 6.4 Manual Edge Adjustment
- [ ] **6.4.1** Enable edge selection on click
- [ ] **6.4.2** Show control points on selected edge
- [ ] **6.4.3** Implement drag handler for control points
- [ ] **6.4.4** Add new control point on double-click edge
- [ ] **6.4.5** Remove control point on right-click control point
- [ ] **6.4.6** Update edge path during control point drag
- [ ] **6.4.7** Persist custom edge routes to diagram state
- [ ] **6.4.8** Mark edges as "userModified" when adjusted
- [ ] **6.4.9** Add "Reset to Auto" option in edge context menu
- [ ] **6.4.10** Test manual edge adjustment

### 6.5 Snap Guides
- [ ] **6.5.1** Create `SnapGuides.tsx` component
- [ ] **6.5.2** Show vertical guide when dragging edge near node center-x
- [ ] **6.5.3** Show horizontal guide when dragging edge near node center-y
- [ ] **6.5.4** Show guide when edge aligns with other edges
- [ ] **6.5.5** Style guides as dashed lines (blue, 1px)
- [ ] **6.5.6** Add snap threshold (10px)
- [ ] **6.5.7** Snap edge to guide on release
- [ ] **6.5.8** Test snap guides with multiple edges

### 6.6 Edge Persistence
- [ ] **6.6.1** Add edge routes to diagram state:
  ```typescript
  edge_routes: {
    edge_id: {
      path: string,
      controlPoints: Position[],
      alignmentType: 'straight' | 'bezier' | 'step' | 'smooth-step',
      userModified: boolean
    }
  }
  ```
- [ ] **6.6.2** Save edge routes to local storage
- [ ] **6.6.3** Save edge routes to Supabase
- [ ] **6.6.4** Load edge routes on diagram mount
- [ ] **6.6.5** Apply saved routes to edges
- [ ] **6.6.6** Handle missing edge routes (use auto-routing)
- [ ] **6.6.7** Test edge persistence across sessions

### 6.7 Edge Optimization
- [ ] **6.7.1** Implement "Realign All Edges" function
- [ ] **6.7.2** Batch edge path calculations
- [ ] **6.7.3** Cache edge paths (invalidate on node move)
- [ ] **6.7.4** Simplify edge paths at low zoom levels
- [ ] **6.7.5** Use straight lines when zoom < 0.5
- [ ] **6.7.6** Optimize edge rendering (React.memo)
- [ ] **6.7.7** Test edge optimization with 200+ edges

---

## Phase 7: Context Menus

### 7.1 Dataset Node Context Menu
- [ ] **7.1.1** Create `DatasetContextMenu.tsx` component
- [ ] **7.1.2** Implement right-click handler on nodes
- [ ] **7.1.3** Prevent default browser context menu
- [ ] **7.1.4** Position menu at cursor location
- [ ] **7.1.5** Add menu items:
  - Edit Properties
  - Add Relationship
  - View Lineage
  - Accelerate (Data Vault)
  - Clone Dataset
  - Export as YAML
  - Delete
- [ ] **7.1.6** Implement action handlers for each menu item
- [ ] **7.1.7** Close menu on outside click
- [ ] **7.1.8** Close menu on action click
- [ ] **7.1.9** Disable "Accelerate" if not Bronze layer
- [ ] **7.1.10** Show lineage count badge on "View Lineage"
- [ ] **7.1.11** Test context menu interactions

### 7.2 Edge Context Menu
- [ ] **7.2.1** Create `EdgeContextMenu.tsx` component
- [ ] **7.2.2** Implement right-click handler on edges
- [ ] **7.2.3** Position menu at cursor location
- [ ] **7.2.4** Add menu items:
  - Edit Relationship
  - View Details
  - Realign Edge
  - Add Control Point
  - Delete Relationship
- [ ] **7.2.5** Implement action handlers
- [ ] **7.2.6** Open relationship details dialog on "View Details"
- [ ] **7.2.7** Trigger realignment on "Realign Edge"
- [ ] **7.2.8** Add control point at cursor position
- [ ] **7.2.9** Confirm delete with dialog
- [ ] **7.2.10** Test edge context menu

### 7.3 Canvas Context Menu
- [ ] **7.3.1** Create `CanvasContextMenu.tsx` component
- [ ] **7.3.2** Implement right-click handler on canvas (empty area)
- [ ] **7.3.3** Capture click position for new node placement
- [ ] **7.3.4** Add menu items:
  - Add Dataset
  - Import Metadata
  - Auto-Layout (submenu)
  - Fit View
  - Export Diagram (submenu)
- [ ] **7.3.5** Build auto-layout submenu:
  - Hierarchical
  - Force Directed
  - Circular
- [ ] **7.3.6** Build export diagram submenu:
  - Export as PNG
  - Export as SVG
  - Export as JSON
- [ ] **7.3.7** Implement "Add Dataset" at cursor position
- [ ] **7.3.8** Open import dialog on "Import Metadata"
- [ ] **7.3.9** Apply selected layout on submenu click
- [ ] **7.3.10** Trigger diagram export on submenu click
- [ ] **7.3.11** Test canvas context menu

### 7.4 Context Menu Styling
- [ ] **7.4.1** Style context menu with Tailwind CSS:
  - White background
  - Shadow (shadow-lg)
  - Rounded corners (rounded-lg)
  - Border (border gray-200)
- [ ] **7.4.2** Add menu item hover effects (bg-gray-100)
- [ ] **7.4.3** Style separators (border-t gray-200)
- [ ] **7.4.4** Add icons to menu items (lucide-react)
- [ ] **7.4.5** Style destructive items (text-red-600)
- [ ] **7.4.6** Add disabled state styling (opacity-50, cursor-not-allowed)
- [ ] **7.4.7** Test menu styling across browsers

### 7.5 Keyboard Shortcuts
- [ ] **7.5.1** Add keyboard event listener to diagram
- [ ] **7.5.2** Implement shortcuts:
  - `Delete`: Delete selected node/edge
  - `Cmd/Ctrl + C`: Copy selected node
  - `Cmd/Ctrl + V`: Paste node
  - `Cmd/Ctrl + Z`: Undo
  - `Cmd/Ctrl + Shift + Z`: Redo
  - `Arrow Keys`: Move selected node (10px)
  - `Shift + Arrow Keys`: Move selected node (1px)
  - `Cmd/Ctrl + +`: Zoom in
  - `Cmd/Ctrl + -`: Zoom out
  - `Cmd/Ctrl + 0`: Fit view
  - `E`: Expand/collapse selected node
  - `Escape`: Clear selection
- [ ] **7.5.3** Prevent shortcuts when dialog is open
- [ ] **7.5.4** Prevent shortcuts when input is focused
- [ ] **7.5.5** Display keyboard shortcut hints in UI
- [ ] **7.5.6** Test all keyboard shortcuts

---

## Phase 8: Toolbar & Filters

### 8.1 Diagram Toolbar
- [ ] **8.1.1** Create `DiagramToolbar.tsx` component
- [ ] **8.1.2** Position toolbar at top of diagram
- [ ] **8.1.3** Layout toolbar items horizontally:
  - View Mode Toggle (left)
  - Search Bar (center)
  - Filter Button (right)
  - Zoom Controls (right)
- [ ] **8.1.4** Make toolbar sticky on scroll
- [ ] **8.1.5** Add toolbar background (bg-white with shadow)
- [ ] **8.1.6** Test toolbar responsiveness

### 8.2 Search Functionality
- [ ] **8.2.1** Create `SearchBar.tsx` component
- [ ] **8.2.2** Add search input with icon (magnifying glass)
- [ ] **8.2.3** Implement real-time search filtering
- [ ] **8.2.4** Search across:
  - Dataset names
  - Dataset FQNs
  - Dataset descriptions
  - Column names (when expanded)
- [ ] **8.2.5** Highlight matching nodes
- [ ] **8.2.6** Dim non-matching nodes
- [ ] **8.2.7** Add search result count display
- [ ] **8.2.8** Implement "Next Match" and "Previous Match" buttons
- [ ] **8.2.9** Navigate through matches with ↑↓ arrow keys
- [ ] **8.2.10** Clear search on Escape key
- [ ] **8.2.11** Focus matching node on Enter key
- [ ] **8.2.12** Test search with various queries

### 8.3 Filter Panel
- [ ] **8.3.1** Create `FilterPanel.tsx` component
- [ ] **8.3.2** Create filter button with badge (showing active filter count)
- [ ] **8.3.3** Implement popover/drawer for filter panel
- [ ] **8.3.4** Build medallion layer filter (checkboxes):
  - Raw
  - Bronze
  - Silver
  - Gold
- [ ] **8.3.5** Build entity type filter (checkboxes):
  - Table
  - Staging
  - PersistentStaging
  - DataVault
  - DataMart
- [ ] **8.3.6** Build entity subtype filter (checkboxes):
  - Dimension
  - Fact
  - Hub
  - Link
  - Satellite
  - LinkSatellite
  - PIT
  - Bridge
- [ ] **8.3.7** Add "Has Relationships" toggle
- [ ] **8.3.8** Add "Has Lineage" toggle
- [ ] **8.3.9** Create AI confidence slider (0-100)
- [ ] **8.3.10** Build sync status filter (checkboxes):
  - Synced
  - Pending
  - Conflict
  - Error
- [ ] **8.3.11** Add "Reset" button to clear all filters
- [ ] **8.3.12** Add "Apply" button to apply filters
- [ ] **8.3.13** Persist filters to diagram state
- [ ] **8.3.14** Test filter combinations

### 8.4 Filter Application
- [ ] **8.4.1** Create `applyFilters` function in store
- [ ] **8.4.2** Filter nodes based on selected filters
- [ ] **8.4.3** Hide filtered-out nodes from canvas
- [ ] **8.4.4** Update edge visibility (hide if source or target hidden)
- [ ] **8.4.5** Update node count badge in toolbar
- [ ] **8.4.6** Show "No results" message if all nodes filtered out
- [ ] **8.4.7** Test filter application
- [ ] **8.4.8** Optimize filter performance for large datasets

### 8.5 Zoom Controls
- [ ] **8.5.1** Create zoom control component in toolbar
- [ ] **8.5.2** Add zoom in button (+)
- [ ] **8.5.3** Add zoom out button (-)
- [ ] **8.5.4** Add fit view button (⊡)
- [ ] **8.5.5** Display current zoom level (e.g., "100%")
- [ ] **8.5.6** Implement zoom step (0.2 per click)
- [ ] **8.5.7** Clamp zoom range (0.1 to 4.0)
- [ ] **8.5.8** Animate zoom transitions
- [ ] **8.5.9** Test zoom controls

---

## Phase 9: Layout Algorithms

### 9.1 Hierarchical Layout
- [ ] **9.1.1** Create `hierarchicalLayout.ts` in utils
- [ ] **9.1.2** Implement `hierarchicalLayout` function:
  - Group nodes by medallion layer
  - Order layers: Raw → Bronze → Silver → Gold
  - Calculate vertical center for each layer
  - Distribute nodes evenly within layer
- [ ] **9.1.3** Add configurable spacing:
  - Horizontal spacing (400px default)
  - Vertical spacing (200px default)
- [ ] **9.1.4** Handle empty layers gracefully
- [ ] **9.1.5** Center layout in viewport
- [ ] **9.1.6** Test hierarchical layout with various node counts
- [ ] **9.1.7** Optimize for large diagrams (100+ nodes)

### 9.2 Force-Directed Layout
- [ ] **9.2.1** Install D3-force: `npm install d3-force`
- [ ] **9.2.2** Create `forceDirectedLayout.ts` in utils
- [ ] **9.2.3** Implement `forceDirectedLayout` function:
  - Configure force simulation
  - Add charge force (repulsion)
  - Add link force (edge attraction)
  - Add center force
  - Add collision force
- [ ] **9.2.4** Run simulation for fixed iterations (300)
- [ ] **9.2.5** Extract final positions
- [ ] **9.2.6** Test force-directed layout
- [ ] **9.2.7** Tune force parameters for optimal results
- [ ] **9.2.8** Add progress indicator during layout

### 9.3 Circular Layout
- [ ] **9.3.1** Create `circularLayout.ts` in utils
- [ ] **9.3.2** Implement `circularLayout` function:
  - Calculate circle radius based on viewport
  - Calculate angle step (2π / node_count)
  - Position nodes around circle
- [ ] **9.3.3** Center circle in viewport
- [ ] **9.3.4** Add padding (50px from edges)
- [ ] **9.3.5** Test circular layout
- [ ] **9.3.6** Optimize radius for different node counts

### 9.4 Lineage Layout (Dagre)
- [ ] **9.4.1** Install dagre: `npm install dagre @types/dagre`
- [ ] **9.4.2** Create `lineageLayout.ts` in utils
- [ ] **9.4.3** Implement `lineageLayout` function:
  - Create dagre graph
  - Configure layout direction (LR)
  - Set node dimensions
  - Add nodes to graph
  - Add edges to graph
  - Run layout algorithm
  - Extract positions
- [ ] **9.4.4** Configure spacing:
  - ranksep: 200px (horizontal)
  - nodesep: 100px (vertical)
  - edgesep: 50px
- [ ] **9.4.5** Handle selected dataset (center position)
- [ ] **9.4.6** Test lineage layout with complex graphs
- [ ] **9.4.7** Optimize for large lineage trees

### 9.5 Layout Application
- [ ] **9.5.1** Create `applyLayout` function in store
- [ ] **9.5.2** Show loading indicator during layout calculation
- [ ] **9.5.3** Calculate new positions for all nodes
- [ ] **9.5.4** Animate node transitions to new positions (500ms)
- [ ] **9.5.5** Update diagram state with new positions
- [ ] **9.5.6** Fit view to show all nodes after layout
- [ ] **9.5.7** Add "Auto-Layout" button in toolbar
- [ ] **9.5.8** Test layout application for all layout types
- [ ] **9.5.9** Add undo/redo for layout changes

### 9.6 Layout Persistence
- [ ] **9.6.1** Save last used layout type to diagram state
- [ ] **9.6.2** Apply saved layout on diagram load (if no saved positions)
- [ ] **9.6.3** Add "Remember Layout" toggle in settings
- [ ] **9.6.4** Test layout persistence

---

## Phase 10: Performance Optimization

### 10.1 Viewport Culling
- [ ] **10.1.1** Create `getVisibleNodes` utility function
- [ ] **10.1.2** Calculate visible bounds based on viewport
- [ ] **10.1.3** Filter nodes outside visible bounds
- [ ] **10.1.4** Only render visible nodes
- [ ] **10.1.5** Add margin (buffer) around viewport (200px)
- [ ] **10.1.6** Update visible nodes on viewport change (debounced)
- [ ] **10.1.7** Test viewport culling with 500+ nodes
- [ ] **10.1.8** Measure performance improvement

### 10.2 Edge Simplification
- [ ] **10.2.1** Create `simplifyEdgePath` utility function
- [ ] **10.2.2** Use straight lines when zoom < 0.5
- [ ] **10.2.3** Use simplified bezier when 0.5 ≤ zoom < 1.0
- [ ] **10.2.4** Use full bezier when zoom ≥ 1.0
- [ ] **10.2.5** Update edge paths on zoom change
- [ ] **10.2.6** Test edge simplification
- [ ] **10.2.7** Measure rendering performance

### 10.3 Memoization
- [ ] **10.3.1** Wrap `DatasetNode` with `React.memo`
- [ ] **10.3.2** Implement custom comparison function for node props
- [ ] **10.3.3** Wrap `RelationshipEdge` with `React.memo`
- [ ] **10.3.4** Wrap `LineageEdge` with `React.memo`
- [ ] **10.3.5** Memoize layout calculations with `useMemo`
- [ ] **10.3.6** Memoize filter operations with `useMemo`
- [ ] **10.3.7** Cache edge path calculations
- [ ] **10.3.8** Test memoization impact on performance

### 10.4 Lazy Loading
- [ ] **10.4.1** Implement lazy loading for column lists
- [ ] **10.4.2** Fetch columns only when node is expanded
- [ ] **10.4.3** Cache fetched columns in store
- [ ] **10.4.4** Implement pagination for large column lists (50+ columns)
- [ ] **10.4.5** Test lazy loading
- [ ] **10.4.6** Measure initial load time improvement

### 10.5 Debouncing & Throttling
- [ ] **10.5.1** Debounce search input (300ms)
- [ ] **10.5.2** Debounce filter application (500ms)
- [ ] **10.5.3** Debounce diagram state save (5000ms)
- [ ] **10.5.4** Throttle viewport change events (100ms)
- [ ] **10.5.5** Throttle node drag events (50ms)
- [ ] **10.5.6** Test debouncing/throttling
- [ ] **10.5.7** Measure performance improvement

### 10.6 Bundle Optimization
- [ ] **10.6.1** Code-split diagram feature from main bundle
- [ ] **10.6.2** Lazy load diagram components
- [ ] **10.6.3** Analyze bundle size with webpack-bundle-analyzer
- [ ] **10.6.4** Reduce React Flow bundle (tree-shaking)
- [ ] **10.6.5** Optimize images and icons
- [ ] **10.6.6** Test bundle size reduction
- [ ] **10.6.7** Measure initial load time improvement

### 10.7 Performance Benchmarking
- [ ] **10.7.1** Create performance test suite
- [ ] **10.7.2** Benchmark diagram load time (100, 500, 1000 nodes)
- [ ] **10.7.3** Benchmark layout calculation time
- [ ] **10.7.4** Benchmark filter application time
- [ ] **10.7.5** Benchmark edge routing time
- [ ] **10.7.6** Benchmark viewport change responsiveness
- [ ] **10.7.7** Document performance metrics
- [ ] **10.7.8** Set performance budgets

---

## Phase 11: Accessibility & Polish

### 11.1 Keyboard Navigation
- [ ] **11.1.1** Implement Tab key navigation between nodes
- [ ] **11.1.2** Add visible focus indicators (2px blue ring)
- [ ] **11.1.3** Enable Shift + Tab for backward navigation
- [ ] **11.1.4** Implement Enter key to open selected node
- [ ] **11.1.5** Implement Escape key to close dialogs
- [ ] **11.1.6** Test keyboard navigation flow
- [ ] **11.1.7** Ensure all interactive elements are keyboard accessible

### 11.2 Screen Reader Support
- [ ] **11.2.1** Add ARIA labels to all interactive elements
- [ ] **11.2.2** Add role attributes to nodes (`role="button"`)
- [ ] **11.2.3** Add aria-label to nodes with dataset name and metadata
- [ ] **11.2.4** Add aria-label to edges with relationship info
- [ ] **11.2.5** Announce state changes (node selected, relationship created)
- [ ] **11.2.6** Create live region for announcements (`aria-live="polite"`)
- [ ] **11.2.7** Test with screen reader (NVDA, JAWS, VoiceOver)
- [ ] **11.2.8** Fix any accessibility issues found

### 11.3 Focus Management
- [ ] **11.3.1** Implement focus trap in dialogs
- [ ] **11.3.2** Return focus to trigger element on dialog close
- [ ] **11.3.3** Set initial focus on dialog open (first input)
- [ ] **11.3.4** Clear focus on canvas click (empty area)
- [ ] **11.3.5** Restore focus after layout change
- [ ] **11.3.6** Test focus management in all scenarios

### 11.4 Animation Polish
- [ ] **11.4.1** Smooth node expansion animation (300ms ease-out)
- [ ] **11.4.2** Smooth node collapse animation (300ms ease-in)
- [ ] **11.4.3** Fade transition for view mode change (500ms)
- [ ] **11.4.4** Animated edge flow in lineage view
- [ ] **11.4.5** Smooth zoom transitions (200ms)
- [ ] **11.4.6** Fade in/out for filtered nodes (200ms)
- [ ] **11.4.7** Add micro-interactions (button hover, click feedback)
- [ ] **11.4.8** Test animations on different devices
- [ ] **11.4.9** Ensure animations don't block interactions
- [ ] **11.4.10** Add option to reduce motion (accessibility)

### 11.5 Error States
- [ ] **11.5.1** Handle failed diagram state load gracefully
- [ ] **11.5.2** Show error message for failed API calls
- [ ] **11.5.3** Add retry button for failed operations
- [ ] **11.5.4** Display error boundary for React errors
- [ ] **11.5.5** Show empty state when no datasets exist
- [ ] **11.5.6** Handle no lineage found scenario
- [ ] **11.5.7** Test all error scenarios

### 11.6 Loading States
- [ ] **11.6.1** Show skeleton loader for diagram on mount
- [ ] **11.6.2** Display spinner during layout calculation
- [ ] **11.6.3** Show loading indicator during column fetch
- [ ] **11.6.4** Display progress bar for large operations
- [ ] **11.6.5** Add shimmer effect to loading skeletons
- [ ] **11.6.6** Test loading states

### 11.7 Tooltips & Help
- [ ] **11.7.1** Add tooltips to toolbar buttons
- [ ] **11.7.2** Add tooltips to node action buttons
- [ ] **11.7.3** Show column details on hover (tooltip)
- [ ] **11.7.4** Display transformation expression on edge hover
- [ ] **11.7.5** Add contextual help hints (question mark icons)
- [ ] **11.7.6** Create keyboard shortcut cheat sheet (accessible via "?")
- [ ] **11.7.7** Test tooltips across browsers

---

## Phase 12: Testing & Documentation

### 12.1 Unit Tests
- [ ] **12.1.1** Write tests for diagram store actions
- [ ] **12.1.2** Write tests for layout algorithms
- [ ] **12.1.3** Write tests for edge routing utilities
- [ ] **12.1.4** Write tests for relationship validation
- [ ] **12.1.5** Write tests for filter application
- [ ] **12.1.6** Write tests for search functionality
- [ ] **12.1.7** Achieve 80%+ code coverage
- [ ] **12.1.8** Run tests in CI/CD pipeline

### 12.2 Integration Tests
- [ ] **12.2.1** Test complete node creation workflow
- [ ] **12.2.2** Test complete relationship creation workflow
- [ ] **12.2.3** Test view mode switching
- [ ] **12.2.4** Test diagram state persistence
- [ ] **12.2.5** Test filter and search interaction
- [ ] **12.2.6** Test layout application
- [ ] **12.2.7** Test edge routing and adjustment
- [ ] **12.2.8** Test keyboard navigation flow

### 12.3 E2E Tests
- [ ] **12.3.1** Setup Cypress/Playwright
- [ ] **12.3.2** Write E2E test: Load diagram and interact
- [ ] **12.3.3** Write E2E test: Create dataset and relationship
- [ ] **12.3.4** Write E2E test: Expand node and view columns
- [ ] **12.3.5** Write E2E test: Switch to lineage view
- [ ] **12.3.6** Write E2E test: Apply filters and search
- [ ] **12.3.7** Write E2E test: Apply auto-layout
- [ ] **12.3.8** Run E2E tests in CI/CD

### 12.4 Performance Tests
- [ ] **12.4.1** Test diagram load with 100 nodes (target: < 1s)
- [ ] **12.4.2** Test diagram load with 500 nodes (target: < 3s)
- [ ] **12.4.3** Test layout calculation (target: < 500ms)
- [ ] **12.4.4** Test filter application (target: < 200ms)
- [ ] **12.4.5** Test viewport change responsiveness (target: 60 FPS)
- [ ] **12.4.6** Test memory usage (target: < 200MB for 500 nodes)
- [ ] **12.4.7** Profile and optimize bottlenecks

### 12.5 Accessibility Testing
- [ ] **12.5.1** Run axe DevTools accessibility scan
- [ ] **12.5.2** Test with keyboard only (no mouse)
- [ ] **12.5.3** Test with screen reader (NVDA/JAWS/VoiceOver)
- [ ] **12.5.4** Test with high contrast mode
- [ ] **12.5.5** Test with reduced motion enabled
- [ ] **12.5.6** Verify WCAG 2.1 Level AA compliance
- [ ] **12.5.7** Fix any accessibility violations

### 12.6 Cross-Browser Testing
- [ ] **12.6.1** Test on Chrome (latest)
- [ ] **12.6.2** Test on Firefox (latest)
- [ ] **12.6.3** Test on Safari (latest)
- [ ] **12.6.4** Test on Edge (latest)
- [ ] **12.6.5** Test on mobile Safari (iOS)
- [ ] **12.6.6** Test on Chrome Mobile (Android)
- [ ] **12.6.7** Document browser compatibility

### 12.7 User Documentation
- [ ] **12.7.1** Write diagram view user guide:
  - Creating datasets
  - Adding relationships
  - Expanding nodes
  - Viewing lineage
  - Using filters and search
  - Applying layouts
  - Keyboard shortcuts
- [ ] **12.7.2** Create video tutorial for diagram usage
- [ ] **12.7.3** Document common workflows
- [ ] **12.7.4** Create troubleshooting guide
- [ ] **12.7.5** Write FAQ section

### 12.8 Developer Documentation
- [ ] **12.8.1** Document component architecture
- [ ] **12.8.2** Document state management (Zustand store)
- [ ] **12.8.3** Document layout algorithms
- [ ] **12.8.4** Document edge routing system
- [ ] **12.8.5** Document API endpoints used
- [ ] **12.8.6** Create contribution guidelines
- [ ] **12.8.7** Document testing strategy

---

## Phase 13: User Acceptance & Launch

### 13.1 User Acceptance Testing
- [ ] **13.1.1** Recruit beta testers (5-10 users)
- [ ] **13.1.2** Create UAT test scenarios
- [ ] **13.1.3** Setup staging environment for UAT
- [ ] **13.1.4** Conduct UAT sessions (observe users)
- [ ] **13.1.5** Collect feedback via surveys
- [ ] **13.1.6** Prioritize issues and improvements
- [ ] **13.1.7** Implement critical fixes
- [ ] **13.1.8** Conduct second UAT round (if needed)

### 13.2 Performance Validation
- [ ] **13.2.1** Validate load time benchmarks met
- [ ] **13.2.2** Validate interaction responsiveness (60 FPS)
- [ ] **13.2.3** Validate memory usage within budget
- [ ] **13.2.4** Validate layout calculation performance
- [ ] **13.2.5** Validate diagram state save/load performance
- [ ] **13.2.6** Document final performance metrics

### 13.3 Final QA
- [ ] **13.3.1** Perform full regression test
- [ ] **13.3.2** Verify all acceptance criteria met
- [ ] **13.3.3** Test on production-like environment
- [ ] **13.3.4** Verify integrations with other features
- [ ] **13.3.5** Test data migration (if applicable)
- [ ] **13.3.6** Verify backup and restore procedures

### 13.4 Launch Preparation
- [ ] **13.4.1** Prepare release notes
- [ ] **13.4.2** Create feature announcement
- [ ] **13.4.3** Update help documentation
- [ ] **13.4.4** Setup analytics tracking
- [ ] **13.4.5** Prepare rollback plan
- [ ] **13.4.6** Schedule deployment window
- [ ] **13.4.7** Notify users of new feature

### 13.5 Deployment
- [ ] **13.5.1** Deploy to staging for final smoke test
- [ ] **13.5.2** Deploy to production
- [ ] **13.5.3** Verify deployment successful
- [ ] **13.5.4** Monitor error rates (first 24 hours)
- [ ] **13.5.5** Monitor performance metrics
- [ ] **13.5.6** Respond to user feedback
- [ ] **13.5.7** Create bug fixes as needed

### 13.6 Post-Launch
- [ ] **13.6.1** Collect user feedback (first week)
- [ ] **13.6.2** Track feature usage metrics
- [ ] **13.6.3** Identify most-used features
- [ ] **13.6.4** Identify pain points
- [ ] **13.6.5** Plan improvements for next iteration
- [ ] **13.6.6** Document lessons learned
- [ ] **13.6.7** Celebrate successful launch! 🎉

---

## Summary

**Total Estimated Tasks**: 500+

**Estimated Timeline**:
- Phase 1-2: 3-4 weeks (Core Canvas & Node Expansion)
- Phase 3-4: 3-4 weeks (Relationships & State Persistence)
- Phase 5-6: 3-4 weeks (View Modes & Edge Management)
- Phase 7-9: 3-4 weeks (Context Menus, Toolbar, Layouts)
- Phase 10-11: 2-3 weeks (Performance & Accessibility)
- Phase 12-13: 2-3 weeks (Testing & Launch)

**Total Duration**: 16-22 weeks for full implementation

**Priority Levels**:
- **P0 (Critical)**: Phases 1-4, 7, 12.1-12.3, 13
- **P1 (High)**: Phases 5-6, 8-9, 11, 12.4-12.8
- **P2 (Medium)**: Phase 10 (optimization can be iterative)
- **P3 (Low)**: Advanced features, additional polish