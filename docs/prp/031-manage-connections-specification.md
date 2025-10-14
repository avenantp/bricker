# Feature 3: Create and Manage Connections - Technical Specification

## 1. Overview

### 1.1 Purpose
Enable users to create, manage, and test connections to various data sources (Microsoft SQL Server, Salesforce, Workday, ServiceNow, File Systems) and the target Databricks platform. Include metadata import capabilities and connection-specific editor dialogs.

### 1.2 Key Features
- Multi-vendor connection support (MSSQL, Salesforce, Workday, ServiceNow, File Systems, Databricks)
- Connection CRUD operations with encryption
- Connection testing and validation
- Metadata import from source systems
- Connection-specific editor dialogs
- Connection pooling and lifecycle management
- Account-level isolation and access control

### 1.3 Architecture Context
```
User Interface (React)
    ↓
Connection Service Layer
    ↓
Connection Adapters (per vendor)
    ↓
Source Systems / Databricks Platform
```

---

## 2. Data Model

### 2.1 Enhanced Connections Table

```sql
CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  
  -- Identity
  name VARCHAR NOT NULL,
  description TEXT,
  
  -- Connection Type
  connection_type VARCHAR NOT NULL CHECK (
    connection_type IN (
      'MSSQL', 
      'Databricks', 
      'Snowflake', 
      'Salesforce', 
      'Workday',
      'ServiceNow',
      'FileSystem',
      'REST'
    )
  ),
  
  -- Configuration (encrypted)
  configuration JSONB NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_tested_at TIMESTAMP,
  test_status VARCHAR CHECK (test_status IN ('success', 'failed', 'pending', 'untested')),
  test_error_message TEXT,
  
  -- Metadata Import Settings
  import_settings JSONB DEFAULT '{}',
  last_import_at TIMESTAMP,
  
  -- Ownership and Security
  owner_id UUID REFERENCES users(id),
  visibility VARCHAR NOT NULL DEFAULT 'private' CHECK (visibility IN ('public', 'private', 'locked')),
  is_locked BOOLEAN DEFAULT false,
  
  -- Audit
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(account_id, workspace_id, name)
);

CREATE INDEX idx_connections_account ON connections(account_id);
CREATE INDEX idx_connections_workspace ON connections(workspace_id);
CREATE INDEX idx_connections_owner ON connections(owner_id);
CREATE INDEX idx_connections_type ON connections(connection_type);
CREATE INDEX idx_connections_status ON connections(is_active);

-- Enable RLS
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;

-- Users can only see connections in their account
CREATE POLICY connections_isolation_policy ON connections
  FOR SELECT
  USING (account_id = (SELECT account_id FROM account_users WHERE user_id = auth.uid()));

-- Only owner and admins can update
CREATE POLICY connections_update_policy ON connections
  FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR
    (SELECT role FROM account_users WHERE user_id = auth.uid() AND account_id = connections.account_id) = 'admin'
  );
```

### 2.2 Connection Metadata Cache Table

```sql
CREATE TABLE connection_metadata_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
  
  -- Metadata Type
  metadata_type VARCHAR NOT NULL CHECK (
    metadata_type IN ('schema', 'table', 'column', 'index', 'constraint')
  ),
  
  -- Metadata Content
  metadata JSONB NOT NULL,
  
  -- Caching
  cached_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_stale BOOLEAN DEFAULT false,
  
  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_connection_metadata_connection ON connection_metadata_cache(connection_id);
CREATE INDEX idx_connection_metadata_type ON connection_metadata_cache(metadata_type);
CREATE INDEX idx_connection_metadata_stale ON connection_metadata_cache(is_stale) WHERE is_stale = true;
```

### 2.3 Connection Configuration Schemas

#### 2.3.1 Microsoft SQL Server
```json
{
  "server": "sql-server.example.com",
  "port": 1433,
  "database": "AdventureWorks",
  "authentication": {
    "type": "sql_auth",
    "username": "encrypted:abc123",
    "password": "encrypted:def456"
  },
  "ssl": {
    "enabled": true,
    "trust_server_certificate": false
  },
  "advanced": {
    "connection_timeout": 30,
    "command_timeout": 300,
    "application_name": "Bricker_MetadataManager"
  },
  "cdc": {
    "enabled": false,
    "tracking_tables": []
  }
}
```

#### 2.3.2 Salesforce
```json
{
  "instance_url": "https://na1.salesforce.com",
  "authentication": {
    "type": "oauth",
    "client_id": "encrypted:abc123",
    "client_secret": "encrypted:def456",
    "refresh_token": "encrypted:ghi789",
    "access_token": "encrypted:jkl012",
    "expires_at": "2025-12-31T23:59:59Z"
  },
  "api_version": "v60.0",
  "advanced": {
    "batch_size": 2000,
    "rate_limit_per_day": 100000
  }
}
```

