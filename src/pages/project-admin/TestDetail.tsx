import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Eye } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAmplifyData } from '@/hooks/useAmplifyData';
import { formatDate, werToAccuracy } from '@/lib/utils';

interface TestResult {
  id: string;
  testId: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  status: string;
  overallWer?: number | null;
  passed?: boolean | null;
  completedAt?: string | null;
}

interface Test {
  id: string;
  name: string;
  languageCode: string;
  status: string;
  minAccuracy: number;
  description?: string | null;
}

export function ProjectAdminTestDetail() {
  const { testId } = useParams<{ testId: string }>();
  const client = useAmplifyData();
  const [test, setTest] = useState<Test | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!testId) return;
    const [testRes, resultsRes] = await Promise.all([
      client.models.Test.get({ id: testId }),
      client.models.TestResult.list(),
    ]);
    setTest(testRes.data as Test | null);
    setResults((resultsRes.data ?? []).filter((r: TestResult) => r.testId === testId) as TestResult[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, [testId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/project/projects" className="btn btn-ghost btn-sm btn-square">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-base-content">{test?.name ?? 'Test Detail'}</h1>
          {test && (
            <p className="text-base-content/40 text-sm mt-1">
              {test.languageCode} · Min accuracy: {Math.round(test.minAccuracy * 100)}%
              <StatusBadge status={test.status as 'CREATED' | 'OPEN' | 'CLOSED'} className="ml-2" />
            </p>
          )}
        </div>
      </div>

      <GlassCard className="overflow-hidden">
        <div className="p-5 border-b border-base-content/10">
          <h2 className="text-sm font-semibold text-base-content/60 uppercase tracking-wider">Results ({results.length})</h2>
        </div>
        {loading ? (
          <div className="p-5 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-8 skeleton rounded" />)}</div>
        ) : results.length === 0 ? (
          <p className="p-5 text-base-content/30 text-sm">No results yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  {['Transcriber', 'Status', 'Accuracy', 'Pass/Fail', 'Completed', ''].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map(r => (
                  <tr key={r.id}>
                    <td className="text-sm text-base-content">{r.userName ?? '—'}</td>
                    <td><StatusBadge status={r.status as 'COMPLETED' | 'IN_PROGRESS' | 'PENDING'} /></td>
                    <td className="text-sm text-base-content/60">{werToAccuracy(r.overallWer)}</td>
                    <td>{r.status === 'COMPLETED' ? <StatusBadge status={r.passed} /> : '—'}</td>
                    <td className="text-xs text-base-content/40">{formatDate(r.completedAt)}</td>
                    <td>
                      <Link
                        to={`/project/results/${r.id}`}
                        className="btn btn-ghost btn-xs btn-square text-base-content/30 hover:text-primary hover:bg-primary/10"
                      >
                        <Eye size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
