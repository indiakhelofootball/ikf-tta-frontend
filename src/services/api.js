// src/services/api.js
// Production API service — all calls go to the real Django backend

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

class APIService {
  /**
   * Core request helper with automatic token refresh on 401.
   */
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('tta_token');

    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

    // Attempt token refresh on 401
    if (response.status === 401 && token) {
      const refreshed = await this.refreshToken();
      if (refreshed) {
        // Retry with new token
        const newToken = localStorage.getItem('tta_token');
        config.headers.Authorization = `Bearer ${newToken}`;
        const retry = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const retryData = await retry.json();
        if (!retry.ok) {
          throw new Error(retryData.message || retryData.detail || 'Request failed');
        }
        return retryData;
      } else {
        // Refresh failed — force logout
        localStorage.removeItem('tta_token');
        localStorage.removeItem('tta_refresh');
        localStorage.removeItem('tta_user');
        window.location.href = '/login';
        throw new Error('Session expired');
      }
    }

    // Guard against HTML error pages (404/500 from server)
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      if (!response.ok) {
        throw new Error(
          `Server error (${response.status}): the API returned a non-JSON response ` +
            `(often an unhandled exception — check Django logs). Confirm the URL matches ` +
            `REACT_APP_API_URL and the backend process is running.`
        );
      }
      return null;
    }

    const data = await response.json();

    if (!response.ok) {
      // DRF validation errors come as { fieldName: ["error msg"] }
      let message = data.message || data.detail;
      if (!message) {
        // Extract first validation error from DRF response
        const firstKey = Object.keys(data).find(k => Array.isArray(data[k]));
        if (firstKey) {
          message = `${firstKey}: ${data[firstKey][0]}`;
        } else if (typeof data === 'object') {
          const firstVal = Object.values(data)[0];
          message = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
        } else {
          message = 'Something went wrong';
        }
      }
      const err = new Error(message);
      err.response = { status: response.status, data };
      throw err;
    }

    return data;
  }

  /**
   * Attempt to refresh the access token using the stored refresh token.
   */
  async refreshToken() {
    const refresh = localStorage.getItem('tta_refresh');
    if (!refresh) return false;

    try {
      const res = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh }),
      });

      if (!res.ok) return false;

      const data = await res.json();
      localStorage.setItem('tta_token', data.access);
      if (data.refresh) {
        localStorage.setItem('tta_refresh', data.refresh);
      }
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Login — POST /auth/login
   */
  async login(email, password) {
    // Skip the request() helper — login must never send a stale token in the
    // Authorization header, as DRF will reject the request before it reaches
    // the credential-checking logic and return 401.
    const res = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      throw new Error(`Server error (${res.status}): non-JSON response from login endpoint`);
    }

    const data = await res.json();

    if (!res.ok) {
      let message = data.message || data.detail;
      if (!message) {
        const firstKey = Object.keys(data).find(k => Array.isArray(data[k]));
        message = firstKey ? `${firstKey}: ${data[firstKey][0]}` : 'Invalid credentials';
      }
      throw new Error(message);
    }

    return data;
  }

  async requestOTP(phone) {
    const res = await fetch(`${API_BASE_URL}/auth/otp/request/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Failed to send OTP');
    return data;
  }

  async verifyOTP(phone, code) {
    const res = await fetch(`${API_BASE_URL}/auth/otp/verify/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'OTP verification failed');
    return data;
  }

  /**
   * Get current user profile
   */
  async getProfile() {
    return this.request('/auth/profile/');
  }

  /**
   * Update current user profile
   */
  async updateProfile(profileData) {
    return this.request('/auth/profile/', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  }
}

// Export singleton
const apiService = new APIService();
export default apiService;

