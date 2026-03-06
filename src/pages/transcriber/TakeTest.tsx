import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Send, Loader2 } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { AudioPlayer } from '@/components/shared/AudioPlayer';
import { useAmplifyData } from '@/hooks/useAmplifyData';
import { werToAccuracy } from '@/lib/utils';

async function resolveAudioUrl(s3Key: string): Promise<string> {
  const { getUrl } = await import('aws-amplify/storage');
  const result = await getUrl({ path: s3Key, options: { expiresIn: 3600 } });
  return result.url.toString();
}

interface Clip {
  audioAssetId: string;
  filename: string;
  s3Key: string;
  sortOrder: number;
  audioUrl?: string;
}

interface TakeTestProps {
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
}

type TestPhase = 'loading' | 'expired' | 'taking' | 'submitting' | 'result';

export function TranscriberTakeTest({ userId, userName, userEmail }: TakeTestProps) {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const client = useAmplifyData();

  const [test, setTest] = useState<{ id: string; name: string; minAccuracy: number } | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [clipIndex, setClipIndex] = useState(0);
  const [transcriptions, setTranscriptions] = useState<Record<string, string>>({});
  const [phase, setPhase] = useState<TestPhase>('loading');
  const [testResultId, setTestResultId] = useState<string | null>(null);
  const [finalResult, setFinalResult] = useState<{ overallWer: number; passed: boolean } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    async function load() {
      if (!testId || !userId) return;
      try {
      const testRes = await client.models.Test.get({ id: testId });
      if (!testRes.data) return;
      setTest({ id: testRes.data.id, name: testRes.data.name, minAccuracy: testRes.data.minAccuracy });

      // Check expiry
      if (testRes.data.expiresAt && new Date(testRes.data.expiresAt) < new Date()) {
        setPhase('expired');
        setTimeout(() => navigate('/transcriber/dashboard', { replace: true }), 3000);
        return;
      }

      // Load clips — server-side filter avoids pagination misses
      const clipsRes = await client.models.TestAudioAsset.list({
        filter: { testId: { eq: testId } },
      });
      const myClips = (clipsRes.data ?? [])
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

      const enrichedClips: Clip[] = [];
      for (const c of myClips) {
        const assetRes = await client.models.AudioAsset.get({ id: c.audioAssetId });
        const asset = assetRes.data;
        if (!asset) continue;

        // Get presigned URL
        const audioUrl = await resolveAudioUrl(asset.s3Key);

        enrichedClips.push({
          audioAssetId: asset.id,
          filename: asset.filename,
          s3Key: asset.s3Key,
          sortOrder: c.sortOrder ?? 0,
          audioUrl,
        });
      }

      setClips(enrichedClips);

      // Check for existing result (resume or guard)
      const existingResultRes = await client.models.TestResult.list({
        filter: { testId: { eq: testId } },
      });
      const allMyResults = (existingResultRes.data ?? []).filter(
        r => r.userId === userId
      );

      // GUARD: already completed → redirect to result
      const completedResult = allMyResults.find(r => r.status === 'COMPLETED');
      if (completedResult) {
        navigate(`/transcriber/result/${completedResult.id}`, { replace: true });
        return;
      }

      // Resume in-progress or create new
      const existingResult = allMyResults.find(r => r.status !== 'COMPLETED');
      if (existingResult) {
        setTestResultId(existingResult.id);
        const transRes = await client.models.Transcription.list({
          filter: { testResultId: { eq: existingResult.id } },
        });
        const existing = transRes.data ?? [];
        const map: Record<string, string> = {};
        for (const t of existing) {
          if (t.submittedText) map[t.audioAssetId] = t.submittedText;
        }
        setTranscriptions(map);
      } else {
        const newResult = await client.models.TestResult.create({
          testId,
          userId,
          userName,
          userEmail,
          status: 'IN_PROGRESS',
          startedAt: new Date().toISOString(),
        });
        setTestResultId(newResult.data?.id ?? null);
      }

      setPhase('taking');
      } catch (e) {
        console.error('Failed to load test:', e);
        setPhase('taking'); // show "no clips" state rather than frozen skeleton
      }
    }
    load();
  }, [testId, userId]);

  const currentClip = clips[clipIndex];

  function handleTextChange(text: string) {
    if (!currentClip) return;
    setTranscriptions(prev => ({ ...prev, [currentClip.audioAssetId]: text }));
  }

  function handleNext() {
    if (clipIndex < clips.length - 1) {
      setClipIndex(i => i + 1);
    }
  }

  function handlePrev() {
    if (clipIndex > 0) setClipIndex(i => i - 1);
  }

  async function handleAudioError() {
    if (!currentClip) return;
    try {
      const newUrl = await resolveAudioUrl(currentClip.s3Key);
      setClips(prev => prev.map((c, i) => i === clipIndex ? { ...c, audioUrl: newUrl } : c));
    } catch (e) {
      console.error('Failed to refresh audio URL:', e);
    }
  }

  async function handleSubmit() {
    if (!testResultId || !testId || !test) return;
    if (isSubmittingRef.current) return; // prevent double-submit
    isSubmittingRef.current = true;
    setPhase('submitting');

    try {
      // Create/update Transcription records (server-side filter)
      const transRes = await client.models.Transcription.list({
        filter: { testResultId: { eq: testResultId } },
      });
      const existing = transRes.data ?? [];

      const transcriptionPayload: Array<{ id: string; audioAssetId: string; submittedText: string; sortOrder: number }> = [];

      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const submittedText = transcriptions[clip.audioAssetId] ?? '';
        const existingTrans = existing.find(t => t.audioAssetId === clip.audioAssetId);

        if (existingTrans) {
          await client.models.Transcription.update({ id: existingTrans.id, submittedText });
          transcriptionPayload.push({ id: existingTrans.id, audioAssetId: clip.audioAssetId, submittedText, sortOrder: i + 1 });
        } else {
          const created = await client.models.Transcription.create({
            testResultId,
            audioAssetId: clip.audioAssetId,
            submittedText,
            sortOrder: i + 1,
          });
          if (created.data?.id) {
            transcriptionPayload.push({ id: created.data.id, audioAssetId: clip.audioAssetId, submittedText, sortOrder: i + 1 });
          }
        }
      }

      // WER calculated server-side via Lambda — referenceTranscription never sent to client
      const werResult = await client.mutations.calculateWer({
        testResultId,
        transcriptions: JSON.stringify(transcriptionPayload),
        minAccuracy: test.minAccuracy,
        testId,
      });

      const resultData = werResult.data as { overallWer: number; passed: boolean };
      setFinalResult({ overallWer: resultData.overallWer, passed: resultData.passed });
      setPhase('result');
    } catch (e) {
      console.error(e);
      alert('Submission failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
      setPhase('taking');
    } finally {
      isSubmittingRef.current = false;
    }
  }

  if (phase === 'expired') {
    return (
      <div className="flex items-center justify-center h-64">
        <GlassCard className="p-8 text-center max-w-md">
          <p className="text-warning text-lg font-semibold mb-2">This test has expired</p>
          <p className="text-base-content/40 text-sm">Redirecting you to the dashboard…</p>
        </GlassCard>
      </div>
    );
  }

  if (phase === 'loading') {
    return (
      <div className="space-y-4">
        <div className="card h-24 skeleton" />
        <div className="card h-64 skeleton" />
      </div>
    );
  }

  if (phase === 'result' && finalResult) {
    const accuracy = (1 - Math.min(finalResult.overallWer, 1)) * 100;
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <GlassCard className="p-8 text-center">
          <div className={`text-6xl font-bold mb-4 ${finalResult.passed ? 'text-success' : 'text-error'}`}>
            {finalResult.passed ? '✓' : '✗'}
          </div>
          <h2 className="text-2xl font-bold text-base-content mb-2">
            {finalResult.passed ? 'Congratulations!' : 'Better luck next time'}
          </h2>
          <p className="text-base-content/60 mb-6">
            Your accuracy: <span className="text-base-content font-bold">{accuracy.toFixed(1)}%</span>
          </p>
          <StatusBadge status={finalResult.passed} className="text-base px-4 py-1" />
          <div className="mt-8 flex gap-3 justify-center">
            <button
              onClick={() => navigate('/transcriber/results')}
              className="btn btn-primary btn-sm"
            >
              View My Results
            </button>
            <button
              onClick={() => navigate('/transcriber/dashboard')}
              className="btn btn-ghost btn-sm"
            >
              Back to Dashboard
            </button>
          </div>
        </GlassCard>
      </div>
    );
  }

  if (phase === 'submitting') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <Loader2 size={40} className="animate-spin mx-auto" style={{ color: 'oklch(var(--p))' }} />
          <p className="text-base-content/60">Scoring your transcriptions…</p>
        </div>
      </div>
    );
  }

  if (phase === 'taking' && clips.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <GlassCard className="p-8 text-center max-w-md">
          <p className="text-error text-lg font-semibold mb-2">No audio clips available</p>
          <p className="text-base-content/40 text-sm">This test has no clips. Contact a project admin.</p>
          <button onClick={() => navigate('/transcriber/dashboard')} className="btn btn-ghost btn-sm mt-4">
            Back to Dashboard
          </button>
        </GlassCard>
      </div>
    );
  }

  if (!currentClip) return null;

  const isLast = clipIndex === clips.length - 1;
  const currentText = transcriptions[currentClip.audioAssetId] ?? '';
  const allFilled = clips.every(c => (transcriptions[c.audioAssetId] ?? '').trim().length > 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Test header */}
      <GlassCard className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-base-content">{test?.name}</h1>
            <p className="text-base-content/40 text-sm mt-0.5">Min accuracy required: {Math.round((test?.minAccuracy ?? 0) * 100)}%</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-base-content/60">Clip {clipIndex + 1} of {clips.length}</p>
            <div className="flex gap-1 mt-2">
              {clips.map((c, i) => (
                <div
                  key={c.audioAssetId}
                  className="h-1.5 w-8 rounded-full transition-all"
                  style={{
                    background: i === clipIndex
                      ? 'oklch(var(--p))'
                      : (transcriptions[c.audioAssetId] ?? '').trim()
                      ? 'oklch(var(--su) / 0.6)'
                      : 'oklch(var(--bc) / 0.2)',
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Audio player */}
      <GlassCard className="p-5">
        <p className="text-xs text-base-content/40 mb-3">
          Clip {clipIndex + 1}: {currentClip.filename}
        </p>
        {currentClip.audioUrl && (
          <AudioPlayer
            key={currentClip.audioAssetId}
            src={currentClip.audioUrl}
            onEnded={() => textareaRef.current?.focus()}
            onError={handleAudioError}
          />
        )}
      </GlassCard>

      {/* Transcription input */}
      <GlassCard className="p-5">
        <label className="block text-sm font-medium text-base-content/60 mb-2">
          Your Transcription
        </label>
        <textarea
          ref={textareaRef}
          rows={5}
          className="textarea textarea-bordered w-full resize-none"
          placeholder="Type what you hear in the audio clip…"
          value={currentText}
          onChange={e => handleTextChange(e.target.value)}
          onPaste={e => e.preventDefault()}
          onDrop={e => e.preventDefault()}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
        />
        <p className="text-xs text-base-content/30 mt-1">{currentText.split(/\s+/).filter(Boolean).length} words</p>
      </GlassCard>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={handlePrev}
          disabled={clipIndex === 0}
          className="btn btn-ghost btn-sm gap-2 disabled:opacity-30"
        >
          <ArrowLeft size={16} /> Previous
        </button>

        {isLast ? (
          <button
            onClick={handleSubmit}
            disabled={!allFilled}
            className="btn btn-primary btn-sm gap-2 disabled:opacity-50"
          >
            <Send size={16} /> Submit Test
          </button>
        ) : (
          <button
            onClick={handleNext}
            className="btn btn-primary btn-sm gap-2"
          >
            Next <ArrowRight size={16} />
          </button>
        )}
      </div>

      {isLast && !allFilled && (
        <p className="text-warning/60 text-xs text-center">
          Please complete all clips before submitting.
        </p>
      )}
    </div>
  );
}
