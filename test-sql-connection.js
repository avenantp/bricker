/**
 * SQL Server Connection Test Script
 * Run this to test different connection scenarios
 */

const sql = require('mssql');

// Test configurations
const configs = [
  {
    name: 'Windows Auth + No Encryption',
    config: {
      server: 'localhost',
      port: 1433,
      database: 'master',
      options: {
        encrypt: false,
        trustServerCertificate: true,
        trustedConnection: true,
        enableArithAbort: true,
        connectTimeout: 30000,
        requestTimeout: 30000,
      }
    }
  },
  {
    name: 'Windows Auth + Optional Encryption',
    config: {
      server: 'localhost',
      port: 1433,
      database: 'master',
      options: {
        encrypt: false,
        trustServerCertificate: true,
        trustedConnection: true,
        enableArithAbort: true,
        connectTimeout: 30000,
        requestTimeout: 30000,
      }
    }
  },
  {
    name: 'Windows Auth + Mandatory Encryption',
    config: {
      server: 'localhost',
      port: 1433,
      database: 'master',
      options: {
        encrypt: true,
        trustServerCertificate: true,
        trustedConnection: true,
        enableArithAbort: true,
        connectTimeout: 30000,
        requestTimeout: 30000,
      }
    }
  }
];

async function testConnection(name, config) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${name}`);
  console.log(`${'='.repeat(60)}`);
  console.log('Config:', JSON.stringify(config, null, 2));

  let pool = null;
  try {
    console.log('Attempting connection...');
    pool = await sql.connect(config);
    console.log('✓ Connection successful!');

    const result = await pool.request().query('SELECT @@VERSION AS Version');
    console.log('✓ Query successful!');
    console.log('SQL Server Version:', result.recordset[0].Version.split('\n')[0]);

    const dbResult = await pool.request().query('SELECT name FROM sys.databases WHERE database_id > 4');
    console.log('✓ Databases:', dbResult.recordset.map(r => r.name).join(', '));

    return true;
  } catch (error) {
    console.log('✗ Connection failed!');
    console.log('Error:', error.message);
    console.log('Error Code:', error.code);
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
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     SQL Server Connection Diagnostic Test                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const results = [];

  for (const test of configs) {
    const success = await testConnection(test.name, test.config);
    results.push({ name: test.name, success });
  }

  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║     Test Results Summary                                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  results.forEach(r => {
    const icon = r.success ? '✓' : '✗';
    const status = r.success ? 'SUCCESS' : 'FAILED';
    console.log(`${icon} ${r.name}: ${status}`);
  });

  console.log('');
  console.log('Recommendation:');
  const workingConfig = results.find(r => r.success);
  if (workingConfig) {
    console.log(`Use configuration: "${workingConfig.name}"`);
  } else {
    console.log('No configuration worked. Check:');
    console.log('  1. SQL Server is running: sc query MSSQLSERVER');
    console.log('  2. Port 1433 is listening: netstat -an | findstr "1433"');
    console.log('  3. Windows Firewall allows port 1433');
  }
  console.log('');
}

runTests().catch(console.error);