#### 2.3.3 Workday
```json
{
  "tenant_name": "company_impl",
  "base_url": "https://wd2-impl.workday.com",
  "authentication": {
    "type": "integration_system_user",
    "username": "encrypted:abc123",
    "password": "encrypted:def456"
  },
  "api_version": "v41.0",
  "advanced": {
    "timeout": 60,
    "page_size": 100
  }
}
```

#### 2.3.4 ServiceNow
```json
{
  "instance_url": "https://dev12345.service-now.com",
  "authentication": {
    "type": "basic",
    "username": "encrypted:abc123",
    "password": "encrypted:def456"
  },
  "api_version": "now/table",
  "advanced": {
    "page_size": 1000,
    "rate_limit": 1000
  }
}
```

#### 2.3.5 File System
```json
{
  "type": "local",
  "base_path": "/data/imports",
  "authentication": {
    "type": "none"
  },
  "supported_formats": ["csv", "json", "parquet", "avro", "xml"],
  "advanced": {
    "recursive": true,
    "pattern": "*.csv"
  }
}
```

#### 2.3.6 Databricks (Target Platform)
```json
{
  "workspace_url": "https://dbc-12345678-9abc.cloud.databricks.com",
  "authentication": {
    "type": "pat",
    "token": "encrypted:abc123"
  },
  "catalog": "main",
  "schema": "default",
  "compute": {
    "cluster_id": "1234-567890-abc123",
    "warehouse_id": "abc123def456",
    "compute_type": "serverless"
  },
  "advanced": {
    "timeout": 300,
    "enable_unity_catalog": true
  }
}
```

---

## 3. Service Layer Architecture

### 3.1 Connection Service Interface

```typescript
// frontend/src/lib/connections/connection-service.ts

export interface ConnectionService {
  // CRUD Operations
  createConnection(connection: CreateConnectionInput): Promise<Connection>;
  getConnection(connectionId: string): Promise<Connection>;
  updateConnection(connectionId: string, updates: UpdateConnectionInput): Promise<Connection>;
  deleteConnection(connectionId: string): Promise<void>;
  listConnections(workspaceId: string, filters?: ConnectionFilters): Promise<Connection[]>;
  
  // Testing
  testConnection(connectionId: string): Promise<TestConnectionResult>;
  
  // Metadata Import
  importMetadata(connectionId: string, options: ImportMetadataOptions): Promise<ImportMetadataResult>;
  
  // Schema Discovery
  listSchemas(connectionId: string): Promise<SchemaInfo[]>;
  listTables(connectionId: string, schema: string): Promise<TableInfo[]>;
  getTableMetadata(connectionId: string, schema: string, table: string): Promise<TableMetadata>;
}
```

### 3.2 Connection Adapter Pattern

```typescript
// frontend/src/lib/connections/adapters/base-adapter.ts

export abstract class BaseConnectionAdapter {
  protected connection: Connection;
  
  constructor(connection: Connection) {
    this.connection = connection;
  }
  
  abstract test(): Promise<TestConnectionResult>;
  abstract listSchemas(): Promise<SchemaInfo[]>;
  abstract listTables(schema: string): Promise<TableInfo[]>;
  abstract getTableMetadata(schema: string, table: string): Promise<TableMetadata>;
  abstract importMetadata(options: ImportMetadataOptions): Promise<ImportMetadataResult>;
}
```

### 3.3 Vendor-Specific Adapters

```typescript
// frontend/src/lib/connections/adapters/mssql-adapter.ts
export class MSSQLAdapter extends BaseConnectionAdapter {
  async test(): Promise<TestConnectionResult> {
    // Test SQL Server connection
  }
  
  async listSchemas(): Promise<SchemaInfo[]> {
    // Query sys.schemas
  }
  
  async listTables(schema: string): Promise<TableInfo[]> {
    // Query sys.tables
  }
  
  async getTableMetadata(schema: string, table: string): Promise<TableMetadata> {
    // Query sys.columns, sys.indexes, sys.foreign_keys
  }
  
  async importMetadata(options: ImportMetadataOptions): Promise<ImportMetadataResult> {
    // Import table definitions and create datasets
  }
}

// frontend/src/lib/connections/adapters/salesforce-adapter.ts
export class SalesforceAdapter extends BaseConnectionAdapter {
  // Salesforce-specific implementation
}

// Similar for Workday, ServiceNow, FileSystem, Databricks
```

