// The Utilisation Certificate types are an admin-managed catalogue, edited in
// TTA Admin like the workshop and training-programme ones. CSRProject holds a
// type by ForeignKey, so a rename must be the backend's in-place rename, never
// the delete-and-recreate the ordinary save path performs.
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

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
}));

const { configAPI } = require('../../services/api');
const AdminPage = require('./AdminPage').default;

beforeEach(() => {
  configAPI.getByCategory.mockImplementation((category) =>
    Promise.resolve(
      category === 'utilisation_type'
        ? [{ id: 51, value: 'Final / Closure', comment: '' }]
        : []
    )
  );
  configAPI.bulk.mockResolvedValue(undefined);
  configAPI.delete.mockResolvedValue(undefined);
  configAPI.rename.mockResolvedValue({ message: 'ok' });
  localStorage.clear();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

async function openCsrSection() {
  render(<AdminPage />);
  fireEvent.click(screen.getByText('CSR'));
  await screen.findByText('Final / Closure');
}

test('the CSR section shows the certificate types from the catalogue', async () => {
  await openCsrSection();
  expect(screen.getByText('Utilisation Certificate Types')).toBeInTheDocument();
  expect(configAPI.getByCategory).toHaveBeenCalledWith('utilisation_type');
});

test('renaming a type goes through the backend rename and names grants', async () => {
  await openCsrSection();

  fireEvent.click(screen.getByLabelText('Edit'));
  fireEvent.change(screen.getByDisplayValue('Final / Closure'), { target: { value: 'Closure' } });
  fireEvent.click(screen.getByLabelText('Save'));

  await waitFor(() =>
    expect(configAPI.rename).toHaveBeenCalledWith('utilisation_type', 'Final / Closure', 'Closure')
  );
  expect(configAPI.delete).not.toHaveBeenCalled();
  expect(await screen.findByText(/Every CSR grant using it follows automatically/)).toBeInTheDocument();
});

test('adding a type saves it under the utilisation_type category', async () => {
  await openCsrSection();

  // Certificate types are the last option panel on the page, so theirs is the
  // last "Option name" field.
  const field = screen.getAllByPlaceholderText('Option name').at(-1);
  fireEvent.change(field, { target: { value: 'Periodic' } });
  fireEvent.keyDown(field, { key: 'Enter' });

  await waitFor(() => expect(configAPI.bulk).toHaveBeenCalled());
  expect(configAPI.bulk.mock.calls[0][0]).toEqual(expect.arrayContaining([
    expect.objectContaining({ category: 'utilisation_type', value: 'Periodic' }),
    expect.objectContaining({ category: 'utilisation_type', value: 'Final / Closure' }),
  ]));
});
