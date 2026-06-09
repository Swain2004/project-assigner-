import { useLocation } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

const pageTitles = {
  '/': 'Dashboard',
  '/projects': 'Projects',
  '/tasks': 'Tasks',
  '/documents': 'Documents',
  '/templates': 'Templates',
  '/users': 'Users',
  '/profile': 'Profile',
};

export default function Header({ onMenuClick, onNotifClick }) {
  const location = useLocation();
  const { unreadCount } = useNotifications();

  const title = pageTitles[location.pathname] ||
    (location.pathname.startsWith('/projects/') ? 'Project Details' : 'Project Assigner');

  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-ios border-b border-gray-150/80 px-6 lg:px-8 h-16 flex items-center gap-4">
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 rounded-ios text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <Menu size={20} />
      </button>

      <h1 className="flex-1 text-xl font-bold text-gray-900 tracking-tight">
        {title}
      </h1>

      <div className="flex items-center gap-2">
        <button
          onClick={onNotifClick}
          className="relative p-2.5 rounded-ios text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all duration-200 active:scale-95"
        >
          <Bell size={20} strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
}
