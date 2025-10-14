import { useState } from 'react';
import { UserPlus, Mail, MoreVertical, Shield, Trash2, Edit, Clock, XCircle, RefreshCw, AlertCircle } from 'lucide-react';
import { useStore } from '@/store/useStore';
import {
  useTeamMembers,
  usePendingInvitations,
  useInviteUser,
  useUpdateMemberRole,
  useRemoveMember,
  useReactivateMember,
  useResendInvitation,
  useRevokeInvitation,
  usePermissions,
  useRoleBadge,
  useInvitationExpiry,
} from '@/hooks/useTeam';
import { useUsage, useUsageWarnings } from '@/hooks/useUsage';

export function UserManagementEnhanced() {
  const { currentAccount } = useStore();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [inviteMessage, setInviteMessage] = useState('');
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [newRole, setNewRole] = useState<'admin' | 'member'>('member');

  // Hooks
  const { data: members, isLoading: membersLoading } = useTeamMembers();
  const { data: invitations, isLoading: invitationsLoading } = usePendingInvitations();
  const { data: usage } = useUsage();
  const { data: warnings } = useUsageWarnings();
  const permissions = usePermissions();

  // Mutations
  const inviteUser = useInviteUser();
  const updateRole = useUpdateMemberRole();
  const removeMember = useRemoveMember();
  const reactivateMember = useReactivateMember();
  const resendInvitation = useResendInvitation();
  const revokeInvitation = useRevokeInvitation();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount) return;

    try {
      await inviteUser.mutateAsync({
        email: inviteEmail,
        role: inviteRole,
        options: {
          message: inviteMessage || undefined,
          expiresInDays: 7,
        },
      });

      // Reset form
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteRole('member');
      setInviteMessage('');
    } catch (error: any) {
      console.error('Failed to invite user:', error);
      alert(error.message);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedMember) return;

    try {
      await updateRole.mutateAsync({
        userId: selectedMember,
        newRole,
      });

      setShowRoleDialog(false);
      setSelectedMember(null);
    } catch (error: any) {
      console.error('Failed to update role:', error);
      alert(error.message);
    }
  };

  const handleRemoveMember = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from the team?`)) {
      return;
    }

    try {
      await removeMember.mutateAsync({ userId });
    } catch (error: any) {
      console.error('Failed to remove member:', error);
      alert(error.message);
    }
  };

  const handleReactivateMember = async (userId: string) => {
    try {
      await reactivateMember.mutateAsync({ userId });
    } catch (error: any) {
      console.error('Failed to reactivate member:', error);
      alert(error.message);
    }
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      await resendInvitation.mutateAsync(invitationId);
      alert('Invitation resent successfully');
    } catch (error: any) {
      console.error('Failed to resend invitation:', error);
      alert(error.message);
    }
  };

  const handleRevokeInvitation = async (invitationId: string, email: string) => {
    if (!confirm(`Are you sure you want to revoke the invitation for ${email}?`)) {
      return;
    }

    try {
      await revokeInvitation.mutateAsync(invitationId);
    } catch (error: any) {
      console.error('Failed to revoke invitation:', error);
      alert(error.message);
    }
  };

  const getRoleBadgeColor = (role: string) => {
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
  };

  // Check if at user limit
  const atUserLimit = usage?.users.percentage >= 100;
  const nearUserLimit = usage?.users.percentage >= 80;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Team Members</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage who has access to your account
            {usage && !usage.users.unlimited && (
              <span className="ml-2 text-gray-500">
                ({usage.users.current}/{usage.users.limit} members)
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          disabled={atUserLimit || !permissions.canInviteUsers}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            atUserLimit
              ? 'User limit reached. Upgrade your plan to invite more members.'
              : !permissions.canInviteUsers
              ? 'You do not have permission to invite users'
              : 'Invite a new team member'
          }
        >
          <UserPlus className="w-4 h-4" />
          Invite Member
        </button>
      </div>

      {/* Usage Warning */}
      {nearUserLimit && !atUserLimit && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-orange-900">Approaching User Limit</h3>
            <p className="text-sm text-orange-700 mt-1">
              You're using {usage?.users.current} of {usage?.users.limit} available team member slots.
              Consider upgrading your plan to add more members.
            </p>
          </div>
        </div>
      )}

      {atUserLimit && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-red-900">User Limit Reached</h3>
            <p className="text-sm text-red-700 mt-1">
              You've reached your plan's limit of {usage?.users.limit} team members.
              Upgrade your plan to invite more members.
            </p>
          </div>
        </div>
      )}

      {/* Pending Invitations */}
      {invitations && invitations.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Pending Invitations</h3>
          <div className="space-y-2">
            {invitations.map((invitation) => (
              <InvitationCard
                key={invitation.id}
                invitation={invitation}
                onResend={() => handleResendInvitation(invitation.id)}
                onRevoke={() => handleRevokeInvitation(invitation.id, invitation.email)}
                isResending={resendInvitation.isPending}
                isRevoking={revokeInvitation.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Active Members List */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Active Members</h3>
        <div className="space-y-2">
          {membersLoading ? (
            <div className="text-center py-12 text-gray-500">Loading members...</div>
          ) : !members || members.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No members yet</div>
          ) : (
            members
              .filter((m) => m.isActive)
              .map((member) => (
                <MemberCard
                  key={member.userId}
                  member={member}
                  permissions={permissions}
                  onUpdateRole={(userId, role) => {
                    setSelectedMember(userId);
                    setNewRole(role);
                    setShowRoleDialog(true);
                  }}
                  onRemove={(userId, userName) => handleRemoveMember(userId, userName)}
                  isUpdating={updateRole.isPending}
                  isRemoving={removeMember.isPending}
                />
              ))
          )}
        </div>
      </div>

      {/* Inactive Members */}
      {members && members.filter((m) => !m.isActive).length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Inactive Members</h3>
          <div className="space-y-2">
            {members
              .filter((m) => !m.isActive)
              .map((member) => (
                <div
                  key={member.userId}
                  className="bg-gray-50 rounded-lg p-4 flex items-center justify-between opacity-60"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-400 flex items-center justify-center text-white font-semibold">
                      {member.fullName?.[0] || member.email[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{member.fullName || 'Unknown User'}</div>
                      <div className="text-sm text-gray-600">{member.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                      Inactive
                    </span>
                    {permissions.canManageTeam && (
                      <button
                        onClick={() => handleReactivateMember(member.userId)}
                        disabled={reactivateMember.isPending || atUserLimit}
                        className="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={atUserLimit ? 'Cannot reactivate: user limit reached' : 'Reactivate member'}
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Invite Team Member</h3>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="colleague@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'admin' | 'member')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="member">Member - Can view and edit resources</option>
                  <option value="admin">Admin - Full access including team management</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Personal Message (Optional)
                </label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Welcome to the team!"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                    setInviteMessage('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={inviteUser.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={inviteUser.isPending}
                >
                  {inviteUser.isPending ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role Update Dialog */}
      {showRoleDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Update Member Role</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'admin' | 'member')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="member">Member - Can view and edit resources</option>
                  <option value="admin">Admin - Full access including team management</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRoleDialog(false);
                    setSelectedMember(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={updateRole.isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateRole}
                  className="flex-1 btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={updateRole.isPending}
                >
                  {updateRole.isPending ? 'Updating...' : 'Update Role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Member Card Component
function MemberCard({
  member,
  permissions,
  onUpdateRole,
  onRemove,
  isUpdating,
  isRemoving,
}: {
  member: any;
  permissions: any;
  onUpdateRole: (userId: string, role: 'admin' | 'member') => void;
  onRemove: (userId: string, userName: string) => void;
  isUpdating: boolean;
  isRemoving: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);

  const getRoleBadgeColor = (role: string) => {
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
  };

  const canModify = permissions.canManageTeam && member.role !== 'owner';

  return (
    <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between hover:bg-gray-100 transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">
          {member.fullName?.[0] || member.email[0].toUpperCase()}
        </div>
        <div>
          <div className="font-medium text-gray-900">{member.fullName || 'Unknown User'}</div>
          <div className="text-sm text-gray-600">{member.email}</div>
          {member.joinedAt && (
            <div className="text-xs text-gray-500 mt-0.5">
              Joined {new Date(member.joinedAt).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
          {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
        </span>

        {canModify && (
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-gray-600" />
            </button>

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                <button
                  onClick={() => {
                    onUpdateRole(member.userId, member.role === 'admin' ? 'member' : 'admin');
                    setShowMenu(false);
                  }}
                  disabled={isUpdating}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <Edit className="w-4 h-4" />
                  Change Role
                </button>
                <button
                  onClick={() => {
                    onRemove(member.userId, member.fullName || member.email);
                    setShowMenu(false);
                  }}
                  disabled={isRemoving}
                  className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-2 text-sm text-red-600 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove Member
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Invitation Card Component
function InvitationCard({
  invitation,
  onResend,
  onRevoke,
  isResending,
  isRevoking,
}: {
  invitation: any;
  onResend: () => void;
  onRevoke: () => void;
  isResending: boolean;
  isRevoking: boolean;
}) {
  const timeLeft = useInvitationExpiry(invitation);
  const isExpired = timeLeft === 'Expired';

  return (
    <div
      className={`rounded-lg p-4 flex items-center justify-between ${
        isExpired ? 'bg-red-50 border border-red-200' : 'bg-blue-50 border border-blue-200'
      }`}
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold">
          <Mail className="w-5 h-5" />
        </div>
        <div>
          <div className="font-medium text-gray-900">{invitation.email}</div>
          <div className="text-sm text-gray-600">
            {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)} • Invited by{' '}
            {invitation.invitedByName || invitation.invitedByEmail}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
            <Clock className="w-3 h-3" />
            {timeLeft}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!isExpired && (
          <button
            onClick={onResend}
            disabled={isResending}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" />
            Resend
          </button>
        )}
        <button
          onClick={onRevoke}
          disabled={isRevoking}
          className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
        >
          <XCircle className="w-3 h-3" />
          {isExpired ? 'Remove' : 'Revoke'}
        </button>
      </div>
    </div>
  );
}
