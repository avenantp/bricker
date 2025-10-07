import { useEffect, useState } from 'react';
import { isDevMode, hasDevAdminAccess } from '@/config/env';
import { useAuth } from './useAuth';
import { useStore } from '@/store/useStore';

/**
 * Hook to handle dev mode functionality
 * In dev mode, the current user gets full admin access
 */
export function useDevMode() {
  const { user } = useAuth();
  const { setCurrentCompany, userRole } = useStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const setupDevMode = async () => {
      if (!hasDevAdminAccess() || !user) {
        setIsReady(true);
        return;
      }

      // In dev mode with admin access, auto-create or use first company
      // and grant owner role
      const mockCompany = {
        id: 'dev-company-id',
        name: 'Development Company',
        slug: 'dev-company',
        subscription_status: 'active' as const,
        subscription_plan_id: null,
        trial_ends_at: null,
        created_at: new Date(),
      };

      setCurrentCompany(mockCompany, 'owner');
      setIsReady(true);

      console.log('[Dev Mode] Auto-granted owner access to development company');
    };

    setupDevMode();
  }, [user, setCurrentCompany]);

  return {
    isDevMode: isDevMode(),
    hasAdminAccess: hasDevAdminAccess(),
    isReady,
  };
}

/**
 * Check if user has permission to access a feature
 * In dev mode, always returns true
 */
export function usePermission(requiredRole?: 'owner' | 'admin' | 'contributor' | 'viewer') {
  const { userRole } = useStore();

  if (hasDevAdminAccess()) {
    return true;
  }

  if (!requiredRole) {
    return true;
  }

  const roleHierarchy = {
    owner: 4,
    admin: 3,
    contributor: 2,
    viewer: 1,
  };

  const userLevel = roleHierarchy[userRole || 'viewer'];
  const requiredLevel = roleHierarchy[requiredRole];

  return userLevel >= requiredLevel;
}

/**
 * Check if user can access admin panel
 * In dev mode, always returns true
 */
export function useCanAccessAdmin() {
  const { userRole } = useStore();

  if (hasDevAdminAccess()) {
    return true;
  }

  return userRole === 'owner' || userRole === 'admin';
}

/**
 * Check subscription status
 * In dev mode, always returns active
 */
export function useSubscriptionStatus() {
  const { currentCompany } = useStore();

  if (hasDevAdminAccess()) {
    return {
      status: 'active' as const,
      isActive: true,
      isTrial: false,
      isPastDue: false,
      canAccess: true,
    };
  }

  const status = currentCompany?.subscription_status || 'trial';

  return {
    status,
    isActive: status === 'active',
    isTrial: status === 'trial',
    isPastDue: status === 'past_due',
    canAccess: status === 'active' || status === 'trial',
  };
}
