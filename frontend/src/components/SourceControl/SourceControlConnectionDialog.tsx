/**
 * Source Control Connection Dialog
 * Modal dialog for connecting a workspace to source control
 */

import { useState } from 'react';
import { X, AlertCircle, CheckCircle2, Loader2, Github, GitlabIcon } from 'lucide-react';
import { useConnect, useTestConnection } from '../../hooks';
import type {
  SourceControlProvider,
  SourceControlConnectionConfig,
  SourceControlCredentials
} from '@/types/source-control';

interface SourceControlConnectionDialogProps {
  workspaceId: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export function SourceControlConnectionDialog({
  workspaceId,
  onClose,
  onSuccess,
}: SourceControlConnectionDialogProps) {
  // Form state
  const [provider, setProvider] = useState<SourceControlProvider>('github');
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [accessToken, setAccessToken] = useState('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Mutations
  const connectMutation = useConnect({
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Failed to connect:', error);
    }
  });

  const testConnectionMutation = useTestConnection({
    onSuccess: (result) => {
      setTestResult(result);
    },
    onError: () => {
      setTestResult({
        success: false,
        message: 'Failed to test connection. Please check your credentials.'
      });
    }
  });

  const handleTestConnection = async () => {
    if (!accessToken.trim() || !repoUrl.trim()) {
      setTestResult({
        success: false,
        message: 'Please fill in all required fields'
      });
      return;
    }

    setTestResult(null);
    testConnectionMutation.mutate(workspaceId);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!accessToken.trim() || !repoUrl.trim() || !branch.trim()) {
      return;
    }

    const credentials: SourceControlCredentials = {
      access_token: accessToken.trim()
    };

    const config: SourceControlConnectionConfig = {
      provider,
      repo_url: repoUrl.trim(),
      branch: branch.trim(),
      credentials
    };

    connectMutation.mutate({ config, workspaceId });
  };

  const providers: { value: SourceControlProvider; label: string; icon: React.ReactNode }[] = [
    { value: 'github', label: 'GitHub', icon: <Github className="w-5 h-5" /> },
    { value: 'gitlab', label: 'GitLab', icon: <GitlabIcon className="w-5 h-5" /> },
    { value: 'bitbucket', label: 'Bitbucket', icon: <span className="w-5 h-5 font-bold text-blue-600">BB</span> },
    { value: 'azure_devops', label: 'Azure DevOps', icon: <span className="w-5 h-5 font-bold text-blue-500">AD</span> },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Connect Source Control</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {connectMutation.isError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Failed to connect</p>
                <p className="text-sm text-red-600 mt-1">
                  {connectMutation.error?.message || 'An unexpected error occurred'}
                </p>
              </div>
            </div>
          )}

          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Provider *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {providers.map((prov) => (
                <button
                  key={prov.value}
                  type="button"
                  onClick={() => setProvider(prov.value)}
                  className={`p-4 border-2 rounded-lg transition-all flex items-center gap-3 ${
                    provider === prov.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {prov.icon}
                  <span className="font-medium">{prov.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Repository URL */}
          <div>
            <label htmlFor="repoUrl" className="block text-sm font-medium text-gray-700 mb-2">
              Repository URL *
            </label>
            <input
              id="repoUrl"
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/username/repository"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Full URL to your repository
            </p>
          </div>

          {/* Branch */}
          <div>
            <label htmlFor="branch" className="block text-sm font-medium text-gray-700 mb-2">
              Branch *
            </label>
            <input
              id="branch"
              type="text"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              placeholder="main"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Branch name to sync with (typically 'main' or 'master')
            </p>
          </div>

          {/* Access Token */}
          <div>
            <label htmlFor="accessToken" className="block text-sm font-medium text-gray-700 mb-2">
              Personal Access Token *
            </label>
            <input
              id="accessToken"
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Token will be encrypted and stored securely
            </p>
          </div>

          {/* Test Connection Button */}
          <div>
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testConnectionMutation.isPending || !accessToken.trim() || !repoUrl.trim()}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {testConnectionMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Testing Connection...
                </>
              ) : (
                'Test Connection'
              )}
            </button>

            {/* Test Result */}
            {testResult && (
              <div
                className={`mt-3 p-3 rounded-lg flex items-start gap-2 ${
                  testResult.success
                    ? 'bg-green-50 border border-green-200'
                    : 'bg-red-50 border border-red-200'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p
                    className={`text-sm font-medium ${
                      testResult.success ? 'text-green-800' : 'text-red-800'
                    }`}
                  >
                    {testResult.success ? 'Connection Successful' : 'Connection Failed'}
                  </p>
                  <p
                    className={`text-sm mt-1 ${
                      testResult.success ? 'text-green-700' : 'text-red-600'
                    }`}
                  >
                    {testResult.message}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              How to create a Personal Access Token:
            </h4>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>GitHub: Settings → Developer settings → Personal access tokens</li>
              <li>GitLab: User Settings → Access Tokens</li>
              <li>Bitbucket: Personal settings → App passwords</li>
              <li>Azure DevOps: User settings → Personal access tokens</li>
            </ul>
            <p className="text-xs text-blue-700 mt-2">
              Required permissions: Read and write access to repository contents
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={connectMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={connectMutation.isPending || !accessToken.trim() || !repoUrl.trim() || !branch.trim()}
            >
              {connectMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Connecting...
                </span>
              ) : (
                'Connect'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
