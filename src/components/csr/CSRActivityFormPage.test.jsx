// The activity form is a page now, not a dialog. Coverage focuses on what only
// exists because it became a page (loading by :id, refusing a blank form on a
// failed load, the ?project= query param an orphan-record guard) and on the
// cascade that was the whole reason the modal existed: which fields show
// depends on the activity type selected.
import React from 'react';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import CSRActivityFormPage from './CSRActivityFormPage';
import { localToday } from './activityVisibility';

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
    projects: { getById: jest.fn() },
    activityTypes: { getAll: jest.fn() },
    partners: { getAll: jest.fn() },
    grantTrials: jest.fn(),
  },
  trialsAPI: { getAll: jest.fn() },
}));

jest.mock('../../utils/adminStorage', () => ({
  getWorkshopNames: () => [{ id: 1, name: 'Career Guidance' }],
  getTrainingProgrammes: () => [{ id: 2, name: 'Financial Literacy' }],
}));

jest.mock('../../hooks/useConfigVersion', () => ({ __esModule: true, default: () => 0 }));

const { csrAPI, trialsAPI } = require('../../services/api');

const typesLoaded = () => waitFor(
  () => expect(screen.getByRole('combobox', { name: /activity type/i })).toBeEnabled(),
);

const pick = async (label, name) => {
  const input = screen.getByLabelText(label);
  await userEvent.clear(input);
  await userEvent.type(input, name);
  await userEvent.click(await screen.findByRole('option', { name }));
};

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
  csrAPI.grantTrials.mockResolvedValue([]);
  csrAPI.projects.getById.mockResolvedValue({ id: 11, cities: [] });
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
    await typesLoaded();

    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(csrAPI.activities.create).not.toHaveBeenCalled();
  });

  test('sends the payload with the grant from the query param', async () => {
    csrAPI.activities.create.mockResolvedValue({});
    render(<CSRActivityFormPage />);
    await typesLoaded();

    await userEvent.type(screen.getByLabelText(/title/i), 'Nashik Trial');
    await pick(/activity type/i, 'District Trial');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.activities.create).toHaveBeenCalled());
    const payload = csrAPI.activities.create.mock.calls[0][0];
    expect(payload.title).toBe('Nashik Trial');
    expect(payload.activityTypeId).toBe(10);
    expect(payload.projectId).toBe(11);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/csr/11', { state: { saved: 'Activity logged.', tab: 2 } },
    );
  });

  test('the type cascade shows and hides category fields', async () => {
    render(<CSRActivityFormPage />);
    await typesLoaded();

    // Nothing chosen yet: no category field is on the page.
    expect(screen.queryByLabelText(/linked trial/i)).toBeNull();
    expect(screen.queryByLabelText(/workshop/i)).toBeNull();

    await pick(/activity type/i, 'District Trial');
    expect(await screen.findByLabelText(/linked trial/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^workshop$/i)).toBeNull();

    await pick(/activity type/i, 'Career Workshop');
    expect(await screen.findByLabelText(/^workshop$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/delivered by/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^partner$/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/linked trial/i)).toBeNull();
  });

  test('an empty partner list says how to add a partner in TTA Admin', async () => {
    render(<CSRActivityFormPage />);
    await typesLoaded();
    await pick(/activity type/i, 'Career Workshop');
    expect(await screen.findByText(
      'No partners yet. Add one on the CSR Partners page.',
    )).toBeInTheDocument();
  });

  test('partners come from the Admin partner list, and the pick is sent as partnerId', async () => {
    csrAPI.partners.getAll.mockResolvedValue({
      results: [{ id: 3, name: 'A1 Classes' }, { id: 4, name: 'Kick Academy' }],
    });
    csrAPI.activities.create.mockResolvedValue({});
    render(<CSRActivityFormPage />);
    await typesLoaded();

    await userEvent.type(screen.getByLabelText(/title/i), 'Life skills session');
    await pick(/activity type/i, 'Career Workshop');
    await userEvent.selectOptions(screen.getByLabelText(/delivered by/i), 'Partner');
    const picker = screen.getByLabelText(/^partner$/i);
    expect(picker).toHaveAccessibleDescription('Partners added on the CSR Partners page.');
    await userEvent.click(picker);
    await waitFor(() => expect(within(screen.getByRole('listbox')).getAllByRole('option')).toHaveLength(2));
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual(['A1 Classes', 'Kick Academy']);
    await userEvent.click(within(screen.getByRole('listbox')).getByRole('option', { name: 'Kick Academy' }));
    expect(picker).toHaveValue('Kick Academy');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(csrAPI.activities.create).toHaveBeenCalled());
    const payload = csrAPI.activities.create.mock.calls[0][0];
    expect(payload.partnerId).toBe(4);
    expect(payload).not.toHaveProperty('linkedVendorId');
  });

  test('Partner delivery with no partner named is stopped before the round trip', async () => {
    render(<CSRActivityFormPage />);
    await typesLoaded();
    await userEvent.type(screen.getByLabelText(/title/i), 'Life skills session');
    await pick(/activity type/i, 'Career Workshop');
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
    await typesLoaded();

    await userEvent.type(screen.getByLabelText(/title/i), 'Life skills session');
    await pick(/activity type/i, 'Career Workshop');
    await userEvent.selectOptions(screen.getByLabelText(/delivered by/i), 'Partner');
    await pick(/^partner$/i, 'A1 Classes');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByText('Not a partner.')).toBeInTheDocument();
    expect(screen.getByLabelText(/^partner$/i)).toHaveAttribute('aria-invalid', 'true');
  });

  test('exactly two date fields exist, never three: Start and End only', async () => {
    render(<CSRActivityFormPage />);
    await typesLoaded();
    expect(screen.getByLabelText(/start date/i)).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText(/end date/i)).toHaveAttribute('type', 'date');
    // A single-day activity sets Start alone; there is no third date field
    // (e.g. a plain "Date") for the label to fall back to.
    expect(screen.queryByLabelText(/^date$/i)).toBeNull();
  });

  test('status offers Planned, Completed and Cancelled (D-018)', async () => {
    render(<CSRActivityFormPage />);
    await typesLoaded();
    const options = within(screen.getByLabelText(/status/i)).getAllByRole('option');
    expect(options.map((o) => o.textContent)).toEqual(['Planned', 'Completed', 'Cancelled']);
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
    await waitFor(() => expect(picker).toHaveValue('Old Partner Trust'));
    await userEvent.click(picker);
    expect(await within(screen.getByRole('listbox')).findByRole('option', { name: 'A1 Classes' })).toBeInTheDocument();
    expect(within(screen.getByRole('listbox')).getByRole('option', { name: 'Old Partner Trust' })).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{Escape}');

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
    expect(mockNavigate).toHaveBeenCalledWith('/csr/11', { state: { tab: 2 } });
  });
});

