/**
 * Source Control Provider Factory
 *
 * Factory for creating source control provider instances based on provider type.
 * Manages provider lifecycle and configuration.
 */

import { SourceControlProvider } from '@/types/source-control';
import { ISourceControlProvider } from './provider';
import { GitHubProvider, GitHubProviderConfig } from './github-provider';
import { GitLabProvider, GitLabProviderConfig } from './gitlab-provider';
import { BitbucketProvider, BitbucketProviderConfig } from './bitbucket-provider';
import { AzureDevOpsProvider, AzureDevOpsProviderConfig } from './azure-devops-provider';

/**
 * Provider factory configuration
 */
export interface ProviderFactoryConfig {
  github?: Partial<GitHubProviderConfig>;
  gitlab?: Partial<GitLabProviderConfig>;
  bitbucket?: Partial<BitbucketProviderConfig>;
  azure?: Partial<AzureDevOpsProviderConfig>;
}

/**
 * Source Control Provider Factory
 */
export class SourceControlProviderFactory {
  private static config: ProviderFactoryConfig = {};
  private static providerInstances: Map<string, ISourceControlProvider> = new Map();

  /**
   * Configure the factory with provider-specific settings
   */
  static configure(config: ProviderFactoryConfig): void {
    this.config = config;
  }

  /**
   * Create a new provider instance
   * @param providerType Provider type (github, gitlab, bitbucket, azure)
   * @param config Optional provider-specific configuration
   * @returns Provider instance
   */
  static createProvider(
    providerType: SourceControlProvider,
    config?: any
  ): ISourceControlProvider {
    switch (providerType) {
      case SourceControlProvider.GitHub:
        return new GitHubProvider({
          ...this.config.github,
          ...config
        });

      case SourceControlProvider.GitLab:
        return new GitLabProvider({
          ...this.config.gitlab,
          ...config
        });

      case SourceControlProvider.Bitbucket:
        return new BitbucketProvider({
          ...this.config.bitbucket,
          ...config
        });

      case SourceControlProvider.Azure:
        if (!config?.organization && !this.config.azure?.organization) {
          throw new Error('Azure DevOps organization is required');
        }
        return new AzureDevOpsProvider({
          ...this.config.azure,
          ...config,
          organization: config?.organization || this.config.azure?.organization!
        });

      case SourceControlProvider.Other:
        throw new Error('Custom provider implementations are not supported');

      default:
        throw new Error(`Unsupported provider type: ${providerType}`);
    }
  }

  /**
   * Get or create a singleton provider instance
   * Useful for maintaining authenticated sessions across the application
   * @param providerType Provider type
   * @param config Optional provider-specific configuration
   * @returns Provider instance
   */
  static getProvider(
    providerType: SourceControlProvider,
    config?: any
  ): ISourceControlProvider {
    const key = this.getProviderKey(providerType, config);

    if (!this.providerInstances.has(key)) {
      const provider = this.createProvider(providerType, config);
      this.providerInstances.set(key, provider);
    }

    return this.providerInstances.get(key)!;
  }

  /**
   * Remove a provider instance from the cache
   * Useful for clearing authenticated sessions
   * @param providerType Provider type
   * @param config Optional provider-specific configuration
   */
  static clearProvider(
    providerType: SourceControlProvider,
    config?: any
  ): void {
    const key = this.getProviderKey(providerType, config);
    this.providerInstances.delete(key);
  }

  /**
   * Clear all cached provider instances
   */
  static clearAllProviders(): void {
    this.providerInstances.clear();
  }

  /**
   * Get provider instance count (for debugging)
   */
  static getProviderCount(): number {
    return this.providerInstances.size;
  }

  /**
   * Check if a provider type is supported
   */
  static isProviderSupported(providerType: SourceControlProvider): boolean {
    return [
      SourceControlProvider.GitHub,
      SourceControlProvider.GitLab,
      SourceControlProvider.Bitbucket,
      SourceControlProvider.Azure
    ].includes(providerType);
  }

