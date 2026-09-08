// The contact form is a page now, not a dialog. Coverage focuses on what only
// exists because it became a page (loading by :id, refusing a blank form on a
// failed load, the ?project= query param guard) and on the two decisions from
// the 26 Aug review that must not silently regress: type is asked first, and
// Vendor reads as "Partner representative" while the stored value stays Vendor.
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CSRContactFormPage from './CSRContactFormPage';

const mockNavigate = jest.fn();
let mockParams = {};
let mockSearch = new URLSearchParams();

jest.mock('react-router-dom', () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
  useParams: () => mockParams,
  useSearchParams: () => [mockSearch],
}), { virtual: true });

jest.mock('../../services/api', () => ({
  csrAPI: {
    contacts: { getById: jest.fn(), getAll: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}));

// The SAME catalog that classifies a partner vendor — not a list of this
// form's own.
jest.mock('../../utils/adminStorage', () => ({
  getPartnerCategories: () => [
    { id: 7, name: 'Life Skills' },
    { id: 8, name: 'Player Development' },
  ],
}));

jest.mock('../../hooks/useConfigVersion', () => ({ __esModule: true, default: () => 0 }));

const { csrAPI } = require('../../services/api');

const CONTACT = {
  id: 4, projectId: 11, projectName: 'Grassroots Football',
  name: 'Aditi Rane', designation: 'CSR Lead', contactType: 'Client',
  email: 'aditi.rane@example.org', phone: '9820011223',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockSearch = new URLSearchParams();
  csrAPI.contacts.getAll.mockResolvedValue([]);
});

test('creating without ?project= stops rather than posting an orphan', async () => {
  render(<CSRContactFormPage />);
  expect(await screen.findByText(/no grant selected/i)).toBeInTheDocument();
  expect(screen.queryByLabelText(/^name/i)).toBeNull();
});

describe('creating a contact', () => {
  beforeEach(() => { mockSearch = new URLSearchParams({ project: '11' }); });

  test('the contact type is the first field on the page', async () => {
    render(<CSRContactFormPage />);
    await waitFor(() => expect(csrAPI.contacts.getAll).toHaveBeenCalled());
    const fields = screen.getAllByRole('combobox').concat(screen.getAllByRole('textbox'));
    // Contact Type (a <select>, role=combobox) must come before Name
    // (role=textbox) in document order — 26 Aug, 08:07: make them select it
    // at the very start, not at the end.
    const typeIdx = fields.findIndex((el) => el.id === 'c-type');
    const nameIdx = fields.findIndex((el) => el.id === 'c-name');
    expect(typeIdx).toBeGreaterThanOrEqual(0);
    expect(nameIdx).toBeGreaterThan(typeIdx);
  });

  test('Vendor reads as Partner representative but stores Vendor', async () => {
    render(<CSRContactFormPage />);
    await waitFor(() => expect(csrAPI.contacts.getAll).toHaveBeenCalled());
    const select = screen.getByLabelText(/contact type/i);
    const options = within(select).getAllByRole('option');
    const vendorOption = options.find((o) => o.value === 'Vendor');
    expect(vendorOption).toBeDefined();
    expect(vendorOption.textContent).toBe('Partner representative');
  });

  test('the partner type is asked only once the contact is a partner', async () => {
    render(<CSRContactFormPage />);
    await waitFor(() => expect(csrAPI.contacts.getAll).toHaveBeenCalled());
    // A client or IKF representative has no partner type — the API refuses the
    // combination, so the form must not offer it.
    expect(screen.queryByLabelText(/partner type/i)).toBeNull();

    await userEvent.selectOptions(screen.getByLabelText(/contact type/i), 'Vendor');
    expect(await screen.findByLabelText(/partner type/i)).toBeInTheDocument();
  });

  test('the partner type is sent as the catalog row id', async () => {
    csrAPI.contacts.create.mockResolvedValue({});
    render(<CSRContactFormPage />);
    await waitFor(() => expect(csrAPI.contacts.getAll).toHaveBeenCalled());

    await userEvent.selectOptions(screen.getByLabelText(/contact type/i), 'Vendor');
    await userEvent.selectOptions(await screen.findByLabelText(/partner type/i), '7');
    await userEvent.type(screen.getByLabelText(/^name/i), 'Partner Person');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.contacts.create).toHaveBeenCalled());
    expect(csrAPI.contacts.create.mock.calls[0][0].partnerCategoryId).toBe(7);
  });

  test('moving off partner clears the type rather than sending a refused pair', async () => {
    csrAPI.contacts.create.mockResolvedValue({});
    render(<CSRContactFormPage />);
    await waitFor(() => expect(csrAPI.contacts.getAll).toHaveBeenCalled());

    await userEvent.selectOptions(screen.getByLabelText(/contact type/i), 'Vendor');
    await userEvent.selectOptions(await screen.findByLabelText(/partner type/i), '8');
    await userEvent.selectOptions(screen.getByLabelText(/contact type/i), 'Client');
    await userEvent.type(screen.getByLabelText(/^name/i), 'Client Person');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.contacts.create).toHaveBeenCalled());
    const payload = csrAPI.contacts.create.mock.calls[0][0];
    expect(payload.contactType).toBe('Client');
    // null, not '' — the server field is an FK.
    expect(payload.partnerCategoryId).toBeNull();
  });

  test('a partner with no type recorded sends null, not an empty string', async () => {
    csrAPI.contacts.create.mockResolvedValue({});
    render(<CSRContactFormPage />);
    await waitFor(() => expect(csrAPI.contacts.getAll).toHaveBeenCalled());

    await userEvent.selectOptions(screen.getByLabelText(/contact type/i), 'Vendor');
    await userEvent.type(screen.getByLabelText(/^name/i), 'Untyped Partner');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.contacts.create).toHaveBeenCalled());
    expect(csrAPI.contacts.create.mock.calls[0][0].partnerCategoryId).toBeNull();
  });

  test('will not save without a name', async () => {
    render(<CSRContactFormPage />);
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(csrAPI.contacts.create).not.toHaveBeenCalled();
  });

  test('sends the payload with the grant from the query param', async () => {
    csrAPI.contacts.create.mockResolvedValue({});
    render(<CSRContactFormPage />);
    await waitFor(() => expect(csrAPI.contacts.getAll).toHaveBeenCalled());

    await userEvent.selectOptions(screen.getByLabelText(/contact type/i), 'Vendor');
    await userEvent.type(screen.getByLabelText(/^name/i), 'New Person');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.contacts.create).toHaveBeenCalled());
    const payload = csrAPI.contacts.create.mock.calls[0][0];
    expect(payload.name).toBe('New Person');
    expect(payload.contactType).toBe('Vendor');
    expect(payload.projectId).toBe(11);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/csr/11', { state: { saved: 'Contact added.' } },
    );
  });

  test('picking a known name prefills email and phone', async () => {
    csrAPI.contacts.getAll.mockResolvedValue([
      { id: 1, name: 'Sameer Joshi', email: 's@example.org', phone: '9820044556', designation: 'Programme Officer' },
    ]);
    render(<CSRContactFormPage />);
    await waitFor(() => expect(csrAPI.contacts.getAll).toHaveBeenCalled());

    const nameInput = screen.getByLabelText(/^name/i);
    await userEvent.type(nameInput, 'Sameer Joshi');
    // The suggestion match is exact-string, fired on the change that matches
    // a known contact's name.
    await waitFor(() => expect(screen.getByLabelText(/email/i)).toHaveValue('s@example.org'));
    expect(screen.getByLabelText(/phone/i)).toHaveValue('9820044556');
  });
});

