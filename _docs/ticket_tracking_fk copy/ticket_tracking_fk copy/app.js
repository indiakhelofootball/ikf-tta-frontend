// ==================== DATA STORES ====================
let currentUser = null;

// REP Data
let repData = [
    {
        id: 'REP-001', name: 'Sports Academy Mumbai', season: 'S5', status: 'Active',
        region: 'West', state: 'Maharashtra', city: 'Mumbai', pinCode: '400001',
        postalAddress: '123 Sports Complex, Andheri West',
        contactName: 'Rajesh Sharma', phone: '9876543210', email: 'rajesh@sportsacademy.com',
        gst: '27AABCU9603R1ZM', pan: 'AABCU9603R', mouStatus: 'Signed', agreementStart: '2024-01-01', agreementEnd: '2024-12-31',
        websiteUrl: 'www.sportsacademy.com', socialMedia: '@sportsacademy'
    },
    {
        id: 'REP-002', name: 'Delhi Football Club', season: 'S5', status: 'Active',
        region: 'North', state: 'Delhi', city: 'New Delhi', pinCode: '110001',
        postalAddress: '45 Sports Hub, Connaught Place',
        contactName: 'Amit Kumar', phone: '9876543211', email: 'amit@dfc.com',
        gst: '07AABCU9603R1ZN', pan: 'AABCU9603R', mouStatus: 'Signed', agreementStart: '2024-01-01', agreementEnd: '2024-12-31',
        websiteUrl: 'www.delhifc.com', socialMedia: '@delhifc'
    },
    {
        id: 'REP-003', name: 'Bangalore Sports Hub', season: 'S4', status: 'Active',
        region: 'South', state: 'Karnataka', city: 'Bangalore', pinCode: '560001',
        postalAddress: '78 Stadium Road, Indiranagar',
        contactName: 'Suresh Reddy', phone: '9876543212', email: 'suresh@bsh.com',
        gst: '29AABCU9603R1ZO', pan: 'AABCU9603R', mouStatus: 'Pending', agreementStart: '2023-06-01', agreementEnd: '2024-05-31',
        websiteUrl: 'www.blrsportshub.com', socialMedia: '@blrsportshub'
    },
    {
        id: 'REP-004', name: 'Kolkata United', season: 'S3', status: 'Inactive',
        region: 'East', state: 'West Bengal', city: 'Kolkata', pinCode: '700001',
        postalAddress: '12 Salt Lake Stadium',
        contactName: 'Sourav Das', phone: '9876543213', email: 'sourav@ku.com',
        gst: '19AABCU9603R1ZP', pan: 'AABCU9603R', mouStatus: 'Expired', agreementStart: '2023-01-01', agreementEnd: '2023-12-31',
        websiteUrl: '', socialMedia: '@kolkatautd'
    },
    {
        id: 'REP-005', name: 'Chennai Football Academy', season: 'S5', status: 'Active',
        region: 'South', state: 'Tamil Nadu', city: 'Chennai', pinCode: '600001',
        postalAddress: '56 Marina Beach Road',
        contactName: 'Ramesh Iyer', phone: '9876543214', email: 'ramesh@cfa.com',
        gst: '33AABCU9603R1ZQ', pan: 'AABCU9603R', mouStatus: 'Signed', agreementStart: '2024-02-01', agreementEnd: '2025-01-31',
        websiteUrl: 'www.chennaifa.com', socialMedia: '@chennaifa'
    },
];

// Work Order Data
let workOrderData = [
    { id: 'WO-2024-001', vendorId: 'VEND-001', vendorName: 'Mumbai Printers', vendorGst: '27AABCU9603R1ZX', vendorPan: 'AABCU9603R', type: 'One Time', activity: 'Banner Printing', status: 'Approved', amount: 25000, createdDate: '2024-01-15', accountAdded: true },
    { id: 'WO-2024-002', vendorId: 'VEND-002', vendorName: 'Delhi Logistics', vendorGst: '07AABCU9603R1ZY', vendorPan: 'BBDEL1234P', type: 'Case-to-case', activity: 'Material Transport', status: 'Created', amount: 15000, createdDate: '2024-01-18', accountAdded: false },
    { id: 'WO-2024-003', vendorId: 'VEND-003', vendorName: 'Sports Equipment Co', vendorGst: '29AABCU9603R1ZZ', vendorPan: 'CCSEC5678Q', type: 'One Time', activity: 'Equipment Supply', status: 'Closed', amount: 45000, createdDate: '2024-01-10', accountAdded: true },
    { id: 'WO-2024-004', vendorId: 'VEND-004', vendorName: 'Event Management Pro', vendorGst: '19AABCU9603R1ZA', vendorPan: 'DDEMP9012R', type: 'Case-to-case', activity: 'Ground Setup', status: 'Approved', amount: 35000, createdDate: '2024-01-20', accountAdded: true },
    { id: 'WO-2024-005', vendorId: 'VEND-001', vendorName: 'Mumbai Printers', vendorGst: '27AABCU9603R1ZX', vendorPan: 'AABCU9603R', type: 'One Time', activity: 'T-Shirt Printing', status: 'Created', amount: 20000, createdDate: '2024-01-22', accountAdded: false },
];

// Vendor Documents Data
let vendorData = [
    {
        id: 'VEND-001',
        name: 'Mumbai Printers',
        type: 'Printing',
        gst: '27AABCU9603R1ZX',
        pan: 'AABCU9603R',
        gstVerified: true,
        panVerified: true,
        docStatus: 'Verified',
        address: '123 Industrial Area, Andheri East, Mumbai',
        contact: 'Rahul Mehta',
        phone: '9876543220',
        email: 'rahul@mumbaiprinters.com',
        bankName: 'HDFC Bank',
        accountNo: '1234567890',
        ifsc: 'HDFC0001234',
        registeredDate: '2024-01-10'
    },
    {
        id: 'VEND-002',
        name: 'Delhi Logistics',
        type: 'Logistics',
        gst: '07AABCU9603R1ZY',
        pan: 'BBDEL1234P',
        gstVerified: true,
        panVerified: false,
        docStatus: 'Pending',
        address: '45 Transport Nagar, New Delhi',
        contact: 'Sunil Sharma',
        phone: '9876543221',
        email: 'sunil@delhilogistics.com',
        bankName: 'ICICI Bank',
        accountNo: '2345678901',
        ifsc: 'ICIC0002345',
        registeredDate: '2024-01-15'
    },
    {
        id: 'VEND-003',
        name: 'Sports Equipment Co',
        type: 'Equipment',
        gst: '29AABCU9603R1ZZ',
        pan: 'CCSEC5678Q',
        gstVerified: true,
        panVerified: true,
        docStatus: 'Verified',
        address: '78 Sports Complex Road, Bangalore',
        contact: 'Kiran Rao',
        phone: '9876543222',
        email: 'kiran@sportsequip.com',
        bankName: 'SBI',
        accountNo: '3456789012',
        ifsc: 'SBIN0003456',
        registeredDate: '2024-01-08'
    },
    {
        id: 'VEND-004',
        name: 'Event Management Pro',
        type: 'Events',
        gst: '19AABCU9603R1ZA',
        pan: 'DDEMP9012R',
        gstVerified: false,
        panVerified: true,
        docStatus: 'Pending',
        address: '12 Event Plaza, Kolkata',
        contact: 'Arun Ghosh',
        phone: '9876543223',
        email: 'arun@eventpro.com',
        bankName: 'Axis Bank',
        accountNo: '4567890123',
        ifsc: 'UTIB0004567',
        registeredDate: '2024-01-12'
    },
    {
        id: 'VEND-005',
        name: 'Chennai Caterers',
        type: 'Catering',
        gst: '33AABCU9603R1ZB',
        pan: 'EECHT3456S',
        gstVerified: false,
        panVerified: false,
        docStatus: 'Rejected',
        address: '56 Food Street, Chennai',
        contact: 'Priya Iyer',
        phone: '9876543224',
        email: 'priya@chennaicaterers.com',
        bankName: 'Indian Bank',
        accountNo: '5678901234',
        ifsc: 'IDIB0005678',
        registeredDate: '2024-01-20'
    }
];

// City Data
let cityData = [
    {
        id: 'IKF-IN-MH-MUM',
        trialCity: 'Mumbai',
        name: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        region: 'West',
        rep: 'Sports Academy Mumbai',
        groundLocation: 'Andheri Sports Complex',
        trialType: 'Exclusive IKF Season Trial',
        trialDate: '2024-03-15',
        month: 'March',
        verified: true,
        scoutAssignmentStatus: 'Not Assigned',
        primaryScoutId: null,
        primaryScoutName: null,
        backupScoutId: null,
        backupScoutName: null,
        primaryScoutReached: null,
        backupScoutCalled: null,
        // ✅ AVAILABILITY TRACKING
        primaryScoutAvailabilityStatus: null, // Available / Not Available
        primaryScoutAvailabilityChecked: null,
        backupScoutAvailabilityStatus: null,
        backupScoutAvailabilityChecked: null,
        availabilityReverified: null
    },
    {
        id: 'IKF-IN-DL-DEL',
        trialCity: 'New Delhi',
        name: 'New Delhi',
        state: 'Delhi',
        country: 'India',
        region: 'North',
        rep: 'Delhi Football Club',
        groundLocation: 'Jawaharlal Nehru Stadium',
        trialType: 'Exclusive IKF Season Trial',
        trialDate: '2024-03-20',
        month: 'March',
        verified: true,
        scoutAssignmentStatus: 'Confirmed',
        primaryScoutId: 'SCOUT-002',
        primaryScoutName: 'Neha Singh',
        backupScoutId: 'SCOUT-001',
        backupScoutName: 'Aditya Verma',
        primaryScoutReached: 'No',
        backupScoutCalled: 'Yes',
        // ✅ AVAILABILITY TRACKING
        primaryScoutAvailabilityStatus: 'Available',
        primaryScoutAvailabilityChecked: '2026-02-15',
        backupScoutAvailabilityStatus: 'Available',
        backupScoutAvailabilityChecked: '2026-02-15',
        availabilityReverified: null
    },
    {
        id: 'IKF-IN-KA-BLR',
        trialCity: 'Bangalore',
        name: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        region: 'South',
        rep: 'Bangalore Sports Hub',
        groundLocation: 'Kanteerava Stadium',
        trialType: 'CSR Project Trial',
        trialDate: '2024-03-25',
        month: 'March',
        verified: false,
        scoutAssignmentStatus: 'Both Assigned',
        primaryScoutId: 'SCOUT-003',
        primaryScoutName: 'Rahul Nair',
        backupScoutId: null,
        backupScoutName: null,
        primaryScoutReached: 'Yes',
        backupScoutCalled: null
    },
    {
        id: 'IKF-IN-WB-KOL',
        trialCity: 'Kolkata',
        name: 'Kolkata',
        state: 'West Bengal',
        country: 'India',
        region: 'East',
        rep: 'Kolkata United',
        groundLocation: 'Salt Lake Stadium',
        trialType: 'Zonals',
        trialDate: '2024-04-01',
        month: 'April',
        verified: true,
        scoutAssignmentStatus: 'Not Assigned',
        primaryScoutId: null,
        primaryScoutName: null,
        backupScoutId: null,
        backupScoutName: null,
        primaryScoutReached: null,
        backupScoutCalled: null,
        // ✅ AVAILABILITY TRACKING
        primaryScoutAvailabilityStatus: null, // Available / Not Available
        primaryScoutAvailabilityChecked: null,
        backupScoutAvailabilityStatus: null,
        backupScoutAvailabilityChecked: null,
        availabilityReverified: null
    },
    {
        id: 'IKF-IN-TN-CHN',
        trialCity: 'Chennai',
        name: 'Chennai',
        state: 'Tamil Nadu',
        country: 'India',
        region: 'South',
        rep: 'Chennai Football Academy',
        groundLocation: 'Nehru Indoor Stadium',
        trialType: 'Exclusive IKF Season Trial',
        trialDate: '2024-04-05',
        month: 'April',
        verified: true,
        scoutAssignmentStatus: 'Primary Assigned',
        primaryScoutId: 'SCOUT-001',
        primaryScoutName: 'Aditya Verma',
        backupScoutId: null,
        backupScoutName: null,
        primaryScoutReached: null,
        backupScoutCalled: null
    },
];

// Payment Data
let paymentData = [
    { id: 'PAY-001', workOrderId: 'WO-2024-001', vendorId: 'VEND-001', vendorName: 'Mumbai Printers', amount: 25000, frequency: 'One Time', status: 'Paid', dueDate: '2024-02-15', paidDate: '2024-02-10' },
    { id: 'PAY-002', workOrderId: 'WO-2024-002', vendorId: 'VEND-002', vendorName: 'Delhi Logistics', amount: 15000, frequency: 'Monthly', status: 'Pending', dueDate: '2024-02-20', paidDate: null },
    { id: 'PAY-003', workOrderId: 'WO-2024-003', vendorId: 'VEND-003', vendorName: 'Sports Equipment Co', amount: 45000, frequency: 'One Time', status: 'Paid', dueDate: '2024-01-25', paidDate: '2024-01-24' },
    { id: 'PAY-004', workOrderId: 'WO-2024-004', vendorId: 'VEND-004', vendorName: 'Event Management Pro', amount: 35000, frequency: 'Cyclic', status: 'Overdue', dueDate: '2024-01-30', paidDate: null },
    { id: 'PAY-005', workOrderId: 'WO-2024-005', vendorId: 'VEND-001', vendorName: 'Mumbai Printers', amount: 20000, frequency: 'One Time', status: 'Not Raised', dueDate: null, paidDate: null },
];
// ==================== SCOUTS DATA ====================
let scoutData = [
  {
    id: "SCOUT-001",
    fullName: "Aditya Verma",
    mobile: "9876500001",
    email: "aditya@ikf.com",
    status: "Active",

    region: "East",
    states: ["West Bengal", "Odisha"],
    cities: ["Kolkata", "Bhubaneswar"],
    coverageLevel: "City",

    assignedTrial: "U-17 Open Trial",
    trialDate: "2026-02-20",
    trialCity: "New Delhi",
    reportingManager: "Trial Manager",

    // ✅ NEW FIELDS
    jobRole: "Scout", // e.g., Scout / Lead Scout / Coach / Volunteer
    reachedLocation: "Yes", // Yes / No
    backupName: "Rohit Das",
    backupPhone: "9899001122",
    fromCity: "Kolkata",
    fromState: "West Bengal",

    // ✅ AVAILABILITY TRACKING
    availabilityStatus: "Available", // Not Checked / Available / Not Available
    availabilityLastChecked: "2026-02-15",
    availabilityNotes: ""
  },

  {
    id: "SCOUT-002",
    fullName: "Neha Singh",
    mobile: "9876500002",
    email: "neha@ikf.com",
    status: "Active",
    region: "North",
    states: ["Delhi"],
    cities: ["New Delhi"],
    coverageLevel: "City",
    assignedTrial: "U-15 Open Trial",
    trialDate: "2026-02-28",
    trialCity: "Mumbai",
    reportingManager: "Assistant Trial Manager",

    // ✅ NEW FIELDS
    jobRole: "Coach",
    reachedLocation: "No",
    backupName: "Pooja Sharma",
    backupPhone: "9877002211",
    fromCity: "New Delhi",
    fromState: "Delhi",

    // ✅ AVAILABILITY TRACKING
    availabilityStatus: "Not Checked",
    availabilityLastChecked: null,
    availabilityNotes: ""
  },

  {
    id: "SCOUT-003",
    fullName: "Rahul Nair",
    mobile: "9876500003",
    email: "rahul@ikf.com",
    status: "Inactive",
    region: "South",
    states: ["Karnataka"],
    cities: ["Bangalore"],
    coverageLevel: "City",
    assignedTrial: "Girls U-17 Trial",
    trialDate: "2026-03-05",
    trialCity: "Bangalore",
    reportingManager: "Trial Manager",

    // ✅ NEW FIELDS
    jobRole: "Lead Scout",
    reachedLocation: "Yes",
    backupName: "",
    backupPhone: "",
    fromCity: "Bangalore",
    fromState: "Karnataka",

    // ✅ AVAILABILITY TRACKING
    availabilityStatus: "Not Available",
    availabilityLastChecked: "2026-02-10",
    availabilityNotes: "Already committed to another assignment"
  }
];


