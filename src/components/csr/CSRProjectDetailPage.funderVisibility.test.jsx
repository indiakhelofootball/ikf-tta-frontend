// Each activity row on a grant says whether the funder can see it: only a
// Completed activity whose "Visible to funder" switch is on reaches the portal.
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CSRProjectDetailPage from './CSRProjectDetailPage';

jest.mock('react-router-dom', () => ({
  __esModule: true,
  useParams: () => ({ id: '42' }),
  useNavigate: () => jest.fn(),
  // Opened on the Activities tab.
  useLocation: () => ({ pathname: '/csr/42', state: { tab: 2 } }),
}), { virtual: true });

jest.mock('../../services/api', () => ({
  csrAPI: {
    projects: { getById: jest.fn() },
    activities: { getAll: jest.fn() },
    reports: { getAll: jest.fn() },
    contacts: { getAll: jest.fn() },
    activityTypes: { getAll: jest.fn() },
    expenseTags: { getAll: jest.fn() },
    grantTrials: jest.fn(),
  },
}));

jest.mock('../../auth/useGrants', () => ({
  __esModule: true,
  default: () => ({
    isSuper: false, canView: (m) => m === 'csr', canEdit: () => false, permsLoading: false,
  }),
}));

jest.mock('../../utils/certificatePdf', () => ({ downloadCertificatePdf: jest.fn() }));

const { csrAPI } = require('../../services/api');

const ACTS = [
  { id: 1, title: 'Done and shown', status: 'Completed', visibleToClient: true },
  { id: 2, title: 'Done but switched off', status: 'Completed', visibleToClient: false },
  { id: 3, title: 'Still planned', status: 'Planned', visibleToClient: true },
];

beforeEach(() => {
  jest.clearAllMocks();
  csrAPI.projects.getById.mockResolvedValue({
    id: 42, name: 'Test project', clientName: 'BDSA', status: 'Active', sanctionedAmount: '0',
  });
  csrAPI.activities.getAll.mockResolvedValue(ACTS);
  csrAPI.reports.getAll.mockResolvedValue([]);
  csrAPI.contacts.getAll.mockResolvedValue([]);
  csrAPI.activityTypes.getAll.mockResolvedValue([]);
  csrAPI.expenseTags.getAll.mockResolvedValue([]);
  csrAPI.grantTrials.mockResolvedValue([]);
});

test('each activity row says whether the funder sees it', async () => {
  render(<CSRProjectDetailPage />);
  // The row and its chevron share a label; the row comes first and holds the
  // chevron, so it is the one whose text includes the marker.
  const row = (title) => screen.getAllByRole('button', { name: `Show details for activity ${title}` })[0];

  await screen.findByText('Done and shown');
  expect(row('Done and shown')).toHaveTextContent('Shown to funder');
  expect(row('Done but switched off')).toHaveTextContent('Hidden from funder');
  expect(row('Still planned')).toHaveTextContent('Hidden from funder');
});
