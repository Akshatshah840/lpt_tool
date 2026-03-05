import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, FolderOpen, FolderX, Upload, Trash2,
  Loader2, Globe, ChevronRight, X, CheckCircle2, FileAudio,
} from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAmplifyData } from '@/hooks/useAmplifyData';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { LANGUAGES } from '@/lib/languages';

interface PendingClip {
  file: File | null;
  reference: string;
  description: string;
  uploadProgress: number;
  uploaded: boolean;
}

interface ProjectRow {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  languageCode?: string;
  clipCount: number;
  userCount: number;
  completedCount: number;
  testId?: string;
  createdAt: string;
}

const defaultClip = (): PendingClip => ({
  file: null, reference: '', description: '', uploadProgress: 0, uploaded: false,
});

// ─── Create Project Modal ────────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void;
  onCreated: () => void;
}

function CreateProjectModal({ onClose, onCreated }: CreateModalProps) {
  const client = useAmplifyData();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('');
  const [description, setDescription] = useState('');
  const [minAccuracy, setMinAccuracy] = useState(75);
  const [expiresAt, setExpiresAt] = useState('');
  const [clips, setClips] = useState<PendingClip[]>([defaultClip()]);
  const [publishing, setPublishing] = useState(false);

  function updateClip(i: number, patch: Partial<PendingClip>) {
    setClips(prev => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  }

  function removeClip(i: number) {
    setClips(prev => prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i));
  }

  async function handlePublish() {
    if (!name || !language || clips.some(c => !c.file || !c.reference.trim())) return;
    setPublishing(true);
    try {
      // 1. Create project
      const projRes = await client.models.Project.create({ name, description, status: 'OPEN' });
      const projectId = projRes.data?.id;
      if (!projectId) throw new Error('Failed to create project');

      // 2. Upload audio assets
      const assetIds: string[] = [];
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        if (!clip.file) continue;
        const s3Key = `audio/${projectId}/${Date.now()}-${clip.file.name}`;
        const { uploadData } = await import('aws-amplify/storage');
        await uploadData({
          path: s3Key,
          data: clip.file,
          options: {
            onProgress: ({ transferredBytes, totalBytes }) => {
              if (totalBytes) updateClip(i, { uploadProgress: Math.round(transferredBytes / totalBytes * 100) });
            },
          },
        }).result;
        const assetRes = await client.models.AudioAsset.create({
          projectId,
          filename: clip.file.name,
          s3Key,
          referenceTranscription: clip.reference,
          languageCode: language,
          description: clip.description,
          fileSizeKb: Math.round(clip.file.size / 1024),
        });
        if (assetRes.data?.id) assetIds.push(assetRes.data.id);
        updateClip(i, { uploaded: true });
      }

      // 3. Create test
      const testRes = await client.models.Test.create({
        projectId,
        name,
        languageCode: language,
        status: 'OPEN',
        minAccuracy: minAccuracy / 100,
        description,
        expiresAt: expiresAt || null,
      });
      const testId = testRes.data?.id;

      // 4. Link audio assets to test
      if (testId) {
        await Promise.all(
          assetIds.map((audioAssetId, idx) =>
            client.models.TestAudioAsset.create({ testId, audioAssetId, sortOrder: idx + 1 })
          )
        );
      }

      onCreated();
    } catch (e) {
      alert('Error: ' + (e instanceof Error ? e.message : 'Unknown'));
    } finally {
      setPublishing(false);
    }
  }

  const step1Valid = name.trim().length > 0 && language.length > 0;
  const step2Valid = clips.every(c => c.file !== null && c.reference.trim().length > 0);

  return (
    <dialog className="modal modal-open">
      <div className="modal-box max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg text-base-content">Create Project</h3>
            <p className="text-base-content/40 text-sm mt-0.5">Step {step} of 2</p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm btn-square">
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <ul className="steps steps-horizontal w-full mb-6">
          <li className={cn('step', step >= 1 && 'step-primary')}>Project Info</li>
          <li className={cn('step', step >= 2 && 'step-primary')}>Audio Clips</li>
        </ul>

        {step === 1 && (
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2">
                Project Name *
              </label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Hindi Proficiency — Q2 2026"
                className="input input-bordered w-full"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2">
                <Globe size={12} /> Language *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {LANGUAGES.map(l => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setLanguage(l.code)}
                    className={cn(
                      'btn gap-2 flex-col h-auto py-3',
                      language === l.code ? 'btn-primary' : 'btn-outline btn-ghost'
                    )}
                  >
                    <span className="text-lg">{l.flag}</span>
                    <span className="text-xs">{l.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2">
                  Min Accuracy: {minAccuracy}%
                </label>
                <input
                  type="range" min={10} max={100} step={5}
                  value={minAccuracy}
                  onChange={e => setMinAccuracy(Number(e.target.value))}
                  className="range range-primary range-xs mt-1"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2">
                  Expires At (optional)
                </label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={e => setExpiresAt(e.target.value)}
                  className="input input-bordered w-full"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2">
                Description (optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="textarea textarea-bordered w-full resize-none"
                placeholder="Brief description of this project…"
              />
            </div>

            <div className="modal-action mt-0">
              <button onClick={onClose} className="btn btn-ghost">Cancel</button>
              <button
                onClick={() => setStep(2)}
                disabled={!step1Valid}
                className="btn btn-primary gap-2 disabled:opacity-40"
              >
                Add Audio Clips <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <p className="text-base-content/50 text-sm">
              Upload audio clips and provide the reference transcription for each.
            </p>

            {clips.map((clip, i) => (
              <div key={i} className="p-4 rounded-xl bg-base-content/[0.04] border border-base-content/[0.08] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-base-content/60">Clip {i + 1}</span>
                  <div className="flex items-center gap-2">
                    {clip.uploaded && <CheckCircle2 size={15} className="text-success" />}
                    {clips.length > 1 && (
                      <button
                        onClick={() => removeClip(i)}
                        className="btn btn-ghost btn-xs btn-square text-base-content/30 hover:text-error hover:bg-error/10"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-base-content/40 mb-1.5">Audio File *</label>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={e => updateClip(i, { file: e.target.files?.[0] ?? null })}
                    className="file-input file-input-bordered w-full file-input-sm"
                  />
                  {clip.file && <p className="text-xs text-base-content/30 mt-1">{clip.file.name} ({Math.round(clip.file.size / 1024)} KB)</p>}
                </div>

                <div>
                  <label className="block text-xs text-base-content/40 mb-1.5">Reference Transcription (ground truth) *</label>
                  <textarea
                    rows={2}
                    value={clip.reference}
                    onChange={e => updateClip(i, { reference: e.target.value })}
                    placeholder="Type the exact text that should be heard in this audio…"
                    className="textarea textarea-bordered w-full resize-none"
                  />
                </div>

                {clip.uploadProgress > 0 && clip.uploadProgress < 100 && (
                  <div>
                    <div className="flex justify-between text-xs text-base-content/30 mb-1">
                      <span>Uploading…</span><span>{clip.uploadProgress}%</span>
                    </div>
                    <progress
                      className="progress progress-primary w-full"
                      value={clip.uploadProgress}
                      max="100"
                    />
                  </div>
                )}
              </div>
            ))}

            <button
              onClick={() => setClips(prev => [...prev, defaultClip()])}
              className="btn btn-ghost btn-outline w-full border-dashed gap-2 text-base-content/40"
            >
              <Plus size={14} /> Add another clip
            </button>

            <div className="modal-action">
              <button onClick={() => setStep(1)} className="btn btn-ghost">← Back</button>
              <button
                onClick={handlePublish}
                disabled={!step2Valid || publishing}
                className="btn btn-primary gap-2 disabled:opacity-40"
              >
                {publishing ? <><Loader2 size={15} className="animate-spin" /> Publishing…</> : <><Upload size={15} /> Publish Project</>}
              </button>
            </div>
          </div>
        )}
      </div>
      <form method="dialog" className="modal-backdrop"><button onClick={onClose}>close</button></form>
    </dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ProjectAdminProjectsManager() {
  const client = useAmplifyData();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  async function load() {
    const [projRes, testsRes, clipsRes, resultsRes] = await Promise.all([
      client.models.Project.list(),
      client.models.Test.list(),
      client.models.TestAudioAsset.list({ limit: 1000 }),
      client.models.TestResult.list({ limit: 1000 }),
    ]);
    const allProjects = projRes.data ?? [];
    const allTests    = testsRes.data ?? [];
    const allClips    = clipsRes.data ?? [];
    const allResults  = resultsRes.data ?? [];

    const rows: ProjectRow[] = allProjects.map((p: { id: string; name: string; description?: string | null; status: string; createdAt: string }) => {
      const test = allTests.find((t: { projectId: string }) => t.projectId === p.id);
      const clipCount = test ? allClips.filter((c: { testId: string }) => c.testId === test.id).length : 0;
      const testResults = test ? allResults.filter((r: { testId: string }) => r.testId === test.id) : [];
      const uniqueUsers = new Set(testResults.map((r: { userId: string }) => r.userId));
      const completedCount = testResults.filter((r: { status: string }) => r.status === 'COMPLETED').length;
      return {
        id: p.id, name: p.name, description: p.description,
        status: p.status ?? 'OPEN', createdAt: p.createdAt,
        clipCount, testId: test?.id,
        userCount: uniqueUsers.size, completedCount,
        languageCode: test?.languageCode,
      };
    });

    setProjects(rows);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleStatus(p: ProjectRow) {
    setToggling(p.id);
    const newStatus = p.status === 'OPEN' ? 'CLOSED' : 'OPEN';
    await client.models.Project.update({ id: p.id, status: newStatus });
    if (p.testId) {
      await client.models.Test.update({ id: p.testId, status: newStatus });
    }
    setProjects(prev => prev.map(r => r.id === p.id ? { ...r, status: newStatus } : r));
    setToggling(null);
  }

  async function deleteProject(p: ProjectRow) {
    if (!confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      // Cascade: delete Test children first
      const testsRes = await client.models.Test.list({ filter: { projectId: { eq: p.id } } });
      for (const test of testsRes.data ?? []) {
        const [taaRes, trRes] = await Promise.all([
          client.models.TestAudioAsset.list({ filter: { testId: { eq: test.id } } }),
          client.models.TestResult.list({ filter: { testId: { eq: test.id } } }),
        ]);
        await Promise.all((taaRes.data ?? []).map((taa: { id: string }) => client.models.TestAudioAsset.delete({ id: taa.id })));
        for (const tr of trRes.data ?? []) {
          const transRes = await client.models.Transcription.list({
            filter: { testResultId: { eq: tr.id } },
          });
          await Promise.all((transRes.data ?? []).map((t: { id: string }) => client.models.Transcription.delete({ id: t.id })));
          await client.models.TestResult.delete({ id: tr.id });
        }
        await client.models.Test.delete({ id: test.id });
      }
      // Delete AudioAssets for this project (with S3 cleanup)
      const assetsRes = await client.models.AudioAsset.list({ filter: { projectId: { eq: p.id } } });
      const { remove } = await import('aws-amplify/storage');
      await Promise.all((assetsRes.data ?? []).map(async (a: { id: string; s3Key: string }) => {
        try { await remove({ path: a.s3Key }); } catch { /* ignore if already gone */ }
        await client.models.AudioAsset.delete({ id: a.id });
      }));
      // Delete Project
      await client.models.Project.delete({ id: p.id });
      setProjects(prev => prev.filter(r => r.id !== p.id));
    } catch (e) {
      alert('Delete failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Projects</h1>
          <p className="text-base-content/40 text-sm mt-1">Create and manage transcription projects</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn btn-primary btn-sm gap-2"
        >
          <Plus size={16} /> New Project
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="card p-6 h-24 skeleton" />)}</div>
      ) : projects.length === 0 ? (
        <div className="card p-16 text-center">
          <FolderOpen size={40} className="text-base-content/20 mx-auto mb-4" />
          <p className="text-base-content/40 font-medium">No projects yet</p>
          <p className="text-base-content/25 text-sm mt-1">Click "New Project" to create your first one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map(p => {
            const isOpen = p.status === 'OPEN';
            return (
              <GlassCard key={p.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div
                    className="flex items-start gap-4 flex-1 min-w-0 cursor-pointer"
                    onClick={() => navigate(`/project/projects/${p.id}`)}
                  >
                    <div className={`p-2.5 rounded-xl flex-shrink-0 ${isOpen ? 'bg-primary/15' : 'bg-base-content/[0.05]'}`}>
                      {isOpen
                        ? <FolderOpen size={20} className="text-primary" />
                        : <FolderX size={20} className="text-base-content/30" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-base-content">{p.name}</h3>
                        <StatusBadge status={p.status as 'OPEN' | 'CLOSED'} />
                        {p.languageCode && (
                          <span className="badge badge-ghost badge-sm">
                            {p.languageCode.toUpperCase()}
                          </span>
                        )}
                      </div>
                      {p.description && <p className="text-base-content/40 text-sm mt-0.5 truncate">{p.description}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs text-base-content/30">
                        <span className="flex items-center gap-1"><FileAudio size={11} /> {p.clipCount} clips</span>
                        <span>{p.userCount} user{p.userCount !== 1 ? 's' : ''}</span>
                        <span>{p.completedCount} completed</span>
                        <span>{formatDate(p.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={e => { e.stopPropagation(); toggleStatus(p); }}
                      disabled={toggling === p.id}
                      className="btn btn-ghost btn-xs border border-base-content/10 disabled:opacity-40"
                    >
                      {toggling === p.id ? '…' : isOpen ? 'Close' : 'Open'}
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); deleteProject(p); }}
                      className="btn btn-ghost btn-square btn-xs text-base-content/20 hover:text-error hover:bg-error/10"
                      title="Delete project"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { setShowCreate(false); load(); }}
        />
      )}
    </div>
  );
}
