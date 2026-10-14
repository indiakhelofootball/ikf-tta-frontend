// D-020 (owner, 14 Oct 2026): "Why give 'add' button in 'Activity types' when
// it didn't work" -- anyone who edits CSR adds a type; deleting stays with
// admins. The page used to show Add and Delete to everyone it was rendered for.
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import CSRActivityTypesPage from './CSRActivityTypesPage';

jest.mock('react-router-dom', () => ({ __esModule: true, useNavigate: () => jest.fn() }), {
  virtual: true,
});

jest.mock('../../services/api', () => ({
  csrAPI: {
    activityTypes: { getAll: jest.fn(), create: jest.fn(), delete: jest.fn() },
  },
}));

let mockAuth;
jest.mock('../../auth/AuthContext', () => ({ useAuth: () => mockAuth }));

const { csrAPI } = require('../../services/api');

const asUser = (role, csrGrant) => {
  mockAuth = {
    user: { role },
    perms: { isSuperAdmin: role === 'SUPER_ADMIN', grants: csrGrant ? { csr: csrGrant } : {} },
    permsLoading: false,
  };
};

beforeEach(() => {
  jest.clearAllMocks();
  csrAPI.activityTypes.getAll.mockResolvedValue([{ id: 1, name: 'District Trial', isMaster: true }]);
});

const addButton = () => screen.queryByRole('button', { name: 'Add' });
const deleteButton = () => screen.queryByRole('button', { name: 'Delete District Trial' });

test('CSR staff who can edit CSR see Add but not Delete', async () => {
  asUser('CSR_OPS', { can_view: true, can_edit: true });
  render(<CSRActivityTypesPage />);
  await screen.findByText('District Trial');
  expect(addButton()).toBeInTheDocument();
  expect(deleteButton()).toBeNull();
});

test('an admin sees Add and Delete', async () => {
  asUser('ADMIN', null);
  render(<CSRActivityTypesPage />);
  await screen.findByText('District Trial');
  expect(addButton()).toBeInTheDocument();
  expect(deleteButton()).toBeInTheDocument();
});

test('a super admin sees Add and Delete', async () => {
  asUser('SUPER_ADMIN', null);
  render(<CSRActivityTypesPage />);
  await screen.findByText('District Trial');
  expect(addButton()).toBeInTheDocument();
  expect(deleteButton()).toBeInTheDocument();
});

test('someone without CSR edit sees neither', async () => {
  asUser('CSR_OPS', { can_view: true, can_edit: false });
  render(<CSRActivityTypesPage />);
  await screen.findByText('District Trial');
  expect(addButton()).toBeNull();
  expect(deleteButton()).toBeNull();
});
