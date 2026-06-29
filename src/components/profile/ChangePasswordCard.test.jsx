import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChangePasswordCard from './ChangePasswordCard';

jest.mock('../../services/api', () => ({
  __esModule: true,
  default: { changePassword: jest.fn(() => Promise.resolve({})) },
}));
import apiService from '../../services/api';

beforeEach(() => apiService.changePassword.mockClear());

describe('ChangePasswordCard', () => {
  const fill = (oldp, np, np2) => {
    fireEvent.change(screen.getByLabelText('Current password'), { target: { value: oldp } });
    fireEvent.change(screen.getByLabelText('New password'), { target: { value: np } });
    fireEvent.change(screen.getByLabelText('Confirm new password'), { target: { value: np2 } });
  };

  test('blocks mismatched new passwords', () => {
    render(<ChangePasswordCard />);
    fill('oldpass12', 'newpass12', 'different12');
    fireEvent.click(screen.getByRole('button', { name: /change password/i }));
    expect(apiService.changePassword).not.toHaveBeenCalled();
    expect(screen.getByText(/do not match/i)).toBeInTheDocument();
  });

  test('blocks short new password', () => {
    render(<ChangePasswordCard />);
    fill('oldpass12', 'short', 'short');
    fireEvent.click(screen.getByRole('button', { name: /change password/i }));
    expect(apiService.changePassword).not.toHaveBeenCalled();
  });

  test('submits when valid', async () => {
    render(<ChangePasswordCard />);
    fill('oldpass12', 'newpass12', 'newpass12');
    fireEvent.click(screen.getByRole('button', { name: /change password/i }));
    await waitFor(() =>
      expect(apiService.changePassword).toHaveBeenCalledWith(
        expect.objectContaining({ oldPassword: 'oldpass12', newPassword: 'newpass12' })
      )
    );
  });
});
