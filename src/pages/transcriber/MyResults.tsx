import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, CheckCircle, TrendingUp, Eye } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { StatCard } from '@/components/shared/StatCard';
import { EmptyState } from '@/components/shared/EmptyState';
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
        <h1 className="text-2xl font-bold text-base-content">My Results</h1>
        <p className="text-base-content/40 text-sm mt-1">Your transcription test history</p>
      </div>

      {/* Summary */}
      {!loading && completed.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={<CheckSquare size={20} />} label="Tests Completed" value={completed.length} colorVar="--p" />
          <StatCard icon={<CheckCircle size={20} />} label="Tests Passed" value={passed.length} colorVar="--su" />
          <StatCard icon={<TrendingUp size={20} />} label="Pass Rate" value={`${passRate}%`} colorVar="--wa" />
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-12 skeleton rounded-lg" />)}</div>
      ) : results.length === 0 ? (
        <EmptyState
          icon={<CheckSquare size={24} />}
          heading="No results yet"
          description="Complete a test to see your history and accuracy scores here."
        />
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  {['Test', 'Language', 'Status', 'Accuracy', 'Pass/Fail', 'Completed', ''].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.id}>
                    <td className="text-sm text-base-content font-medium">{r.testName}</td>
                    <td className="text-sm text-base-content/60">{r.languageCode}</td>
                    <td><StatusBadge status={r.status as 'COMPLETED' | 'IN_PROGRESS' | 'PENDING'} /></td>
                    <td className="text-sm text-base-content/70">{werToAccuracy(r.overallWer)}</td>
                    <td>
                      {r.status === 'COMPLETED' ? <StatusBadge status={r.passed} /> : <span className="text-base-content/30">—</span>}
                    </td>
                    <td className="text-xs text-base-content/40">{formatDate(r.completedAt)}</td>
                    <td>
                      {r.status === 'COMPLETED' && (
                        <Link
                          to={`/transcriber/result/${r.id}`}
                          className="btn btn-ghost btn-xs btn-square text-base-content/30 hover:text-primary hover:bg-primary/10"
                        >
                          <Eye size={14} />
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
