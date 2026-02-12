// src/services/api.js
// Production-Ready API service with smart mock handling

// Backend API URL — update for production
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

// Set to false to use real backend
const IS_USING_MOCK = false;

// 🎭 MOCK USER DATABASE (Only used when IS_USING_MOCK = true)
// Remove this entire section when switching to real backend
const MOCK_USERS = {
  'superadmin@ikf.com': {
    id: 1,
    email: 'superadmin@ikf.com',
    name: 'Super Admin',
    role: 'SUPER_ADMIN'
  },
  'admin@ikf.com': {
    id: 2,
    email: 'admin@ikf.com',
    name: 'Admin User',
    role: 'ADMIN'
  },
  'rep@ikf.com': {
    id: 3,
    email: 'rep@ikf.com',
    name: 'REP User',
    role: 'REP'
  },
  // ✅ ADD MORE TEST USERS HERE AS NEEDED
  'khushboolal8@gmail.com': {
    id: 4,
    email: 'khushboolal8@gmail.com',
    name: 'Khushboo',
    role: 'SUPER_ADMIN'
  },
  'testadmin@company.com': {
    id: 5,
    email: 'testadmin@company.com',
    name: 'Test Admin',
    role: 'ADMIN'
  },
  'testrep@company.com': {
    id: 6,
    email: 'testrep@company.com',
    name: 'Test REP',
    role: 'REP'
  }
};

class APIService {
  /**
   * Helper method for making API requests
   */
  async request(endpoint, options = {}) {
    const token = localStorage.getItem('tta_token');
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
    };

    try {
      console.log('🚀 API Request:', `${API_BASE_URL}${endpoint}`);
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
      const data = await response.json();

      console.log('✅ API Response:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      return data;
    } catch (error) {
      console.error('❌ API Error:', error);
      throw error;
    }
  }

  /**
   * 🎭 Mock Response Interceptor
   * This modifies mock server responses to simulate multiple users
   * 🗑️ DELETE THIS METHOD when switching to real backend
   */
  mockResponseInterceptor(email, mockResponse) {
    if (!IS_USING_MOCK) {
      return mockResponse; // Real backend - no modification
    }

    // Find user in mock database
    const mockUser = MOCK_USERS[email.toLowerCase()];

    if (mockUser) {
      // Return modified response with correct user
      return {
        success: true,
        token: mockResponse.token || `mock-jwt-token-${mockUser.id}`,
        user: mockUser
      };
    } else {
      // User not found in mock database
      return {
        success: false,
        message: 'Invalid credentials'
      };
    }
  }

