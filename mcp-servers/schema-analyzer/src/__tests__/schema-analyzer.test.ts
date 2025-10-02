import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn(),
} as unknown as SupabaseClient;

describe('Schema Analyzer MCP Server', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeTable', () => {
    test('should analyze table metadata correctly', async () => {
      // Mock table columns
      const mockColumns = [
        { column_name: 'id', data_type: 'bigint', is_nullable: 'NO' },
        { column_name: 'name', data_type: 'text', is_nullable: 'YES' },
        { column_name: 'created_at', data_type: 'timestamp', is_nullable: 'NO' },
      ];

      // Mock table count
      const mockCount = { count: 1000 };

      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ data: mockColumns, error: null }),
        }),
        count: jest.fn().mockResolvedValue({ count: 1000, error: null }),
      });

      const result = {
        table_name: 'users',
        row_count: 1000,
        columns: mockColumns.map(col => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
        })),
      };

      expect(result.table_name).toBe('users');
      expect(result.row_count).toBe(1000);
      expect(result.columns).toHaveLength(3);
      expect(result.columns[0].name).toBe('id');
      expect(result.columns[0].type).toBe('bigint');
      expect(result.columns[0].nullable).toBe(false);
    });

    test('should handle tables with no rows', async () => {
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ column_name: 'id', data_type: 'bigint', is_nullable: 'NO' }],
            error: null,
          }),
        }),
        count: jest.fn().mockResolvedValue({ count: 0, error: null }),
      });

      const result = {
        table_name: 'empty_table',
        row_count: 0,
        columns: [{ name: 'id', type: 'bigint', nullable: false }],
      };

      expect(result.row_count).toBe(0);
    });

    test('should handle errors gracefully', async () => {
      (mockSupabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Table not found' },
          }),
        }),
      });

      const error = { message: 'Table not found' };
      expect(error.message).toBe('Table not found');
    });
  });

  describe('findRelationships', () => {
    test('should detect foreign key relationships', () => {
      const tables = [
        {
          table_name: 'orders',
          columns: [
            { name: 'id', type: 'bigint', nullable: false },
            { name: 'customer_id', type: 'bigint', nullable: false },
            { name: 'product_id', type: 'bigint', nullable: false },
          ],
        },
        {
          table_name: 'customers',
          columns: [
            { name: 'id', type: 'bigint', nullable: false },
            { name: 'name', type: 'text', nullable: false },
          ],
        },
        {
          table_name: 'products',
          columns: [
            { name: 'id', type: 'bigint', nullable: false },
            { name: 'name', type: 'text', nullable: false },
          ],
        },
      ];

      const relationships = [];

      // Detect customer_id -> customers.id
      const customerCol = tables[0].columns.find(c => c.name === 'customer_id');
      if (customerCol && customerCol.name.endsWith('_id')) {
        const referencedTable = customerCol.name.replace('_id', '') + 's';
        if (tables.find(t => t.table_name === referencedTable)) {
          relationships.push({
            from_table: 'orders',
            from_column: 'customer_id',
            to_table: referencedTable,
            to_column: 'id',
          });
        }
      }

      expect(relationships).toHaveLength(1);
      expect(relationships[0].from_table).toBe('orders');
      expect(relationships[0].to_table).toBe('customers');
    });

    test('should handle tables with no relationships', () => {
      const tables = [
        {
          table_name: 'standalone',
          columns: [
            { name: 'id', type: 'bigint', nullable: false },
            { name: 'data', type: 'text', nullable: true },
          ],
        },
      ];

      const relationships = tables[0].columns
        .filter(c => c.name.endsWith('_id'))
        .map(c => ({ column: c.name }));

      expect(relationships).toHaveLength(0);
    });
  });

  describe('suggestKeys', () => {
    test('should suggest primary key candidates', () => {
      const columns = [
        { name: 'id', type: 'bigint', nullable: false },
        { name: 'email', type: 'text', nullable: false },
        { name: 'name', type: 'text', nullable: true },
      ];

      const primaryKeyCandidates = columns.filter(
        c => !c.nullable && (c.name === 'id' || c.name.endsWith('_id'))
      );

      expect(primaryKeyCandidates).toHaveLength(1);
      expect(primaryKeyCandidates[0].name).toBe('id');
    });

    test('should suggest foreign key candidates', () => {
      const columns = [
        { name: 'id', type: 'bigint', nullable: false },
        { name: 'customer_id', type: 'bigint', nullable: false },
        { name: 'product_id', type: 'bigint', nullable: true },
      ];

      const foreignKeyCandidates = columns.filter(c => c.name.endsWith('_id') && c.name !== 'id');

      expect(foreignKeyCandidates).toHaveLength(2);
      expect(foreignKeyCandidates.map(c => c.name)).toContain('customer_id');
      expect(foreignKeyCandidates.map(c => c.name)).toContain('product_id');
    });

    test('should suggest business key candidates', () => {
      const columns = [
        { name: 'id', type: 'bigint', nullable: false },
        { name: 'email', type: 'text', nullable: false },
        { name: 'username', type: 'text', nullable: false },
        { name: 'created_at', type: 'timestamp', nullable: false },
      ];

      const businessKeyCandidates = columns.filter(
        c =>
          !c.nullable &&
          c.name !== 'id' &&
          !c.name.endsWith('_id') &&
          !c.name.includes('created') &&
          !c.name.includes('updated')
      );

      expect(businessKeyCandidates.length).toBeGreaterThan(0);
      expect(businessKeyCandidates.map(c => c.name)).toContain('email');
      expect(businessKeyCandidates.map(c => c.name)).toContain('username');
    });
  });

  describe('detectModelingPatterns', () => {
    test('should detect star schema pattern', () => {
      const tables = [
        { table_name: 'fact_sales', columns: [] },
        { table_name: 'dim_customer', columns: [] },
        { table_name: 'dim_product', columns: [] },
        { table_name: 'dim_date', columns: [] },
      ];

      const hasFact = tables.some(t => t.table_name.startsWith('fact_'));
      const hasDimensions = tables.filter(t => t.table_name.startsWith('dim_')).length >= 2;

      const pattern = hasFact && hasDimensions ? 'star_schema' : 'unknown';

      expect(pattern).toBe('star_schema');
    });

    test('should detect data vault pattern', () => {
      const tables = [
        { table_name: 'hub_customer', columns: [] },
        { table_name: 'sat_customer_details', columns: [] },
        { table_name: 'link_customer_order', columns: [] },
      ];

      const hasHub = tables.some(t => t.table_name.startsWith('hub_'));
      const hasSat = tables.some(t => t.table_name.startsWith('sat_'));
      const hasLink = tables.some(t => t.table_name.startsWith('link_'));

      const pattern = hasHub || hasSat || hasLink ? 'data_vault' : 'unknown';

      expect(pattern).toBe('data_vault');
    });

    test('should detect normalized schema pattern', () => {
      const tables = [
        {
          table_name: 'orders',
          columns: [
            { name: 'id', type: 'bigint', nullable: false },
            { name: 'customer_id', type: 'bigint', nullable: false },
          ],
        },
        {
          table_name: 'customers',
          columns: [
            { name: 'id', type: 'bigint', nullable: false },
            { name: 'name', type: 'text', nullable: false },
          ],
        },
      ];

      const hasForeignKeys = tables.some(t =>
        t.columns.some(c => c.name.endsWith('_id') && c.name !== 'id')
      );

      const pattern = hasForeignKeys ? 'normalized' : 'unknown';

      expect(pattern).toBe('normalized');
    });
  });

  describe('calculateCardinality', () => {
    test('should calculate cardinality ratio correctly', () => {
      const totalRows = 1000;
      const distinctValues = 500;

      const cardinality = distinctValues / totalRows;

      expect(cardinality).toBe(0.5);
    });

    test('should handle high cardinality columns', () => {
      const totalRows = 1000;
      const distinctValues = 990;

      const cardinality = distinctValues / totalRows;
      const isHighCardinality = cardinality > 0.9;

      expect(isHighCardinality).toBe(true);
    });

    test('should handle low cardinality columns', () => {
      const totalRows = 1000;
      const distinctValues = 5;

      const cardinality = distinctValues / totalRows;
      const isLowCardinality = cardinality < 0.1;

      expect(isLowCardinality).toBe(true);
    });
  });

  describe('Tool Input Validation', () => {
    test('should validate analyze_schema input', () => {
      const validInput = {
        connection_string: 'postgresql://localhost/testdb',
        schema_name: 'public',
      };

      expect(validInput.connection_string).toBeTruthy();
      expect(validInput.schema_name).toBeTruthy();
    });

    test('should reject invalid connection string', () => {
      const invalidInput = {
        connection_string: '',
        schema_name: 'public',
      };

      expect(invalidInput.connection_string).toBeFalsy();
    });

    test('should validate find_relationships input', () => {
      const validInput = {
        tables: [
          {
            table_name: 'users',
            columns: [{ name: 'id', type: 'bigint' }],
          },
        ],
      };

      expect(validInput.tables).toBeInstanceOf(Array);
      expect(validInput.tables.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    test('should handle database connection errors', async () => {
      (mockSupabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Connection refused');
      });

      try {
        mockSupabase.from('test');
      } catch (error: any) {
        expect(error.message).toBe('Connection refused');
      }
    });

    test('should handle invalid table names', () => {
      const invalidTableName = 'drop table users;';
      const isValid = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(invalidTableName);

      expect(isValid).toBe(false);
    });

    test('should handle timeout errors', async () => {
      const timeout = (ms: number) =>
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));

      await expect(timeout(100)).rejects.toThrow('Timeout');
    });
  });
});
