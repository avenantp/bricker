/**
 * Import Metadata Dialog
 * Allows users to select a connection and import table metadata as datasets
 */

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { X, Database, CheckCircle, XCircle, Loader, Search, ChevronDown, ChevronRight, Folder, Table2 } from 'lucide-react';
import { useConnections, useConnectionSchemas, useConnectionTables } from '@/hooks';
import { useAuth } from '@/hooks/useAuth';
import { useAccount } from '@/hooks/useAccount';
import type { ConnectionWithDetails, SchemaInfo, TableInfo } from '@/types/connection';

interface ImportMetadataDialogProps {
  onClose: () => void;
  onSuccess?: (importedCount: number) => void;
  workspaceId?: string; // Optional prop, falls back to URL param
}

export function ImportMetadataDialog({ onClose, onSuccess, workspaceId: propWorkspaceId }: ImportMetadataDialogProps) {
  // Get authentication context
  const { user } = useAuth();
  const { data: account } = useAccount();
  const { workspaceId: paramWorkspaceId } = useParams<{ workspaceId: string }>();

  // Use prop workspace ID if provided, otherwise fallback to URL param
  const workspaceId = propWorkspaceId || paramWorkspaceId;

  // State for connection selection
  const [selectedConnectionId, setSelectedConnectionId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');

  // State for schema/table selection
  const [selectedSchemas, setSelectedSchemas] = useState<Set<string>>(new Set());
  const [selectedTables, setSelectedTables] = useState<Set<string>>(new Set());
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set());

  // State for import process
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const [importedCount, setImportedCount] = useState(0);

  // Fetch connections
  const { data: connectionsData, isLoading: isLoadingConnections } = useConnections();

  // Fetch schemas for selected connection
  const { data: schemas, isLoading: isLoadingSchemas } = useConnectionSchemas(
    selectedConnectionId,
    { enabled: !!selectedConnectionId }
  );

  // Filter connections by search query
  const filteredConnections = connectionsData?.data?.filter((conn) =>
    conn.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Handle connection selection
  const handleConnectionSelect = (connectionId: string) => {
    setSelectedConnectionId(connectionId);
    setSelectedSchemas(new Set());
    setSelectedTables(new Set());
    setExpandedSchemas(new Set());
    setImportStatus('idle');
  };

  // Toggle schema expansion
  const toggleSchemaExpansion = (schemaName: string) => {
    const newExpanded = new Set(expandedSchemas);
    if (newExpanded.has(schemaName)) {
      newExpanded.delete(schemaName);
    } else {
      newExpanded.add(schemaName);
    }
    setExpandedSchemas(newExpanded);
  };

  // Toggle schema selection
  const toggleSchemaSelection = (schemaName: string) => {
    const newSelected = new Set(selectedSchemas);
    if (newSelected.has(schemaName)) {
      newSelected.delete(schemaName);
    } else {
      newSelected.add(schemaName);
    }
    setSelectedSchemas(newSelected);
  };

  // Toggle table selection
  const toggleTableSelection = (schemaName: string, tableName: string) => {
    const tableKey = `${schemaName}.${tableName}`;
    const newSelected = new Set(selectedTables);
    if (newSelected.has(tableKey)) {
      newSelected.delete(tableKey);
    } else {
      newSelected.add(tableKey);
    }
    setSelectedTables(newSelected);
  };

  // Select all tables in a schema
  const selectAllTablesInSchema = (schemaName: string, tables: TableInfo[]) => {
    const newSelected = new Set(selectedTables);
    tables.forEach((table) => {
      newSelected.add(`${schemaName}.${table.name}`);
    });
    setSelectedTables(newSelected);
  };

  // Deselect all tables in a schema
  const deselectAllTablesInSchema = (schemaName: string, tables: TableInfo[]) => {
    const newSelected = new Set(selectedTables);
    tables.forEach((table) => {
      newSelected.delete(`${schemaName}.${table.name}`);
    });
    setSelectedTables(newSelected);
  };

  // Handle import metadata
  const handleImport = async () => {
    if (!selectedConnectionId) {
      alert('Please select a connection');
      return;
    }

    if (selectedTables.size === 0 && selectedSchemas.size === 0) {
      alert('Please select at least one schema or table to import');
      return;
    }

    setIsImporting(true);
    setImportStatus('idle');

    try {
      // Get the selected connection details
      const selectedConnection = connectionsData?.data?.find(
        (conn) => conn.id === selectedConnectionId
      );

      if (!selectedConnection) {
        throw new Error('Connection not found');
      }

      // Only support MSSQL for now
      if (selectedConnection.connection_type !== 'MSSQL') {
        throw new Error('Only Microsoft SQL Server connections are currently supported for metadata import');
      }

      // Build the connection request payload
      const config = selectedConnection.configuration as any;
      const connectionRequest = {
        connection: {
          server: config.server || '',
          port: config.port || 1433,
          database: config.database || 'master',
          authentication: {
            type: config.authentication?.type || 'sql_auth',
            username: config.authentication?.username || '',
            password: config.authentication?.password || '',
          },
          encryption: {
            mode: config.encryption?.mode || 'Mandatory',
            trustServerCertificate: config.encryption?.trust_server_certificate || false,
          },
        },
        tables: Array.from(selectedTables),
      };

      console.log('[Import Metadata] Extracting metadata for tables:', connectionRequest.tables);

      // Call the extract metadata API
      const response = await fetch('/api/connections/mssql/extract-metadata', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(connectionRequest),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to extract metadata');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || result.error || 'Failed to extract metadata');
      }

      console.log('[Import Metadata] Extracted metadata:', result);

      // Validate we have required context
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      if (!account?.id) {
        throw new Error('Account not found');
      }

      if (!workspaceId) {
        throw new Error('Workspace context not found');
      }

      const importResponse = await fetch('/api/datasets/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspace_id: workspaceId,
          account_id: account.id,
          user_id: user.id,
          connection_id: selectedConnectionId,
          tables: result.tables || [],
        }),
      });

      if (!importResponse.ok) {
        const importError = await importResponse.json();
        throw new Error(importError.error || 'Failed to import datasets');
      }

      const importResult = await importResponse.json();

      console.log('[Import Metadata] Import result:', importResult);

      setImportedCount(importResult.imported_count || 0);
      setImportStatus('success');

      if (importResult.errors && importResult.errors.length > 0) {
        const createdCount = importResult.created_count || 0;
        const addedCount = importResult.added_count || 0;
        setImportMessage(
          `Processed ${importResult.imported_count} dataset(s) ` +
          `(${createdCount} created, ${addedCount} added to workspace) ` +
          `with ${importResult.errors.length} error(s). Check console for details.`
        );
        console.warn('[Import Metadata] Errors:', importResult.errors);
      } else {
        const createdCount = importResult.created_count || 0;
        const addedCount = importResult.added_count || 0;
        if (createdCount > 0 && addedCount > 0) {
          setImportMessage(
            `Successfully processed ${importResult.imported_count} dataset(s): ` +
            `${createdCount} created, ${addedCount} added to workspace`
          );
        } else if (createdCount > 0) {
          setImportMessage(`Successfully created ${createdCount} new dataset(s)`);
        } else if (addedCount > 0) {
          setImportMessage(`Successfully added ${addedCount} existing dataset(s) to workspace`);
        } else {
          setImportMessage(`Successfully imported ${importResult.imported_count} dataset(s)`);
        }
      }

      // Call success callback after a short delay
      setTimeout(() => {
        onSuccess?.(importResult.imported_count || 0);
      }, 1500);
    } catch (error: any) {
      console.error('[Import Metadata] Error:', error);
      setImportStatus('error');
      setImportMessage(`Failed to import metadata: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* Dialog - 80% of browser size with fixed height */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-[80vw] h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Database className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Import Metadata
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Import table metadata from a connection as datasets
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content - Fixed height with scrolling */}
        <div className="flex-1 overflow-hidden flex min-h-0">
          {/* Left Panel: Connection Selection */}
          <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 flex flex-col min-h-0">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Select Connection
              </h3>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search connections..."
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {isLoadingConnections ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="w-6 h-6 text-gray-400 animate-spin" />
                </div>
              ) : filteredConnections.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                  No connections found
                </p>
              ) : (
                <div className="space-y-2">
                  {filteredConnections.map((connection) => (
                    <button
                      key={connection.id}
                      onClick={() => handleConnectionSelect(connection.id)}
                      className={`
                        w-full text-left p-3 rounded-lg border transition-colors
                        ${
                          selectedConnectionId === connection.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {connection.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {connection.connection_type}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Schema/Table Selection with Tree View */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Filters */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="grid grid-cols-2 gap-4">
                {/* Schema Filter */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                    Schema Filter
                  </label>
                  <div className="flex gap-2">
                    <select className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option>Contains</option>
                      <option>Equals</option>
                      <option>Starts with</option>
                      <option>Ends with</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Schema Filter"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Object Filter */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wide">
                    Object Filter
                  </label>
                  <div className="flex gap-2">
                    <select className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option>Contains</option>
                      <option>Equals</option>
                      <option>Starts with</option>
                      <option>Ends with</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Table Filter"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Tree View with fixed height and scrollbar */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 min-h-0">
              {!selectedConnectionId ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Database className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Select a connection to view schemas and tables
                  </p>
                </div>
              ) : isLoadingSchemas ? (
                <div className="flex items-center justify-center h-full">
                  <Loader className="w-8 h-8 text-gray-400 animate-spin" />
                </div>
              ) : !schemas || schemas.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-12">
                  No schemas found for this connection
                </p>
              ) : (
                <div className="space-y-1">
                  {schemas.map((schema) => (
                    <SchemaTreeItem
                      key={schema.name}
                      schema={schema}
                      connectionId={selectedConnectionId}
                      isExpanded={expandedSchemas.has(schema.name)}
                      isSelected={selectedSchemas.has(schema.name)}
                      selectedTables={selectedTables}
                      onToggleExpansion={() => toggleSchemaExpansion(schema.name)}
                      onToggleSelection={() => toggleSchemaSelection(schema.name)}
                      onToggleTable={(tableName) => toggleTableSelection(schema.name, tableName)}
                      onSelectAll={(tables) => selectAllTablesInSchema(schema.name, tables)}
                      onDeselectAll={(tables) => deselectAllTablesInSchema(schema.name, tables)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Selection Summary */}
            <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {selectedTables.size > 0
                  ? `${selectedTables.size} table(s) selected`
                  : 'Select tables to import'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          {/* Import Status */}
          {importStatus !== 'idle' && (
            <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
              importStatus === 'success'
                ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
            }`}>
              {importStatus === 'success' ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span className="text-sm">{importMessage}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={onClose}
              disabled={isImporting}
              className="btn-secondary px-4 py-2"
            >
              {importStatus === 'success' ? 'Close' : 'Cancel'}
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting || !selectedConnectionId || (selectedTables.size === 0 && selectedSchemas.size === 0)}
              className="btn-primary px-6 py-2 flex items-center gap-2"
            >
              {isImporting ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  Import Metadata
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Schema Tree Item Component
interface SchemaTreeItemProps {
  schema: SchemaInfo;
  connectionId: string;
  isExpanded: boolean;
  isSelected: boolean;
  selectedTables: Set<string>;
  onToggleExpansion: () => void;
  onToggleSelection: () => void;
  onToggleTable: (tableName: string) => void;
  onSelectAll: (tables: TableInfo[]) => void;
  onDeselectAll: (tables: TableInfo[]) => void;
}

function SchemaTreeItem({
  schema,
  connectionId,
  isExpanded,
  isSelected,
  selectedTables,
  onToggleExpansion,
  onToggleSelection,
  onToggleTable,
  onSelectAll,
  onDeselectAll,
}: SchemaTreeItemProps) {
  // Fetch tables for this schema when expanded
  const { data: tables, isLoading } = useConnectionTables(
    connectionId,
    schema.name,
    { enabled: isExpanded }
  );

  const allTablesSelected = tables?.every((table) =>
    selectedTables.has(`${schema.name}.${table.name}`)
  ) || false;

  const someTablesSelected = tables?.some((table) =>
    selectedTables.has(`${schema.name}.${table.name}`)
  ) && !allTablesSelected;

  return (
    <div className="select-none">
      {/* Schema Header - Tree View Style */}
      <div className="flex items-center gap-1 py-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
        <button
          onClick={onToggleExpansion}
          className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded flex-shrink-0"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          )}
        </button>

        <Folder className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />

        <span className="text-sm text-gray-900 dark:text-gray-100 font-medium">
          {schema.name}
        </span>
      </div>

      {/* Tables List - Indented Tree View */}
      {isExpanded && (
        <div className="ml-5">
          {isLoading ? (
            <div className="flex items-center gap-2 py-2 pl-5">
              <Loader className="w-4 h-4 text-gray-400 animate-spin" />
              <span className="text-xs text-gray-500">Loading tables...</span>
            </div>
          ) : !tables || tables.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400 py-2 pl-5">
              No tables found
            </p>
          ) : (
            <div>
              {tables.map((table) => {
                const tableKey = `${schema.name}.${table.name}`;
                const isTableSelected = selectedTables.has(tableKey);

                return (
                  <label
                    key={table.name}
                    className="flex items-center gap-1 py-1 pl-5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={isTableSelected}
                      onChange={() => onToggleTable(table.name)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 flex-shrink-0"
                    />
                    <Table2 className="w-4 h-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                    <span className="text-sm text-gray-900 dark:text-gray-100 truncate">
                      {table.name}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
