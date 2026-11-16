// A super admin deletes a grant from its page. The prompt names what stays
// attached and hidden, says where it comes back from, and a refusal from the
// server (a tagged TTA payment) is shown as the server worded it.
import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CSRProjectDetailPage from './CSRProjectDetailPage';

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  __esModule: true,
  useParams: () => ({ id: '7' }),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/csr/7', state: null }),
}), { virtual: true });

jest.mock('../../services/api', () => ({
  csrAPI: {
    projects: { getById: jest.fn(), delete: jest.fn() },
    activities: { getAll: jest.fn() },
    reports: { getAll: jest.fn() },
    contacts: { getAll: jest.fn() },
    activityTypes: { getAll: jest.fn() },
    expenseTags: { getAll: jest.fn() },
    athletes: { getAll: jest.fn() },
  },
}));

let mockRole = 'SUPER_ADMIN';
jest.mock('../../auth/AuthContext', () => ({
  useAuth: () => ({ user: { role: mockRole }, perms: null, permsLoading: false }),
}));

jest.mock('./CSRProjectDetailView', () => ({
  __esModule: true,
  default: () => null,
  ttaProjectIdentity: () => '',
}));
jest.mock('./CSRContractManagementPage', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/certificatePdf', () => ({ downloadCertificatePdf: jest.fn() }));

const { csrAPI } = require('../../services/api');

beforeEach(() => {
  mockRole = 'SUPER_ADMIN';
  mockNavigate.mockReset();
  csrAPI.projects.getById.mockResolvedValue({ id: 7, name: 'Khelo Girls', clientName: 'BDSA' });
  csrAPI.projects.delete.mockReset();
  csrAPI.activities.getAll.mockResolvedValue([{ id: 1, title: 'A' }, { id: 2, title: 'B' }]);
  csrAPI.reports.getAll.mockResolvedValue([{ id: 3, title: 'R', projectId: 7 }]);
  csrAPI.contacts.getAll.mockResolvedValue([]);
  csrAPI.activityTypes.getAll.mockResolvedValue([]);
  csrAPI.expenseTags.getAll.mockResolvedValue([{ id: 4, amount: '100' }, { id: 5, amount: '200' }]);
  csrAPI.athletes.getAll.mockResolvedValue([{ id: 6, fullName: 'P' }]);
});

const openPrompt = async () => {
  render(<CSRProjectDetailPage />);
  await screen.findByText('BDSA');
  await waitFor(() => expect(csrAPI.athletes.getAll).toHaveBeenCalled());
  fireEvent.click(await screen.findByRole('button', { name: 'Delete grant' }));
  return screen.findByRole('dialog');
};

test('the prompt names what stays attached and where it comes back from', async () => {
  const dialog = await openPrompt();
  await within(dialog).findByText('2 activities');
  expect(within(dialog).getByText('1 report')).toBeInTheDocument();
  expect(within(dialog).getByText('2 expense lines')).toBeInTheDocument();
  expect(within(dialog).getByText('its contracts')).toBeInTheDocument();
  expect(within(dialog).getByText('0 contacts')).toBeInTheDocument();
  expect(within(dialog).getByText('1 athlete')).toBeInTheDocument();
  expect(within(dialog).getByText(
    'Nothing is lost; a super admin can restore it from Projects > Deleted.',
  )).toBeInTheDocument();
});

test('confirming deletes the grant and goes back to the list', async () => {
  csrAPI.projects.delete.mockResolvedValue(null);
  const dialog = await openPrompt();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete grant' }));
  await waitFor(() => expect(csrAPI.projects.delete).toHaveBeenCalledWith('7'));
  await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith(
    '/csr/projects', expect.objectContaining({ state: expect.any(Object) }),
  ));
});

test('a refusal shows the server detail and stays on the grant', async () => {
  const detail = 'This grant has 2 tagged TTA payments. Untag them in TTA Payments first.';
  csrAPI.projects.delete.mockRejectedValue(new Error(detail));
  const dialog = await openPrompt();
  fireEvent.click(within(dialog).getByRole('button', { name: 'Delete grant' }));
  expect(await screen.findByText(detail)).toBeInTheDocument();
  expect(mockNavigate).not.toHaveBeenCalledWith('/csr/projects', expect.anything());
});

test('only a super admin is offered the delete', async () => {
  mockRole = 'ADMIN';
  render(<CSRProjectDetailPage />);
  await screen.findByText('BDSA');
  expect(screen.queryByRole('button', { name: 'Delete grant' })).not.toBeInTheDocument();
});
