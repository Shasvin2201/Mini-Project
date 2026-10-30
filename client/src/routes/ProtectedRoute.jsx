import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ allowedRoles = [] }) {
  const { isAuthenticated, role, getDashboardPath } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // Redirect to authorized dashboard
    return <Navigate to={getDashboardPath(role)} replace />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
