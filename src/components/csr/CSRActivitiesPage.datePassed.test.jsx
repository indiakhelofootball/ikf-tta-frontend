// D-018: a Planned activity whose date has passed (the server's needsUpdate)
// asks staff what became of it, on the cross-grant Activities log.
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CSRActivitiesPage from './CSRActivitiesPage';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ __esModule: true, useNavigate: () => mockNavigate }), {
  virtual: true,
});

jest.mock('../../services/api', () => ({
  csrAPI: {
    activities: { getAll: jest.fn(), patch: jest.fn() },
    projects: { getAll: jest.fn() },
    activityTypes: { getAll: jest.fn() },
  },
}));

let mockCanEdit = true;
jest.mock('../../auth/useGrants', () => ({
  __esModule: true,
  default: () => ({ isSuper: false, canView: () => true, canEdit: () => mockCanEdit, permsLoading: false }),
}));

const { csrAPI } = require('../../services/api');

const PROMPT = 'Date passed — did this happen?';
const ACTS = [
  { id: 1, title: 'Overdue trial', startDate: '2026-09-01', status: 'Planned', needsUpdate: true, projectId: 7 },
  { id: 2, title: 'Upcoming trial', startDate: '2026-09-02', status: 'Planned', needsUpdate: false, projectId: 7 },
  { id: 3, title: 'Done trial', startDate: '2026-09-03', status: 'Completed', needsUpdate: false, projectId: 7 },
  { id: 4, title: 'Called off', startDate: '2026-09-04', status: 'Cancelled', needsUpdate: false, projectId: 7 },
];

const group = (title) => screen.queryByRole('group', { name: `Date passed for ${title}` });

beforeEach(() => {
  jest.clearAllMocks();
  mockCanEdit = true;
  csrAPI.activities.getAll.mockResolvedValue(ACTS);
  csrAPI.projects.getAll.mockResolvedValue([{ id: 7, name: 'Khelo Girls' }]);
  csrAPI.activityTypes.getAll.mockResolvedValue([]);
  csrAPI.activities.patch.mockResolvedValue({});
});

test('only the Planned row the server flags carries the prompt', async () => {
  render(<CSRActivitiesPage />);
  await screen.findByText('Overdue trial');
  expect(screen.getAllByText(PROMPT)).toHaveLength(1);
  expect(group('Overdue trial')).toHaveTextContent(PROMPT);
  expect(group('Upcoming trial')).toBeNull();
  expect(group('Done trial')).toBeNull();
  expect(group('Called off')).toBeNull();
});

test('a view-only user sees no prompt', async () => {
  mockCanEdit = false;
  render(<CSRActivitiesPage />);
  await screen.findByText('Overdue trial');
  expect(screen.queryByText(PROMPT)).toBeNull();
});

test.each([
  ['Mark completed', 'Completed'],
  ['Cancelled', 'Cancelled'],
])('%s saves the status alone, then re-reads the list', async (button, status) => {
  render(<CSRActivitiesPage />);
  await screen.findByText('Overdue trial');
  expect(csrAPI.activities.getAll).toHaveBeenCalledTimes(1);
  csrAPI.activities.getAll.mockResolvedValue(
    ACTS.map((a) => (a.id === 1 ? { ...a, status, needsUpdate: false } : a)),
  );

  await userEvent.click(within(group('Overdue trial')).getByRole('button', { name: button }));

  expect(csrAPI.activities.patch).toHaveBeenCalledTimes(1);
  expect(csrAPI.activities.patch).toHaveBeenCalledWith(1, { status });
  await waitFor(() => expect(csrAPI.activities.getAll).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.queryByText(PROMPT)).toBeNull());
  expect(mockNavigate).not.toHaveBeenCalled();
});

test('Change date opens the edit form and saves nothing', async () => {
  render(<CSRActivitiesPage />);
  await screen.findByText('Overdue trial');
  await userEvent.click(within(group('Overdue trial')).getByRole('button', { name: 'Change date' }));
  expect(mockNavigate).toHaveBeenCalledWith('/csr/activities/1/edit');
  expect(csrAPI.activities.patch).not.toHaveBeenCalled();
});

test('a failed save says so and keeps the prompt', async () => {
  csrAPI.activities.patch.mockRejectedValue(new Error('Server said no'));
  render(<CSRActivitiesPage />);
  await screen.findByText('Overdue trial');
  await userEvent.click(within(group('Overdue trial')).getByRole('button', { name: 'Mark completed' }));
  expect(await screen.findByText('Server said no')).toBeInTheDocument();
  expect(group('Overdue trial')).toBeInTheDocument();
});

test('a Cancelled row reads Cancelled, without the finished-activity chip', async () => {
  render(<CSRActivitiesPage />);
  await screen.findByText('Called off');
  const row = screen.getByRole('button', { name: /Open Called off/ });
  const pill = within(row).getByText('Cancelled');
  expect(pill).toHaveClass('pill', 'plain');
  expect(pill).not.toHaveClass('closed');
  expect(within(screen.getByRole('button', { name: /Open Done trial/ })).getByText('Completed'))
    .toHaveClass('pill', 'closed');
});
