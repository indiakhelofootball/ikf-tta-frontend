import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CSRProjectModal from './CSRProjectModal';
import { workOrdersAPI } from '../../services/api';

jest.mock('../../services/api', () => ({
  workOrdersAPI: { getAll: jest.fn(() => Promise.resolve([])) },
}));

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
  // The substitution guard. `CSRProject.work_order` pointed at TTA's
  // `workorders.WorkOrder` — an OUTBOUND vendor payable whose whole reason for
  // existing is `paid_gross_amount` / `remaining` / `sync_payment_status`, and
  // against which a PaymentRequest can be raised with nothing to stop it. This
  // modal offered all of them, labelled by vendor name, as a funder's INBOUND
  // grant contract. The contract now lives in CSRWorkOrder, on the project's
  // Contract tab. Reaching back into the payables list from here would restore
  // the substitution, so it is asserted absent rather than left to review.
  test('never offers a TTA payable work order as the grant contract', () => {
    render(<CSRProjectModal open project={null} onClose={() => {}} onSave={() => {}} saving={false} />);
    expect(screen.queryByLabelText(/work order/i)).not.toBeInTheDocument();
    expect(workOrdersAPI.getAll).not.toHaveBeenCalled();
  });

  // Reverse-check: the query above must be able to find a field when one is
  // there, or the assertion passes for the wrong reason.
  test('the absence check can see a field that is present', () => {
    render(<CSRProjectModal open project={null} onClose={() => {}} onSave={() => {}} saving={false} />);
    expect(screen.queryByLabelText(/Project Name/i)).toBeInTheDocument();
  });
});
