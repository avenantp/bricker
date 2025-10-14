import { supabase } from '@/lib/supabase';

// =====================================================
// Types
// =====================================================

export interface TeamMember {
  userId: string;
  accountId: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: Date;
  invitedBy?: string;
  invitationAcceptedAt?: Date;
  isActive: boolean;
  deactivatedAt?: Date;
  deactivatedBy?: string;
  user?: {
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
}

export interface Invitation {
  id: string;
  accountId: string;
  email: string;
  role: 'admin' | 'member';
  token: string;
  invitedBy?: string;
  invitedByName?: string;
  invitedByEmail?: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  acceptedAt?: Date;
  acceptedBy?: string;
  expiresAt: Date;
  message?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface InvitationWithAccount extends Invitation {
  account: {
    name: string;
    slug?: string;
  };
}

// =====================================================
// Team Service
// =====================================================

export class TeamService {
  /**
   * Get all team members for an account
   */
  static async getMembers(accountId: string): Promise<TeamMember[]> {
    try {
      const { data, error } = await supabase
        .from('account_users')
        .select(`
          user_id,
          account_id,
          role,
          joined_at,
          invited_by,
          invitation_accepted_at,
          is_active,
          deactivated_at,
          deactivated_by,
          users:user_id (
            email,
            full_name,
            avatar_url
          )
        `)
        .eq('account_id', accountId)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      return (data || []).map(this.mapMemberFromDb);
    } catch (error) {
      console.error('Failed to get team members:', error);
      throw error;
    }
  }

  /**
   * Get active team members only
   */
  static async getActiveMembers(accountId: string): Promise<TeamMember[]> {
    const members = await this.getMembers(accountId);
    return members.filter((m) => m.isActive);
  }

  /**
   * Invite a user to join the account
   */
  static async inviteUser(
    accountId: string,
    email: string,
    role: 'admin' | 'member',
    options?: {
      message?: string;
      expiresInDays?: number;
    }
  ): Promise<Invitation> {
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get current user details
      const { data: userData } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      // Check if email is already a member
      const { data: existingMember } = await supabase
        .from('account_users')
        .select('user_id')
        .eq('account_id', accountId)
        .eq('users.email', email)
        .maybeSingle();

      if (existingMember) {
        throw new Error('User is already a member of this account');
      }

      // Check if there's already a pending invitation
      const { data: existingInvitation } = await supabase
        .from('invitations')
        .select('id, status')
        .eq('account_id', accountId)
        .eq('email', email)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingInvitation) {
        throw new Error('There is already a pending invitation for this email');
      }

      // Calculate expiry date (default 7 days)
      const expiresInDays = options?.expiresInDays || 7;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      // Create invitation
      const { data: invitation, error } = await supabase
        .from('invitations')
        .insert({
          account_id: accountId,
          email,
          role,
          invited_by: user.id,
          invited_by_name: userData?.full_name || null,
          invited_by_email: userData?.email || user.email,
          expires_at: expiresAt.toISOString(),
          message: options?.message,
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      // TODO: Send invitation email via email service
      console.log('TODO: Send invitation email to', email);

      return this.mapInvitationFromDb(invitation);
    } catch (error) {
      console.error('Failed to invite user:', error);
      throw error;
    }
  }

  /**
   * Get pending invitations for an account
   */
  static async getPendingInvitations(accountId: string): Promise<Invitation[]> {
    try {
      // Call database function to get pending invitations (auto-expires old ones)
      const { data, error } = await supabase.rpc('get_pending_invitations', {
        p_account_id: accountId,
      });

      if (error) throw error;

      return (data || []).map(this.mapInvitationFromDb);
    } catch (error) {
      console.error('Failed to get pending invitations:', error);
      throw error;
    }
  }

  /**
   * Resend an invitation email
   */
  static async resendInvitation(invitationId: string): Promise<void> {
    try {
      // Get invitation details
      const { data: invitation, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (error) throw error;

      if (invitation.status !== 'pending') {
        throw new Error('Can only resend pending invitations');
      }

      if (new Date(invitation.expires_at) < new Date()) {
        throw new Error('Invitation has expired');
      }

      // TODO: Send invitation email via email service
      console.log('TODO: Resend invitation email to', invitation.email);
    } catch (error) {
      console.error('Failed to resend invitation:', error);
      throw error;
    }
  }

  /**
   * Revoke an invitation
   */
  static async revokeInvitation(invitationId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('invitations')
        .update({ status: 'revoked' })
        .eq('id', invitationId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to revoke invitation:', error);
      throw error;
    }
  }

  /**
   * Accept an invitation (by token)
   */
  static async acceptInvitation(token: string): Promise<{
    account: any;
    member: TeamMember;
  }> {
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get invitation by token
      const { data: invitation, error: invError } = await supabase
        .from('invitations')
        .select('*, accounts(*)')
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (invError || !invitation) {
        throw new Error('Invalid or expired invitation');
      }

      if (new Date(invitation.expires_at) < new Date()) {
        throw new Error('Invitation has expired');
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('account_users')
        .select('user_id')
        .eq('account_id', invitation.account_id)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingMember) {
        throw new Error('You are already a member of this account');
      }

      // Add user to account
      const { data: newMember, error: memberError } = await supabase
        .from('account_users')
        .insert({
          account_id: invitation.account_id,
          user_id: user.id,
          role: invitation.role,
          invited_by: invitation.invited_by,
          invitation_accepted_at: new Date().toISOString(),
          is_active: true,
        })
        .select()
        .single();

      if (memberError) throw memberError;

      // Update invitation status
      const { error: updateError } = await supabase
        .from('invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString(),
          accepted_by: user.id,
        })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      return {
        account: invitation.accounts,
        member: this.mapMemberFromDb(newMember),
      };
    } catch (error) {
      console.error('Failed to accept invitation:', error);
      throw error;
    }
  }

