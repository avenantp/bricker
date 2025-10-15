# Contribution Guide

Welcome to Uroq! This guide will help you contribute effectively to the project.

## Table of Contents

1. [Code of Conduct](#code-of-conduct)
2. [Getting Started](#getting-started)
3. [Development Workflow](#development-workflow)
4. [Code Standards](#code-standards)
5. [Testing Requirements](#testing-requirements)
6. [Pull Request Process](#pull-request-process)
7. [Code Review Guidelines](#code-review-guidelines)
8. [Release Process](#release-process)

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all.

### Our Standards

**Positive behaviors:**
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

**Unacceptable behaviors:**
- Trolling, insulting/derogatory comments, personal or political attacks
- Public or private harassment
- Publishing others' private information without permission
- Other conduct which could reasonably be considered inappropriate

### Enforcement

Report unacceptable behavior to dev@uroq.com. All complaints will be reviewed and investigated promptly and fairly.

## Getting Started

### Prerequisites

Before contributing, ensure you have:

1. **Completed Setup**: Follow [Development Setup Guide](./development-setup.md)
2. **Read Documentation**: Familiarize yourself with:
   - [Architecture Overview](./architecture-overview.md)
   - [Project Structure](./project-structure.md)
   - [Database Schema](./database-schema.md)
3. **GitHub Account**: With SSH keys configured
4. **Joined Discord**: For real-time collaboration

### Finding Work

**Good First Issues:**
- Browse issues labeled `good-first-issue`
- These are beginner-friendly and well-documented
- Comment on issue to claim it

**Help Wanted:**
- Issues labeled `help-wanted` need contributors
- May require more experience
- Still well-scoped and documented

**Feature Requests:**
- Browse issues labeled `enhancement`
- Discuss approach before implementing
- May require architectural decisions

**Bug Reports:**
- Browse issues labeled `bug`
- Reproduce the bug first
- Include fix in same PR as test

## Development Workflow

### 1. Fork and Clone

```bash
# Fork repository on GitHub first, then:
git clone git@github.com:your-username/uroq.git
cd uroq

# Add upstream remote
git remote add upstream git@github.com:uroq/uroq.git

# Verify remotes
git remote -v
```

### 2. Create Branch

```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name

# Branch naming conventions:
# feature/add-export-csv       - New feature
# fix/canvas-zoom-bug          - Bug fix
# refactor/cleanup-services    - Refactoring
# docs/update-api-docs         - Documentation
# test/add-lineage-tests       - Tests only
# chore/update-dependencies    - Maintenance
```

### 3. Make Changes

```bash
# Make your changes
# ... edit files ...

# Run tests frequently
npm test

# Run linter
npm run lint

# Fix linting issues automatically
npm run lint:fix

# Format code
npm run format
```

### 4. Commit Changes

**Commit Message Format:**

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**

```bash
# Feature
git commit -m "feat(canvas): add dataset export to CSV"

# Bug fix
git commit -m "fix(lineage): resolve incorrect column mapping

- Fixed issue where lineage displayed wrong source column
- Added validation for column references
- Closes #123"

# Documentation
git commit -m "docs(api): add dataset endpoints documentation"

# Multiple files
git add src/components/Canvas/DatasetNode.tsx
git add src/components/Canvas/DatasetNode.test.tsx
git commit -m "feat(canvas): add sync status badge to dataset nodes

- Display sync status (synced/uncommitted/conflict)
- Color-coded badges
- Tooltip with last sync time
- Tests included"
```

### 5. Push Changes

```bash
# Push to your fork
git push origin feature/your-feature-name

# If you need to update after feedback:
git add .
git commit -m "refactor: address code review feedback"
git push origin feature/your-feature-name
```

### 6. Create Pull Request

**On GitHub:**
1. Go to your fork
2. Click "Compare & pull request"
3. Fill in PR template (see below)
4. Link related issues
5. Request reviewers
6. Submit PR

## Code Standards

### TypeScript

**Use Strict Mode:**

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**Define Explicit Types:**

```typescript
// ✅ GOOD: Explicit types
function getDataset(id: string): Promise<Dataset> {
  return supabase.from('datasets').select('*').eq('id', id);
}

// ❌ BAD: Implicit any
function getDataset(id) {
  return supabase.from('datasets').select('*').eq('id', id);
}
```

**Avoid `any` Type:**

```typescript
// ✅ GOOD: Use specific types
interface DatasetResponse {
  data: Dataset[];
  error: Error | null;
}

// ❌ BAD: Using any
function processResponse(response: any) {
  // ...
}
```

**Use Interfaces for Objects:**

```typescript
// ✅ GOOD: Interface for object shape
interface CreateDatasetDto {
  name: string;
  fqn: string;
  project_id: string;
  account_id: string;
}

// ❌ BAD: Object literal
function createDataset(data: {
  name: string;
  fqn: string;
  project_id: string;
  account_id: string;
}) {
  // ...
}
```

### React

**Functional Components:**

```typescript
// ✅ GOOD: Functional component with TypeScript
interface DatasetNodeProps {
  data: {
    dataset: Dataset;
    columns: Column[];
  };
}

export default function DatasetNode({ data }: DatasetNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="dataset-node">
      {/* ... */}
    </div>
  );
}

// ❌ BAD: Class component
class DatasetNode extends React.Component {
  // ...
}
```

**Custom Hooks:**

```typescript
// ✅ GOOD: Extract complex logic to custom hook
export function useDatasets(projectId: string) {
  return useQuery({
    queryKey: ['datasets', projectId],
    queryFn: () => datasetService.getDatasets(projectId),
  });
}

// Usage
const { data: datasets, isLoading } = useDatasets(projectId);
```

**Component Structure:**

```typescript
// Recommended component file structure:

// 1. Imports
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/Common';

// 2. Types
interface Props {
  id: string;
  name: string;
}

// 3. Constants
const MAX_NAME_LENGTH = 100;

// 4. Component
export default function MyComponent({ id, name }: Props) {
  // 4a. State hooks
  const [isOpen, setIsOpen] = useState(false);

  // 4b. Query/mutation hooks
  const { data } = useDataset(id);

  // 4c. Handlers
  const handleClick = () => {
    setIsOpen(!isOpen);
  };

  // 4d. Effects
  useEffect(() => {
    // Side effects
  }, [id]);

  // 4e. Render
  return (
    <div>
      {/* JSX */}
    </div>
  );
}

// 5. Named exports
export type { Props };
```

### Naming Conventions

**Files:**

```
✅ GOOD:
dataset-service.ts
column-service.ts
DatasetNode.tsx
ProjectCanvas.tsx

❌ BAD:
DatasetService.ts
column_service.ts
datasetNode.tsx
project-canvas.tsx
```

**Variables:**

```typescript
// ✅ GOOD: camelCase for variables
const datasetName = 'customers';
const isLoading = true;
const userName = 'John';

// ❌ BAD: Other casing
const DatasetName = 'customers';
const is_loading = true;
const user_name = 'John';
```

**Constants:**

```typescript
// ✅ GOOD: UPPER_CASE for constants
const MAX_DATASETS = 100;
const API_BASE_URL = 'https://api.uroq.com';

// ❌ BAD: camelCase for constants
const maxDatasets = 100;
const apiBaseUrl = 'https://api.uroq.com';
```

**Types/Interfaces:**

```typescript
// ✅ GOOD: PascalCase
interface Dataset {
  id: string;
  name: string;
}

type DatasetStatus = 'synced' | 'uncommitted' | 'conflict';

// ❌ BAD: Other casing
interface dataset {
  id: string;
  name: string;
}

type dataset_status = 'synced' | 'uncommitted' | 'conflict';
```

**Database:**

```sql
-- ✅ GOOD: snake_case for tables/columns
CREATE TABLE datasets (
  dataset_id UUID,
  account_id UUID,
  created_at TIMESTAMP
);

-- ❌ BAD: Other casing
CREATE TABLE Datasets (
  datasetId UUID,
  companyId UUID,
  createdAt TIMESTAMP
);
```

### Code Organization

**Import Order:**

```typescript
// 1. External libraries
import React from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal absolute imports
import { Button } from '@/components/Common';
import { getDatasets } from '@/lib/dataset-service';

// 3. Relative imports
import { DatasetNode } from './DatasetNode';
import { ProjectCanvas } from '../Canvas';

// 4. Type imports (separate, last)
import type { Dataset, Column } from '@/types';
```

**File Size:**

- Components: Max 300 lines
- Services: Max 500 lines
- If larger, split into multiple files

**Function Length:**

- Max 50 lines per function
- Extract complex logic to separate functions

## Testing Requirements

### Unit Tests

**Required for:**
- All service functions
- All utility functions
- Complex business logic

**Framework**: Vitest (frontend), Jest (backend)

**Example:**

```typescript
// dataset-service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { getDatasets, createDataset } from './dataset-service';

describe('dataset-service', () => {
  describe('getDatasets', () => {
    it('should fetch datasets for a project', async () => {
      const projectId = 'proj_123';
      const datasets = await getDatasets(projectId);

      expect(datasets).toBeInstanceOf(Array);
      expect(datasets[0]).toHaveProperty('dataset_id');
    });

    it('should filter by account_id', async () => {
      // Test company isolation
    });
  });

  describe('createDataset', () => {
    it('should create dataset with valid data', async () => {
      const dto = {
        name: 'test_dataset',
        fqn: 'main.bronze.test_dataset',
        project_id: 'proj_123',
        account_id: 'comp_123',
      };

      const dataset = await createDataset(dto);

      expect(dataset).toHaveProperty('dataset_id');
      expect(dataset.name).toBe('test_dataset');
    });

    it('should throw error with invalid data', async () => {
      const dto = { name: '' }; // Invalid

      await expect(createDataset(dto)).rejects.toThrow();
    });
  });
});
```

**Coverage Requirements:**
- Services: 80%+
- Utilities: 90%+

### Integration Tests

**Required for:**
- API endpoints
- Service interactions
- Database operations

**Example:**

```typescript
// datasets.integration.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import app from '../src/index';

describe('Datasets API', () => {
  let authToken: string;
  let projectId: string;

  beforeEach(async () => {
    // Setup: Create test user, project
    authToken = await getTestAuthToken();
    projectId = await createTestProject();
  });

  afterEach(async () => {
    // Cleanup: Delete test data
    await cleanupTestData();
  });

  describe('GET /api/datasets', () => {
    it('should return datasets for project', async () => {
      const response = await request(app)
        .get(`/api/datasets?project_id=${projectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });

    it('should enforce company isolation', async () => {
      // Test that user can't see other company's datasets
    });
  });

  describe('POST /api/datasets', () => {
    it('should create dataset', async () => {
      const dto = {
        name: 'test_dataset',
        fqn: 'main.bronze.test_dataset',
        project_id: projectId,
      };

      const response = await request(app)
        .post('/api/datasets')
        .set('Authorization', `Bearer ${authToken}`)
        .send(dto)
        .expect(201);

      expect(response.body).toHaveProperty('dataset_id');
    });
  });
});
```

**Coverage Requirements:**
- API routes: 75%+

### Component Tests

**Required for:**
- All interactive components
- Complex rendering logic

**Example:**

```typescript
// DatasetNode.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DatasetNode from './DatasetNode';

describe('DatasetNode', () => {
  const mockDataset = {
    dataset_id: 'ds_123',
    name: 'customers',
    fqn: 'main.bronze.customers',
    sync_status: 'synced',
  };

  it('should render dataset name', () => {
    render(<DatasetNode data={{ dataset: mockDataset, columns: [] }} />);

    expect(screen.getByText('customers')).toBeInTheDocument();
  });

  it('should show sync status badge', () => {
    render(<DatasetNode data={{ dataset: mockDataset, columns: [] }} />);

    expect(screen.getByText('synced')).toBeInTheDocument();
  });

  it('should open editor on double-click', () => {
    const onEdit = vi.fn();
    render(
      <DatasetNode
        data={{ dataset: mockDataset, columns: [] }}
        onEdit={onEdit}
      />
    );

    const node = screen.getByTestId('dataset-node');
    fireEvent.doubleClick(node);

    expect(onEdit).toHaveBeenCalledWith(mockDataset);
  });
});
```

**Coverage Requirements:**
- Components: 60%+

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test:watch

# Run tests with coverage
npm test:coverage

# Run specific test file
npm test dataset-service.test.ts

# Run tests matching pattern
npm test -- --grep="getDatasets"
```

## Pull Request Process

### PR Template

When creating a PR, fill in this template:

```markdown
## Description

Brief description of changes.

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issues

Closes #123
Related to #456

## Changes Made

- Added dataset export to CSV feature
- Updated DatasetNode component with export button
- Added export service function
- Added unit tests for export functionality

## Testing

- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

**Manual Testing Steps:**
1. Open project canvas
2. Right-click dataset
3. Click "Export to CSV"
4. Verify CSV file downloads

## Screenshots

(If applicable)

## Checklist

- [ ] My code follows the style guidelines
- [ ] I have performed a self-review
- [ ] I have commented my code where needed
- [ ] I have updated documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix/feature works
- [ ] New and existing tests pass locally
- [ ] Any dependent changes have been merged

## Additional Notes

(Any additional context or notes for reviewers)
```

### PR Requirements

**Before Submitting:**
1. ✅ All tests pass
2. ✅ Linting passes
3. ✅ Code is formatted
4. ✅ Documentation updated
5. ✅ Commit messages follow convention
6. ✅ Branch is up-to-date with main

**PR Size:**
- Keep PRs small (< 500 lines changed)
- Large PRs should be split into multiple smaller PRs
- If unavoidable, explain why in PR description

**Draft PRs:**
- Use draft PRs for work-in-progress
- Mark as ready for review when complete
- Useful for getting early feedback

## Code Review Guidelines

### As a Reviewer

**What to Look For:**

1. **Correctness:**
   - Does code do what it claims?
   - Are there edge cases not handled?
   - Are error cases handled?

2. **Testing:**
   - Are there sufficient tests?
   - Do tests cover edge cases?
   - Are tests meaningful?

3. **Code Quality:**
   - Is code readable?
   - Is code maintainable?
   - Is code well-organized?
   - Are there opportunities for simplification?

4. **Performance:**
   - Are there performance concerns?
   - Unnecessary re-renders?
   - Inefficient database queries?

5. **Security:**
   - Are there security concerns?
   - Is user input validated?
   - Are permissions checked?
   - Is company isolation enforced?

**How to Review:**

```
✅ GOOD Review Comment:
"This function could be simplified by extracting the validation logic to a separate function. Something like:

```typescript
function validateDataset(dataset: Dataset): ValidationResult {
  // validation logic
}
```

This would make the code more testable and reusable."

❌ BAD Review Comment:
"This is wrong."
```

**Be Constructive:**
- Suggest improvements, don't just criticize
- Explain the "why" behind suggestions
- Ask questions rather than demand changes
- Praise good code

**Review Promptly:**
- Aim to review within 24 hours
- If unable, comment that you'll review later
- Don't block PRs unnecessarily

### As an Author

**Responding to Feedback:**

1. **Thank reviewers** for their time
2. **Address all comments**:
   - Implement suggested changes
   - OR explain why you disagree
   - OR ask for clarification
3. **Mark conversations as resolved** after addressing
4. **Request re-review** when ready

**Example Response:**

```
> Suggestion: Extract validation to separate function

Good idea! I've extracted the validation logic to `validateDatasetInput()` in utils/validation.ts. This makes it reusable and testable.

Updated in commit abc123.
```

## Release Process

### Version Numbers

We follow [Semantic Versioning](https://semver.org/):

```
MAJOR.MINOR.PATCH

Examples:
2.0.0 - Major release (breaking changes)
2.1.0 - Minor release (new features, backward-compatible)
2.1.1 - Patch release (bug fixes)
```

### Release Workflow

**1. Create Release Branch:**

```bash
git checkout main
git pull origin main
git checkout -b release/v2.1.0
```

**2. Update Version:**

```bash
# Update package.json version
npm version minor # or major, patch

# Update CHANGELOG.md
# Add release notes
```

**3. Test Release:**

```bash
# Run full test suite
npm test

# Run E2E tests
npm run test:e2e

# Build production
npm run build

# Manual smoke testing
```

**4. Create PR:**

```bash
git add .
git commit -m "chore: prepare release v2.1.0"
git push origin release/v2.1.0

# Create PR on GitHub
# Request approvals from maintainers
```

**5. Merge and Tag:**

```bash
# After PR approved and merged
git checkout main
git pull origin main

# Create tag
git tag -a v2.1.0 -m "Release v2.1.0"
git push origin v2.1.0
```

**6. Deploy:**

```bash
# Automated deployment triggered by tag
# Monitor deployment
# Verify production
```

### CHANGELOG Format

```markdown
# Changelog

## [2.1.0] - 2025-01-20

### Added
- Dataset export to CSV feature
- Sync status badges on canvas nodes
- Git conflict resolution UI

### Changed
- Improved lineage query performance
- Updated dataset editor layout

### Fixed
- Fixed canvas zoom bug
- Resolved Git sync race condition

### Deprecated
- Old relationship table (use column references)

### Removed
- None

### Security
- None

## [2.0.0] - 2025-01-15

### Added
- Multi-tenant architecture
- Database-first Git sync
- Shared resources across projects
...
```

## Getting Help

**Documentation:**
- [Developer Guide README](./README.md)
- [Architecture Overview](./architecture-overview.md)
- [API Documentation](./api-documentation.md)

**Communication:**
- Discord: #dev-general for questions
- GitHub Issues: For bugs and features
- Email: dev@uroq.com for sensitive topics

**Office Hours:**
- Weekly dev sync: Fridays 2pm PST
- Open to all contributors
- Zoom link in Discord

## Recognition

**Contributors are recognized:**
- In CONTRIBUTORS.md file
- On our website
- In release notes
- With special Discord role

**Top contributors may be invited to:**
- Maintainer team
- Architecture discussions
- Early feature previews

---

**Thank you for contributing to Uroq!** 🎉

Your contributions make Uroq better for everyone. We appreciate your time and effort!

---

**Last Updated**: 2025-01-15
**Version**: 2.0.0
