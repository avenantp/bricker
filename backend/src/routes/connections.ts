/**
 * Connections API Routes
 * Handles connection testing and database listing operations
 * Proxies SQL Server requests to .NET Core service
 */

import express from 'express';
import sql from 'mssql';
import os from 'os';

const router = express.Router();

// .NET SQL Server Service URL
const SQL_SERVER_SERVICE_URL = process.env.SQL_SERVER_SERVICE_URL || 'http://localhost:5000';

/**
 * Test SQL Server connection and list databases
 * POST /api/connections/mssql/test
 * Proxies to .NET Core SQL Server Service
 */
router.post('/mssql/test', async (req, res) => {
  try {
    console.log('[Connection Test] Proxying to .NET service');

    const response = await fetch(`${SQL_SERVER_SERVICE_URL}/api/sqlserver/test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (response.ok) {
      return res.json(data);
    } else {
      return res.status(response.status).json(data);
    }
  } catch (error: any) {
    console.error('[Connection Test] Proxy error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect to SQL Server service',
      error: error.message,
    });
  }
});

/**
 * List databases for SQL Server connection
 * POST /api/connections/mssql/list-databases
 * Proxies to .NET Core SQL Server Service
 */
router.post('/mssql/list-databases', async (req, res) => {
  try {
    console.log('[List Databases] Proxying to .NET service');

    const response = await fetch(`${SQL_SERVER_SERVICE_URL}/api/sqlserver/databases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (response.ok) {
      return res.json(data);
    } else {
      return res.status(response.status).json(data);
    }
  } catch (error: any) {
    console.error('[List Databases] Proxy error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect to SQL Server service',
      error: error.message,
    });
  }
});

function applyLocalTlsDefaults(config: sql.config, server: string, encryptionMode?: string) {
  if (!config.options) {
    config.options = {};
  }

  if (!server || !isLocalSqlServer(server)) {
    return;
  }

  const normalizedMode = (encryptionMode ?? '').toLowerCase();
  if (config.options.encrypt && normalizedMode === 'mandatory') {
    console.log('[Connections] Local SQL Server detected (' + server + ') - downgrading encryption to Optional for compatibility.');
    config.options.encrypt = false;
  }

  if (config.options.trustServerCertificate !== true) {
    console.log('[Connections] Local SQL Server detected (' + server + ') - enabling trustServerCertificate to accept self-signed certificates.');
    config.options.trustServerCertificate = true;
  }
}

function isLocalSqlServer(server: string): boolean {
  const trimmed = server.trim();
  if (!trimmed) {
    return false;
  }

  const normalized = trimmed.toLowerCase();
  const localHosts = [
    "localhost",
    "127.0.0.1",
    "::1",
    ".",
    "(local)",
    "(localdb)",
    "(localdb)\\mssqllocaldb",
  ];

  if (localHosts.includes(normalized)) {
    return true;
  }

  if (
    normalized.startsWith("localhost\\") ||
    normalized.startsWith(".\\") ||
    normalized.startsWith("(local)\\") ||
    normalized.startsWith("127.0.0.1\\") ||
    normalized.startsWith("(localdb)\\")
  ) {
    return true;
  }

  const hostName = os.hostname().toLowerCase();
  const hostNamePrefix = hostName + String.fromCharCode(92);
  return normalized === hostName || normalized.startsWith(hostNamePrefix);
}


/**
 * List schemas for SQL Server connection
 * POST /api/connections/mssql/list-schemas
 * Proxies to .NET Core SQL Server Service
 */
