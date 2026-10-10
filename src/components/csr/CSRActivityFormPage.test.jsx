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
    partners: { getAll: jest.fn() },
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
  trainingProgrammeId: '', partnerId: '', deliveryMode: '',
};

beforeEach(() => {
  jest.clearAllMocks();
  mockParams = {};
  mockSearch = new URLSearchParams();
  csrAPI.activityTypes.getAll.mockResolvedValue(TYPES);
  csrAPI.partners.getAll.mockResolvedValue([]);
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

  test('an empty partner list says how to add a partner in TTA Admin', async () => {
    render(<CSRActivityFormPage />);
    await screen.findByText('District Trial');
    await userEvent.selectOptions(screen.getByLabelText(/activity type/i), '11');
    expect(await screen.findByText(
      'No partners yet. In TTA Admin, give a vendor name the service type Partner.',
    )).toBeInTheDocument();
  });

  test('partners come from the Admin partner list, and the pick is sent as partnerId', async () => {
    csrAPI.partners.getAll.mockResolvedValue({
      results: [{ id: 3, name: 'A1 Classes' }, { id: 4, name: 'Kick Academy' }],
    });
    csrAPI.activities.create.mockResolvedValue({});
    render(<CSRActivityFormPage />);
    await screen.findByText('District Trial');

    await userEvent.type(screen.getByLabelText(/title/i), 'Life skills session');
    await userEvent.selectOptions(screen.getByLabelText(/activity type/i), '11');
    await userEvent.selectOptions(screen.getByLabelText(/delivered by/i), 'Partner');
    const picker = screen.getByLabelText(/^partner$/i);
    await waitFor(() => expect(within(picker).getAllByRole('option')).toHaveLength(3));
    expect(within(picker).getAllByRole('option').map((o) => o.textContent))
      .toEqual(['— none —', 'A1 Classes', 'Kick Academy']);
    await userEvent.selectOptions(picker, '4');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.activities.create).toHaveBeenCalled());
    const payload = csrAPI.activities.create.mock.calls[0][0];
    expect(payload.partnerId).toBe(4);
    expect(payload).not.toHaveProperty('linkedVendorId');
  });

  test('Partner delivery with no partner named is stopped before the round trip', async () => {
    render(<CSRActivityFormPage />);
    await screen.findByText('District Trial');
    await userEvent.type(screen.getByLabelText(/title/i), 'Life skills session');
    await userEvent.selectOptions(screen.getByLabelText(/activity type/i), '11');
    await userEvent.selectOptions(screen.getByLabelText(/delivered by/i), 'Partner');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText('Name the partner, or set delivery to Self.')).toBeInTheDocument();
    expect(csrAPI.activities.create).not.toHaveBeenCalled();
  });

  test('a server refusal on partnerId is shown under the partner field', async () => {
    csrAPI.partners.getAll.mockResolvedValue([{ id: 3, name: 'A1 Classes' }]);
    const err = new Error('partnerId: Not a partner.');
    err.response = { status: 400, data: { partnerId: ['Not a partner.'] } };
    csrAPI.activities.create.mockRejectedValue(err);
    render(<CSRActivityFormPage />);
    await screen.findByText('District Trial');

    await userEvent.type(screen.getByLabelText(/title/i), 'Life skills session');
    await userEvent.selectOptions(screen.getByLabelText(/activity type/i), '11');
    await userEvent.selectOptions(screen.getByLabelText(/delivered by/i), 'Partner');
    await waitFor(() => expect(screen.getByRole('option', { name: 'A1 Classes' })).toBeInTheDocument());
    await userEvent.selectOptions(screen.getByLabelText(/^partner$/i), '3');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText('Not a partner.')).toBeInTheDocument();
    expect(screen.getByLabelText(/^partner$/i)).toHaveAttribute('aria-invalid', 'true');
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

  test('a partner no longer in the Admin partner list stays selected, and is sent back', async () => {
    csrAPI.partners.getAll.mockResolvedValue([{ id: 3, name: 'A1 Classes' }]);
    csrAPI.activities.getById.mockResolvedValue({
      ...ACTIVITY, activityTypeId: 11, deliveryMode: 'Partner',
      partnerId: 99, partnerName: 'Old Partner Trust',
    });
    csrAPI.activities.update.mockResolvedValue({});
    render(<CSRActivityFormPage />);
    await screen.findByDisplayValue('Bhilai Trial');

    const picker = await screen.findByLabelText(/^partner$/i);
    await waitFor(() => expect(within(picker).getByRole('option', { name: 'A1 Classes' })).toBeInTheDocument());
    expect(picker).toHaveValue('99');
    expect(within(picker).getByRole('option', { name: 'Old Partner Trust' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(csrAPI.activities.update).toHaveBeenCalled());
    expect(csrAPI.activities.update.mock.calls[0][1].partnerId).toBe(99);
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

describe('visible to funder', () => {
  test('a new activity starts visible, and the switch value is what gets sent', async () => {
    mockSearch = new URLSearchParams({ project: '11' });
    csrAPI.activities.create.mockResolvedValue({});
    render(<CSRActivityFormPage />);
    await screen.findByText('District Trial');

    const sw = screen.getByRole('switch', { name: 'Visible to funder' });
    expect(sw).toBeChecked();

    await userEvent.type(screen.getByLabelText(/title/i), 'Nashik Trial');
    await userEvent.selectOptions(screen.getByLabelText(/activity type/i), '10');
    await userEvent.click(sw);
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.activities.create).toHaveBeenCalled());
    expect(csrAPI.activities.create.mock.calls[0][0].visibleToClient).toBe(false);
  });

  test('editing reflects the stored value and sends it back', async () => {
    mockParams = { id: '5' };
    csrAPI.activities.getById.mockResolvedValue({ ...ACTIVITY, visibleToClient: false });
    csrAPI.activities.update.mockResolvedValue({});
    render(<CSRActivityFormPage />);
    await screen.findByDisplayValue('Bhilai Trial');

    expect(screen.getByRole('switch', { name: 'Visible to funder' })).not.toBeChecked();
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.activities.update).toHaveBeenCalled());
    expect(csrAPI.activities.update.mock.calls[0][1].visibleToClient).toBe(false);
  });

  test('an edit sends the grant, because the server refuses a PUT without it', async () => {
    mockParams = { id: '5' };
    csrAPI.activities.getById.mockResolvedValue(ACTIVITY);
    csrAPI.activities.update.mockResolvedValue({});
    render(<CSRActivityFormPage />);
    await screen.findByDisplayValue('Bhilai Trial');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.activities.update).toHaveBeenCalled());
    expect(csrAPI.activities.update.mock.calls[0][1].projectId).toBe(ACTIVITY.projectId);
  });

  test('the helper says Planned is not shown, and Completed is', async () => {
    mockSearch = new URLSearchParams({ project: '11' });
    render(<CSRActivityFormPage />);
    await screen.findByText('District Trial');

    const sw = screen.getByRole('switch', { name: 'Visible to funder' });
    expect(sw).toHaveAccessibleDescription(
      'Planned activities are not shown to the funder until marked Completed.',
    );
    expect(sw).toBeEnabled();

    await userEvent.selectOptions(screen.getByLabelText(/status/i), 'Completed');
    expect(sw).toHaveAccessibleDescription(
      'The funder sees this activity on their portal once it is marked Completed.',
    );
  });
});
