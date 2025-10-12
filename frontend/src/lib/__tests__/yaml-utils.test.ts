import { describe, it, expect } from 'vitest';
import {
  exportProjectToYAML,
  exportDataModelToYAML,
  parseProjectYAML,
  parseDataModelYAML,
  generateSlug,
  generateProjectPath,
  generateDataModelPath,
  type ProjectYAML,
  type DataModelYAML,
} from '../yaml-utils';

describe('YAML Utils', () => {
  describe('generateSlug', () => {
    it('should convert name to slug format', () => {
      expect(generateSlug('My Project Name')).toBe('my-project-name');
    });

    it('should handle special characters', () => {
      expect(generateSlug('Project @#$ Name!!')).toBe('project-name');
    });

    it('should remove leading/trailing dashes', () => {
      expect(generateSlug('-project-')).toBe('project');
    });

    it('should handle multiple spaces', () => {
      expect(generateSlug('My   Project   Name')).toBe('my-project-name');
    });

    it('should handle uppercase letters', () => {
      expect(generateSlug('UPPERCASE')).toBe('uppercase');
    });
  });

  describe('generateProjectPath', () => {
    it('should generate correct project path', () => {
      const path = generateProjectPath('workspace-slug', 'project-slug');
      expect(path).toBe('metadata/projects/workspace-slug/project-slug.yml');
    });

    it('should handle different workspace and project names', () => {
      const path = generateProjectPath('my-workspace', 'my-project');
      expect(path).toBe('metadata/projects/my-workspace/my-project.yml');
    });
  });

  describe('generateDataModelPath', () => {
    it('should generate correct data model path', () => {
      const path = generateDataModelPath('project-slug', 'model-slug');
      expect(path).toBe('metadata/models/project-slug/model-slug.yml');
    });

    it('should handle different project and model names', () => {
      const path = generateDataModelPath('my-project', 'my-model');
      expect(path).toBe('metadata/models/my-project/my-model.yml');
    });
  });

  describe('exportProjectToYAML', () => {
    it('should export project to valid YAML', () => {
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

      const yaml = exportProjectToYAML(project);

      expect(yaml).toContain('Project: Test Project');
      expect(yaml).toContain('ID: proj_123');
      expect(yaml).toContain('metadata:');
      expect(yaml).toContain('id: proj_123');
      expect(yaml).toContain('name: Test Project');
    });

    it('should include optional fields when present', () => {
      const project: ProjectYAML = {
        metadata: {
          id: 'proj_123',
          name: 'Test Project',
          description: 'Test description',
          version: '1.0.0',
          owner_id: 'user_123',
          created_by: 'user_123',
          visibility: 'public',
          is_locked: true,
          locked_by: 'user_456',
          locked_at: '2024-01-02T00:00:00Z',
          company_id: 'comp_123',
          workspace_id: 'ws_123',
          github_repo: 'owner/repo',
          github_branch: 'main',
          github_path: 'metadata/projects/test.yml',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
          last_synced_at: '2024-01-01T00:00:00Z',
        },
        members: [
          { user_id: 'user_123', role: 'owner', added_at: '2024-01-01T00:00:00Z' },
        ],
        settings: {
          databricks_workspace: 'workspace-url',
          default_catalog: 'main',
          default_schema: 'default',
          tags: ['tag1', 'tag2'],
        },
      };

      const yaml = exportProjectToYAML(project);

      expect(yaml).toContain('description: Test description');
      expect(yaml).toContain('locked_by: user_456');
      expect(yaml).toContain('members:');
      expect(yaml).toContain('settings:');
      expect(yaml).toContain('Status: locked');
    });
  });

  describe('exportDataModelToYAML', () => {
    it('should export data model to valid YAML', () => {
      const model: DataModelYAML = {
        metadata: {
          id: 'model_123',
          name: 'Test Model',
          version: '1.0.0',
          owner_id: 'user_123',
          created_by: 'user_123',
          visibility: 'private',
          is_locked: false,
          project_id: 'proj_123',
          company_id: 'comp_123',
          workspace_id: 'ws_123',
          github_repo: 'owner/repo',
          github_branch: 'main',
          github_path: 'metadata/models/test.yml',
          is_archived: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        visual_model: {
          nodes: [
            {
              id: 'node_1',
              type: 'table',
              position: { x: 0, y: 0 },
              data: { label: 'Table 1' },
            },
          ],
          edges: [],
        },
      };

      const yaml = exportDataModelToYAML(model);

      expect(yaml).toContain('Data Model: Test Model');
      expect(yaml).toContain('ID: model_123');
      expect(yaml).toContain('metadata:');
      expect(yaml).toContain('visual_model:');
    });

    it('should include model type in comment', () => {
      const model: DataModelYAML = {
        metadata: {
          id: 'model_123',
          name: 'Test Model',
          model_type: 'dimensional',
          version: '1.0.0',
          owner_id: 'user_123',
          created_by: 'user_123',
          visibility: 'private',
          is_locked: false,
          project_id: 'proj_123',
          company_id: 'comp_123',
          workspace_id: 'ws_123',
          github_repo: 'owner/repo',
          github_branch: 'main',
          github_path: 'metadata/models/test.yml',
          is_archived: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        visual_model: {
          nodes: [],
          edges: [],
        },
      };

      const yaml = exportDataModelToYAML(model);

      expect(yaml).toContain('Type: dimensional');
    });
  });

  describe('parseProjectYAML', () => {
    it('should parse valid project YAML', () => {
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

      const project = parseProjectYAML(yamlContent);

      expect(project.metadata.id).toBe('proj_123');
      expect(project.metadata.name).toBe('Test Project');
      expect(project.metadata.version).toBe('1.0.0');
      expect(project.metadata.visibility).toBe('private');
    });

    it('should throw error on invalid YAML', () => {
      const invalidYAML = 'invalid: yaml: content: [[[';

      expect(() => parseProjectYAML(invalidYAML)).toThrow('Failed to parse project YAML');
    });
  });

  describe('parseDataModelYAML', () => {
    it('should parse valid data model YAML', () => {
      const yamlContent = `
metadata:
  id: model_123
  name: Test Model
  model_type: dimensional
  version: 1.0.0
  owner_id: user_123
  created_by: user_123
  visibility: private
  is_locked: false
  project_id: proj_123
  company_id: comp_123
  workspace_id: ws_123
  github_repo: owner/repo
  github_branch: main
  github_path: metadata/models/test.yml
  is_archived: false
  created_at: '2024-01-01T00:00:00Z'
  updated_at: '2024-01-01T00:00:00Z'
visual_model:
  nodes:
    - id: node_1
      type: table
      position:
        x: 0
        y: 0
      data:
        label: Table 1
  edges: []
`;

      const model = parseDataModelYAML(yamlContent);

      expect(model.metadata.id).toBe('model_123');
      expect(model.metadata.name).toBe('Test Model');
      expect(model.metadata.model_type).toBe('dimensional');
      expect(model.visual_model.nodes).toHaveLength(1);
      expect(model.visual_model.nodes[0].id).toBe('node_1');
    });

    it('should throw error on invalid YAML', () => {
      const invalidYAML = 'invalid: [[[';

      expect(() => parseDataModelYAML(invalidYAML)).toThrow('Failed to parse data model YAML');
    });
  });

  describe('Round-trip conversion', () => {
    it('should maintain data integrity for project through export and parse', () => {
      const originalProject: ProjectYAML = {
        metadata: {
          id: 'proj_123',
          name: 'Test Project',
          description: 'Test description',
          version: '1.0.0',
          owner_id: 'user_123',
          created_by: 'user_123',
          visibility: 'public',
          is_locked: false,
          company_id: 'comp_123',
          workspace_id: 'ws_123',
          github_repo: 'owner/repo',
          github_branch: 'main',
          github_path: 'metadata/projects/test.yml',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        settings: {
          databricks_workspace: 'workspace-url',
          default_catalog: 'main',
          tags: ['tag1', 'tag2'],
        },
      };

      const yaml = exportProjectToYAML(originalProject);
      const parsedProject = parseProjectYAML(yaml);

      expect(parsedProject.metadata.id).toBe(originalProject.metadata.id);
      expect(parsedProject.metadata.name).toBe(originalProject.metadata.name);
      expect(parsedProject.metadata.description).toBe(originalProject.metadata.description);
      expect(parsedProject.settings?.tags).toEqual(originalProject.settings?.tags);
    });

    it('should maintain data integrity for data model through export and parse', () => {
      const originalModel: DataModelYAML = {
        metadata: {
          id: 'model_123',
          name: 'Test Model',
          model_type: 'data_vault',
          version: '1.0.0',
          owner_id: 'user_123',
          created_by: 'user_123',
          visibility: 'private',
          is_locked: false,
          project_id: 'proj_123',
          company_id: 'comp_123',
          workspace_id: 'ws_123',
          github_repo: 'owner/repo',
          github_branch: 'main',
          github_path: 'metadata/models/test.yml',
          is_archived: false,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        visual_model: {
          nodes: [
            {
              id: 'node_1',
              type: 'hub',
              position: { x: 100, y: 200 },
              data: { label: 'Customer Hub' },
            },
          ],
          edges: [],
        },
        tags: ['data-vault', 'customer'],
      };

      const yaml = exportDataModelToYAML(originalModel);
      const parsedModel = parseDataModelYAML(yaml);

      expect(parsedModel.metadata.id).toBe(originalModel.metadata.id);
      expect(parsedModel.metadata.model_type).toBe(originalModel.metadata.model_type);
      expect(parsedModel.visual_model.nodes[0].position.x).toBe(100);
      expect(parsedModel.tags).toEqual(originalModel.tags);
    });
  });
});
