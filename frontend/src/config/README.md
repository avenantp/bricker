# Node Color Configuration

This directory contains centralized configuration for dataset node colors in the diagram view.

## File: `nodeColors.ts`

Manages colors for dataset nodes based on `dataset_type` and `medallion_layer`.

### Color Priority System

The color system uses a fallback hierarchy:

1. **Dataset Type Color** (highest priority)
2. **Medallion Layer Color** (fallback)
3. **Default Gray** (final fallback)

### Usage

```typescript
import { getDatasetBorderColor, getDatasetHexColor } from '@/config/nodeColors';

// Get Tailwind border color classes
const borderColor = getDatasetBorderColor('Hub', 'Bronze');
// Returns: 'border-blue-500 dark:border-blue-400' (Hub color)

const borderColor2 = getDatasetBorderColor('Table', 'Gold');
// Returns: 'border-yellow-500 dark:border-yellow-400' (Gold layer color)

// Get hex color for minimap/canvas
const hexColor = getDatasetHexColor('Link', 'Silver');
// Returns: '#a855f7' (Link purple color)
```

### Adding New Colors

#### Add a Dataset Type Color

Edit `DATASET_TYPE_COLORS` in `nodeColors.ts`:

```typescript
export const DATASET_TYPE_COLORS: Partial<Record<DatasetType, string>> = {
  // ... existing colors
  MyNewType: 'border-rose-500 dark:border-rose-400',
};
```

Then add the corresponding hex color to `hexMap` in `getDatasetHexColor()`:

```typescript
const hexMap: Record<string, string> = {
  // ... existing colors
  'border-rose-500': '#f43f5e',
};
```

#### Add a Medallion Layer Color

Edit `MEDALLION_LAYER_COLORS` in `nodeColors.ts`:

```typescript
export const MEDALLION_LAYER_COLORS: Record<MedallionLayer, string> = {
  // ... existing colors
  Platinum: 'border-zinc-400 dark:border-zinc-300',
};
```

### Color Design Guidelines

1. **Use Tailwind color scale**: Stick to 400-600 range for consistency
2. **Dark mode variants**: Always provide `dark:` variants
3. **Semantic naming**: Colors should match the meaning (e.g., Gold = yellow)
4. **Sufficient contrast**: Ensure text remains readable on white/dark backgrounds
5. **Accessibility**: Maintain WCAG AA contrast ratios

### Current Color Mappings

#### Medallion Layers
- **Source**: Orange (`#f97316`)
- **Raw**: Red (`#ef4444`)
- **Bronze**: Amber (`#d97706`)
- **Silver**: Gray (`#9ca3af`)
- **Gold**: Yellow (`#eab308`)
- **Stage**: Teal (`#14b8a6`)

#### Data Vault Types
- **Hub**: Blue (`#3b82f6`)
- **Link**: Purple (`#a855f7`)
- **Satellite**: Green (`#22c55e`)
- **Link Satellite**: Indigo (`#6366f1`)
- **Point In Time**: Pink (`#ec4899`)
- **Bridge**: Cyan (`#06b6d4`)

#### Dimensional Types
- **Dimension**: Teal (`#14b8a6`)
- **Fact**: Violet (`#8b5cf6`)

#### Special Types
- **Reference**: Slate (`#64748b`)
- **File**: Emerald (`#10b981`)

#### Default (Table, View, etc.)
Falls back to medallion layer color

### CSS Variables

The configuration also exports CSS custom properties for use in global styles:

```css
/* Available in :root */
--color-layer-source: #f97316;
--color-type-hub: #3b82f6;
/* etc. */
```

To use these in your stylesheet:

```css
.my-element {
  border-color: var(--color-layer-source);
}
```

### Integration Points

This configuration is used by:

1. **DatasetNode.tsx** - Node border colors
2. **DatasetDiagramView.tsx** - Minimap colors
3. Any component that needs to display dataset-specific colors

### Type Safety

The configuration is fully typed using:
- `MedallionLayer` type from `types/canvas.ts`
- `DatasetType` type from `types/canvas.ts`

TypeScript will catch any invalid layer or type names at compile time.
