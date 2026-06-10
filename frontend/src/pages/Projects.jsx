import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, FolderKanban, Search, Users, CheckSquare, Calendar, MoreHorizontal } from 'lucide-react';
import { format } from 'date-fns';
import Modal from '../components/Modal';
import AppleSelect from '../components/AppleSelect';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { getCached, setCached, invalidate } from '../api/cache';

const STATUS_OPTIONS = ['active', 'on_hold', 'completed', 'archived'];
const PRIORITY_OPTIONS = ['low', 'medium', 'high'];
const COLOR_OPTIONS = ['#007AFF', '#5856D6', '#30D158', '#FF9F0A', '#FF453A', '#AF52DE', '#5AC8FA', '#FF2D55'];

const STATUS_STYLE = {
  active: 'bg-green-500/10 text-green-600',
  on_hold: 'bg-orange-500/10 text-orange-600',
  completed: 'bg-blue-500/10 text-blue-600',
  archived: 'bg-gray-100/80 text-gray-500',
};

const PRIORITY_STYLE = {
  low: 'bg-gray-100/80 text-gray-500',
  medium: 'bg-blue-500/10 text-blue-600',
  high: 'bg-orange-500/10 text-orange-600',
};

function ProjectCard({ project, onDelete }) {
  const total = parseInt(project.task_count) || 0;
  const done = parseInt(project.completed_tasks) || 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Link to={`/projects/${project.id}`} className="bg-white rounded-[28px] shadow-[0_2px_12px_rgb(0,0,0,0.02)] border border-gray-100/60 overflow-hidden hover:shadow-[0_16px_40px_rgb(0,0,0,0.06)] hover:-translate-y-1.5 transition-all duration-400 group flex flex-col h-full relative">
      <div className="p-6 flex flex-col flex-1">
        
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2.5">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[6px] uppercase tracking-widest ${STATUS_STYLE[project.status] || 'bg-gray-100 text-gray-500'}`}>
                {project.status?.replace('_', ' ')}
              </span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[6px] uppercase tracking-widest ${PRIORITY_STYLE[project.priority]}`}>
                {project.priority}
              </span>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-3.5 h-3.5 rounded-full flex-shrink-0 shadow-[0_2px_4px_rgba(0,0,0,0.1)] mt-1.5" style={{ background: project.color || '#007AFF' }} />
              <h3 className="font-bold text-gray-900 text-[20px] tracking-tight leading-tight group-hover:text-blue-500 transition-colors line-clamp-2">
                {project.name}
              </h3>
            </div>
          </div>
        </div>

        {project.description && (
          <p className="text-[14px] text-gray-500 leading-relaxed line-clamp-2 mb-6">{project.description}</p>
        )}

        <div className="mt-auto space-y-5">
          {/* Huge Progress Bar */}
          <div>
            <div className="flex items-end justify-between mb-2 pl-1">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Progress</span>
              <span className="text-[16px] font-extrabold tracking-tight" style={{ color: project.color || '#007AFF' }}>{pct}%</span>
            </div>
            <div className="h-3.5 bg-gray-100 rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                style={{ width: `${pct}%`, background: project.color || '#007AFF' }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full" style={{ animation: 'shimmer 2s infinite' }}></div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100/60 flex items-center justify-between text-[13px] text-gray-400 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckSquare size={16} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
              {done}/{total}
            </span>
            <span className="flex items-center gap-1.5">
              <Users size={16} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
              {project.member_count || 0}
            </span>
            {project.due_date && (
              <span className="flex items-center gap-1.5">
                <Calendar size={16} className="text-gray-300 group-hover:text-blue-400 transition-colors" />
                {format(new Date(project.due_date), 'MMM d')}
              </span>
            )}
          </div>
        </div>

      </div>
    </Link>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Status</label>
            <AppleSelect
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={STATUS_OPTIONS.map((s) => ({ value: s, label: s.replace('_', ' ') }))}
            />
          </div>
          <div>
            <label className="label">Priority</label>
            <AppleSelect
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              options={PRIORITY_OPTIONS.map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="label">Start Date</label><input type="date" className="input-field" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} /></div>
          <div><label className="label">Target Date</label><input type="date" className="input-field" value={form.target_date} onChange={(e) => setForm({ ...form, target_date: e.target.value })} /></div>
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
    <div className="space-y-8 max-w-7xl mx-auto animate-slide-up">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="page-title">Projects</h2>
          <p className="text-base text-gray-500 font-medium mt-1">{projects.length} total projects</p>
        </div>
        {user?.role === 'admin' && (
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={16} strokeWidth={2.5} /> New Project
          </button>
        )}
      </div>

      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-sm">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-12 shadow-sm" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search projects..." />
        </div>
        <div className="flex items-center bg-gray-200/50 p-1.5 rounded-[20px] backdrop-blur-xl">
          {['all', 'active', 'on_hold', 'completed'].map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-5 py-2 text-[14px] font-bold rounded-2xl transition-all duration-300 capitalize ${filter === f ? 'bg-white text-gray-900 shadow-[0_2px_10px_rgba(0,0,0,0.08)]' : 'text-gray-500 hover:text-gray-900'}`}>
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((p) => <ProjectCard key={p.id} project={p} />)}
        </div>
      )}

      <CreateProjectModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={(p) => setProjects([p, ...projects])} />
    </div>
  );
}
