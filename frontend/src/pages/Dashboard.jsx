import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban, CheckSquare, TrendingUp, Users, ArrowRight, Clock, Circle, CheckCircle2, CalendarDays } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import { getCached, setCached } from '../api/cache';
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

const CARD_STYLES = {
  blue: {
    bg: 'from-blue-500/10 to-blue-600/5 hover:from-blue-500/15 hover:to-blue-600/10',
    iconBg: 'bg-blue-500',
    iconColor: 'text-white',
    numberColor: 'text-blue-600',
  },
  orange: {
    bg: 'from-orange-500/10 to-orange-600/5 hover:from-orange-500/15 hover:to-orange-600/10',
    iconBg: 'bg-orange-500',
    iconColor: 'text-white',
    numberColor: 'text-orange-600',
  },
  green: {
    bg: 'from-green-500/10 to-green-600/5 hover:from-green-500/15 hover:to-green-600/10',
    iconBg: 'bg-green-500',
    iconColor: 'text-white',
    numberColor: 'text-green-600',
  },
  purple: {
    bg: 'from-purple-500/10 to-purple-600/5 hover:from-purple-500/15 hover:to-purple-600/10',
    iconBg: 'bg-purple-500',
    iconColor: 'text-white',
    numberColor: 'text-purple-600',
  },
  teal: {
    bg: 'from-teal-500/10 to-teal-600/5 hover:from-teal-500/15 hover:to-teal-600/10',
    iconBg: 'bg-teal-500',
    iconColor: 'text-white',
    numberColor: 'text-teal-600',
  },
};

