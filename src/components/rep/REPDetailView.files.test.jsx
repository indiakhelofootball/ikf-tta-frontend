// REP Management now holds slim rows, so the detail view fetches the logo and
// MoU when it opens. Whether a file exists comes from the row: a REP without
// one never shows a spinner, and values that are not uploaded files (a bare
// filename, a link, whitespace) render exactly as the full row rendered them.
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('../../auth/useGrants', () => ({
  __esModule: true,
  default: () => ({ canEdit: () => false }),
}));
jest.mock('../../services/api', () => ({ repAPI: { getFileBlob: jest.fn() } }));

const { repAPI } = require('../../services/api');
const REPDetailView = require('./REPDetailView').default;

const ROW = {
  id: 7, repName: 'Idukki FC', updatedAt: '2026-10-09T10:00:00Z', contactName: 'C',
  phone: '9876543210', email: 'c@x.com', mouStatus: 'Signed', mouDocumentName: 'm.pdf',
  repLogoName: 'l.png', repLogoLink: '', cityAssignments: [],
};
const full = (logo, mou) => ({ ...ROW, repLogoUrl: logo, mouDocumentUrl: mou });
const slim = (logo, mou) => ({
  ...ROW,
  hasLogo: logo.trim() !== '',
  hasMou: mou.trim() !== '',
  repLogoText: logo.startsWith('data:') ? '' : logo,
  mouDocumentText: mou.startsWith('data:') ? '' : mou,
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

const view = (rep) => render(<REPDetailView rep={rep} open onClose={() => {}} onEdit={() => {}} />);

beforeEach(() => {
  jest.clearAllMocks();
  let n = 0;
  global.URL.createObjectURL = jest.fn(() => `blob:file-${++n}`);
  global.URL.revokeObjectURL = jest.fn();
});

test('uploaded files: "Loading logo…" / "Loading MoU…", then the files', async () => {
  const logo = deferred();
  const mou = deferred();
  repAPI.getFileBlob.mockImplementation((id, kind) => (kind === 'logo' ? logo.promise : mou.promise));
  view(slim('data:image/png;base64,AAAA', 'data:application/pdf;base64,BBBB'));

  expect(screen.getByText('Loading logo…')).toBeInTheDocument();
  expect(screen.getByText('Loading MoU…')).toBeInTheDocument();
  expect(repAPI.getFileBlob).toHaveBeenCalledWith(7, 'logo', '2026-10-09T10:00:00Z');
  expect(repAPI.getFileBlob).toHaveBeenCalledWith(7, 'mou', '2026-10-09T10:00:00Z');

  await act(async () => { logo.resolve(new Blob(['png'])); mou.resolve(new Blob(['pdf'])); });
  expect(screen.queryByText(/Loading/)).toBeNull();
  expect(screen.getByAltText('REP Logo').getAttribute('src')).toMatch(/^blob:file-/);
  expect(screen.getByText('View Document').closest('a').getAttribute('href')).toMatch(/^blob:file-/);
});

test("a failed load says so, and Retry refetches only that file", async () => {
  repAPI.getFileBlob.mockImplementation((id, kind) => (kind === 'logo'
    ? Promise.reject(new Error('500'))
    : Promise.resolve(new Blob(['pdf']))));
  view(slim('data:image/png;base64,AAAA', 'data:application/pdf;base64,BBBB'));

  expect(await screen.findByText("Couldn't load logo.")).toBeInTheDocument();
  expect(screen.queryByText("Couldn't load MoU.")).toBeNull();
  repAPI.getFileBlob.mockImplementation(() => Promise.resolve(new Blob(['png'])));
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByAltText('REP Logo')).toBeInTheDocument();
  const kinds = repAPI.getFileBlob.mock.calls.map((c) => c[1]);
  expect(kinds.filter((k) => k === 'logo')).toHaveLength(2);
  expect(kinds.filter((k) => k === 'mou')).toHaveLength(1);
});

test('the MoU failure reads "Couldn\'t load MoU."', async () => {
  repAPI.getFileBlob.mockImplementation((id, kind) => (kind === 'mou'
    ? Promise.reject(new Error('500'))
    : Promise.resolve(new Blob(['png']))));
  view(slim('', 'data:application/pdf;base64,BBBB'));
  expect(await screen.findByText("Couldn't load MoU.")).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
});

test.each([
  ['nothing stored', '', ''],
  ['a bare filename MoU and logo', 'Budge-Budge logo.png', 'Idukki MOU.pdf'],
  ['a link MoU, whitespace logo', '   ', 'https://example.com/mou.pdf'],
  ['whitespace MoU', '', '\t '],
])('%s: no spinner, no request, and the same markup as the full row', async (_, logo, mou) => {
  // Generated ids differ between two renders; everything else must not.
  const markup = () => screen.getByRole('dialog').innerHTML.replace(/ (id|aria-[a-z]+)="[^"]*"/g, '');
  const before = view(full(logo, mou));
  const fullMarkup = markup();
  before.unmount();
  view(slim(logo, mou));
  await act(async () => {});
  expect(markup()).toBe(fullMarkup);
  expect(screen.queryByText(/Loading/)).toBeNull();
  expect(screen.queryByRole('status')).toBeNull();
  expect(repAPI.getFileBlob).not.toHaveBeenCalled();
});
