// The Add REP form marks cities that already belong to a REP as ASSIGNED. The
// taken set used to come from repAPI.getAll({ limit: 1000 }), which carries
// every logo and MoU (and the server caps it at 100 rows). It now comes from
// repAPI.getOptions(), whose cityAssignments are the same objects, so the same
// state|city pairs must be marked, case-insensitively, as before.

import React from 'react';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { trialsAPI, repAPI } from '../../services/api';
import REPModal from './REPModal';

jest.mock('../../services/api', () => ({
  trialsAPI: { getAll: jest.fn() },
  repAPI: {
    getAll: jest.fn(),
    getOptions: jest.fn(),
    addAssignment: jest.fn(),
    updateAssignment: jest.fn(),
    deleteAssignment: jest.fn(),
  },
}));

const OPTIONS_REPS = [
  {
    id: 1, repName: 'Pune Kickers', updatedAt: '2026-09-01T00:00:00Z', hasLogo: true,
    cityAssignments: [{ id: 11, state: 'Maharashtra', city: 'Pune' }],
  },
  {
    id: 2, repName: 'Nashik United', updatedAt: '2026-09-02T00:00:00Z', hasLogo: false,
    cityAssignments: [
      { id: 21, state: 'MAHARASHTRA', city: 'nashik' },
      { id: 22, state: 'Maharashtra', city: '' },
    ],
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  trialsAPI.getAll.mockResolvedValue({ trials: [] });
  repAPI.getOptions.mockResolvedValue({ reps: OPTIONS_REPS });
  repAPI.getAll.mockResolvedValue({ reps: [] });
});

// fireEvent.change rather than userEvent.type: a state has hundreds of cities
// and re-filtering them on every keystroke blows the jest timeout.
async function cityOption(name) {
  const cityInput = screen.getByPlaceholderText('Select city');
  fireEvent.change(cityInput, { target: { value: name } });
  return screen.findByRole('option', { name: new RegExp(`^${name}\\s*(ASSIGNED)?$`) });
}

test('Add REP marks the same taken state|city pairs, read from getOptions', async () => {
  render(<REPModal open onClose={() => {}} onSave={() => {}} editingREP={null} />);
  await waitFor(() => expect(repAPI.getOptions).toHaveBeenCalledTimes(1));
  await act(async () => {});
  expect(repAPI.getAll).not.toHaveBeenCalled();

  fireEvent.change(screen.getByPlaceholderText('Select state'), { target: { value: 'Maharashtra' } });
  await userEvent.click(await screen.findByRole('option', { name: 'Maharashtra' }));

  expect(await cityOption('Pune')).toHaveTextContent('ASSIGNED');
  expect(await cityOption('Nashik')).toHaveTextContent('ASSIGNED');
  expect(await cityOption('Nagpur')).not.toHaveTextContent('ASSIGNED');
}, 60000);
