// CP3. The Admin page keeps its own copy of each list, read once at mount, while
// the config cache under it is refreshed on every window focus. The old save
// diffed the page's list against that newer cache and deleted whatever the page
// lacked, so an option another admin had added was soft-deleted the moment this
// admin added or removed anything in the same category. Each action now sends
// only its own row and the page shows the server's rows afterwards.
import React from 'react';
import { render, screen, waitFor, fireEvent, within, act } from '@testing-library/react';

jest.mock('react-router-dom', () => ({ __esModule: true, useNavigate: () => jest.fn() }), {
  virtual: true,
});

jest.mock('../../services/api', () => ({
  configAPI: {
    getByCategory: jest.fn(),
    bulk: jest.fn(),
    delete: jest.fn(),
    rename: jest.fn(),
    update: jest.fn(),
  },
}));

const { configAPI } = require('../../services/api');
const { refreshAllFromAPI } = require('../../utils/adminStorage');
const AdminPage = require('./AdminPage').default;

let rows;
let nextId;

// bulk is get_or_create on (category, value); delete is a soft delete; the
// page reads active rows only.
function installFakeServer(initial) {
  rows = initial.map((r) => ({ comment: '', ...r, active: true }));
  nextId = 900;
  configAPI.getByCategory.mockImplementation((category) => Promise.resolve(
    rows.filter((r) => r.category === category && r.active)
      .map(({ active, category: c, ...r }) => r)
  ));
  configAPI.bulk.mockImplementation((items) => {
    items.forEach((item) => {
      const found = rows.find((r) => r.category === item.category && r.value === item.value);
      if (found) found.active = true;
      else rows.push({ id: nextId++, category: item.category, value: item.value, comment: item.comment || '', active: true });
    });
    return Promise.resolve({});
  });
  configAPI.delete.mockImplementation((id) => {
    const found = rows.find((r) => r.id === id);
    if (!found) return Promise.reject(new Error('Not found.'));
    found.active = false;
    return Promise.resolve();
  });
}

const activeBanks = () => rows
  .filter((r) => r.category === 'bank_name' && r.active)
  .map((r) => r.value);

beforeEach(() => {
  installFakeServer([{ id: 1, category: 'bank_name', value: 'IDFC First Bank' }]);
  configAPI.rename.mockResolvedValue({ message: 'ok' });
  configAPI.update.mockResolvedValue({});
  localStorage.clear();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.error.mockRestore();
});

// MUI renders the panel and its rows without roles, so they are found by class.
// eslint-disable-next-line testing-library/no-node-access
const panelTitled = (title) => screen.getByText(title).closest('.MuiPaper-root');
// eslint-disable-next-line testing-library/no-node-access
const rowOf = (panel, text) => within(panel).getByText(text).closest('.MuiStack-root');
const bankPanel = () => panelTitled('Bank Names');

async function openBanking() {
  render(<AdminPage />);
  fireEvent.click(screen.getByText('Banking'));
  await waitFor(() => expect(within(bankPanel()).getByText('IDFC First Bank')).toBeInTheDocument());
}

function addBank(name) {
  const field = within(bankPanel()).getByPlaceholderText('Option name');
  fireEvent.change(field, { target: { value: name } });
  fireEvent.keyDown(field, { key: 'Enter' });
}

function deleteBank(name) {
  fireEvent.click(within(rowOf(bankPanel(), name)).getByLabelText('Delete'));
}

// Admin B adds a bank after admin A's page loaded; A's focus refresh then pulls
// it into the cache, but not into A's page.
async function anotherAdminAddsKotak() {
  rows.push({ id: 2, category: 'bank_name', value: 'Kotak Bank', comment: '', active: true });
  await act(async () => { await refreshAllFromAPI(); });
}

test("adding an option does not delete one another admin added since the page loaded", async () => {
  await openBanking();
  await anotherAdminAddsKotak();

  addBank('Axis Bank');

  await waitFor(() => expect(configAPI.bulk).toHaveBeenCalled());
  expect(configAPI.delete).not.toHaveBeenCalled();
  expect(activeBanks()).toEqual(['IDFC First Bank', 'Kotak Bank', 'Axis Bank']);
  expect(configAPI.bulk).toHaveBeenCalledTimes(1);
  expect(configAPI.bulk).toHaveBeenCalledWith([
    expect.objectContaining({ category: 'bank_name', value: 'Axis Bank' }),
  ]);
  await waitFor(() => expect(within(bankPanel()).getByText('Kotak Bank')).toBeInTheDocument());
  expect(within(bankPanel()).getByText('Axis Bank')).toBeInTheDocument();
});

