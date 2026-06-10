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
        `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-[14px] font-medium transition-all duration-200 cursor-pointer ${
          isActive 
            ? 'bg-gray-100 text-gray-900 font-semibold' 
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
          <span>{label}</span>
        </>
      )}
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
    <div className="flex flex-col h-full bg-white w-[260px] border-r border-gray-100">
      <div className="px-6 py-8">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 shadow-apple-sm rounded-ios flex items-center justify-center">
            <Briefcase size={18} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-[15px] font-bold text-gray-900 tracking-tight leading-none">Project</p>
            <p className="text-[12px] text-blue-600 font-semibold mt-1 uppercase tracking-wider">Assigner</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} onClick={onClose} />
        ))}

        {user?.role === 'admin' && (
          <>
            <div className="px-3 pt-6 pb-2">
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                Admin
              </p>
            </div>
            <NavItem to="/users" icon={Users} label="Users" onClick={onClose} />
          </>
        )}
      </nav>

      <div className="p-4 space-y-1 border-t border-gray-200/50 bg-white/30">
        <NavLink
          to="/profile"
          onClick={onClose}
          className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-ios text-[13px] font-medium transition-all duration-200 ease-out active:scale-95 cursor-pointer ${isActive ? 'bg-blue-500/10 shadow-sm' : 'hover:bg-black/5'}`}
        >
          <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <span className="text-white text-xs font-bold">
                {user?.name?.charAt(0)?.toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-gray-900 truncate">{user?.name}</p>
            <p className="text-[11px] text-gray-500 font-medium capitalize">{user?.role}</p>
          </div>
        </NavLink>

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-ios text-[13px] font-semibold text-red-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200 ease-out active:scale-95 cursor-pointer"
        >
          <LogOut size={18} strokeWidth={2.5} />
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
