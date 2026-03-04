import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, ArrowRight, Clock, CheckCircle2, Loader2 } from 'lucide-react';
import { LANGUAGE_NAMES } from '@/lib/languages';
import { GlassCard } from '@/components/shared/GlassCard';
import { StatCard } from '@/components/shared/StatCard';
import { EmptyState } from '@/components/shared/EmptyState';
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
          // Only tests in the user's language
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
        <h1 className="text-2xl font-bold text-base-content">My Projects</h1>
        <p className="text-base-content/40 text-sm mt-1">
          Open projects for <span className="font-medium" style={{ color: 'oklch(var(--p))' }}>{userLanguage ? (LANGUAGE_NAMES[userLanguage] ?? userLanguage) : ''}</span>
          {' '}— all available projects are shown automatically
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard icon={<ClipboardList size={20} />} label="Available" value={tests.length} colorVar="--p" loading={loading} />
        <StatCard icon={<Clock size={20} />} label="Pending" value={pending.length} colorVar="--wa" loading={loading} />
        <StatCard icon={<CheckCircle2 size={20} />} label="Completed" value={completed.length} colorVar="--su" loading={loading} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin" style={{ color: 'oklch(var(--p))' }} />
        </div>
      ) : tests.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={24} />}
          heading="No open projects available"
          description={`Projects for ${userLanguage ? (LANGUAGE_NAMES[userLanguage] ?? userLanguage) : ''} will appear here when a Project Admin publishes them.`}
        />
      ) : (
        <div className="space-y-4">
          {/* Pending projects */}
          {pending.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider">
                Pending Projects ({pending.length})
              </h2>
              {pending.map(t => (
                <GlassCard key={t.testId} hover className="p-5 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base-content">{t.testName}</h3>
                      {t.resultStatus === 'IN_PROGRESS' && (
                        <StatusBadge status="IN_PROGRESS" />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                      <span className="text-base-content/40 text-sm">{LANGUAGE_NAMES[t.languageCode] ?? t.languageCode}</span>
                      <span className="text-base-content/20">·</span>
                      <span className="text-base-content/40 text-sm">{t.clipCount} clip{t.clipCount !== 1 ? 's' : ''}</span>
                      <span className="text-base-content/20">·</span>
                      <span className="text-sm" style={{ color: 'oklch(var(--p) / 0.7)' }}>Min {Math.round(t.minAccuracy * 100)}% accuracy</span>
                    </div>
                    {t.expiresAt && (
                      <div className="flex items-center gap-1 mt-1.5 text-xs" style={{ color: 'oklch(var(--wa) / 0.75)' }}>
                        <Clock size={11} />
                        <span>Expires {formatDate(t.expiresAt)}</span>
                      </div>
                    )}
                  </div>
                  <Link
                    to={`/transcriber/test/${t.testId}`}
                    className="btn btn-primary btn-sm gap-2 flex-shrink-0"
                  >
                    {t.resultStatus === 'IN_PROGRESS' ? 'Continue' : 'Start'} <ArrowRight size={14} />
                  </Link>
                </GlassCard>
              ))}
            </div>
          )}

          {/* Completed projects */}
          {completed.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider">
                Completed Projects ({completed.length})
              </h2>
              {completed.map(t => (
                <GlassCard key={t.testId} className="p-5 flex items-start justify-between gap-4 opacity-75">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CheckCircle2 size={16} className="flex-shrink-0" style={{ color: 'oklch(var(--su))' }} />
                      <h3 className="font-semibold text-base-content">{t.testName}</h3>
                      <StatusBadge status={t.passed} />
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-base-content/40 text-sm">Accuracy: {werToAccuracy(t.overallWer)}</span>
                      <span className="text-base-content/20">·</span>
                      <span className="text-base-content/40 text-sm">{formatDate(t.completedAt)}</span>
                    </div>
                  </div>
                  <Link
                    to={t.resultId ? `/transcriber/result/${t.resultId}` : '/transcriber/results'}
                    className="btn btn-ghost btn-sm border border-base-content/10 text-base-content/60 flex-shrink-0"
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