test("deleting an option deletes only that row, not one another admin added", async () => {
  await openBanking();
  await anotherAdminAddsKotak();

  deleteBank('IDFC First Bank');

  await waitFor(() => expect(configAPI.delete).toHaveBeenCalledWith(1));
  expect(configAPI.delete).toHaveBeenCalledTimes(1);
  expect(activeBanks()).toEqual(['Kotak Bank']);
  expect(configAPI.bulk).not.toHaveBeenCalled();
  await waitFor(() => expect(within(bankPanel()).getByText('Kotak Bank')).toBeInTheDocument());
  expect(within(bankPanel()).queryByText('IDFC First Bank')).not.toBeInTheDocument();
});

test('deleting a just-added option sends its server id and removes it on the server', async () => {
  await openBanking();

  addBank('Axis Bank');
  await waitFor(() => expect(activeBanks()).toEqual(['IDFC First Bank', 'Axis Bank']));

  deleteBank('Axis Bank');

  await waitFor(() => expect(configAPI.delete).toHaveBeenCalledWith(900));
  await waitFor(() => expect(within(bankPanel()).queryByText('Axis Bank')).not.toBeInTheDocument());
  expect(activeBanks()).toEqual(['IDFC First Bank']);
});

test('a failed add says so and the page goes back to the server list', async () => {
  await openBanking();
  configAPI.bulk.mockRejectedValue(new Error('500'));

  addBank('Axis Bank');

  expect(await screen.findByText(/the change was not saved/)).toBeInTheDocument();
  await waitFor(() => expect(within(bankPanel()).queryByText('Axis Bank')).not.toBeInTheDocument());
  expect(within(bankPanel()).getByText('IDFC First Bank')).toBeInTheDocument();
});

test('a failed delete says so and the row stays on screen', async () => {
  await openBanking();
  configAPI.delete.mockRejectedValue(new Error('500'));

  deleteBank('IDFC First Bank');

  expect(await screen.findByText(/the change was not saved/)).toBeInTheDocument();
  await waitFor(() => expect(within(bankPanel()).getByText('IDFC First Bank')).toBeInTheDocument());
});

test('an add that saved but could not be re-read says so instead of looking lost', async () => {
  await openBanking();
  configAPI.getByCategory.mockRejectedValue(new Error('network down'));

  addBank('Axis Bank');

  expect(await screen.findByText(/Saved, but the updated list could not be loaded/)).toBeInTheDocument();
  expect(activeBanks()).toEqual(['IDFC First Bank', 'Axis Bank']);
});

// Unchanged path: an edit in a panel with no rename endpoint still goes through
// bulk (which adds the new name and leaves the old row), but sends only that row.
test('editing a bank name sends just the edited row through bulk, as before', async () => {
  await openBanking();
  await anotherAdminAddsKotak();

  fireEvent.click(within(rowOf(bankPanel(), 'IDFC First Bank')).getByLabelText('Edit'));
  fireEvent.change(within(bankPanel()).getByDisplayValue('IDFC First Bank'), { target: { value: 'IDFC Bank' } });
  fireEvent.click(within(bankPanel()).getByLabelText('Save'));

  await waitFor(() => expect(configAPI.bulk).toHaveBeenCalledWith([
    expect.objectContaining({ category: 'bank_name', value: 'IDFC Bank' }),
  ]));
  expect(configAPI.bulk).toHaveBeenCalledTimes(1);
  expect(configAPI.delete).not.toHaveBeenCalled();
  expect(configAPI.rename).not.toHaveBeenCalled();
  await waitFor(() => expect(within(bankPanel()).getByText('IDFC Bank')).toBeInTheDocument());
  expect(activeBanks()).toEqual(['IDFC First Bank', 'Kotak Bank', 'IDFC Bank']);
});

// Unchanged path: a project rename still goes through the cascading endpoint.
test('renaming a project name still goes through the rename endpoint only', async () => {
  installFakeServer([{ id: 5, category: 'project_name', value: 'Football Trials' }]);
  render(<AdminPage />);
  fireEvent.click(screen.getByText('Project'));
  const panel = () => panelTitled('Project Names');
  await waitFor(() => expect(within(panel()).getByText('Football Trials')).toBeInTheDocument());

  fireEvent.click(within(panel()).getByLabelText('Edit'));
  fireEvent.change(within(panel()).getByDisplayValue('Football Trials'), { target: { value: 'Football Trials 2' } });
  fireEvent.click(within(panel()).getByLabelText('Save'));

  await waitFor(() => expect(configAPI.rename)
    .toHaveBeenCalledWith('project_name', 'Football Trials', 'Football Trials 2'));
  expect(configAPI.bulk).not.toHaveBeenCalled();
  expect(configAPI.delete).not.toHaveBeenCalled();
});
