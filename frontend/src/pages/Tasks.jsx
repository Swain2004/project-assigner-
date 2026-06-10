import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, Calendar, Plus, Search, Filter, Circle } from 'lucide-react';
import { format, isPast } from 'date-fns';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { getCached, setCached } from '../api/cache';
import Modal from '../components/Modal';

const STATUS_STYLE = { todo:'bg-gray-100 text-gray-600', in_progress:'bg-blue-100 text-blue-600', review:'bg-orange-100 text-orange-600', done:'bg-green-100 text-green-600' };
const PRIORITY_STYLE = { low:'priority-low', medium:'priority-medium', high:'priority-high', urgent:'priority-urgent' };
const STATUS_LABELS = { todo:'To Do', in_progress:'In Progress', review:'In Review', done:'Done' };

function TaskRow({ task, onStatusChange }) {
  const overdue = task.due_date && !['done'].includes(task.status) && isPast(new Date(task.due_date));
  return (
    <div className="flex items-center gap-4 px-4 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 group">
      <button
        onClick={() => onStatusChange(task.id, task.status === 'done' ? 'todo' : 'done')}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${task.status === 'done' ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-blue-500'}`}
      >
        {task.status === 'done' && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 5L3.8 7.5L8.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold leading-snug ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {task.project_name && (
            <Link to={`/projects/${task.project_id}`} className="text-xs text-blue-500 hover:text-blue-600 font-medium">{task.project_name}</Link>
          )}
          {task.description && <span className="text-xs text-gray-400 truncate max-w-[200px]">{task.description}</span>}
        </div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value)}
          className="text-xs border border-gray-200 rounded-ios px-2 py-1 bg-white text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <span className={`badge capitalize ${PRIORITY_STYLE[task.priority]}`}>{task.priority}</span>
        {task.due_date && (
          <span className={`text-xs flex items-center gap-1 ${overdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
            <Calendar size={11} />{format(new Date(task.due_date), 'MMM d')}
          </span>
        )}
        {task.assignee_name && (
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center" title={task.assignee_name}>
            <span className="text-[10px] font-bold text-white">{task.assignee_name.charAt(0)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState(() => getCached('/tasks') || []);
  const [projects, setProjects] = useState(() => getCached('/projects') || []);
  const [loading, setLoading] = useState(() => !getCached('/tasks'));
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ status: 'all', priority: 'all', project: 'all', myTasks: false });

  useEffect(() => {
    Promise.all([api.get('/tasks'), api.get('/projects')]).then(([tRes, pRes]) => {
      setCached('/tasks', tRes.data.tasks);
      setCached('/projects', pRes.data.projects);
      setTasks(tRes.data.tasks);
      setProjects(pRes.data.projects);
    }).finally(() => setLoading(false));
  }, []);

  async function handleStatusChange(taskId, status) {
    const res = await api.put(`/tasks/${taskId}`, { status });
    setTasks((prev) => prev.map((t) => t.id === taskId ? res.data.task : t));
  }

  const filtered = tasks.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filters.status !== 'all' && t.status !== filters.status) return false;
    if (filters.priority !== 'all' && t.priority !== filters.priority) return false;
    if (filters.project !== 'all' && t.project_id !== filters.project) return false;
    if (filters.myTasks && t.assigned_to !== user?.id) return false;
    return true;
  });

  const grouped = filtered.reduce((acc, t) => {
    const key = t.status;
    if (!acc[key]) acc[key] = [];
    acc[key].push(t);
    return acc;
  }, {});

  if (loading) return (
    <div className="max-w-4xl mx-auto space-y-3 animate-pulse">
      {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-14 rounded-ios" />)}
    </div>
  );

  return (
    <div className="space-y-5 max-w-5xl mx-auto animate-fade-in">
      <div>
        <h2 className="page-title">Tasks</h2>
        <p className="text-sm text-gray-400 mt-0.5">{tasks.length} total tasks</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks..." />
        </div>
        <select className="input-field w-auto" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="all">All Status</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className="input-field w-auto" value={filters.priority} onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
          <option value="all">All Priority</option>
          {['low','medium','high','urgent'].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="input-field w-auto max-w-[160px]" value={filters.project} onChange={(e) => setFilters({ ...filters, project: e.target.value })}>
          <option value="all">All Projects</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button
          onClick={() => setFilters({ ...filters, myTasks: !filters.myTasks })}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-ios transition-all ${filters.myTasks ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-150'}`}
        >
          <Circle size={14} /> My Tasks
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center py-20 text-center">
          <CheckSquare size={48} className="text-gray-200 mb-4" strokeWidth={1.5} />
          <p className="text-base font-semibold text-gray-500">No tasks found</p>
          <p className="text-sm text-gray-400 mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {['todo','in_progress','review','done'].map((status) => {
            const statusTasks = grouped[status] || [];
            if (statusTasks.length === 0) return null;
            return (
              <div key={status} className="card overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                  <span className={`badge ${STATUS_STYLE[status]} capitalize`}>{STATUS_LABELS[status]}</span>
                  <span className="text-xs text-gray-400 font-medium">{statusTasks.length}</span>
                </div>
                <div>
                  {statusTasks.map((t) => <TaskRow key={t.id} task={t} onStatusChange={handleStatusChange} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
