/**
 * MSSQL Connection Editor
 * Full-featured editor for Microsoft SQL Server connections with tabs and dynamic database loading
 */

import { useState, useEffect } from 'react';
import { X, Database, Eye, EyeOff, Copy, Check, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import type { MSSQLConfiguration } from '@/types/connection';

interface MSSQLConnectionEditorProps {
  initialConfig?: MSSQLConfiguration;
  connectionName?: string;
  onSave: (name: string, config: MSSQLConfiguration) => void;
  onCancel: () => void;
  isEdit?: boolean;
}

export function MSSQLConnectionEditor({
  initialConfig,
  connectionName: initialName = '',
  onSave,
  onCancel,
  isEdit = false
}: MSSQLConnectionEditorProps) {
  // Connection name
  const [name, setName] = useState(initialName);

  // Basic configuration
  const [server, setServer] = useState(initialConfig?.server || '');
  const [port, setPort] = useState(initialConfig?.port || 1433);
  const [database, setDatabase] = useState(initialConfig?.database || '');

  // Database dropdown state
  const [availableDatabases, setAvailableDatabases] = useState<string[]>([]);
  const [loadingDatabases, setLoadingDatabases] = useState(false);
  const [databasesLoaded, setDatabasesLoaded] = useState(false);
  const [useCustomDatabase, setUseCustomDatabase] = useState(false);

  // Authentication
  const [authType, setAuthType] = useState<'sql_auth' | 'windows_auth' | 'azure_ad'>(
    initialConfig?.authentication?.type || 'sql_auth'
  );
  const [username, setUsername] = useState(initialConfig?.authentication?.username || '');
  const [password, setPassword] = useState(initialConfig?.authentication?.password || '');
  const [showPassword, setShowPassword] = useState(false);

  // Update databases state
  const [updating, setUpdating] = useState(false);
  const [updateResult, setUpdateResult] = useState<'success' | 'error' | null>(null);
  const [updateMessage, setUpdateMessage] = useState('');

  // Encryption Configuration
  const [encryptMode, setEncryptMode] = useState<'Mandatory' | 'Optional' | 'Strict'>(
    initialConfig?.encryption?.mode || 'Mandatory'
  );
  const [trustServerCertificate, setTrustServerCertificate] = useState(
    initialConfig?.encryption?.trust_server_certificate || false
  );

  // Additional Properties
  const [additionalProperties, setAdditionalProperties] = useState(
    initialConfig?.advanced?.additional_properties || ''
  );

  // Advanced settings
  const [connectionTimeout, setConnectionTimeout] = useState(
    initialConfig?.advanced?.connection_timeout || 30
  );
  const [commandTimeout, setCommandTimeout] = useState(
    initialConfig?.advanced?.command_timeout || 300
  );
  const [applicationName, setApplicationName] = useState(
    initialConfig?.advanced?.application_name || 'Uroq_MetadataManager'
  );

  // CDC Settings
  const [cdcEnabled, setCdcEnabled] = useState(initialConfig?.cdc?.enabled || false);

  // Connection string preview
  const [connectionString, setConnectionString] = useState('');
  const [showConnectionStringPassword, setShowConnectionStringPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Build connection string
  useEffect(() => {
    let connStr = `Server=${server || '<server>'}`;

    if (port && port !== 1433) {
      connStr += `,${port}`;
    }

    connStr += `;Database=${database || '<database>'}`;

    // Authentication
    if (authType === 'sql_auth') {
      connStr += `;User Id=${username || '<username>'}`;
      connStr += `;Password=${showConnectionStringPassword ? (password || '<password>') : '***'}`;
    } else if (authType === 'windows_auth') {
      connStr += `;Integrated Security=true`;
    } else if (authType === 'azure_ad') {
      connStr += `;Authentication=ActiveDirectoryPassword`;
      connStr += `;User Id=${username || '<username>'}`;
      connStr += `;Password=${showConnectionStringPassword ? (password || '<password>') : '***'}`;
    }

    // Encryption
    if (encryptMode === 'Mandatory') {
      connStr += `;Encrypt=true`;
    } else if (encryptMode === 'Optional') {
      connStr += `;Encrypt=false`;
    } else if (encryptMode === 'Strict') {
      connStr += `;Encrypt=Strict`;
    }

    if (trustServerCertificate) {
      connStr += `;TrustServerCertificate=true`;
    }

    // Advanced
    if (connectionTimeout !== 30) {
      connStr += `;Connection Timeout=${connectionTimeout}`;
    }
    if (commandTimeout !== 300) {
      connStr += `;Command Timeout=${commandTimeout}`;
    }
    if (applicationName) {
      connStr += `;Application Name=${applicationName}`;
    }

    // Additional Properties
    if (additionalProperties && additionalProperties.trim()) {
      connStr += `;${additionalProperties}`;
    }

    setConnectionString(connStr);
  }, [server, port, database, authType, username, password, showConnectionStringPassword, encryptMode, trustServerCertificate, connectionTimeout, commandTimeout, applicationName, additionalProperties]);

  // Update databases function (loads databases from server)
  const handleUpdateDatabases = async () => {
    setUpdating(true);
    setUpdateResult(null);
    setUpdateMessage('');
    setLoadingDatabases(true);

    try {
      // Call backend API to list databases
      const response = await fetch('http://localhost:3001/api/connections/mssql/list-databases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          server,
          port,
          database: database || 'master',
          authentication: {
            type: authType,
            username,
            password,
          },
          encryption: {
            mode: encryptMode,
            trust_server_certificate: trustServerCertificate,
          },
        }),
      });

      const data = await response.json();

      if (data.success && data.databases) {
        setAvailableDatabases(data.databases);
        setDatabasesLoaded(true);
        setUpdateResult('success');
        setUpdateMessage(`Found ${data.databases.length} database(s)`);

        // If database is not set, select the first non-system database
        if (!database && data.databases.length > 0) {
          const nonSystemDb = data.databases.find(
            (db: string) => !['master', 'tempdb', 'model', 'msdb'].includes(db)
          );
          if (nonSystemDb) {
            setDatabase(nonSystemDb);
          }
        }
      } else {
        setUpdateResult('error');
        setUpdateMessage(data.message || 'Failed to load databases');
      }
    } catch (error: any) {
      setUpdateResult('error');
      setUpdateMessage(`Failed to load databases: ${error.message || 'Network error'}`);
    } finally {
      setUpdating(false);
      setLoadingDatabases(false);
    }
  };

  // Validation
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Connection name is required';
    }
    if (!server.trim()) {
      newErrors.server = 'Server address is required';
    }
    if (!database.trim()) {
      newErrors.database = 'Database name is required';
    }
    if (authType !== 'windows_auth') {
      if (!username.trim()) {
        newErrors.username = 'Username is required';
      }
      if (!password.trim()) {
        newErrors.password = 'Password is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;

    const config: MSSQLConfiguration = {
      server,
      port,
      database,
      authentication: {
        type: authType,
        username,
        password
      },
      encryption: {
        mode: encryptMode,
        trust_server_certificate: trustServerCertificate
      },
      advanced: {
        connection_timeout: connectionTimeout,
        command_timeout: commandTimeout,
        application_name: applicationName,
        additional_properties: additionalProperties
      },
      cdc: {
        enabled: cdcEnabled,
        tracking_tables: []
      }
    };

    onSave(name, config);
  };

  const copyConnectionString = () => {
    navigator.clipboard.writeText(connectionString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const canUpdateDatabases = server.trim() &&
    (authType === 'windows_auth' || (username.trim() && password.trim()));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Database className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">
                {isEdit ? 'Edit' : 'New'} SQL Server Connection
              </h2>
            </div>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
              {/* Connection Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Connection Name *
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Production SQL Server"
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
              </div>

              {/* Server Name */}
              <div>
                <label htmlFor="server" className="block text-sm font-medium text-gray-700 mb-1">
                  Server name *
                </label>
                <input
                  id="server"
                  type="text"
                  value={server}
                  onChange={(e) => setServer(e.target.value)}
                  placeholder="."
                  className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.server ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.server && <p className="text-xs text-red-600 mt-1">{errors.server}</p>}
              </div>

              {/* Authentication Type and Trust Server Certificate */}
              <div>
                <div>
                  <label htmlFor="authType" className="block text-sm font-medium text-gray-700 mb-1">
                    Authentication *
                  </label>
                  <select
                    id="authType"
                    value={authType}
                    onChange={(e) => setAuthType(e.target.value as any)}
                    className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="sql_auth">SQL Authentication</option>
                    <option value="windows_auth">Windows Authentication</option>
                    <option value="azure_ad">Azure AD Authentication</option>
                  </select>
                </div>

                
              </div>

              {/* Username and Password */}
              {authType !== 'windows_auth' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                      Username *
                    </label>
                    <input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="sa or user@domain.com"
                      className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.username ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.username && <p className="text-xs text-red-600 mt-1">{errors.username}</p>}
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`w-full px-3 py-2 pr-10 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.password ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-xs text-red-600 mt-1">{errors.password}</p>}
                  </div>
                </div>
              )}

              {/* Database Selection with Update Button */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="database" className="block text-sm font-medium text-gray-700">
                    Database *
                  </label>
                  {databasesLoaded && !useCustomDatabase && (
                    <button
                      type="button"
                      onClick={() => setUseCustomDatabase(true)}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Enter custom name
                    </button>
                  )}
                  {useCustomDatabase && (
                    <button
                      type="button"
                      onClick={() => setUseCustomDatabase(false)}
                      className="text-xs text-blue-600 hover:text-blue-700"
                    >
                      Select from list
                    </button>
                  )}
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-1">
                    {databasesLoaded && !useCustomDatabase ? (
                      <div className="relative">
                        <select
                          id="database"
                          value={database}
                          onChange={(e) => setDatabase(e.target.value)}
                          className={`w-full px-3 py-2 pr-10 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            errors.database ? 'border-red-500' : 'border-gray-300'
                          }`}
                        >
                          <option value="">Select a database...</option>
                          {availableDatabases.map((db) => (
                            <option key={db} value={db}>
                              {db}
                            </option>
                          ))}
                        </select>
                        {loadingDatabases && (
                          <RefreshCw className="absolute right-12 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
                        )}
                      </div>
                    ) : (
                      <input
                        id="database"
                        type="text"
                        value={database}
                        onChange={(e) => setDatabase(e.target.value)}
                        placeholder="Enter database name"
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          errors.database ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    )}
                    {errors.database && <p className="text-xs text-red-600 mt-1">{errors.database}</p>}
                  </div>

                  <button
                    type="button"
                    onClick={handleUpdateDatabases}
                    disabled={!canUpdateDatabases || updating}
                    className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                  >
                    <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
                    {updating ? 'Updating...' : 'Update'}
                  </button>
                </div>

                {/* Update Status Messages */}
                {updateResult === 'success' && (
                  <div className="flex items-center gap-2 text-green-600 text-sm mt-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>{updateMessage}</span>
                  </div>
                )}
                {updateResult === 'error' && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-2">
                    <XCircle className="w-4 h-4" />
                    <span>{updateMessage}</span>
                  </div>
                )}
              </div>

              {/* Encrypt and Trust Server Certificate */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="encrypt" className="block text-sm font-medium text-gray-700 mb-1">
                    Encrypt
                  </label>
                  <select
                    id="encrypt"
                    value={encryptMode}
                    onChange={(e) => setEncryptMode(e.target.value as 'Mandatory' | 'Optional' | 'Strict')}
                    className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Mandatory">Mandatory</option>
                    <option value="Optional">Optional</option>
                    <option value="Strict">Strict</option>
                  </select>
                </div>

                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={trustServerCertificate}
                      onChange={(e) => setTrustServerCertificate(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Trust server certificate</span>
                  </label>
                </div>
              </div>

              {/* Additional Properties */}
              <div>
                <label htmlFor="additionalProperties" className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Properties
                </label>
                <input
                  id="additionalProperties"
                  type="text"
                  value={additionalProperties}
                  onChange={(e) => setAdditionalProperties(e.target.value)}
                  placeholder="e.g. MultipleActiveResultSets=true;Pooling=false"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Additional connection string properties separated by semicolons
                </p>
              </div>

              {/* Connection String Preview */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700">Connection String Preview</h3>
                  <div className="flex items-center gap-2">
                    {authType !== 'windows_auth' && (
                      <button
                        type="button"
                        onClick={() => setShowConnectionStringPassword(!showConnectionStringPassword)}
                        className="text-xs text-gray-600 hover:text-gray-800 flex items-center gap-1"
                      >
                        {showConnectionStringPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {showConnectionStringPassword ? 'Hide' : 'Show'} Password
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={copyConnectionString}
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
                <code className="block text-xs bg-gray-800 text-green-400 p-3 rounded overflow-x-auto break-all font-mono">
                  {connectionString}
                </code>
              </div>
            </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {isEdit ? 'Save Changes' : 'Create Connection'}
          </button>
        </div>
      </div>
    </div>
  );
}
