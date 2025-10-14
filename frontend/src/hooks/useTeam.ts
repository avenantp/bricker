import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TeamService, TeamMember, Invitation } from '@/services/team-service';
import { useStore } from '@/store/useStore';

// =====================================================
// Query Keys
// =====================================================

export const teamKeys = {
  all: ['team'] as const,
  byAccount: (accountId: string) => [...teamKeys.all, accountId] as const,
  members: (accountId: string) => [...teamKeys.byAccount(accountId), 'members'] as const,
  activeMembers: (accountId: string) => [...teamKeys.byAccount(accountId), 'members', 'active'] as const,
  invitations: (accountId: string) => [...teamKeys.byAccount(accountId), 'invitations'] as const,
  invitation: (token: string) => [...teamKeys.all, 'invitation', token] as const,
  permissions: (accountId: string) => [...teamKeys.byAccount(accountId), 'permissions'] as const,
};

// =====================================================
// Team Member Hooks
// =====================================================

/**
 * Get all team members for an account
 */
export function useTeamMembers(accountId?: string) {
  const { currentAccount } = useStore();
  const id = accountId || currentAccount?.id;

  return useQuery({
    queryKey: teamKeys.members(id || ''),
    queryFn: () => {
      if (!id) throw new Error('No account ID provided');
      return TeamService.getMembers(id);
    },
    enabled: !!id,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Get active team members only
 */
export function useActiveTeamMembers(accountId?: string) {
  const { currentAccount } = useStore();
  const id = accountId || currentAccount?.id;

  return useQuery({
    queryKey: teamKeys.activeMembers(id || ''),
    queryFn: () => {
      if (!id) throw new Error('No account ID provided');
      return TeamService.getActiveMembers(id);
    },
    enabled: !!id,
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Invite a user to the team
 */
export function useInviteUser() {
  const queryClient = useQueryClient();
  const { currentAccount } = useStore();

  return useMutation({
    mutationFn: ({
      accountId,
      email,
      role,
      options,
    }: {
      accountId?: string;
      email: string;
      role: 'admin' | 'member';
      options?: { message?: string; expiresInDays?: number };
    }) => {
      const id = accountId || currentAccount?.id;
      if (!id) throw new Error('No account ID provided');
      return TeamService.inviteUser(id, email, role, options);
    },
    onSuccess: (_, variables) => {
      const accountId = variables.accountId || currentAccount?.id;
      if (accountId) {
        // Invalidate invitations to show the new one
        queryClient.invalidateQueries({ queryKey: teamKeys.invitations(accountId) });
      }
    },
  });
}

/**
 * Update a member's role
 */
export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  const { currentAccount } = useStore();

  return useMutation({
    mutationFn: ({
      accountId,
      userId,
      newRole,
    }: {
      accountId?: string;
      userId: string;
      newRole: 'admin' | 'member';
    }) => {
      const id = accountId || currentAccount?.id;
      if (!id) throw new Error('No account ID provided');
      return TeamService.updateMemberRole(id, userId, newRole);
    },
    onSuccess: (_, variables) => {
      const accountId = variables.accountId || currentAccount?.id;
      if (accountId) {
        // Invalidate members to refetch with updated role
        queryClient.invalidateQueries({ queryKey: teamKeys.members(accountId) });
        queryClient.invalidateQueries({ queryKey: teamKeys.activeMembers(accountId) });
      }
    },
  });
}

/**
 * Remove a member from the team
 */
export function useRemoveMember() {
  const queryClient = useQueryClient();
  const { currentAccount } = useStore();

  return useMutation({
    mutationFn: ({
      accountId,
      userId,
    }: {
      accountId?: string;
      userId: string;
    }) => {
      const id = accountId || currentAccount?.id;
      if (!id) throw new Error('No account ID provided');
      return TeamService.removeMember(id, userId);
    },
    onSuccess: (_, variables) => {
      const accountId = variables.accountId || currentAccount?.id;
      if (accountId) {
        // Invalidate members to refetch without removed member
        queryClient.invalidateQueries({ queryKey: teamKeys.members(accountId) });
        queryClient.invalidateQueries({ queryKey: teamKeys.activeMembers(accountId) });
      }
    },
  });
}

/**
 * Reactivate a deactivated member
 */
export function useReactivateMember() {
  const queryClient = useQueryClient();
  const { currentAccount } = useStore();

  return useMutation({
    mutationFn: ({
      accountId,
      userId,
    }: {
      accountId?: string;
      userId: string;
    }) => {
      const id = accountId || currentAccount?.id;
      if (!id) throw new Error('No account ID provided');
      return TeamService.reactivateMember(id, userId);
    },
    onSuccess: (_, variables) => {
      const accountId = variables.accountId || currentAccount?.id;
      if (accountId) {
        queryClient.invalidateQueries({ queryKey: teamKeys.members(accountId) });
        queryClient.invalidateQueries({ queryKey: teamKeys.activeMembers(accountId) });
      }
    },
  });
}

// =====================================================
// Invitation Hooks
// =====================================================

/**
 * Get pending invitations for an account
 */
export function usePendingInvitations(accountId?: string) {
  const { currentAccount } = useStore();
  const id = accountId || currentAccount?.id;

  return useQuery({
    queryKey: teamKeys.invitations(id || ''),
    queryFn: () => {
      if (!id) throw new Error('No account ID provided');
      return TeamService.getPendingInvitations(id);
    },
    enabled: !!id,
    staleTime: 30000, // 30 seconds
    refetchInterval: 60000, // Refetch every minute to update expiry status
  });
}

/**
 * Get invitation details by token
 */
export function useInvitation(token?: string) {
  return useQuery({
    queryKey: teamKeys.invitation(token || ''),
    queryFn: () => {
      if (!token) throw new Error('No token provided');
      return TeamService.getInvitationByToken(token);
    },
    enabled: !!token,
    staleTime: 0, // Always fetch fresh data
    retry: false, // Don't retry if token is invalid
  });
}

/**
 * Resend an invitation email
 */
export function useResendInvitation() {
  const queryClient = useQueryClient();
  const { currentAccount } = useStore();

  return useMutation({
    mutationFn: (invitationId: string) => TeamService.resendInvitation(invitationId),
    onSuccess: () => {
      if (currentAccount?.id) {
        // No need to invalidate, just show success message
      }
    },
  });
}

/**
 * Revoke an invitation
 */
export function useRevokeInvitation() {
  const queryClient = useQueryClient();
  const { currentAccount } = useStore();

  return useMutation({
    mutationFn: (invitationId: string) => TeamService.revokeInvitation(invitationId),
    onSuccess: () => {
      if (currentAccount?.id) {
        // Invalidate invitations to remove the revoked one
        queryClient.invalidateQueries({ queryKey: teamKeys.invitations(currentAccount.id) });
      }
    },
  });
}

/**
 * Accept an invitation
 */
export function useAcceptInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (token: string) => TeamService.acceptInvitation(token),
    onSuccess: (data) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: teamKeys.members(data.account.id) });
      queryClient.invalidateQueries({ queryKey: teamKeys.activeMembers(data.account.id) });
      queryClient.invalidateQueries({ queryKey: ['accounts'] }); // Refetch account list
    },
  });
}

