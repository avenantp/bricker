#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

interface ReactFlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: any;
}

interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  label?: string;
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
      console.error('[Model Generator MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'generate_react_flow_model',
            description:
              'Generate a React Flow visualization model from table specifications',
            inputSchema: {
              type: 'object',
              properties: {
                tables: {
                  type: 'array',
                  description: 'Array of table specifications',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      type: { type: 'string' },
                      columns: { type: 'array' },
                    },
                  },
                },
                relationships: {
                  type: 'array',
                  description: 'Array of relationships between tables',
                  items: {
                    type: 'object',
                  },
                },
                layoutDirection: {
                  type: 'string',
                  enum: ['horizontal', 'vertical'],
                  description: 'Layout direction for the diagram',
                },
              },
              required: ['tables'],
            },
          },
          {
            name: 'generate_yaml_metadata',
            description: 'Generate YAML metadata from model specifications',
            inputSchema: {
              type: 'object',
              properties: {
                modelName: {
                  type: 'string',
                  description: 'Name of the data model',
                },
                tables: {
                  type: 'array',
                  description: 'Array of table specifications',
                  items: {
                    type: 'object',
                  },
                },
                relationships: {
                  type: 'array',
                  description: 'Array of relationships',
                  items: {
                    type: 'object',
                  },
                },
                metadata: {
                  type: 'object',
                  description: 'Additional metadata',
                },
              },
              required: ['modelName', 'tables'],
            },
          },
          {
            name: 'generate_jinja_template',
            description:
              'Generate a Jinja2 template for creating Databricks objects',
            inputSchema: {
              type: 'object',
              properties: {
                templateType: {
                  type: 'string',
                  enum: ['table', 'view', 'notebook', 'job'],
                  description: 'Type of Databricks object to create',
                },
                specification: {
                  type: 'object',
                  description: 'Specification for the template',
                },
              },
              required: ['templateType', 'specification'],
            },
          },
          {
            name: 'generate_data_vault_model',
            description:
              'Generate a complete Data Vault 2.0 model (hubs, links, satellites)',
            inputSchema: {
              type: 'object',
              properties: {
                sourceTables: {
                  type: 'array',
                  description: 'Source table definitions',
                  items: {
                    type: 'object',
                  },
                },
                businessKeys: {
                  type: 'object',
                  description: 'Business key definitions for each entity',
                },
              },
              required: ['sourceTables'],
            },
          },
          {
            name: 'generate_kimball_model',
            description:
              'Generate a Kimball dimensional model (dimensions and facts)',
            inputSchema: {
              type: 'object',
              properties: {
                sourceTables: {
                  type: 'array',
                  description: 'Source table definitions',
                  items: {
                    type: 'object',
                  },
                },
                factGrain: {
                  type: 'string',
                  description: 'Grain of the fact table',
                },
                measures: {
                  type: 'array',
                  description: 'Measure columns for fact table',
                  items: {
                    type: 'string',
                  },
                },
              },
              required: ['sourceTables'],
            },
          },
        ] as Tool[],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'generate_react_flow_model':
            return await this.generateReactFlowModel(args);
          case 'generate_yaml_metadata':
            return await this.generateYamlMetadata(args);
          case 'generate_jinja_template':
            return await this.generateJinjaTemplate(args);
          case 'generate_data_vault_model':
            return await this.generateDataVaultModel(args);
          case 'generate_kimball_model':
            return await this.generateKimballModel(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: errorMessage }),
            },
          ],
        };
      }
    });
  }

  private async generateReactFlowModel(args: any) {
    const { tables, relationships = [], layoutDirection = 'horizontal' } = args;

    const nodes: ReactFlowNode[] = [];
    const edges: ReactFlowEdge[] = [];

    // Calculate positions based on layout direction
    const spacing = layoutDirection === 'horizontal' ? { x: 300, y: 200 } : { x: 200, y: 300 };
    let currentX = 100;
    let currentY = 100;

    // Generate nodes
    tables.forEach((table: any, index: number) => {
      nodes.push({
        id: `table-${table.name}`,
        type: 'datasetNode',
        position: {
          x: layoutDirection === 'horizontal' ? currentX : currentX + (index % 3) * spacing.x,
          y: layoutDirection === 'horizontal' ? currentY + Math.floor(index / 3) * spacing.y : currentY,
        },
        data: {
          label: table.name,
          type: table.type || 'table',
          columns: table.columns || [],
          schema: table.schema || 'default',
          catalog: table.catalog || 'main',
        },
      });

      if (layoutDirection === 'horizontal') {
        currentX += spacing.x;
        if ((index + 1) % 3 === 0) {
          currentX = 100;
          currentY += spacing.y;
        }
      } else {
        currentY += spacing.y;
      }
    });

    // Generate edges
    relationships.forEach((rel: any, index: number) => {
      edges.push({
        id: `edge-${index}`,
        source: `table-${rel.fromTable}`,
        target: `table-${rel.toTable}`,
        type: 'smoothstep',
        animated: false,
        label: rel.label || `${rel.fromColumn} → ${rel.toColumn}`,
      });
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              nodes,
              edges,
              viewport: {
                x: 0,
                y: 0,
                zoom: 1,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async generateYamlMetadata(args: any) {
    const { modelName, tables, relationships = [], metadata = {} } = args;

    const yamlContent = {
      metadata: {
        name: modelName,
        version: '1.0.0',
        created_at: new Date().toISOString(),
        ...metadata,
      },
      tables: tables.map((table: any) => ({
        name: table.name,
        type: table.type || 'table',
        catalog: table.catalog || 'main',
        schema: table.schema || 'default',
        columns: table.columns || [],
        primary_key: table.primaryKey || [],
        foreign_keys: table.foreignKeys || [],
        partitioned_by: table.partitionedBy || [],
        clustered_by: table.clusteredBy || [],
      })),
      relationships: relationships.map((rel: any) => ({
        from: {
          table: rel.fromTable,
          column: rel.fromColumn,
        },
        to: {
          table: rel.toTable,
          column: rel.toColumn,
        },
        type: rel.relationshipType || 'one-to-many',
      })),
    };

    // Convert to YAML-like string
    const yamlString = this.objectToYaml(yamlContent);

    return {
      content: [
        {
          type: 'text',
          text: yamlString,
        },
      ],
    };
  }

  private objectToYaml(obj: any, indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    let yaml = '';

    for (const [key, value] of Object.entries(obj)) {
      if (value === null || value === undefined) {
        yaml += `${spaces}${key}: null\n`;
      } else if (Array.isArray(value)) {
        yaml += `${spaces}${key}:\n`;
        value.forEach((item) => {
          if (typeof item === 'object') {
            yaml += `${spaces}  -\n`;
            yaml += this.objectToYaml(item, indent + 2);
          } else {
            yaml += `${spaces}  - ${item}\n`;
          }
        });
      } else if (typeof value === 'object') {
        yaml += `${spaces}${key}:\n`;
        yaml += this.objectToYaml(value, indent + 1);
      } else if (typeof value === 'string') {
        yaml += `${spaces}${key}: "${value}"\n`;
      } else {
        yaml += `${spaces}${key}: ${value}\n`;
      }
    }

    return yaml;
  }

  private async generateJinjaTemplate(args: any) {
    const { templateType, specification } = args;

    let template = '';

    switch (templateType) {
      case 'table':
        template = this.generateTableTemplate(specification);
        break;
      case 'view':
        template = this.generateViewTemplate(specification);
        break;
      case 'notebook':
        template = this.generateNotebookTemplate(specification);
        break;
      case 'job':
        template = this.generateJobTemplate(specification);
        break;
      default:
        throw new Error(`Unknown template type: ${templateType}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: template,
        },
      ],
    };
  }

  private generateTableTemplate(spec: any): string {
    return `-- Create {{ table_name }} table
CREATE TABLE IF NOT EXISTS {{ catalog }}.{{ schema }}.{{ table_name }} (
{% for column in columns %}
  {{ column.name }} {{ column.type }}{{ ',' if not loop.last else '' }}
{% endfor %}
)
USING DELTA
{% if partitioned_by %}
PARTITIONED BY ({{ partitioned_by | join(', ') }})
{% endif %}
{% if clustered_by %}
CLUSTER BY ({{ clustered_by | join(', ') }})
{% endif %}
COMMENT '{{ description }}';

-- Add table properties
ALTER TABLE {{ catalog }}.{{ schema }}.{{ table_name }}
SET TBLPROPERTIES (
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact' = 'true'
);`;
  }

  private generateViewTemplate(spec: any): string {
    return `-- Create {{ view_name }} view
CREATE OR REPLACE VIEW {{ catalog }}.{{ schema }}.{{ view_name }} AS
SELECT
{% for column in columns %}
  {{ column.expression }} AS {{ column.name }}{{ ',' if not loop.last else '' }}
{% endfor %}
FROM {{ source_table }}
{% if where_clause %}
WHERE {{ where_clause }}
{% endif %}
COMMENT '{{ description }}';`;
  }

  private generateNotebookTemplate(spec: any): string {
    return `# Databricks notebook source
# MAGIC %md
# MAGIC # {{ notebook_name }}
# MAGIC
# MAGIC {{ description }}

# COMMAND ----------

# MAGIC %md
# MAGIC ## Setup and Configuration

# COMMAND ----------

from pyspark.sql import SparkSession
from pyspark.sql.functions import *

spark = SparkSession.builder.getOrCreate()

# COMMAND ----------

# MAGIC %md
# MAGIC ## Load Data

# COMMAND ----------

{% for source in sources %}
{{ source.alias }}_df = spark.table("{{ source.catalog }}.{{ source.schema }}.{{ source.table }}")
{% endfor %}

# COMMAND ----------

# MAGIC %md
# MAGIC ## Transformations

# COMMAND ----------

# Your transformation logic here

# COMMAND ----------

# MAGIC %md
# MAGIC ## Write Results

# COMMAND ----------

# result_df.write \\
#   .mode("overwrite") \\
#   .saveAsTable("{{ target_catalog }}.{{ target_schema }}.{{ target_table }}")`;
  }

  private generateJobTemplate(spec: any): string {
    return `{
  "name": "{{ job_name }}",
  "tasks": [
    {
      "task_key": "{{ task_key }}",
      "notebook_task": {
        "notebook_path": "{{ notebook_path }}",
        "source": "WORKSPACE"
      },
      "job_cluster_key": "{{ cluster_key }}",
      "timeout_seconds": 0,
      "email_notifications": {}
    }
  ],
  "job_clusters": [
    {
      "job_cluster_key": "{{ cluster_key }}",
      "new_cluster": {
        "spark_version": "{{ spark_version }}",
        "node_type_id": "{{ node_type }}",
        "num_workers": {{ num_workers }},
        "spark_conf": {
          "spark.databricks.delta.preview.enabled": "true"
        }
      }
    }
  ],
  "schedule": {
    "quartz_cron_expression": "{{ cron_schedule }}",
    "timezone_id": "UTC"
  }
}`;
  }

  private async generateDataVaultModel(args: any) {
    const { sourceTables, businessKeys = {} } = args;

    const hubs = [];
    const links = [];
    const satellites = [];

    // Generate hubs for each source table
    for (const table of sourceTables) {
      const hubName = `hub_${table.name}`;
      const businessKey =
        businessKeys[table.name] || table.columns?.find((c: any) => c.isPrimaryKey)?.name || 'id';

      hubs.push({
        name: hubName,
        businessEntity: table.name,
        businessKey,
        columns: [
          { name: `${hubName}_key`, type: 'STRING', description: 'Hash key' },
          { name: businessKey, type: 'STRING', description: 'Business key' },
          { name: 'load_date', type: 'TIMESTAMP', description: 'Load timestamp' },
          { name: 'record_source', type: 'STRING', description: 'Source system' },
        ],
      });

      // Generate satellite for descriptive attributes
      const descriptiveColumns = table.columns?.filter(
        (c: any) => c.name !== businessKey && !c.isForeignKey
      ) || [];

      if (descriptiveColumns.length > 0) {
        satellites.push({
          name: `sat_${table.name}`,
          parentHub: hubName,
          columns: [
            { name: `${hubName}_key`, type: 'STRING', description: 'Parent hub key' },
            { name: 'load_date', type: 'TIMESTAMP', description: 'Load timestamp' },
            { name: 'end_date', type: 'TIMESTAMP', description: 'End timestamp' },
            { name: 'hash_diff', type: 'STRING', description: 'Hash of attributes' },
            { name: 'current_flag', type: 'BOOLEAN', description: 'Current record flag' },
            ...descriptiveColumns,
          ],
        });
      }
    }

    // Generate links for relationships
    for (const table of sourceTables) {
      const foreignKeys = table.columns?.filter((c: any) => c.isForeignKey) || [];

      for (const fk of foreignKeys) {
        const referencedTable = fk.references?.table;
        if (referencedTable) {
          links.push({
            name: `link_${table.name}_${referencedTable}`,
            participatingHubs: [`hub_${table.name}`, `hub_${referencedTable}`],
            columns: [
              {
                name: `link_${table.name}_${referencedTable}_key`,
                type: 'STRING',
                description: 'Link hash key',
              },
              { name: `hub_${table.name}_key`, type: 'STRING', description: 'First hub key' },
              {
                name: `hub_${referencedTable}_key`,
                type: 'STRING',
                description: 'Second hub key',
              },
              { name: 'load_date', type: 'TIMESTAMP', description: 'Load timestamp' },
              { name: 'record_source', type: 'STRING', description: 'Source system' },
            ],
          });
        }
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              modelType: 'data-vault-2.0',
              hubs,
              links,
              satellites,
              summary: {
                hubCount: hubs.length,
                linkCount: links.length,
                satelliteCount: satellites.length,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async generateKimballModel(args: any) {
    const { sourceTables, factGrain = '', measures = [] } = args;

    const dimensions = [];
    const facts = [];

    // Identify dimension tables (tables with descriptive attributes)
    for (const table of sourceTables) {
      const hasMeasures = table.columns?.some(
        (c: any) => c.type.includes('INT') || c.type.includes('DECIMAL') || c.type.includes('FLOAT')
      );

      if (!hasMeasures || table.isDimension) {
        // This is a dimension
        dimensions.push({
          name: `dim_${table.name}`,
          sourceTable: table.name,
          type: 'type-2', // SCD Type 2 by default
          columns: [
            { name: `${table.name}_key`, type: 'BIGINT', description: 'Surrogate key' },
            {
              name: table.columns?.find((c: any) => c.isPrimaryKey)?.name || 'natural_key',
              type: 'STRING',
              description: 'Natural key',
            },
            { name: 'effective_date', type: 'DATE', description: 'Effective start date' },
            { name: 'end_date', type: 'DATE', description: 'Effective end date' },
            { name: 'is_current', type: 'BOOLEAN', description: 'Current record flag' },
            { name: 'version', type: 'INT', description: 'Version number' },
            ...(table.columns || []),
          ],
        });
      }
    }

    // Create fact table
    const factTable = sourceTables.find((t: any) => !t.isDimension) || sourceTables[0];
    const dimensionKeys = dimensions.map((d) => ({
      name: d.name.replace('dim_', '') + '_key',
      type: 'BIGINT',
      description: `Foreign key to ${d.name}`,
    }));

    const measureColumns = measures.length
      ? measures.map((m: any) => ({
          name: m,
          type: 'DECIMAL(18,2)',
          description: `Measure: ${m}`,
        }))
      : factTable.columns?.filter(
          (c: any) =>
            c.type.includes('INT') || c.type.includes('DECIMAL') || c.type.includes('FLOAT')
        ) || [];

    facts.push({
      name: `fact_${factTable.name}`,
      sourceTable: factTable.name,
      grain: factGrain || `One row per ${factTable.name}`,
      columns: [
        { name: `${factTable.name}_key`, type: 'BIGINT', description: 'Fact surrogate key' },
        { name: 'date_key', type: 'INT', description: 'Date dimension key' },
        ...dimensionKeys,
        ...measureColumns,
      ],
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              modelType: 'kimball-dimensional',
              dimensions,
              facts,
              summary: {
                dimensionCount: dimensions.length,
                factCount: facts.length,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[Model Generator] MCP server running on stdio');
  }
}

const server = new ModelGeneratorServer();
server.run().catch((error) => {
  console.error('[Model Generator] Fatal error:', error);
  process.exit(1);
});
