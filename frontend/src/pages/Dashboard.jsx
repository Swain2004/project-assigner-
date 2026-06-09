import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, CheckSquare, TrendingUp, Users, ArrowRight, Clock, Circle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { formatDistanceToNow } from 'date-fns';

const STATUS_COLORS = {
  todo: 'bg-gray-400',
  in_progress: 'bg-blue-500',
  review: 'bg-orange-500',
  done: 'bg-green-500',
};

const PRIORITY_COLORS = {
  low: 'text-gray-400',
  medium: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-500',
};

function StatCard({ icon: Icon, label, value, color, sublabel }) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-ios flex items-center justify-center ${color}`}>
          <Icon size={18} className="text-white" strokeWidth={2.2} />
        </div>
      </div>
      <div className="mt-4">
        <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
        <p className="text-sm font-medium text-gray-500 mt-0.5">{label}</p>
        {sublabel && <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}

function TaskCard({ task }) {
  return (
    <Link to={`/projects/${task.project_id}`} className="flex items-start gap-3 p-3 rounded-ios hover:bg-gray-50 transition-colors group">
      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${STATUS_COLORS[task.status] || 'bg-gray-300'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate group-hover:text-blue-500 transition-colors">{task.title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400 truncate">{task.project_name}</span>
          {task.due_date && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock size={10} />
              {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>
      <span className={`text-xs font-semibold capitalize ${PRIORITY_COLORS[task.priority]}`}>
        {task.priority}
      </span>
    </Link>
  );
}

function ProjectCard({ project }) {
  const total = parseInt(project.task_count) || 0;
  const done = parseInt(project.completed_tasks) || 0;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <Link
      to={`/projects/${project.id}`}
      className="flex items-center gap-4 p-3 rounded-ios hover:bg-gray-50 transition-colors group"
    >
      <div className="w-9 h-9 rounded-ios flex items-center justify-center flex-shrink-0" style={{ background: project.color || '#007AFF', opacity: 0.9 }}>
        <FolderKanban size={16} className="text-white" strokeWidth={2} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate group-hover:text-blue-500 transition-colors">{project.name}</p>
        <div className="flex items-center gap-2 mt-1.5">
          <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, background: project.color || '#007AFF' }}
            />
          </div>
          <span className="text-xs text-gray-400 flex-shrink-0">{pct}%</span>
        </div>
      </div>
    </Link>
  );
}

const ACTION_LABELS = {
  created_project: 'Created project',
  updated_project: 'Updated project',
  created_task: 'Created task',
  updated_task: 'Updated task',
  uploaded_document: 'Uploaded document',
  created_template: 'Created template',
  submitted_template: 'Submitted template',
};

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [myTasks, setMyTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [statsRes, tasksRes, projectsRes] = await Promise.all([
        api.get('/notifications/dashboard-stats'),
        api.get('/tasks?my_tasks=true'),
        api.get('/projects'),
      ]);

      setStats(statsRes.data.stats);
      setActivity(statsRes.data.recent_activity || []);
      setMyTasks(tasksRes.data.tasks.filter((t) => t.status !== 'done').slice(0, 6));
      setProjects(projectsRes.data.projects.slice(0, 5));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-5 space-y-3">
              <div className="skeleton w-10 h-10 rounded-ios" />
              <div className="skeleton w-16 h-8 rounded" />
              <div className="skeleton w-24 h-4 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
          <span className="text-blue-500">{user?.name?.split(' ')[0]}</span>
        </h2>
        <p className="text-sm text-gray-400 mt-1">Here's what's happening with your projects today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={FolderKanban} label="Active Projects" value={stats?.active_projects ?? 0} color="bg-blue-500" />
        <StatCard icon={CheckSquare} label="My Tasks" value={stats?.my_tasks ?? 0} color="bg-orange-500" sublabel="Pending" />
        <StatCard icon={TrendingUp} label="Completed" value={stats?.completed_tasks ?? 0} color="bg-green-500" sublabel="Tasks done" />
        {user?.role === 'admin' ? (
          <StatCard icon={Users} label="Team Members" value={stats?.team_members ?? 0} color="bg-purple-500" />
        ) : (
          <StatCard icon={Circle} label="Completed" value={stats?.completed_tasks ?? 0} color="bg-teal-500" sublabel="This month" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">My Active Tasks</h3>
              <Link to="/tasks" className="flex items-center gap-1 text-xs font-medium text-blue-500 hover:text-blue-600 transition-colors">
                View all <ArrowRight size={13} />
              </Link>
            </div>
            <div className="p-2">
              {myTasks.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <CheckSquare size={32} className="text-gray-200 mb-2" strokeWidth={1.5} />
                  <p className="text-sm text-gray-400 font-medium">No active tasks</p>
                  <p className="text-xs text-gray-300 mt-0.5">You're all caught up!</p>
                </div>
              ) : (
                myTasks.map((task) => <TaskCard key={task.id} task={task} />)
              )}
            </div>
          </div>

          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">My Projects</h3>
              <Link to="/projects" className="flex items-center gap-1 text-xs font-medium text-blue-500 hover:text-blue-600 transition-colors">
                View all <ArrowRight size={13} />
              </Link>
            </div>
            <div className="p-2">
              {projects.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <FolderKanban size={32} className="text-gray-200 mb-2" strokeWidth={1.5} />
                  <p className="text-sm text-gray-400 font-medium">No projects yet</p>
                </div>
              ) : (
                projects.map((p) => <ProjectCard key={p.id} project={p} />)
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
          </div>
          <div className="p-2 overflow-y-auto max-h-[460px]" data-lenis-prevent>
            {activity.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <TrendingUp size={28} className="text-gray-200 mb-2" strokeWidth={1.5} />
                <p className="text-sm text-gray-400">No activity yet</p>
              </div>
            ) : (
              <div className="space-y-0">
                {activity.map((a) => (
                  <div key={a.id} className="flex items-start gap-3 p-3 hover:bg-gray-50 rounded-ios transition-colors">
                    <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      {a.avatar_url ? (
                        <img src={a.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-gray-500">
                          {a.user_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 leading-snug">
                        <span className="font-semibold">{a.user_name || 'Someone'}</span>{' '}
                        {ACTION_LABELS[a.action] || a.action}
                        {a.metadata?.name && (
                          <span className="font-medium text-gray-800"> "{a.metadata.name}"</span>
                        )}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