const scoutRegions = ["North", "South", "East", "West", "NE"];
const scoutCoverageLevels = ["City", "District", "State", "National"];
const scoutTrials = [
  { name: "U-17 Open Trial", date: "2026-02-20", city: "New Delhi", manager: "Trial Manager" },
  { name: "U-15 Open Trial", date: "2026-02-28", city: "Mumbai", manager: "Assistant Trial Manager" },
  { name: "Girls U-17 Trial", date: "2026-03-05", city: "Bangalore", manager: "Trial Manager" },
];
const scoutPositions = ["Goalkeeper", "Defender", "Midfielder", "Winger", "Striker"];
const scoutRecommendations = ["Shortlist", "Watchlist", "Reject"];

// State
let currentEditItem = null;
let currentEditType = null;
let deleteCallback = null;

// Vendor type options
const vendorTypes = ['Printing', 'Logistics', 'Equipment', 'Events', 'Catering', 'Marketing', 'IT Services', 'Other'];

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // Login form
    document.getElementById('login-form').addEventListener('submit', handleLogin);

    // Sidebar navigation
    document.querySelectorAll('.menu-item[data-page]').forEach(item => {
        item.addEventListener('click', () => handleNavigation(item.dataset.page));
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Search inputs
    document.getElementById('rep-search')?.addEventListener('input', (e) => filterData('rep', e.target.value));
    document.getElementById('workorder-search')?.addEventListener('input', (e) => filterData('workorder', e.target.value));
    document.getElementById('city-search')?.addEventListener('input', (e) => filterData('city', e.target.value));
    document.getElementById('payment-search')?.addEventListener('input', (e) => filterData('payment', e.target.value));
    document.getElementById('vendor-search')?.addEventListener('input', (e) => filterData('vendor', e.target.value));

    // Filter pills
    document.querySelectorAll('.filter-pills .pill').forEach(pill => {
        pill.addEventListener('click', handleFilterPill);
    });
    // scouts
    document.getElementById('scout-search')?.addEventListener('input', (e) => filterData('scout', e.target.value));

    // Modal close
    document.getElementById('modal-overlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'modal-overlay') closeModal();
    });
    document.getElementById('delete-modal-overlay')?.addEventListener('click', (e) => {
        if (e.target.id === 'delete-modal-overlay') closeDeleteModal();
    });

    // Initialize additional features
    initSidebarToggle();
    initGlobalSearch();
    initNotifications();
    initUserProfile();
    initKeyboardShortcuts();
}

// ==================== LOGIN ====================
function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const role = document.getElementById('role').value;

    if (!role) {
        showSnackbar('Please select a role', 'error');
        return;
    }

    currentUser = {
        email,
        role,
        roleName: document.getElementById('role').options[document.getElementById('role').selectedIndex].text
    };

    document.getElementById('login-page').classList.remove('active');
    document.getElementById('app-container').classList.remove('hidden');
    document.getElementById('user-name').textContent = email.split('@')[0];
    document.getElementById('user-role-display').textContent = currentUser.roleName;

    renderDashboard();
    renderRepTable();
    renderWorkOrderTable();
    renderCityCards();
    renderPaymentTable();
    renderVendorCards();
    renderScoutTable();

    showSnackbar('Welcome! Logged in successfully');
}

function handleLogout() {
    currentUser = null;
    document.getElementById('app-container').classList.add('hidden');
    document.getElementById('login-page').classList.add('active');
    document.getElementById('login-form').reset();
    showSnackbar('Logged out successfully');
}

// ==================== NAVIGATION ====================
function handleNavigation(page) {
    document.querySelectorAll('.menu-item[data-page]').forEach(item => {
        item.classList.toggle('active', item.dataset.page === page);
    });

    document.querySelectorAll('.content-page').forEach(p => {
        p.classList.toggle('active', p.id === `${page}-page`);
    });

    const titles = {
        dashboard: 'Dashboard',
        rep: 'REP Management',
        workorders: 'Work Orders',
        city: 'Trial Cities',
        payments: 'Payments',
        vendors: 'Vendor Documents',
        scouts: 'Scouts Management'

    };

    document.getElementById('page-title').textContent = titles[page] || 'Dashboard';
}

