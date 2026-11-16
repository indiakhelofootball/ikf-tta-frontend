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

let mockCategories = [];
jest.mock('../../utils/adminStorage', () => ({
  getPartnerCategories: () => mockCategories,
  addConfigOption: jest.fn(),
}));

let mockCfgVersion = 0;
jest.mock('../../hooks/useConfigVersion', () => ({ __esModule: true, default: () => mockCfgVersion }));

let mockCanEditConfig = false;
jest.mock('../../auth/useGrants', () => ({
  __esModule: true,
  default: () => ({ canView: () => true, canEdit: (mod) => mod === 'config' && mockCanEditConfig }),
}));

const { csrAPI } = require('../../services/api');
const { addConfigOption } = require('../../utils/adminStorage');

const CATEGORIES = [
  { id: 7, name: 'Life Skills' },
  { id: 8, name: 'Player Development' },
];

const pick = async (label, name) => {
  const input = screen.getByRole('combobox', { name: label });
  await userEvent.clear(input);
  await userEvent.type(input, name);
  await userEvent.click(await screen.findByRole('option', { name }));
};

const openList = async (label) => {
  const input = screen.getByRole('combobox', { name: label });
  await userEvent.clear(input);
  await userEvent.click(input);
};

const NAME = /^partner name/i;
const TYPE = /partner type/i;
const RECORD = /tta vendor record/i;
const RECORD_HELP = 'Only needed if this partner is paid through TTA. Set it up under TTA Vendors (PAN required).';

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
  mockCategories = CATEGORIES;
  mockCfgVersion = 0;
  mockCanEditConfig = false;
  csrAPI.partnerRecords.vendorOptions.mockResolvedValue(VENDORS);
  csrAPI.partnerRecords.vendorRecords.mockResolvedValue([]);
});

