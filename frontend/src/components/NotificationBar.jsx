import { useState, useEffect, useRef } from 'react';

const NotificationBar = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch('/api/notifications', {
        headers: {
          'x-user': JSON.stringify(user)
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setNotifications(data.data || []);
        setUnreadCount((data.data || []).filter(n => !n.is_read).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      const response = await fetch(`/api/notifications/${id}/read`, {
        method: 'PUT'
      });
      const data = await response.json();
      
      if (data.success) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      setIsLoading(true);
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: {
          'x-user': JSON.stringify(user)
        }
      });
      const data = await response.json();
      
      if (data.success) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteNotification = async (id) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE'
      });
      const data = await response.json();
      
      if (data.success) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type) => {
    const icons = {
      attendance: '📅',
      marks: '📝',
      fees: '💰',
      assignment: '📚',
      notice: '📢',
      student_request: '👨‍🎓',
      student_request_status: '✉️',
      enrollment: '🎓',
      payment: '✅',
      results: '🎓',
      result: '🎓',
    };
    return icons[type] || '🔔';
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';
    // SQLite CURRENT_TIMESTAMP is UTC — append 'Z' so JS parses it as UTC
    const utcStr = timestamp.includes('Z') || timestamp.includes('+') ? timestamp : timestamp + 'Z';
    const created = new Date(utcStr);
    const now = new Date();
    const diffMs = now - created;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return created.toLocaleDateString();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 rounded-full hover:bg-blue-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        title="Notifications"
      >
        <span className="text-2xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[600px] flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Notifications</h3>
                <p className="text-xs text-blue-100">{unreadCount} unread</p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  disabled={isLoading}
                  className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Marking...' : 'Mark all read'}
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-6xl mb-3">🔔</div>
                <p className="text-gray-500 font-medium">No notifications yet</p>
                <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 hover:bg-gray-50 transition-colors ${
                      !notification.is_read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 text-2xl">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className={`text-sm font-semibold ${
                            !notification.is_read ? 'text-blue-900' : 'text-gray-900'
                          }`}>
                            {notification.title}
                          </h4>
                          {!notification.is_read && (
                            <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1"></span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        {notification.sender_name && (
                          <p className="text-xs text-gray-500 mt-1">
                            From: {notification.sender_name}
                          </p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">
                            {getTimeAgo(notification.created_at)}
                          </span>
                          <div className="flex items-center gap-2">
                            {!notification.is_read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                              >
                                Mark read
                              </button>
                            )}
                            <button
                              onClick={() => deleteNotification(notification.id)}
                              className="text-xs text-red-600 hover:text-red-800 font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 bg-gray-50 rounded-b-xl border-t border-gray-200">
              <button
                onClick={() => {
                  setShowDropdown(false);
                  // Could navigate to a full notifications page if you create one
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View All Notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBar;
