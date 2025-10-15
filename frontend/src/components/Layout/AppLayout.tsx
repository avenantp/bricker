/**
 * Main Application Layout
 * Top navigation bar with logo, breadcrumbs, and user menu
 * Left sidebar with navigation items
 */

import { ReactNode } from 'react';
import { TopBar } from './TopBar';
import { NavigationSidebar } from './NavigationSidebar';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Top Navigation Bar */}
      <TopBar />

      {/* Main Content Area with Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <NavigationSidebar />

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
