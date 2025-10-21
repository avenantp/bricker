/**
 * Connection-related TypeScript types and interfaces
 * Based on specification: docs/prp/031-manage-connections-specification.md
 */

// =====================================================
// Enums
// =====================================================

/**
 * Supported connection types
 */
export enum ConnectionType {
  MSSQL = 'MSSQL',
  Databricks = 'Databricks',
  Snowflake = 'Snowflake',
  Salesforce = 'Salesforce',
  Workday = 'Workday',
  ServiceNow = 'ServiceNow',
  FileSystem = 'FileSystem',
  REST = 'REST'
}

/**
 * Connection test status
 */
export enum TestStatus {
  Success = 'success',
  Failed = 'failed',
  Pending = 'pending',
  Untested = 'untested'
}

/**
 * Metadata cache type
 */
export enum MetadataType {
  Schema = 'schema',
  Table = 'table',
  Column = 'column',
  Index = 'index',
  Constraint = 'constraint'
}

/**
 * Connection visibility level
 */
export enum ConnectionVisibility {
  Public = 'public',
  Private = 'private',
  Locked = 'locked'
}

/**
 * Medallion architecture layers
 */
export enum MedallionLayer {
  SOURCE = 'Source',
  RAW = 'Raw',
  BRONZE = 'Bronze',
  SILVER = 'Silver',
  GOLD = 'Gold'
}

/**
 * System types for connections (more granular than ConnectionType)
 */
export enum SystemType {
  // Databases
  MSSQL = 'Microsoft SQL Server',
  POSTGRESQL = 'PostgreSQL',
  ORACLE = 'Oracle Database',
  MYSQL = 'MySQL',
  MARIADB = 'MariaDB',

  // Cloud Storage
  AZURE_BLOB = 'Azure Blob Storage',
  AZURE_DATA_LAKE = 'Azure Data Lake Store',
  AWS_S3 = 'AWS S3',
  GOOGLE_CLOUD_STORAGE = 'Google Cloud Storage',

  // Data Platforms
  DATABRICKS = 'Databricks',
  SNOWFLAKE = 'Snowflake',
  BIGQUERY = 'BigQuery',
  SYNAPSE = 'Azure Synapse',
  REDSHIFT = 'AWS Redshift',

  // Other
  REST_API = 'REST API',
  FILE_SYSTEM = 'File System',
  FTP = 'FTP/SFTP'
}

// =====================================================
// Vendor-Specific Configuration Types
// =====================================================

/**
 * Microsoft SQL Server connection configuration
 */
export interface MSSQLConfiguration {
  server: string;
  port: number;
  database: string;
  authentication: {
    type: 'sql_auth' | 'windows_auth' | 'azure_ad';
    username: string;
    password: string;
  };
  encryption?: {
    mode: 'Mandatory' | 'Optional' | 'Strict';
    trust_server_certificate?: boolean;
  };
  advanced?: {
    connection_timeout?: number;
    command_timeout?: number;
    application_name?: string;
    additional_properties?: string;
  };
  cdc?: {
    enabled: boolean;
    tracking_tables?: string[];
  };
}

/**
 * Salesforce connection configuration
 */
export interface SalesforceConfiguration {
  instance_url: string;
  authentication: {
    type: 'oauth';
    client_id: string;
    client_secret: string;
    refresh_token?: string;
    access_token?: string;
    expires_at?: string;
  };
  api_version: string;
  advanced?: {
    batch_size?: number;
    rate_limit_per_day?: number;
  };
}

/**
 * Workday connection configuration
 */
export interface WorkdayConfiguration {
  tenant_name: string;
  base_url: string;
  authentication: {
    type: 'integration_system_user';
    username: string;
    password: string;
  };
  api_version: string;
  advanced?: {
    timeout?: number;
    page_size?: number;
  };
}

/**
 * ServiceNow connection configuration
 */
export interface ServiceNowConfiguration {
  instance_url: string;
  authentication: {
    type: 'basic' | 'oauth';
    username: string;
    password: string;
  };
  api_version: string;
  advanced?: {
    page_size?: number;
    rate_limit?: number;
  };
}

/**
 * File System connection configuration
 */
export interface FileSystemConfiguration {
  type: 'local' | 'remote';
  base_path: string;
  authentication?: {
    type: 'none' | 'ssh' | 'smb';
  };
  supported_formats: string[];
  advanced?: {
    recursive?: boolean;
    pattern?: string;
  };
}

/**
 * Databricks connection configuration
 */
export interface DatabricksConfiguration {
  workspace_url: string;
  authentication: {
    type: 'pat';
    token: string;
  };
  catalog: string;
  schema: string;
  compute: {
    cluster_id?: string;
    warehouse_id?: string;
    compute_type: 'serverless' | 'classic';
  };
  advanced?: {
    timeout?: number;
    enable_unity_catalog?: boolean;
  };
}

/**
 * Union type of all connection configurations
 */
export type ConnectionConfiguration =
  | MSSQLConfiguration
  | SalesforceConfiguration
  | WorkdayConfiguration
  | ServiceNowConfiguration
  | FileSystemConfiguration
  | DatabricksConfiguration;

