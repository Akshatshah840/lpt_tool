import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, ArrowRight, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAmplifyData } from '@/hooks/useAmplifyData';
import { formatDate, werToAccuracy } from '@/lib/utils';

interface TestItem {
  testId: string;
  testName: string;
  languageCode: string;
  minAccuracy: number;
  expiresAt?: string | null;
  clipCount: number;
  // user's progress on this test
  resultId?: string | null;
  resultStatus?: string | null;   // IN_PROGRESS | COMPLETED | null
  overallWer?: number | null;
  passed?: boolean | null;
  completedAt?: string | null;
}

interface TranscriberDashboardProps {
  userId: string | null;
  userLanguage: string | null;
}

export function TranscriberDashboard({ userId, userLanguage }: TranscriberDashboardProps) {
  const client = useAmplifyData();
  const [tests, setTests] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!userId || !userLanguage) { setLoading(false); return; }
      try {
        const [testsRes, clipsRes, projectsRes, resultsRes] = await Promise.all([
          client.models.Test.list(),
          client.models.TestAudioAsset.list(),
          client.models.Project.list(),
          client.models.TestResult.list(),
        ]);

        const allClips   = clipsRes.data ?? [];
        const allProjects = projectsRes.data ?? [];
        const myResults  = (resultsRes.data ?? []).filter((r: { userId: string }) => r.userId === userId);

        const items: TestItem[] = [];
        for (const t of (testsRes.data ?? [])) {
          // Only OPEN tests in the user's language
          if (t.status !== 'OPEN') continue;
          if (t.languageCode !== userLanguage) continue;

          // Skip tests from closed projects
          const project = allProjects.find((p: { id: string; status?: string }) => p.id === t.projectId);
          if (project?.status === 'CLOSED') continue;

          const clipCount = allClips.filter((c: { testId: string }) => c.testId === t.id).length;
          const result = myResults.find((r: { testId: string }) => r.testId === t.id);

          items.push({
            testId: t.id,
            testName: t.name,
            languageCode: t.languageCode,
            minAccuracy: t.minAccuracy,
            expiresAt: t.expiresAt,
            clipCount,
            resultId: result?.id ?? null,
            resultStatus: result?.status ?? null,
            overallWer: result?.overallWer ?? null,
            passed: result?.passed ?? null,
            completedAt: result?.completedAt ?? null,
          });
        }
        setTests(items);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId, userLanguage]);

  const pending   = tests.filter(t => t.resultStatus !== 'COMPLETED');
  const completed = tests.filter(t => t.resultStatus === 'COMPLETED');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Tests</h1>
        <p className="text-white/40 text-sm mt-1">
          Open tests for <span className="text-indigo-300 font-medium">{userLanguage?.toUpperCase()}</span>
          {' '}— all available tests are shown automatically
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Available',  value: tests.length,     color: '#6366f1' },
          { label: 'Pending',    value: pending.length,   color: '#eab308' },
          { label: 'Completed',  value: completed.length, color: '#22c55e' },
        ].map(s => (
          <GlassCard key={s.label} glow className="p-5 text-center">
            <p className="text-3xl font-bold" style={{ color: s.color }}>{loading ? '—' : s.value}</p>
            <p className="text-white/40 text-sm mt-1">{s.label}</p>
          </GlassCard>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-indigo-400" />
        </div>
      ) : tests.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <ClipboardList size={40} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/40 font-medium">No open tests available</p>
          <p className="text-white/25 text-sm mt-1">
            Tests for <strong>{userLanguage?.toUpperCase()}</strong> will appear here when a Project Admin publishes them.
          </p>
        </GlassCard>
      ) : (
        <div className="space-y-4">
          {/* Pending tests */}
          {pending.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
                Pending ({pending.length})
              </h2>
              {pending.map(t => (
                <GlassCard key={t.testId} hover className="p-5 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-white">{t.testName}</h3>
                      {t.resultStatus === 'IN_PROGRESS' && (
                        <StatusBadge status="IN_PROGRESS" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-white/40 text-sm">{t.languageCode.toUpperCase()}</span>
                      <span className="text-white/20">·</span>
                      <span className="text-white/40 text-sm">{t.clipCount} clip{t.clipCount !== 1 ? 's' : ''}</span>
                      <span className="text-white/20">·</span>
                      <span className="text-white/40 text-sm">Min {Math.round(t.minAccuracy * 100)}% accuracy</span>
                    </div>
                    {t.expiresAt && (
                      <div className="flex items-center gap-1 mt-1.5 text-yellow-400/70 text-xs">
                        <Clock size={11} />
                        <span>Expires {formatDate(t.expiresAt)}</span>
                      </div>
                    )}
                  </div>
                  <Link
                    to={`/transcriber/test/${t.testId}`}
                    className="flex items-center gap-2 px-4 py-2 btn-gradient rounded-xl text-sm font-medium flex-shrink-0"
                  >
                    {t.resultStatus === 'IN_PROGRESS' ? 'Continue' : 'Start'} <ArrowRight size={14} />
                  </Link>
                </GlassCard>
              ))}
            </div>
          )}

          {/* Completed tests */}
          {completed.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">
                Completed ({completed.length})
              </h2>
              {completed.map(t => (
                <GlassCard key={t.testId} className="p-5 flex items-start justify-between gap-4 opacity-75">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                      <h3 className="font-semibold text-white">{t.testName}</h3>
                      <StatusBadge status={t.passed} />
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-white/40 text-sm">Accuracy: {werToAccuracy(t.overallWer)}</span>
                      <span className="text-white/20">·</span>
                      <span className="text-white/40 text-sm">{formatDate(t.completedAt)}</span>
                    </div>
                  </div>
                  <Link
                    to="/transcriber/results"
                    className="px-4 py-2 text-xs font-medium rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white transition-all flex-shrink-0"
                  >
                    View Results
                  </Link>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
