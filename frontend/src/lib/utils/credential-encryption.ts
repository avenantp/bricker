/**
 * Credential Encryption Utilities
 *
 * Provides secure encryption and decryption for source control credentials.
 * Uses Web Crypto API for browser-based encryption.
 */

import { SourceControlCredentials } from '@/types/source-control';

/**
 * Encrypted credentials storage format
 */
export interface EncryptedCredentials {
  encrypted: string; // Base64 encoded encrypted data
  iv: string; // Base64 encoded initialization vector
  salt: string; // Base64 encoded salt for key derivation
}

/**
 * Credential Encryption Service
 */
export class CredentialEncryption {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;
  private static readonly SALT_LENGTH = 16;
  private static readonly ITERATIONS = 100000;

  /**
   * Get encryption key from environment or generate
   */
  private static getEncryptionKey(): string {
    const key = import.meta.env.VITE_ENCRYPTION_KEY;
    if (!key) {
      throw new Error('VITE_ENCRYPTION_KEY environment variable is not set');
    }
    return key;
  }

  /**
   * Derive cryptographic key from password using PBKDF2
   */
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256'
      },
      passwordKey,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Generate random bytes
   */
  private static generateRandomBytes(length: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
  }

  /**
   * Convert Uint8Array to Base64
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Convert Base64 to Uint8Array
   */
  private static base64ToArrayBuffer(base64: string): Uint8Array {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Encrypt credentials
   */
  static async encrypt(credentials: SourceControlCredentials): Promise<EncryptedCredentials> {
    try {
      // Generate salt and IV
      const salt = this.generateRandomBytes(this.SALT_LENGTH);
      const iv = this.generateRandomBytes(this.IV_LENGTH);

      // Derive key
      const encryptionKey = this.getEncryptionKey();
      const key = await this.deriveKey(encryptionKey, salt);

      // Serialize credentials
      const credentialsJson = JSON.stringify(credentials);
      const encoder = new TextEncoder();
      const data = encoder.encode(credentialsJson);

      // Encrypt
      const encrypted = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv
        },
        key,
        data
      );

      // Return encrypted data with IV and salt
      return {
        encrypted: this.arrayBufferToBase64(encrypted),
        iv: this.arrayBufferToBase64(iv),
        salt: this.arrayBufferToBase64(salt)
      };
    } catch (error: any) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt credentials
   */
  static async decrypt(encryptedData: EncryptedCredentials): Promise<SourceControlCredentials> {
    try {
      // Decode Base64
      const encrypted = this.base64ToArrayBuffer(encryptedData.encrypted);
      const iv = this.base64ToArrayBuffer(encryptedData.iv);
      const salt = this.base64ToArrayBuffer(encryptedData.salt);

      // Derive key
      const encryptionKey = this.getEncryptionKey();
      const key = await this.deriveKey(encryptionKey, salt);

      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv
        },
        key,
        encrypted
      );

      // Parse credentials
      const decoder = new TextDecoder();
      const credentialsJson = decoder.decode(decrypted);
      const credentials = JSON.parse(credentialsJson);

      return credentials;
    } catch (error: any) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Validate credentials before encryption
   */
  static validateCredentials(credentials: SourceControlCredentials): boolean {
    if (!credentials.provider) {
      throw new Error('Provider is required');
    }

    if (!credentials.access_token) {
      throw new Error('Access token is required');
    }

    // Check token expiry if provided
    if (credentials.token_expires_at) {
      const expiryDate = new Date(credentials.token_expires_at);
      if (expiryDate < new Date()) {
        throw new Error('Access token has expired');
      }
    }

    return true;
  }

  /**
   * Check if credentials are expired
   */
  static isExpired(credentials: SourceControlCredentials): boolean {
    if (!credentials.token_expires_at) {
      return false; // No expiry date means token doesn't expire
    }

    const expiryDate = new Date(credentials.token_expires_at);
    return expiryDate < new Date();
  }

  /**
   * Sanitize credentials for logging (remove sensitive data)
   */
  static sanitizeForLogging(credentials: SourceControlCredentials): Partial<SourceControlCredentials> {
    return {
      provider: credentials.provider,
      username: credentials.username,
      token_expires_at: credentials.token_expires_at
      // access_token and refresh_token are omitted
    };
  }
}

/**
 * In-memory credential cache with expiry
 */
export class CredentialCache {
  private static cache = new Map<string, { credentials: SourceControlCredentials; expiresAt: number }>();
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Store credentials in cache
   */
  static set(key: string, credentials: SourceControlCredentials, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(key, {
      credentials,
      expiresAt: Date.now() + ttl
    });
  }

  /**
   * Get credentials from cache
   */
  static get(key: string): SourceControlCredentials | null {
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // Check if expired
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return cached.credentials;
  }

  /**
   * Remove credentials from cache
   */
  static delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached credentials
   */
  static clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired entries
   */
  static cleanup(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now > value.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

// Run cleanup periodically
if (typeof window !== 'undefined') {
  setInterval(() => {
    CredentialCache.cleanup();
  }, 60000); // Every minute
}

/**
 * Convenience functions for encrypting/decrypting credentials
 */

export async function encryptCredentials(credentials: SourceControlCredentials): Promise<EncryptedCredentials> {
  CredentialEncryption.validateCredentials(credentials);
  return CredentialEncryption.encrypt(credentials);
}

export async function decryptCredentials(encrypted: EncryptedCredentials): Promise<SourceControlCredentials> {
  return CredentialEncryption.decrypt(encrypted);
}

export function isCredentialsExpired(credentials: SourceControlCredentials): boolean {
  return CredentialEncryption.isExpired(credentials);
}

export function sanitizeCredentials(credentials: SourceControlCredentials): Partial<SourceControlCredentials> {
  return CredentialEncryption.sanitizeForLogging(credentials);
}

/**
 * Store credentials securely with encryption
 */
export async function storeCredentialsSecurely(
  workspaceId: string,
  credentials: SourceControlCredentials
): Promise<EncryptedCredentials> {
  // Encrypt
  const encrypted = await encryptCredentials(credentials);

  // Cache decrypted version for short time
  CredentialCache.set(workspaceId, credentials);

  return encrypted;
}

/**
 * Retrieve and decrypt credentials
 */
export async function retrieveCredentialsSecurely(
  workspaceId: string,
  encrypted: EncryptedCredentials
): Promise<SourceControlCredentials> {
  // Check cache first
  const cached = CredentialCache.get(workspaceId);
  if (cached) {
    return cached;
  }

  // Decrypt
  const credentials = await decryptCredentials(encrypted);

  // Cache for next time
  CredentialCache.set(workspaceId, credentials);

  return credentials;
}

/**
 * Clear cached credentials for workspace
 */
export function clearCachedCredentials(workspaceId: string): void {
  CredentialCache.delete(workspaceId);
}
