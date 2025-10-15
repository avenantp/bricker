/**
 * Connection Factory
 * Creates the appropriate connection adapter based on connection type
 */

import { BaseConnectionAdapter } from './adapters/base-adapter';
import { MSSQLAdapter } from './adapters/mssql-adapter';
import type { Connection, ConnectionType } from '@/types/connection';

export class ConnectionFactory {
  /**
   * Create the appropriate adapter for a connection
   */
  static createAdapter(connection: Connection): BaseConnectionAdapter {
    switch (connection.connection_type) {
      case 'MSSQL':
        return new MSSQLAdapter(connection);

      case 'Salesforce':
        // TODO: Implement SalesforceAdapter
        throw new Error('Salesforce adapter not yet implemented');

      case 'Workday':
        // TODO: Implement WorkdayAdapter
        throw new Error('Workday adapter not yet implemented');

      case 'ServiceNow':
        // TODO: Implement ServiceNowAdapter
        throw new Error('ServiceNow adapter not yet implemented');

      case 'FileSystem':
        // TODO: Implement FileSystemAdapter
        throw new Error('FileSystem adapter not yet implemented');

      case 'Databricks':
        // TODO: Implement DatabricksAdapter
        throw new Error('Databricks adapter not yet implemented');

      case 'Snowflake':
        // TODO: Implement SnowflakeAdapter
        throw new Error('Snowflake adapter not yet implemented');

      case 'REST':
        // TODO: Implement RESTAdapter
        throw new Error('REST adapter not yet implemented');

      default:
        throw new Error(`Unsupported connection type: ${connection.connection_type}`);
    }
  }

  /**
   * Check if an adapter is available for a connection type
   */
  static isAdapterAvailable(connectionType: ConnectionType): boolean {
    const availableTypes: ConnectionType[] = ['MSSQL'];
    return availableTypes.includes(connectionType);
  }

  /**
   * Get list of connection types with available adapters
   */
  static getAvailableConnectionTypes(): ConnectionType[] {
    return ['MSSQL'];
  }
}
