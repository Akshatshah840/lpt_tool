import { useEffect, useState } from 'react';
import { Plus, ClipboardList, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GlassCard } from '@/components/shared/GlassCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState } from '@/components/shared/EmptyState';
import { useAmplifyData } from '@/hooks/useAmplifyData';
import { formatDate } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { LANGUAGES } from '@/lib/languages';

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
      <h2 className="text-lg font-semibold text-base-content">Create Test</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm text-base-content/60 mb-1">Test Name *</label>
          <input className="input input-bordered w-full" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Hindi Level A2 — March 2026" />
        </div>
        <div>
          <label className="block text-sm text-base-content/60 mb-1">Project *</label>
          <select className="select select-bordered w-full" value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">Select project…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-base-content/60 mb-1">Language *</label>
          <select className="select select-bordered w-full" value={language} onChange={e => setLanguage(e.target.value)}>
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.flag} {l.label} ({l.code})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-base-content/60 mb-1">Minimum Accuracy * ({minAccuracy}%)</label>
          <input
            type="range" min={10} max={100} step={5}
            value={minAccuracy}
            onChange={e => setMinAccuracy(Number(e.target.value))}
            className="range range-primary range-xs mt-1"
          />
        </div>
        <div>
          <label className="block text-sm text-base-content/60 mb-1">Expires At</label>
          <input type="datetime-local" className="input input-bordered w-full" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="block text-sm text-base-content/60 mb-1">Description</label>
          <textarea className="textarea textarea-bordered w-full resize-none" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
        </div>
      </div>

      {projectId && (
        <div>
          <label className="block text-sm text-base-content/60 mb-2">Audio Clips ({selectedAssets.length} selected)</label>
          {availableAssets.length === 0 ? (
            <p className="text-base-content/30 text-sm">No audio assets for this project/language combination. Upload audio assets first.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableAssets.map((a, i) => (
                <label key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-base-content/[0.04] cursor-pointer hover:bg-base-content/[0.08] transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedAssets.includes(a.id)}
                    onChange={() => toggleAsset(a.id)}
                    className="checkbox checkbox-primary checkbox-sm"
                  />
                  <span className="text-sm text-base-content/80">{i + 1}. {a.filename}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="btn btn-ghost btn-sm">Cancel</button>
        <button
          onClick={handleSave}
          disabled={!name || !projectId || selectedAssets.length === 0 || saving}
          className="btn btn-primary btn-sm disabled:opacity-50"
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
          <h1 className="text-2xl font-bold text-base-content">Tests</h1>
          <p className="text-base-content/40 text-sm mt-1">Create and manage transcription tests</p>
        </div>
        <button onClick={() => setShowCreate(v => !v)} className="btn btn-primary btn-sm gap-2">
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
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-[88px] skeleton rounded-xl" />)}</div>
      ) : tests.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={24} />}
          heading="No tests yet"
          description="Create a test to assign audio clips and start accepting transcriptions."
          action={{ label: 'New Test', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="space-y-3">
          {tests.map(test => (
            <GlassCard key={test.id} hover className="p-5">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="font-semibold text-base-content">{test.name}</h3>
                    <StatusBadge status={test.status as 'CREATED' | 'OPEN' | 'CLOSED'} />
                  </div>
                  <p className="text-base-content/40 text-sm mt-0.5">
                    {projects.find(p => p.id === test.projectId)?.name} · {test.languageCode} · Min accuracy: {Math.round(test.minAccuracy * 100)}%
                  </p>
                  {test.expiresAt && (
                    <p className="text-base-content/30 text-xs mt-0.5">Expires {formatDate(test.expiresAt)}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {test.status === 'CREATED' && (
                    <button
                      onClick={() => updateStatus(test.id, 'OPEN')}
                      className="btn btn-success btn-xs"
                    >Open</button>
                  )}
                  {test.status === 'OPEN' && (
                    <button
                      onClick={() => updateStatus(test.id, 'CLOSED')}
                      className="btn btn-neutral btn-xs"
                    >Close</button>
                  )}
                  <Link
                    to={`/project/tests/${test.id}`}
                    className="btn btn-primary btn-xs gap-1.5"
                  >
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
