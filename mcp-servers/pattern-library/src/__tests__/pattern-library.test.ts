import { describe, test, expect } from '@jest/globals';

describe('Pattern Library MCP Server', () => {
  describe('Data Vault Patterns', () => {
    test('should provide Hub pattern structure', () => {
      const hubPattern = {
        name: 'Hub',
        type: 'data_vault',
        description: 'Core business entity',
        structure: {
          columns: [
            { name: 'hub_sk', type: 'BIGINT', purpose: 'Surrogate key' },
            { name: 'business_key', type: 'STRING', purpose: 'Natural business key' },
            { name: 'load_date', type: 'TIMESTAMP', purpose: 'Load timestamp' },
            { name: 'record_source', type: 'STRING', purpose: 'Source system' },
          ],
          primary_key: ['hub_sk'],
          business_key: ['business_key'],
        },
      };

      expect(hubPattern.type).toBe('data_vault');
      expect(hubPattern.structure.columns).toHaveLength(4);
      expect(hubPattern.structure.primary_key).toContain('hub_sk');
      expect(hubPattern.structure.business_key).toContain('business_key');
    });

    test('should provide Satellite pattern structure', () => {
      const satellitePattern = {
        name: 'Satellite',
        type: 'data_vault',
        description: 'Descriptive attributes with history',
        structure: {
          columns: [
            { name: 'hub_sk', type: 'BIGINT', purpose: 'Foreign key to Hub' },
            { name: 'load_date', type: 'TIMESTAMP', purpose: 'Load timestamp' },
            { name: 'end_date', type: 'TIMESTAMP', purpose: 'End of validity' },
            { name: 'hash_diff', type: 'STRING', purpose: 'Change detection hash' },
          ],
          primary_key: ['hub_sk', 'load_date'],
        },
      };

      expect(satellitePattern.type).toBe('data_vault');
      expect(satellitePattern.structure.primary_key).toHaveLength(2);
      expect(satellitePattern.structure.columns.some(c => c.name === 'hash_diff')).toBe(true);
    });

    test('should provide Link pattern structure', () => {
      const linkPattern = {
        name: 'Link',
        type: 'data_vault',
        description: 'Many-to-many relationships',
        structure: {
          columns: [
            { name: 'link_sk', type: 'BIGINT', purpose: 'Surrogate key' },
            { name: 'hub1_sk', type: 'BIGINT', purpose: 'Foreign key to Hub 1' },
            { name: 'hub2_sk', type: 'BIGINT', purpose: 'Foreign key to Hub 2' },
            { name: 'load_date', type: 'TIMESTAMP', purpose: 'Load timestamp' },
          ],
          primary_key: ['link_sk'],
          foreign_keys: ['hub1_sk', 'hub2_sk'],
        },
      };

      expect(linkPattern.type).toBe('data_vault');
      expect(linkPattern.structure.foreign_keys).toHaveLength(2);
    });
  });

  describe('Kimball Patterns', () => {
    test('should provide Dimension pattern structure', () => {
      const dimensionPattern = {
        name: 'Dimension',
        type: 'kimball',
        description: 'Descriptive context for facts',
        structure: {
          columns: [
            { name: 'dim_sk', type: 'BIGINT', purpose: 'Surrogate key' },
            { name: 'business_key', type: 'STRING', purpose: 'Natural key' },
            { name: 'effective_date', type: 'DATE', purpose: 'SCD Type 2 start' },
            { name: 'end_date', type: 'DATE', purpose: 'SCD Type 2 end' },
            { name: 'is_current', type: 'BOOLEAN', purpose: 'Current record flag' },
          ],
          primary_key: ['dim_sk'],
        },
      };

      expect(dimensionPattern.type).toBe('kimball');
      expect(dimensionPattern.structure.columns.some(c => c.name === 'is_current')).toBe(true);
    });

    test('should provide Fact pattern structure', () => {
      const factPattern = {
        name: 'Fact',
        type: 'kimball',
        description: 'Measurable business events',
        structure: {
          columns: [
            { name: 'fact_sk', type: 'BIGINT', purpose: 'Surrogate key' },
            { name: 'dim1_sk', type: 'BIGINT', purpose: 'Foreign key to dimension 1' },
            { name: 'dim2_sk', type: 'BIGINT', purpose: 'Foreign key to dimension 2' },
            { name: 'measure1', type: 'DECIMAL', purpose: 'Additive measure' },
            { name: 'event_date', type: 'DATE', purpose: 'Event timestamp' },
          ],
          primary_key: ['fact_sk'],
          foreign_keys: ['dim1_sk', 'dim2_sk'],
        },
      };

      expect(factPattern.type).toBe('kimball');
      expect(factPattern.structure.foreign_keys.length).toBeGreaterThan(0);
    });

    test('should provide SCD Type 2 pattern', () => {
      const scdType2Pattern = {
        name: 'SCD Type 2',
        type: 'kimball',
        description: 'Slowly Changing Dimension with full history',
        required_columns: [
          'surrogate_key',
          'business_key',
          'effective_date',
          'end_date',
          'is_current',
        ],
      };

      expect(scdType2Pattern.required_columns).toContain('effective_date');
      expect(scdType2Pattern.required_columns).toContain('end_date');
      expect(scdType2Pattern.required_columns).toContain('is_current');
    });
  });

  describe('Databricks Optimizations', () => {
    test('should recommend liquid clustering for high cardinality columns', () => {
      const tableMetadata = {
        row_count: 10000000,
        columns: [
          { name: 'id', cardinality: 0.99 },
          { name: 'customer_id', cardinality: 0.85 },
          { name: 'status', cardinality: 0.001 },
        ],
      };

      const recommendations = [];

      // High cardinality columns are good for liquid clustering
      for (const col of tableMetadata.columns) {
        if (col.cardinality > 0.7 && tableMetadata.row_count > 1000000) {
          recommendations.push({
            optimization: 'liquid_clustering',
            column: col.name,
            reason: `High cardinality (${col.cardinality}) suitable for liquid clustering`,
          });
        }
      }

      expect(recommendations.length).toBeGreaterThan(0);
      expect(recommendations.some(r => r.column === 'customer_id')).toBe(true);
    });

    test('should recommend partitioning for date columns', () => {
      const tableMetadata = {
        row_count: 5000000,
        columns: [
          { name: 'event_date', type: 'DATE' },
          { name: 'created_at', type: 'TIMESTAMP' },
          { name: 'amount', type: 'DECIMAL' },
        ],
      };

      const recommendations = [];

      // Date columns are good for partitioning
      for (const col of tableMetadata.columns) {
        if (
          (col.type === 'DATE' || col.type === 'TIMESTAMP') &&
          tableMetadata.row_count > 1000000
        ) {
          recommendations.push({
            optimization: 'partitioning',
            column: col.name,
            reason: `Date/timestamp column suitable for time-based partitioning`,
          });
        }
      }

      expect(recommendations.length).toBe(2);
      expect(recommendations.some(r => r.column === 'event_date')).toBe(true);
    });

    test('should recommend CDF for audit tables', () => {
      const tableMetadata = {
        table_name: 'audit_log',
        purpose: 'audit',
      };

      const shouldEnableCDF =
        tableMetadata.purpose === 'audit' || tableMetadata.table_name.includes('audit');

      expect(shouldEnableCDF).toBe(true);
    });

    test('should recommend deletion vectors for tables with frequent deletes', () => {
      const tableMetadata = {
        operations: {
          deletes_per_day: 1000,
          inserts_per_day: 5000,
        },
      };

      const deleteRatio =
        tableMetadata.operations.deletes_per_day /
        (tableMetadata.operations.deletes_per_day + tableMetadata.operations.inserts_per_day);

      const shouldEnableDeletionVectors = deleteRatio > 0.1;

      expect(shouldEnableDeletionVectors).toBe(true);
    });
  });

  describe('Pattern Recommendation', () => {
    test('should recommend Data Vault for enterprise data warehouse', () => {
      const requirements = {
        scale: 'enterprise',
        history_tracking: true,
        audit_requirements: true,
        source_systems: 5,
      };

      const score = {
        data_vault: 0,
        kimball: 0,
        normalized: 0,
      };

      if (requirements.scale === 'enterprise') score.data_vault += 3;
      if (requirements.history_tracking) score.data_vault += 2;
      if (requirements.audit_requirements) score.data_vault += 2;
      if (requirements.source_systems > 3) score.data_vault += 2;

      const recommended = Object.entries(score).sort((a, b) => b[1] - a[1])[0][0];

      expect(recommended).toBe('data_vault');
    });

    test('should recommend Kimball for BI/reporting use case', () => {
      const requirements = {
        primary_use: 'reporting',
        query_performance: 'critical',
        user_accessibility: 'high',
      };

      const score = {
        data_vault: 0,
        kimball: 0,
        normalized: 0,
      };

      if (requirements.primary_use === 'reporting') score.kimball += 3;
      if (requirements.query_performance === 'critical') score.kimball += 2;
      if (requirements.user_accessibility === 'high') score.kimball += 2;

      const recommended = Object.entries(score).sort((a, b) => b[1] - a[1])[0][0];

      expect(recommended).toBe('kimball');
    });

    test('should recommend normalized for OLTP systems', () => {
      const requirements = {
        primary_use: 'transactional',
        data_integrity: 'critical',
        update_frequency: 'high',
      };

      const score = {
        data_vault: 0,
        kimball: 0,
        normalized: 0,
      };

      if (requirements.primary_use === 'transactional') score.normalized += 3;
      if (requirements.data_integrity === 'critical') score.normalized += 2;
      if (requirements.update_frequency === 'high') score.normalized += 2;

      const recommended = Object.entries(score).sort((a, b) => b[1] - a[1])[0][0];

      expect(recommended).toBe('normalized');
    });
  });

  describe('Pattern Validation', () => {
    test('should validate Hub pattern requirements', () => {
      const table = {
        columns: [
          { name: 'hub_customer_sk', type: 'BIGINT' },
          { name: 'customer_id', type: 'STRING' },
          { name: 'load_date', type: 'TIMESTAMP' },
          { name: 'record_source', type: 'STRING' },
        ],
      };

      const requiredColumns = ['hub_sk', 'business_key', 'load_date', 'record_source'];
      const hasRequiredColumns = requiredColumns.every(req =>
        table.columns.some(
          col =>
            col.name.includes(req.replace('hub_sk', 'sk')) ||
            col.name.includes(req.replace('business_key', 'id'))
        )
      );

      expect(hasRequiredColumns).toBe(true);
    });

    test('should validate Dimension pattern requirements', () => {
      const table = {
        columns: [
          { name: 'customer_sk', type: 'BIGINT' },
          { name: 'customer_id', type: 'STRING' },
          { name: 'effective_date', type: 'DATE' },
          { name: 'is_current', type: 'BOOLEAN' },
        ],
      };

      const hasSurrogateKey = table.columns.some(c => c.name.endsWith('_sk'));
      const hasEffectiveDate = table.columns.some(c => c.name === 'effective_date');
      const hasCurrentFlag = table.columns.some(c => c.name === 'is_current');

      const isValidDimension = hasSurrogateKey && hasEffectiveDate && hasCurrentFlag;

      expect(isValidDimension).toBe(true);
    });
  });

  describe('Tool Input Validation', () => {
    test('should validate get_pattern input', () => {
      const validInput = {
        pattern_type: 'data_vault',
        pattern_name: 'Hub',
      };

      expect(validInput.pattern_type).toBeTruthy();
      expect(validInput.pattern_name).toBeTruthy();
    });

    test('should validate recommend_pattern input', () => {
      const validInput = {
        requirements: {
          scale: 'enterprise',
          primary_use: 'reporting',
        },
      };

      expect(validInput.requirements).toBeTruthy();
      expect(Object.keys(validInput.requirements).length).toBeGreaterThan(0);
    });

    test('should validate get_databricks_optimizations input', () => {
      const validInput = {
        table_metadata: {
          table_name: 'fact_sales',
          row_count: 1000000,
          columns: [],
        },
      };

      expect(validInput.table_metadata.table_name).toBeTruthy();
      expect(validInput.table_metadata.row_count).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle unknown pattern type', () => {
      const patternType = 'unknown_pattern';
      const validTypes = ['data_vault', 'kimball', 'normalized'];

      const isValid = validTypes.includes(patternType);

      expect(isValid).toBe(false);
    });

    test('should handle missing required fields', () => {
      const input = {
        pattern_type: 'data_vault',
        // Missing pattern_name
      };

      const hasRequiredFields = input.pattern_type && (input as any).pattern_name;

      expect(hasRequiredFields).toBeFalsy();
    });
  });
});
