// The certificate type on a grant's Utilisation tab (.ai/pending.md item 2):
// «type लिख दो इसके नीचे», resolved as the type of Utilisation Certificate.
// The list is the admin-managed catalogue read through adminStorage, and a
// pick is saved straight onto the grant.
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CSRProjectDetailPage from './CSRProjectDetailPage';

const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
  useParams: () => ({ id: '11' }),
  // Land straight on the Utilisation tab, as a row opened from a log does.
  useLocation: () => ({ pathname: '/csr/11', state: { tab: 5 } }),
}), { virtual: true });

jest.mock('../../services/api', () => ({
  csrAPI: {
    projects: { getById: jest.fn(), patch: jest.fn() },
    activities: { getAll: jest.fn() },
    reports: { getAll: jest.fn() },
    contacts: { getAll: jest.fn() },
    activityTypes: { getAll: jest.fn() },
    expenseTags: { getAll: jest.fn() },
    utilisationCertificate: jest.fn(),
  },
}));

let mockTypes = [];
jest.mock('../../utils/adminStorage', () => ({
  getUtilisationTypes: () => mockTypes,
}));
jest.mock('../../hooks/useConfigVersion', () => ({ __esModule: true, default: () => 0 }));

let mockCanEditCsr = true;
jest.mock('../../auth/useGrants', () => ({
  __esModule: true,
  default: () => ({
    canEdit: (m) => (m === 'csr' ? mockCanEditCsr : false),
    canView: () => true,
    isSuper: false,
  }),
}));

jest.mock('./CSRContractManagementPage', () => ({ __esModule: true, default: () => null }));
jest.mock('../../utils/certificatePdf', () => ({ downloadCertificatePdf: jest.fn() }));

const { csrAPI } = require('../../services/api');

const PROJECT = {
  id: 11, name: 'Grassroots Football', clientName: 'Acme Foundation',
  sanctionedAmount: '500000.00', status: 'Active',
  utilisationTypeId: null, utilisationTypeName: '',
  certificateVersion: 0, certificateFrozenAt: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCanEditCsr = true;
  mockTypes = [
    { id: 31, name: 'Tranche / Interim' },
    { id: 32, name: 'Final / Closure' },
    { id: 33, name: 'Periodic' },
  ];
  csrAPI.projects.getById.mockResolvedValue({ ...PROJECT });
  csrAPI.activities.getAll.mockResolvedValue([]);
  csrAPI.reports.getAll.mockResolvedValue([]);
  csrAPI.contacts.getAll.mockResolvedValue([]);
  csrAPI.activityTypes.getAll.mockResolvedValue([]);
  csrAPI.expenseTags.getAll.mockResolvedValue([]);
});

const typeSelect = () => {
  render(<CSRProjectDetailPage />);
  return screen.findByLabelText('Certificate type');
};

test('the select lists the catalogue values and nothing else', async () => {
  const select = await typeSelect();
  const labels = within(select).getAllByRole('option').map((o) => o.textContent);
  expect(labels).toEqual(['— not set —', 'Tranche / Interim', 'Final / Closure', 'Periodic']);
});

test('picking a type saves it onto the grant by PATCH', async () => {
  csrAPI.projects.patch.mockResolvedValue({
    ...PROJECT, utilisationTypeId: 32, utilisationTypeName: 'Final / Closure',
  });
  const select = await typeSelect();
  await userEvent.selectOptions(select, '32');

  await waitFor(() => expect(csrAPI.projects.patch).toHaveBeenCalledWith('11', { utilisationTypeId: 32 }));
  await waitFor(() => expect(select).toHaveValue('32'));
  expect(await screen.findByText('Certificate type saved.')).toBeInTheDocument();
});

test('clearing it sends null, not an empty string', async () => {
  csrAPI.projects.getById.mockResolvedValue({
    ...PROJECT, utilisationTypeId: 33, utilisationTypeName: 'Periodic',
  });
  csrAPI.projects.patch.mockResolvedValue({ ...PROJECT, utilisationTypeId: null });
  const select = await typeSelect();
  expect(select).toHaveValue('33');
  await userEvent.selectOptions(select, '');

  await waitFor(() => expect(csrAPI.projects.patch).toHaveBeenCalledWith('11', { utilisationTypeId: null }));
  await waitFor(() => expect(select).toHaveValue(''));
});

test('a refused save says so and leaves the stored type selected', async () => {
  csrAPI.projects.patch.mockRejectedValue(new Error('That certificate type has been removed from the catalog.'));
  const select = await typeSelect();
  await userEvent.selectOptions(select, '31');

  expect(await screen.findByText('That certificate type has been removed from the catalog.')).toBeInTheDocument();
  expect(select).toHaveValue('');
});

test('a grant holding a retired type still shows it rather than "not set"', async () => {
  csrAPI.projects.getById.mockResolvedValue({
    ...PROJECT, utilisationTypeId: 99, utilisationTypeName: 'Quarterly',
  });
  const select = await typeSelect();
  expect(select).toHaveValue('99');
  expect(within(select).getByRole('option', { name: 'Quarterly' })).toBeInTheDocument();
});

test('without the csr edit grant the type is read, not edited', async () => {
  mockCanEditCsr = false;
  csrAPI.projects.getById.mockResolvedValue({
    ...PROJECT, utilisationTypeId: 31, utilisationTypeName: 'Tranche / Interim',
  });
  render(<CSRProjectDetailPage />);
  expect(await screen.findByText('Tranche / Interim')).toBeInTheDocument();
  expect(screen.queryByRole('combobox', { name: 'Certificate type' })).toBeNull();
});
