# Connection Types Specification

## Overview

Based on the connection screenshots, we need to support different connection types with type-specific fields. This document outlines the database schema changes and UI components needed.

## Connection Types Analysis

### 1. File Connection (Azure Data Lake Store)
**Screenshot**: `sample-connection-file.png`

Fields:
- `connection` (name) - "AWLT_PARQ_AZDLS"
- `medallion_layer` - "Source" (dropdown) - maps to "Source System" in UI
- `connection_type` - "Azure Data Lake Store" (dropdown)
- `display_folder` - "SRC"
- `description` - (text area)
- `container` - "source"
- `external_location` - "abfss://source@lakehouse.dfs.core.windows.net/"
- `record_source` - "awpq"

**Use Case**: Cloud storage connections (ADLS, S3, Azure Blob)

### 2. SQL Server Connection
**Screenshot**: `sample-connection-mssql.png`

Fields:
- `connection` (name) - "AWLT_CDC_SRC"
- `medallion_layer` - "Source" (dropdown) - maps to "Source System" in UI
- `system_type` - "Microsoft SQL Server" (dropdown)
- `display_folder` - "SRC"
- `description` - (text area)
- `connection_string` - (encrypted/hidden)
- `database` - "AdventureWorksLT2012CDC"
- `record_source` - "awcdc"

**Use Case**: Relational database connections (SQL Server, PostgreSQL, Oracle, MySQL)

### 3. Databricks Connection
**Screenshot**: `sample-connection-databricks.png`

Fields:
- `connection` (name) - "BFX_DV"
- `medallion_layer` - Could be "Silver" or "Gold" (dropdown) - "Data Vault" is a specialized pattern
- `system_type` - "Databricks" (dropdown)
- `display_folder` - (text input)
- `description` - (text area)
- `connection_string` - (encrypted/hidden)
- `catalog` - "bfx-sql-dv"
- `external_location` - "abfss://bfx-sql-dv@bfxdbrdvlakehouseadls.dfs.core.windows.net/"

**Use Case**: Databricks/Unity Catalog connections

## Database Schema Changes

### Migration 07: Add Connection Metadata Fields

**File**: `supabase/migrations/07_add_connection_metadata_fields.sql`

New columns added to `connections` table:
```sql
-- Note: medallion_layer already exists from migration 06 (used for integration stage)
- system_type VARCHAR                -- Microsoft SQL Server, Azure Data Lake Store, Databricks, etc.
- display_folder VARCHAR             -- Folder for organizing connections (SRC, TGT, DV)
- container VARCHAR                  -- Container for file connections (Azure Blob, ADLS, S3)
- external_location TEXT             -- Cloud storage URL (abfss://, s3://, etc.)
- record_source VARCHAR              -- Record source identifier for lineage
- catalog VARCHAR                    -- Catalog name for Databricks/Unity Catalog
- connection_string_encrypted TEXT   -- Encrypted connection string
```

**Status**: ✅ Created

## Type Definitions

### Update `frontend/src/types/connection.ts`

```typescript
export interface Connection {
  // Existing fields
  id: string;
  account_id: string;
  name: string;
  description?: string;
  connection_type: ConnectionType;

  // Medallion layer (already exists from migration 06, used for integration stage)
  medallion_layer?: 'Source' | 'Raw' | 'Bronze' | 'Silver' | 'Gold';

  // NEW: Metadata fields
  system_type?: string;  // Microsoft SQL Server, Azure Data Lake Store, Databricks, PostgreSQL, etc.
  display_folder?: string;  // SRC, TGT, DV, etc.
  record_source?: string;

  // NEW: Type-specific fields
  container?: string;  // For file connections
  external_location?: string;  // For file/Databricks connections
  catalog?: string;  // For Databricks connections
  connection_string_encrypted?: string;  // For database connections

  // Existing database connection fields
  host?: string;
  port?: number;
  database_name?: string;
  username?: string;
  password_encrypted?: string;
  additional_properties?: Record<string, any>;

  // Audit fields
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export enum MedallionLayer {
  SOURCE = 'Source',
  RAW = 'Raw',
  BRONZE = 'Bronze',
  SILVER = 'Silver',
  GOLD = 'Gold'
}

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
```

