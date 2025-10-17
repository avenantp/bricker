#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

interface ModelingPattern {
  name: string;
  type: string;
  description: string;
  useCases: string[];
  structure: any;
  implementation: string;
  bestPractices: string[];
}

class PatternLibraryServer {
  private server: Server;
  private patterns: Map<string, ModelingPattern>;

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
    this.initializePatterns();
    this.setupHandlers();
    this.setupErrorHandling();
  }

  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      console.error('[Pattern Library MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private initializePatterns(): void {
    // Data Vault Patterns
    this.patterns.set('data-vault-hub', {
      name: 'Data Vault Hub',
      type: 'data-vault',
      description:
        'Central business entity with unique business keys and metadata',
      useCases: [
        'Core business entities (Customer, Product, Order)',
        'Entities that need to be tracked over time',
        'Entities with multiple source systems',
      ],
      structure: {
        columns: [
          { name: 'hub_key', type: 'STRING', description: 'Hash of business key' },
          { name: 'business_key', type: 'STRING', description: 'Natural business key' },
          { name: 'load_date', type: 'TIMESTAMP', description: 'Record load timestamp' },
          { name: 'record_source', type: 'STRING', description: 'Source system identifier' },
        ],
        primaryKey: ['hub_key'],
        indexes: ['business_key', 'load_date'],
      },
      implementation: `CREATE TABLE hub_{entity_name} (
  hub_{entity_name}_key STRING,
  {business_key} STRING,
  load_date TIMESTAMP,
  record_source STRING,
  PRIMARY KEY (hub_{entity_name}_key)
) USING DELTA
PARTITIONED BY (DATE(load_date));`,
      bestPractices: [
        'Use hash keys for performance',
        'Always include load_date and record_source',
        'Business keys should be immutable',
        'Partition by load_date for performance',
      ],
    });

    this.patterns.set('data-vault-link', {
      name: 'Data Vault Link',
      type: 'data-vault',
      description: 'Relationship between two or more hubs',
      useCases: [
        'Many-to-many relationships',
        'Transactions (Order-Product relationship)',
        'Historical relationships',
      ],
      structure: {
        columns: [
          { name: 'link_key', type: 'STRING', description: 'Hash of all hub keys' },
          { name: 'hub_key_1', type: 'STRING', description: 'First hub key' },
          { name: 'hub_key_2', type: 'STRING', description: 'Second hub key' },
          { name: 'load_date', type: 'TIMESTAMP', description: 'Record load timestamp' },
          { name: 'record_source', type: 'STRING', description: 'Source system identifier' },
        ],
        primaryKey: ['link_key'],
        indexes: ['hub_key_1', 'hub_key_2', 'load_date'],
      },
      implementation: `CREATE TABLE link_{entity1}_{entity2} (
  link_{entity1}_{entity2}_key STRING,
  hub_{entity1}_key STRING,
  hub_{entity2}_key STRING,
  load_date TIMESTAMP,
  record_source STRING,
  PRIMARY KEY (link_{entity1}_{entity2}_key),
  FOREIGN KEY (hub_{entity1}_key) REFERENCES hub_{entity1}(hub_{entity1}_key),
  FOREIGN KEY (hub_{entity2}_key) REFERENCES hub_{entity2}(hub_{entity2}_key)
) USING DELTA
PARTITIONED BY (DATE(load_date));`,
      bestPractices: [
        'Link key is hash of all participating hub keys',
        'Include all hub keys as separate columns',
        'Can link more than two hubs',
        'Use for transaction tables',
      ],
    });

    this.patterns.set('data-vault-satellite', {
      name: 'Data Vault Satellite',
      type: 'data-vault',
      description: 'Descriptive attributes and history for hubs or links',
      useCases: [
        'Slowly changing dimensions',
        'Attribute history tracking',
        'Descriptive data that changes over time',
      ],
      structure: {
        columns: [
          { name: 'hub_key', type: 'STRING', description: 'Parent hub/link key' },
          { name: 'load_date', type: 'TIMESTAMP', description: 'Effective start date' },
          { name: 'record_source', type: 'STRING', description: 'Source system identifier' },
          { name: 'hash_diff', type: 'STRING', description: 'Hash of all attributes' },
          { name: 'end_date', type: 'TIMESTAMP', description: 'Effective end date' },
          { name: 'current_flag', type: 'BOOLEAN', description: 'Current record indicator' },
        ],
        primaryKey: ['hub_key', 'load_date'],
        indexes: ['load_date', 'current_flag'],
      },
      implementation: `CREATE TABLE sat_{entity_name} (
  hub_{entity_name}_key STRING,
  load_date TIMESTAMP,
  end_date TIMESTAMP,
  record_source STRING,
  hash_diff STRING,
  current_flag BOOLEAN,
  {attribute_columns},
  PRIMARY KEY (hub_{entity_name}_key, load_date),
  FOREIGN KEY (hub_{entity_name}_key) REFERENCES hub_{entity_name}(hub_{entity_name}_key)
) USING DELTA
PARTITIONED BY (DATE(load_date));`,
      bestPractices: [
        'Use hash_diff to detect changes',
        'Maintain current_flag for active records',
        'Include end_date for temporal queries',
        'One satellite per rate of change',
      ],
    });

    // Kimball Patterns
    this.patterns.set('kimball-dimension', {
      name: 'Kimball Dimension Table',
      type: 'kimball',
      description: 'Slowly changing dimension with Type 2 history',
      useCases: [
        'Customer dimensions',
        'Product dimensions',
        'Date/time dimensions',
      ],
      structure: {
        columns: [
          { name: 'dim_key', type: 'BIGINT', description: 'Surrogate key' },
          { name: 'natural_key', type: 'STRING', description: 'Business key' },
          { name: 'effective_date', type: 'DATE', description: 'Start date' },
          { name: 'end_date', type: 'DATE', description: 'End date' },
          { name: 'is_current', type: 'BOOLEAN', description: 'Current flag' },
          { name: 'version', type: 'INT', description: 'Version number' },
        ],
        primaryKey: ['dim_key'],
        indexes: ['natural_key', 'effective_date', 'is_current'],
      },
      implementation: `CREATE TABLE dim_{dimension_name} (
  {dimension_name}_key BIGINT,
  {natural_key} STRING,
  effective_date DATE,
  end_date DATE,
  is_current BOOLEAN,
  version INT,
  {attribute_columns},
  PRIMARY KEY ({dimension_name}_key)
) USING DELTA;`,
      bestPractices: [
        'Use surrogate keys for fact table joins',
        'Maintain effective_date and end_date for history',
        'Use is_current flag for active records',
        'Consider Type 1 for attributes that dont need history',
      ],
    });

    this.patterns.set('kimball-fact', {
      name: 'Kimball Fact Table',
      type: 'kimball',
      description: 'Transaction or snapshot fact table with measures',
      useCases: [
        'Sales transactions',
        'Inventory snapshots',
        'Event metrics',
      ],
      structure: {
        columns: [
          { name: 'fact_key', type: 'BIGINT', description: 'Fact surrogate key' },
          { name: 'date_key', type: 'INT', description: 'Date dimension key' },
          { name: 'time_key', type: 'INT', description: 'Time dimension key (optional)' },
        ],
        primaryKey: ['fact_key'],
        foreignKeys: ['date_key', 'time_key'],
        indexes: ['date_key'],
      },
      implementation: `CREATE TABLE fact_{fact_name} (
  {fact_name}_key BIGINT,
  date_key INT,
  {dimension_keys},
  {measure_columns},
  {degenerate_dimensions},
  PRIMARY KEY ({fact_name}_key),
  FOREIGN KEY (date_key) REFERENCES dim_date(date_key)
) USING DELTA
PARTITIONED BY (date_key);`,
      bestPractices: [
        'Use dimensional keys, not natural keys',
        'Keep grain consistent within fact table',
        'Partition by date for query performance',
        'Use appropriate data types for measures',
      ],
    });

    // Generic Patterns
    this.patterns.set('staging-table', {
      name: 'Staging Table',
      type: 'generic',
      description: 'Temporary landing area for raw data',
      useCases: [
        'Initial data load',
        'Data validation before transformation',
        'CDC capture',
      ],
      structure: {
        columns: [
          { name: 'staging_id', type: 'BIGINT', description: 'Auto-increment ID' },
          { name: 'load_timestamp', type: 'TIMESTAMP', description: 'Load time' },
          { name: 'source_file', type: 'STRING', description: 'Source file name' },
          { name: 'processed_flag', type: 'BOOLEAN', description: 'Processing status' },
        ],
        primaryKey: ['staging_id'],
        indexes: ['load_timestamp', 'processed_flag'],
      },
      implementation: `CREATE TABLE staging_{table_name} (
  staging_id BIGINT GENERATED ALWAYS AS IDENTITY,
  load_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  source_file STRING,
  processed_flag BOOLEAN DEFAULT FALSE,
  {source_columns},
  PRIMARY KEY (staging_id)
) USING DELTA;`,
      bestPractices: [
        'Keep staging tables temporary',
        'Include audit columns',
        'Use for data quality checks',
        'Archive or truncate after processing',
      ],
    });

    this.patterns.set('scd-type2', {
      name: 'Slowly Changing Dimension Type 2',
      type: 'generic',
      description: 'Track historical changes with new rows',
      useCases: [
        'Customer address changes',
        'Product price history',
        'Employee role changes',
      ],
      structure: {
        columns: [
          { name: 'id', type: 'BIGINT', description: 'Surrogate key' },
          { name: 'natural_key', type: 'STRING', description: 'Business key' },
          { name: 'valid_from', type: 'TIMESTAMP', description: 'Start timestamp' },
          { name: 'valid_to', type: 'TIMESTAMP', description: 'End timestamp' },
          { name: 'is_current', type: 'BOOLEAN', description: 'Current record flag' },
        ],
        primaryKey: ['id'],
        indexes: ['natural_key', 'valid_from', 'is_current'],
      },
      implementation: `CREATE TABLE {table_name} (
  id BIGINT GENERATED ALWAYS AS IDENTITY,
  {natural_key} STRING,
  valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  valid_to TIMESTAMP,
  is_current BOOLEAN DEFAULT TRUE,
  {attribute_columns},
  PRIMARY KEY (id)
) USING DELTA;`,
      bestPractices: [
        'Always update is_current when adding new version',
        'Set valid_to on previous record',
        'Use MERGE for SCD Type 2 updates',
        'Index on natural_key and is_current',
      ],
    });
  }

  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get_pattern',
            description:
              'Get detailed information about a specific modeling pattern',
            inputSchema: {
              type: 'object',
              properties: {
                patternName: {
                  type: 'string',
                  description: 'Name of the pattern to retrieve',
                  enum: Array.from(this.patterns.keys()),
                },
              },
              required: ['patternName'],
            },
          },
          {
            name: 'list_patterns',
            description: 'List all available modeling patterns',
            inputSchema: {
              type: 'object',
              properties: {
                patternType: {
                  type: 'string',
                  description: 'Filter by pattern type (optional)',
                  enum: ['data-vault', 'kimball', 'generic', 'all'],
                },
              },
            },
          },
          {
            name: 'search_patterns',
            description: 'Search for patterns based on use case or description',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'recommend_pattern',
            description: 'Recommend appropriate patterns based on requirements',
            inputSchema: {
              type: 'object',
              properties: {
                requirements: {
                  type: 'object',
                  description: 'Requirements object',
                  properties: {
                    needsHistory: { type: 'boolean' },
                    needsRelationships: { type: 'boolean' },
                    modelingApproach: {
                      type: 'string',
                      enum: ['data-vault', 'kimball', 'any'],
                    },
                    useCase: { type: 'string' },
                  },
                },
              },
              required: ['requirements'],
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
          case 'get_pattern':
            return await this.getPattern(args);
          case 'list_patterns':
            return await this.listPatterns(args);
          case 'search_patterns':
            return await this.searchPatterns(args);
          case 'recommend_pattern':
            return await this.recommendPattern(args);
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

  private async getPattern(args: any) {
    const { patternName } = args;
    const pattern = this.patterns.get(patternName);

    if (!pattern) {
      throw new Error(`Pattern '${patternName}' not found`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(pattern, null, 2),
        },
      ],
    };
  }

  private async listPatterns(args: any) {
    const { patternType = 'all' } = args;

    const patterns = Array.from(this.patterns.values()).filter((pattern) =>
      patternType === 'all' ? true : pattern.type === patternType
    );

    const patternList = patterns.map((p) => ({
      name: p.name,
      type: p.type,
      description: p.description,
    }));

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              count: patternList.length,
              patterns: patternList,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async searchPatterns(args: any) {
    const { query } = args;
    const searchTerm = query.toLowerCase();

    const results = Array.from(this.patterns.values()).filter(
      (pattern) =>
        pattern.name.toLowerCase().includes(searchTerm) ||
        pattern.description.toLowerCase().includes(searchTerm) ||
        pattern.useCases.some((uc) => uc.toLowerCase().includes(searchTerm))
    );

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              query,
              resultCount: results.length,
              results: results.map((r) => ({
                name: r.name,
                type: r.type,
                description: r.description,
                useCases: r.useCases,
              })),
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async recommendPattern(args: any) {
    const { requirements } = args;
    const recommendations = [];

    // Recommend based on requirements
    if (requirements.modelingApproach === 'data-vault') {
      recommendations.push(this.patterns.get('data-vault-hub'));
      if (requirements.needsHistory) {
        recommendations.push(this.patterns.get('data-vault-satellite'));
      }
      if (requirements.needsRelationships) {
        recommendations.push(this.patterns.get('data-vault-link'));
      }
    } else if (requirements.modelingApproach === 'kimball') {
      if (requirements.needsHistory) {
        recommendations.push(this.patterns.get('kimball-dimension'));
      }
      recommendations.push(this.patterns.get('kimball-fact'));
    } else {
      // Generic recommendations
      if (requirements.needsHistory) {
        recommendations.push(this.patterns.get('scd-type2'));
      }
      recommendations.push(this.patterns.get('staging-table'));
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              requirements,
              recommendationCount: recommendations.filter(Boolean).length,
              recommendations: recommendations.filter(Boolean),
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
    console.error('[Pattern Library] MCP server running on stdio');
  }
}

const server = new PatternLibraryServer();
server.run().catch((error) => {
  console.error('[Pattern Library] Fatal error:', error);
  process.exit(1);
});
