# Diagram Tables Redesign
## Migration S_2_2: Create Diagrams and Diagram Datasets Tables

**Date:** 2025-10-16
**Status:** ✅ Created | ⏳ Pending Implementation

---

## Overview

This migration creates a proper diagram architecture by:
1. Creating a `diagrams` table as a first-class entity (not just state)
2. Creating a `diagram_datasets` mapping table to track which datasets are in each diagram
3. Migrating data from the old `diagram_states` table if it exists
4. Providing helper functions for common operations

---

## Problem Statement

### Current Issues:
1. **`diagram_states` table** only stores state, not diagram metadata
   - No diagram name, description, or ownership
   - Can't have multiple diagrams per workspace
   - No way to template or share diagrams

2. **No tracking of which datasets are in a diagram**
   - `node_positions` JSONB stores positions but doesn't track membership
   - Can't query "which diagrams contain dataset X"
   - No audit trail of when datasets were added

3. **Limited functionality**
   - Can't create diagram templates
   - Can't share diagrams between users
   - Can't clone or export diagrams

---

## Solution: New Table Structure

### 1. `diagrams` Table

**Purpose:** First-class diagram entities with metadata + state

**Schema:**
```sql
CREATE TABLE diagrams (
  id UUID PRIMARY KEY,
  account_id UUID NOT NULL REFERENCES accounts(id),
  workspace_id UUID NOT NULL REFERENCES workspaces(id),

  -- Metadata
  name VARCHAR NOT NULL,
  description TEXT,
  diagram_type VARCHAR NOT NULL DEFAULT 'dataset',

  -- State (migrated from diagram_states)
  view_mode VARCHAR NOT NULL DEFAULT 'relationships',
  viewport JSONB NOT NULL DEFAULT '{"x": 0, "y": 0, "zoom": 1}',
  node_positions JSONB NOT NULL DEFAULT '{}',
  node_expansions JSONB NOT NULL DEFAULT '{}',
  edge_routes JSONB DEFAULT '{}',
  filters JSONB DEFAULT '{}',

  -- Layout
  layout_type VARCHAR DEFAULT 'hierarchical',
  layout_direction VARCHAR DEFAULT 'LR',
  auto_layout BOOLEAN DEFAULT false,

  -- Ownership
  owner_id UUID REFERENCES users(id),
  visibility VARCHAR NOT NULL DEFAULT 'private',
  is_template BOOLEAN DEFAULT false,

  -- Metadata
  tags VARCHAR[],
  metadata JSONB DEFAULT '{}',

  -- Version control
  version INTEGER DEFAULT 1,
  last_modified_by UUID REFERENCES users(id),

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(workspace_id, name)
);
```

**Key Features:**
- ✅ Diagrams have names and descriptions
- ✅ Multiple diagrams per workspace
- ✅ Ownership and visibility control
- ✅ Template support
- ✅ Tagging and custom metadata
- ✅ Version tracking for conflict resolution

### 2. `diagram_datasets` Table

**Purpose:** Track which datasets belong to which diagrams

**Schema:**
```sql
CREATE TABLE diagram_datasets (
  id UUID PRIMARY KEY,
  diagram_id UUID NOT NULL REFERENCES diagrams(id) ON DELETE CASCADE,
  dataset_id UUID NOT NULL REFERENCES datasets(id) ON DELETE CASCADE,

  -- Position
  position JSONB, -- {x, y}

  -- Visual state
  is_expanded BOOLEAN DEFAULT false,
  is_highlighted BOOLEAN DEFAULT false,
  z_index INTEGER DEFAULT 0,

  -- Metadata
  added_by UUID REFERENCES users(id),
  added_at TIMESTAMP DEFAULT NOW(),
  notes TEXT,

  UNIQUE(diagram_id, dataset_id)
);
```

**Key Features:**
- ✅ Explicit dataset membership
- ✅ Per-dataset position tracking
- ✅ Expansion state per dataset per diagram
- ✅ Z-index for layering
- ✅ Audit trail (who added, when)
- ✅ User notes per dataset

---

## Migration Strategy

### Data Migration from `diagram_states`

If `diagram_states` exists, the migration automatically:

1. **Copies all data** to new `diagrams` table
2. **Generates names** from diagram type (e.g., "Diagram dataset")
3. **Preserves all state** (viewport, positions, expansions, etc.)
4. **Keeps `diagram_states`** for rollback (not dropped)

### What Happens to `diagram_states`?

- ✅ **Kept for rollback** safety
- ⚠️ **Deprecated** - new code uses `diagrams` table
- 📌 **Can be dropped later** after successful migration validation

---

## New Capabilities

### 1. Multiple Diagrams per Workspace

**Before:**
```sql
-- Only 1 diagram per workspace per type
SELECT * FROM diagram_states
WHERE workspace_id = 'uuid' AND diagram_type = 'dataset';
-- Returns 1 row (or none)
```

**After:**
```sql
-- Multiple diagrams per workspace
SELECT * FROM diagrams
WHERE workspace_id = 'uuid';
-- Returns many rows
```

### 2. Dataset Membership Tracking

