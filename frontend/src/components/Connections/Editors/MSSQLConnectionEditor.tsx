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
  // Tab state
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced'>('basic');

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

  // Test connection state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testMessage, setTestMessage] = useState('');

  // SSL Configuration
  const [sslEnabled, setSslEnabled] = useState(initialConfig?.ssl?.enabled || false);
  const [trustServerCertificate, setTrustServerCertificate] = useState(
    initialConfig?.ssl?.trust_server_certificate || false
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
      connStr += `;Password=${showPassword ? password : '***'}`;
    } else if (authType === 'windows_auth') {
      connStr += `;Integrated Security=true`;
    } else if (authType === 'azure_ad') {
      connStr += `;Authentication=ActiveDirectoryPassword`;
      connStr += `;User Id=${username || '<username>'}`;
      connStr += `;Password=${showPassword ? password : '***'}`;
    }

    // SSL
    if (sslEnabled) {
      connStr += `;Encrypt=true`;
      if (trustServerCertificate) {
        connStr += `;TrustServerCertificate=true`;
      }
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

    setConnectionString(connStr);
  }, [server, port, database, authType, username, password, showPassword, sslEnabled, trustServerCertificate, connectionTimeout, commandTimeout, applicationName]);

  // Auto-load databases when server and auth are provided
  useEffect(() => {
    const canLoadDatabases = server.trim() &&
      (authType === 'windows_auth' || (username.trim() && password.trim()));

    if (canLoadDatabases && !databasesLoaded) {
      loadDatabases();
    }
  }, [server, authType, username, password]);

  // Test connection function
  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    setTestMessage('');

    try {
      // TODO: Call Supabase Edge Function to test connection
      // For now, simulate with timeout
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Simulate success
      setTestResult('success');
      setTestMessage('Connection successful!');

      // Also load databases on successful test
      if (!databasesLoaded) {
        await loadDatabases();
      }
    } catch (error) {
      setTestResult('error');
      setTestMessage('Connection failed. Please check your credentials.');
    } finally {
      setTesting(false);
    }
  };

  // Load databases function
  const loadDatabases = async () => {
    setLoadingDatabases(true);
    try {
      // TODO: Call Supabase Edge Function to list databases
      // For now, simulate with timeout and mock data
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Mock database list
      const mockDatabases = [
        'master',
        'tempdb',
        'model',
        'msdb',
        'AdventureWorks',
        'WideWorldImporters',
        'Northwind',
        'MyDatabase'
      ];

      setAvailableDatabases(mockDatabases);
      setDatabasesLoaded(true);

      // If database is not set, select the first non-system database
      if (!database && mockDatabases.length > 4) {
        setDatabase(mockDatabases[4]);
      }
    } catch (error) {
      console.error('Failed to load databases:', error);
    } finally {
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
      ssl: {
        enabled: sslEnabled,
        trust_server_certificate: trustServerCertificate
      },
      advanced: {
        connection_timeout: connectionTimeout,
        command_timeout: commandTimeout,
        application_name: applicationName
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

  const canTestConnection = server.trim() &&
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

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('basic')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'basic'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Basic Settings
          </button>
          <button
            onClick={() => setActiveTab('advanced')}
            className={`px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'advanced'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Advanced Settings
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'basic' ? (
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

              {/* Server Address and Port */}
              <div className="grid grid-cols-4 gap-3">
                <div className="col-span-3">
                  <label htmlFor="server" className="block text-sm font-medium text-gray-700 mb-1">
                    Server Address *
                  </label>
                  <input
                    id="server"
                    type="text"
                    value={server}
                    onChange={(e) => setServer(e.target.value)}
                    placeholder="sql-server.example.com"
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.server ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.server && <p className="text-xs text-red-600 mt-1">{errors.server}</p>}
                </div>
                <div>
                  <label htmlFor="port" className="block text-sm font-medium text-gray-700 mb-1">
                    Port
                  </label>
                  <input
                    id="port"
                    type="number"
                    value={port}
                    onChange={(e) => setPort(parseInt(e.target.value))}
                    placeholder="1433"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Authentication Type */}
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

              {/* Test Connection Button */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={!canTestConnection || testing}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${testing ? 'animate-spin' : ''}`} />
                  {testing ? 'Testing...' : 'Test Connection'}
                </button>
                {testResult === 'success' && (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>{testMessage}</span>
                  </div>
                )}
                {testResult === 'error' && (
                  <div className="flex items-center gap-2 text-red-600 text-sm">
                    <XCircle className="w-4 h-4" />
                    <span>{testMessage}</span>
                  </div>
                )}
              </div>

              {/* Database Selection */}
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
                {!databasesLoaded && canTestConnection && (
                  <p className="text-xs text-gray-500 mt-1">
                    Test connection to load available databases
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* SSL/TLS Settings */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">SSL/TLS Encryption</h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sslEnabled}
                      onChange={(e) => setSslEnabled(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Enable SSL/TLS Encryption</span>
                  </label>
                  {sslEnabled && (
                    <label className="flex items-center gap-2 cursor-pointer pl-6">
                      <input
                        type="checkbox"
                        checked={trustServerCertificate}
                        onChange={(e) => setTrustServerCertificate(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">Trust Server Certificate</span>
                    </label>
                  )}
                </div>
              </div>

              {/* Timeout Settings */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Timeout Settings</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="connectionTimeout" className="block text-sm font-medium text-gray-700 mb-1">
                      Connection Timeout (seconds)
                    </label>
                    <input
                      id="connectionTimeout"
                      type="number"
                      value={connectionTimeout}
                      onChange={(e) => setConnectionTimeout(parseInt(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="commandTimeout" className="block text-sm font-medium text-gray-700 mb-1">
                      Command Timeout (seconds)
                    </label>
                    <input
                      id="commandTimeout"
                      type="number"
                      value={commandTimeout}
                      onChange={(e) => setCommandTimeout(parseInt(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Application Settings */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Application Settings</h3>
                <div>
                  <label htmlFor="applicationName" className="block text-sm font-medium text-gray-700 mb-1">
                    Application Name
                  </label>
                  <input
                    id="applicationName"
                    type="text"
                    value={applicationName}
                    onChange={(e) => setApplicationName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Identifier shown in SQL Server's activity monitor
                  </p>
                </div>
              </div>

              {/* CDC Settings */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Change Data Capture (CDC)</h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cdcEnabled}
                    onChange={(e) => setCdcEnabled(e.target.checked)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Enable CDC Tracking</span>
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  Track incremental data changes for efficient delta loads (requires CDC to be enabled on the database)
                </p>
              </div>

              {/* Connection String Preview */}
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-700">Connection String</h3>
                  <button
                    type="button"
                    onClick={copyConnectionString}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <code className="block text-xs bg-gray-800 text-green-400 p-3 rounded overflow-x-auto break-all">
                  {connectionString}
                </code>
              </div>
            </div>
          )}
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