describe('visible to funder', () => {
  test('a new activity starts visible, and the switch value is what gets sent', async () => {
    mockSearch = new URLSearchParams({ project: '11' });
    csrAPI.activities.create.mockResolvedValue({});
    render(<CSRActivityFormPage />);
    await typesLoaded();

    const sw = screen.getByRole('switch', { name: 'Visible to funder' });
    expect(sw).toBeChecked();

    await userEvent.type(screen.getByLabelText(/title/i), 'Nashik Trial');
    await pick(/activity type/i, 'District Trial');
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

  test('the helper says the funder sees the activity, Planned or Completed, unless switched off', async () => {
    mockSearch = new URLSearchParams({ project: '11' });
    render(<CSRActivityFormPage />);
    await typesLoaded();

    const sw = screen.getByRole('switch', { name: 'Visible to funder' });
    const helper = 'The funder sees this activity, labelled Planned or Completed, unless you switch this off.';
    expect(sw).toHaveAccessibleDescription(helper);
    expect(sw).toBeEnabled();

    await userEvent.selectOptions(screen.getByLabelText(/status/i), 'Completed');
    expect(sw).toHaveAccessibleDescription(helper);
  });
});

describe('search where you pick', () => {
  beforeEach(() => { mockSearch = new URLSearchParams({ project: '11' }); });

  test('activity type, city, workshop and partner filter as you type; status and delivery stay selects', async () => {
    csrAPI.activityTypes.getAll.mockResolvedValue([...TYPES, { id: 12, name: 'Coach Training', isMaster: true }]);
    csrAPI.projects.getById.mockResolvedValue({
      id: 11, cities: [{ id: 7, cityName: 'Pune', state: 'MH' }, { id: 8, cityName: 'Wardha', state: 'MH' }],
    });
    csrAPI.partners.getAll.mockResolvedValue([{ id: 3, name: 'A1 Classes' }, { id: 4, name: 'Kick Academy' }]);
    render(<CSRActivityFormPage />);
    await typesLoaded();

    await userEvent.type(screen.getByLabelText(/activity type/i), 'master');
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent))
      .toEqual(['Coach TrainingMaster template']);
    await userEvent.keyboard('{Escape}');

    await waitFor(() => expect(screen.getByLabelText(/^city$/i)).toBeEnabled());
    await userEvent.type(screen.getByLabelText(/^city$/i), 'ward');
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent))
      .toEqual(['Wardha, MH']);
    await userEvent.keyboard('{ArrowDown}{Enter}');
    expect(screen.getByLabelText(/^city$/i)).toHaveValue('Wardha, MH');

    await pick(/activity type/i, 'Career Workshop');
    await userEvent.type(screen.getByLabelText(/^partner$/i), 'kick');
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent))
      .toEqual(['Kick Academy']);
    await userEvent.keyboard('{Escape}');

    expect(screen.getByLabelText(/status/i).tagName).toBe('SELECT');
    expect(screen.getByLabelText(/delivered by/i).tagName).toBe('SELECT');
  });
});

