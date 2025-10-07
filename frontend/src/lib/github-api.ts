import { Octokit } from '@octokit/rest';
import { ProjectYAML, DataModelYAML, exportProjectToYAML, exportDataModelToYAML, parseProjectYAML, parseDataModelYAML } from './yaml-utils';

export class GitHubClient {
  private octokit: Octokit;

  constructor(token: string) {
    this.octokit = new Octokit({ auth: token });
  }

  // Get file content from GitHub
  async getFileContent(
    owner: string,
    repo: string,
    path: string,
    branch: string = 'main'
  ): Promise<{ content: string; sha: string }> {
    try {
      const response = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      if ('content' in response.data) {
        const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
        return { content, sha: response.data.sha };
      }

      throw new Error('File not found or is a directory');
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(`File not found: ${path}`);
      }
      throw error;
    }
  }

  // Create or update file in GitHub
  async upsertFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string = 'main',
    sha?: string
  ): Promise<string> {
    try {
      const response = await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        branch,
        sha, // Required for updates, optional for creates
      });

      return response.data.commit.sha || '';
    } catch (error: any) {
      throw new Error(`Failed to save file to GitHub: ${error.message}`);
    }
  }

  // Delete file from GitHub
  async deleteFile(
    owner: string,
    repo: string,
    path: string,
    message: string,
    sha: string,
    branch: string = 'main'
  ): Promise<void> {
    try {
      await this.octokit.repos.deleteFile({
        owner,
        repo,
        path,
        message,
        sha,
        branch,
      });
    } catch (error: any) {
      throw new Error(`Failed to delete file from GitHub: ${error.message}`);
    }
  }

  // Save project to GitHub
  async saveProject(
    owner: string,
    repo: string,
    project: ProjectYAML,
    existingSha?: string
  ): Promise<string> {
    const yamlContent = exportProjectToYAML(project);
    const message = existingSha
      ? `Update project: ${project.metadata.name}`
      : `Create project: ${project.metadata.name}`;

    return await this.upsertFile(
      owner,
      repo,
      project.metadata.github_path,
      yamlContent,
      message,
      project.metadata.github_branch,
      existingSha
    );
  }

  // Save data model to GitHub
  async saveDataModel(
    owner: string,
    repo: string,
    model: DataModelYAML,
    existingSha?: string
  ): Promise<string> {
    const yamlContent = exportDataModelToYAML(model);
    const message = existingSha
      ? `Update data model: ${model.metadata.name}`
      : `Create data model: ${model.metadata.name}`;

    return await this.upsertFile(
      owner,
      repo,
      model.metadata.github_path,
      yamlContent,
      message,
      model.metadata.github_branch,
      existingSha
    );
  }

  // Load project from GitHub
  async loadProject(
    owner: string,
    repo: string,
    path: string,
    branch: string = 'main'
  ): Promise<{ project: ProjectYAML; sha: string }> {
    const { content, sha } = await this.getFileContent(owner, repo, path, branch);
    const project = parseProjectYAML(content);
    return { project, sha };
  }

  // Load data model from GitHub
  async loadDataModel(
    owner: string,
    repo: string,
    path: string,
    branch: string = 'main'
  ): Promise<{ model: DataModelYAML; sha: string }> {
    const { content, sha } = await this.getFileContent(owner, repo, path, branch);
    const model = parseDataModelYAML(content);
    return { model, sha };
  }

  // List files in directory
  async listFiles(
    owner: string,
    repo: string,
    path: string,
    branch: string = 'main'
  ): Promise<Array<{ name: string; path: string; sha: string }>> {
    try {
      const response = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      if (Array.isArray(response.data)) {
        return response.data
          .filter((item) => item.type === 'file' && item.name.endsWith('.yml'))
          .map((item) => ({
            name: item.name,
            path: item.path,
            sha: item.sha,
          }));
      }

      return [];
    } catch (error: any) {
      if (error.status === 404) {
        return [];
      }
      throw error;
    }
  }

  // Create repository if it doesn't exist
  async ensureRepository(
    owner: string,
    repo: string,
    isPrivate: boolean = true
  ): Promise<void> {
    try {
      await this.octokit.repos.get({ owner, repo });
    } catch (error: any) {
      if (error.status === 404) {
        // Repository doesn't exist, create it
        await this.octokit.repos.createForAuthenticatedUser({
          name: repo,
          private: isPrivate,
          auto_init: true,
          description: 'Urck metadata repository',
        });
      } else {
        throw error;
      }
    }
  }
}

// Helper function to parse GitHub repo string (e.g., "owner/repo")
export function parseGitHubRepo(repoString: string): { owner: string; repo: string } {
  const parts = repoString.split('/');
  if (parts.length !== 2) {
    throw new Error('Invalid GitHub repo format. Expected: owner/repo');
  }
  return { owner: parts[0], repo: parts[1] };
}