describe('editing a contact', () => {
  beforeEach(() => { mockParams = { id: '4' }; });

  test('loads the record named in the URL and fills the form from it', async () => {
    csrAPI.contacts.getById.mockResolvedValue(CONTACT);
    render(<CSRContactFormPage />);

    await waitFor(() => expect(csrAPI.contacts.getById).toHaveBeenCalledWith('4'));
    expect(await screen.findByDisplayValue('Aditi Rane')).toBeInTheDocument();
  });

  test('an existing partner contact loads its recorded partner type', async () => {
    csrAPI.contacts.getById.mockResolvedValue({
      ...CONTACT, contactType: 'Vendor', partnerCategoryId: 8,
      partnerCategoryName: 'Player Development',
    });
    render(<CSRContactFormPage />);
    await screen.findByDisplayValue('Aditi Rane');
    expect(screen.getByLabelText(/partner type/i)).toHaveValue('8');
  });

  test('a record that will not load stops, rather than offering an empty form', async () => {
    csrAPI.contacts.getById.mockRejectedValue(new Error('404'));
    render(<CSRContactFormPage />);

    expect(await screen.findByText(/contact not found/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^name/i)).toBeNull();
    expect(csrAPI.contacts.create).not.toHaveBeenCalled();
  });

  test('cancel leaves for the loaded grant without saving', async () => {
    csrAPI.contacts.getById.mockResolvedValue(CONTACT);
    render(<CSRContactFormPage />);
    await screen.findByDisplayValue('Aditi Rane');

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(csrAPI.contacts.create).not.toHaveBeenCalled();
    expect(csrAPI.contacts.update).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/csr/11', undefined);
  });
});
