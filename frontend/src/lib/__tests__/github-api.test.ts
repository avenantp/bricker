import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitHubClient, parseGitHubRepo } from '../github-api';
import type { ProjectYAML, DataModelYAML } from '../yaml-utils';

// Mock Octokit
vi.mock('@octokit/rest', () => {
  return {
    Octokit: vi.fn().mockImplementation(() => ({
      repos: {
        getContent: vi.fn(),
        createOrUpdateFileContents: vi.fn(),
        deleteFile: vi.fn(),
        get: vi.fn(),
        createForAuthenticatedUser: vi.fn(),
      },
    })),
  };
});

describe('GitHubClient', () => {
  let client: GitHubClient;
  let mockOctokit: any;

  beforeEach(() => {
    client = new GitHubClient('test-token');
    mockOctokit = (client as any).octokit;
  });

  describe('getFileContent', () => {
    it('should get file content from GitHub', async () => {
      const mockContent = Buffer.from('test content').toString('base64');
      mockOctokit.repos.getContent.mockResolvedValue({
        data: {
          content: mockContent,
          sha: 'abc123',
        },
      });

      const result = await client.getFileContent('owner', 'repo', 'path/to/file.txt');

      expect(result.content).toBe('test content');
      expect(result.sha).toBe('abc123');
      expect(mockOctokit.repos.getContent).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        path: 'path/to/file.txt',
        ref: 'main',
      });
    });

    it('should use custom branch when provided', async () => {
      const mockContent = Buffer.from('test content').toString('base64');
      mockOctokit.repos.getContent.mockResolvedValue({
        data: {
          content: mockContent,
          sha: 'abc123',
        },
      });

      await client.getFileContent('owner', 'repo', 'file.txt', 'develop');

      expect(mockOctokit.repos.getContent).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        path: 'file.txt',
        ref: 'develop',
      });
    });

    it('should throw error when file not found', async () => {
      mockOctokit.repos.getContent.mockRejectedValue({ status: 404 });

      await expect(
        client.getFileContent('owner', 'repo', 'nonexistent.txt')
      ).rejects.toThrow('File not found: nonexistent.txt');
    });

    it('should throw error when content is directory', async () => {
      mockOctokit.repos.getContent.mockResolvedValue({
        data: {},
      });

      await expect(
        client.getFileContent('owner', 'repo', 'directory')
      ).rejects.toThrow('File not found or is a directory');
    });
  });

  describe('upsertFile', () => {
    it('should create new file in GitHub', async () => {
      mockOctokit.repos.createOrUpdateFileContents.mockResolvedValue({
        data: {
          commit: { sha: 'new-commit-sha' },
        },
      });

      const commitSha = await client.upsertFile(
        'owner',
        'repo',
        'path/to/file.txt',
        'file content',
        'Create file'
      );

      expect(commitSha).toBe('new-commit-sha');
      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        path: 'path/to/file.txt',
        message: 'Create file',
        content: Buffer.from('file content').toString('base64'),
        branch: 'main',
        sha: undefined,
      });
    });

    it('should update existing file with SHA', async () => {
      mockOctokit.repos.createOrUpdateFileContents.mockResolvedValue({
        data: {
          commit: { sha: 'updated-commit-sha' },
        },
      });

      const commitSha = await client.upsertFile(
        'owner',
        'repo',
        'path/to/file.txt',
        'updated content',
        'Update file',
        'main',
        'existing-sha'
      );

      expect(commitSha).toBe('updated-commit-sha');
      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
        expect.objectContaining({
          sha: 'existing-sha',
        })
      );
    });

    it('should throw error on failure', async () => {
      mockOctokit.repos.createOrUpdateFileContents.mockRejectedValue(
        new Error('API error')
      );

      await expect(
        client.upsertFile('owner', 'repo', 'file.txt', 'content', 'message')
      ).rejects.toThrow('Failed to save file to GitHub');
    });
  });

  describe('deleteFile', () => {
    it('should delete file from GitHub', async () => {
      mockOctokit.repos.deleteFile.mockResolvedValue({});

      await client.deleteFile('owner', 'repo', 'file.txt', 'Delete file', 'file-sha');

      expect(mockOctokit.repos.deleteFile).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        path: 'file.txt',
        message: 'Delete file',
        sha: 'file-sha',
        branch: 'main',
      });
    });

    it('should throw error on failure', async () => {
      mockOctokit.repos.deleteFile.mockRejectedValue(new Error('API error'));

      await expect(
        client.deleteFile('owner', 'repo', 'file.txt', 'Delete', 'sha')
      ).rejects.toThrow('Failed to delete file from GitHub');
    });
  });

  describe('saveProject', () => {
    it('should save new project to GitHub', async () => {
      const project: ProjectYAML = {
        metadata: {
          id: 'proj_123',
          name: 'Test Project',
          version: '1.0.0',
          owner_id: 'user_123',
          created_by: 'user_123',
          visibility: 'private',
          is_locked: false,
          company_id: 'comp_123',
          workspace_id: 'ws_123',
          github_repo: 'owner/repo',
          github_branch: 'main',
          github_path: 'metadata/projects/test.yml',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      mockOctokit.repos.createOrUpdateFileContents.mockResolvedValue({
        data: {
          commit: { sha: 'commit-sha' },
        },
      });

      const commitSha = await client.saveProject('owner', 'repo', project);

      expect(commitSha).toBe('commit-sha');
      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
        expect.objectContaining({
          path: 'metadata/projects/test.yml',
          message: 'Create project: Test Project',
          branch: 'main',
        })
      );
    });

    it('should update existing project with SHA', async () => {
      const project: ProjectYAML = {
        metadata: {
          id: 'proj_123',
          name: 'Test Project',
          version: '1.0.0',
          owner_id: 'user_123',
          created_by: 'user_123',
          visibility: 'private',
          is_locked: false,
          company_id: 'comp_123',
          workspace_id: 'ws_123',
          github_repo: 'owner/repo',
          github_branch: 'main',
          github_path: 'metadata/projects/test.yml',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      };

      mockOctokit.repos.createOrUpdateFileContents.mockResolvedValue({
        data: {
          commit: { sha: 'new-sha' },
        },
      });

      await client.saveProject('owner', 'repo', project, 'existing-sha');

      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Update project: Test Project',
          sha: 'existing-sha',
        })
      );
    });
  });

  describe('loadProject', () => {
    it('should load project from GitHub', async () => {
      const yamlContent = `
metadata:
  id: proj_123
  name: Test Project
  version: 1.0.0
  owner_id: user_123
  created_by: user_123
  visibility: private
  is_locked: false
  company_id: comp_123
  workspace_id: ws_123
  github_repo: owner/repo
  github_branch: main
  github_path: metadata/projects/test.yml
  created_at: '2024-01-01T00:00:00Z'
  updated_at: '2024-01-01T00:00:00Z'
`;

      mockOctokit.repos.getContent.mockResolvedValue({
        data: {
          content: Buffer.from(yamlContent).toString('base64'),
          sha: 'file-sha',
        },
      });

      const result = await client.loadProject('owner', 'repo', 'test.yml');

      expect(result.project.metadata.id).toBe('proj_123');
      expect(result.project.metadata.name).toBe('Test Project');
      expect(result.sha).toBe('file-sha');
    });
  });

  describe('listFiles', () => {
    it('should list YAML files in directory', async () => {
      mockOctokit.repos.getContent.mockResolvedValue({
        data: [
          { type: 'file', name: 'file1.yml', path: 'dir/file1.yml', sha: 'sha1' },
          { type: 'file', name: 'file2.yml', path: 'dir/file2.yml', sha: 'sha2' },
          { type: 'file', name: 'file3.txt', path: 'dir/file3.txt', sha: 'sha3' },
          { type: 'dir', name: 'subdir', path: 'dir/subdir', sha: 'sha4' },
        ],
      });

      const files = await client.listFiles('owner', 'repo', 'dir');

      expect(files).toHaveLength(2);
      expect(files[0].name).toBe('file1.yml');
      expect(files[1].name).toBe('file2.yml');
    });

    it('should return empty array when directory not found', async () => {
      mockOctokit.repos.getContent.mockRejectedValue({ status: 404 });

      const files = await client.listFiles('owner', 'repo', 'nonexistent');

      expect(files).toEqual([]);
    });

    it('should return empty array when content is not an array', async () => {
      mockOctokit.repos.getContent.mockResolvedValue({
        data: {},
      });

      const files = await client.listFiles('owner', 'repo', 'path');

      expect(files).toEqual([]);
    });
  });

  describe('ensureRepository', () => {
    it('should do nothing if repository exists', async () => {
      mockOctokit.repos.get.mockResolvedValue({ data: {} });

      await client.ensureRepository('owner', 'repo');

      expect(mockOctokit.repos.get).toHaveBeenCalledWith({ owner: 'owner', repo: 'repo' });
      expect(mockOctokit.repos.createForAuthenticatedUser).not.toHaveBeenCalled();
    });

    it('should create repository if it does not exist', async () => {
      mockOctokit.repos.get.mockRejectedValue({ status: 404 });
      mockOctokit.repos.createForAuthenticatedUser.mockResolvedValue({});

      await client.ensureRepository('owner', 'repo');

      expect(mockOctokit.repos.createForAuthenticatedUser).toHaveBeenCalledWith({
        name: 'repo',
        private: true,
        auto_init: true,
        description: 'Uroq metadata repository',
      });
    });

    it('should create public repository when requested', async () => {
      mockOctokit.repos.get.mockRejectedValue({ status: 404 });
      mockOctokit.repos.createForAuthenticatedUser.mockResolvedValue({});

      await client.ensureRepository('owner', 'repo', false);

      expect(mockOctokit.repos.createForAuthenticatedUser).toHaveBeenCalledWith(
        expect.objectContaining({
          private: false,
        })
      );
    });

    it('should throw error if get fails with non-404 error', async () => {
      mockOctokit.repos.get.mockRejectedValue({ status: 500 });

      await expect(client.ensureRepository('owner', 'repo')).rejects.toThrow();
    });
  });
});

describe('parseGitHubRepo', () => {
  it('should parse valid repo string', () => {
    const result = parseGitHubRepo('owner/repo');

    expect(result.owner).toBe('owner');
    expect(result.repo).toBe('repo');
  });

  it('should handle repo strings with hyphens', () => {
    const result = parseGitHubRepo('my-owner/my-repo');

    expect(result.owner).toBe('my-owner');
    expect(result.repo).toBe('my-repo');
  });

  it('should throw error on invalid format', () => {
    expect(() => parseGitHubRepo('invalid')).toThrow(
      'Invalid GitHub repo format. Expected: owner/repo'
    );
  });

  it('should throw error on too many slashes', () => {
    expect(() => parseGitHubRepo('owner/repo/extra')).toThrow(
      'Invalid GitHub repo format. Expected: owner/repo'
    );
  });

  it('should throw error on empty string', () => {
    expect(() => parseGitHubRepo('')).toThrow(
      'Invalid GitHub repo format. Expected: owner/repo'
    );
  });
});
