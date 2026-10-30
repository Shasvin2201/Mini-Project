import apiClient from './client';

export const spacesApi = {
  // GET /api/spaces (Authenticated)
  getAllSpaces: async () => {
    return apiClient('/spaces');
  },

  // GET /api/spaces/:id (Authenticated)
  getSpaceById: async (id) => {
    return apiClient(`/spaces/${id}`);
  },

  // POST /api/spaces (Admin only)
  createSpace: async ({ space_name, block, type, capacity, status = 'Available' }) => {
    return apiClient('/spaces', {
      method: 'POST',
      body: { space_name, block, type, capacity: Number(capacity), status },
    });
  },

  // PUT /api/spaces/:id (Admin only)
  updateSpace: async (id, { space_name, block, type, capacity, status }) => {
    return apiClient(`/spaces/${id}`, {
      method: 'PUT',
      body: { space_name, block, type, capacity: Number(capacity), status },
    });
  },

  // DELETE /api/spaces/:id (Admin only - sets status to Inactive)
  deleteSpace: async (id) => {
    return apiClient(`/spaces/${id}`, {
      method: 'DELETE',
    });
  },
};

export default spacesApi;
