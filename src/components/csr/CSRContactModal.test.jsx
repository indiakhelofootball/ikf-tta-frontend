import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CSRContactModal from './CSRContactModal';

describe('CSRContactModal', () => {
  test('requires a name before saving', () => {
    const onSave = jest.fn();
    render(<CSRContactModal open contact={null} onClose={() => {}} onSave={onSave} saving={false} />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText(/name is required/i)).toBeInTheDocument();
  });

  test('submits trimmed contact fields', () => {
    const onSave = jest.fn();
    render(<CSRContactModal open contact={null} onClose={() => {}} onSave={onSave} saving={false} />);
    fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: ' Priya ' } });
    fireEvent.change(screen.getByLabelText(/Designation/i), { target: { value: 'CSR Head' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Priya', designation: 'CSR Head' })
    );
  });
});
