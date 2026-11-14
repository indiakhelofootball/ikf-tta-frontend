// D-019: an activity carries a grant city. The grant's Activities tab showed
// only the typed venue, so a row with a city and no venue read "—".
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CSRProjectDetailPage from './CSRProjectDetailPage';

jest.mock('react-router-dom', () => ({
  __esModule: true,
  useParams: () => ({ id: '42' }),
  useNavigate: () => jest.fn(),
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
    athletes: { getAll: jest.fn() },
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

beforeEach(() => {
  jest.clearAllMocks();
  csrAPI.projects.getById.mockResolvedValue({
    id: 42, name: 'Test project', clientName: 'BDSA', status: 'Active', sanctionedAmount: '0',
  });
  csrAPI.activities.getAll.mockResolvedValue([
    { id: 1, title: 'Andheri trial', status: 'Completed', trialCityName: 'Mumbai', location: 'Andheri Sports Complex' },
    { id: 2, title: 'Pune trial', status: 'Completed', trialCityName: 'Pune', location: '' },
  ]);
  csrAPI.reports.getAll.mockResolvedValue([]);
  csrAPI.contacts.getAll.mockResolvedValue([]);
  csrAPI.activityTypes.getAll.mockResolvedValue([]);
  csrAPI.expenseTags.getAll.mockResolvedValue([]);
  csrAPI.athletes.getAll.mockResolvedValue([]);
  csrAPI.grantTrials.mockResolvedValue([]);
});

test('the Location column shows the city, then the venue when there is one', async () => {
  render(<CSRProjectDetailPage />);

  expect(await screen.findByText('Mumbai · Andheri Sports Complex')).toBeInTheDocument();
  expect(screen.getByText('Pune')).toBeInTheDocument();
});

test('the opened row names the same place', async () => {
  render(<CSRProjectDetailPage />);
  const [row] = await screen.findAllByRole('button', { name: 'Show details for activity Pune trial' });
  fireEvent.click(row);

  expect(screen.getAllByText('Pune')).toHaveLength(2);
});
