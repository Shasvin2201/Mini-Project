import apiClient from './client';

export const authApi = {
  // POST /api/auth/login
  login: async (email, password) => {
    return apiClient('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
  },

  // GET /api/auth/faculty (Admin only)
  getAllFaculty: async () => {
    return apiClient('/auth/faculty');
  },

  // POST /api/auth/faculty (Admin only)
  addFaculty: async ({ name, email, password }) => {
    return apiClient('/auth/faculty', {
      method: 'POST',
      body: { name, email, password },
    });
  },

  // PUT /api/auth/faculty/:id (Admin only)
  updateFaculty: async (id, { name, email, password }) => {
    return apiClient(`/auth/faculty/${id}`, {
      method: 'PUT',
      body: { name, email, ...(password ? { password } : {}) },
    });
  },

  // DELETE /api/auth/faculty/:id (Admin only)
  deleteFaculty: async (id) => {
    return apiClient(`/auth/faculty/${id}`, {
      method: 'DELETE',
    });
  },
};

export default authApi;
