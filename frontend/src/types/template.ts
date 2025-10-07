// Template Composition Types

export interface TemplateFragment {
  id: string;
  workspace_id: string | null;
  name: string;
  description: string | null;
  category: 'header' | 'validation' | 'transformation' | 'error_handling' |
            'logging' | 'footer' | 'initialization' | 'cleanup' | 'custom';
  language: 'sql' | 'python' | 'scala';
  fragment_content: string;
  variables: TemplateVariable[];
  dependencies: string[];
  is_public: boolean;
  is_system_template: boolean;
  cloned_from_id: string | null;
  github_path: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  default?: any;
  description?: string;
}

export interface TemplateComposition {
  id: string;
  workspace_id: string | null;
  name: string;
  description: string | null;
  language: 'sql' | 'python' | 'scala';
  flow_data: {
    nodes: CompositionNodeData[];
    edges: CompositionEdgeData[];
  };
  created_by: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
}

export interface CompositionNodeData {
  id: string;
  type: 'fragment' | 'condition' | 'start' | 'end' | 'merge' | 'codeFragment';
  position: { x: number; y: number };
  data: {
    label: string;
    fragmentId?: string;
    fragment?: TemplateFragment;
    condition?: string;
    isEnabled?: boolean;
    editorContent?: string; // For inline editing
    fragmentName?: string; // For code fragment nodes
    fragmentType?: string; // For code fragment nodes
    jinjaCode?: string; // For code fragment nodes
  };
}

export interface CompositionEdgeData {
  id: string;
  source: string;
  target: string;
  type?: string;
  label?: string;
  data?: {
    condition?: string;
  };
}

export interface TemplateCompositionNode {
  id: string;
  composition_id: string;
  node_id: string;
  node_type: 'fragment' | 'condition' | 'start' | 'end' | 'merge';
  fragment_id: string | null;
  position: { x: number; y: number };
  data: Record<string, any>;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface TemplateCompositionEdge {
  id: string;
  composition_id: string;
  edge_id: string;
  source_node_id: string;
  target_node_id: string;
  edge_type: string;
  label: string | null;
  condition: Record<string, any>;
  created_at: string;
}

export interface TemplateCompositionVersion {
  id: string;
  composition_id: string;
  version_number: number;
  flow_data: {
    nodes: CompositionNodeData[];
    edges: CompositionEdgeData[];
  };
  compiled_template: string | null;
  created_by: string;
  created_at: string;
  change_summary: string | null;
}