describe('linked trial', () => {
  const GRANT_TRIALS = [{ id: 7, trialCode: 'BH-01', trialName: 'Bhilai Trial' }];

  test("lists the grant's own trials, not every trial in TTA", async () => {
    mockSearch = new URLSearchParams({ project: '11' });
    csrAPI.grantTrials.mockResolvedValue(GRANT_TRIALS);
    render(<CSRActivityFormPage />);
    await typesLoaded();
    await pick(/activity type/i, 'District Trial');

    await userEvent.click(screen.getByLabelText(/linked trial/i));
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual(['BH-01 — Bhilai Trial']);
    expect(csrAPI.grantTrials).toHaveBeenCalledWith(11);
    expect(trialsAPI.getAll).not.toHaveBeenCalled();
  });

  test('a saved link to a trial outside the list still shows as itself', async () => {
    mockParams = { id: '5' };
    csrAPI.activities.getById.mockResolvedValue({ ...ACTIVITY, linkedTrialId: 99 });
    csrAPI.grantTrials.mockResolvedValue(GRANT_TRIALS);
    render(<CSRActivityFormPage />);

    const select = await screen.findByLabelText(/linked trial/i);
    await waitFor(() => expect(select).toHaveValue('#99'));
    await userEvent.click(select);
    expect(within(screen.getByRole('listbox')).getByRole('option', { name: '#99' })).toHaveAttribute('aria-selected', 'true');
  });
});

describe('activity dates', () => {
  beforeEach(() => { mockSearch = new URLSearchParams({ project: '11' }); });

  const fill = async (start, end) => {
    render(<CSRActivityFormPage />);
    await typesLoaded();
    await userEvent.type(screen.getByLabelText(/title/i), 'Dated');
    await pick(/activity type/i, 'District Trial');
    fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: start } });
    fireEvent.change(screen.getByLabelText(/end date/i), { target: { value: end } });
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
  };

  test('an end date before the start is refused before anything is sent', async () => {
    await fill('2026-10-14', '2026-10-12');
    expect(await screen.findByText('End date must be on or after the start date.')).toBeInTheDocument();
    expect(csrAPI.activities.create).not.toHaveBeenCalled();
  });

  test.each([
    ['same day', '2026-10-12', '2026-10-12'],
    ['no end date', '2026-10-12', ''],
    ['forward range', '2026-10-12', '2026-10-14'],
  ])('%s still saves', async (_, start, end) => {
    csrAPI.activities.create.mockResolvedValue({});
    await fill(start, end);
    await waitFor(() => expect(csrAPI.activities.create).toHaveBeenCalled());
  });
});

