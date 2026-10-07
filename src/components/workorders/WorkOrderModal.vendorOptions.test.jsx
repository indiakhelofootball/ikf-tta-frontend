// The work-order picker now loads vendors from /vendors/options/, which is the
// full vendor row minus `panCardImageUrl`. handleSave copies 16 vendor fields
// onto every saved work order, so a vendor without the image must produce the
// exact same payload as a vendor with it, on both paths that reach handleSave:
// editing an existing work order, and creating one from the picker.

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { vendorsAPI, trialsAPI } from '../../services/api';
import WorkOrderModal from './WorkOrderModal';

jest.mock('../../services/api', () => ({
  configAPI: { getByCategory: jest.fn(), bulk: jest.fn(), delete: jest.fn() },
  vendorsAPI: { getOptions: jest.fn(), getAll: jest.fn() },
  trialsAPI: { getAll: jest.fn() },
}));

// Two full render-and-save passes per test through MUI dialogs.
jest.setTimeout(30000);

const COPIED_FIELDS = [
  'vendorName', 'vendorType', 'companyType', 'contactPerson', 'phone', 'email',
  'address', 'contactPinCode', 'panNumber', 'gstNumber', 'tdsType', 'bankName',
  'accountNumber', 'ifscCode', 'accountType', 'bankPinCode',
];

const FULL_VENDOR = {
  id: 42,
  vendorName: 'Shree Ground Services',
  vendorType: 'Ground Staff',
  companyType: 'Proprietorship',
  contactPerson: 'Ravi Kulkarni',
  phone: '9876543210',
  email: 'ravi@example.com',
  address: '12 MG Road, Pune',
  contactPinCode: '411001',
  panNumber: 'ABCDE1234F',
  gstNumber: '27ABCDE1234F1Z5',
  tdsType: 'TDS @ 2% (Sec 194C)',
  bankName: 'HDFC Bank',
  accountNumber: '50100012345678',
  ifscCode: 'HDFC0000123',
  accountType: 'Current',
  bankPinCode: '411002',
  state: 'Maharashtra',
  city: 'Pune',
  status: 'Active',
  panCardImageName: 'pan.png',
  panCardImageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk',
};

const SLIM_VENDOR = Object.fromEntries(
  Object.entries(FULL_VENDOR).filter(([k]) => k !== 'panCardImageUrl')
);

beforeEach(() => {
  jest.clearAllMocks();
  trialsAPI.getAll.mockResolvedValue([]);
  // The old endpoint is not what the picker reads any more; if it were called,
  // the picker would stay empty and every test below would fail.
  vendorsAPI.getAll.mockRejectedValue(new Error('getAll must not be called'));
  localStorage.clear();
});

async function payloadFromEdit(vendor) {
  vendorsAPI.getOptions.mockResolvedValue({ vendors: [vendor], total: 1 });
  const onSave = jest.fn();
  // The work order carries no vendor details of its own, so every copied field
  // in the payload can only have come from the fetched vendor.
  const workOrder = {
    id: 7, vendorId: 42, workOrderNumber: 'GS-SHR-001', type: 'Fixed',
    amount: 5000, serviceDescription: 'Ground hire', status: 'Issued',
  };
  const { unmount } = render(
    <WorkOrderModal open onClose={() => {}} onSave={onSave} saving={false} workOrder={workOrder} />
  );
  await screen.findByText(vendor.vendorName);
  await userEvent.click(screen.getByRole('button', { name: 'Update Work Order' }));
  expect(onSave).toHaveBeenCalledTimes(1);
  unmount();
  return onSave.mock.calls[0][0];
}

async function payloadFromPicker(vendor) {
  vendorsAPI.getOptions.mockResolvedValue({ vendors: [vendor], total: 1 });
  const onSave = jest.fn();
  const { unmount } = render(
    <WorkOrderModal open onClose={() => {}} onSave={onSave} saving={false} />
  );
  await waitFor(() => expect(vendorsAPI.getOptions).toHaveBeenCalled());
  await userEvent.type(screen.getByPlaceholderText('Type to search vendor name...'), 'Shree');
  await userEvent.click(await screen.findByText(vendor.vendorName));
  await userEvent.click(screen.getByRole('button', { name: 'Create New Work Order' }));
  await userEvent.type(screen.getByPlaceholderText('e.g. 100000'), '5000');
  await userEvent.type(
    screen.getByPlaceholderText(`Describe the specific work for ${vendor.vendorName}...`),
    'Ground hire'
  );
  await userEvent.click(screen.getByRole('button', { name: 'Save Work Order' }));
  expect(onSave).toHaveBeenCalledTimes(1);
  unmount();
  return onSave.mock.calls[0][0];
}

describe('WorkOrderModal save payload: options vendor == full vendor', () => {
  test('edit path: all 16 copied fields identical with and without panCardImageUrl', async () => {
    const fromFull = await payloadFromEdit(FULL_VENDOR);
    vendorsAPI.getOptions.mockClear();
    const fromSlim = await payloadFromEdit(SLIM_VENDOR);

    expect(fromSlim).toEqual(fromFull);
    COPIED_FIELDS.forEach((f) => {
      expect(fromSlim[f]).toBe(FULL_VENDOR[f]);
    });
    expect(fromSlim).not.toHaveProperty('panCardImageUrl');
  });

  test('create-from-picker path: all 16 copied fields identical with and without panCardImageUrl', async () => {
    const fromFull = await payloadFromPicker(FULL_VENDOR);
    vendorsAPI.getOptions.mockClear();
    const fromSlim = await payloadFromPicker(SLIM_VENDOR);

    expect(fromSlim).toEqual(fromFull);
    COPIED_FIELDS.forEach((f) => {
      expect(fromSlim[f]).toBe(FULL_VENDOR[f]);
    });
    expect(fromSlim).not.toHaveProperty('panCardImageUrl');
  });
});

describe('WorkOrderModal vendor fetch', () => {
  test('opening the modal fetches vendor options, never the full vendor list', async () => {
    vendorsAPI.getOptions.mockResolvedValue({ vendors: [SLIM_VENDOR], total: 1 });
    render(<WorkOrderModal open onClose={() => {}} onSave={() => {}} saving={false} />);
    await waitFor(() => expect(vendorsAPI.getOptions).toHaveBeenCalledTimes(1));
    expect(vendorsAPI.getAll).not.toHaveBeenCalled();
  });

  test('every reopen refetches (fetch on use, no cached list)', async () => {
    vendorsAPI.getOptions.mockResolvedValue({ vendors: [SLIM_VENDOR], total: 1 });
    const { rerender } = render(
      <WorkOrderModal open onClose={() => {}} onSave={() => {}} saving={false} />
    );
    await waitFor(() => expect(vendorsAPI.getOptions).toHaveBeenCalledTimes(1));
    rerender(<WorkOrderModal open={false} onClose={() => {}} onSave={() => {}} saving={false} />);
    rerender(<WorkOrderModal open onClose={() => {}} onSave={() => {}} saving={false} />);
    await waitFor(() => expect(vendorsAPI.getOptions).toHaveBeenCalledTimes(2));
    expect(vendorsAPI.getAll).not.toHaveBeenCalled();
  });
});
