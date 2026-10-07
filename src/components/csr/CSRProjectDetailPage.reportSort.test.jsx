// The sort control on a grant's own Reports tab, where 10-12 reports on one
// grant pile up (pending.md item 4). This tab never sorted on the client: it
// shows the server's array as it arrives. The default must leave that order
// exactly as it is.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CSRProjectDetailPage from './CSRProjectDetailPage';

jest.mock('react-router-dom', () => ({
  __esModule: true,
  useParams: () => ({ id: '7' }),
  useNavigate: () => jest.fn(),
  // Opened on the Reports tab, the way a row on the cross-grant page opens it.
  useLocation: () => ({ pathname: '/csr/7', state: { tab: 3 } }),
}), { virtual: true });

jest.mock('../../services/api', () => ({
  csrAPI: {
    projects: { getById: jest.fn() },
    activities: { getAll: jest.fn() },
    reports: { getAll: jest.fn(), delete: jest.fn() },
    contacts: { getAll: jest.fn() },
    activityTypes: { getAll: jest.fn() },
    expenseTags: { getAll: jest.fn() },
  },
}));

jest.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'SUPER_ADMIN' }, perms: null, permsLoading: false }),
}));

jest.mock('./CSRProjectDetailView', () => ({
  __esModule: true,
  default: () => null,
  ttaProjectIdentity: () => '',
}));
jest.mock('./CSRContractManagementPage', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/certificatePdf', () => ({ downloadCertificatePdf: jest.fn() }));

const { csrAPI } = require('../../services/api');

const ACTIVITIES = [
  { id: 10, title: 'Zonal trial' },
  { id: 11, title: 'Coach workshop' },
];

// NOT in date order on purpose. If the default ever re-sorted, this order
// would change and the first test would fail.
const SERVER_ORDER = [
  { id: 1, fileName: 'Delta', activityId: 10, reportType: 'Trial', createdAt: '2026-07-02T09:00:00Z', projectId: 7 },
  { id: 2, fileName: 'alpha', activityId: null, reportType: 'Workshop', createdAt: '2026-07-05T09:00:00Z', projectId: 7 },
  { id: 3, fileName: 'Charlie', activityId: 11, reportType: 'Trial', createdAt: '2026-07-01T09:00:00Z', projectId: 7 },
  { id: 4, fileName: 'Bravo', activityId: 10, reportType: 'Overall', createdAt: '2026-07-04T09:00:00Z', projectId: 7 },
];

beforeEach(() => {
  csrAPI.projects.getById.mockResolvedValue({ id: 7, name: 'Khelo Girls', clientName: 'BDSA' });
  csrAPI.activities.getAll.mockResolvedValue(ACTIVITIES);
  csrAPI.reports.getAll.mockResolvedValue(SERVER_ORDER);
  csrAPI.contacts.getAll.mockResolvedValue([]);
  csrAPI.activityTypes.getAll.mockResolvedValue([]);
  csrAPI.expenseTags.getAll.mockResolvedValue([]);
});

// The row and its pencil share the name "Edit report X", so the bin -- one per
// row, "Delete report X" -- is the unambiguous read of the order on screen.
const shownNames = () =>
  screen.getAllByRole('button', { name: /^Delete report / })
    .map((el) => el.getAttribute('aria-label').replace(/^Delete report /, ''));

const sortTo = (value) =>
  fireEvent.change(screen.getByRole('combobox', { name: 'Sort reports' }), { target: { value } });

test('opens on newest first and shows the reports in the order the server sent them', async () => {
  render(<CSRProjectDetailPage />);
  const select = await screen.findByRole('combobox', { name: 'Sort reports' });

  expect(select).toHaveValue('newest');
  expect(shownNames()).toEqual(SERVER_ORDER.map((r) => r.fileName));
});

test('offers every sort except grant, which inside one grant says nothing', async () => {
  render(<CSRProjectDetailPage />);
  const select = await screen.findByRole('combobox', { name: 'Sort reports' });

  const values = Array.from(select.options).map((o) => o.value);
  expect(values).toEqual(['newest', 'oldest', 'name-asc', 'name-desc', 'type', 'activity']);
});

test('choosing a sort reorders the tab', async () => {
  render(<CSRProjectDetailPage />);
  await screen.findByRole('combobox', { name: 'Sort reports' });

  sortTo('oldest');
  expect(shownNames()).toEqual(['Charlie', 'Delta', 'Bravo', 'alpha']);

  sortTo('name-asc');
  expect(shownNames()).toEqual(['alpha', 'Bravo', 'Charlie', 'Delta']);

  sortTo('name-desc');
  expect(shownNames()).toEqual(['Delta', 'Charlie', 'Bravo', 'alpha']);

  sortTo('type');
  expect(shownNames()).toEqual(['Bravo', 'Delta', 'Charlie', 'alpha']);

  // Coach workshop, Zonal trial (newest first), then the one with no activity.
  sortTo('activity');
  expect(shownNames()).toEqual(['Charlie', 'Bravo', 'Delta', 'alpha']);

  // Back to the default puts the server's order back, untouched.
  sortTo('newest');
  expect(shownNames()).toEqual(SERVER_ORDER.map((r) => r.fileName));
});

test('no sort control on a grant with no reports', async () => {
  csrAPI.reports.getAll.mockResolvedValue([]);
  render(<CSRProjectDetailPage />);

  await screen.findByText('No reports yet');
  expect(screen.queryByRole('combobox', { name: 'Sort reports' })).not.toBeInTheDocument();
});
