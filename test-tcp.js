/**
 * Test if Node.js can make a TCP connection to port 1433
 * This bypasses SQL Server authentication to test pure network connectivity
 */

const net = require('net');

function testTCPConnection(host, port) {
  return new Promise((resolve, reject) => {
    console.log(`\nTesting TCP connection to ${host}:${port}...`);

    const client = new net.Socket();
    client.setTimeout(5000);

    const startTime = Date.now();

    client.on('connect', () => {
      const duration = Date.now() - startTime;
      console.log(`✓ TCP connection successful! (${duration}ms)`);
      console.log('  → Network connectivity is working');
      console.log('  → Issue is likely in SQL Server authentication/configuration\n');
      client.destroy();
      resolve(true);
    });

    client.on('timeout', () => {
      console.log('✗ Connection timeout (5 seconds)');
      console.log('  → SQL Server may not be listening on this address/port');
      console.log('  → Check: netstat -an | findstr "1433"\n');
      client.destroy();
      resolve(false);
    });

    client.on('error', (err) => {
      console.log(`✗ Connection error: ${err.message}`);
      console.log(`  → Error code: ${err.code}`);

      if (err.code === 'ECONNREFUSED') {
        console.log('  → SQL Server is not listening on this port');
      } else if (err.code === 'ETIMEDOUT') {
        console.log('  → Firewall may be blocking the connection');
      } else if (err.code === 'ENETUNREACH') {
        console.log('  → Network routing issue');
      }
      console.log('');
      resolve(false);
    });

    client.connect(port, host);
  });
}

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  TCP Connection Test - Port 1433                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\nThis test checks if Node.js can establish a TCP connection');
  console.log('to port 1433, bypassing all SQL Server authentication.\n');

  const tests = [
    { host: 'localhost', port: 1433 },
    { host: '127.0.0.1', port: 1433 },
    { host: '.', port: 1433 }
  ];

  const results = [];

  for (const test of tests) {
    const success = await testTCPConnection(test.host, test.port);
    results.push({ host: test.host, success });
  }

  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Results Summary                                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  results.forEach(r => {
    const icon = r.success ? '✓' : '✗';
    const status = r.success ? 'SUCCESS' : 'FAILED';
    console.log(`${icon} ${r.host}: ${status}`);
  });

  console.log('\n');

  const anySuccess = results.some(r => r.success);

  if (anySuccess) {
    console.log('✓ TCP connectivity works!');
    console.log('  The issue is in SQL Server configuration or mssql package authentication.\n');
    console.log('Next steps:');
    console.log('  1. Enable SQL Server authentication (Mixed Mode)');
    console.log('  2. Test with: node test-sql-auth.js');
    console.log('  3. Check docs/CONNECTION-DEBUGGING-GUIDE.md\n');
  } else {
    console.log('✗ TCP connectivity BLOCKED!');
    console.log('  Node.js cannot reach port 1433 at all.\n');
    console.log('Most likely causes:');
    console.log('  1. Windows Firewall blocking node.exe');
    console.log('  2. Antivirus software blocking the connection');
    console.log('  3. SQL Server not listening on port 1433\n');
    console.log('Quick fix:');
    console.log('  Run as Administrator:');
    console.log('  netsh advfirewall firewall add rule name="Node.js" dir=out action=allow program="C:\\Program Files\\nodejs\\node.exe"\n');
  }
}

runTests().catch(console.error);
