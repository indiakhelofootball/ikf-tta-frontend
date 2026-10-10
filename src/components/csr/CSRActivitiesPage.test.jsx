// The owner's report: "i click anything it stays there in the project the
// active bar and nothing was changed. nothing is opening" — on this page
// every column except the grant name was a static <Box>, and the grant name
// only ever opened the project's Overview tab. This test locks in that the
// whole row is now the affordance, and that it opens the Activities tab (tab
// index 2) where the record actually lives, not tab 0.
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CSRActivitiesPage from './CSRActivitiesPage';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ __esModule: true, useNavigate: () => mockNavigate }), {
  virtual: true,
});

jest.mock('../../services/api', () => ({
  csrAPI: {
    activities: { getAll: jest.fn() },
    projects: { getAll: jest.fn() },
    // The page joins the activity-type catalog to turn activityTypeId into a
    // name in the expanded row. Mocked here so the mock keeps mirroring what
    // the component actually fetches.
    activityTypes: { getAll: jest.fn() },
  },
}));

jest.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'SUPER_ADMIN' }, perms: null, permsLoading: false }),
}));

const { csrAPI } = require('../../services/api');

const ACTIVITY = {
  id: 1,
  title: 'Bhilai Trial — Round 1',
  location: 'Bhilai',
  date: '2026-09-09',
  status: 'Planned',
  projectId: 7,
};

const PROJECT = { id: 7, name: 'Khelo Girls Initiative — Chhattisgarh' };

beforeEach(() => {
  mockNavigate.mockClear();
  csrAPI.activities.getAll.mockResolvedValue([ACTIVITY]);
  csrAPI.projects.getAll.mockResolvedValue([PROJECT]);
  csrAPI.activityTypes.getAll.mockResolvedValue([]);
});

test('clicking a logged activity opens its grant on the Activities tab', async () => {
  render(<CSRActivitiesPage />);

  const row = await screen.findByRole('button', {
    name: /Open Bhilai Trial — Round 1, logged under Khelo Girls Initiative — Chhattisgarh/i,
  });

  fireEvent.click(row);

  expect(mockNavigate).toHaveBeenCalledWith('/csr/7', { state: { tab: 2 } });
});

test('the expanded detail names the partner, not a raw id', async () => {
  csrAPI.activities.getAll.mockResolvedValue([
    { ...ACTIVITY, deliveryMode: 'Partner', partnerId: 3, partnerName: 'A1 Classes' },
    { ...ACTIVITY, id: 2, title: 'Nashik Trial', deliveryMode: 'Self', partnerId: null, partnerName: '' },
  ]);
  render(<CSRActivitiesPage />);

  fireEvent.click(await screen.findByRole('button', { name: /Show details for Bhilai Trial/i }));
  expect(screen.getByText('A1 Classes')).toBeInTheDocument();
  expect(screen.queryByText(/Vendor #/)).toBeNull();

  fireEvent.click(screen.getByRole('button', { name: /Show details for Nashik Trial/i }));
  expect(screen.getByText('Delivered in-house')).toBeInTheDocument();
});

test('the footer states what is shown versus what is logged in total', async () => {
  render(<CSRActivitiesPage />);

  await waitFor(() => {
    expect(screen.getByText(/Showing 1 of 1 activity logged in total/i)).toBeInTheDocument();
  });
});
