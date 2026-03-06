import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { WordDiff } from '@/components/shared/WordDiff';
import { useAmplifyData } from '@/hooks/useAmplifyData';
import { formatDate, werToAccuracy } from '@/lib/utils';

interface Transcription {
  id: string;
  audioAssetId: string;
  submittedText?: string | null;
  wer?: number | null;
  sortOrder?: number | null;
  audioFilename?: string;
  referenceTranscription?: string;
}

interface TestResult {
  id: string;
  testId: string;
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  status: string;
  overallWer?: number | null;
  passed?: boolean | null;
  startedAt?: string | null;
  completedAt?: string | null;
  testName?: string;
}

export function ProjectAdminResultDetail() {
  const { resultId } = useParams<{ resultId: string }>();
  const client = useAmplifyData();
  const [result, setResult] = useState<TestResult | null>(null);
  const [transcriptions, setTranscriptions] = useState<Transcription[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!resultId) return;
      const resultRes = await client.models.TestResult.get({ id: resultId });
      const r = resultRes.data;
      if (!r) { setLoading(false); return; }

      const testRes = await client.models.Test.get({ id: r.testId });
      const transRes = await client.models.Transcription.list({
        filter: { testResultId: { eq: resultId } },
      });
      const myTrans = (transRes.data ?? [])
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      // Enrich with audio asset info
      const enriched: Transcription[] = [];
      for (const t of myTrans) {
        const assetRes = await client.models.AudioAsset.get({ id: t.audioAssetId });
        enriched.push({
          ...t,
          audioFilename: assetRes.data?.filename,
          referenceTranscription: assetRes.data?.referenceTranscription ?? '',
        } as Transcription);
      }

      setResult({ ...r, testName: testRes.data?.name } as TestResult);
      setTranscriptions(enriched);
      setLoading(false);
    }
    load();
  }, [resultId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="card h-24 skeleton" />
        <div className="card h-48 skeleton" />
        <div className="card h-48 skeleton" />
      </div>
    );
  }

  if (!result) {
    return (
      <GlassCard className="p-12 text-center">
        <p className="text-base-content/40">Result not found.</p>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="../../projects" relative="path" className="btn btn-ghost btn-sm btn-square">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-base-content">Result Detail</h1>
          <p className="text-base-content/40 text-sm mt-1">{result.testName} · {result.userName}</p>
        </div>
      </div>

      {/* Summary card */}
      <GlassCard className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div>
            <p className="text-xs text-base-content/40 uppercase tracking-wider">Transcriber</p>
            <p className="text-base-content font-medium mt-1">{result.userName ?? '—'}</p>
            <p className="text-base-content/40 text-xs">{result.userEmail}</p>
          </div>
          <div>
            <p className="text-xs text-base-content/40 uppercase tracking-wider">Overall Accuracy</p>
            <p className="text-2xl font-bold text-base-content mt-1">{werToAccuracy(result.overallWer)}</p>
            <p className="text-base-content/40 text-xs">WER: {result.overallWer?.toFixed(4) ?? '—'}</p>
          </div>
          <div>
            <p className="text-xs text-base-content/40 uppercase tracking-wider">Result</p>
            <div className="mt-1">
              <StatusBadge status={result.passed} />
            </div>
          </div>
          <div>
            <p className="text-xs text-base-content/40 uppercase tracking-wider">Completed</p>
            <p className="text-base-content text-sm mt-1">{formatDate(result.completedAt)}</p>
          </div>
        </div>
      </GlassCard>

      {/* Per-clip diffs */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-base-content">Clip-by-Clip Comparison</h2>
        {transcriptions.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <p className="text-base-content/30">No transcription data available.</p>
          </GlassCard>
        ) : (
          transcriptions.map((t, i) => (
            <WordDiff
              key={t.id}
              reference={t.referenceTranscription ?? ''}
              submitted={t.submittedText ?? ''}
              wer={t.wer}
              clipNumber={i + 1}
              audioFilename={t.audioFilename}
            />
          ))
        )}
      </div>
    </div>
  );
}
