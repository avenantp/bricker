export const databricksOptimizations = {
  liquid_clustering: {
    name: 'Liquid Clustering',
    description: 'Automatic data organization for optimal query performance',
    when_to_use: [
      'High-cardinality columns used in WHERE clauses',
      'Columns used in JOIN conditions',
      'Tables with frequent concurrent writes',
      'Need for automatic maintenance',
    ],
    syntax: 'CLUSTER BY (col1, col2, ...)',
    best_practices: [
      'Choose columns with high selectivity',
      'Limit to 4-5 columns maximum',
      'Order matters: most selective first',
      'Compatible with Change Data Feed',
    ],
  },

  z_order: {
    name: 'Z-Order Clustering',
    description: 'Manual data co-location for multi-dimensional queries',
    when_to_use: [
      'Medium-cardinality columns',
      'Multiple columns in WHERE clauses',
      'Batch processing workloads',
      'Legacy tables (pre-Liquid Clustering)',
    ],
    syntax: 'OPTIMIZE table_name ZORDER BY (col1, col2, ...)',
    best_practices: [
      'Run as maintenance job',
      'Limit to 3-4 columns',
      'Avoid very high or very low cardinality',
      'Re-run after significant data changes',
    ],
  },

  change_data_feed: {
    name: 'Change Data Feed (CDF)',
    description: 'Track row-level changes for incremental processing',
    when_to_use: [
      'Need to track INSERT/UPDATE/DELETE',
      'Building incremental ETL pipelines',
      'Feeding downstream consumers',
      'Audit and compliance requirements',
    ],
    syntax: "'delta.enableChangeDataFeed' = 'true'",
    best_practices: [
      'Enable at table creation',
      'Use with structured streaming',
      'Query with table_changes() function',
      'Manage retention with delta.deletedFileRetentionDuration',
    ],
  },

  deletion_vectors: {
    name: 'Deletion Vectors',
    description: 'Efficient DELETE operations without rewriting files',
    when_to_use: [
      'Tables with frequent DELETEs',
      'Large fact tables',
      'GDPR/compliance requirements',
      'High-volume transactional tables',
    ],
    syntax: "'delta.enableDeletionVectors' = 'true'",
    best_practices: [
      'Combine with Liquid Clustering',
      'Run OPTIMIZE periodically',
      'Monitor with DESCRIBE DETAIL',
      'Enabled by default on Unity Catalog',
    ],
  },

  partitioning: {
    name: 'Table Partitioning',
    description: 'Physical data organization by column values',
    when_to_use: [
      'Date/time-based queries (date columns)',
      'Data retention policies',
      'Time-travel queries',
      'Large tables (>1TB)',
    ],
    strategies: {
      daily: {
        description: 'Partition by date',
        example: 'PARTITIONED BY (DATE(timestamp_col))',
        use_case: 'High-volume streaming data',
      },
      monthly: {
        description: 'Partition by year-month',
        example: "PARTITIONED BY (date_trunc('month', date_col))",
        use_case: 'Medium-volume historical data',
      },
      categorical: {
        description: 'Partition by low-cardinality column',
        example: 'PARTITIONED BY (region, country)',
        use_case: 'Multi-tenant or regional data',
      },
    },
    best_practices: [
      'Avoid high-cardinality partition columns',
      'Limit to 1-2 partition columns',
      'Aim for 1GB+ per partition',
      'Consider Liquid Clustering instead for new tables',
    ],
  },

  auto_optimize: {
    name: 'Auto Optimize',
    description: 'Automatic file compaction and optimization',
    when_to_use: [
      'Streaming ingestion workloads',
      'Many small files',
      'Continuous data arrival',
      'Want automated maintenance',
    ],
    syntax: `'delta.autoOptimize.optimizeWrite' = 'true'
'delta.autoOptimize.autoCompact' = 'true'`,
    best_practices: [
      'Enable for streaming tables',
      'Monitor write latency impact',
      'Disable for bulk batch loads',
      'Combine with optimizeWrite',
    ],
  },

  generated_columns: {
    name: 'Generated Columns',
    description: 'Automatically computed column values',
    when_to_use: [
      'Derived partition columns',
      'Computed hash keys',
      'Standardized date extraction',
      'Data quality checks',
    ],
    syntax: 'column_name type GENERATED ALWAYS AS (expression)',
    best_practices: [
      'Use for partition columns (date from timestamp)',
      'Compute business keys',
      'Extract components (year, month from date)',
      'Ensure deterministic expressions',
    ],
  },

  identity_columns: {
    name: 'Identity Columns',
    description: 'Auto-incrementing surrogate keys',
    when_to_use: [
      'Surrogate key generation',
      'Data Vault hub keys',
      'Dimension keys',
      'Prefer over manual sequences',
    ],
    syntax: 'column_name BIGINT GENERATED ALWAYS AS IDENTITY',
    best_practices: [
      'Use BIGINT for large tables',
      'Suitable for streaming inserts',
      'Maintains uniqueness automatically',
      'Cannot be updated after creation',
    ],
  },

  bloom_filters: {
    name: 'Bloom Filter Indexes',
    description: 'Probabilistic data structure for point lookups',
    when_to_use: [
      'High-cardinality columns',
      'Point lookup queries (col = value)',
      'Large tables with selective filters',
      'Reduce data scan overhead',
    ],
    syntax: "CREATE BLOOMFILTER INDEX ON table_name FOR COLUMNS(col1, col2, ...)",
    best_practices: [
      'Use on columns with high cardinality',
      'Monitor false positive rate',
      'Rebuild after major data changes',
      'Limit to most selective columns',
    ],
  },
};

export const optimizationRecommendations = {
  high_volume_streaming: {
    name: 'High-Volume Streaming',
    patterns: [
      'liquid_clustering',
      'change_data_feed',
      'auto_optimize',
      'deletion_vectors',
    ],
    example_tblproperties: {
      'delta.enableChangeDataFeed': 'true',
      'delta.enableDeletionVectors': 'true',
      'delta.autoOptimize.optimizeWrite': 'true',
      'delta.autoOptimize.autoCompact': 'true',
    },
  },

  large_fact_table: {
    name: 'Large Fact Table (Kimball)',
    patterns: ['liquid_clustering', 'partitioning', 'deletion_vectors'],
    clustering_columns: ['date_key', 'primary_dimension_key'],
    partition_strategy: 'date_key',
    example_tblproperties: {
      'delta.enableChangeDataFeed': 'true',
      'delta.enableDeletionVectors': 'true',
    },
  },

  scd_type2_dimension: {
    name: 'SCD Type 2 Dimension',
    patterns: ['z_order', 'change_data_feed'],
    zorder_columns: ['natural_key'],
    partition_strategy: 'effective_date (monthly)',
    example_tblproperties: {
      'delta.enableChangeDataFeed': 'true',
    },
  },

  data_vault_hub: {
    name: 'Data Vault Hub',
    patterns: [
      'liquid_clustering',
      'identity_columns',
      'change_data_feed',
      'deletion_vectors',
    ],
    clustering_columns: ['hub_key'],
    partition_strategy: 'load_date (daily)',
    example_tblproperties: {
      'delta.enableChangeDataFeed': 'true',
      'delta.enableDeletionVectors': 'true',
    },
  },

  data_vault_satellite: {
    name: 'Data Vault Satellite',
    patterns: ['liquid_clustering', 'change_data_feed'],
    clustering_columns: ['hub_key', 'load_date'],
    partition_strategy: 'load_date (daily)',
    example_tblproperties: {
      'delta.enableChangeDataFeed': 'true',
    },
  },
};