### 3.4 Connection Factory

```typescript
// frontend/src/lib/connections/connection-factory.ts

export class ConnectionFactory {
  static createAdapter(connection: Connection): BaseConnectionAdapter {
    switch (connection.connection_type) {
      case 'MSSQL':
        return new MSSQLAdapter(connection);
      case 'Salesforce':
        return new SalesforceAdapter(connection);
      case 'Workday':
        return new WorkdayAdapter(connection);
      case 'ServiceNow':
        return new ServiceNowAdapter(connection);
      case 'FileSystem':
        return new FileSystemAdapter(connection);
      case 'Databricks':
        return new DatabricksAdapter(connection);
      default:
        throw new Error(`Unsupported connection type: ${connection.connection_type}`);
    }
  }
}
```

---

## 4. UI Components

### 4.1 Connection List Page

```typescript
// frontend/src/pages/ConnectionsPage.tsx

export function ConnectionsPage() {
  return (
    <div>
      <ConnectionsHeader />
      <ConnectionFilters />
      <ConnectionsList />
      <CreateConnectionFAB />
    </div>
  );
}
```

### 4.2 Connection Card Component

```typescript
// frontend/src/components/Connections/ConnectionCard.tsx

interface ConnectionCardProps {
  connection: Connection;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onTest: (id: string) => void;
  onImport: (id: string) => void;
}

export function ConnectionCard({ connection, onEdit, onDelete, onTest, onImport }: ConnectionCardProps) {
  return (
    <Card>
      <ConnectionTypeIcon type={connection.connection_type} />
      <ConnectionName>{connection.name}</ConnectionName>
      <ConnectionStatus status={connection.test_status} />
      <ConnectionActions>
        <Button onClick={() => onTest(connection.id)}>Test</Button>
        <Button onClick={() => onImport(connection.id)}>Import Metadata</Button>
        <Button onClick={() => onEdit(connection.id)}>Edit</Button>
        <Button onClick={() => onDelete(connection.id)}>Delete</Button>
      </ConnectionActions>
    </Card>
  );
}
```

### 4.3 Connection Editor Dialogs (Vendor-Specific)

```typescript
// frontend/src/components/Connections/Editors/MSSQLConnectionEditor.tsx

interface MSSQLConnectionEditorProps {
  connection?: Connection;
  onSave: (connection: CreateConnectionInput) => Promise<void>;
  onCancel: () => void;
}

export function MSSQLConnectionEditor({ connection, onSave, onCancel }: MSSQLConnectionEditorProps) {
  const [config, setConfig] = useState<MSSQLConfiguration>(connection?.configuration || defaultConfig);
  
  return (
    <Dialog>
      <DialogHeader>
        <h2>{connection ? 'Edit' : 'Create'} SQL Server Connection</h2>
      </DialogHeader>
      
      <DialogBody>
        <FormField label="Connection Name" required>
          <Input value={config.name} onChange={(e) => setConfig({...config, name: e.target.value})} />
        </FormField>
        
        <FormField label="Server" required>
          <Input value={config.server} onChange={(e) => setConfig({...config, server: e.target.value})} />
        </FormField>
        
        <FormField label="Port">
          <Input type="number" value={config.port} onChange={(e) => setConfig({...config, port: parseInt(e.target.value)})} />
        </FormField>
        
        <FormField label="Database" required>
          <Input value={config.database} onChange={(e) => setConfig({...config, database: e.target.value})} />
        </FormField>
        
        <FormField label="Authentication Type">
          <Select value={config.authentication.type} onChange={(value) => setConfig({...config, authentication: {...config.authentication, type: value}})}>
            <option value="sql_auth">SQL Authentication</option>
            <option value="windows_auth">Windows Authentication</option>
            <option value="azure_ad">Azure AD</option>
          </Select>
        </FormField>
        
        <FormField label="Username" required>
          <Input value={config.authentication.username} onChange={(e) => setConfig({...config, authentication: {...config.authentication, username: e.target.value}})} />
        </FormField>
        
        <FormField label="Password" required>
          <Input type="password" value={config.authentication.password} onChange={(e) => setConfig({...config, authentication: {...config.authentication, password: e.target.value}})} />
        </FormField>
        
        <Accordion title="Advanced Settings">
          <FormField label="Connection Timeout (seconds)">
            <Input type="number" value={config.advanced.connection_timeout} />
          </FormField>
          <FormField label="Command Timeout (seconds)">
            <Input type="number" value={config.advanced.command_timeout} />
          </FormField>
          <FormField label="Enable SSL">
            <Checkbox checked={config.ssl.enabled} />
          </FormField>
        </Accordion>
        
        <Accordion title="CDC Settings">
          <FormField label="Enable CDC Tracking">
            <Checkbox checked={config.cdc.enabled} />
          </FormField>
        </Accordion>
      </DialogBody>
      
      <DialogFooter>
        <Button variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" onClick={() => onSave(config)}>Test & Save</Button>
      </DialogFooter>
    </Dialog>
  );
}
```

