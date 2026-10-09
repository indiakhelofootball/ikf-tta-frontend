import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { csrAPI } from '../../services/api';
import CSRClientsPage from './CSRClientsPage';

jest.mock('../../services/api', () => ({
  csrAPI: {
    clients: { list: jest.fn(), onboard: jest.fn(), setAccess: jest.fn(), resetPassword: jest.fn() },
    projects: { getAll: jest.fn() },
  },
}));

const FUNDER = {
  id: 7, userId: 41, email: 'funder@acme.com', name: 'Acme Funder',
  projectId: 1, projectName: 'Grassroots', isActive: true, createdAt: '2026-10-01',
};

beforeEach(() => {
  jest.clearAllMocks();
  csrAPI.clients.list.mockResolvedValue([FUNDER]);
  csrAPI.projects.getAll.mockResolvedValue([]);
});

const openReset = async () => {
  render(<CSRClientsPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Reset password' }));
  return screen.getByLabelText('New Password');
};

test('an admin resets a funder password and is told it worked', async () => {
  csrAPI.clients.resetPassword.mockResolvedValue({ success: true, clientUser: FUNDER });
  const input = await openReset();
  fireEvent.change(input, { target: { value: 'Fresh-Temp-2026' } });
  fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

  await waitFor(() => expect(csrAPI.clients.resetPassword).toHaveBeenCalledWith(7, 'Fresh-Temp-2026'));
  expect(await screen.findByText('Password reset for funder@acme.com.')).toBeInTheDocument();
  expect(csrAPI.clients.setAccess).not.toHaveBeenCalled();
});

test('a password under 8 characters is stopped before it is sent', async () => {
  const input = await openReset();
  fireEvent.change(input, { target: { value: 'short' } });
  fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

  expect(screen.getByText('At least 8 characters')).toBeInTheDocument();
  expect(csrAPI.clients.resetPassword).not.toHaveBeenCalled();
});

test('the server reason is shown when it refuses the password', async () => {
  const err = new Error('Bad request');
  err.response = { status: 400, data: { errors: { password: ['This password is too common.'] } } };
  csrAPI.clients.resetPassword.mockRejectedValue(err);
  const input = await openReset();
  fireEvent.change(input, { target: { value: 'password123' } });
  fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

  expect(await screen.findByText('This password is too common.')).toBeInTheDocument();
  expect(screen.getByLabelText('New Password')).toBeInTheDocument();
});
