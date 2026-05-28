const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Retrieve auth token from localStorage
export const getAuthToken = () => localStorage.getItem('access_token');
export const setAuthToken = (token) => localStorage.setItem('access_token', token);
export const clearAuthToken = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
};

// Retrieve client slug from localStorage
export const getClientSlug = () => localStorage.getItem('client_slug') || 'breatheesg-mfg';
export const setClientSlug = (slug) => localStorage.setItem('client_slug', slug);

// Authenticated fetch request wrapper
async function request(endpoint, options = {}) {
  const token = getAuthToken();
  const clientSlug = getClientSlug();

  const headers = {
    'Content-Type': 'application/json',
    'X-Client-Slug': clientSlug,
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Handle multipart/form-data (file upload) where browser sets boundary automatically
  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Session expired or invalid
    clearAuthToken();
    if (!window.location.pathname.endsWith('/login')) {
      window.location.href = '/login';
    }
    throw new Error('Authentication expired. Please login again.');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorData.detail || 'API Request failed');
  }

  // Response might be empty (e.g. 204 or some actions)
  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  // Authentication
  login: async (username, password) => {
    const data = await request('/api/token/', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    setAuthToken(data.access);
    localStorage.setItem('user', JSON.stringify({ username }));
    return data;
  },

  logout: () => {
    clearAuthToken();
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  // Clients
  getClients: () => request('/api/clients/'),

  // Uploads
  getUploads: () => request('/api/uploads/'),
  
  uploadFile: (sourceType, file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const endpoint = `/api/uploads/${sourceType.toLowerCase()}/`;
    return request(endpoint, {
      method: 'POST',
      body: formData,
    });
  },

  // Emission Records
  getRecords: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val) params.append(key, val);
    });
    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/api/records/${query}`);
  },

  getRecord: (id) => request(`/api/records/${id}/`),

  updateRecord: (id, fields, reason) => {
    return request(`/api/records/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify({ ...fields, reason }),
    });
  },

  approveRecord: (id, notes = '') => {
    return request(`/api/records/${id}/approve/`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  rejectRecord: (id, notes = '') => {
    return request(`/api/records/${id}/reject/`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  },

  bulkApprove: (recordIds) => {
    return request('/api/records/bulk-approve/', {
      method: 'POST',
      body: JSON.stringify({ record_ids: recordIds }),
    });
  },

  getSummary: () => request('/api/records/summary/'),

  // Audit Logs
  getAuditLogs: (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val) params.append(key, val);
    });
    const query = params.toString() ? `?${params.toString()}` : '';
    return request(`/api/audit-log/${query}`);
  },
};
