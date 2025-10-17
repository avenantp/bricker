namespace SqlServerService.Models;

/// <summary>
/// Request to extract metadata for specific tables
/// </summary>
public class MetadataExtractionRequest
{
    /// <summary>
    /// Connection configuration
    /// </summary>
    public ConnectionRequest Connection { get; set; } = new();

    /// <summary>
    /// List of tables to extract metadata for (schema.table format)
    /// </summary>
    public List<string> Tables { get; set; } = new();
}

/// <summary>
/// Response containing extracted metadata
/// </summary>
public class MetadataExtractionResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public List<TableMetadata> Tables { get; set; } = new();
    public string? Error { get; set; }
}

/// <summary>
/// Complete metadata for a table
/// </summary>
public class TableMetadata
{
    public string Schema { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string FullName => $"{Schema}.{Name}";
    public List<ColumnMetadata> Columns { get; set; } = new();
    public List<KeyMetadata> Keys { get; set; } = new();
    public List<IndexMetadata> Indexes { get; set; } = new();
}

/// <summary>
/// Column metadata
/// </summary>
public class ColumnMetadata
{
    public string Name { get; set; } = string.Empty;
    public int OrdinalPosition { get; set; }
    public string DataType { get; set; } = string.Empty;
    public int? MaxLength { get; set; }
    public int? Precision { get; set; }
    public int? Scale { get; set; }
    public bool IsNullable { get; set; }
    public string? DefaultValue { get; set; }
    public bool IsIdentity { get; set; }
    public bool IsComputed { get; set; }
}

/// <summary>
/// Primary Key or Foreign Key metadata
/// </summary>
public class KeyMetadata
{
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // PRIMARY KEY, FOREIGN KEY, UNIQUE
    public List<string> Columns { get; set; } = new();

    // Foreign key specific properties
    public string? ReferencedSchema { get; set; }
    public string? ReferencedTable { get; set; }
    public List<string>? ReferencedColumns { get; set; }
}

/// <summary>
/// Index metadata
/// </summary>
public class IndexMetadata
{
    public string Name { get; set; } = string.Empty;
    public bool IsUnique { get; set; }
    public bool IsPrimaryKey { get; set; }
    public List<IndexColumnMetadata> Columns { get; set; } = new();
}

/// <summary>
/// Index column metadata
/// </summary>
public class IndexColumnMetadata
{
    public string Name { get; set; } = string.Empty;
    public int OrdinalPosition { get; set; }
    public bool IsDescending { get; set; }
}
