/**
 * Node Relationships Tab Component
 * Displays and manages relationships for a node within the Node Editor Dialog
 */

import { useState, useEffect } from 'react';
import { Link as LinkIcon, Trash2, Plus, Search, AlertCircle } from 'lucide-react';
import type { Node } from '../../types/node';
import type { RelationshipWithMetadata } from '../../lib/relationship-service';
import { getNodeRelationships, deleteRelationship } from '../../lib/relationship-service';

interface NodeRelationshipsTabProps {
  node: Node;
  githubToken: string;
  githubRepo: string;
  onAddRelationship?: () => void;
  onRefresh?: () => void;
}

export function NodeRelationshipsTab({
  node,
  githubToken,
  githubRepo,
  onAddRelationship,
  onRefresh,
}: NodeRelationshipsTabProps) {
  const [relationships, setRelationships] = useState<RelationshipWithMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null); // Relationship ID
  const [deleting, setDeleting] = useState(false);

  // Load relationships on mount
  useEffect(() => {
    loadRelationships();
  }, [node.uuid]);

  const loadRelationships = async () => {
    setLoading(true);
    setError(null);

    try {
      const rels = await getNodeRelationships(node.uuid, githubToken, githubRepo);
      setRelationships(rels);
    } catch (err: any) {
      setError(err.message || 'Failed to load relationships');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (relationship: RelationshipWithMetadata) => {
    setDeleting(true);
    setError(null);

    try {
      await deleteRelationship(
        {
          source_node_uuid: relationship.source_node.uuid,
          target_node_uuid: relationship.target_node.uuid,
          source_nodeitem_uuids: relationship.source_nodeitems.map((item) => item.uuid),
          target_nodeitem_uuids: relationship.target_nodeitems.map((item) => item.uuid),
        },
        githubToken,
        githubRepo
      );

      // Remove from local state
      setRelationships(relationships.filter((r) => r.id !== relationship.id));
      setDeleteConfirm(null);
      onRefresh?.();
    } catch (err: any) {
      setError(err.message || 'Failed to delete relationship');
    } finally {
      setDeleting(false);
    }
  };

  // Filter relationships by search query
  const filteredRelationships = relationships.filter((rel) => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    const sourceName = rel.source_node.name.toLowerCase();
    const targetName = rel.target_node.name.toLowerCase();
    const relType = rel.relationship_type.toLowerCase();

    return (
      sourceName.includes(query) || targetName.includes(query) || relType.includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-600">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>Loading relationships...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Actions */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search relationships..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={onAddRelationship}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Relationship
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Relationships List */}
      {filteredRelationships.length === 0 ? (
        <div className="text-center py-12">
          <LinkIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-sm font-medium text-gray-900 mb-1">
            {searchQuery ? 'No matching relationships' : 'No relationships yet'}
          </h3>
          <p className="text-sm text-gray-500">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Create relationships to connect this node with others'}
          </p>
          {!searchQuery && (
            <button
              onClick={onAddRelationship}
              className="mt-4 px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
            >
              Add First Relationship
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredRelationships.map((rel) => {
            const isOutgoing = rel.source_node.uuid === node.uuid;
            const relatedNode = isOutgoing ? rel.target_node : rel.source_node;
            const sourceColumns = isOutgoing ? rel.source_nodeitems : rel.target_nodeitems;
            const targetColumns = isOutgoing ? rel.target_nodeitems : rel.source_nodeitems;

            return (
              <div
                key={rel.id}
                className="border border-gray-300 rounded-lg p-4 hover:border-blue-400 transition-colors"
              >
                {/* Relationship Header */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{relatedNode.name}</span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {isOutgoing ? '→' : '←'}
                      </span>
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                        {rel.relationship_type}
                      </span>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        {rel.cardinality}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 font-mono">{relatedNode.fqn}</div>
                  </div>

                  {/* Delete Button */}
                  <button
                    onClick={() => setDeleteConfirm(rel.id)}
                    disabled={deleting}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete relationship"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Column Mappings */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase mb-1">
                      {isOutgoing ? 'Source Columns' : 'Target Columns'}
                    </div>
                    <div className="space-y-1">
                      {sourceColumns.map((col) => (
                        <div
                          key={col.uuid}
                          className="flex items-center gap-2 text-gray-700 bg-gray-50 rounded px-2 py-1"
                        >
                          <span className="font-mono">{col.name}</span>
                          <span className="text-xs text-gray-500">({col.data_type})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-medium text-gray-500 uppercase mb-1">
                      {isOutgoing ? 'Target Columns' : 'Source Columns'}
                    </div>
                    <div className="space-y-1">
                      {targetColumns.map((col) => (
                        <div
                          key={col.uuid}
                          className="flex items-center gap-2 text-gray-700 bg-gray-50 rounded px-2 py-1"
                        >
                          <span className="font-mono">{col.name}</span>
                          <span className="text-xs text-gray-500">({col.data_type})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Description */}
                {rel.description && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-xs font-medium text-gray-500 uppercase mb-1">
                      Description
                    </div>
                    <p className="text-sm text-gray-700">{rel.description}</p>
                  </div>
                )}

                {/* Delete Confirmation */}
                {deleteConfirm === rel.id && (
                  <div className="mt-3 pt-3 border-t border-gray-200 bg-red-50 rounded p-3">
                    <div className="flex items-start gap-2 mb-3">
                      <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-red-800">Confirm Deletion</h4>
                        <p className="text-xs text-red-700 mt-1">
                          Are you sure you want to delete this relationship? This action cannot be
                          undone.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDelete(rel)}
                        disabled={deleting}
                        className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:bg-gray-300"
                      >
                        {deleting ? 'Deleting...' : 'Delete'}
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        disabled={deleting}
                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded text-sm hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Summary */}
      {filteredRelationships.length > 0 && (
        <div className="text-sm text-gray-500 pt-2">
          Showing {filteredRelationships.length} of {relationships.length} relationship
          {relationships.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
