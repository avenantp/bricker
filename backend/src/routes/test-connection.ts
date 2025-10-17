/**
 * Standalone SQL Server Connection Test
 * 
 * SETUP:
 * 1. Save this as test-connection.ts in your project folder
 * 2. Edit the configurations below to match your setup
 * 3. Run: npx ts-node test-connection.ts
 */

import sql from 'mssql';

// ==========================================
// EDIT THESE SETTINGS FOR YOUR SQL SERVER
// ==========================================
const YOUR_SERVER = 'localhost';  // or 'localhost\\SQLEXPRESS' for named instance
const YOUR_DATABASE = 'master';
const USE_SQL_AUTH = false;  // Set to true if using SQL Server authentication
const SQL_USERNAME = '';  // Fill in if USE_SQL_AUTH is true
const SQL_PASSWORD = '';  // Fill in if USE_SQL_AUTH is true
// ==========================================

// Test different connection configurations
async function testConnection(name: string, config: sql.config) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${name}`);
  console.log('Config:', JSON.stringify(config, null, 2));
  console.log('='.repeat(60));
  
  let pool: sql.ConnectionPool | null = null;
  
  try {
    pool = await sql.connect(config);
    console.log('✅ Connection successful!');
    
    // Try to query databases
    const result = await pool.request().query('SELECT DB_NAME() as CurrentDB, @@VERSION as Version');
    console.log('Current Database:', result.recordset[0].CurrentDB);
    console.log('SQL Server Version:', result.recordset[0].Version.split('\n')[0]);
    
    // List databases
    const dbResult = await pool.request().query(
      "SELECT [name] FROM sys.databases WHERE CAST(ISNULL(HAS_DBACCESS([name]), 0) AS BIT) = 1"
    );
    console.log('Accessible Databases:', dbResult.recordset.map(r => r.name).join(', '));
    
    return true;
  } catch (error: any) {
    console.log('❌ Connection failed');
    console.log('Error:', error.message);
    console.log('Code:', error.code);
    if (error.originalError) {
      console.log('Original Error:', error.originalError.message);
    }
    return false;
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}


async function runTests() {
  console.log('SQL Server Connection Diagnostic Tool');
  console.log('=====================================\n');
  
  // Build config based on your settings
  const baseConfig: any = {
    server: YOUR_SERVER,
    database: YOUR_DATABASE,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
    }
  };
  
  if (USE_SQL_AUTH) {
    console.log('Using SQL Server Authentication');
    baseConfig.user = SQL_USERNAME;
    baseConfig.password = SQL_PASSWORD;
  } else {
    console.log('Using Windows Authentication');
    baseConfig.authentication = {
      type: 'ntlm',
      options: {
        domain: '',
        userName: '',
        password: ''
      }
    };
  }
  
  // Test 1: Basic connection (no encryption)
  await testConnection('Basic Connection (encrypt: false)', baseConfig);
  
  // Test 2: With encryption
  const encryptedConfig = {
    ...baseConfig,
    options: {
      ...baseConfig.options,
      encrypt: true
    }
  };
  await testConnection('With Encryption (encrypt: true)', encryptedConfig);
  
  // Test 3: Try without authentication object (Windows default)
  if (!USE_SQL_AUTH) {
    const noAuthConfig = {
      server: YOUR_SERVER,
      database: YOUR_DATABASE,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
      }
    };
    await testConnection('Windows Auth (no auth object)', noAuthConfig);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Testing complete!');
  console.log('='.repeat(60));
  console.log('\nIf none of these worked, please share the error messages above.');
}

// Run the tests
runTests().catch(console.error);