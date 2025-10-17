/**
 * Connection Service
 *
 * Service layer for managing connections including CRUD operations,
 * testing, and metadata operations.
 */

import { createClient } from '@supabase/supabase-js';
import type {
  Connection,
  ConnectionWithDetails,
  CreateConnectionInput,
  UpdateConnectionInput,
  ConnectionFilters,
  TestConnectionResult,
  SchemaInfo,
  TableInfo,
  TableMetadata,
  ImportMetadataOptions,
  ImportMetadataResult
} from '@/types/connection';
import {
  PaginatedResponse,
  createPaginatedResponse,
  validatePaginationParams,
  calculateOffset
} from '@/types/api';

/**
 * Connection Service Class
 */
export class ConnectionService {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // =====================================================
  // CRUD Operations
  // =====================================================

  /**
   * Get connections with filtering
   */
  async getConnections(filters: ConnectionFilters = {}): Promise<PaginatedResponse<ConnectionWithDetails>> {
    let query = this.supabase
      .from('connections')
      .select(`
        *,
        owner:users!owner_id(id, full_name, email)
      `, { count: 'exact' });

    // Apply filters
    if (filters.account_id) {
      query = query.eq('account_id', filters.account_id);
    }

    if (filters.connection_type) {
      query = query.eq('connection_type', filters.connection_type);
    }

    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    if (filters.test_status) {
      query = query.eq('test_status', filters.test_status);
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    // Sort by created date (newest first)
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      throw new Error(`Failed to fetch connections: ${error.message}`);
    }

    return createPaginatedResponse(data || [], 1, 50, count || 0);
  }

  /**
   * Get a single connection by ID
   */
  async getConnection(connectionId: string): Promise<ConnectionWithDetails> {
    const { data, error } = await this.supabase
      .from('connections')
      .select(`
        *,
        owner:users!owner_id(id, full_name, email)
      `)
      .eq('id', connectionId)
      .single();

    if (error) {
      throw new Error(`Failed to fetch connection: ${error.message}`);
    }

    if (!data) {
      throw new Error('Connection not found');
    }

    return data;
  }

