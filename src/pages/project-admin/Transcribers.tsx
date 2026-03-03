import { useEffect, useState } from 'react';
import { Users, Search, Download } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { EmptyState } from '@/components/shared/EmptyState';
import { useAmplifyData } from '@/hooks/useAmplifyData';
import { formatDate } from '@/lib/utils';

interface TranscriberRow {
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  testCount: number;
  completedCount: number;
  lastActivity?: string | null;
}

interface ResultRow {
  userId: string;
  testId: string;
  status: string;
  overallWer?: number | null;
  passed?: boolean | null;
  completedAt?: string | null;
}

interface TestRow {
  id: string;
  name: string;
}

function exportCSV(
  selectedIds: Set<string>,
  transcribers: TranscriberRow[],
  allResults: ResultRow[],
  allTests: TestRow[],
) {
  const selected = transcribers.filter(t => selectedIds.has(t.userId));

  const rows: string[][] = [
    ['Name', 'Email', 'Test Name', 'Status', 'Accuracy (%)', 'Pass/Fail', 'Completed At'],
  ];

  for (const t of selected) {
    const userResults = allResults.filter(r => r.userId === t.userId);
    if (userResults.length === 0) {
      rows.push([t.userName ?? '', t.userEmail ?? '', '', '', '', '', '']);
    } else {
      for (const r of userResults) {
        const test = allTests.find(test => test.id === r.testId);
        const accuracy = r.overallWer != null ? `${Math.round((1 - r.overallWer) * 100)}` : '';
        const passFail = r.passed === true ? 'PASS' : r.passed === false ? 'FAIL' : '';
        rows.push([
          t.userName ?? '',
          t.userEmail ?? '',
          test?.name ?? r.testId,
          r.status,
          accuracy,
          passFail,
          r.completedAt ?? '',
        ]);
      }
    }
  }

  const csv = rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `transcribers_export_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ProjectAdminTranscribers() {
  const client = useAmplifyData();
  const [transcribers, setTranscribers] = useState<TranscriberRow[]>([]);
  const [allResults, setAllResults] = useState<ResultRow[]>([]);
  const [allTests, setAllTests] = useState<TestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      const [resultsRes, testsRes] = await Promise.all([
        client.models.TestResult.list(),
        client.models.Test.list(),
      ]);
      const results = resultsRes.data ?? [];
      const tests = (testsRes.data ?? []).map((t: { id: string; name: string }) => ({ id: t.id, name: t.name }));

      setAllResults(results as ResultRow[]);
      setAllTests(tests);

      // Group by userId
      const map: Record<string, TranscriberRow> = {};
      for (const r of results) {
        const updatedAt = (r as { updatedAt?: string }).updatedAt;
        if (!map[r.userId]) {
          map[r.userId] = {
            userId: r.userId,
            userName: r.userName,
            userEmail: r.userEmail,
            testCount: 0,
            completedCount: 0,
            lastActivity: null,
          };
        }
        map[r.userId].testCount++;
        if (r.status === 'COMPLETED') map[r.userId].completedCount++;
        if (!map[r.userId].lastActivity || (updatedAt && updatedAt > (map[r.userId].lastActivity ?? ''))) {
          map[r.userId].lastActivity = updatedAt ?? null;
        }
      }
      setTranscribers(Object.values(map));
      setLoading(false);
    }
    load();
  }, []);

  const filtered = transcribers.filter(t => {
    const q = search.toLowerCase();
    return !q || [t.userName, t.userEmail].some(s => s?.toLowerCase().includes(q));
  });

  function toggleSelect(userId: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(t => t.userId)));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Transcribers</h1>
          <p className="text-base-content/40 text-sm mt-1">All users who have taken tests in your projects</p>
        </div>
        {selected.size > 0 && (
          <button
            onClick={() => exportCSV(selected, transcribers, allResults, allTests)}
            className="btn btn-primary btn-sm gap-2"
          >
            <Download size={15} />
            Export Selected ({selected.size})
          </button>
        )}
      </div>

      <GlassCard className="p-4 flex items-center gap-3">
        <Search size={16} className="text-base-content/40" />
        <input
          className="bg-transparent flex-1 text-sm text-base-content placeholder-base-content/30 outline-none"
          placeholder="Search transcribers…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </GlassCard>

      {loading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 skeleton rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={24} />}
          heading={search ? 'No transcribers match your search' : 'No transcribers yet'}
          description={search ? 'Try a different name or email.' : 'Transcribers will appear here once they start taking tests.'}
        />
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selected.size === filtered.length}
                      onChange={toggleSelectAll}
                      className="checkbox checkbox-primary checkbox-sm"
                    />
                  </th>
                  {['Name', 'Email', 'Tests', 'Completed', 'Progress', 'Last Activity'].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => {
                  const pct = t.testCount > 0 ? Math.round((t.completedCount / t.testCount) * 100) : 0;
                  const isSelected = selected.has(t.userId);
                  return (
                    <tr key={t.userId} className={isSelected ? 'bg-primary/[0.05]' : ''}>
                      <td>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(t.userId)}
                          className="checkbox checkbox-primary checkbox-sm"
                        />
                      </td>
                      <td className="text-sm text-base-content font-medium">{t.userName ?? '—'}</td>
                      <td className="text-sm text-base-content/60">{t.userEmail ?? '—'}</td>
                      <td className="text-sm text-base-content/60">{t.testCount}</td>
                      <td className="text-sm text-base-content/60">{t.completedCount}</td>
                      <td>
                        <div className="flex items-center gap-2">
                          <progress
                            className="progress progress-primary flex-1 h-1.5"
                            value={pct}
                            max="100"
                          />
                          <span className="text-xs text-base-content/40 w-8">{pct}%</span>
                        </div>
                      </td>
                      <td className="text-xs text-base-content/40">{formatDate(t.lastActivity)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
