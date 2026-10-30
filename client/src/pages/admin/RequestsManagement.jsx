import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarCheck2,
  Check,
  X,
  Eye,
  Trash2,
  Search,
  Filter,
  Plus,
  Clock,
  User,
  DoorOpen,
  Calendar,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { requestsApi, spacesApi, authApi } from '../../api';
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
  Modal,
  ConfirmModal,
  SkeletonTable,
} from '../../components/common';
import { useToast } from '../../context/ToastContext';

export function RequestsManagement() {
  const [requests, setRequests] = useState([]);
  const [spaces, setSpaces] = useState([]);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [blockFilter, setBlockFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Selected for Details Modal
  const [viewingRequest, setViewingRequest] = useState(null);

  // Action Confirmations
  const [actionModal, setActionModal] = useState({
    isOpen: false,
    type: null, // 'approve' | 'reject' | 'delete'
    request: null,
    loading: false,
  });

  // Create Request Modal (Admin Override)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    faculty_id: '',
    space_id: '',
    request_date: new Date().toISOString().split('T')[0],
    start_time: '09:00',
    end_time: '10:00',
    required_capacity: 40,
    purpose: '',
  });
  const [createError, setCreateError] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [reqData, spData, facData] = await Promise.all([
        requestsApi.getAllRequests(),
        spacesApi.getAllSpaces().catch(() => []),
        authApi.getAllFaculty().catch(() => []),
      ]);
      setRequests(Array.isArray(reqData) ? reqData : []);
      setSpaces(Array.isArray(spData) ? spData : []);
      setFacultyList(Array.isArray(facData) ? facData : []);
    } catch (err) {
      showToast(err.message || 'Failed to load booking requests', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Distinct Blocks
  const availableBlocks = useMemo(() => {
    const blocks = requests.map((r) => r.block).filter(Boolean);
    return Array.from(new Set(['Block A', 'Block B', 'Block C', 'Block D', ...blocks])).sort();
  }, [requests]);

  // Status Counters
  const totalCount = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;
  const approvedCount = requests.filter((r) => r.status === 'APPROVED').length;
  const rejectedCount = requests.filter((r) => r.status === 'REJECTED').length;

  // Filtering
  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      if (statusFilter !== 'ALL' && req.status !== statusFilter) return false;
      if (blockFilter !== 'ALL' && req.block !== blockFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const facultyMatch = req.faculty_name?.toLowerCase().includes(q);
        const spaceMatch = req.space_name?.toLowerCase().includes(q);
        const purposeMatch = req.purpose?.toLowerCase().includes(q);
        if (!facultyMatch && !spaceMatch && !purposeMatch) return false;
      }
      return true;
    });
  }, [requests, statusFilter, blockFilter, searchTerm]);

  // Paginated
  const paginatedRequests = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRequests.slice(start, start + pageSize);
  }, [filteredRequests, currentPage, pageSize]);

  // Action handlers
  const handleApprove = async () => {
    const { request } = actionModal;
    if (!request) return;

    setActionModal((prev) => ({ ...prev, loading: true }));
    try {
      await requestsApi.approveRequest(request.id);
      showToast(`Request #${request.id} for ${request.space_name} approved successfully!`, 'success');
      setActionModal({ isOpen: false, type: null, request: null, loading: false });
      await loadAllData();
    } catch (err) {
      showToast(err.message || 'Failed to approve request', 'error');
      setActionModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleReject = async () => {
    const { request } = actionModal;
    if (!request) return;

    setActionModal((prev) => ({ ...prev, loading: true }));
    try {
      await requestsApi.rejectRequest(request.id);
      showToast(`Request #${request.id} rejected and space released`, 'info');
      setActionModal({ isOpen: false, type: null, request: null, loading: false });
      await loadAllData();
    } catch (err) {
      showToast(err.message || 'Failed to reject request', 'error');
      setActionModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleDelete = async () => {
    const { request } = actionModal;
    if (!request) return;

    setActionModal((prev) => ({ ...prev, loading: true }));
    try {
      await requestsApi.deleteRequest(request.id);
      showToast(`Request #${request.id} removed`, 'success');
      setActionModal({ isOpen: false, type: null, request: null, loading: false });
      await loadAllData();
    } catch (err) {
      showToast(err.message || 'Failed to delete request', 'error');
      setActionModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setCreateError('');

    if (!createFormData.faculty_id || !createFormData.space_id) {
      setCreateError('Please select both faculty member and campus space.');
      return;
    }

    if (createFormData.start_time >= createFormData.end_time) {
      setCreateError('End time must be later than start time.');
      return;
    }

    setIsCreating(true);
    try {
      await requestsApi.createRequest(createFormData);
      showToast('Booking request created successfully', 'success');
      setIsCreateModalOpen(false);
      await loadAllData();
    } catch (err) {
      setCreateError(err.message || 'Failed to create request');
      showToast(err.message || 'Booking conflict or error', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  const columns = [
    { header: 'ID' },
    { header: 'Faculty' },
    { header: 'Space & Block' },
    { header: 'Date & Slot' },
    { header: 'Required' },
    { header: 'Status' },
    { header: 'Actions', className: 'text-right pr-6' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Booking Requests</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Review incoming faculty space reservation requests and manage approvals.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setCreateFormData({
              faculty_id: facultyList[0]?.id || '',
              space_id: spaces[0]?.id || '',
              request_date: new Date().toISOString().split('T')[0],
              start_time: '09:00',
              end_time: '10:00',
              required_capacity: 40,
              purpose: '',
            });
            setCreateError('');
            setIsCreateModalOpen(true);
          }}
          icon={Plus}
        >
          Create Request
        </Button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-4 border-gray-700/60">
          <span className="text-xs text-gray-400 uppercase font-medium">Total Requests</span>
          <div className="text-2xl font-bold text-white mt-1">{totalCount}</div>
        </Card>
        <Card className="p-4 border-amber-500/30 bg-amber-950/10">
          <span className="text-xs text-amber-400 uppercase font-semibold">Pending Review</span>
          <div className="text-2xl font-bold text-amber-400 mt-1">{pendingCount}</div>
        </Card>
        <Card className="p-4 border-emerald-500/30 bg-emerald-950/10">
          <span className="text-xs text-emerald-400 uppercase font-semibold">Approved</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{approvedCount}</div>
        </Card>
        <Card className="p-4 border-rose-500/30 bg-rose-950/10">
          <span className="text-xs text-rose-400 uppercase font-semibold">Rejected</span>
          <div className="text-2xl font-bold text-rose-400 mt-1">{rejectedCount}</div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4 bg-[#141B2D]">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Input
            placeholder="Search by faculty, room, or purpose..."
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
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending Action</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </Select>

          <Select
            value={blockFilter}
            onChange={(e) => {
              setBlockFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All Blocks</option>
            {availableBlocks.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
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
            emptyMessage="No booking requests match your filters"
          >
            {paginatedRequests.map((req) => (
              <TableRow key={req.id}>
                <TableCell>
                  <span className="font-mono text-xs text-gray-400">#{req.id}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    <span className="font-semibold text-gray-100">{req.faculty_name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <div className="font-medium text-gray-200">{req.space_name}</div>
                    <span className="text-[11px] text-gray-400">{req.block}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-0.5">
                    <div className="text-gray-200 font-medium">{req.request_date}</div>
                    <span className="text-[11px] text-indigo-400 font-mono">
                      {String(req.start_time).slice(0, 5)} - {String(req.end_time).slice(0, 5)}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-gray-300 font-semibold">{req.required_capacity} seats</span>
                </TableCell>
                <TableCell>
                  <Badge variant={req.status} dot>
                    {req.status}
                  </Badge>
                </TableCell>
                <TableCell align="right">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* View Details */}
                    <button
                      type="button"
                      onClick={() => setViewingRequest(req)}
                      className="p-1.5 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                      title="View request details"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Approve (if not already approved) */}
                    {req.status !== 'APPROVED' && (
                      <button
                        type="button"
                        onClick={() =>
                          setActionModal({
                            isOpen: true,
                            type: 'approve',
                            request: req,
                            loading: false,
                          })
                        }
                        className="p-1.5 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                        title="Approve booking"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}

                    {/* Reject (if not already rejected) */}
                    {req.status !== 'REJECTED' && (
                      <button
                        type="button"
                        onClick={() =>
                          setActionModal({
                            isOpen: true,
                            type: 'reject',
                            request: req,
                            loading: false,
                          })
                        }
                        className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Reject booking"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() =>
                        setActionModal({
                          isOpen: true,
                          type: 'delete',
                          request: req,
                          loading: false,
                        })
                      }
                      className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Delete request"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
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

      {/* Request Details Modal */}
      {viewingRequest && (
        <Modal
          isOpen={!!viewingRequest}
          onClose={() => setViewingRequest(null)}
          title={`Booking Request #${viewingRequest.id}`}
          subtitle={`Submitted by ${viewingRequest.faculty_name}`}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-gray-900 border border-gray-800">
                <span className="text-gray-400 block mb-1">Target Space</span>
                <strong className="text-gray-100 text-sm">{viewingRequest.space_name}</strong>
                <span className="text-indigo-400 block">{viewingRequest.block}</span>
              </div>
              <div className="p-3 rounded-xl bg-gray-900 border border-gray-800">
                <span className="text-gray-400 block mb-1">Current Status</span>
                <Badge variant={viewingRequest.status} dot size="md">
                  {viewingRequest.status}
                </Badge>
              </div>
              <div className="p-3 rounded-xl bg-gray-900 border border-gray-800">
                <span className="text-gray-400 block mb-1">Reservation Date</span>
                <strong className="text-gray-100 text-sm">{viewingRequest.request_date}</strong>
              </div>
              <div className="p-3 rounded-xl bg-gray-900 border border-gray-800">
                <span className="text-gray-400 block mb-1">Time Window</span>
                <strong className="text-indigo-400 font-mono text-sm">
                  {String(viewingRequest.start_time).slice(0, 5)} - {String(viewingRequest.end_time).slice(0, 5)}
                </strong>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-900 border border-gray-800">
              <span className="text-xs font-semibold text-gray-400 uppercase block mb-1">
                Required Capacity
              </span>
              <p className="text-sm font-bold text-gray-100">
                {viewingRequest.required_capacity} Attendees
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-900 border border-gray-800">
              <span className="text-xs font-semibold text-gray-400 uppercase block mb-1">
                Booking Purpose / Remarks
              </span>
              <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                {viewingRequest.purpose || 'No purpose remarks supplied.'}
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-700/60">
              <Button variant="secondary" onClick={() => setViewingRequest(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Admin Create Request Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Admin Manual Booking"
        subtitle="Reserve a campus space on behalf of a faculty member."
      >
        <form onSubmit={handleCreateRequest} className="space-y-4">
          {createError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <Select
            label="Faculty Member"
            value={createFormData.faculty_id}
            onChange={(e) => setCreateFormData({ ...createFormData, faculty_id: e.target.value })}
            required
          >
            <option value="">Select Faculty...</option>
            {facultyList.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.email})
              </option>
            ))}
          </Select>

          <Select
            label="Campus Space"
            value={createFormData.space_id}
            onChange={(e) => {
              const sp = spaces.find((s) => Number(s.id) === Number(e.target.value));
              setCreateFormData({
                ...createFormData,
                space_id: e.target.value,
                required_capacity: sp ? sp.capacity : createFormData.required_capacity,
              });
            }}
            required
          >
            <option value="">Select Space...</option>
            {spaces
              .filter((s) => s.status !== 'Inactive')
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.space_name} - {s.block} ({s.type}, Cap: {s.capacity})
                </option>
              ))}
          </Select>

          <Input
            label="Reservation Date"
            type="date"
            min={new Date().toISOString().split('T')[0]}
            value={createFormData.request_date}
            onChange={(e) => setCreateFormData({ ...createFormData, request_date: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Time"
              type="time"
              value={createFormData.start_time}
              onChange={(e) => setCreateFormData({ ...createFormData, start_time: e.target.value })}
              required
            />
            <Input
              label="End Time"
              type="time"
              value={createFormData.end_time}
              onChange={(e) => setCreateFormData({ ...createFormData, end_time: e.target.value })}
              required
            />
          </div>

          <Input
            label="Required Capacity"
            type="number"
            min={1}
            value={createFormData.required_capacity}
            onChange={(e) =>
              setCreateFormData({ ...createFormData, required_capacity: e.target.value })
            }
            required
          />

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
              Purpose / Agenda <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Special Guest Lecture or Semester Practical Exam"
              className="w-full bg-[#111827] text-gray-100 placeholder-gray-500 rounded-xl border border-gray-700/80 p-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none"
              value={createFormData.purpose}
              onChange={(e) => setCreateFormData({ ...createFormData, purpose: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-700/60">
            <Button variant="secondary" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isCreating}>
              Submit Reservation
            </Button>
          </div>
        </form>
      </Modal>

      {/* Action Confirmation Modal */}
      <ConfirmModal
        isOpen={actionModal.isOpen}
        onClose={() => setActionModal({ isOpen: false, type: null, request: null, loading: false })}
        onConfirm={() => {
          if (actionModal.type === 'approve') handleApprove();
          else if (actionModal.type === 'reject') handleReject();
          else if (actionModal.type === 'delete') handleDelete();
        }}
        title={
          actionModal.type === 'approve'
            ? 'Approve Space Booking'
            : actionModal.type === 'reject'
            ? 'Reject Space Booking'
            : 'Delete Booking Request'
        }
        message={
          actionModal.type === 'approve'
            ? `Approve booking #${actionModal.request?.id} for ${actionModal.request?.space_name}? The space will be marked Unavailable and any conflicting pending requests will be automatically declined.`
            : actionModal.type === 'reject'
            ? `Reject request #${actionModal.request?.id}? The space will be freed for other allocations.`
            : `Are you sure you want to permanently delete request #${actionModal.request?.id}?`
        }
        confirmText={
          actionModal.type === 'approve'
            ? 'Approve'
            : actionModal.type === 'reject'
            ? 'Reject'
            : 'Delete'
        }
        variant={actionModal.type === 'approve' ? 'primary' : 'danger'}
        loading={actionModal.loading}
      />
    </div>
  );
}

export default RequestsManagement;
