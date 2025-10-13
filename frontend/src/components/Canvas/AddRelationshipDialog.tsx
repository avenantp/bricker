/**
 * Add Relationship Dialog Component
 * Allows users to create relationships between nodes
 */

import { useState, useEffect } from 'react';
import { X, Check, AlertCircle, Link as LinkIcon } from 'lucide-react';
import type { Node } from '../../types/node';
import type { RelationshipType, Cardinality } from '../../types/canvas';
import {
  createRelationship,
  validateRelationship,
  type CreateRelationshipPayload,
} from '../../lib/relationship-service';

interface AddRelationshipDialogProps {
  isOpen: boolean;
  onClose: () => void;
  sourceNode: Node;
  availableNodes: Node[];
  githubToken: string;
  githubRepo: string;
  onSuccess?: () => void;
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

export function AddRelationshipDialog({
  isOpen,
  onClose,
  sourceNode,
  availableNodes,
  githubToken,
  githubRepo,
  onSuccess,
}: AddRelationshipDialogProps) {
  const [targetNodeUuid, setTargetNodeUuid] = useState<string>('');
  const [sourceItemUuids, setSourceItemUuids] = useState<string[]>([]);
  const [targetItemUuids, setTargetItemUuids] = useState<string[]>([]);
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('FK');
  const [cardinality, setCardinality] = useState<Cardinality>('1:M');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter out source node and find target node
  const selectableNodes = availableNodes.filter((n) => n.uuid !== sourceNode.uuid);
  const targetNode = availableNodes.find((n) => n.uuid === targetNodeUuid);

  // Reset form when dialog opens/closes
  useEffect(() => {
    if (isOpen) {
      setTargetNodeUuid('');
      setSourceItemUuids([]);
      setTargetItemUuids([]);
      setRelationshipType('FK');
      setCardinality('1:M');
      setDescription('');
      setErrors([]);
    }
  }, [isOpen]);

  // Validate when selections change
  useEffect(() => {
    if (targetNode && sourceItemUuids.length > 0 && targetItemUuids.length > 0) {
      const validation = validateRelationship(
        sourceNode,
        targetNode,
        sourceItemUuids,
        targetItemUuids
      );
      setErrors(validation.errors);
    } else {
      setErrors([]);
    }
  }, [sourceNode, targetNode, sourceItemUuids, targetItemUuids]);

  const handleSourceItemToggle = (itemUuid: string) => {
    setSourceItemUuids((prev) =>
      prev.includes(itemUuid) ? prev.filter((id) => id !== itemUuid) : [...prev, itemUuid]
    );
  };

  const handleTargetItemToggle = (itemUuid: string) => {
    setTargetItemUuids((prev) =>
      prev.includes(itemUuid) ? prev.filter((id) => id !== itemUuid) : [...prev, itemUuid]
    );
  };

  const handleSubmit = async () => {
    if (!targetNode) {
      setErrors(['Please select a target node']);
      return;
    }

    if (sourceItemUuids.length === 0 || targetItemUuids.length === 0) {
      setErrors(['Please select at least one source and target column']);
      return;
    }

    const validation = validateRelationship(
      sourceNode,
      targetNode,
      sourceItemUuids,
      targetItemUuids
    );

    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setIsSubmitting(true);
    setErrors([]);

    try {
      const payload: CreateRelationshipPayload = {
        source_node_uuid: sourceNode.uuid,
        target_node_uuid: targetNodeUuid,
        source_nodeitem_uuids: sourceItemUuids,
        target_nodeitem_uuids: targetItemUuids,
        relationship_type: relationshipType,
        cardinality,
        description: description || undefined,
      };

      await createRelationship(payload, githubToken, githubRepo);

      onSuccess?.();
      onClose();
    } catch (error: any) {
      setErrors([error.message || 'Failed to create relationship']);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">Add Relationship</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-800">Validation Errors</h3>
                  <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Source Node (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source Node
            </label>
            <div className="bg-gray-50 border border-gray-300 rounded-lg p-3">
              <div className="font-medium text-gray-900">{sourceNode.name}</div>
              <div className="text-sm text-gray-500">{sourceNode.fqn}</div>
            </div>
          </div>

          {/* Target Node Selection */}
          <div>
            <label htmlFor="targetNode" className="block text-sm font-medium text-gray-700 mb-2">
              Target Node *
            </label>
            <select
              id="targetNode"
              value={targetNodeUuid}
              onChange={(e) => {
                setTargetNodeUuid(e.target.value);
                setTargetItemUuids([]); // Reset target items when node changes
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            >
              <option value="">Select target node...</option>
              {selectableNodes.map((node) => (
                <option key={node.uuid} value={node.uuid}>
                  {node.name} ({node.fqn})
                </option>
              ))}
            </select>
          </div>

          {/* Relationship Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Relationship Type *
            </label>
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
          </div>

          {/* Cardinality */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cardinality *
            </label>
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
          </div>

          {/* Source Columns Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Source Columns * (from {sourceNode.name})
            </label>
            <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
              {sourceNode.node_items.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No columns available</div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {sourceNode.node_items.map((item) => (
                    <label
                      key={item.uuid}
                      className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={sourceItemUuids.includes(item.uuid)}
                        onChange={() => handleSourceItemToggle(item.uuid)}
                        disabled={isSubmitting}
                      />
                      <div className="flex-1">
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
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Target Columns Selection */}
          {targetNode && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Columns * (from {targetNode.name})
              </label>
              <div className="border border-gray-300 rounded-lg max-h-48 overflow-y-auto">
                {targetNode.node_items.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">No columns available</div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {targetNode.node_items.map((item) => (
                      <label
                        key={item.uuid}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={targetItemUuids.includes(item.uuid)}
                          onChange={() => handleTargetItemToggle(item.uuid)}
                          disabled={isSubmitting}
                        />
                        <div className="flex-1">
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
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add a description for this relationship..."
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              !targetNodeUuid ||
              sourceItemUuids.length === 0 ||
              targetItemUuids.length === 0 ||
              errors.length > 0
            }
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Create Relationship
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