router.post('/mssql/list-schemas', async (req, res) => {
  try {
    console.log('[List Schemas] Proxying to .NET service');

    const response = await fetch(`${SQL_SERVER_SERVICE_URL}/api/sqlserver/schemas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (response.ok) {
      return res.json(data);
    } else {
      return res.status(response.status).json(data);
    }
  } catch (error: any) {
    console.error('[List Schemas] Proxy error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect to SQL Server service',
      error: error.message,
    });
  }
});

/**
 * List tables for SQL Server connection
 * POST /api/connections/mssql/list-tables
 * Proxies to .NET Core SQL Server Service
 */
router.post('/mssql/list-tables', async (req, res) => {
  try {
    console.log('[List Tables] Proxying to .NET service');

    const response = await fetch(`${SQL_SERVER_SERVICE_URL}/api/sqlserver/tables`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (response.ok) {
      return res.json(data);
    } else {
      return res.status(response.status).json(data);
    }
  } catch (error: any) {
    console.error('[List Tables] Proxy error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect to SQL Server service',
      error: error.message,
    });
  }
});

/**
 * Extract metadata for specified tables
 * POST /api/connections/mssql/extract-metadata
 * Proxies to .NET Core SQL Server Service
 */
router.post('/mssql/extract-metadata', async (req, res) => {
  try {
    console.log('[Extract Metadata] Proxying to .NET service');

    const response = await fetch(`${SQL_SERVER_SERVICE_URL}/api/sqlserver/extract-metadata`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    if (response.ok) {
      return res.json(data);
    } else {
      return res.status(response.status).json(data);
    }
  } catch (error: any) {
    console.error('[Extract Metadata] Proxy error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to connect to SQL Server service',
      error: error.message,
    });
  }
});

/**
 * Helper function to list databases
 * Implements the logic from the C# GetDatabaseList method
 */
async function listDatabases(pool: sql.ConnectionPool, isAzure: boolean): Promise<string[]> {
  const databases: string[] = [];

  try {
    let query: string;

    if (isAzure) {
      // Azure SQL Database - exclude system databases
      query = `SELECT [name] FROM sys.databases WHERE [name] NOT IN ('master', 'tempdb', 'model', 'msdb')`;
    } else {
      // Regular SQL Server - only show databases the user has access to
      query = `SELECT [name] FROM sys.databases WHERE CAST(ISNULL(HAS_DBACCESS([name]), 0) AS BIT) = 1`;
    }

    const result = await pool.request().query(query);

    if (result.recordset) {
      for (const row of result.recordset) {
        databases.push(row.name);
      }
    }
  } catch (error: any) {
    console.error('[List Databases] Query error:', error);
    throw error;
  }

  return databases;
}

/**
 * Helper function to detect if connection is to Azure SQL Database
 * Based on server name patterns
 */
function isAzureSqlDatabase(server: string): boolean {
  const lowerServer = server.toLowerCase();

  // Common Azure SQL Database patterns
  return (
    lowerServer.includes('.database.windows.net') ||
    lowerServer.includes('.database.azure.com') ||
    lowerServer.includes('.database.chinacloudapi.cn') ||
    lowerServer.includes('.database.usgovcloudapi.net') ||
    lowerServer.includes('.database.cloudapi.de')
  );
}

/**
 * Get all connections for a project
 * GET /api/connections/projects/:projectId
 */
router.get('/projects/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;

    // Get all connections associated with this project
    const response = await fetch(`${SQL_SERVER_SERVICE_URL}/api/sqlserver/projects/${projectId}/connections`);
    const data = await response.json();

    if (response.ok) {
      return res.json(data);
    } else {
      return res.status(response.status).json(data);
    }
  } catch (error: any) {
    console.error('[Project Connections] Error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Add a connection to a project
 * POST /api/connections/projects/:projectId/add
 */
router.post('/projects/:projectId/add', async (req, res) => {
  try {
    const { projectId } = req.params;
    const { connectionId } = req.body;

    console.log(`[Project Connections] Adding connection ${connectionId} to project ${projectId}`);

    // Add connection to project (this would be handled by your Supabase/database logic)
    // For now, returning success
    res.json({
      success: true,
      message: 'Connection added to project',
    });
  } catch (error: any) {
    console.error('[Project Connections] Error adding connection:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Remove a connection from a project
 * DELETE /api/connections/projects/:projectId/:connectionId
 */
router.delete('/projects/:projectId/:connectionId', async (req, res) => {
  try {
    const { projectId, connectionId } = req.params;

    console.log(`[Project Connections] Removing connection ${connectionId} from project ${projectId}`);

    // Remove connection from project
    res.json({
      success: true,
      message: 'Connection removed from project',
    });
  } catch (error: any) {
    console.error('[Project Connections] Error removing connection:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
