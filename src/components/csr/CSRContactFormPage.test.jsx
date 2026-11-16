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
    people: { getAll: jest.fn() },
    partners: { getAll: jest.fn() },
    partnerRecords: { getAll: jest.fn() },
  },
}));

const { csrAPI } = require('../../services/api');

const CONTACT = {
  id: 4, projectId: 11, projectName: 'Grassroots Football', personId: 7, personActive: true,
  name: 'Aditi Rane', designation: 'CSR Lead', contactType: 'Client',
  email: 'aditi.rane@example.org', phone: '9820011223',
};

// The Admin contacts list (D-037), paginated as the API returns it.
const PEOPLE = {
  results: [
    { id: 7, name: 'Aditi Rane', designation: 'CSR Lead', email: 'aditi.rane@example.org', phone: '9820011223', isActive: true },
    { id: 8, name: 'Sameer Joshi', designation: 'Programme Officer', email: 's@example.org', phone: '9820044556', isActive: true },
    { id: 9, name: 'Retired Person', designation: '', email: 'r@example.org', phone: '', isActive: false },
  ],
};

const peopleLoaded = () => waitFor(
  () => expect(screen.getByRole('combobox', { name: /person/i })).toBeEnabled(),
);

const pickPerson = async (name) => {
  const input = screen.getByRole('combobox', { name: /person/i });
  await userEvent.clear(input);
  await userEvent.type(input, name);
  await userEvent.click(await screen.findByRole('option', { name: new RegExp(`^${name}`) }));
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockSearch = new URLSearchParams();
  csrAPI.contacts.getAll.mockResolvedValue([]);
  csrAPI.people.getAll.mockResolvedValue(PEOPLE);
  csrAPI.partners.getAll.mockResolvedValue([
    { id: 3, name: 'A1 Classes' },
    { id: 4, name: 'Kick Academy' },
  ]);
  // Paginated, as the API returns it. Kick Academy (vendor-name id 4) has a
  // type; A1 Classes (3) has no CSR partner record at all.
  csrAPI.partnerRecords.getAll.mockResolvedValue({
    results: [
      { id: 21, vendorNameId: 4, partnerName: 'Kick Academy', partnerCategoryName: 'Life skill' },
      { id: 22, vendorNameId: 9, partnerName: 'Untyped Trust', partnerCategoryName: '' },
    ],
  });
});

test('creating without ?project= stops rather than posting an orphan', async () => {
  render(<CSRContactFormPage />);
  expect(await screen.findByText(/no grant selected/i)).toBeInTheDocument();
  expect(screen.queryByRole('combobox', { name: /person/i })).toBeNull();
});

