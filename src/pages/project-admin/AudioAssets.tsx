import { useEffect, useState } from 'react';
import { Upload, Trash2, FileAudio, Search, Loader2, Play, Pause } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { AudioPlayer } from '@/components/shared/AudioPlayer';
import { EmptyState } from '@/components/shared/EmptyState';
import { useAmplifyData } from '@/hooks/useAmplifyData';
import { formatDate, truncate } from '@/lib/utils';

async function uploadFile(
  key: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<void> {
  const { uploadData } = await import('aws-amplify/storage');
  await uploadData({
    path: key,
    data: file,
    options: {
      onProgress: ({ transferredBytes, totalBytes }) => {
        if (totalBytes) onProgress(Math.round((transferredBytes / totalBytes) * 100));
      },
    },
  }).result;
}

interface AudioAsset {
  id: string;
  projectId: string;
  filename: string;
  s3Key: string;
  referenceTranscription: string;
  languageCode: string;
  description?: string | null;
  fileSizeKb?: number | null;
  createdAt: string;
}

interface Project { id: string; name: string }

interface UploadFormProps {
  projects: Project[];
  onUploaded: () => void;
}

function UploadForm({ projects, onUploaded }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState('');
  const [language, setLanguage] = useState('en');
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const client = useAmplifyData();

  const LANGUAGES = ['en', 'en-US', 'en-GB', 'es', 'fr', 'de', 'zh', 'ja', 'ko', 'ar', 'hi', 'pt', 'ru', 'it'];

  async function handleUpload() {
    if (!file || !reference.trim() || !projectId) return;
    setUploading(true);
    try {
      const s3Key = `audio/${projectId}/${Date.now()}-${file.name}`;
      await uploadFile(s3Key, file, setProgress);

      await client.models.AudioAsset.create({
        projectId,
        filename: file.name,
        s3Key,
        referenceTranscription: reference,
        languageCode: language,
        description,
        fileSizeKb: Math.round(file.size / 1024),
      });

      setFile(null);
      setReference('');
      setDescription('');
      setProgress(0);
      onUploaded();
    } catch (e) {
      console.error(e);
      alert('Upload failed: ' + (e instanceof Error ? e.message : 'Unknown error'));
    } finally {
      setUploading(false);
    }
  }

  return (
    <GlassCard className="p-6 space-y-4">
      <h2 className="text-lg font-semibold text-base-content">Upload Audio Asset</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-base-content/60 mb-1">Project *</label>
          <select
            className="select select-bordered w-full"
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
          >
            <option value="">Select project…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-base-content/60 mb-1">Language *</label>
          <select
            className="select select-bordered w-full"
            value={language}
            onChange={e => setLanguage(e.target.value)}
          >
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm text-base-content/60 mb-1">Audio File *</label>
        <input
          type="file"
          accept="audio/*"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="file-input file-input-bordered w-full"
        />
        {file && (
          <p className="text-xs text-base-content/40 mt-1">{file.name} ({Math.round(file.size / 1024)} KB)</p>
        )}
      </div>

      <div>
        <label className="block text-sm text-base-content/60 mb-1">Reference Transcription (Ground Truth) *</label>
        <textarea
          className="textarea textarea-bordered w-full resize-none"
          rows={3}
          value={reference}
          onChange={e => setReference(e.target.value)}
          placeholder="Type the exact transcription of the audio clip…"
        />
      </div>

      <div>
        <label className="block text-sm text-base-content/60 mb-1">Description</label>
        <input
          className="input input-bordered w-full"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Optional description"
        />
      </div>

      {uploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-base-content/40">
            <span>Uploading…</span><span>{progress}%</span>
          </div>
          <progress className="progress progress-primary w-full" value={progress} max="100" />
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || !reference.trim() || !projectId || uploading}
        className="btn btn-primary btn-sm gap-2 disabled:opacity-50"
      >
        {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
        {uploading ? 'Uploading…' : 'Upload Asset'}
      </button>
    </GlassCard>
  );
}

export function ProjectAdminAudioAssets() {
  const client = useAmplifyData();
  const [assets, setAssets] = useState<AudioAsset[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioUrls, setAudioUrls] = useState<Record<string, string>>({});

  async function load() {
    const [assetsRes, projectsRes] = await Promise.all([
      client.models.AudioAsset.list(),
      client.models.Project.list(),
    ]);
    setAssets((assetsRes.data ?? []) as AudioAsset[]);
    setProjects((projectsRes.data ?? []) as Project[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function togglePlay(assetId: string, s3Key: string) {
    if (playingId === assetId) { setPlayingId(null); return; }
    if (!audioUrls[assetId]) {
      const { getUrl } = await import('aws-amplify/storage');
      const result = await getUrl({ path: s3Key, options: { expiresIn: 3600 } });
      setAudioUrls(prev => ({ ...prev, [assetId]: result.url.toString() }));
    }
    setPlayingId(assetId);
  }

  async function handleDelete(id: string, s3Key: string) {
    if (!confirm('Delete this audio asset?')) return;
    try {
      const { remove } = await import('aws-amplify/storage');
      await remove({ path: s3Key });
    } catch { /* already deleted */ }
    await client.models.AudioAsset.delete({ id });
    await load();
  }

  const filtered = assets.filter(a =>
    !search || a.filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-base-content">Audio Assets</h1>
          <p className="text-base-content/40 text-sm mt-1">Manage audio files and reference transcriptions</p>
        </div>
        <button
          onClick={() => setShowUpload(v => !v)}
          className="btn btn-primary btn-sm gap-2"
        >
          <Upload size={16} /> Upload Audio
        </button>
      </div>

      <div className="alert alert-warning alert-soft text-sm">
        <span>Assets uploaded here are <strong>not automatically linked</strong> to any test. Use the "Add Clip" button on the project detail page instead.</span>
      </div>

      {showUpload && (
        <UploadForm projects={projects} onUploaded={() => { setShowUpload(false); load(); }} />
      )}

      <GlassCard className="p-4 flex items-center gap-3">
        <Search size={16} className="text-base-content/40" />
        <input
          className="bg-transparent flex-1 text-sm text-base-content placeholder-base-content/30 outline-none"
          placeholder="Search audio files…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </GlassCard>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-12 skeleton rounded-lg" />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<FileAudio size={24} />}
          heading="No audio assets yet"
          description={search ? 'No files match your search.' : 'Upload your first audio file to get started.'}
          action={!search ? { label: 'Upload Audio', onClick: () => setShowUpload(true) } : undefined}
        />
      ) : (
        <GlassCard className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  {['Filename', 'Language', 'Project', 'Reference (truncated)', 'Size', 'Created', 'Preview', ''].map(h => (
                    <th key={h}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <>
                    <tr key={a.id}>
                      <td className="text-sm text-base-content font-medium">{a.filename}</td>
                      <td className="text-sm text-base-content/60">{a.languageCode}</td>
                      <td className="text-sm text-base-content/60">{projects.find(p => p.id === a.projectId)?.name ?? '—'}</td>
                      <td className="text-xs text-base-content/50 max-w-xs">{truncate(a.referenceTranscription, 80)}</td>
                      <td className="text-xs text-base-content/40">{a.fileSizeKb ? `${a.fileSizeKb} KB` : '—'}</td>
                      <td className="text-xs text-base-content/40">{formatDate(a.createdAt)}</td>
                      <td>
                        <button
                          onClick={() => togglePlay(a.id, a.s3Key)}
                          className={`btn btn-ghost btn-xs btn-square ${playingId === a.id ? 'text-success' : 'text-base-content/30'}`}
                          title={playingId === a.id ? 'Stop preview' : 'Preview audio'}
                        >
                          {playingId === a.id ? <Pause size={14} /> : <Play size={14} />}
                        </button>
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(a.id, a.s3Key)}
                          className="btn btn-ghost btn-xs btn-square text-base-content/30 hover:text-error hover:bg-error/10"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                    {playingId === a.id && audioUrls[a.id] && (
                      <tr key={`${a.id}-player`}>
                        <td colSpan={8} className="px-4 pb-4 bg-base-content/[0.02]">
                          <AudioPlayer src={audioUrls[a.id]} onEnded={() => setPlayingId(null)} />
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
