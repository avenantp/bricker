# Fix Local SQL Server - Enable TCP/IP on Port 1433

## Current Issue

✅ SQL Server service is **RUNNING**
❌ SQL Server is **NOT listening on port 1433**

This means TCP/IP is either disabled or configured to use dynamic ports instead of port 1433.

## Quick Fix (5 minutes)

### Method 1: Automated Script (Recommended)

1. Right-click **PowerShell** in Start Menu
2. Select **Run as Administrator**
3. Navigate to project directory:
   ```powershell
   cd C:\Code\uroq
   ```
4. Run the fix script:
   ```powershell
   .\fix-sql-server-tcp.ps1
   ```
5. Follow the on-screen instructions

### Method 2: Manual Configuration

#### Step 1: Open SQL Server Configuration Manager

1. Press `Win + S` and search for "SQL Server Configuration Manager"
2. Or run: `SQLServerManager16.msc` (SQL Server 2022) or appropriate version

#### Step 2: Enable TCP/IP Protocol

1. In the left panel, expand: **SQL Server Network Configuration**
2. Click: **Protocols for MSSQLSERVER**
3. In the right panel, find **TCP/IP**
4. Right-click **TCP/IP** → **Enable**

#### Step 3: Configure Port 1433

1. Right-click **TCP/IP** → **Properties**
2. Go to the **IP Addresses** tab
3. Scroll to the **bottom** to find the **IPAll** section
4. Configure these values:
   ```
   TCP Dynamic Ports: (DELETE any value - leave BLANK)
   TCP Port: 1433
   ```
5. Click **OK**

#### Step 4: Restart SQL Server

1. In the left panel, click **SQL Server Services**
2. Right-click **SQL Server (MSSQLSERVER)**
3. Click **Restart**
4. Wait for the service to restart (about 10-30 seconds)

#### Step 5: Verify the Fix

Open Command Prompt and run:
```cmd
netstat -an | findstr "1433"
```

You should see:
```
TCP    0.0.0.0:1433           0.0.0.0:0              LISTENING
TCP    [::]:1433              [::]:0                 LISTENING
```

## Alternative: Use SQL Server Browser (For Named Instances)

If you're using a named instance instead of the default instance:

1. Start **SQL Server Browser** service
2. Connect using: `localhost\INSTANCENAME` instead of just `localhost`

## Test Connection in Application

After fixing, use these settings:

**For Windows Authentication:**
- Server name: `.` or `localhost`
- Port: `1433`
- Authentication: Windows Authentication
- Encrypt: `Optional`
- Trust server certificate: ✅ Checked

**For SQL Authentication:**
- Server name: `.` or `localhost`
- Port: `1433`
- Authentication: SQL Authentication
- Username: `sa` (or your username)
- Password: (your password)
- Encrypt: `Optional`
- Trust server certificate: ✅ Checked

## Common Issues

### "Configuration Manager won't open"

Run from Command Prompt (as Administrator):
```cmd
C:\Windows\System32\SQLServerManager16.msc
```

Version numbers:
- SQL Server 2022: SQLServerManager16.msc
- SQL Server 2019: SQLServerManager15.msc
- SQL Server 2017: SQLServerManager14.msc
- SQL Server 2016: SQLServerManager13.msc

### "Can't find SQL Server Configuration Manager"

It may not be installed. Use this registry method instead:

1. Press `Win + R`, type `regedit`
2. Navigate to: `HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQLServer\SuperSocketNetLib\Tcp`
3. Set `Enabled` = 1
4. Navigate to: `..\Tcp\IPAll`
5. Set `TcpPort` = 1433
6. Delete `TcpDynamicPorts` value
7. Restart SQL Server service

### "Port 1433 still not listening after restart"

Check Windows Firewall:
```powershell
# Run as Administrator
New-NetFirewallRule -DisplayName "SQL Server" -Direction Inbound -Protocol TCP -LocalPort 1433 -Action Allow
```

## Verify SQL Server Version

To check which version you have:
```cmd
sqlcmd -S . -Q "SELECT @@VERSION"
```

## Need Help?

If you're still having issues:

1. Check the error logs:
   - Location: `C:\Program Files\Microsoft SQL Server\MSSQL16.MSSQLSERVER\MSSQL\Log\ERRORLOG`

2. Verify SQL Server service is running:
   ```cmd
   sc query MSSQLSERVER
   ```

3. Check if any other application is using port 1433:
   ```cmd
   netstat -ano | findstr "1433"
   tasklist | findstr "<PID>"
   ```

## Success!

When configured correctly, you should be able to:
- Test Connection in the app and see "Connection successful"
- See a list of databases in the dropdown
- No more "Could not connect" errors
