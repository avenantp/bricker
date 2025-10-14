/**
 * useAccount Hook
 * Fetches the authenticated user's account information
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

interface Account {
  id: string;
  name: string;
  account_type: string;
  subscription_tier: string;
  subscription_status: string;
  max_projects: number;
  current_project_count: number;
}

interface AccountUser {
  account_id: string;
  role: string;
  accounts: Account;
}

/**
 * Fetches the authenticated user's primary account
 */
export function useAccount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['account', user?.id],
    queryFn: async () => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Fetch the user's account from account_users table
      const { data, error } = await supabase
        .from('account_users')
        .select(`
          account_id,
          role,
          accounts:account_id (
            id,
            name,
            account_type,
            subscription_tier,
            subscription_status,
            max_projects,
            current_project_count
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('joined_at', { ascending: true })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching account:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No account found for user');
      }

      const accountUser = data as unknown as AccountUser;

      return {
        id: accountUser.account_id,
        role: accountUser.role,
        ...accountUser.accounts
      };
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });
}
