#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import * as yaml from 'js-yaml';
import nunjucks from 'nunjucks';

// Configure Nunjucks (Jinja2-like templating for JavaScript)
nunjucks.configure({ autoescape: false });

// Tool input schemas
const GenerateDimensionalModelSchema = z.object({
  source_tables: z.array(z.string()),
  dimension_attributes: z.array(z.object({
    source_table: z.string(),
    columns: z.array(z.string()),
  })),
  grain: z.string(),
  workspace_id: z.string(),
  scd_type: z.enum(['1', '2', '3']).optional().default('2'),
});

const GenerateDataVaultModelSchema = z.object({
  source_tables: z.array(z.string()),
  business_keys: z.record(z.string()),
  relationships: z.array(z.object({
    from: z.string(),
    to: z.string(),
    type: z.string(),
  })),
  workspace_id: z.string(),
});

const GenerateReactFlowNodesSchema = z.object({
  model_spec: z.object({
    tables: z.array(z.any()),
    relationships: z.array(z.any()).optional(),
  }),
  layout: z.enum(['hierarchical', 'force', 'circular']).optional().default('hierarchical'),
});

const GenerateYamlMetadataSchema = z.object({
  model: z.object({
    name: z.string(),
    description: z.string().optional(),
    tables: z.array(z.any()),
    relationships: z.array(z.any()).optional(),
  }),
  workspace_id: z.string(),
});

const GenerateTemplatesSchema = z.object({
  model: z.object({
    tables: z.array(z.any()),
  }),
  template_types: z.array(z.enum(['ddl', 'etl', 'dml', 'test'])),
});

interface ReactFlowNode {
  id: string;
  type: string;
  data: any;
  position: { x: number; y: number };
}

interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  type: string;
}

class ModelGeneratorServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'model-generator',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getTools(),
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'generate_dimensional_model':
            return await this.generateDimensionalModel(request.params.arguments);
          case 'generate_data_vault_model':
            return await this.generateDataVaultModel(request.params.arguments);
          case 'generate_reactflow_nodes':
            return await this.generateReactFlowNodes(request.params.arguments);
          case 'generate_yaml_metadata':
            return await this.generateYamlMetadata(request.params.arguments);
          case 'generate_templates':
            return await this.generateTemplates(request.params.arguments);
          default:
            throw new Error(`Unknown tool: ${request.params.name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private getTools(): Tool[] {
    return [
      {
        name: 'generate_dimensional_model',
        description: 'Generate Kimball dimensional model from source tables',
        inputSchema: {
          type: 'object',
          properties: {
            source_tables: {
              type: 'array',
              items: { type: 'string' },
              description: 'Source table names',
            },
            dimension_attributes: {
              type: 'array',
              items: { type: 'object' },
              description: 'Attributes to include in dimension',
            },
            grain: {
              type: 'string',
              description: 'Dimension grain (e.g., "one row per product")',
            },
            workspace_id: {
              type: 'string',
              description: 'Workspace identifier',
            },
            scd_type: {
              type: 'string',
              enum: ['1', '2', '3'],
              description: 'SCD type (default: 2)',
              default: '2',
            },
          },
          required: ['source_tables', 'dimension_attributes', 'grain', 'workspace_id'],
        },
      },
      {
        name: 'generate_data_vault_model',
        description: 'Generate Data Vault 2.0 model (hubs, links, satellites)',
        inputSchema: {
          type: 'object',
          properties: {
            source_tables: {
              type: 'array',
              items: { type: 'string' },
              description: 'Source table names',
            },
            business_keys: {
              type: 'object',
              description: 'Business keys for each entity',
            },
            relationships: {
              type: 'array',
              items: { type: 'object' },
              description: 'Relationships between entities',
            },
            workspace_id: {
              type: 'string',
              description: 'Workspace identifier',
            },
          },
          required: ['source_tables', 'business_keys', 'relationships', 'workspace_id'],
        },
      },
      {
        name: 'generate_reactflow_nodes',
        description: 'Convert data model to React Flow node/edge structure',
        inputSchema: {
          type: 'object',
          properties: {
            model_spec: {
              type: 'object',
              description: 'Model specification with tables and relationships',
            },
            layout: {
              type: 'string',
              enum: ['hierarchical', 'force', 'circular'],
              description: 'Layout algorithm',
              default: 'hierarchical',
            },
          },
          required: ['model_spec'],
        },
      },
      {
        name: 'generate_yaml_metadata',
        description: 'Generate YAML metadata file for GitHub storage',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'object',
              description: 'Complete model specification',
            },
            workspace_id: {
              type: 'string',
              description: 'Workspace identifier',
            },
          },
          required: ['model', 'workspace_id'],
        },
      },
      {
        name: 'generate_templates',
        description: 'Generate Jinja2 templates for model deployment',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'object',
              description: 'Model specification',
            },
            template_types: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['ddl', 'etl', 'dml', 'test'],
              },
              description: 'Types of templates to generate',
            },
          },
          required: ['model', 'template_types'],
        },
      },
    ];
  }

  private async generateDimensionalModel(args: unknown) {
    const { source_tables, dimension_attributes, grain, workspace_id, scd_type } =
      GenerateDimensionalModelSchema.parse(args);

    // Generate dimension name from source tables
    const dimensionName = this.generateDimensionName(source_tables);

    // Build column list
    const columns = this.buildDimensionColumns(dimension_attributes, scd_type);

    // Create dimension table spec
    const dimensionTable = {
      name: `dim_${dimensionName}`,
      type: 'dimension',
      scd_type: parseInt(scd_type),
      grain,
      source_tables,
      columns,
      optimizations: this.getDimensionOptimizations(scd_type, columns.length),
    };

    // Generate React Flow representation
    const reactFlowModel = this.createDimensionReactFlow(dimensionTable, source_tables);

    // Generate YAML
    const yamlMetadata = this.generateDimensionYaml(dimensionTable, workspace_id);

    // Generate DDL template
    const ddlTemplate = this.generateDimensionDDL(dimensionTable, scd_type);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              dimension: dimensionTable,
              reactflow_model: reactFlowModel,
              yaml_metadata: yamlMetadata,
              ddl_template: ddlTemplate,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private generateDimensionName(sourceTables: string[]): string {
    // Simple heuristic: use the primary table name
    if (sourceTables.length === 1) {
      return sourceTables[0].toLowerCase().replace(/^(tbl_|src_)/, '');
    }
    // For multiple tables, combine names
    return sourceTables
      .map((t) => t.toLowerCase().replace(/^(tbl_|src_)/, ''))
      .join('_');
  }

  private buildDimensionColumns(dimensionAttributes: any[], scdType: string): any[] {
    const columns = [
      {
        name: 'dimension_key',
        type: 'BIGINT',
        description: 'Surrogate key',
        is_primary_key: true,
      },
      {
        name: 'natural_key',
        type: 'STRING',
        description: 'Business key',
        is_unique: true,
      },
    ];

    // Add attributes from source tables
    dimensionAttributes.forEach((attr) => {
      attr.columns.forEach((col: string) => {
        (columns as any).push({
          name: col,
          type: 'STRING', // Default type
          description: `From ${attr.source_table}`,
        });
      });
    });

    // Add SCD tracking columns
    if (scdType === '2') {
      (columns as any).push(
        { name: 'effective_date', type: 'DATE', description: 'Effective start date' },
        { name: 'end_date', type: 'DATE', description: 'Effective end date' },
        { name: 'is_current', type: 'BOOLEAN', description: 'Current version flag' },
        { name: 'version_number', type: 'INT', description: 'Version sequence' }
      );
    } else if (scdType === '1') {
      (columns as any).push({
        name: 'last_updated',
        type: 'TIMESTAMP',
        description: 'Last update timestamp',
      });
    }

    return columns;
  }

  private getDimensionOptimizations(scdType: string, columnCount: number): any {
    const baseOptimizations = {
      change_data_feed: true,
    };

    if (scdType === '2') {
      return {
        ...baseOptimizations,
        partitioning: 'effective_date',
        z_order: ['natural_key'],
      };
    }

    return {
      ...baseOptimizations,
      liquid_clustering: ['natural_key'],
    };
  }

  private createDimensionReactFlow(dimensionTable: any, sourceTables: string[]): any {
    const nodes: ReactFlowNode[] = [];
    const edges: ReactFlowEdge[] = [];

    // Add source table nodes
    sourceTables.forEach((table, idx) => {
      nodes.push({
        id: `source_${table}`,
        type: 'source',
        data: {
          label: table,
          table_type: 'source',
        },
        position: { x: 100, y: 100 + idx * 100 },
      });

      edges.push({
        id: `e_${table}_${dimensionTable.name}`,
        source: `source_${table}`,
        target: dimensionTable.name,
        type: 'data_flow',
      });
    });

    // Add dimension node
    nodes.push({
      id: dimensionTable.name,
      type: 'dimension',
      data: {
        label: dimensionTable.name,
        table_type: 'dimension',
        scd_type: dimensionTable.scd_type,
        columns: dimensionTable.columns,
        optimizations: dimensionTable.optimizations,
      },
      position: { x: 400, y: 200 },
    });

    return { nodes, edges };
  }

  private generateDimensionYaml(dimensionTable: any, workspaceId: string): string {
    const metadata = {
      workspace_id: workspaceId,
      model_type: 'dimensional',
      created_at: new Date().toISOString(),
      tables: [dimensionTable],
    };

    return yaml.dump(metadata);
  }

  private generateDimensionDDL(dimensionTable: any, scdType: string): string {
    const template = `
CREATE TABLE {{ catalog }}.{{ schema }}.{{ table_name }}
(
  {% for col in columns %}
  {{ col.name }} {{ col.type }}{% if col.is_primary_key %} GENERATED ALWAYS AS IDENTITY{% endif %}{% if not loop.last %},{% endif %}
  {% endfor %}
  , CONSTRAINT pk_{{ table_name }} PRIMARY KEY({{ primary_key }})
  {% if unique_key %}, CONSTRAINT uk_{{ table_name }} UNIQUE({{ unique_key }}){% endif %}
)
USING DELTA
{% if partitioning %}PARTITIONED BY ({{ partitioning }}){% endif %}
{% if clustering %}CLUSTER BY ({{ clustering }}){% endif %}
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
);
`.trim();

    const primaryKey = dimensionTable.columns.find((c: any) => c.is_primary_key)?.name;
    const uniqueKey = dimensionTable.columns.find((c: any) => c.is_unique)?.name;

    return nunjucks.renderString(template, {
      catalog: '{{ catalog }}',
      schema: '{{ schema }}',
      table_name: dimensionTable.name,
      columns: dimensionTable.columns,
      primary_key: primaryKey,
      unique_key: uniqueKey,
      partitioning: dimensionTable.optimizations.partitioning,
      clustering: dimensionTable.optimizations.liquid_clustering?.join(', '),
    });
  }

  private async generateDataVaultModel(args: unknown) {
    const { source_tables, business_keys, relationships, workspace_id } =
      GenerateDataVaultModelSchema.parse(args);

    const hubs: any[] = [];
    const links: any[] = [];
    const satellites: any[] = [];

    // Generate hubs for each source table
    source_tables.forEach((table) => {
      const businessKey = business_keys[table];
      if (businessKey) {
        hubs.push({
          name: `hub_${table}`,
          type: 'hub',
          entity: table,
          business_key: businessKey,
          columns: [
            { name: `${table}_hub_key`, type: 'BIGINT', constraint: 'GENERATED ALWAYS AS IDENTITY' },
            { name: `${table}_business_key`, type: 'STRING', constraint: 'NOT NULL' },
            { name: 'load_date', type: 'TIMESTAMP', constraint: 'NOT NULL DEFAULT CURRENT_TIMESTAMP()' },
            { name: 'record_source', type: 'STRING', constraint: 'NOT NULL' },
          ],
        });

        // Create satellite for descriptive attributes
        satellites.push({
          name: `sat_${table}_details`,
          type: 'satellite',
          parent_hub: `hub_${table}`,
          columns: [
            { name: `${table}_hub_key`, type: 'BIGINT', constraint: 'NOT NULL' },
            { name: 'load_date', type: 'TIMESTAMP', constraint: 'NOT NULL' },
            { name: 'load_end_date', type: 'TIMESTAMP' },
            { name: 'hash_diff', type: 'STRING', constraint: 'NOT NULL' },
            { name: 'record_source', type: 'STRING', constraint: 'NOT NULL' },
          ],
        });
      }
    });

    // Generate links for relationships
    relationships.forEach((rel, idx) => {
      links.push({
        name: `link_${rel.from}_${rel.to}`,
        type: 'link',
        hubs: [rel.from, rel.to],
        relationship_type: rel.type,
      });
    });

    const model = {
      hubs,
      links,
      satellites,
    };

    // Generate React Flow
    const reactFlowModel = this.createDataVaultReactFlow(model);

    // Generate YAML
    const yamlMetadata = yaml.dump({
      workspace_id,
      model_type: 'data_vault',
      created_at: new Date().toISOString(),
      ...model,
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              model,
              reactflow_model: reactFlowModel,
              yaml_metadata: yamlMetadata,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private createDataVaultReactFlow(model: any): any {
    const nodes: ReactFlowNode[] = [];
    const edges: ReactFlowEdge[] = [];

    let yPos = 100;

    // Add hub nodes
    model.hubs.forEach((hub: any, idx: number) => {
      nodes.push({
        id: hub.name,
        type: 'hub',
        data: {
          label: hub.name,
          table_type: 'hub',
          entity: hub.entity,
        },
        position: { x: 200 + idx * 300, y: yPos },
      });

      // Add satellite for this hub
      const satellite = model.satellites.find((s: any) => s.parent_hub === hub.name);
      if (satellite) {
        nodes.push({
          id: satellite.name,
          type: 'satellite',
          data: {
            label: satellite.name,
            table_type: 'satellite',
          },
          position: { x: 200 + idx * 300, y: yPos + 150 },
        });

        edges.push({
          id: `e_${hub.name}_${satellite.name}`,
          source: hub.name,
          target: satellite.name,
          type: 'describes',
        });
      }
    });

    // Add link nodes
    model.links.forEach((link: any, idx: number) => {
      const linkY = yPos + 300;
      nodes.push({
        id: link.name,
        type: 'link',
        data: {
          label: link.name,
          table_type: 'link',
          hubs: link.hubs,
        },
        position: { x: 350 + idx * 200, y: linkY },
      });

      // Connect hubs to link
      link.hubs.forEach((hubName: string) => {
        const hubNode = nodes.find((n) => n.id === `hub_${hubName}`);
        if (hubNode) {
          edges.push({
            id: `e_${hubNode.id}_${link.name}`,
            source: hubNode.id,
            target: link.name,
            type: 'relationship',
          });
        }
      });
    });

    return { nodes, edges };
  }

  private async generateReactFlowNodes(args: unknown) {
    const { model_spec, layout } = GenerateReactFlowNodesSchema.parse(args);

    const nodes: ReactFlowNode[] = [];
    const edges: ReactFlowEdge[] = [];

    // Apply layout algorithm
    const positions = this.calculateLayout(model_spec.tables, layout);

    model_spec.tables.forEach((table: any, idx: number) => {
      nodes.push({
        id: table.name,
        type: table.type || 'default',
        data: {
          label: table.name,
          ...table,
        },
        position: positions[idx],
      });
    });

    // Create edges from relationships
    if (model_spec.relationships) {
      model_spec.relationships.forEach((rel: any, idx: number) => {
        edges.push({
          id: `edge_${idx}`,
          source: rel.from || rel.source,
          target: rel.to || rel.target,
          type: rel.type || 'default',
        });
      });
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ nodes, edges }, null, 2),
        },
      ],
    };
  }

  private calculateLayout(tables: any[], layout: string): Array<{ x: number; y: number }> {
    const positions: Array<{ x: number; y: number }> = [];

    if (layout === 'hierarchical') {
      tables.forEach((_, idx) => {
        positions.push({
          x: 100 + (idx % 3) * 300,
          y: 100 + Math.floor(idx / 3) * 200,
        });
      });
    } else if (layout === 'circular') {
      const radius = 300;
      const centerX = 400;
      const centerY = 400;
      tables.forEach((_, idx) => {
        const angle = (2 * Math.PI * idx) / tables.length;
        positions.push({
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        });
      });
    } else {
      // Force layout (simplified)
      tables.forEach((_, idx) => {
        positions.push({
          x: 100 + Math.random() * 600,
          y: 100 + Math.random() * 400,
        });
      });
    }

    return positions;
  }

  private async generateYamlMetadata(args: unknown) {
    const { model, workspace_id } = GenerateYamlMetadataSchema.parse(args);

    const metadata = {
      workspace_id,
      model_name: model.name,
      description: model.description || '',
      created_at: new Date().toISOString(),
      version: '1.0.0',
      tables: model.tables,
      relationships: model.relationships || [],
    };

    const yamlStr = yaml.dump(metadata);

    return {
      content: [
        {
          type: 'text' as const,
          text: yamlStr,
        },
      ],
    };
  }

  private async generateTemplates(args: unknown) {
    const { model, template_types } = GenerateTemplatesSchema.parse(args);

    const templates: any[] = [];

    template_types.forEach((type) => {
      switch (type) {
        case 'ddl':
          templates.push({
            type: 'ddl',
            content: this.generateDDLTemplates(model.tables),
          });
          break;
        case 'etl':
          templates.push({
            type: 'etl',
            content: this.generateETLTemplates(model.tables),
          });
          break;
        case 'dml':
          templates.push({
            type: 'dml',
            content: this.generateDMLTemplates(model.tables),
          });
          break;
        case 'test':
          templates.push({
            type: 'test',
            content: this.generateTestTemplates(model.tables),
          });
          break;
      }
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ templates }, null, 2),
        },
      ],
    };
  }

  private generateDDLTemplates(tables: any[]): string {
    return tables
      .map((table) => {
        return `-- DDL for ${table.name}\nCREATE TABLE {{ catalog }}.{{ schema }}.${table.name} (...);`;
      })
      .join('\n\n');
  }

  private generateETLTemplates(tables: any[]): string {
    return tables
      .map((table) => {
        return `-- ETL for ${table.name}\nINSERT INTO {{ catalog }}.{{ schema }}.${table.name} SELECT * FROM source;`;
      })
      .join('\n\n');
  }

  private generateDMLTemplates(tables: any[]): string {
    return '-- DML templates placeholder';
  }

  private generateTestTemplates(tables: any[]): string {
    return tables
      .map((table) => {
        return `-- Tests for ${table.name}\nSELECT COUNT(*) FROM {{ catalog }}.{{ schema }}.${table.name};`;
      })
      .join('\n\n');
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Model Generator MCP Server running on stdio');
  }
}

const server = new ModelGeneratorServer();
server.run().catch(console.error);
