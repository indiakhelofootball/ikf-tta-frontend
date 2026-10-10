// Edit REP opens with a slim row (REP Management no longer receives the files).
// The stored logo is fetched for the preview; the stored MoU preview shows only
// a name, so it is never fetched. Saving without picking a file sends no file
// keys, so the stored files stay as they are.
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { trialsAPI, repAPI } from '../../services/api';
import REPModal from './REPModal';

jest.mock('../../services/api', () => ({
  trialsAPI: { getAll: jest.fn() },
  repAPI: {
    getAll: jest.fn(),
    getOptions: jest.fn(),
    getFileBlob: jest.fn(),
    addAssignment: jest.fn(),
    updateAssignment: jest.fn(),
    deleteAssignment: jest.fn(),
  },
}));

const ROW = {
  id: 4, repName: 'Pune Kickers', updatedAt: '2026-10-09T10:00:00Z', season: '', contactName: 'C',
  phone: '9876543210', email: 'c@x.com', backupContactName: '', backupPhone: '', backupEmail: '',
  website: '', websiteNA: false, facebook: '', facebookNA: false, instagram: '', instagramNA: false,
  telegram: '', telegramNA: false, mouStatus: 'Signed', mouDocumentName: 'pune-mou.pdf',
  repLogoName: 'logo.png', repLogoLink: '', cityAssignments: [],
};
const slim = (over) => ({
  ...ROW, hasLogo: true, hasMou: true, repLogoText: '', mouDocumentText: '', ...over,
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const edit = (rep, onSave = jest.fn()) => {
  render(<REPModal open onClose={() => {}} onSave={onSave} editingREP={rep} />);
  return onSave;
};

beforeEach(() => {
  jest.clearAllMocks();
  trialsAPI.getAll.mockResolvedValue({ trials: [] });
  repAPI.getOptions.mockResolvedValue({ reps: [] });
  global.URL.createObjectURL = jest.fn(() => 'blob:stored-logo');
  global.URL.revokeObjectURL = jest.fn();
});

test('the stored logo shows "Loading logo…", then the preview; the MoU is named, not fetched', async () => {
  const d = deferred();
  repAPI.getFileBlob.mockReturnValue(d.promise);
  edit(slim());
  expect(screen.getByText('Loading logo…')).toBeInTheDocument();
  expect(screen.queryByAltText('REP Logo Preview')).toBeNull();
  expect(screen.getByText('pune-mou.pdf')).toBeInTheDocument();
  expect(repAPI.getFileBlob.mock.calls).toEqual([[4, 'logo', '2026-10-09T10:00:00Z']]);

  await act(async () => d.resolve(new Blob(['png'])));
  expect(screen.queryByText('Loading logo…')).toBeNull();
  expect(screen.getByAltText('REP Logo Preview')).toHaveAttribute('src', 'blob:stored-logo');
});

test("a failed logo load says \"Couldn't load logo.\" and Retry fetches it again", async () => {
  repAPI.getFileBlob.mockRejectedValueOnce(new Error('500'))
    .mockResolvedValueOnce(new Blob(['png']));
  edit(slim());
  expect(await screen.findByText("Couldn't load logo.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByAltText('REP Logo Preview')).toHaveAttribute('src', 'blob:stored-logo');
  expect(repAPI.getFileBlob).toHaveBeenCalledTimes(2);
});

test('no stored files: no spinner and no request', async () => {
  edit(slim({ hasLogo: false, hasMou: false }));
  await act(async () => {});
  expect(screen.queryByText('Loading logo…')).toBeNull();
  expect(screen.queryByAltText('REP Logo Preview')).toBeNull();
  expect(screen.queryByText('pune-mou.pdf')).toBeNull();
  expect(repAPI.getFileBlob).not.toHaveBeenCalled();
});

test('a stored filename previews as before, without a request', async () => {
  edit(slim({ repLogoText: 'Budge-Budge logo.png', mouDocumentText: 'Idukki MOU.pdf' }));
  await act(async () => {});
  expect(screen.getByAltText('REP Logo Preview')).toHaveAttribute('src', 'Budge-Budge logo.png');
  expect(screen.getByText('pune-mou.pdf')).toBeInTheDocument();
  expect(repAPI.getFileBlob).not.toHaveBeenCalled();
});

test('Save without picking a file sends no file keys, even after the logo loaded', async () => {
  repAPI.getFileBlob.mockResolvedValue(new Blob(['png']));
  const onSave = edit(slim());
  await screen.findByAltText('REP Logo Preview');
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save' })); });
  await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
  const payload = onSave.mock.calls[0][0];
  for (const key of ['repLogoUrl', 'repLogoName', 'mouDocumentUrl', 'mouDocumentName',
    'hasLogo', 'hasMou', 'repLogoText', 'mouDocumentText']) {
    expect(payload).not.toHaveProperty(key);
  }
  expect(payload.repName).toBe('Pune Kickers');
});
