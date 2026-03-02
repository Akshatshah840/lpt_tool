import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, Eye } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAmplifyData } from '@/hooks/useAmplifyData';
import { formatDate, werToAccuracy } from '@/lib/utils';

interface MyResult {
  id: string;
  testId: string;
  testName: string;
  languageCode: string;
  status: string;
  overallWer?: number | null;
  passed?: boolean | null;
  completedAt?: string | null;
  startedAt?: string | null;
}

interface MyResultsProps {
  userId: string | null;
}

export function TranscriberMyResults({ userId }: MyResultsProps) {
  const client = useAmplifyData();
  const [results, setResults] = useState<MyResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!userId) { setLoading(false); return; }
      const [resultsRes, testsRes] = await Promise.all([
        client.models.TestResult.list(),
        client.models.Test.list(),
      ]);
      const myResults = (resultsRes.data ?? [])
        .filter(r => r.userId === userId)
        .sort((a, b) => (b.completedAt ?? b.startedAt ?? '').localeCompare(a.completedAt ?? a.startedAt ?? ''));

      const enriched = myResults.map(r => {
        const test = (testsRes.data ?? []).find(t => t.id === r.testId);
        return { ...r, testName: test?.name ?? '—', languageCode: test?.languageCode ?? '—' } as MyResult;
      });
      setResults(enriched);
      setLoading(false);
    }
    load();
  }, [userId]);

  const completed = results.filter(r => r.status === 'COMPLETED');
  const passed = completed.filter(r => r.passed === true);
  const passRate = completed.length > 0 ? Math.round((passed.length / completed.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Results</h1>
        <p className="text-white/40 text-sm mt-1">Your transcription test history</p>
      </div>

      {/* Summary */}
      {!loading && completed.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Tests Completed', value: completed.length, color: '#6366f1' },
            { label: 'Tests Passed', value: passed.length, color: '#22c55e' },
            { label: 'Pass Rate', value: `${passRate}%`, color: '#f97316' },
          ].map(s => (
            <GlassCard key={s.label} glow className="p-5 text-center">
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-white/40 text-sm mt-1">{s.label}</p>
            </GlassCard>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <GlassCard key={i} className="p-5 h-20 skeleton" />)}</div>
      ) : results.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <CheckSquare size={40} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/40 font-medium">No results yet</p>
          <p className="text-white/30 text-sm mt-1">Complete a test to see your results here.</p>
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['Test', 'Language', 'Status', 'Accuracy', 'Pass/Fail', 'Completed', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {results.map(r => (
                <tr key={r.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-sm text-white font-medium">{r.testName}</td>
                  <td className="px-4 py-3 text-sm text-white/60">{r.languageCode}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status as 'COMPLETED' | 'IN_PROGRESS' | 'PENDING'} /></td>
                  <td className="px-4 py-3 text-sm text-white/70">{werToAccuracy(r.overallWer)}</td>
                  <td className="px-4 py-3">
                    {r.status === 'COMPLETED' ? <StatusBadge status={r.passed} /> : <span className="text-white/30">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-white/40">{formatDate(r.completedAt)}</td>
                  <td className="px-4 py-3">
                    {r.status === 'COMPLETED' && (
                      <Link
                        to={`/transcriber/result/${r.id}`}
                        className="p-1.5 rounded text-white/30 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all inline-flex"
                      >
                        <Eye size={14} />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      )}
    </div>
  );
}
