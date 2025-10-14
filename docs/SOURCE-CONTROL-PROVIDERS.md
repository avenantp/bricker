# Source Control Provider Abstraction

## Overview

This document describes the source control provider abstraction layer that provides a unified API for interacting with different source control systems (GitHub, GitLab, Bitbucket, Azure DevOps).

**Location**: `frontend/src/lib/source-control/`

## Architecture

The provider abstraction uses an **Abstract Factory** pattern combined with **Strategy** pattern:

1. **Interface** (`SourceControlProvider`) - Defines the contract all providers must implement
2. **Base Class** (`BaseSourceControlProvider`) - Implements common functionality (HTTP requests, retry logic, error handling)
3. **Concrete Providers** - Implement provider-specific API calls (GitHubProvider, GitLabProvider, etc.)
4. **Factory** (`SourceControlProviderFactory`) - Creates and manages provider instances
5. **Rate Limiter** (`RateLimiter`) - Enforces API rate limits using Token Bucket Algorithm

## Provider Interface

All providers implement the `SourceControlProvider` interface with the following categories of operations:

### Authentication
- `authenticate(credentials)` - Authenticate with provider
- `testConnection()` - Test connection and verify credentials
- `isAuthenticated()` - Check authentication status

### Repository Operations
- `listRepositories(options)` - List accessible repositories
- `getRepository(repoUrl)` - Get repository details
- `createRepository(name, isPrivate, options)` - Create new repository

### Branch Operations
- `listBranches(repoUrl)` - List all branches
- `getBranch(repoUrl, branchName)` - Get branch details
- `createBranch(repoUrl, branchName, fromBranch)` - Create new branch
- `deleteBranch(repoUrl, branchName)` - Delete branch

### File Operations
- `getFile(repoUrl, branch, path)` - Get file content
- `createFile(repoUrl, branch, path, content, message)` - Create file
- `updateFile(repoUrl, branch, path, content, message, sha)` - Update file
- `deleteFile(repoUrl, branch, path, message, sha)` - Delete file
- `batchCommit(repoUrl, branch, operations, message)` - Multiple file operations in one commit

### Commit Operations
- `getCommit(repoUrl, sha)` - Get commit details
- `listCommits(repoUrl, branch, options)` - List commits with filters
- `compareCommits(repoUrl, baseSha, headSha)` - Compare two commits
- `getLatestCommit(repoUrl, branch)` - Get latest commit on branch
- `getChangedFiles(repoUrl, branch, fromSha, toSha)` - Get changed files between commits

### Utility Methods
- `parseRepoUrl(url)` - Parse repository URL
- `constructRepoUrl(owner, repo)` - Construct repository URL
- `getCommitUrl(repoUrl, sha)` - Get web URL for commit
- `getFileUrl(repoUrl, branch, path)` - Get web URL for file

## Supported Providers

### GitHub

**Base URL**: `https://api.github.com`
**Rate Limit**: 5000 requests/hour
**Authentication**: Bearer token (Personal Access Token or OAuth)
**Min Interval**: 100ms between requests

**Features**:
- ✅ Full API support
- ✅ GitHub Enterprise support (custom baseUrl)
- ✅ Batch commits via Git Tree API
- ✅ Detailed commit information with file changes

**Example**:
```typescript
import { GitHubProvider } from '@/lib/source-control';

const provider = new GitHubProvider({
  baseUrl: 'https://api.github.com', // Optional, for GitHub Enterprise
  timeout: 30000,
});

await provider.authenticate({
  provider: 'github',
  access_token: 'ghp_xxxxx'
});
```

### GitLab

**Base URL**: `https://gitlab.com/api/v4`
**Rate Limit**: 600 requests/minute
**Authentication**: Private-Token header
**Min Interval**: 100ms between requests

**Features**:
- ✅ Full API support
- ✅ Self-hosted GitLab support (custom baseUrl)
- ✅ Batch commits via Commits API
- ✅ Project-based organization

**Example**:
```typescript
import { GitLabProvider } from '@/lib/source-control';

const provider = new GitLabProvider({
  baseUrl: 'https://gitlab.example.com/api/v4', // For self-hosted
  timeout: 30000,
});

await provider.authenticate({
  provider: 'gitlab',
  access_token: 'glpat-xxxxx'
});
```

### Bitbucket

**Base URL**: `https://api.bitbucket.org/2.0`
**Rate Limit**: 1000 requests/hour
**Authentication**: Bearer token
**Min Interval**: 200ms between requests

**Features**:
- ✅ Bitbucket Cloud support
- ✅ Workspace-based organization
- ✅ Multipart form data for file operations
- ⚠️ Limited branch protection API

