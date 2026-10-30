import apiClient from './client';

export const requestsApi = {
  // GET /api/requests (Admin & Management)
  getAllRequests: async () => {
    return apiClient('/requests');
  },

  // GET /api/requests/faculty/:facultyId (Faculty own requests, or Admin/Management)
  getFacultyRequests: async (facultyId) => {
    return apiClient(`/requests/faculty/${facultyId}`);
  },

  // GET /api/requests/:id
  getRequestById: async (id) => {
    return apiClient(`/requests/${id}`);
  },

  // POST /api/requests (Faculty / Admin)
  createRequest: async ({ space_id, request_date, start_time, end_time, required_capacity, purpose, faculty_id }) => {
    return apiClient('/requests', {
      method: 'POST',
      body: {
        space_id: Number(space_id),
        request_date,
        start_time,
        end_time,
        required_capacity: Number(required_capacity),
        purpose,
        ...(faculty_id ? { faculty_id: Number(faculty_id) } : {}),
      },
    });
  },

  // PUT /api/requests/:id (Admin update)
  updateRequest: async (id, data) => {
    return apiClient(`/requests/${id}`, {
      method: 'PUT',
      body: data,
    });
  },

  // PUT /api/requests/:id/approve (Admin)
  approveRequest: async (id) => {
    return apiClient(`/requests/${id}/approve`, {
      method: 'PUT',
    });
  },

  // PUT /api/requests/:id/reject (Admin)
  rejectRequest: async (id) => {
    return apiClient(`/requests/${id}/reject`, {
      method: 'PUT',
    });
  },

  // DELETE /api/requests/:id (Admin)
  deleteRequest: async (id) => {
    return apiClient(`/requests/${id}`, {
      method: 'DELETE',
    });
  },
};

export default requestsApi;
