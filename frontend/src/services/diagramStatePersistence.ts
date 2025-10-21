/**
 * Diagram State Persistence Service
 * Two-tier persistence: localStorage (immediate) + Supabase (debounced)
 * Based on specification: docs/prp/051-dataset-diagram-view-specification.md
 */

import { supabase } from '../lib/supabase';
import type {
  DiagramState,
  DiagramStateRecord,
  SaveDiagramStateRequest,
  SaveDiagramStateResponse,
  LoadDiagramStateResponse,
  DiagramType,
  ConflictResolutionStrategy,
} from '../types/diagram';

// Constants
const SUPABASE_SAVE_DEBOUNCE_MS = 5000;
const LOCALSTORAGE_KEY_PREFIX = 'uroq_diagram_state_';

// Debounce timer
let saveDebounceTimer: NodeJS.Timeout | null = null;

// =====================================================
// LocalStorage Operations
// =====================================================

/**
 * Generate localStorage key for workspace + diagram type
 */
function getLocalStorageKey(workspaceId: string, diagramType: DiagramType): string {
  return `${LOCALSTORAGE_KEY_PREFIX}${workspaceId}_${diagramType}`;
}

/**
 * Save diagram state to localStorage (immediate)
 */
export function saveToLocalStorage(
  workspaceId: string,
  diagramType: DiagramType,
  state: Partial<DiagramState>
): void {
  try {
    const key = getLocalStorageKey(workspaceId, diagramType);
    const timestamp = new Date().toISOString();

    const dataToSave = {
      ...state,
      workspace_id: workspaceId,
      diagram_type: diagramType,
      last_saved: timestamp,
    };

    localStorage.setItem(key, JSON.stringify(dataToSave));
    console.log('[DiagramPersistence] Saved to localStorage:', key);
  } catch (error) {
    console.error('[DiagramPersistence] Failed to save to localStorage:', error);
  }
}

/**
 * Load diagram state from localStorage
 */
export function loadFromLocalStorage(
  workspaceId: string,
  diagramType: DiagramType
): Partial<DiagramState> | null {
  try {
    const key = getLocalStorageKey(workspaceId, diagramType);
    const data = localStorage.getItem(key);

    if (!data) {
      return null;
    }

    const parsed = JSON.parse(data);
    console.log('[DiagramPersistence] Loaded from localStorage:', key);
    return parsed;
  } catch (error) {
    console.error('[DiagramPersistence] Failed to load from localStorage:', error);
    return null;
  }
}

/**
 * Clear diagram state from localStorage
 */
export function clearLocalStorage(
  workspaceId: string,
  diagramType: DiagramType
): void {
  try {
    const key = getLocalStorageKey(workspaceId, diagramType);
    localStorage.removeItem(key);
    console.log('[DiagramPersistence] Cleared localStorage:', key);
  } catch (error) {
    console.error('[DiagramPersistence] Failed to clear localStorage:', error);
  }
}

// =====================================================
// Supabase Operations
// =====================================================

/**
 * Save diagram state to Supabase
 */
export async function saveToSupabase(
  accountId: string,
  workspaceId: string,
  diagramType: DiagramType,
  state: SaveDiagramStateRequest
): Promise<SaveDiagramStateResponse> {
  try {
    // Check if record exists
    const { data: existing, error: fetchError } = await supabase
      .from('diagrams')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('diagram_type', diagramType)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      throw fetchError;
    }

    // Build update object with individual columns
    const stateUpdate = {
      viewport: state.viewport || { x: 0, y: 0, zoom: 1 },
      node_positions: state.node_positions || {},
      node_expansions: state.node_expansions || {},
      filters: state.filters || {},
      layout_type: state.layout_type || 'hierarchical',
      layout_direction: state.layout_direction || 'TB',
    };

    let result;
    if (existing) {
      // Update existing record
      const { data, error } = await supabase
        .from('diagrams')
        .update({
          ...stateUpdate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
    } else {
      // Insert new record
      const { data, error } = await supabase
        .from('diagrams')
        .insert({
          account_id: accountId,
          workspace_id: workspaceId,
          name: `${diagramType} Diagram`,
          diagram_type: diagramType,
          ...stateUpdate,
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
    }

    console.log('[DiagramPersistence] Saved to Supabase:', workspaceId);
    return {
      success: true,
      diagram_state: result as DiagramStateRecord,
      version: result.version,
    };
  } catch (error) {
    console.error('[DiagramPersistence] Failed to save to Supabase:', error);
    throw error;
  }
}

/**
 * Load diagram state from Supabase
 */
export async function loadFromSupabase(
  workspaceId: string,
  diagramType: DiagramType
): Promise<LoadDiagramStateResponse> {
  try {
    const { data, error } = await supabase
      .from('diagrams')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('diagram_type', diagramType)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No record found
        return {
          success: true,
          found: false,
        };
      }
      throw error;
    }

    console.log('[DiagramPersistence] Loaded from Supabase:', workspaceId);
    return {
      success: true,
      found: true,
      diagram_state: data as DiagramStateRecord,
    };
  } catch (error) {
    console.error('[DiagramPersistence] Failed to load from Supabase:', error);
    throw error;
  }
}

// =====================================================
// Debounced Save Operations
// =====================================================

/**
 * Save to both localStorage (immediate) and Supabase (debounced)
 */
export function saveDiagramState(
  accountId: string,
  workspaceId: string,
  diagramType: DiagramType,
  state: SaveDiagramStateRequest
): void {
  // Immediate save to localStorage
  saveToLocalStorage(workspaceId, diagramType, state);

  // Debounced save to Supabase
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
  }

  saveDebounceTimer = setTimeout(async () => {
    try {
      await saveToSupabase(accountId, workspaceId, diagramType, state);
    } catch (error) {
      console.error('[DiagramPersistence] Debounced save failed:', error);
    }
  }, SUPABASE_SAVE_DEBOUNCE_MS);
}