// D-018. Days are relative to the real today, so each boundary is tested on
// both sides whatever day the suite runs.
const dayFromToday = (offset) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return localToday(d);
};
const TODAY = dayFromToday(0);
const YESTERDAY = dayFromToday(-1);
const TOMORROW = dayFromToday(1);

describe("D-018: a new activity's status follows its start date until picked", () => {
  beforeEach(() => { mockSearch = new URLSearchParams({ project: '11' }); });

  const status = () => screen.getByLabelText(/status/i);
  const setStart = (v) => fireEvent.change(screen.getByLabelText(/start date/i), { target: { value: v } });

  test('no date starts as Completed', async () => {
    render(<CSRActivityFormPage />);
    await typesLoaded();
    expect(status()).toHaveValue('Completed');
  });

  test.each([
    ['tomorrow', TOMORROW, 'Planned'],
    ['today', TODAY, 'Completed'],
    ['yesterday', YESTERDAY, 'Completed'],
  ])('a start date of %s gives %s', async (_, start, expected) => {
    render(<CSRActivityFormPage />);
    await typesLoaded();
    setStart(start);
    expect(status()).toHaveValue(expected);
  });

  test('the default keeps following while the date moves, and is what is saved', async () => {
    csrAPI.activities.create.mockResolvedValue({});
    render(<CSRActivityFormPage />);
    await typesLoaded();
    setStart(TOMORROW);
    expect(status()).toHaveValue('Planned');
    setStart(TODAY);
    expect(status()).toHaveValue('Completed');
    setStart('');
    expect(status()).toHaveValue('Completed');
    setStart(TOMORROW);

    await userEvent.type(screen.getByLabelText(/title/i), 'Nashik Trial');
    await pick(/activity type/i, 'District Trial');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(csrAPI.activities.create).toHaveBeenCalled());
    expect(csrAPI.activities.create.mock.calls[0][0].status).toBe('Planned');
  });

  test('once the user picks a status, a date change leaves it alone', async () => {
    render(<CSRActivityFormPage />);
    await typesLoaded();
    await userEvent.selectOptions(status(), 'Completed');
    setStart(TOMORROW);
    expect(status()).toHaveValue('Completed');

    await userEvent.selectOptions(status(), 'Planned');
    setStart(YESTERDAY);
    expect(status()).toHaveValue('Planned');
  });

  test('an edit keeps the stored Planned when the date moves into the past', async () => {
    mockParams = { id: '5' };
    csrAPI.activities.getById.mockResolvedValue({ ...ACTIVITY, status: 'Planned', startDate: TOMORROW });
    render(<CSRActivityFormPage />);
    await waitFor(() => expect(status()).toHaveValue('Planned'));
    setStart(YESTERDAY);
    expect(status()).toHaveValue('Planned');
  });

  test('an edit keeps the stored Completed when the date moves into the future', async () => {
    mockParams = { id: '5' };
    csrAPI.activities.getById.mockResolvedValue({ ...ACTIVITY, status: 'Completed', startDate: YESTERDAY });
    render(<CSRActivityFormPage />);
    await waitFor(() => expect(status()).toHaveValue('Completed'));
    setStart(TOMORROW);
    expect(status()).toHaveValue('Completed');
  });
});