// ============================================
// TRIALS API
// ============================================
export const trialsAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.trialType && filters.trialType !== 'all') params.append('trial_type', filters.trialType);
    if (filters.season && filters.season !== 'all') params.append('season', filters.season);
    if (filters.search) params.append('search', filters.search);
    if (filters.dateFilter) params.append('date_filter', filters.dateFilter);
    if (filters.sort) params.append('sort', filters.sort);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    const qs = params.toString();
    return apiService.request(`/trials/${qs ? `?${qs}` : ''}`);
  },

  getById: async (id) => {
    return apiService.request(`/trials/${id}/`);
  },

  create: async (trialData) => {
    return apiService.request('/trials/', {
      method: 'POST',
      body: JSON.stringify(trialData),
    });
  },

  update: async (id, trialData) => {
    return apiService.request(`/trials/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(trialData),
    });
  },

  patch: async (id, trialData) => {
    return apiService.request(`/trials/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(trialData),
    });
  },

  delete: async (id) => {
    return apiService.request(`/trials/${id}/`, { method: 'DELETE' });
  },

  checkNameExists: async (name) => {
    const data = await apiService.request(`/trials/check-name/?name=${encodeURIComponent(name)}`);
    return data.exists;
  },

  // City sub-endpoints — operate on a specific trial's city
  addCity: async (trialId, cityData) => {
    return apiService.request(`/trials/${trialId}/cities/`, {
      method: 'POST',
      body: JSON.stringify(cityData),
    });
  },

  updateCity: async (trialId, cityCode, data) => {
    return apiService.request(`/trials/${trialId}/cities/${encodeURIComponent(cityCode)}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  removeCity: async (trialId, cityCode) => {
    return apiService.request(`/trials/${trialId}/cities/${encodeURIComponent(cityCode)}/`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// REP MANAGEMENT API
// ============================================
export const repAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.city && filters.city !== 'all') params.append('city', filters.city);
    if (filters.region && filters.region !== 'all') params.append('region', filters.region);
    if (filters.search) params.append('search', filters.search);
    if (filters.sort) params.append('sort', filters.sort);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    const qs = params.toString();
    return apiService.request(`/reps/${qs ? `?${qs}` : ''}`);
  },

  getById: async (id) => {
    return apiService.request(`/reps/${id}/`);
  },

  create: async (repData) => {
    return apiService.request('/reps/', {
      method: 'POST',
      body: JSON.stringify(repData),
    });
  },

  update: async (id, repData) => {
    return apiService.request(`/reps/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(repData),
    });
  },

  delete: async (id) => {
    return apiService.request(`/reps/${id}/`, { method: 'DELETE' });
  },

  search: async (query) => {
    return apiService.request(`/reps/?search=${encodeURIComponent(query)}`);
  },

  // Assignment management
  addAssignment: async (repId, assignmentData) => {
    return apiService.request(`/reps/${repId}/assignments/`, {
      method: 'POST',
      body: JSON.stringify(assignmentData),
    });
  },

  updateAssignment: async (repId, assignmentId, data) => {
    return apiService.request(`/reps/${repId}/assignments/${assignmentId}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  deleteAssignment: async (repId, assignmentId) => {
    return apiService.request(`/reps/${repId}/assignments/${assignmentId}/`, {
      method: 'DELETE',
    });
  },
};

// ============================================
// TRIAL CITIES API
// ============================================
export const trialCitiesAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.region && filters.region !== 'All') params.append('region', filters.region);
    if (filters.search) params.append('search', filters.search);
    const qs = params.toString();
    return apiService.request(`/trial-cities/${qs ? `?${qs}` : ''}`);
  },

  getByCode: async (code) => {
    return apiService.request(`/trial-cities/${encodeURIComponent(code)}/`);
  },

  create: async (cityData) => {
    return apiService.request('/trial-cities/', {
      method: 'POST',
      body: JSON.stringify(cityData),
    });
  },

  update: async (code, cityData) => {
    return apiService.request(`/trial-cities/${encodeURIComponent(code)}/`, {
      method: 'PUT',
      body: JSON.stringify(cityData),
    });
  },

  delete: async (code) => {
    return apiService.request(`/trial-cities/${encodeURIComponent(code)}/`, {
      method: 'DELETE',
    });
  },

  codeExists: async (code) => {
    try {
      await apiService.request(`/trial-cities/${encodeURIComponent(code)}/`);
      return true;
    } catch {
      return false;
    }
  },
};

// ============================================
// VENDORS API
// ============================================
export const vendorsAPI = {
  getBanks: async () => {
    return apiService.request('/banks/');
  },

  getCompanyTypes: async () => {
    return apiService.request('/company-types/');
  },

  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.vendorType && filters.vendorType !== 'all') params.append('vendor_type', filters.vendorType);
    if (filters.search) params.append('search', filters.search);
    if (filters.sort) params.append('sort', filters.sort);
    if (filters.state) params.append('state', filters.state);
    if (filters.city) params.append('city', filters.city);
    if (filters.limit) params.append('limit', filters.limit);
    const qs = params.toString();
    return apiService.request(`/vendors/${qs ? `?${qs}` : ''}`);
  },

  getById: async (id) => {
    return apiService.request(`/vendors/${id}/`);
  },

  create: async (vendorData) => {
    return apiService.request('/vendors/', {
      method: 'POST',
      body: JSON.stringify(vendorData),
    });
  },

  update: async (id, vendorData) => {
    return apiService.request(`/vendors/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(vendorData),
    });
  },

  // Partial update — only the provided fields change (e.g. bank-detail
  // corrections), unlike update()'s full PUT which requires every field.
  patch: async (id, vendorData) => {
    return apiService.request(`/vendors/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(vendorData),
    });
  },

  delete: async (id) => {
    return apiService.request(`/vendors/${id}/`, { method: 'DELETE' });
  },
};

// ============================================
// PERMISSIONS API (UI-managed RBAC)
// ============================================
export const permissionsAPI = {
  // Module registry + separation-of-duties pairs, for building the grant grid
  getModules: async () => {
    return apiService.request('/permissions/modules/');
  },

  // Current user's effective grants — used to hide UI
  getMine: async () => {
    return apiService.request('/permissions/me/');
  },

  // SUPER_ADMIN: all users with a grants summary
  listUsers: async () => {
    return apiService.request('/permissions/users/');
  },

  // SUPER_ADMIN: one user's grants
  getUserPermissions: async (userId) => {
    return apiService.request(`/permissions/users/${userId}/`);
  },

  // SUPER_ADMIN: replace a user's grants. grants = { module: { can_view, can_edit } }
  setUserPermissions: async (userId, grants) => {
    return apiService.request(`/permissions/users/${userId}/`, {
      method: 'PUT',
      body: JSON.stringify({ grants }),
    });
  },

  // A user requests access to one or more modules
  createRequest: async (modules, note = '') => {
    return apiService.request('/permissions/requests/', {
      method: 'POST',
      body: JSON.stringify({ modules, note }),
    });
  },

  // The requester's own request history
  myRequests: async () => {
    return apiService.request('/permissions/requests/mine/');
  },

  // SUPER_ADMIN: pending requests inbox
  listRequests: async () => {
    return apiService.request('/permissions/requests/');
  },

  // SUPER_ADMIN: decide a request. decision = 'approve' | 'reject'; grants required for approve
  decideRequest: async (requestId, decision, grants = {}) => {
    return apiService.request(`/permissions/requests/${requestId}/decide/`, {
      method: 'POST',
      body: JSON.stringify({ decision, grants }),
    });
  },

  // SUPER_ADMIN: grant-change audit trail, newest first. Optional target filter
  getAuditLog: async ({ userId, page = 1 } = {}) => {
    const params = new URLSearchParams({ page });
    if (userId) params.set('user_id', userId);
    return apiService.request(`/permissions/audit-log/?${params}`);
  },

  // SUPER_ADMIN: create a login for a new user. REP/ADMIN start with zero
  // grants (granted on this page); SUPER_ADMIN bypasses grants entirely.
  createUser: async ({ firstName, lastName, email, password, role = 'REP' }) => {
    return apiService.request('/auth/register/', {
      method: 'POST',
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        email,
        password,
        password2: password,
        role,
      }),
    });
  },

  // SUPER_ADMIN: permanently delete a user. Self-delete is rejected.
  deleteUser: async (userId) => {
    return apiService.request(`/permissions/users/${userId}/`, { method: 'DELETE' });
  },
};

// ============================================
// PAYMENTS API
// ============================================
export const paymentsAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
    if (filters.vendor) params.append('vendor', filters.vendor);
    if (filters.search) params.append('search', filters.search);
    const qs = params.toString();
    return apiService.request(`/payments/${qs ? `?${qs}` : ''}`);
  },

  getById: async (id) => {
    return apiService.request(`/payments/${id}/`);
  },

  create: async (paymentData) => {
    return apiService.request('/payments/', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  },

  update: async (id, paymentData) => {
    return apiService.request(`/payments/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(paymentData),
    });
  },

  delete: async (id) => {
    return apiService.request(`/payments/${id}/`, { method: 'DELETE' });
  },
};