/**
 * Force immediate save to Supabase (bypass debounce)
 */
export async function forceImmediateSave(
  accountId: string,
  workspaceId: string,
  diagramType: DiagramType,
  state: SaveDiagramStateRequest
): Promise<SaveDiagramStateResponse> {
  // Cancel any pending debounced save
  if (saveDebounceTimer) {
    clearTimeout(saveDebounceTimer);
    saveDebounceTimer = null;
  }

  // Save to both
  saveToLocalStorage(workspaceId, diagramType, state);
  return await saveToSupabase(accountId, workspaceId, diagramType, state);
}

// =====================================================
// Load Operations with Fallback
// =====================================================

/**
 * Load diagram state with localStorage fallback
 * Priority: Supabase (authoritative) -> localStorage (fast load)
 */
export async function loadDiagramState(
  workspaceId: string,
  diagramType: DiagramType
): Promise<Partial<DiagramState> | null> {
  try {
    // Try loading from Supabase first (authoritative)
    const supabaseResult = await loadFromSupabase(workspaceId, diagramType);

    if (supabaseResult.success && supabaseResult.found && supabaseResult.diagram_state) {
      const record = supabaseResult.diagram_state as any;

      return {
        diagram_id: record.id, // Include the diagram ID from database
        workspace_id: record.workspace_id,
        diagram_type: record.diagram_type,
        viewport: record.viewport || { x: 0, y: 0, zoom: 1 },
        node_positions: record.node_positions || {},
        node_expansions: record.node_expansions || {},
        filters: record.filters || {},
        layout_type: record.layout_type || 'hierarchical',
        layout_direction: record.layout_direction || 'TB',
        last_saved: record.updated_at,
        version: record.version,
      };
    }

    // Fallback to localStorage
    console.log('[DiagramPersistence] No Supabase data, falling back to localStorage');
    return loadFromLocalStorage(workspaceId, diagramType);
  } catch (error) {
    console.error('[DiagramPersistence] Failed to load from Supabase, using localStorage:', error);
    // If Supabase fails, use localStorage as fallback
    return loadFromLocalStorage(workspaceId, diagramType);
  }
}

// =====================================================
// Conflict Resolution
// =====================================================

/**
 * Resolve conflicts between local and remote state
 */
export function resolveConflict(
  localState: Partial<DiagramState>,
  remoteState: DiagramStateRecord,
  strategy: ConflictResolutionStrategy = 'theirs'
): Partial<DiagramState> {
  const localVersion = localState.version || 0;
  const remoteVersion = remoteState.version || 0;

  console.log('[DiagramPersistence] Conflict detected:', {
    localVersion,
    remoteVersion,
    strategy,
  });

  switch (strategy) {
    case 'ours':
      // Keep local state
      return localState;

    case 'theirs':
      // Use remote state
      const remoteRecord = remoteState as any;
      return {
        workspace_id: remoteRecord.workspace_id,
        diagram_type: remoteRecord.diagram_type,
        viewport: remoteRecord.viewport || { x: 0, y: 0, zoom: 1 },
        node_positions: remoteRecord.node_positions || {},
        node_expansions: remoteRecord.node_expansions || {},
        filters: remoteRecord.filters || {},
        layout_type: remoteRecord.layout_type || 'hierarchical',
        layout_direction: remoteRecord.layout_direction || 'TB',
        last_saved: remoteRecord.updated_at,
        version: remoteRecord.version,
      };

    case 'manual':
      // This should trigger a UI modal for manual resolution
      throw new Error('Manual conflict resolution required');

    default:
      // Default to remote (theirs)
      return resolveConflict(localState, remoteState, 'theirs');
  }
}

/**
 * Check if local state is outdated compared to remote
 */
export async function checkForConflicts(
  workspaceId: string,
  diagramType: DiagramType,
  localVersion: number
): Promise<{ hasConflict: boolean; remoteState?: DiagramStateRecord }> {
  try {
    const result = await loadFromSupabase(workspaceId, diagramType);

    if (result.success && result.found && result.diagram_state) {
      const remoteVersion = result.diagram_state.version;

      if (remoteVersion > localVersion) {
        return {
          hasConflict: true,
          remoteState: result.diagram_state,
        };
      }
    }

    return { hasConflict: false };
  } catch (error) {
    console.error('[DiagramPersistence] Failed to check for conflicts:', error);
    return { hasConflict: false };
  }
}

// =====================================================
// Utility Functions
// =====================================================

/**
 * Clear all diagram state for a workspace
 */
export async function clearAllDiagramState(
  workspaceId: string,
  diagramType: DiagramType
): Promise<void> {
  // Clear localStorage
  clearLocalStorage(workspaceId, diagramType);

  // Clear Supabase
  try {
    await supabase
      .from('diagrams')
      .delete()
      .eq('workspace_id', workspaceId)
      .eq('diagram_type', diagramType);

    console.log('[DiagramPersistence] Cleared all state for workspace:', workspaceId);
  } catch (error) {
    console.error('[DiagramPersistence] Failed to clear Supabase state:', error);
  }
}

/**
 * Get last save timestamp
 */
export function getLastSaveTimestamp(
  workspaceId: string,
  diagramType: DiagramType
): string | null {
  const state = loadFromLocalStorage(workspaceId, diagramType);
  return state?.last_saved || null;
}
