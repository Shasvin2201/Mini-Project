// Centralized API client configured to communicate with the Express backend
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function apiClient(endpoint, { method = 'GET', body, headers = {}, ...customConfig } = {}) {
  const token = localStorage.getItem('authToken');

  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...customConfig,
  };

  if (body !== undefined) {
    config.body = JSON.stringify(body);
  }

  // Construct absolute or relative URL
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  try {
    const response = await fetch(url, config);

    // Auto-logout on 401 Unauthorized if not on the login/signup pages
    if (response.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('loggedInUser');
      sessionStorage.clear();
      window.location.replace('/login');
      throw new Error('Session expired. Please log in again.');
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.message || `Request failed with status ${response.status}`;
      const error = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Cannot connect to campus server. Please ensure the backend server is running on port 5000.');
    }
    throw error;
  }
}

export default apiClient;
