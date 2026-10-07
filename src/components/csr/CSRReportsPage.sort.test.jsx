// The sort control on the cross-grant Reports page (pending.md items 3 and 4:
// "you can add multiple sort"). The default has to be the order the page has
// always shown, so a reader who never touches the control sees nothing move.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CSRReportsPage from './CSRReportsPage';

jest.mock('react-router-dom', () => ({ __esModule: true, useNavigate: () => jest.fn() }), {
  virtual: true,
});

jest.mock('../../services/api', () => ({
  csrAPI: {
    reports: { getAll: jest.fn() },
    projects: { getAll: jest.fn() },
    activities: { getAll: jest.fn() },
  },
}));

jest.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'SUPER_ADMIN' }, perms: null, permsLoading: false }),
}));

const { csrAPI } = require('../../services/api');

const PROJECTS = [
  { id: 1, name: 'Khelo Girls' },
  { id: 2, name: 'Arunachal League' },
];

const ACTIVITIES = [
  { id: 10, title: 'Zonal trial' },
  { id: 11, title: 'Coach workshop' },
];

// Deliberately not in date order, so a page that forgot to sort would fail.
// All Internal, because the page opens on the Internal view; five rows, because
// the page shows five a page.
const REPORTS = [
  { id: 1, fileName: 'Delta', projectId: 1, activityId: 10, reportType: 'Trial', createdAt: '2026-07-02T09:00:00Z', visibleToClient: false },
  { id: 2, fileName: 'alpha', projectId: 2, activityId: null, reportType: 'Workshop', createdAt: '2026-07-05T09:00:00Z', visibleToClient: false },
  { id: 3, fileName: 'Charlie', projectId: 1, activityId: 11, reportType: 'Trial', createdAt: '2026-07-01T09:00:00Z', visibleToClient: false },
  { id: 4, fileName: 'Bravo', projectId: 2, activityId: 10, reportType: 'Overall', createdAt: '2026-07-04T09:00:00Z', visibleToClient: false },
  { id: 5, fileName: 'Echo', projectId: 1, activityId: null, reportType: '', createdAt: '2026-07-06T09:00:00Z', visibleToClient: false },
];

const DASH = String.fromCharCode(0x2013);

beforeEach(() => {
  csrAPI.reports.getAll.mockResolvedValue(REPORTS);
  csrAPI.projects.getAll.mockResolvedValue(PROJECTS);
  csrAPI.activities.getAll.mockResolvedValue(ACTIVITIES);
});

const shownNames = () =>
  screen.getAllByRole('button', { name: /^Open / })
    .map((el) => el.getAttribute('aria-label').replace(/^Open (.*), filed under .*$/, '$1'));

const sortTo = (value) =>
  fireEvent.change(screen.getByRole('combobox', { name: 'Sort reports' }), { target: { value } });

test('opens on newest first, exactly the order the page used before the control existed', async () => {
  render(<CSRReportsPage />);
  await screen.findAllByRole('button', { name: /^Open / });

  const legacy = [...REPORTS]
    .sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
    .map((r) => r.fileName);

  expect(screen.getByRole('combobox', { name: 'Sort reports' })).toHaveValue('newest');
  expect(shownNames()).toEqual(legacy);
  expect(shownNames()).toEqual(['Echo', 'alpha', 'Bravo', 'Delta', 'Charlie']);
});

test('offers every sort, grant included', async () => {
  render(<CSRReportsPage />);
  await screen.findAllByRole('button', { name: /^Open / });

  const labels = Array.from(screen.getByRole('combobox', { name: 'Sort reports' }).options)
    .map((o) => o.textContent);
  expect(labels).toEqual([
    'Newest first', 'Oldest first', `Name A${DASH}Z`, `Name Z${DASH}A`,
    'By report type', 'By activity', 'By grant',
  ]);
});

test('choosing a sort reorders the list', async () => {
  render(<CSRReportsPage />);
  await screen.findAllByRole('button', { name: /^Open / });

  sortTo('oldest');
  expect(shownNames()).toEqual(['Charlie', 'Delta', 'Bravo', 'alpha', 'Echo']);

  sortTo('name-asc');
  expect(shownNames()).toEqual(['alpha', 'Bravo', 'Charlie', 'Delta', 'Echo']);

  sortTo('name-desc');
  expect(shownNames()).toEqual(['Echo', 'Delta', 'Charlie', 'Bravo', 'alpha']);

  // Overall, Trial (newest first inside it), Workshop, then the untyped one last.
  sortTo('type');
  expect(shownNames()).toEqual(['Bravo', 'Delta', 'Charlie', 'alpha', 'Echo']);

  // Coach workshop, Zonal trial (newest first), then the two with no activity.
  sortTo('activity');
  expect(shownNames()).toEqual(['Charlie', 'Bravo', 'Delta', 'Echo', 'alpha']);

  // Arunachal League before Khelo Girls, newest first inside each.
  sortTo('grant');
  expect(shownNames()).toEqual(['alpha', 'Bravo', 'Echo', 'Delta', 'Charlie']);

  sortTo('newest');
  expect(shownNames()).toEqual(['Echo', 'alpha', 'Bravo', 'Delta', 'Charlie']);
});

test('the grant filter still applies on top of a sort, in either order of choosing', async () => {
  render(<CSRReportsPage />);
  await screen.findAllByRole('button', { name: /^Open / });

  sortTo('name-asc');
  fireEvent.change(screen.getByRole('combobox', { name: 'Grant' }), { target: { value: '1' } });
  expect(shownNames()).toEqual(['Charlie', 'Delta', 'Echo']);

  sortTo('newest');
  expect(shownNames()).toEqual(['Echo', 'Delta', 'Charlie']);

  sortTo('name-desc');
  fireEvent.change(screen.getByRole('combobox', { name: 'Grant' }), { target: { value: '2' } });
  expect(shownNames()).toEqual(['Bravo', 'alpha']);
});
