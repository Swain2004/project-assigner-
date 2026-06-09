import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  FileText,
  Layout,
  Users,
  User,
  LogOut,
  X,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/templates', icon: Layout, label: 'Templates' },
];

function NavItem({ to, icon: Icon, label, end, onClick }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onClick}
      className={({ isActive }) =>
        `sidebar-item ${isActive ? 'active' : ''}`
      }
    >
      <Icon size={17} strokeWidth={2} />
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-gray-150 w-64">
      <div className="px-5 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-ios flex items-center justify-center">
            <Briefcase size={16} className="text-white" strokeWidth={2} />
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-none">Project</p>
            <p className="text-xs text-blue-500 font-semibold mt-0.5">Assigner</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} onClick={onClose} />
        ))}

        {user?.role === 'admin' && (
          <>
            <div className="px-3 pt-4 pb-1">
              <p className="text-[10px] font-semibold text-gray-300 uppercase tracking-widest">
                Admin
              </p>
            </div>
            <NavItem to="/users" icon={Users} label="Users" onClick={onClose} />
          </>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100 space-y-0.5">
        <NavLink
          to="/profile"
          onClick={onClose}
          className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
        >
          <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <span className="text-white text-[10px] font-bold">
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{user?.name}</p>
            <p className="text-[11px] text-gray-400 capitalize">{user?.role}</p>
          </div>
        </NavLink>

        <button
          onClick={handleLogout}
          className="sidebar-item w-full text-red-500 hover:text-red-600 hover:bg-red-50"
        >
          <LogOut size={17} strokeWidth={2} />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden lg:flex h-screen sticky top-0">
        {sidebarContent}
      </div>

      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/30" onClick={onClose} />
          <div className="relative z-10 h-full">
            {sidebarContent}
          </div>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 bg-white rounded-full shadow-apple"
          >
            <X size={18} />
          </button>
        </div>
      )}
    </>
  );
}
