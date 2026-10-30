import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  Lock,
  Clock,
  Plus,
  ArrowRight,
  TrendingUp,
  Layers,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { motion } from 'motion/react';
import { spacesApi, requestsApi } from '../../api';
import { Card, Button, Badge, Modal, SkeletonCard } from '../../components/common';
import { useToast } from '../../context/ToastContext';
import { useAnimatedCounter } from '../../hooks/useAnimatedCounter';

/* ── Animation variants ──────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24 } },
};

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

/* ── Animated stat number ────────────────────────────────────── */
function AnimatedStat({ value, suffix = '' }) {
  const count = useAnimatedCounter(value);
  return (
    <span className="text-3xl font-extrabold text-white tabular-nums">
      {count}{suffix}
    </span>
  );
}

/* ── Compact smart-classroom SVG illustration ────────────────── */
function ClassroomIllustration() {
  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 260 140"
      className="w-52 h-auto opacity-90 select-none pointer-events-none"
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 0.9, x: 0 }}
      transition={{ delay: 0.4, duration: 0.7, ease: 'easeOut' }}
      aria-hidden="true"
    >
      {/* Room background */}
      <rect x="4" y="10" width="252" height="126" rx="8" fill="#1a2540" stroke="#334155" strokeWidth="1.5"/>

      {/* Smartboard */}
      <rect x="24" y="22" width="120" height="66" rx="4" fill="#0f172a" stroke="#6366f1" strokeWidth="1.5"/>
      {/* Board grid lines */}
      <line x1="44" y1="22" x2="44" y2="88" stroke="#6366f1" strokeWidth="0.4" strokeOpacity="0.3"/>
      <line x1="64" y1="22" x2="64" y2="88" stroke="#6366f1" strokeWidth="0.4" strokeOpacity="0.3"/>
      <line x1="84" y1="22" x2="84" y2="88" stroke="#6366f1" strokeWidth="0.4" strokeOpacity="0.3"/>
      <line x1="104" y1="22" x2="104" y2="88" stroke="#6366f1" strokeWidth="0.4" strokeOpacity="0.3"/>
      <line x1="24" y1="44" x2="144" y2="44" stroke="#6366f1" strokeWidth="0.4" strokeOpacity="0.3"/>
      <line x1="24" y1="66" x2="144" y2="66" stroke="#6366f1" strokeWidth="0.4" strokeOpacity="0.3"/>
      {/* Chart bars on board */}
      <rect x="32" y="60" width="8" height="22" rx="1" fill="#6366f1" opacity="0.7"/>
      <rect x="46" y="50" width="8" height="32" rx="1" fill="#818cf8" opacity="0.7"/>
      <rect x="60" y="55" width="8" height="27" rx="1" fill="#10b981" opacity="0.7"/>
      <rect x="74" y="45" width="8" height="37" rx="1" fill="#6366f1" opacity="0.8"/>
      <rect x="88" y="58" width="8" height="24" rx="1" fill="#f59e0b" opacity="0.6"/>
      {/* Board label */}
      <text x="84" y="100" fontSize="6" fill="#94a3b8" textAnchor="middle" fontFamily="sans-serif">ANALYTICS BOARD</text>
      {/* Board stand */}
      <line x1="84" y1="88" x2="84" y2="98" stroke="#475569" strokeWidth="2"/>
      <line x1="72" y1="98" x2="96" y2="98" stroke="#475569" strokeWidth="1.5"/>

      {/* Desk rows – 3 rows × 4 desks */}
      {[0, 1, 2].map((row) =>
        [0, 1, 2, 3].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={160 + col * 22}
            y={26 + row * 30}
            width="16"
            height="10"
            rx="2"
            fill="#1e3a5f"
            stroke="#334155"
            strokeWidth="1"
          />
        ))
      )}
      {/* Seated person silhouettes (simplified circles) */}
      {[0, 1, 2].map((row) =>
        [0, 1, 2, 3].map((col) => (
          <circle
            key={`p-${row}-${col}`}
            cx={168 + col * 22}
            cy={22 + row * 30}
            r={4}
            fill="#334155"
          />
        ))
      )}

      {/* Ambient glow behind board */}
      <ellipse cx="84" cy="55" rx="60" ry="34" fill="#6366f1" opacity="0.04"/>

      {/* Wifi icon top-right */}
      <text x="240" y="28" fontSize="9" fill="#6366f1" opacity="0.5" textAnchor="middle" fontFamily="sans-serif">⬡</text>

      {/* Floor line */}
      <line x1="14" y1="128" x2="246" y2="128" stroke="#334155" strokeWidth="1"/>
    </motion.svg>
  );
}

