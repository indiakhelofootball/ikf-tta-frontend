// CSRActivity.workshop and .training_programme are ForeignKeys to the
// ConfigOption row, so a rename has to happen IN PLACE. The ordinary save path
// does not rename: saveCategory drops the old id and re-adds the new name, and
// the config delete is a soft delete, so an activity would keep pointing at a
// now-inactive row still carrying the old name -- silently, with no error.
// These tests pin the editor onto the backend rename endpoint instead.
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';

// react-router-dom v7 ships an "exports"-only entry that Jest's CRA resolver
// cannot follow; AdminPage only needs useNavigate.
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

import { configAPI } from '../../services/api';
import AdminPage from './AdminPage';

// Only the workshop catalog has a row, so the page holds exactly one editable
// item and the Edit control is unambiguous.
const seedCatalogs = () => {
  configAPI.getByCategory.mockImplementation((category) =>
    Promise.resolve(
      category === 'workshop_name'
        ? [{ id: 41, value: 'Goalkeeping Clinic', comment: '' }]
        : []
    )
  );
};

beforeEach(() => {
  seedCatalogs();
  configAPI.bulk.mockResolvedValue(undefined);
  configAPI.delete.mockResolvedValue(undefined);
  configAPI.rename.mockResolvedValue({ message: 'ok' });
  localStorage.clear();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

async function openCsrSectionAndEditTheWorkshop(newName) {
  render(<AdminPage />);
  fireEvent.click(screen.getByText('CSR'));
  await waitFor(() => expect(screen.getByText('Goalkeeping Clinic')).toBeInTheDocument());

  fireEvent.click(screen.getByLabelText('Edit'));
  const field = screen.getByDisplayValue('Goalkeeping Clinic');
  fireEvent.change(field, { target: { value: newName } });
  fireEvent.click(screen.getByLabelText('Save'));
}

test('the admin can maintain both CSR catalogs from TTA Admin', async () => {
  render(<AdminPage />);
  fireEvent.click(screen.getByText('CSR'));

  expect(screen.getByText('Workshop Names')).toBeInTheDocument();
  expect(screen.getByText('Training Programmes')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByText('Goalkeeping Clinic')).toBeInTheDocument());
});

test('renaming a workshop goes through the backend rename, not delete-and-recreate', async () => {
  await openCsrSectionAndEditTheWorkshop('Goalkeeping Workshop');

  await waitFor(() =>
    expect(configAPI.rename).toHaveBeenCalledWith(
      'workshop_name', 'Goalkeeping Clinic', 'Goalkeeping Workshop'
    )
  );
  // The path that would fork the ForeignKey.
  expect(configAPI.delete).not.toHaveBeenCalled();
});

test('a refused rename says so and leaves the old name on screen', async () => {
  configAPI.rename.mockRejectedValue(new Error('"Goalkeeping Workshop" already exists.'));

  await openCsrSectionAndEditTheWorkshop('Goalkeeping Workshop');

  await waitFor(() =>
    expect(screen.getByText('"Goalkeeping Workshop" already exists.')).toBeInTheDocument()
  );
  expect(screen.getByText('Goalkeeping Clinic')).toBeInTheDocument();
});