// =====================================================
// Core Interfaces
// =====================================================

/**
 * Connection entity (matches database table)
 */
export interface Connection {
  id: string;
  account_id: string;
  name: string;
  description: string | null;
  connection_type: ConnectionType;
  configuration: ConnectionConfiguration;
  is_active: boolean;
  last_tested_at: string | null;
  test_status: TestStatus | null;
  test_error_message: string | null;
  import_settings: Record<string, unknown>;
  last_import_at: string | null;
  owner_id: string | null;
  visibility: ConnectionVisibility;
  is_locked: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;

  // Medallion layer (integration stage) - from migration 06
  medallion_layer?: MedallionLayer | string | null;

  // Metadata fields - from migration 07
  record_source?: string | null;

  // Type-specific fields - from migration 07
  container?: string | null;  // For file connections
  external_location?: string | null;  // For file/Databricks connections
  catalog?: string | null;  // For Databricks connections
  connection_string_encrypted?: string | null;  // For database connections
}

/**
 * Connection with additional computed fields
 */
export interface ConnectionWithDetails extends Connection {
  owner?: {
    id: string;
    full_name: string;
    email: string;
  };
  metadata_cache_count?: number;
}

/**
 * Connection metadata cache entry
 */
export interface ConnectionMetadataCache {
  id: string;
  connection_id: string;
  metadata_type: MetadataType;
  metadata: Record<string, unknown>;
  cached_at: string;
  expires_at: string | null;
  is_stale: boolean;
  created_at: string;
  updated_at: string;
}

// =====================================================
// Filter and Query Types
// =====================================================

/**
 * Parameters for filtering connections
 */
export interface ConnectionFilters {
  account_id?: string;
  connection_type?: ConnectionType;
  is_active?: boolean;
  test_status?: TestStatus;
  search?: string;
}

// =====================================================
// Testing and Validation
// =====================================================

/**
 * Result of testing a connection
 */
export interface TestConnectionResult {
  success: boolean;
  message: string;
  tested_at: string;
  error?: string;
  details?: {
    latency_ms?: number;
    server_version?: string;
    [key: string]: unknown;
  };
}

// =====================================================
// Metadata Types
// =====================================================

/**
 * Schema information from connection
 */
export interface SchemaInfo {
  name: string;
  description?: string;
  table_count?: number;
}

/**
 * Table information from connection
 */
export interface TableInfo {
  schema: string;
  name: string;
  table_type: 'TABLE' | 'VIEW' | 'EXTERNAL';
  row_count?: number;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Column information from table metadata
 */
export interface ColumnInfo {
  name: string;
  data_type: string;
  is_nullable: boolean;
  is_primary_key: boolean;
  is_foreign_key: boolean;
  default_value?: string;
  description?: string;
  ordinal_position: number;
}

/**
 * Index information from table metadata
 */
export interface IndexInfo {
  name: string;
  columns: string[];
  is_unique: boolean;
  is_primary: boolean;
}

/**
 * Foreign key relationship information
 */
export interface ForeignKeyInfo {
  name: string;
  column: string;
  referenced_schema: string;
  referenced_table: string;
  referenced_column: string;
}

/**
 * Complete table metadata
 */
export interface TableMetadata {
  schema: string;
  table: string;
  columns: ColumnInfo[];
  indexes?: IndexInfo[];
  foreign_keys?: ForeignKeyInfo[];
  row_count?: number;
}

// =====================================================
// Import Types
// =====================================================

/**
 * Options for importing metadata
 */
export interface ImportMetadataOptions {
  schemas?: string[];
  tables?: string[];
  medallion_layer?: 'Raw' | 'Bronze' | 'Silver' | 'Gold';
  entity_type?: 'Table' | 'Staging' | 'PersistentStaging';
  import_relationships?: boolean;
  ai_enhance?: boolean;
}

/**
 * Result of metadata import operation
 */
export interface ImportMetadataResult {
  success: boolean;
  datasets_created: number;
  columns_created: number;
  relationships_created: number;
  errors: Array<{
    table: string;
    message: string;
  }>;
  duration_ms: number;
}

// =====================================================
// Input Types
// =====================================================

/**
 * Input for creating a new connection
 */
export interface CreateConnectionInput {
  account_id: string;
  name: string;
  description?: string;
  connection_type: ConnectionType;
  configuration: ConnectionConfiguration;
  visibility?: ConnectionVisibility;

  // Medallion layer (integration stage)
  medallion_layer?: MedallionLayer | string;

  // Metadata fields
  record_source?: string;

  // Type-specific fields
  container?: string;
  external_location?: string;
  catalog?: string;
  connection_string_encrypted?: string;
}

/**
 * Input for updating a connection
 */
export interface UpdateConnectionInput {
  name?: string;
  description?: string;
  configuration?: Partial<ConnectionConfiguration>;
  is_active?: boolean;
  visibility?: ConnectionVisibility;
  is_locked?: boolean;

  // Medallion layer (integration stage)
  medallion_layer?: MedallionLayer | string;