// ============================================
// CONFIG API (Admin dropdown options)
// ============================================
export const configAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.category) params.append('category', filters.category);
    if (filters.active) params.append('active', filters.active);
    if (filters.search) params.append('search', filters.search);
    const qs = params.toString();
    return apiService.request(`/config/${qs ? `?${qs}` : ''}`);
  },

  getByCategory: async (category) => {
    return apiService.request(`/config/?category=${category}&active=true`);
  },

  create: async (data) => {
    return apiService.request('/config/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiService.request(`/config/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiService.request(`/config/${id}/`, { method: 'DELETE' });
  },

  bulk: async (items) => {
    return apiService.request('/config/bulk/', {
      method: 'POST',
      body: JSON.stringify({ items }),
    });
  },

  getCategories: async () => {
    return apiService.request('/config-categories/');
  },
};

// ============================================
// WORK ORDERS API
// ============================================
export const workOrdersAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.vendor) params.append('vendor', filters.vendor);
    if (filters.type) params.append('type', filters.type);
    if (filters.status) params.append('status', filters.status);
    if (filters.search) params.append('search', filters.search);
    if (filters.sort) params.append('sort', filters.sort);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    const qs = params.toString();
    return apiService.request(`/work-orders/${qs ? `?${qs}` : ''}`);
  },

  getById: async (id) => {
    return apiService.request(`/work-orders/${id}/`);
  },

  create: async (data) => {
    return apiService.request('/work-orders/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiService.request(`/work-orders/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiService.request(`/work-orders/${id}/`, { method: 'DELETE' });
  },

  resolveBounced: async (id) => {
    return apiService.request(`/work-orders/${id}/resolve-bounced/`, { method: 'POST' });
  },
};

