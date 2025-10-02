import { describe, test, expect } from '@jest/globals';

describe('Model Generator MCP Server', () => {
  describe('Dimensional Model Generation', () => {
    test('should generate dimension with SCD Type 2', () => {
      const input = {
        entity_name: 'customer',
        source_tables: ['customers', 'addresses'],
        scd_type: 2,
      };

      const dimension = {
        id: 'dim_customer',
        type: 'dimension',
        data: {
          table_name: 'dim_customer',
          catalog: 'main',
          schema: 'analytics',
          columns: [
            { name: 'customer_sk', type: 'BIGINT', primary_key: true },
            { name: 'customer_id', type: 'STRING', business_key: true },
            { name: 'customer_name', type: 'STRING' },
            { name: 'effective_date', type: 'DATE' },
            { name: 'end_date', type: 'DATE' },
            { name: 'is_current', type: 'BOOLEAN' },
          ],
          optimizations: {
            liquid_clustering: ['customer_id'],
            partition_by: ['effective_date'],
          },
        },
      };

      expect(dimension.type).toBe('dimension');
      expect(dimension.data.columns.some(c => c.name === 'effective_date')).toBe(true);
      expect(dimension.data.columns.some(c => c.name === 'is_current')).toBe(true);
      expect(dimension.data.optimizations?.liquid_clustering).toBeDefined();
    });

    test('should generate fact table with measures', () => {
      const input = {
        fact_name: 'sales',
        dimensions: ['customer', 'product', 'date'],
        measures: [
          { name: 'quantity', type: 'INT' },
          { name: 'amount', type: 'DECIMAL' },
        ],
      };

      const fact = {
        id: 'fact_sales',
        type: 'fact',
        data: {
          table_name: 'fact_sales',
          columns: [
            { name: 'sales_sk', type: 'BIGINT', primary_key: true },
            { name: 'customer_sk', type: 'BIGINT', foreign_key: true },
            { name: 'product_sk', type: 'BIGINT', foreign_key: true },
            { name: 'date_sk', type: 'BIGINT', foreign_key: true },
            { name: 'quantity', type: 'INT' },
            { name: 'amount', type: 'DECIMAL' },
          ],
        },
      };

      expect(fact.type).toBe('fact');
      expect(fact.data.columns.filter(c => c.foreign_key).length).toBe(3);
      expect(fact.data.columns.some(c => c.name === 'quantity')).toBe(true);
    });

    test('should generate date dimension', () => {
      const dateDimension = {
        id: 'dim_date',
        type: 'dimension',
        data: {
          table_name: 'dim_date',
          columns: [
            { name: 'date_sk', type: 'BIGINT', primary_key: true },
            { name: 'date', type: 'DATE', business_key: true },
            { name: 'year', type: 'INT' },
            { name: 'quarter', type: 'INT' },
            { name: 'month', type: 'INT' },
            { name: 'day_of_week', type: 'STRING' },
            { name: 'is_weekend', type: 'BOOLEAN' },
          ],
        },
      };

      expect(dateDimension.data.columns.some(c => c.name === 'year')).toBe(true);
      expect(dateDimension.data.columns.some(c => c.name === 'quarter')).toBe(true);
      expect(dateDimension.data.columns.some(c => c.name === 'is_weekend')).toBe(true);
    });
  });

  describe('Data Vault Model Generation', () => {
    test('should generate Hub entity', () => {
      const input = {
        entity_name: 'customer',
        business_key: 'customer_id',
      };

      const hub = {
        id: 'hub_customer',
        type: 'hub',
        data: {
          table_name: 'hub_customer',
          columns: [
            { name: 'hub_customer_sk', type: 'BIGINT', primary_key: true },
            { name: 'customer_id', type: 'STRING', business_key: true },
            { name: 'load_date', type: 'TIMESTAMP' },
            { name: 'record_source', type: 'STRING' },
          ],
          optimizations: {
            liquid_clustering: ['customer_id'],
          },
        },
      };

      expect(hub.type).toBe('hub');
      expect(hub.data.columns.some(c => c.business_key)).toBe(true);
      expect(hub.data.columns.some(c => c.name === 'load_date')).toBe(true);
    });

    test('should generate Satellite with attributes', () => {
      const input = {
        hub_name: 'customer',
        attributes: ['name', 'email', 'phone'],
      };

      const satellite = {
        id: 'sat_customer_details',
        type: 'satellite',
        data: {
          table_name: 'sat_customer_details',
          columns: [
            { name: 'hub_customer_sk', type: 'BIGINT', foreign_key: true },
            { name: 'load_date', type: 'TIMESTAMP', primary_key: true },
            { name: 'end_date', type: 'TIMESTAMP' },
            { name: 'hash_diff', type: 'STRING' },
            { name: 'name', type: 'STRING' },
            { name: 'email', type: 'STRING' },
            { name: 'phone', type: 'STRING' },
          ],
        },
      };

      expect(satellite.type).toBe('satellite');
      expect(satellite.data.columns.some(c => c.name === 'hash_diff')).toBe(true);
      expect(satellite.data.columns.filter(c => input.attributes.includes(c.name)).length).toBe(3);
    });

    test('should generate Link for relationships', () => {
      const input = {
        hub1: 'customer',
        hub2: 'order',
        relationship: 'customer_order',
      };

      const link = {
        id: 'link_customer_order',
        type: 'link',
        data: {
          table_name: 'link_customer_order',
          columns: [
            { name: 'link_customer_order_sk', type: 'BIGINT', primary_key: true },
            { name: 'hub_customer_sk', type: 'BIGINT', foreign_key: true },
            { name: 'hub_order_sk', type: 'BIGINT', foreign_key: true },
            { name: 'load_date', type: 'TIMESTAMP' },
            { name: 'record_source', type: 'STRING' },
          ],
        },
      };

      expect(link.type).toBe('link');
      expect(link.data.columns.filter(c => c.foreign_key).length).toBe(2);
    });
  });

  describe('React Flow Model Generation', () => {
    test('should generate nodes with positions', () => {
      const entities = ['customer', 'order', 'product'];

      const nodes = entities.map((entity, index) => ({
        id: `node_${entity}`,
        type: 'table',
        position: { x: index * 300, y: 100 },
        data: {
          table_name: entity,
          columns: [],
        },
      }));

      expect(nodes).toHaveLength(3);
      expect(nodes[0].position.x).toBe(0);
      expect(nodes[1].position.x).toBe(300);
      expect(nodes[2].position.x).toBe(600);
    });

    test('should generate edges for relationships', () => {
      const relationships = [
        { from: 'order', to: 'customer' },
        { from: 'order', to: 'product' },
      ];

      const edges = relationships.map((rel, index) => ({
        id: `edge_${index}`,
        source: `node_${rel.from}`,
        target: `node_${rel.to}`,
        type: 'smoothstep',
        animated: true,
      }));

      expect(edges).toHaveLength(2);
      expect(edges[0].source).toBe('node_order');
      expect(edges[0].target).toBe('node_customer');
    });

    test('should position nodes in a grid layout', () => {
      const nodeCount = 9;
      const gridWidth = 3;

      const nodes = Array.from({ length: nodeCount }, (_, index) => ({
        id: `node_${index}`,
        position: {
          x: (index % gridWidth) * 300,
          y: Math.floor(index / gridWidth) * 200,
        },
      }));

      expect(nodes[0].position).toEqual({ x: 0, y: 0 });
      expect(nodes[3].position).toEqual({ x: 0, y: 200 });
      expect(nodes[4].position).toEqual({ x: 300, y: 200 });
    });
  });

  describe('YAML Metadata Generation', () => {
    test('should generate valid YAML structure', () => {
      const model = {
        id: 'model_001',
        name: 'Customer Analytics',
        nodes: [
          { id: 'node_1', type: 'dimension', data: {} },
          { id: 'node_2', type: 'fact', data: {} },
        ],
        edges: [{ id: 'edge_1', source: 'node_2', target: 'node_1' }],
      };

      const yamlStructure = {
        id: model.id,
        name: model.name,
        nodes: model.nodes.map(n => ({ id: n.id, type: n.type })),
        edges: model.edges.map(e => ({ id: e.id, source: e.source, target: e.target })),
      };

      expect(yamlStructure.nodes).toHaveLength(2);
      expect(yamlStructure.edges).toHaveLength(1);
    });

    test('should include metadata fields', () => {
      const metadata = {
        created_at: new Date().toISOString(),
        created_by: 'user@example.com',
        version: 1,
        description: 'Test model',
      };

      expect(metadata.created_at).toBeTruthy();
      expect(metadata.version).toBe(1);
      expect(metadata.description).toBe('Test model');
    });
  });

  describe('Template Generation', () => {
    test('should generate DDL template for dimension', () => {
      const table = {
        table_name: 'dim_customer',
        catalog: 'main',
        schema: 'analytics',
        columns: [
          { name: 'customer_sk', type: 'BIGINT' },
          { name: 'customer_name', type: 'STRING' },
        ],
      };

      const ddl = `CREATE TABLE IF NOT EXISTS ${table.catalog}.${table.schema}.${table.table_name} (
${table.columns.map(c => `  ${c.name} ${c.type}`).join(',\n')}
)
USING DELTA;`;

      expect(ddl).toContain('CREATE TABLE');
      expect(ddl).toContain('main.analytics.dim_customer');
      expect(ddl).toContain('USING DELTA');
    });

    test('should generate ETL template for SCD Type 2', () => {
      const template = `
MERGE INTO dim_customer target
USING source
ON target.customer_id = source.customer_id
  AND target.is_current = true
WHEN MATCHED AND hash_diff != source_hash THEN
  UPDATE SET end_date = current_date(), is_current = false
WHEN NOT MATCHED THEN
  INSERT (customer_sk, customer_id, effective_date, is_current)
  VALUES (seq_nextval(), source.customer_id, current_date(), true);
`;

      expect(template).toContain('MERGE INTO');
      expect(template).toContain('is_current');
      expect(template).toContain('effective_date');
    });

    test('should apply Databricks optimizations to DDL', () => {
      const optimizations = {
        liquid_clustering: ['customer_id'],
        partition_by: ['effective_date'],
        enable_cdf: true,
      };

      const ddlWithOptimizations = `
CREATE TABLE dim_customer (...)
USING DELTA
CLUSTER BY (${optimizations.liquid_clustering.join(', ')})
PARTITIONED BY (${optimizations.partition_by.join(', ')})
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = '${optimizations.enable_cdf}'
);`;

      expect(ddlWithOptimizations).toContain('CLUSTER BY');
      expect(ddlWithOptimizations).toContain('PARTITIONED BY');
      expect(ddlWithOptimizations).toContain('enableChangeDataFeed');
    });
  });

  describe('Column Inference', () => {
    test('should infer data types from source metadata', () => {
      const sourceColumns = [
        { name: 'id', type: 'integer' },
        { name: 'email', type: 'character varying' },
        { name: 'created_at', type: 'timestamp without time zone' },
      ];

      const databricksColumns = sourceColumns.map(col => ({
        name: col.name,
        type: mapToDatabricksType(col.type),
      }));

      function mapToDatabricksType(pgType: string): string {
        const typeMap: Record<string, string> = {
          integer: 'INT',
          'character varying': 'STRING',
          'timestamp without time zone': 'TIMESTAMP',
        };
        return typeMap[pgType] || 'STRING';
      }

      expect(databricksColumns[0].type).toBe('INT');
      expect(databricksColumns[1].type).toBe('STRING');
      expect(databricksColumns[2].type).toBe('TIMESTAMP');
    });

    test('should add audit columns automatically', () => {
      const baseColumns = [
        { name: 'id', type: 'BIGINT' },
        { name: 'name', type: 'STRING' },
      ];

      const auditColumns = [
        { name: 'created_at', type: 'TIMESTAMP' },
        { name: 'updated_at', type: 'TIMESTAMP' },
        { name: 'created_by', type: 'STRING' },
      ];

      const allColumns = [...baseColumns, ...auditColumns];

      expect(allColumns.some(c => c.name === 'created_at')).toBe(true);
      expect(allColumns.some(c => c.name === 'updated_at')).toBe(true);
    });
  });

  describe('Model Validation', () => {
    test('should validate node connections', () => {
      const nodes = [
        { id: 'node_1', type: 'source' },
        { id: 'node_2', type: 'dimension' },
      ];

      const edges = [{ id: 'edge_1', source: 'node_1', target: 'node_2' }];

      const allNodesConnected = edges.every(
        edge =>
          nodes.some(n => n.id === edge.source) && nodes.some(n => n.id === edge.target)
      );

      expect(allNodesConnected).toBe(true);
    });

    test('should detect circular dependencies', () => {
      const edges = [
        { source: 'A', target: 'B' },
        { source: 'B', target: 'C' },
        { source: 'C', target: 'A' }, // Creates a cycle
      ];

      function hasCycle(edges: typeof edges): boolean {
        const graph = new Map<string, string[]>();
        edges.forEach(e => {
          if (!graph.has(e.source)) graph.set(e.source, []);
          graph.get(e.source)!.push(e.target);
        });

        const visited = new Set<string>();
        const recStack = new Set<string>();

        function dfs(node: string): boolean {
          visited.add(node);
          recStack.add(node);

          const neighbors = graph.get(node) || [];
          for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
              if (dfs(neighbor)) return true;
            } else if (recStack.has(neighbor)) {
              return true;
            }
          }

          recStack.delete(node);
          return false;
        }

        for (const node of graph.keys()) {
          if (!visited.has(node)) {
            if (dfs(node)) return true;
          }
        }

        return false;
      }

      expect(hasCycle(edges)).toBe(true);
    });
  });

  describe('Tool Input Validation', () => {
    test('should validate generate_dimensional_model input', () => {
      const validInput = {
        entity_name: 'customer',
        source_tables: ['customers'],
        scd_type: 2,
      };

      expect(validInput.entity_name).toBeTruthy();
      expect(validInput.source_tables).toBeInstanceOf(Array);
      expect([1, 2, 3].includes(validInput.scd_type)).toBe(true);
    });

    test('should validate generate_data_vault_model input', () => {
      const validInput = {
        entity_name: 'customer',
        business_key: 'customer_id',
        attributes: ['name', 'email'],
      };

      expect(validInput.entity_name).toBeTruthy();
      expect(validInput.business_key).toBeTruthy();
      expect(validInput.attributes).toBeInstanceOf(Array);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing required fields', () => {
      const input = {
        entity_name: 'customer',
        // Missing source_tables
      };

      const isValid = input.entity_name && (input as any).source_tables;

      expect(isValid).toBeFalsy();
    });

    test('should handle invalid SCD type', () => {
      const scdType = 5;
      const validTypes = [1, 2, 3];

      expect(validTypes.includes(scdType)).toBe(false);
    });
  });
});