/* ── Main Component ──────────────────────────────────────────── */
export function AdminDashboard() {
  const [spaces, setSpaces] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);

  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [spacesData, requestsData] = await Promise.all([
        spacesApi.getAllSpaces(),
        requestsApi.getAllRequests().catch(() => []),
      ]);
      setSpaces(Array.isArray(spacesData) ? spacesData : []);
      setRequests(Array.isArray(requestsData) ? requestsData : []);
    } catch (err) {
      showToast('Failed to load dashboard metrics', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Metrics
  const activeSpaces = spaces.filter((s) => s.status !== 'Inactive');
  const totalSpaces = activeSpaces.length;
  const availableSpaces = activeSpaces.filter((s) => s.status === 'Available').length;
  const bookedSpaces = activeSpaces.filter((s) => s.status === 'Unavailable').length;
  const pendingRequests = requests.filter(
    (r) => String(r.status).toUpperCase() === 'PENDING'
  ).length;

  const classroomsCount = activeSpaces.filter((s) => s.type === 'Classroom').length;
  const seminarHallsCount = activeSpaces.filter((s) => s.type === 'Seminar Hall').length;
  const labsCount = activeSpaces.filter((s) => s.type === 'Lab').length;

  // 4-Block Breakdown
  const blockNames = ['Block A', 'Block B', 'Block C', 'Block D'];
  const allBlocks = Array.from(new Set([...blockNames, ...spaces.map((s) => s.block)])).filter(Boolean).sort();

  const openBlockDetails = (blockName) => {
    const blockSpaces = spaces.filter((s) => s.block === blockName);
    const cr = blockSpaces.filter((s) => s.type === 'Classroom').length;
    const sh = blockSpaces.filter((s) => s.type === 'Seminar Hall').length;
    const lab = blockSpaces.filter((s) => s.type === 'Lab').length;
    setSelectedBlock({
      name: blockName,
      spaces: blockSpaces,
      total: blockSpaces.length,
      available: blockSpaces.filter((s) => s.status === 'Available').length,
      booked: blockSpaces.filter((s) => s.status === 'Unavailable').length,
      cr,
      sh,
      lab,
    });
    setIsBlockModalOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-gray-800 rounded-lg animate-pulse" />
          <div className="h-4 w-96 bg-gray-800/60 rounded-lg animate-pulse" />
        </div>
        <SkeletonCard count={4} />
      </div>
    );
  }

  return (
    <motion.div className="space-y-8" initial="hidden" animate="show" variants={staggerContainer}>

      {/* ── Hero Header with Classroom Illustration ── */}
      <motion.div
        variants={fadeUp}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-6"
      >
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold tracking-widest uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            System Control Center
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Campus Overview Dashboard
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Real-time space occupancy, 4-block distribution, and pending approvals.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Classroom illustration — decorative, hidden on small screens */}
          <div className="hidden xl:block">
            <ClassroomIllustration />
          </div>
          <div className="flex flex-col gap-2">
            <Button
              variant="secondary"
              onClick={() => navigate('/admin/utilization')}
              icon={TrendingUp}
            >
              Utilization Analytics
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/admin/spaces')}
              icon={Plus}
            >
              Manage Spaces
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── KPI Stats Grid ── */}
      <motion.div variants={staggerContainer} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Spaces */}
        <motion.div variants={fadeUp}>
          <Card className="relative overflow-hidden border-gray-700/60 hover:border-gray-600 transition-colors h-full" animate={false}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Total Campus Spaces
              </span>
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <AnimatedStat value={totalSpaces} />
              <span className="text-xs text-gray-400">across 4 blocks</span>
            </div>
            <div className="mt-3 text-xs text-gray-400 flex items-center gap-1.5">
              <span className="text-indigo-400 font-medium">100% synchronized</span> with database
            </div>
          </Card>
        </motion.div>

        {/* Available Spaces */}
        <motion.div variants={fadeUp}>
          <Card className="relative overflow-hidden border-emerald-500/20 bg-gradient-to-b from-[#182234] to-emerald-950/20 hover:border-emerald-500/40 transition-colors h-full" animate={false}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                Available Spaces
              </span>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <AnimatedStat value={availableSpaces} />
              <span className="text-xs text-emerald-400 font-semibold">
                {totalSpaces > 0 ? `${Math.round((availableSpaces / totalSpaces) * 100)}% free` : '0%'}
              </span>
            </div>
            <div className="mt-3 text-xs text-gray-400">Ready for instant allocation</div>
          </Card>
        </motion.div>

        {/* Booked */}
        <motion.div variants={fadeUp}>
          <Card className="relative overflow-hidden border-rose-500/20 bg-gradient-to-b from-[#182234] to-rose-950/20 hover:border-rose-500/40 transition-colors h-full" animate={false}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
                Currently Booked
              </span>
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <Lock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <AnimatedStat value={bookedSpaces} />
              <span className="text-xs text-rose-400 font-semibold">
                {totalSpaces > 0 ? `${Math.round((bookedSpaces / totalSpaces) * 100)}% booked` : '0%'}
              </span>
            </div>
            <div className="mt-3 text-xs text-gray-400">Unavailable / In session</div>
          </Card>
        </motion.div>

        {/* Pending */}
        <motion.div variants={fadeUp}>
          <Card className="relative overflow-hidden border-amber-500/20 bg-gradient-to-b from-[#182234] to-amber-950/20 hover:border-amber-500/40 transition-colors h-full" animate={false}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
                Pending Requests
              </span>
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <AnimatedStat value={pendingRequests} />
              <span className="text-xs text-amber-400 font-semibold">Awaiting review</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-gray-400">Faculty submissions</span>
              <button
                onClick={() => navigate('/admin/requests')}
                className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
              >
                Review <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* ── Facility Type Distribution ── */}
      <motion.div variants={fadeUp} className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Facility Breakdown</h2>
            <p className="text-xs text-gray-400">Classrooms, seminar halls, and laboratories</p>
          </div>
        </div>

        <motion.div
          variants={staggerContainer}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {[
            { label: 'Classrooms', abbr: 'CR', count: classroomsCount, color: 'indigo', badgeVariant: 'classroom', badgeLabel: 'Academic' },
            { label: 'Seminar Halls', abbr: 'SH', count: seminarHallsCount, color: 'purple', badgeVariant: 'seminar hall', badgeLabel: 'Conferences' },
            { label: 'Laboratories', abbr: 'LAB', count: labsCount, color: 'emerald', badgeVariant: 'lab', badgeLabel: 'Practical' },
          ].map(({ label, abbr, count, color, badgeVariant, badgeLabel }) => (
            <motion.div key={abbr} variants={fadeUp}>
              <Card
                className={`p-5 flex items-center justify-between border-${color}-500/20 hover:border-${color}-500/40 transition-colors h-full`}
                animate={false}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl bg-${color}-500/10 border border-${color}-500/30 text-${color}-400 font-black text-sm flex items-center justify-center`}>
                    {abbr}
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-gray-400 uppercase">{label}</span>
                    <div className="text-2xl font-extrabold text-white mt-0.5">
                      <AnimatedStat value={count} /> <span className="text-base font-semibold text-gray-300">{abbr === 'SH' ? 'Halls' : abbr === 'LAB' ? 'Labs' : 'Rooms'}</span>
                    </div>
                  </div>
                </div>
                <Badge variant={badgeVariant}>{badgeLabel}</Badge>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* ── Campus Blocks Matrix ── */}
      <motion.div variants={fadeUp} className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Campus Blocks Allocation Matrix</h2>
            <p className="text-xs text-gray-400">
              Live block-level capacity, availability, and facility inspection
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-800 text-gray-300 border border-gray-700">
            {allBlocks.length} Campus Blocks
          </span>
        </div>

        <motion.div
          variants={staggerContainer}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {allBlocks.map((blockName) => {
            const blockSpaces = spaces.filter((s) => s.block === blockName);
            const total = blockSpaces.length;
            const available = blockSpaces.filter((s) => s.status === 'Available').length;
            const unavailable = blockSpaces.filter((s) => s.status === 'Unavailable').length;
            const occupancyPct = total > 0 ? Math.round((unavailable / total) * 100) : 0;

            return (
              <motion.div key={blockName} variants={fadeUp}>
                <Card
                  className="hover:border-indigo-500/50 transition-colors group flex flex-col justify-between h-full"
                  animate={false}
                >
                  <div>
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base font-bold text-white group-hover:text-indigo-400 transition-colors">
                          {blockName}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">{total} total rooms configured</p>
                      </div>
                      <div className="p-2 rounded-xl bg-gray-800/80 text-gray-300 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <Layers className="w-4 h-4" />
                      </div>
                    </div>

                    {/* Occupancy bar */}
                    <div className="mt-5 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Occupancy Rate</span>
                        <span className="font-semibold text-gray-200">{occupancyPct}%</span>
                      </div>
                      <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${
                            occupancyPct > 75 ? 'bg-rose-500' : occupancyPct > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${occupancyPct}%` }}
                          transition={{ duration: 0.9, ease: 'easeOut', delay: 0.2 }}
                        />
                      </div>
                    </div>

                    {/* Numbers */}
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-gray-700/60 text-xs">
                      <div>
                        <span className="text-gray-400 block">Available</span>
                        <strong className="text-emerald-400 text-sm">{available} Free</strong>
                      </div>
                      <div>
                        <span className="text-gray-400 block">Booked</span>
                        <strong className="text-rose-400 text-sm">{unavailable} Active</strong>
                      </div>
                    </div>
                  </div>

                  <motion.button
                    type="button"
                    onClick={() => openBlockDetails(blockName)}
                    className="mt-5 w-full py-2.5 px-3 rounded-xl bg-gray-800/80 hover:bg-indigo-600/20 hover:border-indigo-500/40 border border-gray-700 text-xs font-semibold text-gray-300 hover:text-indigo-300 transition-colors flex items-center justify-center gap-1.5"
                    whileTap={{ scale: 0.97 }}
                    whileHover={{ scale: 1.02 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Inspect {blockName}</span>
                  </motion.button>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      </motion.div>

      {/* ── Block Details Modal ── */}
      {selectedBlock && (
        <Modal
          isOpen={isBlockModalOpen}
          onClose={() => setIsBlockModalOpen(false)}
          title={`${selectedBlock.name} - Detailed Breakdown`}
          subtitle="Full room inventory, capacity metrics, and live availability"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-gray-900 border border-gray-800 text-center">
                <span className="text-xs text-gray-400 block">Classrooms</span>
                <strong className="text-lg font-bold text-indigo-400">{selectedBlock.cr}</strong>
              </div>
              <div className="p-3.5 rounded-xl bg-gray-900 border border-gray-800 text-center">
                <span className="text-xs text-gray-400 block">Seminar Halls</span>
                <strong className="text-lg font-bold text-purple-400">{selectedBlock.sh}</strong>
              </div>
              <div className="p-3.5 rounded-xl bg-gray-900 border border-gray-800 text-center">
                <span className="text-xs text-gray-400 block">Laboratories</span>
                <strong className="text-lg font-bold text-emerald-400">{selectedBlock.lab}</strong>
              </div>
            </div>

            <div className="border border-gray-700/80 rounded-xl overflow-hidden bg-gray-900/60 max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-800/90 text-gray-300 uppercase text-[10px] font-semibold tracking-wider sticky top-0">
                  <tr>
                    <th className="py-2.5 px-4">Space Name</th>
                    <th className="py-2.5 px-4">Type</th>
                    <th className="py-2.5 px-4">Capacity</th>
                    <th className="py-2.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 text-gray-200">
                  {selectedBlock.spaces.map((sp) => (
                    <tr key={sp.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-gray-100">{sp.space_name}</td>
                      <td className="py-2.5 px-4">
                        <Badge variant={sp.type} size="xs">{sp.type}</Badge>
                      </td>
                      <td className="py-2.5 px-4 text-gray-300">{sp.capacity} Seats</td>
                      <td className="py-2.5 px-4">
                        <Badge variant={sp.status} size="xs" dot>{sp.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="secondary" onClick={() => setIsBlockModalOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </motion.div>
  );
}

export default AdminDashboard;
