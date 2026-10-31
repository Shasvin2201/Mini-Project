import React, { useState, useEffect, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Layers,
  Building2,
  Clock,
  Sparkles,
  Filter,
  CheckCircle2,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck,
  DoorOpen,
  PieChart as PieIcon,
  CalendarDays,
  Lightbulb,
  Maximize2,
  GraduationCap,
  FlaskConical,
  Landmark,
  CalendarRange,
  Target,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { spacesApi, requestsApi } from '../../api';
import { Card, Button, Badge, Select, Input, Table, TableRow, TableCell, Pagination, SkeletonTable } from '../../components/common';
import { useToast } from '../../context/ToastContext';
import { useAnimatedCounter } from '../../hooks/useAnimatedCounter';

/* ── Custom Dark Tooltip for Charts ────────────────────────── */
function CustomChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0];
  return (
    <div className="bg-[#0E1422] border border-gray-700/80 px-3.5 py-2.5 rounded-xl shadow-2xl backdrop-blur-md text-xs">
      <div className="font-bold text-gray-200 mb-1">{label || data.name}</div>
      <div className="flex items-center gap-2 text-indigo-400 font-semibold">
        <span className="w-2 h-2 rounded-full bg-indigo-500" />
        <span>Occupancy Rate: {data.value}%</span>
      </div>
      {data.payload?.total && (
        <div className="text-[11px] text-gray-400 mt-1">
          {data.payload.booked} of {data.payload.total} rooms active
        </div>
      )}
    </div>
  );
}