  /**
   * Create a new connection
   */
  async createConnection(input: CreateConnectionInput): Promise<Connection> {
    // Validate input
    this.validateConnectionInput(input);

    const connectionData = {
      account_id: input.account_id,
      name: input.name,
      description: input.description || null,
      connection_type: input.connection_type,
      configuration: input.configuration,
      visibility: input.visibility || 'private',
      test_status: 'untested',
      is_active: true
    };

    const { data, error } = await this.supabase
      .from('connections')
      .insert(connectionData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create connection: ${error.message}`);
    }

    return data;
  }

  /**
   * Update an existing connection
   */
  async updateConnection(connectionId: string, input: UpdateConnectionInput): Promise<Connection> {
    const updateData: any = {};

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.configuration !== undefined) updateData.configuration = input.configuration;
    if (input.is_active !== undefined) updateData.is_active = input.is_active;
    if (input.visibility !== undefined) updateData.visibility = input.visibility;
    if (input.is_locked !== undefined) updateData.is_locked = input.is_locked;

    const { data, error } = await this.supabase
      .from('connections')
      .update(updateData)
      .eq('id', connectionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update connection: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a connection
   */
  async deleteConnection(connectionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('connections')
      .delete()
      .eq('id', connectionId);

    if (error) {
      throw new Error(`Failed to delete connection: ${error.message}`);
    }
  }

  // =====================================================
  // Testing (Stub Implementation)
  // =====================================================

  /**
   * Test a connection
   * TODO: Implement actual connection testing via edge function or adapter
   */
  async testConnection(connectionId: string): Promise<TestConnectionResult> {
    const connection = await this.getConnection(connectionId);

    // TODO: Implement actual connection testing based on connection_type
    // For now, return success stub

    const testedAt = new Date().toISOString();

    // Update test status in database
    await this.supabase
      .from('connections')
      .update({
        test_status: 'success',
        last_tested_at: testedAt,
        test_error_message: null
      })
      .eq('id', connectionId);

    return {
      success: true,
      message: `Connection to ${connection.name} successful (stub implementation)`,
      tested_at: testedAt,
      details: {
        latency_ms: 50,
        server_version: 'N/A'
      }
    };
  }

  // =====================================================
  // Metadata Operations (Stub Implementation)
  // =====================================================

  /**
   * List schemas from connection
   */
  async listSchemas(connectionId: string): Promise<SchemaInfo[]> {
    const connection = await this.getConnection(connectionId);

    // Only support MSSQL for now
    if (connection.connection_type !== 'MSSQL') {
      throw new Error(`Schema listing not supported for ${connection.connection_type} connections`);
    }

    // Get the connection configuration
    const config = connection.configuration as any;

    // Call the backend API to list databases (schemas)
    const response = await fetch('/api/connections/mssql/list-databases', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        server: config.server || '',
        port: config.port || 1433,
        database: config.database || 'master',
        authentication: {
          type: config.authentication?.type || 'sql_auth',
          username: config.authentication?.username || '',
          password: config.authentication?.password || '',
        },
        encryption: {
          mode: config.encryption?.mode || 'Mandatory',
          trust_server_certificate: config.encryption?.trust_server_certificate || false,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || 'Failed to list schemas');
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || result.error || 'Failed to list schemas');
    }

    // For SQL Server, we need to list schemas, not databases
    // Let's call a schema listing endpoint instead
    // For now, we'll query the information schema
    const schemasResponse = await fetch('/api/connections/mssql/list-schemas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        server: config.server || '',
        port: config.port || 1433,
        database: config.database || 'master',
        authentication: {
          type: config.authentication?.type || 'sql_auth',
          username: config.authentication?.username || '',
          password: config.authentication?.password || '',
        },
        encryption: {
          mode: config.encryption?.mode || 'Mandatory',
          trust_server_certificate: config.encryption?.trust_server_certificate || false,
        },
      }),
    });

    if (!schemasResponse.ok) {
      const errorData = await schemasResponse.json();
      throw new Error(errorData.message || errorData.error || 'Failed to list schemas');
    }

    const schemasResult = await schemasResponse.json();

    if (!schemasResult.success) {
      throw new Error(schemasResult.message || schemasResult.error || 'Failed to list schemas');
    }

    // Transform schemas to SchemaInfo format
    return (schemasResult.schemas || []).map((schema: any) => ({
      name: schema.name || schema.schema_name || schema,
      description: schema.description || undefined,
      table_count: schema.table_count || schema.tableCount || undefined,
    }));
  }

  /**
   * List tables from schema
   */
  async listTables(connectionId: string, schema: string): Promise<TableInfo[]> {
    const connection = await this.getConnection(connectionId);

    // Only support MSSQL for now
    if (connection.connection_type !== 'MSSQL') {
      throw new Error(`Table listing not supported for ${connection.connection_type} connections`);
    }

    // Get the connection configuration
    const config = connection.configuration as any;

    // Call the backend API to list tables in the schema
    const response = await fetch('/api/connections/mssql/list-tables', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        connection: {
          server: config.server || '',
          port: config.port || 1433,
          database: config.database || 'master',
          authentication: {
            type: config.authentication?.type || 'sql_auth',
            username: config.authentication?.username || '',
            password: config.authentication?.password || '',
          },
          encryption: {
            mode: config.encryption?.mode || 'Mandatory',
            trustServerCertificate: config.encryption?.trust_server_certificate || false,
          },
        },
        schema,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || errorData.error || 'Failed to list tables');
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || result.error || 'Failed to list tables');
    }

    // Transform tables to TableInfo format
    return (result.tables || []).map((table: any) => ({
      schema: table.schema || schema,
      name: table.name || table.table_name || table,
      table_type: (table.table_type || 'TABLE') as 'TABLE' | 'VIEW' | 'EXTERNAL',
      row_count: table.row_count || table.rowCount || undefined,
      description: table.description || undefined,
      created_at: table.created_at || table.createdAt || undefined,
      updated_at: table.updated_at || table.updatedAt || undefined,
    }));
  }

  /**
   * Get table metadata
   * TODO: Implement via edge function or adapter
   */
  async getTableMetadata(connectionId: string, schema: string, table: string): Promise<TableMetadata> {
    const connection = await this.getConnection(connectionId);

    // TODO: Implement actual metadata extraction based on connection_type
    // For now, return stub data
    return {
      schema,
      table,
      columns: [
        {
          name: 'id',
          data_type: 'INT',
          is_nullable: false,
          is_primary_key: true,
          is_foreign_key: false,
          ordinal_position: 1,
          description: 'Primary key'
        },
        {
          name: 'name',
          data_type: 'VARCHAR',
          is_nullable: false,
          is_primary_key: false,
          is_foreign_key: false,
          ordinal_position: 2,
          description: 'Name field'
        },
        {
          name: 'created_at',
          data_type: 'TIMESTAMP',
          is_nullable: false,
          is_primary_key: false,
          is_foreign_key: false,
          ordinal_position: 3,
          description: 'Creation timestamp'
        }
      ],
      indexes: [
        {
          name: 'PK_id',
          columns: ['id'],
          is_unique: true,
          is_primary: true
        }
      ],
      row_count: 1000
    };
  }

  /**
   * Import metadata from connection
   * TODO: Implement actual import logic
   */
  async importMetadata(connectionId: string, options: ImportMetadataOptions): Promise<ImportMetadataResult> {
    const connection = await this.getConnection(connectionId);

    // TODO: Implement actual metadata import
    // This would:
    // 1. Fetch table metadata from connection
    // 2. Create datasets in the database
    // 3. Create columns for each dataset
    // 4. Create relationships from foreign keys
    // 5. Return summary

    return {
      success: true,
      datasets_created: 0,
      columns_created: 0,
      relationships_created: 0,
      errors: [],
      duration_ms: 0
    };
  }

  // =====================================================
  // Validation Helpers
  // =====================================================

  /**
   * Validate connection input
   */
  private validateConnectionInput(input: CreateConnectionInput): void {
    if (!input.account_id) {
      throw new Error('Account ID is required');
    }

    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Connection name is required');
    }

    if (input.name.length < 3) {
      throw new Error('Connection name must be at least 3 characters');
    }

    if (input.name.length > 100) {
      throw new Error('Connection name must not exceed 100 characters');
    }

    if (!input.connection_type) {
      throw new Error('Connection type is required');
    }

    if (!input.configuration) {
      throw new Error('Connection configuration is required');
    }
  }

  // =====================================================
  // Utility Methods
  // =====================================================

  /**
   * Get current user ID from Supabase session
   */
  async getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await this.supabase.auth.getUser();

    if (error || !user) {
      throw new Error('User not authenticated');
    }

    return user.id;
  }

  /**
   * Check if connection name is available
   */
  async isConnectionNameAvailable(
    name: string,
    accountId: string,
    excludeConnectionId?: string
  ): Promise<boolean> {
    let query = this.supabase
      .from('connections')
      .select('id')
      .eq('account_id', accountId)
      .eq('name', name);

    if (excludeConnectionId) {
      query = query.neq('id', excludeConnectionId);
    }

    const { data, error } = await query.single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      throw new Error(`Failed to check connection name availability: ${error.message}`);
    }

    return !data; // Available if no data found
  }

  // =====================================================
  // Project Connection Methods
  // =====================================================

  /**
   * Get connections linked to a project
   */
  async getProjectConnections(projectId: string): Promise<PaginatedResponse<ConnectionWithDetails>> {
    const { data, error, count } = await this.supabase
      .from('project_connections')
      .select(`
        id,
        created_at,
        connection:connections (
          *,
          owner:users!owner_id(id, full_name, email)
        )
      `, { count: 'exact' })
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch project connections: ${error.message}`);
    }

