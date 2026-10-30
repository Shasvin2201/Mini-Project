import React, { useState, useEffect, useMemo } from 'react';
import {
  DoorOpen,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  AlertCircle,
  Building,
  CheckCircle,
} from 'lucide-react';
import { spacesApi } from '../../api';
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

export function SpacesManagement() {
  const [spaces, setSpaces] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [blockFilter, setBlockFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Space Modal (Create / Edit)
  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState(null);
  const [spaceFormData, setSpaceFormData] = useState({
    space_name: '',
    block: 'Block A',
    type: 'Classroom',
    capacity: 60,
    status: 'Available',
  });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Block Modal
  const [isAddBlockModalOpen, setIsAddBlockModalOpen] = useState(false);
  const [newBlockInput, setNewBlockInput] = useState('');

  // Delete / Deactivate Confirm Modal
  const [deactivatingSpace, setDeactivatingSpace] = useState(null);
  const [isDeactivating, setIsDeactivating] = useState(false);

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
      showToast(err.message || 'Failed to load spaces', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Distinct Blocks
  const availableBlocks = useMemo(() => {
    const defaultBlocks = ['Block A', 'Block B', 'Block C', 'Block D'];
    const fromSpaces = spaces.map((s) => s.block).filter(Boolean);
    return Array.from(new Set([...defaultBlocks, ...fromSpaces])).sort();
  }, [spaces]);

  // Filtered Spaces
  const filteredSpaces = useMemo(() => {
    return spaces.filter((space) => {
      if (blockFilter !== 'ALL' && space.block !== blockFilter) return false;
      if (typeFilter !== 'ALL' && space.type !== typeFilter) return false;
      if (statusFilter !== 'ALL' && space.status !== statusFilter) return false;
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        const matchesName = space.space_name.toLowerCase().includes(query);
        const matchesBlock = space.block.toLowerCase().includes(query);
        if (!matchesName && !matchesBlock) return false;
      }
      return true;
    });
  }, [spaces, blockFilter, typeFilter, statusFilter, searchTerm]);

  // Paginated Spaces
  const paginatedSpaces = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredSpaces.slice(startIndex, startIndex + pageSize);
  }, [filteredSpaces, currentPage, pageSize]);

  // Modal Handlers
  const handleOpenCreateModal = () => {
    setEditingSpace(null);
    setSpaceFormData({
      space_name: '',
      block: availableBlocks[0] || 'Block A',
      type: 'Classroom',
      capacity: 60,
      status: 'Available',
    });
    setFormError('');
    setIsSpaceModalOpen(true);
  };

  const handleOpenEditModal = (space) => {
    setEditingSpace(space);
    setSpaceFormData({
      space_name: space.space_name,
      block: space.block,
      type: space.type,
      capacity: space.capacity,
      status: space.status,
    });
    setFormError('');
    setIsSpaceModalOpen(true);
  };

  const handleSpaceFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!spaceFormData.space_name.trim()) {
      setFormError('Space name is required (e.g. CR-A101).');
      return;
    }

    if (Number(spaceFormData.capacity) <= 0) {
      setFormError('Capacity must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSpace) {
        await spacesApi.updateSpace(editingSpace.id, spaceFormData);
        showToast(`Space ${spaceFormData.space_name} updated successfully`, 'success');
      } else {
        await spacesApi.createSpace(spaceFormData);
        showToast(`Space ${spaceFormData.space_name} created successfully`, 'success');
      }
      setIsSpaceModalOpen(false);
      await loadSpaces();
    } catch (err) {
      setFormError(err.message || 'Failed to save space');
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddNewBlock = (e) => {
    e.preventDefault();
    const clean = newBlockInput.trim();
    if (!clean) return;

    if (!availableBlocks.includes(clean)) {
      setSpaceFormData((prev) => ({ ...prev, block: clean }));
      showToast(`Added '${clean}' to block selections`, 'info');
    }
    setNewBlockInput('');
    setIsAddBlockModalOpen(false);
  };

  const handleConfirmDeactivate = async () => {
    if (!deactivatingSpace) return;
    setIsDeactivating(true);
    try {
      await spacesApi.deleteSpace(deactivatingSpace.id);
      showToast(`Space ${deactivatingSpace.space_name} deactivated successfully`, 'success');
      setDeactivatingSpace(null);
      await loadSpaces();
    } catch (err) {
      showToast(err.message || 'Failed to deactivate space', 'error');
    } finally {
      setIsDeactivating(false);
    }
  };

  const columns = [
    { header: 'Space Name' },
    { header: 'Block' },
    { header: 'Facility Type' },
    { header: 'Capacity' },
    { header: 'Status' },
    { header: 'Actions', className: 'text-right pr-6' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Manage Campus Spaces</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Configure classrooms, seminar halls, and laboratories across all blocks.
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenCreateModal} icon={Plus}>
          Add New Space
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 bg-[#141B2D]">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <Input
            placeholder="Search room or block..."
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
            <option value="ALL">All Blocks</option>
            {availableBlocks.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </Select>

          <Select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All Facility Types</option>
            <option value="Classroom">Classroom</option>
            <option value="Seminar Hall">Seminar Hall</option>
            <option value="Lab">Laboratory</option>
          </Select>

          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Unavailable">Unavailable / Booked</option>
            <option value="Inactive">Inactive</option>
          </Select>
        </div>
      </Card>

      {/* Spaces Table */}
      {loading ? (
        <SkeletonTable rows={6} cols={6} />
      ) : (
        <div className="space-y-4">
          <Table columns={columns} empty={filteredSpaces.length === 0} emptyMessage="No spaces match your filters">
            {paginatedSpaces.map((space) => (
              <TableRow key={space.id}>
                <TableCell>
                  <div className="font-bold text-gray-100 flex items-center gap-2">
                    <DoorOpen className="w-4 h-4 text-indigo-400" />
                    <span>{space.space_name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-gray-300 font-medium">{space.block}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={space.type}>{space.type}</Badge>
                </TableCell>
                <TableCell>
                  <span className="font-semibold text-gray-200">{space.capacity} Seats</span>
                </TableCell>
                <TableCell>
                  <Badge variant={space.status} dot>
                    {space.status}
                  </Badge>
                </TableCell>
                <TableCell align="right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(space)}
                      className="p-1.5 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                      title="Edit space"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {space.status !== 'Inactive' && (
                      <button
                        type="button"
                        onClick={() => setDeactivatingSpace(space)}
                        className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                        title="Deactivate space"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </Table>

          <Pagination
            currentPage={currentPage}
            totalItems={filteredSpaces.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Add / Edit Space Modal */}
      <Modal
        isOpen={isSpaceModalOpen}
        onClose={() => setIsSpaceModalOpen(false)}
        title={editingSpace ? `Edit Space: ${editingSpace.space_name}` : 'Add New Campus Space'}
        subtitle="Specify space identification, block allocation, type, and seat capacity."
      >
        <form onSubmit={handleSpaceFormSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Space Name"
            placeholder="e.g. CR-A101 or LAB-C02"
            value={spaceFormData.space_name}
            onChange={(e) => setSpaceFormData({ ...spaceFormData, space_name: e.target.value })}
            required
          />

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                Block Allocation <span className="text-rose-400">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddBlockModalOpen(true)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
              >
                + Add Custom Block
              </button>
            </div>
            <Select
              value={spaceFormData.block}
              onChange={(e) => setSpaceFormData({ ...spaceFormData, block: e.target.value })}
              required
            >
              {availableBlocks.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </div>

          <Select
            label="Space Type"
            value={spaceFormData.type}
            onChange={(e) => setSpaceFormData({ ...spaceFormData, type: e.target.value })}
            required
          >
            <option value="Classroom">Classroom</option>
            <option value="Seminar Hall">Seminar Hall</option>
            <option value="Lab">Laboratory</option>
          </Select>

          <Input
            label="Seat Capacity"
            type="number"
            min={1}
            max={500}
            value={spaceFormData.capacity}
            onChange={(e) => setSpaceFormData({ ...spaceFormData, capacity: e.target.value })}
            required
          />

          <Select
            label="Operational Status"
            value={spaceFormData.status}
            onChange={(e) => setSpaceFormData({ ...spaceFormData, status: e.target.value })}
            required
          >
            <option value="Available">Available</option>
            <option value="Unavailable">Unavailable / In Session</option>
            <option value="Inactive">Inactive (Deactivated)</option>
          </Select>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700/60">
            <Button variant="secondary" onClick={() => setIsSpaceModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {editingSpace ? 'Update Space' : 'Create Space'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Custom Block Modal */}
      <Modal
        isOpen={isAddBlockModalOpen}
        onClose={() => setIsAddBlockModalOpen(false)}
        title="Add New Campus Block"
        subtitle="Register a new academic block into the system."
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAddNewBlock} className="space-y-4">
          <Input
            label="Block Name"
            placeholder="e.g. Block E or Research Complex"
            value={newBlockInput}
            onChange={(e) => setNewBlockInput(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setIsAddBlockModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Register Block
            </Button>
          </div>
        </form>
      </Modal>

      {/* Deactivate Space Confirm Modal */}
      <ConfirmModal
        isOpen={!!deactivatingSpace}
        onClose={() => setDeactivatingSpace(null)}
        onConfirm={handleConfirmDeactivate}
        title="Deactivate Space"
        message={`Are you sure you want to deactivate ${deactivatingSpace?.space_name}? Historical bookings and utilization metrics will be preserved.`}
        confirmText="Deactivate"
        variant="danger"
        loading={isDeactivating}
      />
    </div>
  );
}

export default SpacesManagement;
