namespace SqlServerService.Models;

public class ConnectionRequest
{
    public string Server { get; set; } = string.Empty;
    public int Port { get; set; } = 1433;
    public string Database { get; set; } = "master";
    public AuthenticationConfig Authentication { get; set; } = new();
    public EncryptionConfig Encryption { get; set; } = new();
}

public class AuthenticationConfig
{
    public string Type { get; set; } = "sql_auth"; // sql_auth, windows_auth, azure_ad
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class EncryptionConfig
{
    public string Mode { get; set; } = "Mandatory"; // Mandatory, Optional, Strict
    public bool TrustServerCertificate { get; set; }
}

public class TableListRequest
{
    public ConnectionRequest Connection { get; set; } = new();
    public string? Schema { get; set; }
}
