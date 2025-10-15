/**
 * Microsoft SQL Server Connection Adapter
 * Handles connections to SQL Server databases
 */

import { BaseConnectionAdapter } from './base-adapter';
import type {
  MSSQLConfiguration,
  TestConnectionResult,
  SchemaInfo,
  TableInfo,
  TableMetadata,
  ImportMetadataOptions,
  ImportMetadataResult
} from '@/types/connection';

// SQL Server to Databricks type mapping
const SQL_TO_DATABRICKS_TYPE_MAP: Record<string, string> = {
  // Integer types
  'int': 'INT',
  'bigint': 'BIGINT',
  'smallint': 'SMALLINT',
  'tinyint': 'TINYINT',

  // Decimal types
  'decimal': 'DECIMAL',
  'numeric': 'DECIMAL',
  'money': 'DECIMAL(19,4)',
  'smallmoney': 'DECIMAL(10,4)',

  // Float types
  'float': 'DOUBLE',
  'real': 'FLOAT',

  // String types
  'varchar': 'STRING',
  'nvarchar': 'STRING',
  'char': 'STRING',
  'nchar': 'STRING',
  'text': 'STRING',
  'ntext': 'STRING',

  // Date/Time types
  'datetime': 'TIMESTAMP',
  'datetime2': 'TIMESTAMP',
  'smalldatetime': 'TIMESTAMP',
  'date': 'DATE',
  'time': 'STRING',
  'datetimeoffset': 'TIMESTAMP',

  // Boolean
  'bit': 'BOOLEAN',

  // Binary types
  'binary': 'BINARY',
  'varbinary': 'BINARY',
  'image': 'BINARY',

  // Other types
  'uniqueidentifier': 'STRING',
  'xml': 'STRING',
  'json': 'STRING'
};

export class MSSQLAdapter extends BaseConnectionAdapter {
  /**
   * Build JDBC connection string from configuration
   */
  private buildConnectionString(): string {
    const config = this.getConfiguration<MSSQLConfiguration>();

    let connectionString = `Server=${config.server}`;

    if (config.port) {
      connectionString += `,${config.port}`;
    }

    connectionString += `;Database=${config.database}`;

    // Authentication
    if (config.authentication.type === 'sql_auth') {
      connectionString += `;User Id=${config.authentication.username}`;
      connectionString += `;Password=${config.authentication.password}`;
    } else if (config.authentication.type === 'windows_auth') {
      connectionString += `;Integrated Security=true`;
    } else if (config.authentication.type === 'azure_ad') {
      connectionString += `;Authentication=ActiveDirectoryPassword`;
      connectionString += `;User Id=${config.authentication.username}`;
      connectionString += `;Password=${config.authentication.password}`;
    }

    // SSL Configuration
    if (config.ssl?.enabled) {
      connectionString += `;Encrypt=true`;
      if (config.ssl.trust_server_certificate) {
        connectionString += `;TrustServerCertificate=true`;
      }
    }

    // Advanced settings
    if (config.advanced) {
      if (config.advanced.connection_timeout) {
        connectionString += `;Connection Timeout=${config.advanced.connection_timeout}`;
      }
      if (config.advanced.command_timeout) {
        connectionString += `;Command Timeout=${config.advanced.command_timeout}`;
      }
      if (config.advanced.application_name) {
        connectionString += `;Application Name=${config.advanced.application_name}`;
      }
    }

    return connectionString;
  }

  /**
   * Test the SQL Server connection
   */
  async test(): Promise<TestConnectionResult> {
    try {
      this.validateConfiguration(['server', 'database']);

      const config = this.getConfiguration<MSSQLConfiguration>();
      const connectionString = this.buildConnectionString();

      // TODO: Call Supabase Edge Function to test connection
      // For now, return stub implementation
      console.log('[MSSQLAdapter] Testing connection with:', {
        server: config.server,
        port: config.port,
        database: config.database,
        connectionString: connectionString.replace(/Password=[^;]+/g, 'Password=***')
      });

      // Stub: Simulate successful connection
      return {
        success: true,
        message: 'Connection test successful',
        tested_at: new Date().toISOString(),
        details: {
          server_version: 'Microsoft SQL Server 2022 (stub)',
          database: config.database
        }
      };
    } catch (error) {
      const handledError = this.handleConnectionError(error);
      return {
        success: false,
        message: handledError.message,
        tested_at: new Date().toISOString(),
        error: handledError.message
      };
    }
  }

  /**
   * List all schemas in the database
   */
  async listSchemas(): Promise<SchemaInfo[]> {
    try {
      // SQL query to list schemas
      const query = `
        SELECT
          s.name as schema_name,
          u.name as owner_name,
          s.schema_id
        FROM sys.schemas s
        INNER JOIN sys.sysusers u ON s.principal_id = u.uid
        WHERE s.name NOT IN ('sys', 'INFORMATION_SCHEMA', 'guest', 'db_owner', 'db_accessadmin',
                              'db_securityadmin', 'db_ddladmin', 'db_backupoperator', 'db_datareader',
                              'db_datawriter', 'db_denydatareader', 'db_denydatawriter')
        ORDER BY s.name
      `;

      // TODO: Execute query via Edge Function
      console.log('[MSSQLAdapter] List schemas query:', query);

      // Stub: Return sample schemas
      return [
        { name: 'dbo', description: 'Default schema', table_count: 10 },
        { name: 'Sales', description: 'Sales data', table_count: 5 },
        { name: 'HR', description: 'Human Resources', table_count: 3 }
      ];
    } catch (error) {
      throw this.handleConnectionError(error);
    }
  }

