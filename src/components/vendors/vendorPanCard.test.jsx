// The Vendors page no longer downloads every PAN image with the list
// (/vendors/?limit=1000 was 23.6 MB on the wire). The list comes from
// /vendors/slim/ with hasPanCard + panCardImagePrefix; the image is fetched
// from /vendors/<id>/pan-card/ when a vendor is opened. The only visible change
// allowed is that timing, with the owner-approved loading and error states.

import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { vendorsAPI } from '../../services/api';
import VendorManagementPage from './VendorManagementPage';

jest.mock('../../services/api', () => ({
  configAPI: { getByCategory: jest.fn(), bulk: jest.fn(), delete: jest.fn() },
  paymentRequestsAPI: { getAll: jest.fn() },
  tdsAPI: { getAll: jest.fn() },
  vendorsAPI: {
    getAll: jest.fn(), getSlim: jest.fn(), getPanCard: jest.fn(),
    update: jest.fn(), create: jest.fn(), delete: jest.fn(),
  },
}));

jest.mock('../../auth/useGrants', () => ({
  __esModule: true,
  default: () => ({ canEdit: () => true, canView: () => true }),
}));

jest.setTimeout(30000);

const base = (id, name, extra) => ({
  id, vendorName: name, vendorType: 'Ground Staff', partnerCategory: '', companyType: 'Individual',
  entityName: '', gstNumber: '', panNumber: `ABCDE${1000 + id}F`, panCardImageName: 'pan.png',
  gstVerified: false, panVerified: false, tdsType: 'None', contactPerson: 'Ravi', phone: '9876543210',
  email: '', address: '', contactPinCode: '', state: '', city: '', bankName: '', accountHolderName: '',
  accountNumber: '', accountType: '', ifscCode: '', bankPinCode: '', branchAddress: '',
  status: 'Verified', createdAt: `2026-10-0${id}T00:00:00Z`, updatedAt: `2026-10-0${id}T09:30:00Z`,
  ...extra,
});

const IMAGE = base(1, 'Image Vendor', { hasPanCard: true, panCardImagePrefix: 'data:image/png;base64,iVBORw0KG' });
const NONE = base(2, 'No Pan Vendor', { hasPanCard: false, panCardImagePrefix: '', panCardImageName: '' });
const FILENAME = base(3, 'Filename Vendor', { hasPanCard: true, panCardImagePrefix: 'PAN Card.pdf' });
const PDF = base(4, 'Pdf Vendor', { hasPanCard: true, panCardImagePrefix: 'data:application/pdf;base64,JVB' });

let pending;
const deferPanCard = () => {
  vendorsAPI.getPanCard.mockImplementationOnce(
    () => new Promise((resolve, reject) => { pending = { resolve, reject }; })
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  pending = null;
  global.URL.createObjectURL = jest.fn(() => 'blob:pan-card');
  global.URL.revokeObjectURL = jest.fn();
  vendorsAPI.getSlim.mockResolvedValue({ vendors: [PDF, FILENAME, NONE, IMAGE], total: 4 });
  vendorsAPI.getAll.mockRejectedValue(new Error('the fat list must not be called'));
  vendorsAPI.getPanCard.mockResolvedValue({ blob: new Blob(['png']), contentType: 'image/png' });
  vendorsAPI.update.mockResolvedValue({});
});

async function openCard(name, button) {
  render(<VendorManagementPage />);
  const title = await screen.findByText(name);
  const card = title.closest('.MuiCard-root');
  await userEvent.click(within(card).getByRole('button', { name: button }));
  return screen.findByRole('dialog');
}

test('the list comes from /vendors/slim/, never the fat list', async () => {
  render(<VendorManagementPage />);
  expect(await screen.findByText('Showing 4 of 4 vendors')).toBeInTheDocument();
  expect(vendorsAPI.getSlim).toHaveBeenCalledTimes(1);
  expect(vendorsAPI.getAll).not.toHaveBeenCalled();
  expect(vendorsAPI.getPanCard).not.toHaveBeenCalled();
});

