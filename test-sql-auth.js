/**
 * Test SQL Server with SQL Authentication and different server addresses
 */

const sql = require('mssql');
const os = require('os');

const configs = [
  {
    name: 'localhost + SQL Auth',
    config: {
      server: 'localhost',
      port: 1433,
      database: 'master',
      user: 'sa',
      password: 'YourPassword123!', // User needs to update this
      authentication: {
        type: 'default'
      },
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        connectTimeout: 30000,
      }
    }
  },
  {
    name: '127.0.0.1 + SQL Auth',
    config: {
      server: '127.0.0.1',
      port: 1433,
      database: 'master',
      user: 'sa',
      password: 'YourPassword123!',
      authentication: {
        type: 'default'
      },
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        connectTimeout: 30000,
      }
    }
  },
  {
    name: '. (dot) + SQL Auth',
    config: {
      server: '.',
      port: 1433,
      database: 'master',
      user: 'sa',
      password: 'YourPassword123!',
      authentication: {
        type: 'default'
      },
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        connectTimeout: 30000,
      }
    }
  },
  {
    name: `${os.hostname()} + SQL Auth`,
    config: {
      server: os.hostname(),
      port: 1433,
      database: 'master',
      user: 'sa',
      password: 'YourPassword123!',
      authentication: {
        type: 'default'
      },
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        connectTimeout: 30000,
      }
    }
  }
];

async function testConnection(name, config) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Testing: ${name}`);
  console.log(`${'='.repeat(60)}`);
  console.log('Server:', config.server);

  let pool = null;
  try {
    console.log('Attempting connection...');
    pool = await sql.connect(config);
    console.log('✓ Connection successful!');

    const result = await pool.request().query('SELECT @@VERSION AS Version');
    console.log('✓ Query successful!');
    console.log('Version:', result.recordset[0].Version.split('\n')[0]);

    return true;
  } catch (error) {
    console.log('✗ Connection failed!');
    console.log('Error:', error.message);
    console.log('Code:', error.code);
    return false;
  } finally {
    if (pool) {
      await pool.close();
    }
  }
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  SQL Server Connection Test - Multiple Configurations     ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\nIMPORTANT: Update the "sa" password in this script before running!\n');

  const results = [];

  for (const test of configs) {
    const success = await testConnection(test.name, test.config);
    results.push({ name: test.name, success });
  }

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  Results Summary                                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  results.forEach(r => {
    const icon = r.success ? '✓' : '✗';
    const status = r.success ? 'SUCCESS' : 'FAILED';
    console.log(`${icon} ${r.name}: ${status}`);
  });

  console.log('\n');
  const anySuccess = results.some(r => r.success);

  if (!anySuccess) {
    console.log('All tests failed. This suggests:');
    console.log('  1. SQL Authentication is disabled on the server');
    console.log('  2. The "sa" password is incorrect');
    console.log('  3. Network-level issue (firewall, antivirus, etc.)');
    console.log('  4. SQL Server is not configured for TCP/IP connections\n');
    console.log('Try enabling SQL Authentication:');
    console.log('  - Open SQL Server Management Studio');
    console.log('  - Right-click server → Properties → Security');
    console.log('  - Set "Server authentication" to "SQL Server and Windows Authentication mode"');
    console.log('  - Restart SQL Server service\n');
  }
}

runTests().catch(console.error);
