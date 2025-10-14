import { useState } from 'react';
import { Key, Plus, Copy, Eye, EyeOff, Trash2, AlertCircle, CheckCircle, Clock, Shield } from 'lucide-react';
import {
  useAPITokens,
  useTokenCreationFlow,
  useTokenRevocation,
  useTokenStatistics,
  useGroupedScopes,
  useFormattedExpiry,
  useFormattedLastUsed,
  useTokenStatus,
} from '@/hooks/useAPITokens';
import { APIToken } from '@/services/api-token-service';

export function APITokenManagement() {
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const { data: tokens, isLoading } = useAPITokens();
  const statistics = useTokenStatistics();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">API Tokens</h2>
          <p className="text-sm text-gray-600 mt-1">Manage API tokens for programmatic access</p>
        </div>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Token
        </button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        <StatCard label="Total" value={statistics.total} color="gray" />
        <StatCard label="Active" value={statistics.active} color="green" />
        <StatCard label="Revoked" value={statistics.revoked} color="red" />
        <StatCard label="Expired" value={statistics.expired} color="orange" />
        <StatCard label="Expiring Soon" value={statistics.expiringSoon} color="yellow" />
        <StatCard label="Never Used" value={statistics.neverUsed} color="blue" />
      </div>

      {/* Tokens List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-gray-500">Loading tokens...</div>
        ) : !tokens || tokens.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Key className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p>No API tokens yet</p>
            <p className="text-sm mt-1">Create your first token to get started</p>
          </div>
        ) : (
          tokens.map((token) => <TokenCard key={token.id} token={token} />)
        )}
      </div>

      {/* Create Token Dialog */}
      {showCreateDialog && <CreateTokenDialog onClose={() => setShowCreateDialog(false)} />}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'gray' | 'green' | 'red' | 'orange' | 'yellow' | 'blue';
}) {
  const colorClasses = {
    gray: 'bg-gray-50 text-gray-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    orange: 'bg-orange-50 text-orange-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    blue: 'bg-blue-50 text-blue-700',
  };

  return (
    <div className={`rounded-lg p-4 ${colorClasses[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs mt-1 opacity-75">{label}</div>
    </div>
  );
}

function TokenCard({ token }: { token: APIToken }) {
  const [showToken, setShowToken] = useState(false);
  const status = useTokenStatus(token);
  const expiryText = useFormattedExpiry(token.expiresAt);
  const lastUsedText = useFormattedLastUsed(token.lastUsedAt);
  const revocation = useTokenRevocation();

  const handleCopyToken = async () => {
    const displayToken = `${token.prefix}${'*'.repeat(52)}`;
    await navigator.clipboard.writeText(displayToken);
  };

  const handleRevoke = () => {
    revocation.handleRequestRevoke(token);
  };

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Token Name */}
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-gray-900 truncate">{token.name}</h3>
              <StatusBadge status={status} />
            </div>

            {/* Token Value */}
            <div className="flex items-center gap-2 mb-3">
              <code className="text-sm bg-gray-100 px-3 py-1 rounded font-mono text-gray-700">
                {token.prefix}{'*'.repeat(showToken ? 0 : 52)}
              </code>
              <button
                onClick={() => setShowToken(!showToken)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title={showToken ? 'Hide token' : 'Show token'}
              >
                {showToken ? <EyeOff className="w-4 h-4 text-gray-600" /> : <Eye className="w-4 h-4 text-gray-600" />}
              </button>
              <button
                onClick={handleCopyToken}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
                title="Copy token"
              >
                <Copy className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>Created {new Date(token.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{expiryText}</span>
              </div>
              <div className="flex items-center gap-1">
                <Key className="w-4 h-4" />
                <span>{lastUsedText}</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="w-4 h-4" />
                <span>{token.usageCount} uses</span>
              </div>
            </div>

            {/* Scopes */}
            <div className="mt-3 flex flex-wrap gap-1">
              {token.scopes.slice(0, 5).map((scope) => (
                <span
                  key={scope}
                  className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full"
                >
                  {scope}
                </span>
              ))}
              {token.scopes.length > 5 && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                  +{token.scopes.length - 5} more
                </span>
              )}
            </div>

            {/* Revocation Info */}
            {token.revokedAt && (
              <div className="mt-3 text-sm text-red-600">
                Revoked {new Date(token.revokedAt).toLocaleDateString()}
                {token.revokeReason && ` - ${token.revokeReason}`}
              </div>
            )}
          </div>

          {/* Actions */}
          {token.isActive && !token.revokedAt && (
            <button
              onClick={handleRevoke}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Revoke token"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Revoke Confirmation Dialog */}
      {revocation.showConfirmDialog && revocation.tokenToRevoke?.id === token.id && (
        <RevokeTokenDialog
          token={token}
          reason={revocation.revokeReason}
          setReason={revocation.setRevokeReason}
          onConfirm={revocation.handleConfirmRevoke}
          onCancel={revocation.handleCancelRevoke}
          isRevoking={revocation.isRevoking}
        />
      )}
    </>
  );
}

function StatusBadge({ status }: { status: ReturnType<typeof useTokenStatus> }) {
  if (!status) return null;

  const colorClasses = {
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    orange: 'bg-orange-100 text-orange-800',
    gray: 'bg-gray-100 text-gray-800',
  };

  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium ${colorClasses[status.color]}`}>
      {status.text}
    </span>
  );
}

