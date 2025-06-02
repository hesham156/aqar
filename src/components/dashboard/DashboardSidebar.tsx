import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Home,
  Users,
  Building,
  MessageSquare,
  BarChart2,
  Wallet,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Bell,
  MapPin,
  ShoppingBag,
  BarChart,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth, UserRole } from '../../contexts/AuthContext';
import Logo from '../layout/Logo';

interface MenuItem {
  title: string;
  icon: React.ReactNode;
  path: string;
  roles: UserRole[];
  submenu?: {
    title: string;
    path: string;
  }[];
}

const DashboardSidebar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({});

  if (!user) return null;

  const menuItems: MenuItem[] = [
    {
      title: 'Dashboard',
      icon: <LayoutDashboard className="w-5 h-5" />,
      path: `/dashboard/${user.role}`,
      roles: ['admin', 'seller', 'buyer'],
    },
    {
      title: 'Properties',
      icon: <Building className="w-5 h-5" />,
      path: '/dashboard/properties',
      roles: ['admin', 'seller'],
      submenu: [
        { title: 'All Properties', path: '/dashboard/seller/properties' },
        { title: 'Add Property', path: '/dashboard/seller/properties/add' },
      ],
    },
    {
      title: 'My Properties',
      icon: <Home className="w-5 h-5" />,
      path: '/dashboard/my-properties',
      roles: ['buyer'],
    },
    {
      title: 'Saved Properties',
      icon: <MapPin className="w-5 h-5" />,
      path: '/dashboard/saved-properties',
      roles: ['buyer'],
    },
    {
      title: 'Users',
      icon: <Users className="w-5 h-5" />,
      path: '/dashboard/admin/users',
      roles: ['admin'],
    },
    {
      title: 'Messages',
      icon: <MessageSquare className="w-5 h-5" />,
      path: '/messages',
      roles: ['admin', 'seller', 'buyer'],
    },
    {
      title: 'Analytics',
      icon: <BarChart className="w-5 h-5" />,
      path: '/dashboard/analytics',
      roles: ['admin', 'seller'],
    },
    {
      title: 'Transactions',
      icon: <ShoppingBag className="w-5 h-5" />,
      path: '/dashboard/transactions',
      roles: ['admin', 'buyer'],
    },
    {
      title: 'Wallet',
      icon: <Wallet className="w-5 h-5" />,
      path: '/wallet',
      roles: ['admin', 'seller', 'buyer'],
    },
    {
      title: 'Settings',
      icon: <Settings className="w-5 h-5" />,
      path: '/profile',
      roles: ['admin', 'seller', 'buyer'],
    },
  ];

  const filteredMenuItems = menuItems.filter((item) => item.roles.includes(user.role));

  const toggleSubmenu = (title: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <aside className="bg-white shadow-md w-64 h-screen flex-shrink-0 fixed left-0 top-0 overflow-y-auto z-30">
      <div className="py-6 px-4 border-b border-gray-200">
        <Link to="/" className="flex items-center">
          <Logo className="h-8 w-8" />
          <span className="ml-2 text-xl font-heading font-bold text-gray-900">Aqar</span>
        </Link>
      </div>

      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center">
            {user.displayName?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="ml-3">
            <p className="font-medium text-gray-900">{user.displayName}</p>
            <p className="text-xs text-gray-500 capitalize">{user.role}</p>
          </div>
        </div>
      </div>

      <nav className="mt-2 px-2">
        <ul className="space-y-1">
          {filteredMenuItems.map((item) => (
            <li key={item.title}>
              {item.submenu ? (
                <div>
                  <button
                    onClick={() => toggleSubmenu(item.title)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors ${
                      location.pathname.startsWith(item.path)
                        ? 'bg-primary-50 text-primary-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center">
                      {item.icon}
                      <span className="ml-3 font-medium">{item.title}</span>
                    </div>
                    {expandedMenus[item.title] ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </button>
                  {expandedMenus[item.title] && (
                    <ul className="ml-6 mt-1 space-y-1">
                      {item.submenu.map((subItem) => (
                        <li key={subItem.title}>
                          <Link
                            to={subItem.path}
                            className={`block px-3 py-2 rounded-md transition-colors ${
                              isActive(subItem.path)
                                ? 'bg-primary-50 text-primary-600'
                                : 'text-gray-700 hover:bg-gray-100'
                            }`}
                          >
                            {subItem.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <Link
                  to={item.path}
                  className={`flex items-center px-3 py-2 rounded-md transition-colors ${
                    isActive(item.path)
                      ? 'bg-primary-50 text-primary-600'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.icon}
                  <span className="ml-3 font-medium">{item.title}</span>
                </Link>
              )}
            </li>
          ))}
        </ul>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className="flex items-center w-full px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="ml-3 font-medium">Logout</span>
          </button>
        </div>
      </nav>
    </aside>
  );
};

export default DashboardSidebar;