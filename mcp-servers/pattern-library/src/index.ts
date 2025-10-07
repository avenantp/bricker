#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { dataVaultPatterns } from './patterns/data-vault.js';
import { kimballPatterns } from './patterns/kimball.js';
import {
  databricksOptimizations,
  optimizationRecommendations,
} from './patterns/databricks-optimizations.js';

// Tool input schemas
const GetPatternSchema = z.object({
  pattern_type: z.enum([
    'data_vault',
    'kimball_dimension',
    'kimball_fact',
    'bridge_table',
    'slowly_changing_dimension',
  ]),
  optimization: z
    .enum(['databricks', 'general', 'high_volume', 'real_time'])
    .optional()
    .default('databricks'),
});

const RecommendPatternSchema = z.object({
  table_metadata: z.object({
    name: z.string(),
    row_count: z.number().optional(),
    columns: z.array(z.any()),
    modeling_suggestions: z.any().optional(),
  }),
  use_case: z.string().optional(),
  scale: z.enum(['small', 'medium', 'large', 'xlarge']).optional(),
});

const GetDatabricksOptimizationsSchema = z.object({
  pattern_type: z.string(),
  data_volume: z.string().optional(),
  access_pattern: z.enum(['batch', 'streaming', 'interactive', 'mixed']).optional(),
});

