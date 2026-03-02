import { useEffect, useState } from 'react';
import { Users, FolderOpen, ClipboardList, CheckCircle, TrendingUp } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { useAmplifyData } from '@/hooks/useAmplifyData';
import { werToAccuracyNumber } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

function StatCard({ icon, label, value, sub, color = '#6366f1' }: StatCardProps) {
  return (
    <GlassCard glow className="p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-white/50 text-sm">{label}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
          {sub && <p className="text-white/40 text-xs mt-1">{sub}</p>}
        </div>
        <div className="p-3 rounded-xl" style={{ background: `${color}22`, border: `1px solid ${color}33` }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
    </GlassCard>
  );
}

export function AppAdminDashboard() {
  const client = useAmplifyData();
  const [stats, setStats] = useState({
    projects: 0, tests: 0, users: 0, results: 0, passRate: 0,
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
          users: 0,
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
          <StatCard icon={<FolderOpen size={20} />} label="Projects" value={stats.projects} color="#6366f1" />
          <StatCard icon={<ClipboardList size={20} />} label="Tests" value={stats.tests} color="#8b5cf6" />
          <StatCard icon={<CheckCircle size={20} />} label="Completed Results" value={stats.results} color="#22c55e" />
          <StatCard icon={<TrendingUp size={20} />} label="Pass Rate" value={`${stats.passRate}%`} color="#f97316" />
        </div>
      )}

      {/* Chart */}
      {chartData.length > 0 && (
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Pass / Fail by Test</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="name" tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.4)', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: 'rgba(15,12,41,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                labelStyle={{ color: 'white' }}
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
