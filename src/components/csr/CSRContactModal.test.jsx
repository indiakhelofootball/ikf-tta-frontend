import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CSRContactModal from './CSRContactModal';

jest.mock('../../services/api', () => ({
  csrAPI: { contacts: { getAll: jest.fn(() => Promise.resolve([])) } },
}));

const { csrAPI } = require('../../services/api');

describe('CSRContactModal', () => {
  // CRA's jest config sets resetMocks: true, which strips a jest.mock
  // factory's implementation before every test — the default belongs here.
  beforeEach(() => {
    csrAPI.contacts.getAll.mockResolvedValue([]);
  });

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

  describe('picking an existing contact', () => {
    // The 26 Aug review: the same handful of IKF people recur on every grant
    // and get re-typed (and mis-spelled) each time. Same email on two grants
    // must collapse to one suggestion.
    const grantA = { id: 1, name: 'Rahul Sharma', designation: 'Program Officer', email: 'rahul@ikf.org', phone: '9000000001' };
    const grantB = { id: 2, name: 'Rahul S.', designation: 'Program Officer', email: 'Rahul@IKF.org', phone: '9000000001' };

    beforeEach(() => {
      csrAPI.contacts.getAll.mockResolvedValue([grantA, grantB]);
    });

    test('dedupes by email and fills designation/email/phone on pick', async () => {
      const onSave = jest.fn();
      render(<CSRContactModal open contact={null} onClose={() => {}} onSave={onSave} saving={false} />);

      const input = screen.getByLabelText(/Name/i);
      fireEvent.change(input, { target: { value: 'Rahul' } });

      // Only one suggestion despite two grant-side records for the same person.
      const options = await screen.findAllByText('Rahul Sharma');
      expect(options).toHaveLength(1);

      fireEvent.click(options[0]);
      fireEvent.click(screen.getByRole('button', { name: /save/i }));

      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Rahul Sharma',
          designation: 'Program Officer',
          email: 'rahul@ikf.org',
          phone: '9000000001',
        })
      );
      // Never carries the source row's id — this grant gets its own contact row.
      expect(onSave.mock.calls[0][0]).not.toHaveProperty('id');
    });

    test('typing a name not in the suggestion list still works', () => {
      const onSave = jest.fn();
      render(<CSRContactModal open contact={null} onClose={() => {}} onSave={onSave} saving={false} />);
      fireEvent.change(screen.getByLabelText(/Name/i), { target: { value: 'New Person' } });
      fireEvent.click(screen.getByRole('button', { name: /save/i }));
      expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Person' }));
    });
  });
});
