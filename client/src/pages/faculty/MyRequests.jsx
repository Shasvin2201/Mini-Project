import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck2,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  XCircle,
  DoorOpen,
  Plus,
} from 'lucide-react';
import { requestsApi } from '../../api';
import {
  Card,
  Button,
  Input,
  Select,
  Badge,
  Table,
  TableRow,
  TableCell,
  Pagination,
  SkeletonTable,
} from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export function MyRequests() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  useEffect(() => {
    loadMyRequests();
  }, [user]);

  const loadMyRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await requestsApi.getFacultyRequests(user.id);
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast('Failed to load your booking history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (statusFilter !== 'ALL' && req.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesSpace = req.space_name?.toLowerCase().includes(q);
        const matchesBlock = req.block?.toLowerCase().includes(q);
        const matchesPurpose = req.purpose?.toLowerCase().includes(q);
        if (!matchesSpace && !matchesBlock && !matchesPurpose) return false;
      }
      return true;
    });
  }, [requests, statusFilter, searchTerm]);

  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  const columns = [
    { header: 'ID' },
    { header: 'Space Name' },
    { header: 'Block' },
    { header: 'Reservation Date' },
    { header: 'Time Slot' },
    { header: 'Capacity' },
    { header: 'Purpose of Booking' },
    { header: 'Status' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            My Space Booking Requests
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Track the status of all your classroom, seminar hall, and laboratory reservations.
          </p>
        </div>
        <Button variant="primary" onClick={() => navigate('/faculty/spaces')} icon={Plus}>
          New Booking Request
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-[#141B2D]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            placeholder="Search by space, block, or purpose..."
            icon={Search}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />

          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All Request Statuses</option>
            <option value="PENDING">Pending Admin Approval</option>
            <option value="APPROVED">Approved & Confirmed</option>
            <option value="REJECTED">Rejected</option>
          </Select>
        </div>
      </Card>

      {/* Requests Table */}
      {loading ? (
        <SkeletonTable rows={6} cols={7} />
      ) : (
        <div className="space-y-4">
          <Table
            columns={columns}
            empty={filteredRequests.length === 0}
            emptyMessage="No reservation requests found"
          >
            {paginatedRequests.map((req) => (
              <TableRow key={req.id}>
                <TableCell>
                  <span className="font-mono text-xs text-gray-500">#{req.id}</span>
                </TableCell>
                <TableCell>
                  <div className="font-bold text-gray-100 flex items-center gap-2">
                    <DoorOpen className="w-4 h-4 text-indigo-400" />
                    <span>{req.space_name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-gray-300 font-medium">{req.block}</span>
                </TableCell>
                <TableCell>
                  <span className="text-gray-200 font-medium">{req.request_date}</span>
                </TableCell>
                <TableCell>
                  <span className="text-indigo-400 font-mono text-xs">
                    {String(req.start_time).slice(0, 5)} - {String(req.end_time).slice(0, 5)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-gray-300 font-medium">{req.required_capacity} seats</span>
                </TableCell>
                <TableCell>
                  <p className="text-xs text-gray-300 max-w-xs truncate" title={req.purpose}>
                    {req.purpose}
                  </p>
                </TableCell>
                <TableCell>
                  <Badge variant={req.status} dot>
                    {req.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </Table>

          <Pagination
            currentPage={currentPage}
            totalItems={filteredRequests.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      )}
    </div>
  );
}

export default MyRequests;
