import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { APITokenService, APIToken, CreateTokenRequest } from '@/services/api-token-service';
import { useStore } from '@/store/useStore';
import React from 'react';

// =====================================================
// Query Keys
// =====================================================

export const apiTokenKeys = {
  all: ['api-tokens'] as const,
  byUser: (userId: string) => [...apiTokenKeys.all, userId] as const,
  token: (tokenId: string) => [...apiTokenKeys.all, 'token', tokenId] as const,
  scopes: () => [...apiTokenKeys.all, 'scopes'] as const,
};

// =====================================================
// API Token Hooks
// =====================================================

/**
 * Get all API tokens for current user
 */
export function useAPITokens(userId?: string) {
  const {
    data: { user },
  } = useStore().currentUser || { data: { user: null } };
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: apiTokenKeys.byUser(targetUserId || ''),
    queryFn: () => {
      if (!targetUserId) throw new Error('No user ID provided');
      return APITokenService.listTokens(targetUserId);
    },
    enabled: !!targetUserId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get a specific API token by ID
 */
export function useAPIToken(tokenId?: string) {
  return useQuery({
    queryKey: apiTokenKeys.token(tokenId || ''),
    queryFn: () => {
      if (!tokenId) throw new Error('No token ID provided');
      return APITokenService.getToken(tokenId);
    },
    enabled: !!tokenId,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get available scopes for token creation
 */
export function useTokenScopes() {
  return useQuery({
    queryKey: apiTokenKeys.scopes(),
    queryFn: () => APITokenService.getAvailableScopes(),
    staleTime: Infinity, // Scopes don't change
  });
}

/**
 * Create a new API token
 */
export function useCreateAPIToken() {
  const queryClient = useQueryClient();
  const {
    data: { user },
  } = useStore().currentUser || { data: { user: null } };

  return useMutation({
    mutationFn: (request: CreateTokenRequest) => APITokenService.createToken(request),
    onSuccess: (data) => {
      // Invalidate token list to refetch
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: apiTokenKeys.byUser(user.id) });
      }
    },
  });
}

/**
 * Revoke an API token
 */
export function useRevokeAPIToken() {
  const queryClient = useQueryClient();
  const {
    data: { user },
  } = useStore().currentUser || { data: { user: null } };

  return useMutation({
    mutationFn: ({ tokenId, reason }: { tokenId: string; reason?: string }) =>
      APITokenService.revokeToken(tokenId, reason),
    onSuccess: () => {
      // Invalidate token list and specific token
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: apiTokenKeys.byUser(user.id) });
      }
    },
  });
}

/**
 * Validate an API token
 */
export function useValidateAPIToken() {
  return useMutation({
    mutationFn: (token: string) => APITokenService.validateToken(token),
  });
}

// =====================================================
// Utility Hooks
// =====================================================

/**
 * Get active tokens count
 */
export function useActiveTokensCount(userId?: string) {
  const { data: tokens } = useAPITokens(userId);
  return tokens?.filter((t) => t.isActive && !t.revokedAt).length || 0;
}

/**
 * Check if user has any active tokens
 */
export function useHasActiveTokens(userId?: string) {
  const count = useActiveTokensCount(userId);
  return count > 0;
}

/**
 * Get tokens expiring soon (within 7 days)
 */
export function useTokensExpiringSoon(userId?: string) {
  const { data: tokens } = useAPITokens(userId);

  if (!tokens) return [];

  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  return tokens.filter((token) => {
    if (!token.expiresAt || !token.isActive || token.revokedAt) return false;
    const expiryDate = new Date(token.expiresAt);
    return expiryDate > new Date() && expiryDate <= sevenDaysFromNow;
  });
}

/**
 * Get formatted token for display
 */
export function useFormattedToken(token?: APIToken) {
  if (!token) return null;
  return APITokenService.formatTokenForDisplay(token.prefix);
}

/**
 * Get token status information
 */
export function useTokenStatus(token?: APIToken) {
  if (!token) return null;

  return {
    color: APITokenService.getTokenStatusColor(token),
    text: APITokenService.getTokenStatusText(token),
    isExpired: token.expiresAt ? new Date(token.expiresAt) < new Date() : false,
    isRevoked: !!token.revokedAt,
    isActive: token.isActive && !token.revokedAt,
  };
}

/**
 * Check if token has specific scope
 */
export function useTokenHasScope(token?: APIToken, scope?: string) {
  if (!token || !scope) return false;
  return APITokenService.hasScope(token, scope);
}

/**
 * Get formatted expiry display
 */
export function useFormattedExpiry(expiresAt?: Date) {
  return APITokenService.formatExpiryDate(expiresAt);
}