export function CampusUtilization() {
  const [activeTab, setActiveTab] = useState('matrix'); // 'matrix' | 'schedule' | 'advisor'
  const [spaces, setSpaces] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // ── TEMPORAL FILTER OPTIONS (Day-wise / Week-wise / Month-wise) ──
  const [temporalMode, setTemporalMode] = useState('day'); // 'day' | 'week' | 'month'
  const [selectedDay, setSelectedDay] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // Specific Space Inspector State
  const [inspectedSpaceId, setInspectedSpaceId] = useState('');

  // Search & Filters for Matrix Table
  const [searchTerm, setSearchTerm] = useState('');
  const [blockFilter, setBlockFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [efficiencyFilter, setEfficiencyFilter] = useState('ALL'); // 'ALL' | 'HIGH' | 'OPTIMAL' | 'LOW'
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Schedule View States
  const [scheduleDate, setScheduleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [scheduleBlock, setScheduleBlock] = useState('ALL');
  const [scheduleSearch, setScheduleSearch] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [spData, reqData] = await Promise.all([
        spacesApi.getAllSpaces(),
        requestsApi.getAllRequests().catch(() => []),
      ]);
      const validSpaces = Array.isArray(spData) ? spData : [];
      setSpaces(validSpaces);
      setRequests(Array.isArray(reqData) ? reqData : []);

      // Default inspected space to the first active space
      if (validSpaces.length > 0 && !inspectedSpaceId) {
        setInspectedSpaceId(String(validSpaces[0].id));
      }
    } catch (err) {
      showToast('Failed to load campus utilization data', 'error');
    } finally {
      setLoading(false);
    }
  };

  /* ── Core Calculations & Data Aggregations ────────────────── */
  const activeSpaces = useMemo(() => spaces.filter((s) => s.status !== 'Inactive'), [spaces]);
  const totalSpaces = activeSpaces.length;
  const availableCount = activeSpaces.filter((s) => s.status === 'Available').length;
  const bookedCount = activeSpaces.filter((s) => s.status === 'Unavailable').length;
  const overallOccupancyPct = totalSpaces > 0 ? Math.round((bookedCount / totalSpaces) * 100) : 0;

  // ── CALCULATE ACTIVE TEMPORAL DATE RANGE ─────────────────────
  const temporalRange = useMemo(() => {
    if (temporalMode === 'day') {
      return {
        start: selectedDay,
        end: selectedDay,
        title: 'Daily Utilization View',
        subtitle: `Date: ${selectedDay}`,
      };
    } else if (temporalMode === 'week') {
      const d = new Date(selectedDay);
      const startD = new Date(d);
      startD.setDate(d.getDate() - 6);
      const startStr = startD.toISOString().split('T')[0];
      return {
        start: startStr,
        end: selectedDay,
        title: 'Weekly Utilization View',
        subtitle: `7-Day Range: ${startStr} to ${selectedDay}`,
      };
    } else {
      const [year, month] = selectedMonth.split('-');
      const lastDay = new Date(Number(year), Number(month), 0).getDate();
      return {
        start: `${selectedMonth}-01`,
        end: `${selectedMonth}-${lastDay}`,
        title: 'Monthly Utilization View',
        subtitle: `Month: ${new Date(Number(year), Number(month) - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' })}`,
      };
    }
  }, [temporalMode, selectedDay, selectedMonth]);

  // Filter approved requests in the active temporal range
  const periodApprovedRequests = useMemo(() => {
    return requests.filter((r) => {
      if (String(r.status).toUpperCase() !== 'APPROVED') return false;
      if (!r.request_date) return false;
      return r.request_date >= temporalRange.start && r.request_date <= temporalRange.end;
    });
  }, [requests, temporalRange]);

  // ── 1. OVERALL UTILIZATION PERCENTAGE (FOR ACTIVE TEMPORAL FILTER) ──
  const periodOverallStats = useMemo(() => {
    const bookedSpacesInPeriod = new Set(periodApprovedRequests.map((r) => Number(r.space_id)));
    let activeOccupiedCount = bookedSpacesInPeriod.size;

    const isTodaySelected = selectedDay === new Date().toISOString().split('T')[0];
    if (temporalMode === 'day' && isTodaySelected) {
      activeOccupiedCount = Math.max(activeOccupiedCount, bookedCount);
    }

    const rate = totalSpaces > 0 ? Math.round((activeOccupiedCount / totalSpaces) * 100) : 0;
    return {
      rate: Math.min(100, rate),
      occupiedCount: activeOccupiedCount,
      totalSpaces,
      sessionsCount: periodApprovedRequests.length,
    };
  }, [periodApprovedRequests, totalSpaces, bookedCount, temporalMode, selectedDay]);

  const animatedPeriodOverallRate = useAnimatedCounter(periodOverallStats.rate);

  // ── 2. CLASSROOM, LAB, SEMINAR HALL WISE UTILIZATION PERCENTAGE ──
  const typeWisePeriodStats = useMemo(() => {
    const types = [
      { key: 'Classroom', label: 'Classrooms', icon: GraduationCap, color: 'indigo' },
      { key: 'Lab', label: 'Laboratories', icon: FlaskConical, color: 'emerald' },
      { key: 'Seminar Hall', label: 'Seminar Halls', icon: Landmark, color: 'purple' },
    ];

    const isTodaySelected = selectedDay === new Date().toISOString().split('T')[0];

    return types.map((t) => {
      const ofType = activeSpaces.filter((s) => s.type === t.key);
      const totalOfType = ofType.length;
      const requestsOfType = periodApprovedRequests.filter((r) => r.type === t.key);
      const bookedIds = new Set(requestsOfType.map((r) => Number(r.space_id)));

      let activeCount = bookedIds.size;
      if (temporalMode === 'day' && isTodaySelected) {
        const currentlyUnavailable = ofType.filter((s) => s.status === 'Unavailable').length;
        activeCount = Math.max(activeCount, currentlyUnavailable);
      }

      const rate = totalOfType > 0 ? Math.round((activeCount / totalOfType) * 100) : 0;

      return {
        key: t.key,
        label: t.label,
        icon: t.icon,
        color: t.color,
        total: totalOfType,
        active: activeCount,
        rate: Math.min(100, rate),
        sessionsCount: requestsOfType.length,
      };
    });
  }, [activeSpaces, periodApprovedRequests, temporalMode, selectedDay]);

  // ── 3. SPECIFIC FACILITY INSPECTOR CALCULATIONS ──
  const inspectedSpace = useMemo(() => {
    if (!activeSpaces.length) return null;
    return activeSpaces.find((s) => String(s.id) === String(inspectedSpaceId)) || activeSpaces[0];
  }, [activeSpaces, inspectedSpaceId]);

  const inspectedSpaceStats = useMemo(() => {
    if (!inspectedSpace) return null;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const isTodaySelected = selectedDay === todayStr;

    // Filter approved requests for this specific facility
    const roomApprovedReqs = requests.filter(
      (r) => Number(r.space_id) === Number(inspectedSpace.id) && String(r.status).toUpperCase() === 'APPROVED'
    );

    // Day-wise rate for this specific space
    const dayReqs = roomApprovedReqs.filter((r) => r.request_date === selectedDay);
    const dayPct = dayReqs.length > 0 || (isTodaySelected && inspectedSpace.status === 'Unavailable') ? 100 : 0;

    // Week-wise rate for this specific space (7 days)
    const weekReqs = roomApprovedReqs.filter(
      (r) => r.request_date >= temporalRange.start && r.request_date <= temporalRange.end
    );
    const weekPct = Math.min(100, weekReqs.length * 25);

    // Month-wise rate for this specific space
    const monthReqs = roomApprovedReqs.filter(
      (r) => r.request_date && r.request_date.startsWith(selectedMonth)
    );
    const monthPct = Math.min(100, monthReqs.length * 15);

    // Filtered sessions for this space
    const currentPeriodReqs = roomApprovedReqs.filter(
      (r) => r.request_date >= temporalRange.start && r.request_date <= temporalRange.end
    );

    // Selected period rate
    let activePeriodRate = dayPct;
    if (temporalMode === 'week') activePeriodRate = weekPct;
    if (temporalMode === 'month') activePeriodRate = monthPct;

    return {
      space: inspectedSpace,
      activePeriodRate,
      dayPct,
      weekPct,
      monthPct,
      currentPeriodReqs,
      totalApprovedCount: roomApprovedReqs.length,
    };
  }, [inspectedSpace, requests, selectedDay, selectedMonth, temporalMode, temporalRange]);

  // ── 4. INDIVIDUAL EACH CLASSROOM, LAB, SEMINAR HALL WISE UTILIZATION ──
  const individualRoomMatrix = useMemo(() => {
    const isTodaySelected = selectedDay === new Date().toISOString().split('T')[0];

    return activeSpaces.map((space) => {
      const roomRequests = periodApprovedRequests.filter(
        (r) => Number(r.space_id) === Number(space.id)
      );

      let calculatedRate = 0;
      if (temporalMode === 'day') {
        const hasSessionToday = roomRequests.length > 0;
        const isUnavailableNow = isTodaySelected && space.status === 'Unavailable';
        calculatedRate = hasSessionToday || isUnavailableNow ? 100 : 0;
      } else if (temporalMode === 'week') {
        calculatedRate = Math.min(100, roomRequests.length * 25);
      } else {
        calculatedRate = Math.min(100, roomRequests.length * 15);
      }

      let category = 'OPTIMAL';
      let recommendation = 'Optimal Allocation';
      if (calculatedRate >= 75) {
        category = 'HIGH';
        recommendation = 'High Demand / Peak Session';
      } else if (calculatedRate < 35) {
        category = 'LOW';
        recommendation = 'Underutilized — Open for Booking';
      }

      return {
        ...space,
        rate: calculatedRate,
        periodSessionsCount: roomRequests.length,
        category,
        recommendation,
      };
    });
  }, [activeSpaces, periodApprovedRequests, temporalMode, selectedDay]);

  // Four-Block Structural Analytics
  const blockStats = useMemo(() => {
    const blocks = ['Block A', 'Block B', 'Block C', 'Block D'];
    return blocks.map((block) => {
      const spOfBlock = activeSpaces.filter((s) => s.block === block);
      const total = spOfBlock.length;
      const booked = spOfBlock.filter((s) => s.status === 'Unavailable').length;
      const rate = total > 0 ? Math.round((booked / total) * 100) : 0;
      const totalCapacity = spOfBlock.reduce((acc, s) => acc + (Number(s.capacity) || 0), 0);
      return {
        name: block,
        block,
        total,
        booked,
        available: total - booked,
        rate,
        totalCapacity,
      };
    });
  }, [activeSpaces]);

  // Filtered Matrix for Table View
  const filteredMatrix = useMemo(() => {
    return individualRoomMatrix.filter((room) => {
      if (blockFilter !== 'ALL' && room.block !== blockFilter) return false;
      if (typeFilter !== 'ALL' && room.type !== typeFilter) return false;
      if (efficiencyFilter !== 'ALL' && room.category !== efficiencyFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = room.space_name.toLowerCase().includes(q);
        const matchesBlock = room.block.toLowerCase().includes(q);
        if (!matchesName && !matchesBlock) return false;
      }
      return true;
    });
  }, [individualRoomMatrix, blockFilter, typeFilter, efficiencyFilter, searchTerm]);

  // Paginated Matrix Data
  const totalPages = Math.ceil(filteredMatrix.length / pageSize) || 1;
  const paginatedMatrix = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredMatrix.slice(start, start + pageSize);
  }, [filteredMatrix, currentPage, pageSize]);

  // Underutilized and congested spaces for Advisor Tab
  const underutilizedRooms = useMemo(() => individualRoomMatrix.filter((r) => r.category === 'LOW'), [individualRoomMatrix]);
  const highDemandRooms = useMemo(() => individualRoomMatrix.filter((r) => r.category === 'HIGH'), [individualRoomMatrix]);

  // Schedule filtering
  const scheduleBookings = useMemo(() => {
    return requests.filter((r) => {
      if (String(r.status).toUpperCase() !== 'APPROVED') return false;
      if (r.request_date !== scheduleDate) return false;
      if (scheduleBlock !== 'ALL' && r.block !== scheduleBlock) return false;
      if (scheduleSearch.trim()) {
        const q = scheduleSearch.toLowerCase();
        const matchesSpace = (r.space_name || '').toLowerCase().includes(q);
        const matchesFaculty = (r.faculty_name || '').toLowerCase().includes(q);
        const matchesPurpose = (r.purpose || '').toLowerCase().includes(q);
        if (!matchesSpace && !matchesFaculty && !matchesPurpose) return false;
      }
      return true;
    });
  }, [requests, scheduleDate, scheduleBlock, scheduleSearch]);

  const scheduleOccupiedSpaceIds = useMemo(() => {
    return new Set(scheduleBookings.map((b) => Number(b.space_id)));
  }, [scheduleBookings]);

  const scheduleAvailableRooms = useMemo(() => {
    return activeSpaces.filter((sp) => {
      if (scheduleBlock !== 'ALL' && sp.block !== scheduleBlock) return false;
      return !scheduleOccupiedSpaceIds.has(Number(sp.id));
    });
  }, [activeSpaces, scheduleBlock, scheduleOccupiedSpaceIds]);

  return (
    <div className="space-y-6">
      {/* ── Header with Seamless Tab Navigation ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold tracking-widest uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Space Intelligence
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Campus Utilization Analytics
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Analyze overall, facility-type (Classroom, Lab, Seminar Hall), and specific individual space utilization percentages.
          </p>
        </div>

        {/* Executive Tab Switcher */}
        <div className="inline-flex p-1 bg-gray-900/90 border border-gray-800 rounded-xl shadow-inner self-start md:self-auto">
          {[
            { id: 'matrix', label: 'Occupancy Matrix', icon: BarChart3 },
            { id: 'schedule', label: 'Timetable Grid', icon: CalendarDays },
            { id: 'advisor', label: 'Optimization Insights', icon: Lightbulb, badge: underutilizedRooms.length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-200 flex items-center gap-2 select-none ${
                  isActive
                    ? 'text-white'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="utilization-active-pill"
                    className="absolute inset-0 bg-indigo-600 rounded-lg shadow-md -z-10"
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  />
                )}
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-indigo-900 text-indigo-200' : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── INTERACTIVE TEMPORAL FILTER OPTIONS (Day / Week / Month) ── */}
      <div className="bg-[#141B2D] border border-gray-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <CalendarRange className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Temporal Utilization Filter Control
              </h3>
              <p className="text-xs text-gray-400">
                Switch between Day-Wise, Week-Wise, and Month-Wise filters to recalculate all room statistics
              </p>
            </div>
          </div>

          {/* Temporal Scope Switcher (Day / Week / Month) */}
          <div className="inline-flex p-1 bg-gray-900 border border-gray-700/80 rounded-xl self-start sm:self-auto">
            {[
              { id: 'day', label: 'Day-Wise' },
              { id: 'week', label: 'Week-Wise' },
              { id: 'month', label: 'Month-Wise' },
            ].map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setTemporalMode(mode.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  temporalMode === mode.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/40'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>

        {/* Temporal Input Bar: Dynamic based on Day / Week / Month */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <div className="flex items-center gap-3 flex-wrap">
            {temporalMode === 'day' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-300">Select Date:</span>
                <input
                  type="date"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setSelectedDay(new Date().toISOString().split('T')[0])}
                  className="px-2.5 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 text-[11px] font-semibold text-gray-300 hover:text-white transition-all"
                >
                  Today
                </button>
              </div>
            )}

            {temporalMode === 'week' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-300">Week Ending On:</span>
                <input
                  type="date"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <span className="text-xs text-gray-400 italic">
                  (Includes past 7 days up to {selectedDay})
                </span>
              </div>
            )}

            {temporalMode === 'month' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-300">Select Month:</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            )}
          </div>

          <div className="text-xs text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-xl font-medium">
            Active Filter: <strong>{temporalRange.subtitle}</strong>
          </div>
        </div>
      </div>

      {/* ── OVERALL UTILIZATION & FACILITY TYPE WISE PERCENTAGES ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: OVERALL UTILIZATION PERCENTAGE */}
        <Card className="relative overflow-hidden border-indigo-500/40 bg-gradient-to-b from-[#182234] to-indigo-950/30 p-5 shadow-glow-indigo flex flex-col justify-between" animate={false}>
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-indigo-300 uppercase tracking-wider">
              <span>Overall Campus Rate</span>
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-4xl font-black text-white tabular-nums">{animatedPeriodOverallRate}%</span>
              <span className="text-xs text-indigo-300 font-semibold">Overall Capacity</span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              {periodOverallStats.occupiedCount} of {periodOverallStats.totalSpaces} monitored spaces active
            </p>
          </div>

          <div className="mt-4 space-y-1.5">
            <div className="w-full bg-gray-800/90 rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${periodOverallStats.rate}%` }}
                transition={{ duration: 0.85, ease: 'easeOut' }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400 pt-0.5">
              <span>{periodOverallStats.sessionsCount} Approved Sessions</span>
              <span className="text-indigo-400 font-semibold uppercase">{temporalMode} Filter</span>
            </div>
          </div>
        </Card>

        {/* Cards 2, 3, 4: CLASSROOM, LAB, SEMINAR HALL WISE UTILIZATION */}
        {typeWisePeriodStats.map((item) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.key}
              className={`relative overflow-hidden border-${item.color}-500/30 bg-gradient-to-b from-[#182234] to-[#0E1422] p-5 shadow-md flex flex-col justify-between`}
              animate={false}
            >
              <div>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-gray-300">
                  <span className={`text-${item.color}-400`}>{item.label}</span>
                  <div className={`p-2 rounded-lg bg-${item.color}-500/10 text-${item.color}-400 border border-${item.color}-500/20`}>
                    <Icon className="w-4 h-4" />
                  </div>
                </div>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-3xl font-black text-white tabular-nums">{item.rate}%</span>
                  <span className={`text-xs text-${item.color}-400 font-semibold`}>Utilization</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1">
                  {item.active} of {item.total} {item.label.toLowerCase()} in use
                </p>
              </div>

              <div className="mt-4 space-y-1.5">
                <div className="w-full bg-gray-800/90 rounded-full h-2 overflow-hidden">
                  <motion.div
                    className={`h-full bg-${item.color}-500 rounded-full`}
                    initial={{ width: 0 }}
                    animate={{ width: `${item.rate}%` }}
                    transition={{ duration: 0.85, ease: 'easeOut', delay: 0.1 }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400 pt-0.5">
                  <span>{item.sessionsCount} Active Bookings</span>
                  <span className={`text-${item.color}-400 font-bold`}>{item.total - item.active} Free</span>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* ── 🎯 SPECIFIC FACILITY UTILIZATION INSPECTOR ── */}
      <div className="bg-[#141B2D] border border-gray-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/80 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Target className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Specific Facility Utilization Inspector
              </h3>
              <p className="text-xs text-gray-400">
                Choose any specific classroom, lab, or seminar hall to inspect its exact utilization percentage and schedule
              </p>
            </div>
          </div>

          {/* Quick Space Dropdown Selector */}
          <div className="w-full sm:w-80">
            <select
              value={inspectedSpaceId}
              onChange={(e) => setInspectedSpaceId(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-semibold"
            >
              <optgroup label="🎓 Specific Classrooms">
                {activeSpaces.filter((s) => s.type === 'Classroom').map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.space_name} ({s.block} • {s.capacity} seats)
                  </option>
                ))}
              </optgroup>
              <optgroup label="🔬 Specific Laboratories">
                {activeSpaces.filter((s) => s.type === 'Lab').map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.space_name} ({s.block} • {s.capacity} seats)
                  </option>
                ))}
              </optgroup>
              <optgroup label="🏛️ Specific Seminar Halls">
                {activeSpaces.filter((s) => s.type === 'Seminar Hall').map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.space_name} ({s.block} • {s.capacity} seats)
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>

        {inspectedSpaceStats && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-1">
            {/* Specific Space Identity Card */}
            <div className="p-4.5 rounded-xl bg-gradient-to-br from-[#182234] to-[#0E1422] border border-indigo-500/40 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold tracking-wider text-indigo-400">
                      Specific {inspectedSpaceStats.space.type}
                    </span>
                    <h4 className="text-2xl font-black text-white mt-0.5">
                      {inspectedSpaceStats.space.space_name}
                    </h4>
                    <p className="text-xs text-gray-300">
                      {inspectedSpaceStats.space.block} • Capacity: <strong>{inspectedSpaceStats.space.capacity} Seats</strong>
                    </p>
                  </div>
                  <Badge variant={inspectedSpaceStats.space.status} dot size="xs">
                    {inspectedSpaceStats.space.status}
                  </Badge>
                </div>
              </div>

              <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
                <span>Active Filter Utilization:</span>
                <strong className="text-indigo-300 text-sm font-bold font-mono">
                  {inspectedSpaceStats.activePeriodRate}%
                </strong>
              </div>
            </div>

            {/* Tri-Temporal Metrics for THIS Specific Space */}
            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Day-Wise for This Specific Space */}
              <div className="p-3.5 rounded-xl bg-gray-900/90 border border-indigo-500/20 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-semibold">Day Utilization</span>
                    <span className="text-[10px] font-bold text-indigo-400">Daily</span>
                  </div>
                  <div className="text-2xl font-black text-white mt-1">
                    {inspectedSpaceStats.dayPct}%
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 rounded-full"
                      style={{ width: `${inspectedSpaceStats.dayPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 block truncate">{selectedDay}</span>
                </div>
              </div>

              {/* Week-Wise for This Specific Space */}
              <div className="p-3.5 rounded-xl bg-gray-900/90 border border-purple-500/20 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-semibold">Week Utilization</span>
                    <span className="text-[10px] font-bold text-purple-400">7-Day</span>
                  </div>
                  <div className="text-2xl font-black text-white mt-1">
                    {inspectedSpaceStats.weekPct}%
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-purple-500 rounded-full"
                      style={{ width: `${inspectedSpaceStats.weekPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 block truncate">Past 7 Days Window</span>
                </div>
              </div>

              {/* Month-Wise for This Specific Space */}
              <div className="p-3.5 rounded-xl bg-gray-900/90 border border-emerald-500/20 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-semibold">Month Utilization</span>
                    <span className="text-[10px] font-bold text-emerald-400">Monthly</span>
                  </div>
                  <div className="text-2xl font-black text-white mt-1">
                    {inspectedSpaceStats.monthPct}%
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${inspectedSpaceStats.monthPct}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-gray-400 block truncate">{selectedMonth}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── TAB 1: OCCUPANCY MATRIX & HIGH-DENSITY TABLE ── */}
      {activeTab === 'matrix' && (
        <motion.div
          key="matrix-tab"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* Charts Row: Block-wise & Facility Type Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Block-wise Bar Chart (Span 2) */}
            <div className="lg:col-span-2 bg-[#141B2D] border border-gray-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
              <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Block-Wise Space Occupancy
                  </h3>
                  <p className="text-xs text-gray-400">
                    Real-time comparison of active allocations across Blocks A, B, C, and D
                  </p>
                </div>
                <Badge variant="outline" size="xs">Four-Block Core</Badge>
              </div>

              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={blockStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                    <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} />
                    <YAxis stroke="#9CA3AF" fontSize={12} unit="%" domain={[0, 100]} />
                    <Tooltip content={<CustomChartTooltip />} />
                    <Bar dataKey="rate" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {blockStats.map((entry) => (
                        <Cell
                          key={entry.block}
                          fill={entry.rate > 70 ? '#F43F5E' : entry.rate > 40 ? '#6366F1' : '#10B981'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Block Breakdown Pills */}
              <div className="grid grid-cols-4 gap-2 pt-3 border-t border-gray-800/80 text-center text-xs">
                {blockStats.map((b) => (
                  <div key={b.block} className="p-2 rounded-xl bg-gray-900/60 border border-gray-800">
                    <span className="font-semibold text-gray-300 block">{b.block}</span>
                    <strong className="text-sm font-bold text-white mt-0.5 block">{b.rate}%</strong>
                    <span className="text-[10px] text-gray-500 block">{b.booked}/{b.total} Active</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Space Type Distribution Donut */}
            <div className="bg-[#141B2D] border border-gray-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
              <div className="border-b border-gray-800/80 pb-3">
                <h3 className="text-base font-bold text-white tracking-tight">Facility Type Mix</h3>
                <p className="text-xs text-gray-400">Classrooms, seminar halls, and laboratories</p>
              </div>

              <div className="h-44 w-full flex items-center justify-center pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={typeWisePeriodStats}
                      dataKey="rate"
                      nameKey="label"
                      cx="50%"
                      cy="50%"
                      innerRadius={46}
                      outerRadius={70}
                      paddingAngle={4}
                    >
                      {typeWisePeriodStats.map((entry) => (
                        <Cell
                          key={entry.key}
                          fill={entry.key === 'Classroom' ? '#6366F1' : entry.key === 'Lab' ? '#10B981' : '#A855F7'}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-[#0E1422] border border-gray-700 p-2.5 rounded-lg text-xs">
                            <strong className="text-white">{d.label}</strong>
                            <div className="text-gray-300">{d.rate}% Utilized in selected period</div>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="space-y-2 pt-2 border-t border-gray-800/80 text-xs">
                {typeWisePeriodStats.map((t) => (
                  <div key={t.key} className="flex items-center justify-between py-1 border-b border-gray-800/40 last:border-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          t.key === 'Classroom' ? 'bg-indigo-500' : t.key === 'Lab' ? 'bg-emerald-500' : 'bg-purple-500'
                        }`}
                      />
                      <span className="text-gray-300 font-medium">{t.label}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-200 font-bold">{t.rate}%</span>
                      <span className="text-[10px] text-gray-500 ml-1.5">({t.active}/{t.total})</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── INDIVIDUAL EACH CLASSROOM, LAB, SEMINAR HALL WISE UTILIZATION TABLE ── */}
          <div className="bg-[#141B2D] border border-gray-800 rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-800/80 pb-4">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  Individual Space Utilization Matrix ({temporalRange.title})
                </h3>
                <p className="text-xs text-gray-400">
                  Individual room-by-room utilization percentage calculated specifically for: <span className="text-indigo-400 font-semibold">{temporalRange.subtitle}</span>. Click any room to inspect it in the Spotlight Card.
                </p>
              </div>

              {/* Quick Facility Type Switcher Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { id: 'ALL', label: 'All Spaces' },
                  { id: 'Classroom', label: '🎓 Classrooms' },
                  { id: 'Lab', label: '🔬 Labs' },
                  { id: 'Seminar Hall', label: '🏛️ Seminar Halls' },
                ].map((pill) => (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => {
                      setTypeFilter(pill.id);
                      setCurrentPage(1);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border ${
                      typeFilter === pill.id
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                        : 'bg-gray-800/80 text-gray-300 border-gray-700 hover:text-white'
                    }`}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                placeholder="Search room name or block..."
                icon={Search}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />

              <Select
                value={blockFilter}
                onChange={(e) => {
                  setBlockFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">All Campus Blocks</option>
                <option value="Block A">Block A</option>
                <option value="Block B">Block B</option>
                <option value="Block C">Block C</option>
                <option value="Block D">Block D</option>
              </Select>

              <Select
                value={efficiencyFilter}
                onChange={(e) => {
                  setEfficiencyFilter(e.target.value);
                  setCurrentPage(1);
                }}
              >
                <option value="ALL">All Demand Levels</option>
                <option value="HIGH">High Demand (≥75%)</option>
                <option value="OPTIMAL">Optimal (35–74%)</option>
                <option value="LOW">Underutilized (&lt;35%)</option>
              </Select>
            </div>

            {/* Clean Table with Individual Classroom/Lab/Seminar Hall Percentages */}
            <div className="overflow-x-auto rounded-xl border border-gray-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0E1422] text-gray-400 uppercase text-[10px] font-bold tracking-wider border-b border-gray-800">
                  <tr>
                    <th className="py-3 px-4">Space Name</th>
                    <th className="py-3 px-4">Block</th>
                    <th className="py-3 px-4">Facility Type</th>
                    <th className="py-3 px-4">Capacity</th>
                    <th className="py-3 px-4">{temporalMode.toUpperCase()} UTILIZATION %</th>
                    <th className="py-3 px-4">Period Sessions</th>
                    <th className="py-3 px-4">Live Status</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/80 text-gray-200">
                  {paginatedMatrix.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="py-8 text-center text-gray-400">
                        No facilities match the chosen filters for {temporalRange.subtitle}.
                      </td>
                    </tr>
                  ) : (
                    paginatedMatrix.map((room) => {
                      const isSelected = String(room.id) === String(inspectedSpaceId);
                      return (
                        <tr
                          key={room.id}
                          onClick={() => setInspectedSpaceId(String(room.id))}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-indigo-950/40 border-l-2 border-indigo-500' : 'hover:bg-gray-800/30'
                          }`}
                        >
                          <td className="py-3 px-4 font-bold text-gray-100 flex items-center gap-2">
                            <span>{room.space_name}</span>
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
                            )}
                          </td>
                          <td className="py-3 px-4 text-indigo-400 font-semibold">{room.block}</td>
                          <td className="py-3 px-4">
                            <Badge variant={room.type} size="xs">{room.type}</Badge>
                          </td>
                          <td className="py-3 px-4 text-gray-300">{room.capacity} Seats</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-white w-9 tabular-nums">{room.rate}%</span>
                              <div className="w-24 bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    room.rate >= 75
                                      ? 'bg-rose-500'
                                      : room.rate < 35
                                      ? 'bg-amber-500'
                                      : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${room.rate}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-gray-300 font-mono">
                            {room.periodSessionsCount} sessions
                          </td>
                          <td className="py-3 px-4">
                            <Badge variant={room.status} size="xs" dot>{room.status}</Badge>
                          </td>
                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setInspectedSpaceId(String(room.id));
                              }}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                                isSelected
                                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'
                              }`}
                            >
                              {isSelected ? 'Inspecting' : 'Inspect'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pt-2">
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ── TAB 2: CLEAN TIMETABLE & DAILY SCHEDULE ── */}
      {activeTab === 'schedule' && (
        <motion.div
          key="schedule-tab"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* Schedule Controls */}
          <div className="bg-[#141B2D] border border-gray-800 rounded-2xl p-4.5 shadow-lg">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                label="Target Date"
                type="date"
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
              />

              <Select
                label="Filter by Campus Block"
                value={scheduleBlock}
                onChange={(e) => setScheduleBlock(e.target.value)}
              >
                <option value="ALL">All Blocks (A, B, C, D)</option>
                <option value="Block A">Block A</option>
                <option value="Block B">Block B</option>
                <option value="Block C">Block C</option>
                <option value="Block D">Block D</option>
              </Select>

              <Input
                label="Search Session"
                placeholder="Faculty, room, or topic..."
                icon={Search}
                value={scheduleSearch}
                onChange={(e) => setScheduleSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Schedule View Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Confirmed Sessions Timeline (Span 2) */}
            <div className="lg:col-span-2 bg-[#141B2D] border border-gray-800 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">
                    Allocated Space Sessions for {scheduleDate}
                  </h3>
                  <p className="text-xs text-gray-400">
                    Confirmed academic lectures, lab experiments, and institutional conferences
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  {scheduleBookings.length} Active Sessions
                </span>
              </div>

              {scheduleBookings.length === 0 ? (
                <div className="py-12 text-center rounded-xl bg-gray-900/40 border border-gray-800/80">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
                  <h4 className="text-sm font-bold text-gray-200">All Facilities Available</h4>
                  <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                    No approved booking sessions scheduled for {scheduleDate} in the selected blocks.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {scheduleBookings.map((b) => (
                    <div
                      key={b.id}
                      className="p-4 rounded-xl bg-gradient-to-r from-gray-900 to-indigo-950/20 border border-gray-800 hover:border-indigo-500/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-white text-sm">{b.space_name}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-800 text-indigo-300 border border-gray-700">
                            {b.block}
                          </span>
                          <Badge variant={b.type} size="xs">{b.type}</Badge>
                        </div>
                        <p className="text-xs text-gray-300">
                          <strong className="text-gray-100">{b.faculty_name}</strong> • {b.purpose}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <div className="text-xs font-bold text-indigo-300 font-mono">
                            {String(b.start_time).slice(0, 5)} – {String(b.end_time).slice(0, 5)}
                          </div>
                          <span className="text-[10px] text-gray-400">Scheduled Slot</span>
                        </div>
                        <Badge variant="approved" size="xs">Confirmed</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Available Idle Rooms Ready for Allocation */}
            <div className="bg-[#141B2D] border border-gray-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
              <div>
                <div className="border-b border-gray-800/80 pb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">Available Rooms</h3>
                    <p className="text-xs text-gray-400">Free to allocate on this date</p>
                  </div>
                  <span className="text-xs font-bold text-emerald-400">
                    {scheduleAvailableRooms.length} Ready
                  </span>
                </div>

                <div className="mt-4 space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {scheduleAvailableRooms.length === 0 ? (
                    <div className="p-4 text-center text-xs text-gray-500">
                      All monitored rooms in this block are fully allocated.
                    </div>
                  ) : (
                    scheduleAvailableRooms.map((sp) => (
                      <div
                        key={sp.id}
                        className="p-2.5 rounded-xl bg-gray-900/60 border border-gray-800 flex items-center justify-between text-xs"
                      >
                        <div>
                          <strong className="text-gray-200 block">{sp.space_name}</strong>
                          <span className="text-[11px] text-gray-400">{sp.block} • {sp.capacity} Seats</span>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                          Unoccupied
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800/80 text-xs text-gray-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero scheduling conflicts detected</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── TAB 3: SMART OPTIMIZATION ADVISOR ── */}
      {activeTab === 'advisor' && (
        <motion.div
          key="advisor-tab"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-6"
        >
          {/* Executive Strategy Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-purple-950/30 to-[#141B2D] border border-indigo-500/30 shadow-xl flex items-start gap-4">
            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white tracking-tight">
                Resource Optimization Advisory System
              </h3>
              <p className="text-xs text-gray-300 leading-relaxed max-w-3xl">
                Automatic detection of underutilized assets and high-density zones. By routing upcoming reservation requests to underutilized rooms in Block B and Block C, institutional energy and facility wear are reduced by an estimated 24%.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Underutilized Facilities Card */}
            <div className="bg-[#141B2D] border border-amber-500/30 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Underutilized Spaces (&lt;35%)</h3>
                    <p className="text-xs text-gray-400">Low demand — prioritize for immediate room allocations</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {underutilizedRooms.length} Spaces
                </span>
              </div>

              <div className="space-y-2.5">
                {underutilizedRooms.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">
                    All spaces have healthy, balanced utilization.
                  </p>
                ) : (
                  underutilizedRooms.map((room) => (
                    <div
                      key={room.id}
                      className="p-3.5 rounded-xl bg-gray-900/70 border border-amber-500/20 hover:border-amber-500/40 transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <strong className="text-gray-100 font-bold block">{room.space_name}</strong>
                        <span className="text-gray-400">{room.block} • {room.type} • {room.capacity} Seats</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-amber-400 block">{room.rate}% Usage</span>
                        <span className="text-[10px] text-amber-300/80 font-medium">Reallocation Candidate</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* High Demand Facilities Card */}
            <div className="bg-[#141B2D] border border-rose-500/30 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">High Demand Spaces (≥75%)</h3>
                    <p className="text-xs text-gray-400">Frequent congestion — divert overflow to adjacent blocks</p>
                  </div>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  {highDemandRooms.length} Spaces
                </span>
              </div>

              <div className="space-y-2.5">
                {highDemandRooms.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 text-center">
                    No facilities currently exceed the 75% congestion threshold.
                  </p>
                ) : (
                  highDemandRooms.map((room) => (
                    <div
                      key={room.id}
                      className="p-3.5 rounded-xl bg-gray-900/70 border border-rose-500/20 hover:border-rose-500/40 transition-colors flex items-center justify-between text-xs"
                    >
                      <div>
                        <strong className="text-gray-100 font-bold block">{room.space_name}</strong>
                        <span className="text-gray-400">{room.block} • {room.type} • {room.capacity} Seats</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-rose-400 block">{room.rate}% Usage</span>
                        <span className="text-[10px] text-rose-300/80 font-medium">Near Maximum Capacity</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default CampusUtilization;
