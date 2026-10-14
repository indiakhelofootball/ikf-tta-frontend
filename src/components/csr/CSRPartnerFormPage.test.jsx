import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
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
      getById: jest.fn(), vendorOptions: jest.fn(), create: jest.fn(), update: jest.fn(),
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

const fieldErr = (data) => {
  const err = new Error('vendorNameId: This vendor is already a CSR partner.');
  err.response = { status: 400, data };
  return err;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  csrAPI.partnerRecords.vendorOptions.mockResolvedValue(VENDORS);
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
      vendorNameId: 31, partnerCategoryId: 7,
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
      partnerCategoryId: 7, isActive: false,
    }));
    expect(csrAPI.partnerRecords.vendorOptions).not.toHaveBeenCalled();
  });
});
