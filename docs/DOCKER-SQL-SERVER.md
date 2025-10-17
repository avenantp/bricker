# Docker SQL Server Test Environment

This Docker setup provides a quick way to test SQL Server connectivity without installing SQL Server locally.

## Prerequisites

- Docker Desktop for Windows installed and running
- At least 4GB RAM allocated to Docker

## Quick Start

### 1. Start SQL Server Container

```bash
# From the project root directory
docker-compose up -d sqlserver
```

### 2. Wait for SQL Server to Initialize

The first startup takes about 30-60 seconds. Check status:

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs sqlserver

# Wait for this message: "SQL Server is now ready for client connections"
```

### 3. Test Connection in the Application

Use these settings in the **Edit SQL Server Connection** dialog:

#### Connection Settings:
- **Profile Name**: Docker SQL Server Test
- **Server name**: `localhost` or `127.0.0.1`
- **Port**: `1433`
- **Authentication**: SQL Authentication
- **Username**: `sa`
- **Password**: `YourStrong@Passw0rd`
- **Encrypt**: `Optional`
- **Trust server certificate**: ✅ Checked
- **Database**: `AdventureWorksLT2012` (or select from dropdown after testing connection)

#### Expected Databases:
After a successful connection test, you should see these databases:
- `master` (system database)
- `model` (system database)
- `msdb` (system database)
- `tempdb` (system database)
- `AdventureWorks` (test database)
- `AdventureWorksLT2012` (test database with sample data)
- `TestDB` (empty test database)

## Docker Commands

### Start Container
```bash
docker-compose up -d sqlserver
```

### Stop Container
```bash
docker-compose stop sqlserver
```

### View Logs
```bash
docker-compose logs -f sqlserver
```

### Restart Container
```bash
docker-compose restart sqlserver
```

### Remove Container and Data
```bash
# Stop and remove container
docker-compose down

# Also remove data volume
docker-compose down -v
```

## Troubleshooting

### Container won't start
```bash
# Check Docker Desktop is running
docker version

# Check logs for errors
docker-compose logs sqlserver
```

### Port 1433 already in use
If you have SQL Server already running locally:

```bash
# Option 1: Stop local SQL Server
net stop MSSQLSERVER

# Option 2: Change port in docker-compose.yml
# Change "1433:1433" to "1434:1433"
# Then connect using port 1434
```

### Connection still fails
```bash
# Verify container is running
docker ps

# Check if port is exposed
docker port uroq-sqlserver-test

# Test connection from inside container
docker exec -it uroq-sqlserver-test /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P 'YourStrong@Passw0rd' -Q "SELECT @@VERSION"
```

## Connect Using sqlcmd (Alternative Test)

```bash
# From Windows Command Prompt
docker exec -it uroq-sqlserver-test /opt/mssql-tools/bin/sqlcmd -S localhost -U sa -P 'YourStrong@Passw0rd'
```

Once connected:
```sql
-- List databases
SELECT name FROM sys.databases;
GO

-- Use a database
USE AdventureWorksLT2012;
GO

-- Query sample data
SELECT * FROM SalesLT.Customer;
GO

-- Exit
EXIT
```

## Sample Data

The `AdventureWorksLT2012` database includes:
- Schema: `SalesLT`
- Table: `Customer` with 3 sample records

You can add more test data by creating `.sql` files in `docs/sql-server-init/`.

## Security Note

**WARNING**: The default password (`YourStrong@Passw0rd`) is for testing only.

For production use:
1. Change the password in `docker-compose.yml`
2. Use environment variables
3. Enable encryption
4. Restrict network access

## Performance

- Container uses about 2GB RAM
- Starts in 30-60 seconds (first time)
- Data persists in Docker volume `sqlserver-data`
- Subsequent starts are faster (~10 seconds)

## Cleanup

To completely remove the test environment:

```bash
# Stop and remove container
docker-compose down

# Remove data volume
docker volume rm uroq_sqlserver-data

# Verify cleanup
docker ps -a
docker volume ls
```
