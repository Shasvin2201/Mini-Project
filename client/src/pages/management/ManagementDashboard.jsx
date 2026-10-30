import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  CheckCircle2,
  Lock,
  TrendingUp,
  Layers,
  ArrowRight,
  BarChart3,
  Calendar,
} from 'lucide-react';
import { spacesApi, requestsApi } from '../../api';
import { Card, Button, SkeletonCard } from '../../components/common';
import { useToast } from '../../context/ToastContext';

export function ManagementDashboard() {
  const [spaces, setSpaces] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sp, req] = await Promise.all([
        spacesApi.getAllSpaces(),
        requestsApi.getAllRequests().catch(() => []),
      ]);
      setSpaces(Array.isArray(sp) ? sp : []);
      setRequests(Array.isArray(req) ? req : []);
    } catch (err) {
      showToast('Failed to load management overview', 'error');
    } finally {
      setLoading(false);
    }
  };

  const activeSpaces = spaces.filter((s) => s.status !== 'Inactive');
  const totalSpaces = activeSpaces.length;
  const availableSpaces = activeSpaces.filter((s) => s.status === 'Available').length;
  const bookedSpaces = activeSpaces.filter((s) => s.status === 'Unavailable').length;
  const overallOccupancyPct = totalSpaces > 0 ? Math.round((bookedSpaces / totalSpaces) * 100) : 0;

  // 4 Blocks (A, B, C, D)
  const blockNames = ['Block A', 'Block B', 'Block C', 'Block D'];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-64 bg-gray-800 rounded-lg animate-pulse" />
        <SkeletonCard count={4} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-purple-400 text-xs font-bold tracking-widest uppercase mb-1">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            Executive Leadership Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Campus Executive Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            High-level campus space utilization, capacity metrics, and block distribution.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => navigate('/management/utilization')}
          icon={Calendar}
        >
          Utilization Schedule
        </Button>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-gray-700/60">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Total Campus Spaces
          </span>
          <div className="mt-3 text-3xl font-extrabold text-white">{totalSpaces}</div>
          <span className="text-xs text-gray-400 mt-1 block">Monitored academic facilities</span>
        </Card>

        <Card className="border-emerald-500/20 bg-emerald-950/10">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Available Rooms
          </span>
          <div className="mt-3 text-3xl font-extrabold text-white">{availableSpaces}</div>
          <span className="text-xs text-emerald-400 mt-1 block">
            {totalSpaces > 0 ? `${Math.round((availableSpaces / totalSpaces) * 100)}% available` : '0%'}
          </span>
        </Card>

        <Card className="border-rose-500/20 bg-rose-950/10">
          <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
            Currently Booked
          </span>
          <div className="mt-3 text-3xl font-extrabold text-white">{bookedSpaces}</div>
          <span className="text-xs text-rose-400 mt-1 block">Unavailable / In session</span>
        </Card>

        <Card className="border-purple-500/30 bg-purple-950/20 shadow-glow-indigo">
          <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">
            Overall Occupancy
          </span>
          <div className="mt-3 text-3xl font-extrabold text-purple-200">
            {overallOccupancyPct}%
          </div>
          <div className="w-full bg-gray-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-purple-500 h-full rounded-full transition-all duration-700"
              style={{ width: `${overallOccupancyPct}%` }}
            />
          </div>
        </Card>
      </div>

      {/* 4-Block Allocation Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Campus Blocks Status</h2>
            <p className="text-xs text-gray-400">Occupancy rate across academic blocks A through D</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {blockNames.map((blockName) => {
            const blockSpaces = spaces.filter((s) => s.block === blockName);
            const total = blockSpaces.length;
            const booked = blockSpaces.filter((s) => s.status === 'Unavailable').length;
            const available = total - booked;
            const rate = total > 0 ? Math.round((booked / total) * 100) : 0;

            return (
              <Card key={blockName} className="space-y-4 border-gray-800 hover:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-gray-100 text-base">{blockName}</h3>
                  <span className="text-xs font-mono font-bold text-gray-400">{rate}% Occupied</span>
                </div>

                <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      rate > 75 ? 'bg-rose-500' : rate > 40 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{ width: `${rate}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-800">
                  <div>
                    <span className="text-gray-400 block">Available</span>
                    <strong className="text-emerald-400 text-sm">{available}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block">Allocated</span>
                    <strong className="text-rose-400 text-sm">{booked}</strong>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default ManagementDashboard;
