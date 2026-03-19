// src/components/vendors/vendorConstants.js

export const VENDOR_STATUSES = ['Verified', 'Pending', 'Rejected'];

export const DEMO_VENDORS = [
  // Photography
  { id: 'demo1', vendorName: 'Rajesh Sharma Photography', vendorType: 'Photography', companyType: 'Individual', contactPerson: 'Rajesh Sharma', phone: '9876543210', email: 'rajesh@sharmaclicks.com', panNumber: 'ABCPS1234R', gstNumber: '', status: 'Verified', createdAt: '2025-01-10' },
  { id: 'demo2', vendorName: 'ClickMaster Studios Pvt Ltd', vendorType: 'Photography', companyType: 'Private Limited', entityName: 'ClickMaster Studios Pvt Ltd', contactPerson: 'Priya Mehta', phone: '9845612300', email: 'priya@clickmaster.in', panNumber: 'XYZCS5678T', gstNumber: '27XYZCS5678T1ZM', status: 'Verified', createdAt: '2025-01-15' },
  { id: 'demo3', vendorName: 'Anil Kumar', vendorType: 'Photography', companyType: 'Individual', contactPerson: 'Anil Kumar', phone: '9901234567', email: 'anil.photo@gmail.com', panNumber: 'MNPAK7890D', gstNumber: '', status: 'Pending', createdAt: '2025-02-01' },
  { id: 'demo4', vendorName: 'LensArt Creations LLP', vendorType: 'Photography', companyType: 'LLP', contactPerson: 'Sunita Rao', phone: '9712345678', email: 'sunita@lensart.com', panNumber: 'FGHLA4321K', gstNumber: '29FGHLA4321K1ZQ', status: 'Verified', createdAt: '2025-02-10' },
  // REP
  { id: 'demo5', vendorName: 'Suresh Patel', vendorType: 'REP', companyType: 'Individual', contactPerson: 'Suresh Patel', phone: '9712345679', email: 'suresh.rep@gmail.com', panNumber: 'JKLSP6543M', gstNumber: '', status: 'Verified', createdAt: '2025-01-20' },
  { id: 'demo6', vendorName: 'SportLink Representatives Pvt Ltd', vendorType: 'REP', companyType: 'Private Limited', entityName: 'SportLink Representatives Pvt Ltd', contactPerson: 'Vikram Singh', phone: '9823456789', email: 'vikram@sportlink.in', panNumber: 'QRSSR2109N', gstNumber: '07QRSSR2109N1ZP', status: 'Verified', createdAt: '2025-01-25' },
  { id: 'demo7', vendorName: 'Meena Iyer', vendorType: 'REP', companyType: 'Individual', contactPerson: 'Meena Iyer', phone: '9654321098', email: 'meena.iyer@yahoo.com', panNumber: 'TUVMI8765B', gstNumber: '', status: 'Pending', createdAt: '2025-02-05' },
  { id: 'demo8', vendorName: 'IndiaKhelo Field Reps', vendorType: 'REP', companyType: 'Partnership Firm', entityName: 'IndiaKhelo Field Reps', contactPerson: 'Ramesh Gupta', phone: '9534567890', email: 'ramesh@ikreps.com', panNumber: 'WXYIR3456C', gstNumber: '06WXYIR3456C1ZR', status: 'Verified', createdAt: '2025-02-12' },
  // Printing
  { id: 'demo9', vendorName: 'PrintWorld Solutions', vendorType: 'Printing', companyType: 'Partnership Firm', entityName: 'PrintWorld Solutions', contactPerson: 'Deepak Verma', phone: '9445678901', email: 'deepak@printworld.com', panNumber: 'ABCPW9012E', gstNumber: '29ABCPW9012E1ZS', status: 'Verified', createdAt: '2025-01-18' },
  { id: 'demo10', vendorName: 'Mohan Offset Press', vendorType: 'Printing', companyType: 'Individual', contactPerson: 'Mohan Lal', phone: '9356789012', email: 'mohan.offset@gmail.com', panNumber: 'DEFMO5678F', gstNumber: '', status: 'Verified', createdAt: '2025-01-28' },
  { id: 'demo11', vendorName: 'ColorMax Prints LLP', vendorType: 'Printing', companyType: 'LLP', entityName: 'ColorMax Prints LLP', contactPerson: 'Anita Joshi', phone: '9267890123', email: 'anita@colormax.com', panNumber: 'GHICP1234G', gstNumber: '06GHICP1234G1ZT', status: 'Pending', createdAt: '2025-02-08' },
  { id: 'demo12', vendorName: 'Ravi Print House', vendorType: 'Printing', companyType: 'Individual', contactPerson: 'Ravi Shankar', phone: '9178901234', email: 'ravi.print@hotmail.com', panNumber: 'JKLRP7890H', gstNumber: '', status: 'Verified', createdAt: '2025-02-20' },
];

export const VENDOR_STATUS_COLORS = {
  Verified: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  Active: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  Pending: { bg: '#fff7ed', color: '#ea580c', border: '#fed7aa' },
  Inactive: { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1' },
  Rejected: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
};

export const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
];
