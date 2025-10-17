using Microsoft.Data.SqlClient;
using SqlServerService.Models;
using System.Data;

namespace SqlServerService.Services;

public class SqlServerConnectionService
{
    private readonly ILogger<SqlServerConnectionService> _logger;

    public SqlServerConnectionService(ILogger<SqlServerConnectionService> logger)
    {
        _logger = logger;
    }

    public string BuildConnectionString(ConnectionRequest request)
    {
        var builder = new SqlConnectionStringBuilder
        {
            DataSource = request.Server == "." ? "localhost" : request.Server,
            InitialCatalog = string.IsNullOrEmpty(request.Database) ? "master" : request.Database,
            ConnectTimeout = 30,
            ApplicationName = "Uroq_SqlServerService"
        };

        // Handle port if not default
        if (request.Port != 1433 && request.Port > 0)
        {
            builder.DataSource = $"{builder.DataSource},{request.Port}";
        }

        // Handle authentication
        switch (request.Authentication.Type.ToLower())
        {
            case "sql_auth":
                builder.UserID = request.Authentication.Username;
                builder.Password = request.Authentication.Password;
                builder.IntegratedSecurity = false;
                break;

            case "windows_auth":
                builder.IntegratedSecurity = true;
                break;

            case "azure_ad":
                builder.Authentication = SqlAuthenticationMethod.ActiveDirectoryPassword;
                builder.UserID = request.Authentication.Username;
                builder.Password = request.Authentication.Password;
                break;

            default:
                throw new ArgumentException($"Unknown authentication type: {request.Authentication.Type}");
        }

        // Handle encryption
        switch (request.Encryption.Mode.ToLower())
        {
            case "mandatory":
                builder.Encrypt = true;
                break;
            case "optional":
                builder.Encrypt = false;
                break;
            case "strict":
                builder.Encrypt = true;
                break;
        }

        builder.TrustServerCertificate = request.Encryption.TrustServerCertificate;

        // For local SQL Server instances, adjust encryption settings for compatibility
        if (IsLocalServer(request.Server))
        {
            if (builder.Encrypt && request.Encryption.Mode.ToLower() == "mandatory")
            {
                _logger.LogInformation("Local SQL Server detected - downgrading encryption to Optional for compatibility");
                builder.Encrypt = false;
            }

            if (!builder.TrustServerCertificate)
            {
                _logger.LogInformation("Local SQL Server detected - enabling TrustServerCertificate");
                builder.TrustServerCertificate = true;
            }
        }

        return builder.ConnectionString;
    }

    private bool IsLocalServer(string server)
    {
        var normalized = server.Trim().ToLower();
        var localIdentifiers = new[] { "localhost", "127.0.0.1", "::1", ".", "(local)", "(localdb)" };

        if (localIdentifiers.Contains(normalized))
            return true;

        if (normalized.StartsWith("localhost\\") ||
            normalized.StartsWith(".\\") ||
            normalized.StartsWith("(local)\\") ||
            normalized.StartsWith("127.0.0.1\\") ||
            normalized.StartsWith("(localdb)\\"))
            return true;

        var hostname = Environment.MachineName.ToLower();
        return normalized == hostname || normalized.StartsWith($"{hostname}\\");
    }

    public async Task<ConnectionResponse> TestConnectionAsync(ConnectionRequest request)
    {
        try
        {
            var connectionString = BuildConnectionString(request);
            _logger.LogInformation("Testing connection to {Server}", request.Server);

            using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync();

            _logger.LogInformation("Connection successful");

            // List databases
            var databases = await ListDatabasesInternalAsync(connection, IsAzureSqlDatabase(request.Server));

            return new ConnectionResponse
            {
                Success = true,
                Message = "Connection successful",
                Databases = databases
            };
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "SQL connection failed: {Message}", ex.Message);
            return new ConnectionResponse
            {
                Success = false,
                Message = $"Connection failed: {ex.Message}",
                Error = ex.Message,
                ErrorCode = ex.Number.ToString(),
                Databases = new List<string>()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Connection failed: {Message}", ex.Message);
            return new ConnectionResponse
            {
                Success = false,
                Message = $"Connection failed: {ex.Message}",
                Error = ex.Message,
                Databases = new List<string>()
            };
        }
    }