  /**
   * Get display name for a provider type
   */
  static getProviderDisplayName(providerType: SourceControlProvider): string {
    switch (providerType) {
      case SourceControlProvider.GitHub:
        return 'GitHub';
      case SourceControlProvider.GitLab:
        return 'GitLab';
      case SourceControlProvider.Bitbucket:
        return 'Bitbucket';
      case SourceControlProvider.Azure:
        return 'Azure DevOps';
      case SourceControlProvider.Other:
        return 'Other';
      default:
        return 'Unknown';
    }
  }

  /**
   * Get list of supported providers
   */
  static getSupportedProviders(): Array<{
    type: SourceControlProvider;
    name: string;
  }> {
    return [
      {
        type: SourceControlProvider.GitHub,
        name: this.getProviderDisplayName(SourceControlProvider.GitHub)
      },
      {
        type: SourceControlProvider.GitLab,
        name: this.getProviderDisplayName(SourceControlProvider.GitLab)
      },
      {
        type: SourceControlProvider.Bitbucket,
        name: this.getProviderDisplayName(SourceControlProvider.Bitbucket)
      },
      {
        type: SourceControlProvider.Azure,
        name: this.getProviderDisplayName(SourceControlProvider.Azure)
      }
    ];
  }

  /**
   * Detect provider type from repository URL
   * @param repoUrl Repository URL
   * @returns Detected provider type or null
   */
  static detectProviderFromUrl(repoUrl: string): SourceControlProvider | null {
    const url = repoUrl.toLowerCase();

    if (url.includes('github.com')) {
      return SourceControlProvider.GitHub;
    }

    if (url.includes('gitlab.com') || url.includes('gitlab')) {
      return SourceControlProvider.GitLab;
    }

    if (url.includes('bitbucket.org')) {
      return SourceControlProvider.Bitbucket;
    }

    if (url.includes('dev.azure.com') || url.includes('visualstudio.com')) {
      return SourceControlProvider.Azure;
    }

    return null;
  }

  /**
   * Validate repository URL for a specific provider
   * @param repoUrl Repository URL
   * @param providerType Provider type
   * @returns True if URL is valid for the provider
   */
  static validateRepoUrl(
    repoUrl: string,
    providerType: SourceControlProvider
  ): boolean {
    try {
      const provider = this.createProvider(providerType);
      return provider.parseRepoUrl(repoUrl) !== null;
    } catch {
      return false;
    }
  }

  /**
   * Generate a cache key for provider instances
   */
  private static getProviderKey(
    providerType: SourceControlProvider,
    config?: any
  ): string {
    const configParts: string[] = [providerType];

    // Add configuration-specific parts to the key
    if (config?.baseUrl) {
      configParts.push(config.baseUrl);
    }

    if (config?.organization) {
      configParts.push(config.organization);
    }

    return configParts.join('::');
  }
}

/**
 * Convenience function to create a provider
 */
export function createSourceControlProvider(
  providerType: SourceControlProvider,
  config?: any
): ISourceControlProvider {
  return SourceControlProviderFactory.createProvider(providerType, config);
}

/**
 * Convenience function to get or create a singleton provider
 */
export function getSourceControlProvider(
  providerType: SourceControlProvider,
  config?: any
): ISourceControlProvider {
  return SourceControlProviderFactory.getProvider(providerType, config);
}

/**
 * Convenience function to detect provider from URL
 */
export function detectProviderFromUrl(repoUrl: string): SourceControlProvider | null {
  return SourceControlProviderFactory.detectProviderFromUrl(repoUrl);
}

/**
 * Convenience function to validate repository URL
 */
export function validateRepoUrl(
  repoUrl: string,
  providerType: SourceControlProvider
): boolean {
  return SourceControlProviderFactory.validateRepoUrl(repoUrl, providerType);
}
