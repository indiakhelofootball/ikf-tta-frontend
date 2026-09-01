// Companion to CSRActivitiesPage.test.jsx, for the same defect: "i click
// anything it stays there in the project the active bar and nothing was
// changed. nothing is opening". On this page only the grant cell was clickable
// and it opened the project's Overview tab, not the Reports tab where the file
// actually is. The row carries a document link, so the row is role="button"
// rather than a real <button> — an <a> cannot live inside one — and the link
// has to keep its own click.
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CSRReportsPage from './CSRReportsPage';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({ __esModule: true, useNavigate: () => mockNavigate }), {
  virtual: true,
});

jest.mock('../../services/api', () => ({
  csrAPI: {
    reports: { getAll: jest.fn() },
    projects: { getAll: jest.fn() },
    activities: { getAll: jest.fn() },
  },
}));

jest.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'SUPER_ADMIN' }, perms: null, permsLoading: false }),
}));

const { csrAPI } = require('../../services/api');

const REPORT = {
  id: 1,
  fileName: 'Q2 utilisation summary',
  fileUrl: 'https://drive.example/q2',
  createdAt: '2026-07-14T09:00:00Z',
  // the page opens on the Internal view, which is the not-yet-shared pile
  visibleToClient: false,
  projectId: 7,
  activityId: null,
};

const PROJECT = { id: 7, name: 'Khelo Girls Initiative — Chhattisgarh' };

beforeEach(() => {
  mockNavigate.mockClear();
  csrAPI.reports.getAll.mockResolvedValue([REPORT]);
  csrAPI.projects.getAll.mockResolvedValue([PROJECT]);
  csrAPI.activities.getAll.mockResolvedValue([]);
});

test('clicking a filed report opens its grant on the Reports tab', async () => {
  render(<CSRReportsPage />);

  const row = await screen.findByRole('button', {
    name: /Open Q2 utilisation summary, filed under Khelo Girls Initiative — Chhattisgarh/i,
  });

  fireEvent.click(row);

  expect(mockNavigate).toHaveBeenCalledWith('/csr/7', { state: { tab: 3 } });
});

test('the keyboard opens the row too, since it is not a real button', async () => {
  render(<CSRReportsPage />);

  const row = await screen.findByRole('button', { name: /Open Q2 utilisation summary/i });
  fireEvent.keyDown(row, { key: 'Enter' });

  expect(mockNavigate).toHaveBeenCalledWith('/csr/7', { state: { tab: 3 } });
});

test('the document link opens the document, not the grant', async () => {
  render(<CSRReportsPage />);

  await screen.findByRole('button', { name: /Open Q2 utilisation summary/i });
  fireEvent.click(screen.getByRole('link'));

  expect(mockNavigate).not.toHaveBeenCalled();
});

test('the footer states what is shown versus what is filed in total', async () => {
  render(<CSRReportsPage />);

  await waitFor(() => {
    expect(screen.getByText(/Showing 1 of 1 report filed in total/i)).toBeInTheDocument();
  });
});