describe('adding a partner', () => {
  test('one search-as-you-type picker; vendors read "Name · service type"', async () => {
    render(<CSRPartnerFormPage />);
    await screen.findByRole('combobox', { name: NAME });
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
    await userEvent.type(screen.getByRole('combobox', { name: NAME }), 'coach');
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent))
      .toEqual(['A1 Classes · Coaching']);
  });

  test('help names the exact Admin lists, never "ask an admin"', async () => {
    render(<CSRPartnerFormPage />);
    await screen.findByRole('combobox', { name: NAME });
    expect(screen.getByRole('combobox', { name: NAME })).toHaveAccessibleDescription('From Admin > Vendor Names.');
    expect(screen.getByRole('combobox', { name: TYPE }))
      .toHaveAccessibleDescription('Managed in Admin > CSR > CSR Partner Types.');
    expect(screen.queryByText(/ask an admin/i)).not.toBeInTheDocument();
  });

  test('saves the picked vendor and type, with no address, then opens the partner', async () => {
    csrAPI.partnerRecords.create.mockResolvedValue({ id: 9 });
    render(<CSRPartnerFormPage />);
    await screen.findByRole('combobox', { name: NAME });
    await pick(NAME, 'A1 Classes · Coaching');
    await pick(TYPE, 'Life Skills');
    expect(screen.queryByLabelText(/address/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.partnerRecords.create).toHaveBeenCalledWith({
      vendorNameId: 31, partnerCategoryId: 7, vendorId: null,
    }));
    expect(mockNavigate).toHaveBeenCalledWith('/csr/partners/9', expect.anything());
  });

  test('partner type is required before anything is sent', async () => {
    render(<CSRPartnerFormPage />);
    await screen.findByRole('combobox', { name: NAME });
    await pick(NAME, 'A1 Classes · Coaching');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByText('Pick a partner type.')).toBeInTheDocument();
    expect(csrAPI.partnerRecords.create).not.toHaveBeenCalled();
  });

  test('a server vendor error shows under the vendor field', async () => {
    csrAPI.partnerRecords.create.mockRejectedValue(
      fieldErr({ vendorNameId: ['This vendor is already a CSR partner.'] }),
    );
    render(<CSRPartnerFormPage />);
    await screen.findByRole('combobox', { name: NAME });
    await pick(NAME, 'A1 Classes · Coaching');
    await pick(TYPE, 'Life Skills');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    const help = await screen.findByText('This vendor is already a CSR partner.');
    expect(help).toHaveAttribute('id', 'p-vendor-help');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('no TTA vendor record select until a vendor is picked', async () => {
    render(<CSRPartnerFormPage />);
    await screen.findByRole('combobox', { name: NAME });
    expect(screen.queryByLabelText(RECORD)).not.toBeInTheDocument();
    expect(csrAPI.partnerRecords.vendorRecords).not.toHaveBeenCalled();
  });

  test('the TTA vendor records with that name are offered, and the pick is sent as vendorId', async () => {
    csrAPI.partnerRecords.vendorRecords.mockResolvedValue(RECORDS);
    csrAPI.partnerRecords.create.mockResolvedValue({ id: 9 });
    render(<CSRPartnerFormPage />);
    await screen.findByRole('combobox', { name: NAME });
    await pick(NAME, 'A1 Classes · Coaching');
    expect(csrAPI.partnerRecords.vendorRecords).toHaveBeenCalledWith(31);

    const record = await screen.findByRole('combobox', { name: RECORD });
    await waitFor(() => expect(record).toBeEnabled());
    expect(record).toHaveAttribute('placeholder', 'Not set up in TTA yet');
    await waitFor(() => expect(record).toHaveAccessibleDescription(RECORD_HELP));
    await openList(RECORD);
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'A1 Classes · Coaching · Pune, Maharashtra',
      'A1 Classes · Goa',
    ]);
    await userEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'A1 Classes · Goa' }));
    await pick(TYPE, 'Life Skills');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(csrAPI.partnerRecords.create).toHaveBeenCalledWith({
      vendorNameId: 31, partnerCategoryId: 7, vendorId: 302,
    }));
  });

  test('no TTA record with that name: only the not-set-up choice, and says so', async () => {
    render(<CSRPartnerFormPage />);
    await screen.findByRole('combobox', { name: NAME });
    await pick(NAME, 'A1 Classes · Coaching');
    expect(await screen.findByText(`No vendor record with this name in TTA yet. ${RECORD_HELP}`)).toBeInTheDocument();
    const record = screen.getByRole('combobox', { name: RECORD });
    expect(record).toHaveValue('');
    expect(record).toHaveAttribute('placeholder', 'Not set up in TTA yet');
  });

  test('changing the vendor reloads its records and clears the pick', async () => {
    const kick = { id: 401, name: 'Kick Academy', vendorType: 'Partner', city: 'Delhi', state: 'Delhi' };
    csrAPI.partnerRecords.vendorRecords.mockImplementation(
      async (vendorNameId) => (String(vendorNameId) === '31' ? RECORDS : [kick]),
    );
    render(<CSRPartnerFormPage />);
    await screen.findByRole('combobox', { name: NAME });
    await pick(NAME, 'A1 Classes · Coaching');
    await waitFor(() => expect(screen.getByRole('combobox', { name: RECORD })).toBeEnabled());
    await pick(RECORD, 'A1 Classes · Coaching · Pune, Maharashtra');
    expect(screen.getByRole('combobox', { name: RECORD })).toHaveValue('A1 Classes · Coaching · Pune, Maharashtra');

    await pick(NAME, 'Kick Academy · Partner');
    expect(screen.getByRole('combobox', { name: RECORD })).toHaveValue('');
    await waitFor(() => expect(csrAPI.partnerRecords.vendorRecords).toHaveBeenLastCalledWith(32));
    await waitFor(() => expect(screen.getByRole('combobox', { name: RECORD })).toBeEnabled());
    await openList(RECORD);
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Kick Academy · Partner · Delhi, Delhi']);
  });

  test('a server vendorId error shows under the TTA vendor record field', async () => {
    csrAPI.partnerRecords.vendorRecords.mockResolvedValue(RECORDS);
    csrAPI.partnerRecords.create.mockRejectedValue(
      fieldErr({ vendorId: ['That vendor record is for B2 Classes, not A1 Classes.'] }),
    );
    render(<CSRPartnerFormPage />);
    await screen.findByRole('combobox', { name: NAME });
    await pick(NAME, 'A1 Classes · Coaching');
    await waitFor(() => expect(screen.getByRole('combobox', { name: RECORD })).toBeEnabled());
    await pick(RECORD, 'A1 Classes · Coaching · Pune, Maharashtra');
    await pick(TYPE, 'Life Skills');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    const help = await screen.findByText('That vendor record is for B2 Classes, not A1 Classes.');
    expect(help).toHaveAttribute('id', 'p-vendor-record-help');
    expect(screen.getByRole('combobox', { name: RECORD })).toHaveAttribute('aria-invalid', 'true');
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('no vendor left to add: says why, names the Admin list, and cannot save', async () => {
    csrAPI.partnerRecords.vendorOptions.mockResolvedValue([]);
    render(<CSRPartnerFormPage />);
    expect(await screen.findByText('No vendor names left to pick. From Admin > Vendor Names.')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: NAME })).toBeDisabled();
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
  });

  test('without the config right, no add row is offered', async () => {
    render(<CSRPartnerFormPage />);
    await screen.findByRole('combobox', { name: NAME });
    await userEvent.type(screen.getByRole('combobox', { name: NAME }), 'Star Club');
    expect(screen.getByText('No vendor name matches.')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^add/i })).not.toBeInTheDocument();
    await userEvent.type(screen.getByRole('combobox', { name: TYPE }), 'Sports Science');
    expect(screen.getByText('No partner type matches.')).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: /^add/i })).not.toBeInTheDocument();
    expect(addConfigOption).not.toHaveBeenCalled();
  });
});