**Example**:
```typescript
import { BitbucketProvider } from '@/lib/source-control';

const provider = new BitbucketProvider({
  timeout: 30000,
});

await provider.authenticate({
  provider: 'bitbucket',
  access_token: 'xxxxx'
});
```

### Azure DevOps

**Base URL**: `https://dev.azure.com/{organization}`
**Rate Limit**: 200 requests/minute per user
**Authentication**: Basic auth with PAT
**Min Interval**: 300ms between requests

**Features**:
- ✅ Azure DevOps Services support
- ✅ Project-based organization (required)
- ✅ Batch commits via Push API
- ⚠️ Requires organization configuration

**Example**:
```typescript
import { AzureDevOpsProvider } from '@/lib/source-control';

const provider = new AzureDevOpsProvider({
  organization: 'my-org',
  baseUrl: 'https://dev.azure.com/my-org', // Auto-constructed
  timeout: 30000,
});

await provider.authenticate({
  provider: 'azure',
  access_token: 'xxxxx' // Personal Access Token
});
```

## Base Provider

The `BaseSourceControlProvider` abstract class provides:

### HTTP Request Handling
- Automatic authentication header injection
- Request/response JSON serialization
- Timeout handling with AbortController
- URL building with query parameters

### Error Handling
- HTTP status code checking
- Detailed error responses with status codes
- Timeout error handling

### Retry Logic
- Exponential backoff retry
- Configurable retry attempts (default: 3)
- Configurable initial delay (default: 1000ms)
- Configurable max delay (default: 10000ms)
- Retryable status codes: 429, 500, 502, 503, 504

### Rate Limiting Integration
- Optional rate limiter injection
- Automatic request queueing
- Token bucket algorithm enforcement

### Utility Methods
- Base64 encoding/decoding
- Branch name validation
- Commit message validation
- File path validation
- URL normalization
- Date formatting

## Rate Limiter

The `RateLimiter` class implements the **Token Bucket Algorithm**:

### How It Works
1. Start with a bucket full of tokens (maxRequests)
2. Each request consumes one token
3. Tokens refill over time based on rate (maxRequests / perMilliseconds)
4. Requests wait if no tokens are available
5. Supports minimum interval between requests

### Configuration
```typescript
interface RateLimiterConfig {
  maxRequests: number;        // Maximum tokens in bucket
  perMilliseconds: number;    // Time window for rate limit
  minInterval?: number;       // Minimum time between requests (ms)
}
```

### Presets
```typescript
import { RateLimiterPresets } from '@/lib/source-control';

RateLimiterPresets.github();      // 5000 requests/hour, 100ms interval
RateLimiterPresets.gitlab();      // 600 requests/minute, 100ms interval
RateLimiterPresets.bitbucket();   // 1000 requests/hour, 200ms interval
RateLimiterPresets.azure();       // 200 requests/minute, 300ms interval
RateLimiterPresets.conservative(); // 100 requests/minute, 500ms interval
```

### Usage
```typescript
import { RateLimiter } from '@/lib/source-control';

const limiter = new RateLimiter({
  maxRequests: 100,
  perMilliseconds: 60 * 1000, // 100 requests per minute
  minInterval: 500 // 500ms between requests
});

// Enqueue a request
const result = await limiter.enqueue(async () => {
  return fetch('https://api.example.com/data');
});

// Check status
const status = limiter.getStatus();
console.log(`Available tokens: ${status.availableTokens}/${status.maxTokens}`);
console.log(`Queue length: ${status.queueLength}`);
```

## Provider Factory

The `SourceControlProviderFactory` provides:

### Provider Creation
```typescript
import { SourceControlProviderFactory, SourceControlProvider as ProviderEnum } from '@/lib/source-control';

// Create a new instance
const provider = SourceControlProviderFactory.createProvider(ProviderEnum.GitHub);

// Get singleton instance (cached)
const singleton = SourceControlProviderFactory.getProvider(ProviderEnum.GitHub);
```

### Global Configuration
```typescript
SourceControlProviderFactory.configure({
  github: {
    baseUrl: 'https://github.company.com/api/v3',
    timeout: 60000
  },
  gitlab: {
    baseUrl: 'https://gitlab.company.com/api/v4'
  },
  azure: {
    organization: 'my-company'
  }
});
```

### Provider Detection
```typescript
// Detect provider from URL
const provider = SourceControlProviderFactory.detectProviderFromUrl(
  'https://github.com/owner/repo'
);
// Returns: SourceControlProvider.GitHub

// Validate URL for provider
const isValid = SourceControlProviderFactory.validateRepoUrl(
  'https://github.com/owner/repo',
  ProviderEnum.GitHub
);
// Returns: true
```

