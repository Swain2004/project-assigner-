import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Upload, Users, CheckSquare, FileText, Layout, Calendar, MoreVertical, Search, Paperclip, AlertCircle, GripVertical, Crown, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { DndContext, useDraggable, useDroppable, closestCenter, MeasuringStrategy, DragOverlay } from '@dnd-kit/core';
import Modal from '../components/Modal';
import { getCached, setCached } from '../api/cache';
import AppleSelect from '../components/AppleSelect';
import MentionTextarea, { renderMentions } from '../components/MentionTextarea';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const STATUSES = [
  { key: 'todo', label: 'To Do', color: '#636366' },
  { key: 'in_progress', label: 'In Progress', color: '#007AFF' },
  { key: 'review', label: 'In Review', color: '#FF9F0A' },
  { key: 'done', label: 'Done', color: '#30D158' },
];
const PRIORITY_STYLE = { low: 'priority-low', medium: 'priority-medium', high: 'priority-high', urgent: 'priority-urgent' };

function TaskCard({ task, onUpdate, onDelete, isAdmin }) {
  const [menu, setMenu] = useState(false);
  const [menuPos, setMenuPos] = useState({});
  const menuBtnRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menu) return;
    function handleClose(e) {
      if (menuBtnRef.current && menuBtnRef.current.contains(e.target)) return;
      if (menuRef.current && menuRef.current.contains(e.target)) return;
      setMenu(false);
    }
    document.addEventListener('mousedown', handleClose);
    return () => document.removeEventListener('mousedown', handleClose);
  }, [menu]);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={`bg-white border border-gray-150 rounded-ios p-3.5 shadow-apple-sm group hover:shadow-apple transition-shadow w-full cursor-grab active:cursor-grabbing select-none ${isDragging ? 'opacity-30' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800 leading-snug flex-1">{task.title}</p>
        <div className="relative flex-shrink-0">
          <button
            ref={menuBtnRef}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              if (!menu && menuBtnRef.current) {
                const r = menuBtnRef.current.getBoundingClientRect();
                const menuHeight = 220; // approximate height of the menu
                const spaceBelow = window.innerHeight - r.bottom;
                const rightOffset = Math.max(4, window.innerWidth - r.right);
                if (spaceBelow < menuHeight) {
                  // Not enough space below → open upward
                  setMenuPos({ bottom: window.innerHeight - r.top + 4, right: rightOffset, top: undefined });
                } else {
                  setMenuPos({ top: r.bottom + 4, right: rightOffset, bottom: undefined });
                }
              }
              setMenu((m) => !m);
            }}
            className="p-1 rounded text-gray-400 hover:text-gray-600 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all"
          >
            <MoreVertical size={14} />
          </button>
          {menu && (
            <div
              ref={menuRef}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              style={{ position: 'fixed', zIndex: 9999, top: menuPos.top, bottom: menuPos.bottom, right: menuPos.right }}
              className="w-44 bg-white/95 backdrop-blur-xl border border-gray-100 rounded-[14px] shadow-[0_8px_30px_rgb(0,0,0,0.15)] overflow-hidden py-1"
            >
              {STATUSES.map((s) => (
                <button key={s.key} onClick={(e) => { e.stopPropagation(); onUpdate(task.id, { status: s.key }); setMenu(false); }}
                  className={`w-full text-left px-3.5 py-2.5 text-sm font-medium hover:bg-gray-100/50 transition-colors ${task.status === s.key ? 'text-blue-500' : 'text-gray-700'}`}>
                  {s.label}
                </button>
              ))}
              <div className="border-t border-gray-100/60 my-1" />
              <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); setMenu(false); }} className="w-full text-left px-3.5 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors">Delete</button>
            </div>
          )}
        </div>
      </div>
      {task.description && <p className="text-xs text-gray-500 mt-1.5 line-clamp-2">{renderMentions(task.description)}</p>}
      <div className="flex items-center justify-between mt-3">
        <span className={`badge capitalize ${PRIORITY_STYLE[task.priority]}`}>{task.priority}</span>
        <div className="flex items-center gap-2">
          {task.due_date && <span className="text-[11px] text-gray-400">{format(new Date(task.due_date), 'MMM d')}</span>}
          {task.assignee_name && (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0" title={task.assignee_name}>
                <span className="text-[9px] font-bold text-white">{task.assignee_name.charAt(0)}</span>
              </div>
              {isAdmin && (
                <span className="text-[10px] font-medium text-gray-500 truncate max-w-[80px]">{task.assignee_name}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TaskColumn({ status, tasks, onUpdate, onDelete, children, isAdmin }) {
  const { setNodeRef, isOver } = useDroppable({
    id: status.key,
    data: { status },
  });

  return (
    <div className="w-[85vw] sm:w-[260px] lg:w-[280px] flex-shrink-0 snap-center">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: status.color }} />
          <span className="text-sm font-semibold text-gray-700">{status.label}</span>
          <span className="w-5 h-5 bg-gray-100 text-gray-500 text-[11px] font-bold rounded-full flex items-center justify-center">{tasks.length}</span>
        </div>
        {children}
      </div>
      <div
        ref={setNodeRef}
        className={`space-y-2.5 min-h-[80px] rounded-ios transition-colors ${isOver ? 'bg-blue-50/50 ring-2 ring-blue-200 ring-inset' : ''}`}
      >
        {tasks.map((t) => (
          <TaskCard key={t.id} task={t} onUpdate={onUpdate} onDelete={onDelete} isAdmin={isAdmin} />
        ))}
        {tasks.length === 0 && (
          <div className={`border-2 border-dashed rounded-ios p-4 text-center transition-colors ${isOver ? 'border-blue-300 bg-blue-50/30' : 'border-gray-150'}`}>
            <p className="text-xs text-gray-300">No tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CreateTaskModal({ open, onClose, onCreated, projectId, members, defaultStatus, isAdmin }) {
  const [form, setForm] = useState({ title: '', description: '', status: 'todo', priority: 'medium', assigned_to: '', due_date: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { if (open) setForm((f) => ({ ...f, status: defaultStatus || 'todo' })); else { setForm({ title: '', description: '', status: 'todo', priority: 'medium', assigned_to: '', due_date: '' }); setError(''); } }, [open, defaultStatus]);
  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.post('/tasks', { ...form, project_id: projectId, assigned_to: form.assigned_to || null, due_date: form.due_date || null });
      onCreated(res.data.task); onClose();
    } catch (err) { setError(err.response?.data?.message || 'Failed'); } finally { setLoading(false); }
  }
  return (
    <Modal isOpen={open} onClose={onClose} title="Create Task">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="label">Title <span className="text-red-500">*</span></label><input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Task title" required /></div>
        <div>
          <label className="label">Description <span className="text-gray-400 text-xs font-normal">— type @ to mention a team member</span></label>
          <MentionTextarea
            value={form.description}
            onChange={(v) => setForm({ ...form, description: v })}
            placeholder="Add details… type @ to mention someone"
            rows={3}
            users={members}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Status</label>
            <AppleSelect value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={STATUSES.map((s) => ({ value: s.key, label: s.label }))} />
          </div>
          <div>
            <label className="label">Priority</label>
            <AppleSelect value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} options={['low','medium','high','urgent'].map((p) => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))} />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Assign To</label>
            <AppleSelect value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} options={[{ value: '', label: 'Unassigned' }, ...members.filter(m => isAdmin || m.role !== 'admin').map((m) => ({ value: m.id, label: m.name }))]} />
          </div>
          <div><label className="label">Due Date</label><input type="date" className="input-field" value={form.due_date} min={new Date().toISOString().split('T')[0]} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3"><button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Creating...' : 'Create'}</button></div>
      </form>
    </Modal>
  );
}

function UploadModal({ open, onClose, onUploaded, projectId }) {
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({ name: '', category: 'other', description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [drag, setDrag] = useState(false);
  useEffect(() => { if (!open) { setFile(null); setForm({ name: '', category: 'other', description: '' }); setError(''); } }, [open]);
  async function handleSubmit(e) {
    e.preventDefault();
    if (!file) return setError('Please select a file');
    setLoading(true); setError('');
    try {
      const data = new FormData();
      data.append('file', file); data.append('project_id', projectId);
      data.append('name', form.name || file.name); data.append('category', form.category); data.append('description', form.description);
      const res = await api.post('/documents', data, { headers: { 'Content-Type': 'multipart/form-data' } });
      onUploaded(res.data.document); onClose();
    } catch (err) { setError(err.response?.data?.message || 'Upload failed'); } finally { setLoading(false); }
  }
  return (
    <Modal isOpen={open} onClose={onClose} title="Upload Document">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) { setFile(f); setForm((p) => ({ ...p, name: f.name })); } }}
          onClick={() => document.getElementById('fu').click()}
          className={`border-2 border-dashed rounded-ios-md p-8 text-center cursor-pointer transition-all ${drag ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'}`}>
          <input id="fu" type="file" className="hidden" onChange={(e) => { const f = e.target.files[0]; if (f) { setFile(f); setForm((p) => ({ ...p, name: f.name })); } }} />
          <Upload size={28} className="text-gray-300 mx-auto mb-2" strokeWidth={1.5} />
          {file ? <p className="text-sm font-semibold text-gray-700">{file.name} <span className="text-gray-400 font-normal">({(file.size/1024/1024).toFixed(1)} MB)</span></p>
            : <><p className="text-sm font-medium text-gray-500">Drop file or click to browse</p><p className="text-xs text-gray-400 mt-1">PDF, Word, Excel, CSV, Images — max 50MB</p></>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label className="label">Name</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Document name" /></div>
          <div>
            <label className="label">Category</label>
            <AppleSelect value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} options={['technical_note','report','specification','proposal','other'].map((c) => ({ value: c, label: c.replace('_',' ').replace(/\b\w/g, l => l.toUpperCase()) }))} />
          </div>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3"><button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={loading||!file} className="btn-primary flex-1">{loading?'Uploading...':'Upload'}</button></div>
      </form>
    </Modal>
  );
}

