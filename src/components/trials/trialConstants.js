// src/components/trials/trialConstants.js

export const SEASONS = [
  'Season 1',
  'Season 2',
  'Season 3',
  'Season 4',
  'Season 5',
  'Season 6',
  'Season 7',
  'Season 8',
  'Season 9',
  'Season 10',
  'Custom',
];

export const TRIAL_TYPES = [
  'Regular',
  'CSR',
  'Championship',
  'School Partnership',
];

// "Not Any" is the default/first option — means tier is not applicable
export const TIER_TYPES = [
  'Not Any',
  'Basic',
  'Standard',
  'Premium',
];

export const STATUSES = [
  'Active',
  'Draft',
  'Completed',
  'Cancelled',
];

export const SCHEDULE_TYPES = [
  'Fixed',
  'Tentative',
];

export const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
  { value: 'upcoming', label: 'Upcoming First' },
  { value: 'past', label: 'Past First' },
];

export const DATE_FILTER_OPTIONS = [
  { value: '', label: 'All Dates' },
  { value: 'this-month', label: 'This Month' },
  { value: 'next-month', label: 'Next Month' },
  { value: 'this-quarter', label: 'This Quarter' },
  { value: 'tentative-only', label: 'Tentative Only' },
];

// Trial type short codes for code generation
export const TRIAL_TYPE_CODES = {
  'Regular': 'REG',
  'CSR': 'CSR',
  'Championship': 'CHP',
  'School Partnership': 'SPR',
};

// Status color mapping
export const STATUS_COLORS = {
  'Active': 'success',
  'Draft': 'default',
  'Completed': 'info',
  'Cancelled': 'error',
};