### Utility Functions
```typescript
// Get supported providers
const providers = SourceControlProviderFactory.getSupportedProviders();
// Returns: [{ type: 'github', name: 'GitHub' }, ...]

// Get display name
const name = SourceControlProviderFactory.getProviderDisplayName(ProviderEnum.GitHub);
// Returns: 'GitHub'

// Check if supported
const supported = SourceControlProviderFactory.isProviderSupported(ProviderEnum.GitHub);
// Returns: true

// Clear cached instances
SourceControlProviderFactory.clearProvider(ProviderEnum.GitHub);
SourceControlProviderFactory.clearAllProviders();
```

## Usage Examples

### Basic Usage

```typescript
import { createSourceControlProvider, SourceControlProvider } from '@/lib/source-control';
import { SourceControlProvider as ProviderEnum } from '@/types/source-control';

// Create provider
const provider = createSourceControlProvider(ProviderEnum.GitHub);

// Authenticate
await provider.authenticate({
  provider: ProviderEnum.GitHub,
  access_token: 'ghp_xxxxx'
});

// Test connection
const result = await provider.testConnection();
if (result.success) {
  console.log(`Connected as ${result.user?.username}`);
}

// List repositories
const repos = await provider.listRepositories({ limit: 10 });
console.log(`Found ${repos.length} repositories`);

// Get file
const file = await provider.getFile(
  'https://github.com/owner/repo',
  'main',
  'README.md'
);
console.log(file.content);

// Create branch
const branch = await provider.createBranch(
  'https://github.com/owner/repo',
  'feature/new-feature',
  'main'
);

// Batch commit
const commit = await provider.batchCommit(
  'https://github.com/owner/repo',
  'feature/new-feature',
  [
    { operation: 'create', path: 'file1.txt', content: 'Hello' },
    { operation: 'update', path: 'file2.txt', content: 'Updated' },
    { operation: 'delete', path: 'file3.txt' }
  ],
  'feat: add multiple files'
);
console.log(`Committed: ${commit.sha}`);
```

### Advanced Usage with Factory

```typescript
import {
  SourceControlProviderFactory,
  detectProviderFromUrl
} from '@/lib/source-control';
import { SourceControlProvider as ProviderEnum } from '@/types/source-control';

// Configure factory globally
SourceControlProviderFactory.configure({
  github: {
    timeout: 60000
  },
  azure: {
    organization: 'my-company'
  }
});

// Auto-detect provider from URL
const repoUrl = 'https://github.com/owner/repo';
const providerType = detectProviderFromUrl(repoUrl);

if (providerType) {
  // Get singleton instance
  const provider = SourceControlProviderFactory.getProvider(providerType);

  // Use provider
  await provider.authenticate({ provider: providerType, access_token: 'xxx' });
  const repo = await provider.getRepository(repoUrl);
  console.log(repo.name);
}
```

### Error Handling

```typescript
import { createSourceControlProvider } from '@/lib/source-control';
import { SourceControlProvider } from '@/types/source-control';

const provider = createSourceControlProvider(SourceControlProvider.GitHub);

try {
  await provider.authenticate({
    provider: SourceControlProvider.GitHub,
    access_token: 'invalid-token'
  });
} catch (error: any) {
  if (error.statusCode === 401) {
    console.error('Invalid credentials');
  } else if (error.statusCode === 403) {
    console.error('Insufficient permissions');
  } else {
    console.error(`Error: ${error.message}`);
  }
}
```

### Working with Multiple Providers

```typescript
import { getSourceControlProvider } from '@/lib/source-control';
import { SourceControlProvider } from '@/types/source-control';

// Get multiple provider instances
const github = getSourceControlProvider(SourceControlProvider.GitHub);
const gitlab = getSourceControlProvider(SourceControlProvider.GitLab);
const azure = getSourceControlProvider(SourceControlProvider.Azure, {
  organization: 'my-org'
});

// Authenticate all providers
await Promise.all([
  github.authenticate({ provider: 'github', access_token: 'xxx' }),
  gitlab.authenticate({ provider: 'gitlab', access_token: 'yyy' }),
  azure.authenticate({ provider: 'azure', access_token: 'zzz' })
]);

// Sync repositories across providers
const githubRepos = await github.listRepositories();
const gitlabRepos = await gitlab.listRepositories();

console.log(`GitHub: ${githubRepos.length} repos`);
console.log(`GitLab: ${gitlabRepos.length} repos`);
```

## Testing

### Unit Tests

