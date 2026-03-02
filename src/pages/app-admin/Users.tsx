import { useEffect, useState } from 'react';
import { Users as UsersIcon, ShieldCheck, ShieldOff, Search } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { getInitials } from '@/lib/utils';
import { useAmplifyData } from '@/hooks/useAmplifyData';

interface UserRow {
  id: string;
  name: string;
  email: string;
  groups: string[];
}

export function AppAdminUsers() {
  const client = useAmplifyData();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [promoting, setPromoting] = useState<string | null>(null);

  async function load() {
    const res = await client.queries.listCognitoUsers();
    const data = (res.data ?? []) as UserRow[];
    setUsers(data);
    setLoading(false);
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
    } finally {
      setPromoting(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-white/40 text-sm mt-1">Manage user roles and permissions</p>
        </div>
      </div>

      <GlassCard className="p-4 flex items-center gap-3">
        <Search size={16} className="text-white/40" />
        <input
          className="bg-transparent flex-1 text-sm text-white placeholder-white/30 outline-none"
          placeholder="Search users by name or email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </GlassCard>

      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <GlassCard key={i} className="p-5 h-20 skeleton" />)}
        </div>
      ) : filtered.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <UsersIcon size={40} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No users found.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {filtered.map(user => {
            const isProjAdmin = user.groups.includes('PROJECT_ADMINS');
            const isAppAdmin = user.groups.includes('APP_ADMINS');
            return (
              <GlassCard key={user.id} className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white">
                    {getInitials(user.name)}
                  </div>
                  <div>
                    <p className="font-medium text-white">{user.name}</p>
                    <p className="text-white/50 text-sm">{user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {user.groups.map(g => (
                      <span key={g} className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/20">
                        {g}
                      </span>
                    ))}
                  </div>
                  {!isAppAdmin && (
                    <button
                      onClick={() => promoteUser(user.id, isProjAdmin ? 'TRANSCRIBERS' : 'PROJECT_ADMINS')}
                      disabled={promoting === user.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/30 disabled:opacity-50"
                    >
                      {isProjAdmin ? <ShieldOff size={13} /> : <ShieldCheck size={13} />}
                      {promoting === user.id ? '…' : isProjAdmin ? 'Demote' : 'Promote to Project Admin'}
                    </button>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