function AddMemberModal({ open, onClose, onAdded, projectId, existingMemberIds = [] }) {
  const [search, setSearch] = useState('');
  const [rawResults, setRawResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const results = rawResults.filter((u) => !existingMemberIds.includes(u.id));

  useEffect(() => {
    if (!open) { setSearch(''); setRawResults([]); setError(''); setAdding(null); setSuccessMsg(''); }
  }, [open]);

  useEffect(() => {
    if (search.trim().length < 1) { setRawResults([]); setError(''); setLoading(false); return; }
    setError('');
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(search.trim())}`);
        setRawResults(res.data.users || []);
      } catch (err) {
        setError('Could not load users. Please try again.');
        setRawResults([]);
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => clearTimeout(t);
  }, [search]);

  async function add(user) {
    setAdding(user.id);
    setSuccessMsg('');
    setRawResults((prev) => prev.filter((u) => u.id !== user.id));
    try {
      const res = await api.post(`/projects/${projectId}/members`, { user_id: user.id });
      onAdded(res.data.member);
      setSuccessMsg(`${user.name} has been added to the team!`);
      setSearch('');
      setRawResults([]);
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member');
      setRawResults((prev) => [...prev, user]);
    } finally {
      setAdding(null);
    }
  }

  const AVATAR_COLORS = ['bg-blue-500','bg-purple-500','bg-green-500','bg-orange-500','bg-pink-500','bg-teal-500'];
  function avatarColor(name) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }

  return (
    <Modal isOpen={open} onClose={onClose} title="Add Team Member" size="sm">
      <style>{`
        @keyframes toastSlideIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .toast-slide-in { animation: toastSlideIn 0.35s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>
      <div className="space-y-3">
        {/* Success toast */}
        {successMsg && (
          <div className="toast-slide-in flex items-center gap-2.5 p-3 bg-green-50 border border-green-200 rounded-ios">
            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L4.8 9L10 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <p className="text-sm font-semibold text-green-700">{successMsg}</p>
          </div>
        )}

        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input-field pl-9 pr-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            autoFocus
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-100 rounded-ios text-sm text-red-600">
            <AlertCircle size={14} className="flex-shrink-0" />
            {error}
          </div>
        )}

        {results.length > 0 && (
          <div className="border border-gray-150 rounded-ios overflow-hidden divide-y divide-gray-100">
            {results.map((u) => (
              <button
                key={u.id}
                onClick={() => add(u)}
                disabled={adding === u.id}
                className="w-full flex items-center gap-3 px-3.5 py-3 hover:bg-gray-50 active:bg-gray-100 transition-colors text-left group"
              >
                <div className={`w-9 h-9 ${avatarColor(u.name)} rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
                  {u.avatar_url
                    ? <img src={u.avatar_url} className="w-9 h-9 rounded-full object-cover" alt="" />
                    : u.name.charAt(0).toUpperCase()
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                </div>
                <div className="flex-shrink-0 flex items-center gap-1.5">
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>{u.role}</span>
                  {adding === u.id
                    ? <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    : <Plus size={15} className="text-blue-400 group-hover:text-blue-600 transition-colors" strokeWidth={2.5} />
                  }
                </div>
              </button>
            ))}
          </div>
        )}

        {!loading && !error && search.trim().length > 0 && results.length === 0 && (
          <div className="text-center py-6">
            <p className="text-sm font-medium text-gray-500">No users found for "{search}"</p>
            <p className="text-xs text-gray-400 mt-1">Try a different name or email address</p>
          </div>
        )}

        {search.trim().length === 0 && !successMsg && (
          <p className="text-xs text-gray-400 text-center py-2">Start typing to search all team members</p>
        )}
      </div>
    </Modal>
  );
}

function getFileColor(mime) {
  if (mime?.includes('pdf')) return 'text-red-500 bg-red-50 border-red-100';
  if (mime?.includes('spreadsheet') || mime?.includes('excel') || mime?.includes('csv')) return 'text-green-600 bg-green-50 border-green-100';
  if (mime?.includes('word') || mime?.includes('document')) return 'text-blue-500 bg-blue-50 border-blue-100';
  if (mime?.includes('image')) return 'text-purple-500 bg-purple-50 border-purple-100';
  return 'text-gray-500 bg-gray-50 border-gray-200';
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const cacheKey = `project_${id}`;
  const cached = getCached(cacheKey);
  const [project, setProject] = useState(() => cached?.project || null);
  const [tasks, setTasks] = useState(() => cached?.tasks || []);
  const [documents, setDocuments] = useState(() => cached?.documents || []);
  const [templates, setTemplates] = useState(() => cached?.templates || []);
  const [loading, setLoading] = useState(() => !cached);
  const [tab, setTab] = useState('tasks');
  const [showTask, setShowTask] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState('todo');
  const [showUpload, setShowUpload] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeDrag, setActiveDrag] = useState(null);
  const isAdmin = user?.role === 'admin';
  const isTeamLeader = !!project?.members?.some((m) => m.id === user?.id && m.project_role === 'team_leader');
  const isProjectManager = isAdmin || isTeamLeader;

  useEffect(() => { fetchAll(); }, [id]);

  async function fetchAll() {
    try {
      const [pRes, tRes, dRes, tmRes] = await Promise.all([
        api.get(`/projects/${id}`), api.get(`/tasks?project_id=${id}`),
        api.get(`/documents?project_id=${id}`), api.get(`/templates?project_id=${id}`),
      ]);
      const data = {
        project: pRes.data.project,
        tasks: tRes.data.tasks,
        documents: dRes.data.documents,
        templates: tmRes.data.templates
      };
      setCached(cacheKey, data);
      setProject(data.project);
      setTasks(data.tasks);
      setDocuments(data.documents);
      setTemplates(data.templates);
    } finally { setLoading(false); }
  }

  const updateCache = useCallback((newTasks) => {
    setCached(cacheKey, { project, tasks: newTasks, documents, templates });
  }, [cacheKey, project, documents, templates]);

  const handleTaskUpdate = useCallback(async (taskId, updates) => {
    const res = await api.put(`/tasks/${taskId}`, updates);
    const newTasks = tasks.map((t) => t.id === taskId ? res.data.task : t);
    setTasks(newTasks);
    updateCache(newTasks);
  }, [tasks, updateCache]);

  const handleTaskDelete = useCallback(async (taskId) => {
    if (!confirm('Delete this task?')) return;
    await api.delete(`/tasks/${taskId}`);
    const newTasks = tasks.filter((t) => t.id !== taskId);
    setTasks(newTasks);
    updateCache(newTasks);
  }, [tasks, updateCache]);

  const handleDeleteProject = useCallback(async () => {
    setDeleting(true);
    try {
      await api.delete(`/projects/${id}`);
      window.location.href = '/projects';
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete project');
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [id]);

  const handleDragStart = useCallback((event) => {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveDrag(task || null);
  }, [tasks]);

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event;
    setActiveDrag(null);
    if (!over) return;

    const taskId = active.id;
    const newStatus = over.id;

    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus) return;

    handleTaskUpdate(taskId, { status: newStatus });
  }, [tasks, handleTaskUpdate]);

  if (loading) return <div className="max-w-7xl mx-auto"><div className="skeleton h-40 rounded-ios-lg" /></div>;
  if (!project) return <div className="text-center py-20"><p className="text-gray-400">Project not found</p><Link to="/projects" className="btn-primary mt-4 inline-flex">Back</Link></div>;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'done').length;
  const inProgressTasks = tasks.filter((t) => t.status === 'in_progress').length;
  const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const tasksByStatus = STATUSES.reduce((acc, s) => { acc[s.key] = tasks.filter((t) => t.status === s.key); return acc; }, {});

  return (
    <div className="max-w-7xl mx-auto space-y-5 animate-fade-in">
      <Link to="/projects" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors font-medium">
        <ArrowLeft size={15} /> Projects
      </Link>

      <div className="card p-5 lg:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-ios-md flex items-center justify-center flex-shrink-0" style={{ background: project.color || '#007AFF' }}>
              <CheckSquare size={22} className="text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{project.name}</h2>
              {project.description && <p className="text-sm text-gray-500 mt-1">{project.description}</p>}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <span className={`badge capitalize ${project.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{project.status?.replace('_',' ')}</span>
                <span className={`badge capitalize ${PRIORITY_STYLE[project.priority]}`}>{project.priority}</span>
                {project.due_date && <span className="text-xs text-gray-400 flex items-center gap-1"><Calendar size={12} />Due {format(new Date(project.due_date), 'MMM d, yyyy')}</span>}
              </div>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-2xl font-bold text-gray-900">{pct}%</p>
            <p className="text-xs text-gray-400">Complete</p>
          </div>
          {isAdmin && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
              title="Delete Project"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
        <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: project.color || '#007AFF' }} />
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
          <span>{totalTasks} tasks</span>
          <span>{completedTasks} done</span>
          <span>{inProgressTasks} in progress</span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 bg-gray-100/80 p-1.5 rounded-[16px] overflow-x-auto max-w-full -mx-1 px-1" style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
        {[{ key:'tasks',label:'Tasks',icon:CheckSquare,count:tasks.length},{ key:'documents',label:'Documents',icon:FileText,count:documents.length},{ key:'templates',label:'Templates',icon:Layout,count:templates.length},{ key:'members',label:'Members',icon:Users,count:project.members?.length}].map(({key,label,icon:Icon,count}) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2.5 text-[13px] sm:text-[14px] font-semibold rounded-[12px] transition-all duration-300 whitespace-nowrap ${tab===key?'bg-white text-gray-900 shadow-[0_2px_8px_rgba(0,0,0,0.08)]':'text-gray-500 hover:text-gray-800 hover:bg-gray-200/50'}`}>
            <Icon size={15} strokeWidth={2.5} className={tab===key ? 'text-blue-500' : 'text-gray-400'}/><span className="hidden sm:inline">{label}</span><span className="sm:hidden">{label.slice(0,4)}{label.length > 4 ? '.' : ''}</span>
            {count > 0 && <span className={`min-w-[20px] h-[20px] px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center transition-colors ${tab===key ? 'bg-blue-50 text-blue-600' : 'bg-gray-200/80 text-gray-500'}`}>{count}</span>}
          </button>
        ))}
      </div>

      {tab === 'tasks' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{tasks.length} tasks total</p>
            {(isProjectManager || project.members?.some((m) => m.id === user?.id)) && (
              <button onClick={() => { setDefaultStatus('todo'); setShowTask(true); }} className="btn-primary">
                <Plus size={16} strokeWidth={2.5} /> Add Task
              </button>
            )}
          </div>
          <DndContext
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            measuring={{
              droppable: {
                strategy: MeasuringStrategy.Always,
              },
            }}
          >
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 items-start max-w-full snap-x snap-mandatory" data-lenis-prevent style={{ minHeight: '200px', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {STATUSES.map((s) => (
                <TaskColumn key={s.key} status={s} tasks={tasksByStatus[s.key] || []} onUpdate={handleTaskUpdate} onDelete={handleTaskDelete} isAdmin={isAdmin}>
                  <button onClick={() => { setDefaultStatus(s.key); setShowTask(true); }} className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-all">
                    <Plus size={14} strokeWidth={2.5} />
                  </button>
                </TaskColumn>
              ))}
            </div>
            <DragOverlay dropAnimation={null} style={{ position: 'fixed', pointerEvents: 'none', zIndex: 9999 }}>
              {activeDrag ? (
                <div className="bg-white border border-gray-150 rounded-ios p-3.5 shadow-apple-md w-[280px] rotate-1 scale-[1.02] opacity-90 pointer-events-auto">
                  <div className="flex items-start gap-1.5">
                    <GripVertical size={14} className="text-gray-300 mt-0.5" />
                    <p className="text-sm font-semibold text-gray-800 truncate">{activeDrag.title}</p>
                  </div>
                  {isAdmin && activeDrag.assignee_name && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-[8px] font-bold text-white">{activeDrag.assignee_name.charAt(0)}</span>
                      </div>
                      <span className="text-[10px] font-medium text-gray-500">{activeDrag.assignee_name}</span>
                    </div>
                  )}
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {tab === 'documents' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{documents.length} documents</p>
            <button onClick={() => setShowUpload(true)} className="btn-primary"><Upload size={15} /> Upload</button>
          </div>
          {documents.length === 0 ? (
            <div className="card flex flex-col items-center py-16 text-center">
              <FileText size={40} className="text-gray-200 mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium text-gray-500">No documents yet</p>
              <button onClick={() => setShowUpload(true)} className="btn-primary mt-4">Upload Document</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <div key={doc.id} className="card p-5 rounded-2xl border border-gray-150/60 bg-gradient-to-b from-white to-gray-50/30 group hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300">
                  <div className="flex items-start gap-3.5">
                    <div className={`w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0 border shadow-sm ${getFileColor(doc.mime_type)}`}>
                      <FileText size={20} strokeWidth={2} />
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-[15px] font-bold text-gray-900 tracking-tight truncate">{doc.name}</p>
                      <p className="text-[12px] font-medium text-gray-400 mt-1">{doc.uploader_name} · {format(new Date(doc.created_at), 'MMM d')}</p>
                      {doc.file_size && <p className="text-[12px] font-medium text-gray-400">{(doc.file_size/1024/1024).toFixed(1)} MB</p>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="badge bg-gray-100 text-gray-600 capitalize font-semibold">{doc.category?.replace('_',' ')}</span>
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
                      <a href={doc.file_url} target="_blank" rel="noreferrer" className="px-3 py-1.5 text-xs font-bold text-blue-500 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors">View</a>
                      {(doc.uploaded_by === user?.id || isProjectManager) && (
                        <button onClick={async () => { if(!confirm('Delete?')) return; await api.delete(`/documents/${doc.id}`); setDocuments((p) => p.filter((d) => d.id !== doc.id)); }}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'templates' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{templates.length} templates</p>
            <Link to={`/templates?project=${id}`} className="btn-primary"><Plus size={15} /> Upload Template</Link>
          </div>
          {templates.length === 0 ? (
            <div className="card flex flex-col items-center py-16 text-center">
              <Layout size={40} className="text-gray-200 mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium text-gray-500">No templates yet</p>
              <Link to="/templates" className="btn-primary mt-4">Create Template</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((tmpl) => (
                <div key={tmpl.id} className="card p-5 rounded-2xl border border-gray-150/60 bg-gradient-to-b from-white to-gray-50/30 group hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300">
                  <div className="flex items-start justify-between">
                    <div className="w-11 h-11 bg-purple-50 border border-purple-100 rounded-[12px] flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Layout size={20} className="text-purple-600" strokeWidth={2} />
                    </div>
                    <span className="badge bg-gray-100 text-gray-600 capitalize font-semibold">{tmpl.template_type}</span>
                  </div>
                  <p className="text-[16px] font-bold text-gray-900 tracking-tight mt-4">{tmpl.name}</p>
                  {tmpl.description && <p className="text-[13px] font-medium text-gray-500 mt-1.5 line-clamp-2">{tmpl.description}</p>}
                  <p className="text-[12px] font-semibold text-gray-400 mt-3">{tmpl.fields?.length || 0} fields · {tmpl.submission_count || 0} submissions</p>
                  <Link to={`/templates`} className="mt-4 w-full btn-secondary bg-gray-100/50 hover:bg-gray-100 text-gray-800 text-[13px] font-bold py-2.5 flex items-center justify-center rounded-xl transition-colors shadow-sm">Use Template</Link>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'members' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{project.members?.length || 0} members</p>
            {isProjectManager && <button onClick={() => setShowAddMember(true)} className="btn-primary"><Plus size={15} /> Add Member</button>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {project.members?.map((m) => (
              <div key={m.id} className="card p-4 rounded-2xl border border-gray-150/60 bg-gradient-to-b from-white to-gray-50/30 flex items-center gap-3.5 group hover:shadow-[0_4px_20px_rgb(0,0,0,0.05)] transition-all duration-300">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border border-white">
                  {m.avatar_url ? <img src={m.avatar_url} className="w-full h-full rounded-full object-cover" alt="" /> : <span className="text-white font-bold text-lg">{m.name.charAt(0)}</span>}
                </div>
                <div className="flex-1 min-w-0 pt-0.5">
                  <p className="text-[15px] font-bold text-gray-900 tracking-tight truncate">{m.name}</p>
                  <p className="text-[12px] font-medium text-gray-400 truncate">{m.email}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={`badge capitalize font-semibold flex items-center gap-1 ${m.project_role === 'team_leader' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                      {m.project_role === 'team_leader' && <Crown size={10} />}
                      {m.project_role === 'team_leader' ? 'Team Leader' : m.project_role}
                    </span>
                    <span className="badge bg-blue-50 text-blue-600 capitalize font-semibold">{m.role}</span>
                  </div>
                </div>
                {isProjectManager && m.id !== user?.id && (
                  <button onClick={async () => { if(!confirm('Remove member?')) return; await api.delete(`/projects/${id}/members/${m.id}`); setProject((p) => ({...p, members: p.members.filter((x) => x.id !== m.id)})); }}
                    className="opacity-0 group-hover:opacity-100 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <CreateTaskModal open={showTask} onClose={() => setShowTask(false)} onCreated={(t) => { const newTasks = [t, ...tasks]; setTasks(newTasks); updateCache(newTasks); }} projectId={id} members={project.members || []} defaultStatus={defaultStatus} isAdmin={isAdmin} />
      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} onUploaded={(d) => setDocuments((p) => [d,...p])} projectId={id} />
      <AddMemberModal open={showAddMember} onClose={() => setShowAddMember(false)} onAdded={(m) => setProject((p) => ({...p, members: [...(p.members||[]), m]}))} projectId={id} existingMemberIds={project?.members?.map((m) => m.id) || []} />

      {/* Delete Project Confirmation Modal */}
      {showDeleteConfirm && (
        <Modal isOpen={showDeleteConfirm} onClose={() => !deleting && setShowDeleteConfirm(false)} title="Delete Project">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-red-50 rounded-ios">
              <Shield className="text-red-500 flex-shrink-0" size={20} />
              <p className="text-sm text-red-700">
                <span className="font-semibold">Admin only:</span> This will permanently delete the project and all its tasks, documents, and templates. This action cannot be undone.
              </p>
            </div>
            <p className="text-sm text-gray-600">
              You are about to delete <span className="font-semibold text-gray-900">"{project?.name}"</span>.
            </p>
            <p className="text-xs text-gray-400">
              {tasks.length} tasks, {documents.length} documents, {templates.length} templates will be deleted.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={deleting}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-500 text-white text-[15px] font-semibold rounded-full transition-all duration-300 hover:bg-red-600 hover:shadow-[0_8px_20px_rgba(255,59,48,0.3)] disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
