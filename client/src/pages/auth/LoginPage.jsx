import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Shield, ArrowRight, AlertCircle, Building2, UserCheck, KeyRound } from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button, Input } from '../../components/common';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, isAuthenticated, role, getDashboardPath } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(getDashboardPath(role), { replace: true });
    }
  }, [isAuthenticated, role, navigate, getDashboardPath]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Please provide both your institutional email and password.');
      return;
    }

    setLoading(true);
    try {
      const data = await login(cleanEmail, password);
      showToast(`Welcome back, ${data.user.name || 'User'}!`, 'success');
      navigate(getDashboardPath(data.user.role), { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please verify your credentials.');
      showToast(err.message || 'Authentication failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setError('');
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-indigo-600/15 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-emerald-600/10 rounded-full blur-[128px] pointer-events-none" />

      {/* Main Container */}
      <motion.div
        className="w-full max-w-md z-10 space-y-6"
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 240, damping: 26, delay: 0.1 }}
      >
        {/* Brand Header */}
        <motion.div
          className="text-center space-y-2"
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 shadow-xl shadow-indigo-600/30 text-white font-extrabold text-2xl mb-2">
            C
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            CAMPUS SYSTEM
          </h1>
          <p className="text-sm text-gray-400">
            Space Utilization & Management Platform
          </p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          className="bg-[#182234] border border-gray-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl space-y-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, type: 'spring', stiffness: 240, damping: 26 }}
        >
          <div className="border-b border-gray-700/60 pb-4">
            <h2 className="text-lg font-bold text-gray-100">Welcome Back</h2>
            <p className="text-xs text-gray-400 mt-1">
              Sign in with your role-based campus account
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              icon={Mail}
              placeholder="e.g. admin@campus.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />

            <Input
              label="Password"
              type="password"
              icon={Lock}
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full py-3"
              loading={loading}
              icon={ArrowRight}
              iconPosition="right"
            >
              Sign In to Portal
            </Button>
          </form>

          {/* Quick Demo Logins Bar */}
          <div className="pt-2 border-t border-gray-700/60">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2.5 text-center">
              Quick Sign-in (Demo Accounts)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin@campus.com', 'admin123')}
                className="px-2 py-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700 text-[11px] font-medium text-gray-300 hover:text-white transition-all text-center flex flex-col items-center gap-1"
              >
                <Shield className="w-3.5 h-3.5 text-rose-400" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('bit@campus.com', 'faculty123')}
                className="px-2 py-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700 text-[11px] font-medium text-gray-300 hover:text-white transition-all text-center flex flex-col items-center gap-1"
              >
                <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                <span>Faculty</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('management@campus.com', 'management123')}
                className="px-2 py-1.5 rounded-lg bg-gray-800/80 hover:bg-gray-700/80 border border-gray-700 text-[11px] font-medium text-gray-300 hover:text-white transition-all text-center flex flex-col items-center gap-1"
              >
                <Building2 className="w-3.5 h-3.5 text-purple-400" />
                <span>Management</span>
              </button>
            </div>
          </div>

          {/* Signup Link */}
          <div className="pt-2 text-center text-xs text-gray-400">
            Need institutional faculty access?{' '}
            <Link
              to="/signup"
              className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 ml-1"
            >
              Sign Up & Verify OTP
            </Link>
          </div>
        </motion.div>

        {/* Footer info */}
        <div className="text-center text-[11px] text-gray-500">
          Academic Year 2024–2026 • Bannari Amman Institute of Technology
        </div>
      </motion.div>
    </div>
  );
}

export default LoginPage;
