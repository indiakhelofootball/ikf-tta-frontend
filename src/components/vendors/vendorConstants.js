// src/components/vendors/vendorConstants.js

export const VENDOR_TYPES = [
  'REP',
  'Printing',
  'Logistics',
  'Equipment',
  'Events',
  'Catering',
  'Other',
];

export const VENDOR_STATUSES = ['Verified', 'Pending', 'Rejected'];

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