describe('detail view', () => {
  test('shows "Loading PAN card…" in the image place, then the image', async () => {
    deferPanCard();
    const dialog = await openCard('Image Vendor', 'View');
    expect(within(dialog).getByText('Loading PAN card…')).toBeInTheDocument();
    expect(within(dialog).queryByAltText('PAN Card')).not.toBeInTheDocument();
    expect(vendorsAPI.getPanCard).toHaveBeenCalledWith(1, IMAGE.updatedAt);

    pending.resolve({ blob: new Blob(['png']), contentType: 'image/png' });
    const img = await within(dialog).findByAltText('PAN Card');
    expect(img).toHaveAttribute('src', 'blob:pan-card');
    expect(within(dialog).queryByText('Loading PAN card…')).not.toBeInTheDocument();
  });

  test('a failure shows the message and Retry refetches only the image', async () => {
    deferPanCard();
    const dialog = await openCard('Image Vendor', 'View');
    pending.reject(new Error('Request failed (500)'));
    expect(await within(dialog).findByText("Couldn't load PAN card.")).toBeInTheDocument();
    const slimCalls = vendorsAPI.getSlim.mock.calls.length;

    await userEvent.click(within(dialog).getByRole('button', { name: 'Retry' }));
    expect(await within(dialog).findByAltText('PAN Card')).toHaveAttribute('src', 'blob:pan-card');
    expect(vendorsAPI.getPanCard).toHaveBeenCalledTimes(2);
    expect(vendorsAPI.getPanCard).toHaveBeenLastCalledWith(1, IMAGE.updatedAt);
    expect(vendorsAPI.getSlim).toHaveBeenCalledTimes(slimCalls);
  });

  test('no PAN file: no PAN Card block, no spinner, no fetch', async () => {
    const dialog = await openCard('No Pan Vendor', 'View');
    expect(within(dialog).queryByText('PAN Card')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('Loading PAN card…')).not.toBeInTheDocument();
    expect(vendorsAPI.getPanCard).not.toHaveBeenCalled();
  });

  test('a bare filename shows its text as today, with no fetch', async () => {
    const dialog = await openCard('Filename Vendor', 'View');
    expect(within(dialog).getByText('PAN Card.pdf')).toBeInTheDocument();
    expect(within(dialog).queryByText('Loading PAN card…')).not.toBeInTheDocument();
    expect(vendorsAPI.getPanCard).not.toHaveBeenCalled();
  });

  test('a PDF shows the same 30-character label as today, with no fetch', async () => {
    const dialog = await openCard('Pdf Vendor', 'View');
    expect(within(dialog).getByText('data:application/pdf;base64,JV...')).toBeInTheDocument();
    expect(vendorsAPI.getPanCard).not.toHaveBeenCalled();
  });
});

describe('edit form', () => {
  test('the preview loads on open, and Save without a new file omits both PAN keys', async () => {
    deferPanCard();
    const dialog = await openCard('Image Vendor', 'Edit');
    expect(within(dialog).getByText('Loading PAN card…')).toBeInTheDocument();
    pending.resolve({ blob: new Blob(['png']), contentType: 'image/png' });
    expect(await within(dialog).findByAltText('PAN')).toHaveAttribute('src', 'blob:pan-card');

    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(vendorsAPI.update).toHaveBeenCalledTimes(1));
    const [id, payload] = vendorsAPI.update.mock.calls[0];
    expect(id).toBe(1);
    expect(payload).not.toHaveProperty('panCardImageUrl');
    expect(payload).not.toHaveProperty('panCardImageName');
    expect(payload.phone).toBe('9876543210');
    expect(payload.panNumber).toBe(IMAGE.panNumber);
  });

  test('Remove then Save still omits the keys, as Remove never cleared the stored PAN', async () => {
    const dialog = await openCard('Image Vendor', 'Edit');
    await within(dialog).findByAltText('PAN');
    const remove = within(dialog).getByAltText('PAN').parentElement.querySelector('button');
    await userEvent.click(remove);
    expect(within(dialog).queryByAltText('PAN')).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(vendorsAPI.update).toHaveBeenCalledTimes(1));
    expect(vendorsAPI.update.mock.calls[0][1]).not.toHaveProperty('panCardImageUrl');
  });

  test('a newly picked file is sent', async () => {
    const dialog = await openCard('No Pan Vendor', 'Edit');
    expect(vendorsAPI.getPanCard).not.toHaveBeenCalled();
    const file = new File(['new-pan'], 'new-pan.png', { type: 'image/png' });
    await userEvent.upload(dialog.querySelector('input[type="file"]'), file);
    expect(await within(dialog).findByAltText('PAN')).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(() => expect(vendorsAPI.update).toHaveBeenCalledTimes(1));
    const payload = vendorsAPI.update.mock.calls[0][1];
    expect(payload.panCardImageName).toBe('new-pan.png');
    expect(payload.panCardImageUrl).toMatch(/^data:image\/png;base64,/);
  });

  test('a non-image stored PAN shows the file chip with its name, with no fetch', async () => {
    const dialog = await openCard('Filename Vendor', 'Edit');
    expect(within(dialog).getByText('pan.png')).toBeInTheDocument();
    expect(vendorsAPI.getPanCard).not.toHaveBeenCalled();
  });
});
