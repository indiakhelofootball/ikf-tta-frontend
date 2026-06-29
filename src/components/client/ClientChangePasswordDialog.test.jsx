import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ClientChangePasswordDialog from './ClientChangePasswordDialog';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: { changePassword: jest.fn(() => Promise.resolve({})) },
}));
import apiService from '../../services/api';

beforeEach(() => apiService.changePassword.mockClear());

const fill = (oldp, np, np2) => {
  fireEvent.change(screen.getByLabelText('Current password'), { target: { value: oldp } });
  fireEvent.change(screen.getByLabelText('New password'), { target: { value: np } });
  fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: np2 } });
};

describe('ClientChangePasswordDialog', () => {
  test('blocks mismatched passwords', () => {
    render(<ClientChangePasswordDialog open onClose={() => {}} />);
    fill('oldpass12', 'newpass12', 'nope12345');
    fireEvent.click(screen.getByRole('button', { name: /change/i }));
    expect(apiService.changePassword).not.toHaveBeenCalled();
    expect(screen.getByText(/do not match/i)).toBeInTheDocument();
  });

  test('submits when valid', async () => {
    render(<ClientChangePasswordDialog open onClose={() => {}} />);
    fill('oldpass12', 'newpass12', 'newpass12');
    fireEvent.click(screen.getByRole('button', { name: /change/i }));
    await waitFor(() =>
      expect(apiService.changePassword).toHaveBeenCalledWith(
        expect.objectContaining({ oldPassword: 'oldpass12', newPassword: 'newpass12' })
      )
    );
  });
});
