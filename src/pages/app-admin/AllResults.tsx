import { useEffect, useState } from 'react';
import { BarChart2, Search } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
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
  const [page, setPage] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const [resultsRes, testsRes] = await Promise.all([
          client.models.TestResult.list({ limit: 50 }),
          client.models.Test.list(),
        ]);
        const tests = testsRes.data ?? [];
        const enriched = (resultsRes.data ?? []).map(r => ({
          ...r,
          testName: tests.find(t => t.id === r.testId)?.name ?? r.testId,
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

  const filtered = results.filter(r => {
    const q = search.toLowerCase();
    return !q || [r.userName, r.userEmail, r.testName].some(s => s?.toLowerCase().includes(q));
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">All Results</h1>
          <p className="text-white/40 text-sm mt-1">Global view of all transcription results</p>
        </div>
        <ExportButton />
      </div>

      <GlassCard className="p-4 flex items-center gap-3">
        <Search size={16} className="text-white/40" />
        <input
          className="bg-transparent flex-1 text-sm text-white placeholder-white/30 outline-none"
          placeholder="Search by name, email, or test…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </GlassCard>

      {loading ? (
        <GlassCard className="p-6 h-64 skeleton" />
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  {['Transcriber', 'Test', 'Status', 'Accuracy', 'Pass/Fail', 'Completed'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-white/30">
                      <BarChart2 size={32} className="mx-auto mb-2 opacity-30" />
                      No results found.
                    </td>
                  </tr>
                ) : filtered.map(r => (
                  <tr key={r.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-white">{r.userName ?? '—'}</div>
                      <div className="text-xs text-white/40">{r.userEmail ?? '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-sm text-white/70">{r.testName}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status as 'COMPLETED' | 'IN_PROGRESS' | 'PENDING'} />
                    </td>
                    <td className="px-4 py-3 text-sm text-white/70">{werToAccuracy(r.overallWer)}</td>
                    <td className="px-4 py-3">
                      {r.status === 'COMPLETED' ? <StatusBadge status={r.passed} /> : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-white/40">{formatDate(r.completedAt)}</td>
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
