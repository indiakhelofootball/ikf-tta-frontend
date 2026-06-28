import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CSRProjectModal from './CSRProjectModal';

describe('CSRProjectModal', () => {
  test('does not save while required fields are empty', () => {
    const onSave = jest.fn();
    render(<CSRProjectModal open project={null} onClose={() => {}} onSave={onSave} saving={false} />);
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).not.toHaveBeenCalled();
  });

  test('submits a camelCase payload when valid', () => {
    const onSave = jest.fn();
    render(<CSRProjectModal open project={null} onClose={() => {}} onSave={onSave} saving={false} />);
    fireEvent.change(screen.getByLabelText(/Project Name/i), { target: { value: 'Acme CSR' } });
    fireEvent.change(screen.getByLabelText(/Client \/ Funder/i), { target: { value: 'Acme Foundation' } });
    fireEvent.change(screen.getByLabelText(/Sanctioned Amount/i), { target: { value: '500000' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Acme CSR',
        clientName: 'Acme Foundation',
        sanctionedAmount: '500000',
        status: 'Active',
      })
    );
  });
});