describe('adding to the Admin lists from the form (config edit right)', () => {
  beforeEach(() => { mockCanEditConfig = true; });

  test('a new partner name goes to Admin > Vendor Names and is picked', async () => {
    addConfigOption.mockResolvedValue([{ id: 40, name: 'Star Club' }]);
    csrAPI.partnerRecords.vendorOptions
      .mockResolvedValueOnce(VENDORS)
      .mockResolvedValueOnce([...VENDORS, { id: 40, name: 'Star Club', serviceType: '' }]);
    csrAPI.partnerRecords.create.mockResolvedValue({ id: 9 });
    render(<CSRPartnerFormPage />);
    await screen.findByRole('combobox', { name: NAME });
    await userEvent.type(screen.getByRole('combobox', { name: NAME }), 'Star Club');
    await userEvent.click(screen.getByRole('option', { name: 'Add "Star Club" to Admin > Vendor Names' }));

    expect(addConfigOption).toHaveBeenCalledWith('vendorNames', { name: 'Star Club' });
    await waitFor(() => expect(screen.getByRole('combobox', { name: NAME })).toHaveValue('Star Club'));
    await waitFor(() => expect(csrAPI.partnerRecords.vendorRecords).toHaveBeenCalledWith(40));

    await pick(TYPE, 'Life Skills');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(csrAPI.partnerRecords.create).toHaveBeenCalledWith({
      vendorNameId: 40, partnerCategoryId: 7, vendorId: null,
    }));
  });

  test('a new partner type goes to Admin > CSR > CSR Partner Types and is picked', async () => {
    addConfigOption.mockImplementation(async () => {
      mockCategories = [...CATEGORIES, { id: 12, name: 'Sports Science' }];
      mockCfgVersion += 1;
      return mockCategories;
    });
    csrAPI.partnerRecords.create.mockResolvedValue({ id: 9 });
    render(<CSRPartnerFormPage />);
    await screen.findByRole('combobox', { name: NAME });
    expect(screen.getByRole('combobox', { name: TYPE })).toHaveAccessibleDescription(
      'Managed in Admin > CSR > CSR Partner Types. Type a new type to add it there.',
    );
    await pick(NAME, 'A1 Classes · Coaching');
    await userEvent.type(screen.getByRole('combobox', { name: TYPE }), 'Sports Science');
    await userEvent.click(screen.getByRole('option', { name: 'Add "Sports Science" to Admin > CSR > CSR Partner Types' }));

    expect(addConfigOption).toHaveBeenCalledWith('partnerCategories', { name: 'Sports Science' });
    await waitFor(() => expect(screen.getByRole('combobox', { name: TYPE })).toHaveValue('Sports Science'));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(csrAPI.partnerRecords.create).toHaveBeenCalledWith({
      vendorNameId: 31, partnerCategoryId: 12, vendorId: null,
    }));
  });

  test('a name that cannot be picked after adding says why and stays unpicked', async () => {
    addConfigOption.mockResolvedValue([{ id: 40, name: 'Star Club' }]);
    render(<CSRPartnerFormPage />);
    await screen.findByRole('combobox', { name: NAME });
    await userEvent.type(screen.getByRole('combobox', { name: NAME }), 'Star Club');
    await userEvent.click(screen.getByRole('option', { name: 'Add "Star Club" to Admin > Vendor Names' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      '"Star Club" is in Admin > Vendor Names but cannot be picked here. It may already be a partner.',
    );
    expect(csrAPI.partnerRecords.vendorRecords).not.toHaveBeenCalled();
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
    const vendor = await screen.findByLabelText(NAME);
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
    const record = await screen.findByRole('combobox', { name: RECORD });
    await waitFor(() => expect(record).toHaveValue('A1 Classes · Coaching · Pune, Maharashtra'));
    expect(csrAPI.partnerRecords.vendorRecords).toHaveBeenCalledWith(31);

    await userEvent.click(screen.getAllByRole('button', { name: 'Clear selection' })[0]);
    expect(record).toHaveValue('');
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
    const record = await screen.findByRole('combobox', { name: RECORD });
    await waitFor(() => expect(record).toHaveValue('A1 Classes Old · Coaching · Nagpur, Maharashtra'));
    await waitFor(() => expect(record).toBeEnabled());
    await openList(RECORD);
    expect(within(screen.getByRole('listbox')).getByRole('option', { name: 'A1 Classes Old · Coaching · Nagpur, Maharashtra' })).toBeInTheDocument();
    expect(within(screen.getByRole('listbox')).getByRole('option', { name: 'A1 Classes · Goa' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');

    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(csrAPI.partnerRecords.update).toHaveBeenCalledWith('5', {
      partnerCategoryId: 7, isActive: true, vendorId: 299,
    }));
  });
});
