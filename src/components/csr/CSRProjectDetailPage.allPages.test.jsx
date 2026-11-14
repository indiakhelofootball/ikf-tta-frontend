// The grant page showed "Athletes (100)" for a grant of 252: the athletes
// endpoint is paginated and only the first page was read.
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CSRProjectDetailPage from './CSRProjectDetailPage';

jest.mock('react-router-dom', () => ({
  __esModule: true,
  useParams: () => ({ id: '42' }),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/csr/42', state: { tab: 'athletes' } }),
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

const athlete = (n) => ({ id: n, fullName: `Athlete ${n}`, category: 'U13', status: 'Participated' });
const page = (from, to, next) => ({
  count: 252,
  next,
  previous: null,
  results: Array.from({ length: to - from + 1 }, (_, i) => athlete(from + i)),
});

beforeEach(() => {
  jest.clearAllMocks();
  csrAPI.projects.getById.mockResolvedValue({
    id: 42, name: 'Football for All', clientName: 'Vardhman', status: 'Active',
    sanctionedAmount: '0', startDate: '2026-04-01',
  });
  csrAPI.activities.getAll.mockResolvedValue([]);
  csrAPI.reports.getAll.mockResolvedValue([]);
  csrAPI.contacts.getAll.mockResolvedValue([]);
  csrAPI.activityTypes.getAll.mockResolvedValue([]);
  csrAPI.expenseTags.getAll.mockResolvedValue([]);
  csrAPI.grantTrials.mockResolvedValue([]);
});

test('a grant of 252 athletes over three pages lists and counts all 252', async () => {
  csrAPI.athletes.getAll
    .mockResolvedValueOnce(page(1, 100, 'next-2'))
    .mockResolvedValueOnce(page(101, 200, 'next-3'))
    .mockResolvedValueOnce(page(201, 252, null));
  render(<CSRProjectDetailPage />);

  expect(await screen.findByRole('tab', { name: 'Athletes (252)' })).toBeInTheDocument();
  expect(screen.getByText(/Showing 252 of 252/)).toBeInTheDocument();
  expect(screen.getByText('Athlete 252')).toBeInTheDocument();
  expect(csrAPI.athletes.getAll).toHaveBeenCalledTimes(3);
});

test('a page that fails mid-way shows the list error, not the athletes read so far', async () => {
  csrAPI.athletes.getAll
    .mockResolvedValueOnce(page(1, 100, 'next-2'))
    .mockRejectedValueOnce(new Error('Bad gateway'));
  render(<CSRProjectDetailPage />);

  expect(await screen.findByText('Could not load athletes.')).toBeInTheDocument();
  expect(screen.getByRole('tab', { name: 'Athletes' })).toBeInTheDocument();
  expect(screen.queryByText('Athlete 1')).not.toBeInTheDocument();
  expect(screen.queryByText(/Showing 100/)).not.toBeInTheDocument();
});
