# Conflict Resolution for Concurrent Edits - Implementation Guide

## Overview

Phase 2.3.12 implements a comprehensive conflict resolution system for handling concurrent edits to nodes. This system detects when multiple users edit the same node simultaneously and provides multiple strategies for resolving conflicts.

## Architecture

### Core Components

1. **Conflict Detection** (`conflict-resolution.ts`)
   - Detects when a node has been modified in GitHub since it was last read
   - Compares GitHub SHA values to identify conflicts
   - Fetches version history from GitHub commits

2. **Conflict Resolution Service** (`conflict-resolution.ts`)
   - Provides three resolution strategies: `ours`, `theirs`, `manual`
   - Implements automatic three-way merge when base version is available
   - Identifies conflicting fields between versions

3. **Node Service Integration** (`node-service.ts`)
   - `detectNodeConflict()` - Check if conflict exists
   - `getNodeConflictDetails()` - Get detailed version comparison
   - `updateNodeWithConflictCheck()` - Update with automatic conflict detection
   - `ConflictError` - Custom error thrown when conflict detected

4. **UI Component** (`ConflictResolutionDialog.tsx`)
   - Visual comparison of conflicting versions
   - Strategy selection interface
   - Commit history and author information
   - Conflict field listing

## Resolution Strategies

### 1. Keep My Version (`ours`)
- **Behavior**: Discards all remote changes and keeps local modifications
- **Use Case**: When you're confident your changes should take precedence
- **Result**: Your version overwrites the remote version

### 2. Use Their Version (`theirs`)
- **Behavior**: Accepts all remote changes and discards local modifications
- **Use Case**: When you want to accept the latest changes from GitHub
- **Result**: Remote version overwrites your local changes

### 3. Automatic Merge (`manual`)
- **Behavior**: Attempts intelligent three-way merge
- **Requirements**: Base version (common ancestor) must be available
- **Logic**:
  - If only one side changed a field: Use the changed version
  - If both sides changed differently: Use remote version (configurable)
  - Automatically merges non-conflicting changes
- **Fallback**: If auto-merge fails, uses `theirs` strategy

## Usage Examples

### Basic Update with Conflict Check

```typescript
import { updateNodeWithConflictCheck, ConflictError } from '../lib/node-service';

async function saveNode(uuid: string, updates: UpdateNodePayload) {
  try {
    const result = await updateNodeWithConflictCheck(
      uuid,
      updates,
      githubToken,
      githubRepo
      // No strategy = will throw ConflictError if conflict detected
    );

    if (result.hadConflict) {
      console.log('Conflict was detected and resolved');
      console.log(`Strategy used: ${result.resolution?.strategy_used}`);
    } else {
      console.log('No conflict, save completed');
    }

    return result.node;
  } catch (error) {
    if (error instanceof ConflictError) {
      // Show conflict resolution dialog
      handleConflict(uuid);
    } else {
      throw error;
    }
  }
}
```

### Using Conflict Resolution Dialog

```typescript
import { ConflictResolutionDialog } from '../components/Canvas';
import { getNodeConflictDetails, updateNodeWithConflictCheck } from '../lib/node-service';

function MyComponent() {
  const [conflict, setConflict] = useState<NodeConflict | null>(null);

  const handleSaveNode = async (nodeUuid: string, updates: UpdateNodePayload) => {
    try {
      await updateNodeWithConflictCheck(nodeUuid, updates, githubToken, githubRepo);
    } catch (error) {
      if (error instanceof ConflictError) {
        // Fetch conflict details
        const conflictDetails = await getNodeConflictDetails(
          nodeUuid,
          githubToken,
          githubRepo
        );
        setConflict(conflictDetails);
      }
    }
  };

  const handleResolveConflict = async (
    strategy: ConflictResolutionStrategy,
    mergedNode?: Node
  ) => {
    if (!conflict) return;

    await updateNodeWithConflictCheck(
      conflict.uuid,
      updates,
      githubToken,
      githubRepo,
      strategy
    );

    setConflict(null);
  };

  return (
    <>
      {/* Your UI */}

      <ConflictResolutionDialog
        conflict={conflict}
        isOpen={conflict !== null}
        onClose={() => setConflict(null)}
        onResolve={handleResolveConflict}
      />
    </>
  );
}
```

### Manual Conflict Detection

```typescript
import { detectNodeConflict } from '../lib/node-service';

// Before allowing user to edit
const hasConflict = await detectNodeConflict(nodeUuid, githubToken, githubRepo);

if (hasConflict) {
  alert('This node has been modified by another user. Please refresh.');
}
```