describe('creating a contact', () => {
  beforeEach(() => { mockSearch = new URLSearchParams({ project: '11' }); });

  test('the contact type is the first field, then the person, then the partner', async () => {
    render(<CSRContactFormPage />);
    await peopleLoaded();
    await userEvent.selectOptions(screen.getByLabelText(/contact type/i), 'Vendor');
    await screen.findByLabelText(/partner organisation/i);
    // Document order — 26 Aug, 08:07: make them select the type at the very
    // start, not at the end.
    expect(screen.getAllByRole('combobox').map((el) => el.id)).toEqual(['c-type', 'c-person', 'c-partner']);
  });

  test('Vendor reads as Partner representative but stores Vendor', async () => {
    render(<CSRContactFormPage />);
    await peopleLoaded();
    const select = screen.getByLabelText(/contact type/i);
    const options = within(select).getAllByRole('option');
    const vendorOption = options.find((o) => o.value === 'Vendor');
    expect(vendorOption).toBeDefined();
    expect(vendorOption.textContent).toBe('Partner representative');
  });

  // D-022: a partner's type is the partner's own, set on the CSR Partners page.
  // The contact form no longer asks it.
  test('there is no partner type select, even for a partner representative', async () => {
    render(<CSRContactFormPage />);
    await peopleLoaded();
    await userEvent.selectOptions(screen.getByLabelText(/contact type/i), 'Vendor');
    await screen.findByLabelText(/partner organisation/i);
    expect(screen.queryByLabelText(/partner type/i)).toBeNull();
    expect(screen.getAllByRole('combobox').map((el) => el.id)).not.toContain('c-partner-category');
  });

  test('a partner contact is saved without a partnerCategoryId key', async () => {
    csrAPI.contacts.create.mockResolvedValue({});
    render(<CSRContactFormPage />);
    await peopleLoaded();

    await userEvent.selectOptions(screen.getByLabelText(/contact type/i), 'Vendor');
    await userEvent.selectOptions(await screen.findByLabelText(/partner organisation/i), '4');
    await pickPerson('Sameer Joshi');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.contacts.create).toHaveBeenCalled());
    expect(csrAPI.contacts.create.mock.calls[0][0]).not.toHaveProperty('partnerCategoryId');
  });

  test('a non-partner contact is saved without a partnerCategoryId key', async () => {
    csrAPI.contacts.create.mockResolvedValue({});
    render(<CSRContactFormPage />);
    await peopleLoaded();

    await userEvent.selectOptions(screen.getByLabelText(/contact type/i), 'Client');
    await pickPerson('Sameer Joshi');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.contacts.create).toHaveBeenCalled());
    const payload = csrAPI.contacts.create.mock.calls[0][0];
    expect(payload.contactType).toBe('Client');
    expect(payload).not.toHaveProperty('partnerCategoryId');
  });

  test("picking a partner shows the partner's own type, read-only", async () => {
    render(<CSRContactFormPage />);
    await waitFor(() => expect(csrAPI.partnerRecords.getAll).toHaveBeenCalled());

    await userEvent.selectOptions(screen.getByLabelText(/contact type/i), 'Vendor');
    expect(screen.queryByText(/^Partner type:/)).toBeNull();
    await userEvent.selectOptions(await screen.findByLabelText(/partner organisation/i), '4');
    expect(await screen.findByText('Partner type: Life skill (set on the partner)')).toBeInTheDocument();
  });

  test('a partner with no CSR partner record says its type is not set yet', async () => {
    render(<CSRContactFormPage />);
    await waitFor(() => expect(csrAPI.partnerRecords.getAll).toHaveBeenCalled());

    await userEvent.selectOptions(screen.getByLabelText(/contact type/i), 'Vendor');
    await userEvent.selectOptions(await screen.findByLabelText(/partner organisation/i), '3');
    expect(await screen.findByText('Partner type: not set on the partner yet')).toBeInTheDocument();
  });

  test('a partner record with an empty type says its type is not set yet', async () => {
    csrAPI.partners.getAll.mockResolvedValue([{ id: 9, name: 'Untyped Trust' }]);
    render(<CSRContactFormPage />);
    await waitFor(() => expect(csrAPI.partnerRecords.getAll).toHaveBeenCalled());

    await userEvent.selectOptions(screen.getByLabelText(/contact type/i), 'Vendor');
    const picker = await screen.findByLabelText(/partner organisation/i);
    await waitFor(() => expect(within(picker).getByRole('option', { name: 'Untyped Trust' })).toBeInTheDocument());
    await userEvent.selectOptions(picker, '9');
    expect(await screen.findByText('Partner type: not set on the partner yet')).toBeInTheDocument();
  });

  test('if the partner list cannot be read, no type line shows and saving still works', async () => {
    csrAPI.partnerRecords.getAll.mockRejectedValue(new Error('500'));
    csrAPI.contacts.create.mockResolvedValue({});
    render(<CSRContactFormPage />);
    await waitFor(() => expect(csrAPI.partnerRecords.getAll).toHaveBeenCalled());

    await userEvent.selectOptions(screen.getByLabelText(/contact type/i), 'Vendor');
    await userEvent.selectOptions(await screen.findByLabelText(/partner organisation/i), '4');
    expect(screen.queryByText(/^Partner type:/)).toBeNull();
    await pickPerson('Sameer Joshi');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(csrAPI.contacts.create).toHaveBeenCalled());
    expect(csrAPI.contacts.create.mock.calls[0][0].partnerId).toBe(4);
  });

  test('the partner organisation is asked only for a partner, from the Admin partner list', async () => {
    render(<CSRContactFormPage />);
    await waitFor(() => expect(csrAPI.partners.getAll).toHaveBeenCalled());
    expect(screen.queryByLabelText(/partner organisation/i)).toBeNull();

    await userEvent.selectOptions(screen.getByLabelText(/contact type/i), 'Client');
    expect(screen.queryByLabelText(/partner organisation/i)).toBeNull();

    await userEvent.selectOptions(screen.getByLabelText(/contact type/i), 'Vendor');
    const picker = await screen.findByLabelText(/partner organisation/i);
    expect(within(picker).getAllByRole('option').map((o) => o.textContent))
      .toEqual(['— none —', 'A1 Classes', 'Kick Academy']);
  });

  test('the partner organisation is sent as partnerId', async () => {
    csrAPI.contacts.create.mockResolvedValue({});
    render(<CSRContactFormPage />);
    await waitFor(() => expect(csrAPI.partners.getAll).toHaveBeenCalled());

    await userEvent.selectOptions(screen.getByLabelText(/contact type/i), 'Vendor');
    await userEvent.selectOptions(await screen.findByLabelText(/partner organisation/i), '4');
    await pickPerson('Sameer Joshi');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.contacts.create).toHaveBeenCalled());
    expect(csrAPI.contacts.create.mock.calls[0][0].partnerId).toBe(4);
  });

  test('moving off partner clears the partner organisation', async () => {
    csrAPI.contacts.create.mockResolvedValue({});
    render(<CSRContactFormPage />);
    await waitFor(() => expect(csrAPI.partners.getAll).toHaveBeenCalled());

    await userEvent.selectOptions(screen.getByLabelText(/contact type/i), 'Vendor');
    await userEvent.selectOptions(await screen.findByLabelText(/partner organisation/i), '3');
    await userEvent.selectOptions(screen.getByLabelText(/contact type/i), 'IKF');
    await pickPerson('Sameer Joshi');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.contacts.create).toHaveBeenCalled());
    expect(csrAPI.contacts.create.mock.calls[0][0].partnerId).toBeNull();
  });

  test('a server refusal on partnerId is shown under the partner organisation', async () => {
    const err = new Error('partnerId: Not a partner.');
    err.response = { status: 400, data: { partnerId: ['Not a partner.'] } };
    csrAPI.contacts.create.mockRejectedValue(err);
    render(<CSRContactFormPage />);
    await waitFor(() => expect(csrAPI.partners.getAll).toHaveBeenCalled());

    await userEvent.selectOptions(screen.getByLabelText(/contact type/i), 'Vendor');
    await userEvent.selectOptions(await screen.findByLabelText(/partner organisation/i), '3');
    await pickPerson('Sameer Joshi');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText('Not a partner.')).toBeInTheDocument();
    expect(screen.getByLabelText(/partner organisation/i)).toHaveAttribute('aria-invalid', 'true');
  });

  test('will not save without a person', async () => {
    render(<CSRContactFormPage />);
    await peopleLoaded();
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(csrAPI.contacts.create).not.toHaveBeenCalled();
    expect(screen.getByText('Pick a person')).toBeInTheDocument();
  });

  test('sends the payload with the grant from the query param', async () => {
    csrAPI.contacts.create.mockResolvedValue({});
    render(<CSRContactFormPage />);
    await peopleLoaded();

    await userEvent.selectOptions(screen.getByLabelText(/contact type/i), 'Vendor');
    await pickPerson('Sameer Joshi');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.contacts.create).toHaveBeenCalled());
    const payload = csrAPI.contacts.create.mock.calls[0][0];
    expect(payload.personId).toBe(8);
    expect(payload.contactType).toBe('Vendor');
    expect(payload.projectId).toBe(11);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/csr/11', { state: { saved: 'Contact added.', tab: 1 } },
    );
  });

  test('there are no typed name, designation, email or phone inputs', async () => {
    render(<CSRContactFormPage />);
    await peopleLoaded();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByLabelText(/^name/i)).toBeNull();
    expect(screen.queryByLabelText(/^email/i)).toBeNull();
    expect(screen.getByText('People are added in Admin > CSR > Contacts, by an admin.')).toBeInTheDocument();
  });

  test('picking a person shows their details read-only and sends only personId', async () => {
    csrAPI.contacts.create.mockResolvedValue({});
    render(<CSRContactFormPage />);
    await peopleLoaded();
    await userEvent.selectOptions(screen.getByLabelText(/contact type/i), 'Client');
    await pickPerson('Sameer Joshi');

    expect(screen.getByLabelText(/^email/i)).toHaveValue('s@example.org');
    expect(screen.getByLabelText(/^email/i)).toHaveAttribute('readonly');
    expect(screen.getByLabelText(/^phone/i)).toHaveValue('9820044556');
    expect(screen.getByLabelText(/^designation/i)).toHaveValue('Programme Officer');

    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(csrAPI.contacts.create).toHaveBeenCalled());
    const payload = csrAPI.contacts.create.mock.calls[0][0];
    expect(payload).toEqual({ personId: 8, contactType: 'Client', partnerId: null, projectId: 11 });
  });

  test('the picker shows designation and email as a hint, and offers only active people', async () => {
    render(<CSRContactFormPage />);
    await peopleLoaded();
    await userEvent.click(screen.getByRole('combobox', { name: /person/i }));
    const names = within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent);
    expect(names).toEqual([
      'Aditi RaneCSR Lead · aditi.rane@example.org',
      'Sameer JoshiProgramme Officer · s@example.org',
    ]);
  });

  test('with no people on the list, the picker says where they are added', async () => {
    csrAPI.people.getAll.mockResolvedValue({ results: [] });
    render(<CSRContactFormPage />);
    expect(await screen.findByText('No people yet. People are added in Admin > CSR > Contacts, by an admin.'))
      .toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /person/i })).toBeDisabled();
  });

  test('a server refusal on personId is shown under the person', async () => {
    const err = new Error('personId: Sameer Joshi is already a contact of this type on this grant.');
    err.response = { status: 400, data: { personId: ['Sameer Joshi is already a contact of this type on this grant.'] } };
    csrAPI.contacts.create.mockRejectedValue(err);
    render(<CSRContactFormPage />);
    await peopleLoaded();
    await pickPerson('Sameer Joshi');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(screen.getByRole('combobox', { name: /person/i }))
      .toHaveAttribute('aria-invalid', 'true'));
  });
});

