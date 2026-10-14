// D-022 (14 Oct 2026): "no action in csr will change tta". A partner's type is
// set on the CSR Partners page, so the TTA vendor form no longer edits it. The
// stored value is not wiped: an edit sends it back exactly as it was loaded.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import VendorModal from './VendorModal';

jest.mock('../../services/api', () => ({
  vendorsAPI: { getPanCard: jest.fn() },
}));

const VENDOR = {
  id: 7, vendorName: 'A1 Classes', vendorType: 'Partner', partnerCategory: 'Life skill',
  companyType: 'Individual', entityName: '', gstNumber: '', panNumber: 'ABCDE1234F',
  gstVerified: false, panVerified: false, tdsType: 'None', contactPerson: 'Ravi',
  phone: '9876543210', email: '', address: '', contactPinCode: '', state: '', city: '',
  bankName: '', accountHolderName: '', accountNumber: '', accountType: '', ifscCode: '',
  bankPinCode: '', branchAddress: '', status: 'Verified', hasPanCard: false,
};

test('the vendor form has no CSR PARTNER section', () => {
  render(<VendorModal open onClose={jest.fn()} onSave={jest.fn()} vendor={VENDOR} />);
  expect(screen.queryByText('CSR PARTNER')).not.toBeInTheDocument();
  expect(screen.queryByText('Partner Category')).not.toBeInTheDocument();
  expect(screen.queryByText('Not a CSR partner')).not.toBeInTheDocument();
});

test('saving an existing vendor sends its stored partnerCategory back unchanged', async () => {
  const onSave = jest.fn();
  render(<VendorModal open onClose={jest.fn()} onSave={onSave} vendor={VENDOR} />);
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  const [payload, id] = onSave.mock.calls[0];
  expect(id).toBe(7);
  expect(payload.partnerCategory).toBe('Life skill');
});