  /**
   * List all tables in a specific schema
   */
  async listTables(schema: string): Promise<TableInfo[]> {
    try {
      const query = `
        SELECT
          t.name as table_name,
          SCHEMA_NAME(t.schema_id) as schema_name,
          t.type_desc as table_type,
          p.rows as row_count,
          CAST(SUM(a.total_pages) * 8 AS BIGINT) as size_kb
        FROM sys.tables t
        INNER JOIN sys.partitions p ON t.object_id = p.object_id
        INNER JOIN sys.allocation_units a ON p.partition_id = a.container_id
        WHERE SCHEMA_NAME(t.schema_id) = @schema
          AND p.index_id IN (0, 1)
        GROUP BY t.name, t.schema_id, t.type_desc, p.rows
        ORDER BY t.name
      `;

      // TODO: Execute query via Edge Function with parameter
      console.log('[MSSQLAdapter] List tables query:', query, { schema });

      // Stub: Return sample tables
      return [
        {
          name: 'Customers',
          schema: schema,
          type: 'TABLE',
          row_count: 1000,
          size_kb: 256,
          description: 'Customer master data'
        },
        {
          name: 'Orders',
          schema: schema,
          type: 'TABLE',
          row_count: 5000,
          size_kb: 1024,
          description: 'Order transactions'
        }
      ];
    } catch (error) {
      throw this.handleConnectionError(error);
    }
  }

  /**
   * Get detailed metadata for a specific table
   */
  async getTableMetadata(schema: string, table: string): Promise<TableMetadata> {
    try {
      // Query to get column information
      const columnsQuery = `
        SELECT
          c.name as column_name,
          t.name as data_type,
          c.max_length,
          c.precision,
          c.scale,
          c.is_nullable,
          c.is_identity,
          CAST(ep.value AS VARCHAR(500)) as description
        FROM sys.columns c
        INNER JOIN sys.types t ON c.user_type_id = t.user_type_id
        LEFT JOIN sys.extended_properties ep ON ep.major_id = c.object_id AND ep.minor_id = c.column_id AND ep.name = 'MS_Description'
        WHERE c.object_id = OBJECT_ID(@schemaTable)
        ORDER BY c.column_id
      `;

      // Query to get primary key
      const pkQuery = `
        SELECT
          i.name as constraint_name,
          COL_NAME(ic.object_id, ic.column_id) as column_name
        FROM sys.indexes i
        INNER JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
        WHERE i.object_id = OBJECT_ID(@schemaTable)
          AND i.is_primary_key = 1
        ORDER BY ic.key_ordinal
      `;

      // Query to get foreign keys
      const fkQuery = `
        SELECT
          fk.name as constraint_name,
          COL_NAME(fkc.parent_object_id, fkc.parent_column_id) as column_name,
          OBJECT_SCHEMA_NAME(fk.referenced_object_id) as referenced_schema,
          OBJECT_NAME(fk.referenced_object_id) as referenced_table,
          COL_NAME(fkc.referenced_object_id, fkc.referenced_column_id) as referenced_column
        FROM sys.foreign_keys fk
        INNER JOIN sys.foreign_key_columns fkc ON fk.object_id = fkc.constraint_object_id
        WHERE fk.parent_object_id = OBJECT_ID(@schemaTable)
      `;

      // TODO: Execute queries via Edge Function
      console.log('[MSSQLAdapter] Get table metadata queries:', { schema, table });

      // Stub: Return sample metadata
      return {
        schema,
        table,
        columns: [
          {
            name: 'id',
            data_type: 'int',
            databricks_type: 'INT',
            is_nullable: false,
            is_primary_key: true,
            description: 'Primary key'
          },
          {
            name: 'name',
            data_type: 'nvarchar',
            databricks_type: 'STRING',
            is_nullable: false,
            max_length: 100,
            description: 'Name field'
          },
          {
            name: 'created_at',
            data_type: 'datetime',
            databricks_type: 'TIMESTAMP',
            is_nullable: false,
            description: 'Created timestamp'
          }
        ],
        primary_key: {
          constraint_name: 'PK_' + table,
          columns: ['id']
        },
        foreign_keys: [],
        indexes: []
      };
    } catch (error) {
      throw this.handleConnectionError(error);
    }
  }

  /**
   * Import metadata from selected tables
   */
  async importMetadata(options: ImportMetadataOptions): Promise<ImportMetadataResult> {
    try {
      // TODO: Implement metadata import logic
      // This would create datasets in the workspace for each selected table
      console.log('[MSSQLAdapter] Import metadata:', options);

      return {
        success: true,
        message: 'Metadata import completed',
        datasets_created: options.tables?.length || 0,
        columns_created: 0,
        relationships_created: 0,
        errors: []
      };
    } catch (error) {
      throw this.handleConnectionError(error);
    }
  }

  /**
   * Map SQL Server data type to Databricks type
   */
  static mapDataType(sqlType: string): string {
    const normalizedType = sqlType.toLowerCase().split('(')[0].trim();
    return SQL_TO_DATABRICKS_TYPE_MAP[normalizedType] || 'STRING';
  }
}
