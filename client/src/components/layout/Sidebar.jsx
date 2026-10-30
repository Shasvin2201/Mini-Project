import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  DoorOpen,
  Users,
  CalendarCheck2,
  BarChart3,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Building2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../context/AuthContext';

export function Sidebar({ isCollapsed, setIsCollapsed, pendingRequestsCount = 0 }) {
  const { role, user } = useAuth();

  const adminLinks = [
    { to: '/admin', label: 'Overview Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/spaces', label: 'Manage Spaces', icon: DoorOpen },
    { to: '/admin/faculty', label: 'Faculty Management', icon: Users },
    {
      to: '/admin/requests',
      label: 'Booking Requests',
      icon: CalendarCheck2,
      badge: pendingRequestsCount > 0 ? pendingRequestsCount : null,
    },
    { to: '/admin/utilization', label: 'Campus Utilization', icon: BarChart3 },
    { to: '/admin/audit', label: 'Security & Audit Logs', icon: ShieldCheck },
  ];

  const facultyLinks = [
    { to: '/faculty', label: 'Faculty Dashboard', icon: LayoutDashboard, end: true },
    { to: '/faculty/spaces', label: 'Find & Book Spaces', icon: DoorOpen },
    { to: '/faculty/requests', label: 'My Requests', icon: CalendarCheck2 },
  ];

  const managementLinks = [
    { to: '/management', label: 'Executive Dashboard', icon: LayoutDashboard, end: true },
    { to: '/management/utilization', label: 'Campus Utilization', icon: BarChart3 },
  ];

  let links = facultyLinks;
  if (role === 'admin') links = adminLinks;
  else if (role === 'management') links = managementLinks;

  return (
    <motion.aside
      className={`fixed top-0 left-0 z-40 h-screen bg-[#0E131F] border-r border-gray-800/80 flex flex-col justify-between overflow-hidden`}
      animate={{ width: isCollapsed ? 80 : 256 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {/* Brand Header */}
      <div>
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-800/80 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center text-white font-extrabold text-lg shadow-lg shadow-indigo-600/30 shrink-0">
              C
            </div>
            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  className="flex flex-col min-w-0"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18 }}
                >
                  <span className="font-extrabold text-sm tracking-wider text-white truncate">
                    CAMPUS SYSTEM
                  </span>
                  <span className="text-[10px] font-semibold text-indigo-400 uppercase tracking-widest truncate">
                    {role ? `${role.toUpperCase()} PORTAL` : 'MANAGEMENT'}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/60 transition-colors shrink-0"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.1 }}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </motion.button>
        </div>

        {/* Navigation items */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-160px)]">
          {links.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-colors duration-150 group relative ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-semibold'
                      : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800/60'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Sliding left accent bar for active item */}
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-active-pill"
                        className="absolute inset-0 rounded-xl bg-indigo-600 -z-10"
                        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                      />
                    )}

                    <Icon
                      className={`w-5 h-5 shrink-0 transition-colors ${
                        isActive ? 'text-white' : 'text-gray-400 group-hover:text-gray-200'
                      }`}
                    />
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.span
                          className="truncate"
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -6 }}
                          transition={{ duration: 0.15 }}
                        >
                          {item.label}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {/* Badge (collapsed: ping dot, expanded: number) */}
                    {item.badge !== null && item.badge !== undefined && !isCollapsed && (
                      <motion.span
                        className="ml-auto bg-amber-500 text-gray-950 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      >
                        {item.badge}
                      </motion.span>
                    )}
                    {isCollapsed && item.badge !== null && item.badge !== undefined && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Campus Info Widget */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            className="p-4 m-3 rounded-2xl bg-[#141B2D] border border-gray-800/80 shrink-0"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-1">
              <Building2 className="w-4 h-4" />
              <span>Campus Network</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Connected to 4 Academic Blocks (A, B, C, D) with real-time room sync.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.aside>
  );
}

export default Sidebar;
