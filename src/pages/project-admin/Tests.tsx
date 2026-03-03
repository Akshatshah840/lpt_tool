import { useEffect, useState } from 'react';
import { Plus, ClipboardList, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GlassCard } from '@/components/shared/GlassCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { useAmplifyData } from '@/hooks/useAmplifyData';
import { formatDate } from '@/lib/utils';

interface Test {
  id: string;
  name: string;
  projectId: string;
  languageCode: string;
  status: string;
  minAccuracy: number;
  description?: string | null;
  expiresAt?: string | null;
  createdAt: string;
}

interface Project { id: string; name: string }
interface AudioAsset { id: string; filename: string; languageCode: string; projectId: string }

interface CreateTestFormProps {
  projects: Project[];
  audioAssets: AudioAsset[];
  onSave: (data: Omit<Test, 'id' | 'createdAt'> & { audioAssetIds: string[] }) => Promise<void>;
  onCancel: () => void;
}

function CreateTestForm({ projects, audioAssets, onSave, onCancel }: CreateTestFormProps) {
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [language, setLanguage] = useState('en');
  const [minAccuracy, setMinAccuracy] = useState(80);
  const [description, setDescription] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const availableAssets = audioAssets.filter(a => a.projectId === projectId && a.languageCode === language);

  function toggleAsset(id: string) {
    setSelectedAssets(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        name, projectId, languageCode: language, minAccuracy: minAccuracy / 100,
        description, expiresAt: expiresAt || null, status: 'CREATED',
        audioAssetIds: selectedAssets,
      } as Parameters<typeof onSave>[0]);
    } finally {
      setSaving(false);
    }
  }

  return (
    <GlassCard className="p-6 space-y-4">
      <h2 className="text-lg font-semibold text-white">Create Test</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm text-white/60 mb-1">Test Name *</label>
          <input className="glass-input w-full px-3 py-2 text-sm" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Hindi Level A2 — March 2026" />
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-1">Project *</label>
          <select className="glass-input w-full px-3 py-2 text-sm" value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">Select project…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-1">Language *</label>
          <input className="glass-input w-full px-3 py-2 text-sm" value={language} onChange={e => setLanguage(e.target.value)} placeholder="e.g. en, hi, es" />
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-1">Minimum Accuracy * ({minAccuracy}%)</label>
          <input
            type="range" min={10} max={100} step={5}
            value={minAccuracy}
            onChange={e => setMinAccuracy(Number(e.target.value))}
            className="w-full accent-[oklch(var(--p))]"
          />
        </div>
        <div>
          <label className="block text-sm text-white/60 mb-1">Expires At</label>
          <input type="datetime-local" className="glass-input w-full px-3 py-2 text-sm" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="block text-sm text-white/60 mb-1">Description</label>
          <textarea className="glass-input w-full px-3 py-2 text-sm resize-none" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
        </div>
      </div>

      {projectId && (
        <div>
          <label className="block text-sm text-white/60 mb-2">Audio Clips ({selectedAssets.length} selected)</label>
          {availableAssets.length === 0 ? (
            <p className="text-white/30 text-sm">No audio assets for this project/language combination. Upload audio assets first.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableAssets.map((a, i) => (
                <label key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-white/5 cursor-pointer hover:bg-white/8 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedAssets.includes(a.id)}
                    onChange={() => toggleAsset(a.id)}
                    className="accent-[oklch(var(--p))]"
                  />
                  <span className="text-sm text-white/80">{i + 1}. {a.filename}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-all">Cancel</button>
        <button
          onClick={handleSave}
          disabled={!name || !projectId || selectedAssets.length === 0 || saving}
          className="px-4 py-2 text-sm btn-gradient rounded-lg disabled:opacity-50"
        >
          {saving ? 'Creating…' : 'Create Test'}
        </button>
      </div>
    </GlassCard>
  );
}

export function ProjectAdminTests() {
  const client = useAmplifyData();
  const [tests, setTests] = useState<Test[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [audioAssets, setAudioAssets] = useState<AudioAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  async function load() {
    const [testsRes, projectsRes, assetsRes] = await Promise.all([
      client.models.Test.list(),
      client.models.Project.list(),
      client.models.AudioAsset.list(),
    ]);
    setTests((testsRes.data ?? []) as Test[]);
    setProjects((projectsRes.data ?? []) as Project[]);
    setAudioAssets((assetsRes.data ?? []) as AudioAsset[]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleCreate(data: Omit<Test, 'id' | 'createdAt'> & { audioAssetIds: string[] }) {
    const { audioAssetIds, ...testData } = data;
    const testRes = await client.models.Test.create(testData);
    const testId = testRes.data?.id;
    if (testId) {
      await Promise.all(
        audioAssetIds.map((audioAssetId, i) =>
          client.models.TestAudioAsset.create({ testId, audioAssetId, sortOrder: i + 1 })
        )
      );
    }
    setShowCreate(false);
    await load();
  }

  async function updateStatus(id: string, status: 'CREATED' | 'OPEN' | 'CLOSED') {
    await client.models.Test.update({ id, status });
    await load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tests</h1>
          <p className="text-white/40 text-sm mt-1">Create and manage transcription tests</p>
        </div>
        <button onClick={() => setShowCreate(v => !v)} className="flex items-center gap-2 px-4 py-2 btn-gradient rounded-lg text-sm font-medium">
          <Plus size={16} /> New Test
        </button>
      </div>

      {showCreate && (
        <CreateTestForm
          projects={projects}
          audioAssets={audioAssets}
          onSave={handleCreate}
          onCancel={() => setShowCreate(false)}
        />
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <GlassCard key={i} className="p-6 h-24 skeleton" />)}</div>
      ) : tests.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <ClipboardList size={40} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No tests yet.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {tests.map(test => (
            <GlassCard key={test.id} hover className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-white">{test.name}</h3>
                    <StatusBadge status={test.status as 'CREATED' | 'OPEN' | 'CLOSED'} />
                  </div>
                  <p className="text-white/40 text-sm mt-0.5">
                    {projects.find(p => p.id === test.projectId)?.name} · {test.languageCode} · Min accuracy: {Math.round(test.minAccuracy * 100)}%
                  </p>
                  {test.expiresAt && (
                    <p className="text-white/30 text-xs mt-0.5">Expires {formatDate(test.expiresAt)}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {test.status === 'CREATED' && (
                    <button onClick={() => updateStatus(test.id, 'OPEN')} className="px-3 py-1.5 text-xs bg-green-500/20 text-green-300 border border-green-500/20 rounded-lg hover:bg-green-500/30 transition-all">Open</button>
                  )}
                  {test.status === 'OPEN' && (
                    <button onClick={() => updateStatus(test.id, 'CLOSED')} className="px-3 py-1.5 text-xs bg-gray-500/20 text-gray-300 border border-gray-500/20 rounded-lg hover:bg-gray-500/30 transition-all">Close</button>
                  )}
                  <Link to={`/project/tests/${test.id}`} className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all hover-primary badge-open">
                    View <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