// ============================================
// PAYMENT REQUESTS API
// ============================================
export const paymentRequestsAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.vendor) params.append('vendor', filters.vendor);
    if (filters.workOrder) params.append('workOrder', filters.workOrder);
    if (filters.search) params.append('search', filters.search);
    if (filters.sort) params.append('sort', filters.sort);
    if (filters.page) params.append('page', filters.page);
    if (filters.limit) params.append('limit', filters.limit);
    const qs = params.toString();
    return apiService.request(`/payment-requests/${qs ? `?${qs}` : ''}`);
  },

  getById: async (id) => {
    return apiService.request(`/payment-requests/${id}/`);
  },

  create: async (data) => {
    return apiService.request('/payment-requests/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiService.request(`/payment-requests/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  patch: async (id, data) => {
    return apiService.request(`/payment-requests/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiService.request(`/payment-requests/${id}/`, { method: 'DELETE' });
  },
};

// ============================================
// Payment Batches API
// ============================================
export const paymentBatchesAPI = {
  getAll: async () => {
    return apiService.request('/payment-batches/');
  },

  create: async (data) => {
    return apiService.request('/payment-batches/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};

// ============================================
// TDS API
// ============================================
export const tdsAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.month) params.append('month', filters.month);
    if (filters.vendor) params.append('vendor', filters.vendor);
    const qs = params.toString();
    return apiService.request(`/tds/${qs ? `?${qs}` : ''}`);
  },

  getSummary: async (month) => {
    const qs = month ? `?month=${encodeURIComponent(month)}` : '';
    return apiService.request(`/tds/summary/${qs}`);
  },

  markDeposited: async (month) => {
    return apiService.request('/tds/mark_deposited/', {
      method: 'POST',
      body: JSON.stringify({ month }),
    });
  },
};

// ============================================
// COURIER API
// ============================================
export const courierAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.trial) params.append('trial', filters.trial);
    if (filters.city) params.append('city', filters.city);
    const qs = params.toString();
    return apiService.request(`/courier/shipments/${qs ? `?${qs}` : ''}`);
  },

  getById: async (id) => {
    return apiService.request(`/courier/shipments/${id}/`);
  },

  create: async (data) => {
    return apiService.request('/courier/shipments/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update: async (id, data) => {
    return apiService.request(`/courier/shipments/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete: async (id) => {
    return apiService.request(`/courier/shipments/${id}/`, { method: 'DELETE' });
  },

  dispatch: async (id, data) => {
    return apiService.request(`/courier/shipments/${id}/dispatch/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  transit: async (id, note = '') => {
    return apiService.request(`/courier/shipments/${id}/transit/`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  deliver: async (id, data) => {
    return apiService.request(`/courier/shipments/${id}/deliver/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  return: async (id, note = '') => {
    return apiService.request(`/courier/shipments/${id}/return/`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  lost: async (id, note = '') => {
    return apiService.request(`/courier/shipments/${id}/lost/`, {
      method: 'POST',
      body: JSON.stringify({ note }),
    });
  },

  updateItem: async (shipmentId, itemId, data) => {
    return apiService.request(`/courier/shipments/${shipmentId}/items/${itemId}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },
};
