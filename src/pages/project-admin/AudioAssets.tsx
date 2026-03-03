import { useEffect, useState } from 'react';
import { Upload, Trash2, FileAudio, Search, Loader2 } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
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
      <h2 className="text-lg font-semibold text-white">Upload Audio Asset</h2>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm text-white/60 mb-1">Project *</label>
          <select
            className="glass-input w-full px-3 py-2 text-sm"
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
          >
            <option value="">Select project…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-1">Language *</label>
          <select
            className="glass-input w-full px-3 py-2 text-sm"
            value={language}
            onChange={e => setLanguage(e.target.value)}
          >
            {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1">Audio File *</label>
        <input
          type="file"
          accept="audio/*"
          onChange={e => setFile(e.target.files?.[0] ?? null)}
          className="glass-input w-full px-3 py-2 text-sm file:bg-transparent file:border-0 file:cursor-pointer file-input-themed"
        />
        {file && (
          <p className="text-xs text-white/40 mt-1">{file.name} ({Math.round(file.size / 1024)} KB)</p>
        )}
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1">Reference Transcription (Ground Truth) *</label>
        <textarea
          className="glass-input w-full px-3 py-2 text-sm resize-none"
          rows={3}
          value={reference}
          onChange={e => setReference(e.target.value)}
          placeholder="Type the exact transcription of the audio clip…"
        />
      </div>

      <div>
        <label className="block text-sm text-white/60 mb-1">Description</label>
        <input
          className="glass-input w-full px-3 py-2 text-sm"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Optional description"
        />
      </div>

      {uploading && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-white/40">
            <span>Uploading…</span><span>{progress}%</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ background: 'oklch(var(--p))', width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!file || !reference.trim() || !projectId || uploading}
        className="flex items-center gap-2 px-4 py-2 btn-gradient rounded-lg text-sm font-medium disabled:opacity-50"
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

  async function handleDelete(id: string) {
    if (!confirm('Delete this audio asset?')) return;
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
          <h1 className="text-2xl font-bold text-white">Audio Assets</h1>
          <p className="text-white/40 text-sm mt-1">Manage audio files and reference transcriptions</p>
        </div>
        <button
          onClick={() => setShowUpload(v => !v)}
          className="flex items-center gap-2 px-4 py-2 btn-gradient rounded-lg text-sm font-medium"
        >
          <Upload size={16} /> Upload Audio
        </button>
      </div>

      {showUpload && (
        <UploadForm projects={projects} onUploaded={() => { setShowUpload(false); load(); }} />
      )}

      <GlassCard className="p-4 flex items-center gap-3">
        <Search size={16} className="text-white/40" />
        <input
          className="bg-transparent flex-1 text-sm text-white placeholder-white/30 outline-none"
          placeholder="Search audio files…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </GlassCard>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <GlassCard key={i} className="p-5 h-20 skeleton" />)}</div>
      ) : filtered.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <FileAudio size={40} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No audio assets yet. Upload your first file above.</p>
        </GlassCard>
      ) : (
        <GlassCard className="overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {['Filename', 'Language', 'Project', 'Reference (truncated)', 'Size', 'Created', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-white/40 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map(a => (
                <tr key={a.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-sm text-white font-medium">{a.filename}</td>
                  <td className="px-4 py-3 text-sm text-white/60">{a.languageCode}</td>
                  <td className="px-4 py-3 text-sm text-white/60">{projects.find(p => p.id === a.projectId)?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-white/50 max-w-xs">{truncate(a.referenceTranscription, 80)}</td>
                  <td className="px-4 py-3 text-xs text-white/40">{a.fileSizeKb ? `${a.fileSizeKb} KB` : '—'}</td>
                  <td className="px-4 py-3 text-xs text-white/40">{formatDate(a.createdAt)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(a.id)}
                      className="p-1.5 rounded text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      )}
    </div>
  );
}
