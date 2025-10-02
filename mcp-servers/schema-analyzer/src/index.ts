#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Tool input schemas
const AnalyzeSchemaSchema = z.object({
  workspace_id: z.string(),
  tables: z.array(z.string()),
});

const FindRelationshipsSchema = z.object({
  source_table: z.string(),
  target_table: z.string(),
  workspace_id: z.string(),
});

const SuggestKeysSchema = z.object({
  table_name: z.string(),
  workspace_id: z.string(),
});

const GetTableMetadataSchema = z.object({
  table_names: z.array(z.string()),
  workspace_id: z.string(),
  include_stats: z.boolean().optional().default(true),
});

const DetectModelingPatternsSchema = z.object({
  workspace_id: z.string(),
});

// Type definitions
interface ColumnMetadata {
  name: string;
  type: string;
  nullable: boolean;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  references?: string;
  cardinality?: 'low' | 'medium' | 'high';
  unique_count?: number;
}

interface TableMetadata {
  name: string;
  columns: ColumnMetadata[];
  row_count?: number;
  modeling_suggestions?: {
    type: 'fact_candidate' | 'dimension_candidate' | 'bridge_candidate' | 'reference';
    reason: string;
  };
}

interface Relationship {
  type: 'one_to_one' | 'one_to_many' | 'many_to_one' | 'many_to_many';
  from: string;
  to: string;
  confidence: number;
}

class SchemaAnalyzerServer {
  private server: Server;
  private supabase: SupabaseClient | null = null;

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

