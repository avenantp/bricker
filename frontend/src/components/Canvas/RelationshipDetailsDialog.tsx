/**
 * Relationship Details Dialog Component
 * Displays and allows editing of an existing relationship
 */

import { useState, useEffect } from 'react';
import { X, Edit2, Trash2, Save, AlertCircle, Link as LinkIcon } from 'lucide-react';
import type { RelationshipType, Cardinality } from '../../types/canvas';
import type {
  RelationshipWithMetadata,
  RelationshipIdentifier,
  UpdateRelationshipPayload,
} from '../../lib/relationship-service';
import { updateRelationship, deleteRelationship } from '../../lib/relationship-service';

interface RelationshipDetailsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  relationship: RelationshipWithMetadata | null;
  githubToken: string;
  githubRepo: string;
  onUpdate?: () => void;
  onDelete?: () => void;
}

const RELATIONSHIP_TYPES: { value: RelationshipType; label: string; description: string }[] = [
  { value: 'FK', label: 'Foreign Key', description: 'Standard foreign key relationship' },
  { value: 'BusinessKey', label: 'Business Key', description: 'Business key relationship' },
  { value: 'NaturalKey', label: 'Natural Key', description: 'Natural key relationship' },
];

const CARDINALITY_OPTIONS: { value: Cardinality; label: string; description: string }[] = [
  { value: '1:1', label: 'One-to-One', description: 'Each record relates to exactly one record' },
  { value: '1:M', label: 'One-to-Many', description: 'One record can relate to many records' },
  { value: 'M:M', label: 'Many-to-Many', description: 'Many records relate to many records' },
];

export function RelationshipDetailsDialog({
  isOpen,
  onClose,
  relationship,
  githubToken,
  githubRepo,
  onUpdate,
  onDelete,
}: RelationshipDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('FK');
  const [cardinality, setCardinality] = useState<Cardinality>('1:M');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with relationship data
  useEffect(() => {
    if (relationship) {
      setRelationshipType(relationship.relationship_type);
      setCardinality(relationship.cardinality);
      setDescription(relationship.description || '');
      setIsEditing(false);
      setShowDeleteConfirm(false);
      setError(null);
    }
  }, [relationship]);

  const handleSave = async () => {
    if (!relationship) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const identifier: RelationshipIdentifier = {
        source_node_uuid: relationship.source_node.uuid,
        target_node_uuid: relationship.target_node.uuid,
        source_nodeitem_uuids: relationship.source_nodeitems.map((item) => item.uuid),
        target_nodeitem_uuids: relationship.target_nodeitems.map((item) => item.uuid),
      };

      const payload: UpdateRelationshipPayload = {
        relationship_type: relationshipType,
        cardinality,
        description: description || undefined,
      };

      await updateRelationship(identifier, payload, githubToken, githubRepo);

      setIsEditing(false);
      onUpdate?.();
    } catch (err: any) {
      setError(err.message || 'Failed to update relationship');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!relationship) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const identifier: RelationshipIdentifier = {
        source_node_uuid: relationship.source_node.uuid,
        target_node_uuid: relationship.target_node.uuid,
        source_nodeitem_uuids: relationship.source_nodeitems.map((item) => item.uuid),
        target_nodeitem_uuids: relationship.target_nodeitems.map((item) => item.uuid),
      };

      await deleteRelationship(identifier, githubToken, githubRepo);

      onDelete?.();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to delete relationship');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (relationship) {
      setRelationshipType(relationship.relationship_type);
      setCardinality(relationship.cardinality);
      setDescription(relationship.description || '');
    }
    setIsEditing(false);
    setError(null);
  };

  if (!isOpen || !relationship) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Relationship Details</h2>
          </div>
          <div className="flex items-center gap-2">
            {!isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                  disabled={isSubmitting}
                  title="Edit relationship"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                  disabled={isSubmitting}
                  title="Delete relationship"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              disabled={isSubmitting}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
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

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-yellow-800">Confirm Deletion</h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    Are you sure you want to delete this relationship? This action cannot be undone.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={handleDelete}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-300 text-sm font-medium"
                    >
                      {isSubmitting ? 'Deleting...' : 'Delete'}
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(false)}
                      disabled={isSubmitting}
                      className="px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded hover:bg-gray-50 text-sm font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Source Node */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Source Node</label>
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
              <div className="font-medium text-gray-900">{relationship.source_node.name}</div>
              <div className="text-sm text-gray-500">{relationship.source_node.fqn}</div>
            </div>
          </div>

          {/* Source Columns */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Source Columns</label>
            <div className="border border-gray-300 rounded-lg divide-y divide-gray-200">
              {relationship.source_nodeitems.map((item) => (
                <div key={item.uuid} className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{item.name}</span>
                    <span className="text-sm text-gray-500">({item.data_type})</span>
                    {item.is_primary_key && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        PK
                      </span>
                    )}
                    {item.is_foreign_key && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                        FK
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <div className="text-sm text-gray-500 mt-1">{item.description}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Target Node */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Node</label>
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
              <div className="font-medium text-gray-900">{relationship.target_node.name}</div>
              <div className="text-sm text-gray-500">{relationship.target_node.fqn}</div>
            </div>
          </div>

          {/* Target Columns */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Target Columns</label>
            <div className="border border-gray-300 rounded-lg divide-y divide-gray-200">
              {relationship.target_nodeitems.map((item) => (
                <div key={item.uuid} className="p-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{item.name}</span>
                    <span className="text-sm text-gray-500">({item.data_type})</span>
                    {item.is_primary_key && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        PK
                      </span>
                    )}
                    {item.is_foreign_key && (
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                        FK
                      </span>
                    )}
                  </div>
                  {item.description && (
                    <div className="text-sm text-gray-500 mt-1">{item.description}</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Relationship Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Relationship Type
            </label>
            {isEditing ? (
              <div className="space-y-2">
                {RELATIONSHIP_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className="flex items-start gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="relationshipType"
                      value={type.value}
                      checked={relationshipType === type.value}
                      onChange={(e) => setRelationshipType(e.target.value as RelationshipType)}
                      className="mt-1"
                      disabled={isSubmitting}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{type.label}</div>
                      <div className="text-sm text-gray-500">{type.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
                <div className="font-medium text-gray-900">
                  {RELATIONSHIP_TYPES.find((t) => t.value === relationshipType)?.label}
                </div>
              </div>
            )}
          </div>

          {/* Cardinality */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cardinality</label>
            {isEditing ? (
              <div className="space-y-2">
                {CARDINALITY_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-start gap-3 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="cardinality"
                      value={option.value}
                      checked={cardinality === option.value}
                      onChange={(e) => setCardinality(e.target.value as Cardinality)}
                      className="mt-1"
                      disabled={isSubmitting}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{option.label}</div>
                      <div className="text-sm text-gray-500">{option.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
                <div className="font-medium text-gray-900">
                  {CARDINALITY_OPTIONS.find((c) => c.value === cardinality)?.label}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            {isEditing ? (
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add a description for this relationship..."
                disabled={isSubmitting}
              />
            ) : (
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-3 min-h-[80px]">
                {description ? (
                  <p className="text-gray-900">{description}</p>
                ) : (
                  <p className="text-gray-500 italic">No description</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          {isEditing ? (
            <>
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
              disabled={isSubmitting}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