describe('D-018: the line beside Save says whether the funder will see it', () => {
  beforeEach(() => { mockSearch = new URLSearchParams({ project: '11' }); });

  const SHOWN = 'Visible to funder';
  const HIDDEN = 'Not visible to funder';
  const status = () => screen.getByLabelText(/status/i);
  const setDate = (label, v) => fireEvent.change(screen.getByLabelText(label), { target: { value: v } });
  const line = () => screen.getByRole('button', { name: /save/i }).parentElement;

  test('switch on, Completed: shown; switch off: hidden', async () => {
    render(<CSRActivityFormPage />);
    await typesLoaded();
    expect(line()).toHaveTextContent(SHOWN);
    await userEvent.click(screen.getByRole('switch', { name: 'Visible to funder' }));
    expect(line()).toHaveTextContent(HIDDEN);
    expect(line()).not.toHaveTextContent(SHOWN);
  });

  test('Cancelled is hidden even with the switch on', async () => {
    render(<CSRActivityFormPage />);
    await typesLoaded();
    await userEvent.selectOptions(status(), 'Cancelled');
    expect(line()).toHaveTextContent(HIDDEN);
    await userEvent.selectOptions(status(), 'Completed');
    expect(line()).toHaveTextContent(SHOWN);
  });

  test.each([
    ['yesterday', YESTERDAY, HIDDEN],
    ['today', TODAY, SHOWN],
    ['tomorrow', TOMORROW, SHOWN],
  ])('Planned starting %s: %s', async (_, start, expected) => {
    render(<CSRActivityFormPage />);
    await typesLoaded();
    await userEvent.selectOptions(status(), 'Planned');
    setDate(/start date/i, start);
    expect(line()).toHaveTextContent(expected);
  });

  test.each([
    ['yesterday', YESTERDAY, HIDDEN],
    ['today', TODAY, SHOWN],
  ])('a Planned span is judged by its end date: ending %s gives %s', async (_, end, expected) => {
    render(<CSRActivityFormPage />);
    await typesLoaded();
    await userEvent.selectOptions(status(), 'Planned');
    setDate(/start date/i, dayFromToday(-5));
    setDate(/end date/i, end);
    expect(line()).toHaveTextContent(expected);
  });

  test('Planned with no date is shown', async () => {
    render(<CSRActivityFormPage />);
    await typesLoaded();
    await userEvent.selectOptions(status(), 'Planned');
    expect(line()).toHaveTextContent(SHOWN);
  });

  test('Completed with a past date is shown', async () => {
    render(<CSRActivityFormPage />);
    await typesLoaded();
    setDate(/start date/i, YESTERDAY);
    expect(status()).toHaveValue('Completed');
    expect(line()).toHaveTextContent(SHOWN);
  });
});

describe('D-019: the activity city comes from the grant', () => {
  beforeEach(() => { mockSearch = new URLSearchParams({ project: '11' }); });

  test('lists only the grant cities and sends the one picked', async () => {
    csrAPI.projects.getById.mockResolvedValue({
      id: 11, cities: [{ id: 7, cityName: 'Pune', state: 'MH' }, { id: 8, cityName: 'Wardha', state: 'MH' }],
    });
    csrAPI.activities.create.mockResolvedValue({ id: 1 });
    render(<CSRActivityFormPage />);
    await typesLoaded();
    const city = await screen.findByLabelText(/^city$/i);
    await waitFor(() => expect(city).toBeEnabled());
    await userEvent.click(city);
    expect(within(screen.getByRole('listbox')).getAllByRole('option').map((o) => o.textContent)).toEqual(['Pune, MH', 'Wardha, MH']);
    await userEvent.keyboard('{Escape}');
    expect(csrAPI.projects.getById).toHaveBeenCalledWith(11);
    await userEvent.type(screen.getByLabelText(/title/i), 'Pune Trial');
    await pick(/activity type/i, 'District Trial');
    await pick(/^city$/i, 'Pune, MH');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() => expect(csrAPI.activities.create).toHaveBeenCalled());
    expect(csrAPI.activities.create.mock.calls[0][0].trialCityId).toBe(7);
  });

  test('a grant with no cities says to pick them on the grant', async () => {
    render(<CSRActivityFormPage />);
    expect(await screen.findByText('This grant has no cities yet. Pick them on the grant first.')).toBeInTheDocument();
    expect(screen.getByLabelText(/^city$/i)).toBeDisabled();
  });

  test('a held workshop Admin has removed still shows as itself', async () => {
    mockParams = { id: '5' };
    csrAPI.activities.getById.mockResolvedValue({
      ...ACTIVITY, activityTypeId: 11, workshopId: 4, workshopName: 'Goal Setting (removed in TTA)',
    });
    render(<CSRActivityFormPage />);
    const workshop = await screen.findByLabelText(/^workshop$/i);
    await waitFor(() => expect(workshop).toHaveValue('Goal Setting (removed in TTA)'));
    await userEvent.click(workshop);
    expect(within(screen.getByRole('listbox')).getByRole('option', { name: 'Goal Setting (removed in TTA)' })).toHaveAttribute('aria-selected', 'true');
    expect(within(screen.getByRole('listbox')).getByRole('option', { name: 'Career Guidance' })).toBeInTheDocument();
  });

  test('a held training programme Admin has removed still shows as itself', async () => {
    mockParams = { id: '5' };
    csrAPI.activityTypes.getAll.mockResolvedValue([...TYPES, { id: 12, name: 'Coach Training', isMaster: false }]);
    csrAPI.activities.getById.mockResolvedValue({
      ...ACTIVITY, activityTypeId: 12, trainingProgrammeId: 6,
      trainingProgrammeName: 'Digital Skills (removed in TTA)',
    });
    render(<CSRActivityFormPage />);
    const programme = await screen.findByLabelText(/training programme/i);
    await waitFor(() => expect(programme).toHaveValue('Digital Skills (removed in TTA)'));
    await userEvent.click(programme);
    expect(within(screen.getByRole('listbox')).getByRole('option', { name: 'Digital Skills (removed in TTA)' })).toHaveAttribute('aria-selected', 'true');
  });

  test('a stored city the grant has dropped still shows as itself', async () => {
    mockParams = { id: '5' };
    csrAPI.activities.getById.mockResolvedValue({ ...ACTIVITY, trialCityId: 9, trialCityName: 'Akola' });
    csrAPI.projects.getById.mockResolvedValue({ id: 11, cities: [{ id: 7, cityName: 'Pune', state: 'MH' }] });
    render(<CSRActivityFormPage />);
    const city = await screen.findByLabelText(/^city$/i);
    await waitFor(() => expect(city).toHaveValue('Akola'));
    await userEvent.click(city);
    expect(within(screen.getByRole('listbox')).getByRole('option', { name: 'Akola' })).toHaveAttribute('aria-selected', 'true');
  });
});