// ==================== DASHBOARD ====================
function renderDashboard() {
    // Stats
    document.getElementById('stat-active-reps').textContent = repData.filter(r => r.status === 'Active').length;
    document.getElementById('stat-work-orders').textContent = workOrderData.length;
    document.getElementById('stat-trial-cities').textContent = cityData.length;

    const pendingAmount = paymentData.filter(p => p.status === 'Pending' || p.status === 'Overdue').reduce((sum, p) => sum + p.amount, 0);
    document.getElementById('stat-pending-amount').textContent = `₹${Math.round(pendingAmount/1000)}K`;

    // Activity list
    const activityList = document.getElementById('activity-list');
    const activities = [
        { icon: 'person_add', text: 'New REP added: Chennai Football Academy', time: '2 hours ago' },
        { icon: 'assignment', text: 'Work Order WO-2024-005 created', time: '3 hours ago' },
        { icon: 'payment', text: 'Payment PAY-001 marked as Paid', time: '5 hours ago' },
        { icon: 'location_city', text: 'Trial city Bangalore updated', time: '1 day ago' }
    ];

    activityList.innerHTML = activities.map(a => `
        <div class="activity-item">
            <span class="material-icons">${a.icon}</span>
            <div class="activity-content">
                <p>${a.text}</p>
                <span>${a.time}</span>
            </div>
        </div>
    `).join('');

    // Upcoming trials
    const trialsList = document.getElementById('upcoming-trials');
    const upcomingTrials = cityData.slice(0, 3);
    trialsList.innerHTML = upcomingTrials.map(city => {
        const date = new Date(city.trialDate);
        return `
            <div class="trial-item">
                <div class="trial-date">
                    <span class="day">${date.getDate()}</span>
                    <span class="month">${date.toLocaleString('en', {month: 'short'})}</span>
                </div>
                <div class="trial-info">
                    <h4>${city.name}</h4>
                    <span>${city.groundLocation}</span>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== REP MANAGEMENT ====================
function renderRepTable(filter = 'all', search = '') {
    const tbody = document.getElementById('rep-table-body');
    let data = repData;

    if (filter !== 'all') data = data.filter(r => r.status.toLowerCase() === filter);
    if (search) {
        const s = search.toLowerCase();
        data = data.filter(r => r.name.toLowerCase().includes(s) || r.city.toLowerCase().includes(s) || r.contactName.toLowerCase().includes(s));
    }

    tbody.innerHTML = data.map(rep => `
        <tr>
            <td>
                <div class="cell-main">${rep.name}</div>
                <div class="cell-sub">${rep.id} | Since ${rep.season}</div>
            </td>
            <td>
                <div class="cell-main">${rep.city}, ${rep.state}</div>
                <div class="cell-sub">${rep.region} Region</div>
            </td>
            <td>
                <div class="cell-main">${rep.contactName}</div>
                <div class="cell-sub">${rep.phone}</div>
            </td>
            <td>
                <div class="cell-main">GST: ${rep.gst}</div>
                <div class="cell-sub">PAN: ${rep.pan || '-'} | MoU: ${rep.mouStatus}</div>
            </td>
            <td><span class="badge ${rep.status === 'Active' ? 'badge-success' : 'badge-error'}">${rep.status}</span></td>
            <td>
                <div class="table-actions">
                    <button class="icon-btn" onclick="viewRep('${rep.id}')" title="View"><span class="material-icons">visibility</span></button>
                    <button class="icon-btn" onclick="editRep('${rep.id}')" title="Edit"><span class="material-icons">edit</span></button>
                    <button class="icon-btn" onclick="deleteRep('${rep.id}')" title="Delete"><span class="material-icons">delete</span></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function viewRep(id) {
    const rep = repData.find(r => r.id === id);
    if (!rep) return;

    document.getElementById('modal-title').textContent = 'View REP Details';
    document.getElementById('modal-content').innerHTML = `
        <div class="form-section">
            <div class="form-section-title">Basic Details</div>
            <div class="form-row"><div class="form-group"><label>REP Name</label><p>${rep.name}</p></div><div class="form-group"><label>REP Code</label><p>${rep.id}</p></div></div>
            <div class="form-row"><div class="form-group"><label>Season</label><p>${rep.season}</p></div><div class="form-group"><label>Status</label><p><span class="badge ${rep.status === 'Active' ? 'badge-success' : 'badge-error'}">${rep.status}</span></p></div></div>
        </div>
        <div class="form-section">
            <div class="form-section-title">Location</div>
            <div class="form-row"><div class="form-group"><label>Region</label><p>${rep.region}</p></div><div class="form-group"><label>State</label><p>${rep.state}</p></div></div>
            <div class="form-row"><div class="form-group"><label>City</label><p>${rep.city}</p></div><div class="form-group"><label>Pin Code</label><p>${rep.pinCode || '-'}</p></div></div>
            <div class="form-group"><label>Address</label><p>${rep.postalAddress || '-'}</p></div>
        </div>
        <div class="form-section">
            <div class="form-section-title">Contact</div>
            <div class="form-row"><div class="form-group"><label>Contact Name</label><p>${rep.contactName}</p></div><div class="form-group"><label>Phone</label><p>${rep.phone}</p></div></div>
            <div class="form-group"><label>Email</label><p>${rep.email}</p></div>
        </div>
        <div class="form-section">
            <div class="form-section-title">Legal & Compliance</div>
            <div class="form-row"><div class="form-group"><label>GST No.</label><p>${rep.gst}</p></div><div class="form-group"><label>PAN No.</label><p>${rep.pan || '-'}</p></div></div>
            <div class="form-group"><label>MoU Status</label><p>${rep.mouStatus}</p></div>
        </div>
    `;
    document.getElementById('modal-save').style.display = 'none';
    document.getElementById('modal-overlay').classList.add('active');
}

function editRep(id) {
    const rep = repData.find(r => r.id === id);
    if (!rep) return;
    currentEditItem = rep;
    currentEditType = 'rep';
    openModal('rep', 'edit', rep);
}

function deleteRep(id) {
    const rep = repData.find(r => r.id === id);
    if (!rep) return;

    document.getElementById('delete-message').textContent = `Are you sure you want to delete REP "${rep.name}"?`;
    deleteCallback = () => {
        repData = repData.filter(r => r.id !== id);
        renderRepTable();
        renderDashboard();
        showSnackbar('REP deleted successfully');
    };
    document.getElementById('delete-modal-overlay').classList.add('active');
}

// ==================== WORK ORDERS ====================
function renderWorkOrderTable(filter = 'all', search = '') {
    const tbody = document.getElementById('workorder-table-body');
    let data = workOrderData;

    if (filter !== 'all') data = data.filter(w => w.status.toLowerCase() === filter);
    if (search) {
        const s = search.toLowerCase();
        data = data.filter(w => w.vendorName.toLowerCase().includes(s) || w.activity.toLowerCase().includes(s) || w.id.toLowerCase().includes(s));
    }

    const statusClass = (s) => ({ 'Created': 'badge-info', 'Approved': 'badge-success', 'Closed': 'badge-warning' }[s] || 'badge-info');

    tbody.innerHTML = data.map(wo => `
        <tr>
            <td>
                <div class="cell-main">${wo.id}</div>
                <div class="cell-sub">${wo.createdDate}</div>
            </td>
            <td>
                <div class="cell-main">${wo.vendorName}</div>
                <div class="cell-sub">${wo.vendorId}</div>
            </td>
            <td>${wo.activity}</td>
            <td><strong>₹${wo.amount.toLocaleString()}</strong></td>
            <td><span class="badge ${statusClass(wo.status)}">${wo.status}</span></td>
            <td>
                <div class="table-actions">
                    <button class="icon-btn" onclick="editWorkOrder('${wo.id}')" title="Edit"><span class="material-icons">edit</span></button>
                    <button class="icon-btn" onclick="deleteWorkOrder('${wo.id}')" title="Delete"><span class="material-icons">delete</span></button>
                </div>
            </td>
        </tr>
    `).join('');
}

function editWorkOrder(id) {
    const wo = workOrderData.find(w => w.id === id);
    if (!wo) return;
    currentEditItem = wo;
    currentEditType = 'workorder';
    openModal('workorder', 'edit', wo);
}

function deleteWorkOrder(id) {
    const wo = workOrderData.find(w => w.id === id);
    if (!wo) return;

    document.getElementById('delete-message').textContent = `Are you sure you want to delete Work Order "${wo.id}"?`;
    deleteCallback = () => {
        workOrderData = workOrderData.filter(w => w.id !== id);
        renderWorkOrderTable();
        renderDashboard();
        showSnackbar('Work Order deleted successfully');
    };
    document.getElementById('delete-modal-overlay').classList.add('active');
}

// ==================== CITY MANAGEMENT ====================
function renderCityCards(filter = 'all', search = '') {
    const container = document.getElementById('city-cards');
    let data = cityData;

    if (filter !== 'all') data = data.filter(c => c.region.toLowerCase() === filter);
    if (search) {
        const s = search.toLowerCase();
        data = data.filter(c => c.name.toLowerCase().includes(s) || c.state.toLowerCase().includes(s) || c.rep.toLowerCase().includes(s) || c.trialCity.toLowerCase().includes(s));
    }

    const getScoutStatusBadge = (status) => {
        const badges = {
            'Not Assigned': 'badge-error',
            'Assigned': 'badge-info',
            'Confirmed': 'badge-success'
        };
        return badges[status] || 'badge-info';
    };

    container.innerHTML = data.map(city => `
        <div class="city-card">
            <div class="city-card-header">
                <div class="city-card-title">
                    <h4>${city.name}, ${city.state}</h4>
                    <span>${city.region} | ${city.trialDate}</span>
                </div>
                <span class="badge ${city.verified ? 'badge-success' : 'badge-warning'}">${city.verified ? 'Verified' : 'Pending'}</span>
            </div>
            <div class="city-card-body">
                <div class="city-card-row"><span class="material-icons">code</span><span>${city.id}</span></div>
                <div class="city-card-row"><span class="material-icons">groups</span><span>${city.rep}</span></div>
                <div class="city-card-row"><span class="material-icons">stadium</span><span>${city.groundLocation}</span></div>
                <div class="city-card-row"><span class="material-icons">event</span><span>${city.trialDate} - ${city.trialType}</span></div>
                <div class="city-card-row">
                    <span class="material-icons">person_search</span>
                    <span>Scout: <span class="badge ${getScoutStatusBadge(city.scoutAssignmentStatus)}">${city.scoutAssignmentStatus}</span></span>
                </div>
                ${city.primaryScoutName ? `
                    <div class="city-card-row"><span class="material-icons">person</span><span>Scout: ${city.primaryScoutName}</span></div>
                ` : ''}
                ${city.backupScoutName ? `
                    <div class="city-card-row"><span class="material-icons">contact_phone</span><span>Backup: ${city.backupScoutName} - ${city.backupScoutId}</span></div>
                ` : ''}
                ${city.primaryScoutReached ? `
                    <div class="city-card-row">
                        <span class="material-icons">${city.primaryScoutReached === 'Yes' ? 'check_circle' : 'cancel'}</span>
                        <span>Reached: ${city.primaryScoutReached}</span>
                    </div>
                ` : ''}
            </div>
            <div class="city-card-actions">
                <button class="btn-primary" onclick="assignScout('${city.id}')"><span class="material-icons">person_add</span>Assign Scout</button>
                ${city.primaryScoutId ? `
                    <button class="btn-secondary" onclick="reverifyScoutAvailability('${city.id}')" style="background: var(--warning); color: white;">
                        <span class="material-icons">fact_check</span>Re-verify
                    </button>
                ` : ''}
                <button class="btn-secondary" onclick="editCity('${city.id}')"><span class="material-icons">edit</span>Edit</button>
                <button class="btn-danger" onclick="deleteCity('${city.id}')"><span class="material-icons">delete</span>Delete</button>
            </div>
        </div>
    `).join('');
}

function editCity(id) {
    const city = cityData.find(c => c.id === id);
    if (!city) return;
    currentEditItem = city;
    currentEditType = 'city';
    openModal('city', 'edit', city);
}

function deleteCity(id) {
    const city = cityData.find(c => c.id === id);
    if (!city) return;

    document.getElementById('delete-message').textContent = `Are you sure you want to delete city "${city.name}"?`;
    deleteCallback = () => {
        cityData = cityData.filter(c => c.id !== id);
        renderCityCards();
        renderDashboard();
        showSnackbar('City deleted successfully');
    };
    document.getElementById('delete-modal-overlay').classList.add('active');
}

// ==================== SCOUT ASSIGNMENT WORKFLOW ====================
function assignScout(cityId) {
    const trial = cityData.find(c => c.id === cityId);
    if (!trial) return;

    // Get available scouts sorted by proximity
    const availableScouts = getAvailableScouts(trial);

    document.getElementById('modal-title').textContent = `Assign Scout - ${trial.name}, ${trial.state}`;
    document.getElementById('modal-content').innerHTML = getScoutAssignmentForm(trial, availableScouts);

    // Change the save button text
    const saveBtn = document.getElementById('modal-save');
    saveBtn.textContent = 'Confirm Assignment';
    saveBtn.onclick = () => saveScoutAssignment(cityId);

    document.getElementById('modal-overlay').classList.add('active');
}

function getAvailableScouts(trial) {
    // Filter active scouts and sort by proximity
    let scouts = scoutData.filter(s => s.status === 'Active');

    // Sort: same city first, then same state, then same region
    scouts.sort((a, b) => {
        // Same city gets highest priority
        const aSameCity = a.cities?.includes(trial.name) ? 3 : 0;
        const bSameCity = b.cities?.includes(trial.name) ? 3 : 0;

        // Same state gets medium priority
        const aSameState = a.states?.includes(trial.state) ? 2 : 0;
        const bSameState = b.states?.includes(trial.state) ? 2 : 0;

        // Same region gets low priority
        const aSameRegion = a.region === trial.region ? 1 : 0;
        const bSameRegion = b.region === trial.region ? 1 : 0;

        const aScore = aSameCity + aSameState + aSameRegion;
        const bScore = bSameCity + bSameState + bSameRegion;

        return bScore - aScore;
    });

    return scouts.map(s => ({
        ...s,
        proximity: s.cities?.includes(trial.name) ? 'Same City' :
                   s.states?.includes(trial.state) ? 'Same State' :
                   s.region === trial.region ? 'Same Region' : 'Other'
    }));
}

function getScoutAssignmentForm(trial, scouts) {
    return `
        <div class="form-section">
            <div class="form-section-title">Trial Information</div>
            <div class="form-row">
                <div class="form-group"><label>Trial City</label><p><strong>${trial.name}, ${trial.state}</strong></p></div>
                <div class="form-group"><label>Date</label><p>${trial.trialDate}</p></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Ground</label><p>${trial.groundLocation}</p></div>
                <div class="form-group"><label>Status</label><p><span class="badge ${trial.scoutAssignmentStatus === 'Not Assigned' ? 'badge-error' : 'badge-info'}">${trial.scoutAssignmentStatus}</span></p></div>
            </div>
        </div>

        <div class="form-section">
            <div class="form-section-title">Assign Scout</div>
            <div class="form-group">
                <label>Scout *</label>
                <select id="form-primary-scout" required onchange="updateScoutInfo('primary', '${trial.id}')">
                    <option value="">Select Scout</option>
                    ${scouts.map(s => {
                        const availabilityBadge = s.availabilityStatus === 'Available' ? '✓' :
                                                  s.availabilityStatus === 'Not Available' ? '✗' : '?';
                        return `
                        <option value="${s.id}" ${trial.primaryScoutId === s.id ? 'selected' : ''}>
                            ${availabilityBadge} ${s.fullName} - ${s.fromCity || 'N/A'} (${s.proximity})
                        </option>
                    `}).join('')}
                </select>
            </div>
            <div id="primary-scout-info" style="margin-top: 10px;"></div>
        </div>

        <div class="form-section">
            <div class="form-section-title">Backup Contact (Optional)</div>
            <div class="form-row">
                <div class="form-group">
                    <label>Backup Name</label>
                    <input type="text" id="form-backup-name" placeholder="Enter backup contact name" value="${trial.backupScoutName || ''}">
                </div>
                <div class="form-group">
                    <label>Backup Phone</label>
                    <input type="tel" id="form-backup-phone" placeholder="+91 XXXXX XXXXX" value="${trial.backupScoutId || ''}">
                </div>
            </div>
        </div>

        <div class="form-section">
            <div class="form-section-title">Trial Day Status</div>
            <div class="form-row">
                <div class="form-group">
                    <label>Scout Reached?</label>
                    <select id="form-primary-reached">
                        <option value="">Not Yet</option>
                        <option value="Yes" ${trial.primaryScoutReached === 'Yes' ? 'selected' : ''}>Yes</option>
                        <option value="No" ${trial.primaryScoutReached === 'No' ? 'selected' : ''}>No</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Backup Called?</label>
                    <select id="form-backup-called">
                        <option value="">No</option>
                        <option value="Yes" ${trial.backupScoutCalled === 'Yes' ? 'selected' : ''}>Yes</option>
                    </select>
                </div>
            </div>
        </div>
    `;
}

function updateScoutInfo(type, trialId) {
    const selectId = type === 'primary' ? 'form-primary-scout' : 'form-backup-scout';
    const infoId = type === 'primary' ? 'primary-scout-info' : 'backup-scout-info';

    const scoutId = document.getElementById(selectId).value;
    const infoDiv = document.getElementById(infoId);

    if (!scoutId) {
        infoDiv.innerHTML = '';
        return;
    }

    const scout = scoutData.find(s => s.id === scoutId);
    if (!scout) return;

    const availabilityBadgeClass = scout.availabilityStatus === 'Available' ? 'badge-success' :
                                    scout.availabilityStatus === 'Not Available' ? 'badge-error' :
                                    'badge-info';

    infoDiv.innerHTML = `
        <div style="padding: 12px; background: #f5f5f5; border-radius: 4px; border-left: 4px solid var(--primary);">
            <div style="margin-bottom: 8px;">
                <p style="margin: 4px 0;"><strong>Mobile:</strong> ${scout.mobile}</p>
                <p style="margin: 4px 0;"><strong>From:</strong> ${scout.fromCity}, ${scout.fromState}</p>
                <p style="margin: 4px 0;"><strong>Region:</strong> ${scout.region}</p>
                ${scout.backupName ? `<p style="margin: 4px 0;"><strong>Backup Contact:</strong> ${scout.backupName} - ${scout.backupPhone}</p>` : ''}
            </div>
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #ddd;">
                <p style="margin: 4px 0;"><strong>Availability:</strong>
                    <span class="badge ${availabilityBadgeClass}">${scout.availabilityStatus}</span>
                </p>
                ${scout.availabilityLastChecked ?
                    `<p style="font-size: 0.85em; color: #666; margin: 4px 0;">Last checked: ${scout.availabilityLastChecked}</p>` :
                    ''
                }
                ${scout.availabilityNotes ?
                    `<p style="font-size: 0.9em; color: #555; margin: 4px 0; font-style: italic;">"${scout.availabilityNotes}"</p>` :
                    ''
                }
                <button type="button"
                    onclick="event.stopPropagation(); checkScoutAvailability('${scout.id}', '${trialId}')"
                    style="margin-top: 8px; padding: 6px 12px; background: var(--primary); color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em;">
                    Check Availability
                </button>
            </div>
        </div>
    `;
}

function saveScoutAssignment(cityId) {
    const primaryScoutId = document.getElementById('form-primary-scout').value;
    const backupName = document.getElementById('form-backup-name').value.trim();
    const backupPhone = document.getElementById('form-backup-phone').value.trim();
    const primaryReached = document.getElementById('form-primary-reached').value;
    const backupCalled = document.getElementById('form-backup-called').value;

    if (!primaryScoutId) {
        showSnackbar('Please select a scout', 'error');
        return;
    }

    const trial = cityData.find(c => c.id === cityId);
    if (!trial) return;

    const primaryScout = scoutData.find(s => s.id === primaryScoutId);

    // ✅ AVAILABILITY VALIDATION
    if (primaryScout.availabilityStatus === 'Not Available') {
        showSnackbar('Warning: Scout is marked as Not Available', 'error');
        return;
    }

    if (primaryScout.availabilityStatus === 'Not Checked') {
        const proceed = confirm('Scout availability has not been checked. Do you want to proceed with assignment anyway?');
        if (!proceed) return;
    }

    // Determine status
    let status = 'Not Assigned';
    if (primaryScoutId && primaryReached) {
        status = 'Confirmed';
    } else if (primaryScoutId) {
        status = 'Assigned';
    }

    // Update trial
    trial.scoutAssignmentStatus = status;
    trial.primaryScoutId = primaryScoutId;
    trial.primaryScoutName = primaryScout?.fullName || null;
    trial.backupScoutId = backupPhone; // Store backup phone in backupScoutId field
    trial.backupScoutName = backupName; // Store backup name
    trial.primaryScoutReached = primaryReached || null;
    trial.backupScoutCalled = backupCalled || null;

    // ✅ Save availability status at time of assignment
    trial.primaryScoutAvailabilityStatus = primaryScout?.availabilityStatus || null;
    trial.primaryScoutAvailabilityChecked = primaryScout?.availabilityLastChecked || null;
    trial.backupScoutAvailabilityStatus = null;
    trial.backupScoutAvailabilityChecked = null;

    renderCityCards();
    closeModal();

    // Reset save button
    const saveBtn = document.getElementById('modal-save');
    saveBtn.textContent = 'Save';
    saveBtn.onclick = handleModalSave;

    showSnackbar('Scout assignment updated successfully');
}

// ==================== SCOUT AVAILABILITY CHECKING ====================
function checkScoutAvailability(scoutId, trialId) {
    const scout = scoutData.find(s => s.id === scoutId);
    const trial = cityData.find(c => c.id === trialId);

    if (!scout || !trial) return;

    document.getElementById('modal-title').textContent = `Check Availability - ${scout.fullName}`;
    document.getElementById('modal-content').innerHTML = getAvailabilityCheckForm(scout, trial);

    const saveBtn = document.getElementById('modal-save');
    saveBtn.textContent = 'Save Availability';
    saveBtn.onclick = () => saveScoutAvailability(scoutId, trialId);

    document.getElementById('modal-overlay').classList.add('active');
}

function getAvailabilityCheckForm(scout, trial) {
    return `
        <div class="form-section">
            <div class="form-section-title">Scout Information</div>
            <div class="form-row">
                <div class="form-group">
                    <label>Scout Name</label>
                    <p><strong>${scout.fullName}</strong></p>
                </div>
                <div class="form-group">
                    <label>Phone</label>
                    <p>${scout.mobile}</p>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Current Location</label>
                    <p>${scout.fromCity}, ${scout.fromState}</p>
                </div>
                <div class="form-group">
                    <label>Backup Contact</label>
                    <p>${scout.backupName ? `${scout.backupName} - ${scout.backupPhone}` : 'N/A'}</p>
                </div>
            </div>
        </div>

        <div class="form-section">
            <div class="form-section-title">Trial Information</div>
            <div class="form-row">
                <div class="form-group">
                    <label>Trial City</label>
                    <p><strong>${trial.name}, ${trial.state}</strong></p>
                </div>
                <div class="form-group">
                    <label>Trial Date</label>
                    <p>${trial.trialDate}</p>
                </div>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Ground Location</label>
                    <p>${trial.groundLocation}</p>
                </div>
                <div class="form-group">
                    <label>Region</label>
                    <p>${trial.region}</p>
                </div>
            </div>
        </div>

        <div class="form-section">
            <div class="form-section-title">Availability Status</div>
            <div class="form-group">
                <label>Current Status</label>
                <p><span class="badge ${
                    scout.availabilityStatus === 'Available' ? 'badge-success' :
                    scout.availabilityStatus === 'Not Available' ? 'badge-error' :
                    'badge-info'
                }">${scout.availabilityStatus}</span></p>
                ${scout.availabilityLastChecked ? `<p style="font-size: 0.9em; color: #666; margin-top: 5px;">Last checked: ${scout.availabilityLastChecked}</p>` : ''}
            </div>

            <div class="form-group">
                <label>Update Availability Status *</label>
                <div style="display: flex; gap: 20px; margin-top: 10px;">
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="radio" name="availability" value="Available"
                            ${scout.availabilityStatus === 'Available' ? 'checked' : ''}
                            style="margin-right: 8px; width: 18px; height: 18px; cursor: pointer;">
                        <span style="font-weight: 500;">Available</span>
                    </label>
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="radio" name="availability" value="Not Available"
                            ${scout.availabilityStatus === 'Not Available' ? 'checked' : ''}
                            style="margin-right: 8px; width: 18px; height: 18px; cursor: pointer;">
                        <span style="font-weight: 500;">Not Available</span>
                    </label>
                </div>
            </div>

            <div class="form-group">
                <label>Notes (Optional)</label>
                <textarea id="form-availability-notes" rows="3" placeholder="Any additional notes about availability...">${scout.availabilityNotes || ''}</textarea>
            </div>
        </div>
    `;
}

function saveScoutAvailability(scoutId, trialId) {
    const availabilityRadio = document.querySelector('input[name="availability"]:checked');

    if (!availabilityRadio) {
        showSnackbar('Please select availability status', 'error');
        return;
    }

    const availabilityStatus = availabilityRadio.value;
    const notes = document.getElementById('form-availability-notes').value;

    const scout = scoutData.find(s => s.id === scoutId);
    if (!scout) return;

    // Update scout availability
    scout.availabilityStatus = availabilityStatus;
    scout.availabilityLastChecked = new Date().toISOString().split('T')[0];
    scout.availabilityNotes = notes;

    closeModal();

    // Reset save button
    const saveBtn = document.getElementById('modal-save');
    saveBtn.textContent = 'Save';
    saveBtn.onclick = handleModalSave;

    showSnackbar(`Availability updated: ${scout.fullName} is ${availabilityStatus}`);

    // If we're on the scout assignment page, refresh it
    if (trialId) {
        assignScout(trialId);
    }
}

// ==================== RE-VERIFICATION WORKFLOW ====================
function reverifyScoutAvailability(trialId) {
    const trial = cityData.find(c => c.id === trialId);
    if (!trial) return;

    if (!trial.primaryScoutId) {
        showSnackbar('No scouts assigned to this trial', 'error');
        return;
    }

    document.getElementById('modal-title').textContent = `Re-verify Availability - ${trial.name}, ${trial.state}`;
    document.getElementById('modal-content').innerHTML = getReverificationForm(trial);

    const saveBtn = document.getElementById('modal-save');
    saveBtn.textContent = 'Save Re-verification';
    saveBtn.onclick = () => saveReverification(trialId);

    document.getElementById('modal-overlay').classList.add('active');
}

function getReverificationForm(trial) {
    const primaryScout = scoutData.find(s => s.id === trial.primaryScoutId);

    const daysUntilTrial = Math.ceil((new Date(trial.trialDate) - new Date()) / (1000 * 60 * 60 * 24));
    const urgencyClass = daysUntilTrial <= 3 ? 'badge-error' : daysUntilTrial <= 7 ? 'badge-warning' : 'badge-info';

    return `
        <div class="form-section">
            <div class="form-section-title">Trial Information</div>
            <div class="form-row">
                <div class="form-group">
                    <label>Trial City</label>
                    <p><strong>${trial.name}, ${trial.state}</strong></p>
                </div>
                <div class="form-group">
                    <label>Date</label>
                    <p>${trial.trialDate}</p>
                </div>
            </div>
            <div class="form-group">
                <label>Days Until Trial</label>
                <p><span class="badge ${urgencyClass}">${daysUntilTrial} days</span></p>
            </div>
            ${trial.availabilityReverified ?
                `<div class="form-group">
                    <p style="font-size: 0.9em; color: #666;">Last re-verified: ${trial.availabilityReverified}</p>
                </div>` : ''
            }
        </div>

        ${primaryScout ? `
        <div class="form-section">
            <div class="form-section-title">Scout Availability Re-verification</div>
            <div class="form-group">
                <label>Scout Name</label>
                <p><strong>${primaryScout.fullName}</strong> - ${primaryScout.mobile}</p>
            </div>
            <div class="form-group">
                <label>Previous Status (checked ${trial.primaryScoutAvailabilityChecked || 'N/A'})</label>
                <p><span class="badge ${
                    trial.primaryScoutAvailabilityStatus === 'Available' ? 'badge-success' : 'badge-info'
                }">${trial.primaryScoutAvailabilityStatus || 'Not Checked'}</span></p>
            </div>
            <div class="form-group">
                <label>Current Availability Status *</label>
                <div style="display: flex; gap: 20px; margin-top: 10px;">
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="radio" name="primary-availability" value="Available"
                            ${trial.primaryScoutAvailabilityStatus === 'Available' ? 'checked' : ''}
                            style="margin-right: 8px; width: 18px; height: 18px; cursor: pointer;">
                        <span style="font-weight: 500;">Available</span>
                    </label>
                    <label style="display: flex; align-items: center; cursor: pointer;">
                        <input type="radio" name="primary-availability" value="Not Available"
                            ${trial.primaryScoutAvailabilityStatus === 'Not Available' ? 'checked' : ''}
                            style="margin-right: 8px; width: 18px; height: 18px; cursor: pointer;">
                        <span style="font-weight: 500;">Not Available</span>
                    </label>
                </div>
            </div>
        </div>
        ` : ''}

        ${trial.backupScoutName ? `
        <div class="form-section">
            <div class="form-section-title">Backup Contact</div>
            <div class="form-group">
                <p style="color: #666; font-size: 0.95em;">
                    <strong>Backup:</strong> ${trial.backupScoutName} - ${trial.backupScoutId}
                </p>
                <p style="color: #888; font-size: 0.9em; font-style: italic;">
                    (Backup contact availability is tracked separately)
                </p>
            </div>
        </div>
        ` : ''}

        <div class="form-section">
            <div class="form-section-title">Notes</div>
            <div class="form-group">
                <label>Re-verification Notes</label>
                <textarea id="form-reverify-notes" rows="3" placeholder="Any changes or updates to note..."></textarea>
            </div>
        </div>
    `;
}

function saveReverification(trialId) {
    const primaryAvailability = document.querySelector('input[name="primary-availability"]:checked');
    const notes = document.getElementById('form-reverify-notes').value;

    const trial = cityData.find(c => c.id === trialId);
    if (!trial) return;

    const primaryScout = scoutData.find(s => s.id === trial.primaryScoutId);

    const today = new Date().toISOString().split('T')[0];

    // Update scout availability
    if (primaryAvailability && primaryScout) {
        const status = primaryAvailability.value;
        primaryScout.availabilityStatus = status;
        primaryScout.availabilityLastChecked = today;
        if (notes) primaryScout.availabilityNotes = notes;

        trial.primaryScoutAvailabilityStatus = status;
        trial.primaryScoutAvailabilityChecked = today;
    }

    // Mark trial as re-verified
    trial.availabilityReverified = today;

    renderCityCards();
    closeModal();

    // Reset save button
    const saveBtn = document.getElementById('modal-save');
    saveBtn.textContent = 'Save';
    saveBtn.onclick = handleModalSave;

    showSnackbar('Scout availability re-verified successfully');

    // Show warning if scout is not available
    if (primaryAvailability && primaryAvailability.value === 'Not Available') {
        setTimeout(() => {
            showSnackbar('Warning: Scout is not available! Consider contacting backup or assigning another scout.', 'error');
        }, 1500);
    }
}

// ==================== PAYMENTS ====================
function renderPaymentTable(filter = 'all', search = '') {
    const tbody = document.getElementById('payments-table-body');
    let data = paymentData;

    if (search) {
        const s = search.toLowerCase();
        data = data.filter(p => p.vendorName.toLowerCase().includes(s) || p.workOrderId.toLowerCase().includes(s));
    }

    const statusClass = (s) => ({ 'Paid': 'badge-success', 'Pending': 'badge-warning', 'Overdue': 'badge-error', 'Not Raised': 'badge-info' }[s] || 'badge-info');

    tbody.innerHTML = data.map(pay => `
        <tr>
            <td>${pay.id}</td>
            <td>${pay.workOrderId}</td>
            <td>
                <div class="cell-main">${pay.vendorName}</div>
                <div class="cell-sub">${pay.vendorId}</div>
            </td>
            <td><strong>₹${pay.amount.toLocaleString()}</strong></td>
            <td>${pay.dueDate || '-'}</td>
            <td><span class="badge ${statusClass(pay.status)}">${pay.status}</span></td>
            <td>
                <div class="table-actions">
                    <button class="icon-btn" onclick="editPayment('${pay.id}')" title="Edit"><span class="material-icons">edit</span></button>
                    ${pay.status !== 'Paid' ? `<button class="icon-btn" onclick="markPaid('${pay.id}')" title="Mark Paid" style="color: var(--success);"><span class="material-icons">check_circle</span></button>` : ''}
                </div>
            </td>
        </tr>
    `).join('');

    // Update summary
    const totalOutstanding = paymentData.filter(p => p.status !== 'Paid').reduce((sum, p) => sum + p.amount, 0);
    const pendingAmount = paymentData.filter(p => p.status === 'Pending').reduce((sum, p) => sum + p.amount, 0);
    const overdueAmount = paymentData.filter(p => p.status === 'Overdue').reduce((sum, p) => sum + p.amount, 0);

    document.getElementById('total-outstanding').textContent = `₹${totalOutstanding.toLocaleString()}`;
    document.getElementById('pending-amount').textContent = `₹${pendingAmount.toLocaleString()}`;
    document.getElementById('overdue-amount').textContent = `₹${overdueAmount.toLocaleString()}`;
}

function editPayment(id) {
    const pay = paymentData.find(p => p.id === id);
    if (!pay) return;
    currentEditItem = pay;
    currentEditType = 'payment';
    openModal('payment', 'edit', pay);
}

function markPaid(id) {
    const pay = paymentData.find(p => p.id === id);
    if (!pay) return;

    pay.status = 'Paid';
    pay.paidDate = new Date().toISOString().split('T')[0];
    renderPaymentTable();
    renderDashboard();
    showSnackbar('Payment marked as Paid');
}

// ==================== MODAL ====================
function openModal(type, mode, data = null) {
    currentEditType = type;
    currentEditItem = data;

    document.getElementById('modal-save').style.display = 'inline-flex';

    const titles = {
        rep: mode === 'add' ? 'Add New REP' : 'Edit REP',
        workorder: mode === 'add' ? 'Create Work Order' : 'Edit Work Order',
        city: mode === 'add' ? 'Add Trial City' : 'Edit Trial City',
        payment: mode === 'add' ? 'Raise Invoice' : 'Edit Payment',
        vendor: mode === 'add' ? 'Add New Vendor' : 'Edit Vendor'
    };

    document.getElementById('modal-title').textContent = titles[type] || 'Modal';
    document.getElementById('modal-content').innerHTML = getFormHTML(type, data);
    if (type === 'scout') {
  setTimeout(initScoutFormUX, 0);
}

    document.getElementById('modal-overlay').classList.add('active');
}

function getFormHTML(type, data) {
    if (type === 'rep') return getRepForm(data);
    if (type === 'workorder') return getWorkOrderForm(data);
    if (type === 'city') return getCityForm(data);
    if (type === 'payment') return getPaymentForm(data);
    if (type === 'vendor') return getVendorForm(data);
    if (type === 'scout') return getScoutForm(data);

    return '';
}

function getRepForm(data) {
    return `
        <div class="form-section">
            <div class="form-section-title">Basic Details</div>
            <div class="form-row">
                <div class="form-group"><label>REP Name *</label><input type="text" id="form-rep-name" value="${data?.name || ''}" required></div>
                <div class="form-group"><label>Season</label><select id="form-rep-season"><option value="">Select</option>${['S1','S2','S3','S4','S5'].map(s => `<option value="${s}" ${data?.season === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Status</label><select id="form-rep-status"><option value="Active" ${data?.status === 'Active' ? 'selected' : ''}>Active</option><option value="Inactive" ${data?.status === 'Inactive' ? 'selected' : ''}>Inactive</option></select></div>
            </div>
        </div>
        <div class="form-section">
            <div class="form-section-title">Location</div>
            <div class="form-row">
                <div class="form-group"><label>Region *</label><select id="form-rep-region" required><option value="">Select</option>${['North','South','East','West','NE'].map(r => `<option value="${r}" ${data?.region === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
                <div class="form-group"><label>State *</label><input type="text" id="form-rep-state" value="${data?.state || ''}" required></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>City *</label><input type="text" id="form-rep-city" value="${data?.city || ''}" required></div>
                <div class="form-group"><label>Pin Code</label><input type="text" id="form-rep-pincode" value="${data?.pinCode || ''}"></div>
            </div>
            <div class="form-group"><label>Address</label><textarea id="form-rep-address">${data?.postalAddress || ''}</textarea></div>
        </div>
        <div class="form-section">
            <div class="form-section-title">Contact</div>
            <div class="form-row">
                <div class="form-group"><label>Contact Name *</label><input type="text" id="form-rep-contact" value="${data?.contactName || ''}" required></div>
                <div class="form-group"><label>Phone *</label><input type="tel" id="form-rep-phone" value="${data?.phone || ''}" required></div>
            </div>
            <div class="form-group"><label>Email *</label><input type="email" id="form-rep-email" value="${data?.email || ''}" required></div>
        </div>
        <div class="form-section">
            <div class="form-section-title">Legal</div>
            <div class="form-row">
                <div class="form-group"><label>GST No. *</label><input type="text" id="form-rep-gst" value="${data?.gst || ''}" required placeholder="27AABCU9603R1ZM"></div>
                <div class="form-group"><label>PAN No. *</label><input type="text" id="form-rep-pan" value="${data?.pan || ''}" required placeholder="AABCU9603R"></div>
            </div>
            <div class="form-group"><label>MoU Status</label><select id="form-rep-mou"><option value="">Select</option>${['Pending','Signed','Expired'].map(m => `<option value="${m}" ${data?.mouStatus === m ? 'selected' : ''}>${m}</option>`).join('')}</select></div>
        </div>
    `;
}

function getWorkOrderForm(data) {
    return `
        <div class="form-section">
            <div class="form-section-title">Vendor Details</div>
            <div class="form-row">
                <div class="form-group"><label>Vendor ID *</label><input type="text" id="form-wo-vendorid" value="${data?.vendorId || ''}" required></div>
                <div class="form-group"><label>Vendor Name *</label><input type="text" id="form-wo-vendorname" value="${data?.vendorName || ''}" required></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label>Vendor GST</label><input type="text" id="form-wo-vendorgst" value="${data?.vendorGst || ''}" placeholder="27AABCU9603R1ZX"></div>
                <div class="form-group"><label>Vendor PAN</label><input type="text" id="form-wo-vendorpan" value="${data?.vendorPan || ''}" placeholder="AABCU9603R"></div>
            </div>
        </div>
        <div class="form-section">
            <div class="form-section-title">Work Order Details</div>
            <div class="form-row">
                <div class="form-group"><label>Type *</label><select id="form-wo-type" required><option value="">Select</option><option value="One Time" ${data?.type === 'One Time' ? 'selected' : ''}>One Time</option><option value="Case-to-case" ${data?.type === 'Case-to-case' ? 'selected' : ''}>Case-to-case</option></select></div>
                <div class="form-group"><label>Status</label><select id="form-wo-status"><option value="Created" ${data?.status === 'Created' ? 'selected' : ''}>Created</option><option value="Approved" ${data?.status === 'Approved' ? 'selected' : ''}>Approved</option><option value="Closed" ${data?.status === 'Closed' ? 'selected' : ''}>Closed</option></select></div>
            </div>
            <div class="form-group"><label>Activity *</label><input type="text" id="form-wo-activity" value="${data?.activity || ''}" required></div>
            <div class="form-group"><label>Amount (₹) *</label><input type="number" id="form-wo-amount" value="${data?.amount || ''}" required></div>
        </div>
    `;
}

function getCityForm(data) {
    return `
        <div class="form-section">
            <div class="form-section-title">Trial Information</div>
            <div class="form-group"><label>Trial City *</label><input type="text" id="form-city-trialcity" value="${data?.trialCity || ''}" required placeholder="e.g., South Bangalore"></div>
            <div class="form-group"><label>Trial Type *</label><select id="form-city-trialtype" required><option value="">Select</option>${['Exclusive IKF Season Trial','CSR Project Trial','Zonals','Nationals'].map(t => `<option value="${t}" ${data?.trialType === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
            <div class="form-group"><label>Trial Date *</label><input type="date" id="form-city-trialdate" value="${data?.trialDate || ''}" required></div>
        </div>
        <div class="form-section">
            <div class="form-section-title">Location</div>
            <div class="form-row">
                <div class="form-group"><label>City Name *</label><input type="text" id="form-city-name" value="${data?.name || ''}" required></div>
                <div class="form-group"><label>State *</label><input type="text" id="form-city-state" value="${data?.state || ''}" required></div>
            </div>
            <div class="form-group"><label>Region *</label><select id="form-city-region" required><option value="">Select</option>${['North','South','East','West'].map(r => `<option value="${r}" ${data?.region === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
        </div>
        <div class="form-section">
            <div class="form-section-title">REP & Ground</div>
            <div class="form-group"><label>Assigned REP *</label><select id="form-city-rep" required><option value="">Select</option>${repData.filter(r => r.status === 'Active').map(r => `<option value="${r.name}" ${data?.rep === r.name ? 'selected' : ''}>${r.name}</option>`).join('')}</select></div>
            <div class="form-group"><label>Ground Location *</label><input type="text" id="form-city-ground" value="${data?.groundLocation || ''}" required></div>
            <div class="form-group"><label><input type="checkbox" id="form-city-verified" ${data?.verified ? 'checked' : ''}> Ground Verified</label></div>
        </div>
    `;
}

function getPaymentForm(data) {
    return `
        <div class="form-section">
            <div class="form-section-title">Work Order</div>
            <div class="form-group"><label>Work Order *</label><select id="form-pay-workorder" required><option value="">Select</option>${workOrderData.map(wo => `<option value="${wo.id}" ${data?.workOrderId === wo.id ? 'selected' : ''}>${wo.id} - ${wo.vendorName}</option>`).join('')}</select></div>
        </div>
        <div class="form-section">
            <div class="form-section-title">Payment Details</div>
            <div class="form-row">
                <div class="form-group"><label>Frequency *</label><select id="form-pay-frequency" required><option value="">Select</option>${['One Time','Weekly','Monthly','Yearly','Cyclic'].map(f => `<option value="${f}" ${data?.frequency === f ? 'selected' : ''}>${f}</option>`).join('')}</select></div>
                <div class="form-group"><label>Status</label><select id="form-pay-status">${['Not Raised','Pending','Paid','Overdue'].map(s => `<option value="${s}" ${data?.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
            </div>
            <div class="form-group"><label>Amount (₹) *</label><input type="number" id="form-pay-amount" value="${data?.amount || ''}" required></div>
            <div class="form-group"><label>Due Date</label><input type="date" id="form-pay-duedate" value="${data?.dueDate || ''}"></div>
        </div>
    `;
}

function handleModalSave() {
    if (currentEditType === 'rep') saveRep();
    else if (currentEditType === 'workorder') saveWorkOrder();
    else if (currentEditType === 'city') saveCity();
    else if (currentEditType === 'payment') savePayment();
    else if (currentEditType === 'vendor') saveVendor();
    else if (currentEditType === 'scout') saveScout();

}

function saveRep() {
    const name = document.getElementById('form-rep-name').value;
    const season = document.getElementById('form-rep-season').value;
    const status = document.getElementById('form-rep-status').value;
    const region = document.getElementById('form-rep-region').value;
    const state = document.getElementById('form-rep-state').value;
    const city = document.getElementById('form-rep-city').value;
    const pinCode = document.getElementById('form-rep-pincode').value;
    const postalAddress = document.getElementById('form-rep-address').value;
    const contactName = document.getElementById('form-rep-contact').value;
    const phone = document.getElementById('form-rep-phone').value;
    const email = document.getElementById('form-rep-email').value;
    const gst = document.getElementById('form-rep-gst').value;
    const pan = document.getElementById('form-rep-pan').value;
    const mouStatus = document.getElementById('form-rep-mou').value;

    if (!name || !region || !state || !city || !contactName || !phone || !email || !gst || !pan) {
        showSnackbar('Please fill all required fields', 'error');
        return;
    }

    if (currentEditItem) {
        Object.assign(currentEditItem, { name, season, status, region, state, city, pinCode, postalAddress, contactName, phone, email, gst, pan, mouStatus });
        showSnackbar('REP updated successfully');
    } else {
        const newId = `REP-${String(repData.length + 1).padStart(3, '0')}`;
        repData.push({ id: newId, name, season, status, region, state, city, pinCode, postalAddress, contactName, phone, email, gst, pan, mouStatus });
        showSnackbar('REP added successfully');
    }

    renderRepTable();
    renderDashboard();
    closeModal();
}

function saveWorkOrder() {
    const vendorId = document.getElementById('form-wo-vendorid').value;
    const vendorName = document.getElementById('form-wo-vendorname').value;
    const vendorGst = document.getElementById('form-wo-vendorgst').value;
    const vendorPan = document.getElementById('form-wo-vendorpan').value;
    const type = document.getElementById('form-wo-type').value;
    const status = document.getElementById('form-wo-status').value;
    const activity = document.getElementById('form-wo-activity').value;
    const amount = parseInt(document.getElementById('form-wo-amount').value);

    if (!vendorId || !vendorName || !type || !activity || !amount) {
        showSnackbar('Please fill all required fields', 'error');
        return;
    }

    if (currentEditItem) {
        Object.assign(currentEditItem, { vendorId, vendorName, vendorGst, vendorPan, type, status, activity, amount });
        showSnackbar('Work Order updated successfully');
    } else {
        const newId = `WO-2024-${String(workOrderData.length + 1).padStart(3, '0')}`;
        workOrderData.push({ id: newId, vendorId, vendorName, vendorGst, vendorPan, type, status, activity, amount, createdDate: new Date().toISOString().split('T')[0], accountAdded: false });
        showSnackbar('Work Order created successfully');
    }

    renderWorkOrderTable();
    renderDashboard();
    closeModal();
}

function saveCity() {
    const trialCity = document.getElementById('form-city-trialcity').value;
    const name = document.getElementById('form-city-name').value;
    const state = document.getElementById('form-city-state').value;
    const region = document.getElementById('form-city-region').value;
    const rep = document.getElementById('form-city-rep').value;
    const groundLocation = document.getElementById('form-city-ground').value;
    const verified = document.getElementById('form-city-verified').checked;
    const trialType = document.getElementById('form-city-trialtype').value;
    const trialDate = document.getElementById('form-city-trialdate').value;

    if (!trialCity || !name || !state || !region || !rep || !groundLocation || !trialType || !trialDate) {
        showSnackbar('Please fill all required fields', 'error');
        return;
    }

    const month = new Date(trialDate).toLocaleString('en', { month: 'long' });

    if (currentEditItem) {
        Object.assign(currentEditItem, { trialCity, name, state, region, rep, groundLocation, verified, trialType, trialDate, month });
        showSnackbar('City updated successfully');
    } else {
        const stateCode = state.substring(0, 2).toUpperCase();
        const cityCode = name.substring(0, 3).toUpperCase();
        cityData.push({
            id: `IKF-IN-${stateCode}-${cityCode}`,
            trialCity,
            name,
            state,
            country: 'India',
            region,
            rep,
            groundLocation,
            verified,
            trialType,
            trialDate,
            month,
            scoutAssignmentStatus: 'Not Assigned',
            primaryScoutId: null,
            primaryScoutName: null,
            backupScoutId: null,
            backupScoutName: null,
            primaryScoutReached: null,
            backupScoutCalled: null
        });
        showSnackbar('City added successfully');
    }

    renderCityCards();
    renderDashboard();
    closeModal();
}

function savePayment() {
    const workOrderId = document.getElementById('form-pay-workorder').value;
    const frequency = document.getElementById('form-pay-frequency').value;
    const status = document.getElementById('form-pay-status').value;
    const amount = parseInt(document.getElementById('form-pay-amount').value);
    const dueDate = document.getElementById('form-pay-duedate').value || null;

    if (!workOrderId || !frequency || !amount) {
        showSnackbar('Please fill all required fields', 'error');
        return;
    }

    const wo = workOrderData.find(w => w.id === workOrderId);

    if (currentEditItem) {
        Object.assign(currentEditItem, { workOrderId, vendorId: wo?.vendorId, vendorName: wo?.vendorName, frequency, status, amount, dueDate });
        showSnackbar('Payment updated successfully');
    } else {
        const newId = `PAY-${String(paymentData.length + 1).padStart(3, '0')}`;
        paymentData.push({ id: newId, workOrderId, vendorId: wo?.vendorId, vendorName: wo?.vendorName, frequency, status, amount, dueDate, paidDate: null });
        showSnackbar('Invoice raised successfully');
    }

    renderPaymentTable();
    renderDashboard();
    closeModal();
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
    currentEditItem = null;
    currentEditType = null;

    // Reset modal save button
    const saveBtn = document.getElementById('modal-save');
    saveBtn.textContent = 'Save';
    saveBtn.style.display = '';
    saveBtn.onclick = handleModalSave;
}

function closeDeleteModal() {
    document.getElementById('delete-modal-overlay').classList.remove('active');
    deleteCallback = null;
}

function confirmDelete() {
    if (deleteCallback) deleteCallback();
    closeDeleteModal();
}

// ==================== VENDOR MANAGEMENT ====================
function renderVendorCards(filter = 'all', search = '') {
    const container = document.getElementById('vendor-cards');
    if (!container) return;

    let data = vendorData;

    // Filter by status
    if (filter !== 'all') {
        data = data.filter(v => v.docStatus.toLowerCase() === filter);
    }

    // Search
    if (search) {
        const s = search.toLowerCase();
        data = data.filter(v =>
            v.name.toLowerCase().includes(s) ||
            v.gst.toLowerCase().includes(s) ||
            v.pan.toLowerCase().includes(s) ||
            v.type.toLowerCase().includes(s)
        );
    }

    // Update stats
    updateVendorStats();

    const statusClass = (s) => ({
        'Verified': 'badge-success',
        'Pending': 'badge-warning',
        'Rejected': 'badge-error'
    }[s] || 'badge-info');

    container.innerHTML = data.map(vendor => `
        <div class="vendor-doc-card">
            <div class="vendor-card-header">
                <div class="vendor-card-title">
                    <h4>${vendor.name}</h4>
                    <span class="vendor-type-badge">${vendor.type}</span>
                </div>
                <span class="badge ${statusClass(vendor.docStatus)}">${vendor.docStatus}</span>
            </div>
            <div class="vendor-card-body">
                <div class="vendor-doc-section">
                    <h5>Document Verification</h5>
                    <div class="doc-status-grid">
                        <div class="doc-item ${vendor.gstVerified ? 'verified' : 'pending'}">
                            <span class="material-icons">${vendor.gstVerified ? 'check_circle' : 'pending'}</span>
                            <div>
                                <span class="doc-label">GST</span>
                                <span class="doc-value">${vendor.gst}</span>
                            </div>
                        </div>
                        <div class="doc-item ${vendor.panVerified ? 'verified' : 'pending'}">
                            <span class="material-icons">${vendor.panVerified ? 'check_circle' : 'pending'}</span>
                            <div>
                                <span class="doc-label">PAN</span>
                                <span class="doc-value">${vendor.pan}</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="vendor-info-grid">
                    <div class="vendor-info-item">
                        <span class="material-icons">person</span>
                        <span>${vendor.contact}</span>
                    </div>
                    <div class="vendor-info-item">
                        <span class="material-icons">phone</span>
                        <span>${vendor.phone}</span>
                    </div>
                    <div class="vendor-info-item">
                        <span class="material-icons">email</span>
                        <span>${vendor.email}</span>
                    </div>
                    <div class="vendor-info-item">
                        <span class="material-icons">account_balance</span>
                        <span>${vendor.bankName}</span>
                    </div>
                </div>
            </div>
            <div class="vendor-card-actions">
                <button class="btn-secondary" onclick="viewVendor('${vendor.id}')">
                    <span class="material-icons">visibility</span>
                    View Details
                </button>
                <button class="btn-secondary" onclick="editVendor('${vendor.id}')">
                    <span class="material-icons">edit</span>
                    Edit
                </button>
                ${vendor.docStatus === 'Pending' ? `
                    <button class="btn-primary" onclick="verifyVendor('${vendor.id}')">
                        <span class="material-icons">verified</span>
                        Verify
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');

    // Add "Add Vendor" card at the end
    container.innerHTML += `
        <div class="vendor-doc-card add-vendor-card" onclick="openModal('vendor', 'add')">
            <div class="add-vendor-content">
                <span class="material-icons">add_business</span>
                <h4>Add New Vendor</h4>
                <p>Register a new vendor with documents</p>
            </div>
        </div>
    `;
}

function updateVendorStats() {
    const total = vendorData.length;
    const verified = vendorData.filter(v => v.docStatus === 'Verified').length;
    const pending = vendorData.filter(v => v.docStatus === 'Pending').length;
    const rejected = vendorData.filter(v => v.docStatus === 'Rejected').length;

    const totalEl = document.getElementById('total-vendors');
    const verifiedEl = document.getElementById('verified-vendors');
    const pendingEl = document.getElementById('pending-vendors');
    const rejectedEl = document.getElementById('rejected-vendors');

    if (totalEl) totalEl.textContent = total;
    if (verifiedEl) verifiedEl.textContent = verified;
    if (pendingEl) pendingEl.textContent = pending;
    if (rejectedEl) rejectedEl.textContent = rejected;
}

function viewVendor(id) {
    const vendor = vendorData.find(v => v.id === id);
    if (!vendor) return;

    document.getElementById('modal-title').textContent = 'Vendor Details';
    document.getElementById('modal-content').innerHTML = `
        <div class="form-section">
            <div class="form-section-title">Basic Information</div>
            <div class="form-row"><div class="form-group"><label>Vendor ID</label><p>${vendor.id}</p></div><div class="form-group"><label>Vendor Name</label><p>${vendor.name}</p></div></div>
            <div class="form-row"><div class="form-group"><label>Type</label><p>${vendor.type}</p></div><div class="form-group"><label>Status</label><p><span class="badge ${vendor.docStatus === 'Verified' ? 'badge-success' : vendor.docStatus === 'Pending' ? 'badge-warning' : 'badge-error'}">${vendor.docStatus}</span></p></div></div>
        </div>
        <div class="form-section">
            <div class="form-section-title">Documents</div>
            <div class="form-row">
                <div class="form-group">
                    <label>GST Number</label>
                    <p>${vendor.gst} <span class="badge ${vendor.gstVerified ? 'badge-success' : 'badge-warning'}">${vendor.gstVerified ? 'Verified' : 'Pending'}</span></p>
                </div>
                <div class="form-group">
                    <label>PAN Number</label>
                    <p>${vendor.pan} <span class="badge ${vendor.panVerified ? 'badge-success' : 'badge-warning'}">${vendor.panVerified ? 'Verified' : 'Pending'}</span></p>
                </div>
            </div>
        </div>
        <div class="form-section">
            <div class="form-section-title">Contact Details</div>
            <div class="form-row"><div class="form-group"><label>Contact Person</label><p>${vendor.contact}</p></div><div class="form-group"><label>Phone</label><p>${vendor.phone}</p></div></div>
            <div class="form-group"><label>Email</label><p>${vendor.email}</p></div>
            <div class="form-group"><label>Address</label><p>${vendor.address}</p></div>
        </div>
        <div class="form-section">
            <div class="form-section-title">Bank Details</div>
            <div class="form-row"><div class="form-group"><label>Bank Name</label><p>${vendor.bankName}</p></div><div class="form-group"><label>Account No.</label><p>${vendor.accountNo}</p></div></div>
            <div class="form-group"><label>IFSC Code</label><p>${vendor.ifsc}</p></div>
        </div>
    `;
    document.getElementById('modal-save').style.display = 'none';
    document.getElementById('modal-overlay').classList.add('active');
}

function editVendor(id) {
    const vendor = vendorData.find(v => v.id === id);
    if (!vendor) return;
    currentEditItem = vendor;
    currentEditType = 'vendor';
    openModal('vendor', 'edit', vendor);
}

function deleteVendor(id) {
    const vendor = vendorData.find(v => v.id === id);
    if (!vendor) return;

    document.getElementById('delete-message').textContent = `Are you sure you want to delete vendor "${vendor.name}"?`;
    deleteCallback = () => {
        vendorData = vendorData.filter(v => v.id !== id);
        renderVendorCards();
        showSnackbar('Vendor deleted successfully');
    };
    document.getElementById('delete-modal-overlay').classList.add('active');
}

function verifyVendor(id) {
    const vendor = vendorData.find(v => v.id === id);
    if (!vendor) return;

    vendor.gstVerified = true;
    vendor.panVerified = true;
    vendor.docStatus = 'Verified';
    renderVendorCards();
    showSnackbar(`Vendor "${vendor.name}" verified successfully`);
}

function getVendorForm(data) {
    return `
        <div class="form-section">
            <div class="form-section-title">Basic Information</div>
            <div class="form-row">
                <div class="form-group"><label>Vendor Name *</label><input type="text" id="form-vendor-name" value="${data?.name || ''}" required></div>
                <div class="form-group"><label>Vendor Type *</label><select id="form-vendor-type" required><option value="">Select</option>${vendorTypes.map(t => `<option value="${t}" ${data?.type === t ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
            </div>
        </div>
        <div class="form-section">
            <div class="form-section-title">Documents</div>
            <div class="form-row">
                <div class="form-group"><label>GST Number *</label><input type="text" id="form-vendor-gst" value="${data?.gst || ''}" required placeholder="27AABCU9603R1ZX"></div>
                <div class="form-group"><label>PAN Number *</label><input type="text" id="form-vendor-pan" value="${data?.pan || ''}" required placeholder="AABCU9603R"></div>
            </div>
            <div class="form-row">
                <div class="form-group"><label><input type="checkbox" id="form-vendor-gst-verified" ${data?.gstVerified ? 'checked' : ''}> GST Verified</label></div>
                <div class="form-group"><label><input type="checkbox" id="form-vendor-pan-verified" ${data?.panVerified ? 'checked' : ''}> PAN Verified</label></div>
            </div>
        </div>
        <div class="form-section">
            <div class="form-section-title">Contact Details</div>
            <div class="form-row">
                <div class="form-group"><label>Contact Person *</label><input type="text" id="form-vendor-contact" value="${data?.contact || ''}" required></div>
                <div class="form-group"><label>Phone *</label><input type="tel" id="form-vendor-phone" value="${data?.phone || ''}" required></div>
            </div>
            <div class="form-group"><label>Email *</label><input type="email" id="form-vendor-email" value="${data?.email || ''}" required></div>
            <div class="form-group"><label>Address</label><textarea id="form-vendor-address">${data?.address || ''}</textarea></div>
        </div>
        <div class="form-section">
            <div class="form-section-title">Bank Details</div>
            <div class="form-row">
                <div class="form-group"><label>Bank Name</label><input type="text" id="form-vendor-bank" value="${data?.bankName || ''}"></div>
                <div class="form-group"><label>Account Number</label><input type="text" id="form-vendor-account" value="${data?.accountNo || ''}"></div>
            </div>
            <div class="form-group"><label>IFSC Code</label><input type="text" id="form-vendor-ifsc" value="${data?.ifsc || ''}"></div>
        </div>
    `;
}

function saveVendor() {
    const name = document.getElementById('form-vendor-name').value;
    const type = document.getElementById('form-vendor-type').value;
    const gst = document.getElementById('form-vendor-gst').value;
    const pan = document.getElementById('form-vendor-pan').value;
    const gstVerified = document.getElementById('form-vendor-gst-verified').checked;
    const panVerified = document.getElementById('form-vendor-pan-verified').checked;
    const contact = document.getElementById('form-vendor-contact').value;
    const phone = document.getElementById('form-vendor-phone').value;
    const email = document.getElementById('form-vendor-email').value;
    const address = document.getElementById('form-vendor-address').value;
    const bankName = document.getElementById('form-vendor-bank').value;
    const accountNo = document.getElementById('form-vendor-account').value;
    const ifsc = document.getElementById('form-vendor-ifsc').value;

    if (!name || !type || !gst || !pan || !contact || !phone || !email) {
        showSnackbar('Please fill all required fields', 'error');
        return;
    }

    const docStatus = (gstVerified && panVerified) ? 'Verified' : 'Pending';

    if (currentEditItem) {
        Object.assign(currentEditItem, { name, type, gst, pan, gstVerified, panVerified, docStatus, contact, phone, email, address, bankName, accountNo, ifsc });
        showSnackbar('Vendor updated successfully');
    } else {
        const newId = `VEND-${String(vendorData.length + 1).padStart(3, '0')}`;
        vendorData.push({
            id: newId, name, type, gst, pan, gstVerified, panVerified, docStatus, address, contact, phone, email, bankName, accountNo, ifsc,
            registeredDate: new Date().toISOString().split('T')[0]
        });
        showSnackbar('Vendor added successfully');
    }

    renderVendorCards();
    
    closeModal();
}

// ==================== FILTER ====================
function filterData(type, searchValue) {
    const activeFilter = document.querySelector(`#${type}-page .filter-pills .pill.active`)?.dataset.filter || 'all';

    if (type === 'rep') renderRepTable(activeFilter, searchValue);
    else if (type === 'workorder') renderWorkOrderTable(activeFilter, searchValue);
    else if (type === 'city') renderCityCards(activeFilter, searchValue);
    else if (type === 'payment') renderPaymentTable(activeFilter, searchValue);
    else if (type === 'vendor') renderVendorCards(activeFilter, searchValue);
    else if (type === 'scout') renderScoutTable(activeFilter, searchValue);
}

function handleFilterPill(e) {
    const pill = e.currentTarget;
    const container = pill.closest('.filter-pills');
    const page = pill.closest('.content-page');

    container.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');

    const filter = pill.dataset.filter;
    const pageId = page.id;

    if (pageId === 'rep-page') {
        const search = document.getElementById('rep-search').value;
        renderRepTable(filter, search);
    } else if (pageId === 'workorders-page') {
        const search = document.getElementById('workorder-search').value;
        renderWorkOrderTable(filter, search);
    } else if (pageId === 'city-page') {
        const search = document.getElementById('city-search').value;
        renderCityCards(filter, search);
    } else if (pageId === 'vendors-page') {
        const search = document.getElementById('vendor-search').value;
        renderVendorCards(filter, search);
    }
    else if (pageId === 'scouts-page') {
  const search = document.getElementById('scout-search')?.value || '';
  renderScoutTable(filter, search);
}

}

// ==================== SNACKBAR ====================
function showSnackbar(message, type = 'success') {
    const snackbar = document.getElementById('snackbar');
    const icon = document.getElementById('snackbar-icon');
    const text = document.getElementById('snackbar-text');

    text.textContent = message;
    icon.textContent = type === 'error' ? 'error' : 'check_circle';

    snackbar.classList.add('active');
    setTimeout(hideSnackbar, 4000);
}

function hideSnackbar() {
    document.getElementById('snackbar').classList.remove('active');
}

// ==================== SIDEBAR TOGGLE ====================
function initSidebarToggle() {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.querySelector('.main-content');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            mainContent.classList.toggle('expanded');
        });
    }
}

// ==================== GLOBAL SEARCH ====================
let globalSearchOpen = false;

function initGlobalSearch() {
    const searchBtn = document.querySelector('.header-right .icon-btn');
    if (searchBtn && searchBtn.querySelector('.material-icons')?.textContent === 'search') {
        searchBtn.addEventListener('click', openGlobalSearch);
    }
}

function openGlobalSearch() {
    if (globalSearchOpen) return;
    globalSearchOpen = true;

    const overlay = document.createElement('div');
    overlay.className = 'search-overlay active';
    overlay.id = 'global-search-overlay';
    overlay.innerHTML = `
        <div class="search-modal">
            <div class="search-input-wrapper">
                <span class="material-icons">search</span>
                <input type="text" id="global-search-input" placeholder="Search REPs, Work Orders, Cities, Payments..." autofocus>
                <button class="icon-btn" onclick="closeGlobalSearch()">
                    <span class="material-icons">close</span>
                </button>
            </div>
            <div class="search-results" id="global-search-results">
                <div class="search-hint">
                    <span class="material-icons">lightbulb</span>
                    <span>Start typing to search across all data</span>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    const input = document.getElementById('global-search-input');
    input.addEventListener('input', (e) => performGlobalSearch(e.target.value));
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeGlobalSearch();
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeGlobalSearch();
    });
}

function closeGlobalSearch() {
    const overlay = document.getElementById('global-search-overlay');
    if (overlay) {
        overlay.remove();
        globalSearchOpen = false;
    }
}

function performGlobalSearch(query) {
    const resultsContainer = document.getElementById('global-search-results');
    if (!query.trim()) {
        resultsContainer.innerHTML = `
            <div class="search-hint">
                <span class="material-icons">lightbulb</span>
                <span>Start typing to search across all data</span>
            </div>
        `;
        return;
    }

    const q = query.toLowerCase();
    const results = [];

    // Search REPs
    repData.forEach(rep => {
        if (rep.name.toLowerCase().includes(q) || rep.city.toLowerCase().includes(q) || rep.contactName.toLowerCase().includes(q)) {
            results.push({ type: 'REP', icon: 'groups', title: rep.name, subtitle: `${rep.city}, ${rep.state}`, action: () => { closeGlobalSearch(); handleNavigation('rep'); } });
        }
    });

    // Search Work Orders
    workOrderData.forEach(wo => {
        if (wo.vendorName.toLowerCase().includes(q) || wo.activity.toLowerCase().includes(q) || wo.id.toLowerCase().includes(q)) {
            results.push({ type: 'Work Order', icon: 'assignment', title: wo.id, subtitle: `${wo.vendorName} - ${wo.activity}`, action: () => { closeGlobalSearch(); handleNavigation('workorders'); } });
        }
    });

    // Search Cities
    cityData.forEach(city => {
        if (city.name.toLowerCase().includes(q) || city.state.toLowerCase().includes(q) || city.rep.toLowerCase().includes(q)) {
            results.push({ type: 'City', icon: 'location_city', title: city.name, subtitle: `${city.state} - ${city.rep}`, action: () => { closeGlobalSearch(); handleNavigation('city'); } });
        }
    });

    // Search Payments
    paymentData.forEach(pay => {
        if (pay.vendorName.toLowerCase().includes(q) || pay.id.toLowerCase().includes(q) || pay.workOrderId.toLowerCase().includes(q)) {
            results.push({ type: 'Payment', icon: 'payments', title: pay.id, subtitle: `${pay.vendorName} - ₹${pay.amount.toLocaleString()}`, action: () => { closeGlobalSearch(); handleNavigation('payments'); } });
        }
    });

    if (results.length === 0) {
        resultsContainer.innerHTML = `
            <div class="search-hint">
                <span class="material-icons">search_off</span>
                <span>No results found for "${query}"</span>
            </div>
        `;
        return;
    }

    resultsContainer.innerHTML = results.slice(0, 10).map((r, idx) => `
        <div class="search-result-item" onclick="globalSearchResults[${idx}].action()">
            <span class="material-icons">${r.icon}</span>
            <div class="search-result-content">
                <div class="search-result-title">${r.title}</div>
                <div class="search-result-subtitle">${r.subtitle}</div>
            </div>
            <span class="search-result-type">${r.type}</span>
        </div>
    `).join('');

    // Store results for click handlers
    window.globalSearchResults = results;
}

// ==================== NOTIFICATIONS ====================
let notificationsOpen = false;
let notifications = [
    { id: 1, icon: 'warning', title: 'Payment Overdue', message: 'Payment PAY-004 to Event Management Pro is overdue', time: '1 hour ago', read: false },
    { id: 2, icon: 'person_add', title: 'New REP Added', message: 'Chennai Football Academy has been added to the system', time: '2 hours ago', read: false },
    { id: 3, icon: 'event', title: 'Upcoming Trial', message: 'Mumbai trial scheduled for March 15, 2024', time: '5 hours ago', read: false }
];

function initNotifications() {
    const notifBtn = document.querySelector('.notification-btn');
    if (notifBtn) {
        notifBtn.addEventListener('click', toggleNotifications);
    }
    updateNotificationBadge();
}

function toggleNotifications() {
    if (notificationsOpen) {
        closeNotifications();
        return;
    }

    notificationsOpen = true;

    const notifBtn = document.querySelector('.notification-btn');
    const rect = notifBtn.getBoundingClientRect();

    const panel = document.createElement('div');
    panel.className = 'notifications-panel';
    panel.id = 'notifications-panel';
    panel.style.top = `${rect.bottom + 8}px`;
    panel.style.right = `${window.innerWidth - rect.right}px`;

    panel.innerHTML = `
        <div class="notif-header">
            <h4>Notifications</h4>
            <button class="btn-text-small" onclick="markAllRead()">Mark all read</button>
        </div>
        <div class="notif-list">
            ${notifications.length === 0 ? `
                <div class="notif-empty">
                    <span class="material-icons">notifications_none</span>
                    <p>No new notifications</p>
                </div>
            ` : notifications.map(n => `
                <div class="notif-item ${n.read ? 'read' : ''}" onclick="handleNotificationClick(${n.id})">
                    <span class="material-icons notif-icon">${n.icon}</span>
                    <div class="notif-content">
                        <div class="notif-title">${n.title}</div>
                        <div class="notif-message">${n.message}</div>
                        <div class="notif-time">${n.time}</div>
                    </div>
                    ${!n.read ? '<span class="notif-dot"></span>' : ''}
                </div>
            `).join('')}
        </div>
    `;

    document.body.appendChild(panel);

    // Close on outside click
    setTimeout(() => {
        document.addEventListener('click', closeNotificationsOnOutsideClick);
    }, 10);
}

function closeNotificationsOnOutsideClick(e) {
    const panel = document.getElementById('notifications-panel');
    const notifBtn = document.querySelector('.notification-btn');
    if (panel && !panel.contains(e.target) && !notifBtn.contains(e.target)) {
        closeNotifications();
    }
}

function closeNotifications() {
    const panel = document.getElementById('notifications-panel');
    if (panel) {
        panel.remove();
        notificationsOpen = false;
        document.removeEventListener('click', closeNotificationsOnOutsideClick);
    }
}

function handleNotificationClick(id) {
    const notif = notifications.find(n => n.id === id);
    if (notif) {
        notif.read = true;
        updateNotificationBadge();
        closeNotifications();

        // Navigate based on notification type
        if (notif.title.includes('Payment')) handleNavigation('payments');
        else if (notif.title.includes('REP')) handleNavigation('rep');
        else if (notif.title.includes('Trial')) handleNavigation('city');
    }
}

function markAllRead() {
    notifications.forEach(n => n.read = true);
    updateNotificationBadge();
    closeNotifications();
    showSnackbar('All notifications marked as read');
}

function updateNotificationBadge() {
    const badge = document.querySelector('.notification-badge');
    const unreadCount = notifications.filter(n => !n.read).length;
    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? 'flex' : 'none';
    }
}

// ==================== USER PROFILE DROPDOWN ====================
let profileDropdownOpen = false;

function initUserProfile() {
    const userProfile = document.getElementById('user-profile');
    if (userProfile) {
        userProfile.addEventListener('click', toggleProfileDropdown);
    }
}

function toggleProfileDropdown(e) {
    e.stopPropagation();

    if (profileDropdownOpen) {
        closeProfileDropdown();
        return;
    }

    profileDropdownOpen = true;

    const userProfile = document.getElementById('user-profile');
    const rect = userProfile.getBoundingClientRect();

    const dropdown = document.createElement('div');
    dropdown.className = 'profile-dropdown';
    dropdown.id = 'profile-dropdown';
    dropdown.style.top = `${rect.bottom + 8}px`;
    dropdown.style.right = `${window.innerWidth - rect.right}px`;

    dropdown.innerHTML = `
        <div class="profile-dropdown-header">
            <div class="profile-avatar-large">
                <span class="material-icons">person</span>
            </div>
            <div class="profile-dropdown-info">
                <div class="profile-dropdown-name">${currentUser?.email?.split('@')[0] || 'User'}</div>
                <div class="profile-dropdown-email">${currentUser?.email || ''}</div>
            </div>
        </div>
        <div class="profile-dropdown-divider"></div>
        <button class="profile-dropdown-item" onclick="openProfileSettings()">
            <span class="material-icons">settings</span>
            <span>Settings</span>
        </button>
        <button class="profile-dropdown-item" onclick="openHelp()">
            <span class="material-icons">help_outline</span>
            <span>Help & Support</span>
        </button>
        <div class="profile-dropdown-divider"></div>
        <button class="profile-dropdown-item danger" onclick="handleLogout()">
            <span class="material-icons">logout</span>
            <span>Sign Out</span>
        </button>
    `;

    document.body.appendChild(dropdown);

    setTimeout(() => {
        document.addEventListener('click', closeProfileOnOutsideClick);
    }, 10);
}

function closeProfileOnOutsideClick(e) {
    const dropdown = document.getElementById('profile-dropdown');
    const userProfile = document.getElementById('user-profile');
    if (dropdown && !dropdown.contains(e.target) && !userProfile.contains(e.target)) {
        closeProfileDropdown();
    }
}

function closeProfileDropdown() {
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown) {
        dropdown.remove();
        profileDropdownOpen = false;
        document.removeEventListener('click', closeProfileOnOutsideClick);
    }
}

function openProfileSettings() {
    closeProfileDropdown();
    showSnackbar('Settings panel coming soon!');
}

function openHelp() {
    closeProfileDropdown();
    showSnackbar('Help documentation coming soon!');
}

// ==================== KEYBOARD SHORTCUTS ====================
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts when typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            return;
        }

        // Ctrl/Cmd + K - Open global search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            openGlobalSearch();
        }

        // Escape - Close modals/overlays
        if (e.key === 'Escape') {
            if (globalSearchOpen) closeGlobalSearch();
            if (notificationsOpen) closeNotifications();
            if (profileDropdownOpen) closeProfileDropdown();
            if (document.getElementById('modal-overlay').classList.contains('active')) closeModal();
            if (document.getElementById('delete-modal-overlay').classList.contains('active')) closeDeleteModal();
        }

        // Navigation shortcuts (when app is visible)
        if (!document.getElementById('app-container').classList.contains('hidden')) {
            if (e.key === '1' && e.altKey) { e.preventDefault(); handleNavigation('dashboard'); }
            if (e.key === '2' && e.altKey) { e.preventDefault(); handleNavigation('rep'); }
            if (e.key === '3' && e.altKey) { e.preventDefault(); handleNavigation('workorders'); }
            if (e.key === '4' && e.altKey) { e.preventDefault(); handleNavigation('city'); }
            if (e.key === '5' && e.altKey) { e.preventDefault(); handleNavigation('payments'); }
        }
    });
}

// ==================== SCOUTS MANAGEMENT - TRIAL-CENTRIC VIEW ====================

function renderScoutTable(filter = 'all', search = '') {
  const tbody = document.getElementById('scout-table-body');
  if (!tbody) return;

  let data = [...cityData];

  // Filter by scout assignment status
  if (filter !== 'all') {
    const statusMap = {
      'not_assigned': 'Not Assigned',
      'primary_assigned': 'Primary Assigned',
      'both_assigned': 'Both Assigned',
      'confirmed': 'Confirmed'
    };
    const targetStatus = statusMap[filter];
    if (targetStatus) {
      data = data.filter(trial => trial.scoutAssignmentStatus === targetStatus);
    }
  }

  // Search filter
  if (search) {
    const q = search.toLowerCase();
    data = data.filter(trial =>
      (trial.trialCity || '').toLowerCase().includes(q) ||
      (trial.name || '').toLowerCase().includes(q) ||
      (trial.state || '').toLowerCase().includes(q) ||
      (trial.primaryScoutName || '').toLowerCase().includes(q) ||
      (trial.backupScoutName || '').toLowerCase().includes(q) ||
      (trial.scoutAssignmentStatus || '').toLowerCase().includes(q)
    );
  }

  const getStatusBadge = (status) => {
    const badges = {
      'Not Assigned': 'badge-error',
      'Primary Assigned': 'badge-warning',
      'Both Assigned': 'badge-info',
      'Confirmed': 'badge-success'
    };
    return badges[status] || 'badge-info';
  };

  const getReachedBadge = (reached) => {
    if (!reached) return '';
    return reached === 'Yes' ? 'badge-success' : 'badge-error';
  };

  tbody.innerHTML = data.map(trial => `
    <tr>
      <td>
        <div class="cell-main"><strong>${trial.trialCity || '-'}</strong></div>
        <div class="cell-sub">${trial.name}, ${trial.state}</div>
      </td>

      <td>
        <div class="cell-main">${trial.trialType || '-'}</div>
        <div class="cell-sub">${trial.trialDate} • ${trial.groundLocation}</div>
      </td>

      <td>
        <span class="badge ${getStatusBadge(trial.scoutAssignmentStatus)}">
          ${trial.scoutAssignmentStatus || 'Not Assigned'}
        </span>
      </td>

      <td>
        ${trial.primaryScoutName ? `
          <div class="cell-main">${trial.primaryScoutName}</div>
          <div class="cell-sub">${trial.primaryScoutId}</div>
        ` : '<span style="color: #999;">Not Assigned</span>'}
      </td>

      <td>
        ${trial.backupScoutName ? `
          <div class="cell-main">${trial.backupScoutName}</div>
          <div class="cell-sub">${trial.backupScoutId}</div>
        ` : '<span style="color: #999;">Not Assigned</span>'}
      </td>

      <td>
        ${trial.primaryScoutReached ? `
          <span class="badge ${getReachedBadge(trial.primaryScoutReached)}">
            ${trial.primaryScoutReached}
          </span>
          ${trial.backupScoutCalled === 'Yes' ? '<div class="cell-sub">Backup Called</div>' : ''}
        ` : '<span style="color: #999;">Pending</span>'}
      </td>

      <td>
        <div class="table-actions">
          ${trial.scoutAssignmentStatus === 'Not Assigned' ? `
            <button class="btn-primary btn-small" onclick="assignScout('${trial.id}')" title="Assign Scout">
              <span class="material-icons">person_add</span>
              Assign
            </button>
          ` : `
            <button class="icon-btn" onclick="assignScout('${trial.id}')" title="Edit Assignment">
              <span class="material-icons">edit</span>
            </button>
            <button class="icon-btn" onclick="viewTrialScoutDetails('${trial.id}')" title="View Details">
              <span class="material-icons">visibility</span>
            </button>
          `}
        </div>
      </td>
    </tr>
  `).join('');
}

// View Trial Scout Details
function viewTrialScoutDetails(trialId) {
  const trial = cityData.find(t => t.id === trialId);
  if (!trial) return;

  const scout = trial.primaryScoutId ? scoutData.find(s => s.id === trial.primaryScoutId) : null;

  document.getElementById('modal-title').textContent = `Scout Assignment - ${trial.name}, ${trial.state}`;
  document.getElementById('modal-content').innerHTML = `
    <div class="form-section">
      <div class="form-section-title">Trial Details</div>
      <div class="form-row">
        <div class="form-group"><label>Trial City</label><p><strong>${trial.name}, ${trial.state}</strong></p></div>
        <div class="form-group"><label>Date</label><p>${trial.trialDate}</p></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Ground</label><p>${trial.groundLocation}</p></div>
        <div class="form-group"><label>Region</label><p>${trial.region}</p></div>
      </div>
      <div class="form-group">
        <label>Assignment Status</label>
        <p><span class="badge ${trial.scoutAssignmentStatus === 'Confirmed' ? 'badge-success' : 'badge-warning'}">${trial.scoutAssignmentStatus}</span></p>
      </div>
    </div>

    ${scout ? `
      <div class="form-section">
        <div class="form-section-title">Assigned Scout</div>
        <div class="form-row">
          <div class="form-group"><label>Name</label><p><strong>${scout.fullName}</strong></p></div>
          <div class="form-group"><label>Mobile</label><p>${scout.mobile}</p></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>From</label><p>${scout.fromCity}, ${scout.fromState}</p></div>
          <div class="form-group"><label>Region</label><p>${scout.region}</p></div>
        </div>
        <div class="form-group">
          <label>Reached Location?</label>
          <p>${trial.primaryScoutReached ? `<span class="badge ${trial.primaryScoutReached === 'Yes' ? 'badge-success' : 'badge-error'}">${trial.primaryScoutReached}</span>` : 'Not confirmed yet'}</p>
        </div>
      </div>
    ` : '<div class="form-section"><p style="color: #999;">Scout not assigned</p></div>'}

    ${trial.backupScoutName ? `
      <div class="form-section">
        <div class="form-section-title">Backup Contact</div>
        <div class="form-row">
          <div class="form-group"><label>Name</label><p><strong>${trial.backupScoutName}</strong></p></div>
          <div class="form-group"><label>Phone</label><p>${trial.backupScoutId}</p></div>
        </div>
        ${trial.backupScoutCalled === 'Yes' ? '<p><span class="badge badge-info">Backup Called</span></p>' : ''}
      </div>
    ` : '<div class="form-section"><p style="color: #999;">No backup contact added</p></div>'}
  `;

  document.getElementById('modal-save').style.display = 'none';
  document.getElementById('modal-overlay').classList.add('active');
}

// View All Scouts (Master List)
function viewAllScouts() {
  document.getElementById('modal-title').textContent = 'All Scouts - Master List';

  const scoutsList = scoutData.map(s => `
    <div style="border-bottom: 1px solid #eee; padding: 12px 0;">
      <div style="display: flex; justify-content: space-between; align-items: start;">
        <div>
          <div style="font-weight: 500; font-size: 14px;">${s.fullName}</div>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">
            ${s.id} • ${s.mobile} • ${s.email}
          </div>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">
            From: ${s.fromCity}, ${s.fromState} • Region: ${s.region}
          </div>
          ${s.assignedTrial ? `
            <div style="font-size: 12px; color: #2196F3; margin-top: 4px;">
              ✓ Assigned to: ${s.assignedTrial}
            </div>
          ` : ''}
        </div>
        <span class="badge ${s.status === 'Active' ? 'badge-success' : 'badge-error'}" style="margin-left: 12px;">
          ${s.status}
        </span>
      </div>
      <div style="margin-top: 8px;">
        <button class="btn-text-small" onclick="closeModal(); setTimeout(() => editScout('${s.id}'), 100);">
          Edit Scout
        </button>
      </div>
    </div>
  `).join('');

  document.getElementById('modal-content').innerHTML = `
    <div class="form-section">
      <div class="form-section-title">Available Scouts (${scoutData.length})</div>
      <div style="max-height: 400px; overflow-y: auto;">
        ${scoutsList}
      </div>
      <div style="margin-top: 16px;">
        <button class="btn-primary" onclick="closeModal(); setTimeout(() => openModal('scout', 'add'), 100);">
          <span class="material-icons">add</span>
          Add New Scout
        </button>
      </div>
    </div>
  `;

  document.getElementById('modal-save').style.display = 'none';
  document.getElementById('modal-overlay').classList.add('active');
}

function viewScout(id) {
  const s = scoutData.find(x => x.id === id);
  if (!s) return;

  const reachedYes = String(s.reachedLocation).toLowerCase() === "yes";

  document.getElementById('modal-title').textContent = 'Scout Details';
  document.getElementById('modal-content').innerHTML = `
    <div class="form-section">
      <div class="form-section-title">A. Basic Details</div>
      <div class="form-row">
        <div class="form-group"><label>Scout ID</label><p>${s.id}</p></div>
        <div class="form-group"><label>Status</label>
          <p><span class="badge ${s.status==='Active'?'badge-success':'badge-error'}">${s.status}</span></p>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Full Name</label><p>${s.fullName || '-'}</p></div>
        <div class="form-group"><label>Mobile</label><p>${s.mobile || '-'}</p></div>
      </div>
      <div class="form-group"><label>Email</label><p>${s.email || '-'}</p></div>
    </div>

    <div class="form-section">
      <div class="form-section-title">B. Job, Travel & Backup</div>
      <div class="form-row">
        <div class="form-group"><label>Job / Role</label><p>${s.jobRole || '-'}</p></div>
        <div class="form-group"><label>Reached Location?</label>
          <p><span class="badge ${reachedYes ? 'badge-success' : 'badge-error'}">${reachedYes ? 'Yes' : 'No'}</span></p>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>From City</label><p>${s.fromCity || '-'}</p></div>
        <div class="form-group"><label>From State</label><p>${s.fromState || '-'}</p></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Backup Name</label><p>${s.backupName || '-'}</p></div>
        <div class="form-group"><label>Backup Phone</label><p>${s.backupPhone || '-'}</p></div>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">C. Location & Mapping</div>
      <div class="form-row">
        <div class="form-group"><label>Region</label><p>${s.region || '-'}</p></div>
        <div class="form-group"><label>Coverage Level</label><p>${s.coverageLevel || '-'}</p></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>States</label><p>${(s.states||[]).join(', ') || '-'}</p></div>
        <div class="form-group"><label>Cities</label><p>${(s.cities||[]).join(', ') || '-'}</p></div>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">D. Trial Assignment</div>
      <div class="form-row">
        <div class="form-group"><label>Assigned Trial</label><p>${s.assignedTrial || '-'}</p></div>
        <div class="form-group"><label>Trial Date</label><p>${formatDate(s.trialDate)}</p></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Trial City</label><p>${s.trialCity || '-'}</p></div>
        <div class="form-group"><label>Reporting Manager</label><p>${s.reportingManager || '-'}</p></div>
      </div>
    </div>

  `;

  document.getElementById('modal-save').style.display = 'none';
  document.getElementById('modal-overlay').classList.add('active');
}

function editScout(id) {
  const s = scoutData.find(x => x.id === id);
  if (!s) return;
  currentEditItem = s;
  currentEditType = 'scout';
  openModal('scout', 'edit', s);
}

function deleteScout(id) {
  const s = scoutData.find(x => x.id === id);
  if (!s) return;

  document.getElementById('delete-message').textContent = `Are you sure you want to delete Scout "${s.fullName}"?`;
  deleteCallback = () => {
    scoutData = scoutData.filter(x => x.id !== id);
    renderScoutTable();
    showSnackbar('Scout deleted successfully');
  };
  document.getElementById('delete-modal-overlay').classList.add('active');
}

function getScoutForm(data) {
  const d = data || {};
  return `
    <div class="form-section">
      <div class="form-section-title">A. Basic Details</div>
      <div class="form-row">
        <div class="form-group"><label>Full Name *</label><input id="form-scout-name" value="${d.fullName || ''}"></div>
        <div class="form-group"><label>Status</label>
          <select id="form-scout-status">
            <option ${d.status==="Active"?"selected":""}>Active</option>
            <option ${d.status==="Inactive"?"selected":""}>Inactive</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Mobile *</label><input id="form-scout-mobile" value="${d.mobile || ''}"></div>
        <div class="form-group"><label>Email *</label><input id="form-scout-email" value="${d.email || ''}"></div>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">B. Job, Travel & Backup</div>
      <div class="form-row">
        <div class="form-group"><label>Job / Role</label>
          <input id="form-scout-jobrole" value="${d.jobRole || ''}" placeholder="Scout / Lead Scout / Coach">
        </div>
        <div class="form-group"><label>Reached Location?</label>
          <select id="form-scout-reached">
            <option value="">Select</option>
            <option value="Yes" ${(d.reachedLocation==="Yes")?"selected":""}>Yes</option>
            <option value="No" ${(d.reachedLocation==="No")?"selected":""}>No</option>
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>From City</label><input id="form-scout-fromcity" value="${d.fromCity || ''}"></div>
        <div class="form-group"><label>From State</label><input id="form-scout-fromstate" value="${d.fromState || ''}"></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Backup Name</label><input id="form-scout-backupname" value="${d.backupName || ''}"></div>
        <div class="form-group"><label>Backup Phone</label><input id="form-scout-backupphone" value="${d.backupPhone || ''}"></div>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">C. Location & Mapping</div>
      <div class="form-row">
        <div class="form-group"><label>Region</label>
          <select id="form-scout-region">
            <option value="">Select</option>
            ${scoutRegions.map(r => `<option value="${r}" ${d.region===r?"selected":""}>${r}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Coverage Level</label>
          <select id="form-scout-coverage">
            <option value="">Select</option>
            ${scoutCoverageLevels.map(c => `<option value="${c}" ${d.coverageLevel===c?"selected":""}>${c}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>States (comma separated)</label><input id="form-scout-states" value="${(d.states||[]).join(', ')}"></div>
        <div class="form-group"><label>Cities (comma separated)</label><input id="form-scout-cities" value="${(d.cities||[]).join(', ')}"></div>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">D. Trial Assignment</div>
      <div class="form-row">
        <div class="form-group"><label>Assigned Trial</label>
          <select id="form-scout-trial">
            <option value="">Select</option>
            ${scoutTrials.map(t => `<option value="${t.name}" ${d.assignedTrial===t.name?"selected":""}>${t.name}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label>Trial Date</label><input id="form-scout-trialdate" value="${d.trialDate || ''}" disabled></div>
      </div>
      <div class="form-row">
        <div class="form-group"><label>Trial City</label><input id="form-scout-trialcity" value="${d.trialCity || ''}" disabled></div>
        <div class="form-group"><label>Reporting Manager</label><input id="form-scout-manager" value="${d.reportingManager || ''}" disabled></div>
      </div>
    </div>
  `;
}

function saveScout() {
  const fullName = document.getElementById('form-scout-name').value.trim();
  const status = document.getElementById('form-scout-status').value;
  const mobile = document.getElementById('form-scout-mobile').value.trim();
  const email = document.getElementById('form-scout-email').value.trim();

  const jobRole = document.getElementById('form-scout-jobrole').value.trim();
  const reachedLocation = document.getElementById('form-scout-reached').value || "";
  const fromCity = document.getElementById('form-scout-fromcity').value.trim();
  const fromState = document.getElementById('form-scout-fromstate').value.trim();
  const backupName = document.getElementById('form-scout-backupname').value.trim();
  const backupPhone = document.getElementById('form-scout-backupphone').value.trim();

  const region = document.getElementById('form-scout-region').value;
  const coverageLevel = document.getElementById('form-scout-coverage').value;
  const states = splitCSV(document.getElementById('form-scout-states').value);
  const cities = splitCSV(document.getElementById('form-scout-cities').value);

  const assignedTrial = document.getElementById('form-scout-trial').value;
  const trialMeta = scoutTrials.find(t => t.name === assignedTrial);
  const trialDate = trialMeta?.date || "";
  const trialCity = trialMeta?.city || "";
  const reportingManager = trialMeta?.manager || "";

  if (!fullName || !mobile || !email) {
    showSnackbar('Please fill required fields (Name, Mobile, Email)', 'error');
    return;
  }

  if (currentEditItem) {
    Object.assign(currentEditItem, {
      fullName, status, mobile, email,
      jobRole, reachedLocation, fromCity, fromState, backupName, backupPhone,
      region, coverageLevel, states, cities,
      assignedTrial, trialDate, trialCity, reportingManager
    });
    showSnackbar('Scout updated successfully');
  } else {
    const newId = `SCOUT-${String(scoutData.length + 1).padStart(3, '0')}`;
    scoutData.push({
      id: newId,
      fullName, status, mobile, email,
      jobRole, reachedLocation, fromCity, fromState, backupName, backupPhone,
      region, coverageLevel, states, cities,
      assignedTrial, trialDate, trialCity, reportingManager,
      ratings, final
    });
    showSnackbar('Scout added successfully');
  }

  renderScoutTable();
  closeModal();
}

function initScoutFormUX() {
  const trialSel = document.getElementById('form-scout-trial');
  if (!trialSel) return;

  const fillTrial = () => {
    const t = scoutTrials.find(x => x.name === trialSel.value);
    const elDate = document.getElementById('form-scout-trialdate');
    const elCity = document.getElementById('form-scout-trialcity');
    const elMgr  = document.getElementById('form-scout-manager');
    if (elDate) elDate.value = t?.date || '';
    if (elCity) elCity.value = t?.city || '';
    if (elMgr)  elMgr.value  = t?.manager || '';
  };

  trialSel.addEventListener('change', fillTrial);
  fillTrial();
}

// ===== helpers (keep if you don't already have them) =====
function splitCSV(str) {
  return (str || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
}
function numVal(id) {
  const v = parseInt(document.getElementById(id)?.value || '', 10);
  return Number.isFinite(v) ? v : null;
}
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function ratingInput(label, id, val) {
  return `
    <div class="form-row">
      <div class="form-group" style="flex:1;">
        <label>${label}</label>
        <input id="${id}" type="number" min="1" max="5" value="${val ?? ''}" placeholder="1-5">
      </div>
    </div>
  `;
}
function ratingRow(label, val) {
  return `
    <div class="form-row">
      <div class="form-group" style="flex:1;">
        <label>${label}</label>
        <p>${val ?? '-'}</p>
      </div>
    </div>
  `;
}

