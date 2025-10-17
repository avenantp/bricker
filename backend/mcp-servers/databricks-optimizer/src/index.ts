#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

interface OptimizationRecommendation {
  category: string;
  recommendation: string;
  reason: string;
  impact: 'high' | 'medium' | 'low';
  implementation: string;
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
      console.error('[Databricks Optimizer MCP Error]', error);
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
            name: 'optimize_table_design',
            description:
              'Suggest Databricks-specific optimizations for table design (partitioning, clustering, Z-ordering)',
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
                      cardinality: { type: 'string', enum: ['low', 'medium', 'high'] },
                    },
                  },
                },
                queryPatterns: {
                  type: 'array',
                  description: 'Common query patterns',
                  items: {
                    type: 'object',
                  },
                },
                rowCount: {
                  type: 'number',
                  description: 'Estimated row count',
                },
              },
              required: ['tableName', 'columns'],
            },
          },
          {
            name: 'suggest_delta_optimizations',
            description:
              'Suggest Delta Lake specific optimizations and best practices',
            inputSchema: {
              type: 'object',
              properties: {
                tableName: {
                  type: 'string',
                  description: 'Name of the table',
                },
                updateFrequency: {
                  type: 'string',
                  enum: ['high', 'medium', 'low'],
                  description: 'How frequently the table is updated',
                },
                readPattern: {
                  type: 'string',
                  enum: ['analytical', 'operational', 'mixed'],
                  description: 'Primary read pattern',
                },
              },
              required: ['tableName'],
            },
          },
          {
            name: 'optimize_partitioning',
            description:
              'Recommend optimal partitioning strategy based on data characteristics',
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
                rowCount: {
                  type: 'number',
                  description: 'Estimated row count',
                },
                dataGrowthRate: {
                  type: 'string',
                  enum: ['high', 'medium', 'low'],
                  description: 'Expected data growth rate',
                },
              },
              required: ['tableName', 'columns'],
            },
          },
          {
            name: 'suggest_clustering',
            description:
              'Recommend clustering/Z-ordering strategy for query optimization',
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
                  description: 'Common query patterns with WHERE clauses',
                  items: {
                    type: 'object',
                  },
                },
              },
              required: ['tableName', 'columns'],
            },
          },
          {
            name: 'optimize_unity_catalog',
            description:
              'Suggest Unity Catalog organization and governance settings',
            inputSchema: {
              type: 'object',
              properties: {
                tables: {
                  type: 'array',
                  description: 'Array of table definitions',
                  items: {
                    type: 'object',
                  },
                },
                securityRequirements: {
                  type: 'object',
                  description: 'Security and governance requirements',
                },
              },
              required: ['tables'],
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
          case 'optimize_table_design':
            return await this.optimizeTableDesign(args);
          case 'suggest_delta_optimizations':
            return await this.suggestDeltaOptimizations(args);
          case 'optimize_partitioning':
            return await this.optimizePartitioning(args);
          case 'suggest_clustering':
            return await this.suggestClustering(args);
          case 'optimize_unity_catalog':
            return await this.optimizeUnityCatalog(args);
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

  private async optimizeTableDesign(args: any) {
    const { tableName, columns, queryPatterns = [], rowCount = 0 } = args;
    const recommendations: OptimizationRecommendation[] = [];

    // Partitioning recommendations
    const dateColumns = columns.filter(
      (c: any) => c.type.includes('DATE') || c.type.includes('TIMESTAMP')
    );

    if (dateColumns.length > 0 && rowCount > 1000000) {
      recommendations.push({
        category: 'Partitioning',
        recommendation: `Partition by ${dateColumns[0].name}`,
        reason:
          'Large table with date column - partitioning will improve query performance and enable partition pruning',
        impact: 'high',
        implementation: `PARTITIONED BY (DATE(${dateColumns[0].name}))`,
      });
    }

    // Clustering recommendations
    const highCardinalityColumns = columns.filter((c: any) => c.cardinality === 'high');
    const lowCardinalityColumns = columns.filter((c: any) => c.cardinality === 'low');

    if (lowCardinalityColumns.length > 0 && rowCount > 100000) {
      recommendations.push({
        category: 'Clustering',
        recommendation: `Cluster by ${lowCardinalityColumns.map((c: any) => c.name).join(', ')}`,
        reason:
          'Low cardinality columns are ideal for clustering and data skipping',
        impact: 'high',
        implementation: `CLUSTER BY (${lowCardinalityColumns.map((c: any) => c.name).join(', ')})`,
      });
    }

    // Z-Ordering recommendations
    if (queryPatterns.length > 0 && rowCount > 1000000) {
      const frequentFilterColumns = this.extractFilterColumns(queryPatterns);
      if (frequentFilterColumns.length > 0) {
        recommendations.push({
          category: 'Z-Ordering',
          recommendation: `Apply Z-ordering on ${frequentFilterColumns.join(', ')}`,
          reason:
            'These columns are frequently used in WHERE clauses - Z-ordering will improve data skipping',
          impact: 'high',
          implementation: `OPTIMIZE ${tableName} ZORDER BY (${frequentFilterColumns.join(', ')})`,
        });
      }
    }

    // Delta table properties
    recommendations.push({
      category: 'Delta Properties',
      recommendation: 'Enable auto-optimize features',
      reason:
        'Auto-optimize will automatically compact small files and optimize data layout',
      impact: 'medium',
      implementation: `ALTER TABLE ${tableName} SET TBLPROPERTIES (
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact' = 'true'
)`,
    });

    // Liquid clustering for new tables
    if (rowCount === 0 || rowCount < 100000) {
      recommendations.push({
        category: 'Liquid Clustering',
        recommendation: 'Consider using Liquid Clustering (Databricks Runtime 13.3+)',
        reason:
          'Liquid clustering provides automatic optimization and works well for evolving workloads',
        impact: 'medium',
        implementation: `CREATE TABLE ${tableName} (...)
USING DELTA
CLUSTER BY (${lowCardinalityColumns.map((c: any) => c.name).join(', ') || 'column1, column2'})`,
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              tableName,
              recommendationCount: recommendations.length,
              recommendations,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async suggestDeltaOptimizations(args: any) {
    const { tableName, updateFrequency = 'medium', readPattern = 'analytical' } = args;
    const recommendations: OptimizationRecommendation[] = [];

    // Auto-optimize settings based on update frequency
    if (updateFrequency === 'high') {
      recommendations.push({
        category: 'Auto Optimize',
        recommendation: 'Enable optimized writes and auto-compact',
        reason:
          'High update frequency benefits from automatic file optimization',
        impact: 'high',
        implementation: `ALTER TABLE ${tableName} SET TBLPROPERTIES (
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact' = 'true'
)`,
      });
    }

    // Change Data Feed
    if (updateFrequency === 'high' || updateFrequency === 'medium') {
      recommendations.push({
        category: 'Change Data Feed',
        recommendation: 'Enable Change Data Feed for tracking changes',
        reason:
          'CDF allows efficient incremental processing and auditing of changes',
        impact: 'medium',
        implementation: `ALTER TABLE ${tableName} SET TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
)`,
      });
    }

    // Deletion Vectors (Databricks Runtime 12.2+)
    if (updateFrequency === 'high') {
      recommendations.push({
        category: 'Deletion Vectors',
        recommendation: 'Enable deletion vectors for faster DELETE operations',
        reason:
          'Deletion vectors improve performance of DELETE and MERGE operations',
        impact: 'high',
        implementation: `ALTER TABLE ${tableName} SET TBLPROPERTIES (
  'delta.enableDeletionVectors' = 'true'
)`,
      });
    }

    // Optimize schedule
    if (updateFrequency === 'medium' || updateFrequency === 'low') {
      recommendations.push({
        category: 'Maintenance',
        recommendation: 'Schedule regular OPTIMIZE operations',
        reason:
          'Periodic optimization maintains query performance',
        impact: 'medium',
        implementation: `-- Run daily or weekly
OPTIMIZE ${tableName};
VACUUM ${tableName} RETAIN 168 HOURS; -- 7 days`,
      });
    }

    // Column statistics
    if (readPattern === 'analytical') {
      recommendations.push({
        category: 'Statistics',
        recommendation: 'Collect column statistics for query optimization',
        reason:
          'Statistics help the optimizer make better query execution decisions',
        impact: 'medium',
        implementation: `ANALYZE TABLE ${tableName} COMPUTE STATISTICS FOR ALL COLUMNS;`,
      });
    }

    // Photon acceleration
    recommendations.push({
      category: 'Photon',
      recommendation: 'Use Photon-enabled clusters for query execution',
      reason:
        'Photon provides significant performance improvements for Delta Lake queries',
      impact: 'high',
      implementation: `-- Enable Photon in cluster configuration
spark.databricks.photon.enabled = true`,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              tableName,
              updateFrequency,
              readPattern,
              recommendationCount: recommendations.length,
              recommendations,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async optimizePartitioning(args: any) {
    const { tableName, columns, rowCount = 0, dataGrowthRate = 'medium' } = args;
    const recommendations: OptimizationRecommendation[] = [];

    // Find date/timestamp columns
    const dateColumns = columns.filter(
      (c: any) => c.type.includes('DATE') || c.type.includes('TIMESTAMP')
    );

    // Partitioning guidelines
    const targetPartitionSize = 1024 * 1024 * 1024; // 1GB per partition
    const minRowsForPartitioning = 1000000; // 1M rows

    if (rowCount < minRowsForPartitioning) {
      recommendations.push({
        category: 'Partitioning',
        recommendation: 'Do not partition - table is too small',
        reason:
          `Table has ${rowCount} rows, which is below the recommended minimum of ${minRowsForPartitioning}. Partitioning small tables can hurt performance.`,
        impact: 'high',
        implementation: 'CREATE TABLE without PARTITIONED BY clause',
      });
    } else if (dateColumns.length > 0) {
      const dateCol = dateColumns[0];

      // Determine partition granularity based on growth rate
      let partitionGranularity = 'day';
      if (dataGrowthRate === 'low') {
        partitionGranularity = 'month';
      } else if (dataGrowthRate === 'high') {
        partitionGranularity = 'day';
      }

      recommendations.push({
        category: 'Partitioning',
        recommendation: `Partition by ${partitionGranularity} on ${dateCol.name}`,
        reason:
          `Based on ${dataGrowthRate} growth rate and ${rowCount} rows, ${partitionGranularity}-level partitioning provides optimal partition sizes`,
        impact: 'high',
        implementation:
          partitionGranularity === 'day'
            ? `PARTITIONED BY (DATE(${dateCol.name}))`
            : `PARTITIONED BY (YEAR(${dateCol.name}), MONTH(${dateCol.name}))`,
      });
    }

    // Multi-column partitioning warning
    const lowCardinalityColumns = columns.filter(
      (c: any) => c.cardinality === 'low'
    );

    if (dateColumns.length > 0 && lowCardinalityColumns.length > 0) {
      recommendations.push({
        category: 'Multi-Column Partitioning',
        recommendation: `Consider hierarchical partitioning with ${dateColumns[0].name} and ${lowCardinalityColumns[0].name}`,
        reason:
          'Combining date and low-cardinality columns can improve partition pruning for filtered queries',
        impact: 'medium',
        implementation: `PARTITIONED BY (DATE(${dateColumns[0].name}), ${lowCardinalityColumns[0].name})
-- Warning: This creates more partitions - ensure each partition is still > 100MB`,
      });
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              tableName,
              rowCount,
              dataGrowthRate,
              recommendationCount: recommendations.length,
              recommendations,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async suggestClustering(args: any) {
    const { tableName, columns, queryPatterns = [] } = args;
    const recommendations: OptimizationRecommendation[] = [];

    // Extract frequently filtered columns
    const filterColumns = this.extractFilterColumns(queryPatterns);

    // Liquid Clustering (Databricks Runtime 13.3+)
    if (filterColumns.length > 0) {
      recommendations.push({
        category: 'Liquid Clustering',
        recommendation: `Use Liquid Clustering on ${filterColumns.slice(0, 4).join(', ')}`,
        reason:
          'Liquid clustering automatically optimizes data layout based on query patterns',
        impact: 'high',
        implementation: `CREATE TABLE ${tableName} (...)
USING DELTA
CLUSTER BY (${filterColumns.slice(0, 4).join(', ')})`,
      });
    }

    // Z-Ordering (for existing tables or DBR < 13.3)
    const lowCardinalityColumns = columns.filter(
      (c: any) => c.cardinality === 'low'
    );

    if (lowCardinalityColumns.length > 0) {
      recommendations.push({
        category: 'Z-Ordering',
        recommendation: `Apply Z-ordering on ${lowCardinalityColumns.map((c: any) => c.name).join(', ')}`,
        reason:
          'Z-ordering on low cardinality columns improves data skipping and query performance',
        impact: 'high',
        implementation: `OPTIMIZE ${tableName} ZORDER BY (${lowCardinalityColumns.map((c: any) => c.name).join(', ')})
-- Run periodically after data changes`,
      });
    }

    // Data skipping statistics
    recommendations.push({
      category: 'Data Skipping',
      recommendation: 'Enable data skipping with column statistics',
      reason:
        'Data skipping uses statistics to avoid reading irrelevant files',
      impact: 'medium',
      implementation: `ALTER TABLE ${tableName} SET TBLPROPERTIES (
  'delta.dataSkippingNumIndexedCols' = '32'
);
ANALYZE TABLE ${tableName} COMPUTE STATISTICS FOR ALL COLUMNS;`,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              tableName,
              filterColumns,
              recommendationCount: recommendations.length,
              recommendations,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async optimizeUnityCatalog(args: any) {
    const { tables, securityRequirements = {} } = args;
    const recommendations: OptimizationRecommendation[] = [];

    // Catalog organization
    recommendations.push({
      category: 'Catalog Organization',
      recommendation: 'Organize tables in catalog.schema hierarchy',
      reason:
        'Proper organization enables better governance and access control',
      impact: 'high',
      implementation: `CREATE CATALOG IF NOT EXISTS production;
CREATE SCHEMA IF NOT EXISTS production.analytics;
CREATE TABLE production.analytics.${tables[0]?.name || 'table_name'} (...);`,
    });

    // Row and column-level security
    if (securityRequirements.sensitiveData) {
      recommendations.push({
        category: 'Row-Level Security',
        recommendation: 'Implement row-level security with row filters',
        reason:
          'Restrict data access based on user attributes',
        impact: 'high',
        implementation: `CREATE FUNCTION mask_sensitive_rows(user_region STRING)
RETURN user_region = current_user_region();

ALTER TABLE ${tables[0]?.name} SET ROW FILTER mask_sensitive_rows ON (region);`,
      });

      recommendations.push({
        category: 'Column Masking',
        recommendation: 'Apply column masking for sensitive columns',
        reason:
          'Protect PII while allowing data analysis',
        impact: 'high',
        implementation: `CREATE FUNCTION mask_email(email STRING)
RETURN CASE
  WHEN is_member('data_engineers') THEN email
  ELSE 'REDACTED'
END;

ALTER TABLE ${tables[0]?.name} ALTER COLUMN email SET MASK mask_email;`,
      });
    }

    // Table ACLs
    recommendations.push({
      category: 'Access Control',
      recommendation: 'Set up granular table permissions',
      reason:
        'Control who can read, write, or modify table structure',
      impact: 'high',
      implementation: `GRANT SELECT ON TABLE ${tables[0]?.name} TO \`data_analysts\`;
GRANT MODIFY ON TABLE ${tables[0]?.name} TO \`data_engineers\`;`,
    });

    // Data lineage and tagging
    recommendations.push({
      category: 'Metadata & Lineage',
      recommendation: 'Add table tags and comments for lineage',
      reason:
        'Improve discoverability and data governance',
      impact: 'medium',
      implementation: `ALTER TABLE ${tables[0]?.name} SET TAGS ('domain' = 'analytics', 'pii' = 'true');
COMMENT ON TABLE ${tables[0]?.name} IS 'Customer analytics aggregated data';`,
    });

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              tableCount: tables.length,
              securityRequirements,
              recommendationCount: recommendations.length,
              recommendations,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private extractFilterColumns(queryPatterns: any[]): string[] {
    const columnFrequency: Record<string, number> = {};

    for (const pattern of queryPatterns) {
      if (pattern.whereColumns) {
        for (const col of pattern.whereColumns) {
          columnFrequency[col] = (columnFrequency[col] || 0) + 1;
        }
      }
    }

    // Sort by frequency and return top columns
    return Object.entries(columnFrequency)
      .sort(([, a], [, b]) => b - a)
      .map(([col]) => col);
  }

  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[Databricks Optimizer] MCP server running on stdio');
  }
}

const server = new DatabricksOptimizerServer();
server.run().catch((error) => {
  console.error('[Databricks Optimizer] Fatal error:', error);
  process.exit(1);
});