### 4.4 Metadata Import Dialog

```typescript
// frontend/src/components/Connections/MetadataImportDialog.tsx

interface MetadataImportDialogProps {
  connection: Connection;
  onImport: (options: ImportMetadataOptions) => Promise<ImportMetadataResult>;
  onClose: () => void;
}

export function MetadataImportDialog({ connection, onImport, onClose }: MetadataImportDialogProps) {
  const [step, setStep] = useState<'select' | 'configure' | 'preview' | 'importing' | 'complete'>('select');
  const [selectedTables, setSelectedTables] = useState<TableInfo[]>([]);
  const [importOptions, setImportOptions] = useState<ImportMetadataOptions>({});
  
  return (
    <Dialog size="large">
      <DialogHeader>
        <h2>Import Metadata from {connection.name}</h2>
        <StepIndicator currentStep={step} />
      </DialogHeader>
      
      <DialogBody>
        {step === 'select' && (
          <SchemaTableSelector 
            connection={connection}
            onSelect={setSelectedTables}
          />
        )}
        
        {step === 'configure' && (
          <ImportOptionsForm
            tables={selectedTables}
            options={importOptions}
            onChange={setImportOptions}
          />
        )}
        
        {step === 'preview' && (
          <ImportPreview
            tables={selectedTables}
            options={importOptions}
          />
        )}
        
        {step === 'importing' && (
          <ImportProgress />
        )}
        
        {step === 'complete' && (
          <ImportSummary result={importResult} />
        )}
      </DialogBody>
      
      <DialogFooter>
        <Button onClick={onClose}>Close</Button>
        {step !== 'complete' && (
          <Button variant="primary" onClick={handleNext}>
            {step === 'preview' ? 'Import' : 'Next'}
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
}
```

---

## 5. Security Considerations

### 5.1 Credential Encryption

```typescript
// backend/src/lib/encryption-service.ts

export class EncryptionService {
  private static algorithm = 'aes-256-gcm';
  private static key = process.env.ENCRYPTION_KEY;
  
  static encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return `encrypted:${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
  }
  
  static decrypt(ciphertext: string): string {
    if (!ciphertext.startsWith('encrypted:')) {
      throw new Error('Invalid encrypted value');
    }
    
    const parts = ciphertext.split(':');
    const iv = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const authTag = Buffer.from(parts[3], 'hex');
    
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

### 5.2 Row-Level Security

- Connections isolated by `account_id`
- Only owners and admins can edit connections
- Visibility controls (public/private/locked)
- Audit logging for all connection operations

---

## 6. Testing Strategy

### 6.1 Unit Tests
- Test each connection adapter independently
- Test encryption/decryption
- Test connection validation logic
- Test metadata extraction

### 6.2 Integration Tests
- Test connection to real databases (test environments)
- Test metadata import end-to-end
- Test error handling (invalid credentials, network errors)

### 6.3 Security Tests
- Test credential encryption
- Test RLS policies
- Test access control
- Test injection attacks

---

## 7. Performance Considerations

### 7.1 Connection Pooling
- Reuse connections where possible
- Implement connection timeout
- Close connections after operations

### 7.2 Metadata Caching
- Cache schema/table metadata
- Set expiration times
- Invalidate cache on schema changes

### 7.3 Rate Limiting
- Respect API rate limits (Salesforce, Workday, ServiceNow)
- Implement exponential backoff
- Queue requests when rate limit hit

---

## 8. Error Handling

### 8.1 Connection Errors
- Network timeout
- Invalid credentials
- Firewall blocks
- SSL certificate errors

### 8.2 Metadata Import Errors
- Large table handling
- Permission errors
- Unsupported data types
- Circular references

### 8.3 User-Friendly Messages
- "Unable to connect to SQL Server at sql-server.example.com:1433. Please check the server address and firewall settings."
- "Authentication failed. Please verify your username and password."
- "The table 'Sales.Orders' contains 10 million rows. Import may take several minutes."

---

## 9. Future Enhancements

- Support for more connection types (Oracle, PostgreSQL, MySQL, BigQuery)
- Connection health monitoring (periodic testing)
- Connection usage analytics
- Shared connection pools
- Connection templates (pre-configured for common scenarios)
- Connection migration tool (move connections between workspaces)
