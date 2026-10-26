// CP5: a failed load drew "Project not found." with no way back in, and a
// failed list drew as "No activities yet". A failure must say it failed and
// offer a retry; only a 404 from the grant itself means the grant is gone.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

const GRANT = { id: 42, name: 'Test project', clientName: 'BDSA', projectRefId: null };
const ACTIVITY = {
  id: 1, title: 'Ranchi camp', date: '2026-09-01', status: 'Completed',
  activityTypeId: 3, activityTypeName: 'Camp', projectId: 42,
};

const httpError = (status, message = 'Request failed') => {
  const err = new Error(message);
  err.response = { status, data: {} };
  return err;
};

beforeEach(() => {
  jest.clearAllMocks();
  csrAPI.projects.getById.mockResolvedValue(GRANT);
  csrAPI.activities.getAll.mockResolvedValue([]);
  csrAPI.reports.getAll.mockResolvedValue([]);
  csrAPI.contacts.getAll.mockResolvedValue([]);
  csrAPI.activityTypes.getAll.mockResolvedValue([]);
  csrAPI.expenseTags.getAll.mockResolvedValue([]);
  csrAPI.athletes.getAll.mockResolvedValue([]);
  csrAPI.grantTrials.mockResolvedValue([]);
});

test('a server error on the grant is a load failure with Retry, not "not found"', async () => {
  csrAPI.projects.getById.mockRejectedValueOnce(httpError(502, 'Bad gateway'));
  render(<CSRProjectDetailPage />);

  expect(await screen.findByText('Could not load this grant.')).toBeInTheDocument();
  expect(screen.queryByText('Project not found.')).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect((await screen.findAllByText('BDSA')).length).toBeGreaterThan(0);
  expect(csrAPI.projects.getById).toHaveBeenCalledTimes(2);
  expect(screen.queryByText('Could not load this grant.')).not.toBeInTheDocument();
});

test('a network failure (no HTTP status) is a load failure too', async () => {
  csrAPI.projects.getById.mockRejectedValueOnce(new Error('Failed to fetch'));
  render(<CSRProjectDetailPage />);
  expect(await screen.findByText('Could not load this grant.')).toBeInTheDocument();
  expect(screen.queryByText('Project not found.')).not.toBeInTheDocument();
});

test('a 404 on the grant still reads "Project not found." with Back and no Retry', async () => {
  csrAPI.projects.getById.mockRejectedValueOnce(httpError(404, 'Not found.'));
  render(<CSRProjectDetailPage />);
  expect(await screen.findByText('Project not found.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  expect(screen.queryByText('Could not load this grant.')).not.toBeInTheDocument();
});

test('a failed activity-type catalogue does not take the grant down', async () => {
  csrAPI.activities.getAll.mockResolvedValue([ACTIVITY]);
  csrAPI.activityTypes.getAll.mockRejectedValue(httpError(500));
  render(<CSRProjectDetailPage />);

  expect((await screen.findAllByText('BDSA')).length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole('tab', { name: 'Activities (1)' }));
  expect(screen.getByText('Ranchi camp')).toBeInTheDocument();
  expect(screen.getByText('Camp')).toBeInTheDocument();
});

test('a failed activity list says so in its tab, never "No activities yet"', async () => {
  csrAPI.activities.getAll.mockRejectedValueOnce(httpError(500));
  render(<CSRProjectDetailPage />);

  expect((await screen.findAllByText('BDSA')).length).toBeGreaterThan(0);
  // The tab label carries no count it does not have.
  const tab = screen.getByRole('tab', { name: 'Activities' });
  fireEvent.click(tab);
  expect(screen.getByText('Could not load activities.')).toBeInTheDocument();
  expect(screen.queryByText('No activities yet')).not.toBeInTheDocument();

  csrAPI.activities.getAll.mockResolvedValue([ACTIVITY]);
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText('Ranchi camp')).toBeInTheDocument();
  expect(screen.queryByText('Could not load activities.')).not.toBeInTheDocument();
});

test('failed reports and contacts lists say so too', async () => {
  csrAPI.reports.getAll.mockRejectedValueOnce(httpError(500));
  csrAPI.contacts.getAll.mockRejectedValueOnce(httpError(500));
  render(<CSRProjectDetailPage />);

  expect((await screen.findAllByText('BDSA')).length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole('tab', { name: 'Contacts' }));
  expect(screen.getByText('Could not load contacts.')).toBeInTheDocument();
  expect(screen.queryByText('No contacts yet')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('tab', { name: 'Reports' }));
  expect(screen.getByText('Could not load reports.')).toBeInTheDocument();
  expect(screen.queryByText('No reports yet')).not.toBeInTheDocument();
});

test('unchanged: lists that load empty still read as empty, with their counts', async () => {
  render(<CSRProjectDetailPage />);
  expect((await screen.findAllByText('BDSA')).length).toBeGreaterThan(0);

  fireEvent.click(screen.getByRole('tab', { name: 'Contacts (0)' }));
  expect(screen.getByText('No contacts yet')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Activities (0)' }));
  expect(screen.getByText('No activities yet')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('tab', { name: 'Reports (0)' }));
  expect(screen.getByText('No reports yet')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
});
