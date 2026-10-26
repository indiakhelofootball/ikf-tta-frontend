// A2: the Dashboard's New Project opens the new-grant form, and only for
// someone who may create one -- the same rule the Projects page applies to
// its own button.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CSRDashboard from './CSRDashboard';

const mockNavigate = jest.fn();
let mockCanEdit = true;

jest.mock('react-router-dom', () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
}), { virtual: true });

jest.mock('../../auth/useGrants', () => ({
  __esModule: true,
  default: () => ({ canView: () => true, canEdit: () => mockCanEdit }),
}));

jest.mock('../../services/api', () => ({
  csrAPI: {
    projects: { getAll: jest.fn() },
    deliverables: { getAll: jest.fn() },
    activities: { getAll: jest.fn() },
    reports: { getAll: jest.fn() },
    utilisationCertificate: jest.fn(),
  },
}));

const { csrAPI } = require('../../services/api');

beforeEach(() => {
  jest.clearAllMocks();
  csrAPI.projects.getAll.mockResolvedValue([]);
  csrAPI.deliverables.getAll.mockResolvedValue([]);
  csrAPI.activities.getAll.mockResolvedValue([]);
  csrAPI.reports.getAll.mockResolvedValue([]);
  csrAPI.utilisationCertificate.mockResolvedValue({ totalUtilised: '0', excludedItems: [] });
});

test('New Project opens the new-grant form, not the list', async () => {
  mockCanEdit = true;
  render(<CSRDashboard />);
  fireEvent.click(await screen.findByRole('button', { name: 'New Project' }));
  expect(mockNavigate).toHaveBeenCalledWith('/csr/projects/new');
});

test('a view-only user is not offered New Project, and keeps the other shortcuts', async () => {
  mockCanEdit = false;
  render(<CSRDashboard />);
  expect(await screen.findByRole('button', { name: 'Activities' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'New Project' })).toBeNull();
});
