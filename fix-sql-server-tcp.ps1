# SQL Server TCP/IP Configuration Fix Script
# Run this as Administrator

Write-Host "=== SQL Server TCP/IP Configuration Tool ===" -ForegroundColor Cyan
Write-Host ""

# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    exit 1
}

Write-Host "Step 1: Checking SQL Server Service Status..." -ForegroundColor Yellow
$service = Get-Service -Name "MSSQLSERVER" -ErrorAction SilentlyContinue
if ($service) {
    Write-Host "  ✓ SQL Server service found: $($service.Status)" -ForegroundColor Green
    if ($service.Status -ne "Running") {
        Write-Host "  Starting SQL Server service..." -ForegroundColor Yellow
        Start-Service -Name "MSSQLSERVER"
        Start-Sleep -Seconds 5
    }
} else {
    Write-Host "  ✗ SQL Server service not found" -ForegroundColor Red
    Write-Host "  Please ensure SQL Server is installed" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Step 2: Checking TCP/IP Port Configuration..." -ForegroundColor Yellow

# Check if SQL Server is listening on port 1433
$port1433 = netstat -ano | Select-String ":1433"
if ($port1433) {
    Write-Host "  ✓ SQL Server is already listening on port 1433" -ForegroundColor Green
    Write-Host "  Port configuration looks good!" -ForegroundColor Green
    Write-Host ""
    Write-Host "=== Configuration Summary ===" -ForegroundColor Cyan
    Write-Host "SQL Server is running and accessible on port 1433" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now test the connection in your application:" -ForegroundColor Yellow
    Write-Host "  Server: localhost or ." -ForegroundColor White
    Write-Host "  Port: 1433" -ForegroundColor White
    Write-Host "  Auth: Windows Authentication" -ForegroundColor White
    exit 0
}

Write-Host "  ✗ SQL Server is NOT listening on port 1433" -ForegroundColor Red
Write-Host "  This needs to be fixed..." -ForegroundColor Yellow
Write-Host ""

Write-Host "Step 3: Opening SQL Server Configuration Manager..." -ForegroundColor Yellow
Write-Host ""
Write-Host "IMPORTANT: You need to manually configure TCP/IP" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Please follow these steps:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. The SQL Server Configuration Manager will open" -ForegroundColor White
Write-Host "2. Navigate to: SQL Server Network Configuration → Protocols for MSSQLSERVER" -ForegroundColor White
Write-Host "3. Right-click 'TCP/IP' → Properties" -ForegroundColor White
Write-Host "4. In the 'Protocol' tab, set 'Enabled' = Yes" -ForegroundColor White
Write-Host "5. Go to 'IP Addresses' tab" -ForegroundColor White
Write-Host "6. Scroll to the bottom to find 'IPAll' section" -ForegroundColor White
Write-Host "7. Set these values:" -ForegroundColor White
Write-Host "   - TCP Dynamic Ports: (leave BLANK)" -ForegroundColor Cyan
Write-Host "   - TCP Port: 1433" -ForegroundColor Cyan
Write-Host "8. Click OK" -ForegroundColor White
Write-Host "9. Right-click 'SQL Server Services' → SQL Server (MSSQLSERVER) → Restart" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to open SQL Server Configuration Manager..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey('NoEcho,IncludeKeyDown')

# Try to open SQL Server Configuration Manager
try {
    Start-Process "SQLServerManager16.msc" -ErrorAction Stop  # SQL Server 2022
} catch {
    try {
        Start-Process "SQLServerManager15.msc" -ErrorAction Stop  # SQL Server 2019
    } catch {
        try {
            Start-Process "SQLServerManager14.msc" -ErrorAction Stop  # SQL Server 2017
        } catch {
            try {
                Start-Process "SQLServerManager13.msc" -ErrorAction Stop  # SQL Server 2016
            } catch {
                Write-Host "Could not open SQL Server Configuration Manager automatically" -ForegroundColor Red
                Write-Host "Please open it manually from Start Menu → SQL Server Configuration Manager" -ForegroundColor Yellow
            }
        }
    }
}

Write-Host ""
Write-Host "After configuring, run this script again to verify the fix" -ForegroundColor Cyan
Write-Host ""