## Workflow

### Standard Save Flow

1. User edits node in NodeEditorDialog
2. User clicks "Save"
3. System calls `updateNodeWithConflictCheck()`
4. No conflict detected → Save succeeds
5. Node state updated in Supabase

### Conflict Detection Flow

1. User edits node in NodeEditorDialog
2. User clicks "Save"
3. System calls `updateNodeWithConflictCheck()`
4. **Conflict detected** (GitHub SHA mismatch)
5. `ConflictError` thrown
6. ConflictResolutionDialog displayed
7. User selects resolution strategy
8. System resolves conflict and saves
9. Node state updated to `synced`

## Conflict Information

### NodeConflict Interface

```typescript
interface NodeConflict {
  uuid: string;
  fqn: string;
  our_version: NodeVersion;       // Your local version
  their_version: NodeVersion;     // Latest GitHub version
  base_version?: NodeVersion;     // Common ancestor (for 3-way merge)
  conflict_fields: string[];      // List of differing fields
}

interface NodeVersion {
  node: Node;
  commit_sha: string;
  commit_message: string;
  commit_author: string;
  commit_timestamp: string;
}
```

### Conflict Fields

The system identifies which specific fields differ between versions:
- `name` - Node name changed
- `fqn` - Fully qualified name changed
- `medallion_layer` - Layer changed
- `entity_type` - Type changed
- `entity_subtype` - Subtype changed
- `materialization_type` - Materialization changed
- `description` - Description modified
- `metadata` - Any metadata changes
- `node_items` - NodeItems added/removed/modified
- `ai_confidence_score` - AI score changed

## Automatic Merge Logic

### Field-Level Merge

For each field in the node:

```
BASE → OUR  and  BASE → THEIR
```

**Resolution Rules:**
1. If `OUR == THEIR`: No conflict, use either
2. If `OUR == BASE` but `THEIR ≠ BASE`: Use THEIR (they changed it)
3. If `THEIR == BASE` but `OUR ≠ BASE`: Use OUR (we changed it)
4. If `OUR ≠ BASE` and `THEIR ≠ BASE`: **CONFLICT** (both changed)
   - Default: Use THEIR
   - Alternative: Mark for manual resolution

### Metadata Merge

Metadata is merged key-by-key:
- New keys from either side are included
- Modified keys follow same rules as fields
- Deleted keys are removed if deleted by either side

### NodeItems Merge

NodeItems are merged by UUID:
- Items added by either side are included
- Items deleted by either side are removed (conflict warning if both modified)
- Items modified by both sides: Use THEIR version by default

## Database State Tracking

### node_state Table

```sql
sync_status: 'synced' | 'pending' | 'error' | 'conflict'
error_message: Text description of conflict
github_sha: Latest known SHA
last_synced_at: Timestamp of last sync
```

**State Transitions:**
- `synced` → `conflict`: When conflict detected during save
- `conflict` → `synced`: After successful conflict resolution
- `conflict` → `error`: If resolution fails

## Error Handling

### ConflictError

```typescript
try {
  await updateNode(uuid, payload, token, repo);
} catch (error) {
  if (error instanceof ConflictError) {
    // Handle conflict specifically
    showConflictDialog();
  } else {
    // Handle other errors
    showErrorToast(error.message);
  }
}
```

### GitHub API Errors

- **404**: File was deleted → Treat as conflict
- **409**: GitHub detected conflict → Retry with conflict resolution
- **422**: Invalid SHA → Refresh and retry

## Performance Considerations

### Conflict Detection
- **Cost**: 1 GitHub API call per save attempt
- **Optimization**: Use cached SHA from Supabase
- **Timing**: Happens before file write, so no wasted writes

### Conflict Resolution
- **Base Version**: Requires 1 additional API call if 3-way merge needed
- **Commit Info**: Cached for 5 minutes to reduce API calls
- **Auto-merge**: Runs client-side, no additional API calls

## Security & Concurrency

### Optimistic Locking
- Uses GitHub file SHA as version token
- GitHub API enforces SHA match on update
- Prevents lost updates even under high concurrency

### Audit Trail
- All conflict resolutions logged in Git history
- Commit messages indicate conflict resolution
- Author information preserved from both versions

### Race Conditions
- **Scenario**: Two users resolve same conflict simultaneously
- **Protection**: GitHub SHA validation catches this
- **Result**: Second user must resolve again with latest version

## Testing

### Manual Testing Scenarios

1. **Simple Conflict**
   - User A opens node for editing
   - User B edits and saves same node
   - User A tries to save
   - Verify conflict dialog appears

