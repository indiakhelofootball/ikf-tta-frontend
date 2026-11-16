// D-037 (16 Nov 2026): CSR activity types are added, renamed and deleted only
// in TTA Admin > CSR. They live in a CSR table, so the panel saves through the
// CSR activity-type API, not the config bulk endpoint.
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
  csrAPI: {
    activityTypes: {
      getAll: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const { configAPI, csrAPI } = require('../../services/api');
const AdminPage = require('./AdminPage').default;

beforeEach(() => {
  configAPI.getByCategory.mockResolvedValue([]);
  configAPI.bulk.mockResolvedValue(undefined);
  csrAPI.activityTypes.getAll.mockResolvedValue([{ id: 3, name: 'Trial', isMaster: false }]);
  csrAPI.activityTypes.create.mockResolvedValue({ id: 4, name: 'Workshop' });
  csrAPI.activityTypes.update.mockResolvedValue({ id: 3, name: 'Girls Trial' });
  csrAPI.activityTypes.delete.mockResolvedValue(undefined);
  localStorage.clear();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

async function openCsrSection() {
  render(<AdminPage />);
  fireEvent.click(screen.getByText('CSR'));
  await screen.findByText('Trial');
}

const activityTypeField = () => screen.getAllByPlaceholderText('Option name').at(-1);

test('the CSR section lists the activity types from the CSR API', async () => {
  await openCsrSection();
  expect(screen.getByText('Activity Types')).toBeInTheDocument();
  expect(csrAPI.activityTypes.getAll).toHaveBeenCalled();
  expect(screen.queryByText('Manage Activity Types')).not.toBeInTheDocument();
});

test('adding a type creates it through the CSR API, never the config list', async () => {
  await openCsrSection();
  fireEvent.change(activityTypeField(), { target: { value: 'Workshop' } });
  fireEvent.keyDown(activityTypeField(), { key: 'Enter' });

  await waitFor(() => expect(csrAPI.activityTypes.create).toHaveBeenCalledWith({ name: 'Workshop' }));
  expect(configAPI.bulk).not.toHaveBeenCalled();
});

test('a type in use that cannot be deleted shows the server reason', async () => {
  csrAPI.activityTypes.delete.mockRejectedValue({
    response: { data: { detail: "This activity type is used by 2 activities, so it can't be deleted." } },
  });
  await openCsrSection();
  fireEvent.click(screen.getAllByLabelText('Delete').at(-1));

  expect(await screen.findByText(/used by 2 activities, so it can't be deleted/)).toBeInTheDocument();
  await waitFor(() => expect(csrAPI.activityTypes.getAll).toHaveBeenCalledTimes(2));
});
