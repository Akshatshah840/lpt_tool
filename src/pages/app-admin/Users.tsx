import { useEffect, useState } from 'react';
import { Users as UsersIcon, ShieldCheck, ShieldOff, Search, AlertCircle, Loader2, Lock, Shield, Briefcase, Mic } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { getInitials } from '@/lib/utils';
import { useAmplifyData } from '@/hooks/useAmplifyData';

const GROUP_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  APP_ADMINS:     { label: 'App Admin',     color: 'badge-error',    icon: <Shield size={10} /> },
  PROJECT_ADMINS: { label: 'Project Admin', color: 'badge-primary',  icon: <Briefcase size={10} /> },
  TRANSCRIBERS:   { label: 'Transcriber',   color: 'badge-success',  icon: <Mic size={10} /> },
};

interface UserRow {
  id: string;
  name: string;
  email: string;
  groups: string[];
}

interface Props {
  canManageRoles?: boolean;
}

export function AppAdminUsers({ canManageRoles = true }: Props) {
  const client = useAmplifyData();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [promoting, setPromoting] = useState<string | null>(null);

  async function load() {
    setError(null);
    setLoading(true);
    try {
      const res = await client.queries.listCognitoUsers();
      // a.json().array() returns each element as a JSON string — parse before use
      const raw = (res.data ?? []) as unknown[];
      const data = raw.map(item =>
        typeof item === 'string' ? JSON.parse(item) : item
      ) as UserRow[];
      setUsers(data);
    } catch (e) {
      console.error('Failed to load users:', e);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const filtered = users.filter(u =>
    `${u.name} ${u.email}`.toLowerCase().includes(search.toLowerCase())
  );

  async function promoteUser(userId: string, toGroup: string) {
    setPromoting(userId);
    try {
      await client.mutations.updateCognitoUserGroup({ userId, targetGroup: toGroup });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, groups: [toGroup] } : u));
    } catch (e) {
      console.error('Failed to update user group:', e);
    } finally {
      setPromoting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Users</h1>
          <p className="text-base-content/40 text-sm mt-1">
            {canManageRoles ? 'Manage user roles and permissions' : 'View all registered users'}
          </p>
        </div>
        {!canManageRoles && (
          <div className="flex items-center gap-1.5 text-xs text-base-content/40 border border-base-content/10 rounded-lg px-3 py-1.5">
            <Lock size={12} />
            Read only
          </div>
        )}
        {!loading && users.length > 0 && (
          <span className="badge badge-ghost">{users.length} users</span>
        )}
      </div>

      <GlassCard className="p-4 flex items-center gap-3">
        <Search size={16} className="text-base-content/40 flex-shrink-0" />
        <input
          className="bg-transparent flex-1 text-sm text-base-content placeholder-base-content/30 outline-none"
          placeholder="Search users by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </GlassCard>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-[72px] skeleton rounded-xl" />)}
        </div>
      ) : error ? (
        <GlassCard className="p-6 flex items-center gap-3 text-error">
          <AlertCircle size={20} />
          <span className="flex-1">{error}</span>
          <button onClick={load} className="btn btn-sm btn-ghost">Retry</button>
        </GlassCard>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<UsersIcon size={24} />}
          heading={search ? 'No users match your search' : 'No users yet'}
          description={search ? 'Try a different name or email.' : 'Users will appear here once they sign up.'}
        />
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="divide-y divide-base-content/[0.06]">
            {filtered.map(user => {
              const isProjAdmin = user.groups.includes('PROJECT_ADMINS');
              const isAppAdmin  = user.groups.includes('APP_ADMINS');
              const groupInfo   = user.groups[0] ? (GROUP_LABELS[user.groups[0]] ?? { label: user.groups[0], color: 'badge-ghost', icon: null }) : null;
              return (
                <div key={user.id} className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-base-content/[0.02] transition-colors">
                  {/* Left: avatar + name/email */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="avatar placeholder flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                        <span>{getInitials(user.name || user.email)}</span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-base-content truncate">{user.name || user.email}</p>
                        {groupInfo && (
                          <span className={`badge badge-sm ${groupInfo.color} gap-1`}>
                            {groupInfo.icon}
                            {groupInfo.label}
                          </span>
                        )}
                      </div>
                      {user.name && (
                        <p className="text-base-content/40 text-sm truncate">{user.email}</p>
                      )}
                    </div>
                  </div>

                  {/* Right: actions */}
                  <div className="flex-shrink-0">
                    {canManageRoles && !isAppAdmin ? (
                      <button
                        onClick={() => promoteUser(user.id, isProjAdmin ? 'TRANSCRIBERS' : 'PROJECT_ADMINS')}
                        disabled={promoting === user.id}
                        className={`btn btn-xs gap-1.5 disabled:opacity-50 ${isProjAdmin ? 'btn-ghost border border-base-content/10 hover:btn-error' : 'btn-primary'}`}
                      >
                        {promoting === user.id
                          ? <Loader2 size={13} className="animate-spin" />
                          : isProjAdmin ? <ShieldOff size={13} /> : <ShieldCheck size={13} />
                        }
                        {promoting === user.id ? '…' : isProjAdmin ? 'Demote' : 'Promote'}
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
