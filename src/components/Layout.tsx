import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import api from '../services/api';
import type { Activity } from '../types';
import { 
  BugIcon, 
  LayoutDashboard, 
  FolderKanban, 
  Users, 
  LogOut, 
  User as UserIcon,
  Bell,
  Menu,
  X,
  Clock
} from 'lucide-react';
import { formatDate } from '../lib/utils';

const Layout = () => {
  const { user, logout, setUser } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Activity[]>([]);
  const notificationRef = useRef<HTMLDivElement>(null);

  const isMeaningfulProfilePhoto = (value: unknown) => {
    if (typeof value !== 'string') return false;
    const v = value.trim();
    if (!v) return false;
    if (v === 'null' || v === 'undefined') return false;
    return true;
  };

  useEffect(() => {
    // If auth state was persisted before `profilePhoto` existed,
    // refresh it so avatars render correctly.
    const refreshProfile = async () => {
      if (!user?.token) return; // Don't hit protected APIs without a token.
      if (isMeaningfulProfilePhoto(user.profilePhoto)) return;
      try {
        const response = await api.get('/auth/profile');
        // Keep the existing token in auth state; /auth/profile doesn't return it.
        setUser({
          ...user,
          ...response.data,
          token: user.token,
        });
      } catch (error) {
        console.error('Failed to refresh user profile', error);
      }
    };

    refreshProfile();
  }, [user, setUser]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await api.get('/activities/my');
        setNotifications(response.data);
      } catch (error) {
        console.error('Failed to fetch notifications', error);
      }
    };

    if (user?.token) {
      fetchNotifications();
      // Poll for new notifications every minute
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigation = [
    { 
      name: 'Dashboard', 
      href: user?.role === 'Admin' ? '/admin' : user?.role === 'Tester' ? '/tester' : '/developer', 
      icon: LayoutDashboard 
    },
    { name: 'Projects', href: '/projects', icon: FolderKanban },
    // Bugs are role-based: Developers can resolve assigned bugs, Testers can review reported bugs.
    ...(user?.role === 'Developer' || user?.role === 'Tester'
      ? [{ name: 'Bugs', href: '/bugs', icon: BugIcon }]
      : []),
    ...(user?.role === 'Admin' ? [
      { name: 'Employees', href: '/employees', icon: Users },
      // { name: 'Bug Report', href: '/admin/reports', icon: BugIcon }
    ] : []),
  ];

  const isActive = (path: string) => {
    if (path === '/admin' || path === '/tester' || path === '/developer') {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  // Generate initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const profileImageUrl = (() => {
    const raw = user?.profilePhoto;
    if (!isMeaningfulProfilePhoto(raw)) return null;
    const v = raw.trim();

    // If backend already returns a full URL, use it as-is.
    if (v.startsWith('http://') || v.startsWith('https://')) return v;

    // Otherwise treat it as an uploads path; handle missing leading slash.
    const normalized = v.startsWith('/') ? v : `/${v}`;
    return `http://localhost:5000${normalized}`;
  })();

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar for desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r">
        <div className="flex items-center gap-2 px-6 py-4 border-b">
          <BugIcon className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold">BugTracker</span>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                isActive(item.href)
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-md transition-colors"
          >
            <LogOut className="h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile menu */}
      <div className="md:hidden">
        {/* ... mobile menu implementation ... */}
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b h-16 flex items-center justify-between px-6">
          <button 
            className="md:hidden p-2 -ml-2 text-gray-600"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            {/* Mobile Profile Avatar */}
            <div className="md:hidden h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs border border-primary/20 overflow-hidden">
              {profileImageUrl ? (
                <img src={profileImageUrl} alt={user?.name} className="h-full w-full object-cover" />
              ) : user?.name ? (
                getInitials(user.name)
              ) : (
                <UserIcon className="h-4 w-4" />
              )}
            </div>

            {/* Notifications Dropdown */}
            <div className="relative" ref={notificationRef}>
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-full relative transition-colors"
              >
                <Bell className="h-5 w-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden z-50">
                  <div className="p-4 border-b bg-gray-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-900">Notifications</h3>
                    <span className="text-xs font-medium bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {notifications.length} New
                    </span>
                  </div>
                  <div className="max-h-[400px] overflow-y-auto divide-y">
                    {notifications.length > 0 ? (
                      notifications.map((notification) => (
                        <div key={notification._id} className="p-4 hover:bg-gray-50 transition-colors">
                          <p className="text-sm text-gray-900">
                            <span className="font-semibold">{notification.user?.name || 'Unknown User'}</span> {notification.action}
                          </p>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{notification.details}</p>
                          <p className="text-[10px] text-gray-400 mt-2 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDate(notification.timestamp)}
                          </p>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center text-gray-500 text-sm">
                        No new notifications
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Info in Header */}
            <div className="flex items-center gap-3 pl-4 border-l">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-900 leading-none">{user?.name}</p>
                <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wider mt-1">{user?.role}</p>
              </div>
              <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm border border-primary/20 shrink-0 overflow-hidden">
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt={user?.name} className="h-full w-full object-cover" />
                ) : user?.name ? (
                  getInitials(user.name)
                ) : (
                  <UserIcon className="h-5 w-5" />
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default Layout;