describe('editing a contact', () => {
  beforeEach(() => { mockParams = { id: '4' }; });

  test('loads the record named in the URL and fills the form from it', async () => {
    csrAPI.contacts.getById.mockResolvedValue(CONTACT);
    render(<CSRContactFormPage />);

    await waitFor(() => expect(csrAPI.contacts.getById).toHaveBeenCalledWith('4'));
    expect(await screen.findByDisplayValue('Aditi Rane')).toBeInTheDocument();
    expect(screen.getByLabelText(/^phone/i)).toHaveValue('9820011223');
  });

  test('a contact naming a person retired in Admin keeps them, and is saved with them', async () => {
    csrAPI.contacts.getById.mockResolvedValue({
      ...CONTACT, personId: 9, personActive: false, name: 'Retired Person', email: 'r@example.org',
    });
    csrAPI.contacts.update.mockResolvedValue({});
    render(<CSRContactFormPage />);
    expect(await screen.findByDisplayValue('Retired Person (inactive)')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(csrAPI.contacts.update).toHaveBeenCalled());
    expect(csrAPI.contacts.update.mock.calls[0][1].personId).toBe(9);
  });

  test('editing a contact with a legacy partner type leaves it out of the save, so it is not cleared', async () => {
    csrAPI.contacts.getById.mockResolvedValue({
      ...CONTACT, contactType: 'Vendor', partnerId: 4, partnerName: 'Kick Academy',
      partnerCategoryId: 8, partnerCategoryName: 'Player Development', partnerTypeFromPartner: false,
    });
    csrAPI.contacts.update.mockResolvedValue({});
    render(<CSRContactFormPage />);
    await screen.findByDisplayValue('Aditi Rane');

    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(csrAPI.contacts.update).toHaveBeenCalled());
    const payload = csrAPI.contacts.update.mock.calls[0][1];
    expect(payload).not.toHaveProperty('partnerCategoryId');
    expect(payload.partnerId).toBe(4);
  });

  test('a partner Admin has removed shows its name exactly as the server gives it', async () => {
    csrAPI.contacts.getById.mockResolvedValue({
      ...CONTACT, contactType: 'Vendor', partnerId: 99, partnerName: 'Old Partner Trust (removed in TTA)',
    });
    render(<CSRContactFormPage />);
    await screen.findByDisplayValue('Aditi Rane');
    const picker = screen.getByLabelText(/partner organisation/i);
    await waitFor(() => expect(
      within(picker).getByRole('option', { name: 'Old Partner Trust (removed in TTA)' }),
    ).toBeInTheDocument());
  });

  test('a partner no longer in the Admin partner list stays selected, and is sent back', async () => {
    csrAPI.contacts.getById.mockResolvedValue({
      ...CONTACT, contactType: 'Vendor', partnerId: 99, partnerName: 'Old Partner Trust',
    });
    csrAPI.contacts.update.mockResolvedValue({});
    render(<CSRContactFormPage />);
    await screen.findByDisplayValue('Aditi Rane');

    const picker = screen.getByLabelText(/partner organisation/i);
    await waitFor(() => expect(within(picker).getByRole('option', { name: 'A1 Classes' })).toBeInTheDocument());
    expect(picker).toHaveValue('99');
    expect(within(picker).getByRole('option', { name: 'Old Partner Trust' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(csrAPI.contacts.update).toHaveBeenCalled());
    expect(csrAPI.contacts.update.mock.calls[0][1].partnerId).toBe(99);
  });

  test('a record that will not load stops, rather than offering an empty form', async () => {
    csrAPI.contacts.getById.mockRejectedValue(new Error('404'));
    render(<CSRContactFormPage />);

    expect(await screen.findByText(/contact not found/i)).toBeInTheDocument();
    expect(screen.queryByRole('combobox', { name: /person/i })).toBeNull();
    expect(csrAPI.contacts.create).not.toHaveBeenCalled();
  });

  test('cancel leaves for the loaded grant without saving', async () => {
    csrAPI.contacts.getById.mockResolvedValue(CONTACT);
    render(<CSRContactFormPage />);
    await screen.findByDisplayValue('Aditi Rane');

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(csrAPI.contacts.create).not.toHaveBeenCalled();
    expect(csrAPI.contacts.update).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/csr/11', { state: { tab: 1 } });
  });
});
