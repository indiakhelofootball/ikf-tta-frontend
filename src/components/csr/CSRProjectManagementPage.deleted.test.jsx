// The Deleted filter asks the server for deleted grants (?deleted=true) and
// offers a super admin Restore on each row. Nobody else sees the filter.
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CSRProjectManagementPage from './CSRProjectManagementPage';

jest.mock('react-router-dom', () => ({
  __esModule: true,
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/csr/projects', state: null }),
}), { virtual: true });

jest.mock('../../services/api', () => ({
  csrAPI: {
    projects: { getAll: jest.fn(), restore: jest.fn() },
    workOrders: { getAll: jest.fn() },
  },
}));

let mockRole = 'SUPER_ADMIN';
jest.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { role: mockRole }, perms: null, permsLoading: false }),
}));

const { csrAPI } = require('../../services/api');

const LIVE = [{ id: 1, name: 'Live grant', clientName: 'Acme', status: 'Active' }];
const DELETED = [{ id: 2, name: 'Test grant', clientName: 'Test Funder', status: 'Active', isDeleted: true }];

beforeEach(() => {
  mockRole = 'SUPER_ADMIN';
  csrAPI.projects.getAll.mockReset();
  csrAPI.projects.getAll.mockImplementation((params = {}) =>
    Promise.resolve(params.deleted ? DELETED : LIVE));
  csrAPI.projects.restore.mockReset();
  csrAPI.workOrders.getAll.mockResolvedValue([]);
});

test('Deleted lists the deleted grants and restores one', async () => {
  csrAPI.projects.restore.mockResolvedValue({ ...DELETED[0], isDeleted: false });
  render(<CSRProjectManagementPage />);
  await screen.findByRole('button', { name: /Show Acme/ });
  expect(screen.queryByRole('button', { name: /Restore/ })).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('tab', { name: 'Deleted' }));

  await waitFor(() => expect(csrAPI.projects.getAll).toHaveBeenCalledWith({ deleted: true }));
  fireEvent.click(await screen.findByRole('button', { name: 'Restore Test Funder' }));
  await waitFor(() => expect(csrAPI.projects.restore).toHaveBeenCalledWith(2));
  expect(await screen.findByText('Test Funder restored.')).toBeInTheDocument();
});

test('the live list asks for live grants only', async () => {
  render(<CSRProjectManagementPage />);
  await screen.findByRole('button', { name: /Show Acme/ });
  expect(csrAPI.projects.getAll).toHaveBeenCalledWith({});
  expect(screen.queryByRole('button', { name: /Show Test Funder/ })).not.toBeInTheDocument();
});

test('only a super admin sees the Deleted filter', async () => {
  mockRole = 'ADMIN';
  render(<CSRProjectManagementPage />);
  await screen.findByRole('button', { name: /Show Acme/ });
  expect(screen.queryByRole('tab', { name: 'Deleted' })).not.toBeInTheDocument();
});