function CreateTokenDialog({ onClose }: { onClose: () => void }) {
  const flow = useTokenCreationFlow();
  const groupedScopes = useGroupedScopes();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await flow.handleCreate();
    } catch (error) {
      console.error('Failed to create token:', error);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-gray-200 sticky top-0 bg-white">
            <h3 className="text-xl font-semibold">Create API Token</h3>
            <p className="text-sm text-gray-600 mt-1">
              Generate a new token for programmatic access to your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Token Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={flow.name}
                onChange={(e) => flow.setName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Production API Token"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                A descriptive name to help you identify this token
              </p>
            </div>

            {/* Expiry */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiration</label>
              <select
                value={flow.expiresInDays === null ? 'never' : flow.expiresInDays}
                onChange={(e) =>
                  flow.setExpiresInDays(e.target.value === 'never' ? null : parseInt(e.target.value))
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
                <option value="180">6 months</option>
                <option value="365">1 year</option>
                <option value="never">Never</option>
              </select>
            </div>

            {/* Scopes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scopes <span className="text-red-500">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Select the permissions this token should have
              </p>

              <div className="space-y-4 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-4">
                {Object.entries(groupedScopes).map(([category, scopes]) => (
                  <div key={category}>
                    <h4 className="font-medium text-gray-900 mb-2">{category}</h4>
                    <div className="space-y-2">
                      {scopes.map((scope) => (
                        <label key={scope.value} className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={flow.selectedScopes.includes(scope.value)}
                            onChange={() => flow.toggleScope(scope.value)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">{scope.label}</div>
                            <div className="text-xs text-gray-600">{scope.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {flow.selectedScopes.length === 0 && (
                <p className="text-xs text-red-600 mt-2">Please select at least one scope</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={flow.isCreating}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!flow.isValid || flow.isCreating}
              >
                {flow.isCreating ? 'Creating...' : 'Create Token'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Token Display Dialog */}
      {flow.showTokenDialog && flow.createdToken && (
        <TokenDisplayDialog
          token={flow.createdToken}
          onClose={() => {
            flow.handleCloseTokenDialog();
            onClose();
          }}
          onCopy={flow.handleCopyToken}
        />
      )}
    </>
  );
}

function TokenDisplayDialog({
  token,
  onClose,
  onCopy,
}: {
  token: string;
  onClose: () => void;
  onCopy: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold">Token Created</h3>
              <p className="text-sm text-gray-600">Save this token now - you won't see it again</p>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Important: Copy your token now</p>
              <p className="mt-1">
                For security reasons, this token will only be shown once. Make sure to copy and save it in a
                secure location.
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <code className="text-sm font-mono text-gray-900 break-all">{token}</code>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCopy}
              className="flex-1 btn-primary flex items-center justify-center gap-2"
            >
              {copied ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy Token
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function RevokeTokenDialog({
  token,
  reason,
  setReason,
  onConfirm,
  onCancel,
  isRevoking,
}: {
  token: APIToken;
  reason: string;
  setReason: (reason: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isRevoking: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-2">Revoke API Token</h3>
          <p className="text-sm text-gray-600 mb-4">
            Are you sure you want to revoke "{token.name}"? This action cannot be undone.
          </p>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Optional)</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Why are you revoking this token?"
              rows={3}
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isRevoking}
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isRevoking}
            >
              {isRevoking ? 'Revoking...' : 'Revoke Token'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