  // Metadata fields
  record_source?: string;

  // Type-specific fields
  container?: string;
  external_location?: string;
  catalog?: string;
  connection_string_encrypted?: string;
}

// =====================================================
// Type Guards
// =====================================================

/**
 * Check if value is a valid ConnectionType
 */
export function isConnectionType(value: string): value is ConnectionType {
  return Object.values(ConnectionType).includes(value as ConnectionType);
}

/**
 * Check if value is a valid TestStatus
 */
export function isTestStatus(value: string): value is TestStatus {
  return Object.values(TestStatus).includes(value as TestStatus);
}

/**
 * Check if configuration is for MSSQL
 */
export function isMSSQLConfiguration(config: ConnectionConfiguration): config is MSSQLConfiguration {
  return 'server' in config && 'database' in config;
}

/**
 * Check if configuration is for Salesforce
 */
export function isSalesforceConfiguration(config: ConnectionConfiguration): config is SalesforceConfiguration {
  return 'instance_url' in config && 'api_version' in config && 'authentication' in config && config.authentication.type === 'oauth';
}

/**
 * Check if configuration is for Databricks
 */
export function isDatabricksConfiguration(config: ConnectionConfiguration): config is DatabricksConfiguration {
  return 'workspace_url' in config && 'catalog' in config && 'compute' in config;
}

/**
 * Check if configuration is for Workday
 */
export function isWorkdayConfiguration(config: ConnectionConfiguration): config is WorkdayConfiguration {
  return 'tenant_name' in config && 'base_url' in config;
}

/**
 * Check if configuration is for ServiceNow
 */
export function isServiceNowConfiguration(config: ConnectionConfiguration): config is ServiceNowConfiguration {
  return 'instance_url' in config && !('catalog' in config) && !('api_version' in config || ('api_version' in config && !('tenant_name' in config)));
}

/**
 * Check if configuration is for File System
 */
export function isFileSystemConfiguration(config: ConnectionConfiguration): config is FileSystemConfiguration {
  return 'base_path' in config && 'supported_formats' in config;
}

// =====================================================
// Helper Functions
// =====================================================

/**
 * Get human-readable label for connection type
 */
export function getConnectionTypeLabel(type: ConnectionType): string {
  const labels: Record<ConnectionType, string> = {
    [ConnectionType.MSSQL]: 'Microsoft SQL Server',
    [ConnectionType.Databricks]: 'Databricks',
    [ConnectionType.Snowflake]: 'Snowflake',
    [ConnectionType.Salesforce]: 'Salesforce',
    [ConnectionType.Workday]: 'Workday',
    [ConnectionType.ServiceNow]: 'ServiceNow',
    [ConnectionType.FileSystem]: 'File System',
    [ConnectionType.REST]: 'REST API'
  };
  return labels[type];
}

/**
 * Get color for test status badge
 */
export function getTestStatusColor(status: TestStatus | null): string {
  if (!status) return 'gray';

  const colors: Record<TestStatus, string> = {
    [TestStatus.Success]: 'green',
    [TestStatus.Failed]: 'red',
    [TestStatus.Pending]: 'yellow',
    [TestStatus.Untested]: 'gray'
  };
  return colors[status];
}

/**
 * Get human-readable label for test status
 */
export function getTestStatusLabel(status: TestStatus | null): string {
  if (!status) return 'Not Tested';

  const labels: Record<TestStatus, string> = {
    [TestStatus.Success]: 'Connected',
    [TestStatus.Failed]: 'Failed',
    [TestStatus.Pending]: 'Testing...',
    [TestStatus.Untested]: 'Not Tested'
  };
  return labels[status];
}

/**
 * Validate connection name
 */
export function validateConnectionName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: 'Connection name is required' };
  }
  if (name.length < 3) {
    return { valid: false, error: 'Connection name must be at least 3 characters' };
  }
  if (name.length > 100) {
    return { valid: false, error: 'Connection name must not exceed 100 characters' };
  }
  return { valid: true };
}

/**
 * Get default configuration for connection type
 */
export function getDefaultConfiguration(type: ConnectionType): Partial<ConnectionConfiguration> {
  switch (type) {
    case ConnectionType.MSSQL:
      return {
        port: 1433,
        authentication: { type: 'sql_auth', username: '', password: '' },
        encryption: { mode: 'Mandatory', trust_server_certificate: false }
      } as Partial<MSSQLConfiguration>;

    case ConnectionType.Salesforce:
      return {
        api_version: 'v60.0',
        authentication: { type: 'oauth', client_id: '', client_secret: '' }
      } as Partial<SalesforceConfiguration>;

    case ConnectionType.Databricks:
      return {
        catalog: 'main',
        schema: 'default',
        compute: { compute_type: 'serverless' },
        authentication: { type: 'pat', token: '' }
      } as Partial<DatabricksConfiguration>;

    case ConnectionType.FileSystem:
      return {
        type: 'local',
        supported_formats: ['csv', 'json', 'parquet']
      } as Partial<FileSystemConfiguration>;

    default:
      return {};
  }
}
