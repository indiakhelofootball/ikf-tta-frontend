// A CSR partner is a vendor name whose service type is Partner (owner, 10 Oct
// 2026). The bulk save is get_or_create on (category, value), so editing a
// saved name through it skipped a service-type change and turned a rename into
// a second row. These tests pin the edit of a saved row onto an in-place update.
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
    update: jest.fn(),
  },
}));

import { configAPI } from '../../services/api';
import AdminPage from './AdminPage';

let vendorNameRows;

beforeEach(() => {
  vendorNameRows = [{ id: 57, value: 'A1 Classes', comment: '', serviceType: 'Printing', entityType: '' }];
  configAPI.getByCategory.mockImplementation((category) => {
    if (category === 'vendor_name') return Promise.resolve(vendorNameRows);
    if (category === 'service_type') {
      return Promise.resolve([{ id: 1, value: 'Partner' }, { id: 2, value: 'Printing' }]);
    }
    return Promise.resolve([]);
  });
  configAPI.bulk.mockResolvedValue(undefined);
  configAPI.delete.mockResolvedValue(undefined);
  configAPI.update.mockResolvedValue({});
  localStorage.clear();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

const vendorPanel = () => screen.getByText('Vendor Names').closest('.MuiPaper-root');

async function editA1ToPartner() {
  render(<AdminPage />);
  await waitFor(() => expect(within(vendorPanel()).getByText('A1 Classes')).toBeInTheDocument());

  fireEvent.click(within(vendorPanel()).getByLabelText('Edit'));
  // The edit row's Service Type is the panel's first select.
  fireEvent.mouseDown(within(vendorPanel()).getAllByRole('combobox')[0]);
  fireEvent.click(await screen.findByRole('option', { name: 'Partner' }));
  fireEvent.click(within(vendorPanel()).getByLabelText('Save'));
}

test('the panel tells admins a Partner vendor name becomes a CSR partner', async () => {
  render(<AdminPage />);
  expect(within(vendorPanel()).getByText(/service type Partner appears as a partner in CSR/i))
    .toBeInTheDocument();
});

test('editing a saved vendor name updates that row in place, not through the bulk save', async () => {
  configAPI.update.mockImplementation(() => {
    vendorNameRows = [{ ...vendorNameRows[0], serviceType: 'Partner' }];
    return Promise.resolve({});
  });

  await editA1ToPartner();

  await waitFor(() => expect(configAPI.update).toHaveBeenCalledWith(57, {
    category: 'vendor_name', value: 'A1 Classes', serviceType: 'Partner', entityType: '', isActive: true,
  }));
  expect(configAPI.bulk).not.toHaveBeenCalled();
  expect(configAPI.delete).not.toHaveBeenCalled();
  await waitFor(() => expect(within(vendorPanel()).getByText('Partner')).toBeInTheDocument());
});

test('a refused update shows the server message and keeps the saved row', async () => {
  configAPI.update.mockRejectedValue(new Error('value: "A1 Classes" already exists in vendor_name.'));

  await editA1ToPartner();

  expect(await screen.findByText('value: "A1 Classes" already exists in vendor_name.')).toBeInTheDocument();
  expect(within(vendorPanel()).getByText('A1 Classes')).toBeInTheDocument();
  expect(within(vendorPanel()).getByText('Printing')).toBeInTheDocument();
  expect(configAPI.bulk).not.toHaveBeenCalled();
});
