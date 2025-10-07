import { useState, useEffect } from 'react';
import { Github, Check, X, AlertCircle, Loader2 } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { githubApi } from '@/api/github';

export function GitHubSettings() {
  const { currentWorkspace } = useStore();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [githubRepo, setGithubRepo] = useState('');
  const [githubToken, setGithubToken] = useState('');
  const [githubBranch, setGithubBranch] = useState('main');

  // Repository info
  const [repoInfo, setRepoInfo] = useState<any>(null);

  useEffect(() => {
    if (currentWorkspace) {
      checkConnectionStatus();
    }
  }, [currentWorkspace]);

  const checkConnectionStatus = async () => {
    if (!currentWorkspace) return;

    setIsLoading(true);
    try {
      const status = await githubApi.getConnectionStatus(currentWorkspace.id);
      setIsConnected(status.connected);
      setRepoInfo(status.repository);
    } catch (err) {
      console.error('Failed to check GitHub status:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await githubApi.connect(
        currentWorkspace.id,
        githubRepo,
        githubToken,
        githubBranch
      );

      setIsConnected(true);
      setRepoInfo(result.repository);
      setSuccess('Successfully connected to GitHub repository!');
      setGithubToken(''); // Clear token from UI
    } catch (err: any) {
      setError(err.message || 'Failed to connect to GitHub');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setRepoInfo(null);
    setGithubRepo('');
    setGithubToken('');
    setGithubBranch('main');
  };

  if (!currentWorkspace) {
    return (
      <div className="p-6 text-center text-gray-500">
        Please select a workspace to configure GitHub integration
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-900 rounded-lg flex items-center justify-center">
          <Github className="w-6 h-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">GitHub Integration</h2>
          <p className="text-sm text-gray-500">
            Version-control your data models and templates
          </p>
        </div>
      </div>

      {/* Connection Status */}
      {isConnected && repoInfo && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Check className="w-5 h-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-green-900">Connected to GitHub</h3>
              <p className="text-sm text-green-700 mt-1">
                Repository: <span className="font-mono">{repoInfo.fullName}</span>
              </p>
              {repoInfo.description && (
                <p className="text-sm text-green-600 mt-1">{repoInfo.description}</p>
              )}
              <div className="mt-3 flex gap-2">
                <a
                  href={repoInfo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-green-700 hover:text-green-800 underline"
                >
                  View Repository →
                </a>
                <button
                  onClick={handleDisconnect}
                  className="text-sm text-red-600 hover:text-red-700 underline"
                >
                  Disconnect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900">Connection Failed</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <Check className="w-5 h-5 text-green-600 mt-0.5" />
          <p className="text-sm text-green-700">{success}</p>
        </div>
      )}

      {/* Connection Form */}
      {!isConnected && (
        <form onSubmit={handleConnect} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Repository
            </label>
            <input
              type="text"
              value={githubRepo}
              onChange={(e) => setGithubRepo(e.target.value)}
              placeholder="owner/repository"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Format: username/repository (e.g., "acme/bricker-metadata")
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Personal Access Token
            </label>
            <input
              type="password"
              value={githubToken}
              onChange={(e) => setGithubToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              <a
                href="https://github.com/settings/tokens/new?scopes=repo"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-500 hover:text-primary-700 underline"
              >
                Create a token
              </a>{' '}
              with <code className="bg-gray-100 px-1 rounded">repo</code> scope
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Branch
            </label>
            <input
              type="text"
              value={githubBranch}
              onChange={(e) => setGithubBranch(e.target.value)}
              placeholder="main"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Default branch for committing files
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Github className="w-4 h-4" />
                Connect to GitHub
              </>
            )}
          </button>
        </form>
      )}

      {/* Info Panel */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">What gets stored in GitHub?</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Data models as YAML files in <code className="bg-blue-100 px-1 rounded">metadata/models/</code></li>
          <li>• Templates in <code className="bg-blue-100 px-1 rounded">metadata/templates/</code></li>
          <li>• Workspace configurations in <code className="bg-blue-100 px-1 rounded">metadata/configurations/</code></li>
          <li>• All files are version-controlled with descriptive commit messages</li>
        </ul>
      </div>
    </div>
  );
}
