import { useEffect, useState } from 'react';
import { ClipboardList, CheckCircle, Clock, TrendingUp, FolderOpen, FolderX } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
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
  const [toggling, setToggling] = useState<string | null>(null);
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
        setProjects((projectsRes.data ?? []) as Project[]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function toggleProject(project: Project) {
    setToggling(project.id);
    try {
      const newStatus = project.status === 'OPEN' ? 'CLOSED' : 'OPEN';
      await client.models.Project.update({ id: project.id, status: newStatus });
      setProjects(prev => prev.map(p => p.id === project.id ? { ...p, status: newStatus } : p));
    } finally {
      setToggling(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-white/40 text-sm mt-1">Overview of your tests and recent activity</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: <ClipboardList size={20} />, label: 'Total Tests', value: stats.tests, color: '#6366f1' },
          { icon: <Clock size={20} />, label: 'Open Tests', value: stats.open, color: '#8b5cf6' },
          { icon: <CheckCircle size={20} />, label: 'Completed', value: stats.results, color: '#22c55e' },
          { icon: <TrendingUp size={20} />, label: 'Pass Rate', value: `${stats.passRate}%`, color: '#f97316' },
        ].map(s => (
          <GlassCard key={s.label} glow className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/50 text-xs">{s.label}</p>
                <p className="text-2xl font-bold text-white mt-0.5">{loading ? '—' : s.value}</p>
              </div>
              <div className="p-2 rounded-lg" style={{ background: `${s.color}22`, border: `1px solid ${s.color}33` }}>
                <span style={{ color: s.color }}>{s.icon}</span>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Projects */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Projects</h2>
        {loading ? (
          <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-14 skeleton rounded" />)}</div>
        ) : projects.length === 0 ? (
          <p className="text-white/30 text-sm py-4 text-center">No projects found.</p>
        ) : (
          <div className="space-y-3">
            {projects.map(p => {
              const isOpen = p.status === 'OPEN';
              return (
                <div key={p.id} className="flex items-center justify-between py-3 px-4 rounded-lg bg-white/5 border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${isOpen ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                      {isOpen
                        ? <FolderOpen size={16} className="text-green-400" />
                        : <FolderX size={16} className="text-red-400" />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{p.name}</p>
                      {p.description && <p className="text-xs text-white/40">{p.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isOpen ? 'bg-green-500/20 text-green-300 border border-green-500/20' : 'bg-red-500/20 text-red-300 border border-red-500/20'}`}>
                      {p.status}
                    </span>
                    <button
                      onClick={() => toggleProject(p)}
                      disabled={toggling === p.id}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all border border-white/10 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-50"
                    >
                      {toggling === p.id ? '…' : isOpen ? 'Close' : 'Open'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Results</h2>
        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 skeleton rounded" />)}</div>
        ) : recentResults.length === 0 ? (
          <p className="text-white/30 text-sm py-4 text-center">No results yet.</p>
        ) : (
          <div className="space-y-2">
            {recentResults.map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <span className="text-sm text-white">{r.userName ?? 'Unknown'}</span>
                  <span className="text-white/30 text-xs ml-2">— {r.testName}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-white/40">{werToAccuracy(r.overallWer)}</span>
                  <StatusBadge status={r.passed} />
                  <span className="text-xs text-white/30">{formatDate(r.completedAt)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
