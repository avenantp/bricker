import * as yaml from 'js-yaml';

// Types for YAML structures
export interface ProjectYAML {
  metadata: {
    id: string;
    name: string;
    description?: string;
    version: string;
    owner_id: string;
    created_by: string;
    visibility: 'public' | 'private';
    is_locked: boolean;
    locked_by?: string;
    locked_at?: string;
    account_id: string;
    workspace_id: string;
    github_repo: string;
    github_branch: string;
    github_path: string;
    created_at: string;
    updated_at: string;
    last_synced_at?: string;
  };
  members?: Array<{
    user_id: string;
    role: 'owner' | 'editor' | 'viewer';
    added_at: string;
  }>;
  data_models?: Array<{
    id: string;
    name: string;
    path: string;
  }>;
  settings?: {
    databricks_workspace?: string;
    default_catalog?: string;
    default_schema?: string;
    tags?: string[];
  };
}

export interface DataModelYAML {
  metadata: {
    id: string;
    name: string;
    description?: string;
    model_type?: 'dimensional' | 'data_vault' | 'normalized' | 'custom';
    version: string;
    owner_id: string;
    created_by: string;
    visibility: 'public' | 'private';
    is_locked: boolean;
    locked_by?: string;
    locked_at?: string;
    project_id: string;
    account_id: string;
    workspace_id: string;
    github_repo: string;
    github_branch: string;
    github_path: string;
    is_archived: boolean;
    created_at: string;
    updated_at: string;
    last_synced_at?: string;
  };
  visual_model: {
    nodes: Array<{
      id: string;
      type: string;
      position: { x: number; y: number };
      data: Record<string, any>;
    }>;
    edges: Array<{
      id: string;
      source: string;
      target: string;
      type: string;
    }>;
  };
  schema?: {
    catalog: string;
    database: string;
    table: string;
    format: string;
    columns: Array<{
      name: string;
      type: string;
      nullable: boolean;
      comment?: string;
    }>;
    partitioned_by?: string[];
    clustered_by?: {
      type: string;
      columns: string[];
    };
    table_properties?: Record<string, any>;
  };
  data_quality?: Array<{
    name: string;
    type: string;
    column?: string;
    columns?: string[];
    pattern?: string;
    expression?: string;
    where?: string;
  }>;
  members?: Array<{
    user_id: string;
    role: 'owner' | 'editor' | 'viewer';
  }>;
  tags?: string[];
  lineage?: {
    upstream?: Array<{
      type: string;
      catalog?: string;
      schema?: string;
      table?: string;
    }>;
    downstream?: Array<{
      type: string;
      catalog?: string;
      schema?: string;
      table?: string;
    }>;
  };
}

// Export project to YAML format
export function exportProjectToYAML(project: ProjectYAML): string {
  const yamlComment = `# Project: ${project.metadata.name}
# ID: ${project.metadata.id}
# Owner: ${project.metadata.owner_id}
# Visibility: ${project.metadata.visibility}
# Status: ${project.metadata.is_locked ? 'locked' : 'unlocked'}

`;

  return yamlComment + yaml.dump(project, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
  });
}

// Export data model to YAML format
export function exportDataModelToYAML(model: DataModelYAML): string {
  const yamlComment = `# Data Model: ${model.metadata.name}
# ID: ${model.metadata.id}
# Type: ${model.metadata.model_type || 'custom'}
# Visibility: ${model.metadata.visibility}
# Status: ${model.metadata.is_locked ? 'locked' : 'unlocked'}

`;

  return yamlComment + yaml.dump(model, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
  });
}

// Parse YAML to project object
export function parseProjectYAML(yamlContent: string): ProjectYAML {
  try {
    const parsed = yaml.load(yamlContent) as ProjectYAML;
    return parsed;
  } catch (error) {
    throw new Error(`Failed to parse project YAML: ${error}`);
  }
}

// Parse YAML to data model object
export function parseDataModelYAML(yamlContent: string): DataModelYAML {
  try {
    const parsed = yaml.load(yamlContent) as DataModelYAML;
    return parsed;
  } catch (error) {
    throw new Error(`Failed to parse data model YAML: ${error}`);
  }
}

// Generate slug from name
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// Generate GitHub path for project
export function generateProjectPath(workspaceSlug: string, projectSlug: string): string {
  return `metadata/projects/${workspaceSlug}/${projectSlug}.yml`;
}

// Generate GitHub path for data model
export function generateDataModelPath(projectSlug: string, modelSlug: string): string {
  return `metadata/models/${projectSlug}/${modelSlug}.yml`;
}
