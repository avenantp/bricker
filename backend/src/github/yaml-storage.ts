import { GitHubClient } from './github-client.js';
import yaml from 'js-yaml';

// Import Node and Edge types from React Flow
type Node = any;
type Edge = any;

export interface DataModelYAML {
  id: string;
  name: string;
  description?: string;
  model_type: 'dimensional' | 'data_vault' | 'normalized' | 'custom';
  version: number;
  created_at: string;
  updated_at: string;
  nodes: Node[];
  edges: Edge[];
  metadata?: Record<string, any>;
}

export interface TemplateYAML {
  id: string;
  name: string;
  description?: string;
  category: string;
  language: 'sql' | 'python' | 'scala';
  template_content: string;
  variables: Array<{
    name: string;
    type: string;
    required: boolean;
    default?: any;
    description?: string;
  }>;
  variations?: Array<{
    id: string;
    name: string;
    enabled: boolean;
    adds_variables?: string[];
  }>;
  tags?: string[];
}

export interface WorkspaceConfig {
  workspace_id: string;
  workspace_name: string;
  databricks_workspace_url?: string;
  default_catalog?: string;
  default_schema?: string;
  settings?: Record<string, any>;
}

/**
 * Service for managing YAML files in GitHub
 */
export class YAMLStorageService {
  private github: GitHubClient;

  constructor(github: GitHubClient) {
    this.github = github;
  }

  /**
   * Save a data model as YAML to GitHub
   */
  async saveDataModel(model: DataModelYAML): Promise<string> {
    const path = `metadata/models/${model.id}.yaml`;
    const yaml = this.serializeDataModel(model);

    // Check if file exists to get SHA for update
    const existingFile = await this.github.getFile(path);

    const commitSha = await this.github.commitFile({
      path,
      content: yaml,
      message: `${existingFile ? 'Update' : 'Create'} data model: ${model.name}`,
      sha: existingFile?.sha,
    });

    return commitSha;
  }

  /**
   * Load a data model from GitHub
   */
  async loadDataModel(modelId: string): Promise<DataModelYAML | null> {
    const path = `metadata/models/${modelId}.yaml`;
    const file = await this.github.getFile(path);

    if (!file) {
      return null;
    }

    return this.deserializeDataModel(file.content);
  }

  /**
   * List all data models in GitHub
   */
  async listDataModels(): Promise<Array<{ id: string; name: string; path: string }>> {
    const files = await this.github.listFiles('metadata/models');

    return files
      .filter((f) => f.name.endsWith('.yaml') || f.name.endsWith('.yml'))
      .map((f) => ({
        id: f.name.replace(/\.(yaml|yml)$/, ''),
        name: f.name,
        path: f.path,
      }));
  }

  /**
   * Delete a data model from GitHub
   */
  async deleteDataModel(modelId: string): Promise<void> {
    const path = `metadata/models/${modelId}.yaml`;
    const file = await this.github.getFile(path);

    if (!file) {
      throw new Error(`Model ${modelId} not found`);
    }

    await this.github.deleteFile(path, `Delete data model: ${modelId}`, file.sha);
  }

  /**
   * Save a template as YAML to GitHub
   */
  async saveTemplate(template: TemplateYAML): Promise<string> {
    const path = `metadata/templates/${template.category}/${template.id}.yaml`;
    const yaml = this.serializeTemplate(template);

    const existingFile = await this.github.getFile(path);

    const commitSha = await this.github.commitFile({
      path,
      content: yaml,
      message: `${existingFile ? 'Update' : 'Create'} template: ${template.name}`,
      sha: existingFile?.sha,
    });

    return commitSha;
  }

  /**
   * Load a template from GitHub
   */
  async loadTemplate(category: string, templateId: string): Promise<TemplateYAML | null> {
    const path = `metadata/templates/${category}/${templateId}.yaml`;
    const file = await this.github.getFile(path);

    if (!file) {
      return null;
    }

    return this.deserializeTemplate(file.content);
  }

  /**
   * List all templates in GitHub
   */
  async listTemplates(category?: string): Promise<Array<{ id: string; category: string; name: string; path: string }>> {
    const basePath = category ? `metadata/templates/${category}` : 'metadata/templates';
    const files = await this.github.listFiles(basePath);

    const templates: Array<{ id: string; category: string; name: string; path: string }> = [];

    for (const file of files) {
      if (file.type === 'dir' && !category) {
        // Recursively list templates in subdirectories
        const subFiles = await this.github.listFiles(file.path);
        for (const subFile of subFiles) {
          if (subFile.name.endsWith('.yaml') || subFile.name.endsWith('.yml')) {
            templates.push({
              id: subFile.name.replace(/\.(yaml|yml)$/, ''),
              category: file.name,
              name: subFile.name,
              path: subFile.path,
            });
          }
        }
      } else if (file.name.endsWith('.yaml') || file.name.endsWith('.yml')) {
        templates.push({
          id: file.name.replace(/\.(yaml|yml)$/, ''),
          category: category || 'unknown',
          name: file.name,
          path: file.path,
        });
      }
    }

    return templates;
  }

  /**
   * Save workspace configuration
   */
  async saveWorkspaceConfig(config: WorkspaceConfig): Promise<string> {
    const path = `metadata/configurations/workspace_${config.workspace_id}.yaml`;
    const yaml = this.serializeWorkspaceConfig(config);

    const existingFile = await this.github.getFile(path);

    const commitSha = await this.github.commitFile({
      path,
      content: yaml,
      message: `${existingFile ? 'Update' : 'Create'} workspace config: ${config.workspace_name}`,
      sha: existingFile?.sha,
    });

    return commitSha;
  }

