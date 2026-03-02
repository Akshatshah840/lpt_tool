import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus, FolderOpen, FolderX, Upload, Trash2, ArrowRight,
  Loader2, Globe, ChevronRight, X, CheckCircle2, FileAudio,
} from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAmplifyData } from '@/hooks/useAmplifyData';
import { formatDate } from '@/lib/utils';

const LANGUAGES = [
  { code: 'hi', label: 'Hindi',   flag: '🇮🇳' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'es', label: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', label: 'French',  flag: '🇫🇷' },
  { code: 'de', label: 'German',  flag: '🇩🇪' },
];

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
          key: s3Key, data: clip.file,
          options: { onProgress: ({ transferredBytes, totalBytes }) => {
            if (totalBytes) updateClip(i, { uploadProgress: Math.round(transferredBytes / totalBytes * 100) });
          }},
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <GlassCard className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Create Project</h2>
              <p className="text-white/40 text-sm mt-0.5">Step {step} of 2</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all">
              <X size={18} />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex gap-2 mb-6">
            {[1, 2].map(s => (
              <div key={s} className={`h-1 flex-1 rounded-full transition-all ${s <= step ? 'bg-indigo-500' : 'bg-white/10'}`} />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                  Project Name *
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Hindi Proficiency — Q2 2026"
                  className="glass-input w-full px-4 py-3 text-sm rounded-xl"
                />
              </div>

              <div>
                <label className="flex items-center gap-2 text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                  <Globe size={12} /> Language *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => setLanguage(l.code)}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                        language === l.code
                          ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                          : 'bg-white/[0.04] border-white/10 text-white/50 hover:bg-white/8 hover:text-white/80'
                      }`}
                    >
                      <span className="text-lg">{l.flag}</span>
                      <span className="text-xs">{l.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                    Min Accuracy: {minAccuracy}%
                  </label>
                  <input
                    type="range" min={10} max={100} step={5}
                    value={minAccuracy}
                    onChange={e => setMinAccuracy(Number(e.target.value))}
                    className="w-full accent-indigo-500 mt-1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                    Expires At (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={expiresAt}
                    onChange={e => setExpiresAt(e.target.value)}
                    className="glass-input w-full px-3 py-2.5 text-sm rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                  Description (optional)
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="glass-input w-full px-4 py-3 text-sm rounded-xl resize-none"
                  placeholder="Brief description of this project…"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={() => setStep(2)}
                  disabled={!step1Valid}
                  className="flex items-center gap-2 px-5 py-2.5 btn-gradient rounded-xl text-sm font-semibold disabled:opacity-40"
                >
                  Add Audio Clips <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <p className="text-white/50 text-sm">
                Upload audio clips and provide the reference transcription for each.
              </p>

              {clips.map((clip, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/[0.04] border border-white/8 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white/60">Clip {i + 1}</span>
                    <div className="flex items-center gap-2">
                      {clip.uploaded && <CheckCircle2 size={15} className="text-emerald-400" />}
                      {clips.length > 1 && (
                        <button onClick={() => removeClip(i)} className="p-1 text-white/30 hover:text-red-400 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Audio File *</label>
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={e => updateClip(i, { file: e.target.files?.[0] ?? null })}
                      className="glass-input w-full px-3 py-2 text-sm rounded-lg file:text-indigo-400 file:bg-transparent file:border-0 file:cursor-pointer file:mr-2"
                    />
                    {clip.file && <p className="text-xs text-white/30 mt-1">{clip.file.name} ({Math.round(clip.file.size / 1024)} KB)</p>}
                  </div>

                  <div>
                    <label className="block text-xs text-white/40 mb-1.5">Reference Transcription (ground truth) *</label>
                    <textarea
                      rows={2}
                      value={clip.reference}
                      onChange={e => updateClip(i, { reference: e.target.value })}
                      placeholder="Type the exact text that should be heard in this audio…"
                      className="glass-input w-full px-3 py-2 text-sm rounded-lg resize-none"
                    />
                  </div>

                  {clip.uploadProgress > 0 && clip.uploadProgress < 100 && (
                    <div>
                      <div className="flex justify-between text-xs text-white/30 mb-1">
                        <span>Uploading…</span><span>{clip.uploadProgress}%</span>
                      </div>
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${clip.uploadProgress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={() => setClips(prev => [...prev, defaultClip()])}
                className="w-full py-2.5 rounded-xl border border-dashed border-white/15 text-white/40 hover:text-white/70 hover:border-white/25 text-sm transition-all flex items-center justify-center gap-2"
              >
                <Plus size={14} /> Add another clip
              </button>

              <div className="flex items-center justify-between pt-2">
                <button onClick={() => setStep(1)} className="text-sm text-white/40 hover:text-white transition-colors">
                  ← Back
                </button>
                <button
                  onClick={handlePublish}
                  disabled={!step2Valid || publishing}
                  className="flex items-center gap-2 px-5 py-2.5 btn-gradient rounded-xl text-sm font-semibold disabled:opacity-40"
                >
                  {publishing ? <><Loader2 size={15} className="animate-spin" /> Publishing…</> : <><Upload size={15} /> Publish Project</>}
                </button>
              </div>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ProjectAdminProjectsManager() {
  const client = useAmplifyData();
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);

  async function load() {
    const [projRes, testsRes, clipsRes, resultsRes] = await Promise.all([
      client.models.Project.list(),
      client.models.Test.list(),
      client.models.TestAudioAsset.list(),
      client.models.TestResult.list(),
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
    await client.models.Project.delete({ id: p.id });
    setProjects(prev => prev.filter(r => r.id !== p.id));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-white/40 text-sm mt-1">Create and manage transcription projects</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 btn-gradient rounded-xl text-sm font-semibold"
        >
          <Plus size={16} /> New Project
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <GlassCard key={i} className="p-6 h-24 skeleton" />)}</div>
      ) : projects.length === 0 ? (
        <GlassCard className="p-16 text-center">
          <FolderOpen size={40} className="text-white/20 mx-auto mb-4" />
          <p className="text-white/40 font-medium">No projects yet</p>
          <p className="text-white/25 text-sm mt-1">Click "New Project" to create your first one.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {projects.map(p => {
            const isOpen = p.status === 'OPEN';
            return (
              <GlassCard key={p.id} className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className={`p-2.5 rounded-xl flex-shrink-0 ${isOpen ? 'bg-indigo-500/15' : 'bg-white/5'}`}>
                      {isOpen
                        ? <FolderOpen size={20} className="text-indigo-400" />
                        : <FolderX size={20} className="text-white/30" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-white">{p.name}</h3>
                        <StatusBadge status={p.status as 'OPEN' | 'CLOSED'} />
                        {p.languageCode && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-white/40">
                            {p.languageCode.toUpperCase()}
                          </span>
                        )}
                      </div>
                      {p.description && <p className="text-white/40 text-sm mt-0.5 truncate">{p.description}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs text-white/30">
                        <span className="flex items-center gap-1"><FileAudio size={11} /> {p.clipCount} clips</span>
                        <span>{p.userCount} user{p.userCount !== 1 ? 's' : ''}</span>
                        <span>{p.completedCount} completed</span>
                        <span>{formatDate(p.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => toggleStatus(p)}
                      disabled={toggling === p.id}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-white/10 text-white/50 hover:text-white hover:bg-white/10 transition-all disabled:opacity-40"
                    >
                      {toggling === p.id ? '…' : isOpen ? 'Close' : 'Open'}
                    </button>
                    <Link
                      to={`/project/projects/${p.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-indigo-500/15 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/25 transition-all"
                    >
                      View Users <ArrowRight size={11} />
                    </Link>
                    <button
                      onClick={() => deleteProject(p)}
                      className="p-1.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
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
