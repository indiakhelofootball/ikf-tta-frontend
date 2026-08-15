// Regression test for the client-reported bug: dropdowns stay empty because the
// config cache resolved AFTER mount and nothing told the component. Before the
// useConfigVersion subscription, the only cure was a remount (logout/login).

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { configAPI, vendorsAPI, trialsAPI } from '../../services/api';
import { refreshAllFromAPI, clearConfigCache } from '../../utils/adminStorage';
import WorkOrderModal from './WorkOrderModal';

// babel-jest hoists jest.mock above the imports, so these resolve to the mocks.
jest.mock('../../services/api', () => ({
  configAPI: { getByCategory: jest.fn(), bulk: jest.fn(), delete: jest.fn() },
  vendorsAPI: { getAll: jest.fn() },
  trialsAPI: { getAll: jest.fn() },
}));

beforeEach(() => {
  vendorsAPI.getAll.mockResolvedValue([]);
  trialsAPI.getAll.mockResolvedValue([]);
  configAPI.getByCategory.mockResolvedValue([]);
  localStorage.clear();
  clearConfigCache();
});

test('service type options appear when the config cache resolves, without a remount', async () => {
  // Cold start: the cache holds nothing and the fetch has not run.
  render(
    <WorkOrderModal open onClose={() => {}} onSave={() => {}} saving={false} />
  );

  const trigger = await screen.findByText('All service types');
  await userEvent.click(trigger);
  expect(screen.queryByRole('option', { name: 'Ground Staff' })).not.toBeInTheDocument();
  await userEvent.keyboard('{Escape}');

  // The config load lands now — after mount, exactly as it does in production.
  configAPI.getByCategory.mockResolvedValue([
    { id: 1, value: 'Ground Staff', comment: '' },
  ]);
  await act(async () => { await refreshAllFromAPI(); });

  await userEvent.click(screen.getByText('All service types'));

  await waitFor(() => {
    expect(screen.getByRole('option', { name: 'Ground Staff' })).toBeInTheDocument();
  });
});
