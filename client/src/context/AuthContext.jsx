import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('loggedInUser');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('authToken') || null;
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Sync with storage events across multiple tabs if any
    const handleStorageChange = () => {
      try {
        const storedUser = localStorage.getItem('loggedInUser');
        const storedToken = localStorage.getItem('authToken');
        setUser(storedUser ? JSON.parse(storedUser) : null);
        setToken(storedToken || null);
      } catch {
        setUser(null);
        setToken(null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await authApi.login(email, password);
      if (response && response.user) {
        setUser(response.user);
        setToken(response.token || null);
        if (response.token) {
          localStorage.setItem('authToken', response.token);
        }
        localStorage.setItem('loggedInUser', JSON.stringify(response.user));
        return response;
      }
      throw new Error(response?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('loggedInUser');
    sessionStorage.clear();
    window.location.replace('/login');
  };

  const getDashboardPath = (userRole) => {
    const role = (userRole || user?.role || '').toLowerCase();
    switch (role) {
      case 'admin':
        return '/admin';
      case 'faculty':
        return '/faculty';
      case 'management':
        return '/management';
      default:
        return '/login';
    }
  };

  const value = {
    user,
    token,
    role: user?.role || null,
    isAuthenticated: !!user && !!token,
    loading,
    login,
    logout,
    getDashboardPath,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
