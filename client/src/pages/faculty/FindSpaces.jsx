import React, { useState, useEffect, useMemo } from 'react';
import { DoorOpen, Search, Filter, Users, CalendarPlus, Building2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { spacesApi } from '../../api';
import { Card, Button, Input, Select, Badge, SkeletonCard } from '../../components/common';
import { BookingModal } from './BookingModal';
import { useToast } from '../../context/ToastContext';

export function FindSpaces() {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [blockFilter, setBlockFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [capacityFilter, setCapacityFilter] = useState('ALL');

  // Booking Modal
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    loadSpaces();
  }, []);

  const loadSpaces = async () => {
    setLoading(true);
    try {
      const data = await spacesApi.getAllSpaces();
      setSpaces(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('Failed to load campus facilities', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Extract distinct blocks (including default Blocks A, B, C, D)
  const availableBlocks = useMemo(() => {
    const defaultBlocks = ['Block A', 'Block B', 'Block C', 'Block D'];
    const dynamicBlocks = spaces.map((s) => s.block).filter(Boolean);
    return Array.from(new Set([...defaultBlocks, ...dynamicBlocks])).sort();
  }, [spaces]);

  // Filtered spaces: Faculty only books spaces that are active and Available
  const filteredSpaces = useMemo(() => {
    return spaces.filter((space) => {
      // Must be active and available
      if (space.status !== 'Available') return false;

      if (blockFilter !== 'ALL' && space.block !== blockFilter) return false;
      if (typeFilter !== 'ALL' && space.type !== typeFilter) return false;
      if (capacityFilter !== 'ALL' && Number(space.capacity) < Number(capacityFilter)) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = space.space_name.toLowerCase().includes(q);
        const matchesBlock = space.block.toLowerCase().includes(q);
        if (!matchesName && !matchesBlock) return false;
      }

      return true;
    });
  }, [spaces, blockFilter, typeFilter, capacityFilter, searchTerm]);

  const handleRequestSpace = (space) => {
    setSelectedSpace(space);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Find & Book Campus Spaces
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Search available classrooms, seminar halls, and laboratories in real time.
          </p>
        </div>
        <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>{filteredSpaces.length} Available Rooms Ready</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-[#141B2D]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            placeholder="Search room name or block..."
            icon={Search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <Select value={blockFilter} onChange={(e) => setBlockFilter(e.target.value)}>
            <option value="ALL">All Campus Blocks</option>
            {availableBlocks.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>

          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="ALL">All Facility Types</option>
            <option value="Classroom">Classroom</option>
            <option value="Seminar Hall">Seminar Hall</option>
            <option value="Lab">Laboratory</option>
          </Select>

          <Select value={capacityFilter} onChange={(e) => setCapacityFilter(e.target.value)}>
            <option value="ALL">Any Seat Capacity</option>
            <option value="20">20+ Seats</option>
            <option value="40">40+ Seats</option>
            <option value="60">60+ Seats</option>
            <option value="100">100+ Seats</option>
          </Select>
        </div>
      </Card>

      {/* Spaces Grid */}
      {loading ? (
        <SkeletonCard count={6} />
      ) : filteredSpaces.length === 0 ? (
        <Card className="p-12 text-center bg-[#141B2D]">
          <DoorOpen className="w-12 h-12 text-gray-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-200">No Available Spaces Match Your Filter</h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
            Try adjusting your capacity or block criteria, or check back later once scheduled classes conclude.
          </p>
          <div className="mt-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setBlockFilter('ALL');
                setTypeFilter('ALL');
                setCapacityFilter('ALL');
                setSearchTerm('');
              }}
            >
              Reset Filters
            </Button>
          </div>
        </Card>
      ) : (
        <motion.div
          key="spaces-grid"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        >
          {filteredSpaces.map((space) => (
            <motion.div
              key={space.id}
              variants={{
                hidden: { opacity: 0, y: 14 },
                show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 280, damping: 24 } },
              }}
            >
              <Card
                className="hover:border-indigo-500/50 transition-colors flex flex-col justify-between h-full"
                animate={false}
              >
                <div>
                  <div className="flex items-start justify-between border-b border-gray-700/60 pb-3.5">
                    <div>
                      <h3 className="font-extrabold text-white text-lg tracking-tight">
                        {space.space_name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-semibold mt-0.5">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{space.block}</span>
                      </div>
                    </div>
                    <Badge variant={space.type}>{space.type}</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 my-4 text-xs">
                    <div className="p-2.5 rounded-xl bg-gray-900 border border-gray-800">
                      <span className="text-gray-400 block mb-0.5">Seat Capacity</span>
                      <strong className="text-gray-200 font-bold text-sm">
                        {space.capacity} Seats
                      </strong>
                    </div>
                    <div className="p-2.5 rounded-xl bg-gray-900 border border-gray-800">
                      <span className="text-gray-400 block mb-0.5">Availability</span>
                      <strong className="text-emerald-400 font-bold text-sm flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Available
                      </strong>
                    </div>
                  </div>
                </div>

                <Button
                  variant="primary"
                  className="w-full py-2.5"
                  onClick={() => handleRequestSpace(space)}
                  icon={CalendarPlus}
                >
                  Request Space
                </Button>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Booking Modal */}
      {selectedSpace && (
        <BookingModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          space={selectedSpace}
          onSuccess={loadSpaces}
        />
      )}
    </div>
  );
}

export default FindSpaces;
