/**
 * Node Color Configuration
 * Centralized color management for dataset nodes based on dataset_type and medallion_layer
 * Priority: dataset_type colors override medallion_layer colors
 */

import type { MedallionLayer, DatasetType } from '../types/canvas';

// =====================================================
// Color Definitions
// =====================================================

/**
 * Medallion Layer Colors (fallback colors)
 */
export const MEDALLION_LAYER_COLORS: Record<MedallionLayer, string> = {
  Source: 'border-orange-500 dark:border-orange-400',
  Raw: 'border-red-500 dark:border-red-400',
  Bronze: 'border-amber-600 dark:border-amber-500',
  Silver: 'border-gray-400 dark:border-gray-300',
  Gold: 'border-yellow-500 dark:border-yellow-400',
};

/**
 * Dataset Type Colors (override medallion layer colors)
 * Only define colors for types that need specific colors
 */
export const DATASET_TYPE_COLORS: Partial<Record<DatasetType, string>> = {
  // Data Vault types
  Hub: 'border-blue-500 dark:border-blue-400',
  Link: 'border-purple-500 dark:border-purple-400',
  Satellite: 'border-green-500 dark:border-green-400',
  LinkSatellite: 'border-indigo-500 dark:border-indigo-400',
  'Point In Time': 'border-pink-500 dark:border-pink-400',
  Bridge: 'border-cyan-500 dark:border-cyan-400',

  // Dimensional types
  Dimension: 'border-teal-500 dark:border-teal-400',
  Fact: 'border-violet-500 dark:border-violet-400',

  // Special types
  Reference: 'border-slate-500 dark:border-slate-400',
  File: 'border-emerald-500 dark:border-emerald-400',

  // Note: Table, View, etc. will use medallion layer colors as fallback
};

/**
 * Additional layer type (from canvas.ts)
 * Using 'as const' to ensure type safety while adding to the color map
 */
const STAGE_LAYER_COLOR = 'border-teal-500 dark:border-teal-400';

// =====================================================
// Color Resolver Functions
// =====================================================

/**
 * Get the border color class for a dataset node
 * Priority: dataset_type color > medallion_layer color > default
 */
export function getDatasetBorderColor(
  datasetType?: DatasetType | string,
  medallionLayer?: MedallionLayer | string
): string {
  // First, check if dataset_type has a specific color
  if (datasetType && datasetType in DATASET_TYPE_COLORS) {
    const color = DATASET_TYPE_COLORS[datasetType as DatasetType];
    if (color) return color;
  }

  // Special case for Stage layer
  if (medallionLayer === 'Stage') {
    return STAGE_LAYER_COLOR;
  }

  // Fallback to medallion_layer color
  if (medallionLayer && medallionLayer in MEDALLION_LAYER_COLORS) {
    return MEDALLION_LAYER_COLORS[medallionLayer as MedallionLayer];
  }

  // Default fallback
  return 'border-gray-400 dark:border-gray-500';
}

/**
 * Get hex color for minimap (without Tailwind classes)
 */
export function getDatasetHexColor(
  datasetType?: DatasetType | string,
  medallionLayer?: MedallionLayer | string
): string {
  // Map Tailwind colors to hex values for minimap
  const colorClass = getDatasetBorderColor(datasetType, medallionLayer);

  const hexMap: Record<string, string> = {
    // Medallion layers
    'border-orange-500': '#f97316',
    'border-red-500': '#ef4444',
    'border-amber-600': '#d97706',
    'border-gray-400': '#9ca3af',
    'border-yellow-500': '#eab308',

    // Data Vault types
    'border-blue-500': '#3b82f6',
    'border-purple-500': '#a855f7',
    'border-green-500': '#22c55e',
    'border-indigo-500': '#6366f1',
    'border-pink-500': '#ec4899',
    'border-cyan-500': '#06b6d4',

    // Dimensional types
    'border-teal-500': '#14b8a6',
    'border-violet-500': '#8b5cf6',

    // Special types
    'border-slate-500': '#64748b',
    'border-emerald-500': '#10b981',

    // Default
    'border-gray-500': '#6b7280',
  };

  // Extract the base color class (remove dark: variant)
  const baseColorClass = colorClass.split(' ')[0];
  return hexMap[baseColorClass] || '#6b7280';
}

// =====================================================
// CSS Variable Export (for use in global styles)
// =====================================================

/**
 * Generate CSS custom properties for use in global stylesheet
 * Can be used in index.css or component-specific styles
 */
export function generateColorCSSVariables(): string {
  return `
    /* Medallion Layer Colors */
    --color-layer-source: #f97316;
    --color-layer-raw: #ef4444;
    --color-layer-bronze: #d97706;
    --color-layer-silver: #9ca3af;
    --color-layer-gold: #eab308;
    --color-layer-stage: #14b8a6;

    /* Data Vault Type Colors */
    --color-type-hub: #3b82f6;
    --color-type-link: #a855f7;
    --color-type-satellite: #22c55e;
    --color-type-link-satellite: #6366f1;
    --color-type-pit: #ec4899;
    --color-type-bridge: #06b6d4;

    /* Dimensional Type Colors */
    --color-type-dimension: #14b8a6;
    --color-type-fact: #8b5cf6;

    /* Special Type Colors */
    --color-type-reference: #64748b;
    --color-type-file: #10b981;

    /* Default */
    --color-default: #6b7280;
  `;
}
