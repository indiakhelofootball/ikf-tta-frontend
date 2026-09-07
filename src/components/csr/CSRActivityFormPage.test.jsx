// The activity form is a page now, not a dialog. Coverage focuses on what only
// exists because it became a page (loading by :id, refusing a blank form on a
// failed load, the ?project= query param an orphan-record guard) and on the
// cascade that was the whole reason the modal existed: which fields show
// depends on the activity type selected.
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CSRActivityFormPage from './CSRActivityFormPage';

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
    activities: { getById: jest.fn(), create: jest.fn(), update: jest.fn() },
    activityTypes: { getAll: jest.fn() },
    partnerVendors: { getAll: jest.fn() },
  },
  trialsAPI: { getAll: jest.fn() },
}));

jest.mock('../../utils/adminStorage', () => ({
  getWorkshopNames: () => [{ id: 1, name: 'Career Guidance' }],
  getTrainingProgrammes: () => [{ id: 2, name: 'Financial Literacy' }],
}));

jest.mock('../../hooks/useConfigVersion', () => ({ __esModule: true, default: () => 0 }));

const { csrAPI, trialsAPI } = require('../../services/api');

const TYPES = [
  { id: 10, name: 'District Trial', isMaster: false },
  { id: 11, name: 'Career Workshop', isMaster: false },
];

const ACTIVITY = {
  id: 5, projectId: 11, projectName: 'Grassroots Football',
  title: 'Bhilai Trial', activityTypeId: 10,
  startDate: '2026-06-14', endDate: '', location: 'Bhilai',
  status: 'Planned', linkedTrialId: '', workshopId: '',
  trainingProgrammeId: '', linkedVendorId: '', deliveryMode: '',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockSearch = new URLSearchParams();
  csrAPI.activityTypes.getAll.mockResolvedValue(TYPES);
  csrAPI.partnerVendors.getAll.mockResolvedValue([]);
  trialsAPI.getAll.mockResolvedValue([]);
});

describe('no grant to attach to', () => {
  test('creating without ?project= stops rather than posting an orphan', async () => {
    render(<CSRActivityFormPage />);
    expect(await screen.findByText(/no grant selected/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/title/i)).toBeNull();
  });
});

describe('creating an activity', () => {
  beforeEach(() => { mockSearch = new URLSearchParams({ project: '11' }); });

  test('will not save without a title and a type', async () => {
    render(<CSRActivityFormPage />);
    await screen.findByText('District Trial');

    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(csrAPI.activities.create).not.toHaveBeenCalled();
  });

  test('sends the payload with the grant from the query param', async () => {
    csrAPI.activities.create.mockResolvedValue({});
    render(<CSRActivityFormPage />);
    await screen.findByText('District Trial');

    await userEvent.type(screen.getByLabelText(/title/i), 'Nashik Trial');
    await userEvent.selectOptions(screen.getByLabelText(/activity type/i), '10');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.activities.create).toHaveBeenCalled());
    const payload = csrAPI.activities.create.mock.calls[0][0];
    expect(payload.title).toBe('Nashik Trial');
    expect(payload.activityTypeId).toBe(10);
    expect(payload.projectId).toBe(11);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/csr/11', { state: { saved: 'Activity logged.' } },
    );
  });

  test('the type cascade shows and hides category fields', async () => {
    render(<CSRActivityFormPage />);
    await screen.findByText('District Trial');

    // Nothing chosen yet: no category field is on the page.
    expect(screen.queryByLabelText(/linked trial/i)).toBeNull();
    expect(screen.queryByLabelText(/workshop/i)).toBeNull();

    await userEvent.selectOptions(screen.getByLabelText(/activity type/i), '10');
    expect(await screen.findByLabelText(/linked trial/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^workshop$/i)).toBeNull();

    await userEvent.selectOptions(screen.getByLabelText(/activity type/i), '11');
    expect(await screen.findByLabelText(/^workshop$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/delivered by/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^partner$/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/linked trial/i)).toBeNull();
  });

  test('exactly two date fields exist, never three: Start and End only', async () => {
    render(<CSRActivityFormPage />);
    await screen.findByText('District Trial');
    expect(screen.getByLabelText(/start date/i)).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText(/end date/i)).toHaveAttribute('type', 'date');
    // A single-day activity sets Start alone; there is no third date field
    // (e.g. a plain "Date") for the label to fall back to.
    expect(screen.queryByLabelText(/^date$/i)).toBeNull();
  });

  test('status offers Planned and Completed only', async () => {
    render(<CSRActivityFormPage />);
    await screen.findByText('District Trial');
    const options = within(screen.getByLabelText(/status/i)).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Planned', 'Completed']);
  });
});

describe('editing an activity', () => {
  beforeEach(() => { mockParams = { id: '5' }; });

  test('loads the record named in the URL and fills the form from it', async () => {
    csrAPI.activities.getById.mockResolvedValue(ACTIVITY);
    render(<CSRActivityFormPage />);

    await waitFor(() => expect(csrAPI.activities.getById).toHaveBeenCalledWith('5'));
    expect(await screen.findByDisplayValue('Bhilai Trial')).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  test('a record that will not load stops, rather than offering an empty form', async () => {
    csrAPI.activities.getById.mockRejectedValue(new Error('404'));
    render(<CSRActivityFormPage />);

    expect(await screen.findByText(/activity not found/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/title/i)).toBeNull();
    expect(csrAPI.activities.create).not.toHaveBeenCalled();
  });

  test('cancel leaves for the loaded grant without saving', async () => {
    csrAPI.activities.getById.mockResolvedValue(ACTIVITY);
    render(<CSRActivityFormPage />);
    await screen.findByDisplayValue('Bhilai Trial');

    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(csrAPI.activities.create).not.toHaveBeenCalled();
    expect(csrAPI.activities.update).not.toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/csr/11', undefined);
  });
});
