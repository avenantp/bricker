/**
 * Workspace Diagram Types
 * Types for workspace diagrams (multiple diagrams per workspace)
 */

export type DiagramType = 'dataset' | 'workflow' | 'pipeline';

export interface WorkspaceDiagram {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;

  // Diagram metadata
  is_default: boolean;
  diagram_type: DiagramType;

  // Multi-tenancy
  account_id: string;
  created_by: string | null;

  // Timestamps
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface WorkspaceDiagramWithDetails extends WorkspaceDiagram {
  // Computed/joined fields
  workspace_name?: string;
  dataset_count?: number;
  created_by_name?: string;
}

export interface CreateWorkspaceDiagramInput {
  workspace_id: string;
  name: string;
  description?: string;
  is_default?: boolean;
  diagram_type?: DiagramType;
}

export interface UpdateWorkspaceDiagramInput {
  name?: string;
  description?: string;
  is_default?: boolean;
  diagram_type?: DiagramType;
}

export interface WorkspaceDiagramFilters {
  workspace_id?: string;
  account_id?: string;
  diagram_type?: DiagramType;
  is_default?: boolean;
  search?: string;
}
