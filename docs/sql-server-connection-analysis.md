# SQL Server Connection Error Analysis

## Error Summary

**Error**: `Failed to connect to localhost:1433 - Could not connect (sequence)`

**Error Code**: `ESOCKET`

## Root Cause

The error `Could not connect (sequence)` indicates that the Node.js application **cannot establish a TCP connection** to port 1433. This is **NOT** a code issue - it's an infrastructure issue.

### Possible Causes (in order of likelihood):

1. **SQL Server is not running** ⭐ MOST LIKELY
   - The SQL Server service is stopped
   - SQL Server was never installed

2. **SQL Server is not listening on port 1433**
   - TCP/IP protocol is disabled in SQL Server Configuration Manager
   - SQL Server is configured to use a different port
   - Dynamic ports are enabled instead of static port 1433

3. **Firewall is blocking port 1433**
   - Windows Firewall is blocking inbound connections
   - Third-party antivirus/firewall software

4. **SQL Server is listening on a named instance only**
   - Named instances use dynamic ports by default
   - Requires SQL Server Browser service

## Diagnostic Steps

### Step 1: Check if SQL Server is Installed and Running

#### Option A: Using Services (Windows GUI)
1. Press `Win + R`, type `services.msc`, press Enter
2. Look for services named:
   - `SQL Server (MSSQLSERVER)` - default instance
   - `SQL Server (INSTANCENAME)` - named instance
3. Check if Status = "Running"

#### Option B: Using PowerShell
```powershell
Get-Service | Where-Object {$_.DisplayName -like "*SQL Server*"}
```

#### Option C: Using Command Prompt
```cmd
sc query MSSQLSERVER
```

### Step 2: Check if Port 1433 is Open

```cmd
netstat -an | findstr ":1433"
```

Expected output if SQL Server is listening:
```
TCP    0.0.0.0:1433           0.0.0.0:0              LISTENING
TCP    [::]:1433              [::]:0                 LISTENING
```

### Step 3: Check SQL Server Configuration

1. Open **SQL Server Configuration Manager**
2. Navigate to: SQL Server Network Configuration → Protocols for MSSQLSERVER
3. Verify:
   - TCP/IP protocol is **Enabled**
   - TCP/IP Properties → IP Addresses tab → IPAll section
   - TCP Dynamic Ports should be **blank**
   - TCP Port should be **1433**

### Step 4: Test Connection Locally

Using SQL Server Management Studio (SSMS):
- Server name: `.` or `localhost` or `(local)`
- Authentication: Windows Authentication
- Click "Connect"

Using PowerShell:
```powershell
Test-NetConnection -ComputerName localhost -Port 1433
```

## Solutions

### Solution 1: Start SQL Server Service

```powershell
# PowerShell (Run as Administrator)
Start-Service MSSQLSERVER
```

Or using Services GUI:
1. Open `services.msc`
2. Right-click "SQL Server (MSSQLSERVER)"
3. Click "Start"

### Solution 2: Enable TCP/IP Protocol

1. Open SQL Server Configuration Manager
2. Navigate to: SQL Server Network Configuration → Protocols for MSSQLSERVER
3. Right-click "TCP/IP" → Enable
4. Restart SQL Server service

### Solution 3: Configure Static Port 1433

1. Open SQL Server Configuration Manager
2. Navigate to: SQL Server Network Configuration → Protocols for MSSQLSERVER
3. Right-click "TCP/IP" → Properties
4. Go to "IP Addresses" tab
5. Scroll to "IPAll" section
6. Set:
   - TCP Dynamic Ports: **(blank)**
   - TCP Port: **1433**
7. Restart SQL Server service

### Solution 4: Add Firewall Rule

```powershell
# PowerShell (Run as Administrator)
New-NetFirewallRule -DisplayName "SQL Server" -Direction Inbound -Protocol TCP -LocalPort 1433 -Action Allow
```

### Solution 5: Use SQL Server Express LocalDB (Alternative)

If you don't have a full SQL Server installation, you can use LocalDB:

```cmd
# Start LocalDB instance
SqlLocalDB start MSSQLLocalDB

# Connect using: (localdb)\MSSQLLocalDB
```

**Note**: LocalDB uses named pipes by default, not TCP/IP port 1433.

## Docker-Based Testing Solution

If you want to test the connection functionality without installing SQL Server locally, use the Docker setup provided in `docker-compose.yml`.

### Prerequisites
- Docker Desktop for Windows installed
- At least 4GB RAM allocated to Docker

### Quick Start

```bash
# Start SQL Server container
docker-compose up -d sqlserver

# Wait 30 seconds for SQL Server to initialize

# Test connection using:
# Server: localhost
# Port: 1433
# Username: sa
# Password: YourStrong@Passw0rd
# Encryption: Optional
```

### Connection Settings for Docker SQL Server

```javascript
{
  "server": "localhost",
  "port": 1433,
  "database": "master",
  "authentication": {
    "type": "sql_auth",
    "username": "sa",
    "password": "YourStrong@Passw0rd"
  },
  "encryption": {
    "mode": "Optional",
    "trust_server_certificate": true
  }
}
```

## Code Verification

The application code is **correct**. The connection configuration properly handles:
- Server name conversion ("." → "localhost") ✅
- Windows Authentication (`trustedConnection: true`) ✅
- Encryption modes (Mandatory, Optional, Strict) ✅
- Trust Server Certificate setting ✅

The issue is purely infrastructure-related.

## Next Steps

1. **Determine if you have SQL Server installed**
   - Check Start Menu for "SQL Server"
   - Check Programs and Features

2. **If SQL Server is installed but not running**
   - Start the service (see Solution 1)
   - Enable TCP/IP (see Solution 2)

3. **If SQL Server is NOT installed**
   - Option A: Install SQL Server Express (free)
   - Option B: Use Docker container (recommended for testing)
   - Option C: Install SQL Server LocalDB

4. **Verify the fix**
   - Use the Test Connection button in the application
   - Should see databases listed after successful connection

## Testing with Docker (Recommended)

I've created a `docker-compose.yml` file that will:
- Spin up SQL Server 2022 in a container
- Pre-configure port 1433
- Set up test database with AdventureWorks schema
- Provide consistent testing environment

This is the **fastest way to test** without waiting for SQL Server installation or configuration.
