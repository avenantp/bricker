import { supabase } from '@/lib/supabase';
import { createHash } from 'crypto';

// =====================================================
// Types
// =====================================================

export interface APIToken {
  id: string;
  accountId: string;
  userId: string;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsedAt?: Date;
  usageCount: number;
  expiresAt?: Date;
  isActive: boolean;
  revokedAt?: Date;
  revokedBy?: string;
  revokeReason?: string;
  createdAt: Date;
}

export interface APITokenWithSecret extends APIToken {
  token: string; // Full token - only shown once at creation
}

export interface CreateTokenRequest {
  accountId?: string;
  name: string;
  scopes: string[];
  expiresInDays?: number | null;
}

export interface ValidateTokenResult {
  valid: boolean;
  token?: APIToken;
  account?: {
    id: string;
    name: string;
    subscriptionTier: string;
  };
  user?: {
    id: string;
    email: string;
    fullName: string | null;
  };
  error?: string;
}

// =====================================================
// API Token Service
// =====================================================

export class APITokenService {
  private static readonly TOKEN_PREFIX = 'uro_';
  private static readonly TOKEN_LENGTH = 64; // 64 hex characters = 32 bytes

  /**
   * Create a new API token
   * Returns the full token only once - it must be saved immediately
   */
  static async createToken(request: CreateTokenRequest): Promise<APITokenWithSecret> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get account ID
      let accountId = request.accountId;
      if (!accountId) {
        // Get user's current account
        const { data: accountUser } = await supabase
          .from('account_users')
          .select('account_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        if (!accountUser) throw new Error('No active account found');
        accountId = accountUser.account_id;
      }

      // Generate secure token using database function
      const { data: tokenData, error: tokenError } = await supabase.rpc('generate_api_token');

      if (tokenError || !tokenData) {
        throw new Error('Failed to generate token');
      }

      const fullToken = tokenData as string;
      const prefix = fullToken.substring(0, 12); // uro_XXXXXXXX

      // Hash the token for storage
      const tokenHash = this.hashToken(fullToken);

      // Calculate expiry date
      let expiresAt: string | null = null;
      if (request.expiresInDays !== null && request.expiresInDays !== undefined) {
        const expiry = new Date();
        expiry.setDate(expiry.getDate() + request.expiresInDays);
        expiresAt = expiry.toISOString();
      }

      // Create token record
      const { data: token, error: createError } = await supabase
        .from('api_tokens')
        .insert({
          account_id: accountId,
          user_id: user.id,
          name: request.name,
          token_hash: tokenHash,
          prefix: prefix,
          scopes: request.scopes,
          expires_at: expiresAt,
          is_active: true,
        })
        .select()
        .single();

      if (createError) throw createError;

      return {
        ...this.mapTokenFromDb(token),
        token: fullToken, // Full token only returned here
      };
    } catch (error) {
      console.error('Failed to create API token:', error);
      throw error;
    }
  }

  /**
   * List user's API tokens (without full token value)
   */
  static async listTokens(userId?: string): Promise<APIToken[]> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const targetUserId = userId || user.id;

      const { data, error } = await supabase
        .from('api_tokens')
        .select('*')
        .eq('user_id', targetUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(this.mapTokenFromDb);
    } catch (error) {
      console.error('Failed to list API tokens:', error);
      throw error;
    }
  }

  /**
   * Get a specific token by ID
   */
  static async getToken(tokenId: string): Promise<APIToken | null> {
    try {
      const { data, error } = await supabase
        .from('api_tokens')
        .select('*')
        .eq('id', tokenId)
        .single();

      if (error) throw error;
      if (!data) return null;

      return this.mapTokenFromDb(data);
    } catch (error) {
      console.error('Failed to get API token:', error);
      throw error;
    }
  }

  /**
   * Revoke an API token
   */
  static async revokeToken(tokenId: string, reason?: string): Promise<void> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('api_tokens')
        .update({
          is_active: false,
          revoked_at: new Date().toISOString(),
          revoked_by: user.id,
          revoke_reason: reason,
        })
        .eq('id', tokenId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to revoke API token:', error);
      throw error;
    }
  }

  /**
   * Validate an API token
   * This is typically called by backend/API endpoints
   */
  static async validateToken(token: string): Promise<ValidateTokenResult> {
    try {
      // Check token format
      if (!token.startsWith(this.TOKEN_PREFIX)) {
        return { valid: false, error: 'Invalid token format' };
      }

      // Hash the token
      const tokenHash = this.hashToken(token);

      // Look up token by hash
      const { data: tokenData, error: tokenError } = await supabase
        .from('api_tokens')
        .select(
          `
          *,
          accounts!inner (
            id,
            name,
            subscription_tier
          ),
          users!inner (
            id,
            email,
            full_name
          )
        `
        )
        .eq('token_hash', tokenHash)
        .eq('is_active', true)
        .single();

      if (tokenError || !tokenData) {
        return { valid: false, error: 'Invalid token' };
      }

      // Check expiry
      if (tokenData.expires_at) {
        const expiryDate = new Date(tokenData.expires_at);
        if (expiryDate < new Date()) {
          return { valid: false, error: 'Token expired' };
        }
      }

      // Update last used timestamp
      await this.updateLastUsed(tokenData.id);

      return {
        valid: true,
        token: this.mapTokenFromDb(tokenData),
        account: {
          id: tokenData.accounts.id,
          name: tokenData.accounts.name,
          subscriptionTier: tokenData.accounts.subscription_tier,
        },
        user: {
          id: tokenData.users.id,
          email: tokenData.users.email,
          fullName: tokenData.users.full_name,
        },
      };
    } catch (error) {
      console.error('Failed to validate API token:', error);
      return { valid: false, error: 'Token validation failed' };
    }
  }

  /**
   * Update token last used timestamp
   */
  static async updateLastUsed(tokenId: string): Promise<void> {
    try {
      await supabase
        .from('api_tokens')
        .update({
          last_used_at: new Date().toISOString(),
          usage_count: supabase.rpc('increment', { row_id: tokenId, x: 1 }),
        })
        .eq('id', tokenId);
    } catch (error) {
      console.error('Failed to update last used:', error);
      // Don't throw - this is not critical
    }
  }

  /**
   * Check if a scope is valid
   */
  static isValidScope(scope: string): boolean {
    const validScopes = [
      'read:projects',
      'write:projects',
      'delete:projects',
      'read:datasets',
      'write:datasets',
      'delete:datasets',
      'read:models',
      'write:models',
      'delete:models',
      'read:templates',
      'write:templates',
      'read:configurations',
      'write:configurations',
      'read:team',
      'write:team',
      'read:usage',
      'admin',
    ];

    return validScopes.includes(scope);
  }

  /**
   * Get available scopes for token creation
   */
  static getAvailableScopes(): Array<{
    value: string;
    label: string;
    description: string;
    category: string;
  }> {
    return [
      // Projects
      {
        value: 'read:projects',
        label: 'Read Projects',
        description: 'View project information',
        category: 'Projects',
      },
      {
        value: 'write:projects',
        label: 'Write Projects',
        description: 'Create and update projects',
        category: 'Projects',
      },
      {
        value: 'delete:projects',
        label: 'Delete Projects',
        description: 'Delete projects',
        category: 'Projects',
      },

      // Datasets
      {
        value: 'read:datasets',
        label: 'Read Datasets',
        description: 'View dataset information',
        category: 'Datasets',
      },
      {
        value: 'write:datasets',
        label: 'Write Datasets',
        description: 'Create and update datasets',
        category: 'Datasets',
      },
      {
        value: 'delete:datasets',
        label: 'Delete Datasets',
        description: 'Delete datasets',
        category: 'Datasets',
      },

      // Models
      {
        value: 'read:models',
        label: 'Read Data Models',
        description: 'View data model definitions',
        category: 'Data Models',
      },
      {
        value: 'write:models',
        label: 'Write Data Models',
        description: 'Create and update data models',
        category: 'Data Models',
      },
      {
        value: 'delete:models',
        label: 'Delete Data Models',
        description: 'Delete data models',
        category: 'Data Models',
      },

      // Templates
      {
        value: 'read:templates',
        label: 'Read Templates',
        description: 'View template information',
        category: 'Templates',
      },
      {
        value: 'write:templates',
        label: 'Write Templates',
        description: 'Create and update templates',
        category: 'Templates',
      },

      // Configurations
      {
        value: 'read:configurations',
        label: 'Read Configurations',
        description: 'View configuration settings',
        category: 'Configuration',
      },
      {
        value: 'write:configurations',
        label: 'Write Configurations',
        description: 'Update configuration settings',
        category: 'Configuration',
      },

      // Team
      {
        value: 'read:team',
        label: 'Read Team',
        description: 'View team member information',
        category: 'Team',
      },
      {
        value: 'write:team',
        label: 'Manage Team',
        description: 'Invite and manage team members',
        category: 'Team',
      },

      // Usage
      {
        value: 'read:usage',
        label: 'Read Usage',
        description: 'View usage and billing information',
        category: 'Usage',
      },

      // Admin
      {
        value: 'admin',
        label: 'Full Admin Access',
        description: 'Complete access to all resources',
        category: 'Administration',
      },
    ];
  }

  /**
   * Format token for display (show prefix + asterisks)
   */
  static formatTokenForDisplay(prefix: string): string {
    return `${prefix}${'*'.repeat(52)}`; // Total 64 chars
  }

  /**
   * Get token status badge color
   */
  static getTokenStatusColor(token: APIToken): string {
    if (!token.isActive) return 'gray';
    if (token.revokedAt) return 'red';
    if (token.expiresAt && new Date(token.expiresAt) < new Date()) return 'orange';
    return 'green';
  }

  /**
   * Get token status text
   */
  static getTokenStatusText(token: APIToken): string {
    if (token.revokedAt) return 'Revoked';
    if (!token.isActive) return 'Inactive';
    if (token.expiresAt && new Date(token.expiresAt) < new Date()) return 'Expired';
    return 'Active';
  }

  /**
   * Check if token has specific scope
   */
  static hasScope(token: APIToken, scope: string): boolean {
    if (token.scopes.includes('admin')) return true;
    return token.scopes.includes(scope);
  }

  /**
   * Format expiry date for display
   */
  static formatExpiryDate(expiresAt?: Date): string {
    if (!expiresAt) return 'Never';

    const now = new Date();
    const expiry = new Date(expiresAt);

    if (expiry < now) return 'Expired';

    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry === 0) return 'Expires today';
    if (daysUntilExpiry === 1) return 'Expires tomorrow';
    if (daysUntilExpiry <= 30) return `Expires in ${daysUntilExpiry} days`;

    return `Expires ${expiry.toLocaleDateString()}`;
  }

  /**
   * Format last used date
   */
  static formatLastUsed(lastUsedAt?: Date): string {
    if (!lastUsedAt) return 'Never used';

    const now = new Date();
    const lastUsed = new Date(lastUsedAt);
    const diffMs = now.getTime() - lastUsed.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return lastUsed.toLocaleDateString();
  }

  // =====================================================
  // Private Helper Methods
  // =====================================================

  /**
   * Hash token using SHA-256
   */
  private static hashToken(token: string): string {
    // For browser environment, use Web Crypto API
    if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
      // We'll need to implement this async in the browser
      // For now, throw error if used in browser (should only be used server-side)
      throw new Error('Token hashing in browser not supported - use server-side validation');
    }

    // Node.js environment
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Map token from database format
   */
  private static mapTokenFromDb(data: any): APIToken {
    return {
      id: data.id,
      accountId: data.account_id,
      userId: data.user_id,
      name: data.name,
      prefix: data.prefix,
      scopes: data.scopes || [],
      lastUsedAt: data.last_used_at ? new Date(data.last_used_at) : undefined,
      usageCount: data.usage_count || 0,
      expiresAt: data.expires_at ? new Date(data.expires_at) : undefined,
      isActive: data.is_active,
      revokedAt: data.revoked_at ? new Date(data.revoked_at) : undefined,
      revokedBy: data.revoked_by,
      revokeReason: data.revoke_reason,
      createdAt: new Date(data.created_at),
    };
  }
}
