// The Projects card counted the rows of trialsAPI.getAll(), and that list is
// paginated at 20, so it could never read more than 20, and its "active" line
// counted only those 20. It now reads the server's totals.

import React from 'react';
import { render, screen, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { trialsAPI, repAPI, vendorsAPI, workOrdersAPI, paymentRequestsAPI } from '../../services/api';

// react-router-dom v7 does not resolve under jest in this repo, so the mock is virtual.
jest.mock('react-router-dom', () => ({ __esModule: true, useNavigate: () => jest.fn() }), {
  virtual: true,
});

let mockAuth;
jest.mock('../../auth/AuthContext', () => ({ useAuth: () => mockAuth }));

jest.mock('../../services/api', () => ({
  trialsAPI: { getAll: jest.fn() },
  repAPI: { getOptions: jest.fn() },
  vendorsAPI: { getOptions: jest.fn() },
  workOrdersAPI: { getAll: jest.fn() },
  paymentRequestsAPI: { getAll: jest.fn() },
}));

const DashboardHome = require('./DashboardHome').default;

const rows = (n, status) => Array.from({ length: n }, (_, i) => ({ id: i + 1, status }));

// What the paginated backend returns: at most `limit` rows (20 by default) and
// the true total. 154 projects on file, 37 of them Active, none Scheduled.
const trialsBackend = (filters = {}) => {
  const limit = filters.limit || 20;
  if (filters.status === 'Active') return Promise.resolve({ trials: rows(Math.min(limit, 37), 'Active'), total: 37, page: 1, limit });
  if (filters.status === 'Scheduled') return Promise.resolve({ trials: [], total: 0, page: 1, limit });
  // First page of everything: only 5 of its 20 rows are Active.
  const page = [...rows(5, 'Active'), ...rows(15, 'Draft')].slice(0, limit);
  return Promise.resolve({ trials: page, total: 154, page: 1, limit });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth = {
    user: { name: 'Admin', role: 'SUPER_ADMIN', email: 'a@example.com' },
    perms: { isSuperAdmin: true, grants: {} },
    permsLoading: false,
  };
  trialsAPI.getAll.mockImplementation(trialsBackend);
  repAPI.getOptions.mockResolvedValue({ reps: rows(81) });
  vendorsAPI.getOptions.mockResolvedValue({ vendors: [], total: 3 });
  workOrdersAPI.getAll.mockResolvedValue({ workOrders: [] });
  paymentRequestsAPI.getAll.mockResolvedValue({ paymentRequests: [] });
});

// Quick Actions repeat some labels as buttons, so a card is found from its label
// only once the stats have rendered.
const cardOf = (label) =>
  // eslint-disable-next-line testing-library/no-node-access
  screen.queryAllByText(label).map((el) => el.closest('.MuiCard-root')).find(Boolean);

const renderStats = async () => {
  render(<DashboardHome />);
  await waitFor(() => expect(cardOf('Projects')).toBeTruthy());
};

test('154 projects on file with a first page of 20 shows 154, not 20', async () => {
  await renderStats();
  const card = cardOf('Projects');
  await waitFor(() => expect(within(card).getByText('154')).toBeInTheDocument());
  expect(within(card).queryByText('20')).not.toBeInTheDocument();
});

test('the active line is the server total for Active plus Scheduled, not a count of one page', async () => {
  await renderStats();
  const card = cardOf('Projects');
  await waitFor(() => expect(within(card).getByText('37 active')).toBeInTheDocument());
  expect(within(card).queryByText('5 active')).not.toBeInTheDocument();
});

test('the counts ask for one-row pages, filtered by exactly the statuses the card always counted', async () => {
  await renderStats();
  await waitFor(() => expect(trialsAPI.getAll).toHaveBeenCalledTimes(3));
  const asked = trialsAPI.getAll.mock.calls.map(([f]) => f);
  expect(asked).toEqual(expect.arrayContaining([
    { limit: 1 },
    { status: 'Active', limit: 1 },
    { status: 'Scheduled', limit: 1 },
  ]));
});

test('a count that fails says so with Retry instead of a number', async () => {
  trialsAPI.getAll.mockImplementation((f = {}) => (
    f.status === 'Active' ? Promise.reject(new Error('Network error')) : trialsBackend(f)
  ));
  await renderStats();
  const card = cardOf('Projects');
  await waitFor(() => expect(within(card).getByText("Couldn't load.")).toBeInTheDocument());
  expect(within(card).queryByText('154')).not.toBeInTheDocument();
  expect(within(card).getByRole('button', { name: 'Retry loading Projects' })).toBeInTheDocument();
});

test('an answer without a total is a failed count, never 0', async () => {
  trialsAPI.getAll.mockResolvedValue({ trials: rows(20, 'Active') });
  await renderStats();
  const card = cardOf('Projects');
  await waitFor(() => expect(within(card).getByText("Couldn't load.")).toBeInTheDocument());
  expect(within(card).queryByText('0')).not.toBeInTheDocument();
  expect(within(card).queryByText('20')).not.toBeInTheDocument();
});

test('unchanged: the other cards make the same calls and show the same numbers', async () => {
  workOrdersAPI.getAll.mockResolvedValue({ workOrders: [{ status: 'Active' }, { status: 'Cancelled' }, { status: 'Completed' }], total: 3 });
  paymentRequestsAPI.getAll.mockResolvedValue({ paymentRequests: [{ status: 'Draft' }, { status: 'Payment Done' }], total: 2 });
  await renderStats();

  const reps = cardOf('REPs');
  await waitFor(() => expect(within(reps).getByText('81')).toBeInTheDocument());
  expect(within(reps).getByText('registered')).toBeInTheDocument();
  const vendors = cardOf('Vendors');
  expect(within(vendors).getByText('3')).toBeInTheDocument();
  expect(within(vendors).getByText('total')).toBeInTheDocument();
  const wos = cardOf('Work Orders');
  expect(within(wos).getByText('3')).toBeInTheDocument();
  expect(within(wos).getByText('1 active')).toBeInTheDocument();
  const prs = cardOf('Payment Requests');
  expect(within(prs).getByText('2')).toBeInTheDocument();
  expect(within(prs).getByText('1 pending')).toBeInTheDocument();

  expect(repAPI.getOptions).toHaveBeenCalledTimes(1);
  expect(repAPI.getOptions).toHaveBeenCalledWith();
  expect(vendorsAPI.getOptions).toHaveBeenCalledTimes(1);
  expect(vendorsAPI.getOptions).toHaveBeenCalledWith();
  expect(workOrdersAPI.getAll).toHaveBeenCalledTimes(1);
  expect(workOrdersAPI.getAll).toHaveBeenCalledWith();
  expect(paymentRequestsAPI.getAll).toHaveBeenCalledTimes(1);
  expect(paymentRequestsAPI.getAll).toHaveBeenCalledWith();
});
