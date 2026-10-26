// An athlete's category is saved with the athlete, so the funder portal shows
// what staff set rather than a band worked out from today's date. The form
// suggests it from the age on the grant's start date.
import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import CSRProjectDetailPage from './CSRProjectDetailPage';

jest.mock('react-router-dom', () => ({
  __esModule: true,
  useParams: () => ({ id: '42' }),
  useNavigate: () => jest.fn(),
  useLocation: () => ({ pathname: '/csr/42', state: { tab: 'athletes' } }),
}), { virtual: true });

jest.mock('../../services/api', () => ({
  csrAPI: {
    projects: { getById: jest.fn() },
    activities: { getAll: jest.fn() },
    reports: { getAll: jest.fn() },
    contacts: { getAll: jest.fn() },
    activityTypes: { getAll: jest.fn() },
    expenseTags: { getAll: jest.fn() },
    athletes: { getAll: jest.fn(), create: jest.fn() },
    grantTrials: jest.fn(),
  },
}));

jest.mock('../../auth/useGrants', () => ({
  __esModule: true,
  default: () => ({
    isSuper: false, canView: (m) => m === 'csr', canEdit: (m) => m === 'csr', permsLoading: false,
  }),
}));

jest.mock('../../utils/certificatePdf', () => ({ downloadCertificatePdf: jest.fn() }));

const { csrAPI } = require('../../services/api');

beforeEach(() => {
  jest.clearAllMocks();
  csrAPI.projects.getById.mockResolvedValue({
    id: 42, name: 'Football for All', clientName: 'Vardhman', status: 'Active',
    sanctionedAmount: '0', startDate: '2026-04-01',
  });
  csrAPI.activities.getAll.mockResolvedValue([]);
  csrAPI.reports.getAll.mockResolvedValue([]);
  csrAPI.contacts.getAll.mockResolvedValue([]);
  csrAPI.activityTypes.getAll.mockResolvedValue([]);
  csrAPI.expenseTags.getAll.mockResolvedValue([]);
  csrAPI.athletes.getAll.mockResolvedValue([]);
  csrAPI.athletes.create.mockResolvedValue({ id: 1 });
  csrAPI.grantTrials.mockResolvedValue([]);
});

test('the saved athlete carries the category, set from the age at the grant start', async () => {
  render(<CSRProjectDetailPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Add Athlete' }));
  const dialog = await screen.findByRole('dialog');

  fireEvent.change(within(dialog).getByLabelText(/Full Name/), { target: { value: 'Manpreet Singh' } });
  // 17 on 1 Apr 2026 when the grant started, 18 from 1 Jun 2026: still U17.
  fireEvent.change(within(dialog).getByLabelText('Date of Birth (DOB)'), { target: { value: '2008-06-01' } });
  expect(within(dialog).getByRole('combobox', { name: 'Category' })).toHaveTextContent('U17');

  fireEvent.click(within(dialog).getByRole('button', { name: 'Add Athlete' }));
  await waitFor(() => expect(csrAPI.athletes.create).toHaveBeenCalledTimes(1));
  expect(csrAPI.athletes.create).toHaveBeenCalledWith(expect.objectContaining({
    fullName: 'Manpreet Singh', dob: '2008-06-01', category: 'U17',
  }));
});

test('a category staff already chose is not overwritten by a DOB change', async () => {
  render(<CSRProjectDetailPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Add Athlete' }));
  const dialog = await screen.findByRole('dialog');

  fireEvent.change(within(dialog).getByLabelText(/Full Name/), { target: { value: 'Simran Kaur' } });
  fireEvent.mouseDown(within(dialog).getByRole('combobox', { name: 'Category' }));
  fireEvent.click(await screen.findByRole('option', { name: 'U-21' }));
  fireEvent.change(within(dialog).getByLabelText('Date of Birth (DOB)'), { target: { value: '2012-01-15' } });

  fireEvent.click(within(dialog).getByRole('button', { name: 'Add Athlete' }));
  await waitFor(() => expect(csrAPI.athletes.create).toHaveBeenCalledTimes(1));
  expect(csrAPI.athletes.create.mock.calls[0][0].category).toBe('U-21');
});
