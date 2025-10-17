-- Create test databases for Uroq connection testing
-- This script runs automatically when the Docker container starts

USE master;
GO

-- Create AdventureWorksLT2012 database
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'AdventureWorksLT2012')
BEGIN
    CREATE DATABASE AdventureWorksLT2012;
    PRINT 'Database AdventureWorksLT2012 created successfully.';
END
GO

USE AdventureWorksLT2012;
GO

-- Create sample schema and table
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = 'SalesLT')
BEGIN
    EXEC('CREATE SCHEMA SalesLT');
    PRINT 'Schema SalesLT created successfully.';
END
GO

-- Create sample Customer table
IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'Customer' AND schema_id = SCHEMA_ID('SalesLT'))
BEGIN
    CREATE TABLE SalesLT.Customer (
        CustomerID INT IDENTITY(1,1) PRIMARY KEY,
        FirstName NVARCHAR(50) NOT NULL,
        LastName NVARCHAR(50) NOT NULL,
        EmailAddress NVARCHAR(100),
        Phone NVARCHAR(25),
        CompanyName NVARCHAR(100),
        CreatedDate DATETIME DEFAULT GETDATE(),
        ModifiedDate DATETIME DEFAULT GETDATE()
    );

    -- Insert sample data
    INSERT INTO SalesLT.Customer (FirstName, LastName, EmailAddress, CompanyName)
    VALUES
        ('John', 'Doe', 'john.doe@example.com', 'Contoso Ltd'),
        ('Jane', 'Smith', 'jane.smith@example.com', 'Fabrikam Inc'),
        ('Bob', 'Johnson', 'bob.johnson@example.com', 'Adventure Works');

    PRINT 'Table SalesLT.Customer created and populated with sample data.';
END
GO

-- Create AdventureWorks database (for testing)
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'AdventureWorks')
BEGIN
    CREATE DATABASE AdventureWorks;
    PRINT 'Database AdventureWorks created successfully.';
END
GO

-- Create TestDB for general testing
IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'TestDB')
BEGIN
    CREATE DATABASE TestDB;
    PRINT 'Database TestDB created successfully.';
END
GO

PRINT 'SQL Server initialization complete. Available databases:';
SELECT name FROM sys.databases WHERE database_id > 4 ORDER BY name;
GO
