import apiClient from './client';

export const auditApi = {
  // GET /api/audit-logs?limit=50 (Admin only)
  getAuditLogs: async (limit = 50) => {
    return apiClient(`/audit-logs?limit=${limit}`);
  },
};

export default auditApi;
