# SQL Server Connection Debugging Guide

## Current Status

### What We've Tested
✅ **Backend API**: Working correctly, receiving requests
✅ **SQL Server Service**: Running
✅ **Port 1433**: Listening (verified by user)
✅ **Other Tools**: Can connect successfully (SSMS, etc.)
✅ **Different Encryption Modes**: Tested Mandatory, Optional, No Encryption
✅ **Windows Auth Methods**: Tested both `trustedConnection: true` and NTLM authentication
❌ **Node.js mssql Package**: Cannot connect with ANY configuration

### The Problem

All connection attempts from the Node.js `mssql` package fail with:
```
Error: Failed to connect to localhost:1433 - Could not connect (sequence)
Error Code: ESOCKET
```

**Key Observation**: SQL Server Profiler shows **NO connection attempts**, meaning the connection fails at the TCP/network layer **before** reaching SQL Server.

## Root Cause Analysis

This is **NOT a code issue**. The connection is being blocked at the network level between Node.js and SQL Server. Possible causes:

### 1. Windows Firewall Blocking Node.js

Windows Firewall may be blocking `node.exe` from making outbound connections to SQL Server.

**How to Check:**
```powershell
# Run as Administrator
netsh advfirewall firewall show rule name=all | findstr "node"
```

**How to Fix:**
```powershell
# Run as Administrator
# Allow inbound connections
netsh advfirewall firewall add rule name="Node.js" dir=in action=allow program="C:\Program Files\nodejs\node.exe" enable=yes

# Allow outbound connections
netsh advfirewall firewall add rule name="Node.js" dir=out action=allow program="C:\Program Files\nodejs\node.exe" enable=yes
```

Or use Windows Security UI:
1. Open **Windows Security** → **Firewall & network protection**
2. Click **Allow an app through firewall**
3. Click **Change settings** → **Allow another app**
4. Browse to: `C:\Program Files\nodejs\node.exe`
5. Check both **Private** and **Public** networks
6. Click **Add**

### 2. Antivirus Software

Corporate antivirus or endpoint protection may be blocking Node.js from making SQL Server connections.

**How to Check:**
- Check antivirus logs for blocked connections
- Temporarily disable antivirus (if safe to do so) and test connection

### 3. SQL Server TCP/IP Configuration

Even though port 1433 is listening, SQL Server may not be accepting TCP/IP connections.

**How to Verify:**
```powershell
# Check SQL Server error log for TCP/IP initialization
Get-Content "C:\Program Files\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQL\Log\ERRORLOG" | Select-String "tcp"
```

**What to Look For:**
```
Server is listening on [ 'any' <ipv4> 1433]
Server is listening on [ 'any' <ipv6> 1433]
```

**If NOT Found:**
- TCP/IP may be enabled but not properly initialized
- Try restarting SQL Server service: `net stop MSSQLSERVER && net start MSSQLSERVER`

### 4. SQL Server Browser Service

The SQL Server Browser service helps clients locate SQL Server instances.

**How to Check:**
```cmd
sc query SQLBrowser
```

**How to Fix:**
```cmd
# Start the service
net start SQLBrowser

# Set to start automatically
sc config SQLBrowser start=auto
```

### 5. Named Pipes vs TCP/IP

SQL Server may be prioritizing Named Pipes over TCP/IP, and Node.js mssql package only supports TCP/IP.

**How to Check in SQL Server Configuration Manager:**
1. Open **SQL Server Configuration Manager**
2. Go to: **SQL Server Network Configuration** → **Protocols for MSSQLSERVER**
3. Verify:
   - **TCP/IP**: Enabled (should be first)
   - **Named Pipes**: Can be enabled or disabled
4. Right-click **TCP/IP** → **Properties**
5. Go to **IP Addresses** tab
6. Scroll to **IPAll** section
7. Verify:
   - **TCP Dynamic Ports**: (BLANK)
   - **TCP Port**: 1433

### 6. SQL Server Authentication Mode

For SQL Authentication to work, SQL Server must be in "Mixed Mode".

**How to Check:**
```sql
-- Run in SSMS
SELECT SERVERPROPERTY('IsIntegratedSecurityOnly') AS [IsWindowsAuthOnly]
-- 1 = Windows Auth Only
-- 0 = Mixed Mode (Windows + SQL Auth)
```

