import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, FolderOpen } from 'lucide-react';
import { GlassCard } from '@/components/shared/GlassCard';
import { useAmplifyData } from '@/hooks/useAmplifyData';
import { formatDate } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  description?: string | null;
  createdAt: string;
}

interface ProjectFormProps {
  initial?: Partial<Project>;
  onSave: (name: string, description: string) => void;
  onCancel: () => void;
  saving: boolean;
}

function ProjectForm({ initial, onSave, onCancel, saving }: ProjectFormProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm text-white/60 mb-1">Project Name *</label>
        <input
          className="glass-input w-full px-3 py-2 text-sm"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Hindi Transcription Q1 2026"
        />
      </div>
      <div>
        <label className="block text-sm text-white/60 mb-1">Description</label>
        <textarea
          className="glass-input w-full px-3 py-2 text-sm resize-none"
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Optional project description"
        />
      </div>
      <div className="flex gap-3 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm text-white/60 hover:text-white rounded-lg hover:bg-white/10 transition-all"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(name, description)}
          disabled={!name.trim() || saving}
          className="px-4 py-2 text-sm btn-gradient rounded-lg disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save Project'}
        </button>
      </div>
    </div>
  );
}

export function AppAdminProjects() {
  const client = useAmplifyData();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [saving, setSaving] = useState(false);

  async function loadProjects() {
    const res = await client.models.Project.list();
    setProjects((res.data ?? []) as Project[]);
    setLoading(false);
  }

  useEffect(() => { loadProjects(); }, []);

  async function handleCreate(name: string, description: string) {
    setSaving(true);
    try {
      await client.models.Project.create({ name, description });
      setShowCreate(false);
      await loadProjects();
    } finally {
      setSaving(false);
    }
  }

  async function handleEdit(name: string, description: string) {
    if (!editProject) return;
    setSaving(true);
    try {
      await client.models.Project.update({ id: editProject.id, name, description });
      setEditProject(null);
      await loadProjects();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this project? All associated tests and assets will be affected.')) return;
    await client.models.Project.delete({ id });
    await loadProjects();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-white/40 text-sm mt-1">Manage all transcription projects</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 btn-gradient rounded-lg text-sm font-medium"
        >
          <Plus size={16} /> New Project
        </button>
      </div>

      {showCreate && (
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Create Project</h2>
          <ProjectForm onSave={handleCreate} onCancel={() => setShowCreate(false)} saving={saving} />
        </GlassCard>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <GlassCard key={i} className="p-6 h-24 skeleton" />)}
        </div>
      ) : projects.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <FolderOpen size={40} className="text-white/20 mx-auto mb-3" />
          <p className="text-white/40">No projects yet. Create your first project above.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {projects.map(project => (
            <div key={project.id}>
              {editProject?.id === project.id ? (
                <GlassCard className="p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Edit Project</h2>
                  <ProjectForm
                    initial={editProject}
                    onSave={handleEdit}
                    onCancel={() => setEditProject(null)}
                    saving={saving}
                  />
                </GlassCard>
              ) : (
                <GlassCard hover className="p-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-white">{project.name}</h3>
                    {project.description && (
                      <p className="text-white/50 text-sm mt-0.5">{project.description}</p>
                    )}
                    <p className="text-white/30 text-xs mt-1">Created {formatDate(project.createdAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditProject(project)}
                      className="p-2 rounded-lg text-white/40 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="p-2 rounded-lg text-white/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </GlassCard>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
