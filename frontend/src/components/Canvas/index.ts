/**
 * Canvas components barrel export
 * Updated for refactored dataset-based architecture
 */

export { ProjectCanvas } from './ProjectCanvas';

// Dataset components (renamed from Node*)
export { DatasetNode } from './DatasetNode';
export { DatasetContextMenu } from './DatasetContextMenu';
export { DatasetEditorDialog } from './DatasetEditorDialog';

// Legacy exports for backward compatibility
export { DataNode } from './DataNode'; // Keep for migration period
export { NodeContextMenu } from './NodeContextMenu'; // Keep for migration period

// Edge components
export { RelationshipEdge } from './RelationshipEdge';

// Source Control Sync UI Components (M.2.5)
export { SourceControlSyncPanel } from './SourceControlSyncPanel';
export { UncommittedChangesDialog } from './UncommittedChangesDialog';
export { ConflictResolutionDialog } from './ConflictResolutionDialog';
export { SourceControlHistoryPanel } from './SourceControlHistoryPanel';

// Legacy exports for backward compatibility (git → source-control migration)
export { GitSyncPanel } from './GitSyncPanel'; // Keep for migration period
export { GitHistoryPanel } from './GitHistoryPanel'; // Keep for migration period

// Dialog components (still using Node terminology - to be migrated later)
export { CreateNodeDialog } from './CreateNodeDialog';
export { DeleteNodeDialog } from './DeleteNodeDialog';
export { NodeFilterPanel } from './NodeFilterPanel';
export { NodeSearchPanel } from './NodeSearchPanel';
export { NodeSyncStatus } from './NodeSyncStatus';
export { NodeEditorDialog } from './NodeEditorDialog';
export { NodeItemsTable } from './NodeItemsTable';
export { CreateNodeItemDialog } from './CreateNodeItemDialog';
export { AddRelationshipDialog } from './AddRelationshipDialog';
export { RelationshipDetailsDialog } from './RelationshipDetailsDialog';
export { NodeRelationshipsTab } from './NodeRelationshipsTab';
