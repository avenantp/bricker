#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';

// Tool input schemas
const RecommendPartitioningSchema = z.object({
  table_name: z.string(),
  row_count: z.number(),
  access_pattern: z.string(),
  date_columns: z.array(z.string()).optional(),
});

const RecommendClusteringSchema = z.object({
  table_name: z.string(),
  query_patterns: z.array(z.object({
    type: z.string(),
    columns: z.array(z.string()),
  })),
  cardinality: z.record(z.enum(['low', 'medium', 'high'])),
});

const RecommendDeltaFeaturesSchema = z.object({
  table_name: z.string(),
  use_case: z.string(),
  change_frequency: z.string(),
});

const EstimatePerformanceSchema = z.object({
  model: z.object({
    tables: z.array(z.any()),
  }),
  query_workload: z.string(),
});

interface OptimizationRecommendation {
  feature: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  implementation: string;
  expected_benefit: string;
}

class DatabricksOptimizerServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'databricks-optimizer',
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
          case 'recommend_partitioning':
            return await this.recommendPartitioning(request.params.arguments);
          case 'recommend_clustering':
            return await this.recommendClustering(request.params.arguments);
          case 'recommend_delta_features':
            return await this.recommendDeltaFeatures(request.params.arguments);
          case 'estimate_performance':
            return await this.estimatePerformance(request.params.arguments);
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
        name: 'recommend_partitioning',
        description: 'Recommend optimal partitioning strategy for Databricks Delta tables',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Table name',
            },
            row_count: {
              type: 'number',
              description: 'Approximate row count',
            },
            access_pattern: {
              type: 'string',
              description: 'Primary access pattern (e.g., "time-series queries", "full scans")',
            },
            date_columns: {
              type: 'array',
              items: { type: 'string' },
              description: 'Available date/timestamp columns',
            },
          },
          required: ['table_name', 'row_count', 'access_pattern'],
        },
      },
      {
        name: 'recommend_clustering',
        description: 'Recommend Z-Order or Liquid Clustering configuration',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Table name',
            },
            query_patterns: {
              type: 'array',
              items: { type: 'object' },
              description: 'Common query patterns with columns used',
            },
            cardinality: {
              type: 'object',
              description: 'Column cardinality mapping',
            },
          },
          required: ['table_name', 'query_patterns', 'cardinality'],
        },
      },
      {
        name: 'recommend_delta_features',
        description: 'Recommend Delta Lake features (CDF, Deletion Vectors, etc.)',
        inputSchema: {
          type: 'object',
          properties: {
            table_name: {
              type: 'string',
              description: 'Table name',
            },
            use_case: {
              type: 'string',
              description: 'Primary use case',
            },
            change_frequency: {
              type: 'string',
              description: 'How often data changes',
            },
          },
          required: ['table_name', 'use_case', 'change_frequency'],
        },
      },
      {
        name: 'estimate_performance',
        description: 'Estimate query performance and costs for the data model',
        inputSchema: {
          type: 'object',
          properties: {
            model: {
              type: 'object',
              description: 'Complete data model',
            },
            query_workload: {
              type: 'string',
              description: 'Expected query workload',
            },
          },
          required: ['model', 'query_workload'],
        },
      },
    ];
  }

  private async recommendPartitioning(args: unknown) {
    const { table_name, row_count, access_pattern, date_columns } =
      RecommendPartitioningSchema.parse(args);

    const recommendations: OptimizationRecommendation[] = [];

    // Analyze if partitioning is needed
    if (row_count < 1000000) {
      recommendations.push({
        feature: 'No Partitioning',
        priority: 'high',
        reason: 'Table size < 1M rows - partitioning overhead outweighs benefits',
        implementation: 'Do not partition this table',
        expected_benefit: 'Avoid partition metadata overhead',
      });
    } else if (date_columns && date_columns.length > 0) {
      // Recommend date-based partitioning
      const dateCol = date_columns[0];

      let partitionStrategy = 'daily';
      let partitionSyntax = `PARTITIONED BY (DATE(${dateCol}))`;

      if (row_count > 100000000) {
        partitionStrategy = 'monthly';
        partitionSyntax = `PARTITIONED BY (date_trunc('month', ${dateCol}))`;
      }

      recommendations.push({
        feature: `${partitionStrategy.charAt(0).toUpperCase() + partitionStrategy.slice(1)} Partitioning`,
        priority: 'high',
        reason: `Large table (${row_count.toLocaleString()} rows) with date column - ${partitionStrategy} partitioning optimal`,
        implementation: partitionSyntax,
        expected_benefit: `50-90% query performance improvement for time-range queries`,
      });

      // Recommend generated column for partition
      if (row_count > 50000000) {
        recommendations.push({
          feature: 'Generated Partition Column',
          priority: 'medium',
          reason: 'Simplify partition pruning with computed column',
          implementation: `partition_date DATE GENERATED ALWAYS AS (DATE(${dateCol}))`,
          expected_benefit: 'Simplified query syntax, guaranteed partition pruning',
        });
      }
    } else if (access_pattern.toLowerCase().includes('full scan')) {
      recommendations.push({
        feature: 'Consider Liquid Clustering Instead',
        priority: 'high',
        reason: 'Full scan access pattern - clustering more beneficial than partitioning',
        implementation: 'CLUSTER BY (most_selective_columns)',
        expected_benefit: 'Better data organization without partition overhead',
      });
    }

    // File size recommendations
    if (row_count > 10000000) {
      recommendations.push({
        feature: 'Auto Optimize',
        priority: 'medium',
        reason: 'Large table benefits from automatic file compaction',
        implementation: `ALTER TABLE ${table_name} SET TBLPROPERTIES ('delta.autoOptimize.optimizeWrite' = 'true', 'delta.autoOptimize.autoCompact' = 'true')`,
        expected_benefit: 'Maintain optimal file sizes automatically',
      });
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              table_name,
              recommendations,
              summary: this.generatePartitioningSummary(recommendations),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private generatePartitioningSummary(recommendations: OptimizationRecommendation[]): string {
    const highPriority = recommendations.filter((r) => r.priority === 'high');
    if (highPriority.length === 0) return 'No partitioning needed';
    return highPriority.map((r) => r.feature).join(', ');
  }

  private async recommendClustering(args: unknown) {
    const { table_name, query_patterns, cardinality } =
      RecommendClusteringSchema.parse(args);

    const recommendations: OptimizationRecommendation[] = [];

    // Analyze query patterns to find most selective columns
    const columnUsageCount: Record<string, number> = {};
    const columnCardinality: Record<string, string> = cardinality;

    query_patterns.forEach((pattern) => {
      pattern.columns.forEach((col) => {
        columnUsageCount[col] = (columnUsageCount[col] || 0) + 1;
      });
    });

    // Sort columns by usage frequency
    const sortedColumns = Object.entries(columnUsageCount)
      .sort((a, b) => b[1] - a[1])
      .map(([col]) => col);

    // Filter for high/medium cardinality columns
    const clusteringCandidates = sortedColumns.filter(
      (col) => columnCardinality[col] === 'high' || columnCardinality[col] === 'medium'
    );

    if (clusteringCandidates.length > 0) {
      // Recommend Liquid Clustering (modern approach)
      const topCandidates = clusteringCandidates.slice(0, 4);
      recommendations.push({
        feature: 'Liquid Clustering',
        priority: 'high',
        reason: `Columns ${topCandidates.join(', ')} are frequently queried with appropriate cardinality`,
        implementation: `CLUSTER BY (${topCandidates.join(', ')})`,
        expected_benefit: 'Automatic data organization, 2-10x query performance improvement',
      });

      // Also suggest Z-Order as alternative for legacy compatibility
      recommendations.push({
        feature: 'Z-Order (Alternative)',
        priority: 'medium',
        reason: 'Legacy clustering option if Liquid Clustering unavailable',
        implementation: `OPTIMIZE ${table_name} ZORDER BY (${topCandidates.slice(0, 3).join(', ')})`,
        expected_benefit: '2-5x query performance on filtered queries',
      });
    } else {
      recommendations.push({
        feature: 'No Clustering Recommended',
        priority: 'low',
        reason: 'No suitable high-cardinality columns found in query patterns',
        implementation: 'Consider reviewing query patterns or table design',
        expected_benefit: 'N/A',
      });
    }

    // Bloom filter recommendation for point lookups
    const pointLookupColumns = query_patterns
      .filter((p) => p.type === 'point_lookup' || p.type.includes('='))
      .flatMap((p) => p.columns);

    if (pointLookupColumns.length > 0) {
      const uniquePointLookups = [...new Set(pointLookupColumns)];
      recommendations.push({
        feature: 'Bloom Filter Index',
        priority: 'medium',
        reason: 'Point lookup queries detected',
        implementation: `CREATE BLOOMFILTER INDEX ON ${table_name} FOR COLUMNS (${uniquePointLookups.join(', ')})`,
        expected_benefit: 'Skip irrelevant files for point lookups',
      });
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              table_name,
              recommendations,
              analysis: {
                query_patterns_analyzed: query_patterns.length,
                clustering_candidates: clusteringCandidates,
                column_usage_frequency: columnUsageCount,
              },
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async recommendDeltaFeatures(args: unknown) {
    const { table_name, use_case, change_frequency } =
      RecommendDeltaFeaturesSchema.parse(args);

    const recommendations: OptimizationRecommendation[] = [];

    // Change Data Feed
    if (
      use_case.toLowerCase().includes('streaming') ||
      use_case.toLowerCase().includes('incremental') ||
      change_frequency.toLowerCase().includes('frequent')
    ) {
      recommendations.push({
        feature: 'Change Data Feed (CDF)',
        priority: 'high',
        reason: 'Streaming/incremental use case benefits from change tracking',
        implementation: `ALTER TABLE ${table_name} SET TBLPROPERTIES ('delta.enableChangeDataFeed' = 'true')`,
        expected_benefit: 'Enable efficient incremental processing, track all changes',
      });
    }

    // Deletion Vectors
    if (
      use_case.toLowerCase().includes('gdpr') ||
      use_case.toLowerCase().includes('delete') ||
      use_case.toLowerCase().includes('update')
    ) {
      recommendations.push({
        feature: 'Deletion Vectors',
        priority: 'high',
        reason: 'Frequent DELETE/UPDATE operations benefit from deletion vectors',
        implementation: `ALTER TABLE ${table_name} SET TBLPROPERTIES ('delta.enableDeletionVectors' = 'true')`,
        expected_benefit: 'Up to 10x faster DELETE operations, no file rewrites',
      });
    }

    // Column Mapping
    if (use_case.toLowerCase().includes('schema evolution')) {
      recommendations.push({
        feature: 'Column Mapping',
        priority: 'medium',
        reason: 'Schema evolution use case needs column mapping',
        implementation: `ALTER TABLE ${table_name} SET TBLPROPERTIES ('delta.columnMapping.mode' = 'name')`,
        expected_benefit: 'Safe column renames and drops',
      });
    }

    // Time Travel retention
    if (use_case.toLowerCase().includes('audit') || use_case.toLowerCase().includes('compliance')) {
      recommendations.push({
        feature: 'Extended Time Travel',
        priority: 'medium',
        reason: 'Audit/compliance requires longer data retention',
        implementation: `ALTER TABLE ${table_name} SET TBLPROPERTIES ('delta.logRetentionDuration' = '180 days', 'delta.deletedFileRetentionDuration' = '180 days')`,
        expected_benefit: 'Extended time travel window for compliance',
      });
    }

    // Optimize Write
    if (change_frequency.toLowerCase().includes('streaming') || change_frequency.toLowerCase().includes('continuous')) {
      recommendations.push({
        feature: 'Optimize Write',
        priority: 'high',
        reason: 'Continuous writes create small files',
        implementation: `ALTER TABLE ${table_name} SET TBLPROPERTIES ('delta.autoOptimize.optimizeWrite' = 'true')`,
        expected_benefit: 'Prevent small file problem, maintain read performance',
      });
    }

    // Auto Compact
    if (change_frequency.toLowerCase().includes('high') || change_frequency.toLowerCase().includes('frequent')) {
      recommendations.push({
        feature: 'Auto Compact',
        priority: 'medium',
        reason: 'High change frequency needs automatic compaction',
        implementation: `ALTER TABLE ${table_name} SET TBLPROPERTIES ('delta.autoOptimize.autoCompact' = 'true')`,
        expected_benefit: 'Automatic file compaction after writes',
      });
    }

    // Identity Columns
    if (use_case.toLowerCase().includes('surrogate key') || use_case.toLowerCase().includes('dimension')) {
      recommendations.push({
        feature: 'Identity Columns',
        priority: 'medium',
        reason: 'Dimension tables benefit from auto-generated keys',
        implementation: `ALTER TABLE ${table_name} ADD COLUMN surrogate_key BIGINT GENERATED ALWAYS AS IDENTITY`,
        expected_benefit: 'Automatic unique key generation',
      });
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              table_name,
              recommendations,
              summary: `Recommended ${recommendations.length} Delta Lake features`,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async estimatePerformance(args: unknown) {
    const { model, query_workload } = EstimatePerformanceSchema.parse(args);

    const estimates = {
      query_performance: this.estimateQueryPerformance(model, query_workload),
      storage_estimate: this.estimateStorage(model),
      cost_estimate: this.estimateCost(model, query_workload),
      optimization_impact: this.estimateOptimizationImpact(model),
    };

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(estimates, null, 2),
        },
      ],
    };
  }

  private estimateQueryPerformance(model: any, workload: string): any {
    const tableCount = model.tables.length;

    return {
      baseline_query_time: `${tableCount * 5}s (unoptimized)`,
      with_partitioning: `${tableCount * 2}s (60% improvement)`,
      with_clustering: `${tableCount * 1}s (80% improvement)`,
      fully_optimized: `${Math.max(1, tableCount * 0.5)}s (90% improvement)`,
      recommendation: 'Apply Liquid Clustering + Partitioning for best results',
    };
  }

  private estimateStorage(model: any): any {
    return {
      raw_data_size: 'Varies by row count',
      with_compression: '~70% of raw (ZSTD compression)',
      with_optimization: '~60% of raw (after OPTIMIZE)',
      recommendation: 'Run OPTIMIZE weekly to maintain compact storage',
    };
  }

  private estimateCost(model: any, workload: string): any {
    const tableCount = model.tables.length;

    return {
      monthly_compute_cost: `$${tableCount * 50} (estimated, varies by usage)`,
      storage_cost: '$23/TB/month (Delta Lake)',
      optimization_savings: '30-50% reduction in compute time',
      recommendation: 'Use Spot instances for batch processing to reduce costs',
    };
  }

  private estimateOptimizationImpact(model: any): any {
    return {
      liquid_clustering: '+80% query performance',
      partitioning: '+60% for time-range queries',
      change_data_feed: '+90% for incremental loads',
      deletion_vectors: '+900% for DELETE operations',
      auto_optimize: 'Maintains performance automatically',
    };
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Databricks Optimizer MCP Server running on stdio');
  }
}

const server = new DatabricksOptimizerServer();
server.run().catch(console.error);
