import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  UserCog,
  Users,
  CreditCard,
  Calendar,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Flag,
  Activity
} from 'lucide-react';
import { profileApi } from '../Api/profileApi';
import { hasPermission } from '../utils/permission';
import nwLogo from '../assets/NW_Logo.svg';
import { IMAGE_BASE_URL } from '../config';

const getProfileImageUrl = (profileImage) => {
  if (!profileImage) return null;
  if (typeof profileImage === 'string') {
    return profileImage.startsWith('http') ? profileImage : `${IMAGE_BASE_URL}/${profileImage}`;
  }
  if (profileImage.path) {
    return profileImage.path.startsWith('http') ? profileImage.path : `${IMAGE_BASE_URL}/${profileImage.path}`;
  }
  return null;
};

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileMenuRef = useRef(null);
  const location = useLocation();

  const [currentAdmin, setCurrentAdmin] = useState(null);

  const loadProfile = async () => {
    // 1. Fetch fresh profile from API
    const token = localStorage.getItem('userToken');
    if (token) {
      try {
        const response = await profileApi();
        if (response && response.data) {
          const profileData = response.data;
          setCurrentAdmin(profileData);
          localStorage.setItem('networth_admin_session', JSON.stringify(profileData));
          return;
        }
      } catch (err) {
        console.warn('Failed to fetch profile in sidebar:', err);
      }
    }

    // 2. Fallback to standard session storage or null
    const sessionRaw = localStorage.getItem('networth_admin_session');
    let sessionUser = null;
    if (sessionRaw) {
      try {
        const parsed = JSON.parse(sessionRaw);
        sessionUser = parsed.data || parsed;
      } catch (e) { }
    }
    const loggedIn = sessionUser || null;
    setCurrentAdmin(loggedIn);
  };

  useEffect(() => {
    loadProfile();
    window.addEventListener('profile_updated', loadProfile);
    return () => window.removeEventListener('profile_updated', loadProfile);
  }, []);

  useEffect(() => {
    function handleClickOutside(event) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('touchstart', handleClickOutside, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('touchstart', handleClickOutside, true);
    };
  }, []);

  const pendingReportsCount = 0;

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Admin Users', path: '/admins', icon: UserCog },
    { name: 'Members', path: '/members', icon: Users },
    { name: 'Plans', path: '/plans', icon: CreditCard },
    { name: 'Activities', path: '/activities', icon: Calendar },
    { name: 'Interactions', path: '/interactions', icon: Activity },
    { name: 'Reports', path: '/reports', icon: Flag },
  ];

  const MODULE_NAME_MAP = {
    'Dashboard': 'Dashboard',
    'Admin Users': 'Admin User',
    'Members': 'Members',
    'Plans': 'Plans',
    'Activities': 'Activities',
    'Interactions': 'Interactions',
    'Reports': 'Reports'
  };

  const filteredMenuItems = menuItems.filter(item => {
    if (!currentAdmin) return false;
    const targetModuleName = MODULE_NAME_MAP[item.name];
    if (!targetModuleName) return true;
    // Show "Admin Users" nav if user can view Admin Users OR User Roles,
    // since the Roles page is only reachable through the Admin Users page.
    if (targetModuleName === 'Admin User') {
      return hasPermission('Admin User', 'view') || hasPermission('User Roles', 'view');
    }
    if (targetModuleName === 'Activities') {
      return hasPermission('Activities', 'view') || hasPermission('Banners', 'view');
    }
    return hasPermission(targetModuleName, 'view');
  });

  return (
    <>
      <nav className="topnav">
        <div className="topnav-container">
          {/* Brand */}
          <div className="topnav-brand">
            <img src={nwLogo} alt="ContactQube" className="topnav-logo" />
          </div>

          {/* Desktop nav links */}
          <div className="topnav-links">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === '/dashboard'
                  ? (location.pathname === '/' || location.pathname === '/dashboard')
                  : location.pathname.startsWith(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`topnav-link ${isActive ? 'active' : ''}`}
                >
                  <Icon size={15} className="topnav-link-icon" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>

          <div className="topnav-right">
            <div className="relative" ref={profileMenuRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="profile-btn"
              >
                <div className="profile-avatar" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {currentAdmin && getProfileImageUrl(currentAdmin.profileImage) ? (
                    <img
                      src={getProfileImageUrl(currentAdmin.profileImage)}
                      alt="Avatar"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    currentAdmin ? currentAdmin.name.charAt(0).toUpperCase() : 'S'
                  )}
                </div>
                <ChevronDown size={14} className="text-slate-500" />
              </button>

              {showProfileMenu && (
                <div className="profile-dropdown animate-in fade-in">
                  <div className="profile-dropdown-header">
                    <p style={{ fontSize: '14px', fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{currentAdmin ? currentAdmin.name : ''}</p>
                    <p style={{ fontSize: '12px', fontWeight: '400', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', color: '#64748b' }}>{currentAdmin ? currentAdmin.email : ''}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowProfileMenu(false);
                      localStorage.removeItem('userToken');
                      localStorage.removeItem('networth_admin_session');
                      window.location.href = '/';
                    }}
                    className="profile-dropdown-item danger"
                  >
                    <LogOut size={14} /> Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile hamburger */}
        <button
          className="topnav-hamburger"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="topnav-mobile-menu animate-in fade-in">
            {filteredMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.path === '/dashboard'
                  ? (location.pathname === '/' || location.pathname === '/dashboard')
                  : location.pathname.startsWith(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`topnav-mobile-link ${isActive ? 'active' : ''}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon size={16} />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </div>
        )}

      </nav>
    </>
  );
}

