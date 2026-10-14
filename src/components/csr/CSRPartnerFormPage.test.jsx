import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import CSRPartnerFormPage from './CSRPartnerFormPage';

const mockNavigate = jest.fn();
let mockParams = {};
jest.mock('react-router-dom', () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
}), { virtual: true });

jest.mock('../../services/api', () => ({
  csrAPI: {
    partnerRecords: {
      getById: jest.fn(), vendorOptions: jest.fn(), vendorRecords: jest.fn(),
      create: jest.fn(), update: jest.fn(),
    },
  },
}));

jest.mock('../../utils/adminStorage', () => ({
  getPartnerCategories: () => [
    { id: 7, name: 'Life Skills' },
    { id: 8, name: 'Player Development' },
  ],
}));

jest.mock('../../hooks/useConfigVersion', () => ({ __esModule: true, default: () => 0 }));

const { csrAPI } = require('../../services/api');

const VENDORS = [
  { id: 31, name: 'A1 Classes', serviceType: 'Coaching' },
  { id: 32, name: 'Kick Academy', serviceType: 'Partner' },
];

const RECORDS = [
  { id: 301, name: 'A1 Classes', vendorType: 'Coaching', city: 'Pune', state: 'Maharashtra' },
  { id: 302, name: 'A1 Classes', vendorType: '', city: '', state: 'Goa' },
];

const fieldErr = (data) => {
  const err = new Error('vendorNameId: This vendor is already a CSR partner.');
  err.response = { status: 400, data };
  return err;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  csrAPI.partnerRecords.vendorOptions.mockResolvedValue(VENDORS);
  csrAPI.partnerRecords.vendorRecords.mockResolvedValue([]);
});

