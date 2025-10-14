import { useState, useEffect } from 'react';
import { UserPlus, Mail, MoreVertical, Shield, Trash2, Edit } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/store/useStore';

interface AccountMember {
  user_id: string;
  role: 'owner' | 'admin' | 'contributor' | 'viewer';
  joined_at: string;
  users: {
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function UserManagement() {
  const { currentAccount } = useStore();
  const [members, setMembers] = useState<AccountMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'contributor' | 'viewer'>('contributor');

  useEffect(() => {
    if (currentAccount) {
      loadMembers();
    }
  }, [currentAccount]);

  const loadMembers = async () => {
    if (!currentAccount) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('account_users')
        .select(`
          user_id,
          role,
          joined_at,
          users:user_id (
            email,
            full_name,
            avatar_url
          )
        `)
        .eq('account_id', currentAccount.id)
        .order('joined_at', { ascending: true });

      if (error) throw error;
      setMembers(data as any || []);
    } catch (error) {
      console.error('Failed to load members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount) return;

    try {
      // Create invitation
      const token = crypto.randomUUID();
      const { error } = await supabase
        .from('invitations')
        .insert({
          account_id: currentAccount.id,
          email: inviteEmail,
          role: inviteRole,
          invited_by: (await supabase.auth.getUser()).data.user?.id,
          token,
        });

      if (error) throw error;

      // TODO: Send email invitation
      alert(`Invitation sent to ${inviteEmail}`);
      setShowInviteModal(false);
      setInviteEmail('');
    } catch (error: any) {
      console.error('Failed to invite user:', error);
      alert(error.message);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'contributor':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Team Members</h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage who has access to your account
          </p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Invite Member
        </button>
      </div>

      {/* Members List */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : members.length === 0 ? (
          <div className="text-center py-12 text-gray-500">No members yet</div>
        ) : (
          members.map((member) => (
            <div
              key={member.user_id}
              className="bg-gray-50 rounded-lg p-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-semibold">
                  {member.users?.full_name?.[0] || member.users?.email[0].toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-gray-900">
                    {member.users?.full_name || 'Unknown User'}
                  </div>
                  <div className="text-sm text-gray-600">{member.users?.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(
                    member.role
                  )}`}
                >
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </span>

                {member.role !== 'owner' && (
                  <button className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                    <MoreVertical className="w-4 h-4 text-gray-600" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Invite Team Member</h3>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="viewer">Viewer - Can view only</option>
                  <option value="contributor">Contributor - Can edit and create</option>
                  <option value="admin">Admin - Full access except billing</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