const ListPatternsSchema = z.object({
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

class PatternLibraryServer {
  private server: Server;
  private patterns: Map<string, any>;

  constructor() {
    this.server = new Server(
      {
        name: 'pattern-library',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.patterns = new Map();
    this.loadPatterns();
    this.setupHandlers();
    this.setupErrorHandling();
  }

  private loadPatterns(): void {
    // Load Data Vault patterns
    Object.entries(dataVaultPatterns).forEach(([key, pattern]) => {
      this.patterns.set(`dv_${key}`, pattern);
    });

    // Load Kimball patterns
    Object.entries(kimballPatterns).forEach(([key, pattern]) => {
      this.patterns.set(`kimball_${key}`, pattern);
    });
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
          case 'get_pattern':
            return await this.getPattern(request.params.arguments);
          case 'recommend_pattern':
            return await this.recommendPattern(request.params.arguments);
          case 'get_databricks_optimizations':
            return await this.getDatabricksOptimizations(request.params.arguments);
          case 'list_patterns':
            return await this.listPatterns(request.params.arguments);
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
        name: 'get_pattern',
        description:
          'Retrieve a specific modeling pattern with Databricks optimizations',
        inputSchema: {
          type: 'object',
          properties: {
            pattern_type: {
              type: 'string',
              enum: [
                'data_vault',
                'kimball_dimension',
                'kimball_fact',
                'bridge_table',
                'slowly_changing_dimension',
              ],
              description: 'Type of modeling pattern to retrieve',
            },
            optimization: {
              type: 'string',
              enum: ['databricks', 'general', 'high_volume', 'real_time'],
              description: 'Optimization strategy',
              default: 'databricks',
            },
          },
          required: ['pattern_type'],
        },
      },
      {
        name: 'recommend_pattern',
        description: 'Recommend patterns based on table characteristics and use case',
        inputSchema: {
          type: 'object',
          properties: {
            table_metadata: {
              type: 'object',
              description: 'Table metadata from schema analysis',
            },
            use_case: {
              type: 'string',
              description: 'Intended use case (e.g., "analytical reporting", "real-time streaming")',
            },
            scale: {
              type: 'string',
              enum: ['small', 'medium', 'large', 'xlarge'],
              description: 'Expected data scale',
            },
          },
          required: ['table_metadata'],
        },
      },
      {
        name: 'get_databricks_optimizations',
        description: 'Get Databricks-specific optimization recommendations',
        inputSchema: {
          type: 'object',
          properties: {
            pattern_type: {
              type: 'string',
              description: 'Pattern type to optimize',
            },
            data_volume: {
              type: 'string',
              description: 'Expected data volume',
            },
            access_pattern: {
              type: 'string',
              enum: ['batch', 'streaming', 'interactive', 'mixed'],
              description: 'Primary access pattern',
            },
          },
          required: ['pattern_type'],
        },
      },
      {
        name: 'list_patterns',
        description: 'List available patterns with descriptions',
        inputSchema: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              description: 'Filter by category (e.g., "data_vault", "kimball")',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Filter by tags',
            },
          },
        },
      },
    ];
  }

  private async getPattern(args: unknown) {
    const { pattern_type, optimization } = GetPatternSchema.parse(args);

    let pattern;
    switch (pattern_type) {
      case 'data_vault':
        pattern = {
          hub: dataVaultPatterns.hub,
          link: dataVaultPatterns.link,
          satellite: dataVaultPatterns.satellite,
        };
        break;
      case 'kimball_dimension':
      case 'slowly_changing_dimension':
        pattern = {
          type1: kimballPatterns.scd_type1,
          type2: kimballPatterns.scd_type2,
        };
        break;
      case 'kimball_fact':
        pattern = kimballPatterns.fact_table;
        break;
      case 'bridge_table':
        pattern = kimballPatterns.bridge_table;
        break;
      default:
        throw new Error(`Unknown pattern type: ${pattern_type}`);
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              pattern,
              optimization_level: optimization,
              databricks_features: this.getDatabricksFeatures(pattern_type),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private getDatabricksFeatures(pattern_type: string) {
    const baseFeatures = [
      databricksOptimizations.liquid_clustering,
      databricksOptimizations.change_data_feed,
      databricksOptimizations.deletion_vectors,
    ];

    if (pattern_type.includes('dimension')) {
      return [
        ...baseFeatures,
        databricksOptimizations.z_order,
        databricksOptimizations.partitioning,
      ];
    }

    if (pattern_type.includes('fact')) {
      return [
        ...baseFeatures,
        databricksOptimizations.partitioning,
        databricksOptimizations.auto_optimize,
      ];
    }

    return baseFeatures;
  }

  private async recommendPattern(args: unknown) {
    const { table_metadata, use_case, scale } = RecommendPatternSchema.parse(args);

    const recommendations = [];
    const modelingType = table_metadata.modeling_suggestions?.type;
    const rowCount = table_metadata.row_count || 0;

    // Recommend based on modeling type
    if (modelingType === 'fact_candidate') {
      recommendations.push({
        pattern: 'kimball_fact',
        confidence: 0.9,
        reason: 'High cardinality with multiple foreign keys indicates fact table',
        template: kimballPatterns.fact_table,
        optimizations: optimizationRecommendations.large_fact_table,
      });
    }

    if (modelingType === 'dimension_candidate') {
      const scdType = rowCount > 100000 ? 'type1' : 'type2';
      recommendations.push({
        pattern: `kimball_scd_${scdType}`,
        confidence: 0.85,
        reason: `Dimension candidate with ${rowCount} rows suggests SCD ${scdType.toUpperCase()}`,
        template: kimballPatterns[`scd_${scdType}`],
        optimizations: optimizationRecommendations.scd_type2_dimension,
      });
    }

    if (modelingType === 'bridge_candidate') {
      recommendations.push({
        pattern: 'bridge_table',
        confidence: 0.8,
        reason: 'Multiple foreign keys suggest many-to-many relationship',
        template: kimballPatterns.bridge_table,
      });
    }

    // Add Data Vault recommendations if appropriate
    if (use_case?.toLowerCase().includes('vault') || scale === 'xlarge') {
      recommendations.push({
        pattern: 'data_vault',
        confidence: 0.75,
        reason: 'Data Vault pattern recommended for enterprise scale and auditability',
        components: {
          hub: dataVaultPatterns.hub,
          satellite: dataVaultPatterns.satellite,
        },
        optimizations: optimizationRecommendations.data_vault_hub,
      });
    }

    // Scale-based recommendations
    if (scale === 'xlarge' || rowCount > 10000000) {
      recommendations.forEach((rec: any) => {
        if (!rec.optimizations) {
          rec.optimizations = optimizationRecommendations.high_volume_streaming;
        }
      });
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              recommendations: recommendations.sort((a, b) => b.confidence - a.confidence),
              table_summary: {
                name: table_metadata.name,
                type: modelingType,
                row_count: rowCount,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async getDatabricksOptimizations(args: unknown) {
    const { pattern_type, data_volume, access_pattern } =
      GetDatabricksOptimizationsSchema.parse(args);

    let recommendedOptimizations = [];

    // Base optimizations for all patterns
    recommendedOptimizations.push(databricksOptimizations.change_data_feed);

    // Pattern-specific optimizations
    if (pattern_type.includes('hub') || pattern_type.includes('fact')) {
      recommendedOptimizations.push(
        databricksOptimizations.liquid_clustering,
        databricksOptimizations.deletion_vectors,
        databricksOptimizations.identity_columns
      );
    }

    if (pattern_type.includes('dimension')) {
      recommendedOptimizations.push(
        databricksOptimizations.z_order,
        databricksOptimizations.partitioning
      );
    }

    // Access pattern specific
    if (access_pattern === 'streaming' || access_pattern === 'mixed') {
      recommendedOptimizations.push(databricksOptimizations.auto_optimize);
    }

    // Volume specific
    if (data_volume === 'large' || data_volume === 'xlarge') {
      recommendedOptimizations.push(
        databricksOptimizations.partitioning,
        databricksOptimizations.bloom_filters
      );
    }

    const recommendation =
      optimizationRecommendations[pattern_type as keyof typeof optimizationRecommendations];

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              pattern_type,
              recommended_optimizations: recommendedOptimizations,
              preset_recommendation: recommendation,
              implementation_order: [
                '1. Enable Change Data Feed at table creation',
                '2. Configure Liquid Clustering or Z-Order',
                '3. Set up partitioning strategy',
                '4. Enable Deletion Vectors if needed',
                '5. Configure Auto Optimize for streaming',
              ],
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async listPatterns(args: unknown) {
    const { category, tags } = ListPatternsSchema.parse(args);

    let filteredPatterns = Array.from(this.patterns.entries());

    if (category) {
      filteredPatterns = filteredPatterns.filter(([_, pattern]) =>
        pattern.category?.includes(category)
      );
    }

    const patternList = filteredPatterns.map(([key, pattern]) => ({
      id: key,
      name: pattern.name,
      category: pattern.category,
      description: pattern.description,
      optimizations: Object.keys(pattern.databricks_optimizations || {}),
    }));

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              total: patternList.length,
              patterns: patternList,
              categories: ['data_vault', 'kimball'],
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
    console.error('Pattern Library MCP Server running on stdio');
  }
}

const server = new PatternLibraryServer();
server.run().catch(console.error);
