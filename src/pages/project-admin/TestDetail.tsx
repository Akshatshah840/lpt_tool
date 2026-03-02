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
        <Link to="/project/projects" className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{test?.name ?? 'Test Detail'}</h1>
          {test && (
            <p className="text-white/40 text-sm mt-1">
              {test.languageCode} · Min accuracy: {Math.round(test.minAccuracy * 100)}%
              <StatusBadge status={test.status as 'CREATED' | 'OPEN' | 'CLOSED'} className="ml-2" />
            </p>
          )}
        </div>
      </div>

      <GlassCard className="overflow-hidden">
        <div className="p-5 border-b border-white/10">
          <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Results ({results.length})</h2>
        </div>
        {loading ? (
          <div className="p-5 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-8 skeleton rounded" />)}</div>
        ) : results.length === 0 ? (
          <p className="p-5 text-white/30 text-sm">No results yet.</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                {['Transcriber', 'Status', 'Accuracy', 'Pass/Fail', 'Completed', ''].map(h => (
                  <th key={h} className="px-4 py-2 text-left text-xs text-white/40">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {results.map(r => (
                <tr key={r.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-sm text-white">{r.userName ?? '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={r.status as 'COMPLETED' | 'IN_PROGRESS' | 'PENDING'} /></td>
                  <td className="px-4 py-3 text-sm text-white/60">{werToAccuracy(r.overallWer)}</td>
                  <td className="px-4 py-3">{r.status === 'COMPLETED' ? <StatusBadge status={r.passed} /> : '—'}</td>
                  <td className="px-4 py-3 text-xs text-white/40">{formatDate(r.completedAt)}</td>
                  <td className="px-4 py-3">
                    <Link to={`/project/results/${r.id}`} className="p-1.5 rounded text-white/30 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all inline-flex">
                      <Eye size={14} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </GlassCard>
    </div>
  );
}
