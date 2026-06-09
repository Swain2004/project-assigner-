import { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Upload, Users, CheckSquare, FileText, Layout, Calendar, MoreVertical, Search, Paperclip, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import Modal from '../components/Modal';
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

function TaskCard({ task, onUpdate, onDelete }) {
  const [menu, setMenu] = useState(false);
  return (
    <div className="bg-white border border-gray-150 rounded-ios p-3.5 shadow-apple-sm group hover:shadow-apple transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800 leading-snug flex-1">{task.title}</p>
        <div className="relative flex-shrink-0">
          <button onClick={() => setMenu(!menu)} className="p-1 rounded text-gray-300 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-all">
            <MoreVertical size={14} />
          </button>
          {menu && (
            <div className="absolute right-0 top-6 w-36 bg-white border border-gray-200 rounded-ios shadow-apple-md z-10">
              {STATUSES.map((s) => (
                <button key={s.key} onClick={() => { onUpdate(task.id, { status: s.key }); setMenu(false); }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-gray-50 ${task.status === s.key ? 'font-semibold text-blue-500' : 'text-gray-600'}`}>
                  {s.label}
                </button>
              ))}
              <div className="border-t border-gray-100" />
              <button onClick={() => { onDelete(task.id); setMenu(false); }} className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50">Delete</button>
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
            <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center" title={task.assignee_name}>
              <span className="text-[9px] font-bold text-white">{task.assignee_name.charAt(0)}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateTaskModal({ open, onClose, onCreated, projectId, members, defaultStatus }) {
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
        <div><label className="label">Title *</label><input className="input-field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Task title" required /></div>
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
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Status</label><select className="input-field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>{STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</select></div>
          <div><label className="label">Priority</label><select className="input-field" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>{['low','medium','high','urgent'].map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Assign To</label><select className="input-field" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}><option value="">Unassigned</option>{members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></div>
          <div><label className="label">Due Date</label><input type="date" className="input-field" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></div>
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
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Name</label><input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Document name" /></div>
          <div><label className="label">Category</label><select className="input-field" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {['technical_note','report','specification','proposal','other'].map((c) => <option key={c} value={c}>{c.replace('_',' ')}</option>)}
          </select></div>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3"><button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={loading||!file} className="btn-primary flex-1">{loading?'Uploading...':'Upload'}</button></div>
      </form>
    </Modal>
  );
}

function AddMemberModal({ open, onClose, onAdded, projectId, existingMemberIds = [] }) {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(null);

  useEffect(() => {
    if (!open) { setSearch(''); setResults([]); setError(''); setAdding(null); }
  }, [open]);

  useEffect(() => {
    if (search.trim().length < 1) { setResults([]); setError(''); return; }
    setLoading(true);
    setError('');
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(search.trim())}`);
        const filtered = (res.data.users || []).filter((u) => !existingMemberIds.includes(u.id));
        setResults(filtered);
      } catch (err) {
        setError('Could not load users. Please try again.');
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [search, existingMemberIds]);

  async function add(user) {
    setAdding(user.id);
    try {
      const res = await api.post(`/projects/${projectId}/members`, { user_id: user.id });
      onAdded(res.data.member);
      setSearch('');
      setResults([]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setAdding(null);
    }
  }

  const AVATAR_COLORS = ['bg-blue-500','bg-purple-500','bg-green-500','bg-orange-500','bg-pink-500','bg-teal-500'];
  function avatarColor(name) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]; }

  return (
    <Modal isOpen={open} onClose={onClose} title="Add Team Member" size="sm">
      <div className="space-y-3">
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

        {search.trim().length === 0 && (
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
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('tasks');
  const [showTask, setShowTask] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState('todo');
  const [showUpload, setShowUpload] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const isAdmin = user?.role === 'admin';

  useEffect(() => { fetchAll(); }, [id]);

  async function fetchAll() {
    try {
      const [pRes, tRes, dRes, tmRes] = await Promise.all([
        api.get(`/projects/${id}`), api.get(`/tasks?project_id=${id}`),
        api.get(`/documents?project_id=${id}`), api.get(`/templates?project_id=${id}`),
      ]);
      setProject(pRes.data.project); setTasks(tRes.data.tasks);
      setDocuments(dRes.data.documents); setTemplates(tmRes.data.templates);
    } finally { setLoading(false); }
  }

  const handleTaskUpdate = useCallback(async (taskId, updates) => {
    const res = await api.put(`/tasks/${taskId}`, updates);
    setTasks((prev) => prev.map((t) => t.id === taskId ? res.data.task : t));
  }, []);

  const handleTaskDelete = useCallback(async (taskId) => {
    if (!confirm('Delete this task?')) return;
    await api.delete(`/tasks/${taskId}`);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  }, []);

  if (loading) return <div className="max-w-7xl mx-auto"><div className="skeleton h-40 rounded-ios-lg" /></div>;
  if (!project) return <div className="text-center py-20"><p className="text-gray-400">Project not found</p><Link to="/projects" className="btn-primary mt-4 inline-flex">Back</Link></div>;

  const pct = project.stats ? Math.round((parseInt(project.stats.completed_tasks) / Math.max(parseInt(project.stats.total_tasks), 1)) * 100) : 0;
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
        </div>
        <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: project.color || '#007AFF' }} />
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
          <span>{project.stats?.total_tasks || 0} tasks</span>
          <span>{project.stats?.completed_tasks || 0} done</span>
          <span>{project.stats?.in_progress_tasks || 0} in progress</span>
        </div>
      </div>

      <div className="flex items-center gap-1 border-b border-gray-200">
        {[{ key:'tasks',label:'Tasks',icon:CheckSquare,count:tasks.length},{ key:'documents',label:'Documents',icon:FileText,count:documents.length},{ key:'templates',label:'Templates',icon:Layout,count:templates.length},{ key:'members',label:'Members',icon:Users,count:project.members?.length}].map(({key,label,icon:Icon,count}) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px transition-all ${tab===key?'text-blue-500 border-blue-500':'text-gray-500 border-transparent hover:text-gray-700'}`}>
            <Icon size={15} strokeWidth={2}/>{label}
            {count > 0 && <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[11px] font-bold flex items-center justify-center">{count}</span>}
          </button>
        ))}
      </div>

      {tab === 'tasks' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{tasks.length} tasks total</p>
            {(isAdmin || project.members?.some((m) => m.id === user?.id)) && (
              <button onClick={() => { setDefaultStatus('todo'); setShowTask(true); }} className="btn-primary">
                <Plus size={16} strokeWidth={2.5} /> Add Task
              </button>
            )}
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4" data-lenis-prevent>
            {STATUSES.map((s) => (
              <div key={s.key} className="flex-1 min-w-[240px] max-w-[300px]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                    <span className="text-sm font-semibold text-gray-700">{s.label}</span>
                    <span className="w-5 h-5 bg-gray-100 text-gray-500 text-[11px] font-bold rounded-full flex items-center justify-center">{tasksByStatus[s.key]?.length}</span>
                  </div>
                  <button onClick={() => { setDefaultStatus(s.key); setShowTask(true); }} className="w-6 h-6 flex items-center justify-center text-gray-300 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-all">
                    <Plus size={14} strokeWidth={2.5} />
                  </button>
                </div>
                <div className="space-y-2.5 min-h-[80px]">
                  {tasksByStatus[s.key]?.map((t) => <TaskCard key={t.id} task={t} onUpdate={handleTaskUpdate} onDelete={handleTaskDelete} />)}
                  {tasksByStatus[s.key]?.length === 0 && (
                    <div className="border-2 border-dashed border-gray-150 rounded-ios p-4 text-center">
                      <p className="text-xs text-gray-300">No tasks</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {documents.map((doc) => (
                <div key={doc.id} className="card p-4 hover:shadow-apple-md transition-shadow group">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-ios flex items-center justify-center flex-shrink-0 border ${getFileColor(doc.mime_type)}`}>
                      <FileText size={18} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{doc.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{doc.uploader_name} · {format(new Date(doc.created_at), 'MMM d')}</p>
                      {doc.file_size && <p className="text-xs text-gray-400">{(doc.file_size/1024/1024).toFixed(1)} MB</p>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="badge bg-gray-100 text-gray-500 capitalize">{doc.category?.replace('_',' ')}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <a href={doc.file_url} target="_blank" rel="noreferrer" className="px-2 py-1 text-xs font-medium text-blue-500 hover:bg-blue-50 rounded transition-colors">View</a>
                      {(doc.uploaded_by === user?.id || isAdmin) && (
                        <button onClick={async () => { if(!confirm('Delete?')) return; await api.delete(`/documents/${doc.id}`); setDocuments((p) => p.filter((d) => d.id !== doc.id)); }}
                          className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors"><Trash2 size={13} /></button>
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
            <Link to={`/templates?project=${id}`} className="btn-primary"><Plus size={15} /> New Template</Link>
          </div>
          {templates.length === 0 ? (
            <div className="card flex flex-col items-center py-16 text-center">
              <Layout size={40} className="text-gray-200 mb-3" strokeWidth={1.5} />
              <p className="text-sm font-medium text-gray-500">No templates yet</p>
              <Link to="/templates" className="btn-primary mt-4">Create Template</Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {templates.map((tmpl) => (
                <div key={tmpl.id} className="card p-4">
                  <div className="flex items-start justify-between">
                    <div className="w-9 h-9 bg-purple-50 border border-purple-100 rounded-ios flex items-center justify-center flex-shrink-0">
                      <Layout size={16} className="text-purple-500" strokeWidth={1.5} />
                    </div>
                    <span className="badge bg-gray-100 text-gray-500 capitalize">{tmpl.template_type}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-800 mt-3">{tmpl.name}</p>
                  {tmpl.description && <p className="text-xs text-gray-400 mt-1 line-clamp-2">{tmpl.description}</p>}
                  <p className="text-xs text-gray-400 mt-2">{tmpl.fields?.length || 0} fields · {tmpl.submission_count || 0} submissions</p>
                  <Link to={`/templates`} className="mt-3 w-full btn-secondary text-xs py-2 flex items-center justify-center">Use Template</Link>
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
            {isAdmin && <button onClick={() => setShowAddMember(true)} className="btn-primary"><Plus size={15} /> Add Member</button>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {project.members?.map((m) => (
              <div key={m.id} className="card p-4 flex items-center gap-3 group">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  {m.avatar_url ? <img src={m.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="" /> : <span className="text-white font-bold">{m.name.charAt(0)}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{m.name}</p>
                  <p className="text-xs text-gray-400">{m.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="badge bg-gray-100 text-gray-500 capitalize">{m.project_role}</span>
                    <span className="badge bg-blue-50 text-blue-600 capitalize">{m.role}</span>
                  </div>
                </div>
                {isAdmin && m.id !== user?.id && (
                  <button onClick={async () => { if(!confirm('Remove member?')) return; await api.delete(`/projects/${id}/members/${m.id}`); setProject((p) => ({...p, members: p.members.filter((x) => x.id !== m.id)})); }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-500 rounded transition-all">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <CreateTaskModal open={showTask} onClose={() => setShowTask(false)} onCreated={(t) => setTasks((p) => [t,...p])} projectId={id} members={project.members || []} defaultStatus={defaultStatus} />
      <UploadModal open={showUpload} onClose={() => setShowUpload(false)} onUploaded={(d) => setDocuments((p) => [d,...p])} projectId={id} />
      <AddMemberModal open={showAddMember} onClose={() => setShowAddMember(false)} onAdded={(m) => setProject((p) => ({...p, members: [...(p.members||[]), m]}))} projectId={id} existingMemberIds={project?.members?.map((m) => m.id) || []} />
    </div>
  );
}