    public async Task<DatabaseListResponse> ListDatabasesAsync(ConnectionRequest request)
    {
        try
        {
            var connectionString = BuildConnectionString(request);
            _logger.LogInformation("Listing databases for {Server}", request.Server);

            using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync();

            var databases = await ListDatabasesInternalAsync(connection, IsAzureSqlDatabase(request.Server));

            return new DatabaseListResponse
            {
                Success = true,
                Databases = databases,
                Message = $"Found {databases.Count} database(s)"
            };
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "Failed to list databases: {Message}", ex.Message);
            return new DatabaseListResponse
            {
                Success = false,
                Message = $"Failed to list databases: {ex.Message}",
                Error = ex.Message,
                Databases = new List<string>()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to list databases: {Message}", ex.Message);
            return new DatabaseListResponse
            {
                Success = false,
                Message = $"Failed to list databases: {ex.Message}",
                Error = ex.Message,
                Databases = new List<string>()
            };
        }
    }

    private async Task<List<string>> ListDatabasesInternalAsync(SqlConnection connection, bool isAzure)
    {
        var databases = new List<string>();

        string query;
        if (isAzure)
        {
            // Azure SQL Database - exclude system databases
            query = "SELECT [name] FROM sys.databases WHERE [name] NOT IN ('master', 'tempdb', 'model', 'msdb')";
        }
        else
        {
            // Regular SQL Server - only show databases the user has access to
            query = "SELECT [name] FROM sys.databases WHERE CAST(ISNULL(HAS_DBACCESS([name]), 0) AS BIT) = 1";
        }

        using var command = new SqlCommand(query, connection);
        using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            databases.Add(reader.GetString(0));
        }

