import { useEffect, useState } from 'react';
import { FolderOpen, ClipboardList, CheckCircle, TrendingUp } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { useAmplifyData } from '@/hooks/useAmplifyData';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  colorVar?: string;
}

function StatCard({ icon, label, value, sub, colorVar = '--p' }: StatCardProps) {
  const c = `oklch(var(${colorVar}))`;
  return (
    <GlassCard glow className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/50 text-sm">{label}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          {sub && <p className="text-white/40 text-xs mt-1">{sub}</p>}
        </div>
        <div className="p-3 rounded-xl" style={{ background: `oklch(var(${colorVar}) / 0.13)`, border: `1px solid oklch(var(${colorVar}) / 0.2)` }}>
          <span style={{ color: c }}>{icon}</span>
        </div>
      </div>
    </GlassCard>
  );
}

export function AppAdminDashboard() {
  const client = useAmplifyData();
  const [stats, setStats] = useState({
    projects: 0, tests: 0, results: 0, passRate: 0,
  });
  const [chartData, setChartData] = useState<{ name: string; pass: number; fail: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [projectsRes, testsRes, resultsRes] = await Promise.all([
          client.models.Project.list(),
          client.models.Test.list(),
          client.models.TestResult.list(),
        ]);

        const results = resultsRes.data ?? [];
        const completed = results.filter(r => r.status === 'COMPLETED');
        const passed = completed.filter(r => r.passed === true);
        const passRate = completed.length > 0
          ? Math.round((passed.length / completed.length) * 100)
          : 0;

        setStats({
          projects: projectsRes.data?.length ?? 0,
          tests: testsRes.data?.length ?? 0,
          results: completed.length,
          passRate,
        });

        // Build chart data grouped by test
        const testMap: Record<string, { name: string; pass: number; fail: number }> = {};
        for (const r of completed) {
          if (!testMap[r.testId]) {
            const test = testsRes.data?.find(t => t.id === r.testId);
            testMap[r.testId] = { name: test?.name?.slice(0, 15) ?? r.testId.slice(0, 8), pass: 0, fail: 0 };
          }
          if (r.passed) testMap[r.testId].pass++;
          else testMap[r.testId].fail++;
        }
        setChartData(Object.values(testMap).slice(0, 8));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-white/40 text-sm mt-1">Global overview of all tests and results</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <GlassCard key={i} className="p-6 h-32 skeleton" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={<FolderOpen size={20} />} label="Projects" value={stats.projects} colorVar="--p" />
          <StatCard icon={<ClipboardList size={20} />} label="Tests" value={stats.tests} colorVar="--s" />
          <StatCard icon={<CheckCircle size={20} />} label="Completed Results" value={stats.results} colorVar="--su" />
          <StatCard icon={<TrendingUp size={20} />} label="Pass Rate" value={`${stats.passRate}%`} colorVar="--wa" />
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Pass / Fail by Test</h2>
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
    </div>
  );
}
