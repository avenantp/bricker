/**
 * Source Control Provider Module
 *
 * Central export for all source control provider functionality.
 */

// Re-export enums from types
export { SourceControlProvider } from '@/types/source-control';

// Provider interface and base class
export type { ISourceControlProvider, ProviderOptions } from './provider';
export { BaseSourceControlProvider, type BaseProviderConfig } from './base-provider';

// Rate limiter
export { RateLimiter, RateLimiterPresets, type RateLimiterConfig } from './rate-limiter';

// Provider implementations
export { GitHubProvider, type GitHubProviderConfig } from './github-provider';
export { GitLabProvider, type GitLabProviderConfig } from './gitlab-provider';
export { BitbucketProvider, type BitbucketProviderConfig } from './bitbucket-provider';
export { AzureDevOpsProvider, type AzureDevOpsProviderConfig } from './azure-devops-provider';

// Factory
export {
  SourceControlProviderFactory,
  createSourceControlProvider,
  getSourceControlProvider,
  detectProviderFromUrl,
  validateRepoUrl,
  type ProviderFactoryConfig
} from './provider-factory';
