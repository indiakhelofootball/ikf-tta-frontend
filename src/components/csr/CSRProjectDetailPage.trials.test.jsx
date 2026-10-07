// 26 Aug review, 03:52-05:31: the grant must not say a trial "runs under" it.
// "Following trials will be conducted on this project", read in the order the
// client gave: the funder first, then the description, then the trials.
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import CSRProjectDetailPage from './CSRProjectDetailPage';

jest.mock('react-router-dom', () => ({
  __esModule: true,
  useParams: () => ({ id: '42' }),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/csr/42', state: null }),
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

const HEADING = 'Following trials will be conducted on this project';

const GRANT = {
  id: 42,
  name: 'Test project',
  clientName: 'BDSA',
  projectRefId: 5,
  ttaProjectName: 'TTF Trials',
  season: 'Season 6',
  description: 'Football trials for girls in rural Bihar.',
  sanctionedAmount: '500000.00',
  status: 'Active',
};

const TRIAL = {
  id: 9,
  trialName: 'Ranchi Trial',
  trialCode: 'TRL-S6-TTF-001',
  season: 'Season 6',
  status: 'Active',
  cityCount: 3,
  firstCityDate: '2026-11-01',
  lastCityDate: '2026-11-03',
};

beforeEach(() => {
  jest.clearAllMocks();
  csrAPI.projects.getById.mockResolvedValue(GRANT);
  csrAPI.activities.getAll.mockResolvedValue([]);
  csrAPI.reports.getAll.mockResolvedValue([]);
  csrAPI.contacts.getAll.mockResolvedValue([]);
  csrAPI.activityTypes.getAll.mockResolvedValue([]);
  csrAPI.expenseTags.getAll.mockResolvedValue([]);
  csrAPI.grantTrials.mockResolvedValue([TRIAL]);
});

test('the section heading is the client\'s sentence, exactly', async () => {
  render(<CSRProjectDetailPage />);
  const heading = await screen.findByRole('heading', { name: HEADING });
  expect(heading).toHaveTextContent(new RegExp(`^${HEADING}$`));
  expect(screen.queryByText(/runs under/i)).not.toBeInTheDocument();
});

test('the trials are fetched for this grant id', async () => {
  render(<CSRProjectDetailPage />);
  await screen.findByText('Ranchi Trial');
  expect(csrAPI.grantTrials).toHaveBeenCalledTimes(1);
  expect(csrAPI.grantTrials).toHaveBeenCalledWith(42);
});

test('lists each trial with its code, season, status and cities', async () => {
  render(<CSRProjectDetailPage />);
  expect(await screen.findByText('Ranchi Trial')).toBeInTheDocument();
  expect(screen.getByText('TRL-S6-TTF-001')).toBeInTheDocument();
  expect(screen.getByText('3 cities')).toBeInTheDocument();
  expect(screen.getAllByText('Season 6').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
});

test('reads funder, then description, then the trials', async () => {
  render(<CSRProjectDetailPage />);
  const heading = await screen.findByRole('heading', { name: HEADING });
  const funder = screen.getByRole('heading', { name: 'BDSA' });
  const description = screen.getByText(GRANT.description);
  const follows = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
  expect(follows(funder, description)).toBe(true);
  expect(follows(description, heading)).toBe(true);
});

test('an unlinked grant says to link it, and does not call the API', async () => {
  csrAPI.projects.getById.mockResolvedValue({ ...GRANT, projectRefId: null, ttaProjectName: '' });
  render(<CSRProjectDetailPage />);
  expect(
    await screen.findByText('Link this grant to a TTA project to list its trials'),
  ).toBeInTheDocument();
  expect(csrAPI.grantTrials).not.toHaveBeenCalled();
});

test('a linked grant with no trials says so, naming the project', async () => {
  csrAPI.grantTrials.mockResolvedValue([]);
  render(<CSRProjectDetailPage />);
  expect(
    await screen.findByText('No trials found for TTF Trials · Season 6'),
  ).toBeInTheDocument();
});

test('a failed load is an error with a retry, never "no trials"', async () => {
  csrAPI.grantTrials.mockRejectedValueOnce(new Error('Server error'));
  render(<CSRProjectDetailPage />);
  const alert = await screen.findByText(/Could not load the trials for this grant/);
  expect(alert).toBeInTheDocument();
  expect(screen.queryByText(/No trials found/)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('Ranchi Trial')).toBeInTheDocument();
  expect(csrAPI.grantTrials).toHaveBeenCalledTimes(2);
});

test('while loading it says loading, not "no trials"', async () => {
  csrAPI.grantTrials.mockReturnValue(new Promise(() => {}));
  render(<CSRProjectDetailPage />);
  // Settle every update the request triggered, so this is the state the
  // screen holds while the request is outstanding, not a passing frame.
  await waitFor(() => expect(csrAPI.grantTrials).toHaveBeenCalled());
  await act(() => Promise.resolve());
  expect(screen.getByText('Loading trials…')).toBeInTheDocument();
  expect(screen.queryByText(/No trials found/)).not.toBeInTheDocument();
});

test('a grant with no season says every season is listed', async () => {
  csrAPI.projects.getById.mockResolvedValue({ ...GRANT, season: '' });
  render(<CSRProjectDetailPage />);
  await waitFor(() => expect(csrAPI.grantTrials).toHaveBeenCalled());
  expect(await screen.findByText(/no season set, so trials from every season/)).toBeInTheDocument();
});