**Before:**
```sql
-- No way to find which diagrams contain a dataset
-- Had to parse JSONB node_positions keys
```

**After:**
```sql
-- Find all diagrams containing a dataset
SELECT d.* FROM diagrams d
JOIN diagram_datasets dd ON dd.diagram_id = d.id
WHERE dd.dataset_id = 'dataset-uuid';
```

### 3. Diagram Templates

**Before:**
- No template support

**After:**
```sql
-- Create a template
INSERT INTO diagrams (
  workspace_id, name, diagram_type,
  is_template, visibility
) VALUES (
  'uuid', 'Standard ERD Template', 'erd',
  true, 'public'
);

-- Find all templates
SELECT * FROM diagrams WHERE is_template = true;

-- Clone from template
INSERT INTO diagrams (workspace_id, name, ...)
SELECT workspace_id, 'My New Diagram', ...
FROM diagrams WHERE id = 'template-uuid';
```

### 4. Diagram Sharing

**Before:**
- No visibility control

**After:**
```sql
-- Share a diagram publicly
UPDATE diagrams
SET visibility = 'public'
WHERE id = 'diagram-uuid';

-- Find public diagrams
SELECT * FROM diagrams WHERE visibility = 'public';
```

---

## Helper Functions

### 1. `get_diagram_datasets(diagram_id)`

**Purpose:** Get all datasets in a diagram with positions

**Usage:**
```sql
SELECT * FROM get_diagram_datasets('diagram-uuid');
```

**Returns:**
```
dataset_id | dataset_name | fully_qualified_name | position | is_expanded | added_at
```

### 2. `add_dataset_to_diagram(diagram_id, dataset_id, position, user_id)`

**Purpose:** Add a dataset to a diagram (idempotent)

**Usage:**
```sql
SELECT add_dataset_to_diagram(
  'diagram-uuid',
  'dataset-uuid',
  '{"x": 100, "y": 200}'::jsonb,
  'user-uuid'
);
```

**Returns:** UUID of diagram_datasets record (or NULL if already exists)

### 3. `remove_dataset_from_diagram(diagram_id, dataset_id)`

**Purpose:** Remove a dataset from a diagram

**Usage:**
```sql
SELECT remove_dataset_from_diagram('diagram-uuid', 'dataset-uuid');
```

**Returns:** TRUE if deleted, FALSE if not found

---

## Views

### `diagram_summary` View

**Purpose:** Quick overview of all diagrams with dataset counts

**Schema:**
```sql
SELECT
  id,
  account_id,
  workspace_id,
  name,
  description,
  diagram_type,
  visibility,
  owner_id,
  is_template,
  created_at,
  updated_at,
  dataset_count, -- Computed: COUNT(diagram_datasets)
  all_tags       -- Aggregated tags
FROM diagram_summary;
```

**Use Cases:**
- Diagram listing pages
- Dashboard statistics
- Quick search results

---

## API Examples

### Create a New Diagram

```typescript
POST /api/diagrams

{
  "workspace_id": "workspace-uuid",
  "name": "Customer Data Model",
  "description": "Main customer data model diagram",
  "diagram_type": "dataset",
  "layout_type": "hierarchical",
  "visibility": "private",
  "tags": ["customers", "core"]
}
```

### Get All Diagrams in Workspace

```typescript
GET /api/diagrams?workspace_id=workspace-uuid

Response: {
  "diagrams": [
    {
      "id": "diagram-uuid",
      "name": "Customer Data Model",
      "diagram_type": "dataset",
      "dataset_count": 15,
      "created_at": "2025-10-16T10:00:00Z"
    }
  ]
}
```

### Add Dataset to Diagram

```typescript
POST /api/diagrams/:diagram_id/datasets

{
  "dataset_id": "dataset-uuid",
  "position": {"x": 100, "y": 200},
  "is_expanded": true,
  "notes": "Core customer table"
}
```

### Get Diagram with All Datasets

```typescript
GET /api/diagrams/:diagram_id?include=datasets

Response: {
  "diagram": {
    "id": "diagram-uuid",
    "name": "Customer Data Model",
    "viewport": {"x": 0, "y": 0, "zoom": 1},
    "datasets": [
      {
        "dataset_id": "dataset-uuid",
        "dataset_name": "customers",
        "position": {"x": 100, "y": 200},
        "is_expanded": true,
        "added_at": "2025-10-16T10:00:00Z"
      }
    ]
  }
}
```

### Clone a Diagram

```typescript
POST /api/diagrams/:diagram_id/clone

{
  "new_name": "Customer Data Model (Copy)",
  "clone_datasets": true,
  "target_workspace_id": "other-workspace-uuid" // Optional
}
```

---

## Migration Impact

### Frontend Changes Required

#### 1. Update Store (`frontend/src/store/diagramStore.ts`)

**Before:**
```typescript
interface DiagramState {
  workspace_id: string;
  diagram_id: string; // Was tied to workspace
  // ...
}
```

**After:**
```typescript
interface DiagramState {
  diagram: Diagram; // Full diagram entity
  datasets: DiagramDataset[]; // Explicit dataset list
  // ...
}
```