/**
 * Get formatted last used display
 */
export function useFormattedLastUsed(lastUsedAt?: Date) {
  return APITokenService.formatLastUsed(lastUsedAt);
}

/**
 * Hook for managing token creation flow with state
 */
export function useTokenCreationFlow() {
  const [name, setName] = React.useState('');
  const [selectedScopes, setSelectedScopes] = React.useState<string[]>([]);
  const [expiresInDays, setExpiresInDays] = React.useState<number | null>(90);
  const [createdToken, setCreatedToken] = React.useState<string | null>(null);
  const [showTokenDialog, setShowTokenDialog] = React.useState(false);

  const createToken = useCreateAPIToken();

  const handleCreate = async () => {
    try {
      const result = await createToken.mutateAsync({
        name,
        scopes: selectedScopes,
        expiresInDays,
      });

      setCreatedToken(result.token);
      setShowTokenDialog(true);

      // Reset form
      setName('');
      setSelectedScopes([]);
      setExpiresInDays(90);
    } catch (error) {
      console.error('Failed to create token:', error);
      throw error;
    }
  };

  const handleCloseTokenDialog = () => {
    setShowTokenDialog(false);
    setCreatedToken(null);
  };

  const handleCopyToken = async () => {
    if (createdToken) {
      await navigator.clipboard.writeText(createdToken);
    }
  };

  const isValid = name.trim().length > 0 && selectedScopes.length > 0;

  return {
    name,
    setName,
    selectedScopes,
    setSelectedScopes,
    expiresInDays,
    setExpiresInDays,
    createdToken,
    showTokenDialog,
    isValid,
    isCreating: createToken.isPending,
    error: createToken.error,
    handleCreate,
    handleCloseTokenDialog,
    handleCopyToken,
    toggleScope: (scope: string) => {
      setSelectedScopes((prev) =>
        prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
      );
    },
  };
}

/**
 * Hook for token revocation with confirmation
 */
export function useTokenRevocation() {
  const [tokenToRevoke, setTokenToRevoke] = React.useState<APIToken | null>(null);
  const [revokeReason, setRevokeReason] = React.useState('');
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);

  const revokeToken = useRevokeAPIToken();

  const handleRequestRevoke = (token: APIToken) => {
    setTokenToRevoke(token);
    setShowConfirmDialog(true);
  };

  const handleConfirmRevoke = async () => {
    if (!tokenToRevoke) return;

    try {
      await revokeToken.mutateAsync({
        tokenId: tokenToRevoke.id,
        reason: revokeReason || undefined,
      });

      // Reset state
      setTokenToRevoke(null);
      setRevokeReason('');
      setShowConfirmDialog(false);
    } catch (error) {
      console.error('Failed to revoke token:', error);
      throw error;
    }
  };

  const handleCancelRevoke = () => {
    setTokenToRevoke(null);
    setRevokeReason('');
    setShowConfirmDialog(false);
  };

  return {
    tokenToRevoke,
    revokeReason,
    setRevokeReason,
    showConfirmDialog,
    isRevoking: revokeToken.isPending,
    error: revokeToken.error,
    handleRequestRevoke,
    handleConfirmRevoke,
    handleCancelRevoke,
  };
}

/**
 * Group scopes by category for UI display
 */
export function useGroupedScopes() {
  const { data: scopes } = useTokenScopes();

  return React.useMemo(() => {
    if (!scopes) return {};

    return scopes.reduce((acc, scope) => {
      if (!acc[scope.category]) {
        acc[scope.category] = [];
      }
      acc[scope.category].push(scope);
      return acc;
    }, {} as Record<string, typeof scopes>);
  }, [scopes]);
}

/**
 * Get token statistics
 */
export function useTokenStatistics(userId?: string) {
  const { data: tokens } = useAPITokens(userId);

  return React.useMemo(() => {
    if (!tokens) {
      return {
        total: 0,
        active: 0,
        revoked: 0,
        expired: 0,
        expiringSoon: 0,
        neverUsed: 0,
      };
    }

    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    return {
      total: tokens.length,
      active: tokens.filter((t) => t.isActive && !t.revokedAt).length,
      revoked: tokens.filter((t) => t.revokedAt).length,
      expired: tokens.filter((t) => t.expiresAt && new Date(t.expiresAt) < now).length,
      expiringSoon: tokens.filter(
        (t) =>
          t.expiresAt &&
          t.isActive &&
          !t.revokedAt &&
          new Date(t.expiresAt) > now &&
          new Date(t.expiresAt) <= sevenDaysFromNow
      ).length,
      neverUsed: tokens.filter((t) => !t.lastUsedAt && t.isActive).length,
    };
  }, [tokens]);
}
