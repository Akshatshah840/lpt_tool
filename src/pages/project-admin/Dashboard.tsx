import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, CheckCircle, Clock, TrendingUp, FolderOpen, FolderX } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { GlassCard } from '@/components/shared/GlassCard';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAmplifyData } from '@/hooks/useAmplifyData';
import { formatDate, werToAccuracy } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: string;
}

export function ProjectAdminDashboard() {
  const client = useAmplifyData();
  const [stats, setStats] = useState({ tests: 0, open: 0, results: 0, passRate: 0 });
  const [recentResults, setRecentResults] = useState<Array<{
    id: string; userName?: string | null; testName: string; passed?: boolean | null; completedAt?: string | null; overallWer?: number | null;
  }>>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [chartData, setChartData] = useState<{ name: string; pass: number; fail: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [testsRes, resultsRes, projectsRes] = await Promise.all([
          client.models.Test.list(),
          client.models.TestResult.list({ limit: 20 }),
          client.models.Project.list(),
        ]);
        const tests = testsRes.data ?? [];
        const results = resultsRes.data ?? [];
        const completed = results.filter((r: { status: string }) => r.status === 'COMPLETED');
        const passed = completed.filter((r: { passed?: boolean | null }) => r.passed === true);
        setStats({
          tests: tests.length,
          open: tests.filter((t: { status: string }) => t.status === 'OPEN').length,
          results: completed.length,
          passRate: completed.length ? Math.round((passed.length / completed.length) * 100) : 0,
        });
        setRecentResults(
          completed.slice(0, 8).map((r: { id: string; userName?: string | null; testId: string; passed?: boolean | null; completedAt?: string | null; overallWer?: number | null }) => ({
            ...r,
            testName: tests.find((t: { id: string; name: string }) => t.id === r.testId)?.name ?? r.testId,
          }))
        );
        const testMap: Record<string, { name: string; pass: number; fail: number }> = {};
        for (const r of completed) {
          const rid = (r as { testId: string }).testId;
          if (!testMap[rid]) {
            const test = tests.find((t: { id: string; name: string }) => t.id === rid);
            testMap[rid] = { name: test?.name?.slice(0, 15) ?? rid.slice(0, 8), pass: 0, fail: 0 };
          }
          if (r.passed) testMap[rid].pass++; else testMap[rid].fail++;
        }
        setChartData(Object.values(testMap).slice(0, 8));
        setProjects((projectsRes.data ?? []) as Project[]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-base-content">Dashboard</h1>
        <p className="text-base-content/40 text-sm mt-1">Overview of your tests and recent activity</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<ClipboardList size={20} />} label="Total Tests" value={stats.tests} colorVar="--p" loading={loading} />
        <StatCard icon={<Clock size={20} />} label="Open Tests" value={stats.open} colorVar="--s" loading={loading} />
        <StatCard icon={<CheckCircle size={20} />} label="Completed" value={stats.results} colorVar="--su" loading={loading} />
        <StatCard icon={<TrendingUp size={20} />} label="Pass Rate" value={`${stats.passRate}%`} colorVar="--wa" loading={loading} />
      </div>

      {/* Projects */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold text-base-content mb-4">Projects</h2>
        {loading ? (
          <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-[60px] skeleton rounded-lg" />)}</div>
        ) : projects.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-base-content/40 text-sm">No projects yet.</p>
            <Link to="/project/projects" className="btn btn-primary btn-sm mt-3">Create Project</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {projects.map(p => {
              const isOpen = p.status === 'OPEN';
              return (
                <div key={p.id} className="flex items-center justify-between py-3 px-4 rounded-lg bg-base-content/[0.04] border border-base-content/[0.05]">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg" style={{ background: isOpen ? 'oklch(var(--su) / 0.1)' : 'oklch(var(--er) / 0.1)' }}>
                      {isOpen
                        ? <FolderOpen size={16} style={{ color: 'oklch(var(--su))' }} />
                        : <FolderX size={16} style={{ color: 'oklch(var(--er))' }} />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium text-base-content">{p.name}</p>
                      {p.description && <p className="text-xs text-base-content/40">{p.description}</p>}
                    </div>
                  </div>
                  <StatusBadge status={p.status as 'OPEN' | 'CLOSED'} />
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {chartData.length > 0 && (
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-base-content mb-4">Pass / Fail by Test</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--bc) / 0.08)" />
              <XAxis dataKey="name" tick={{ fill: 'oklch(var(--bc) / 0.5)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'oklch(var(--bc) / 0.5)', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: 'oklch(var(--b2))', border: '1px solid oklch(var(--bc) / 0.1)', borderRadius: '8px' }}
                labelStyle={{ color: 'oklch(var(--bc))' }}
              />
              <Bar dataKey="pass" name="Pass" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="fail" name="Fail" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>
      )}

      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold text-base-content mb-4">Recent Results</h2>
        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 skeleton rounded-lg" />)}</div>
        ) : recentResults.length === 0 ? (
          <p className="text-base-content/30 text-sm py-6 text-center">No results yet — transcribers haven't completed any tests.</p>
        ) : (
          <div className="space-y-2">
            {recentResults.map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 px-2 -mx-2 rounded-md border-b border-base-content/[0.05] last:border-0 hover:bg-base-content/[0.03] transition-colors">
                <div>
                  <span className="text-sm text-base-content">{r.userName ?? 'Unknown'}</span>
                  <span className="text-base-content/30 text-xs ml-2">— {r.testName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-base-content/40">{werToAccuracy(r.overallWer)}</span>
                  <StatusBadge status={r.passed} />
                  <span className="text-xs text-base-content/30">{formatDate(r.completedAt)}</span>
                  <Link
                    to={`/project/results/${r.id}`}
                    className="btn btn-primary btn-xs gap-1"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
