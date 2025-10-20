/**
 * Recently Deleted Datasets Page
 *
 * Shows soft deleted datasets with restore/permanent delete options
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { RecentlyDeletedView, DeletedItem } from '../components/SoftDelete/RecentlyDeletedView';
import { getDeletedDatasets, restoreDataset, permanentlyDeleteDataset } from '../lib/dataset-service';

export function RecentlyDeletedDatasetsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [items, setItems] = useState<DeletedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get current user ID (you'll need to implement this based on your auth system)
  const getCurrentUserId = () => {
    // TODO: Replace with actual user ID from your auth system
    return 'current-user-id';
  };

  const loadDeletedDatasets = async () => {
    if (!workspaceId) {
      setError('Workspace ID is required');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const datasets = await getDeletedDatasets(workspaceId);
      setItems(datasets);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDeletedDatasets();
  }, [workspaceId]);

  const handleRestore = async (datasetId: string) => {
    const userId = getCurrentUserId();
    await restoreDataset(datasetId, userId);
  };

  const handlePermanentDelete = async (datasetId: string) => {
    const userId = getCurrentUserId();
    await permanentlyDeleteDataset(datasetId, userId);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <RecentlyDeletedView
        items={items}
        title="Recently Deleted Datasets"
        entityType="dataset"
        isLoading={isLoading}
        error={error}
        onRestore={handleRestore}
        onPermanentDelete={handlePermanentDelete}
        onRefresh={loadDeletedDatasets}
        emptyMessage="No recently deleted datasets"
      />
    </div>
  );
}
