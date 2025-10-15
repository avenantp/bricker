/**
 * AI Enhancement Dialog
 * Provides UI for AI-powered column metadata enhancement
 * Features: Column selection, preview, batch enhancement, confidence filtering
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  AIEnhancementService,
  type DatasetContext,
  type BatchEnhancementOptions,
  type ColumnEnhancement,
  type CostEstimate,
} from '@/lib/services/ai-enhancement-service';
import type { Column, Dataset } from '@/types';
import { Check, X, Sparkles, AlertCircle, Clock, Zap } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

export interface AIEnhancementDialogProps {
  open: boolean;
  onClose: () => void;
  dataset: Dataset;
  columns: Column[];
  selectedColumnIds?: string[];
  onApplyEnhancements: (enhancements: ColumnEnhancement[]) => Promise<void>;
}

type ProcessingState = 'idle' | 'estimating' | 'processing' | 'reviewing' | 'applying' | 'complete';

// ============================================================================
// AI Enhancement Dialog Component
// ============================================================================

export function AIEnhancementDialog({
  open,
  onClose,
  dataset,
  columns,
  selectedColumnIds = [],
  onApplyEnhancements,
}: AIEnhancementDialogProps) {
  // ============================================================================
  // State
  // ============================================================================

  const [state, setState] = useState<ProcessingState>('idle');
  const [selectedColumns, setSelectedColumns] = useState<string[]>(selectedColumnIds);
  const [enhanceBusinessNames, setEnhanceBusinessNames] = useState(true);
  const [enhanceDescriptions, setEnhanceDescriptions] = useState(true);
  const [autoApplyHighConfidence, setAutoApplyHighConfidence] = useState(true);
  const [confidenceThreshold, setConfidenceThreshold] = useState(80);
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null);
  const [enhancements, setEnhancements] = useState<ColumnEnhancement[]>([]);
  const [selectedEnhancements, setSelectedEnhancements] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // Derived State
  // ============================================================================

  const columnsToEnhance = useMemo(() => {
    if (selectedColumns.length === 0) return columns;
    return columns.filter((col) => selectedColumns.includes(col.id));
  }, [columns, selectedColumns]);

  const datasetContext: DatasetContext = useMemo(
    () => ({
      datasetName: dataset.name,
      datasetDescription: dataset.description,
      medallionLayer: dataset.medallion_layer,
      entityType: dataset.entity_type,
      existingColumns: columns,
    }),
    [dataset, columns]
  );

  const stats = useMemo(() => {
    if (enhancements.length === 0) return null;
    const applied = enhancements.filter((e) => e.applied).length;
    const requiresReview = enhancements.length - applied;
    const avgConfidence =
      enhancements.reduce((sum, e) => {
        const bizConfidence = e.businessName?.confidence || 0;
        const descConfidence = e.description?.confidence || 0;
        return sum + Math.max(bizConfidence, descConfidence);
      }, 0) / enhancements.length;

    return { applied, requiresReview, avgConfidence: Math.round(avgConfidence) };
  }, [enhancements]);

  // ============================================================================
  // Effects
  // ============================================================================

  useEffect(() => {
    if (open && selectedColumnIds.length > 0) {
      setSelectedColumns(selectedColumnIds);
    }
  }, [open, selectedColumnIds]);

  useEffect(() => {
    if (open && columnsToEnhance.length > 0) {
      handleEstimateCost();
    }
  }, [open, columnsToEnhance.length]);

  useEffect(() => {
    if (state === 'reviewing' && autoApplyHighConfidence) {
      // Auto-select high-confidence enhancements
      const highConfidence = enhancements
        .filter((e) => {
          const bizConf = e.businessName?.confidence || 0;
          const descConf = e.description?.confidence || 0;
          return Math.max(bizConf, descConf) >= confidenceThreshold;
        })
        .map((e) => e.columnId);
      setSelectedEnhancements(highConfidence);
    }
  }, [state, enhancements, autoApplyHighConfidence, confidenceThreshold]);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleEstimateCost = async () => {
    setState('estimating');
    setError(null);
    try {
      const estimate = await AIEnhancementService.estimateEnhancementCost(
        columnsToEnhance.length
      );
      setCostEstimate(estimate);
      setState('idle');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to estimate cost');
      setState('idle');
    }
  };

  const handleStartEnhancement = async () => {
    setState('processing');
    setError(null);
    setProgress(0);

    try {
      const options: BatchEnhancementOptions = {
        enhanceBusinessNames,
        enhanceDescriptions,
        confidenceThreshold,
        autoApplyHighConfidence,
      };

      const result = await AIEnhancementService.batchEnhanceColumns(
        columnsToEnhance,
        datasetContext,
        options
      );

      setEnhancements(result.enhancements);
      setProgress(100);
      setState('reviewing');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enhancement failed');
      setState('idle');
    }
  };

  const handleApply = async () => {
    setState('applying');
    setError(null);

    try {
      // Filter to only selected enhancements
      const toApply = enhancements.filter((e) => selectedEnhancements.includes(e.columnId));

      await onApplyEnhancements(toApply);
      setState('complete');

      // Close dialog after short delay
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply enhancements');
      setState('reviewing');
    }
  };

  const handleClose = () => {
    setState('idle');
    setEnhancements([]);
    setSelectedEnhancements([]);
    setProgress(0);
    setError(null);
    onClose();
  };

  const toggleColumnSelection = (columnId: string) => {
    setSelectedColumns((prev) =>
      prev.includes(columnId) ? prev.filter((id) => id !== columnId) : [...prev, columnId]
    );
  };

  const toggleEnhancementSelection = (columnId: string) => {
    setSelectedEnhancements((prev) =>
      prev.includes(columnId) ? prev.filter((id) => id !== columnId) : [...prev, columnId]
    );
  };

  const selectAllEnhancements = () => {
    setSelectedEnhancements(enhancements.map((e) => e.columnId));
  };

  const deselectAllEnhancements = () => {
    setSelectedEnhancements([]);
  };

  // ============================================================================
  // Render Helpers
  // ============================================================================

  const renderColumnSelection = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Select Columns to Enhance</h3>
        <div className="text-xs text-gray-500">
          {selectedColumns.length === 0 ? 'All columns' : `${selectedColumns.length} selected`}
        </div>
      </div>

      <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
        {columns.map((column) => (
          <div key={column.id} className="flex items-center space-x-2">
            <Checkbox
              id={`col-${column.id}`}
              checked={selectedColumns.includes(column.id)}
              onCheckedChange={() => toggleColumnSelection(column.id)}
            />
            <Label
              htmlFor={`col-${column.id}`}
              className="text-sm flex-1 cursor-pointer flex items-center justify-between"
            >
              <span>{column.name}</span>
              <span className="text-xs text-gray-500">{column.data_type}</span>
            </Label>
          </div>
        ))}
      </div>
    </div>
  );

  const renderOptions = () => (
    <div className="space-y-4">
      <h3 className="text-sm font-medium">Enhancement Options</h3>

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="enhance-business-names"
            checked={enhanceBusinessNames}
            onCheckedChange={(checked) => setEnhanceBusinessNames(checked as boolean)}
          />
          <Label htmlFor="enhance-business-names" className="text-sm cursor-pointer">
            Generate Business Names
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="enhance-descriptions"
            checked={enhanceDescriptions}
            onCheckedChange={(checked) => setEnhanceDescriptions(checked as boolean)}
          />
          <Label htmlFor="enhance-descriptions" className="text-sm cursor-pointer">
            Generate Descriptions
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="auto-apply"
            checked={autoApplyHighConfidence}
            onCheckedChange={(checked) => setAutoApplyHighConfidence(checked as boolean)}
          />
          <Label htmlFor="auto-apply" className="text-sm cursor-pointer">
            Auto-select high confidence suggestions (≥ {confidenceThreshold}%)
          </Label>
        </div>
      </div>

      {costEstimate && (
        <div className="bg-blue-50 border border-blue-200 rounded-md p-3 space-y-1">
          <div className="flex items-center space-x-2 text-sm font-medium text-blue-900">
            <Zap className="h-4 w-4" />
            <span>Cost Estimate</span>
          </div>
          <div className="text-xs text-blue-700 space-y-1">
            <div className="flex justify-between">
              <span>Columns:</span>
              <span className="font-medium">{costEstimate.columnCount}</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated Tokens:</span>
              <span className="font-medium">{costEstimate.estimatedTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Estimated Cost:</span>
              <span className="font-medium">${costEstimate.estimatedCost.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span>Model:</span>
              <span className="font-medium text-xs">{costEstimate.modelUsed}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderProcessing = () => (
    <div className="space-y-4 py-8">
      <div className="flex items-center justify-center space-x-3">
        <Sparkles className="h-6 w-6 text-purple-600 animate-pulse" />
        <span className="text-lg font-medium">Enhancing Columns with AI...</span>
      </div>
      <Progress value={progress} className="w-full" />
      <p className="text-center text-sm text-gray-500">
        Processing {columnsToEnhance.length} columns
      </p>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Review AI Suggestions</h3>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="sm" onClick={selectAllEnhancements}>
            Select All
          </Button>
          <Button variant="ghost" size="sm" onClick={deselectAllEnhancements}>
            Deselect All
          </Button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <div className="text-2xl font-bold text-green-900">{stats.applied}</div>
            <div className="text-xs text-green-700">High Confidence</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="text-2xl font-bold text-yellow-900">{stats.requiresReview}</div>
            <div className="text-xs text-yellow-700">Needs Review</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="text-2xl font-bold text-blue-900">{stats.avgConfidence}%</div>
            <div className="text-xs text-blue-700">Avg Confidence</div>
          </div>
        </div>
      )}

      <div className="max-h-96 overflow-y-auto border rounded-md divide-y">
        {enhancements.map((enhancement) => {
          const column = columns.find((c) => c.id === enhancement.columnId);
          if (!column) return null;

          const maxConfidence = Math.max(
            enhancement.businessName?.confidence || 0,
            enhancement.description?.confidence || 0
          );

          return (
            <div
              key={enhancement.columnId}
              className={`p-4 hover:bg-gray-50 transition-colors ${
                selectedEnhancements.includes(enhancement.columnId) ? 'bg-blue-50' : ''
              }`}
            >
              <div className="flex items-start space-x-3">
                <Checkbox
                  id={`enh-${enhancement.columnId}`}
                  checked={selectedEnhancements.includes(enhancement.columnId)}
                  onCheckedChange={() => toggleEnhancementSelection(enhancement.columnId)}
                  className="mt-1"
                />
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">{column.name}</span>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          maxConfidence >= 80
                            ? 'bg-green-100 text-green-800'
                            : maxConfidence >= 60
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {maxConfidence}% confidence
                      </span>
                    </div>
                  </div>

                  {enhancement.businessName && (
                    <div className="bg-white border rounded-md p-2 space-y-1">
                      <div className="text-xs text-gray-500">Business Name</div>
                      <div className="text-sm font-medium text-green-900">
                        {enhancement.businessName.suggestedName}
                      </div>
                      <div className="text-xs text-gray-600">
                        {enhancement.businessName.reasoning}
                      </div>
                    </div>
                  )}

                  {enhancement.description && (
                    <div className="bg-white border rounded-md p-2 space-y-1">
                      <div className="text-xs text-gray-500">Description</div>
                      <div className="text-sm text-gray-900">
                        {enhancement.description.suggestedDescription}
                      </div>
                      <div className="text-xs text-gray-600">
                        {enhancement.description.reasoning}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderComplete = () => (
    <div className="space-y-4 py-8 text-center">
      <div className="flex items-center justify-center">
        <div className="bg-green-100 rounded-full p-4">
          <Check className="h-8 w-8 text-green-600" />
        </div>
      </div>
      <div>
        <h3 className="text-lg font-medium">Enhancements Applied Successfully!</h3>
        <p className="text-sm text-gray-500 mt-1">
          {selectedEnhancements.length} column{selectedEnhancements.length !== 1 ? 's' : ''} updated
        </p>
      </div>
    </div>
  );

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <span>AI Column Enhancement</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {state === 'idle' && (
            <>
              {renderColumnSelection()}
              {renderOptions()}
            </>
          )}

          {state === 'estimating' && (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-500">Estimating cost...</p>
            </div>
          )}

          {state === 'processing' && renderProcessing()}

          {state === 'reviewing' && renderReview()}

          {state === 'applying' && (
            <div className="text-center py-8">
              <Clock className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-500">Applying enhancements...</p>
            </div>
          )}

          {state === 'complete' && renderComplete()}
        </div>

        <DialogFooter>
          {state === 'idle' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleStartEnhancement}
                disabled={
                  columnsToEnhance.length === 0 ||
                  (!enhanceBusinessNames && !enhanceDescriptions)
                }
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Start Enhancement
              </Button>
            </>
          )}

          {state === 'reviewing' && (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleApply}
                disabled={selectedEnhancements.length === 0}
              >
                <Check className="h-4 w-4 mr-2" />
                Apply {selectedEnhancements.length} Enhancement
                {selectedEnhancements.length !== 1 ? 's' : ''}
              </Button>
            </>
          )}

          {state === 'complete' && (
            <Button onClick={handleClose}>
              <Check className="h-4 w-4 mr-2" />
              Done
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
