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

    const data = await response.json();

    if (!response.ok) {
      const err = new Error(data.message || data.detail || 'Something went wrong');
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
    const response = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    return response;
  }

  /**
   * Get users list
   */
  async getUsers() {
    return this.request('/users');
  }

  async getUser(userId) {
    return this.request(`/users/${userId}`);
  }

  async createUser(userData) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async updateUser(userId, userData) {
    return this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(userId) {
    return this.request(`/users/${userId}`, { method: 'DELETE' });
  }

  async getStats() {
    return this.request('/stats');
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

  delete: async (id) => {
    return apiService.request(`/trials/${id}/`, { method: 'DELETE' });
  },

  checkNameExists: async (name) => {
    const data = await apiService.request(`/trials/check-name/?name=${encodeURIComponent(name)}`);
    return data.exists;
  },

  assignCity: async (trialId, cityData) => {
    // Handled via update — fetch current trial, add city, then PUT
    const { trial } = await apiService.request(`/trials/${trialId}/`);
    const currentCodes = (trial.assignedCities || []).map(c =>
      typeof c === 'string' ? c : c.code
    );
    if (!currentCodes.includes(cityData.code)) {
      currentCodes.push(cityData.code);
    }
    return apiService.request(`/trials/${trialId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ assigned_cities: currentCodes }),
    });
  },

  removeCity: async (trialId, cityCode) => {
    const { trial } = await apiService.request(`/trials/${trialId}/`);
    const currentCodes = (trial.assignedCities || [])
      .map(c => (typeof c === 'string' ? c : c.code))
      .filter(c => c !== cityCode);
    return apiService.request(`/trials/${trialId}/`, {
      method: 'PATCH',
      body: JSON.stringify({ assigned_cities: currentCodes }),
    });
  },
};

// ============================================
// REP MANAGEMENT API
// ============================================
export const repAPI = {
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'all') params.append('status', filters.status);
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

  assignTrial: async (repId, trialData) => {
    // Placeholder — trial assignment logic can be added later
    return apiService.request(`/reps/${repId}/`, { method: 'GET' });
  },

  removeTrial: async (repId, trialId) => {
    // Placeholder — trial removal logic can be added later
    return apiService.request(`/reps/${repId}/`, { method: 'GET' });
  },

  search: async (query) => {
    return apiService.request(`/reps/?search=${encodeURIComponent(query)}`);
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
