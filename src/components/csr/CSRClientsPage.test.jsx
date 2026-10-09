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

test('each funder row shows its full portal link with a Copy button', async () => {
  csrAPI.clients.list.mockResolvedValue([{ ...FUNDER, portalPath: '/client/dlf/login' }]);
  const writeText = jest.fn().mockResolvedValue();
  Object.assign(navigator, { clipboard: { writeText } });
  render(<CSRClientsPage />);
  expect(await screen.findByText('/client/dlf/login')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Copy portal link for funder@acme.com' }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/client/dlf/login`));
  expect(await screen.findByText('Link copied.')).toBeInTheDocument();
});

test('after onboarding, the link, email and password are shown together to send', async () => {
  csrAPI.projects.getAll.mockResolvedValue([{ id: 1, name: 'Football for All', clientName: 'Vardhman Steel' }]);
  csrAPI.clients.onboard.mockResolvedValue({ success: true, clientUser: { ...FUNDER, portalPath: '/client/vardhman-steel/login' } });
  const writeText = jest.fn().mockResolvedValue();
  Object.assign(navigator, { clipboard: { writeText } });
  render(<CSRClientsPage />);
  fireEvent.click(await screen.findByRole('button', { name: /Onboard Funder/ }));
  fireEvent.mouseDown(screen.getByLabelText('Project'));
  fireEvent.click(await screen.findByRole('option', { name: /Vardhman Steel/ }));
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'sanskriti@vs.com' } });
  fireEvent.change(screen.getByLabelText('Initial Password'), { target: { value: 'Start-Pass-2026' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create Funder' }));

  expect(await screen.findByText('Send these to the funder')).toBeInTheDocument();
  expect(screen.getByLabelText('Portal link')).toHaveValue(`${window.location.origin}/client/vardhman-steel/login`);
  expect(screen.getByLabelText('Password')).toHaveValue('Start-Pass-2026');
  fireEvent.click(screen.getByRole('button', { name: 'Copy all' }));
  await waitFor(() => expect(writeText).toHaveBeenCalledWith(expect.stringContaining('Password: Start-Pass-2026')));
});
