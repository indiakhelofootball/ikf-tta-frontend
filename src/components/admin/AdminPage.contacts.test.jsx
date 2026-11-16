// D-037 (16 Nov 2026): a CSR contact person is stored once, on the Admin
// contacts list, and each grant's Contacts tab picks from it. The panel writes
// through the CSR people API, not the config bulk endpoint.
import React from 'react';
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react';

jest.mock('react-router-dom', () => ({ __esModule: true, useNavigate: () => jest.fn() }), {
  virtual: true,
});

jest.mock('../../services/api', () => ({
  configAPI: {
    getByCategory: jest.fn(),
    bulk: jest.fn(),
    delete: jest.fn(),
    rename: jest.fn(),
  },
  csrAPI: {
    activityTypes: { getAll: jest.fn() },
    people: {
      getAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const { configAPI, csrAPI } = require('../../services/api');
const AdminPage = require('./AdminPage').default;

const ASHA = {
  id: 5, name: 'Asha Rao', designation: 'CSR Head', email: 'asha@acme.org', phone: '900', isActive: true,
};
const VIKRAM = {
  id: 6, name: 'Vikram Singh', designation: 'IKF Coach', email: '', phone: '911', isActive: false,
};

beforeEach(() => {
  configAPI.getByCategory.mockResolvedValue([]);
  configAPI.bulk.mockResolvedValue(undefined);
  csrAPI.activityTypes.getAll.mockResolvedValue([]);
  csrAPI.people.getAll.mockResolvedValue({ results: [ASHA, VIKRAM] });
  csrAPI.people.create.mockResolvedValue({ id: 7 });
  csrAPI.people.update.mockResolvedValue({});
  csrAPI.people.delete.mockResolvedValue(null);
  localStorage.clear();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

async function openCsrSection() {
  render(<AdminPage />);
  fireEvent.click(screen.getByText('CSR'));
  await screen.findByText('Asha Rao');
}

// MUI renders the panel without a role, so it is found by class, as in AdminPage.writes.test.jsx.
// eslint-disable-next-line testing-library/no-node-access
const contactsPanel = () => screen.getByText('Add New Person').closest('.MuiPaper-root');
const addButton = () => within(contactsPanel()).getByRole('button', { name: 'Add' });

const typeInto = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

test('the CSR section lists the contact people from the CSR API, with their details', async () => {
  await openCsrSection();
  expect(screen.getByText('Contacts')).toBeInTheDocument();
  expect(screen.getByText(/Editing a person here updates every grant\./)).toBeInTheDocument();
  expect(screen.getByText('CSR Head · asha@acme.org · 900')).toBeInTheDocument();
  expect(screen.getByText('Inactive')).toBeInTheDocument();
  expect(csrAPI.people.getAll).toHaveBeenCalled();
});

test('adding a person creates it through the CSR people API, never the config list', async () => {
  await openCsrSection();
  typeInto('New person name', '  Meera Nair ');
  typeInto('New person designation', 'Head of CSR');
  typeInto('New person email', 'meera@example.org');
  typeInto('New person phone', '98900');
  fireEvent.click(addButton());

  await waitFor(() => expect(csrAPI.people.create).toHaveBeenCalledWith({
    name: 'Meera Nair', designation: 'Head of CSR', email: 'meera@example.org', phone: '98900',
  }));
  expect(configAPI.bulk).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.getByLabelText('New person name')).toHaveValue(''));
  await waitFor(() => expect(csrAPI.people.getAll).toHaveBeenCalledTimes(2));
});

test('a person needs a name before Add is offered', async () => {
  await openCsrSection();
  typeInto('New person email', 'x@example.org');
  expect(addButton()).toBeDisabled();
});

test('a second person with an email already on the list is refused before saving', async () => {
  await openCsrSection();
  typeInto('New person name', 'A. Rao');
  typeInto('New person email', 'ASHA@acme.org');
  fireEvent.click(addButton());

  expect(await screen.findByText(/already on the list/)).toBeInTheDocument();
  expect(csrAPI.people.create).not.toHaveBeenCalled();
});

test("editing a person's phone saves every field by id", async () => {
  await openCsrSection();
  fireEvent.click(screen.getByLabelText('Edit Asha Rao'));
  typeInto('Edit phone', '98200 11223');
  fireEvent.click(screen.getByLabelText('Save'));

  await waitFor(() => expect(csrAPI.people.update).toHaveBeenCalledWith(5, {
    name: 'Asha Rao', designation: 'CSR Head', email: 'asha@acme.org', phone: '98200 11223', isActive: true,
  }));
});

test('a person a grant names cannot be deleted, and the server reason is shown', async () => {
  csrAPI.people.delete.mockRejectedValue({
    response: { data: { detail: "Asha Rao is a contact on 2 grants, so they can't be deleted." } },
  });
  await openCsrSection();
  fireEvent.click(screen.getByLabelText('Delete Asha Rao'));

  expect(await screen.findByText(/a contact on 2 grants, so they can't be deleted/)).toBeInTheDocument();
  expect(csrAPI.people.delete).toHaveBeenCalledWith(5);
  await waitFor(() => expect(csrAPI.people.getAll).toHaveBeenCalledTimes(2));
  expect(screen.getByText('Asha Rao')).toBeInTheDocument();
});

test('the filter box narrows the list by any field', async () => {
  await openCsrSection();
  fireEvent.change(screen.getByLabelText('Filter contacts'), { target: { value: 'ikf coach' } });
  expect(screen.queryByText('Asha Rao')).not.toBeInTheDocument();
  expect(screen.getByText('Vikram Singh')).toBeInTheDocument();
});