## UI Component Updates

### 1. Connection Form Fields Component

Create a dynamic form that shows/hides fields based on connection type.

**File**: `frontend/src/components/Connections/ConnectionFormFields.tsx`

```typescript
interface ConnectionFormFieldsProps {
  systemType: SystemType;
  values: Partial<Connection>;
  onChange: (field: string, value: any) => void;
  errors?: Record<string, string>;
}

export function ConnectionFormFields({ systemType, values, onChange, errors }: ConnectionFormFieldsProps) {
  // Common fields (always shown)
  const renderCommonFields = () => (
    <>
      <DialogField label="Connection Name" required>
        <DialogInput
          value={values.name || ''}
          onChange={(e) => onChange('name', e.target.value)}
          error={errors?.name}
        />
      </DialogField>

      <DialogField label="Medallion Layer" required>
        <select
          value={values.medallion_layer || ''}
          onChange={(e) => onChange('medallion_layer', e.target.value)}
        >
          <option value="">Select Layer...</option>
          {Object.values(MedallionLayer).map(layer => (
            <option key={layer} value={layer}>{layer}</option>
          ))}
        </select>
      </DialogField>

      <DialogField label="System Type" required>
        <select
          value={values.system_type || ''}
          onChange={(e) => onChange('system_type', e.target.value)}
        >
          <option value="">Select System Type...</option>
          {Object.values(SystemType).map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
      </DialogField>

      <DialogField label="Display Folder">
        <DialogInput
          value={values.display_folder || ''}
          onChange={(e) => onChange('display_folder', e.target.value)}
          placeholder="SRC, TGT, DV, etc."
        />
      </DialogField>

      <DialogField label="Record Source">
        <DialogInput
          value={values.record_source || ''}
          onChange={(e) => onChange('record_source', e.target.value)}
        />
      </DialogField>

      <DialogField label="Description">
        <DialogTextarea
          value={values.description || ''}
          onChange={(e) => onChange('description', e.target.value)}
        />
      </DialogField>
    </>
  );

  // Database connection fields
  const renderDatabaseFields = () => (
    <>
      <DialogField label="Connection String" required>
        <DialogInput
          type="password"
          value={values.connection_string_encrypted || ''}
          onChange={(e) => onChange('connection_string_encrypted', e.target.value)}
          placeholder="Server=...;Database=...;User Id=...;Password=..."
        />
      </DialogField>

      <DialogField label="Database" required>
        <DialogInput
          value={values.database_name || ''}
          onChange={(e) => onChange('database_name', e.target.value)}
        />
      </DialogField>
    </>
  );

  // File storage connection fields
  const renderFileStorageFields = () => (
    <>
      <DialogField label="Container" required>
        <DialogInput
          value={values.container || ''}
          onChange={(e) => onChange('container', e.target.value)}
          placeholder="container-name"
        />
      </DialogField>

      <DialogField label="External Location" required>
        <DialogInput
          value={values.external_location || ''}
          onChange={(e) => onChange('external_location', e.target.value)}
          placeholder="abfss://container@account.dfs.core.windows.net/"
        />
      </DialogField>
    </>
  );

  // Databricks connection fields
  const renderDatabricksFields = () => (
    <>
      <DialogField label="Connection String" required>
        <DialogInput
          type="password"
          value={values.connection_string_encrypted || ''}
          onChange={(e) => onChange('connection_string_encrypted', e.target.value)}
          placeholder="Server=...;Port=443;HTTPPath=..."
        />
      </DialogField>

      <DialogField label="Catalog" required>
        <DialogInput
          value={values.catalog || ''}
          onChange={(e) => onChange('catalog', e.target.value)}
        />
      </DialogField>

      <DialogField label="External Location">
        <DialogInput
          value={values.external_location || ''}
          onChange={(e) => onChange('external_location', e.target.value)}
          placeholder="abfss://catalog@storage.dfs.core.windows.net/"
        />
      </DialogField>
    </>
  );

  // Determine which type-specific fields to show
  const renderTypeSpecificFields = () => {
    switch (systemType) {
      case SystemType.MSSQL:
      case SystemType.POSTGRESQL:
      case SystemType.MYSQL:
      case SystemType.ORACLE:
      case SystemType.MARIADB:
        return renderDatabaseFields();

      case SystemType.AZURE_BLOB:
      case SystemType.AZURE_DATA_LAKE:
      case SystemType.AWS_S3:
      case SystemType.GOOGLE_CLOUD_STORAGE:
        return renderFileStorageFields();

      case SystemType.DATABRICKS:
        return renderDatabricksFields();

      default:
        return null;
    }
  };

  return (
    <>
      {renderCommonFields()}
      {renderTypeSpecificFields()}
    </>
  );
}
```

