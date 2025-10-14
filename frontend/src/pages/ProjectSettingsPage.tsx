/**
 * Project Settings Page
 * Configure project-specific settings and preferences
 */

import { useState, useEffect } from 'react';
import { Save, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  getProject,
  updateProject,
  hasProjectAccess,
} from '../lib/project-service';
import type {
  Project,
  ProjectType,
  ProjectConfiguration,
  DataVaultPreferences,
  DimensionalPreferences,
} from '../types/project';
import { supabase } from '../lib/supabase';

export function ProjectSettingsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState<ProjectType>('Standard');
  const [configuration, setConfiguration] = useState<ProjectConfiguration>({});

  useEffect(() => {
    if (projectId) {
      loadProject();
      checkAccess();
    }
  }, [projectId]);

  const loadProject = async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getProject(projectId);
      if (!data) {
        setError('Project not found');
        return;
      }

      setProject(data);
      setName(data.name);
      setDescription(data.description || '');
      setProjectType(data.project_type);
      setConfiguration(data.configuration || {});
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const checkAccess = async () => {
    if (!projectId) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setHasAccess(false);
      return;
    }

    const access = await hasProjectAccess(projectId, user.id);
    setHasAccess(access);
  };

  const handleSave = async () => {
    if (!projectId || !project) return;

    setSaving(true);
    setError(null);

    try {
      const updated = await updateProject(projectId, {
        name,
        description: description || undefined,
        project_type: projectType,
        configuration,
      });

      setProject(updated);
      // Show success message or navigate back
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const updateConfiguration = (updates: Partial<ProjectConfiguration>) => {
    setConfiguration((prev) => ({ ...prev, ...updates }));
  };

  const updateDataVaultPreferences = (
    updates: Partial<DataVaultPreferences>
  ) => {
    setConfiguration((prev) => ({
      ...prev,
      data_vault_preferences: {
        ...prev.data_vault_preferences,
        ...updates,
      },
    }));
  };

  const updateDimensionalPreferences = (
    updates: Partial<DimensionalPreferences>
  ) => {
    setConfiguration((prev) => ({
      ...prev,
      dimensional_preferences: {
        ...prev.dimensional_preferences,
        ...updates,
      },
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-500">Loading project...</div>
      </div>
    );
  }

  if (error && !project) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error loading project</p>
          <p className="text-sm text-gray-500">{error}</p>
          <button
            onClick={() => navigate('/projects')}
            className="btn-primary mt-4"
          >
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-red-600 mb-2">Access Denied</p>
          <p className="text-sm text-gray-500">
            You don't have permission to edit this project
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/projects')}
              className="btn-icon text-gray-400 hover:text-gray-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Project Settings
              </h1>
              <p className="text-sm text-gray-500 mt-1">{project?.name}</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2 px-6"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Basic Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Project Type
                </label>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value as ProjectType)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Standard">Standard</option>
                  <option value="DataVault">Data Vault</option>
                  <option value="Dimensional">Dimensional</option>
                </select>
              </div>
            </div>
          </div>

          {/* General Configuration */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              General Configuration
            </h2>

            <div className="space-y-4">
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={configuration.medallion_layers_enabled || false}
                    onChange={(e) =>
                      updateConfiguration({
                        medallion_layers_enabled: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Enable Medallion Architecture (Bronze/Silver/Gold)
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Catalog
                </label>
                <input
                  type="text"
                  value={configuration.default_catalog || ''}
                  onChange={(e) =>
                    updateConfiguration({ default_catalog: e.target.value })
                  }
                  placeholder="main"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Schema
                </label>
                <input
                  type="text"
                  value={configuration.default_schema || ''}
                  onChange={(e) =>
                    updateConfiguration({ default_schema: e.target.value })
                  }
                  placeholder="default"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Data Vault Preferences */}
          {projectType === 'DataVault' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Data Vault 2.0 Preferences
              </h2>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={
                      configuration.data_vault_preferences?.use_hash_keys || false
                    }
                    onChange={(e) =>
                      updateDataVaultPreferences({ use_hash_keys: e.target.checked })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Use Hash Keys (MD5/SHA for business keys)
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={
                      configuration.data_vault_preferences?.load_date_tracking ||
                      false
                    }
                    onChange={(e) =>
                      updateDataVaultPreferences({
                        load_date_tracking: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Load Date Tracking
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={
                      configuration.data_vault_preferences?.record_source_tracking ||
                      false
                    }
                    onChange={(e) =>
                      updateDataVaultPreferences({
                        record_source_tracking: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Record Source Tracking
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={
                      configuration.data_vault_preferences?.multi_active_satellites ||
                      false
                    }
                    onChange={(e) =>
                      updateDataVaultPreferences({
                        multi_active_satellites: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Multi-Active Satellites
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={
                      configuration.data_vault_preferences?.business_vault_enabled ||
                      false
                    }
                    onChange={(e) =>
                      updateDataVaultPreferences({
                        business_vault_enabled: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Enable Business Vault Layer
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Dimensional Preferences */}
          {projectType === 'Dimensional' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Dimensional Modeling Preferences (Kimball)
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Surrogate Key Strategy
                  </label>
                  <select
                    value={
                      configuration.dimensional_preferences?.surrogate_key_strategy ||
                      'auto_increment'
                    }
                    onChange={(e) =>
                      updateDimensionalPreferences({
                        surrogate_key_strategy: e.target.value as any,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="auto_increment">Auto Increment</option>
                    <option value="hash">Hash (MD5/SHA)</option>
                    <option value="uuid">UUID</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Slowly Changing Dimensions (SCD)
                  </label>
                  <div className="space-y-2 pl-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={
                          configuration.dimensional_preferences
                            ?.slowly_changing_dimensions?.type_1 || false
                        }
                        onChange={(e) =>
                          updateDimensionalPreferences({
                            slowly_changing_dimensions: {
                              ...configuration.dimensional_preferences
                                ?.slowly_changing_dimensions,
                              type_1: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Type 1 (Overwrite)
                      </span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={
                          configuration.dimensional_preferences
                            ?.slowly_changing_dimensions?.type_2 || false
                        }
                        onChange={(e) =>
                          updateDimensionalPreferences({
                            slowly_changing_dimensions: {
                              ...configuration.dimensional_preferences
                                ?.slowly_changing_dimensions,
                              type_2: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Type 2 (Add New Row)
                      </span>
                    </label>

                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={
                          configuration.dimensional_preferences
                            ?.slowly_changing_dimensions?.type_3 || false
                        }
                        onChange={(e) =>
                          updateDimensionalPreferences({
                            slowly_changing_dimensions: {
                              ...configuration.dimensional_preferences
                                ?.slowly_changing_dimensions,
                              type_3: e.target.checked,
                            },
                          })
                        }
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Type 3 (Add New Column)
                      </span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={
                        configuration.dimensional_preferences?.conform_dimensions ||
                        false
                      }
                      onChange={(e) =>
                        updateDimensionalPreferences({
                          conform_dimensions: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Use Conformed Dimensions
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
