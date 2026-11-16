// D-037: a CSR funder is one Admin record. Each grant picks it and the funder
// portal shows its name, so a rename here must be the backend's in-place
// rename (CSRProject.funder holds the row by ForeignKey), never the
// delete-and-recreate the ordinary save path performs.
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
}));

const { configAPI } = require('../../services/api');
const AdminPage = require('./AdminPage').default;

// eslint-disable-next-line testing-library/no-node-access
const funderPanel = () => screen.getByText('Funder Organisations').closest('.MuiPaper-root');

beforeEach(() => {
  configAPI.getByCategory.mockImplementation((category) =>
    Promise.resolve(
      category === 'csr_funder'
        ? [{ id: 61, value: 'Vardhman Steel', comment: '' }]
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
  await within(funderPanel()).findByText('Vardhman Steel');
}

test('the CSR section lists the funders from the csr_funder catalogue', async () => {
  await openCsrSection();
  expect(configAPI.getByCategory).toHaveBeenCalledWith('csr_funder');
  expect(screen.getByText(
    "The organisations that fund CSR grants. Picked on each grant; the funder portal shows this name. Renaming one updates every grant and the funder's portal."
  )).toBeInTheDocument();
});

test('adding a funder saves it under the csr_funder category', async () => {
  await openCsrSection();

  const field = within(funderPanel()).getByPlaceholderText('Option name');
  fireEvent.change(field, { target: { value: 'Bharat Forge Foundation' } });
  fireEvent.keyDown(field, { key: 'Enter' });

  await waitFor(() => expect(configAPI.bulk).toHaveBeenCalled());
  expect(configAPI.bulk.mock.calls[0][0]).toEqual([
    expect.objectContaining({ category: 'csr_funder', value: 'Bharat Forge Foundation' }),
  ]);
});

test('renaming a funder goes through the backend rename and names grants', async () => {
  await openCsrSection();

  fireEvent.click(within(funderPanel()).getByLabelText('Edit'));
  fireEvent.change(screen.getByDisplayValue('Vardhman Steel'), { target: { value: 'Vardhman Group' } });
  fireEvent.click(within(funderPanel()).getByLabelText('Save'));

  await waitFor(() =>
    expect(configAPI.rename).toHaveBeenCalledWith('csr_funder', 'Vardhman Steel', 'Vardhman Group')
  );
  expect(configAPI.delete).not.toHaveBeenCalled();
  expect(await screen.findByText(/Every CSR grant using it follows automatically/)).toBeInTheDocument();
});
