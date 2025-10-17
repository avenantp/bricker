/**
 * Workspace Diagram Types
 * Types for workspace diagrams (multiple diagrams per workspace)
 */

// Match database schema: diagram_type IN ('dataset', 'business_model', 'lineage', 'erd')
export type DiagramType = 'dataset' | 'business_model' | 'lineage' | 'erd';

// Match database schema: view_mode IN ('relationships', 'lineage')
export type ViewMode = 'relationships' | 'lineage';

export interface WorkspaceDiagram {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;

  // Diagram metadata
  is_default: boolean;
  diagram_type: DiagramType;
  view_mode: ViewMode;

  // Multi-tenancy
  account_id: string;
  created_by: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface WorkspaceDiagramWithDetails extends WorkspaceDiagram {
  // Computed/joined fields
  workspace_name?: string;
  dataset_count?: number;
  created_by_name?: string;
}

export interface CreateWorkspaceDiagramInput {
  workspace_id: string;
  account_id: string;
  name: string;
  description?: string;
  is_default?: boolean;
  diagram_type?: DiagramType;
  view_mode?: ViewMode;
}

export interface UpdateWorkspaceDiagramInput {
  name?: string;
  description?: string;
  is_default?: boolean;
  diagram_type?: DiagramType;
  view_mode?: ViewMode;
}

export interface WorkspaceDiagramFilters {
  workspace_id?: string;
  account_id?: string;
  diagram_type?: DiagramType;
  is_default?: boolean;
  search?: string;
}
