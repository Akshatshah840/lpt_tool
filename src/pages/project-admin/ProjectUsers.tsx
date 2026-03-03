import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Users, CheckCircle2, Loader2, Eye } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAmplifyData } from '@/hooks/useAmplifyData';
import { formatDate, werToAccuracy } from '@/lib/utils';

interface UserRow {
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  resultId: string;
  status: string;
  overallWer?: number | null;
  passed?: boolean | null;
  completedAt?: string | null;
}

export function ProjectAdminProjectUsers() {
  const { projectId } = useParams<{ projectId: string }>();
  const client = useAmplifyData();
  const [projectName, setProjectName] = useState('');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!projectId) return;
      try {
        const [projRes, testsRes, resultsRes] = await Promise.all([
          client.models.Project.get({ id: projectId }),
          client.models.Test.list(),
          client.models.TestResult.list(),
        ]);

        setProjectName(projRes.data?.name ?? '');

        const test = (testsRes.data ?? []).find(
          (t: { projectId: string }) => t.projectId === projectId
        );

        const testResults = test
          ? (resultsRes.data ?? []).filter(
              (r: { testId: string }) => r.testId === test.id
            )
          : [];

        const rows: UserRow[] = testResults.map((r: {
          id: string; userId: string; userName?: string | null;
          userEmail?: string | null; status: string;
          overallWer?: number | null; passed?: boolean | null;
          completedAt?: string | null;
        }) => ({
          userId: r.userId,
          userName: r.userName,
          userEmail: r.userEmail,
          resultId: r.id,
          status: r.status,
          overallWer: r.overallWer,
          passed: r.passed,
          completedAt: r.completedAt,
        }));

        setUsers(rows);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [projectId]);

  const completed   = users.filter(u => u.status === 'COMPLETED');
  const inProgress  = users.filter(u => u.status === 'IN_PROGRESS');
  const passed      = completed.filter(u => u.passed === true);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/project/projects" className="btn btn-ghost btn-sm btn-square">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-base-content">Project Users</h1>
          <p className="text-base-content/40 text-sm mt-0.5">{projectName}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users',  value: users.length,       color: '#6366f1' },
          { label: 'In Progress',  value: inProgress.length,  color: '#eab308' },
          { label: 'Completed',    value: completed.length,   color: '#22c55e' },
          { label: 'Pass Rate',    value: completed.length ? `${Math.round(passed.length / completed.length * 100)}%` : '—', color: '#f97316' },
        ].map(s => (
          <GlassCard key={s.label} glow className="p-5">
            <p className="text-xs text-base-content/50">{s.label}</p>
            <p className="text-2xl font-bold mt-0.5" style={{ color: s.color }}>
              {loading ? '—' : s.value}
            </p>
          </GlassCard>
        ))}
      </div>

      {/* User list */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : users.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <Users size={40} className="text-base-content/20 mx-auto mb-3" />
          <p className="text-base-content/40 font-medium">No users have started this project yet</p>
          <p className="text-base-content/25 text-sm mt-1">
            Once transcribers begin the test, they will appear here.
          </p>
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  {['User', 'Status', 'Accuracy', 'Result', 'Completed', ''].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.userId}>
                    <td>
                      <p className="text-sm font-medium text-base-content">{u.userName ?? '—'}</p>
                      <p className="text-xs text-base-content/40">{u.userEmail ?? ''}</p>
                    </td>
                    <td>
                      <StatusBadge status={u.status as 'IN_PROGRESS' | 'COMPLETED'} />
                    </td>
                    <td className="text-sm text-base-content/60">
                      {u.status === 'COMPLETED' ? werToAccuracy(u.overallWer) : '—'}
                    </td>
                    <td>
                      {u.status === 'COMPLETED' ? (
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2
                            size={14}
                            className={u.passed ? 'text-success' : 'text-error'}
                          />
                          <StatusBadge status={u.passed} />
                        </div>
                      ) : (
                        <span className="text-base-content/20 text-xs">—</span>
                      )}
                    </td>
                    <td className="text-xs text-base-content/40">
                      {u.status === 'COMPLETED' ? formatDate(u.completedAt) : '—'}
                    </td>
                    <td className="text-right">
                      {u.status === 'COMPLETED' && (
                        <Link
                          to={`/project/results/${u.resultId}`}
                          className="btn btn-primary btn-xs gap-1"
                        >
                          <Eye size={12} /> View
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