  /**
   * Get invitation details by token (for invitation acceptance page)
   */
  static async getInvitationByToken(token: string): Promise<InvitationWithAccount | null> {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          *,
          accounts (
            name,
            slug
          )
        `)
        .eq('token', token)
        .eq('status', 'pending')
        .single();

      if (error || !data) return null;

      if (new Date(data.expires_at) < new Date()) {
        return null;
      }

      return {
        ...this.mapInvitationFromDb(data),
        account: {
          name: data.accounts?.name || 'Unknown',
          slug: data.accounts?.slug,
        },
      };
    } catch (error) {
      console.error('Failed to get invitation by token:', error);
      return null;
    }
  }

  /**
   * Update member role
   */
  static async updateMemberRole(
    accountId: string,
    userId: string,
    newRole: 'admin' | 'member'
  ): Promise<void> {
    try {
      // Cannot change owner role
      const { data: member } = await supabase
        .from('account_users')
        .select('role')
        .eq('account_id', accountId)
        .eq('user_id', userId)
        .single();

      if (member?.role === 'owner') {
        throw new Error('Cannot change owner role');
      }

      const { error } = await supabase
        .from('account_users')
        .update({ role: newRole })
        .eq('account_id', accountId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to update member role:', error);
      throw error;
    }
  }

  /**
   * Remove a member from the account (deactivate)
   */
  static async removeMember(accountId: string, userId: string): Promise<void> {
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Cannot remove owner
      const { data: member } = await supabase
        .from('account_users')
        .select('role')
        .eq('account_id', accountId)
        .eq('user_id', userId)
        .single();

      if (member?.role === 'owner') {
        throw new Error('Cannot remove account owner');
      }

      // Cannot remove self
      if (userId === user.id) {
        throw new Error('Cannot remove yourself. Transfer ownership first.');
      }

      // Deactivate member
      const { error } = await supabase
        .from('account_users')
        .update({
          is_active: false,
          deactivated_at: new Date().toISOString(),
          deactivated_by: user.id,
        })
        .eq('account_id', accountId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to remove member:', error);
      throw error;
    }
  }

  /**
   * Reactivate a deactivated member
   */
  static async reactivateMember(accountId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('account_users')
        .update({
          is_active: true,
          deactivated_at: null,
          deactivated_by: null,
        })
        .eq('account_id', accountId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to reactivate member:', error);
      throw error;
    }
  }

  /**
   * Check if current user has permission for an action
   */
  static async hasPermission(
    accountId: string,
    action: 'manage_account' | 'manage_billing' | 'manage_team' | 'invite_users' | 'remove_users'
  ): Promise<boolean> {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return false;

      const { data: member } = await supabase
        .from('account_users')
        .select('role')
        .eq('account_id', accountId)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!member) return false;

      const role = member.role;

      switch (action) {
        case 'manage_account':
        case 'manage_billing':
          return role === 'owner';
        case 'manage_team':
        case 'invite_users':
        case 'remove_users':
          return role === 'owner' || role === 'admin';
        default:
          return false;
      }
    } catch (error) {
      console.error('Failed to check permission:', error);
      return false;
    }
  }

  /**
   * Get role badge color for UI
   */
  static getRoleBadgeColor(role: string): string {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'member':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  /**
   * Get role display text
   */
  static getRoleDisplayText(role: string): string {
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  // =====================================================
  // Private Mapping Methods
  // =====================================================

  private static mapMemberFromDb(data: any): TeamMember {
    return {
      userId: data.user_id,
      accountId: data.account_id,
      role: data.role,
      joinedAt: new Date(data.joined_at),
      invitedBy: data.invited_by,
      invitationAcceptedAt: data.invitation_accepted_at
        ? new Date(data.invitation_accepted_at)
        : undefined,
      isActive: data.is_active,
      deactivatedAt: data.deactivated_at ? new Date(data.deactivated_at) : undefined,
      deactivatedBy: data.deactivated_by,
      user: data.users
        ? {
            email: data.users.email,
            fullName: data.users.full_name,
            avatarUrl: data.users.avatar_url,
          }
        : undefined,
    };
  }

  private static mapInvitationFromDb(data: any): Invitation {
    return {
      id: data.id,
      accountId: data.account_id,
      email: data.email,
      role: data.role,
      token: data.token,
      invitedBy: data.invited_by,
      invitedByName: data.invited_by_name,
      invitedByEmail: data.invited_by_email,
      status: data.status,
      acceptedAt: data.accepted_at ? new Date(data.accepted_at) : undefined,
      acceptedBy: data.accepted_by,
      expiresAt: new Date(data.expires_at),
      message: data.message,
      metadata: data.metadata,
      createdAt: new Date(data.created_at),
    };
  }
}