**How to Fix:**
1. Open **SQL Server Management Studio**
2. Right-click server → **Properties** → **Security**
3. Set **Server authentication** to: **SQL Server and Windows Authentication mode**
4. Click **OK**
5. Restart SQL Server service

## Testing Steps

### Step 1: Test with SQL Authentication

1. Enable SQL Authentication (see above)
2. Set a password for the `sa` account:
   ```sql
   -- Run in SSMS
   ALTER LOGIN sa WITH PASSWORD = 'YourStrong@Password123!';
   ALTER LOGIN sa ENABLE;
   ```

3. Update `test-sql-auth.js` with your password
4. Run: `node test-sql-auth.js`

### Step 2: Test with Different Server Addresses

The test script tries:
- `localhost`
- `127.0.0.1`
- `.` (SQL Server shorthand)
- Your computer hostname

If one works and others don't, it's a DNS/hosts file issue.

### Step 3: Test Direct TCP Connection

Test if Node.js can make ANY TCP connection to port 1433:

```javascript
// test-tcp.js
const net = require('net');

const client = new net.Socket();

client.setTimeout(5000);

client.on('connect', () => {
  console.log('✓ TCP connection successful!');
  client.destroy();
});

client.on('timeout', () => {
  console.log('✗ Connection timeout');
  client.destroy();
});

client.on('error', (err) => {
  console.log('✗ Connection error:', err.message);
});

console.log('Testing TCP connection to localhost:1433...');
client.connect(1433, 'localhost');
```

Run: `node test-tcp.js`

**If this fails**, it's definitely a firewall/network issue, not SQL Server.

### Step 4: Check Windows Firewall Logs

Enable firewall logging to see blocked connections:

```powershell
# Run as Administrator
netsh advfirewall set allprofiles logging allowedconnections enable
netsh advfirewall set allprofiles logging droppedconnections enable

# View log
Get-Content "$env:SystemRoot\System32\LogFiles\Firewall\pfirewall.log" -Tail 50
```

Look for entries with:
- Port 1433
- node.exe
- DROP action

## Quick Fix Attempts

### Option 1: Allow Node.js Through Firewall
```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "Node.js Outbound" -Direction Outbound -Program "C:\Program Files\nodejs\node.exe" -Action Allow
```

### Option 2: Temporarily Disable Firewall (Testing Only)
```powershell
# Run as Administrator
# ONLY for testing! Re-enable after.
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled False

# Test connection
node test-sql-connection.js

# Re-enable firewall
Set-NetFirewallProfile -Profile Domain,Public,Private -Enabled True
```

### Option 3: Use Docker SQL Server

If all else fails, use the Docker SQL Server setup (see `docs/DOCKER-SQL-SERVER.md`):
```bash
docker-compose up -d sqlserver
```

This bypasses all Windows Firewall and local SQL Server configuration issues.

## Expected Behavior After Fix

When properly configured, you should see:

1. **In test script output**:
   ```
   ✓ Connection successful!
   ✓ Query successful!
   SQL Server Version: Microsoft SQL Server 2022...
   ✓ User Databases: AdventureWorks, TestDB, ...
   ```

2. **In SQL Server Profiler**:
   - Connection events showing login attempts
   - Query events showing `SELECT @@VERSION`

3. **In the application**:
   - "Connection successful" message
   - List of databases in the dropdown

## Getting More Information

### Check Node.js Version
```bash
node --version
```

Should be v18.x or higher.

### Check mssql Package Version
```bash
cd backend
npm list mssql
```

Should be v12.x.

### Check SQL Server Version
```sql
SELECT @@VERSION
```

### Check SQL Server TCP/IP Listener
```powershell
# Run as Administrator
Get-NetTCPConnection -LocalPort 1433 -State Listen
```

Should show SQL Server process listening on port 1433.

## Still Not Working?

If none of these steps work, the issue may be:

1. **Corporate Network Policy**: Group Policy blocking Node.js or SQL Server connections
2. **VPN or Proxy**: Network routing issues
3. **Virtual Network Adapter**: Multiple network adapters causing routing confusion
4. **Windows Defender Application Guard**: Sandboxing Node.js
5. **Corrupted Network Stack**: Winsock reset may be needed

Contact your IT administrator or try the Docker SQL Server option.
