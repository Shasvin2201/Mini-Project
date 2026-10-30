import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { LogOut, Bell, Shield, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../common/ConfirmModal';

export function Header({ isCollapsed }) {
  const { user, role, logout } = useAuth();
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Generate breadcrumbs from pathname
  const pathParts = location.pathname.split('/').filter(Boolean);
  const breadcrumbMap = {
    admin: 'Admin Control',
    faculty: 'Faculty Portal',
    management: 'Management Analytics',
    spaces: 'Manage Spaces',
    requests: 'Booking Requests',
    utilization: 'Campus Utilization',
    audit: 'Security & Audit Logs',
  };

  const getRoleBadgeColor = () => {
    switch (role) {
      case 'admin':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'faculty':
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
      case 'management':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-gray-800 text-gray-300 border-gray-700';
    }
  };

  return (
    <>
      <header
        className={`sticky top-0 z-30 h-16 bg-[#0B0F17]/80 backdrop-blur-md border-b border-gray-800/80 px-6 flex items-center justify-between transition-all duration-300`}
      >
        {/* Contextual Breadcrumbs */}
        <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-400">
          <Link to={`/${role || 'admin'}`} className="hover:text-gray-200 transition-colors">
            Home
          </Link>
          {pathParts.map((part, index) => {
            const isLast = index === pathParts.length - 1;
            const label = breadcrumbMap[part] || part.charAt(0).toUpperCase() + part.slice(1);
            const routeTo = `/${pathParts.slice(0, index + 1).join('/')}`;

            return (
              <React.Fragment key={part}>
                <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                {isLast ? (
                  <span className="font-semibold text-gray-100">{label}</span>
                ) : (
                  <Link to={routeTo} className="hover:text-gray-200 transition-colors">
                    {label}
                  </Link>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* User Profile & Actions */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 pl-4 border-l border-gray-800">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-800 border border-indigo-500/30 flex items-center justify-center font-bold text-white text-sm shadow-md">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>

            <div className="hidden sm:flex flex-col text-left">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-gray-200 leading-tight">
                  {user?.name || 'Authorized User'}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${getRoleBadgeColor()}`}
                >
                  {role || 'User'}
                </span>
              </div>
              <span className="text-[11px] text-gray-400 truncate max-w-[150px]">
                {user?.email || ''}
              </span>
            </div>

            {/* Logout button */}
            <button
              onClick={() => setShowLogoutModal(true)}
              className="p-2 ml-1 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl border border-transparent hover:border-rose-500/20 transition-all"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      <ConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={logout}
        title="Sign Out"
        message="Are you sure you want to end your current session and return to the login screen?"
        confirmText="Sign Out"
        variant="danger"
      />
    </>
  );
}

export default Header;
