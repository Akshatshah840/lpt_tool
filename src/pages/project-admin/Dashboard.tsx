import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, CheckCircle, Clock, TrendingUp, FolderOpen, FolderX } from 'lucide-react';
import {
  AreaChart, Area,
  BarChart, Bar,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import { GlassCard } from '@/components/shared/GlassCard';
import { StatCard } from '@/components/shared/StatCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAmplifyData } from '@/hooks/useAmplifyData';
import { formatDate, werToAccuracy } from '@/lib/utils';

// ── Palette ──────────────────────────────────────────────────────────────────
const C = {
  primary : '#6366f1',
  success : '#22c55e',
  error   : '#ef4444',
  warning : '#f59e0b',
  muted   : 'rgba(255,255,255,0.07)',
};

const TOOLTIP_STYLE = {
  contentStyle: {
    background: 'oklch(var(--b2))',
    border: '1px solid oklch(var(--bc) / 0.1)',
    borderRadius: '10px',
    fontSize: 12,
  },
  labelStyle: { color: 'oklch(var(--bc))' },
  cursor: { fill: 'oklch(var(--bc) / 0.04)' },
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface Project { id: string; name: string; description?: string | null; status: string; }

interface DashData {
  stats: { tests: number; open: number; results: number; passRate: number };
  trend: { date: string; count: number }[];
  donut: { name: string; value: number; color: string }[];
  byTest: { name: string; accuracy: number; attempts: number }[];
  distribution: { label: string; count: number; color: string }[];
  recent: { id: string; userName?: string | null; testName: string; passed?: boolean | null; completedAt?: string | null; overallWer?: number | null }[];
  projects: Project[];
}

// ── Custom donut centre label ─────────────────────────────────────────────────
function DonutCenter({ cx, cy, passRate }: { cx?: number; cy?: number; passRate: number }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
      <tspan x={cx} dy="-0.3em" fontSize={28} fontWeight={700} fill="oklch(var(--bc))">{passRate}%</tspan>
      <tspan x={cx} dy="1.6em" fontSize={11} fill="oklch(var(--bc) / 0.45)">pass rate</tspan>
    </text>
  );
}

// ── Greeting helpers ──────────────────────────────────────────────────────────
function getGreeting(userName?: string | null) {
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
  const firstName = userName?.split(' ')[0];
  return `Good ${timeOfDay}${firstName ? `, ${firstName}` : ''}`;
}

function formatTodayDate() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

// ── Main component ────────────────────────────────────────────────────────────
interface ProjectAdminDashboardProps {
  userName?: string | null;
}

export function ProjectAdminDashboard({ userName }: ProjectAdminDashboardProps) {
  const client = useAmplifyData();
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [testsRes, resultsRes, projectsRes] = await Promise.all([
          client.models.Test.list(),
          client.models.TestResult.list({ limit: 500 }),
          client.models.Project.list(),
        ]);

        const tests     = testsRes.data ?? [];
        const allRes    = resultsRes.data ?? [];
        const completed = allRes.filter((r: { status: string }) => r.status === 'COMPLETED');
        const passedArr = completed.filter((r: { passed?: boolean | null }) => r.passed === true);
        const passRate  = completed.length ? Math.round((passedArr.length / completed.length) * 100) : 0;

        // ── Trend: completions per day (last 14 days) ────────────────────────
        const dateMap: Record<string, number> = {};
        for (const r of completed) {
          if (!(r as { completedAt?: string | null }).completedAt) continue;
          const d = ((r as { completedAt: string }).completedAt).slice(0, 10);
          dateMap[d] = (dateMap[d] ?? 0) + 1;
        }
        // Fill last 14 days even if no data
        const today = new Date();
        const trend = Array.from({ length: 14 }, (_, i) => {
          const d = new Date(today);
          d.setDate(today.getDate() - (13 - i));
          const key = d.toISOString().slice(0, 10);
          return {
            date: `${d.getMonth() + 1}/${d.getDate()}`,
            count: dateMap[key] ?? 0,
          };
        });

        // ── Donut: pass / fail ───────────────────────────────────────────────
        const failCount = completed.length - passedArr.length;
        const donut = completed.length
          ? [
              { name: 'Pass', value: passedArr.length, color: C.success },
              { name: 'Fail', value: failCount,        color: C.error },
            ]
          : [{ name: 'No data', value: 1, color: C.muted }];

        // ── Avg accuracy by test (sorted: hardest first) ─────────────────────
        const testAccMap: Record<string, { name: string; total: number; count: number }> = {};
        for (const r of completed) {
          const testId = (r as { testId: string }).testId;
          const wer    = (r as { overallWer?: number | null }).overallWer;
          const acc    = wer != null ? Math.round((1 - Math.min(wer, 1)) * 100) : 0;
          if (!testAccMap[testId]) {
            const t = tests.find((t: { id: string; name: string }) => t.id === testId);
            testAccMap[testId] = { name: t?.name?.slice(0, 20) ?? testId.slice(0, 8), total: 0, count: 0 };
          }
          testAccMap[testId].total  += acc;
          testAccMap[testId].count  += 1;
        }
        const byTest = Object.values(testAccMap)
          .map(t => ({ name: t.name, accuracy: Math.round(t.total / t.count), attempts: t.count }))
          .sort((a, b) => a.accuracy - b.accuracy)
          .slice(0, 8);

        // ── Accuracy distribution histogram ──────────────────────────────────
        const dist = [
          { label: '0–50%',   min: 0,  max: 50,  count: 0, color: C.error   },
          { label: '50–70%',  min: 50, max: 70,  count: 0, color: C.warning  },
          { label: '70–85%',  min: 70, max: 85,  count: 0, color: C.primary  },
          { label: '85–100%', min: 85, max: 101, count: 0, color: C.success  },
        ];
        for (const r of completed) {
          const wer = (r as { overallWer?: number | null }).overallWer;
          const acc = wer != null ? Math.round((1 - Math.min(wer, 1)) * 100) : 0;
          const bucket = dist.find(b => acc >= b.min && acc < b.max);
          if (bucket) bucket.count++;
        }

        // ── Recent results ───────────────────────────────────────────────────
        const recent = completed.slice(0, 8).map((r: {
          id: string; userName?: string | null; testId: string;
          passed?: boolean | null; completedAt?: string | null; overallWer?: number | null;
        }) => ({
          id: r.id, userName: r.userName,
          testName: tests.find((t: { id: string; name: string }) => t.id === r.testId)?.name ?? '—',
          passed: r.passed, completedAt: r.completedAt, overallWer: r.overallWer,
        }));

        setData({
          stats: { tests: tests.length, open: tests.filter((t: { status: string }) => t.status === 'OPEN').length, results: completed.length, passRate },
          trend, donut, byTest, distribution: dist, recent,
          projects: (projectsRes.data ?? []) as Project[],
        });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const hasResults = (data?.stats.results ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-base-content/40 text-xs mb-1">{formatTodayDate()}</p>
        <h1 className="text-2xl font-bold text-base-content">{getGreeting(userName)}</h1>
        <p className="text-base-content/40 text-sm mt-1">Overview of your tests and recent activity</p>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<ClipboardList size={20} />} label="Total Tests"  value={data?.stats.tests    ?? 0} colorVar="--p"  loading={loading} />
        <StatCard icon={<Clock size={20} />}          label="Open Tests"   value={data?.stats.open     ?? 0} colorVar="--s"  loading={loading} />
        <StatCard icon={<CheckCircle size={20} />}    label="Completed"    value={data?.stats.results  ?? 0} colorVar="--su" loading={loading} />
        <StatCard icon={<TrendingUp size={20} />}     label="Pass Rate"    value={`${data?.stats.passRate ?? 0}%`} colorVar="--wa" loading={loading} />
      </div>

      {/* ── Charts row 1: trend + donut ─────────────────────────────────────── */}
      {loading ? (
        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-64 skeleton rounded-2xl" />
          <div className="h-64 skeleton rounded-2xl" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Area chart — completions trend */}
          <GlassCard className="lg:col-span-2 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-base-content">Completions — Last 14 Days</h2>
                <p className="text-xs text-base-content/40 mt-0.5">Tests finished per day</p>
              </div>
              <span className="badge badge-ghost text-xs">{data?.stats.results} total</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data?.trend ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={C.primary} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={C.primary} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--bc) / 0.06)" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'oklch(var(--bc) / 0.4)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'oklch(var(--bc) / 0.4)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [v, 'Completions']} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke={C.primary}
                  strokeWidth={2.5}
                  fill="url(#gradCompleted)"
                  dot={false}
                  activeDot={{ r: 4, fill: C.primary, stroke: 'oklch(var(--b1))', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Donut — pass/fail */}
          <GlassCard className="p-6 flex flex-col">
            <div className="mb-2">
              <h2 className="text-base font-semibold text-base-content">Pass / Fail</h2>
              <p className="text-xs text-base-content/40 mt-0.5">All completed tests</p>
            </div>
            {hasResults ? (
              <>
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie
                      data={data?.donut}
                      cx="50%" cy="50%"
                      innerRadius={58} outerRadius={78}
                      dataKey="value"
                      paddingAngle={3}
                      startAngle={90} endAngle={-270}
                      labelLine={false}
                    >
                      {data?.donut.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                    </Pie>
                    <DonutCenter passRate={data?.stats.passRate ?? 0} />
                    <Tooltip {...TOOLTIP_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-5 mt-2">
                  {data?.donut.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs text-base-content/60">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                      {d.name} <span className="font-semibold text-base-content">{d.value}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-base-content/30 text-sm text-center">No completed tests yet</p>
              </div>
            )}
          </GlassCard>
        </div>
      )}

      {/* ── Charts row 2: per-test accuracy + distribution ──────────────────── */}
      {!loading && hasResults && (
        <div className="grid lg:grid-cols-2 gap-4">
          {/* Horizontal bar — avg accuracy by test */}
          {data && data.byTest.length > 0 && (
            <GlassCard className="p-6">
              <div className="mb-5">
                <h2 className="text-base font-semibold text-base-content">Avg Accuracy by Test</h2>
                <p className="text-xs text-base-content/40 mt-0.5">Sorted hardest → easiest</p>
              </div>
              <ResponsiveContainer width="100%" height={Math.max(data.byTest.length * 42, 120)}>
                <BarChart
                  data={data.byTest}
                  layout="vertical"
                  margin={{ top: 0, right: 40, left: 0, bottom: 0 }}
                  barCategoryGap="30%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--bc) / 0.06)" horizontal={false} />
                  <XAxis
                    type="number" domain={[0, 100]} unit="%" hide={false}
                    tick={{ fill: 'oklch(var(--bc) / 0.4)', fontSize: 11 }}
                    axisLine={false} tickLine={false}
                  />
                  <YAxis
                    type="category" dataKey="name" width={110}
                    tick={{ fill: 'oklch(var(--bc) / 0.6)', fontSize: 11 }}
                    axisLine={false} tickLine={false}
                  />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    formatter={(v: number, _: string, { payload }: { payload: { attempts: number } }) => [
                      `${v}%`, `Avg accuracy (${payload.attempts} attempt${payload.attempts !== 1 ? 's' : ''})`,
                    ]}
                  />
                  <Bar dataKey="accuracy" radius={[0, 6, 6, 0]} fill={C.primary}>
                    {data.byTest.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.accuracy >= 85 ? C.success : entry.accuracy >= 70 ? C.primary : entry.accuracy >= 50 ? C.warning : C.error}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          )}

          {/* Histogram — accuracy score distribution */}
          <GlassCard className="p-6">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-base-content">Score Distribution</h2>
              <p className="text-xs text-base-content/40 mt-0.5">How scores cluster across all submissions</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data?.distribution ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(var(--bc) / 0.06)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'oklch(var(--bc) / 0.5)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'oklch(var(--bc) / 0.4)', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE} formatter={(v: number) => [v, 'Submissions']} />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {data?.distribution.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div className="flex flex-wrap justify-center gap-4 mt-3">
              {data?.distribution.map(d => (
                <div key={d.label} className="flex items-center gap-1.5 text-xs text-base-content/50">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ background: d.color }} />
                  {d.label}
                  {d.count > 0 && <span className="font-semibold text-base-content">{d.count}</span>}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* ── Projects ────────────────────────────────────────────────────────── */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-base-content">Projects</h2>
          <Link to="/project/projects" className="text-xs text-primary hover:underline">Manage all →</Link>
        </div>
        {loading ? (
          <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-[56px] skeleton rounded-lg" />)}</div>
        ) : (data?.projects.length ?? 0) === 0 ? (
          <div className="py-6 text-center">
            <p className="text-base-content/40 text-sm">No projects yet.</p>
            <Link to="/project/projects" className="btn btn-primary btn-sm mt-3">Create Project</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {data?.projects.map(p => {
              const isOpen = p.status === 'OPEN';
              return (
                <Link
                  key={p.id}
                  to={`/project/projects/${p.id}`}
                  className="flex items-center justify-between py-3 px-4 rounded-xl bg-base-content/[0.03] hover:bg-base-content/[0.06] border border-base-content/[0.05] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-lg" style={{ background: isOpen ? 'oklch(var(--su) / 0.12)' : 'oklch(var(--er) / 0.1)' }}>
                      {isOpen
                        ? <FolderOpen size={15} style={{ color: 'oklch(var(--su))' }} />
                        : <FolderX    size={15} style={{ color: 'oklch(var(--er))' }} />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-medium text-base-content">{p.name}</p>
                      {p.description && <p className="text-xs text-base-content/40 truncate max-w-xs">{p.description}</p>}
                    </div>
                  </div>
                  <StatusBadge status={p.status as 'OPEN' | 'CLOSED'} />
                </Link>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* ── Recent results ───────────────────────────────────────────────────── */}
      <GlassCard className="p-6">
        <h2 className="text-base font-semibold text-base-content mb-4">Recent Results</h2>
        {loading ? (
          <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-10 skeleton rounded-lg" />)}</div>
        ) : (data?.recent.length ?? 0) === 0 ? (
          <p className="text-base-content/30 text-sm py-6 text-center">No results yet — transcribers haven't completed any tests.</p>
        ) : (
          <div className="divide-y divide-base-content/[0.05]">
            {data?.recent.map(r => (
              <div key={r.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 hover:bg-base-content/[0.02] -mx-2 px-2 rounded-md transition-colors">
                <div className="min-w-0">
                  <span className="text-sm font-medium text-base-content">{r.userName ?? 'Unknown'}</span>
                  <span className="text-base-content/30 text-xs ml-2 truncate">— {r.testName}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs font-medium text-base-content/60">{werToAccuracy(r.overallWer)}</span>
                  <StatusBadge status={r.passed} />
                  <span className="text-xs text-base-content/30 hidden sm:inline">{formatDate(r.completedAt)}</span>
                  <Link to={`/project/results/${r.id}`} className="btn btn-primary btn-xs">View</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
