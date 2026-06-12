import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, Calendar, Plus, Search, Filter, Circle } from 'lucide-react';
import { format, isPast } from 'date-fns';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { getCached, setCached } from '../api/cache';
import Modal from '../components/Modal';
import AppleSelect from '../components/AppleSelect';

const STATUS_STYLE = { todo:'bg-gray-100 text-gray-600', in_progress:'bg-blue-100 text-blue-600', review:'bg-orange-100 text-orange-600', done:'bg-green-100 text-green-600' };
const PRIORITY_STYLE = { low:'priority-low', medium:'priority-medium', high:'priority-high', urgent:'priority-urgent' };
const STATUS_LABELS = { todo:'To Do', in_progress:'In Progress', review:'In Review', done:'Done' };

function TaskRow({ task, onStatusChange, isAdmin }) {
  const overdue = task.due_date && !['done'].includes(task.status) && isPast(new Date(task.due_date));
  return (
    <div
      className="hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 last:rounded-b-[24px] group px-4 py-3"
      style={{
        display: 'grid',
        gridTemplateColumns: '24px 1fr 130px 70px 75px minmax(80px, 120px)',
        gap: '10px',
        alignItems: 'center',
      }}
    >
      {/* 1. Checkbox */}
      <button
        onClick={() => onStatusChange(task.id, task.status === 'done' ? 'todo' : 'done')}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${task.status === 'done' ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-blue-500'}`}
      >
        {task.status === 'done' && <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1.5 5L3.8 7.5L8.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>}
      </button>

      {/* 2. Title + project */}
      <div className="min-w-0">
        <p className={`text-sm font-semibold leading-snug truncate ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {task.title}
        </p>
        {task.project_name && (
          <Link to={`/projects/${task.project_id}`} className="text-[11px] text-blue-500 hover:text-blue-600 font-medium truncate block mt-0.5">{task.project_name}</Link>
        )}
      </div>

      {/* 3. Status */}
      <AppleSelect
        value={task.status}
        onChange={(e) => onStatusChange(task.id, e.target.value)}
        options={Object.entries(STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))}
      />

      {/* 4. Priority */}
      <span className={`badge capitalize text-[11px] text-center ${PRIORITY_STYLE[task.priority]}`}>{task.priority}</span>

      {/* 5. Due date */}
      <div>
        {task.due_date ? (
          <span className={`text-xs flex items-center gap-1 whitespace-nowrap ${overdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
            <Calendar size={11} />{format(new Date(task.due_date), 'MMM d')}
          </span>
        ) : (
          <span className="text-xs text-gray-200">—</span>
        )}
      </div>

      {/* 6. Assignee */}
      <div className="flex items-center gap-1.5 min-w-0">
        {task.assignee_name ? (
          <>
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0" title={task.assignee_name}>
              <span className="text-[10px] font-bold text-white">{task.assignee_name.charAt(0)}</span>
            </div>
            <span className="text-xs font-medium text-gray-600 truncate">{task.assignee_name}</span>
          </>
        ) : (
          <span className="text-xs text-gray-300">Unassigned</span>
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
  const isAdmin = user?.role === 'admin';

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
    <div className="space-y-5 max-w-5xl mx-auto animate-fade-in pb-32">
      <div>
        <h2 className="page-title">Tasks</h2>
        <p className="text-sm text-gray-400 mt-0.5">{tasks.length} total tasks</p>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-0 sm:min-w-[200px] sm:max-w-sm">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input-field pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks..." />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <AppleSelect
            className="w-[120px] sm:w-[140px]"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            options={[{ value: 'all', label: 'All Status' }, ...Object.entries(STATUS_LABELS).map(([k, v]) => ({ value: k, label: v }))]}
          />
          <AppleSelect
            className="w-[120px] sm:w-[140px]"
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            options={[{ value: 'all', label: 'All Priority' }, ...['low','medium','high','urgent'].map(p => ({ value: p, label: p.charAt(0).toUpperCase() + p.slice(1) }))]}
          />
          <AppleSelect
            className="w-[130px] sm:w-[160px]"
            value={filters.project}
            onChange={(e) => setFilters({ ...filters, project: e.target.value })}
            options={[{ value: 'all', label: 'All Projects' }, ...projects.map((p) => ({ value: p.id, label: p.name }))]}
          />
          <button
            onClick={() => setFilters({ ...filters, myTasks: !filters.myTasks })}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-sm font-semibold rounded-ios transition-all whitespace-nowrap ${filters.myTasks ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-150'}`}
          >
            <Circle size={14} /> My Tasks
          </button>
        </div>
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
              <div key={status} className="card overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div style={{ minWidth: 600 }}>
                <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 bg-gray-50/50 rounded-t-[24px]">
                  <span className={`badge ${STATUS_STYLE[status]} capitalize`}>{STATUS_LABELS[status]}</span>
                  <span className="text-xs text-gray-400 font-medium">{statusTasks.length}</span>
                </div>
                <div className="flex flex-col">
                  {statusTasks.map((t) => (
                    <TaskRow key={t.id} task={t} onStatusChange={handleStatusChange} isAdmin={isAdmin} />
                  ))}
                </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
