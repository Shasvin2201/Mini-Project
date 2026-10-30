import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';

// Auth Pages
import LoginPage from '../pages/auth/LoginPage';
import SignupPage from '../pages/auth/SignupPage';

// Admin Pages
import AdminDashboard from '../pages/admin/AdminDashboard';
import SpacesManagement from '../pages/admin/SpacesManagement';
import FacultyManagement from '../pages/admin/FacultyManagement';
import RequestsManagement from '../pages/admin/RequestsManagement';
import CampusUtilization from '../pages/admin/CampusUtilization';
import AuditLogs from '../pages/admin/AuditLogs';

// Faculty Pages
import FacultyDashboard from '../pages/faculty/FacultyDashboard';
import FindSpaces from '../pages/faculty/FindSpaces';
import MyRequests from '../pages/faculty/MyRequests';

// Management Pages
import ManagementDashboard from '../pages/management/ManagementDashboard';

// Root Redirect component
function RootRedirect() {
  const { isAuthenticated, role, getDashboardPath } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDashboardPath(role)} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      {/* Admin Module Routes */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route path="/admin" element={<AppLayout />}>
          <Route index element={<AdminDashboard />} />
          <Route path="spaces" element={<SpacesManagement />} />
          <Route path="faculty" element={<FacultyManagement />} />
          <Route path="requests" element={<RequestsManagement />} />
          <Route path="utilization" element={<CampusUtilization />} />
          <Route path="audit" element={<AuditLogs />} />
        </Route>
      </Route>

      {/* Faculty Module Routes */}
      <Route element={<ProtectedRoute allowedRoles={['faculty']} />}>
        <Route path="/faculty" element={<AppLayout />}>
          <Route index element={<FacultyDashboard />} />
          <Route path="spaces" element={<FindSpaces />} />
          <Route path="requests" element={<MyRequests />} />
        </Route>
      </Route>

      {/* Management Module Routes */}
      <Route element={<ProtectedRoute allowedRoles={['management']} />}>
        <Route path="/management" element={<AppLayout />}>
          <Route index element={<ManagementDashboard />} />
          <Route path="utilization" element={<CampusUtilization />} />
        </Route>
      </Route>

      {/* Root & Catch-all */}
      <Route path="/" element={<RootRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default AppRoutes;
