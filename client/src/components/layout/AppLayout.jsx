import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { requestsApi } from '../../api';
import { useAuth } from '../../context/AuthContext';

export function AppLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const { role, isAuthenticated } = useAuth();

  useEffect(() => {
    // If admin, periodically fetch pending requests count
    if (isAuthenticated && role === 'admin') {
      const fetchPending = async () => {
        try {
          const res = await requestsApi.getAllRequests();
          if (Array.isArray(res)) {
            const pending = res.filter((r) => String(r.status).toUpperCase() === 'PENDING').length;
            setPendingRequestsCount(pending);
          }
        } catch {
          // Ignore background fetch error
        }
      };

      fetchPending();
      const interval = setInterval(fetchPending, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, role]);

  return (
    <div className="min-h-screen bg-[#0B0F17] flex">
      {/* Sidebar */}
      <Sidebar
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        pendingRequestsCount={pendingRequestsCount}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 min-w-0 ${
          isCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        <Header isCollapsed={isCollapsed} />

        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in fade-in duration-300">
          <Outlet context={{ refreshPendingCount: () => {} }} />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;