        return databases;
    }

    public async Task<SchemaListResponse> ListSchemasAsync(ConnectionRequest request)
    {
        try
        {
            var connectionString = BuildConnectionString(request);
            _logger.LogInformation("Listing schemas for {Server}", request.Server);

            using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync();

            var schemas = new List<SchemaInfo>();

            const string query = @"
                SELECT  TABLE_SCHEMA AS SCHEMA_NAME, COUNT(*) AS TABLE_COUNT
                FROM    INFORMATION_SCHEMA.TABLES
                GROUP BY TABLE_SCHEMA
                ORDER BY TABLE_SCHEMA";

            using var command = new SqlCommand(query, connection);
            using var reader = await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                schemas.Add(new SchemaInfo
                {
                    Name = reader.GetString(0),
                    TableCount = reader.GetInt32(1)
                });
            }

            return new SchemaListResponse
            {
                Success = true,
                Schemas = schemas,
                Message = $"Found {schemas.Count} schema(s)"
            };
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "Failed to list schemas: {Message}", ex.Message);
            return new SchemaListResponse
            {
                Success = false,
                Message = $"Failed to list schemas: {ex.Message}",
                Error = ex.Message,
                Schemas = new List<SchemaInfo>()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to list schemas: {Message}", ex.Message);
            return new SchemaListResponse
            {
                Success = false,
                Message = $"Failed to list schemas: {ex.Message}",
                Error = ex.Message,
                Schemas = new List<SchemaInfo>()
            };
        }
    }

    public async Task<TableListResponse> ListTablesAsync(ConnectionRequest request, string? schema = null)
    {
        try
        {
            var connectionString = BuildConnectionString(request);
            _logger.LogInformation("Listing tables for {Database} on {Server}", request.Database, request.Server);

            using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync();

            var tables = new List<TableInfo>();

            string query;
            if (!string.IsNullOrEmpty(schema))
            {
                query = @"
                    SELECT
                        TABLE_SCHEMA,
                        TABLE_NAME
                    FROM INFORMATION_SCHEMA.TABLES
                    WHERE TABLE_TYPE = 'BASE TABLE'
                      AND TABLE_SCHEMA = @Schema
                    ORDER BY TABLE_NAME";
            }
            else
            {
                query = @"
                    SELECT
                        TABLE_SCHEMA,
                        TABLE_NAME
                    FROM INFORMATION_SCHEMA.TABLES
                    WHERE TABLE_TYPE = 'BASE TABLE'
                    ORDER BY TABLE_SCHEMA, TABLE_NAME";
            }

            using var command = new SqlCommand(query, connection);
            if (!string.IsNullOrEmpty(schema))
            {
                command.Parameters.AddWithValue("@Schema", schema);
            }

            using var reader = await command.ExecuteReaderAsync();

            while (await reader.ReadAsync())
            {
                tables.Add(new TableInfo
                {
                    Schema = reader.GetString(0),
                    Name = reader.GetString(1)
                });
            }

            return new TableListResponse
            {
                Success = true,
                Tables = tables,
                Message = $"Found {tables.Count} table(s)"
            };
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "Failed to list tables: {Message}", ex.Message);
            return new TableListResponse
            {
                Success = false,
                Message = $"Failed to list tables: {ex.Message}",
                Error = ex.Message,
                Tables = new List<TableInfo>()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to list tables: {Message}", ex.Message);
            return new TableListResponse
            {
                Success = false,
                Message = $"Failed to list tables: {ex.Message}",
                Error = ex.Message,
                Tables = new List<TableInfo>()
            };
        }
    }

    private bool IsAzureSqlDatabase(string server)
    {
        var lowerServer = server.ToLower();
        return lowerServer.Contains(".database.windows.net") ||
               lowerServer.Contains(".database.azure.com") ||
               lowerServer.Contains(".database.chinacloudapi.cn") ||
               lowerServer.Contains(".database.usgovcloudapi.net") ||
               lowerServer.Contains(".database.cloudapi.de");
    }

    /// <summary>
    /// Extract metadata for specified tables including columns, keys, and indexes
    /// </summary>
    public async Task<MetadataExtractionResponse> ExtractMetadataAsync(MetadataExtractionRequest request)
    {
        try
        {
            var connectionString = BuildConnectionString(request.Connection);
            _logger.LogInformation("Extracting metadata for {Count} tables", request.Tables.Count);

            using var connection = new SqlConnection(connectionString);
            await connection.OpenAsync();

            var tableMetadata = new List<TableMetadata>();

            foreach (var tableFullName in request.Tables)
            {
                var parts = tableFullName.Split('.');
                if (parts.Length != 2)
                {
                    _logger.LogWarning("Invalid table name format: {TableName}. Expected 'schema.table'", tableFullName);
                    continue;
                }

                var schema = parts[0];
                var tableName = parts[1];

                var metadata = new TableMetadata
                {
                    Schema = schema,
                    Name = tableName
                };

                // Extract columns
                metadata.Columns = await ExtractColumnsAsync(connection, schema, tableName);

                // Extract keys (primary keys, foreign keys, unique constraints)
                metadata.Keys = await ExtractKeysAsync(connection, schema, tableName);

                // Extract indexes
                metadata.Indexes = await ExtractIndexesAsync(connection, schema, tableName);

                tableMetadata.Add(metadata);
            }

            return new MetadataExtractionResponse
            {
                Success = true,
                Message = $"Extracted metadata for {tableMetadata.Count} table(s)",
                Tables = tableMetadata
            };
        }
        catch (SqlException ex)
        {
            _logger.LogError(ex, "Failed to extract metadata: {Message}", ex.Message);
            return new MetadataExtractionResponse
            {
                Success = false,
                Message = $"Failed to extract metadata: {ex.Message}",
                Error = ex.Message,
                Tables = new List<TableMetadata>()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to extract metadata: {Message}", ex.Message);
            return new MetadataExtractionResponse
            {
                Success = false,
                Message = $"Failed to extract metadata: {ex.Message}",
                Error = ex.Message,
                Tables = new List<TableMetadata>()
            };
        }
    }

    /// <summary>
    /// Extract column metadata for a table
    /// Based on SqlServerProvider.cs GetAllTableColumnsSql
    /// </summary>
    private async Task<List<ColumnMetadata>> ExtractColumnsAsync(SqlConnection connection, string schema, string tableName)
    {
        var columns = new List<ColumnMetadata>();

        const string query = @"
            SELECT
                c.name AS COLUMN_NAME,
                c.column_id AS COLUMN_ID,
                ISNULL(uty.name, ty.name) AS DATA_TYPE,
                c.max_length AS CHAR_LENGTH,
                c.precision AS DATA_PRECISION,
                c.scale AS DATA_SCALE,
                c.is_nullable AS NULLABLE,
                d.definition AS COLUMN_DEFAULT,
                c.is_identity AS IsAutoIncrement,
                c.is_computed AS IsComputed
            FROM sys.columns c
            JOIN sys.objects t ON c.object_id = t.object_id
            JOIN sys.schemas s ON t.schema_id = s.schema_id
            JOIN sys.types ty ON c.user_type_id = ty.user_type_id
            LEFT JOIN sys.types uty ON ty.system_type_id = uty.user_type_id AND uty.is_user_defined = 0
            LEFT JOIN sys.default_constraints d ON d.parent_object_id = c.object_id AND d.parent_column_id = c.column_id
            WHERE s.name = @Schema
              AND t.name = @TableName
              AND t.type = 'U'
            ORDER BY c.column_id";

        using var command = new SqlCommand(query, connection);
        command.Parameters.AddWithValue("@Schema", schema);
        command.Parameters.AddWithValue("@TableName", tableName);

        using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            var dataType = reader.GetString(2);
            var maxLength = reader.GetInt16(3);

            // Adjust max_length for Unicode types (nchar, nvarchar)
            int? adjustedMaxLength = null;
            if (dataType.StartsWith("n") && dataType != "numeric" && maxLength > 0)
            {
                adjustedMaxLength = maxLength == -1 ? -1 : maxLength / 2;
            }
            else if (maxLength > 0 || maxLength == -1)
            {
                adjustedMaxLength = maxLength;
            }

            columns.Add(new ColumnMetadata
            {
                Name = reader.GetString(0),
                OrdinalPosition = reader.GetInt32(1),
                DataType = dataType,
                MaxLength = adjustedMaxLength,
                Precision = reader.GetByte(4),
                Scale = reader.GetByte(5),
                IsNullable = reader.GetBoolean(6),
                DefaultValue = reader.IsDBNull(7) ? null : reader.GetString(7),
                IsIdentity = reader.GetBoolean(8),
                IsComputed = reader.GetBoolean(9)
            });
        }

        return columns;
    }

    /// <summary>
    /// Extract key metadata (primary keys, foreign keys, unique constraints)
    /// Based on SqlServerProvider.cs RetrieveConstraintSql
    /// </summary>
    private async Task<List<KeyMetadata>> ExtractKeysAsync(SqlConnection connection, string schema, string tableName)
    {
        var keysDict = new Dictionary<string, KeyMetadata>();
        var foreignKeyConstraints = new List<string>();

        const string query = @"
            SELECT
                con.CONSTRAINT_NAME,
                con.CONSTRAINT_TYPE,
                usage.COLUMN_NAME,
                usage.ORDINAL_POSITION,
                COALESCE(ref_con.UNIQUE_CONSTRAINT_SCHEMA, '') AS REF_SCHEMA,
                COALESCE(ref_con.UNIQUE_CONSTRAINT_NAME, '') AS REF_CONSTRAINT_NAME
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS con
            LEFT JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE usage
                ON con.CONSTRAINT_SCHEMA = usage.CONSTRAINT_SCHEMA
                AND con.CONSTRAINT_NAME = usage.CONSTRAINT_NAME
            LEFT JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS ref_con
                ON con.CONSTRAINT_SCHEMA = ref_con.CONSTRAINT_SCHEMA
                AND con.CONSTRAINT_NAME = ref_con.CONSTRAINT_NAME
            WHERE con.TABLE_SCHEMA = @Schema
              AND con.TABLE_NAME = @TableName
              AND con.CONSTRAINT_TYPE IN ('PRIMARY KEY', 'FOREIGN KEY', 'UNIQUE')
            ORDER BY con.CONSTRAINT_NAME, usage.ORDINAL_POSITION";

        using var command = new SqlCommand(query, connection);
        command.Parameters.AddWithValue("@Schema", schema);
        command.Parameters.AddWithValue("@TableName", tableName);

        // Read all data into memory first to avoid nested DataReader issues
        using (var reader = await command.ExecuteReaderAsync())
        {
            while (await reader.ReadAsync())
            {
                var constraintName = reader.GetString(0);
                var constraintType = reader.GetString(1);
                var columnName = reader.IsDBNull(2) ? null : reader.GetString(2);
                var refConstraintName = reader.IsDBNull(5) ? null : reader.GetString(5);

                if (!keysDict.TryGetValue(constraintName, out var keyMetadata))
                {
                    keyMetadata = new KeyMetadata
                    {
                        Name = constraintName,
                        Type = constraintType,
                        Columns = new List<string>()
                    };
                    keysDict[constraintName] = keyMetadata;
                }

                if (!string.IsNullOrEmpty(columnName))
                {
                    keyMetadata.Columns.Add(columnName);
                }

                // Track foreign key constraints to process after reader is closed
                if (constraintType == "FOREIGN KEY" && !string.IsNullOrEmpty(refConstraintName))
                {
                    if (!foreignKeyConstraints.Contains(refConstraintName))
                    {
                        foreignKeyConstraints.Add(refConstraintName);
                        // Store the constraint name so we can map it back
                        keyMetadata.ReferencedSchema = refConstraintName; // Temporary storage
                    }
                }
            }
        } // Reader is now closed

        // Now process foreign key references with the reader closed
        foreach (var key in keysDict.Values.Where(k => k.Type == "FOREIGN KEY"))
        {
            if (!string.IsNullOrEmpty(key.ReferencedSchema)) // We stored the ref constraint name here
            {
                var refConstraintName = key.ReferencedSchema;
                var refDetails = await GetReferencedTableAsync(connection, refConstraintName);
                key.ReferencedSchema = refDetails.Schema;
                key.ReferencedTable = refDetails.Table;
                key.ReferencedColumns = refDetails.Columns;
            }
        }

        return keysDict.Values.ToList();
    }

    /// <summary>
    /// Helper to get referenced table details for a foreign key
    /// </summary>
    private async Task<(string Schema, string Table, List<string> Columns)> GetReferencedTableAsync(
        SqlConnection connection, string constraintName)
    {
        const string query = @"
            SELECT
                pk_schema.name AS SCHEMA_NAME,
                pk_table.name AS TABLE_NAME,
                pk_col.name AS COLUMN_NAME,
                kcu.ORDINAL_POSITION
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE kcu
            JOIN sys.objects pk_table ON kcu.TABLE_NAME = pk_table.name
            JOIN sys.schemas pk_schema ON pk_table.schema_id = pk_schema.schema_id
            JOIN sys.columns pk_col ON pk_table.object_id = pk_col.object_id
                AND kcu.COLUMN_NAME = pk_col.name
            WHERE kcu.CONSTRAINT_NAME = @ConstraintName
            ORDER BY kcu.ORDINAL_POSITION";

        using var command = new SqlCommand(query, connection);
        command.Parameters.AddWithValue("@ConstraintName", constraintName);

        var columns = new List<string>();
        string? schema = null;
        string? table = null;

        using var reader = await command.ExecuteReaderAsync();
        while (await reader.ReadAsync())
        {
            schema ??= reader.GetString(0);
            table ??= reader.GetString(1);
            columns.Add(reader.GetString(2));
        }

        return (schema ?? "", table ?? "", columns);
    }

    /// <summary>
    /// Extract index metadata
    /// Based on SqlServerProvider.cs RetrieveIndexSql
    /// </summary>
    private async Task<List<IndexMetadata>> ExtractIndexesAsync(SqlConnection connection, string schema, string tableName)
    {
        var indexesDict = new Dictionary<string, IndexMetadata>();

        const string query = @"
            SELECT
                ind.name AS INDEX_NAME,
                ind.is_unique AS INDEX_IS_UNIQUE,
                ind.is_primary_key AS IS_PRIMARY_KEY,
                col.name AS COLUMN_NAME,
                ic.key_ordinal AS KEY_ORDINAL,
                ic.is_descending_key AS IS_DESCENDING
            FROM sys.indexes ind
            INNER JOIN sys.tables t ON ind.object_id = t.object_id
            INNER JOIN sys.schemas s ON t.schema_id = s.schema_id
            INNER JOIN sys.index_columns ic ON ind.object_id = ic.object_id AND ind.index_id = ic.index_id
            INNER JOIN sys.columns col ON ic.object_id = col.object_id AND ic.column_id = col.column_id
            WHERE s.name = @Schema
              AND t.name = @TableName
              AND ind.name IS NOT NULL
            ORDER BY ind.name, ic.key_ordinal";

        using var command = new SqlCommand(query, connection);
        command.Parameters.AddWithValue("@Schema", schema);
        command.Parameters.AddWithValue("@TableName", tableName);

        using var reader = await command.ExecuteReaderAsync();

        while (await reader.ReadAsync())
        {
            var indexName = reader.GetString(0);

            if (!indexesDict.TryGetValue(indexName, out var indexMetadata))
            {
                indexMetadata = new IndexMetadata
                {
                    Name = indexName,
                    IsUnique = reader.GetBoolean(1),
                    IsPrimaryKey = reader.GetBoolean(2),
                    Columns = new List<IndexColumnMetadata>()
                };
                indexesDict[indexName] = indexMetadata;
            }

            indexMetadata.Columns.Add(new IndexColumnMetadata
            {
                Name = reader.GetString(3),
                OrdinalPosition = reader.GetByte(4),
                IsDescending = reader.GetBoolean(5)
            });
        }

        return indexesDict.Values.ToList();
    }
}
