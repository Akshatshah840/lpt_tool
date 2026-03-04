import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Users, CheckCircle2, Loader2, Eye,
  FileAudio, Plus, X, Upload, Mic,
} from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAmplifyData } from '@/hooks/useAmplifyData';
import { formatDate, werToAccuracy } from '@/lib/utils';
import { LANGUAGES } from '@/lib/languages';

interface ClipRow {
  id: string;
  filename: string;
  referenceTranscription?: string | null;
  fileSizeKb?: number | null;
}

interface UserRow {
  userId: string;
  userName?: string | null;
  userEmail?: string | null;
  resultId: string;
  status: string;
  overallWer?: number | null;
  passed?: boolean | null;
  completedAt?: string | null;
}

interface ProjectInfo {
  id: string;
  name: string;
  description?: string | null;
  status: string;
}

interface TestInfo {
  id: string;
  languageCode?: string | null;
  minAccuracy?: number | null;
  expiresAt?: string | null;
}

export function ProjectAdminProjectUsers() {
  const { projectId } = useParams<{ projectId: string }>();
  const client = useAmplifyData();

  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [test, setTest] = useState<TestInfo | null>(null);
  const [clips, setClips] = useState<ClipRow[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  // Add clip form state
  const [showAddClip, setShowAddClip] = useState(false);
  const [clipFile, setClipFile] = useState<File | null>(null);
  const [clipRef, setClipRef] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    if (!projectId) return;
    try {
      const [projRes, testsRes, assetsRes, taaRes, resultsRes] = await Promise.all([
        client.models.Project.get({ id: projectId }),
        client.models.Test.list(),
        client.models.AudioAsset.list(),
        client.models.TestAudioAsset.list(),
        client.models.TestResult.list(),
      ]);

      const proj = projRes.data;
      if (!proj) return;
      setProject({
        id: proj.id,
        name: proj.name,
        description: proj.description,
        status: proj.status ?? 'OPEN',
      });

      const foundTest = (testsRes.data ?? []).find(
        (t: { projectId: string }) => t.projectId === projectId
      ) as TestInfo | undefined;
      setTest(foundTest ?? null);

      // Clips: AudioAssets for this project, filtered via TestAudioAsset join
      if (foundTest) {
        const taaIds = new Set(
          (taaRes.data ?? [])
            .filter((taa: { testId: string }) => taa.testId === foundTest.id)
            .map((taa: { audioAssetId: string }) => taa.audioAssetId)
        );
        const projectClips = (assetsRes.data ?? []).filter(
          (a: { id: string; projectId: string }) => a.projectId === projectId || taaIds.has(a.id)
        );
        setClips(projectClips.map((a: {
          id: string; filename: string;
          referenceTranscription?: string | null; fileSizeKb?: number | null;
        }) => ({
          id: a.id,
          filename: a.filename,
          referenceTranscription: a.referenceTranscription,
          fileSizeKb: a.fileSizeKb,
        })));

        const testResults = (resultsRes.data ?? []).filter(
          (r: { testId: string }) => r.testId === foundTest.id
        );
        setUsers(testResults.map((r: {
          id: string; userId: string; userName?: string | null;
          userEmail?: string | null; status: string;
          overallWer?: number | null; passed?: boolean | null;
          completedAt?: string | null;
        }) => ({
          userId: r.userId,
          userName: r.userName,
          userEmail: r.userEmail,
          resultId: r.id,
          status: r.status,
          overallWer: r.overallWer,
          passed: r.passed,
          completedAt: r.completedAt,
        })));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [projectId]);

  async function toggleStatus() {
    if (!project || !test) return;
    setToggling(true);
    try {
      const newStatus = project.status === 'OPEN' ? 'CLOSED' : 'OPEN';
      await client.models.Project.update({ id: project.id, status: newStatus });
      await client.models.Test.update({ id: test.id, status: newStatus });
      setProject(prev => prev ? { ...prev, status: newStatus } : prev);
    } finally {
      setToggling(false);
    }
  }

  async function handleAddClip() {
    if (!clipFile || !clipRef.trim() || !projectId || !test) return;
    setUploading(true);
    try {
      const s3Key = `audio/${projectId}/${Date.now()}-${clipFile.name}`;
      const { uploadData } = await import('aws-amplify/storage');
      await uploadData({ path: s3Key, data: clipFile }).result;
      const assetRes = await client.models.AudioAsset.create({
        projectId,
        filename: clipFile.name,
        s3Key,
        referenceTranscription: clipRef,
        languageCode: test.languageCode ?? undefined,
        fileSizeKb: Math.round(clipFile.size / 1024),
      });
      if (assetRes.data?.id) {
        const taaCount = clips.length;
        await client.models.TestAudioAsset.create({
          testId: test.id,
          audioAssetId: assetRes.data.id,
          sortOrder: taaCount + 1,
        });
      }
      setClipFile(null);
      setClipRef('');
      setShowAddClip(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await load();
    } catch (e) {
      alert('Upload failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setUploading(false);
    }
  }

  const completed  = users.filter(u => u.status === 'COMPLETED');
  const inProgress = users.filter(u => u.status === 'IN_PROGRESS');
  const passed     = completed.filter(u => u.passed === true);
  const isOpen     = project?.status === 'OPEN';

  const langLabel = test?.languageCode
    ? (LANGUAGES.find(l => l.code === test.languageCode)?.label ?? test.languageCode.toUpperCase())
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link to="/project/projects" className="btn btn-ghost btn-sm btn-square">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-base-content">
                {loading ? '…' : (project?.name ?? 'Project Detail')}
              </h1>
              {project && <StatusBadge status={project.status as 'OPEN' | 'CLOSED'} />}
            </div>
            <p className="text-base-content/40 text-sm mt-0.5">Project detail</p>
          </div>
        </div>
        {project && test && (
          <button
            onClick={toggleStatus}
            disabled={toggling}
            className={`btn btn-sm gap-2 disabled:opacity-40 ${isOpen ? 'btn-outline btn-error' : 'btn-success'}`}
          >
            {toggling ? <Loader2 size={14} className="animate-spin" /> : null}
            {isOpen ? 'Close Project' : 'Open Project'}
          </button>
        )}
      </div>

      {/* Project Info */}
      {!loading && project && test && (
        <GlassCard className="p-5">
          <h2 className="text-sm font-semibold text-base-content/50 uppercase tracking-wider mb-3">Project Info</h2>
          <div className="flex flex-wrap gap-6 text-sm">
            {langLabel && (
              <div>
                <span className="text-base-content/40 text-xs block mb-0.5">Language</span>
                <span className="font-medium text-base-content">{langLabel}</span>
              </div>
            )}
            <div>
              <span className="text-base-content/40 text-xs block mb-0.5">Min Accuracy</span>
              <span className="font-medium text-base-content">
                {test.minAccuracy != null ? `${Math.round(test.minAccuracy * 100)}%` : '—'}
              </span>
            </div>
            <div>
              <span className="text-base-content/40 text-xs block mb-0.5">Expires</span>
              <span className="font-medium text-base-content">
                {test.expiresAt ? formatDate(test.expiresAt) : '—'}
              </span>
            </div>
          </div>
          {project.description && (
            <p className="text-base-content/50 text-sm mt-3 border-t border-base-content/[0.06] pt-3">
              {project.description}
            </p>
          )}
        </GlassCard>
      )}

      {/* Audio Clips */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-base-content">
            Audio Clips
            <span className="ml-2 text-base-content/30 text-sm font-normal">({clips.length})</span>
          </h2>
          {test && (
            <button
              onClick={() => setShowAddClip(v => !v)}
              className="btn btn-ghost btn-sm gap-1.5 border border-base-content/10"
            >
              {showAddClip ? <X size={14} /> : <Plus size={14} />}
              {showAddClip ? 'Cancel' : 'Add Clip'}
            </button>
          )}
        </div>

        {showAddClip && (
          <GlassCard className="p-5 mb-3 border border-primary/20">
            <h3 className="text-sm font-semibold text-base-content/60 mb-4">New Audio Clip</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-base-content/40 mb-1.5">Audio File *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={e => setClipFile(e.target.files?.[0] ?? null)}
                  className="file-input file-input-bordered w-full file-input-sm"
                />
                {clipFile && (
                  <p className="text-xs text-base-content/30 mt-1">
                    {clipFile.name} ({Math.round(clipFile.size / 1024)} KB)
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs text-base-content/40 mb-1.5">Reference Transcription (ground truth) *</label>
                <textarea
                  rows={2}
                  value={clipRef}
                  onChange={e => setClipRef(e.target.value)}
                  placeholder="Type the exact text that should be heard…"
                  className="textarea textarea-bordered w-full resize-none"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAddClip(false)} className="btn btn-ghost btn-sm">Cancel</button>
                <button
                  onClick={handleAddClip}
                  disabled={!clipFile || !clipRef.trim() || uploading}
                  className="btn btn-primary btn-sm gap-2 disabled:opacity-40"
                >
                  {uploading
                    ? <><Loader2 size={13} className="animate-spin" /> Uploading…</>
                    : <><Upload size={13} /> Upload Clip</>
                  }
                </button>
              </div>
            </div>
          </GlassCard>
        )}

        {loading ? (
          <div className="space-y-2">{[...Array(2)].map((_, i) => <div key={i} className="h-20 skeleton rounded-xl" />)}</div>
        ) : clips.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <Mic size={32} className="text-base-content/20 mx-auto mb-3" />
            <p className="text-base-content/40 text-sm">No audio clips yet</p>
          </GlassCard>
        ) : (
          <div className="space-y-2">
            {clips.map((clip, i) => (
              <GlassCard key={clip.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-primary/10 flex-shrink-0 mt-0.5">
                    <FileAudio size={16} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-base-content truncate">{clip.filename}</span>
                      {clip.fileSizeKb && (
                        <span className="text-xs text-base-content/30 flex-shrink-0">{clip.fileSizeKb} KB</span>
                      )}
                      <span className="text-xs text-base-content/20 flex-shrink-0">#{i + 1}</span>
                    </div>
                    {clip.referenceTranscription && (
                      <p className="text-xs text-base-content/50 mt-1 italic line-clamp-2">
                        "{clip.referenceTranscription}"
                      </p>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Users',  value: users.length,       color: '#6366f1' },
          { label: 'In Progress',  value: inProgress.length,  color: '#eab308' },
          { label: 'Completed',    value: completed.length,   color: '#22c55e' },
          { label: 'Pass Rate',    value: completed.length ? `${Math.round(passed.length / completed.length * 100)}%` : '—', color: '#f97316' },
        ].map(s => (
          <GlassCard key={s.label} glow className="p-5">
            <p className="text-xs text-base-content/50">{s.label}</p>
            <p className="text-2xl font-bold mt-0.5" style={{ color: s.color }}>
              {loading ? '—' : s.value}
            </p>
          </GlassCard>
        ))}
      </div>

      {/* Users table */}
      <div>
        <h2 className="text-lg font-semibold text-base-content mb-3">
          <Users size={18} className="inline mr-2 text-base-content/40" />
          Users
        </h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        ) : users.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <Users size={40} className="text-base-content/20 mx-auto mb-3" />
            <p className="text-base-content/40 font-medium">No users have started this project yet</p>
            <p className="text-base-content/25 text-sm mt-1">
              Once transcribers begin the test, they will appear here.
            </p>
          </GlassCard>
        ) : (
          <GlassCard className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    {['User', 'Status', 'Accuracy', 'Result', 'Completed', ''].map(h => (
                      <th key={h}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.userId}>
                      <td>
                        <p className="text-sm font-medium text-base-content">{u.userName ?? '—'}</p>
                        <p className="text-xs text-base-content/40">{u.userEmail ?? ''}</p>
                      </td>
                      <td>
                        <StatusBadge status={u.status as 'IN_PROGRESS' | 'COMPLETED'} />
                      </td>
                      <td className="text-sm text-base-content/60">
                        {u.status === 'COMPLETED' ? werToAccuracy(u.overallWer) : '—'}
                      </td>
                      <td>
                        {u.status === 'COMPLETED' ? (
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2
                              size={14}
                              className={u.passed ? 'text-success' : 'text-error'}
                            />
                            <StatusBadge status={u.passed} />
                          </div>
                        ) : (
                          <span className="text-base-content/20 text-xs">—</span>
                        )}
                      </td>
                      <td className="text-xs text-base-content/40">
                        {u.status === 'COMPLETED' ? formatDate(u.completedAt) : '—'}
                      </td>
                      <td className="text-right">
                        {u.status === 'COMPLETED' && (
                          <Link
                            to={`/project/results/${u.resultId}`}
                            className="btn btn-primary btn-xs gap-1"
                          >
                            <Eye size={12} /> View
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
    </div>
  );
}
