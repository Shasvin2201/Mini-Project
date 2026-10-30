import React, { useState, useEffect, useMemo } from 'react';
import { Users, Plus, Search, Edit2, Trash2, Mail, Lock, User, AlertCircle, Shield } from 'lucide-react';
import { authApi } from '../../api';
import {
  Card,
  Button,
  Input,
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

export function FacultyManagement() {
  const [faculty, setFaculty] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFaculty, setEditingFaculty] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirm Modal
  const [deletingFaculty, setDeletingFaculty] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { showToast } = useToast();

  useEffect(() => {
    loadFaculty();
  }, []);

  const loadFaculty = async () => {
    setLoading(true);
    try {
      const data = await authApi.getAllFaculty();
      setFaculty(Array.isArray(data) ? data : []);
    } catch (err) {
      showToast(err.message || 'Failed to load faculty directory', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredFaculty = useMemo(() => {
    return faculty.filter((f) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return f.name.toLowerCase().includes(q) || f.email.toLowerCase().includes(q);
    });
  }, [faculty, searchTerm]);

  const paginatedFaculty = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFaculty.slice(start, start + pageSize);
  }, [filteredFaculty, currentPage, pageSize]);

  const handleOpenCreateModal = () => {
    setEditingFaculty(null);
    setFormData({ name: '', email: '', password: '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (f) => {
    setEditingFaculty(f);
    setFormData({ name: f.name, email: f.email, password: '' });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (formData.name.trim().length < 3) {
      setFormError('Name must be at least 3 characters.');
      return;
    }

    if (!formData.email.includes('@')) {
      setFormError('Please enter a valid institutional email address.');
      return;
    }

    if (!editingFaculty && (!formData.password || formData.password.length < 6)) {
      setFormError('Password must contain at least 6 characters.');
      return;
    }

    if (editingFaculty && formData.password && formData.password.length < 6) {
      setFormError('Updated password must contain at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingFaculty) {
        await authApi.updateFaculty(editingFaculty.id, formData);
        showToast(`Faculty member ${formData.name} updated successfully`, 'success');
      } else {
        await authApi.addFaculty(formData);
        showToast(`Faculty member ${formData.name} created successfully`, 'success');
      }
      setIsModalOpen(false);
      await loadFaculty();
    } catch (err) {
      setFormError(err.message || 'Operation failed');
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingFaculty) return;
    setIsDeleting(true);
    try {
      await authApi.deleteFaculty(deletingFaculty.id);
      showToast(`Faculty account for ${deletingFaculty.name} deleted`, 'success');
      setDeletingFaculty(null);
      await loadFaculty();
    } catch (err) {
      showToast(err.message || 'Failed to delete faculty', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns = [
    { header: 'ID' },
    { header: 'Faculty Member' },
    { header: 'Email Address' },
    { header: 'Role Authorization' },
    { header: 'Actions', className: 'text-right pr-6' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Faculty Management</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Provision, review, and manage institutional faculty accounts with secure password hashing.
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenCreateModal} icon={Plus}>
          Add Faculty Member
        </Button>
      </div>

      {/* Search Bar */}
      <Card className="p-4 bg-[#141B2D]">
        <div className="max-w-md">
          <Input
            placeholder="Search by name or email..."
            icon={Search}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </Card>

      {/* Directory Table */}
      {loading ? (
        <SkeletonTable rows={5} cols={5} />
      ) : (
        <div className="space-y-4">
          <Table columns={columns} empty={filteredFaculty.length === 0} emptyMessage="No faculty records found">
            {paginatedFaculty.map((f) => (
              <TableRow key={f.id}>
                <TableCell>
                  <span className="text-gray-400 font-mono text-xs">#{f.id}</span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 font-bold flex items-center justify-center text-xs">
                      {f.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-semibold text-gray-100">{f.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-gray-300 font-medium">{f.email}</span>
                </TableCell>
                <TableCell>
                  <Badge variant="indigo">Faculty Member</Badge>
                </TableCell>
                <TableCell align="right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(f)}
                      className="p-1.5 text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors"
                      title="Edit faculty"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingFaculty(f)}
                      className="p-1.5 text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Delete faculty"
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
            totalItems={filteredFaculty.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
          />
        </div>
      )}

      {/* Faculty Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFaculty ? `Edit Faculty: ${editingFaculty.name}` : 'Provision New Faculty Account'}
        subtitle="Credentials are encrypted using bcrypt hashing (10 salt rounds)."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <Input
            label="Full Name"
            icon={User}
            placeholder="e.g. Dr. Vivin C"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <Input
            label="Institutional Email"
            type="email"
            icon={Mail}
            placeholder="e.g. vivinc@campus.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <Input
            label={editingFaculty ? 'Password (Leave blank to keep existing)' : 'Password'}
            type="password"
            icon={Lock}
            placeholder="Min. 6 characters"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required={!editingFaculty}
          />

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-700/60">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={isSubmitting}>
              {editingFaculty ? 'Save Changes' : 'Provision Account'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Faculty Confirm Modal */}
      <ConfirmModal
        isOpen={!!deletingFaculty}
        onClose={() => setDeletingFaculty(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Faculty Account"
        message={`Are you sure you want to permanently delete the account for ${deletingFaculty?.name}? Any pending or historical space requests associated with this faculty member will also be removed.`}
        confirmText="Delete Account"
        variant="danger"
        loading={isDeleting}
      />
    </div>
  );
}

export default FacultyManagement;
