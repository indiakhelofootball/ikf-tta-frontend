// The REPs card used to show repAPI.getAll().reps.length, and that list is
// paginated at 20, so it read 20 with 81 REPs on file. It now counts
// /reps/options/, which returns every REP without logos or MoUs.

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
  repAPI: { getAll: jest.fn(), getOptions: jest.fn() },
  vendorsAPI: { getAll: jest.fn() },
  workOrdersAPI: { getAll: jest.fn() },
  paymentRequestsAPI: { getAll: jest.fn() },
}));

const DashboardHome = require('./DashboardHome').default;

const makeReps = (n) =>
  Array.from({ length: n }, (_, i) => ({ id: i + 1, repName: `REP ${i + 1}`, cityAssignments: [], hasLogo: false }));

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth = {
    user: { name: 'Admin', role: 'SUPER_ADMIN', email: 'a@example.com' },
    perms: { isSuperAdmin: true, grants: {} },
    permsLoading: false,
  };
  trialsAPI.getAll.mockResolvedValue({ trials: [] });
  vendorsAPI.getAll.mockResolvedValue({ vendors: [], total: 3 });
  workOrdersAPI.getAll.mockResolvedValue({ workOrders: [] });
  paymentRequestsAPI.getAll.mockResolvedValue({ paymentRequests: [] });
  repAPI.getOptions.mockResolvedValue({ reps: makeReps(81) });
  // What the old call returned: the first page of 20.
  repAPI.getAll.mockResolvedValue({ reps: makeReps(20), total: 81 });
});

// Quick Actions repeat some labels as buttons, so find the label that sits in a
// stat card, and wait until the stats have actually rendered.
const statCard = (label) =>
  waitFor(() => {
    const card = screen.queryAllByText(label).map((el) => el.closest('.MuiCard-root')).find(Boolean);
    expect(card).toBeTruthy();
    return card;
  });

test('the REPs card shows every REP returned by getOptions (81), not the first page (20)', async () => {
  render(<DashboardHome />);
  const card = await statCard('REPs');
  expect(within(card).getByText('81')).toBeInTheDocument();
  expect(within(card).queryByText('20')).not.toBeInTheDocument();
  expect(repAPI.getOptions).toHaveBeenCalledTimes(1);
  expect(repAPI.getAll).not.toHaveBeenCalled();
});

test('the other counts are unchanged (vendors still come from the list total)', async () => {
  render(<DashboardHome />);
  const vendorsCard = await statCard('Vendors');
  expect(within(vendorsCard).getByText('3')).toBeInTheDocument();
  expect(vendorsAPI.getAll).toHaveBeenCalledWith({ limit: 1 });
});

test('without view access to REPs, neither REP endpoint is called and no card renders', async () => {
  mockAuth = {
    user: { name: 'Staff', role: 'ADMIN', email: 's@example.com' },
    perms: { isSuperAdmin: false, grants: { trials: { can_view: true } } },
    permsLoading: false,
  };
  render(<DashboardHome />);
  await statCard('Projects');
  expect(screen.queryByText('REPs')).not.toBeInTheDocument();
  expect(repAPI.getOptions).not.toHaveBeenCalled();
  expect(repAPI.getAll).not.toHaveBeenCalled();
});
