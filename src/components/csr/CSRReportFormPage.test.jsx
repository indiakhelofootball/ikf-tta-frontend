// The report form is a page now, not a dialog. Coverage focuses on what only
// exists because it became a page: loading by :id, refusing a blank form on a
// failed load, the ?project= query param scoping both the orphan-record guard
// and the activity picker.
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CSRReportFormPage from './CSRReportFormPage';

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
    reports: { getById: jest.fn(), create: jest.fn(), update: jest.fn() },
    activities: { getAll: jest.fn() },
  },
}));

const { csrAPI } = require('../../services/api');

const REPORT = {
  id: 9, projectId: 11, projectName: 'Grassroots Football',
  title: 'Nashik Trial Summary', reportType: 'Trial',
  fileName: '', fileUrl: 'https://drive.example.com/x', activityId: '',
  visibleToClient: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockSearch = new URLSearchParams();
  csrAPI.activities.getAll.mockResolvedValue([{ id: 3, title: 'District Trial — Nashik' }]);
});

test('creating without ?project= stops rather than posting an orphan', async () => {
  render(<CSRReportFormPage />);
  expect(await screen.findByText(/no grant selected/i)).toBeInTheDocument();
  expect(screen.queryByLabelText(/report name/i)).toBeNull();
});

describe('creating a report', () => {
  beforeEach(() => { mockSearch = new URLSearchParams({ project: '11' }); });

  test('will not save without a name and a document link', async () => {
    render(<CSRReportFormPage />);
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(csrAPI.reports.create).not.toHaveBeenCalled();
  });

  test('sends the payload with the grant from the query param', async () => {
    csrAPI.reports.create.mockResolvedValue({});
    render(<CSRReportFormPage />);

    await userEvent.type(screen.getByLabelText(/report name/i), 'Q2 Utilisation Statement');
    await userEvent.selectOptions(screen.getByLabelText(/report type/i), 'Overall');
    await userEvent.type(screen.getByLabelText(/document link/i), 'https://drive.example.com/q2');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.reports.create).toHaveBeenCalled());
    const payload = csrAPI.reports.create.mock.calls[0][0];
    expect(payload.title).toBe('Q2 Utilisation Statement');
    expect(payload.reportType).toBe('Overall');
    expect(payload.fileUrl).toBe('https://drive.example.com/q2');
    expect(payload.projectId).toBe(11);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/csr/11', { state: { saved: 'Report filed.' } },
    );
  });

  test('report type order matches the backend choices, Overall before Other', async () => {
    render(<CSRReportFormPage />);
    const options = within(screen.getByLabelText(/report type/i)).getAllByRole('option');
    expect(options.map((o) => o.textContent))
      .toEqual(['—', 'Trial', 'Workshop', 'Training Programme', 'Overall', 'Other']);
  });

  test('the activity picker is scoped to the grant from the query param', async () => {
    render(<CSRReportFormPage />);
    await waitFor(() => expect(csrAPI.activities.getAll).toHaveBeenCalledWith({ project: 11 }));
    expect(await screen.findByText('District Trial — Nashik')).toBeInTheDocument();
  });
});

describe('editing a report', () => {
  beforeEach(() => { mockParams = { id: '9' }; });

  test('loads the record named in the URL and fills the form from it', async () => {
    csrAPI.reports.getById.mockResolvedValue(REPORT);
    render(<CSRReportFormPage />);

    await waitFor(() => expect(csrAPI.reports.getById).toHaveBeenCalledWith('9'));
    expect(await screen.findByDisplayValue('Nashik Trial Summary')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://drive.example.com/x')).toBeInTheDocument();
  });

  test('a record that will not load stops, rather than offering an empty form', async () => {
    csrAPI.reports.getById.mockRejectedValue(new Error('404'));
    render(<CSRReportFormPage />);

    expect(await screen.findByText(/report not found/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/report name/i)).toBeNull();
    expect(csrAPI.reports.create).not.toHaveBeenCalled();
  });

  test('cancel leaves for the loaded grant without saving', async () => {
    csrAPI.reports.getById.mockResolvedValue(REPORT);
    render(<CSRReportFormPage />);
    await screen.findByDisplayValue('Nashik Trial Summary');

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(csrAPI.reports.create).not.toHaveBeenCalled();
    expect(csrAPI.reports.update).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/csr/11', undefined);
  });
});
