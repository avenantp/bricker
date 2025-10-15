# Dataset Diagram View - Integration Guide

## Quick Start

The Dataset Diagram View is now ready to integrate into your application. Follow these steps to add it to your routes and start using it.

---

## 1. Add Route to Your Application

### Option A: Add to Router

**File**: `frontend/src/App.tsx` (or your routing file)

```tsx
import { DatasetDiagramView } from './components/Diagram/DatasetDiagramView';

// In your routes:
<Route path="/workspace/:workspaceId/diagram" element={<DatasetDiagramView />} />
```

### Option B: Add as a Tab in Workspace View

```tsx
import { DatasetDiagramView } from './components/Diagram/DatasetDiagramView';

// In your workspace component:
<Tabs>
  <Tab label="Canvas" />
  <Tab label="Diagram">
    <DatasetDiagramView />
  </Tab>
  <Tab label="Metadata" />
</Tabs>
```

---

## 2. Testing with Mock Data

To test the diagram view immediately with sample data:

**File**: Create `frontend/src/pages/DiagramTestPage.tsx`

```tsx
import { useEffect } from 'react';
import { DatasetDiagramView } from '../components/Diagram/DatasetDiagramView';
import { useDiagramStore } from '../store/diagramStore';
import { generateMockDiagramData } from '../utils/mockDiagramData';

export function DiagramTestPage() {
  const { setNodes, setEdges, applyLayout } = useDiagramStore();

  useEffect(() => {
    // Load mock data on mount
    const mockData = generateMockDiagramData(12);

    setNodes(mockData.nodes);
    setEdges(mockData.relationshipEdges); // or mockData.allEdges for both

    // Apply initial layout
    setTimeout(() => {
      applyLayout('hierarchical');
    }, 100);
  }, [setNodes, setEdges, applyLayout]);

  return (
    <div className="w-full h-screen">
      <DatasetDiagramView />
    </div>
  );
}
```

Add route:
```tsx
<Route path="/diagram-test" element={<DiagramTestPage />} />
```

Then visit: **http://localhost:5173/diagram-test**

---

## 3. Connecting to Real Data

### Step 1: Create API Service

**File**: `frontend/src/api/datasets.ts`

```tsx
import { supabase } from '../lib/supabaseClient';
import type { DiagramNode, Column } from '../types/diagram';

export async function fetchDatasetsForDiagram(workspaceId: string) {
  const { data, error } = await supabase
    .from('datasets')
    .select(`
      *,
      columns (*)
    `)
    .eq('workspace_id', workspaceId);

  if (error) throw error;

  // Transform to DiagramNode format
  const nodes: DiagramNode[] = data.map((dataset, index) => ({
    id: dataset.id,
    type: 'dataset',
    position: {
      x: (index % 4) * 400 + 50,
      y: Math.floor(index / 4) * 300 + 50,
    },
    data: {
      dataset_id: dataset.id,
      name: dataset.name,
      fqn: dataset.fqn,
      medallion_layer: dataset.medallion_layer,
      entity_type: dataset.entity_type,
      entity_subtype: dataset.entity_subtype,
      description: dataset.description,
      isExpanded: false,
      isHighlighted: false,
      columns: dataset.columns || [],
      columnCount: dataset.columns?.length || 0,
      relationshipCount: 0, // TODO: Calculate from relationships
      lineageCount: { upstream: 0, downstream: 0 }, // TODO: Calculate from lineage
      ai_confidence_score: dataset.ai_confidence_score,
      sync_status: dataset.sync_status,
      has_uncommitted_changes: dataset.has_uncommitted_changes,
    },
  }));

  return nodes;
}

export async function fetchRelationshipsForDiagram(workspaceId: string) {
  // TODO: Implement based on your relationship data structure
  // Query columns with reference_column_id to build edges

  const { data, error } = await supabase
    .from('columns')
    .select('*')
    .not('reference_column_id', 'is', null);

  if (error) throw error;

  // Transform to DiagramEdge format
  // ...
}
```

### Step 2: Update DatasetDiagramView

**File**: `frontend/src/components/Diagram/DatasetDiagramView.tsx`

Add this to the initialization `useEffect`:

```tsx
useEffect(() => {
  const initializeDiagram = async () => {
    // Get actual workspace ID from route params or context
    const workspaceId = 'your-workspace-id'; // TODO: Get from router
    const accountId = 'your-account-id'; // TODO: Get from auth context

    setContext(accountId, workspaceId, 'dataset');

    try {
      // Load saved state first
      await loadState(workspaceId, 'dataset');

      // If no nodes after loading state, fetch from API
      if (storeNodes.length === 0) {
        const nodes = await fetchDatasetsForDiagram(workspaceId);
        const edges = await fetchRelationshipsForDiagram(workspaceId);

        setStoreNodes(nodes);
        setStoreEdges(edges);

        // Apply initial layout
        setTimeout(() => {
          applyLayout('hierarchical');
        }, 100);
      }
    } catch (error) {
      console.error('Failed to initialize diagram:', error);
    }
  };

  initializeDiagram();
}, []);
```

---

## 4. Running the Database Migration

Before using persistence, run the migration:

```bash
# Navigate to backend directory
cd backend

# Run migration
psql -d your_database -f migrations/051_create_diagram_states_table.sql

# Or if using Supabase CLI
supabase db push
```

Verify:
```sql
SELECT * FROM diagram_states LIMIT 1;
```

---

## 5. Using the Diagram Features

### Expand/Collapse Nodes
- Click the chevron icon in the node header
- Or use the "Expand All" / "Collapse All" buttons in the toolbar

### Search Datasets
- Type in the search bar at the top
- Searches: names, FQNs, descriptions, columns
- Matching nodes are highlighted

### Apply Filters
- Click "Filters" button in toolbar
- Check medallion layers, entity types
- Toggle "Has Relationships" / "Has Lineage"
- Adjust AI confidence slider
- Click "Apply Filters"

### Change Layout
- Click layout dropdown in toolbar
- Choose: Hierarchical, Force-Directed, Circular, or Dagre
- Layout is applied automatically

### View Modes
- Toggle between "Relationships" and "Lineage"
- Relationships: Shows FK/BusinessKey relationships
- Lineage: Shows data flow and transformations

### Zoom & Pan
- Mouse wheel to zoom
- Click and drag to pan
- Use zoom controls in bottom-right
- Double-click to zoom in
- Fit view button to see all nodes

### MiniMap
- Bottom-left corner
- Click to navigate to different areas
- Color-coded by medallion layer

---

## 6. Customization

### Change Colors

**File**: `frontend/src/types/canvas.ts`

```tsx
export const MEDALLION_TAILWIND_COLORS: Record<MedallionLayer, string> = {
  Raw: 'border-gray-400',    // Change to your color
  Bronze: 'border-amber-500',
  Silver: 'border-gray-500',
  Gold: 'border-yellow-500',
};
```

### Change Default Layout

**File**: `frontend/src/store/diagramStore.ts`

```tsx
const initialState = {
  // ...
  layoutType: 'hierarchical' as LayoutType, // Change to 'force', 'circular', or 'dagre'
};
```

### Change Grid Size

**File**: `frontend/src/components/Diagram/DatasetDiagramView.tsx`

```tsx
<Background
  gap={15}        // Change grid spacing
  size={1}        // Change dot size
/>

<ReactFlow
  snapGrid={[15, 15]}  // Change snap grid
/>
```

---

## 7. Adding Features

### Add Node Action Handler

**File**: `frontend/src/components/Canvas/DatasetNode.tsx`

Currently marked as TODO - implement like this:

```tsx
// In ColumnList component
onAddColumn={() => {
  // Show add column dialog
  openAddColumnDialog(data.dataset_id);
}}
```

### Add Relationship Creation

**File**: `frontend/src/components/Diagram/DatasetDiagramView.tsx`

Update the `onConnect` callback:

```tsx
const onConnect = useCallback(
  (connection: Connection) => {
    // Open dialog to configure relationship
    openAddRelationshipDialog({
      sourceDatasetId: connection.source!,
      targetDatasetId: connection.target!,
    });
  },
  []
);
```

---

## 8. Performance Tips

### For Large Diagrams (100+ nodes)

1. **Enable viewport culling** (TODO: implement)
2. **Use simplified edges at low zoom** (TODO: implement)
3. **Lazy load columns** (TODO: implement)

### For Many Edges (200+)

1. **Batch edge calculations**
2. **Cache edge paths**
3. **Use straight lines at low zoom**

---

## 9. Debugging

### Check Store State

```tsx
import { useDiagramStore } from './store/diagramStore';

// In component
const state = useDiagramStore();
console.log('Nodes:', state.nodes);
console.log('Edges:', state.edges);
console.log('Filters:', state.filters);
```

### Check Local Storage

```javascript
// In browser console
localStorage.getItem('uroq_diagram_state_[workspaceId]_dataset');
```

### Check Supabase

```sql
SELECT * FROM diagram_states
WHERE workspace_id = 'your-workspace-id';
```

---

## 10. Common Issues

### Issue: Nodes don't appear
**Solution**: Check that nodes are properly loaded. Use mock data first to verify rendering works.

### Issue: Edges not connecting
**Solution**: Verify edge source and target IDs match node IDs exactly.

### Issue: Layout doesn't apply
**Solution**: Ensure dagre is installed: `npm install dagre @types/dagre`

### Issue: State doesn't persist
**Solution**: Check that `setContext()` is called with valid accountId and workspaceId.

### Issue: Search doesn't work
**Solution**: Verify `searchQuery` is being set in the store. Check console for errors.

---

## Next Steps

1. **Test with mock data** to verify everything works
2. **Connect to real API** endpoints
3. **Implement relationship dialog**
4. **Add context menus** for more actions
5. **Add keyboard shortcuts**
6. **Implement undo/redo**
7. **Add unit tests**

---

## Support

- **Specification**: `docs/prp/051-dataset-diagram-view-specification.md`
- **Implementation Summary**: `docs/prp/051-dataset-diagram-view-implementation-summary.md`
- **Tasklist**: `docs/prp/050-dataset-diagram-view-tasklist.md`

---

**Happy Diagramming!** 📊