  /**
   * Login user
   * POST /auth/login
   */
  async login(email, password) {
    try {
      // Call backend (or mock)
      const response = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      // 🎭 DEVELOPMENT ONLY: Intercept mock response
      // This simulates multiple users with Postman mock
      if (IS_USING_MOCK) {
        return this.mockResponseInterceptor(email, response);
      }

      // 🚀 PRODUCTION: Return backend response as-is
      return response;

    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  /**
   * Get users list
   * GET /users
   */
  async getUsers() {
    try {
      const response = await this.request('/users');

      // 🎭 DEVELOPMENT ONLY: Return mock users
      if (IS_USING_MOCK) {
        return Object.values(MOCK_USERS);
      }

      return response;
    } catch (error) {
      console.error('Get users error:', error);
      throw error;
    }
  }

  /**
   * Get user by ID
   * GET /users/:id
   */
  async getUser(userId) {
    return this.request(`/users/${userId}`);
  }

  /**
   * Create new user
   * POST /users
   */
  async createUser(userData) {
    return this.request('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  /**
   * Update user
   * PUT /users/:id
   */
  async updateUser(userId, userData) {
    return this.request(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  /**
   * Delete user
   * DELETE /users/:id
   */
  async deleteUser(userId) {
    return this.request(`/users/${userId}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get dashboard stats
   * GET /stats
   */
  async getStats() {
    return this.request('/stats');
  }

  /**
   * Get trials list
   * GET /trials
   */
  async getTrials() {
    return this.request('/trials');
  }

  /**
   * Create trial
   * POST /trials
   */
  async createTrial(trialData) {
    return this.request('/trials', {
      method: 'POST',
      body: JSON.stringify(trialData),
    });
  }

  /**
   * Get work orders
   * GET /work-orders
   */
  async getWorkOrders() {
    return this.request('/work-orders');
  }

  /**
   * Create work order
   * POST /work-orders
   */
  async createWorkOrder(orderData) {
    return this.request('/work-orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    });
  }
}

// Export singleton instance
export default new APIService();

// ============================================
// 🚀 SWITCHING TO REAL BACKEND CHECKLIST:
// ============================================
// 1. Update API_BASE_URL to your backend URL
// 2. Change IS_USING_MOCK to false
// 3. (Optional) Delete MOCK_USERS object
// 4. (Optional) Delete mockResponseInterceptor method
// 5. Test login with real users!
// ============================================
// Add this at the END of your existing src/services/api.js file
// This replaces the api-trialCities.js code with mock-only version

// ============================================
// TRIAL CITIES API (Mock Mode Only)
// ============================================

// Mock trial cities data
const MOCK_TRIAL_CITIES = [
  {
    code: 'IKF-MH-MUM-001',
    state: 'Maharashtra',
    region: 'West',
    trialCityName: 'Mumbai Central',
    city: 'Mumbai',
    assignedREP: 'Sports Academy Mumbai',
    groundLocation: 'Andheri Sports Complex',
    groundVerified: true,
    trialType: 'Exclusive IKF Season Trial',
    trialDate: '2024-03-15',
    monthOnly: 'March',
    comment: 'Main trial venue in Mumbai',
    nextTrialDate: null,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    code: 'IKF-DL-NEW-001',
    state: 'Delhi',
    region: 'North',
    trialCityName: 'New Delhi',
    city: 'Delhi',
    assignedREP: 'Delhi Football Club',
    groundLocation: 'Jawaharlal Nehru Stadium',
    groundVerified: true,
    trialType: 'IKF Season Trial',
    trialDate: '2024-03-20',
    monthOnly: 'March',
    comment: null,
    nextTrialDate: null,
    createdAt: '2024-01-16T10:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z',
  },
  {
    code: 'IKF-KA-BAN-001',
    state: 'Karnataka',
    region: 'South',
    trialCityName: 'Bangalore South',
    city: 'Bangalore',
    assignedREP: 'Bangalore Sports Hub',
    groundLocation: 'Kanteerava Stadium',
    groundVerified: false,
    trialType: 'CSR Project Trial',
    trialDate: '2024-03-25',
    monthOnly: 'March',
    comment: 'Pending ground verification',
    nextTrialDate: '2024-04-15',
    createdAt: '2024-01-17T10:00:00Z',
    updatedAt: '2024-01-17T10:00:00Z',
  },
];

// Mock API implementation (no backend needed)
export const trialCitiesAPI = {
  /**
   * Get all trial cities with optional filters
   */
  getAll: async (filters = {}) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let cities = [...MOCK_TRIAL_CITIES];
    
    // Apply region filter
    if (filters.region && filters.region !== 'All') {
      cities = cities.filter(city => city.region === filters.region);
    }
    
    // Apply search filter
    if (filters.search) {
      const query = filters.search.toLowerCase();
      cities = cities.filter(city =>
        city.trialCityName.toLowerCase().includes(query) ||
        city.code.toLowerCase().includes(query) ||
        city.state.toLowerCase().includes(query)
      );
    }
    
    return { cities, total: cities.length };
  },

  /**
   * Get a single trial city by code
   */
  getByCode: async (code) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const city = MOCK_TRIAL_CITIES.find(c => c.code === code);
    if (!city) throw new Error('City not found');
    return { city };
  },

  /**
   * Create a new trial city
   */
  create: async (cityData) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check for duplicate code
    if (MOCK_TRIAL_CITIES.some(c => c.code === cityData.code)) {
      throw new Error('City code already exists');
    }
    
    const newCity = {
      ...cityData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    MOCK_TRIAL_CITIES.push(newCity);
    
    return { 
      city: newCity, 
      message: 'City created successfully' 
    };
  },

  /**
   * Update an existing trial city
   */
  update: async (code, cityData) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const index = MOCK_TRIAL_CITIES.findIndex(c => c.code === code);
    if (index === -1) throw new Error('City not found');
    
    MOCK_TRIAL_CITIES[index] = {
      ...MOCK_TRIAL_CITIES[index],
      ...cityData,
      code: MOCK_TRIAL_CITIES[index].code, // Don't allow code change
      state: MOCK_TRIAL_CITIES[index].state, // Don't allow state change
      region: MOCK_TRIAL_CITIES[index].region, // Don't allow region change
      trialCityName: MOCK_TRIAL_CITIES[index].trialCityName, // Don't allow name change
      updatedAt: new Date().toISOString(),
    };
    
    return { 
      city: MOCK_TRIAL_CITIES[index], 
      message: 'City updated successfully' 
    };
  },

  /**
   * Delete a trial city
   */
  delete: async (code) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const index = MOCK_TRIAL_CITIES.findIndex(c => c.code === code);
    if (index === -1) throw new Error('City not found');
    
    MOCK_TRIAL_CITIES.splice(index, 1);
    
    return { message: 'City deleted successfully' };
  },

  /**
   * Check if a trial city code exists
   */
  codeExists: async (code) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return MOCK_TRIAL_CITIES.some(c => c.code === code);
  },
};
// ============================================
// REP MANAGEMENT API (Mock Mode Only)
// Add this section to the END of your api.js file
// ============================================

// Mock REP data
const MOCK_REPS = [
  {
    _id: 'rep-001',
    id: 'rep-001',
    repName: 'Sports Academy Mumbai',
    state: 'Maharashtra',
    city: 'Mumbai',
    season: 'S5',
    region: 'West',
    status: 'Active',
    contactName: 'Rajesh Sharma',
    phone: '9876543210',
    email: 'rajesh@sportsacademy.com',
    backupContactName: 'Priya Verma',
    backupPhone: '9876543211',
    backupEmail: 'priya@sportsacademy.com',
    physicalAddress: '123 Sports Complex, Andheri West, Mumbai',
    groundLocation: 'Andheri Sports Complex',
    pinCode: '400001',
    panCard: 'AABCU9603R',
    gstNo: '27AABCU9603R1ZM',
    mouStatus: 'Signed',
    numberOfTrials: 5,
    trialName: 'Nari Shakti',
    trialPeriod: 'This Week',
    assignedTrials: [
      {
        city: 'Mumbai',
        trialName: 'Nari Shakti',
        trialDate: '2024-03-15',
        period: 'This Week',
        status: 'Active'
      },
      {
        city: 'Thane',
        trialName: 'Season 6',
        trialDate: '2024-03-20',
        period: 'Next Week',
        status: 'Active'
      },
      {
        city: 'Pune',
        trialName: 'IKF Exclusive',
        trialDate: '2024-03-25',
        period: 'This Month',
        status: 'Upcoming'
      }
    ],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    _id: 'rep-002',
    id: 'rep-002',
    repName: 'Delhi Football Club',
    state: 'Delhi',
    city: 'New Delhi',
    season: 'S5',
    region: 'North',
    status: 'Active',
    contactName: 'Amit Kumar',
    phone: '9876543211',
    email: 'amit@delhifc.com',
    backupContactName: 'Suresh Reddy',
    backupPhone: '9876543212',
    backupEmail: 'suresh@delhifc.com',
    physicalAddress: '456 Football Arena, Connaught Place, New Delhi',
    groundLocation: 'Jawaharlal Nehru Stadium',
    pinCode: '110001',
    panCard: 'AABCD1234E',
    gstNo: '07AABCD1234E1ZM',
    mouStatus: 'Signed',
    numberOfTrials: 3,
    trialName: 'Season 6',
    trialPeriod: 'Next Week',
    assignedTrials: [
      {
        city: 'New Delhi',
        trialName: 'Season 6',
        trialDate: '2024-03-18',
        period: 'This Week',
        status: 'Active'
      },
      {
        city: 'Gurgaon',
        trialName: 'Nari Shakti',
        trialDate: '2024-03-22',
        period: 'Next Week',
        status: 'Active'
      }
    ],
    createdAt: '2024-01-16T10:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z',
  },
  {
    _id: 'rep-003',
    id: 'rep-003',
    repName: 'Bangalore Sports Hub',
    state: 'Karnataka',
    city: 'Bangalore',
    season: 'S6',
    region: 'South',
    status: 'Active',
    contactName: 'Sourav Das',
    phone: '9876543213',
    email: 'sourav@blrsports.com',
    backupContactName: 'Ramesh Iyer',
    backupPhone: '9876543214',
    backupEmail: 'ramesh@blrsports.com',
    physicalAddress: '789 Sports Arena, Koramangala, Bangalore',
    groundLocation: 'Kanteerava Stadium',
    pinCode: '560001',
    panCard: 'AABEF5678F',
    gstNo: '29AABEF5678F1ZM',
    mouStatus: 'Pending',
    numberOfTrials: 4,
    trialName: 'IKF Exclusive',
    trialPeriod: 'This Month',
    assignedTrials: [
      {
        city: 'Bangalore',
        trialName: 'IKF Exclusive',
        trialDate: '2024-03-28',
        period: 'This Month',
        status: 'Upcoming'
      },
      {
        city: 'Mysore',
        trialName: 'Season 6',
        trialDate: '2024-04-05',
        period: 'Next Month',
        status: 'Upcoming'
      }
    ],
    createdAt: '2024-01-17T10:00:00Z',
    updatedAt: '2024-01-17T10:00:00Z',
  },
  {
    _id: 'rep-004',
    id: 'rep-004',
    repName: 'Kolkata Sports Academy',
    state: 'West Bengal',
    city: 'Kolkata',
    season: 'S5',
    region: 'East',
    status: 'Active',
    contactName: 'Arijit Sen',
    phone: '9876543215',
    email: 'arijit@kolkatasa.com',
    backupContactName: '',
    backupPhone: '',
    backupEmail: '',
    physicalAddress: '321 Sports Complex, Salt Lake, Kolkata',
    groundLocation: 'Salt Lake Stadium',
    pinCode: '700091',
    panCard: 'AABGH9012G',
    gstNo: '',
    mouStatus: 'Signed',
    numberOfTrials: 2,
    trialName: 'Nari Shakti',
    trialPeriod: 'This Week',
    assignedTrials: [
      {
        city: 'Kolkata',
        trialName: 'Nari Shakti',
        trialDate: '2024-03-16',
        period: 'This Week',
        status: 'Active'
      }
    ],
    createdAt: '2024-01-18T10:00:00Z',
    updatedAt: '2024-01-18T10:00:00Z',
  },
  {
    _id: 'rep-005',
    id: 'rep-005',
    repName: 'Chennai Football Association',
    state: 'Tamil Nadu',
    city: 'Chennai',
    season: 'S6',
    region: 'South',
    status: 'Inactive',
    contactName: 'Venkat Raman',
    phone: '9876543216',
    email: 'venkat@chennaifc.com',
    backupContactName: 'Kumar Swamy',
    backupPhone: '9876543217',
    backupEmail: 'kumar@chennaifc.com',
    physicalAddress: '654 Marina Beach Road, Chennai',
    groundLocation: 'Nehru Stadium',
    pinCode: '600001',
    panCard: 'AABIJ3456H',
    gstNo: '33AABIJ3456H1ZM',
    mouStatus: 'Not Required',
    numberOfTrials: 0,
    trialName: '',
    trialPeriod: '',
    assignedTrials: [],
    createdAt: '2024-01-19T10:00:00Z',
    updatedAt: '2024-02-01T10:00:00Z',
  },
];

// REP API implementation (mock mode)
export const repAPI = {
  /**
   * Get all REPs with optional filters
   */
  getAll: async (filters = {}) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let reps = [...MOCK_REPS];
    
    // Apply status filter
    if (filters.status && filters.status !== 'all') {
      reps = reps.filter(rep => rep.status.toLowerCase() === filters.status.toLowerCase());
    }
    
    // Apply city filter
    if (filters.city && filters.city !== 'all') {
      reps = reps.filter(rep => rep.city === filters.city);
    }
    
    // Apply region filter
    if (filters.region && filters.region !== 'all') {
      reps = reps.filter(rep => rep.region === filters.region);
    }
    
    // Apply search filter
    if (filters.search) {
      const query = filters.search.toLowerCase();
      reps = reps.filter(rep =>
        rep.repName.toLowerCase().includes(query) ||
        rep.city.toLowerCase().includes(query) ||
        rep.state.toLowerCase().includes(query) ||
        rep.contactName.toLowerCase().includes(query)
      );
    }
    
    return { reps, total: reps.length };
  },

  /**
   * Get a single REP by ID
   */
  getById: async (id) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const rep = MOCK_REPS.find(r => r._id === id || r.id === id);
    if (!rep) throw new Error('REP not found');
    return { rep };
  },

  /**
   * Create a new REP
   */
  create: async (repData) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check for duplicate (same name in same city)
    const exists = MOCK_REPS.some(r => 
      r.repName.toLowerCase() === repData.repName.toLowerCase() &&
      r.city.toLowerCase() === repData.city.toLowerCase()
    );
    
    if (exists) {
      throw new Error('REP with this name already exists in this city');
    }
    
    // Generate new ID
    const newId = `rep-${String(MOCK_REPS.length + 1).padStart(3, '0')}`;
    
    const newREP = {
      _id: newId,
      id: newId,
      ...repData,
      numberOfTrials: 0,
      assignedTrials: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    MOCK_REPS.push(newREP);
    
    return { 
      rep: newREP, 
      message: 'REP created successfully' 
    };
  },

  /**
   * Update an existing REP
   */
  update: async (id, repData) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const index = MOCK_REPS.findIndex(r => r._id === id || r.id === id);
    if (index === -1) throw new Error('REP not found');
    
    MOCK_REPS[index] = {
      ...MOCK_REPS[index],
      ...repData,
      _id: MOCK_REPS[index]._id, // Don't allow ID change
      id: MOCK_REPS[index].id,
      assignedTrials: MOCK_REPS[index].assignedTrials, // Keep existing trials
      numberOfTrials: MOCK_REPS[index].numberOfTrials,
      updatedAt: new Date().toISOString(),
    };
    
    return { 
      rep: MOCK_REPS[index], 
      message: 'REP updated successfully' 
    };
  },

  /**
   * Delete a REP
   */
  delete: async (id) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const index = MOCK_REPS.findIndex(r => r._id === id || r.id === id);
    if (index === -1) throw new Error('REP not found');
    
    const deletedREP = MOCK_REPS[index];
    MOCK_REPS.splice(index, 1);
    
    return { 
      message: 'REP deleted successfully',
      rep: deletedREP
    };
  },

  /**
   * Assign a trial to a REP
   */
  assignTrial: async (repId, trialData) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const index = MOCK_REPS.findIndex(r => r._id === repId || r.id === repId);
    if (index === -1) throw new Error('REP not found');
    
    // Add trial to assignedTrials array
    MOCK_REPS[index].assignedTrials.push({
      ...trialData,
      assignedAt: new Date().toISOString()
    });
    
    // Update numberOfTrials
    MOCK_REPS[index].numberOfTrials = MOCK_REPS[index].assignedTrials.length;
    MOCK_REPS[index].updatedAt = new Date().toISOString();
    
    return { 
      rep: MOCK_REPS[index],
      message: 'Trial assigned successfully' 
    };
  },

  /**
   * Remove a trial from a REP
   */
  removeTrial: async (repId, trialId) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const index = MOCK_REPS.findIndex(r => r._id === repId || r.id === repId);
    if (index === -1) throw new Error('REP not found');
    
    // Remove trial from assignedTrials array
    MOCK_REPS[index].assignedTrials = MOCK_REPS[index].assignedTrials.filter(
      t => t.id !== trialId
    );
    
    // Update numberOfTrials
    MOCK_REPS[index].numberOfTrials = MOCK_REPS[index].assignedTrials.length;
    MOCK_REPS[index].updatedAt = new Date().toISOString();
    
    return { 
      rep: MOCK_REPS[index],
      message: 'Trial removed successfully' 
    };
  },

  /**
   * Get REPs by city
   */
  getByCity: async (city) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const reps = MOCK_REPS.filter(r => r.city.toLowerCase() === city.toLowerCase());
    return { reps, total: reps.length };
  },

  /**
   * Get REPs by status
   */
  getByStatus: async (status) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const reps = MOCK_REPS.filter(r => r.status.toLowerCase() === status.toLowerCase());
    return { reps, total: reps.length };
  },

  /**
   * Get REPs with trials this week
   */
  getThisWeekREPs: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const reps = MOCK_REPS.filter(r => 
      r.assignedTrials.some(t => t.period === 'This Week')
    );
    return { reps, total: reps.length };
  },

  /**
   * Search REPs
   */
  search: async (query) => {
    await new Promise(resolve => setTimeout(resolve, 400));
    const searchTerm = query.toLowerCase();
    const reps = MOCK_REPS.filter(r =>
      r.repName.toLowerCase().includes(searchTerm) ||
      r.city.toLowerCase().includes(searchTerm) ||
      r.state.toLowerCase().includes(searchTerm) ||
      r.contactName.toLowerCase().includes(searchTerm)
    );
    return { reps, total: reps.length };
  },
};

// ============================================
// TRIAL MANAGEMENT API (Mock Mode Only)
// ============================================

const MOCK_TRIALS = [
  {
    _id: 'trial-001',
    id: 'trial-001',
    trialName: 'Nari Shakti Season 6',
    trialCode: 'TRL-S6-REG-001',
    season: 'Season 6',
    trialType: 'Regular',
    tierType: 'Standard',
    tierDetails: 'Standard regional trial package',
    tierAmount: 25000,
    expectedParticipants: 200,
    scheduleType: 'Fixed',
    startDate: '2024-03-15',
    endDate: '2024-03-20',
    tentativeMonth: null,
    tentativeDateRange: null,
    nextTrialDate: null,
    status: 'Active',
    assignedCities: [
      { cityName: 'Mumbai', trialRegion: 'Mumbai Central', code: 'IKF-MH-MUM-001' },
      { cityName: 'Delhi', trialRegion: 'New Delhi', code: 'IKF-DL-NEW-001' },
    ],
    comment: 'Main season 6 regular trial across multiple cities',
    createdBy: 'Super Admin',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-02-10T10:00:00Z',
  },
  {
    _id: 'trial-002',
    id: 'trial-002',
    trialName: 'CSR Football Drive Mumbai',
    trialCode: 'TRL-S6-CSR-001',
    season: 'Season 6',
    trialType: 'CSR',
    tierType: 'Premium',
    tierDetails: 'Premium CSR package with sponsor branding',
    tierAmount: 75000,
    expectedParticipants: 500,
    scheduleType: 'Fixed',
    startDate: '2024-04-01',
    endDate: '2024-04-05',
    tentativeMonth: null,
    tentativeDateRange: null,
    nextTrialDate: null,
    status: 'Active',
    assignedCities: [
      { cityName: 'Mumbai', trialRegion: 'Mumbai Central', code: 'IKF-MH-MUM-001' },
    ],
    comment: 'Corporate sponsored trial in Mumbai region',
    createdBy: 'Admin User',
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-01-20T10:00:00Z',
  },
  {
    _id: 'trial-003',
    id: 'trial-003',
    trialName: 'IKF Championship 2024',
    trialCode: 'TRL-S6-CHP-001',
    season: 'Season 6',
    trialType: 'Championship',
    tierType: 'Not Any',
    tierDetails: null,
    tierAmount: null,
    expectedParticipants: null,
    scheduleType: 'Tentative',
    startDate: null,
    endDate: null,
    tentativeMonth: 'June',
    tentativeDateRange: 'Mid June - End June 2024',
    nextTrialDate: '2024-06-15',
    status: 'Draft',
    assignedCities: [],
    comment: 'National championship - dates to be confirmed',
    createdBy: 'Super Admin',
    createdAt: '2024-02-01T10:00:00Z',
    updatedAt: '2024-02-01T10:00:00Z',
  },
  {
    _id: 'trial-004',
    id: 'trial-004',
    trialName: 'School Connect Bangalore',
    trialCode: 'TRL-S5-SPR-001',
    season: 'Season 5',
    trialType: 'School Partnership',
    tierType: 'Basic',
    tierDetails: 'Basic school partnership trial',
    tierAmount: 10000,
    expectedParticipants: 100,
    scheduleType: 'Fixed',
    startDate: '2024-02-10',
    endDate: '2024-02-12',
    tentativeMonth: null,
    tentativeDateRange: null,
    nextTrialDate: null,
    status: 'Completed',
    assignedCities: [
      { cityName: 'Bangalore', trialRegion: 'South Bangalore', code: 'IKF-KA-BAN-001' },
    ],
    comment: 'Completed school partnership trial in Bangalore',
    createdBy: 'Admin User',
    createdAt: '2023-12-15T10:00:00Z',
    updatedAt: '2024-02-12T10:00:00Z',
  },
  {
    _id: 'trial-005',
    id: 'trial-005',
    trialName: 'Season 5 Kolkata Regular',
    trialCode: 'TRL-S5-REG-001',
    season: 'Season 5',
    trialType: 'Regular',
    tierType: 'Not Any',
    tierDetails: null,
    tierAmount: null,
    expectedParticipants: null,
    scheduleType: 'Tentative',
    startDate: null,
    endDate: null,
    tentativeMonth: 'April',
    tentativeDateRange: 'Early April 2024',
    nextTrialDate: '2024-04-05',
    status: 'Cancelled',
    assignedCities: [],
    comment: 'Cancelled due to venue unavailability',
    createdBy: 'Super Admin',
    createdAt: '2023-11-20T10:00:00Z',
    updatedAt: '2024-01-30T10:00:00Z',
  },
  {
    _id: 'trial-006',
    id: 'trial-006',
    trialName: 'CSR Delhi Schools Initiative',
    trialCode: 'TRL-S6-CSR-002',
    season: 'Season 6',
    trialType: 'CSR',
    tierType: 'Standard',
    tierDetails: 'Standard CSR package for Delhi schools',
    tierAmount: 35000,
    expectedParticipants: 300,
    scheduleType: 'Fixed',
    startDate: '2024-03-25',
    endDate: '2024-03-28',
    tentativeMonth: null,
    tentativeDateRange: null,
    nextTrialDate: null,
    status: 'Active',
    assignedCities: [
      { cityName: 'Delhi', trialRegion: 'New Delhi', code: 'IKF-DL-NEW-001' },
    ],
    comment: 'Delhi schools CSR initiative',
    createdBy: 'Admin User',
    createdAt: '2024-02-05T10:00:00Z',
    updatedAt: '2024-02-05T10:00:00Z',
  },
];

export const trialsAPI = {
  /**
   * Get all trials with optional filters
   */
  getAll: async (filters = {}) => {
    await new Promise(resolve => setTimeout(resolve, 500));

    let trials = [...MOCK_TRIALS];

    if (filters.status && filters.status !== 'all') {
      trials = trials.filter(t => t.status === filters.status);
    }

    if (filters.trialType && filters.trialType !== 'all') {
      trials = trials.filter(t => t.trialType === filters.trialType);
    }

    if (filters.season && filters.season !== 'all') {
      trials = trials.filter(t => t.season === filters.season);
    }

    if (filters.search) {
      const query = filters.search.toLowerCase();
      trials = trials.filter(t =>
        t.trialName.toLowerCase().includes(query) ||
        t.trialCode.toLowerCase().includes(query) ||
        t.season.toLowerCase().includes(query) ||
        t.trialType.toLowerCase().includes(query) ||
        (t.comment && t.comment.toLowerCase().includes(query)) ||
        t.assignedCities?.some(c =>
          (typeof c === 'string' ? c : `${c.cityName} ${c.trialRegion} ${c.code}`).toLowerCase().includes(query)
        )
      );
    }

    return { trials, total: trials.length };
  },

  /**
   * Get a single trial by ID
   */
  getById: async (id) => {
    await new Promise(resolve => setTimeout(resolve, 300));
    const trial = MOCK_TRIALS.find(t => t._id === id || t.id === id);
    if (!trial) throw new Error('Trial not found');
    return { trial };
  },

  /**
   * Create a new trial
   */
  create: async (trialData) => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const exists = MOCK_TRIALS.some(t =>
      t.trialName.toLowerCase() === trialData.trialName.toLowerCase()
    );
    if (exists) {
      throw new Error('A trial with this name already exists');
    }

    const newId = `trial-${String(MOCK_TRIALS.length + 1).padStart(3, '0')}`;

    const newTrial = {
      _id: newId,
      id: newId,
      ...trialData,
      assignedCities: trialData.assignedCities || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    MOCK_TRIALS.push(newTrial);

    return {
      trial: newTrial,
      message: 'Trial created successfully',
    };
  },

  /**
   * Update an existing trial
   */
  update: async (id, trialData) => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const index = MOCK_TRIALS.findIndex(t => t._id === id || t.id === id);
    if (index === -1) throw new Error('Trial not found');

    MOCK_TRIALS[index] = {
      ...MOCK_TRIALS[index],
      ...trialData,
      _id: MOCK_TRIALS[index]._id,
      id: MOCK_TRIALS[index].id,
      trialName: MOCK_TRIALS[index].trialName, // Name cannot change
      trialCode: MOCK_TRIALS[index].trialCode, // Code cannot change
      createdAt: MOCK_TRIALS[index].createdAt,
      updatedAt: new Date().toISOString(),
    };

    return {
      trial: MOCK_TRIALS[index],
      message: 'Trial updated successfully',
    };
  },

  /**
   * Delete a trial
   */
  delete: async (id) => {
    await new Promise(resolve => setTimeout(resolve, 500));

    const index = MOCK_TRIALS.findIndex(t => t._id === id || t.id === id);
    if (index === -1) throw new Error('Trial not found');

    const deletedTrial = MOCK_TRIALS[index];
    MOCK_TRIALS.splice(index, 1);

    return {
      message: 'Trial deleted successfully',
      trial: deletedTrial,
    };
  },

  /**
   * Check if a trial name already exists
   */
  checkNameExists: async (name) => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return MOCK_TRIALS.some(t => t.trialName.toLowerCase() === name.toLowerCase());
  },

  /**
   * Assign a city to a trial
   * cityData: { cityName, trialRegion, code }
   */
  assignCity: async (trialId, cityData) => {
    await new Promise(resolve => setTimeout(resolve, 300));

    const index = MOCK_TRIALS.findIndex(t => t._id === trialId || t.id === trialId);
    if (index === -1) throw new Error('Trial not found');

    const alreadyAssigned = MOCK_TRIALS[index].assignedCities.some(
      c => c.code === cityData.code
    );
    if (!alreadyAssigned) {
      MOCK_TRIALS[index].assignedCities.push(cityData);
      MOCK_TRIALS[index].updatedAt = new Date().toISOString();
    }

    return {
      trial: MOCK_TRIALS[index],
      message: 'City assigned successfully',
    };
  },

  /**
   * Remove a city from a trial by code
   */
  removeCity: async (trialId, cityCode) => {
    await new Promise(resolve => setTimeout(resolve, 300));

    const index = MOCK_TRIALS.findIndex(t => t._id === trialId || t.id === trialId);
    if (index === -1) throw new Error('Trial not found');

    MOCK_TRIALS[index].assignedCities = MOCK_TRIALS[index].assignedCities.filter(
      c => c.code !== cityCode
    );
    MOCK_TRIALS[index].updatedAt = new Date().toISOString();

    return {
      trial: MOCK_TRIALS[index],
      message: 'City removed successfully',
    };
  },
};