#### 2. Update API Calls

**Before:**
```typescript
// Get diagram state for workspace
GET /api/diagram-states/:workspace_id

// Update diagram state
PUT /api/diagram-states/:workspace_id
```

**After:**
```typescript
// List diagrams in workspace
GET /api/diagrams?workspace_id=:workspace_id

// Get specific diagram
GET /api/diagrams/:diagram_id

// Update diagram
PUT /api/diagrams/:diagram_id

// Add dataset to diagram
POST /api/diagrams/:diagram_id/datasets
```

#### 3. UI Changes

**New Features:**
- ✅ Diagram selector dropdown (multiple diagrams per workspace)
- ✅ "New Diagram" button
- ✅ "Clone Diagram" option
- ✅ "Save as Template" option
- ✅ Diagram settings dialog (name, description, visibility)
- ✅ Dataset list panel showing which datasets are in current diagram

---

## Rollback Plan

If issues occur:

### 1. Revert to `diagram_states`

```sql
-- diagram_states table is still intact
-- Just point application back to old table
```

### 2. Drop New Tables (if needed)

```sql
DROP VIEW IF EXISTS diagram_summary;
DROP FUNCTION IF EXISTS remove_dataset_from_diagram;
DROP FUNCTION IF EXISTS add_dataset_to_diagram;
DROP FUNCTION IF EXISTS get_diagram_datasets;
DROP TABLE IF EXISTS diagram_datasets CASCADE;
DROP TABLE IF EXISTS diagrams CASCADE;
```

### 3. Restore Application Code

```bash
git revert <migration-commit>
```

---

## Testing Checklist

### Database Tests

- [ ] Create diagram
- [ ] Update diagram name and description
- [ ] Add dataset to diagram
- [ ] Remove dataset from diagram
- [ ] Get all datasets in diagram
- [ ] Clone diagram
- [ ] Create diagram template
- [ ] Test RLS policies
- [ ] Test unique constraint (workspace_id, name)
- [ ] Test cascade delete (diagram → diagram_datasets)

### Application Tests

- [ ] Create new diagram from UI
- [ ] Switch between multiple diagrams
- [ ] Add dataset to diagram via drag-drop
- [ ] Remove dataset from diagram
- [ ] Save diagram state (positions, viewport)
- [ ] Clone diagram
- [ ] Save diagram as template
- [ ] Load diagram from template
- [ ] Share diagram (change visibility)
- [ ] Delete diagram

### Performance Tests

- [ ] Load diagram with 100+ datasets
- [ ] Query diagrams in workspace (with many diagrams)
- [ ] Search diagrams by name/tags
- [ ] Test diagram_summary view performance

---

## Benefits Summary

| Feature | Before (`diagram_states`) | After (`diagrams` + `diagram_datasets`) |
|---------|---------------------------|------------------------------------------|
| **Multiple diagrams per workspace** | ❌ No | ✅ Yes |
| **Diagram has name/description** | ❌ No | ✅ Yes |
| **Track dataset membership** | ❌ No (only positions) | ✅ Yes (explicit) |
| **Diagram templates** | ❌ No | ✅ Yes |
| **Sharing/visibility** | ❌ No | ✅ Yes |
| **Ownership** | ❌ No | ✅ Yes |
| **Tagging** | ❌ No | ✅ Yes |
| **Audit trail for datasets** | ❌ No | ✅ Yes (who added, when) |
| **Query "which diagrams have dataset X"** | ❌ No | ✅ Yes |
| **Clone/export diagrams** | ❌ No | ✅ Yes |

---

## Next Steps

1. ✅ **Migration SQL created** - `S_2_2_create_diagrams_and_diagram_datasets_tables.sql`
2. ✅ **TypeScript types created** - `frontend/src/types/diagram-entity.ts`
3. ⏳ **Create API routes** - `backend/src/routes/diagrams.ts`
4. ⏳ **Update frontend store** - `frontend/src/store/diagramStore.ts`
5. ⏳ **Update UI components** - Add diagram selector, CRUD dialogs
6. ⏳ **Run migration** - Test on dev database
7. ⏳ **E2E testing** - Test all diagram operations
8. ⏳ **Deploy to production**

---

## Files Created/Modified

### Created:
- ✅ `backend/migrations/S_2_2_create_diagrams_and_diagram_datasets_tables.sql`
- ✅ `frontend/src/types/diagram-entity.ts`
- ✅ `docs/diagram-tables-redesign.md` (this file)

### To Modify:
- ⏳ `backend/src/routes/diagrams.ts` (new file)
- ⏳ `frontend/src/store/diagramStore.ts`
- ⏳ `frontend/src/types/diagram.ts` (update exports)
- ⏳ `frontend/src/components/Diagram/DiagramTopBar.tsx` (add diagram selector)
- ⏳ `frontend/src/pages/DiagramTestPage.tsx` (use new diagram structure)

---

## Reference

- **Specification:** `docs/prp/051-dataset-diagram-view-specification.md`
- **Original Migration:** `backend/migrations/051_create_diagram_states_table.sql`
- **Related Migration:** `S_2_1_modify_datasets_table_structure.sql`
