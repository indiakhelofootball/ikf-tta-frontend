// A1: "All Projects" on a grant page goes to the list of grants, not the
// Dashboard. A3: a report on the grant's Reports tab shows its Report Name.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CSRProjectDetailPage from './CSRProjectDetailPage';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  __esModule: true,
  useParams: () => ({ id: '7' }),
  useNavigate: () => mockNavigate,
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

test('All Projects goes to the projects list, not the Dashboard', async () => {
  render(<CSRProjectDetailPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'All Projects' }));
  expect(mockNavigate).toHaveBeenCalledWith('/csr/projects');
});

test("the Reports tab shows each report's Report Name, falling back to the file name", async () => {
  csrAPI.reports.getAll.mockResolvedValue([
    { id: 1, title: 'Q1 Impact Report', fileName: 'scan_0042.pdf', createdAt: '2026-07-02T09:00:00Z', projectId: 7 },
    { id: 2, title: '', fileName: 'Older report.pdf', createdAt: '2026-07-01T09:00:00Z', projectId: 7 },
  ]);
  render(<CSRProjectDetailPage />);
  expect(await screen.findByRole('button', { name: 'Delete report Q1 Impact Report' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Delete report Older report.pdf' })).toBeInTheDocument();
  expect(screen.queryByText('scan_0042.pdf')).toBeNull();
});
