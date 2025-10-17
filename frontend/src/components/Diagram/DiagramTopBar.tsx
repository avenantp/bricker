/**
 * Diagram Top Bar Component
 * Contains search, create dataset, and import metadata actions
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Upload, Moon, Sun, Bell, Settings } from 'lucide-react';
import { UserMenu } from '../Layout/UserMenu';
import { useStore } from '@/store/useStore';
import { useDiagramStore } from '@/store/diagramStore';
import { ImportMetadataDialog } from './ImportMetadataDialog';

export function DiagramTopBar() {
  const navigate = useNavigate();
  const { isDarkMode, toggleDarkMode } = useStore();
  const { searchQuery, setSearchQuery } = useDiagramStore();
  const [showImportDialog, setShowImportDialog] = useState(false);

  const handleCreateDataset = () => {
    // TODO: Open create dataset dialog
    console.log('TODO: Open create dataset dialog');
  };

  const handleImportMetadata = () => {
    setShowImportDialog(true);
  };

  const handleImportSuccess = (importedCount: number) => {
    console.log(`Successfully imported ${importedCount} datasets`);
    // TODO: Refresh datasets on the diagram
    setTimeout(() => {
      setShowImportDialog(false);
    }, 2000);
  };

  return (
    <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6">
      {/* Left Section: Logo and Title */}
      <div className="flex items-center gap-6">
        {/* App Logo */}
        <button
          onClick={() => navigate('/')}
          className="hover:opacity-80 transition-opacity"
        >
          <img
            src={isDarkMode ? '/uroq-logo-light.png' : '/uroq-logo-dark.png'}
            alt="Uroq Logo"
            className="h-8"
          />
        </button>

        {/* Page Title */}
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          Dataset Diagram
        </h1>
      </div>

      {/* Center Section: Search and Actions */}
      <div className="flex items-center gap-3">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search datasets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-80 pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border-0 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Create Dataset Button */}
        <button
          onClick={handleCreateDataset}
          className="btn-primary inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Dataset
        </button>

        {/* Import Metadata Button */}
        <button
          onClick={handleImportMetadata}
          className="btn-secondary inline-flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          Import Metadata
        </button>
      </div>

      {/* Right Section: Utilities and User Menu */}
      <div className="flex items-center gap-4">
        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDarkMode}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDarkMode ? (
            <Sun className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          ) : (
            <Moon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          )}
        </button>

        {/* Notifications */}
        <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors relative">
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        {/* Settings */}
        <button
          onClick={() => navigate('/settings')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Settings className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>

        {/* User Menu */}
        <UserMenu />
      </div>

      {/* Import Metadata Dialog */}
      {showImportDialog && (
        <ImportMetadataDialog
          onClose={() => setShowImportDialog(false)}
          onSuccess={handleImportSuccess}
        />
      )}
    </div>
  );
}
