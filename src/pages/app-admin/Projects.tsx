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
        <label className="block text-sm text-base-content/60 mb-1">Project Name *</label>
        <input
          className="input input-bordered w-full"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Hindi Transcription Q1 2026"
        />
      </div>
      <div>
        <label className="block text-sm text-base-content/60 mb-1">Description</label>
        <textarea
          className="textarea textarea-bordered w-full resize-none"
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Optional project description"
        />
      </div>
      <div className="flex gap-3 justify-end">
        <button onClick={onCancel} className="btn btn-ghost btn-sm">Cancel</button>
        <button
          onClick={() => onSave(name, description)}
          disabled={!name.trim() || saving}
          className="btn btn-primary btn-sm disabled:opacity-50"
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
          <h1 className="text-2xl font-bold text-base-content">Projects</h1>
          <p className="text-base-content/40 text-sm mt-1">Manage all transcription projects</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="btn btn-primary btn-sm gap-2"
        >
          <Plus size={16} /> New Project
        </button>
      </div>

      {showCreate && (
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-base-content mb-4">Create Project</h2>
          <ProjectForm onSave={handleCreate} onCancel={() => setShowCreate(false)} saving={saving} />
        </GlassCard>
      )}

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="card p-6 h-24 skeleton" />)}
        </div>
      ) : projects.length === 0 ? (
        <GlassCard className="p-12 text-center">
          <FolderOpen size={40} className="text-base-content/20 mx-auto mb-3" />
          <p className="text-base-content/40">No projects yet. Create your first project above.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {projects.map(project => (
            <div key={project.id}>
              {editProject?.id === project.id ? (
                <GlassCard className="p-6">
                  <h2 className="text-lg font-semibold text-base-content mb-4">Edit Project</h2>
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
                    <h3 className="font-semibold text-base-content">{project.name}</h3>
                    {project.description && (
                      <p className="text-base-content/50 text-sm mt-0.5">{project.description}</p>
                    )}
                    <p className="text-base-content/30 text-xs mt-1">Created {formatDate(project.createdAt)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditProject(project)}
                      className="btn btn-ghost btn-sm btn-square text-base-content/40 hover:text-primary hover:bg-primary/10"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(project.id)}
                      className="btn btn-ghost btn-sm btn-square text-base-content/40 hover:text-error hover:bg-error/10"
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
