import { useState } from 'react';
import { Bell, Search, Menu, User } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface DashboardHeaderProps {
  toggleSidebar: () => void;
  title: string;
}

const DashboardHeader = ({ toggleSidebar, title }: DashboardHeaderProps) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      message: 'New property inquiry received',
      time: '5 minutes ago',
      read: false,
    },
    {
      id: 2,
      message: 'Your property listing was approved',
      time: '1 hour ago',
      read: false,
    },
    {
      id: 3,
      message: 'Payment received for property #1234',
      time: '3 hours ago',
      read: true,
    },
  ]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Searching for:', searchQuery);
    // Implement search functionality
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
    if (isNotificationsOpen) setIsNotificationsOpen(false);
  };

  const toggleNotifications = () => {
    setIsNotificationsOpen(!isNotificationsOpen);
    if (isDropdownOpen) setIsDropdownOpen(false);
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  return (
    <header className="bg-white shadow-sm py-4 px-6 flex items-center justify-between">
      <div className="flex items-center">
        <button
          onClick={toggleSidebar}
          className="mr-4 text-gray-600 hover:text-primary-600 lg:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-heading font-semibold text-gray-900">{title}</h1>
      </div>

      <div className="flex items-center space-x-4">
        {/* Search bar */}
        <form onSubmit={handleSearch} className="relative hidden md:block">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-2 w-64 rounded-full border border-gray-300 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        </form>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={toggleNotifications}
            className="relative p-2 rounded-full text-gray-600 hover:text-primary-600 hover:bg-gray-100 transition-colors"
          >
            <Bell className="h-6 w-6" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 bg-error-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg py-2 z-50 border border-gray-200">
              <div className="px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-medium text-gray-900">Notifications</h3>
                {unreadNotificationsCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                        !notification.read ? 'bg-primary-50' : ''
                      }`}
                    >
                      <p className="text-sm text-gray-800">{notification.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-6 text-center text-gray-500">
                    No notifications
                  </div>
                )}
              </div>
              <div className="px-4 py-2 border-t border-gray-200">
                <button className="text-sm text-primary-600 hover:text-primary-700 w-full text-center">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User profile */}
        <div className="relative">
          <button
            onClick={toggleDropdown}
            className="flex items-center space-x-2 p-1 rounded-full hover:bg-gray-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
              {user?.displayName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="hidden md:inline text-sm font-medium text-gray-700">
              {user?.displayName}
            </span>
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50 border border-gray-200">
              <div className="px-4 py-2 border-b border-gray-200">
                <p className="text-sm font-medium text-gray-900">{user?.displayName}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <a
                href="/profile"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Profile Settings
              </a>
              <a
                href="/wallet"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
              >
                Wallet
              </a>
              <div className="border-t border-gray-200 mt-2 pt-2">
                <a
                  href="/logout"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Logout
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;