Tests should cover:
1. Provider authentication
2. Repository operations (list, get, create)
3. Branch operations (list, get, create, delete)
4. File operations (get, create, update, delete, batch)
5. Commit operations (get, list, compare)
6. URL parsing and validation
7. Rate limiting behavior
8. Retry logic
9. Error handling

### Integration Tests

Integration tests should verify:
1. Real API calls to test accounts
2. Rate limiter effectiveness
3. Batch commit operations
4. Error recovery and retry
5. Provider factory behavior

## Best Practices

### 1. Always Use the Factory

```typescript
// ✅ Good: Use factory
import { createSourceControlProvider } from '@/lib/source-control';
const provider = createSourceControlProvider(ProviderEnum.GitHub);

// ❌ Bad: Direct instantiation
import { GitHubProvider } from '@/lib/source-control';
const provider = new GitHubProvider({});
```

### 2. Test Connections Before Operations

```typescript
// ✅ Good: Test connection first
const result = await provider.testConnection();
if (!result.success) {
  throw new Error(`Connection failed: ${result.message}`);
}

// ❌ Bad: Assume authentication worked
await provider.authenticate(credentials);
```

### 3. Handle Provider-Specific Requirements

```typescript
// ✅ Good: Check provider requirements
if (providerType === ProviderEnum.Azure) {
  if (!organization) {
    throw new Error('Azure DevOps requires organization');
  }
}

// ❌ Bad: Ignore provider requirements
```

### 4. Use Batch Operations When Possible

```typescript
// ✅ Good: Batch multiple file changes
await provider.batchCommit(repoUrl, branch, [
  { operation: 'create', path: 'file1.txt', content: '...' },
  { operation: 'update', path: 'file2.txt', content: '...' },
  { operation: 'delete', path: 'file3.txt' }
], 'feat: multiple changes');

// ❌ Bad: Multiple individual commits
await provider.createFile(repoUrl, branch, 'file1.txt', '...', 'create file1');
await provider.updateFile(repoUrl, branch, 'file2.txt', '...', 'update file2', sha);
await provider.deleteFile(repoUrl, branch, 'file3.txt', 'delete file3', sha);
```

### 5. Leverage Rate Limiting

```typescript
// ✅ Good: Use rate limiter
import { RateLimiterPresets } from '@/lib/source-control';

const provider = createSourceControlProvider(ProviderEnum.GitHub, {
  rateLimiter: RateLimiterPresets.github()
});

// ❌ Bad: No rate limiting (risk of hitting API limits)
const provider = createSourceControlProvider(ProviderEnum.GitHub);
```

## Troubleshooting

### Connection Failures

**Problem**: `testConnection()` returns `success: false`

**Solutions**:
1. Verify access token is valid
2. Check token permissions/scopes
3. Verify base URL for self-hosted instances
4. Check network connectivity

### Rate Limit Errors

**Problem**: Receiving 429 (Too Many Requests) errors

**Solutions**:
1. Use rate limiter with appropriate preset
2. Increase `minInterval` between requests
3. Reduce `maxRequests` if needed
4. Use batch operations to reduce API calls

### Authentication Errors

**Problem**: 401/403 errors despite valid token

**Solutions**:
1. Verify token has required scopes (repo, user, etc.)
2. Check token expiration
3. Ensure user has access to repositories
4. For Azure DevOps, verify PAT permissions

### Batch Commit Failures

**Problem**: Batch commits failing or partially applying

**Solutions**:
1. Verify all file paths are valid
2. Check for conflicting operations (update + delete same file)
3. Ensure branch is not protected
4. Validate file content encoding (UTF-8)

## Files

- `frontend/src/lib/source-control/provider.ts` - Provider interface
- `frontend/src/lib/source-control/base-provider.ts` - Base provider class
- `frontend/src/lib/source-control/rate-limiter.ts` - Rate limiter implementation
- `frontend/src/lib/source-control/github-provider.ts` - GitHub implementation
- `frontend/src/lib/source-control/gitlab-provider.ts` - GitLab implementation
- `frontend/src/lib/source-control/bitbucket-provider.ts` - Bitbucket implementation
- `frontend/src/lib/source-control/azure-devops-provider.ts` - Azure DevOps implementation
- `frontend/src/lib/source-control/provider-factory.ts` - Provider factory
- `frontend/src/lib/source-control/index.ts` - Central exports

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-14 | Initial provider abstraction documentation | Claude Code |

## Related Documentation

- [TypeScript Types Documentation](./TYPESCRIPT-TYPES.md)
- [Project and Workspace Specification](./prp/021-project-workspaces-specification.md)
- [Database Functions and Triggers](./DATABASE-FUNCTIONS-TRIGGERS.md)

---

**Status**: ✅ Phase 3 (Source Control Provider Abstraction) COMPLETE
