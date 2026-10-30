import React, { useState, useEffect } from 'react';
import { Calendar, Clock, Users, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { requestsApi } from '../../api';
import { Modal, Input, Button } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export function BookingModal({
  isOpen,
  onClose,
  space,
  onSuccess,
}) {
  const { user } = useAuth();
  const { showToast } = useToast();

  const todayStr = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    request_date: todayStr,
    start_time: '09:00',
    end_time: '10:00',
    required_capacity: 40,
    purpose: '',
  });

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (space) {
      setFormData((prev) => ({
        ...prev,
        request_date: todayStr,
        start_time: '09:00',
        end_time: '10:00',
        required_capacity: space.capacity || 40,
        purpose: '',
      }));
      setError('');
    }
  }, [space, todayStr]);

  if (!space) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.request_date || !formData.start_time || !formData.end_time || !formData.purpose.trim()) {
      setError('Please fill out all required booking fields.');
      return;
    }

    if (formData.start_time >= formData.end_time) {
      setError('End time must be later than start time.');
      return;
    }

    if (Number(formData.required_capacity) > Number(space.capacity)) {
      setError(`Requested capacity cannot exceed room maximum (${space.capacity} seats).`);
      return;
    }

    setSubmitting(true);
    try {
      await requestsApi.createRequest({
        space_id: space.id,
        request_date: formData.request_date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        required_capacity: formData.required_capacity,
        purpose: formData.purpose.trim(),
        faculty_id: user?.id,
      });

      showToast(`Booking request for ${space.space_name} submitted successfully!`, 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit booking request');
      showToast(err.message || 'Schedule conflict or request error', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request Space Booking"
      subtitle="Submit an allocation request for administrative approval"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {/* Selected Room Summary */}
        <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-gray-900 border border-gray-800 text-xs">
          <div>
            <span className="text-gray-400 block mb-0.5">Faculty Applicant</span>
            <strong className="text-gray-100 font-semibold">{user?.name || 'Faculty Member'}</strong>
          </div>
          <div>
            <span className="text-gray-400 block mb-0.5">Selected Room</span>
            <strong className="text-indigo-400 font-bold">{space.space_name}</strong> ({space.block})
          </div>
        </div>

        <Input
          label="Reservation Date"
          type="date"
          min={todayStr}
          value={formData.request_date}
          onChange={(e) => setFormData({ ...formData, request_date: e.target.value })}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Start Time"
            type="time"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            required
          />
          <Input
            label="End Time"
            type="time"
            value={formData.end_time}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            required
          />
        </div>

        <Input
          label={`Required Capacity (Max ${space.capacity} seats)`}
          type="number"
          min={1}
          max={space.capacity}
          value={formData.required_capacity}
          onChange={(e) => setFormData({ ...formData, required_capacity: e.target.value })}
          required
        />

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
            Purpose of Reservation <span className="text-rose-400">*</span>
          </label>
          <textarea
            rows={3}
            required
            placeholder="e.g. Guest Lecture on Cloud Architecture, Semester Practical Exam, Department Meeting..."
            className="w-full bg-[#111827] text-gray-100 placeholder-gray-500 rounded-xl border border-gray-700/80 p-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 outline-none transition-all"
            value={formData.purpose}
            onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-700/60">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={submitting}>
            Submit Request
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default BookingModal;
