#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

interface TableColumn {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  references?: { table: string; column: string };
}

interface TableSchema {
  tableName: string;
  columns: TableColumn[];
  primaryKeys: string[];
  foreignKeys: Array<{
    column: string;
    referencedTable: string;
    referencedColumn: string;
  }>;
  indexes: Array<{
    name: string;
    columns: string[];
    unique: boolean;
  }>;
}

interface Relationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  relationshipType: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

class SchemaAnalyzerServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'schema-analyzer',
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
      console.error('[Schema Analyzer MCP Error]', error);
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
            name: 'analyze_table_schema',
            description:
              'Analyze a table schema and return detailed information about columns, types, and constraints',
            inputSchema: {
              type: 'object',
              properties: {
                tableName: {
                  type: 'string',
                  description: 'Name of the table to analyze',
                },
                schemaDefinition: {
                  type: 'object',
                  description: 'Schema definition object with columns and constraints',
                },
              },
              required: ['tableName', 'schemaDefinition'],
            },
          },
          {
            name: 'detect_relationships',
            description:
              'Detect relationships between tables based on column names and foreign keys',
            inputSchema: {
              type: 'object',
              properties: {
                tables: {
                  type: 'array',
                  description: 'Array of table schemas to analyze for relationships',
                  items: {
                    type: 'object',
                  },
                },
              },
              required: ['tables'],
            },
          },
          {
            name: 'suggest_primary_keys',
            description:
              'Suggest appropriate primary keys for a table based on column types and naming conventions',
            inputSchema: {
              type: 'object',
              properties: {
                tableName: {
                  type: 'string',
                  description: 'Name of the table',
                },
                columns: {
                  type: 'array',
                  description: 'Array of column definitions',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      type: { type: 'string' },
                    },
                  },
                },
              },
              required: ['tableName', 'columns'],
            },
          },
          {
            name: 'suggest_indexes',
            description:
              'Suggest appropriate indexes for a table based on column types and common query patterns',
            inputSchema: {
              type: 'object',
              properties: {
                tableName: {
                  type: 'string',
                  description: 'Name of the table',
                },
                columns: {
                  type: 'array',
                  description: 'Array of column definitions',
                  items: {
                    type: 'object',
                  },
                },
                queryPatterns: {
                  type: 'array',
                  description: 'Common query patterns (optional)',
                  items: {
                    type: 'string',
                  },
                },
              },
              required: ['tableName', 'columns'],
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
          case 'analyze_table_schema':
            return await this.analyzeTableSchema(args);
          case 'detect_relationships':
            return await this.detectRelationships(args);
          case 'suggest_primary_keys':
            return await this.suggestPrimaryKeys(args);
          case 'suggest_indexes':
            return await this.suggestIndexes(args);
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

  private async analyzeTableSchema(args: any) {
    const { tableName, schemaDefinition } = args;

    const analysis = {
      tableName,
      columnCount: schemaDefinition.columns?.length || 0,
      columns: schemaDefinition.columns || [],
      primaryKeys: schemaDefinition.primaryKeys || [],
      foreignKeys: schemaDefinition.foreignKeys || [],
      indexes: schemaDefinition.indexes || [],
      suggestions: [] as string[],
    };

    // Add suggestions based on analysis
    if (!analysis.primaryKeys || analysis.primaryKeys.length === 0) {
      analysis.suggestions.push(
        'Consider adding a primary key for unique row identification'
      );
    }

    // Check for common patterns
    const hasCreatedAt = analysis.columns.some(
      (col: any) => col.name === 'created_at' || col.name === 'createdAt'
    );
    const hasUpdatedAt = analysis.columns.some(
      (col: any) => col.name === 'updated_at' || col.name === 'updatedAt'
    );

    if (!hasCreatedAt) {
      analysis.suggestions.push('Consider adding a created_at timestamp column');
    }
    if (!hasUpdatedAt) {
      analysis.suggestions.push('Consider adding an updated_at timestamp column');
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(analysis, null, 2),
        },
      ],
    };
  }

  private async detectRelationships(args: any) {
    const { tables } = args;
    const relationships: Relationship[] = [];

    // Analyze foreign keys first
    for (const table of tables) {
      if (table.foreignKeys) {
        for (const fk of table.foreignKeys) {
          relationships.push({
            fromTable: table.tableName,
            fromColumn: fk.column,
            toTable: fk.referencedTable,
            toColumn: fk.referencedColumn,
            relationshipType: 'one-to-many',
          });
        }
      }
    }

    // Detect implicit relationships based on naming conventions
    for (const table of tables) {
      for (const column of table.columns || []) {
        // Look for columns ending with _id or Id
        if (column.name.endsWith('_id') || column.name.endsWith('Id')) {
          const potentialTableName = column.name
            .replace(/_id$/, '')
            .replace(/Id$/, '');

          // Check if a table with this name exists
          const referencedTable = tables.find(
            (t: any) =>
              t.tableName.toLowerCase() === potentialTableName.toLowerCase() ||
              t.tableName.toLowerCase() === potentialTableName.toLowerCase() + 's'
          );

          if (referencedTable) {
            // Check if this relationship already exists
            const exists = relationships.some(
              (r) =>
                r.fromTable === table.tableName &&
                r.fromColumn === column.name &&
                r.toTable === referencedTable.tableName
            );

            if (!exists) {
              relationships.push({
                fromTable: table.tableName,
                fromColumn: column.name,
                toTable: referencedTable.tableName,
                toColumn: 'id', // Assume 'id' as primary key
                relationshipType: 'one-to-many',
              });
            }
          }
        }
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              relationshipCount: relationships.length,
              relationships,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async suggestPrimaryKeys(args: any) {
    const { tableName, columns } = args;
    const suggestions = [];

    // Check for existing id column
    const idColumn = columns.find(
      (col: any) =>
        col.name === 'id' ||
        col.name === `${tableName}_id` ||
        col.name === 'uuid'
    );

    if (idColumn) {
      suggestions.push({
        type: 'existing',
        columns: [idColumn.name],
        reason: `Found existing ${idColumn.name} column that can serve as primary key`,
        recommendation: 'high',
      });
    } else {
      suggestions.push({
        type: 'create',
        columns: ['id'],
        dataType: 'BIGINT AUTO_INCREMENT',
        reason: 'No obvious primary key found, recommend creating an id column',
        recommendation: 'high',
      });
    }

    // Check for natural keys (combinations of columns that might be unique)
    const potentialNaturalKeys = columns.filter(
      (col: any) =>
        col.name.toLowerCase().includes('code') ||
        col.name.toLowerCase().includes('number') ||
        col.name.toLowerCase().includes('key')
    );

    if (potentialNaturalKeys.length > 0) {
      suggestions.push({
        type: 'natural',
        columns: potentialNaturalKeys.map((col: any) => col.name),
        reason: 'Found columns that might serve as natural keys',
        recommendation: 'medium',
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              tableName,
              suggestions,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async suggestIndexes(args: any) {
    const { tableName, columns, queryPatterns } = args;
    const suggestions = [];

    // Suggest indexes for foreign key columns
    const foreignKeyColumns = columns.filter(
      (col: any) => col.name.endsWith('_id') || col.name.endsWith('Id')
    );

    for (const col of foreignKeyColumns) {
      suggestions.push({
        indexName: `idx_${tableName}_${col.name}`,
        columns: [col.name],
        type: 'btree',
        reason: 'Foreign key column - commonly used in joins',
        priority: 'high',
      });
    }

    // Suggest indexes for timestamp columns (for sorting/filtering)
    const timestampColumns = columns.filter((col: any) =>
      ['created_at', 'updated_at', 'timestamp'].includes(
        col.name
      )
    );

    for (const col of timestampColumns) {
      suggestions.push({
        indexName: `idx_${tableName}_${col.name}`,
        columns: [col.name],
        type: 'btree',
        reason: 'Timestamp column - commonly used for sorting and filtering',
        priority: 'medium',
      });
    }

    // Suggest indexes for status columns
    const statusColumns = columns.filter((col: any) =>
      ['status', 'state', 'type'].includes(col.name.toLowerCase())
    );

    for (const col of statusColumns) {
      suggestions.push({
        indexName: `idx_${tableName}_${col.name}`,
        columns: [col.name],
        type: 'btree',
        reason: 'Status/type column - commonly used for filtering',
        priority: 'medium',
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              tableName,
              suggestionCount: suggestions.length,
              suggestions,
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
    console.error('[Schema Analyzer] MCP server running on stdio');
  }
}

const server = new SchemaAnalyzerServer();
server.run().catch((error) => {
  console.error('[Schema Analyzer] Fatal error:', error);
  process.exit(1);
});
