/**
 * Service Layer
 *
 * Central export for all service classes.
 */

// Project Service
export {
  ProjectService,
  createProjectService,
  type GetProjectsParams
} from './project-service';

// Workspace Service
export {
  WorkspaceService,
  createWorkspaceService,
  type GetWorkspacesParams
} from './workspace-service';

// Source Control Service
export {
  SourceControlService,
  createSourceControlService,
  type CommitParams,
  type SyncParams
} from './source-control-service';
