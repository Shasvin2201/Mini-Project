import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  CalendarCheck2,
  ArrowRight,
  DoorOpen,
  Building2,
} from 'lucide-react';
import { motion } from 'motion/react';
import { requestsApi, spacesApi } from '../../api';
import { Card, Button, Badge, SkeletonCard } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAnimatedCounter } from '../../hooks/useAnimatedCounter';

/* ── Animation variants ─────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24 } },
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
};

function AnimatedStat({ value }) {
  const count = useAnimatedCounter(value);
  return <span className="text-3xl font-extrabold text-white tabular-nums">{count}</span>;
}

export function FacultyDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [requests, setRequests] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFacultyData();
  }, [user]);

  const fetchFacultyData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [reqData, spData] = await Promise.all([
        requestsApi.getFacultyRequests(user.id).catch(() => []),
        spacesApi.getAllSpaces().catch(() => []),
      ]);
      setRequests(Array.isArray(reqData) ? reqData : []);
      setSpaces(Array.isArray(spData) ? spData : []);
    } catch (err) {
      showToast('Failed to load faculty portal data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  const availableSpacesCount = spaces.filter((s) => s.status === 'Available').length;
  const recentRequests = requests.slice(0, 5);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-800 rounded-lg animate-pulse" />
        <SkeletonCard count={3} />
      </div>
    );
  }

  return (
    <motion.div className="space-y-8" initial="hidden" animate="show" variants={staggerContainer}>

      {/* ── Welcome Banner ── */}
      <motion.div
        variants={fadeUp}
        className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-indigo-950/60 via-[#141B2D] to-[#182234] border border-indigo-500/20 shadow-2xl relative overflow-hidden"
      >
        <div className="max-w-2xl space-y-3 z-10 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
            <span>Faculty Space Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {user?.name || 'Faculty Member'}! 👋
          </h1>
          <p className="text-sm text-gray-300 leading-relaxed">
            Quickly discover campus facilities, submit booking requests across Blocks A through D, and track your reservation statuses in real time.
          </p>

          <div className="pt-2 flex items-center gap-3">
            <Button
              variant="primary"
              onClick={() => navigate('/faculty/spaces')}
              icon={Search}
            >
              Find &amp; Book Spaces
            </Button>
            <Button
              variant="secondary"
              onClick={() => navigate('/faculty/requests')}
              icon={CalendarCheck2}
            >
              View My Requests
            </Button>
          </div>
        </div>

        {/* Background icon badge */}
        <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 opacity-15 text-indigo-400 pointer-events-none">
          <DoorOpen className="w-56 h-56" />
        </div>
      </motion.div>

      {/* ── KPI Stats ── */}
      <motion.div variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            label: 'Pending Reviews',
            value: pendingCount,
            sublabel: 'Awaiting admin review',
            color: 'amber',
            Icon: Clock,
            cardClass: 'border-amber-500/20 bg-gradient-to-b from-[#182234] to-amber-950/15',
          },
          {
            label: 'Approved Bookings',
            value: approvedCount,
            sublabel: 'Confirmed allocations',
            color: 'emerald',
            Icon: CheckCircle2,
            cardClass: 'border-emerald-500/20 bg-gradient-to-b from-[#182234] to-emerald-950/15',
          },
          {
            label: 'Rejected Requests',
            value: rejectedCount,
            sublabel: 'Declined reservations',
            color: 'rose',
            Icon: XCircle,
            cardClass: 'border-rose-500/20 bg-gradient-to-b from-[#182234] to-rose-950/15',
          },
        ].map(({ label, value, sublabel, color, Icon, cardClass }) => (
          <motion.div key={label} variants={fadeUp}>
            <Card className={`${cardClass} h-full`} animate={false}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-semibold text-${color}-400 uppercase tracking-wider`}>
                  {label}
                </span>
                <div className={`p-2.5 rounded-xl bg-${color}-500/10 text-${color}-400 border border-${color}-500/20`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-baseline gap-2">
                <AnimatedStat value={value} />
                <span className={`text-xs text-${color}-400 font-medium`}>{sublabel}</span>
              </div>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Recent Requests ── */}
      <motion.div variants={fadeUp} className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Recent Space Requests</h2>
            <p className="text-xs text-gray-400">Latest reservations submitted under your account</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/faculty/requests')}
            icon={ArrowRight}
            iconPosition="right"
          >
            All Requests ({requests.length})
          </Button>
        </div>

        {recentRequests.length === 0 ? (
          <Card className="p-8 text-center bg-[#141B2D]" animate={false}>
            <CalendarCheck2 className="w-8 h-8 text-gray-500 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-gray-200">No Booking Requests Found</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              You haven't submitted any room reservation requests yet. Click Find Spaces to allocate classrooms or labs.
            </p>
            <div className="mt-4">
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/faculty/spaces')}
                icon={Search}
              >
                Browse Campus Spaces
              </Button>
            </div>
          </Card>
        ) : (
          <motion.div
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {recentRequests.map((req) => (
              <motion.div key={req.id} variants={fadeUp}>
                <Card className="hover:border-gray-600 transition-colors space-y-3 h-full" animate={false}>
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-gray-100 text-base">{req.space_name}</h4>
                      <span className="text-xs text-gray-400">{req.block}</span>
                    </div>
                    <Badge variant={req.status} dot size="xs">
                      {req.status}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-xs text-gray-300">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Date:</span>
                      <strong className="text-gray-200">{req.request_date}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Time Slot:</span>
                      <strong className="text-indigo-400 font-mono">
                        {String(req.start_time).slice(0, 5)} - {String(req.end_time).slice(0, 5)}
                      </strong>
                    </div>
                  </div>

                  <p className="text-xs text-gray-400 italic line-clamp-2 pt-2 border-t border-gray-800">
                    "{req.purpose}"
                  </p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}

export default FacultyDashboard;