// The form never said which grant it was filing under: the breadcrumb read
// "Grant" on every create, because only an edit's record carried a name.
describe('the form names the grant, TTA project and season it belongs to', () => {
  const GRANT = {
    id: 11, name: 'Grassroots Football', cities: [],
    ttaProjectName: 'IKF Season 6 Trials', season: 'Season 6',
  };

  test('on create, from the grant the page fetches', async () => {
    mockSearch = new URLSearchParams({ project: '11' });
    csrAPI.projects.getById.mockResolvedValue(GRANT);
    render(<CSRActivityFormPage />);
    const crumb = await screen.findByRole('navigation', { name: 'Breadcrumb' });
    await waitFor(() => {
      expect(within(crumb).getByRole('button', { name: 'Grassroots Football' })).toBeInTheDocument();
    });
    expect(
      screen.getByText('Grant: Grassroots Football · TTA project: IKF Season 6 Trials · Season 6'),
    ).toBeInTheDocument();
  });

  test('on edit, from the names the activity carries', async () => {
    mockParams = { id: '5' };
    csrAPI.projects.getById.mockResolvedValue({ id: 11, cities: [] });
    csrAPI.activities.getById.mockResolvedValue({
      ...ACTIVITY, ttaProject: 'IKF Season 6 Trials', season: 'Season 6',
    });
    render(<CSRActivityFormPage />);
    const crumb = await screen.findByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumb).getByRole('button', { name: 'Grassroots Football' })).toBeInTheDocument();
    expect(
      screen.getByText('Grant: Grassroots Football · TTA project: IKF Season 6 Trials · Season 6'),
    ).toBeInTheDocument();
  });

  test('a grant with no TTA project leaves those parts out', async () => {
    mockSearch = new URLSearchParams({ project: '11' });
    csrAPI.projects.getById.mockResolvedValue({ ...GRANT, ttaProjectName: '', season: '' });
    render(<CSRActivityFormPage />);
    expect(await screen.findByText('Grant: Grassroots Football')).toBeInTheDocument();
  });
});