  private initSupabase(workspace_id: string): SupabaseClient {
    // In production, fetch workspace-specific credentials
    // For now, use environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    return createClient(supabaseUrl, supabaseKey);
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
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: this.getTools(),
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        switch (request.params.name) {
          case 'analyze_schema':
            return await this.analyzeSchema(request.params.arguments);
          case 'find_relationships':
            return await this.findRelationships(request.params.arguments);
          case 'suggest_keys':
            return await this.suggestKeys(request.params.arguments);
          case 'get_table_metadata':
            return await this.getTableMetadata(request.params.arguments);
          case 'detect_modeling_patterns':
            return await this.detectModelingPatterns(request.params.arguments);
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
        name: 'analyze_schema',
        description: 'Analyze database schema and extract comprehensive metadata including columns, types, constraints, and statistics',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: {
              type: 'string',
              description: 'Workspace identifier',
            },
            tables: {
              type: 'array',
              items: { type: 'string' },
              description: 'Table names to analyze (e.g., ["product", "productcategory"])',
            },
          },
          required: ['workspace_id', 'tables'],
        },
      },
      {
        name: 'find_relationships',
        description: 'Discover relationships between tables by analyzing foreign keys and data patterns',
        inputSchema: {
          type: 'object',
          properties: {
            source_table: {
              type: 'string',
              description: 'Source table name',
            },
            target_table: {
              type: 'string',
              description: 'Target table name',
            },
            workspace_id: {
              type: 'string',
              description: 'Workspace identifier',
            },
          },
          required: ['source_table', 'target_table', 'workspace_id'],
        },
      },
      {
        name: 'suggest_keys',
        description: 'Recommend primary key and foreign key candidates based on column analysis',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Table name',
            },
            workspace_id: {
              type: 'string',
              description: 'Workspace identifier',
            },
          },
          required: ['table_name', 'workspace_id'],
        },
      },
      {
        name: 'get_table_metadata',
        description: 'Get detailed metadata for specific tables including row counts and column statistics',
        inputSchema: {
          type: 'object',
          properties: {
            table_names: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of table names',
            },
            workspace_id: {
              type: 'string',
              description: 'Workspace identifier',
            },
            include_stats: {
              type: 'boolean',
              description: 'Include statistical analysis',
              default: true,
            },
          },
          required: ['table_names', 'workspace_id'],
        },
      },
      {
        name: 'detect_modeling_patterns',
        description: 'Identify existing modeling patterns in schema (Star Schema, Data Vault, 3NF, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            workspace_id: {
              type: 'string',
              description: 'Workspace identifier',
            },
          },
          required: ['workspace_id'],
        },
      },
    ];
  }

  private async analyzeSchema(args: unknown) {
    const { workspace_id, tables } = AnalyzeSchemaSchema.parse(args);
    const supabase = this.initSupabase(workspace_id);

    const tablesMetadata: TableMetadata[] = [];
    const relationships: Relationship[] = [];

    for (const tableName of tables) {
      const metadata = await this.analyzeTable(supabase, tableName);
      tablesMetadata.push(metadata);
    }

    // Detect relationships between analyzed tables
    for (let i = 0; i < tablesMetadata.length; i++) {
      for (let j = i + 1; j < tablesMetadata.length; j++) {
        const rels = await this.detectRelationships(
          tablesMetadata[i],
          tablesMetadata[j]
        );
        relationships.push(...rels);
      }
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              tables: tablesMetadata,
              relationships,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async analyzeTable(
    supabase: SupabaseClient,
    tableName: string
  ): Promise<TableMetadata> {
    // Get column information from information_schema
    const { data: columns, error } = await supabase.rpc('get_table_columns', {
      p_table_name: tableName,
    });

    if (error) {
      // Fallback: basic column info
      const columnsData = await this.getBasicColumnInfo(supabase, tableName);
      return {
        name: tableName,
        columns: columnsData,
        modeling_suggestions: this.inferModelingType(columnsData),
      };
    }

    // Get row count
    const { count } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });

    const columnsWithStats: ColumnMetadata[] = await Promise.all(
      columns.map(async (col: any) => {
        const cardinality = await this.estimateCardinality(
          supabase,
          tableName,
          col.column_name,
          count || 0
        );

        return {
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          is_primary_key: col.is_primary_key || false,
          is_foreign_key: col.is_foreign_key || false,
          references: col.foreign_table
            ? `${col.foreign_table}.${col.foreign_column}`
            : undefined,
          cardinality,
        };
      })
    );

    return {
      name: tableName,
      columns: columnsWithStats,
      row_count: count || 0,
      modeling_suggestions: this.inferModelingType(columnsWithStats, count || 0),
    };
  }

  private async getBasicColumnInfo(
    supabase: SupabaseClient,
    tableName: string
  ): Promise<ColumnMetadata[]> {
    // Query information_schema directly
    const { data, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', tableName);

    if (error || !data) {
      return [];
    }

    return data.map((col: any) => ({
      name: col.column_name,
      type: col.data_type,
      nullable: col.is_nullable === 'YES',
      is_primary_key: false,
      is_foreign_key: false,
    }));
  }

  private async estimateCardinality(
    supabase: SupabaseClient,
    tableName: string,
    columnName: string,
    totalRows: number
  ): Promise<'low' | 'medium' | 'high'> {
    if (totalRows === 0) return 'low';

    try {
      const { data, error } = await supabase.rpc('count_distinct', {
        p_table: tableName,
        p_column: columnName,
      });

      if (error || !data) {
        return 'medium';
      }

      const uniqueCount = data[0]?.count || 0;
      const ratio = uniqueCount / totalRows;

      if (ratio > 0.9) return 'high';
      if (ratio > 0.3) return 'medium';
      return 'low';
    } catch {
      return 'medium';
    }
  }

  private inferModelingType(
    columns: ColumnMetadata[],
    rowCount: number = 0
  ): TableMetadata['modeling_suggestions'] {
    const fkCount = columns.filter((c) => c.is_foreign_key).length;
    const hasHighCardinality = columns.some((c) => c.cardinality === 'high');

    if (fkCount >= 2 && hasHighCardinality) {
      return {
        type: 'fact_candidate',
        reason: 'High cardinality with multiple foreign keys suggests transactional fact table',
      };
    }

    if (fkCount === 0 && rowCount < 1000) {
      return {
        type: 'reference',
        reason: 'Small table with no foreign keys suggests reference/lookup table',
      };
    }

    if (fkCount <= 1 && !hasHighCardinality) {
      return {
        type: 'dimension_candidate',
        reason: 'Low foreign key count and lower cardinality suggests dimension table',
      };
    }

    if (fkCount >= 2 && !hasHighCardinality) {
      return {
        type: 'bridge_candidate',
        reason: 'Multiple foreign keys suggests bridge/associative table',
      };
    }

    return {
      type: 'dimension_candidate',
      reason: 'Default classification based on structure',
    };
  }

  private async detectRelationships(
    table1: TableMetadata,
    table2: TableMetadata
  ): Promise<Relationship[]> {
    const relationships: Relationship[] = [];

    // Check for foreign key relationships
    for (const col of table1.columns) {
      if (col.is_foreign_key && col.references?.startsWith(table2.name)) {
        relationships.push({
          type: 'many_to_one',
          from: `${table1.name}.${col.name}`,
          to: col.references,
          confidence: 1.0,
        });
      }
    }

    for (const col of table2.columns) {
      if (col.is_foreign_key && col.references?.startsWith(table1.name)) {
        relationships.push({
          type: 'many_to_one',
          from: `${table2.name}.${col.name}`,
          to: col.references,
          confidence: 1.0,
        });
      }
    }

    return relationships;
  }

  private async findRelationships(args: unknown) {
    const { source_table, target_table, workspace_id } =
      FindRelationshipsSchema.parse(args);
    const supabase = this.initSupabase(workspace_id);

    const sourceMetadata = await this.analyzeTable(supabase, source_table);
    const targetMetadata = await this.analyzeTable(supabase, target_table);

    const relationships = await this.detectRelationships(
      sourceMetadata,
      targetMetadata
    );

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ relationships }, null, 2),
        },
      ],
    };
  }

  private async suggestKeys(args: unknown) {
    const { table_name, workspace_id } = SuggestKeysSchema.parse(args);
    const supabase = this.initSupabase(workspace_id);

    const metadata = await this.analyzeTable(supabase, table_name);

    const suggestions = {
      primary_key_candidates: metadata.columns
        .filter((c) => c.cardinality === 'high' && !c.nullable)
        .map((c) => ({
          column: c.name,
          reason: 'High cardinality and non-nullable',
        })),
      foreign_key_candidates: metadata.columns
        .filter((c) => c.name.includes('_id') && !c.is_primary_key)
        .map((c) => ({
          column: c.name,
          reason: 'Column name suggests foreign key relationship',
        })),
    };

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(suggestions, null, 2),
        },
      ],
    };
  }

  private async getTableMetadata(args: unknown) {
    const { table_names, workspace_id, include_stats } =
      GetTableMetadataSchema.parse(args);
    const supabase = this.initSupabase(workspace_id);

    const metadata = await Promise.all(
      table_names.map((tableName) => this.analyzeTable(supabase, tableName))
    );

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ tables: metadata }, null, 2),
        },
      ],
    };
  }

  private async detectModelingPatterns(args: unknown) {
    const { workspace_id } = DetectModelingPatternsSchema.parse(args);
    const supabase = this.initSupabase(workspace_id);

    // Get all tables in workspace
    const { data: tables } = await supabase.rpc('get_all_tables');

    if (!tables || tables.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ patterns: [], detected: 'none' }, null, 2),
          },
        ],
      };
    }

    const tableMetadata = await Promise.all(
      tables.map((t: any) => this.analyzeTable(supabase, t.table_name))
    );

    const patterns = this.analyzePatterns(tableMetadata);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(patterns, null, 2),
        },
      ],
    };
  }

  private analyzePatterns(tables: TableMetadata[]) {
    const patterns = {
      detected: [] as string[],
      confidence: {} as Record<string, number>,
      recommendations: [] as string[],
    };

    // Check for Star Schema pattern
    const factTables = tables.filter(
      (t) => t.modeling_suggestions?.type === 'fact_candidate'
    );
    const dimTables = tables.filter(
      (t) => t.modeling_suggestions?.type === 'dimension_candidate'
    );

    if (factTables.length > 0 && dimTables.length >= 2) {
      patterns.detected.push('star_schema');
      patterns.confidence['star_schema'] = 0.7;
    }

    // Check for Data Vault patterns
    const hasHubPattern = tables.some((t) => t.name.startsWith('hub_'));
    const hasLinkPattern = tables.some((t) => t.name.startsWith('link_'));
    const hasSatPattern = tables.some((t) => t.name.startsWith('sat_'));

    if (hasHubPattern && hasLinkPattern && hasSatPattern) {
      patterns.detected.push('data_vault');
      patterns.confidence['data_vault'] = 0.9;
    }

    // Check for 3NF
    const avgFkCount =
      tables.reduce(
        (sum, t) => sum + t.columns.filter((c) => c.is_foreign_key).length,
        0
      ) / tables.length;

    if (avgFkCount > 0.5 && avgFkCount < 2) {
      patterns.detected.push('normalized_3nf');
      patterns.confidence['normalized_3nf'] = 0.6;
    }

    // Recommendations
    if (patterns.detected.length === 0) {
      patterns.recommendations.push(
        'Consider implementing a star schema for analytical workloads'
      );
    }

    return patterns;
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Schema Analyzer MCP Server running on stdio');
  }
}

const server = new SchemaAnalyzerServer();
server.run().catch(console.error);
