import { formatDistanceToNow } from 'date-fns';
import { X, Bell, CheckCheck, Trash2, FolderKanban, CheckSquare, FileText, AtSign } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

const TYPE_CONFIG = {
  task_assigned: { icon: CheckSquare, color: 'text-blue-500 bg-blue-50' },
  task_updated: { icon: CheckSquare, color: 'text-orange-500 bg-orange-50' },
  task_completed: { icon: CheckSquare, color: 'text-green-500 bg-green-50' },
  project_assigned: { icon: FolderKanban, color: 'text-purple-500 bg-purple-50' },
  document_uploaded: { icon: FileText, color: 'text-teal-500 bg-teal-50' },
  mention: { icon: AtSign, color: 'text-pink-500 bg-pink-50' },
};

function NotifIcon({ type }) {
  const config = TYPE_CONFIG[type] || { icon: Bell, color: 'text-gray-500 bg-gray-100' };
  const Icon = config.icon;
  return (
    <div className={`w-9 h-9 rounded-ios flex items-center justify-center flex-shrink-0 ${config.color}`}>
      <Icon size={16} strokeWidth={2} />
    </div>
  );
}

export default function NotificationPanel({ onClose }) {
  const { notifications, markAsRead, markAllAsRead, deleteNotification, clearAll, unreadCount } = useNotifications();
  const navigate = useNavigate();

  function handleClick(notification) {
    if (!notification.is_read) markAsRead(notification.id);
    if (notification.action_url) {
      navigate(notification.action_url);
      onClose();
    }
  }

  return (
    <div className="notification-panel fixed right-0 top-0 h-full w-full sm:w-[400px] bg-white shadow-apple-lg z-50 flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-150">
        <div>
          <h2 className="text-base font-bold text-gray-900">Notifications</h2>
          {unreadCount > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{unreadCount} unread</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-500 hover:bg-blue-50 rounded-ios transition-colors"
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-ios transition-colors"
            >
              <Trash2 size={14} />
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 rounded-ios text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto" data-lenis-prevent>
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 px-8 text-center">
            <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center">
              <Bell size={24} className="text-gray-300" strokeWidth={1.5} />
            </div>
            <p className="text-sm font-medium text-gray-500">No notifications yet</p>
            <p className="text-xs text-gray-400">You'll see activity here when things happen.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`flex items-start gap-3 px-5 py-4 cursor-pointer hover:bg-gray-50 transition-colors group ${
                  !n.is_read ? 'bg-blue-50/40' : ''
                }`}
              >
                <NotifIcon type={n.type} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold leading-snug ${n.is_read ? 'text-gray-600' : 'text-gray-900'}`}>
                    {n.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed line-clamp-2">
                    {n.message}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!n.is_read && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(n.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded text-gray-300 hover:text-red-400 transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
