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

// Owner, 14 Oct 2026: "In activities, activity type are not shown" and "TTA
// project by which it linked are not shown". The names come on the activity
// itself, so they show even when the type catalog lookup returns nothing.
describe('the names an activity carries', () => {
  const NAMED = {
    ...ACTIVITY,
    projectName: 'Khelo Girls Initiative — Chhattisgarh',
    activityTypeId: 4,
    activityTypeName: 'District Trial',
    ttaProject: 'IKF Season 6 Trials',
    season: 'Season 6',
    linkedTrialId: 12,
    linkedTrialCode: 'TR-2026-012',
  };

  beforeEach(() => {
    csrAPI.activities.getAll.mockResolvedValue([NAMED]);
  });

  test('the row has a Type column showing the type name', async () => {
    render(<CSRActivitiesPage />);
    expect(await screen.findByText('Type')).toBeInTheDocument();
    const row = await screen.findByRole('button', { name: /Open Bhilai Trial/i });
    expect(row).toHaveTextContent('District Trial');
  });

  test('the grant cell names the TTA project and season under the grant', async () => {
    render(<CSRActivitiesPage />);
    const row = await screen.findByRole('button', { name: /Open Bhilai Trial/i });
    expect(row).toHaveTextContent('Khelo Girls Initiative — Chhattisgarh');
    expect(row).toHaveTextContent('IKF Season 6 Trials · Season 6');
  });

  test('the detail shows the trial code and the TTA project', async () => {
    render(<CSRActivitiesPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Show details for Bhilai Trial/i }));
    expect(screen.getByText('TR-2026-012')).toBeInTheDocument();
    expect(screen.queryByText('Trial #12')).toBeNull();
    expect(screen.getByText('TTA project')).toBeInTheDocument();
  });

  test('an activity with no TTA project says so in the detail', async () => {
    csrAPI.activities.getAll.mockResolvedValue([
      { ...NAMED, ttaProject: '', season: '', linkedTrialId: null, linkedTrialCode: '' },
    ]);
    render(<CSRActivitiesPage />);
    fireEvent.click(await screen.findByRole('button', { name: /Show details for Bhilai Trial/i }));
    expect(screen.getByText('Not linked to a TTA project')).toBeInTheDocument();
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  test('search matches the type name and the TTA project', async () => {
    csrAPI.activities.getAll.mockResolvedValue([
      NAMED,
      { ...ACTIVITY, id: 2, title: 'Nashik Workshop', activityTypeName: 'Career Workshop', ttaProject: '', season: '' },
    ]);
    render(<CSRActivitiesPage />);
    const box = await screen.findByLabelText('Search activities');

    fireEvent.change(box, { target: { value: 'career workshop' } });
    expect(screen.queryByRole('button', { name: /Open Bhilai Trial/i })).toBeNull();
    expect(screen.getByRole('button', { name: /Open Nashik Workshop/i })).toBeInTheDocument();

    fireEvent.change(box, { target: { value: 'season 6 trials' } });
    expect(screen.getByRole('button', { name: /Open Bhilai Trial/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Open Nashik Workshop/i })).toBeNull();
  });
});

describe('a failed load', () => {
  test('shows the error with Retry and never the empty-state copy', async () => {
    csrAPI.activities.getAll.mockRejectedValueOnce(new Error('Server error (502)'));
    render(<CSRActivitiesPage />);

    expect(await screen.findByText('Server error (502)')).toBeInTheDocument();
    expect(screen.queryByText('Nothing logged yet')).not.toBeInTheDocument();
    expect(screen.queryByText('No activities match')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('button', { name: /Open Bhilai Trial/i })).toBeInTheDocument();
    expect(screen.queryByText('Server error (502)')).not.toBeInTheDocument();
  });

  test('unchanged: a log that loads empty still says "Nothing logged yet"', async () => {
    csrAPI.activities.getAll.mockResolvedValue([]);
    render(<CSRActivitiesPage />);
    expect(await screen.findByText('Nothing logged yet')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });
});

// A5: "Delivered in-house" is a fact only when Delivered By says Self. A blank
// Delivered By, or Partner with no partner named, is unknown and must say so.
test('a blank Delivered By says Not set, never Delivered in-house', async () => {
  csrAPI.activities.getAll.mockResolvedValue([
    { ...ACTIVITY, deliveryMode: '', partnerId: null, partnerName: '' },
    { ...ACTIVITY, id: 2, title: 'Nashik Trial', deliveryMode: 'Partner', partnerId: null, partnerName: '' },
    { ...ACTIVITY, id: 3, title: 'Raipur Trial', deliveryMode: 'Self', partnerId: null, partnerName: '' },
  ]);
  render(<CSRActivitiesPage />);
  for (const name of [/Show details for Bhilai Trial/i, /Show details for Nashik Trial/i, /Show details for Raipur Trial/i]) {
    // eslint-disable-next-line no-await-in-loop
    fireEvent.click(await screen.findByRole('button', { name }));
  }
  // eslint-disable-next-line testing-library/no-node-access
  const partnerValues = screen.getAllByText('Partner', { selector: '.dk' }).map((el) => el.nextSibling.textContent);
  expect(partnerValues).toEqual(['Not set', 'Not set', 'Delivered in-house']);
});
