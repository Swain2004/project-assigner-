import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FolderKanban, Search, Users, CheckSquare, Calendar, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import Modal from '../components/Modal';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { getCached, setCached, invalidate } from '../api/cache';

const STATUS_OPTIONS = ['active', 'on_hold', 'completed', 'archived'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high'];
const COLOR_OPTIONS = ['#007AFF', '#5856D6', '#30D158', '#FF9F0A', '#FF453A', '#AF52DE', '#5AC8FA', '#FF2D55'];

const STATUS_STYLE = {
  active: 'bg-green-100 text-green-700',
  on_hold: 'bg-orange-100 text-orange-700',
  completed: 'bg-blue-100 text-blue-700',
  archived: 'bg-gray-100 text-gray-500',
};

const PRIORITY_STYLE = {
  low: 'bg-gray-100 text-gray-500',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
};

function ProjectCard({ project, onDelete }) {
  const total = parseInt(project.task_count) || 0;
  const done = parseInt(project.completed_tasks) || 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="card overflow-hidden hover:shadow-apple-md transition-shadow duration-200 group">
      <div className="h-1.5" style={{ background: project.color || '#007AFF' }} />
      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <Link to={`/projects/${project.id}`} className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-base leading-snug group-hover:text-blue-500 transition-colors truncate">
              {project.name}
            </h3>
          </Link>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`badge ${STATUS_STYLE[project.status] || 'bg-gray-100 text-gray-500'} capitalize`}>
              {project.status?.replace('_', ' ')}
            </span>
          </div>
        </div>

        {project.description && (
          <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-4">{project.description}</p>
        )}

        <div className="space-y-3">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs text-gray-400">Progress</span>
              <span className="text-xs font-semibold text-gray-600">{pct}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: project.color || '#007AFF' }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <CheckSquare size={12} />
              {done}/{total} tasks
            </span>
            <span className="flex items-center gap-1">
              <Users size={12} />
              {project.member_count || 0} members
            </span>
            {project.due_date && (
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                {format(new Date(project.due_date), 'MMM d')}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <span className={`badge ${PRIORITY_STYLE[project.priority]} capitalize`}>
            {project.priority} priority
          </span>
          <Link
            to={`/projects/${project.id}`}
            className="text-xs font-semibold text-blue-500 hover:text-blue-600 transition-colors"
          >
            Open
          </Link>
        </div>
      </div>
    </div>
  );
}

function CreateProjectModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', status: 'active', priority: 'medium', due_date: '', color: '#007AFF' });
  const [memberSearch, setMemberSearch] = useState('');
  const [rawSearchResults, setRawSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const searchResults = rawSearchResults.filter((u) => !selectedMembers.find((m) => m.id === u.id));

  useEffect(() => {
    if (!open) {
      setForm({ name: '', description: '', status: 'active', priority: 'medium', due_date: '', color: '#007AFF' });
      setSelectedMembers([]);
      setMemberSearch('');
      setRawSearchResults([]);
      setSearchError('');
      setError('');
    }
  }, [open]);

  useEffect(() => {
    if (memberSearch.trim().length < 1) { setRawSearchResults([]); setSearchError(''); setSearchLoading(false); return; }
    setSearchError('');
    const timeout = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(memberSearch.trim())}`);
        setRawSearchResults(res.data.users || []);
      } catch (err) {
        setSearchError('Could not load users');
        setRawSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 150);
    return () => clearTimeout(timeout);
  }, [memberSearch]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError('Project name is required');
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/projects', {
        ...form,
        due_date: form.due_date || null,
        member_ids: selectedMembers.map((m) => m.id),
      });
      invalidate('/projects');
      onCreated(res.data.project);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={open} onClose={onClose} title="New Project" size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Project Name *</label>
          <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Website Redesign" required />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input-field resize-none" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description of the project..." />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Status</label>
            <select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select className="input-field" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
              {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Due Date</label>
            <input type="date" className="input-field" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex items-center gap-2 mt-1.5">
              {COLOR_OPTIONS.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-full transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                  style={{ background: c }} />
              ))}
            </div>
          </div>
        </div>
        <div>
          <label className="label">Add Team Members</label>
          <div className="relative">
            <input className="input-field pr-9" value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} placeholder="Search by name or email..." />
            {searchLoading && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          {searchResults.length > 0 && (
            <div className="mt-1 bg-white border border-gray-200 rounded-ios shadow-apple-sm overflow-hidden divide-y divide-gray-100">
              {searchResults.map((u) => (
                <button key={u.id} type="button" onClick={() => { setSelectedMembers([...selectedMembers, u]); setMemberSearch(''); setSearchResults([]); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 transition-colors text-left">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {u.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                    <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>{u.role}</span>
                </button>
              ))}
            </div>
          )}
          {searchError && <p className="text-xs text-red-500 mt-1 px-1">{searchError}</p>}
          {!searchLoading && !searchError && memberSearch.trim().length > 0 && searchResults.length === 0 && (
            <p className="text-xs text-gray-400 mt-1 px-1">No users found for "{memberSearch}"</p>
          )}
          {selectedMembers.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {selectedMembers.map((m) => (
                <span key={m.id} className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                  {m.name}
                  <button type="button" onClick={() => setSelectedMembers(selectedMembers.filter((x) => x.id !== m.id))} className="text-blue-400 hover:text-blue-600">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
        {error && <p className="text-sm text-red-500 font-medium">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">
            {loading ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export default function Projects() {
  const { user } = useAuth();
  const [projects, setProjects] = useState(() => getCached('/projects') || []);
  const [loading, setLoading] = useState(() => !getCached('/projects'));
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { fetchProjects(); }, []);

  async function fetchProjects() {
    try {
      const res = await api.get('/projects');
      setCached('/projects', res.data.projects);
      setProjects(res.data.projects);
    } finally {
      setLoading(false);
    }
  }

  const filtered = projects.filter((p) => {
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || p.status === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="page-title">Projects</h2>
          <p className="text-sm text-gray-400 mt-0.5">{projects.length} total projects</p>
        </div>
        {user?.role === 'admin' && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} strokeWidth={2.5} /> New Project
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects..." />
        </div>
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-ios">
          {['all', 'active', 'on_hold', 'completed'].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-[8px] transition-all capitalize ${filter === f ? 'bg-white text-gray-900 shadow-apple-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {f === 'all' ? 'All' : f.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="skeleton h-5 w-2/3 rounded" />
              <div className="skeleton h-4 w-full rounded" />
              <div className="skeleton h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card flex flex-col items-center py-20 text-center">
          <FolderKanban size={48} className="text-gray-200 mb-4" strokeWidth={1.5} />
          <p className="text-base font-semibold text-gray-500">{search ? 'No projects found' : 'No projects yet'}</p>
          <p className="text-sm text-gray-400 mt-1">{search ? 'Try a different search term' : user?.role === 'admin' ? 'Create your first project to get started' : 'You haven\'t been added to any projects yet'}</p>
          {!search && user?.role === 'admin' && (
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-5">
              <Plus size={16} /> Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}

      <CreateProjectModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={(p) => setProjects([p, ...projects])} />
    </div>
  );
}
