// D-018 on the grant page: the date-passed prompt on the Activities tab, the
// funder label for Cancelled and date-passed rows, and Preview as funder.
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CSRProjectDetailPage from './CSRProjectDetailPage';

const mockNavigate = jest.fn();
let mockTab = 2;
jest.mock('react-router-dom', () => ({
  __esModule: true,
  useParams: () => ({ id: '42' }),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/csr/42', state: { tab: mockTab } }),
}), { virtual: true });

jest.mock('../../services/api', () => ({
  csrAPI: {
    projects: { getById: jest.fn() },
    activities: { getAll: jest.fn(), patch: jest.fn() },
    reports: { getAll: jest.fn() },
    contacts: { getAll: jest.fn() },
    activityTypes: { getAll: jest.fn() },
    expenseTags: { getAll: jest.fn() },
    grantTrials: jest.fn(),
  },
}));

let mockCanEdit = true;
jest.mock('../../auth/useGrants', () => ({
  __esModule: true,
  default: () => ({
    isSuper: false, canView: (m) => m === 'csr', canEdit: () => mockCanEdit, permsLoading: false,
  }),
}));

jest.mock('../../utils/certificatePdf', () => ({ downloadCertificatePdf: jest.fn() }));

const { csrAPI } = require('../../services/api');

const PROMPT = 'Date passed — did this happen?';
const ACTS = [
  { id: 1, title: 'Overdue trial', status: 'Planned', visibleToClient: true, needsUpdate: true },
  { id: 2, title: 'Upcoming trial', status: 'Planned', visibleToClient: true, needsUpdate: false },
  { id: 3, title: 'Done trial', status: 'Completed', visibleToClient: true, needsUpdate: false },
  { id: 4, title: 'Called off', status: 'Cancelled', visibleToClient: true, needsUpdate: false },
];

const group = (title) => screen.queryByRole('group', { name: `Date passed for ${title}` });

beforeEach(() => {
  jest.clearAllMocks();
  mockCanEdit = true;
  mockTab = 2;
  csrAPI.projects.getById.mockResolvedValue({
    id: 42, name: 'Test project', clientName: 'BDSA', status: 'Active', sanctionedAmount: '0',
  });
  csrAPI.activities.getAll.mockResolvedValue(ACTS);
  csrAPI.activities.patch.mockResolvedValue({});
  csrAPI.reports.getAll.mockResolvedValue([]);
  csrAPI.contacts.getAll.mockResolvedValue([]);
  csrAPI.activityTypes.getAll.mockResolvedValue([]);
  csrAPI.expenseTags.getAll.mockResolvedValue([]);
  csrAPI.grantTrials.mockResolvedValue([]);
});

test('only the Planned row the server flags carries the prompt', async () => {
  render(<CSRProjectDetailPage />);
  await screen.findByText('Overdue trial');
  expect(screen.getAllByText(PROMPT)).toHaveLength(1);
  expect(group('Overdue trial')).toHaveTextContent(PROMPT);
  expect(group('Upcoming trial')).toBeNull();
  expect(group('Done trial')).toBeNull();
  expect(group('Called off')).toBeNull();
});

test('a view-only user sees no prompt', async () => {
  mockCanEdit = false;
  render(<CSRProjectDetailPage />);
  await screen.findByText('Overdue trial');
  expect(screen.queryByText(PROMPT)).toBeNull();
});

test.each([
  ['Mark completed', 'Completed'],
  ['Cancelled', 'Cancelled'],
])('%s saves the status alone, then re-reads this grant\'s activities', async (button, status) => {
  render(<CSRProjectDetailPage />);
  await screen.findByText('Overdue trial');
  expect(csrAPI.activities.getAll).toHaveBeenCalledTimes(1);
  csrAPI.activities.getAll.mockResolvedValue(
    ACTS.map((a) => (a.id === 1 ? { ...a, status, needsUpdate: false } : a)),
  );

  await userEvent.click(within(group('Overdue trial')).getByRole('button', { name: button }));

  expect(csrAPI.activities.patch).toHaveBeenCalledTimes(1);
  expect(csrAPI.activities.patch).toHaveBeenCalledWith(1, { status });
  await waitFor(() => expect(csrAPI.activities.getAll).toHaveBeenCalledTimes(2));
  expect(csrAPI.activities.getAll).toHaveBeenLastCalledWith({ project: '42' });
  await waitFor(() => expect(screen.queryByText(PROMPT)).toBeNull());
  // Only the activity list is re-read, not the whole grant.
  expect(csrAPI.projects.getById).toHaveBeenCalledTimes(1);
});

test('Change date opens the edit form and saves nothing', async () => {
  render(<CSRProjectDetailPage />);
  await screen.findByText('Overdue trial');
  await userEvent.click(within(group('Overdue trial')).getByRole('button', { name: 'Change date' }));
  expect(mockNavigate).toHaveBeenCalledWith('/csr/activities/1/edit');
  expect(csrAPI.activities.patch).not.toHaveBeenCalled();
});

test('a failed save is reported and the prompt stays', async () => {
  csrAPI.activities.patch.mockRejectedValue(new Error('Server said no'));
  render(<CSRProjectDetailPage />);
  await screen.findByText('Overdue trial');
  await userEvent.click(within(group('Overdue trial')).getByRole('button', { name: 'Cancelled' }));
  expect(await screen.findByText('Server said no')).toBeInTheDocument();
  expect(group('Overdue trial')).toBeInTheDocument();
});

test('funder labels: Cancelled and date-passed Planned are hidden', async () => {
  mockCanEdit = false;
  render(<CSRProjectDetailPage />);
  await screen.findByText('Overdue trial');
  const row = (title) => screen.getAllByRole('button', { name: `Show details for activity ${title}` })[0];
  expect(row('Overdue trial')).toHaveTextContent('Hidden from funder');
  expect(row('Upcoming trial')).toHaveTextContent('Shown to funder');
  expect(row('Done trial')).toHaveTextContent('Shown to funder');
  expect(row('Called off')).toHaveTextContent('Hidden from funder');
  const pill = within(row('Called off')).getByText('Cancelled');
  expect(pill).toHaveClass('pill', 'plain');
  expect(pill).not.toHaveClass('closed');
});

test('Preview as funder opens the preview route for this grant', async () => {
  mockTab = 0;
  render(<CSRProjectDetailPage />);
  await userEvent.click(await screen.findByRole('button', { name: 'Preview as funder' }));
  expect(mockNavigate).toHaveBeenCalledWith('/csr/42/funder-preview');
});

test('Preview as funder is there for a view-only user too', async () => {
  mockTab = 0;
  mockCanEdit = false;
  render(<CSRProjectDetailPage />);
  expect(await screen.findByRole('button', { name: 'Preview as funder' })).toBeInTheDocument();
});
