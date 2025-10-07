import { AlertCircle, X } from 'lucide-react';
import { useState } from 'react';
import { hasDevAdminAccess } from '@/config/env';

export function DevModeBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!hasDevAdminAccess() || !isVisible) {
    return null;
  }

  return (
    <div className="bg-yellow-500 text-yellow-900 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4" />
        <span className="text-sm font-medium">
          Development Mode Active - Full admin access enabled, all restrictions bypassed
        </span>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className="p-1 hover:bg-yellow-600 rounded transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