  /**
   * Load workspace configuration
   */
  async loadWorkspaceConfig(workspaceId: string): Promise<WorkspaceConfig | null> {
    const path = `metadata/configurations/workspace_${workspaceId}.yaml`;
    const file = await this.github.getFile(path);

    if (!file) {
      return null;
    }

    return this.deserializeWorkspaceConfig(file.content);
  }

  // Serialization methods
  private serializeDataModel(model: DataModelYAML): string {
    return `# Data Model: ${model.name}
# Generated by Uroq - Databricks Automation Builder
# Model ID: ${model.id}

id: "${model.id}"
name: "${model.name}"
${model.description ? `description: "${model.description}"\n` : ''}model_type: ${model.model_type}
version: ${model.version}
created_at: "${model.created_at}"
updated_at: "${model.updated_at}"

# Nodes (Tables, Transformations, etc.)
nodes:
${model.nodes.map((node) => this.serializeNode(node)).join('\n')}

# Edges (Data Flow)
edges:
${model.edges.map((edge) => this.serializeEdge(edge)).join('\n')}

${model.metadata && Object.keys(model.metadata).length > 0 ? `# Metadata\nmetadata:\n${this.serializeMetadata(model.metadata)}` : ''}
`;
  }

  private serializeNode(node: Node): string {
    const data = node.data || {};
    return `  - id: "${node.id}"
    type: "${node.type || 'default'}"
    position:
      x: ${node.position.x}
      y: ${node.position.y}
    data:
${Object.entries(data).map(([key, value]) => `      ${key}: ${JSON.stringify(value)}`).join('\n')}`;
  }

  private serializeEdge(edge: Edge): string {
    return `  - id: "${edge.id}"
    source: "${edge.source}"
    target: "${edge.target}"
    ${edge.sourceHandle ? `sourceHandle: "${edge.sourceHandle}"\n    ` : ''}${edge.targetHandle ? `targetHandle: "${edge.targetHandle}"` : ''}`;
  }

  private serializeMetadata(metadata: Record<string, any>): string {
    return Object.entries(metadata)
      .map(([key, value]) => `  ${key}: ${JSON.stringify(value)}`)
      .join('\n');
  }

  private serializeTemplate(template: TemplateYAML): string {
    return `# Template: ${template.name}
# Category: ${template.category}
# Language: ${template.language}

id: "${template.id}"
name: "${template.name}"
${template.description ? `description: "${template.description}"\n` : ''}category: ${template.category}
language: ${template.language}

# Variables
variables:
${template.variables.map((v) => `  - name: "${v.name}"
    type: ${v.type}
    required: ${v.required}
${v.default !== undefined ? `    default: ${JSON.stringify(v.default)}\n` : ''}${v.description ? `    description: "${v.description}"\n` : ''}`).join('\n')}

${template.variations && template.variations.length > 0 ? `# Variations\nvariations:\n${template.variations.map((v) => `  - id: "${v.id}"
    name: "${v.name}"
    enabled: ${v.enabled}
${v.adds_variables ? `    adds_variables: ${JSON.stringify(v.adds_variables)}\n` : ''}`).join('\n')}\n` : ''}
${template.tags && template.tags.length > 0 ? `tags:\n${template.tags.map((t) => `  - "${t}"`).join('\n')}\n` : ''}
# Template Content
template_content: |
${template.template_content.split('\n').map((line) => `  ${line}`).join('\n')}
`;
  }

  private serializeWorkspaceConfig(config: WorkspaceConfig): string {
    return `# Workspace Configuration
# Workspace: ${config.workspace_name}

workspace_id: "${config.workspace_id}"
workspace_name: "${config.workspace_name}"
${config.databricks_workspace_url ? `databricks_workspace_url: "${config.databricks_workspace_url}"\n` : ''}${config.default_catalog ? `default_catalog: "${config.default_catalog}"\n` : ''}${config.default_schema ? `default_schema: "${config.default_schema}"\n` : ''}
${config.settings && Object.keys(config.settings).length > 0 ? `settings:\n${this.serializeMetadata(config.settings)}` : ''}
`;
  }

  // Deserialization methods
  private deserializeDataModel(yamlContent: string): DataModelYAML {
    try {
      const parsed = yaml.load(yamlContent) as any;
      return {
        id: parsed.id,
        name: parsed.name,
        description: parsed.description,
        model_type: parsed.model_type,
        version: parsed.version,
        created_at: parsed.created_at,
        updated_at: parsed.updated_at,
        nodes: parsed.nodes || [],
        edges: parsed.edges || [],
        metadata: parsed.metadata || {},
      };
    } catch (error: any) {
      throw new Error(`Failed to parse data model YAML: ${error.message}`);
    }
  }

  private deserializeTemplate(yamlContent: string): TemplateYAML {
    try {
      const parsed = yaml.load(yamlContent) as any;
      return {
        id: parsed.id,
        name: parsed.name,
        description: parsed.description,
        category: parsed.category,
        language: parsed.language,
        template_content: parsed.template_content,
        variables: parsed.variables || [],
        variations: parsed.variations,
        tags: parsed.tags,
      };
    } catch (error: any) {
      throw new Error(`Failed to parse template YAML: ${error.message}`);
    }
  }

  private deserializeWorkspaceConfig(yamlContent: string): WorkspaceConfig {
    try {
      const parsed = yaml.load(yamlContent) as any;
      return {
        workspace_id: parsed.workspace_id,
        workspace_name: parsed.workspace_name,
        databricks_workspace_url: parsed.databricks_workspace_url,
        default_catalog: parsed.default_catalog,
        default_schema: parsed.default_schema,
        settings: parsed.settings,
      };
    } catch (error: any) {
      throw new Error(`Failed to parse workspace config YAML: ${error.message}`);
    }
  }
}