// =====================================================
// Permission Hooks
// =====================================================

/**
 * Check if current user has a specific permission
 */
export function useHasPermission(
  action: 'manage_account' | 'manage_billing' | 'manage_team' | 'invite_users' | 'remove_users',
  accountId?: string
) {
  const { currentAccount } = useStore();
  const id = accountId || currentAccount?.id;

  return useQuery({
    queryKey: [...teamKeys.permissions(id || ''), action],
    queryFn: () => {
      if (!id) throw new Error('No account ID provided');
      return TeamService.hasPermission(id, action);
    },
    enabled: !!id,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get all permissions for current user
 */
export function usePermissions(accountId?: string) {
  const { currentAccount } = useStore();
  const id = accountId || currentAccount?.id;

  const canManageAccount = useHasPermission('manage_account', id);
  const canManageBilling = useHasPermission('manage_billing', id);
  const canManageTeam = useHasPermission('manage_team', id);
  const canInviteUsers = useHasPermission('invite_users', id);
  const canRemoveUsers = useHasPermission('remove_users', id);

  return {
    canManageAccount: canManageAccount.data || false,
    canManageBilling: canManageBilling.data || false,
    canManageTeam: canManageTeam.data || false,
    canInviteUsers: canInviteUsers.data || false,
    canRemoveUsers: canRemoveUsers.data || false,
    isLoading:
      canManageAccount.isLoading ||
      canManageBilling.isLoading ||
      canManageTeam.isLoading ||
      canInviteUsers.isLoading ||
      canRemoveUsers.isLoading,
  };
}

// =====================================================
// Utility Hooks
// =====================================================

/**
 * Get current user's role in the account
 */
export function useCurrentUserRole(accountId?: string) {
  const { data: members } = useTeamMembers(accountId);
  const { currentAccount } = useStore();

  // Get current user ID from Supabase auth
  const [userId, setUserId] = React.useState<string | null>(null);

  React.useEffect(() => {
    import('@/lib/supabase').then(({ supabase }) => {
      supabase.auth.getUser().then(({ data }) => {
        setUserId(data.user?.id || null);
      });
    });
  }, []);

  const currentMember = members?.find((m) => m.userId === userId);
  return currentMember?.role || null;
}

/**
 * Get member count
 */
export function useMemberCount(accountId?: string, activeOnly: boolean = true) {
  const { data: members } = activeOnly
    ? useActiveTeamMembers(accountId)
    : useTeamMembers(accountId);

  return members?.length || 0;
}

/**
 * Check if user is account owner
 */
export function useIsOwner(accountId?: string) {
  const role = useCurrentUserRole(accountId);
  return role === 'owner';
}

/**
 * Check if user is admin or owner
 */
export function useIsAdmin(accountId?: string) {
  const role = useCurrentUserRole(accountId);
  return role === 'owner' || role === 'admin';
}

/**
 * Get invitation expiry countdown
 */
export function useInvitationExpiry(invitation?: Invitation) {
  const [timeLeft, setTimeLeft] = React.useState<string>('');

  React.useEffect(() => {
    if (!invitation) return;

    const updateTimeLeft = () => {
      const now = new Date();
      const expiry = new Date(invitation.expiresAt);
      const diff = expiry.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Expired');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (days > 0) {
        setTimeLeft(`${days} day${days > 1 ? 's' : ''} left`);
      } else if (hours > 0) {
        setTimeLeft(`${hours} hour${hours > 1 ? 's' : ''} left`);
      } else {
        setTimeLeft(`${minutes} minute${minutes > 1 ? 's' : ''} left`);
      }
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [invitation]);

  return timeLeft;
}

/**
 * Get formatted role badge info
 */
export function useRoleBadge(role: string) {
  return {
    color: TeamService.getRoleBadgeColor(role),
    text: TeamService.getRoleDisplayText(role),
  };
}

// Add React import at the top
import React from 'react';
