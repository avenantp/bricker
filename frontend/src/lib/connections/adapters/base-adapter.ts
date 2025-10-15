/**
 * Base Connection Adapter
 * Abstract class that all connection-specific adapters must extend
 */

import type {
  Connection,
  TestConnectionResult,
  SchemaInfo,
  TableInfo,
  TableMetadata,
  ImportMetadataOptions,
  ImportMetadataResult
} from '@/types/connection';

export abstract class BaseConnectionAdapter {
  protected connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Test the connection to verify credentials and connectivity
   */
  abstract test(): Promise<TestConnectionResult>;

  /**
   * List all schemas/databases available in this connection
   */
  abstract listSchemas(): Promise<SchemaInfo[]>;

  /**
   * List all tables in a specific schema
   */
  abstract listTables(schema: string): Promise<TableInfo[]>;

  /**
   * Get detailed metadata for a specific table
   */
  abstract getTableMetadata(schema: string, table: string): Promise<TableMetadata>;

  /**
   * Import metadata from selected tables into workspace datasets
   */
  abstract importMetadata(options: ImportMetadataOptions): Promise<ImportMetadataResult>;

  /**
   * Get the connection configuration with decrypted credentials
   * Override this if custom decryption logic is needed
   */
  protected getConfiguration<T>(): T {
    // TODO: Implement decryption when encryption service is ready
    return this.connection.configuration as T;
  }

  /**
   * Handle common connection errors and return user-friendly messages
   */
  protected handleConnectionError(error: unknown): Error {
    if (error instanceof Error) {
      // Network timeout
      if (error.message.includes('ETIMEDOUT') || error.message.includes('timeout')) {
        return new Error('Connection timeout. Please check your network and firewall settings.');
      }

      // Authentication failed
      if (error.message.includes('authentication') || error.message.includes('login failed')) {
        return new Error('Authentication failed. Please verify your username and password.');
      }

      // Connection refused
      if (error.message.includes('ECONNREFUSED')) {
        return new Error('Connection refused. Please verify the server address and port.');
      }

      // SSL/TLS errors
      if (error.message.includes('SSL') || error.message.includes('certificate')) {
        return new Error('SSL certificate error. Try enabling "Trust Server Certificate" in advanced settings.');
      }

      return error;
    }

    return new Error('An unexpected error occurred while connecting.');
  }

  /**
   * Validate that required configuration fields are present
   */
  protected validateConfiguration(requiredFields: string[]): void {
    const config = this.connection.configuration as Record<string, unknown>;
    const missingFields = requiredFields.filter(field => !config[field]);

    if (missingFields.length > 0) {
      throw new Error(`Missing required configuration fields: ${missingFields.join(', ')}`);
    }
  }
}