function StatCard({ icon: Icon, label, value, color, sublabel, to }) {
  const style = CARD_STYLES[color] || CARD_STYLES.blue;
  const cardContent = (
    <>
      {/* Background decoration */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-white/40 rounded-full blur-2xl group-hover:bg-white/60 transition-colors duration-300" />

      <div className="relative flex flex-col h-full">
        {/* Icon and label row */}
        <div className="flex items-start justify-between mb-3">
          <span className="text-[11px] sm:text-xs font-semibold text-gray-500 tracking-wide">{label}</span>
          <div className={`w-9 h-9 rounded-xl ${style.iconBg} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            <Icon className={style.iconColor} size={18} strokeWidth={2} />
          </div>
        </div>

        {/* Value */}
        <div className="mt-auto">
          <span className={`text-[32px] sm:text-[42px] font-bold ${style.numberColor} tracking-tight leading-none`}>
            {value}
          </span>
          {sublabel ? (
            <p className="text-[14px] text-gray-500 mt-1.5 font-bold tracking-wide">{sublabel}</p>
          ) : (
            <div className="mt-1.5 h-5" />
          )}
        </div>
      </div>
    </>
  );

  if (to) {
    return (
      <Link to={to} className={`relative overflow-hidden rounded-2xl p-5 sm:p-6 bg-gradient-to-br ${style.bg} border border-gray-100/50 cursor-pointer group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-gray-200 block`}>
        {cardContent}
      </Link>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 sm:p-6 bg-gradient-to-br ${style.bg} border border-gray-100/50 cursor-pointer group transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-gray-200`}>
      {cardContent}
    </div>
  );
}

function TaskCard({ task }) {
  return (
    <Link to={`/projects/${task.project_id}`} className="flex items-start gap-3.5 p-3.5 rounded-2xl hover:bg-gray-50/80 transition-colors group">
      <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 shadow-sm ${STATUS_COLORS[task.status] || 'bg-gray-300'}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-gray-900 tracking-tight truncate group-hover:text-blue-500 transition-colors">{task.title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[13px] font-medium text-gray-400 truncate">{task.project_name}</span>
          {task.due_date && (
            <span className="text-[12px] font-medium text-gray-400 flex items-center gap-1.5">
              <Clock size={12} />
              {formatDistanceToNow(new Date(task.due_date), { addSuffix: true })}
            </span>
          )}
        </div>
      </div>
      <span className={`text-[11px] font-bold uppercase tracking-wider ${PRIORITY_COLORS[task.priority]}`}>
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
      className="flex items-center gap-4 p-3.5 rounded-2xl hover:bg-gray-50/80 transition-colors group"
    >
      <div className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 shadow-sm" style={{ background: project.color || '#007AFF' }}>
        <FolderKanban size={18} className="text-white" strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold text-gray-900 tracking-tight truncate group-hover:text-blue-500 transition-colors">{project.name}</p>
        <div className="mt-2.5">
          <div className="flex justify-between items-end mb-1.5">
             <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Progress</span>
             <span className="text-[11px] font-bold text-gray-600">{pct}%</span>
          </div>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
              style={{ width: `${pct}%`, background: project.color || '#007AFF' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" style={{ animation: 'shimmer 2s infinite linear' }} />
            </div>
          </div>
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
  const [stats, setStats] = useState(() => getCached('dashboard')?.stats || null);
  const [myTasks, setMyTasks] = useState(() => getCached('dashboard')?.myTasks || []);
  const [projects, setProjects] = useState(() => getCached('dashboard')?.projects || []);
  const [activity, setActivity] = useState(() => getCached('dashboard')?.activity || []);
  const [loading, setLoading] = useState(() => !getCached('dashboard'));

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

      const s = statsRes.data.stats;
      const act = statsRes.data.recent_activity || [];
      const mt = tasksRes.data.tasks.filter((t) => t.status !== 'done').slice(0, 6);
      const proj = projectsRes.data.projects.slice(0, 5);
      setCached('dashboard', { stats: s, activity: act, myTasks: mt, projects: proj });
      setStats(s); setActivity(act); setMyTasks(mt); setProjects(proj);
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
    <div className="space-y-8 animate-slide-up max-w-7xl mx-auto">
      <div className="px-1">
        <h2 className="text-[28px] sm:text-[34px] font-black text-gray-900 tracking-tight leading-tight break-words">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'},{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500">{user?.name ? user.name.split(' ')[0] : 'there'}</span>
        </h2>
        <p className="text-[15px] text-gray-500 mt-2 font-medium">Here's what's happening with your projects today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={FolderKanban} label="Active Projects" value={stats?.active_projects ?? 0} color="blue" to="/projects" />
        <StatCard icon={CheckSquare} label="My Tasks" value={stats?.my_tasks ?? 0} color="orange" sublabel="Pending" to="/tasks" />
        <StatCard icon={CheckCircle2} label="Completed" value={stats?.completed_tasks ?? 0} color="green" sublabel="Tasks Done" to="/tasks?status=done" />
        {user?.role === 'admin' ? (
          <StatCard icon={Users} label="Team Members" value={stats?.team_members ?? 0} color="purple" to="/users" />
        ) : (
          <StatCard icon={CalendarDays} label="Completed" value={stats?.completed_tasks ?? 0} color="purple" sublabel="This Month" to="/tasks?status=done" />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card shadow-apple-sm border-0 ring-1 ring-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100/80 bg-gray-50/50">
              <h3 className="text-[17px] font-bold text-gray-900 tracking-tight">My Active Tasks</h3>
              <Link to="/tasks" className="flex items-center gap-1 text-[11px] font-bold text-blue-500 hover:text-blue-600 transition-colors uppercase tracking-wider bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full">
                View all <ArrowRight size={12} strokeWidth={2.5} />
              </Link>
            </div>
            <div className="p-3">
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

          <div className="card shadow-apple-sm border-0 ring-1 ring-gray-100 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100/80 bg-gray-50/50">
              <h3 className="text-[17px] font-bold text-gray-900 tracking-tight">My Projects</h3>
              <Link to="/projects" className="flex items-center gap-1 text-[11px] font-bold text-blue-500 hover:text-blue-600 transition-colors uppercase tracking-wider bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-full">
                View all <ArrowRight size={12} strokeWidth={2.5} />
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

        <div className="card shadow-apple-sm border-0 ring-1 ring-gray-100 overflow-hidden self-start">
          <div className="px-6 py-5 border-b border-gray-100/80 bg-gray-50/50">
            <h3 className="text-[17px] font-bold text-gray-900 tracking-tight">Recent Activity</h3>
          </div>
          <div className="p-2 overflow-y-auto max-h-[600px]" data-lenis-prevent>
            {activity.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <TrendingUp size={28} className="text-gray-200 mb-2" strokeWidth={1.5} />
                <p className="text-sm text-gray-400">No activity yet</p>
              </div>
            ) : (
              <div className="space-y-0.5 p-2">
                {activity.map((a) => (
                  <div key={a.id} className="flex items-start gap-3.5 p-3 hover:bg-gray-50/80 rounded-2xl transition-colors">
                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm border border-white">
                      {a.avatar_url ? (
                        <img src={a.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <span className="text-[11px] font-bold text-gray-500">
                          {a.user_name?.charAt(0)?.toUpperCase() || '?'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <p className="text-[13px] text-gray-700 leading-snug">
                        <span className="font-bold text-gray-900">{a.user_name || 'Someone'}</span>{' '}
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