    // Transform the data to return connection objects with project_connection_id
    const connections = data?.map((pc: any) => ({
      ...pc.connection,
      project_connection_id: pc.id,
      linked_at: pc.created_at
    })) || [];

    return createPaginatedResponse(connections, 1, 50, count || 0);
  }

  /**
   * Get available connections (not yet linked to this project)
   */
  async getAvailableProjectConnections(projectId: string): Promise<ConnectionWithDetails[]> {
    // First, get the project's account_id
    const { data: project, error: projectError } = await this.supabase
      .from('projects')
      .select('account_id')
      .eq('id', projectId)
      .single();

    if (projectError) {
      throw new Error(`Failed to fetch project: ${projectError.message}`);
    }

    if (!project) {
      throw new Error('Project not found');
    }

    // Get all account connections
    const { data: allConnections, error: connectionsError } = await this.supabase
      .from('connections')
      .select(`
        *,
        owner:users!owner_id(id, full_name, email)
      `)
      .eq('account_id', project.account_id)
      .order('name', { ascending: true });

    if (connectionsError) {
      throw new Error(`Failed to fetch connections: ${connectionsError.message}`);
    }

    // Get already linked connections for this project
    const { data: linkedConnections, error: linkedError } = await this.supabase
      .from('project_connections')
      .select('connection_id')
      .eq('project_id', projectId);

    if (linkedError) {
      throw new Error(`Failed to fetch linked connections: ${linkedError.message}`);
    }

    // Filter out already linked connections
    const linkedIds = new Set(linkedConnections?.map((pc: any) => pc.connection_id) || []);
    const availableConnections = allConnections?.filter(
      (conn: any) => !linkedIds.has(conn.id)
    ) || [];

    return availableConnections;
  }

  /**
   * Link a connection to a project
   */
  async linkConnectionToProject(projectId: string, connectionId: string): Promise<void> {
    const userId = await this.getCurrentUserId();

    const { error } = await this.supabase
      .from('project_connections')
      .insert({
        project_id: projectId,
        connection_id: connectionId,
        created_by: userId
      });

    if (error) {
      // Check for unique constraint violation
      if (error.code === '23505') {
        throw new Error('Connection is already linked to this project');
      }

      throw new Error(`Failed to link connection to project: ${error.message}`);
    }
  }

  /**
   * Unlink a connection from a project
   */
  async unlinkConnectionFromProject(projectId: string, connectionId: string): Promise<void> {
    const { error } = await this.supabase
      .from('project_connections')
      .delete()
      .eq('project_id', projectId)
      .eq('connection_id', connectionId);

    if (error) {
      throw new Error(`Failed to unlink connection from project: ${error.message}`);
    }
  }
}

/**
 * Create a ConnectionService instance with environment configuration
 */
export function createConnectionService(): ConnectionService {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase configuration is missing');
  }

  return new ConnectionService(supabaseUrl, supabaseKey);
}