2. **Auto-Merge Success**
   - User A changes description
   - User B changes metadata
   - User A saves → Should auto-merge successfully

3. **Auto-Merge Conflict**
   - User A changes name to "Table1"
   - User B changes name to "Table2"
   - User A saves → Should show conflict

4. **Node Deletion**
   - User A edits node
   - User B deletes node
   - User A saves → Should detect conflict (404)

### Automated Testing

```typescript
// Example test
describe('Conflict Resolution', () => {
  it('should detect conflict when SHA differs', async () => {
    const hasConflict = await detectNodeConflict(uuid, token, repo);
    expect(hasConflict).toBe(true);
  });

  it('should auto-merge non-conflicting changes', () => {
    const result = attemptAutoMerge(base, ours, theirs);
    expect(result.success).toBe(true);
    expect(result.conflicts).toHaveLength(0);
  });

  it('should identify conflicting fields', () => {
    const conflicts = identifyConflictFields(node1, node2);
    expect(conflicts).toContain('name');
  });
});
```

## Future Enhancements

### Planned Improvements

1. **Real-time Conflict Notification**
   - WebSocket/polling to detect conflicts before save
   - Show warning banner if node being edited by another user

2. **Visual Diff View**
   - Side-by-side comparison of versions
   - Highlight changed fields in different colors
   - Interactive field-by-field resolution

3. **Conflict History**
   - Track all conflicts and how they were resolved
   - Analytics on conflict frequency
   - User education based on patterns

4. **Smart Merge Strategies**
   - Machine learning to predict best resolution
   - User-specific merge preferences
   - Project-wide merge policies

5. **Collaborative Editing**
   - Real-time collaborative editing (CRDT)
   - Field-level locking
   - Presence indicators

## Troubleshooting

### Common Issues

**Issue**: Conflict dialog appears on every save
- **Cause**: GitHub SHA not being updated in Supabase
- **Fix**: Check `updateNodeState()` is called after save

**Issue**: Auto-merge always fails
- **Cause**: Base version not found
- **Fix**: Ensure commits are properly connected in Git history

**Issue**: Wrong version selected in auto-merge
- **Cause**: Merge logic prefers THEIR by default
- **Fix**: Modify `attemptAutoMerge()` to prefer OUR if needed

## Best Practices

1. **Always Use Conflict-Aware Updates**
   - Use `updateNodeWithConflictCheck()` instead of `updateNode()`
   - Handle `ConflictError` appropriately

2. **Show Visual Feedback**
   - Display sync status icon on nodes
   - Use NodeSyncStatus component
   - Update status in real-time

3. **Educate Users**
   - Explain what conflicts are
   - Show commit history in conflict dialog
   - Provide recommendations for resolution

4. **Log Conflicts**
   - Track conflict frequency
   - Analyze conflict patterns
   - Improve merge logic based on data

5. **Test Thoroughly**
   - Test with multiple browsers
   - Simulate network latency
   - Test rapid successive saves

## API Reference

### Core Functions

```typescript
// Detect if conflict exists
detectNodeConflict(uuid, token, repo): Promise<boolean>

// Get detailed conflict information
getNodeConflictDetails(uuid, token, repo): Promise<NodeConflict | null>

// Update with conflict checking
updateNodeWithConflictCheck(
  uuid,
  payload,
  token,
  repo,
  strategy?
): Promise<{ node: Node; hadConflict: boolean; resolution?: ConflictResolutionResult }>

// Attempt automatic merge
attemptAutoMerge(
  base: Node,
  ours: Node,
  theirs: Node
): { success: boolean; mergedNode?: Node; conflicts: string[] }

// Resolve conflict with strategy
resolveConflict(
  conflict: NodeConflict,
  strategy: ConflictResolutionStrategy,
  mergedNode?: Node
): Promise<ConflictResolutionResult>
```

### GitHub API Extensions

```typescript
// Check for conflict
GitHubClient.detectConflict(owner, repo, path, expectedSha): Promise<boolean>

// Get commit info
GitHubClient.getCommitInfo(owner, repo, sha): Promise<CommitInfo>

// Get file at specific commit
GitHubClient.getFileContentAtCommit(owner, repo, path, sha): Promise<FileContent>

// Find common ancestor
GitHubClient.findCommonAncestor(owner, repo, commit1, commit2): Promise<string | null>
```

## Conclusion

The conflict resolution system provides robust handling of concurrent edits with minimal user disruption. The automatic merge feature handles most conflicts transparently, while the UI provides clear options when manual intervention is needed.