### 2. Update CreateConnectionDialog

**File**: `frontend/src/components/Connections/CreateConnectionDialog.tsx`

Replace the existing form with `ConnectionFormFields` component.

### 3. Update EditConnectionDialog

**File**: `frontend/src/components/Connections/EditConnectionDialog.tsx`

Replace the existing form with `ConnectionFormFields` component.

## Backend Updates

### Update Connection Routes

**File**: `backend/src/routes/connections.ts`

Update create/update handlers to accept new fields:

```typescript
// Create connection
router.post('/', async (req, res) => {
  const {
    name,
    description,
    connection_type,
    medallion_layer,
    system_type,
    display_folder,
    record_source,
    // Type-specific fields
    container,
    external_location,
    catalog,
    connection_string_encrypted,
    // Database fields
    host,
    port,
    database_name,
    username,
    password_encrypted,
    ...additional
  } = req.body;

  const { data, error } = await supabase
    .from('connections')
    .insert({
      account_id,
      name,
      description,
      connection_type,
      medallion_layer,
      system_type,
      display_folder,
      record_source,
      container,
      external_location,
      catalog,
      connection_string_encrypted,
      host,
      port,
      database_name,
      username,
      password_encrypted,
      additional_properties: additional
    })
    .select()
    .single();
});
```

## Implementation Checklist

### Database
- [x] Create migration 07 to add new columns to connections table
- [ ] Apply migration to database

### Types
- [ ] Update `frontend/src/types/connection.ts` with new fields
- [ ] Add `MedallionLayer` enum (Source, Raw, Bronze, Silver, Gold)
- [ ] Add `SystemType` enum

### UI Components
- [ ] Create `ConnectionFormFields.tsx` component
- [ ] Update `CreateConnectionDialog.tsx` to use new component
- [ ] Update `EditConnectionDialog.tsx` to use new component
- [ ] Add validation for required fields based on connection type

### Backend
- [ ] Update connection creation endpoint to handle new fields
- [ ] Update connection update endpoint to handle new fields
- [ ] Add validation for type-specific required fields

### Testing
- [ ] Test creating File connection (Azure Data Lake Store)
- [ ] Test creating SQL Server connection
- [ ] Test creating Databricks connection
- [ ] Test editing existing connections
- [ ] Test that fields show/hide correctly based on system type

## Migration Path

1. **Apply Database Migration**:
   ```
   Apply 07_add_connection_metadata_fields.sql in Supabase SQL Editor
   ```

2. **Update Types**: Add new fields and enums to connection types

3. **Create Form Component**: Build the dynamic connection form fields component

4. **Update Dialogs**: Replace forms in create/edit dialogs

5. **Update Backend**: Add field handling in connection routes

6. **Test**: Verify all connection types work correctly

## Notes

- **Medallion Layer Usage**: We use the existing `medallion_layer` column (from migration 06) for integration stage. The UI can display it as "Integration Stage" if needed, with labels like:
  - `Source` → "Source System"
  - `Raw` → "Raw"
  - `Bronze` → "Bronze"
  - `Silver` → "Silver" or "Data Vault"
  - `Gold` → "Gold" or "Curated"
- `system_type` provides more granularity than `connection_type`
- Sensitive fields like `connection_string_encrypted` should be handled securely
- Consider adding field-level encryption for connection strings
- Add proper validation for required fields based on system type
