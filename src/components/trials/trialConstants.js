// src/components/trials/trialConstants.js

export const SEASONS = [
  'Season 1', 'Season 2', 'Season 3', 'Season 4', 'Season 5',
  'Season 6', 'Season 7', 'Season 8', 'Season 9', 'Season 10', 'Custom',
];

// Default seasons shown in the Project Setup wizard (admin can add/remove)
export const SEASONS_PROJECT = ['Season 5', 'Season 6', 'Season 7'];

// Project name options for the wizard dropdown
export const PROJECT_NAMES = ['IKF', 'Project Nari Shakti'];

// NOTE: code abbreviations used to live here as a second, unsynced copy of the map
// in src/utils/trialCodeGenerator.js. Removed (dead code — confirmed unused outside
// this file) so there's only one place a project's code abbreviation can live: the
// admin-managed ConfigOption.comment field, read via trialCodeGenerator.js.

// "Not Any" = no tier / not applicable
export const TIER_TYPES = [
  'Not Any',
  'Basic',
  'Standard',
  'Premium',
];

export const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'name-asc', label: 'Name A–Z' },
  { value: 'name-desc', label: 'Name Z–A' },
];

// City sort options used inside ProjectDashboard
export const CITY_SORT_OPTIONS = [
  { value: 'recent', label: 'Recently Added' },
  { value: 'city-asc', label: 'City A–Z' },
  { value: 'city-desc', label: 'City Z–A' },
  { value: 'state-asc', label: 'State A–Z' },
  { value: 'month-asc', label: 'Month (Jan → Dec)' },
  { value: 'confirmed-first', label: 'Confirmed First' },
];

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
