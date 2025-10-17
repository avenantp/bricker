/**
 * Test SQL Server Windows Authentication using NTLM
 * mssql v12.x uses Tedious driver which requires authentication.type = 'ntlm'
 */

const sql = require('mssql');

async function testNTLMAuth() {
  console.log('Testing Windows Authentication with NTLM...\n');

  // Correct configuration for Windows Auth in mssql v12.x
  const config = {
    server: 'localhost',
    port: 1433,
    database: 'master',
    authentication: {
      type: 'ntlm',
      options: {
        // Leave empty to use current Windows user credentials
        domain: '',
        userName: '',
        password: ''
      }
    },
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      connectTimeout: 30000,
      requestTimeout: 30000,
    }
  };

  console.log('Config:', JSON.stringify(config, null, 2));
  console.log('\nAttempting connection...\n');

  let pool = null;
  try {
    pool = await sql.connect(config);
    console.log('✓ Connection successful!\n');

    const result = await pool.request().query('SELECT @@VERSION AS Version');
    console.log('✓ Query successful!');
    console.log('SQL Server Version:', result.recordset[0].Version.split('\n')[0]);

    const dbResult = await pool.request().query('SELECT name FROM sys.databases WHERE database_id > 4');
    console.log('\n✓ User Databases:', dbResult.recordset.map(r => r.name).join(', '));

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

testNTLMAuth().catch(console.error);