describe('adding a partner', () => {
  test('vendors read "Name · service type"', async () => {
    render(<CSRPartnerFormPage />);
    expect(await screen.findByRole('option', { name: 'A1 Classes · Coaching' })).toBeInTheDocument();
  });

  test('saves the picked vendor and type, with no address, then opens the partner', async () => {
    csrAPI.partnerRecords.create.mockResolvedValue({ id: 9 });
    render(<CSRPartnerFormPage />);
    await userEvent.selectOptions(await screen.findByLabelText(/^vendor/i), '31');
    await userEvent.selectOptions(screen.getByLabelText(/partner type/i), '7');
    expect(screen.queryByLabelText(/address/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.partnerRecords.create).toHaveBeenCalledWith({
      vendorNameId: 31, partnerCategoryId: 7, vendorId: null,
    }));
    expect(mockNavigate).toHaveBeenCalledWith('/csr/partners/9', expect.anything());
  });

  test('partner type is required before anything is sent', async () => {
    render(<CSRPartnerFormPage />);
    await userEvent.selectOptions(await screen.findByLabelText(/^vendor/i), '31');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByText('Pick a partner type.')).toBeInTheDocument();
    expect(csrAPI.partnerRecords.create).not.toHaveBeenCalled();
  });

  test('a server vendor error shows under the vendor field', async () => {
    csrAPI.partnerRecords.create.mockRejectedValue(
      fieldErr({ vendorNameId: ['This vendor is already a CSR partner.'] }),
    );
    render(<CSRPartnerFormPage />);
    await userEvent.selectOptions(await screen.findByLabelText(/^vendor/i), '31');
    await userEvent.selectOptions(screen.getByLabelText(/partner type/i), '7');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    const help = await screen.findByText('This vendor is already a CSR partner.');
    expect(help).toHaveAttribute('id', 'p-vendor-help');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('no TTA vendor record select until a vendor is picked', async () => {
    render(<CSRPartnerFormPage />);
    await screen.findByLabelText(/^vendor/i);
    expect(screen.queryByLabelText(/tta vendor record/i)).not.toBeInTheDocument();
    expect(csrAPI.partnerRecords.vendorRecords).not.toHaveBeenCalled();
  });

  test('the TTA vendor records with that name are offered, and the pick is sent as vendorId', async () => {
    csrAPI.partnerRecords.vendorRecords.mockResolvedValue(RECORDS);
    csrAPI.partnerRecords.create.mockResolvedValue({ id: 9 });
    render(<CSRPartnerFormPage />);
    await userEvent.selectOptions(await screen.findByLabelText(/^vendor/i), '31');
    expect(csrAPI.partnerRecords.vendorRecords).toHaveBeenCalledWith('31');

    const record = await screen.findByLabelText(/tta vendor record/i);
    await screen.findByRole('option', { name: 'A1 Classes · Goa' });
    expect(within(record).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Not set up in TTA yet',
      'A1 Classes · Coaching · Pune, Maharashtra',
      'A1 Classes · Goa',
    ]);
    expect(screen.getByText(
      'Optional. The vendor record in TTA this partner is paid through. Payments stay in TTA.',
    )).toBeInTheDocument();

    await userEvent.selectOptions(record, '302');
    await userEvent.selectOptions(screen.getByLabelText(/partner type/i), '7');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(csrAPI.partnerRecords.create).toHaveBeenCalledWith({
      vendorNameId: 31, partnerCategoryId: 7, vendorId: 302,
    }));
  });

  test('no TTA record with that name: only the not-set-up choice, and says so', async () => {
    render(<CSRPartnerFormPage />);
    await userEvent.selectOptions(await screen.findByLabelText(/^vendor/i), '31');
    expect(await screen.findByText('No vendor record with this name in TTA yet.')).toBeInTheDocument();
    const record = screen.getByLabelText(/tta vendor record/i);
    expect(within(record).getAllByRole('option').map((o) => o.textContent)).toEqual(['Not set up in TTA yet']);
  });

  test('changing the vendor reloads its records and clears the pick', async () => {
    const kick = { id: 401, name: 'Kick Academy', vendorType: 'Partner', city: 'Delhi', state: 'Delhi' };
    csrAPI.partnerRecords.vendorRecords.mockImplementation(
      async (vendorNameId) => (String(vendorNameId) === '31' ? RECORDS : [kick]),
    );
    render(<CSRPartnerFormPage />);
    await userEvent.selectOptions(await screen.findByLabelText(/^vendor/i), '31');
    await screen.findByRole('option', { name: 'A1 Classes · Coaching · Pune, Maharashtra' });
    await userEvent.selectOptions(screen.getByLabelText(/tta vendor record/i), '301');

    await userEvent.selectOptions(screen.getByLabelText(/^vendor/i), '32');
    expect(await screen.findByRole('option', { name: 'Kick Academy · Partner · Delhi, Delhi' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'A1 Classes · Coaching · Pune, Maharashtra' })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/tta vendor record/i)).toHaveValue('');
    expect(csrAPI.partnerRecords.vendorRecords).toHaveBeenLastCalledWith('32');
  });

  test('a server vendorId error shows under the TTA vendor record field', async () => {
    csrAPI.partnerRecords.vendorRecords.mockResolvedValue(RECORDS);
    csrAPI.partnerRecords.create.mockRejectedValue(
      fieldErr({ vendorId: ['That vendor record is for B2 Classes, not A1 Classes.'] }),
    );
    render(<CSRPartnerFormPage />);
    await userEvent.selectOptions(await screen.findByLabelText(/^vendor/i), '31');
    await screen.findByRole('option', { name: 'A1 Classes · Goa' });
    await userEvent.selectOptions(screen.getByLabelText(/tta vendor record/i), '301');
    await userEvent.selectOptions(screen.getByLabelText(/partner type/i), '7');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    const help = await screen.findByText('That vendor record is for B2 Classes, not A1 Classes.');
    expect(help).toHaveAttribute('id', 'p-vendor-record-help');
    expect(screen.getByLabelText(/tta vendor record/i)).toHaveAttribute('aria-invalid', 'true');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('no vendor left to add: says why and cannot save', async () => {
    csrAPI.partnerRecords.vendorOptions.mockResolvedValue([]);
    render(<CSRPartnerFormPage />);
    expect(await screen.findByText(/ask an admin to add it in TTA Admin/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });
});

describe('editing a partner', () => {
  beforeEach(() => {
    mockParams = { id: '5' };
    csrAPI.partnerRecords.getById.mockResolvedValue({
      id: 5, vendorNameId: 31, name: 'A1 Classes', serviceType: 'Coaching',
      partnerCategoryId: 7, partnerCategoryName: 'Life Skills', isActive: true,
    });
  });

  test('the vendor is read-only and the PATCH carries type and state', async () => {
    csrAPI.partnerRecords.update.mockResolvedValue({ id: 5 });
    render(<CSRPartnerFormPage />);
    const vendor = await screen.findByLabelText(/^vendor/i);
    expect(vendor).toHaveAttribute('readonly');
    expect(vendor).toHaveValue('A1 Classes · Coaching');

    await userEvent.click(screen.getByLabelText(/active/i));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(csrAPI.partnerRecords.update).toHaveBeenCalledWith('5', {
      partnerCategoryId: 7, isActive: false, vendorId: null,
    }));
    expect(csrAPI.partnerRecords.vendorOptions).not.toHaveBeenCalled();
  });

  test('the linked TTA vendor record is preselected and a change is sent', async () => {
    csrAPI.partnerRecords.getById.mockResolvedValue({
      id: 5, vendorNameId: 31, name: 'A1 Classes', serviceType: 'Coaching',
      partnerCategoryId: 7, partnerCategoryName: 'Life Skills', isActive: true,
      vendorId: 301, vendorRecord: RECORDS[0],
    });
    csrAPI.partnerRecords.vendorRecords.mockResolvedValue(RECORDS);
    csrAPI.partnerRecords.update.mockResolvedValue({ id: 5 });
    render(<CSRPartnerFormPage />);
    const record = await screen.findByLabelText(/tta vendor record/i);
    await screen.findByRole('option', { name: 'A1 Classes · Goa' });
    expect(record).toHaveValue('301');
    expect(csrAPI.partnerRecords.vendorRecords).toHaveBeenCalledWith(31);

    await userEvent.selectOptions(record, '');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(csrAPI.partnerRecords.update).toHaveBeenCalledWith('5', {
      partnerCategoryId: 7, isActive: true, vendorId: null,
    }));
  });

  test('a linked record no longer in the name list still shows as itself', async () => {
    const held = { id: 299, name: 'A1 Classes Old', vendorType: 'Coaching', city: 'Nagpur', state: 'Maharashtra' };
    csrAPI.partnerRecords.getById.mockResolvedValue({
      id: 5, vendorNameId: 31, name: 'A1 Classes', serviceType: 'Coaching',
      partnerCategoryId: 7, partnerCategoryName: 'Life Skills', isActive: true,
      vendorId: 299, vendorRecord: held,
    });
    csrAPI.partnerRecords.vendorRecords.mockResolvedValue(RECORDS);
    csrAPI.partnerRecords.update.mockResolvedValue({ id: 5 });
    render(<CSRPartnerFormPage />);
    const record = await screen.findByLabelText(/tta vendor record/i);
    await screen.findByRole('option', { name: 'A1 Classes · Goa' });
    expect(record).toHaveValue('299');
    expect(within(record).getByRole('option', { name: 'A1 Classes Old · Coaching · Nagpur, Maharashtra' }))
      .toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(csrAPI.partnerRecords.update).toHaveBeenCalledWith('5', {
      partnerCategoryId: 7, isActive: true, vendorId: 299,
    }));
  });
});
