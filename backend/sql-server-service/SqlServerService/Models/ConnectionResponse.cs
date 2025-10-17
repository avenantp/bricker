namespace SqlServerService.Models;

public class ConnectionResponse
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
    public List<string> Databases { get; set; } = new();
    public string? Error { get; set; }
    public string? ErrorCode { get; set; }
}

public class DatabaseListResponse
{
    public bool Success { get; set; }
    public List<string> Databases { get; set; } = new();
    public string? Message { get; set; }
    public string? Error { get; set; }
}

public class TableListResponse
{
    public bool Success { get; set; }
    public List<TableInfo> Tables { get; set; } = new();
    public string? Message { get; set; }
    public string? Error { get; set; }
}

public class SchemaListResponse
{
    public bool Success { get; set; }
    public List<SchemaInfo> Schemas { get; set; } = new();
    public string? Message { get; set; }
    public string? Error { get; set; }
}

public class SchemaInfo
{
    public string Name { get; set; } = string.Empty;
    public int TableCount { get; set; }
}

public class TableInfo
{
    public string Schema { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string FullName => $"{Schema}.{Name}";
}
