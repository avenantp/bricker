using Microsoft.AspNetCore.Mvc;
using SqlServerService.Models;
using SqlServerService.Services;

namespace SqlServerService.Controllers;

[ApiController]
[Route("api/sqlserver")]
public class SqlServerController : ControllerBase
{
    private readonly SqlServerConnectionService _sqlServerService;
    private readonly ILogger<SqlServerController> _logger;

    public SqlServerController(
        SqlServerConnectionService sqlServerService,
        ILogger<SqlServerController> logger)
    {
        _sqlServerService = sqlServerService;
        _logger = logger;
    }

    /// <summary>
    /// Test SQL Server connection and list databases
    /// </summary>
    [HttpPost("test")]
    public async Task<ActionResult<ConnectionResponse>> TestConnection([FromBody] ConnectionRequest request)
    {
        try
        {
            _logger.LogInformation("Testing connection to {Server}", request.Server);
            var result = await _sqlServerService.TestConnectionAsync(request);

            if (result.Success)
            {
                return Ok(result);
            }

            return BadRequest(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing connection");
            return StatusCode(500, new ConnectionResponse
            {
                Success = false,
                Message = "Internal server error",
                Error = ex.Message
            });
        }
    }

    /// <summary>
    /// List all databases on SQL Server
    /// </summary>
    [HttpPost("databases")]
    public async Task<ActionResult<DatabaseListResponse>> ListDatabases([FromBody] ConnectionRequest request)
    {
        try
        {
            _logger.LogInformation("Listing databases for {Server}", request.Server);
            var result = await _sqlServerService.ListDatabasesAsync(request);

            if (result.Success)
            {
                return Ok(result);
            }

            return BadRequest(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing databases");
            return StatusCode(500, new DatabaseListResponse
            {
                Success = false,
                Message = "Internal server error",
                Error = ex.Message
            });
        }
    }

    /// <summary>
    /// List all schemas in a database
    /// </summary>
    [HttpPost("schemas")]
    public async Task<ActionResult<SchemaListResponse>> ListSchemas([FromBody] ConnectionRequest request)
    {
        try
        {
            _logger.LogInformation("Listing schemas for {Database} on {Server}", request.Database, request.Server);
            var result = await _sqlServerService.ListSchemasAsync(request);

            if (result.Success)
            {
                return Ok(result);
            }

            return BadRequest(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing schemas");
            return StatusCode(500, new SchemaListResponse
            {
                Success = false,
                Message = "Internal server error",
                Error = ex.Message
            });
        }
    }

    /// <summary>
    /// List all tables in a database (optionally filtered by schema)
    /// </summary>
    [HttpPost("tables")]
    public async Task<ActionResult<TableListResponse>> ListTables([FromBody] TableListRequest request)
    {
        try
        {
            _logger.LogInformation("Listing tables for {Database} on {Server}", request.Connection.Database, request.Connection.Server);
            var result = await _sqlServerService.ListTablesAsync(request.Connection, request.Schema);

            if (result.Success)
            {
                return Ok(result);
            }

            return BadRequest(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error listing tables");
            return StatusCode(500, new TableListResponse
            {
                Success = false,
                Message = "Internal server error",
                Error = ex.Message
            });
        }
    }

    /// <summary>
    /// Extract metadata for specified tables
    /// </summary>
    [HttpPost("extract-metadata")]
    public async Task<ActionResult<MetadataExtractionResponse>> ExtractMetadata([FromBody] MetadataExtractionRequest request)
    {
        try
        {
            _logger.LogInformation("Extracting metadata for {Count} tables", request.Tables?.Count ?? 0);
            var result = await _sqlServerService.ExtractMetadataAsync(request);

            if (result.Success)
            {
                return Ok(result);
            }

            return BadRequest(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extracting metadata");
            return StatusCode(500, new MetadataExtractionResponse
            {
                Success = false,
                Message = "Internal server error",
                Error = ex.Message
            });
        }
    }

    /// <summary>
    /// Health check endpoint
    /// </summary>
    [HttpGet("health")]
    public IActionResult Health()
    {
        return Ok(new { status = "healthy", service = "SqlServerService", timestamp = DateTime.UtcNow });
    }
}
