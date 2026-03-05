import { useEffect, useState } from 'react';
import { BarChart2, Search, Loader2 } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ExportButton } from '@/components/shared/ExportButton';
import { useAmplifyData } from '@/hooks/useAmplifyData';
import { formatDate, werToAccuracy } from '@/lib/utils';

interface Result {
  id: string;
  testId: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  status: string;
  overallWer?: number | null;
  passed?: boolean | null;
  completedAt?: string | null;
  testName?: string;
}

export function AppAdminAllResults() {
  const client = useAmplifyData();
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [nextToken, setNextToken] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tests, setTests] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    async function load() {
      try {
        const [resultsRes, testsRes] = await Promise.all([
          client.models.TestResult.list({ limit: 50 }),
          client.models.Test.list(),
        ]);
        const allTests = testsRes.data ?? [];
        setTests(allTests as Array<{ id: string; name: string }>);
        const enriched = (resultsRes.data ?? []).map(r => ({
          ...r,
          testName: allTests.find(t => t.id === r.testId)?.name ?? r.testId,
        }));
        setResults(enriched as Result[]);
        setNextToken((resultsRes as { nextToken?: string }).nextToken ?? null);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function loadMore() {
    if (!nextToken || loadingMore) return;
    setLoadingMore(true);
    try {
      const resultsRes = await client.models.TestResult.list({ limit: 50, nextToken } as Parameters<typeof client.models.TestResult.list>[0]);
      const enriched = (resultsRes.data ?? []).map(r => ({
        ...r,
        testName: tests.find(t => t.id === r.testId)?.name ?? r.testId,
      }));
      setResults(prev => [...prev, ...enriched as Result[]]);
      setNextToken((resultsRes as { nextToken?: string }).nextToken ?? null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMore(false);
    }
  }

  const filtered = results.filter(r => {
    const q = search.toLowerCase();
    return !q || [r.userName, r.userEmail, r.testName].some(s => s?.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-base-content">All Results</h1>
          <p className="text-base-content/40 text-sm mt-1">Global view of all transcription results</p>
        </div>
        <ExportButton />
      </div>

      <GlassCard className="p-4 flex items-center gap-3">
        <Search size={16} className="text-base-content/40" />
        <input
          className="bg-transparent flex-1 text-sm text-base-content placeholder-base-content/30 outline-none"
          placeholder="Search by name, email, or test…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </GlassCard>
      {nextToken && (
        <p className="text-xs text-base-content/30 -mt-2">
          Showing {results.length} results — use "Load More" to search all records.
        </p>
      )}

      {loading ? (
        <div className="space-y-2">{[...Array(8)].map((_, i) => <div key={i} className="h-12 skeleton rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<BarChart2 size={24} />}
          heading="No results found"
          description={search ? 'Try adjusting your search terms.' : 'Transcribers haven\'t completed any tests yet.'}
        />
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  {['Transcriber', 'Test', 'Status', 'Accuracy', 'Pass/Fail', 'Completed'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id}>
                    <td>
                      <div className="text-sm font-medium text-base-content">{r.userName ?? '—'}</div>
                      <div className="text-xs text-base-content/40">{r.userEmail ?? '—'}</div>
                    </td>
                    <td className="text-sm text-base-content/70">{r.testName}</td>
                    <td>
                      <StatusBadge status={r.status as 'COMPLETED' | 'IN_PROGRESS' | 'PENDING'} />
                    </td>
                    <td className="text-sm text-base-content/70">{werToAccuracy(r.overallWer)}</td>
                    <td>
                      {r.status === 'COMPLETED' ? <StatusBadge status={r.passed} /> : '—'}
                    </td>
                    <td className="text-xs text-base-content/40">{formatDate(r.completedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {nextToken && (
        <div className="flex justify-center">
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="btn btn-primary btn-sm gap-2 disabled:opacity-50"
          >
            {loadingMore ? <Loader2 size={16} className="animate-spin" /> : null}
            {loadingMore ? 'Loading…' : 'Load More'}
          </button>
        </div>
      )}
    </div>
  );
}
